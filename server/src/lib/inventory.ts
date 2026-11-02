import type { PoolClient } from "pg";
import { signFileUrls } from "./uploads";

// Inventory (F19). Tracked units have a status; bulk stock only has a quantity. Status and quantity
// change only through an action, and every action writes one inventory_transactions row.

export const UNIT_STATUSES = [
  "in_storage", "checked_out", "reserved", "installed", "defective", "under_repair", "to_be_returned", "returned_to_supplier", "retired",
] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const INVENTORY_ACTIONS = [
  "received", "check_out", "check_in", "reserve", "install", "remove_from_site", "mark_defective", "send_for_repair", "send_to_supplier", "retire", "adjust",
] as const;
export type InventoryAction = (typeof INVENTORY_ACTIONS)[number];

// What Tech may do from the Inventory tab. Installing and removing go through the Installation tab
// (which has its own project access checks); "received" is only ever logged by item creation.
export const TECH_ACTIONS: InventoryAction[] = ["check_out", "check_in", "mark_defective"];
// Actions offered on an item's detail page (the rest are logged by other flows).
export const MANUAL_ACTIONS: InventoryAction[] = ["received", "check_out", "check_in", "reserve", "mark_defective", "send_for_repair", "send_to_supplier", "retire", "adjust"];

// For each unit action: the statuses it can start from and the status it leaves the unit in.
const UNIT_TRANSITIONS: Partial<Record<InventoryAction, { from: UnitStatus[]; to: UnitStatus }>> = {
  check_out: { from: ["in_storage", "reserved"], to: "checked_out" },
  check_in: { from: ["checked_out", "reserved", "to_be_returned", "under_repair", "defective"], to: "in_storage" },
  reserve: { from: ["in_storage"], to: "reserved" },
  install: { from: ["in_storage", "checked_out", "reserved"], to: "installed" },
  remove_from_site: { from: ["installed"], to: "to_be_returned" },
  mark_defective: { from: ["in_storage", "checked_out", "reserved", "installed", "to_be_returned", "under_repair"], to: "defective" },
  send_for_repair: { from: ["defective", "in_storage", "to_be_returned"], to: "under_repair" },
  send_to_supplier: { from: ["in_storage", "defective", "under_repair", "to_be_returned"], to: "returned_to_supplier" },
  retire: { from: ["in_storage", "defective", "under_repair", "to_be_returned", "returned_to_supplier"], to: "retired" },
};
// Bulk actions and the sign of their effect on quantity_on_hand ("adjust" sets an absolute count).
const BULK_EFFECT: Partial<Record<InventoryAction, 1 | -1 | 0>> = { received: 1, check_out: -1, check_in: 1, install: -1, adjust: 0 };

export interface ActionInput {
  action: InventoryAction;
  quantity?: number;          // bulk: how many (for "adjust", the new on-hand count)
  purpose?: string | null;
  projectId?: string | null;
  locationId?: string | null; // where the stock ends up (check in / received)
  destination?: string | null;
  notes?: string | null;
  installDeviceId?: string | null;
}

export interface Actor { name: string; email: string | null }

export class InventoryError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

const text = (v: unknown, max = 500) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

// Validates a request body into an ActionInput (shape only; applyAction checks it against the item).
export function parseActionInput(body: any): ActionInput {
  const action = body?.action;
  if (!INVENTORY_ACTIONS.includes(action)) throw new InventoryError("Unknown action");
  const qty = body.quantity === undefined || body.quantity === null || body.quantity === "" ? undefined : Number(body.quantity);
  if (qty !== undefined && (!Number.isInteger(qty) || qty < 0)) throw new InventoryError("Quantity must be a whole number");
  return {
    action,
    quantity: qty,
    purpose: text(body.purpose),
    projectId: text(body.projectId, 64),
    locationId: text(body.locationId, 64),
    destination: text(body.destination),
    notes: text(body.notes, 2000),
  };
}

// The default location ("Storage Unit"), where new stock and returned units go.
export async function defaultLocationId(client: PoolClient): Promise<string | null> {
  const r = await client.query(`SELECT id FROM inventory_locations WHERE is_default LIMIT 1`);
  return r.rows[0]?.id ?? null;
}

async function activeLocation(client: PoolClient, id: string): Promise<string> {
  const r = await client.query(`SELECT id FROM inventory_locations WHERE id::text = $1 AND NOT archived`, [id]);
  if (!r.rows.length) throw new InventoryError("Pick an active location");
  return r.rows[0].id;
}

async function existingProject(client: PoolClient, id: string): Promise<string> {
  const r = await client.query(`SELECT id FROM projects WHERE id::text = $1 AND deleted_at IS NULL`, [id]);
  if (!r.rows.length) throw new InventoryError("Project not found");
  return r.rows[0].id;
}

// Applies an action to an item inside the caller's transaction: checks it is allowed from the item's
// current state, updates status/quantity/holder/location/project, and logs it. Returns the log row id.
export async function applyAction(client: PoolClient, itemId: string, input: ActionInput, actor: Actor): Promise<string> {
  const itemRes = await client.query(`SELECT * FROM inventory_items WHERE id::text = $1 FOR UPDATE`, [itemId]);
  const item = itemRes.rows[0];
  if (!item) throw new InventoryError("Item not found", 404);
  const { action } = input;
  const projectId = input.projectId ? await existingProject(client, input.projectId) : null;
  let locationId = input.locationId ? await activeLocation(client, input.locationId) : null;

  let statusAfter: string | null = null;
  let quantity: number;
  let quantityAfter: number;

  if (item.kind === "unit") {
    if (action === "adjust") throw new InventoryError("Quantity adjust is for bulk stock only");
    if (action === "received") throw new InventoryError("A tracked unit is received when it is added");
    const t = UNIT_TRANSITIONS[action]!;
    if (!t.from.includes(item.status)) throw new InventoryError(`Can't ${action.replace(/_/g, " ")} a unit that is ${String(item.status).replace(/_/g, " ")}`, 409);
    if (action === "reserve" && !projectId) throw new InventoryError("Pick the project to reserve it for");
    if (action === "install" && !projectId) throw new InventoryError("Pick the project it is installed at");
    statusAfter = t.to;
    quantity = 1;
    quantityAfter = 1;

    // Holder: whoever checked it out. Project: the one it's reserved for / installed at.
    const holding = statusAfter === "checked_out";
    const atProject = statusAfter === "reserved" || statusAfter === "installed";
    if (statusAfter === "in_storage" && !locationId) locationId = item.location_id || (await defaultLocationId(client));
    await client.query(
      `UPDATE inventory_items SET status = $2,
         holder_name = $3, holder_email = $4,
         project_id = $5,
         install_device_id = $6,
         location_id = COALESCE($7, location_id),
         updated_at = NOW()
       WHERE id = $1`,
      [
        item.id, statusAfter,
        holding ? actor.name : null, holding ? actor.email : null,
        atProject ? projectId || item.project_id : null,
        statusAfter === "installed" ? input.installDeviceId || null : null,
        locationId,
      ]
    );
  } else {
    const effect = BULK_EFFECT[action];
    if (effect === undefined) throw new InventoryError(`${action.replace(/_/g, " ")} applies to tracked units only`);
    const n = input.quantity;
    if (n === undefined || (effect !== 0 && n <= 0)) throw new InventoryError("Enter a quantity");
    const before = Number(item.quantity_on_hand) || 0;
    if (effect === 0) {
      quantityAfter = n;
      quantity = n - before;
    } else {
      if (effect < 0 && n > before) throw new InventoryError(`Only ${before} on hand`, 409);
      quantity = effect * n;
      quantityAfter = before + quantity;
    }
    await client.query(
      `UPDATE inventory_items SET quantity_on_hand = $2, location_id = COALESCE($3, location_id), updated_at = NOW() WHERE id = $1`,
      [item.id, quantityAfter, effect > 0 ? locationId : null]
    );
  }

  // clock_timestamp(), not NOW(): two actions in one transaction (removed from site, then checked
  // in) must keep their order in the timeline.
  const log = await client.query(
    `INSERT INTO inventory_transactions (item_id, user_name, user_email, action, quantity, purpose, notes, project_id, location_id, destination, install_device_id, status_after, quantity_after, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, clock_timestamp()) RETURNING id`,
    [item.id, actor.name, actor.email, action, quantity, input.purpose || null, input.notes || null, projectId || (action === "remove_from_site" ? item.project_id : null),
     locationId, input.destination || null, input.installDeviceId || null, statusAfter, quantityAfter]
  );
  return log.rows[0].id;
}

// Item columns the list and detail endpoints select (joined with location, device and project).
export const ITEM_SELECT = `
  SELECT ii.*, l.name AS location_name, c.name AS category_name, d.manufacturer AS device_manufacturer, d.model AS device_model, d.image_url AS device_image_url,
         d.sku AS device_sku, p.name AS project_name
  FROM inventory_items ii
  LEFT JOIN inventory_locations l ON l.id = ii.location_id
  LEFT JOIN inventory_categories c ON c.id = ii.category_id
  LEFT JOIN devices d ON d.id = ii.device_id
  LEFT JOIN projects p ON p.id = ii.project_id`;

const day = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : undefined);

// Purchase cost is admin-only: it is left out entirely (not nulled) for Tech.
export function mapItem(row: any, tech: boolean) {
  const item: Record<string, unknown> = {
    id: row.id,
    kind: row.kind,
    name: row.name,
    status: row.kind === "unit" ? row.status : undefined,
    quantityOnHand: Number(row.quantity_on_hand) || 0,
    deviceId: row.device_id || undefined,
    manufacturer: row.device_manufacturer || undefined,
    model: row.device_model || undefined,
    deviceImageUrl: row.device_image_url || undefined,
    sku: row.device_sku || undefined,
    categoryId: row.category_id || undefined,
    category: row.category_name || undefined,
    partNumber: row.part_number || undefined,
    sizeSpec: row.size_spec || undefined,
    compatibleWith: row.compatible_with || undefined,
    supplier: row.supplier || undefined,
    photos: signFileUrls(row.photos),
    notes: row.notes || undefined,
    lowStockLevel: row.low_stock_level ?? undefined,
    serialNumber: row.serial_number || undefined,
    macAddress: row.mac_address || undefined,
    purchaseDate: day(row.purchase_date),
    warrantyExpiry: day(row.warranty_expiry),
    locationId: row.location_id || undefined,
    locationName: row.location_name || undefined,
    storageSpot: row.storage_spot || undefined,
    holderName: row.holder_name || undefined,
    holderEmail: row.holder_email || undefined,
    projectId: row.project_id || undefined,
    projectName: row.project_name || undefined,
    installDeviceId: row.install_device_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (!tech) item.purchaseCost = row.purchase_cost === null || row.purchase_cost === undefined ? undefined : Number(row.purchase_cost);
  return item;
}

export function mapTransaction(row: any) {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name || undefined,
    userName: row.user_name || "Unknown",
    action: row.action,
    quantity: row.quantity ?? 0,
    quantityAfter: row.quantity_after ?? undefined,
    statusAfter: row.status_after || undefined,
    purpose: row.purpose || undefined,
    notes: row.notes || undefined,
    projectId: row.project_id || undefined,
    projectName: row.project_name || undefined,
    locationName: row.location_name || undefined,
    destination: row.destination || undefined,
    createdAt: row.created_at,
  };
}

export const TRANSACTION_SELECT = `
  SELECT it.*, ii.name AS item_name, p.name AS project_name, l.name AS location_name
  FROM inventory_transactions it
  JOIN inventory_items ii ON ii.id = it.item_id
  LEFT JOIN projects p ON p.id = it.project_id
  LEFT JOIN inventory_locations l ON l.id = it.location_id`;
