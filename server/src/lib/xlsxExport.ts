import ExcelJS from "exceljs";
import path from "path";

// Populates the real MOH-SurAc-01-2026 workbook template with a project's live data. That file
// is a completed example workbook, not a blank reusable template — its category blocks have
// whatever row count MOH's own line items happened to need. So rather than relying on the
// template's own formulas (which assume that exact, fixed row count and would silently go
// stale the moment a block needs a different number of rows), every block is resized to fit
// the real project's item count and every computed cell — List/Extended, section Total,
// Sub-Total, GCT, Grand Total — is written as a plain value we compute ourselves, the same
// math the app's own BomTab/Synthesis tabs use. Only the Synthesis sheet and the three
// "{System} BoM" sheets are populated (see the scope note in the route); the Workbook
// cost-margin sheets and the site-assessment sheets are left exactly as the template has them.

const TEMPLATE_PATH = path.join(__dirname, "..", "assets", "templates", "Workbook_MOH-SurAc-01-2026.xlsx");
const GCT_RATE = 0.15;

export interface XlsxLineItem {
  description: string;
  unitCost: number;
  quantity: number;
  markupPercent: number;
}

export interface XlsxCategory {
  system: "VSS" | "EAC" | "Intercom";
  sectionNumber: number; // e.g. 400, 700.5 for a contingency line, 800 for importation
  name: string;
  importRatePercent: number;
  lineItems: XlsxLineItem[];
}

export interface XlsxExportData {
  projectName: string;
  clientName: string;
  refNumber: string;
  exchangeRate: number;
  categories: XlsxCategory[];
}

function recalc(item: XlsxLineItem) {
  const sellPrice = item.unitCost * (1 + item.markupPercent);
  const costTotal = item.unitCost * item.quantity;
  const sellTotal = sellPrice * item.quantity;
  return { sellPrice, costTotal, sellTotal };
}

const BOM_SHEET_FOR_SYSTEM: Record<XlsxCategory["system"], string> = { VSS: "VSS BoM", EAC: "EAC BoM", Intercom: "Intercom BoM" };

interface DetectedBlock {
  headerRow: number;
  sectionNumber: number;
  sectionLabel: string; // the raw text found in column A of the header row, e.g. "700.5" or "800"
  firstItemRow: number;
  itemRowCount: number;
  totalRow: number;
  totalLabelCol: number; // column the "xxx Total" text lives in (usually C)
  totalValueCol: number; // column the total formula/value lives in (usually E)
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "result" in (v as any)) return String((v as any).result ?? "");
  if (typeof v === "object" && "richText" in (v as any)) return (v as any).richText.map((r: any) => r.text).join("");
  return String(v);
}

// Scans a "{System} BoM" sheet for its category blocks: a header row (numeric-looking column A,
// bold non-empty column B), followed by item rows, ended by a row whose "List"/"Qty" column
// (C, sometimes merged C:D) holds bold text containing "Total". The one irregular case is the
// ".5" Contingency Plan mini-block (e.g. "700.5  Contingency plan"), which the real template
// renders as a single row that is simultaneously its own header and its only item, with no
// bold label of its own — detected by lookahead to the very next row's Total/Sub-Total.
function detectBomBlocks(ws: ExcelJS.Worksheet): DetectedBlock[] {
  const blocks: DetectedBlock[] = [];
  let current: { headerRow: number; sectionNumber: number; sectionLabel: string; firstItemRow: number } | null = null;
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
        blocks.push({
          ...current,
          itemRowCount: Math.max(0, r - current.firstItemRow),
          totalRow: r,
          totalLabelCol: 3,
          totalValueCol: 5,
        });
        current = null;
      }
      continue;
    }

    const asNumber = Number(aText);
    const looksLikeSectionNumber = aText !== "" && !Number.isNaN(asNumber);
    if (!looksLikeSectionNumber || !bText || current) continue;

    if (bBold) {
      current = { headerRow: r, sectionNumber: asNumber, sectionLabel: aText, firstItemRow: r + 1 };
    } else {
      const nextLabel = cellText(ws.getRow(r + 1).getCell(3)).trim();
      if (/total/i.test(nextLabel)) {
        blocks.push({ headerRow: r, sectionNumber: asNumber, sectionLabel: aText, firstItemRow: r, itemRowCount: 1, totalRow: r + 1, totalLabelCol: 3, totalValueCol: 5 });
      }
    }
  }
  return blocks;
}

// Grows or shrinks the block's row count to match `count`, cloning the first item row's style
// for any newly-needed rows (duplicateRow copies styles/merges and shifts everything below
// down), and blanking out any leftover template example rows rather than leaving stale MOH
// data behind. Returns the (possibly shifted) row number of the block's Total row.
// Returns the block's (possibly shifted) Total row plus how many rows were inserted, since
// ExcelJS's worksheet.actualRowCount does not reliably reflect rows shifted by duplicateRow —
// callers must track the shift themselves rather than re-querying actualRowCount afterward.
function resizeBlock(ws: ExcelJS.Worksheet, block: DetectedBlock, count: number): { totalRow: number; shift: number } {
  const templateRowCount = block.itemRowCount;
  if (count > templateRowCount) {
    const toAdd = count - templateRowCount;
    const sourceRow = block.firstItemRow + Math.max(templateRowCount - 1, 0);
    ws.duplicateRow(sourceRow, toAdd, true);
    return { totalRow: block.totalRow + toAdd, shift: toAdd };
  }
  if (count < templateRowCount) {
    for (let r = block.firstItemRow + count; r < block.firstItemRow + templateRowCount; r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= 5; c++) row.getCell(c).value = null;
    }
  }
  return { totalRow: block.totalRow, shift: 0 };
}

function writeBomItemRow(ws: ExcelJS.Worksheet, rowNum: number, sectionNumber: number, subIndex: number, item: XlsxLineItem, exchangeRate: number) {
  const row = ws.getRow(rowNum);
  const { sellPrice, sellTotal } = recalc(item);
  const listJmd = sellPrice * exchangeRate;
  const extendedJmd = sellTotal * exchangeRate;
  row.getCell(1).value = Number.isInteger(sectionNumber) ? `${sectionNumber}.${subIndex}` : `${sectionNumber}`;
  row.getCell(2).value = item.description;
  row.getCell(3).value = Math.round(listJmd * 100) / 100;
  row.getCell(4).value = item.quantity;
  row.getCell(5).value = Math.round(extendedJmd * 100) / 100;
}

function populateBomBlock(ws: ExcelJS.Worksheet, block: DetectedBlock, cat: XlsxCategory, exchangeRate: number): { totalRow: number; shift: number } {
  const items = cat.lineItems.filter((li) => li.quantity > 0);
  const { totalRow: newTotalRow, shift } = resizeBlock(ws, block, items.length);
  let extendedSum = 0;
  items.forEach((item, i) => {
    writeBomItemRow(ws, block.firstItemRow + i, cat.sectionNumber, i + 1, item, exchangeRate);
    extendedSum += recalc(item).sellTotal * exchangeRate;
  });
  ws.getRow(newTotalRow).getCell(5).value = Math.round(extendedSum * 100) / 100;
  return { totalRow: newTotalRow, shift };
}

async function populateBomSheet(wb: ExcelJS.Workbook, system: XlsxCategory["system"], categories: XlsxCategory[], exchangeRate: number) {
  const ws = wb.getWorksheet(BOM_SHEET_FOR_SYSTEM[system]);
  if (!ws) return;
  const blocks = detectBomBlocks(ws);
  const originalMaxRow = ws.actualRowCount || ws.rowCount;
  // Process bottom-to-top so row-shift from duplicateRow never invalidates an earlier block's
  // already-recorded row numbers.
  const sorted = [...blocks].sort((a, b) => b.headerRow - a.headerRow);
  let sheetTotalJmd = 0;
  let totalShift = 0;
  for (const block of sorted) {
    // A ".5" section number (e.g. 700.5) is the Contingency Plan mini-block the real template
    // breaks out separately within Professional Services — the caller emits a synthetic
    // category entry for it (sectionNumber = parent + 0.5, one line item) when a project's
    // Professional Services category actually has a contingency line, so it needs no special
    // handling here beyond matching on that fractional section number like any other block.
    const cat = categories.find((c) => Math.abs(c.sectionNumber - block.sectionNumber) < 0.001);
    if (!cat) {
      // No matching category for this project — blank the template's example rows rather than
      // leaving MOH's original example data (and its now-orphaned formulas) sitting in the
      // output for a section the new project doesn't actually use.
      const { totalRow: clearedTotalRow } = resizeBlock(ws, block, 0);
      ws.getRow(clearedTotalRow).getCell(5).value = 0;
      continue;
    }
    const { totalRow, shift } = populateBomBlock(ws, block, cat, exchangeRate);
    totalShift += shift;
    sheetTotalJmd += Number(ws.getRow(totalRow).getCell(5).value) || 0;
  }
  // Sheet-level Sub-Total / GCT / Total rows: the last few rows of the sheet, identified by
  // label text in column C. ws.actualRowCount does not reliably reflect duplicateRow's shifting
  // once cells have been mutated, so the scan bound is the pre-mutation row count plus however
  // many rows were actually inserted above, not a re-query of actualRowCount.
  const maxRow = originalMaxRow + totalShift;
  const totalLabelRe = /^(total|sub-total|grand-total|grans-total)$/;
  for (let r = maxRow; r >= 1; r--) {
    const label = cellText(ws.getRow(r).getCell(3)).trim().toLowerCase();
    if (label !== "gct") continue;
    ws.getRow(r).getCell(5).value = Math.round(sheetTotalJmd * GCT_RATE * 100) / 100;
    // The overall Sub-Total (as opposed to a per-category one, already handled above) is
    // whichever "Total"/"Sub-Total" row immediately precedes this GCT row — every individual
    // category block also uses that same label text, so adjacency to GCT is the only reliable
    // signal. The sheet's final Grand Total, if present, immediately follows GCT instead.
    const prevLabel = cellText(ws.getRow(r - 1).getCell(3)).trim().toLowerCase();
    if (totalLabelRe.test(prevLabel)) ws.getRow(r - 1).getCell(5).value = Math.round(sheetTotalJmd * 100) / 100;
    const nextLabel = cellText(ws.getRow(r + 1).getCell(3)).trim().toLowerCase();
    if (totalLabelRe.test(nextLabel)) ws.getRow(r + 1).getCell(5).value = Math.round((sheetTotalJmd + sheetTotalJmd * GCT_RATE) * 100) / 100;
    break;
  }
}

// Synthesis sheet: fixed one-row-per-section layout for VSS and EAC in the real template, with
// no Intercom rows at all (MOH bought no intercom equipment, so the template never needed
// them). Known limitation: a project with real Intercom line items will see them fully in
// Intercom BoM but not reflected on this particular Synthesis sheet, which has nowhere to put
// them without inventing a whole new formatted row group — out of scope for this pass.
async function populateSynthesisSheet(wb: ExcelJS.Workbook, categories: XlsxCategory[]) {
  const ws = wb.getWorksheet("Synthesis ") || wb.getWorksheet("Synthesis");
  if (!ws) return;
  const sectionRows = new Map<number, number>();
  const maxRow = ws.actualRowCount || ws.rowCount;
  for (let r = 1; r <= maxRow; r++) {
    const aText = cellText(ws.getRow(r).getCell(1)).trim();
    const n = Number(aText);
    if (aText !== "" && !Number.isNaN(n) && n >= 100) sectionRows.set(n, r);
  }

  // The real template already carries a dedicated row for the .5 Contingency Plan pseudo-
  // section (matching the app's own SYNTHESIS_SECTIONS), so — unlike the BoM sheet's mini-block
  // handling — no folding into the parent section is needed here: sectionNumber is used as-is.
  const totalsBySection = new Map<number, number>();
  const sectionNames = new Map<number, string>();
  for (const cat of categories) {
    const total = cat.lineItems.filter((li) => li.quantity > 0).reduce((s, li) => s + recalc(li).sellTotal, 0);
    const importAmount = cat.importRatePercent > 0 ? cat.lineItems.filter((li) => li.quantity > 0).reduce((s, li) => s + li.unitCost * li.quantity, 0) * cat.importRatePercent : 0;
    totalsBySection.set(cat.sectionNumber, (totalsBySection.get(cat.sectionNumber) || 0) + total + importAmount);
    sectionNames.set(cat.sectionNumber, cat.name);
  }

  const populatedRows = new Set<number>();
  let grandTotal = 0;
  for (const [section, row] of sectionRows.entries()) {
    const value = totalsBySection.get(section) || 0;
    const name = sectionNames.get(section);
    // Column B holds the section's designation (originally a cross-sheet lookup formula) and
    // D "Unit Price" is the same figure as E "Total" for a qty-1 summary row like this one —
    // both rewritten as plain values, same as E, rather than left as formulas that assumed the
    // template's original row layout.
    ws.getRow(row).getCell(1).value = section;
    if (name) ws.getRow(row).getCell(2).value = name;
    ws.getRow(row).getCell(4).value = Math.round(value * 100) / 100;
    ws.getRow(row).getCell(5).value = Math.round(value * 100) / 100;
    grandTotal += value;
    populatedRows.add(row);
  }

  // Group subtotal rows ("Total Video Surveillance", "Total Access Control") — each sums the
  // section rows since the previous group-total row (or the top of the sheet). Any row in that
  // span that isn't one of the section rows just populated (e.g. the template's dedicated
  // Contingency row, which this export instead folds into its parent section's row — see
  // above) is blanked rather than left holding a stale formula from the template's own example
  // data, which would otherwise still show MOH's original figures when opened in Excel.
  let groupStart = 1;
  for (let r = 1; r <= maxRow; r++) {
    const labelText = [1, 2].map((c) => cellText(ws.getRow(r).getCell(c)).trim().toLowerCase()).join(" ").trim();
    if (!labelText.startsWith("total ") || labelText.includes("grand")) continue;
    const rowsInGroup = [...sectionRows.entries()].filter(([, row]) => row > groupStart && row < r);
    const groupSum = rowsInGroup.reduce((s, [section]) => s + (totalsBySection.get(section) || 0), 0);
    ws.getRow(r).getCell(5).value = Math.round(groupSum * 100) / 100;
    // Only clear stray rows strictly between this group's own first and last section rows (e.g.
    // the template's dedicated Contingency row sitting between two populated section rows) —
    // never touch anything before the first section row, which is the sheet/group header text.
    if (rowsInGroup.length > 0) {
      const firstRow = Math.min(...rowsInGroup.map(([, row]) => row));
      const lastRow = Math.max(...rowsInGroup.map(([, row]) => row));
      for (let rr = firstRow + 1; rr < lastRow; rr++) {
        if (populatedRows.has(rr)) continue;
        for (let c = 1; c <= 5; c++) ws.getRow(rr).getCell(c).value = null;
      }
    }
    groupStart = r;
  }

  for (let r = 1; r <= maxRow; r++) {
    const labelText = [1, 2, 3, 4].map((c) => cellText(ws.getRow(r).getCell(c)).trim().toLowerCase()).join(" ").trim();
    if (labelText.includes("grand total")) ws.getRow(r).getCell(5).value = Math.round(grandTotal * 100) / 100;
    else if (labelText === "tax") ws.getRow(r).getCell(5).value = Math.round(grandTotal * GCT_RATE * 100) / 100;
  }
}

export async function buildWorkbookXlsx(data: XlsxExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);

  // Always run every BoM sheet, even with zero matching categories — that's what clears the
  // template's own MOH example data down to blank/zero rather than leaving someone else's
  // project data sitting in the file for a system the new project doesn't use at all.
  for (const system of ["VSS", "EAC", "Intercom"] as const) {
    const cats = data.categories.filter((c) => c.system === system);
    await populateBomSheet(wb, system, cats, data.exchangeRate);
  }
  await populateSynthesisSheet(wb, data.categories);

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
