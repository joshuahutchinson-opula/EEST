import { Router, Request, Response } from "express";
import pool from "../db";
import { buildCommissioningReportDocx } from "../lib/docxDocuments";
import { requireProjectAccess } from "../lib/roles";
import { signFileUrls, toStoredFileUrl, toStoredFileUrls } from "../lib/uploads";

const withSignedPhotos = (row: any) => ({ ...row, photos: signFileUrls(row.photos) });

const router = Router();
router.param("projectId", requireProjectAccess());

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
    res.json(result.rows.map(withSignedPhotos));
  } catch (err) {
    console.error("GET /commissioning/:projectId error:", err);
    res.status(500).json({ error: "Failed to fetch commissioning data" });
  }
});

router.post("/:projectId/sync", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const installResult = await client.query(
        `SELECT id, name, type, location, status FROM install_devices WHERE zone_id IN (SELECT id FROM install_zones WHERE project_id = $1)`,
        [projectId]
      );

      for (const row of installResult.rows) {
        await client.query(
          `INSERT INTO commissioning_checklists (project_id, device_id, device_name, location, status)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (project_id, device_id) DO NOTHING`,
          [projectId, row.id, row.name, row.location || null, row.status === "complete" ? "pass" : "pending"]
        );
      }

      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /commissioning/:projectId/sync error:", err);
    res.status(500).json({ error: "Failed to sync commissioning data" });
  }
});

router.post("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { deviceId, deviceName, location } = req.body;
    const result = await pool.query(
      `INSERT INTO commissioning_checklists (project_id, device_id, device_name, location)
       VALUES ($1, $2, $3, $4)
       RETURNING id, project_id AS "projectId", device_id AS "deviceId", device_name AS "deviceName", location, status, notes, photos`,
      [projectId, deviceId || null, deviceName, location || null]
    );
    res.status(201).json(withSignedPhotos(result.rows[0]));
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "That device is already on this project's checklist" });
    console.error("POST /commissioning/:projectId error:", err);
    res.status(500).json({ error: "Failed to add commissioning item" });
  }
});

router.patch("/:projectId/:deviceId", async (req: Request, res: Response) => {
  try {
    const { projectId, deviceId } = req.params;
    const { status, notes, photos, addPhoto } = req.body;
    // addPhoto appends one photo atomically (used by offline replays, which can't know the current list).
    const appended = typeof addPhoto === "string" && addPhoto ? JSON.stringify([toStoredFileUrl(addPhoto)]) : null;
    const result = await pool.query(
      `UPDATE commissioning_checklists
       SET status = COALESCE($3, status), notes = COALESCE($4, notes),
           photos = CASE WHEN $6::jsonb IS NOT NULL THEN COALESCE(photos, '[]'::jsonb) || $6::jsonb ELSE COALESCE($5, photos) END, updated_at = NOW()
       WHERE project_id = $1 AND device_id = $2
       RETURNING id, project_id AS "projectId", device_id AS "deviceId", device_name AS "deviceName", location, status, notes, photos`,
      [projectId, deviceId, status, notes, photos !== undefined ? JSON.stringify(toStoredFileUrls(photos) ?? []) : undefined, appended]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Device not found" });
    if (status) {
      const installStatus = status === "pass" ? "complete" : status === "fail" ? "failed" : "pending";
      await pool.query(
        `UPDATE install_devices SET status = $1 WHERE id::text = $2 AND zone_id IN (SELECT id FROM install_zones WHERE project_id = $3)`,
        [installStatus, deviceId, projectId]
      );
    }
    res.json(withSignedPhotos(result.rows[0]));
  } catch (err) {
    console.error("PATCH /commissioning/:projectId/:deviceId error:", err);
    res.status(500).json({ error: "Failed to update commissioning status" });
  }
});

router.post("/:projectId/bulk", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { deviceIds, status } = req.body;
    if (!Array.isArray(deviceIds) || !status) return res.status(400).json({ error: "deviceIds array and status required" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const deviceId of deviceIds) {
        await client.query(
          `UPDATE commissioning_checklists SET status = $1, updated_at = NOW() WHERE project_id = $2 AND device_id = $3`,
          [status, projectId, deviceId]
        );
        const installStatus = status === "pass" ? "complete" : status === "fail" ? "failed" : "pending";
        await client.query(
          `UPDATE install_devices SET status = $1 WHERE id::text = $2 AND zone_id IN (SELECT id FROM install_zones WHERE project_id = $3)`,
          [installStatus, deviceId, projectId]
        );
      }
      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /commissioning/:projectId/bulk error:", err);
    res.status(500).json({ error: "Failed to bulk update" });
  }
});

router.post("/:projectId/report", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    // installed_photos ("as-installed", Phase 7.2) lives on install_devices, a different table
    // from the generic commissioning-item photos field — joined here by device_id, which is
    // populated from install_devices.id at /sync time (see the sync route above). Items added
    // by hand have no install_devices row and so no as-installed photos.
    const result = await pool.query(
      `SELECT cc.device_name AS "deviceName", cc.location, cc.status, cc.notes,
              idv.installed_photos AS "installedPhotos"
       FROM commissioning_checklists cc
       LEFT JOIN install_devices idv ON idv.id::text = cc.device_id
       WHERE cc.project_id = $1
       ORDER BY cc.created_at`,
      [projectId]
    );
    const passed = result.rows.filter(r => r.status === "pass").length;
    const failed = result.rows.filter(r => r.status === "fail").length;
    const pending = result.rows.filter(r => r.status !== "pass" && r.status !== "fail").length;
    const projectResult = await pool.query(`SELECT name, client FROM projects WHERE id = $1`, [projectId]);
    const reportData = {
      project: projectResult.rows[0] || null,
      summary: { total: result.rows.length, passed, failed, pending },
      devices: result.rows,
      generatedAt: new Date().toISOString(),
    };
    const buffer = await buildCommissioningReportDocx(reportData);
    const filename = `${(reportData.project?.name || "project").replace(/\s+/g, "-")}-commissioning-report.docx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error("POST /commissioning/:projectId/report error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

export default router;