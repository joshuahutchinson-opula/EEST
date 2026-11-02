import { Router, Request, Response } from "express";
import pool from "../db";
import { isTech, requireProjectAccess, sessionUserName, techMayAccessProject } from "../lib/roles";
import { signFileUrls, toStoredFileUrl } from "../lib/uploads";
import { mapAsBuilt, parseAsBuilt } from "../lib/asBuilt";
import { SET_INSTALL_STATUS } from "../lib/installStatus";
import { applyAction, defaultLocationId, InventoryError, ITEM_SELECT, mapItem } from "../lib/inventory";

const router = Router();

// Zones not tied to any project (quick-support work) stay open to Tech; a project zone follows
// the usual Projects-pipeline rule.
router.param("zoneId", async (req, res, next, zoneId) => {
  if (!isTech(req)) return next();
  try {
    const zone = await pool.query(`SELECT project_id FROM install_zones WHERE id::text = $1`, [zoneId]);
    if (zone.rows.length > 0 && !zone.rows[0].project_id) return next();
    return requireProjectAccess(() => zone.rows[0]?.project_id)(req, res, next);
  } catch (err) {
    console.error("install zone access check error:", err);
    res.status(500).json({ error: "Failed to check project access" });
  }
});

// GET /api/install/zones
router.get("/zones", async (req: Request, res: Response) => {
  try {
    const zonesResult = isTech(req)
      ? await pool.query(
          `SELECT * FROM install_zones
           WHERE project_id IS NULL OR project_id IN (SELECT id FROM projects WHERE pipeline_type = 'project' AND deleted_at IS NULL)
           ORDER BY sort_order`
        )
      : await pool.query("SELECT * FROM install_zones ORDER BY sort_order");
    // The inventory unit installed as each device, if one was picked.
    const units = await pool.query(`SELECT id, install_device_id FROM inventory_items WHERE install_device_id IS NOT NULL`);
    const unitByDevice = new Map(units.rows.map((u) => [u.install_device_id, u.id]));
    const zones = [];
    for (const z of zonesResult.rows) {
      const devicesResult = await pool.query("SELECT * FROM install_devices WHERE zone_id = $1 ORDER BY id", [z.id]);
      zones.push({
        id: z.id,
        name: z.name,
        projectId: z.project_id || undefined,
        isQuickSupport: z.is_quick_support,
        devices: devicesResult.rows.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          location: d.location || "",
          status: d.status,
          assignee: d.assignee || "",
          notes: d.notes || undefined,
          installedPhotos: signFileUrls(d.installed_photos),
          asBuilt: mapAsBuilt(d),
          camsSentAt: d.cams_sent_at || undefined,
          inventoryUnitId: unitByDevice.get(d.id) || undefined,
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
    const { name, projectId, isQuickSupport } = req.body;
    if (isTech(req) && projectId && !(await techMayAccessProject(projectId))) {
      return res.status(403).json({ error: "Forbidden for this role" });
    }
    const result = await pool.query(
      "INSERT INTO install_zones (name, project_id, is_quick_support) VALUES ($1, $2, $3) RETURNING *",
      [name, projectId || null, isQuickSupport || false]
    );
    res.status(201).json({ id: result.rows[0].id, name: result.rows[0].name, projectId: result.rows[0].project_id || undefined, isQuickSupport: result.rows[0].is_quick_support, devices: [] });
  } catch (err) {
    console.error("POST /install/zones error:", err);
    res.status(500).json({ error: "Failed to create zone" });
  }
});

// POST /api/install/zones/:zoneId/devices
router.post("/zones/:zoneId/devices", async (req: Request, res: Response) => {
  try {
    const { zoneId } = req.params;
    const { name, type, location, status, assignee, notes, projectAssetId } = req.body;
    // projectAssetId links a device created from a Project Asset back to it (and its catalog device).
    const result = await pool.query(
      `INSERT INTO install_devices (zone_id, name, type, location, status, assignee, notes, project_asset_id, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,
               (SELECT id FROM project_assets WHERE id::text = $8 AND project_id = (SELECT project_id FROM install_zones WHERE id = $1)),
               CASE WHEN $5 = 'complete' THEN NOW() END) RETURNING *`,
      [zoneId, name, type || "camera", location || "", status || "pending", assignee || "", notes || null, typeof projectAssetId === "string" ? projectAssetId : null]
    );
    res.status(201).json({ ...result.rows[0], installed_photos: signFileUrls(result.rows[0].installed_photos) });
  } catch (err) {
    console.error("POST /install/zones/:zoneId/devices error:", err);
    res.status(500).json({ error: "Failed to add device" });
  }
});

// PATCH /api/install/zones/:zoneId/devices/:deviceId
router.patch("/zones/:zoneId/devices/:deviceId", async (req: Request, res: Response) => {
  try {
    const { zoneId, deviceId } = req.params;
    const { status, addPhoto, asBuilt } = req.body;
    if (asBuilt !== undefined) {
      const parsed = parseAsBuilt(asBuilt);
      if (typeof parsed === "string") return res.status(400).json({ error: parsed });
      await pool.query(
        `UPDATE install_devices SET serial_number = $3, mac_address = $4, ip_address = $5, firmware = $6, warranty_expiry = $7 WHERE id = $1 AND zone_id = $2`,
        [deviceId, zoneId, parsed.serialNumber, parsed.macAddress, parsed.ipAddress, parsed.firmware, parsed.warrantyExpiry]
      );
    }
    if (status) {
      await pool.query(`UPDATE install_devices SET ${SET_INSTALL_STATUS} WHERE id = $2 AND zone_id = $3`, [status, deviceId, zoneId]);
    }
    if (typeof addPhoto === "string" && addPhoto) {
      await pool.query(
        "UPDATE install_devices SET installed_photos = installed_photos || $1::jsonb WHERE id = $2 AND zone_id = $3",
        [JSON.stringify([toStoredFileUrl(addPhoto)]), deviceId, zoneId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /install/zones/:zoneId/devices/:deviceId error:", err);
    res.status(500).json({ error: "Failed to update device status" });
  }
});

// GET /api/install/zones/:zoneId/devices/:deviceId/units — tracked units that can be installed as
// this device: the same Device Library model (when the device has one), in storage or checked out
// to the requester.
router.get("/zones/:zoneId/devices/:deviceId/units", async (req: Request, res: Response) => {
  try {
    const { zoneId, deviceId } = req.params;
    const dev = await pool.query(
      `SELECT pa.device_store_ref FROM install_devices d LEFT JOIN project_assets pa ON pa.id = d.project_asset_id WHERE d.id::text = $1 AND d.zone_id::text = $2`,
      [deviceId, zoneId]
    );
    if (!dev.rows.length) return res.status(404).json({ error: "Device not found" });
    const model = dev.rows[0].device_store_ref || null;
    const result = await pool.query(
      `${ITEM_SELECT}
       WHERE ii.kind = 'unit' AND ($1::text IS NULL OR ii.device_id::text = $1)
         AND (ii.status = 'in_storage' OR (ii.status = 'checked_out' AND lower(ii.holder_email) = lower($2)))
       ORDER BY ii.status = 'checked_out' DESC, ii.name, ii.serial_number`,
      [model, (req as any).user?.email || ""]
    );
    res.json({ matchedModel: !!model, units: result.rows.map((r) => mapItem(r, isTech(req))) });
  } catch (err) {
    console.error("GET /install/zones/:zoneId/devices/:deviceId/units error:", err);
    res.status(500).json({ error: "Failed to fetch units" });
  }
});

// POST /api/install/zones/:zoneId/devices/:deviceId/unit { unitId } — installs a tracked unit as
// this device: copies its serial/MAC into the as-built details, marks it Installed at the project
// and logs it.
router.post("/zones/:zoneId/devices/:deviceId/unit", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { zoneId, deviceId } = req.params;
    const unitId = typeof req.body?.unitId === "string" ? req.body.unitId : "";
    await client.query("BEGIN");
    const dev = await client.query(
      `SELECT d.id, d.name, z.project_id, pa.device_store_ref FROM install_devices d JOIN install_zones z ON z.id = d.zone_id
       LEFT JOIN project_assets pa ON pa.id = d.project_asset_id WHERE d.id::text = $1 AND d.zone_id::text = $2 FOR UPDATE OF d`,
      [deviceId, zoneId]
    );
    const device = dev.rows[0];
    if (!device) throw new InventoryError("Device not found", 404);
    if (!device.project_id) throw new InventoryError("Only devices on a project can take an inventory unit");
    const unit = (await client.query(`SELECT * FROM inventory_items WHERE id::text = $1 AND kind = 'unit'`, [unitId])).rows[0];
    if (!unit) throw new InventoryError("Unit not found", 404);
    if (device.device_store_ref && String(unit.device_id) !== String(device.device_store_ref)) throw new InventoryError("That unit is a different model");
    const email = String((req as any).user?.email || "").toLowerCase();
    if (unit.status === "checked_out" && String(unit.holder_email || "").toLowerCase() !== email) throw new InventoryError("That unit is checked out to someone else", 409);
    const already = await client.query(`SELECT id FROM inventory_items WHERE install_device_id = $1 AND id <> $2`, [device.id, unit.id]);
    if (already.rows.length) throw new InventoryError("This device already has a unit installed", 409);

    await applyAction(client, unit.id, { action: "install", projectId: device.project_id, installDeviceId: device.id, destination: device.name }, { name: sessionUserName(req), email: email || null });
    await client.query(
      `UPDATE install_devices SET serial_number = COALESCE($2, serial_number), mac_address = COALESCE($3, mac_address), warranty_expiry = COALESCE(warranty_expiry, $4) WHERE id = $1`,
      [device.id, unit.serial_number || null, unit.mac_address || null, unit.warranty_expiry || null]
    );
    await client.query("COMMIT");
    const updated = (await pool.query(`SELECT * FROM install_devices WHERE id = $1`, [device.id])).rows[0];
    res.json({ asBuilt: mapAsBuilt(updated), inventoryUnitId: unit.id });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    if (err instanceof InventoryError) return res.status(err.status).json({ error: err.message });
    console.error("POST /install/zones/:zoneId/devices/:deviceId/unit error:", err);
    res.status(500).json({ error: "Failed to install unit" });
  } finally {
    client.release();
  }
});

// DELETE /api/install/zones/:zoneId/devices/:deviceId?returnUnit=1 — removes a device from the
// project. Its inventory unit (if any) is logged as removed from site, and with returnUnit it is
// also checked back in to Storage.
router.delete("/zones/:zoneId/devices/:deviceId", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { zoneId, deviceId } = req.params;
    await client.query("BEGIN");
    const dev = await client.query(`SELECT id FROM install_devices WHERE id::text = $1 AND zone_id::text = $2 FOR UPDATE`, [deviceId, zoneId]);
    if (!dev.rows.length) throw new InventoryError("Device not found", 404);
    const by = { name: sessionUserName(req), email: (req as any).user?.email || null };
    const returnUnit = req.query.returnUnit === "1";
    const unit = (await client.query(`SELECT id FROM inventory_items WHERE install_device_id = $1 AND status = 'installed'`, [dev.rows[0].id])).rows[0];
    if (unit) {
      await applyAction(client, unit.id, { action: "remove_from_site", installDeviceId: dev.rows[0].id }, by);
      if (returnUnit) await applyAction(client, unit.id, { action: "check_in", purpose: "Returned from site", locationId: await defaultLocationId(client) }, by);
    }
    await client.query(`DELETE FROM commissioning_checklists WHERE device_id = $1`, [String(dev.rows[0].id)]);
    await client.query(`DELETE FROM install_devices WHERE id = $1`, [dev.rows[0].id]);
    await client.query("COMMIT");
    res.json({ success: true, unitId: unit?.id, returned: !!unit && returnUnit });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    if (err instanceof InventoryError) return res.status(err.status).json({ error: err.message });
    console.error("DELETE /install/zones/:zoneId/devices/:deviceId error:", err);
    res.status(500).json({ error: "Failed to remove device" });
  } finally {
    client.release();
  }
});

export default router;