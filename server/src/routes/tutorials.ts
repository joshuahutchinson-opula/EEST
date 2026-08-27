import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const email = (req as any).user?.email;
    if (!email) return res.status(401).json({ error: "Unauthorized" });
    const result = await pool.query(
      `SELECT tutorial_key FROM user_tutorial_progress WHERE email = $1`,
      [email]
    );
    res.json(result.rows.map((r) => r.tutorial_key));
  } catch (err) {
    console.error("GET /users/me/tutorials error:", err);
    res.status(500).json({ error: "Failed to fetch tutorial progress" });
  }
});

router.post("/:key", async (req: Request, res: Response) => {
  try {
    const email = (req as any).user?.email;
    if (!email) return res.status(401).json({ error: "Unauthorized" });
    await pool.query(
      `INSERT INTO user_tutorial_progress (email, tutorial_key) VALUES ($1, $2)
       ON CONFLICT (email, tutorial_key) DO NOTHING`,
      [email, req.params.key]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("POST /users/me/tutorials/:key error:", err);
    res.status(500).json({ error: "Failed to save tutorial progress" });
  }
});

export default router;
