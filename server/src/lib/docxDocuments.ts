import { Paragraph, TextRun, AlignmentType } from "docx";
import {
  Block,
  buildReport,
  reportIntro,
  bodyText,
  dataTable,
  totalsTable,
  photoRow,
  sectionHeading,
  brandRuleParagraph,
  BRAND_COLORS,
  fmtUSD,
} from "./reportTemplate";

// The Word documents the app generates, all built on the shared report template.

// === Commissioning Report ====================================================================

export interface CommissioningReportDocxData {
  project: { name: string; client: string } | null;
  summary: { total: number; passed: number; failed: number; pending: number };
  devices: { deviceName: string; location?: string; status: string; notes?: string; installedPhotos?: string[] }[];
  generatedAt: string;
}

const STATUS_LABEL: Record<string, string> = { pass: "PASS", fail: "FAIL", pending: "PENDING" };
export const STATUS_COLOR: Record<string, string> = { pass: "1E8E3E", fail: "D93025", pending: "8A6D00" };

// One device block (name, status, location, notes, up to four as-installed photos).
export function commissioningDeviceBlocks(device: CommissioningReportDocxData["devices"][number]): Block[] {
  const out: Block[] = [brandRuleParagraph()];
  out.push(new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: device.deviceName, bold: true, size: 22 }),
      new TextRun({ text: `   ${STATUS_LABEL[device.status] || device.status.toUpperCase()}`, bold: true, size: 18, color: STATUS_COLOR[device.status] || "8A6D00" }),
    ],
  }));
  out.push(bodyText(device.location || "No location recorded", { size: 18, color: "555555" }));
  if (device.notes) out.push(bodyText(device.notes, { size: 18, italics: true, color: "666666", spaceBefore: 60 }));
  const photos = photoRow(device.installedPhotos || []);
  if (photos) out.push(photos);
  return out;
}

export async function buildCommissioningReportDocx(data: CommissioningReportDocxData): Promise<Buffer> {
  const body: Block[] = reportIntro(data.project ? `${data.project.name} — ${data.project.client}` : null, [{ text: `Generated ${new Date(data.generatedAt).toLocaleDateString()}` }], 100);
  body.push(new Paragraph({
    spacing: { after: 240 },
    children: [new TextRun({ text: `${data.summary.total} devices — ${data.summary.passed} passed, ${data.summary.failed} failed, ${data.summary.pending} pending`, size: 20, bold: true, color: BRAND_COLORS.navy })],
  }));
  for (const device of data.devices) body.push(...commissioningDeviceBlocks(device));

  return buildReport({
    title: "Commissioning Handover Report",
    cover: { preparedFor: data.project?.client, date: new Date(data.generatedAt).toLocaleDateString() },
    body,
  });
}

// === Client Equipment Summary ================================================================

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

export function describeEquipmentAsset(a: EquipmentSummaryDocxData["assets"][number]): string {
  if (a.manufacturer || a.model) return `${a.manufacturer || ""} ${a.model || ""}`.trim();
  if (a.cableSpec) return `${a.cableSpec.cableType}${a.cableSpec.runDescription ? " — " + a.cableSpec.runDescription : ""}`;
  return a.purpose || ASSET_CATEGORY_LABELS[a.category] || a.category;
}

// Assets grouped by category, in a fixed category order so a client-facing document is always
// laid out the same way.
export function equipmentSections(assets: EquipmentSummaryDocxData["assets"]): Block[] {
  const grouped = new Map<string, EquipmentSummaryDocxData["assets"]>();
  for (const a of assets) grouped.set(a.category, [...(grouped.get(a.category) || []), a]);
  const out: Block[] = [];
  for (const cat of Object.keys(ASSET_CATEGORY_LABELS)) {
    const items = grouped.get(cat);
    if (!items || items.length === 0) continue;
    out.push(sectionHeading(`${ASSET_CATEGORY_LABELS[cat]} (${items.length})`));
    out.push(dataTable(
      [{ header: "Item", width: 40 }, { header: "Qty", width: 10, align: AlignmentType.CENTER }, { header: "Location", width: 25 }, { header: "Purpose", width: 25 }],
      items.map((a) => [describeEquipmentAsset(a), String(a.quantity), a.location || "—", a.purpose || ""])
    ));
  }
  return out;
}

export async function buildEquipmentSummaryDocx(data: EquipmentSummaryDocxData): Promise<Buffer> {
  return buildReport({
    title: "Client Equipment Summary",
    cover: { preparedFor: data.project.client, date: new Date(data.generatedAt).toLocaleDateString() },
    body: [
      ...reportIntro(`${data.project.name} — ${data.project.client}`, [{ text: `Generated ${new Date(data.generatedAt).toLocaleDateString()}` }], 240),
      ...equipmentSections(data.assets),
    ],
  });
}

// === Change Order ============================================================================
// Always shows pricing — a change order exists to communicate a price change for approval.
// Generation is admin-only (see the route).

export interface ChangeOrderDocxData {
  project: { name: string; client: string };
  changeOrder: { id: string; title: string; description: string; costImpact: number; status: string; createdBy: string; createdAt: string };
}

const CO_STATUS_LABEL: Record<string, string> = { draft: "Draft", submitted: "Submitted", approved: "Approved", rejected: "Rejected" };
const CO_STATUS_COLOR: Record<string, string> = { draft: "8A6D00", submitted: "1D4D89", approved: "1E8E3E", rejected: "D93025" };

export async function buildChangeOrderDocx(data: ChangeOrderDocxData): Promise<Buffer> {
  const co = data.changeOrder;
  return buildReport({
    title: "Change Order",
    cover: { preparedFor: data.project.client, reference: `CO-${co.id.slice(0, 8).toUpperCase()}`, date: new Date(co.createdAt).toLocaleDateString() },
    body: [
      ...reportIntro(`${data.project.name} — ${data.project.client}`, [], 0),
      new Paragraph({
        spacing: { before: 100, after: 240 },
        children: [
          new TextRun({ text: `${CO_STATUS_LABEL[co.status] || co.status}`, bold: true, size: 20, color: CO_STATUS_COLOR[co.status] || "555555" }),
          new TextRun({ text: `   Submitted by ${co.createdBy || "—"} on ${new Date(co.createdAt).toLocaleDateString()}`, size: 16, color: "999999" }),
        ],
      }),
      sectionHeading(co.title),
      sectionHeading("What Changed"),
      bodyText(co.description || "No description provided.", { spaceAfter: 240 }),
      totalsTable([{ label: "Price Impact", value: fmtUSD(co.costImpact), emphasis: true }]),
    ],
  });
}
