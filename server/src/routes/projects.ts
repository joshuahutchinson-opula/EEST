import { Router, Request, Response } from "express";
import crypto from "crypto";
import pool from "../db";
import { isTech } from "../lib/roles";

const router = Router();

function mapRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    client: row.client,
    value: Number(row.value),
    stage: row.stage,
    risk: row.risk,
    assignee: {
      name: row.assignee_name || "",
      initials: row.assignee_initials || "",
      color: row.assignee_color || "#3b82f6",
    },
    dueDate: row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : "",
    cameras: row.cameras,
    devices: row.devices,
    location: row.location || "",
    contacts: row.contacts || [],
    summary: row.summary || undefined,
    notes: row.notes || undefined,
    collaborators: row.collaborators || [],
    leadSource: row.lead_source || undefined,
    stageHistory: row.stage_history || [],
    pipelineType: row.pipeline_type || "sales",
    projectStage: row.project_stage || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Tech must not see the Sales pipeline (leads/deals) at all, or any project's dollar value
// or points-of-contact — regardless of what the frontend chooses to render.
function redactForTech(project: ReturnType<typeof mapRow>) {
  return { ...project, value: 0, contacts: [] };
}

// Prevents a Tech-role write from smuggling contacts or a dollar value into the database
// even though the UI never exposes those fields to them.
function stripTechWriteFields<T extends { contacts?: any; value?: any }>(body: T, tech: boolean): T {
  if (!tech) return body;
  const { contacts, value, ...rest } = body;
  return rest as T;
}

// GET /api/projects
router.get("/", async (req: Request, res: Response) => {
  try {
    const tech = isTech(req);
    const result = await pool.query(
      "SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC"
    );
    let projects = result.rows.map(mapRow);
    if (tech) projects = projects.filter((p) => p.pipelineType === "project").map(redactForTech);
    res.json(projects);
  } catch (err) {
    console.error("GET /projects error:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// GET /api/projects/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    let project = mapRow(result.rows[0]);
    if (isTech(req)) {
      if (project.pipelineType !== "project") return res.status(403).json({ error: "Forbidden for this role" });
      project = redactForTech(project);
    }
    res.json(project);
  } catch (err) {
    console.error("GET /projects/:id error:", err);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// POST /api/projects
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, client, value, stage, risk, assignee, dueDate, cameras, devices, location, contacts, summary, notes, collaborators, leadSource, stageHistory, pipelineType, projectStage } = stripTechWriteFields(req.body, isTech(req));
    const result = await pool.query(
      `INSERT INTO projects (name, client, value, stage, risk, assignee_name, assignee_initials, assignee_color, due_date, cameras, devices, location, contacts, summary, notes, collaborators, lead_source, stage_history, pipeline_type, project_stage)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [
        name, client, value || 0, stage || "assessment-scheduled", risk || "low",
        assignee?.name || "", assignee?.initials || "", assignee?.color || "#3b82f6",
        dueDate || null, cameras || 0, devices || 0, location || "",
        JSON.stringify(contacts || []),
        summary || null, notes || null, JSON.stringify(collaborators || []),
        leadSource || null, JSON.stringify(stageHistory || []),
        pipelineType || "sales", projectStage || null,
      ]
    );
    let project = mapRow(result.rows[0]);
    if (isTech(req)) project = redactForTech(project);
    res.status(201).json(project);
  } catch (err) {
    console.error("POST /projects error:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// PATCH /api/projects/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, client, value, stage, risk, assignee, dueDate, cameras, devices, location, contacts, summary, notes, collaborators, leadSource, stageHistory, pipelineType, projectStage } = stripTechWriteFields(req.body, isTech(req));
    const result = await pool.query(
      `UPDATE projects SET name=COALESCE($2,name), client=COALESCE($3,client), value=COALESCE($4,value), stage=COALESCE($5,stage), risk=COALESCE($6,risk),
       assignee_name=COALESCE($7,assignee_name), assignee_initials=COALESCE($8,assignee_initials), assignee_color=COALESCE($9,assignee_color),
       due_date=COALESCE($10,due_date), cameras=COALESCE($11,cameras), devices=COALESCE($12,devices), location=COALESCE($13,location),
       contacts=COALESCE($14,contacts),
       summary=COALESCE($15,summary), notes=COALESCE($16,notes), collaborators=COALESCE($17,collaborators),
       lead_source=COALESCE($18,lead_source), stage_history=COALESCE($19,stage_history),
       pipeline_type=COALESCE($20,pipeline_type), project_stage=COALESCE($21,project_stage),
       updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING *`,
      [id, name, client, value, stage, risk, assignee?.name, assignee?.initials, assignee?.color, dueDate, cameras, devices, location,
       contacts ? JSON.stringify(contacts) : null, summary, notes, collaborators ? JSON.stringify(collaborators) : null,
       leadSource, stageHistory ? JSON.stringify(stageHistory) : null,
       pipelineType, projectStage]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Project not found" });
    let project = mapRow(result.rows[0]);
    if (isTech(req)) {
      if (project.pipelineType !== "project") return res.status(403).json({ error: "Forbidden for this role" });
      project = redactForTech(project);
    }
    res.json(project);
  } catch (err) {
    console.error("PATCH /projects/:id error:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// DELETE /api/projects/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE projects SET deleted_at=NOW() WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /projects/:id error:", err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// POST /api/projects/:id/share-link — generate (or rotate) this project's public read-only
// status link. The token alone is the credential (see routes/public.ts), so a fresh random one
// invalidates any link handed out previously.
router.post("/:id/share-link", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = crypto.randomBytes(24).toString("hex");
    const result = await pool.query(
      `UPDATE projects SET public_share_token = $2, public_share_enabled = TRUE WHERE id = $1 AND deleted_at IS NULL RETURNING public_share_token AS "token"`,
      [id, token]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Project not found" });
    res.json({ token: result.rows[0].token });
  } catch (err) {
    console.error("POST /projects/:id/share-link error:", err);
    res.status(500).json({ error: "Failed to generate share link" });
  }
});

// DELETE /api/projects/:id/share-link — revoke; keeps the old token around (disabled) rather
// than clearing it, purely so a stale bookmark 404s the same way a never-issued token would.
router.delete("/:id/share-link", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE projects SET public_share_enabled = FALSE WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /projects/:id/share-link error:", err);
    res.status(500).json({ error: "Failed to revoke share link" });
  }
});

export default router;
