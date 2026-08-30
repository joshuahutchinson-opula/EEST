import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun, ShadingType } from "docx";
import fs from "fs";
import {
  buildBrandedHeader,
  buildBrandedFooter,
  buildCoverPage,
  emptyHeader,
  emptyFooter,
  BRANDED_DOCUMENT_STYLES,
  BRANDED_PAGE_MARGINS,
  sectionHeading,
  brandRuleParagraph,
  BRAND_COLORS,
  TABLE_HEADER_SHADING,
  TABLE_HEADER_TEXT_COLOR,
  ZEBRA_ROW_SHADING,
  resolveUploadPath,
} from "./branding";

type DocxImageType = "jpg" | "png" | "gif" | "bmp";
function imageTypeFromUrl(url: string): DocxImageType {
  const ext = url.split(".").pop()?.toLowerCase();
  if (ext === "png") return "png";
  if (ext === "gif") return "gif";
  if (ext === "bmp") return "bmp";
  return "jpg"; // covers jpg/jpeg and is the safest default for camera photos
}

// Reads an uploaded photo (coverage photo, as-installed photo, etc. — anything stored via the
// generic /uploads/documents mechanism) into an ImageRun, skipping silently if the file is
// missing rather than failing the whole document generation over one bad photo.
function tryLoadImageRun(fileUrl: string, width: number, height: number): ImageRun | null {
  try {
    const data = fs.readFileSync(resolveUploadPath(fileUrl));
    return new ImageRun({ type: imageTypeFromUrl(fileUrl), data, transformation: { width, height } });
  } catch {
    return null;
  }
}

export function fmtUSD(n: number): string {
  return `$${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, ...TABLE_HEADER_SHADING },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: TABLE_HEADER_TEXT_COLOR, size: 18 })] })],
  });
}

function bodyCell(text: string, width: number, opts?: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; shaded?: boolean; bold?: boolean }): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: opts?.shaded ? { type: ShadingType.CLEAR, ...ZEBRA_ROW_SHADING } : undefined,
    children: [new Paragraph({ alignment: opts?.align, children: [new TextRun({ text, size: 18, bold: opts?.bold })] })],
  });
}

// === 6.2 — Proposal ==========================================================================

export interface ProposalDocxData {
  project: { id: string; name: string; client: string; summary?: string; location?: string };
  refNumber?: string;
  exchangeRate: number;
  categories: { system: string; sectionNumber: number; name: string; items: { description: string; unitCost: number; quantity: number; markupPercent: number; sellPrice: number; total: number }[] }[];
  grandTotal: number;
  gctAmount: number;
  grandTotalWithTax: number;
  generatedAt: string;
}

export async function buildProposalDocx(data: ProposalDocxData): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: `${data.project.name} — ${data.project.client}`, bold: true, size: 26 })] }),
  ];
  if (data.project.location) children.push(new Paragraph({ children: [new TextRun({ text: data.project.location, size: 18, color: "666666" })] }));
  children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Generated ${new Date(data.generatedAt).toLocaleDateString()}`, size: 16, color: "999999" })] }));
  if (data.project.summary) {
    children.push(sectionHeading("Scope of Work"));
    children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: data.project.summary, size: 20 })] }));
  }

  const tables: (Paragraph | Table)[] = [];
  for (const cat of data.categories) {
    if (cat.items.length === 0) continue;
    tables.push(sectionHeading(`${cat.sectionNumber} — ${cat.name}`));
    tables.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [headerCell("Description", 60), headerCell("Qty", 15), headerCell("Total", 25)] }),
          ...cat.items.map((item, i) =>
            new TableRow({
              children: [
                bodyCell(item.description, 60, { shaded: i % 2 === 1 }),
                bodyCell(String(item.quantity), 15, { align: AlignmentType.CENTER, shaded: i % 2 === 1 }),
                bodyCell(fmtUSD(item.total), 25, { align: AlignmentType.RIGHT, shaded: i % 2 === 1 }),
              ],
            })
          ),
        ],
      })
    );
  }

  const totalsTable = new Table({
    width: { size: 60, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.RIGHT,
    rows: [
      new TableRow({ children: [bodyCell("Grand Total", 60, { align: AlignmentType.RIGHT }), bodyCell(fmtUSD(data.grandTotal), 40, { align: AlignmentType.RIGHT })] }),
      new TableRow({ children: [bodyCell("GCT (15%)", 60, { align: AlignmentType.RIGHT }), bodyCell(fmtUSD(data.gctAmount), 40, { align: AlignmentType.RIGHT })] }),
      new TableRow({
        children: [
          bodyCell("Total", 60, { align: AlignmentType.RIGHT, bold: true }),
          new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmtUSD(data.grandTotalWithTax), bold: true, size: 22, color: BRAND_COLORS.navy })] })] }),
        ],
      }),
    ],
  });

  const doc = new Document({
    styles: BRANDED_DOCUMENT_STYLES,
    sections: [
      {
        properties: { page: { margin: BRANDED_PAGE_MARGINS }, titlePage: true },
        headers: { first: emptyHeader(), default: buildBrandedHeader("Project Proposal") },
        footers: { first: emptyFooter(), default: buildBrandedFooter() },
        children: [
          ...buildCoverPage("Project Proposal", { preparedFor: data.project.client, reference: data.refNumber, date: new Date(data.generatedAt).toLocaleDateString() }),
          ...children,
          ...tables,
          new Paragraph({ spacing: { before: 300 }, children: [] }),
          totalsTable,
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

// === 6.3 — Commissioning Report ==============================================================

export interface CommissioningReportDocxData {
  project: { name: string; client: string } | null;
  summary: { total: number; passed: number; failed: number; pending: number };
  devices: { deviceName: string; location?: string; status: string; notes?: string; installedPhotos?: string[] }[];
  generatedAt: string;
}

const STATUS_LABEL: Record<string, string> = { pass: "PASS", fail: "FAIL", pending: "PENDING" };

export async function buildCommissioningReportDocx(data: CommissioningReportDocxData): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];
  if (data.project) children.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: `${data.project.name} — ${data.project.client}`, bold: true, size: 26 })] }));
  children.push(new Paragraph({ pageBreakBefore: !data.project, spacing: { after: 100 }, children: [new TextRun({ text: `Generated ${new Date(data.generatedAt).toLocaleDateString()}`, size: 16, color: "999999" })] }));
  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [new TextRun({ text: `${data.summary.total} devices — ${data.summary.passed} passed, ${data.summary.failed} failed, ${data.summary.pending} pending`, size: 20, bold: true, color: BRAND_COLORS.navy })],
    })
  );

  for (const device of data.devices) {
    children.push(brandRuleParagraph());
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: device.deviceName, bold: true, size: 22 }),
          new TextRun({ text: `   ${STATUS_LABEL[device.status] || device.status.toUpperCase()}`, bold: true, size: 18, color: device.status === "pass" ? "1E8E3E" : device.status === "fail" ? "D93025" : "8A6D00" }),
        ],
      })
    );
    children.push(new Paragraph({ children: [new TextRun({ text: device.location || "No location recorded", size: 18, color: "555555" })] }));
    if (device.notes) children.push(new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: device.notes, size: 18, italics: true, color: "666666" })] }));

    const photoRuns = (device.installedPhotos || []).slice(0, 4).map((url) => tryLoadImageRun(url, 150, 112)).filter((r): r is ImageRun => r !== null);
    if (photoRuns.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 100 },
          children: photoRuns.flatMap((run, i) => (i > 0 ? [new TextRun({ text: "   " }), run] : [run])),
        })
      );
    }
  }

  const doc = new Document({
    styles: BRANDED_DOCUMENT_STYLES,
    sections: [
      {
        properties: { page: { margin: BRANDED_PAGE_MARGINS }, titlePage: true },
        headers: { first: emptyHeader(), default: buildBrandedHeader("Commissioning Handover Report") },
        footers: { first: emptyFooter(), default: buildBrandedFooter() },
        children: [
          ...buildCoverPage("Commissioning Handover Report", { preparedFor: data.project?.client, date: new Date(data.generatedAt).toLocaleDateString() }),
          ...children,
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

// === 6.4 — Client Equipment Summary ==========================================================

const ASSET_CATEGORY_LABELS: Record<string, string> = {
  camera: "Camera",
  "access-control": "Access Control",
  "network-hardware": "Network Hardware",
  "cable-wire": "Cable / Wire",
  intercom: "Intercom",
  software: "Software",
  other: "Other",
};

export interface EquipmentSummaryDocxData {
  project: { name: string; client: string };
  assets: { category: string; quantity: number; location?: string; purpose?: string; manufacturer?: string; model?: string; cableSpec?: { cableType: string; runDescription?: string } }[];
  generatedAt: string;
}

function describeEquipmentAsset(a: EquipmentSummaryDocxData["assets"][number]): string {
  if (a.manufacturer || a.model) return `${a.manufacturer || ""} ${a.model || ""}`.trim();
  if (a.cableSpec) return `${a.cableSpec.cableType}${a.cableSpec.runDescription ? " — " + a.cableSpec.runDescription : ""}`;
  return a.purpose || ASSET_CATEGORY_LABELS[a.category] || a.category;
}

export async function buildEquipmentSummaryDocx(data: EquipmentSummaryDocxData): Promise<Buffer> {
  const grouped = new Map<string, EquipmentSummaryDocxData["assets"]>();
  for (const a of data.assets) {
    const list = grouped.get(a.category) || [];
    list.push(a);
    grouped.set(a.category, list);
  }

  const children: (Paragraph | Table)[] = [
    new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: `${data.project.name} — ${data.project.client}`, bold: true, size: 26 })] }),
    new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: `Generated ${new Date(data.generatedAt).toLocaleDateString()}`, size: 16, color: "999999" })] }),
  ];

  // Fixed category order (rather than first-seen-in-filter order, which only made sense when
  // this export respected the on-screen search/filter) so a client-facing document is always
  // laid out the same way regardless of what an admin last had filtered on screen.
  for (const cat of Object.keys(ASSET_CATEGORY_LABELS)) {
    const items = grouped.get(cat);
    if (!items || items.length === 0) continue;
    children.push(sectionHeading(`${ASSET_CATEGORY_LABELS[cat]} (${items.length})`));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [headerCell("Item", 40), headerCell("Qty", 10), headerCell("Location", 25), headerCell("Purpose", 25)] }),
          ...items.map((a, i) =>
            new TableRow({
              children: [
                bodyCell(describeEquipmentAsset(a), 40, { shaded: i % 2 === 1 }),
                bodyCell(String(a.quantity), 10, { align: AlignmentType.CENTER, shaded: i % 2 === 1 }),
                bodyCell(a.location || "—", 25, { shaded: i % 2 === 1 }),
                bodyCell(a.purpose || "", 25, { shaded: i % 2 === 1 }),
              ],
            })
          ),
        ],
      })
    );
  }

  const doc = new Document({
    styles: BRANDED_DOCUMENT_STYLES,
    sections: [
      {
        properties: { page: { margin: BRANDED_PAGE_MARGINS }, titlePage: true },
        headers: { first: emptyHeader(), default: buildBrandedHeader("Client Equipment Summary") },
        footers: { first: emptyFooter(), default: buildBrandedFooter() },
        children: [
          ...buildCoverPage("Client Equipment Summary", { preparedFor: data.project.client, date: new Date(data.generatedAt).toLocaleDateString() }),
          ...children,
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

// === 6.5 — Change Order ======================================================================
// Always shows pricing — a change order document exists specifically to communicate a price
// change for approval, so unlike Equipment Summary/Client Status there is no no-pricing
// variant of this one. Generation is gated to admin server-side (see the route), matching how
// the rest of the app treats "produce a formal pricing document" as an admin-only action.

export interface ChangeOrderDocxData {
  project: { name: string; client: string };
  changeOrder: { id: string; title: string; description: string; costImpact: number; status: string; createdBy: string; createdAt: string };
}

const CO_STATUS_LABEL: Record<string, string> = { draft: "Draft", submitted: "Submitted", approved: "Approved", rejected: "Rejected" };
const CO_STATUS_COLOR: Record<string, string> = { draft: "8A6D00", submitted: "1D4D89", approved: "1E8E3E", rejected: "D93025" };

export async function buildChangeOrderDocx(data: ChangeOrderDocxData): Promise<Buffer> {
  const co = data.changeOrder;
  const children: (Paragraph | Table)[] = [
    new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: `${data.project.name} — ${data.project.client}`, bold: true, size: 26 })] }),
    new Paragraph({
      spacing: { before: 100, after: 240 },
      children: [
        new TextRun({ text: `${CO_STATUS_LABEL[co.status] || co.status}`, bold: true, size: 20, color: CO_STATUS_COLOR[co.status] || "555555" }),
        new TextRun({ text: `   Submitted by ${co.createdBy || "—"} on ${new Date(co.createdAt).toLocaleDateString()}`, size: 16, color: "999999" }),
      ],
    }),
    sectionHeading(co.title),
    sectionHeading("What Changed"),
    new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: co.description || "No description provided.", size: 20 })] }),
  ];

  const priceTable = new Table({
    width: { size: 60, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          bodyCell("Price Impact", 60, { align: AlignmentType.RIGHT, bold: true }),
          new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmtUSD(co.costImpact), bold: true, size: 24, color: BRAND_COLORS.navy })] })] }),
        ],
      }),
    ],
  });

  const doc = new Document({
    styles: BRANDED_DOCUMENT_STYLES,
    sections: [
      {
        properties: { page: { margin: BRANDED_PAGE_MARGINS }, titlePage: true },
        headers: { first: emptyHeader(), default: buildBrandedHeader("Change Order") },
        footers: { first: emptyFooter(), default: buildBrandedFooter() },
        children: [
          ...buildCoverPage("Change Order", { preparedFor: data.project.client, reference: `CO-${co.id.slice(0, 8).toUpperCase()}`, date: new Date(co.createdAt).toLocaleDateString() }),
          ...children,
          priceTable,
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
