import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// GET /api/notifications
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user || "Joshua";
    const result = await pool.query(
      "SELECT * FROM notifications WHERE user_name = $1 ORDER BY created_at DESC LIMIT 50",
      [user]
    );
    res.json(result.rows.map(row => ({
      id: row.id, user: row.user_name, projectId: row.project_id,
      event: row.event, details: row.details, isRead: row.is_read,
      timestamp: row.created_at,
    })));
  } catch (err) {
    console.error("GET /notifications error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// POST /api/notifications
router.post("/", async (req: Request, res: Response) => {
  try {
    const { user_name, project_id, event, details } = req.body;
    await pool.query(
      "INSERT INTO notifications (user_name, project_id, event, details) VALUES ($1, $2, $3, $4)",
      [user_name, project_id, event, details || ""]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("POST /notifications error:", err);
    res.status(500).json({ error: "Failed to create notification" });
  }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /notifications/:id/read error:", err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// PATCH /api/notifications/read-all
router.patch("/read-all", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user || "Joshua";
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_name = $1", [user]);
    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /notifications/read-all error:", err);
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

export default router;