import type { PoolClient } from "pg";
import { SYSTEM_CATEGORIES, SystemType, normalizeSystem, quoteTypeForSystem } from "./workbookSections";
import { getLiveExchangeRate } from "./exchangeRate";

// Each project asset owns exactly one quote line item (matched by project_asset_id), so Cost &
// Margin, BOM and Synthesis reflect the asset's real category/system/cost/quantity. This runs
// server-side on asset create/update/delete — the client never re-sends the quote, which is
// what used to let a Tech user's redacted $0 costs overwrite real ones.

const CATEGORY_SECTION: Record<string, Partial<Record<SystemType, number>>> = {
  camera: { VSS: 400, EAC: 1000, Intercom: 1500 },
  "access-control": { VSS: 400, EAC: 1000, Intercom: 1500 },
  "network-hardware": { VSS: 500, EAC: 1000, Intercom: 1500 },
  "cable-wire": { VSS: 600, EAC: 1100, Intercom: 1600 },
  intercom: { VSS: 400, EAC: 1000, Intercom: 1500 },
  software: { VSS: 100, EAC: 900, Intercom: 1400 },
  other: { VSS: 400, EAC: 1000, Intercom: 1500 },
};

interface AssetRow {
  id: string;
  project_id: string;
  category: string;
  system: string;
  device_store_ref: string | null;
  cable_spec: { cableType?: string; runDescription?: string; costPerFt?: number; lengthFt?: number } | null;
  unit_cost: string | null;
  quantity: number;
  purpose: string | null;
}

interface DeviceRow { manufacturer: string | null; model: string; category: string | null; price: string | null }

function describeAsset(asset: AssetRow, device: DeviceRow | null): string {
  if (device) return `${device.manufacturer || ""} ${device.model}`;
  const cs = asset.cable_spec;
  if (cs) return `${cs.cableType}${cs.runDescription ? " — " + cs.runDescription : ""}`;
  return asset.purpose || asset.category;
}

function assetUnitCost(asset: AssetRow, device: DeviceRow | null): number {
  if (asset.category === "cable-wire") {
    const cs = asset.cable_spec;
    return cs?.costPerFt && cs.lengthFt ? cs.costPerFt * cs.lengthFt : 0;
  }
  if (asset.unit_cost !== null && asset.unit_cost !== undefined) return Number(asset.unit_cost);
  if (device?.price) return Number(device.price);
  return 0;
}

// network-hardware covers both servers and network gear, which the Workbook splits into
// separate sections — only distinguishable once a catalog device is picked.
function resolveSection(asset: AssetRow, system: SystemType, device: DeviceRow | null): { sectionNumber: number; markup: number } {
  const sysCategories = SYSTEM_CATEGORIES[system];
  let sectionNumber = CATEGORY_SECTION[asset.category]?.[system] ?? sysCategories[3]?.sectionNumber ?? sysCategories[0].sectionNumber;
  if (asset.category === "network-hardware" && device?.category === "server") {
    if (system === "VSS") sectionNumber = 200;
    else if (system === "EAC") sectionNumber = 1050;
  }
  const markup = sysCategories.find((s) => s.sectionNumber === sectionNumber)?.defaultMarkup ?? 0.35;
  return { sectionNumber, markup };
}

async function getOrCreateProjectQuote(client: PoolClient, projectId: string, system: SystemType): Promise<string> {
  const existing = await client.query(`SELECT id FROM quotes WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, [projectId]);
  if (existing.rows.length > 0) return existing.rows[0].id;

  const proj = await client.query(`SELECT client FROM projects WHERE id = $1`, [projectId]);
  const exchangeRate = await getLiveExchangeRate();
  const inserted = await client.query(
    `INSERT INTO quotes (client_name, ref_number, date, status, quote_type, exchange_rate, project_id)
     VALUES ($1, $2, CURRENT_DATE, 'draft', $3, $4, $5) RETURNING id`,
    [proj.rows[0]?.client || "", `Q-${projectId.slice(0, 8).toUpperCase()}`, system === "Intercom" ? "Intercom" : "Multiple", exchangeRate, projectId]
  );
  const quoteId = inserted.rows[0].id;
  const sections = SYSTEM_CATEGORIES[system];
  for (let i = 0; i < sections.length; i++) {
    const sc = sections[i];
    await client.query(
      `INSERT INTO quote_categories (quote_id, name, type, system, section_number, import_rate_percent, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [quoteId, sc.name, quoteTypeForSystem(system), system, sc.sectionNumber, sc.importRatePercent, i]
    );
  }
  return quoteId;
}

async function getOrCreateCategory(client: PoolClient, quoteId: string, system: SystemType, sectionNumber: number): Promise<string> {
  const existing = await client.query(
    `SELECT id FROM quote_categories WHERE quote_id = $1 AND system = $2 AND section_number = $3 ORDER BY sort_order LIMIT 1`,
    [quoteId, system, sectionNumber]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;
  const sc = SYSTEM_CATEGORIES[system].find((s) => s.sectionNumber === sectionNumber);
  const inserted = await client.query(
    `INSERT INTO quote_categories (quote_id, name, type, system, section_number, import_rate_percent, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM quote_categories WHERE quote_id = $1))
     RETURNING id`,
    [quoteId, sc?.name || "Hardware", quoteTypeForSystem(system), system, sectionNumber, sc?.importRatePercent || 0]
  );
  return inserted.rows[0].id;
}

export async function syncAssetLineItem(client: PoolClient, assetId: string): Promise<void> {
  const assetResult = await client.query(`SELECT * FROM project_assets WHERE id = $1`, [assetId]);
  const asset: AssetRow | undefined = assetResult.rows[0];
  if (!asset?.project_id) return;

  const device: DeviceRow | null = asset.device_store_ref
    ? (await client.query(`SELECT manufacturer, model, category, price FROM devices WHERE id::text = $1`, [asset.device_store_ref])).rows[0] || null
    : null;
  const system = normalizeSystem(asset.system);
  const { sectionNumber, markup } = resolveSection(asset, system, device);

  const existingResult = await client.query(
    `SELECT li.id, li.markup_percent, li.item_number, li.category_id, li.cost_overridden, c.quote_id
     FROM quote_line_items li JOIN quote_categories c ON c.id = li.category_id
     WHERE li.project_asset_id = $1 LIMIT 1`,
    [assetId]
  );
  const existing = existingResult.rows[0];
  const quoteId = existing?.quote_id || (await getOrCreateProjectQuote(client, asset.project_id, system));
  const categoryId = await getOrCreateCategory(client, quoteId, system, sectionNumber);
  const description = describeAsset(asset, device);
  const unitCost = assetUnitCost(asset, device);

  if (existing) {
    await client.query(
      // A hand-edited cost (cost_overridden) survives asset edits until it's reset.
      `UPDATE quote_line_items SET category_id = $2, description = $3, unit_cost = CASE WHEN cost_overridden THEN unit_cost ELSE $4 END, quantity = $5, version = version + 1 WHERE id = $1`,
      [existing.id, categoryId, description, unitCost, asset.quantity]
    );
  } else {
    const countResult = await client.query(`SELECT COUNT(*)::int AS n FROM quote_line_items WHERE category_id = $1`, [categoryId]);
    const itemNumber = String(countResult.rows[0].n + 1).padStart(2, "0");
    await client.query(
      `INSERT INTO quote_line_items (category_id, item_number, description, unit_cost, quantity, markup_percent, project_asset_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [categoryId, itemNumber, description, unitCost, asset.quantity, markup, assetId]
    );
  }
  await client.query(`UPDATE quotes SET updated_at = NOW() WHERE id = $1`, [quoteId]);
}

export async function removeAssetLineItem(client: PoolClient, assetId: string): Promise<void> {
  await client.query(`DELETE FROM quote_line_items WHERE project_asset_id = $1`, [assetId]);
}
