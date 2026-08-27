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
        userEmail: row.user_email || undefined,
        field: row.field_path || undefined,
        oldValue: row.old_value ?? undefined,
        newValue: row.new_value ?? undefined,
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
    const { event, details, field, oldValue, newValue } = req.body;
    // The authenticated caller (from the verified session token) is the real "who" — never
    // trust a user_name the client might pass in the body.
    const sessionUser = (req as any).user as { name?: string; email?: string } | undefined;
    const userName = sessionUser?.name || "Unknown";
    const userEmail = sessionUser?.email || null;
    await pool.query(
      `INSERT INTO audit_logs (project_id, event, details, user_name, user_email, field_path, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [projectId, event, details || "", userName, userEmail, field || null, oldValue ?? null, newValue ?? null]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("POST /audit/:projectId error:", err);
    res.status(500).json({ error: "Failed to log audit event" });
  }
});

export default router;
