import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// GET /api/tasks/:projectId
router.get("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      "SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC",
      [projectId]
    );
    res.json(result.rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      assignee: row.assignee,
      status: row.status,
      priority: row.priority,
      dueDate: row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })));
  } catch (err) {
    console.error("GET /tasks/:projectId error:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// POST /api/tasks/:projectId
router.post("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { title, description, assignee, status, priority, dueDate } = req.body;
    const result = await pool.query(
      `INSERT INTO tasks (project_id, title, description, assignee, status, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [projectId, title, description || null, assignee || null, status || "todo", priority || "medium", dueDate || null]
    );
    const row = result.rows[0];
    res.status(201).json({
      id: row.id, projectId: row.project_id, title: row.title, description: row.description,
      assignee: row.assignee, status: row.status, priority: row.priority,
      dueDate: row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : null,
      createdAt: row.created_at, updatedAt: row.updated_at,
    });
  } catch (err) {
    console.error("POST /tasks/:projectId error:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// PATCH /api/tasks/:projectId/:id
router.patch("/:projectId/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, assignee, status, priority, dueDate } = req.body;
    const result = await pool.query(
      `UPDATE tasks SET title=COALESCE($2,title), description=COALESCE($3,description),
       assignee=COALESCE($4,assignee), status=COALESCE($5,status),
       priority=COALESCE($6,priority), due_date=COALESCE($7,due_date),
       updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id, title, description, assignee, status, priority, dueDate]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Task not found" });
    const row = result.rows[0];
    res.json({
      id: row.id, projectId: row.project_id, title: row.title, description: row.description,
      assignee: row.assignee, status: row.status, priority: row.priority,
      dueDate: row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : null,
      createdAt: row.created_at, updatedAt: row.updated_at,
    });
  } catch (err) {
    console.error("PATCH /tasks/:projectId/:id error:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// DELETE /api/tasks/:projectId/:id
router.delete("/:projectId/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /tasks/:projectId/:id error:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;