import ExcelJS from "exceljs";
import { LOGO_FULL_COLOR } from "./branding";
import { buildSectionRows, countedLineItems, isImportSection, lineItemTotals, GCT_RATE, type TotalsCategory } from "./workbookTotals";
import type { ProjectWorkbook, WorkbookLineItem } from "./workbookData";

// The full Workbook as an internal .xlsx: a branded cover sheet, then Asset List, Cost & Margin,
// BOM and Synthesis sheets. Amounts are in both USD and JMD (JMD at the quote's locked rate,
// held in one cell on the cover sheet). Totals are live Excel formulas, each written with its
// computed result so viewers that don't recalculate still show the right numbers; the values
// come from the shared totals (lib/workbookTotals.ts).

const NAVY = "FF1D4D89";
const LIGHT_BLUE = "FF41B1E4";
const ZEBRA = "FFF2F8FC";
const SUBTLE = "FFE8F1FA";
const USD = '"$"#,##0.00';
const JMD = '"J$"#,##0.00';
const PCT = "0.0%";
const SYSTEM_LABEL: Record<string, string> = { VSS: "Video Surveillance", EAC: "Access Control", Intercom: "Intercom" };

const f = (formula: string, result: number): ExcelJS.CellFormulaValue => ({ formula, result: Math.round(result * 100) / 100 });

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.alignment = { vertical: "middle" };
  });
  row.height = 20;
}

function styleBand(row: ExcelJS.Row, argb: string, bold = true) {
  row.eachCell({ includeEmpty: true }, (c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
    if (bold) c.font = { bold: true, color: { argb: argb === LIGHT_BLUE ? "FFFFFFFF" : "FF1D4D89" } };
  });
}

function setFormats(ws: ExcelJS.Worksheet, formats: Record<string, string>) {
  for (const [col, numFmt] of Object.entries(formats)) ws.getColumn(col).numFmt = numFmt;
}

export async function buildFullWorkbookXlsx(wb: ProjectWorkbook): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  book.creator = "E-Tech Systems — EEST";
  const rate = wb.quote?.exchangeRate ?? 0;
  const counted = (cat: TotalsCategory) => countedLineItems(cat.lineItems) as WorkbookLineItem[];

  // --- Cover ---------------------------------------------------------------------------------
  const cover = book.addWorksheet("Cover", { views: [{ showGridLines: false }] });
  cover.getColumn(1).width = 26;
  cover.getColumn(2).width = 48;
  if (LOGO_FULL_COLOR) {
    const logo = book.addImage({ buffer: LOGO_FULL_COLOR as any, extension: "png" });
    cover.addImage(logo, { tl: { col: 0, row: 0 }, ext: { width: 260, height: 99 } });
  }
  cover.getCell("A7").value = "Project Workbook";
  cover.getCell("A7").font = { bold: true, size: 20, color: { argb: NAVY } };
  const info: [string, string | number][] = [
    ["Project", wb.project.name],
    ["Client", wb.project.client],
    ["Quote", wb.quote ? `${wb.quote.refNumber} · Rev ${wb.quote.revision}` : "No quote yet"],
    ["Exchange rate (J$ per US$1)", rate],
    ["Generated", new Date().toLocaleDateString()],
  ];
  info.forEach(([label, value], i) => {
    const r = cover.getRow(9 + i);
    r.getCell(1).value = label;
    r.getCell(1).font = { bold: true, color: { argb: NAVY } };
    r.getCell(2).value = value;
  });
  const RATE = "Cover!$B$12"; // row 9 + 3
  cover.getCell("B12").numFmt = "#,##0.0000";
  cover.getCell("A15").value = "Internal — contains cost and margin. Amounts in USD and JMD at the rate above.";
  cover.getCell("A15").font = { italic: true, color: { argb: "FF666666" } };

  // --- Asset List ----------------------------------------------------------------------------
  const al = book.addWorksheet("Asset List", { views: [{ state: "frozen", ySplit: 1 }] });
  al.columns = [
    { header: "System", width: 18 }, { header: "Section", width: 30 }, { header: "Item", width: 42 }, { header: "Source", width: 10 },
    { header: "Qty", width: 7 }, { header: "Unit cost (USD)", width: 15 }, { header: "Markup %", width: 10 }, { header: "Sell (USD)", width: 14 },
    { header: "Total (USD)", width: 15 }, { header: "Total (JMD)", width: 17 },
  ];
  styleHeader(al.getRow(1));
  let alFirst = 2;
  for (const cat of wb.categories) {
    if (isImportSection(cat.sectionNumber)) continue;
    for (const li of counted(cat)) {
      const t = lineItemTotals(li);
      const r = al.addRow([SYSTEM_LABEL[cat.system] || cat.system, `${cat.sectionNumber} — ${cat.name}`, li.description, li.projectAssetId ? "Asset" : "Manual", t.quantity, t.unitCost, t.markupPercent]);
      const n = r.number;
      r.getCell(8).value = f(`F${n}*(1+G${n})`, t.sellPrice);
      r.getCell(9).value = f(`H${n}*E${n}`, t.sellTotal);
      r.getCell(10).value = f(`I${n}*${RATE}`, t.sellTotal * rate);
      if ((n - alFirst) % 2 === 1) styleBand(r, ZEBRA, false);
    }
  }
  const alLast = al.rowCount;
  const alTotal = al.addRow(["Total"]);
  const alSell = wb.categories.filter((c) => !isImportSection(c.sectionNumber)).flatMap(counted).reduce((s, li) => s + lineItemTotals(li).sellTotal, 0);
  alTotal.getCell(9).value = f(alLast >= alFirst ? `SUM(I${alFirst}:I${alLast})` : "0", alSell);
  alTotal.getCell(10).value = f(alLast >= alFirst ? `SUM(J${alFirst}:J${alLast})` : "0", alSell * rate);
  styleBand(alTotal, SUBTLE);
  setFormats(al, { F: USD, G: PCT, H: USD, I: USD, J: JMD });

  // --- Cost & Margin -------------------------------------------------------------------------
  const cm = book.addWorksheet("Cost & Margin", { views: [{ state: "frozen", ySplit: 1 }] });
  cm.columns = [
    { header: "Item No", width: 10 }, { header: "Description", width: 44 }, { header: "Qty", width: 7 }, { header: "Cost (USD)", width: 14 },
    { header: "Markup %", width: 10 }, { header: "Sell (USD)", width: 14 }, { header: "Total cost (USD)", width: 16 }, { header: "Total sell (USD)", width: 16 },
    { header: "Profit (USD)", width: 15 }, { header: "Total sell (JMD)", width: 18 },
  ];
  styleHeader(cm.getRow(1));
  for (const sys of wb.totals.systems) {
    const cats = wb.categories.filter((c) => c.system === sys.system && !isImportSection(c.sectionNumber) && counted(c).length > 0);
    if (cats.length === 0) continue;
    styleBand(cm.addRow([SYSTEM_LABEL[sys.system]]), LIGHT_BLUE);
    const costCells: string[] = [], sellCells: string[] = [], profitCells: string[] = [];
    let sysCost = 0, sysSell = 0, sysImport = 0;
    for (const cat of cats) {
      styleBand(cm.addRow([`${cat.sectionNumber}`, cat.name]), SUBTLE);
      const items = counted(cat);
      const first = cm.rowCount + 1;
      let cost = 0, sell = 0;
      items.forEach((li, i) => {
        const t = lineItemTotals(li);
        cost += t.costTotal; sell += t.sellTotal;
        const r = cm.addRow([items.length > 1 ? `${cat.sectionNumber}.${i + 1}` : `${cat.sectionNumber}`, li.description, t.quantity, t.unitCost, t.markupPercent]);
        const n = r.number;
        r.getCell(6).value = f(`D${n}*(1+E${n})`, t.sellPrice);
        r.getCell(7).value = f(`D${n}*C${n}`, t.costTotal);
        r.getCell(8).value = f(`F${n}*C${n}`, t.sellTotal);
        r.getCell(9).value = f(`H${n}-G${n}`, t.profit);
        r.getCell(10).value = f(`H${n}*${RATE}`, t.sellTotal * rate);
      });
      const last = cm.rowCount;
      const sub = cm.addRow(["", `${cat.name} subtotal`]);
      sub.getCell(7).value = f(`SUM(G${first}:G${last})`, cost);
      sub.getCell(8).value = f(`SUM(H${first}:H${last})`, sell);
      sub.getCell(9).value = f(`SUM(I${first}:I${last})`, sell - cost);
      sub.getCell(10).value = f(`H${sub.number}*${RATE}`, sell * rate);
      sub.font = { bold: true };
      costCells.push(`G${sub.number}`); sellCells.push(`H${sub.number}`); profitCells.push(`I${sub.number}`);
      const importRate = Number(cat.importRatePercent) || 0;
      if (importRate > 0) {
        const imp = cm.addRow(["", `Import (${(importRate * 100).toFixed(0)}% of cost)`]);
        imp.getCell(7).value = f(`G${sub.number}*${importRate}`, cost * importRate);
        imp.getCell(7).font = { color: { argb: "FFB7791F" } };
        costCells.push(`G${imp.number}`);
        sysImport += cost * importRate;
      }
      sysCost += cost; sysSell += sell;
    }
    const tot = cm.addRow(["", `${SYSTEM_LABEL[sys.system]} total (cost incl. imports)`]);
    tot.getCell(7).value = f(costCells.join("+"), sysCost + sysImport);
    tot.getCell(8).value = f(sellCells.join("+"), sysSell);
    tot.getCell(9).value = f(profitCells.join("+"), sysSell - sysCost);
    tot.getCell(10).value = f(`H${tot.number}*${RATE}`, sysSell * rate);
    styleBand(tot, SUBTLE);
    cm.addRow([]);
  }
  setFormats(cm, { D: USD, E: PCT, F: USD, G: USD, H: USD, I: USD, J: JMD });

  // --- BOM -----------------------------------------------------------------------------------
  const bom = book.addWorksheet("BOM", { views: [{ state: "frozen", ySplit: 1 }] });
  bom.columns = [{ header: "Item No", width: 10 }, { header: "Products – Description", width: 50 }, { header: "Qty", width: 7 }, { header: "List (USD)", width: 15 }, { header: "Extended (USD)", width: 17 }, { header: "Extended (JMD)", width: 19 }];
  styleHeader(bom.getRow(1));
  const sectionRows = buildSectionRows(wb.totals, wb.categories);
  const sectionTotalCell = new Map<string, string>();
  const systemTotalCells: { cell: string; total: number }[] = [];
  for (const sys of wb.totals.systems) {
    const visible = sys.sections.filter((s) => (sectionRows.get(s.section) || []).length > 0);
    if (visible.length === 0) continue;
    styleBand(bom.addRow([SYSTEM_LABEL[sys.system]]), LIGHT_BLUE);
    const totals: string[] = [];
    for (const s of visible) {
      styleBand(bom.addRow([s.section, s.name + (s.override !== null ? " (overridden in Synthesis)" : "")]), SUBTLE);
      const rows = sectionRows.get(s.section)!;
      const first = bom.rowCount + 1;
      const itemCount = rows.filter((r) => r.kind === "item").length;
      let itemIndex = 0;
      rows.forEach((row, i) => {
        const label = row.kind === "item" ? (itemCount > 1 ? `${s.section}.${++itemIndex}` : s.section) : row.kind === "adjustment" ? "" : `${s.section}.${i + 1}`;
        const r = bom.addRow([label, row.kind === "adjustment" ? "Price adjustment (Synthesis override)" : row.description, row.quantity, row.unitPrice]);
        const n = r.number;
        r.getCell(5).value = f(`D${n}*C${n}`, row.extended);
        r.getCell(6).value = f(`E${n}*${RATE}`, row.extended * rate);
        if (row.kind !== "item") r.font = { italic: true, color: { argb: row.kind === "import" ? "FFB7791F" : "FF555555" } };
      });
      const last = bom.rowCount;
      const st = bom.addRow(["", `${s.name} total`]);
      st.getCell(5).value = f(`SUM(E${first}:E${last})`, s.total);
      st.getCell(6).value = f(`E${st.number}*${RATE}`, s.total * rate);
      st.font = { bold: true };
      sectionTotalCell.set(s.section, `BOM!$E$${st.number}`);
      totals.push(`E${st.number}`);
    }
    const sysRow = bom.addRow(["", `${SYSTEM_LABEL[sys.system]} total`]);
    sysRow.getCell(5).value = f(totals.join("+"), sys.total);
    sysRow.getCell(6).value = f(`E${sysRow.number}*${RATE}`, sys.total * rate);
    styleBand(sysRow, SUBTLE);
    systemTotalCells.push({ cell: `E${sysRow.number}`, total: sys.total });
    bom.addRow([]);
  }
  const bomSub = bom.addRow(["", "Subtotal (all systems)"]);
  bomSub.getCell(5).value = f(systemTotalCells.length ? systemTotalCells.map((x) => x.cell).join("+") : "0", wb.totals.subtotal);
  bomSub.getCell(6).value = f(`E${bomSub.number}*${RATE}`, wb.totals.subtotal * rate);
  const bomGct = bom.addRow(["", `GCT (${GCT_RATE * 100}%)`]);
  bomGct.getCell(5).value = f(`E${bomSub.number}*${GCT_RATE}`, wb.totals.gct);
  bomGct.getCell(6).value = f(`E${bomGct.number}*${RATE}`, wb.totals.gct * rate);
  const bomTot = bom.addRow(["", "Total"]);
  bomTot.getCell(5).value = f(`E${bomSub.number}+E${bomGct.number}`, wb.totals.total);
  bomTot.getCell(6).value = f(`E${bomTot.number}*${RATE}`, wb.totals.total * rate);
  [bomSub, bomGct, bomTot].forEach((r) => styleBand(r, SUBTLE));
  setFormats(bom, { D: USD, E: USD, F: JMD });

  // --- Synthesis -----------------------------------------------------------------------------
  const syn = book.addWorksheet("Synthesis", { views: [{ state: "frozen", ySplit: 1 }] });
  syn.columns = [{ header: "Item No", width: 10 }, { header: "Designation", width: 40 }, { header: "Section total (USD)", width: 20 }, { header: "Section total (JMD)", width: 22 }, { header: "Note", width: 16 }];
  styleHeader(syn.getRow(1));
  const synSystemCells: string[] = [];
  for (const sys of wb.totals.systems) {
    styleBand(syn.addRow([SYSTEM_LABEL[sys.system]]), LIGHT_BLUE);
    const first = syn.rowCount + 1;
    for (const s of sys.sections) {
      const r = syn.addRow([s.section, s.name]);
      const link = sectionTotalCell.get(s.section);
      r.getCell(3).value = link ? f(link, s.total) : s.total;
      r.getCell(4).value = f(`C${r.number}*${RATE}`, s.total * rate);
      if (s.override !== null) r.getCell(5).value = "Overridden";
    }
    const last = syn.rowCount;
    const tot = syn.addRow(["", `Total ${SYSTEM_LABEL[sys.system]}`]);
    tot.getCell(3).value = f(`SUM(C${first}:C${last})`, sys.total);
    tot.getCell(4).value = f(`C${tot.number}*${RATE}`, sys.total * rate);
    styleBand(tot, SUBTLE);
    synSystemCells.push(`C${tot.number}`);
  }
  syn.addRow([]);
  const synSub = syn.addRow(["", "Grand total"]);
  synSub.getCell(3).value = f(synSystemCells.join("+"), wb.totals.subtotal);
  synSub.getCell(4).value = f(`C${synSub.number}*${RATE}`, wb.totals.subtotal * rate);
  const synGct = syn.addRow(["", `Tax (GCT ${GCT_RATE * 100}%)`]);
  synGct.getCell(3).value = f(`C${synSub.number}*${GCT_RATE}`, wb.totals.gct);
  synGct.getCell(4).value = f(`C${synGct.number}*${RATE}`, wb.totals.gct * rate);
  const synTot = syn.addRow(["", "Grand total with tax"]);
  synTot.getCell(3).value = f(`C${synSub.number}+C${synGct.number}`, wb.totals.total);
  synTot.getCell(4).value = f(`C${synTot.number}*${RATE}`, wb.totals.total * rate);
  [synSub, synGct, synTot].forEach((r) => styleBand(r, SUBTLE));
  setFormats(syn, { C: USD, D: JMD });

  const buffer = await book.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
