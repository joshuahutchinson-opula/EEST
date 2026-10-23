import fs from "fs";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun, ShadingType } from "docx";
import {
  buildBrandedHeader,
  buildBrandedFooter,
  buildCoverPage,
  emptyHeader,
  emptyFooter,
  BRANDED_DOCUMENT_STYLES,
  BRANDED_PAGE_MARGINS,
  BRAND_COLORS,
  TABLE_HEADER_SHADING,
  TABLE_HEADER_TEXT_COLOR,
  ZEBRA_ROW_SHADING,
} from "./branding";
import { resolveUploadPath } from "./uploads";

// The one report template every generated Word document is built on: E-Tech cover page, the
// running branded header and footer from page 2, margins and base styles, plus the shared
// pieces documents are made of (intro block, zebra tables, totals tables, photo rows).

export type Block = Paragraph | Table;
type Align = (typeof AlignmentType)[keyof typeof AlignmentType];

export function fmtJMD(n: number): string {
  return `J$${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtUSD(n: number): string {
  return `$${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface ReportOptions {
  title: string;
  cover: { preparedFor?: string; reference?: string; date?: string };
  body: Block[];
}

export async function buildReport({ title, cover, body }: ReportOptions): Promise<Buffer> {
  const doc = new Document({
    styles: BRANDED_DOCUMENT_STYLES,
    sections: [
      {
        properties: { page: { margin: BRANDED_PAGE_MARGINS }, titlePage: true },
        headers: { first: emptyHeader(), default: buildBrandedHeader(title) },
        footers: { first: emptyFooter(), default: buildBrandedFooter() },
        children: [...buildCoverPage(title, cover), ...body],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

// First block after the cover: "Project — Client" on a new page, then smaller meta lines
// (generated date, location, validity...).
export function reportIntro(projectLine: string | null, lines: { text: string; bold?: boolean; color?: string; size?: number }[], spaceAfter = 200): Paragraph[] {
  const out: Paragraph[] = [];
  if (projectLine) out.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: projectLine, bold: true, size: 26 })] }));
  lines.forEach((l, i) =>
    out.push(new Paragraph({
      pageBreakBefore: !projectLine && i === 0,
      spacing: { after: i === lines.length - 1 ? spaceAfter : 0 },
      children: [new TextRun({ text: l.text, size: l.size ?? 16, bold: l.bold, color: l.color ?? "999999" })],
    }))
  );
  return out;
}

export function bodyText(text: string, opts?: { italics?: boolean; color?: string; size?: number; spaceAfter?: number; spaceBefore?: number }): Paragraph {
  return new Paragraph({
    spacing: { before: opts?.spaceBefore, after: opts?.spaceAfter },
    children: [new TextRun({ text, size: opts?.size ?? 20, italics: opts?.italics, color: opts?.color })],
  });
}

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, ...TABLE_HEADER_SHADING },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: TABLE_HEADER_TEXT_COLOR, size: 18 })] })],
  });
}

export function bodyCell(text: string, width: number, opts?: { align?: Align; shaded?: boolean; bold?: boolean }): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: opts?.shaded ? { type: ShadingType.CLEAR, ...ZEBRA_ROW_SHADING } : undefined,
    children: [new Paragraph({ alignment: opts?.align, children: [new TextRun({ text, size: 18, bold: opts?.bold })] })],
  });
}

export interface Column { header: string; width: number; align?: Align }

// Navy header row and zebra-striped body rows.
export function dataTable(columns: Column[], rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: columns.map((c) => headerCell(c.header, c.width)) }),
      ...rows.map((row, i) => new TableRow({ children: columns.map((c, j) => bodyCell(row[j] ?? "", c.width, { align: c.align, shaded: i % 2 === 1 })) })),
    ],
  });
}

// Right-aligned label/value rows; the emphasized row gets the large navy figure.
export function totalsTable(rows: { label: string; value: string; emphasis?: boolean }[], widthPct = 60): Table {
  return new Table({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.RIGHT,
    rows: rows.map((r) =>
      new TableRow({
        children: [
          bodyCell(r.label, 60, { align: AlignmentType.RIGHT, bold: r.emphasis }),
          r.emphasis
            ? new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: r.value, bold: true, size: 22, color: BRAND_COLORS.navy })] })] })
            : bodyCell(r.value, 40, { align: AlignmentType.RIGHT }),
        ],
      })
    ),
  });
}

type DocxImageType = "jpg" | "png" | "gif" | "bmp";
function imageTypeFromUrl(url: string): DocxImageType {
  const ext = url.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  if (ext === "png") return "png";
  if (ext === "gif") return "gif";
  if (ext === "bmp") return "bmp";
  return "jpg"; // covers jpg/jpeg and is the safest default for camera photos
}

// Reads an uploaded photo into an ImageRun, skipping it (rather than failing the document) if
// the file is missing.
export function tryLoadImageRun(fileUrl: string, width: number, height: number): ImageRun | null {
  try {
    const filePath = resolveUploadPath(fileUrl);
    if (!filePath) return null;
    return new ImageRun({ type: imageTypeFromUrl(fileUrl), data: fs.readFileSync(filePath), transformation: { width, height } });
  } catch {
    return null;
  }
}

// A row of up to `max` photos side by side; null when none could be loaded.
export function photoRow(fileUrls: string[], opts: { width?: number; height?: number; max?: number } = {}): Paragraph | null {
  const runs = fileUrls.slice(0, opts.max ?? 4).map((url) => tryLoadImageRun(url, opts.width ?? 150, opts.height ?? 112)).filter((r): r is ImageRun => r !== null);
  if (runs.length === 0) return null;
  return new Paragraph({ spacing: { before: 100, after: 100 }, children: runs.flatMap((run, i) => (i > 0 ? [new TextRun({ text: "   " }), run] : [run])) });
}

export { sectionHeading, brandRuleParagraph, BRAND_COLORS } from "./branding";
