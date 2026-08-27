import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

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
  };
}

async function loadCategories(quoteId: string, exchangeRate: number) {
  const catsResult = await pool.query("SELECT * FROM quote_categories WHERE quote_id=$1 ORDER BY sort_order", [quoteId]);
  const categories = [];
  for (const cat of catsResult.rows) {
    const itemsResult = await pool.query("SELECT * FROM quote_line_items WHERE category_id=$1 ORDER BY item_number", [cat.id]);
    categories.push({
      id: cat.id,
      name: cat.name,
      type: cat.type,
      system: cat.system,
      sectionNumber: cat.section_number,
      importRatePercent: Number(cat.import_rate_percent),
      lineItems: itemsResult.rows.map((li) => mapLineItem(li, exchangeRate)),
      contingency: undefined,
    });
  }
  return categories;
}

// GET /api/quotes
router.get("/", async (_req: Request, res: Response) => {
  try {
    const quotesResult = await pool.query("SELECT * FROM quotes ORDER BY created_at DESC");
    const quotes = [];
    for (const q of quotesResult.rows) {
      const categories = await loadCategories(q.id, Number(q.exchange_rate));
      quotes.push({
        id: q.id, clientName: q.client_name, refNumber: q.ref_number, date: q.date ? new Date(q.date).toISOString().slice(0, 10) : "",
        status: q.status, quoteType: q.quote_type, categories, exchangeRate: Number(q.exchange_rate),
        projectId: q.project_id || undefined,
        createdAt: q.created_at, updatedAt: q.updated_at,
      });
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
    const categories = await loadCategories(id, Number(q.exchange_rate));
    res.json({ id: q.id, clientName: q.client_name, refNumber: q.ref_number, date: q.date ? new Date(q.date).toISOString().slice(0, 10) : "", status: q.status, quoteType: q.quote_type, categories, exchangeRate: Number(q.exchange_rate), projectId: q.project_id || undefined });
  } catch (err) {
    console.error("GET /quotes/:id error:", err);
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

// POST /api/quotes
router.post("/", async (req: Request, res: Response) => {
  try {
    const { clientName, refNumber, date, status, quoteType, categories, exchangeRate, projectId } = req.body;
    const qResult = await pool.query(
      "INSERT INTO quotes (client_name, ref_number, date, status, quote_type, exchange_rate, project_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [clientName, refNumber, date, status || "draft", quoteType || "Multiple", exchangeRate || 163, projectId || null]
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
    res.status(201).json({ id: quote.id, clientName: quote.client_name, refNumber: quote.ref_number, date: quote.date ? new Date(quote.date).toISOString().slice(0, 10) : "", status: quote.status, quoteType: quote.quote_type, categories: savedCategories, exchangeRate: Number(quote.exchange_rate), projectId: quote.project_id || undefined });
  } catch (err) {
    console.error("POST /quotes error:", err);
    res.status(500).json({ error: "Failed to create quote" });
  }
});

// PATCH /api/quotes/:id
router.patch("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { clientName, refNumber, status, exchangeRate, categories } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE quotes SET client_name=COALESCE($2,client_name), ref_number=COALESCE($3,ref_number), status=COALESCE($4,status), exchange_rate=COALESCE($5,exchange_rate), updated_at=NOW() WHERE id=$1",
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
            await client.query(
              `UPDATE quote_line_items SET item_number=$2, description=$3, unit_cost=$4, quantity=$5, markup_percent=$6, project_asset_id=$7 WHERE id=$1`,
              [li.id, li.itemNumber || "", li.description || "", li.unitCost || 0, li.quantity || 0, li.markupPercent || 0, li.projectAssetId || null]
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

// DELETE /api/quotes/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await pool.query("DELETE FROM quotes WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /quotes/:id error:", err);
    res.status(500).json({ error: "Failed to delete quote" });
  }
});

export default router;
