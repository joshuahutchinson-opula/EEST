import { Router, Request, Response } from "express";
import pool from "../db";
import { isTech, requireAdmin } from "../lib/roles";

// Client records: name, contacts and sites, with the client's projects. Tech can browse them but
// never sees contacts, dollar values or Sales-pipeline projects.
const router = Router();

interface Contact { name: string; title?: string; email?: string; phone?: string }

function cleanContacts(v: unknown): Contact[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) return [];
  return v
    .filter((c) => c && typeof c.name === "string" && c.name.trim())
    .map((c) => ({ name: String(c.name).trim().slice(0, 120), title: String(c.title || "").slice(0, 120), email: String(c.email || "").slice(0, 200), phone: String(c.phone || "").slice(0, 60) }));
}
function cleanSites(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim().slice(0, 200)))];
}

const mapClient = (row: any, tech: boolean) => ({
  id: row.id,
  name: row.name,
  contacts: tech ? [] : row.contacts || [],
  sites: row.sites || [],
  projectCount: row.project_count !== undefined ? Number(row.project_count) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const tech = isTech(req);
    const result = await pool.query(
      `SELECT c.*, (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id AND p.deleted_at IS NULL ${tech ? "AND p.pipeline_type = 'project'" : ""}) AS project_count
       FROM clients c ORDER BY lower(c.name)`
    );
    // Tech only sees clients they have a project with.
    res.json(result.rows.filter((r) => !tech || Number(r.project_count) > 0).map((r) => mapClient(r, tech)));
  } catch (err) {
    console.error("GET /clients error:", err);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const tech = isTech(req);
    const client = (await pool.query(`SELECT * FROM clients WHERE id::text = $1`, [req.params.id])).rows[0];
    if (!client) return res.status(404).json({ error: "Client not found" });
    const projects = await pool.query(
      `SELECT id, name, value, stage, project_stage, pipeline_type, location, due_date, assignee_name, created_at
       FROM projects WHERE client_id = $1 AND deleted_at IS NULL ${tech ? "AND pipeline_type = 'project'" : ""}
       ORDER BY created_at DESC`,
      [client.id]
    );
    if (tech && projects.rows.length === 0) return res.status(403).json({ error: "Forbidden for this role" });
    res.json({
      ...mapClient(client, tech),
      projects: projects.rows.map((p) => ({
        id: p.id, name: p.name, value: tech ? 0 : Number(p.value), stage: p.stage, projectStage: p.project_stage, pipelineType: p.pipeline_type,
        location: p.location || "", dueDate: p.due_date ? new Date(p.due_date).toISOString().slice(0, 10) : "", assigneeName: p.assignee_name || "", createdAt: p.created_at,
      })),
    });
  } catch (err) {
    console.error("GET /clients/:id error:", err);
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

router.post("/", requireAdmin, async (req: Request, res: Response) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const result = await pool.query(
      `INSERT INTO clients (name, contacts, sites) VALUES ($1, $2, $3) RETURNING *`,
      [name.slice(0, 200), JSON.stringify(cleanContacts(req.body.contacts) || []), JSON.stringify(cleanSites(req.body.sites) || [])]
    );
    res.status(201).json(mapClient(result.rows[0], false));
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "A client with that name already exists" });
    console.error("POST /clients error:", err);
    res.status(500).json({ error: "Failed to create client" });
  }
});

// PATCH /api/clients/:id — renaming also updates the client name shown on its projects.
router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  const name = req.body.name === undefined ? undefined : String(req.body.name).trim();
  if (name !== undefined && !name) return res.status(400).json({ error: "name can't be empty" });
  const contacts = cleanContacts(req.body.contacts);
  const sites = cleanSites(req.body.sites);
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const result = await db.query(
      `UPDATE clients SET name = COALESCE($2, name), contacts = COALESCE($3, contacts), sites = COALESCE($4, sites), updated_at = NOW()
       WHERE id::text = $1 RETURNING *`,
      [req.params.id, name ?? null, contacts ? JSON.stringify(contacts) : null, sites ? JSON.stringify(sites) : null]
    );
    if (result.rows.length === 0) { await db.query("ROLLBACK"); return res.status(404).json({ error: "Client not found" }); }
    if (name) await db.query(`UPDATE projects SET client = $2, updated_at = NOW() WHERE client_id = $1`, [result.rows[0].id, name]);
    await db.query("COMMIT");
    res.json(mapClient(result.rows[0], false));
  } catch (err: any) {
    await db.query("ROLLBACK").catch(() => {});
    if (err?.code === "23505") return res.status(409).json({ error: "A client with that name already exists" });
    console.error("PATCH /clients/:id error:", err);
    res.status(500).json({ error: "Failed to update client" });
  } finally {
    db.release();
  }
});

export default router;
