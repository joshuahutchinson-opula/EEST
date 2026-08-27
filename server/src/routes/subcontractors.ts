import { Router, Request, Response } from "express";
import crypto from "crypto";
import pool from "../db";

const router = Router();

// GET /api/subcontractors/public/:token — read-only portal lookup, no auth
router.get("/public/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const result = await pool.query(
      `SELECT s.id, s.name, s.trade, s.email, s.created_at AS "createdAt",
              p.name AS "projectName",
              COALESCE(docs.documents, '[]') AS documents,
              COALESCE(tks.tasks, '[]') AS tasks
       FROM subcontractors s
       JOIN projects p ON p.id = s.project_id
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object(
           'id', sd.id, 'filename', sd.filename, 'fileUrl', sd.file_url, 'createdAt', sd.created_at
         ) ORDER BY sd.created_at DESC) AS documents
         FROM subcontractor_documents sd WHERE sd.subcontractor_id = s.id
       ) docs ON true
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object(
           'id', t.id, 'title', t.title, 'description', t.description, 'status', t.status,
           'priority', t.priority, 'dueDate', t.due_date
         ) ORDER BY t.created_at DESC) AS tasks
         FROM tasks t WHERE t.subcontractor_id = s.id
       ) tks ON true
       WHERE s.share_token = $1`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Link not found or has been revoked" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /subcontractors/public/:token error:", err);
    res.status(500).json({ error: "Failed to fetch subcontractor" });
  }
});

// GET /api/subcontractors/:projectId
router.get("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      `SELECT s.id, s.project_id AS "projectId", s.name, s.trade, s.email,
              s.share_token AS "shareToken", s.created_at AS "createdAt",
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
       RETURNING id, project_id AS "projectId", name, trade, email, share_token AS "shareToken", created_at AS "createdAt", '[]'::jsonb AS documents`,
      [projectId, name.trim(), trade || null, email || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /subcontractors/:projectId error:", err);
    res.status(500).json({ error: "Failed to add subcontractor" });
  }
});

// POST /api/subcontractors/:subId/share — generate (or regenerate) a shareable read-only link
router.post("/:subId/share", async (req: Request, res: Response) => {
  try {
    const { subId } = req.params;
    const shareToken = crypto.randomBytes(24).toString("hex");
    const result = await pool.query(
      `UPDATE subcontractors SET share_token = $2 WHERE id = $1 RETURNING id, share_token AS "shareToken"`,
      [subId, shareToken]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Subcontractor not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /subcontractors/:subId/share error:", err);
    res.status(500).json({ error: "Failed to generate share link" });
  }
});

// DELETE /api/subcontractors/:subId/share — revoke the shareable link
router.delete("/:subId/share", async (req: Request, res: Response) => {
  try {
    const { subId } = req.params;
    await pool.query(`UPDATE subcontractors SET share_token = NULL WHERE id = $1`, [subId]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /subcontractors/:subId/share error:", err);
    res.status(500).json({ error: "Failed to revoke share link" });
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
