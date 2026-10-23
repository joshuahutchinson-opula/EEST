import { Router, Request, Response } from "express";
import pool from "../db";
import { isTech } from "../lib/roles";

// GET /api/search?q= — top-bar search across projects, clients, catalog devices and as-built
// serial/MAC numbers. Tech results leave out Sales projects (and clients they only have Sales
// work with); no prices or contacts are returned.
const router = Router();
const LIMIT = 8;

router.get("/", async (req: Request, res: Response) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.json({ projects: [], clients: [], devices: [], serials: [] });
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const tech = isTech(req);
  const projectScope = tech ? "AND p.pipeline_type = 'project'" : "";
  try {
    const [projects, clients, devices, serials] = await Promise.all([
      pool.query(
        `SELECT p.id, p.name, p.client, p.pipeline_type, p.project_stage, p.stage FROM projects p
         WHERE p.deleted_at IS NULL ${projectScope} AND (p.name ILIKE $1 OR p.client ILIKE $1 OR p.location ILIKE $1)
         ORDER BY p.updated_at DESC LIMIT ${LIMIT}`,
        [like]
      ),
      pool.query(
        `SELECT c.id, c.name, (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id AND p.deleted_at IS NULL ${projectScope})::int AS project_count
         FROM clients c WHERE c.name ILIKE $1 ORDER BY lower(c.name) LIMIT ${LIMIT * 2}`,
        [like]
      ),
      pool.query(
        `SELECT id, manufacturer, model, sku, category FROM devices
         WHERE discontinued = FALSE AND (model ILIKE $1 OR manufacturer ILIKE $1 OR sku ILIKE $1 OR (manufacturer || ' ' || model) ILIKE $1)
         ORDER BY manufacturer, model LIMIT ${LIMIT}`,
        [like]
      ),
      pool.query(
        `SELECT d.id, d.name, d.serial_number, d.mac_address, p.id AS project_id, p.name AS project_name FROM install_devices d
         JOIN install_zones z ON z.id = d.zone_id JOIN projects p ON p.id = z.project_id
         WHERE p.deleted_at IS NULL ${projectScope} AND (d.serial_number ILIKE $1 OR d.mac_address ILIKE $1)
         ORDER BY d.serial_number LIMIT ${LIMIT}`,
        [like]
      ),
    ]);
    res.json({
      projects: projects.rows.map((p) => ({ id: p.id, name: p.name, client: p.client, pipelineType: p.pipeline_type, stage: p.pipeline_type === "project" ? p.project_stage : p.stage })),
      clients: clients.rows.filter((c) => !tech || c.project_count > 0).slice(0, LIMIT).map((c) => ({ id: c.id, name: c.name, projectCount: c.project_count })),
      devices: devices.rows.map((d) => ({ id: d.id, name: `${d.manufacturer || ""} ${d.model}`.trim(), sku: d.sku || undefined, category: d.category })),
      serials: serials.rows.map((s) => ({ id: s.id, deviceName: s.name, serialNumber: s.serial_number || undefined, macAddress: s.mac_address || undefined, projectId: s.project_id, projectName: s.project_name })),
    });
  } catch (err) {
    console.error("GET /search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
