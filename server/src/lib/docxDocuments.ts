import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun, ShadingType } from "docx";
import fs from "fs";
import {
  buildBrandedHeader,
  buildBrandedFooter,
  BRANDED_DOCUMENT_STYLES,
  BRANDED_PAGE_MARGINS,
  sectionHeading,
  BRAND_COLORS,
  TABLE_HEADER_SHADING,
  TABLE_HEADER_TEXT_COLOR,
  ZEBRA_ROW_SHADING,
} from "./branding";

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
  exchangeRate: number;
  categories: { system: string; sectionNumber: number; name: string; items: { description: string; unitCost: number; quantity: number; markupPercent: number; sellPrice: number; total: number }[] }[];
  grandTotal: number;
  gctAmount: number;
  grandTotalWithTax: number;
  generatedAt: string;
}

export async function buildProposalDocx(data: ProposalDocxData): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: `${data.project.name} — ${data.project.client}`, bold: true, size: 26 })] }),
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
        properties: { page: { margin: BRANDED_PAGE_MARGINS } },
        headers: { default: buildBrandedHeader("Project Proposal") },
        footers: { default: buildBrandedFooter() },
        children: [...children, ...tables, new Paragraph({ spacing: { before: 300 }, children: [] }), totalsTable],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
