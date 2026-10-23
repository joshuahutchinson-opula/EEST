import { Router, Request, Response } from "express";
import pool from "../db";
import { isTech, requireAdmin, techMayAccessProject } from "../lib/roles";
import { getLiveExchangeRate } from "../lib/exchangeRate";
import { syncAssetLineItem } from "../lib/assetSync";
import { FROZEN_QUOTE_MESSAGE, QUOTE_STATUSES, isQuoteFrozen, latestQuoteId, quoteIdForCategory, quoteIdForLineItem, reviseQuoteStandalone } from "../lib/quoteRevisions";

function mapQuote(q: any, categories: any[]) {
  return {
    id: q.id, clientName: q.client_name, refNumber: q.ref_number, date: q.date ? new Date(q.date).toISOString().slice(0, 10) : "",
    status: q.status, quoteType: q.quote_type, categories, exchangeRate: Number(q.exchange_rate),
    projectId: q.project_id || undefined, revision: Number(q.revision) || 1, sentAt: q.sent_at || undefined,
    createdAt: q.created_at, updatedAt: q.updated_at,
  };
}

const router = Router();

// Quotes back the Workbook (Cost & Margin / BOM / Synthesis), which Tech must not see any
// pricing from. Reads stay open but redacted; every write is admin-only. Asset → line-item
// syncing happens server-side (lib/assetSync.ts), so Tech never needs to write a quote.
function redactCostsForTech(categories: any[]): any[] {
  return categories.map((cat) => ({
    ...cat,
    lineItems: cat.lineItems.map((li: any) => ({
      ...li,
      unitCost: 0,
      sellPrice: 0,
      costTotal: 0,
      sellTotal: 0,
      profit: 0,
      jmdConversion: 0,
    })),
  }));
}

async function deleteByIds(client: any, table: string, ids: string[]) {
  if (ids.length === 0) return;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  await client.query(`DELETE FROM ${table} WHERE id IN (${placeholders})`, ids);
}

function mapLineItem(li: any, exchangeRate: number) {
  const unitCost = Number(li.unit_cost);
  const markupPercent = Number(li.markup_percent);
  const sellPrice = unitCost * (1 + markupPercent);
  return {
    id: li.id,
    itemNumber: li.item_number,
    description: li.description || "",
    unitCost,
    quantity: li.quantity,
    markupPercent,
    sellPrice,
    costTotal: unitCost * li.quantity,
    sellTotal: sellPrice * li.quantity,
    profit: (sellPrice * li.quantity) - (unitCost * li.quantity),
    jmdConversion: sellPrice * li.quantity * exchangeRate,
    projectAssetId: li.project_asset_id || undefined,
    costOverridden: !!li.cost_overridden,
    version: Number(li.version) || 1,
  };
}

// Categories and line items for any number of quotes in one joined query.
async function loadCategoriesFor(quotes: { id: string; exchangeRate: number }[]) {
  const byQuote = new Map<string, any[]>(quotes.map((q) => [q.id, []]));
  if (quotes.length === 0) return byQuote;
  const rate = new Map(quotes.map((q) => [q.id, q.exchangeRate]));
  const result = await pool.query(
    `SELECT qc.id AS cat_id, qc.quote_id, qc.name AS cat_name, qc.type AS cat_type, qc.system AS cat_system,
            qc.section_number AS cat_section_number, qc.import_rate_percent AS cat_import_rate_percent, li.*
     FROM quote_categories qc
     LEFT JOIN quote_line_items li ON li.category_id = qc.id
     WHERE qc.quote_id = ANY($1::uuid[])
     ORDER BY qc.quote_id, qc.sort_order, qc.id, li.item_number, li.id`,
    [quotes.map((q) => q.id)]
  );
  const cats = new Map<string, any>();
  for (const row of result.rows) {
    let cat = cats.get(row.cat_id);
    if (!cat) {
      cat = {
        id: row.cat_id,
        name: row.cat_name,
        type: row.cat_type,
        system: row.cat_system,
        sectionNumber: row.cat_section_number,
        importRatePercent: Number(row.cat_import_rate_percent),
        lineItems: [],
        contingency: undefined,
      };
      cats.set(row.cat_id, cat);
      byQuote.get(row.quote_id)!.push(cat);
    }
    if (row.id) cat.lineItems.push(mapLineItem(row, rate.get(row.quote_id) ?? 0));
  }
  return byQuote;
}

async function loadCategories(quoteId: string, exchangeRate: number) {
  return (await loadCategoriesFor([{ id: quoteId, exchangeRate }])).get(quoteId)!;
}

// GET /api/quotes
router.get("/", async (req: Request, res: Response) => {
  try {
    const tech = isTech(req);
    const quotesResult = tech
      ? await pool.query(
          `SELECT q.* FROM quotes q JOIN projects p ON p.id = q.project_id
           WHERE p.pipeline_type = 'project' AND p.deleted_at IS NULL ORDER BY q.created_at DESC`
        )
      : await pool.query("SELECT * FROM quotes ORDER BY created_at DESC");
    const categoriesByQuote = await loadCategoriesFor(quotesResult.rows.map((q) => ({ id: q.id, exchangeRate: Number(q.exchange_rate) })));
    const quotes = [];
    for (const q of quotesResult.rows) {
      let categories = categoriesByQuote.get(q.id)!;
      if (tech) categories = redactCostsForTech(categories);
      quotes.push(mapQuote(q, categories));
    }
    res.json(quotes);
  } catch (err) {
    console.error("GET /quotes error:", err);
    res.status(500).json({ error: "Failed to fetch quotes" });
  }
});

// GET /api/quotes/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const qResult = await pool.query("SELECT * FROM quotes WHERE id=$1", [id]);
    if (qResult.rows.length === 0) return res.status(404).json({ error: "Quote not found" });
    const q = qResult.rows[0];
    if (isTech(req) && !(await techMayAccessProject(q.project_id))) return res.status(403).json({ error: "Forbidden for this role" });
    let categories = await loadCategories(id, Number(q.exchange_rate));
    if (isTech(req)) categories = redactCostsForTech(categories);
    res.json(mapQuote(q, categories));
  } catch (err) {
    console.error("GET /quotes/:id error:", err);
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

// POST /api/quotes
router.post("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { clientName, refNumber, date, status, quoteType, categories, exchangeRate, projectId } = req.body;
    const qResult = await pool.query(
      "INSERT INTO quotes (client_name, ref_number, date, status, quote_type, exchange_rate, project_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [clientName, refNumber, date, status || "draft", quoteType || "Multiple", Number(exchangeRate) > 0 ? Number(exchangeRate) : await getLiveExchangeRate(), projectId || null]
    );
    const quote = qResult.rows[0];
    if (categories && Array.isArray(categories)) {
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        const cResult = await pool.query(
          "INSERT INTO quote_categories (quote_id, name, type, system, section_number, import_rate_percent, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
          [quote.id, cat.name, cat.type || "Multiple", cat.system || "VSS", cat.sectionNumber || 0, cat.importRatePercent || 0, i]
        );
        if (cat.lineItems && Array.isArray(cat.lineItems)) {
          for (const li of cat.lineItems) {
            await pool.query(
              "INSERT INTO quote_line_items (category_id, item_number, description, unit_cost, quantity, markup_percent, project_asset_id) VALUES ($1,$2,$3,$4,$5,$6,$7)",
              [cResult.rows[0].id, li.itemNumber, li.description, li.unitCost || 0, li.quantity || 0, li.markupPercent || 0, li.projectAssetId || null]
            );
          }
        }
      }
    }
    const savedCategories = await loadCategories(quote.id, Number(quote.exchange_rate));
    res.status(201).json(mapQuote(quote, savedCategories));
  } catch (err) {
    console.error("POST /quotes error:", err);
    res.status(500).json({ error: "Failed to create quote" });
  }
});

// PATCH /api/quotes/:id
router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { clientName, refNumber, status, exchangeRate, categories } = req.body;
  if (status !== undefined && !QUOTE_STATUSES.includes(status)) return res.status(400).json({ error: `status must be one of ${QUOTE_STATUSES.join(", ")}` });
  // Content and the locked rate can only change on a draft; status changes are how a version is sent.
  if ((Array.isArray(categories) || exchangeRate !== undefined) && (await isQuoteFrozen(pool, id))) return res.status(409).json({ error: FROZEN_QUOTE_MESSAGE, frozen: true });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE quotes SET client_name=COALESCE($2,client_name), ref_number=COALESCE($3,ref_number), status=COALESCE($4,status), exchange_rate=COALESCE($5,exchange_rate),
         sent_at = CASE WHEN $4 = 'sent' AND status <> 'sent' THEN NOW() ELSE sent_at END, updated_at=NOW() WHERE id=$1`,
      [id, clientName, refNumber, status, exchangeRate]
    );

    if (Array.isArray(categories)) {
      const existingCatsResult = await client.query("SELECT id FROM quote_categories WHERE quote_id=$1", [id]);
      const existingCatIds = new Set<string>(existingCatsResult.rows.map((r: any) => r.id));
      const incomingCatIds = new Set<string>(categories.filter((c: any) => c.id && existingCatIds.has(c.id)).map((c: any) => c.id));
      const catIdsToDelete = [...existingCatIds].filter((cid) => !incomingCatIds.has(cid));
      await deleteByIds(client, "quote_categories", catIdsToDelete);

      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        let categoryId: string = cat.id;
        const isExistingCat = categoryId && existingCatIds.has(categoryId);
        if (isExistingCat) {
          await client.query(
            `UPDATE quote_categories SET name=$2, type=$3, system=$4, section_number=$5, import_rate_percent=$6, sort_order=$7 WHERE id=$1`,
            [categoryId, cat.name, cat.type || "Multiple", cat.system || "VSS", cat.sectionNumber || 0, cat.importRatePercent || 0, i]
          );
        } else {
          const inserted = await client.query(
            `INSERT INTO quote_categories (quote_id, name, type, system, section_number, import_rate_percent, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
            [id, cat.name, cat.type || "Multiple", cat.system || "VSS", cat.sectionNumber || 0, cat.importRatePercent || 0, i]
          );
          categoryId = inserted.rows[0].id;
        }

        const lineItems = Array.isArray(cat.lineItems) ? cat.lineItems : [];
        const existingItemsResult = await client.query("SELECT id FROM quote_line_items WHERE category_id=$1", [categoryId]);
        const existingItemIds = new Set<string>(existingItemsResult.rows.map((r: any) => r.id));
        const incomingItemIds = new Set<string>(lineItems.filter((li: any) => li.id && existingItemIds.has(li.id)).map((li: any) => li.id));
        const itemIdsToDelete = [...existingItemIds].filter((iid) => !incomingItemIds.has(iid));
        await deleteByIds(client, "quote_line_items", itemIdsToDelete);

        for (const li of lineItems) {
          const isExistingItem = li.id && existingItemIds.has(li.id);
          if (isExistingItem) {
            // An asset-synced line's cost belongs to the asset unless the client marks it as a
            // manual override; otherwise a stale tab re-sending old costs would overwrite synced ones.
            await client.query(
              `UPDATE quote_line_items SET item_number=$2, description=$3,
                 unit_cost = CASE WHEN project_asset_id IS NULL OR $8 THEN $4 ELSE unit_cost END,
                 cost_overridden = cost_overridden OR (project_asset_id IS NOT NULL AND $8),
                 quantity=$5, markup_percent=$6, project_asset_id=$7, version = version + 1 WHERE id=$1`,
              [li.id, li.itemNumber || "", li.description || "", li.unitCost || 0, li.quantity || 0, li.markupPercent || 0, li.projectAssetId || null, li.costOverridden === true]
            );
          } else {
            await client.query(
              `INSERT INTO quote_line_items (category_id, item_number, description, unit_cost, quantity, markup_percent, project_asset_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
              [categoryId, li.itemNumber || "", li.description || "", li.unitCost || 0, li.quantity || 0, li.markupPercent || 0, li.projectAssetId || null]
            );
          }
        }
      }
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PATCH /quotes/:id error:", err);
    res.status(500).json({ error: "Failed to update quote" });
  } finally {
    client.release();
  }
});

// --- Per-line-item writes ---------------------------------------------------------------------
// The Workbook saves one line item at a time. Every update and delete carries the version the
// client last saw; if the row has changed since (another tab, an asset sync), the write is
// refused with 409 and the current row, so the client can reload it instead of overwriting.

async function loadLineItem(itemId: string) {
  const result = await pool.query(
    `SELECT li.*, q.exchange_rate FROM quote_line_items li
     JOIN quote_categories c ON c.id = li.category_id JOIN quotes q ON q.id = c.quote_id
     WHERE li.id::text = $1`,
    [itemId]
  );
  const row = result.rows[0];
  return row ? mapLineItem(row, Number(row.exchange_rate)) : null;
}

function lineItemNumbers(body: any) {
  const n = (v: unknown) => (v === undefined || v === null || v === "" ? undefined : Number(v));
  const unitCost = n(body.unitCost);
  const quantity = n(body.quantity);
  const markupPercent = n(body.markupPercent);
  if ([unitCost, quantity, markupPercent].some((v) => v !== undefined && !Number.isFinite(v))) return null;
  return { unitCost, quantity: quantity === undefined ? undefined : Math.trunc(quantity), markupPercent };
}

// POST /api/quotes/:quoteId/line-items
router.post("/:quoteId/line-items", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { quoteId } = req.params;
    const { categoryId, description, itemNumber } = req.body;
    const nums = lineItemNumbers(req.body);
    if (!nums) return res.status(400).json({ error: "unitCost, quantity and markupPercent must be numbers" });
    if (typeof description !== "string" || !description.trim()) return res.status(400).json({ error: "description is required" });
    const cat = await pool.query(`SELECT id FROM quote_categories WHERE id::text = $1 AND quote_id::text = $2`, [categoryId, quoteId]);
    if (cat.rows.length === 0) return res.status(404).json({ error: "Category not found on this quote" });
    if (await isQuoteFrozen(pool, quoteId)) return res.status(409).json({ error: FROZEN_QUOTE_MESSAGE, frozen: true });
    const inserted = await pool.query(
      `INSERT INTO quote_line_items (category_id, item_number, description, unit_cost, quantity, markup_percent)
       VALUES ($1, COALESCE($2, LPAD(((SELECT COUNT(*) FROM quote_line_items WHERE category_id = $1) + 1)::text, 2, '0')), $3, $4, $5, $6)
       RETURNING id`,
      [categoryId, itemNumber || null, description.trim(), nums.unitCost ?? 0, nums.quantity ?? 1, nums.markupPercent ?? 0]
    );
    await pool.query(`UPDATE quotes SET updated_at = NOW() WHERE id::text = $1`, [quoteId]);
    res.status(201).json(await loadLineItem(inserted.rows[0].id));
  } catch (err) {
    console.error("POST /quotes/:quoteId/line-items error:", err);
    res.status(500).json({ error: "Failed to add line item" });
  }
});

// PATCH /api/quotes/line-items/:itemId  { version, description?, unitCost?, quantity?, markupPercent?, itemNumber? }
router.patch("/line-items/:itemId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { version, description, itemNumber } = req.body;
    const nums = lineItemNumbers(req.body);
    if (!nums) return res.status(400).json({ error: "unitCost, quantity and markupPercent must be numbers" });
    if (!Number.isInteger(Number(version))) return res.status(400).json({ error: "version is required" });
    if (description !== undefined && (typeof description !== "string" || !description.trim())) return res.status(400).json({ error: "description can't be empty" });
    const itemQuoteId = await quoteIdForLineItem(pool, itemId);
    if (itemQuoteId && (await isQuoteFrozen(pool, itemQuoteId))) return res.status(409).json({ error: FROZEN_QUOTE_MESSAGE, frozen: true });
    // Editing the cost of an asset-synced line marks it as a manual override (see lib/assetSync.ts).
    const result = await pool.query(
      `UPDATE quote_line_items SET
         description = COALESCE($3, description),
         item_number = COALESCE($4, item_number),
         unit_cost = COALESCE($5, unit_cost),
         quantity = COALESCE($6, quantity),
         markup_percent = COALESCE($7, markup_percent),
         cost_overridden = cost_overridden OR (project_asset_id IS NOT NULL AND $5::numeric IS NOT NULL),
         version = version + 1
       WHERE id::text = $1 AND version = $2
       RETURNING category_id`,
      [itemId, Number(version), description === undefined ? null : description.trim(), itemNumber ?? null, nums.unitCost ?? null, nums.quantity ?? null, nums.markupPercent ?? null]
    );
    if (result.rows.length === 0) {
      const current = await loadLineItem(itemId);
      if (!current) return res.status(404).json({ error: "Line item not found" });
      return res.status(409).json({ error: "This line item was changed by someone else", current });
    }
    await pool.query(`UPDATE quotes SET updated_at = NOW() WHERE id = (SELECT quote_id FROM quote_categories WHERE id = $1)`, [result.rows[0].category_id]);
    res.json(await loadLineItem(itemId));
  } catch (err) {
    console.error("PATCH /quotes/line-items/:itemId error:", err);
    res.status(500).json({ error: "Failed to update line item" });
  }
});

// DELETE /api/quotes/line-items/:itemId?version=N
router.delete("/line-items/:itemId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const version = Number(req.query.version);
    if (!Number.isInteger(version)) return res.status(400).json({ error: "version is required" });
    const current = await loadLineItem(itemId);
    if (!current) return res.status(404).json({ error: "Line item not found" });
    if (current.projectAssetId) return res.status(400).json({ error: "This line comes from a project asset — remove the asset instead" });
    const itemQuoteId = await quoteIdForLineItem(pool, itemId);
    if (itemQuoteId && (await isQuoteFrozen(pool, itemQuoteId))) return res.status(409).json({ error: FROZEN_QUOTE_MESSAGE, frozen: true });
    const result = await pool.query(`DELETE FROM quote_line_items WHERE id::text = $1 AND version = $2 RETURNING id`, [itemId, version]);
    if (result.rows.length === 0) return res.status(409).json({ error: "This line item was changed by someone else", current: await loadLineItem(itemId) });
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /quotes/line-items/:itemId error:", err);
    res.status(500).json({ error: "Failed to delete line item" });
  }
});

// PUT /api/quotes/categories/:categoryId/order  { itemIds } — renumbers the category's line items
// in that order. Ordering isn't content, so it doesn't bump versions.
router.put("/categories/:categoryId/order", requireAdmin, async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const { itemIds } = req.body;
  if (!Array.isArray(itemIds) || itemIds.some((id) => typeof id !== "string")) return res.status(400).json({ error: "itemIds must be an array of ids" });
  const categoryQuoteId = await quoteIdForCategory(pool, categoryId);
  if (categoryQuoteId && (await isQuoteFrozen(pool, categoryQuoteId))) return res.status(409).json({ error: FROZEN_QUOTE_MESSAGE, frozen: true });
  const client = await pool.connect();
  try {
    const existing = await client.query(`SELECT id FROM quote_line_items WHERE category_id::text = $1`, [categoryId]);
    const known = new Set(existing.rows.map((r: any) => r.id));
    if (itemIds.some((id: string) => !known.has(id))) return res.status(400).json({ error: "Every id must belong to this category" });
    // Items not listed keep their relative order after the listed ones.
    const rest = existing.rows.map((r: any) => r.id).filter((id: string) => !itemIds.includes(id));
    await client.query("BEGIN");
    const ordered = [...itemIds, ...rest];
    for (let i = 0; i < ordered.length; i++) {
      await client.query(`UPDATE quote_line_items SET item_number = $2 WHERE id = $1`, [ordered[i], String(i + 1).padStart(2, "0")]);
    }
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("PUT /quotes/categories/:categoryId/order error:", err);
    res.status(500).json({ error: "Failed to reorder line items" });
  } finally {
    client.release();
  }
});

// POST /api/quotes/line-items/:itemId/reset-cost — drop a manual cost override on an asset-synced
// line and take the cost from its asset again.
router.post("/line-items/:itemId/reset-cost", requireAdmin, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const found = await client.query(`SELECT project_asset_id FROM quote_line_items WHERE id::text = $1`, [req.params.itemId]);
    if (found.rows.length === 0) return res.status(404).json({ error: "Line item not found" });
    if (!found.rows[0].project_asset_id) return res.status(400).json({ error: "Line item is not linked to a project asset" });
    const itemQuote = (await client.query(
      `SELECT q.id, q.project_id FROM quote_line_items li JOIN quote_categories c ON c.id = li.category_id JOIN quotes q ON q.id = c.quote_id WHERE li.id::text = $1`,
      [req.params.itemId]
    )).rows[0];
    if (await isQuoteFrozen(client, itemQuote.id)) return res.status(409).json({ error: FROZEN_QUOTE_MESSAGE, frozen: true });
    if ((await latestQuoteId(client, itemQuote.project_id)) !== itemQuote.id) return res.status(409).json({ error: "Only the latest quote version follows project assets" });
    await client.query("BEGIN");
    await client.query(`UPDATE quote_line_items SET cost_overridden = FALSE, version = version + 1 WHERE id = $1`, [req.params.itemId]);
    await syncAssetLineItem(client, found.rows[0].project_asset_id);
    await client.query("COMMIT");
    const result = await client.query(
      `SELECT li.*, q.exchange_rate FROM quote_line_items li
       JOIN quote_categories c ON c.id = li.category_id JOIN quotes q ON q.id = c.quote_id WHERE li.id = $1`,
      [req.params.itemId]
    );
    res.json(mapLineItem(result.rows[0], Number(result.rows[0].exchange_rate)));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST /quotes/line-items/:itemId/reset-cost error:", err);
    res.status(500).json({ error: "Failed to reset cost" });
  } finally {
    client.release();
  }
});

// POST /api/quotes/:id/revise — copy a version into a new draft (the way to edit a sent version).
router.post("/:id/revise", requireAdmin, async (req: Request, res: Response) => {
  try {
    const exists = await pool.query(`SELECT 1 FROM quotes WHERE id::text = $1`, [req.params.id]);
    if (exists.rows.length === 0) return res.status(404).json({ error: "Quote not found" });
    const newId = await reviseQuoteStandalone(req.params.id);
    const q = (await pool.query(`SELECT * FROM quotes WHERE id = $1`, [newId])).rows[0];
    res.status(201).json(mapQuote(q, await loadCategories(newId, Number(q.exchange_rate))));
  } catch (err) {
    console.error("POST /quotes/:id/revise error:", err);
    res.status(500).json({ error: "Failed to create a new draft" });
  }
});

// DELETE /api/quotes/:id
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await pool.query("DELETE FROM quotes WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /quotes/:id error:", err);
    res.status(500).json({ error: "Failed to delete quote" });
  }
});

export default router;
