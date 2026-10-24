import { loadProjectWorkbook } from "./workbookData";
import { buildSectionRows, GCT_RATE } from "./workbookTotals";

const csvCell = (v: string | number) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const cents = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => cents(n).toFixed(2);
// QuickBooks reads dates in the company's date format; Jamaica uses day/month/year. Dates are
// calendar days held at UTC midnight, so the server's own time zone never shifts them.
const qbDate = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
// Today's date in Jamaica (en-CA formats as YYYY-MM-DD).
const jamaicaToday = () => new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: "America/Jamaica" })}T00:00:00Z`);

// A quote version as a QuickBooks invoice-import CSV: one row per line item (the same rows the
// client sees, so overrides, contingency and imports are included), in JMD at the quote's rate,
// with the invoice's subtotal, GCT and total repeated on every row. Dated the day it's exported,
// due 30 days later (Jamaica dates). Returns null if the project or quote isn't found.
export async function buildQuickbooksCsv(projectId: string, quoteId: string): Promise<{ csv: string; filename: string } | null> {
  const wb = await loadProjectWorkbook(projectId, quoteId);
  if (!wb?.quote) return null;
  const header = ["InvoiceNo", "Customer", "InvoiceDate", "DueDate", "Memo", "Item(Product/Service)", "ItemDescription", "ItemQuantity", "ItemRate", "ItemAmount", "ItemTaxCode", "ItemTaxAmount", "Currency", "Subtotal", "GCT", "Total"];
  const lines: string[] = [header.join(",")];
  const rate = wb.quote.exchangeRate;
  // Invoices go to the client, so Synthesis overrides are folded into the rows as on the client share link.
  const rows = buildSectionRows(wb.totals, wb.categories, { foldAdjustments: true });
  const date = jamaicaToday();
  const due = new Date(date);
  due.setUTCDate(due.getUTCDate() + 30);
  const invoiceNo = `${wb.quote.refNumber || "Q"}-R${wb.quote.revision}`;
  const invoiceLines: { section: { section: string; name: string }; description: string; quantity: number; rate: number; amount: number }[] = [];
  for (const s of wb.totals.sections) {
    for (const r of rows.get(s.section) || []) {
      invoiceLines.push({ section: s, description: r.description, quantity: r.quantity, rate: cents(r.unitPrice * rate), amount: cents(r.extended * rate) });
    }
  }
  // Per-line rounding can leave the lines a cent or two off the subtotal; the difference goes
  // on the largest quantity-1 line so the invoice adds up exactly.
  const drift = cents(cents(wb.totals.subtotal * rate) - invoiceLines.reduce((sum, l) => sum + l.amount, 0));
  const absorb = invoiceLines.filter((l) => l.quantity === 1).sort((a, b) => b.amount - a.amount)[0];
  if (drift !== 0 && absorb) { absorb.amount = cents(absorb.amount + drift); absorb.rate = absorb.amount; }
  for (const l of invoiceLines) {
    lines.push([
      invoiceNo, wb.project.client, qbDate(date), qbDate(due), `${wb.project.name} (${l.section.section} ${l.section.name})`,
      l.section.name, l.description, l.quantity, money(l.rate), money(l.amount),
      "GCT", money(l.amount * GCT_RATE), "JMD", money(wb.totals.subtotal * rate), money(wb.totals.gct * rate), money(wb.totals.total * rate),
    ].map(csvCell).join(","));
  }
  const filename = `${String(wb.project.name).replace(/\s+/g, "-")}-rev${wb.quote.revision}-quickbooks.csv`;
  return { csv: "\uFEFF" + lines.join("\r\n") + "\r\n", filename };
}
