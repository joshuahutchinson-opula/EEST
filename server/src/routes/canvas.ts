import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// GET /api/canvas/:projectId
router.get("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query("SELECT * FROM canvas_layouts WHERE project_id = $1", [projectId]);
    if (result.rows.length === 0) return res.json({ projectId, layoutData: {} });
    res.json({
      projectId: result.rows[0].project_id,
      layoutData: result.rows[0].layout_data,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (err) {
    console.error("GET /canvas/:projectId error:", err);
    res.status(500).json({ error: "Failed to fetch canvas" });
  }
});

// PUT /api/canvas/:projectId
router.put("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { layoutData } = req.body;
    await pool.query(
      `INSERT INTO canvas_layouts (project_id, layout_data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (project_id) DO UPDATE SET layout_data = $2, updated_at = NOW()`,
      [projectId, JSON.stringify(layoutData || {})]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("PUT /canvas/:projectId error:", err);
    res.status(500).json({ error: "Failed to save canvas" });
  }
});

// POST /api/canvas/:projectId/upload
router.post("/:projectId/upload", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { url, imageData } = req.body;

    // If client sends a URL directly, use it
    if (url) {
      // Store the URL in canvas_layouts
      await pool.query(
        `INSERT INTO canvas_layouts (project_id, layout_data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (project_id) DO UPDATE SET layout_data = $2, updated_at = NOW()`,
        [projectId, JSON.stringify({ imageUrl: url })]
      );
      return res.json({ url });
    }

    // If client sends base64 data, store it
    if (imageData) {
      // In production, you'd upload to S3/Cloudinary here
      // For now, store the data URL in canvas_layouts
      await pool.query(
        `INSERT INTO canvas_layouts (project_id, layout_data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (project_id) DO UPDATE SET layout_data = $2, updated_at = NOW()`,
        [projectId, JSON.stringify({ imageUrl: imageData })]
      );
      return res.json({ url: imageData });
    }

    res.status(400).json({ error: "No url or imageData provided" });
  } catch (err) {
    console.error("POST /canvas/:projectId/upload error:", err);
    res.status(500).json({ error: "Failed to upload" });
  }
});

export default router;
