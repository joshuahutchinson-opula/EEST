import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import pool from "../db";

const router = Router();

const uploadDir = path.join(__dirname, "..", "uploads", "documents");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// GET /api/documents/:projectId
router.get("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      "SELECT * FROM documents WHERE project_id = $1 ORDER BY created_at DESC",
      [projectId]
    );
    res.json(result.rows.map(row => ({
      id: row.id, projectId: row.project_id, filename: row.filename,
      fileUrl: row.file_url, fileType: row.file_type, fileSize: row.file_size,
      uploadedBy: row.uploaded_by, createdAt: row.created_at,
    })));
  } catch (err) {
    console.error("GET /documents/:projectId error:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// POST /api/documents/:projectId
router.post("/:projectId", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    const fileUrl = `/uploads/documents/${req.file.filename}`;
    const result = await pool.query(
      `INSERT INTO documents (project_id, filename, file_url, file_type, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [projectId, req.file.originalname, fileUrl, req.file.mimetype, req.file.size, "Joshua"]
    );
    const row = result.rows[0];
    res.status(201).json({
      id: row.id, projectId: row.project_id, filename: row.filename,
      fileUrl: row.file_url, fileType: row.file_type, fileSize: row.file_size,
      uploadedBy: row.uploaded_by, createdAt: row.created_at,
    });
  } catch (err) {
    console.error("POST /documents/:projectId error:", err);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

// DELETE /api/documents/:projectId/:id
router.delete("/:projectId/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT file_url FROM documents WHERE id = $1", [id]);
    if (result.rows.length > 0) {
      const filePath = path.join(__dirname, "..", result.rows[0].file_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query("DELETE FROM documents WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /documents/:projectId/:id error:", err);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;