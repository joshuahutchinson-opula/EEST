import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// GET /api/projects
router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC"
    );
    const projects = result.rows.map((row) => ({
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
      contact: row.contact_name
        ? {
            name: row.contact_name,
            title: row.contact_title || "",
            email: row.contact_email || "",
            phone: row.contact_phone || "",
          }
        : undefined,
      summary: row.summary || undefined,
      notes: row.notes || undefined,
      collaborators: row.collaborators || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
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
    const row = result.rows[0];
    res.json({
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
      contact: row.contact_name
        ? { name: row.contact_name, title: row.contact_title || "", email: row.contact_email || "", phone: row.contact_phone || "" }
        : undefined,
      summary: row.summary || undefined,
      notes: row.notes || undefined,
      collaborators: row.collaborators || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    console.error("GET /projects/:id error:", err);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// POST /api/projects
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, client, value, stage, risk, assignee, dueDate, cameras, devices, location, contact, summary, notes, collaborators } = req.body;
    const result = await pool.query(
      `INSERT INTO projects (name, client, value, stage, risk, assignee_name, assignee_initials, assignee_color, due_date, cameras, devices, location, contact_name, contact_title, contact_email, contact_phone, summary, notes, collaborators)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [
        name, client, value || 0, stage || "assessment-scheduled", risk || "low",
        assignee?.name || "", assignee?.initials || "", assignee?.color || "#3b82f6",
        dueDate || null, cameras || 0, devices || 0, location || "",
        contact?.name || null, contact?.title || null, contact?.email || null, contact?.phone || null,
        summary || null, notes || null, JSON.stringify(collaborators || []),
      ]
    );
    const row = result.rows[0];
    res.status(201).json({
      id: row.id, name: row.name, client: row.client, value: Number(row.value),
      stage: row.stage, risk: row.risk,
      assignee: { name: row.assignee_name, initials: row.assignee_initials, color: row.assignee_color },
      dueDate: row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : "",
      cameras: row.cameras, devices: row.devices, location: row.location || "",
      contact: row.contact_name ? { name: row.contact_name, title: row.contact_title || "", email: row.contact_email || "", phone: row.contact_phone || "" } : undefined,
      summary: row.summary, notes: row.notes, collaborators: row.collaborators || [],
    });
  } catch (err) {
    console.error("POST /projects error:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// PATCH /api/projects/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, client, value, stage, risk, assignee, dueDate, cameras, devices, location, contact, summary, notes, collaborators } = req.body;
    const result = await pool.query(
      `UPDATE projects SET name=COALESCE($2,name), client=COALESCE($3,client), value=COALESCE($4,value), stage=COALESCE($5,stage), risk=COALESCE($6,risk),
       assignee_name=COALESCE($7,assignee_name), assignee_initials=COALESCE($8,assignee_initials), assignee_color=COALESCE($9,assignee_color),
       due_date=COALESCE($10,due_date), cameras=COALESCE($11,cameras), devices=COALESCE($12,devices), location=COALESCE($13,location),
       contact_name=COALESCE($14,contact_name), contact_title=COALESCE($15,contact_title), contact_email=COALESCE($16,contact_email), contact_phone=COALESCE($17,contact_phone),
       summary=COALESCE($18,summary), notes=COALESCE($19,notes), collaborators=COALESCE($20,collaborators),
       updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING *`,
      [id, name, client, value, stage, risk, assignee?.name, assignee?.initials, assignee?.color, dueDate, cameras, devices, location,
       contact?.name, contact?.title, contact?.email, contact?.phone, summary, notes, collaborators ? JSON.stringify(collaborators) : null]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Project not found" });
    const row = result.rows[0];
    res.json({ id: row.id, name: row.name, client: row.client, value: Number(row.value), stage: row.stage, risk: row.risk, assignee: { name: row.assignee_name, initials: row.assignee_initials, color: row.assignee_color }, dueDate: row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : "", cameras: row.cameras, devices: row.devices, location: row.location, contact: row.contact_name ? { name: row.contact_name, title: row.contact_title, email: row.contact_email, phone: row.contact_phone } : undefined, summary: row.summary, notes: row.notes, collaborators: row.collaborators });
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

export default router;