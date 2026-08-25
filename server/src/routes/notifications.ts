import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user?.name || "System";
    const result = await pool.query(
      `SELECT id, user_name AS "user", project_id AS "projectId", event, details,
              notification_type AS "notificationType", action_url AS "actionUrl",
              is_read AS "isRead", created_at AS "timestamp"
       FROM audit_logs
       WHERE user_name = $1 OR user_name = 'System' OR user_name IS NULL
       ORDER BY created_at DESC
       LIMIT 200`,
      [user]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /notifications error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { projectId, event, details, user, notificationType, actionUrl } = req.body;
    const result = await pool.query(
      `INSERT INTO audit_logs (project_id, event, details, user_name, notification_type, action_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, project_id AS "projectId", event, details, user_name AS "user",
                 notification_type AS "notificationType", action_url AS "actionUrl",
                 is_read AS "isRead", created_at AS "timestamp"`,
      [projectId || null, event || "Notification", details || null, user || "System", notificationType || null, actionUrl || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /notifications error:", err);
    res.status(500).json({ error: "Failed to create notification" });
  }
});

router.post("/sales-win", async (req: Request, res: Response) => {
  try {
    const { projectId, projectName, clientName } = req.body;
    if (!projectId || !projectName) return res.status(400).json({ error: "projectId and projectName are required" });
    await pool.query(
      `INSERT INTO audit_logs (project_id, event, details, user_name, notification_type, action_url)
       VALUES ($1, 'Sales Win', $2, 'System', 'sales-win', $3)`,
      [projectId, `Project "${projectName}" for ${clientName || "client"} won. Ready to move to Projects Pipeline.`, `/project/${projectId}`]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("POST /notifications/sales-win error:", err);
    res.status(500).json({ error: "Failed to send win notification" });
  }
});

router.patch("/:id/read", async (req: Request, res: Response) => {
  try {
    await pool.query(`UPDATE audit_logs SET is_read = TRUE WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /notifications/:id/read error:", err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

router.patch("/read-all", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user?.name || "System";
    await pool.query(`UPDATE audit_logs SET is_read = TRUE WHERE (user_name = $1 OR user_name = 'System' OR user_name IS NULL) AND is_read IS NOT TRUE`, [user]);
    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /notifications/read-all error:", err);
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

export default router;