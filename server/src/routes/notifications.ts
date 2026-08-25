import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// GET /api/notifications
router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, user_name AS "user", project_id AS "projectId", event, details, 
              is_read AS "isRead", created_at AS "timestamp"
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /notifications error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// POST /api/notifications
router.post("/", async (req: Request, res: Response) => {
  try {
    const { projectId, event, details, user } = req.body;
    const result = await pool.query(
      `INSERT INTO audit_logs (project_id, event, details, user_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, project_id AS "projectId", event, details, user_name AS "user", created_at AS "timestamp"`,
      [projectId || null, event || "Notification", details || null, user || "System"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /notifications error:", err);
    res.status(500).json({ error: "Failed to create notification" });
  }
});

// POST /api/notifications/sales-win
router.post("/sales-win", async (req: Request, res: Response) => {
  try {
    const { projectId, projectName, clientName } = req.body;

    if (!projectId || !projectName) {
      return res.status(400).json({ error: "projectId and projectName are required" });
    }

    await pool.query(
      `INSERT INTO audit_logs (project_id, event, details, user_name)
       VALUES ($1, $2, $3, $4)`,
      [
        projectId,
        "Sales Win",
        `Project "${projectName}" for ${clientName || "client"} won. Ready to move to Projects Pipeline.`,
        "System",
      ]
    );

    res.json({ success: true, message: "Win notification sent" });
  } catch (err) {
    console.error("POST /notifications/sales-win error:", err);
    res.status(500).json({ error: "Failed to send win notification" });
  }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE audit_logs SET is_read = TRUE WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /notifications/:id/read error:", err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// PATCH /api/notifications/read-all
router.patch("/read-all", async (_req: Request, res: Response) => {
  try {
    await pool.query(`UPDATE audit_logs SET is_read = TRUE WHERE is_read IS NOT TRUE`);
    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /notifications/read-all error:", err);
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

export default router;