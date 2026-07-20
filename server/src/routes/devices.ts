import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// GET /api/devices
router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM devices WHERE discontinued = false ORDER BY manufacturer, model");
    const devices = result.rows.map((row) => ({
      id: row.id,
      model: row.model,
      manufacturer: row.manufacturer || "",
      category: row.category || "camera",
      resolution: row.resolution || undefined,
      lens: row.lens || undefined,
      sensor: row.sensor || undefined,
      nightVision: row.night_vision || undefined,
      weatherRating: row.weather_rating || undefined,
      powerInput: row.power_input || undefined,
      storage: row.storage || undefined,
      channels: row.channels || undefined,
      readers: row.readers || undefined,
      authentication: row.authentication || undefined,
      price: row.price ? Number(row.price) : undefined,
      sku: row.sku || undefined,
      imageUrl: row.image_url || undefined,
      frameRate: row.frame_rate || undefined,
      compression: row.compression || undefined,
      fov: row.fov || undefined,
      operatingTemp: row.operating_temp || undefined,
      tags: row.tags || [],
      discontinued: row.discontinued,
    }));
    res.json(devices);
  } catch (err) {
    console.error("GET /devices error:", err);
    res.status(500).json({ error: "Failed to fetch devices" });
  }
});

// GET /api/devices/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM devices WHERE id = $1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Device not found" });
    const row = result.rows[0];
    res.json({
      id: row.id, model: row.model, manufacturer: row.manufacturer, category: row.category,
      resolution: row.resolution, lens: row.lens, sensor: row.sensor,
      nightVision: row.night_vision, weatherRating: row.weather_rating, powerInput: row.power_input,
      storage: row.storage, channels: row.channels, readers: row.readers, authentication: row.authentication,
      price: row.price ? Number(row.price) : undefined, sku: row.sku, imageUrl: row.image_url,
      frameRate: row.frame_rate, compression: row.compression, fov: row.fov,
      operatingTemp: row.operating_temp, tags: row.tags, discontinued: row.discontinued,
    });
  } catch (err) {
    console.error("GET /devices/:id error:", err);
    res.status(500).json({ error: "Failed to fetch device" });
  }
});

// POST /api/devices
router.post("/", async (req: Request, res: Response) => {
  try {
    const { model, manufacturer, category, resolution, lens, sensor, nightVision, weatherRating, powerInput, storage, channels, readers, authentication, price, sku, imageUrl, frameRate, compression, fov, operatingTemp, tags } = req.body;
    const result = await pool.query(
      `INSERT INTO devices (model, manufacturer, category, resolution, lens, sensor, night_vision, weather_rating, power_input, storage, channels, readers, authentication, price, sku, image_url, frame_rate, compression, fov, operating_temp, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *`,
      [model, manufacturer, category, resolution, lens, sensor, nightVision, weatherRating, powerInput, storage, channels, readers, authentication, price, sku, imageUrl, frameRate, compression, fov, operatingTemp, tags || []]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /devices error:", err);
    res.status(500).json({ error: "Failed to create device" });
  }
});

// POST /api/devices/bulk — for CSV import
router.post("/bulk", async (req: Request, res: Response) => {
  try {
    const { devices } = req.body;
    if (!Array.isArray(devices)) return res.status(400).json({ error: "devices array required" });
    let count = 0;
    for (const d of devices) {
      await pool.query(
        `INSERT INTO devices (model, manufacturer, category, resolution, lens, sensor, night_vision, weather_rating, power_input, storage, channels, readers, authentication, price, sku, image_url, frame_rate, compression, fov, operating_temp, tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
         ON CONFLICT (sku) DO UPDATE SET price=EXCLUDED.price, image_url=EXCLUDED.image_url, tags=EXCLUDED.tags`,
        [d.model, d.manufacturer, d.category, d.resolution, d.lens, d.sensor, d.nightVision, d.weatherRating, d.powerInput, d.storage, d.channels, d.readers, d.authentication, d.price, d.sku, d.imageUrl, d.frameRate, d.compression, d.fov, d.operatingTemp, d.tags || []]
      );
      count++;
    }
    res.status(201).json({ imported: count });
  } catch (err) {
    console.error("POST /devices/bulk error:", err);
    res.status(500).json({ error: "Failed to import devices" });
  }
});

export default router;