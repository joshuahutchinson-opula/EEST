import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// GET /api/install/zones
router.get("/zones", async (_req: Request, res: Response) => {
  try {
    const zonesResult = await pool.query("SELECT * FROM install_zones ORDER BY sort_order");
    const zones = [];
    for (const z of zonesResult.rows) {
      const devicesResult = await pool.query("SELECT * FROM install_devices WHERE zone_id = $1 ORDER BY id", [z.id]);
      zones.push({
        id: z.id,
        name: z.name,
        devices: devicesResult.rows.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          location: d.location || "",
          status: d.status,
          assignee: d.assignee || "",
          notes: d.notes || undefined,
        })),
      });
    }
    res.json(zones);
  } catch (err) {
    console.error("GET /install/zones error:", err);
    res.status(500).json({ error: "Failed to fetch install zones" });
  }
});

// POST /api/install/zones
router.post("/zones", async (req: Request, res: Response) => {
  try {
    const { name, projectId } = req.body;
    const result = await pool.query(
      "INSERT INTO install_zones (name, project_id) VALUES ($1, $2) RETURNING *",
      [name, projectId || null]
    );
    res.status(201).json({ id: result.rows[0].id, name: result.rows[0].name, devices: [] });
  } catch (err) {
    console.error("POST /install/zones error:", err);
    res.status(500).json({ error: "Failed to create zone" });
  }
});

// POST /api/install/zones/:zoneId/devices
router.post("/zones/:zoneId/devices", async (req: Request, res: Response) => {
  try {
    const { zoneId } = req.params;
    const { name, type, location, status, assignee, notes } = req.body;
    const result = await pool.query(
      "INSERT INTO install_devices (zone_id, name, type, location, status, assignee, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [zoneId, name, type || "camera", location || "", status || "pending", assignee || "", notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /install/zones/:zoneId/devices error:", err);
    res.status(500).json({ error: "Failed to add device" });
  }
});

// PATCH /api/install/zones/:zoneId/devices/:deviceId
router.patch("/zones/:zoneId/devices/:deviceId", async (req: Request, res: Response) => {
  try {
    const { zoneId, deviceId } = req.params;
    const { status } = req.body;
    await pool.query(
      "UPDATE install_devices SET status = $1 WHERE id = $2 AND zone_id = $3",
      [status, deviceId, zoneId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /install/zones/:zoneId/devices/:deviceId error:", err);
    res.status(500).json({ error: "Failed to update device status" });
  }
});

export default router;