import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// GET /api/audit/:projectId
router.get("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      "SELECT * FROM audit_logs WHERE project_id = $1 ORDER BY created_at DESC LIMIT 100",
      [projectId]
    );
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        event: row.event,
        details: row.details,
        user: row.user_name,
        timestamp: row.created_at,
      }))
    );
  } catch (err) {
    console.error("GET /audit/:projectId error:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// POST /api/audit/:projectId
router.post("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { event, details } = req.body;
    await pool.query(
      "INSERT INTO audit_logs (project_id, event, details, user_name) VALUES ($1, $2, $3, $4)",
      [projectId, event, details || "", "Joshua"]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("POST /audit/:projectId error:", err);
    res.status(500).json({ error: "Failed to log audit event" });
  }
});

export default router;