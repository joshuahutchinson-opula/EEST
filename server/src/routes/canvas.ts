import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import pool from "../db";

const router = Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

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
router.post("/:projectId/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // If a file was uploaded
    if (req.file) {
      const fileUrl = `/uploads/${req.file.filename}`;
      return res.json({ url: fileUrl });
    }

    // Fallback to JSON body for URLs or base64
    const { url, imageData } = req.body;
    if (url) {
      await pool.query(
        `INSERT INTO canvas_layouts (project_id, layout_data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (project_id) DO UPDATE SET layout_data = $2, updated_at = NOW()`,
        [projectId, JSON.stringify({ imageUrl: url })]
      );
      return res.json({ url });
    }

    if (imageData) {
      await pool.query(
        `INSERT INTO canvas_layouts (project_id, layout_data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (project_id) DO UPDATE SET layout_data = $2, updated_at = NOW()`,
        [projectId, JSON.stringify({ imageUrl: imageData })]
      );
      return res.json({ url: imageData });
    }

    res.status(400).json({ error: "No file, url, or imageData provided" });
  } catch (err) {
    console.error("POST /canvas/:projectId/upload error:", err);
    res.status(500).json({ error: "Failed to upload" });
  }
});

// Serve uploaded files statically
router.use("/uploads", (_req: Request, res: Response) => {
  // This is handled by express.static in the main server file
  res.status(404).json({ error: "File not found" });
});

export default router;
