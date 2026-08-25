import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// GET /api/subcontractors/:projectId
router.get("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      `SELECT s.id, s.project_id AS "projectId", s.name, s.trade, s.email, s.rating,
              s.created_at AS "createdAt",
              COALESCE(json_agg(json_build_object(
                'id', sd.id,
                'filename', sd.filename,
                'fileUrl', sd.file_url,
                'uploadedBy', sd.uploaded_by,
                'createdAt', sd.created_at
              ) ORDER BY sd.created_at DESC) FILTER (WHERE sd.id IS NOT NULL), '[]') AS documents
       FROM subcontractors s
       LEFT JOIN subcontractor_documents sd ON sd.subcontractor_id = s.id
       WHERE s.project_id = $1
       GROUP BY s.id
       ORDER BY s.name`,
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /subcontractors/:projectId error:", err);
    res.status(500).json({ error: "Failed to fetch subcontractors" });
  }
});

// POST /api/subcontractors/:projectId
router.post("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, trade, email } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    const result = await pool.query(
      `INSERT INTO subcontractors (project_id, name, trade, email)
       VALUES ($1, $2, $3, $4)
       RETURNING id, project_id AS "projectId", name, trade, email, rating, created_at AS "createdAt", '[]'::jsonb AS documents`,
      [projectId, name.trim(), trade || null, email || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /subcontractors/:projectId error:", err);
    res.status(500).json({ error: "Failed to add subcontractor" });
  }
});

// POST /api/subcontractors/:subId/rate
router.post("/:subId/rate", async (req: Request, res: Response) => {
  try {
    const { subId } = req.params;
    const { rating } = req.body;
    const result = await pool.query(
      `UPDATE subcontractors SET rating = $2 WHERE id = $1
       RETURNING id, rating`,
      [subId, rating]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Subcontractor not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /subcontractors/:subId/rate error:", err);
    res.status(500).json({ error: "Failed to rate subcontractor" });
  }
});

// DELETE /api/subcontractors/:subId
router.delete("/:subId", async (req: Request, res: Response) => {
  try {
    const { subId } = req.params;
    await pool.query(`DELETE FROM subcontractors WHERE id = $1`, [subId]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /subcontractors/:subId error:", err);
    res.status(500).json({ error: "Failed to delete subcontractor" });
  }
});

// POST /api/subcontractors/:subId/documents
router.post("/:subId/documents", async (req: Request, res: Response) => {
  try {
    const { subId } = req.params;
    const { filename, fileUrl, uploadedBy } = req.body;
    if (!filename || !fileUrl) {
      return res.status(400).json({ error: "filename and fileUrl are required" });
    }
    const result = await pool.query(
      `INSERT INTO subcontractor_documents (subcontractor_id, filename, file_url, uploaded_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, filename, file_url AS "fileUrl", uploaded_by AS "uploadedBy", created_at AS "createdAt"`,
      [subId, filename, fileUrl, uploadedBy || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /subcontractors/:subId/documents error:", err);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

export default router;