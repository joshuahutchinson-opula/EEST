import { Router, Request, Response } from "express";
import pool from "../db";
import { requireAdmin } from "../lib/roles";
import { loadProjectWorkbook } from "../lib/workbookData";
import { buildSectionRows, GCT_RATE } from "../lib/workbookTotals";

// Cross-project exports. Admin only.
const router = Router();
router.use(requireAdmin);

const csvCell = (v: string | number) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
// QuickBooks reads dates in the company's date format; Jamaica uses day/month/year.
const qbDate = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

// GET /api/exports/quickbooks.csv?from=YYYY-MM-DD&to=YYYY-MM-DD — approved quote versions as a
// QuickBooks invoice-import CSV: one row per line item (same rows as the proposal, so overrides,
// contingency and imports are included), in JMD at each quote's locked rate, with the invoice's
// subtotal, GCT and total repeated on every row. Date filter is on approval date.
router.get("/quickbooks.csv", async (req: Request, res: Response) => {
  const dateOk = (v: unknown) => v === undefined || (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v));
  if (!dateOk(req.query.from) || !dateOk(req.query.to)) return res.status(400).json({ error: "from/to must be YYYY-MM-DD" });
  try {
    const quotes = await pool.query(
      `SELECT q.id, q.project_id, q.ref_number, q.revision, COALESCE(a.approved_at, q.updated_at) AS approved_at, p.name AS project_name, p.client
       FROM quotes q
       JOIN projects p ON p.id = q.project_id AND p.deleted_at IS NULL
       LEFT JOIN approvals a ON a.target_type = 'quote' AND a.target_id = q.id
       WHERE q.status = 'approved'
         AND ($1::date IS NULL OR COALESCE(a.approved_at, q.updated_at) >= $1::date)
         AND ($2::date IS NULL OR COALESCE(a.approved_at, q.updated_at) < $2::date + 1)
       ORDER BY COALESCE(a.approved_at, q.updated_at), q.ref_number`,
      [req.query.from ?? null, req.query.to ?? null]
    );

    const header = ["InvoiceNo", "Customer", "InvoiceDate", "DueDate", "Memo", "Item(Product/Service)", "ItemDescription", "ItemQuantity", "ItemRate", "ItemAmount", "ItemTaxCode", "ItemTaxAmount", "Currency", "Subtotal", "GCT", "Total"];
    const lines: string[] = [header.join(",")];
    for (const q of quotes.rows) {
      const wb = await loadProjectWorkbook(q.project_id, q.id);
      if (!wb?.quote) continue;
      const rate = wb.quote.exchangeRate;
      const rows = buildSectionRows(wb.totals, wb.categories);
      const date = new Date(q.approved_at);
      const due = new Date(date);
      due.setDate(due.getDate() + 30);
      const invoiceNo = `${q.ref_number || "Q"}-R${q.revision}`;
      for (const s of wb.totals.sections) {
        for (const r of rows.get(s.section) || []) {
          const amount = r.extended * rate;
          lines.push([
            invoiceNo, q.client, qbDate(date), qbDate(due), `${q.project_name} (${s.section} ${s.name})`,
            s.name, r.kind === "adjustment" ? "Price adjustment" : r.description, r.quantity, money(r.unitPrice * rate), money(amount),
            "GCT", money(amount * GCT_RATE), "JMD", money(wb.totals.subtotal * rate), money(wb.totals.gct * rate), money(wb.totals.total * rate),
          ].map(csvCell).join(","));
        }
      }
    }
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="approved-quotes-quickbooks-${stamp}.csv"`);
    res.send("﻿" + lines.join("\r\n") + "\r\n");
  } catch (err) {
    console.error("GET /exports/quickbooks.csv error:", err);
    res.status(500).json({ error: "Failed to build the QuickBooks export" });
  }
});

export default router;
