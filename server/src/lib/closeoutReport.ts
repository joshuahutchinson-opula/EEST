import { AlignmentType, Paragraph, TextRun } from "docx";
import pool from "../db";
import { loadProjectWorkbook } from "./workbookData";
import { commissioningDeviceBlocks, equipmentSections } from "./docxDocuments";
import { Block, buildReport, reportIntro, bodyText, dataTable, totalsTable, sectionHeading, fmtJMD, fmtUSD } from "./reportTemplate";

// Internal close-out report for a finished (or commissioning) project: summary and stage
// timeline, quoted vs final value, equipment, commissioning results with as-installed photos,
// tasks, subcontractors and procurement. Admin only — it shows cost and margin.

const STAGE_LABEL: Record<string, string> = {
  support: "Support", planning: "Planning", procurement: "Procurement", installation: "Installation", commissioning: "Commissioning", complete: "Complete",
  lead: "Lead", opportunity: "Opportunity", "assessment-scheduled": "Assessment Scheduled", "assessment-completed": "Assessment Completed", proposal: "Proposal", negotiation: "Negotiation", win: "Win", lose: "Lose",
};
const fmtDate = (d: unknown) => (d ? new Date(String(d)).toLocaleDateString() : "—");
const both = (usd: number, rate: number) => `${fmtUSD(usd)}  (${fmtJMD(usd * rate)})`;

export async function buildCloseoutReport(projectId: string): Promise<{ buffer: Buffer; filename: string } | null> {
  const projectResult = await pool.query(`SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL`, [projectId]);
  const project = projectResult.rows[0];
  if (!project) return null;

  // The project's newest quote version.
  const wb = await loadProjectWorkbook(projectId, null);
  const [changeOrders, assets, installed, commissioning, tasks, subs, procurement] = await Promise.all([
    pool.query(`SELECT title, cost_impact, status, created_at FROM change_orders WHERE project_id = $1 ORDER BY created_at`, [projectId]),
    pool.query(
      `SELECT pa.category, pa.quantity, pa.location, pa.purpose, pa.cable_spec AS "cableSpec", d.manufacturer, d.model
       FROM project_assets pa LEFT JOIN devices d ON d.id::text = pa.device_store_ref WHERE pa.project_id = $1 ORDER BY pa.created_at`,
      [projectId]
    ),
    pool.query(
      `SELECT z.name AS zone, d.name, d.type, d.location, d.status, d.serial_number, d.mac_address, d.ip_address, d.firmware, d.warranty_expiry FROM install_devices d JOIN install_zones z ON z.id = d.zone_id
       WHERE z.project_id = $1 ORDER BY z.sort_order, z.name, d.name`,
      [projectId]
    ),
    pool.query(
      `SELECT cc.device_name AS "deviceName", cc.location, cc.status, cc.notes, idv.installed_photos AS "installedPhotos"
       FROM commissioning_checklists cc LEFT JOIN install_devices idv ON idv.id::text = cc.device_id
       WHERE cc.project_id = $1 ORDER BY cc.created_at`,
      [projectId]
    ),
    pool.query(`SELECT title, status, assignee, due_date FROM tasks WHERE project_id = $1 ORDER BY due_date NULLS LAST, created_at`, [projectId]),
    pool.query(`SELECT name, trade, email FROM subcontractors WHERE project_id = $1 ORDER BY name`, [projectId]),
    pool.query(
      `SELECT po.supplier_name, po.status, po.total_cost, po.created_at, COUNT(pi.id)::int AS items
       FROM procurement_orders po LEFT JOIN procurement_items pi ON pi.order_id = po.id
       WHERE po.project_id = $1 GROUP BY po.id ORDER BY po.created_at`,
      [projectId]
    ),
  ]);

  const rate = wb?.quote?.exchangeRate ?? 0;
  const body: Block[] = reportIntro(`${project.name} — ${project.client}`, [
    { text: `Generated ${new Date().toLocaleDateString()}` },
    ...(project.location ? [{ text: project.location, size: 18, color: "666666" }] : []),
    { text: `Current stage: ${STAGE_LABEL[project.project_stage] || project.project_stage || "—"}`, size: 18, color: "555555", bold: true },
  ]);

  // Summary and stage timeline
  body.push(sectionHeading("Project Summary"));
  body.push(bodyText(project.summary || "No summary recorded.", { spaceAfter: 120 }));
  const team = [project.assignee_name && `${project.assignee_name} (Account Owner)`, ...((project.collaborators || []) as { name: string; role: string }[]).map((c) => `${c.name} (${c.role})`)].filter(Boolean);
  if (team.length) body.push(bodyText(`Team: ${team.join(", ")}`, { size: 18, color: "555555", spaceAfter: 120 }));
  const history = ((project.stage_history || []) as { stage: string; date: string }[]).slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (history.length) {
    body.push(sectionHeading("Stage Timeline"));
    body.push(dataTable([{ header: "Stage", width: 60 }, { header: "Date", width: 40 }], history.map((h) => [STAGE_LABEL[h.stage] || h.stage, fmtDate(h.date)])));
  }

  // Financials
  body.push(sectionHeading("Quoted vs Final Value"));
  if (!wb?.quote) {
    body.push(bodyText("This project has no quote.", { italics: true, color: "666666" }));
  } else {
    const approvedCOs = changeOrders.rows.filter((c) => c.status === "approved");
    const coTotal = approvedCOs.reduce((s, c) => s + Number(c.cost_impact || 0), 0);
    const quoted = wb.totals.subtotal;
    const finalValue = quoted + coTotal;
    const importCost = wb.totals.sections.reduce((s, x) => s + x.importAmount, 0);
    const cost = wb.totals.itemsCost + importCost;
    const margin = finalValue > 0 ? ((finalValue - cost) / finalValue) * 100 : 0;
    body.push(totalsTable([
      { label: `Quoted (${wb.quote.refNumber} Rev ${wb.quote.revision}, excl. GCT)`, value: both(quoted, rate) },
      { label: `Approved change orders (${approvedCOs.length})`, value: both(coTotal, rate) },
      { label: "Final value (excl. GCT)", value: both(finalValue, rate), emphasis: true },
      { label: "Cost (items + imports)", value: both(cost, rate) },
      { label: "Gross margin", value: `${both(finalValue - cost, rate)}  ·  ${margin.toFixed(1)}%` },
    ], 100));
    body.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 80 }, children: [new TextRun({ text: `JMD at the quote's rate of J$${rate.toFixed(2)} per US$1. Change orders are counted as price only (their cost isn't recorded).`, size: 16, color: "666666" })] }));
    if (changeOrders.rows.length) {
      body.push(sectionHeading("Change Orders"));
      body.push(dataTable(
        [{ header: "Title", width: 50 }, { header: "Status", width: 15 }, { header: "Date", width: 15 }, { header: "Price impact", width: 20, align: AlignmentType.RIGHT }],
        changeOrders.rows.map((c) => [c.title, c.status, fmtDate(c.created_at), fmtUSD(Number(c.cost_impact || 0))])
      ));
    }
  }

  // Equipment
  body.push(sectionHeading("Equipment"));
  if (assets.rows.length) body.push(...equipmentSections(assets.rows));
  else body.push(bodyText("No project assets recorded.", { italics: true, color: "666666" }));
  if (installed.rows.length) {
    body.push(sectionHeading(`Installed Devices (${installed.rows.filter((d) => d.status === "complete").length} of ${installed.rows.length} complete)`));
    body.push(dataTable(
      [{ header: "Zone", width: 20 }, { header: "Device", width: 30 }, { header: "Type", width: 15 }, { header: "Location", width: 20 }, { header: "Status", width: 15 }],
      installed.rows.map((d) => [d.zone, d.name, d.type, d.location || "—", d.status])
    ));
    const recorded = installed.rows.filter((d) => d.serial_number || d.mac_address || d.ip_address || d.firmware || d.warranty_expiry);
    body.push(sectionHeading(`As-built Register (${recorded.length} of ${installed.rows.length} devices recorded)`));
    body.push(recorded.length
      ? dataTable(
          [{ header: "Device", width: 24 }, { header: "Serial", width: 18 }, { header: "MAC", width: 18 }, { header: "IP", width: 14 }, { header: "Firmware", width: 12 }, { header: "Warranty", width: 14 }],
          recorded.map((d) => [d.name, d.serial_number || "—", d.mac_address || "—", d.ip_address || "—", d.firmware || "—", fmtDate(d.warranty_expiry)])
        )
      : bodyText("No as-built details recorded.", { italics: true, color: "666666" }));
  }

  // Commissioning
  body.push(sectionHeading("Commissioning Results"));
  if (commissioning.rows.length) {
    const passed = commissioning.rows.filter((r) => r.status === "pass").length;
    const failed = commissioning.rows.filter((r) => r.status === "fail").length;
    body.push(bodyText(`${commissioning.rows.length} devices — ${passed} passed, ${failed} failed, ${commissioning.rows.length - passed - failed} pending`, { spaceAfter: 120 }));
    for (const device of commissioning.rows) body.push(...commissioningDeviceBlocks(device));
  } else {
    body.push(bodyText("No commissioning checklist recorded.", { italics: true, color: "666666" }));
  }

  // Tasks, subcontractors, procurement
  body.push(sectionHeading("Tasks"));
  body.push(tasks.rows.length
    ? dataTable([{ header: "Task", width: 50 }, { header: "Assignee", width: 20 }, { header: "Status", width: 15 }, { header: "Due", width: 15 }], tasks.rows.map((t) => [t.title, t.assignee || "—", t.status, fmtDate(t.due_date)]))
    : bodyText("No tasks.", { italics: true, color: "666666" }));
  body.push(sectionHeading("Subcontractors"));
  body.push(subs.rows.length
    ? dataTable([{ header: "Name", width: 40 }, { header: "Trade", width: 30 }, { header: "Email", width: 30 }], subs.rows.map((s) => [s.name, s.trade || "—", s.email || "—"]))
    : bodyText("No subcontractors.", { italics: true, color: "666666" }));
  body.push(sectionHeading("Procurement Orders"));
  body.push(procurement.rows.length
    ? dataTable(
        [{ header: "Supplier", width: 35 }, { header: "Status", width: 15 }, { header: "Items", width: 10, align: AlignmentType.CENTER }, { header: "Date", width: 15 }, { header: "Total cost", width: 25, align: AlignmentType.RIGHT }],
        procurement.rows.map((p) => [p.supplier_name || "—", p.status, String(p.items), fmtDate(p.created_at), fmtUSD(Number(p.total_cost || 0))])
      )
    : bodyText("No procurement orders.", { italics: true, color: "666666" }));

  const buffer = await buildReport({
    title: "Project Close-out Report",
    cover: { preparedFor: "E-Tech Systems (internal)", reference: wb?.quote?.refNumber, date: new Date().toLocaleDateString() },
    body,
  });
  return { buffer, filename: `${String(project.name).replace(/\s+/g, "-")}-closeout-report.docx` };
}
