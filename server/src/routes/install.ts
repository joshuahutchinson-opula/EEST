import { Router, Request, Response } from "express";
import pool from "../db";
import { isTech, requireProjectAccess, techMayAccessProject } from "../lib/roles";
import { signFileUrls, toStoredFileUrl } from "../lib/uploads";
import { mapAsBuilt, parseAsBuilt } from "../lib/asBuilt";

const router = Router();

// Zones not tied to any project (quick-support work) stay open to Tech; a project zone follows
// the usual Projects-pipeline rule.
router.param("zoneId", async (req, res, next, zoneId) => {
  if (!isTech(req)) return next();
  try {
    const zone = await pool.query(`SELECT project_id FROM install_zones WHERE id::text = $1`, [zoneId]);
    if (zone.rows.length > 0 && !zone.rows[0].project_id) return next();
    return requireProjectAccess(() => zone.rows[0]?.project_id)(req, res, next);
  } catch (err) {
    console.error("install zone access check error:", err);
    res.status(500).json({ error: "Failed to check project access" });
  }
});

// GET /api/install/zones
router.get("/zones", async (req: Request, res: Response) => {
  try {
    const zonesResult = isTech(req)
      ? await pool.query(
          `SELECT * FROM install_zones
           WHERE project_id IS NULL OR project_id IN (SELECT id FROM projects WHERE pipeline_type = 'project' AND deleted_at IS NULL)
           ORDER BY sort_order`
        )
      : await pool.query("SELECT * FROM install_zones ORDER BY sort_order");
    const zones = [];
    for (const z of zonesResult.rows) {
      const devicesResult = await pool.query("SELECT * FROM install_devices WHERE zone_id = $1 ORDER BY id", [z.id]);
      zones.push({
        id: z.id,
        name: z.name,
        projectId: z.project_id || undefined,
        isQuickSupport: z.is_quick_support,
        devices: devicesResult.rows.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          location: d.location || "",
          status: d.status,
          assignee: d.assignee || "",
          notes: d.notes || undefined,
          installedPhotos: signFileUrls(d.installed_photos),
          asBuilt: mapAsBuilt(d),
        })),
      });
    }
    res.json(zones);
  } catch (err) {
    console.error("GET /install/zones error:", err);
    res.status(500).json({ error: "Failed to fetch install zones" });
  }
});

// POST /api/install/zones
router.post("/zones", async (req: Request, res: Response) => {
  try {
    const { name, projectId, isQuickSupport } = req.body;
    if (isTech(req) && projectId && !(await techMayAccessProject(projectId))) {
      return res.status(403).json({ error: "Forbidden for this role" });
    }
    const result = await pool.query(
      "INSERT INTO install_zones (name, project_id, is_quick_support) VALUES ($1, $2, $3) RETURNING *",
      [name, projectId || null, isQuickSupport || false]
    );
    res.status(201).json({ id: result.rows[0].id, name: result.rows[0].name, projectId: result.rows[0].project_id || undefined, isQuickSupport: result.rows[0].is_quick_support, devices: [] });
  } catch (err) {
    console.error("POST /install/zones error:", err);
    res.status(500).json({ error: "Failed to create zone" });
  }
});

// POST /api/install/zones/:zoneId/devices
router.post("/zones/:zoneId/devices", async (req: Request, res: Response) => {
  try {
    const { zoneId } = req.params;
    const { name, type, location, status, assignee, notes } = req.body;
    const result = await pool.query(
      "INSERT INTO install_devices (zone_id, name, type, location, status, assignee, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [zoneId, name, type || "camera", location || "", status || "pending", assignee || "", notes || null]
    );
    res.status(201).json({ ...result.rows[0], installed_photos: signFileUrls(result.rows[0].installed_photos) });
  } catch (err) {
    console.error("POST /install/zones/:zoneId/devices error:", err);
    res.status(500).json({ error: "Failed to add device" });
  }
});

// PATCH /api/install/zones/:zoneId/devices/:deviceId
router.patch("/zones/:zoneId/devices/:deviceId", async (req: Request, res: Response) => {
  try {
    const { zoneId, deviceId } = req.params;
    const { status, addPhoto, asBuilt } = req.body;
    if (asBuilt !== undefined) {
      const parsed = parseAsBuilt(asBuilt);
      if (typeof parsed === "string") return res.status(400).json({ error: parsed });
      await pool.query(
        `UPDATE install_devices SET serial_number = $3, mac_address = $4, ip_address = $5, firmware = $6, warranty_expiry = $7 WHERE id = $1 AND zone_id = $2`,
        [deviceId, zoneId, parsed.serialNumber, parsed.macAddress, parsed.ipAddress, parsed.firmware, parsed.warrantyExpiry]
      );
    }
    if (status) {
      await pool.query("UPDATE install_devices SET status = $1 WHERE id = $2 AND zone_id = $3", [status, deviceId, zoneId]);
    }
    if (typeof addPhoto === "string" && addPhoto) {
      await pool.query(
        "UPDATE install_devices SET installed_photos = installed_photos || $1::jsonb WHERE id = $2 AND zone_id = $3",
        [JSON.stringify([toStoredFileUrl(addPhoto)]), deviceId, zoneId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /install/zones/:zoneId/devices/:deviceId error:", err);
    res.status(500).json({ error: "Failed to update device status" });
  }
});

export default router;