import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

const mapRow = (row: any) => ({
  id: row.id,
  projectId: row.project_id,
  category: row.category,
  system: row.system,
  deviceStoreRef: row.device_store_ref || undefined,
  cableSpec: row.cable_spec || undefined,
  unitCost: row.unit_cost !== null && row.unit_cost !== undefined ? Number(row.unit_cost) : undefined,
  quantity: row.quantity,
  location: row.location || "",
  zoneId: row.zone_id || undefined,
  purpose: row.purpose || "",
  coveragePhotos: row.coverage_photos || [],
  notes: row.notes || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// GET /api/projects/:projectId/assets
router.get("/:projectId/assets", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      "SELECT * FROM project_assets WHERE project_id = $1 ORDER BY created_at",
      [projectId]
    );
    res.json(result.rows.map(mapRow));
  } catch (err) {
    console.error("GET /projects/:projectId/assets error:", err);
    res.status(500).json({ error: "Failed to fetch project assets" });
  }
});

// POST /api/projects/:projectId/assets
router.post("/:projectId/assets", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { category, system, deviceStoreRef, cableSpec, unitCost, quantity, location, zoneId, purpose, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO project_assets (project_id, category, system, device_store_ref, cable_spec, unit_cost, quantity, location, zone_id, purpose, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [projectId, category, system, deviceStoreRef || null, cableSpec ? JSON.stringify(cableSpec) : null, unitCost ?? null, quantity || 1, location || "", zoneId || null, purpose || "", notes || null]
    );
    res.status(201).json(mapRow(result.rows[0]));
  } catch (err) {
    console.error("POST /projects/:projectId/assets error:", err);
    res.status(500).json({ error: "Failed to create project asset" });
  }
});

// PATCH /api/projects/:projectId/assets/:assetId
router.patch("/:projectId/assets/:assetId", async (req: Request, res: Response) => {
  try {
    const { projectId, assetId } = req.params;
    const { category, system, deviceStoreRef, cableSpec, unitCost, quantity, location, zoneId, purpose, coveragePhotos, notes } = req.body;
    const result = await pool.query(
      `UPDATE project_assets SET
        category = COALESCE($3, category),
        system = COALESCE($4, system),
        device_store_ref = COALESCE($5, device_store_ref),
        cable_spec = COALESCE($6, cable_spec),
        unit_cost = COALESCE($7, unit_cost),
        quantity = COALESCE($8, quantity),
        location = COALESCE($9, location),
        zone_id = COALESCE($10, zone_id),
        purpose = COALESCE($11, purpose),
        coverage_photos = COALESCE($12, coverage_photos),
        notes = COALESCE($13, notes),
        updated_at = NOW()
       WHERE id = $1 AND project_id = $2 RETURNING *`,
      [assetId, projectId, category, system, deviceStoreRef, cableSpec ? JSON.stringify(cableSpec) : undefined, unitCost, quantity, location, zoneId, purpose, coveragePhotos ? JSON.stringify(coveragePhotos) : undefined, notes]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Asset not found" });
    res.json(mapRow(result.rows[0]));
  } catch (err) {
    console.error("PATCH /projects/:projectId/assets/:assetId error:", err);
    res.status(500).json({ error: "Failed to update project asset" });
  }
});

// DELETE /api/projects/:projectId/assets/:assetId
router.delete("/:projectId/assets/:assetId", async (req: Request, res: Response) => {
  try {
    const { projectId, assetId } = req.params;
    await pool.query("DELETE FROM project_assets WHERE id = $1 AND project_id = $2", [assetId, projectId]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /projects/:projectId/assets/:assetId error:", err);
    res.status(500).json({ error: "Failed to delete project asset" });
  }
});

export default router;
