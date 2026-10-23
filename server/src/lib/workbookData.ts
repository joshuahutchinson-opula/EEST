import pool from "../db";
import { computeWorkbookTotals, TotalsCategory, TotalsOverride, WorkbookTotals } from "./workbookTotals";
import { DEFAULT_EXCHANGE_RATE } from "./exchangeRate";

// Line items as loaded for exports: the totals fields plus whether the row comes from a project asset.
export type WorkbookLineItem = TotalsCategory["lineItems"][number] & { projectAssetId?: string };

export interface ProjectWorkbook {
  project: { id: string; name: string; client: string; summary?: string; location?: string };
  quote: { id: string; refNumber: string; date: string | null; status: string; exchangeRate: number; revision: number } | null;
  categories: TotalsCategory[];
  overrides: TotalsOverride[];
  totals: WorkbookTotals;
}

// Everything an export needs for one quote version (the newest unless quoteId is given): the
// project, the version's categories and line items, its Synthesis overrides, and the shared
// totals computed from them.
export async function loadProjectWorkbook(projectId: string, quoteId?: string | null): Promise<ProjectWorkbook | null> {
  const projectResult = await pool.query(`SELECT id, name, client, summary, location FROM projects WHERE id = $1`, [projectId]);
  if (projectResult.rows.length === 0) return null;

  const quoteResult = quoteId
    ? await pool.query(`SELECT id, ref_number, date, status, exchange_rate, revision FROM quotes WHERE id = $1 AND project_id = $2`, [quoteId, projectId])
    : await pool.query(`SELECT id, ref_number, date, status, exchange_rate, revision FROM quotes WHERE project_id = $1 ORDER BY revision DESC, created_at DESC LIMIT 1`, [projectId]);
  const q = quoteResult.rows[0];

  const [rowsResult, overridesResult] = await Promise.all([
    q
      ? pool.query(
          `SELECT qc.id AS cat_id, qc.name, qc.system, qc.section_number, qc.import_rate_percent, qc.sort_order,
                  qli.id AS item_id, qli.description, qli.unit_cost, qli.quantity, qli.markup_percent, qli.item_number, qli.project_asset_id
           FROM quote_categories qc
           LEFT JOIN quote_line_items qli ON qli.category_id = qc.id
           WHERE qc.quote_id = $1
           ORDER BY qc.sort_order, qli.item_number, qli.id`,
          [q.id]
        )
      : Promise.resolve({ rows: [] as any[] }),
    q ? pool.query(`SELECT section_number, override_value, is_overridden FROM synthesis_overrides WHERE quote_id = $1`, [q.id]) : Promise.resolve({ rows: [] as any[] }),
  ]);

  const categories = new Map<string, TotalsCategory>();
  for (const row of rowsResult.rows) {
    let cat = categories.get(row.cat_id);
    if (!cat) {
      cat = { id: row.cat_id, name: row.name, system: row.system, sectionNumber: Number(row.section_number), importRatePercent: Number(row.import_rate_percent) || 0, lineItems: [] };
      categories.set(row.cat_id, cat);
    }
    if (row.item_id) {
      cat.lineItems.push({ id: row.item_id, description: row.description || "", unitCost: Number(row.unit_cost) || 0, quantity: Number(row.quantity) || 0, markupPercent: Number(row.markup_percent) || 0, projectAssetId: row.project_asset_id || undefined } as WorkbookLineItem);
    }
  }

  const overrides: TotalsOverride[] = overridesResult.rows.map((o) => ({
    sectionNumber: String(o.section_number),
    overrideValue: o.override_value === null ? null : Number(o.override_value),
    isOverridden: !!o.is_overridden,
  }));
  const categoryList = [...categories.values()];

  return {
    project: projectResult.rows[0],
    quote: q
      ? { id: q.id, refNumber: q.ref_number || "", date: q.date ? new Date(q.date).toISOString().slice(0, 10) : null, status: q.status, exchangeRate: Number(q.exchange_rate) || DEFAULT_EXCHANGE_RATE, revision: Number(q.revision) || 1 }
      : null,
    categories: categoryList,
    overrides,
    totals: computeWorkbookTotals(categoryList, overrides),
  };
}
