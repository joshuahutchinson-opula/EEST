import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// GET /api/change-orders/:projectId
router.get("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      "SELECT * FROM change_orders WHERE project_id = $1 ORDER BY created_at DESC",
      [projectId]
    );
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        title: row.title,
        description: row.description,
        costImpact: Number(row.cost_impact),
        status: row.status,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    );
  } catch (err) {
    console.error("GET /change-orders/:projectId error:", err);
    res.status(500).json({ error: "Failed to fetch change orders" });
  }
});

// POST /api/change-orders/:projectId
router.post("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { title, description, costImpact, status, createdBy } = req.body;
    const result = await pool.query(
      `INSERT INTO change_orders (project_id, title, description, cost_impact, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [projectId, title, description || null, costImpact || 0, status || "draft", createdBy || ""]
    );
    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      costImpact: Number(row.cost_impact),
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    console.error("POST /change-orders/:projectId error:", err);
    res.status(500).json({ error: "Failed to create change order" });
  }
});

// PATCH /api/change-orders/:projectId/:id
router.patch("/:projectId/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, costImpact, status } = req.body;
    const result = await pool.query(
      `UPDATE change_orders SET
         title = COALESCE($2, title),
         description = COALESCE($3, description),
         cost_impact = COALESCE($4, cost_impact),
         status = COALESCE($5, status),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, title, description, costImpact, status]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Change order not found" });
    const row = result.rows[0];
    res.json({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      costImpact: Number(row.cost_impact),
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    console.error("PATCH /change-orders/:projectId/:id error:", err);
    res.status(500).json({ error: "Failed to update change order" });
  }
});

// DELETE /api/change-orders/:projectId/:id
router.delete("/:projectId/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM change_orders WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /change-orders/:projectId/:id error:", err);
    res.status(500).json({ error: "Failed to delete change order" });
  }
});

export default router;