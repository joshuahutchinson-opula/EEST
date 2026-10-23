import { Router, Request, Response } from "express";
import type { PoolClient } from "pg";
import pool from "../db";
import { isTech, requireProjectAccess } from "../lib/roles";
import { buildEquipmentSummaryDocx } from "../lib/docxDocuments";
import { syncAssetLineItem, removeAssetLineItem } from "../lib/assetSync";
import { signFileUrls, toStoredFileUrls } from "../lib/uploads";

const router = Router();
router.param("projectId", requireProjectAccess());

const mapRow = (row: any, tech: boolean) => ({
  id: row.id,
  projectId: row.project_id,
  category: row.category,
  system: row.system,
  deviceStoreRef: row.device_store_ref || undefined,
  accessControlType: row.access_control_type || undefined,
  cableSpec: row.cable_spec ? (tech ? { ...row.cable_spec, costPerFt: undefined } : row.cable_spec) : undefined,
  unitCost: tech ? undefined : (row.unit_cost !== null && row.unit_cost !== undefined ? Number(row.unit_cost) : undefined),
  quantity: row.quantity,
  location: row.location || "",
  zoneId: row.zone_id || undefined,
  purpose: row.purpose || "",
  coveragePhotos: signFileUrls(row.coverage_photos),
  notes: row.notes || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// GET /api/projects/:projectId/assets/equipment-summary — branded docx, grouped by category,
// never priced (safe for Tech role too, unlike the main asset list).
router.get("/:projectId/assets/equipment-summary", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const projectResult = await pool.query(`SELECT name, client FROM projects WHERE id = $1`, [projectId]);
    if (projectResult.rows.length === 0) return res.status(404).json({ error: "Project not found" });
    const assetsResult = await pool.query(
      `SELECT pa.category, pa.quantity, pa.location, pa.purpose, pa.cable_spec AS "cableSpec", d.manufacturer, d.model
       FROM project_assets pa
       LEFT JOIN devices d ON d.id::text = pa.device_store_ref
       WHERE pa.project_id = $1
       ORDER BY pa.created_at`,
      [projectId]
    );
    const buffer = await buildEquipmentSummaryDocx({
      project: projectResult.rows[0],
      assets: assetsResult.rows,
      generatedAt: new Date().toISOString(),
    });
    const filename = `${(projectResult.rows[0].name as string).replace(/\s+/g, "-")}-equipment-summary.docx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error("GET /projects/:projectId/assets/equipment-summary error:", err);
    res.status(500).json({ error: "Failed to generate equipment summary" });
  }
});

// GET /api/projects/:projectId/assets
router.get("/:projectId/assets", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const tech = isTech(req);
    const result = await pool.query(
      "SELECT * FROM project_assets WHERE project_id = $1 ORDER BY created_at",
      [projectId]
    );
    res.json(result.rows.map((row) => mapRow(row, tech)));
  } catch (err) {
    console.error("GET /projects/:projectId/assets error:", err);
    res.status(500).json({ error: "Failed to fetch project assets" });
  }
});

// Runs the asset write and its quote line-item sync in one transaction, so the Workbook never
// sees an asset without its line item (or vice versa).
async function withSync<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// POST /api/projects/:projectId/assets
router.post("/:projectId/assets", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const tech = isTech(req);
    const { category, system, deviceStoreRef, accessControlType, cableSpec, unitCost, quantity, location, zoneId, purpose, notes } = req.body;
    // A Tech-authored cable run must not carry a cost either.
    const sanitizedCableSpec = tech && cableSpec ? { ...cableSpec, costPerFt: undefined } : cableSpec;
    const row = await withSync(async (client) => {
      const result = await client.query(
        `INSERT INTO project_assets (project_id, category, system, device_store_ref, access_control_type, cable_spec, unit_cost, quantity, location, zone_id, purpose, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [projectId, category, system, deviceStoreRef || null, accessControlType || null, sanitizedCableSpec ? JSON.stringify(sanitizedCableSpec) : null, tech ? null : (unitCost ?? null), quantity || 1, location || "", zoneId || null, purpose || "", notes || null]
      );
      await syncAssetLineItem(client, result.rows[0].id);
      return result.rows[0];
    });
    res.status(201).json(mapRow(row, tech));
  } catch (err) {
    console.error("POST /projects/:projectId/assets error:", err);
    res.status(500).json({ error: "Failed to create project asset" });
  }
});

// PATCH /api/projects/:projectId/assets/:assetId
router.patch("/:projectId/assets/:assetId", async (req: Request, res: Response) => {
  try {
    const { projectId, assetId } = req.params;
    const tech = isTech(req);
    const { category, system, deviceStoreRef, accessControlType, cableSpec, unitCost, quantity, location, zoneId, purpose, coveragePhotos, notes } = req.body;
    // Tech never sees costPerFt (mapRow strips it), so a Tech edit re-sends the cable spec
    // without it — keep the stored value instead of wiping it.
    let sanitizedCableSpec = cableSpec;
    if (tech && cableSpec) {
      const current = await pool.query(`SELECT cable_spec FROM project_assets WHERE id = $1 AND project_id = $2`, [assetId, projectId]);
      sanitizedCableSpec = { ...cableSpec, costPerFt: current.rows[0]?.cable_spec?.costPerFt };
    }
    const row = await withSync(async (client) => {
      const result = await client.query(
        `UPDATE project_assets SET
          category = COALESCE($3, category),
          system = COALESCE($4, system),
          device_store_ref = COALESCE($5, device_store_ref),
          access_control_type = COALESCE($6, access_control_type),
          cable_spec = COALESCE($7, cable_spec),
          unit_cost = COALESCE($8, unit_cost),
          quantity = COALESCE($9, quantity),
          location = COALESCE($10, location),
          zone_id = COALESCE($11, zone_id),
          purpose = COALESCE($12, purpose),
          coverage_photos = COALESCE($13, coverage_photos),
          notes = COALESCE($14, notes),
          updated_at = NOW()
         WHERE id = $1 AND project_id = $2 RETURNING *`,
        [assetId, projectId, category, system, deviceStoreRef, accessControlType, sanitizedCableSpec ? JSON.stringify(sanitizedCableSpec) : undefined, tech ? undefined : unitCost, quantity, location, zoneId, purpose, coveragePhotos ? JSON.stringify(toStoredFileUrls(coveragePhotos)) : undefined, notes]
      );
      if (result.rows.length === 0) return null;
      await syncAssetLineItem(client, assetId);
      return result.rows[0];
    });
    if (!row) return res.status(404).json({ error: "Asset not found" });
    res.json(mapRow(row, tech));
  } catch (err) {
    console.error("PATCH /projects/:projectId/assets/:assetId error:", err);
    res.status(500).json({ error: "Failed to update project asset" });
  }
});

// DELETE /api/projects/:projectId/assets/:assetId
router.delete("/:projectId/assets/:assetId", async (req: Request, res: Response) => {
  try {
    const { projectId, assetId } = req.params;
    await withSync(async (client) => {
      const owned = await client.query(`SELECT 1 FROM project_assets WHERE id = $1 AND project_id = $2`, [assetId, projectId]);
      if (owned.rows.length === 0) return;
      await removeAssetLineItem(client, assetId);
      await client.query("DELETE FROM project_assets WHERE id = $1 AND project_id = $2", [assetId, projectId]);
    });
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /projects/:projectId/assets/:assetId error:", err);
    res.status(500).json({ error: "Failed to delete project asset" });
  }
});

export default router;
