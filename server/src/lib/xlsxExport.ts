import ExcelJS from "exceljs";
import path from "path";
import type { SectionRow, SectionTotal, WorkbookSystem, WorkbookTotals } from "./workbookTotals";

// Populates the real MOH-SurAc-01-2026 workbook template with a project's live data. That file
// is a completed example workbook, not a blank reusable template — its category blocks have
// whatever row count MOH's own line items happened to need. So rather than relying on the
// template's own formulas, every block is resized to fit the project's rows and every computed
// cell is written as a plain value. All figures come from the shared Workbook totals
// (lib/workbookTotals.ts), so this export matches Synthesis, BOM and the proposal; amounts are
// written in JMD at the quote's exchange rate. Only the Synthesis sheet and the three
// "{System} BoM" sheets are populated; the cost-margin and site-assessment sheets are left as
// the template has them.

const TEMPLATE_PATH = path.join(__dirname, "..", "assets", "templates", "Workbook_MOH-SurAc-01-2026.xlsx");

export interface XlsxExportData {
  projectName: string;
  clientName: string;
  refNumber: string;
  exchangeRate: number;
  generatedAt: string;
  totals: WorkbookTotals;
  rows: Map<string, SectionRow[]>;
}

const BOM_SHEET_FOR_SYSTEM: Record<WorkbookSystem, string> = { VSS: "VSS BoM", EAC: "EAC BoM", Intercom: "Intercom BoM" };
// The Intercom BoM sheet has no section numbers in column A; its blocks map to these in order.
const FALLBACK_SECTIONS: Partial<Record<WorkbookSystem, number[]>> = { Intercom: [1400, 1500, 1600, 1700, 1800] };
const SYSTEM_LABEL: Record<WorkbookSystem, string> = { VSS: "Video Surveillance", EAC: "Access Control Systems", Intercom: "Intercom" };

const money = (n: number) => Math.round(n * 100) / 100;

interface DetectedBlock {
  headerRow: number;
  sectionNumber: number;
  firstItemRow: number;
  itemRowCount: number;
  totalRow: number;
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "result" in (v as any)) return String((v as any).result ?? "");
  if (typeof v === "object" && "richText" in (v as any)) return (v as any).richText.map((r: any) => r.text).join("");
  return String(v);
}

// Scans a "{System} BoM" sheet for its category blocks: a header row (section number in column
// A — or, with fallbackSections, an empty A — and bold non-empty column B), followed by item
// rows, ended by a row whose column C holds bold text containing "Total". The ".5" Contingency
// Plan mini-block is a single row that is its own header and only item, detected by lookahead
// to the next row's Total/Sub-Total.
function detectBomBlocks(ws: ExcelJS.Worksheet, fallbackSections?: number[]): DetectedBlock[] {
  const blocks: DetectedBlock[] = [];
  let current: { headerRow: number; sectionNumber: number; firstItemRow: number } | null = null;
  let fallbackIndex = 0;
  const maxRow = Math.max(ws.actualRowCount || 0, ws.rowCount || 0) + 5;

  for (let r = 4; r <= maxRow; r++) {
    const row = ws.getRow(r);
    const aText = cellText(row.getCell(1)).trim();
    const bCell = row.getCell(2);
    const bText = cellText(bCell).trim();
    const bBold = !!bCell.font?.bold;
    const cCell = row.getCell(3);
    const cText = cellText(cCell).trim();
    const cBold = !!cCell.font?.bold;

    if (cBold && /total/i.test(cText)) {
      if (current) {
        blocks.push({ ...current, itemRowCount: Math.max(0, r - current.firstItemRow), totalRow: r });
        current = null;
      }
      continue;
    }
    if (!bText || current) continue;

    const asNumber = Number(aText);
    if (aText !== "" && !Number.isNaN(asNumber)) {
      if (bBold) {
        current = { headerRow: r, sectionNumber: asNumber, firstItemRow: r + 1 };
      } else if (/total/i.test(cellText(ws.getRow(r + 1).getCell(3)).trim())) {
        blocks.push({ headerRow: r, sectionNumber: asNumber, firstItemRow: r, itemRowCount: 1, totalRow: r + 1 });
      }
    } else if (aText === "" && bBold && fallbackSections && fallbackIndex < fallbackSections.length) {
      current = { headerRow: r, sectionNumber: fallbackSections[fallbackIndex++], firstItemRow: r + 1 };
    }
  }
  return blocks;
}

// Grows or shrinks the block to `count` item rows, cloning the first item row's style for new
// rows and blanking leftover template example rows. Returns the block's (possibly shifted)
// Total row plus how many rows were inserted, since ExcelJS's actualRowCount doesn't reliably
// reflect rows shifted by duplicateRow.
function resizeBlock(ws: ExcelJS.Worksheet, block: DetectedBlock, count: number): { totalRow: number; shift: number } {
  const templateRowCount = block.itemRowCount;
  if (count > templateRowCount) {
    const toAdd = count - templateRowCount;
    ws.duplicateRow(block.firstItemRow + Math.max(templateRowCount - 1, 0), toAdd, true);
    return { totalRow: block.totalRow + toAdd, shift: toAdd };
  }
  for (let r = block.firstItemRow + count; r < block.firstItemRow + templateRowCount; r++) {
    for (let c = 1; c <= 5; c++) ws.getRow(r).getCell(c).value = null;
  }
  return { totalRow: block.totalRow, shift: 0 };
}

interface BlockContent { sections: SectionTotal[] }

function populateBomSheet(wb: ExcelJS.Workbook, system: WorkbookSystem, data: XlsxExportData) {
  const ws = wb.getWorksheet(BOM_SHEET_FOR_SYSTEM[system]);
  if (!ws) return;
  const rate = data.exchangeRate;
  const sysTotals = data.totals.systems.find((s) => s.system === system)!;
  const blocks = detectBomBlocks(ws, FALLBACK_SECTIONS[system]);
  const blockFor = (section: string) => blocks.find((b) => Math.abs(b.sectionNumber - Number(section)) < 0.001);

  // A section with no block of its own in the template (e.g. 1050) is listed inside the nearest
  // earlier block, so the sheet's rows still add up to its totals.
  const content = new Map<DetectedBlock, BlockContent>();
  let lastBlock: DetectedBlock | undefined;
  const orphans: SectionTotal[] = [];
  for (const s of sysTotals.sections) {
    const own = blockFor(s.section);
    const target = own || lastBlock;
    if (own) lastBlock = own;
    if (!target) { orphans.push(s); continue; }
    if (!content.has(target)) content.set(target, { sections: [] });
    content.get(target)!.sections.push(s);
  }
  if (orphans.length > 0 && blocks.length > 0) {
    const first = [...blocks].sort((a, b) => a.headerRow - b.headerRow)[0];
    if (!content.has(first)) content.set(first, { sections: [] });
    content.get(first)!.sections.unshift(...orphans);
  }

  const originalMaxRow = ws.actualRowCount || ws.rowCount;
  let totalShift = 0;
  // Bottom-to-top so inserted rows never invalidate an earlier block's recorded row numbers.
  for (const block of [...blocks].sort((a, b) => b.headerRow - a.headerRow)) {
    const sections = content.get(block)?.sections || [];
    const rows: { label: string; row: SectionRow }[] = [];
    for (const s of sections) {
      const sectionRows = data.rows.get(s.section) || [];
      sectionRows.forEach((row, i) => rows.push({ label: Number.isInteger(Number(s.section)) ? `${s.section}.${i + 1}` : s.section, row }));
    }
    const { totalRow, shift } = resizeBlock(ws, block, rows.length);
    totalShift += shift;
    rows.forEach(({ label, row }, i) => {
      const r = ws.getRow(block.firstItemRow + i);
      r.getCell(1).value = label;
      r.getCell(2).value = row.description;
      r.getCell(3).value = money(row.unitPrice * rate);
      r.getCell(4).value = row.quantity;
      r.getCell(5).value = money(row.extended * rate);
    });
    ws.getRow(totalRow).getCell(5).value = money(sections.reduce((sum, s) => sum + s.total, 0) * rate);
  }

  // Sheet-level Sub-Total / GCT / Total: the rows around the "GCT" label in column C.
  const sheetSubtotal = sysTotals.total;
  const totalLabelRe = /^(total|sub-total|grand-total|grans-total)$/;
  for (let r = originalMaxRow + totalShift; r >= 1; r--) {
    if (cellText(ws.getRow(r).getCell(3)).trim().toLowerCase() !== "gct") continue;
    ws.getRow(r).getCell(5).value = money(sheetSubtotal * 0.15 * rate);
    if (totalLabelRe.test(cellText(ws.getRow(r - 1).getCell(3)).trim().toLowerCase())) ws.getRow(r - 1).getCell(5).value = money(sheetSubtotal * rate);
    if (totalLabelRe.test(cellText(ws.getRow(r + 1).getCell(3)).trim().toLowerCase())) ws.getRow(r + 1).getCell(5).value = money(sheetSubtotal * 1.15 * rate);
    break;
  }
}

interface RowStyle { height?: number; cells: Partial<ExcelJS.Style>[]; merges: [number, number][] }

function captureRowStyle(ws: ExcelJS.Worksheet, r: number, merges: string[]): RowStyle {
  const row = ws.getRow(r);
  const rowMerges: [number, number][] = [];
  for (const m of merges) {
    const [from, to] = m.split(":").map((ref) => ws.getCell(ref));
    if (Number(from.row) === r && Number(to.row) === r) rowMerges.push([Number(from.col), Number(to.col)]);
  }
  return { height: row.height, cells: [1, 2, 3, 4, 5].map((c) => JSON.parse(JSON.stringify(row.getCell(c).style || {}))), merges: rowMerges };
}

function writeStyledRow(ws: ExcelJS.Worksheet, r: number, style: RowStyle, values: (string | number | null)[]) {
  const row = ws.getRow(r);
  if (style.height) row.height = style.height;
  style.cells.forEach((cellStyle, i) => {
    const cell = row.getCell(i + 1);
    cell.style = JSON.parse(JSON.stringify(cellStyle));
    cell.value = values[i] ?? null;
  });
  for (const [from, to] of style.merges) ws.mergeCells(r, from, r, to);
}

// The Synthesis sheet's table is rebuilt from the template's own row styles: one row per
// section for each system (Intercom only when it has a value, since the template has none),
// group totals, then the grand total, tax and total-with-tax.
function populateSynthesisSheet(wb: ExcelJS.Workbook, data: XlsxExportData) {
  const ws = wb.getWorksheet("Synthesis ") || wb.getWorksheet("Synthesis");
  if (!ws) return;
  const rate = data.exchangeRate;
  // actualRowCount only counts non-empty rows, so it can stop short of the last row number.
  const maxRow = Math.max(ws.actualRowCount || 0, ws.rowCount || 0);
  const text = (r: number, c: number) => cellText(ws.getRow(r).getCell(c)).trim();
  const findRow = (pred: (r: number) => boolean) => { for (let r = 1; r <= maxRow; r++) if (pred(r)) return r; return -1; };

  const headerRow = findRow((r) => text(r, 1).toLowerCase() === "video surveillance");
  const sectionRow = findRow((r) => r > headerRow && text(r, 1) !== "" && !Number.isNaN(Number(text(r, 1))));
  const groupTotalRow = findRow((r) => r > headerRow && text(r, 1).toLowerCase().startsWith("total "));
  const grandRow = findRow((r) => text(r, 1).toLowerCase().startsWith("grand total"));
  const taxRow = findRow((r) => text(r, 4).toLowerCase() === "tax");
  const finalRow = findRow((r) => r > taxRow && text(r, 4).toLowerCase() === "grand total");
  if ([headerRow, sectionRow, groupTotalRow, grandRow, taxRow, finalRow].some((r) => r < 0)) return;

  const merges = ws.model.merges || [];
  const styles = {
    header: captureRowStyle(ws, headerRow, merges),
    section: captureRowStyle(ws, sectionRow, merges),
    groupTotal: captureRowStyle(ws, groupTotalRow, merges),
    grand: captureRowStyle(ws, grandRow, merges),
    tax: captureRowStyle(ws, taxRow, merges),
    final: captureRowStyle(ws, finalRow, merges),
  };
  const grandLabel = text(grandRow, 1);

  // Clear the template's table region (values, styles, merges) before writing the new layout.
  for (const m of merges) {
    if (Number(ws.getCell(m.split(":")[0]).row) >= headerRow) ws.unMergeCells(m);
  }
  for (let r = headerRow; r <= maxRow + 10; r++) {
    for (let c = 1; c <= 5; c++) { const cell = ws.getRow(r).getCell(c); cell.value = null; cell.style = {}; }
  }

  let r = headerRow;
  for (const sys of data.totals.systems) {
    if (sys.system === "Intercom" && sys.total === 0 && sys.sections.every((s) => s.total === 0)) continue;
    writeStyledRow(ws, r++, styles.header, [SYSTEM_LABEL[sys.system], null, null, null, null]);
    for (const s of sys.sections) {
      const value = money(s.total * rate);
      writeStyledRow(ws, r++, styles.section, [Number(s.section), s.name, 1, value, value]);
    }
    writeStyledRow(ws, r++, styles.groupTotal, [`Total ${SYSTEM_LABEL[sys.system]}`, null, null, null, money(sys.total * rate)]);
  }
  r++;
  writeStyledRow(ws, r++, styles.grand, [grandLabel, null, null, null, money(data.totals.subtotal * rate)]);
  writeStyledRow(ws, r++, styles.tax, [null, null, null, "Tax", money(data.totals.gct * rate)]);
  writeStyledRow(ws, r, styles.final, [null, null, null, "Grand Total", money(data.totals.total * rate)]);
}

// The template still carries MOH's client name and reference in its title rows.
function populateTitles(wb: ExcelJS.Workbook, data: XlsxExportData) {
  const ref = `Ref # ${data.refNumber} - ${data.projectName}`;
  const synth = wb.getWorksheet("Synthesis ") || wb.getWorksheet("Synthesis");
  if (synth) {
    synth.getCell("A3").value = data.clientName;
    synth.getCell("A4").value = ref;
    synth.getCell("A5").value = new Date(data.generatedAt).toDateString();
  }
  for (const name of ["VSS BoM", "EAC BoM"]) {
    const ws = wb.getWorksheet(name);
    if (!ws) continue;
    ws.getCell("A1").value = data.clientName;
    if (cellText(ws.getCell("A2")).trim().startsWith("Ref")) ws.getCell("A2").value = ref;
  }
}

export async function buildWorkbookXlsx(data: XlsxExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);
  // Every BoM sheet is processed even with no data, which blanks the template's example rows.
  for (const system of ["VSS", "EAC", "Intercom"] as const) populateBomSheet(wb, system, data);
  populateSynthesisSheet(wb, data);
  populateTitles(wb, data);
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
