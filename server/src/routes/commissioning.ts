import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// GET /api/commissioning/:projectId
router.get("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      `SELECT id, project_id AS "projectId", device_id AS "deviceId",
              device_name AS "deviceName", location, status, notes, photos,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM commissioning_checklists
       WHERE project_id = $1
       ORDER BY created_at`,
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /commissioning/:projectId error:", err);
    res.status(500).json({ error: "Failed to fetch commissioning data" });
  }
});

// POST /api/commissioning/:projectId
router.post("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { deviceId, deviceName, location } = req.body;
    if (!deviceName || !deviceName.trim()) {
      return res.status(400).json({ error: "deviceName is required" });
    }
    const result = await pool.query(
      `INSERT INTO commissioning_checklists (project_id, device_id, device_name, location)
       VALUES ($1, $2, $3, $4)
       RETURNING id, project_id AS "projectId", device_id AS "deviceId", 
                 device_name AS "deviceName", location, status, notes, photos`,
      [projectId, deviceId || null, deviceName.trim(), location || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /commissioning/:projectId error:", err);
    res.status(500).json({ error: "Failed to add commissioning item" });
  }
});

// PATCH /api/commissioning/:projectId/:deviceId
router.patch("/:projectId/:deviceId", async (req: Request, res: Response) => {
  try {
    const { projectId, deviceId } = req.params;
    const { status, notes, photos } = req.body;
    const result = await pool.query(
      `UPDATE commissioning_checklists
       SET status = COALESCE($3, status),
           notes = COALESCE($4, notes),
           photos = COALESCE($5, photos),
           updated_at = NOW()
       WHERE project_id = $1 AND device_id = $2
       RETURNING id, project_id AS "projectId", device_id AS "deviceId", 
                 device_name AS "deviceName", location, status, notes, photos`,
      [projectId, deviceId, status, notes, photos]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Device not found in commissioning" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /commissioning/:projectId/:deviceId error:", err);
    res.status(500).json({ error: "Failed to update commissioning status" });
  }
});

// POST /api/commissioning/:projectId/report
router.post("/:projectId/report", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      `SELECT id, device_name AS "deviceName", location, status, notes
       FROM commissioning_checklists
       WHERE project_id = $1
       ORDER BY created_at`,
      [projectId]
    );
    const passed = result.rows.filter(r => r.status === "pass").length;
    const failed = result.rows.filter(r => r.status === "fail").length;
    const pending = result.rows.filter(r => r.status !== "pass" && r.status !== "fail").length;
    res.json({
      url: `/api/commissioning/${projectId}/report/download`,
      summary: { total: result.rows.length, passed, failed, pending },
      devices: result.rows,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("POST /commissioning/:projectId/report error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

export default router;