import fs from "fs";
import path from "path";
import { Header, Footer, Paragraph, TextRun, ImageRun, AlignmentType, BorderStyle, HeightRule } from "docx";

// Single shared branding module — every docx generator (Proposal, Commissioning Report,
// Client Equipment Summary, Change Order) imports from here rather than re-declaring its own
// colors/logo/footer, so a brand change only ever needs to happen in one place.

export const BRAND_COLORS = {
  lightBlue: "41B1E4",
  lightBlue2: "5DBEDD",
  navy: "1D4D89",
  navy2: "1F4281",
};

const ASSETS_DIR = path.join(__dirname, "..", "assets", "branding");

export const LOGO_FULL_COLOR = fs.readFileSync(path.join(ASSETS_DIR, "etech-logo-full-color.png"));
export const LOGO_GRAYSCALE = fs.readFileSync(path.join(ASSETS_DIR, "etech-logo-grayscale.png"));
export const HEADER_BANNER = fs.readFileSync(path.join(ASSETS_DIR, "etech-header-gradient-banner.png"));

export const LETTERHEAD_FOOTER_TEXT =
  "E-Tech Systems Limited: Kingston 5, St. Andrew, Jamaica. Contact T (876) 633-3648, Ext 2000 E: support@e-techsystemsja.com W: www.e-techsystemsja.com";

// Resolves a stored fileUrl (e.g. "/uploads/documents/xyz.jpg", the shape every upload in this
// app produces — coverage photos, as-installed photos, generic documents) to the local path
// multer actually wrote it to, so a docx generator can read it into an ImageRun buffer.
export function resolveUploadPath(fileUrl: string): string {
  return path.join(__dirname, "..", fileUrl.replace(/^\//, ""));
}

// Gradient banner behind the title, used on the first page of every generated document.
export function buildBrandedHeader(title: string, subtitle?: string): Header {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ type: "png", data: HEADER_BANNER, transformation: { width: 520, height: 65 } })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160 },
        children: [new TextRun({ text: title, bold: true, size: 32, color: BRAND_COLORS.navy, font: "Calibri" })],
      }),
      ...(subtitle
        ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: subtitle, size: 20, color: "555555", font: "Calibri" })] })]
        : []),
    ],
  });
}

// Standard letterhead footer: a light-blue rule, the grayscale logo, and the company contact
// line — used on every page of every generated document.
export function buildBrandedFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: BRAND_COLORS.lightBlue, space: 4 } },
        spacing: { before: 100 },
        children: [new ImageRun({ type: "png", data: LOGO_GRAYSCALE, transformation: { width: 100, height: 38 } })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40 },
        children: [new TextRun({ text: LETTERHEAD_FOOTER_TEXT, size: 15, color: "666666", font: "Calibri" })],
      }),
    ],
  });
}

// Shared Document-level defaults (base font) so every generator's body text matches.
export const BRANDED_DOCUMENT_STYLES = {
  default: {
    document: { run: { font: "Calibri", size: 22 } },
  },
};

export const BRANDED_PAGE_MARGINS = { top: 1600, bottom: 1400, left: 1000, right: 1000 };

// A thin colored divider row, used to separate sections in place of a plain heading underline.
export function brandRuleParagraph(): Paragraph {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BRAND_COLORS.lightBlue2, space: 1 } },
    spacing: { after: 160 },
    children: [],
  });
}

export function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, color: BRAND_COLORS.navy })],
  });
}

export const TABLE_HEADER_SHADING = { fill: BRAND_COLORS.navy };
export const TABLE_HEADER_TEXT_COLOR = "FFFFFF";
export const ZEBRA_ROW_SHADING = { fill: "F2F8FC" };

export const EMPTY_ROW_HEIGHT = { value: 260, rule: HeightRule.ATLEAST };
