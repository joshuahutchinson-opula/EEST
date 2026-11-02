import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import pool from "../db";
import { isTech, requireAdmin, sessionUserName } from "../lib/roles";
import { signFileUrl, toStoredFileUrls, UPLOAD_ROOT } from "../lib/uploads";
import {
  applyAction, defaultLocationId, InventoryError, ITEM_SELECT, mapItem, mapTransaction, MANUAL_ACTIONS, parseActionInput, TECH_ACTIONS, TRANSACTION_SELECT,
} from "../lib/inventory";

const router = Router();

const actor = (req: Request) => ({ name: sessionUserName(req), email: (req as any).user?.email || null });

function sendError(res: Response, err: unknown, fallback: string, where: string) {
  if (err instanceof InventoryError) return res.status(err.status).json({ error: err.message });
  const code = (err as { code?: string })?.code;
  if (code === "23505") return res.status(409).json({ error: "Another unit already has that serial number" });
  // Bad uuid / unknown location, device or project id from the client.
  if (code === "22P02" || code === "23503") return res.status(400).json({ error: "Unknown location, device or project" });
  console.error(`${where} error:`, err);
  res.status(500).json({ error: fallback });
}

// ── Locations ───────────────────────────────────────────────────────────────

// GET /api/inventory/locations
router.get("/locations", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT id, name, archived, is_default AS "isDefault" FROM inventory_locations ORDER BY archived, is_default DESC, name`);
    res.json(result.rows);
  } catch (err) {
    sendError(res, err, "Failed to fetch locations", "GET /inventory/locations");
  }
});

// POST /api/inventory/locations
router.post("/locations", requireAdmin, async (req: Request, res: Response) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 100) : "";
    if (!name) return res.status(400).json({ error: "name is required" });
    const result = await pool.query(`INSERT INTO inventory_locations (name) VALUES ($1) RETURNING id, name, archived, is_default AS "isDefault"`, [name]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if ((err as { code?: string })?.code === "23505") return res.status(409).json({ error: "A location with that name already exists" });
    sendError(res, err, "Failed to add location", "POST /inventory/locations");
  }
});

// PATCH /api/inventory/locations/:id — rename and/or archive.
router.patch("/locations/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 100) : null;
    if (name === "") return res.status(400).json({ error: "name can't be blank" });
    const archived = typeof req.body?.archived === "boolean" ? req.body.archived : null;
    // The default location can be renamed but not archived: returned units always need somewhere to go.
    const result = await pool.query(
      `UPDATE inventory_locations SET name = COALESCE($2, name), archived = CASE WHEN is_default THEN FALSE ELSE COALESCE($3, archived) END
       WHERE id::text = $1 RETURNING id, name, archived, is_default AS "isDefault"`,
      [req.params.id, name, archived]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Location not found" });
    res.json(result.rows[0]);
  } catch (err) {
    if ((err as { code?: string })?.code === "23505") return res.status(409).json({ error: "A location with that name already exists" });
    sendError(res, err, "Failed to update location", "PATCH /inventory/locations/:id");
  }
});

// ── Categories ──────────────────────────────────────────────────────────────

// GET /api/inventory/categories
router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT id, name, archived FROM inventory_categories ORDER BY archived, sort_order, name`);
    res.json(result.rows);
  } catch (err) {
    sendError(res, err, "Failed to fetch categories", "GET /inventory/categories");
  }
});

// POST /api/inventory/categories
router.post("/categories", requireAdmin, async (req: Request, res: Response) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 100) : "";
    if (!name) return res.status(400).json({ error: "name is required" });
    const result = await pool.query(
      `INSERT INTO inventory_categories (name, sort_order) VALUES ($1, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM inventory_categories)) RETURNING id, name, archived`,
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if ((err as { code?: string })?.code === "23505") return res.status(409).json({ error: "A category with that name already exists" });
    sendError(res, err, "Failed to add category", "POST /inventory/categories");
  }
});

// PATCH /api/inventory/categories/:id — rename and/or archive.
router.patch("/categories/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 100) : null;
    if (name === "") return res.status(400).json({ error: "name can't be blank" });
    const archived = typeof req.body?.archived === "boolean" ? req.body.archived : null;
    const result = await pool.query(
      `UPDATE inventory_categories SET name = COALESCE($2, name), archived = COALESCE($3, archived) WHERE id::text = $1 RETURNING id, name, archived`,
      [req.params.id, name, archived]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Category not found" });
    res.json(result.rows[0]);
  } catch (err) {
    if ((err as { code?: string })?.code === "23505") return res.status(409).json({ error: "A category with that name already exists" });
    sendError(res, err, "Failed to update category", "PATCH /inventory/categories/:id");
  }
});

// ── Photos ──────────────────────────────────────────────────────────────────

const PHOTOS_DIR = path.join(UPLOAD_ROOT, "inventory");
fs.mkdirSync(PHOTOS_DIR, { recursive: true });
const photoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PHOTOS_DIR),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

// POST /api/inventory/photos — stores an image and returns its URL to put in an item's photos.
router.post("/photos", requireAdmin, photoUpload.single("file"), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "Upload an image" });
  res.status(201).json({ url: signFileUrl(`/uploads/inventory/${req.file.filename}`) });
});

// ── Items ───────────────────────────────────────────────────────────────────

const text = (v: unknown, max = 500) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const date = (v: unknown) => { const s = text(v, 10); return s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null; };
const num = (v: unknown) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

// Descriptive fields an admin can set on create/edit. Status, quantity, holder and project only
// change through actions.
function parseItemFields(body: any) {
  const mac = text(body.macAddress, 32);
  if (mac && !/^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(mac)) throw new InventoryError("MAC address must look like AA:BB:CC:DD:EE:FF");
  const low = num(body.lowStockLevel);
  if (low !== null && (!Number.isInteger(low) || low < 0)) throw new InventoryError("Low-stock level must be a whole number");
  const cost = num(body.purchaseCost);
  if (cost !== null && cost < 0) throw new InventoryError("Purchase cost can't be negative");
  return {
    name: text(body.name, 200),
    device_id: text(body.deviceId, 64),
    category_id: text(body.categoryId, 64),
    part_number: text(body.partNumber, 100),
    size_spec: text(body.sizeSpec, 200),
    compatible_with: text(body.compatibleWith, 300),
    supplier: text(body.supplier, 200),
    photos: JSON.stringify(toStoredFileUrls(body.photos) || []),
    notes: text(body.notes, 4000),
    low_stock_level: low,
    serial_number: text(body.serialNumber, 100),
    mac_address: mac ? mac.toUpperCase().replace(/-/g, ":") : null,
    purchase_date: date(body.purchaseDate),
    warranty_expiry: date(body.warrantyExpiry),
    purchase_cost: cost,
    location_id: text(body.locationId, 64),
    storage_spot: text(body.storageSpot, 100),
  };
}

// GET /api/inventory/items
router.get("/items", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`${ITEM_SELECT} ORDER BY ii.kind DESC, ii.name`);
    const tech = isTech(req);
    res.json(result.rows.map((r) => mapItem(r, tech)));
  } catch (err) {
    sendError(res, err, "Failed to fetch inventory", "GET /inventory/items");
  }
});

// GET /api/inventory/items/:id — the item and its full history, oldest first.
router.get("/items/:id", async (req: Request, res: Response) => {
  try {
    const item = await pool.query(`${ITEM_SELECT} WHERE ii.id::text = $1`, [req.params.id]);
    if (!item.rows.length) return res.status(404).json({ error: "Item not found" });
    const txs = await pool.query(`${TRANSACTION_SELECT} WHERE it.item_id = $1 ORDER BY it.created_at, it.id`, [item.rows[0].id]);
    res.json({ ...mapItem(item.rows[0], isTech(req)), transactions: txs.rows.map(mapTransaction) });
  } catch (err) {
    sendError(res, err, "Failed to fetch item", "GET /inventory/items/:id");
  }
});

// POST /api/inventory/items — adding an item logs it as received.
router.post("/items", requireAdmin, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const kind = req.body?.kind === "unit" ? "unit" : "bulk";
    const f = parseItemFields(req.body || {});
    let name = f.name;
    if (!name && f.device_id) {
      const d = await client.query(`SELECT manufacturer, model FROM devices WHERE id::text = $1`, [f.device_id]);
      if (d.rows[0]) name = [d.rows[0].manufacturer, d.rows[0].model].filter(Boolean).join(" ");
    }
    if (!name) return res.status(400).json({ error: "name is required" });
    const qty = kind === "unit" ? 1 : Number(req.body.quantity ?? 0);
    if (!Number.isInteger(qty) || qty < 0) return res.status(400).json({ error: "Quantity must be a whole number" });
    await client.query("BEGIN");
    const locationId = f.location_id || (await defaultLocationId(client));
    const created = await client.query(
      `INSERT INTO inventory_items (kind, status, name, quantity_on_hand, device_id, category_id, part_number, size_spec, compatible_with, supplier, photos, notes,
         low_stock_level, serial_number, mac_address, purchase_date, warranty_expiry, purchase_cost, location_id, storage_spot)
       VALUES ($1, $2, $3, 0, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING id`,
      [kind, kind === "unit" ? "in_storage" : null, name, f.device_id, f.category_id, f.part_number, f.size_spec, f.compatible_with, f.supplier, f.photos, f.notes,
       kind === "bulk" ? f.low_stock_level : null, kind === "unit" ? f.serial_number : null, kind === "unit" ? f.mac_address : null,
       f.purchase_date, f.warranty_expiry, f.purchase_cost, locationId, f.storage_spot]
    );
    const id = created.rows[0].id;
    if (kind === "bulk" && qty > 0) {
      await applyAction(client, id, { action: "received", quantity: qty, locationId, notes: text(req.body.receivedNotes, 2000) }, actor(req));
    } else {
      // A unit starts at quantity 1 / in storage (an empty bulk item at 0); log its arrival directly.
      const startQty = kind === "unit" ? 1 : 0;
      await client.query(`UPDATE inventory_items SET quantity_on_hand = $2 WHERE id = $1`, [id, startQty]);
      await client.query(
        `INSERT INTO inventory_transactions (item_id, user_name, user_email, action, quantity, location_id, status_after, quantity_after, notes)
         VALUES ($1, $2, $3, 'received', $4, $5, $6, $4, $7)`,
        [id, actor(req).name, actor(req).email, startQty, locationId, kind === "unit" ? "in_storage" : null, text(req.body.receivedNotes, 2000)]
      );
    }
    await client.query("COMMIT");
    const row = await pool.query(`${ITEM_SELECT} WHERE ii.id = $1`, [id]);
    res.status(201).json(mapItem(row.rows[0], false));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    sendError(res, err, "Failed to create inventory item", "POST /inventory/items");
  } finally {
    client.release();
  }
});

// PATCH /api/inventory/items/:id — edit descriptive fields (only those present in the body).
router.patch("/items/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const f = parseItemFields(body) as Record<string, unknown>;
    const keyFor: Record<string, string> = {
      name: "name", deviceId: "device_id", categoryId: "category_id", partNumber: "part_number", sizeSpec: "size_spec", compatibleWith: "compatible_with",
      supplier: "supplier", photos: "photos", notes: "notes", lowStockLevel: "low_stock_level", serialNumber: "serial_number", macAddress: "mac_address",
      purchaseDate: "purchase_date", warrantyExpiry: "warranty_expiry", purchaseCost: "purchase_cost", locationId: "location_id", storageSpot: "storage_spot",
    };
    const sets: string[] = [];
    const values: unknown[] = [req.params.id];
    for (const [bodyKey, col] of Object.entries(keyFor)) {
      if (!(bodyKey in body)) continue;
      if (col === "name" && !f.name) return res.status(400).json({ error: "name can't be blank" });
      values.push(f[col]);
      sets.push(`${col} = $${values.length}${col === "photos" ? "::jsonb" : ""}`);
    }
    if (sets.length) {
      const result = await pool.query(`UPDATE inventory_items SET ${sets.join(", ")}, updated_at = NOW() WHERE id::text = $1 RETURNING id`, values);
      if (!result.rows.length) return res.status(404).json({ error: "Item not found" });
    }
    const row = await pool.query(`${ITEM_SELECT} WHERE ii.id::text = $1`, [req.params.id]);
    if (!row.rows.length) return res.status(404).json({ error: "Item not found" });
    res.json(mapItem(row.rows[0], false));
  } catch (err) {
    sendError(res, err, "Failed to update inventory item", "PATCH /inventory/items/:id");
  }
});

// DELETE /api/inventory/items/:id — removes the item and its history.
router.delete("/items/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await pool.query(`DELETE FROM inventory_items WHERE id::text = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    sendError(res, err, "Failed to delete inventory item", "DELETE /inventory/items/:id");
  }
});

// POST /api/inventory/items/:id/actions — check out, check in, reserve, mark defective, … The log
// entry is written from the action; who did it comes from the session.
router.post("/items/:id/actions", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const input = parseActionInput(req.body);
    if (!MANUAL_ACTIONS.includes(input.action)) return res.status(400).json({ error: "That action is done from the Installation tab" });
    if (isTech(req)) {
      if (!TECH_ACTIONS.includes(input.action)) return res.status(403).json({ error: "Forbidden for this role" });
      if (input.action === "check_in") {
        const s = await client.query(`SELECT kind, status FROM inventory_items WHERE id::text = $1`, [req.params.id]);
        if (s.rows[0]?.kind === "unit" && !["checked_out", "to_be_returned"].includes(s.rows[0].status)) return res.status(403).json({ error: "Forbidden for this role" });
      }
    }
    await client.query("BEGIN");
    await applyAction(client, req.params.id, input, actor(req));
    await client.query("COMMIT");
    const row = await pool.query(`${ITEM_SELECT} WHERE ii.id::text = $1`, [req.params.id]);
    res.json(mapItem(row.rows[0], isTech(req)));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    sendError(res, err, "Failed to log transaction", "POST /inventory/items/:id/actions");
  } finally {
    client.release();
  }
});

// GET /api/inventory/transactions — the most recent activity across all items.
router.get("/transactions", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`${TRANSACTION_SELECT} ORDER BY it.created_at DESC LIMIT 500`);
    res.json(result.rows.map(mapTransaction));
  } catch (err) {
    sendError(res, err, "Failed to fetch transactions", "GET /inventory/transactions");
  }
});

export default router;
