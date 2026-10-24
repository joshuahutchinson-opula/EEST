import { Router, Request, Response } from "express";
import pool from "../db";
import { requireProjectAccess, sessionUserName } from "../lib/roles";
import { CAMS_IMPORT_TYPES, CamsError, CamsImportType, cams, camsRow, camsTypeFor, isCamsConfigured } from "../lib/cams";

// "Send to CAMS" on the Installation page: pushes a project's completed install devices into
// CAMS. Open to admins and techs (no pricing is involved); the per-project routes follow the
// usual Projects-pipeline rule for techs.
const router = Router();
router.param("projectId", requireProjectAccess());

const isoDate = (v: unknown) => (v ? new Date(v as string).toISOString().slice(0, 10) : null);
// A timestamp as its calendar date in Jamaica (en-CA formats as YYYY-MM-DD).
const jamaicaDate = (v: unknown) => (v ? new Date(v as string).toLocaleDateString("en-CA", { timeZone: "America/Jamaica" }) : null);

function sendError(res: Response, err: unknown, what: string) {
  if (err instanceof CamsError) return res.status(err.status).json({ error: err.message });
  console.error(`${what} error:`, err);
  res.status(500).json({ error: `Failed to ${what}` });
}

async function projectDevices(projectId: string) {
  const result = await pool.query(
    `SELECT d.id, d.name, d.type, d.status, d.notes, d.serial_number, d.mac_address, d.ip_address, d.firmware,
            d.warranty_expiry, d.completed_at, d.cams_sent_at, z.id AS zone_id, z.name AS zone_name,
            pa.category AS asset_category, dv.category AS catalog_category, dv.manufacturer, dv.model, dv.resolution
     FROM install_devices d
     JOIN install_zones z ON z.id = d.zone_id
     LEFT JOIN project_assets pa ON pa.id = d.project_asset_id
     LEFT JOIN devices dv ON dv.id::text = pa.device_store_ref
     WHERE z.project_id = $1
     ORDER BY z.sort_order, z.name, d.name`,
    [projectId]
  );
  return result.rows.map((d) => ({ ...d, cams: camsTypeFor({ type: d.type, assetCategory: d.asset_category, catalogCategory: d.catalog_category }) }));
}

async function zoneChoicesFor(camsClientId: number | null): Promise<Record<string, string>> {
  if (!camsClientId) return {};
  const result = await pool.query(`SELECT eest_zone_name, cams_zone FROM cams_zone_choices WHERE cams_client_id = $1`, [camsClientId]);
  return Object.fromEntries(result.rows.map((r) => [r.eest_zone_name, r.cams_zone]));
}

// Zone names CAMS already knows for a client: its zones table plus names in use on its assets.
async function camsZoneNames(clientId: number): Promise<string[]> {
  const [zones, discovered] = await Promise.all([
    cams<{ id: number; name: string }[]>("GET", `/api/zones?client_id=${clientId}`),
    cams<string[]>("GET", `/api/zones/discover?client_id=${clientId}`),
  ]);
  return [...new Set([...zones.map((z) => z.name), ...discovered])].sort((a, b) => a.localeCompare(b));
}

const clientIdParam = (v: unknown): number | null => (/^\d+$/.test(String(v ?? "")) && Number(v) > 0 ? Number(v) : null);

// GET /api/cams/status — whether the server has CAMS credentials (the button is hidden otherwise).
router.get("/status", (_req: Request, res: Response) => {
  res.json({ configured: isCamsConfigured() });
});

// GET /api/cams/clients
router.get("/clients", async (_req: Request, res: Response) => {
  try {
    const clients = await cams<{ id: number; name: string }[]>("GET", "/api/clients");
    res.json(clients.map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)));
  } catch (err) { sendError(res, err, "load CAMS clients"); }
});

// GET /api/cams/zones?clientId=
router.get("/zones", async (req: Request, res: Response) => {
  const clientId = clientIdParam(req.query.clientId);
  if (!clientId) return res.status(400).json({ error: "clientId is required" });
  try { res.json(await camsZoneNames(clientId)); } catch (err) { sendError(res, err, "load CAMS zones"); }
});

// GET /api/cams/projects/:projectId/plan?clientId= — the project's install devices with the CAMS
// table each would go to (or why it's skipped), plus the remembered CAMS client and zone choices.
router.get("/projects/:projectId/plan", async (req: Request, res: Response) => {
  try {
    const remembered = (await pool.query(`SELECT cams_client_id FROM cams_project_clients WHERE project_id::text = $1`, [req.params.projectId])).rows[0]?.cams_client_id ?? null;
    const clientId = clientIdParam(req.query.clientId) ?? remembered;
    const devices = await projectDevices(req.params.projectId);
    const zones = new Map<string, { id: string; name: string; devices: unknown[] }>();
    for (const d of devices) {
      if (!zones.has(d.zone_id)) zones.set(d.zone_id, { id: d.zone_id, name: d.zone_name, devices: [] });
      zones.get(d.zone_id)!.devices.push({
        id: d.id, name: d.name, status: d.status, sentAt: d.cams_sent_at,
        camsType: "type" in d.cams ? d.cams.type : null, skipReason: "skip" in d.cams ? d.cams.skip : null,
      });
    }
    res.json({ camsClientId: clientId, zoneChoices: await zoneChoicesFor(clientId), zones: [...zones.values()] });
  } catch (err) { sendError(res, err, "load the CAMS send plan"); }
});

// POST /api/cams/projects/:projectId/send
// { clientId, zoneByZoneId: { [eestZoneId]: camsZone }, zoneByDeviceId: { [deviceId]: camsZone }, resendAll }
router.post("/projects/:projectId/send", async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const clientId = clientIdParam(req.body?.clientId);
  if (!clientId) return res.status(400).json({ error: "Pick a CAMS client" });
  const zoneName = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 100) : "");
  const zoneByZoneId: Record<string, unknown> = req.body?.zoneByZoneId && typeof req.body.zoneByZoneId === "object" ? req.body.zoneByZoneId : {};
  const zoneByDeviceId: Record<string, unknown> = req.body?.zoneByDeviceId && typeof req.body.zoneByDeviceId === "object" ? req.body.zoneByDeviceId : {};
  const resendAll = req.body?.resendAll === true;

  try {
    const devices = await projectDevices(projectId);
    // Only completed devices, and by default only those not sent before: CAMS import always
    // inserts new rows, so sending a device twice would duplicate it.
    const toSend = devices.filter((d) => d.status === "complete" && (resendAll || !d.cams_sent_at) && "type" in d.cams);
    if (toSend.length === 0) return res.status(400).json({ error: "Nothing to send: no completed devices that CAMS tracks and that haven't been sent" });

    // Device override, else the zone chosen for its EEST zone, else the remembered choice, else the EEST zone name.
    const remembered = await zoneChoicesFor(clientId);
    const zoneFor = (d: (typeof devices)[number]) => zoneName(zoneByDeviceId[d.id]) || zoneName(zoneByZoneId[d.zone_id]) || remembered[d.zone_name] || d.zone_name;
    const clients = await cams<{ id: number; name: string }[]>("GET", "/api/clients");
    const client = clients.find((c) => Number(c.id) === clientId);
    if (!client) return res.status(400).json({ error: "That CAMS client no longer exists" });

    // Zone names typed in that CAMS doesn't know yet are created first. Software has no zone in CAMS.
    const known = new Set(await camsZoneNames(clientId));
    const newZones = [...new Set(toSend.filter((d) => (d.cams as { type: CamsImportType }).type !== "software").map(zoneFor))].filter((z) => !known.has(z));
    for (const name of newZones) await cams("POST", "/api/zones", { client_id: clientId, name });

    const imported: Partial<Record<CamsImportType, number>> = {};
    const errors: { type: CamsImportType; error: string }[] = [];
    for (const type of CAMS_IMPORT_TYPES) {
      const batch = toSend.filter((d) => (d.cams as { type: CamsImportType }).type === type);
      if (batch.length === 0) continue;
      const rows = batch.map((d) => camsRow(type, {
        name: d.name, notes: d.notes, manufacturer: d.manufacturer, model: d.model, resolution: d.resolution,
        serialNumber: d.serial_number, macAddress: d.mac_address, ipAddress: d.ip_address, firmware: d.firmware,
        warrantyExpiry: isoDate(d.warranty_expiry), completedAt: jamaicaDate(d.completed_at),
      }, zoneFor(d), clientId));
      let count = 0;
      try {
        count = Number((await cams<{ imported?: number }>("POST", `/api/import/${type}`, rows)).imported) || 0;
      } catch (err) {
        if (!(err instanceof CamsError)) throw err;
        errors.push({ type, error: err.message });
        // CAMS inserts row by row and stops at the first failure, reporting how many got in.
        count = Number(err.body?.imported) || 0;
      }
      imported[type] = count;
      // CAMS inserts in order, so the first `count` rows are the ones that made it in.
      const sentIds = batch.slice(0, count).map((d) => d.id);
      if (sentIds.length) await pool.query(`UPDATE install_devices SET cams_sent_at = NOW() WHERE id = ANY($1::uuid[])`, [sentIds]);
    }

    // Remember the client for this project, and the zone choices for this client.
    await pool.query(
      `INSERT INTO cams_project_clients (project_id, cams_client_id, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (project_id) DO UPDATE SET cams_client_id = EXCLUDED.cams_client_id, updated_at = NOW()`,
      [projectId, clientId]
    );
    const zoneNames = new Map(devices.map((d) => [d.zone_id, d.zone_name]));
    for (const [zoneId, eestName] of zoneNames) {
      const chosen = zoneName(zoneByZoneId[zoneId]);
      if (!chosen) continue;
      await pool.query(
        `INSERT INTO cams_zone_choices (cams_client_id, eest_zone_name, cams_zone, updated_at) VALUES ($1, $2, $3, NOW())
         ON CONFLICT (cams_client_id, eest_zone_name) DO UPDATE SET cams_zone = EXCLUDED.cams_zone, updated_at = NOW()`,
        [clientId, eestName, chosen]
      );
    }

    const total = Object.values(imported).reduce((s, n) => s + (n || 0), 0);
    const parts = CAMS_IMPORT_TYPES.filter((t) => imported[t] !== undefined).map((t) => `${imported[t]} ${t}`);
    await pool.query(
      `INSERT INTO audit_logs (project_id, event, details, user_name, user_email) VALUES ($1, 'Sent to CAMS', $2, $3, $4)`,
      [projectId, `Sent ${total} device${total === 1 ? "" : "s"} to CAMS client ${client.name}${resendAll ? " (resend all)" : ""}: ${parts.join(", ")}${errors.length ? `. Errors: ${errors.map((e) => `${e.type}: ${e.error}`).join("; ")}` : ""}`, sessionUserName(req), (req as any).user?.email || null]
    );
    res.json({ imported, total, errors, createdZones: newZones });
  } catch (err) { sendError(res, err, "send to CAMS"); }
});

export default router;
