import type { PoolClient } from "pg";
import pool from "../db";

// Quote versions have no status (the old status/sent_at columns are left unused); every
// version stays editable.

type Db = Pick<PoolClient, "query">;

export async function quoteIdForCategory(db: Db, categoryId: string): Promise<string | null> {
  const result = await db.query(`SELECT quote_id FROM quote_categories WHERE id::text = $1`, [categoryId]);
  return result.rows[0]?.quote_id ?? null;
}

export async function quoteIdForLineItem(db: Db, itemId: string): Promise<string | null> {
  const result = await db.query(
    `SELECT c.quote_id FROM quote_line_items li JOIN quote_categories c ON c.id = li.category_id WHERE li.id::text = $1`,
    [itemId]
  );
  return result.rows[0]?.quote_id ?? null;
}

// The project's newest version, or null if it has none.
export async function latestQuoteId(db: Db, projectId: string): Promise<string | null> {
  const result = await db.query(`SELECT id FROM quotes WHERE project_id = $1 ORDER BY revision DESC, created_at DESC LIMIT 1`, [projectId]);
  return result.rows[0]?.id ?? null;
}

// Copies a version (categories, line items, Synthesis overrides) into a new version with the next
// revision number. The Workbook moves it to the live exchange rate when it's opened.
export async function reviseQuote(client: PoolClient, sourceQuoteId: string): Promise<string> {
  const src = (await client.query(`SELECT * FROM quotes WHERE id = $1`, [sourceQuoteId])).rows[0];
  if (!src) throw new Error("Quote not found");
  const next = await client.query(`SELECT COALESCE(MAX(revision), 0) + 1 AS n FROM quotes WHERE project_id IS NOT DISTINCT FROM $1`, [src.project_id]);
  const inserted = await client.query(
    `INSERT INTO quotes (project_id, client_name, ref_number, date, quote_type, exchange_rate, revision)
     VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6) RETURNING id`,
    [src.project_id, src.client_name, src.ref_number, src.quote_type, src.exchange_rate, next.rows[0].n]
  );
  const newQuoteId = inserted.rows[0].id;

  const cats = await client.query(`SELECT * FROM quote_categories WHERE quote_id = $1 ORDER BY sort_order`, [sourceQuoteId]);
  for (const cat of cats.rows) {
    const newCat = await client.query(
      `INSERT INTO quote_categories (quote_id, name, type, system, section_number, import_rate_percent, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [newQuoteId, cat.name, cat.type, cat.system, cat.section_number, cat.import_rate_percent, cat.sort_order]
    );
    await client.query(
      `INSERT INTO quote_line_items (category_id, item_number, description, unit_cost, quantity, markup_percent, is_contingency, project_asset_id, cost_overridden, labour)
       SELECT $2, item_number, description, unit_cost, quantity, markup_percent, is_contingency, project_asset_id, cost_overridden, labour
       FROM quote_line_items WHERE category_id = $1`,
      [cat.id, newCat.rows[0].id]
    );
  }
  await client.query(
    `INSERT INTO synthesis_overrides (project_id, quote_id, section_number, override_value, is_overridden, overridden_by, overridden_at)
     SELECT project_id, $2, section_number, override_value, is_overridden, overridden_by, overridden_at
     FROM synthesis_overrides WHERE quote_id = $1`,
    [sourceQuoteId, newQuoteId]
  );
  return newQuoteId;
}

// Runs reviseQuote in its own transaction.
export async function reviseQuoteStandalone(sourceQuoteId: string): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const id = await reviseQuote(client, sourceQuoteId);
    await client.query("COMMIT");
    return id;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
