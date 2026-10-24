import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import fs from "fs";
import pool from "../db";
import { teamDirectory, TeamMember } from "../lib/team";
import { mapAsBuilt, parseAsBuilt } from "../lib/asBuilt";
import { INSTALL_STATUSES, SET_INSTALL_STATUS } from "../lib/installStatus";
import { signFileUrls } from "../lib/uploads";
import { documentUpload } from "./documents";

// Server-to-server API for the CAMS mobile app's Installation tab. Only the CAMS server calls
// these (never the phone): every request carries the shared X-Integration-Key and the email of
// the tech it acts for in X-User-Email. The tech gets the Tech role's view: no prices, Projects
// pipeline only. The contract is documented in the README ("CAMS integration").
const router = Router();

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest();
const auditName = (m: TeamMember) => `${m.name} (via CAMS mobile)`;
const memberOf = (req: Request) => (req as any).integrationMember as TeamMember;
const AS_BUILT_LABEL: Record<string, string> = { serialNumber: "serial", macAddress: "MAC", ipAddress: "IP", firmware: "firmware", warrantyExpiry: "warranty expiry" };

router.use((req: Request, res: Response, next: NextFunction) => {
  const key = process.env.CAMS_INTEGRATION_KEY;
  if (!key) return res.status(503).json({ error: "The CAMS integration isn't configured" });
  // Hashing both sides first makes the comparison constant-time whatever the lengths.
  const given = req.header("x-integration-key") || "";
  if (!crypto.timingSafeEqual(sha256(given), sha256(key))) return res.status(401).json({ error: "Invalid integration key" });
  const email = (req.header("x-user-email") || "").trim().toLowerCase();
  const member = email ? teamDirectory().find((m) => m.email === email) : undefined;
  if (!member) return res.status(403).json({ error: "X-User-Email isn't an EEST team member" });
  (req as any).integrationMember = member;
  // Downstream helpers see a Tech session for this person.
  (req as any).user = { email: member.email, name: auditName(member), role: "tech" };
  next();
});

// SQL that is true when the text column matches the tech: their name (or "Name Surname"), or email.
const matchesMember = (col: string) => `(lower(${col}) = lower($1) OR lower(${col}) LIKE lower($1) || ' %' OR lower(${col}) = $2)`;

// Projects that are the tech's installation work: Projects pipeline, Installation or
// Commissioning stage, where they're on the project team or assigned to one of its devices.
const JOB_PROJECTS_SQL = `
  SELECT p.id FROM projects p
  WHERE p.pipeline_type = 'project' AND p.deleted_at IS NULL AND p.project_stage IN ('installation', 'commissioning')
    AND (${matchesMember("p.assignee_name")}
      OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(p.collaborators, '[]'::jsonb)) c WHERE ${matchesMember("c->>'name'")})
      OR EXISTS (SELECT 1 FROM install_devices d2 JOIN install_zones z2 ON z2.id = d2.zone_id WHERE z2.project_id = p.id AND ${matchesMember("d2.assignee")}))`;

const mapDevice = (d: any) => ({
  id: d.id,
  name: d.name,
  type: d.type,
  location: d.location || "",
  status: d.status,
  assignee: d.assignee || "",
  notes: d.notes || "",
  completedAt: d.completed_at || null,
  photos: signFileUrls(d.installed_photos),
  asBuilt: mapAsBuilt(d),
});

// The device with its project, if it belongs to one of this tech's jobs.
async function jobDevice(member: TeamMember, deviceId: string) {
  const result = await pool.query(
    `SELECT d.*, z.project_id, z.name AS zone_name FROM install_devices d JOIN install_zones z ON z.id = d.zone_id
     WHERE d.id::text = $3 AND z.project_id IN (${JOB_PROJECTS_SQL})`,
    [member.name, member.email, deviceId]
  );
  return result.rows[0] ?? null;
}

async function logChange(member: TeamMember, projectId: string, details: string) {
  await pool.query(
    `INSERT INTO audit_logs (project_id, event, details, user_name, user_email) VALUES ($1, 'Installation update', $2, $3, $4)`,
    [projectId, details, auditName(member), member.email]
  );
}

// GET /api/integrations/cams/jobs
router.get("/jobs", async (req: Request, res: Response) => {
  const member = memberOf(req);
  try {
    const result = await pool.query(
      `SELECT p.id AS project_id, p.name AS project_name, p.client, p.location AS project_location, p.project_stage, p.due_date,
              z.id AS zone_id, z.name AS zone_name, d.*
       FROM projects p
       JOIN install_zones z ON z.project_id = p.id
       JOIN install_devices d ON d.zone_id = z.id
       WHERE p.id IN (${JOB_PROJECTS_SQL})
       ORDER BY p.name, z.sort_order, z.name, d.name`,
      [member.name, member.email]
    );
    const projects: any[] = [];
    for (const row of result.rows) {
      let project = projects.find((p) => p.id === row.project_id);
      if (!project) {
        project = { id: row.project_id, name: row.project_name, client: row.client, location: row.project_location || "", stage: row.project_stage, dueDate: row.due_date || null, zones: [] };
        projects.push(project);
      }
      let zone = project.zones.find((z: any) => z.id === row.zone_id);
      if (!zone) { zone = { id: row.zone_id, name: row.zone_name, devices: [] }; project.zones.push(zone); }
      zone.devices.push(mapDevice(row));
    }
    res.json({ tech: { name: member.name, email: member.email }, projects });
  } catch (err) {
    console.error("GET /integrations/cams/jobs error:", err);
    res.status(500).json({ error: "Failed to load jobs" });
  }
});

// PATCH /api/integrations/cams/devices/:id  { status?, notes?, asBuilt?: { ...only the fields to change } }
router.patch("/devices/:id", async (req: Request, res: Response) => {
  const member = memberOf(req);
  const { status, notes, asBuilt } = req.body || {};
  if (status !== undefined && !INSTALL_STATUSES.includes(status)) return res.status(400).json({ error: `status must be one of ${INSTALL_STATUSES.join(", ")}` });
  if (notes !== undefined && notes !== null && (typeof notes !== "string" || notes.length > 2000)) return res.status(400).json({ error: "notes must be text up to 2000 characters" });
  if (asBuilt !== undefined && (typeof asBuilt !== "object" || asBuilt === null || Array.isArray(asBuilt))) return res.status(400).json({ error: "asBuilt must be an object" });
  try {
    const device = await jobDevice(member, req.params.id);
    if (!device) return res.status(404).json({ error: "Device not found in your jobs" });
    const changes: string[] = [];
    if (asBuilt !== undefined) {
      // Only the fields sent change; the rest keep their current values.
      const current = mapAsBuilt(device);
      const parsed = parseAsBuilt({ ...current, ...asBuilt });
      if (typeof parsed === "string") return res.status(400).json({ error: parsed });
      await pool.query(
        `UPDATE install_devices SET serial_number = $2, mac_address = $3, ip_address = $4, firmware = $5, warranty_expiry = $6 WHERE id = $1`,
        [device.id, parsed.serialNumber, parsed.macAddress, parsed.ipAddress, parsed.firmware, parsed.warrantyExpiry]
      );
      for (const k of Object.keys(parsed) as (keyof typeof parsed)[]) if (parsed[k] !== current[k]) changes.push(`${AS_BUILT_LABEL[k]} ${current[k] ?? "(empty)"} → ${parsed[k] ?? "(empty)"}`);
    }
    if (notes !== undefined && (notes || null) !== (device.notes || null)) {
      await pool.query(`UPDATE install_devices SET notes = $2 WHERE id = $1`, [device.id, notes || null]);
      changes.push("notes updated");
    }
    if (status !== undefined && status !== device.status) {
      await pool.query(`UPDATE install_devices SET ${SET_INSTALL_STATUS} WHERE id = $2`, [status, device.id]);
      changes.push(`status ${device.status} → ${status}`);
    }
    if (changes.length) await logChange(member, device.project_id, `${device.zone_name} / ${device.name}: ${changes.join("; ")}`);
    const updated = (await pool.query(`SELECT * FROM install_devices WHERE id = $1`, [device.id])).rows[0];
    res.json(mapDevice(updated));
  } catch (err) {
    console.error("PATCH /integrations/cams/devices/:id error:", err);
    res.status(500).json({ error: "Failed to update device" });
  }
});

// POST /api/integrations/cams/devices/:id/photos  (multipart/form-data, one image in field "file")
// Stored like the Installation page's as-installed photos: a project document plus a link on the device.
router.post("/devices/:id/photos", documentUpload.single("file"), async (req: Request, res: Response) => {
  const member = memberOf(req);
  const discard = () => { if (req.file) fs.promises.unlink(req.file.path).catch(() => {}); };
  try {
    if (!req.file) return res.status(400).json({ error: "Attach an image in the \"file\" field" });
    if (!req.file.mimetype.startsWith("image/")) { discard(); return res.status(400).json({ error: "Only images can be uploaded" }); }
    const device = await jobDevice(member, req.params.id);
    if (!device) { discard(); return res.status(404).json({ error: "Device not found in your jobs" }); }
    const fileUrl = `/uploads/documents/${req.file.filename}`;
    await pool.query(
      `INSERT INTO documents (project_id, filename, file_url, file_type, file_size, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6)`,
      [device.project_id, req.file.originalname, fileUrl, req.file.mimetype, req.file.size, auditName(member)]
    );
    const updated = await pool.query(
      `UPDATE install_devices SET installed_photos = COALESCE(installed_photos, '[]'::jsonb) || $2::jsonb WHERE id = $1 RETURNING *`,
      [device.id, JSON.stringify([fileUrl])]
    );
    await logChange(member, device.project_id, `${device.zone_name} / ${device.name}: as-installed photo added`);
    res.status(201).json(mapDevice(updated.rows[0]));
  } catch (err) {
    discard();
    console.error("POST /integrations/cams/devices/:id/photos error:", err);
    res.status(500).json({ error: "Failed to upload photo" });
  }
});

export default router;
