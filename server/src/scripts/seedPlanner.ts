// Seeds the Sales and Projects pipelines from a Microsoft Planner export that has already been
// mapped to EEST values (see the eest-seed JSON; it is never committed).
//
//   npm run seed:planner -- <path-to-json> [--wipe]
//
// Uses DATABASE_URL. Re-running skips rows that are already there: deals and Planner tasks by
// their Planner id, projects by name, deal checklist items by title within the deal.
//
// --wipe first deletes every project and everything attached to it, and all client records, in
// one transaction. The Device Library, inventory (links to deleted projects are nulled), tutorial
// progress and settings are kept.
//
// Seeded tasks never get Outlook events (outlook_sync is off; EEST's calendar shows them from the
// database) and never trigger the overdue email for a due date before the day of the run.
import fs from "fs";
import type { PoolClient } from "pg";
import pool, { initDB } from "../db";
import { TEAM_MEMBERS } from "../lib/teamMembers";
import { isPlaceholderClient } from "../lib/clientNames";
import { isGraphConfigured } from "../lib/graph";
import { removeTaskFromCalendar } from "../lib/calendarSync";

const JMD_PER_USD = 163;

interface SeedContact { name: string; title?: string; phone?: string; email?: string }
interface SeedChecklistItem { title: string; status: string }
interface SeedTask {
  plannerTaskId: string; title: string; description: string | null; status: string; priority: string;
  assignee: string | null; otherAssignees: string[]; dueDate: string | null; createdAt: string;
  completedAt: string | null; completedBy: string | null;
}
interface SeedDeal {
  plannerTaskId: string; name: string; client: string; stage: string; owner: string | null; collaborators: string[];
  value: number | null; valueCurrency: "USD" | "JMD" | null; contacts: SeedContact[]; dueDate: string | null; createdAt: string;
  notes: string | null; tasks: SeedChecklistItem[];
}
interface SeedProject {
  name: string; client: string; projectStage: string; supportType: string | null; owner: string | null; collaborators: string[];
  dueDate: string | null; createdAt: string; tasks: SeedTask[];
}
interface SeedFile { salesDeals: SeedDeal[]; projects: SeedProject[] }

const counts = {
  deals: { created: 0, skipped: 0 }, projects: { created: 0, skipped: 0 },
  projectTasks: { created: 0, skipped: 0 }, dealTasks: { created: 0, skipped: 0 },
  clients: { created: 0, skipped: 0 },
};

// Dates in the export are calendar days; store them at midday Jamaica time so they don't shift a
// day in either direction when shown.
const at = (day: string | null | undefined) => (day ? `${day}T12:00:00-05:00` : null);

function member(name: string | null | undefined) {
  if (!name) return null;
  const known = TEAM_MEMBERS.find((m) => m.name.toLowerCase() === name.trim().toLowerCase());
  return known ?? { name, initials: name.slice(0, 2).toUpperCase(), color: "#3b82f6" };
}

const paragraphs = (...parts: (string | null | undefined | false)[]) => parts.filter((p): p is string => !!p && !!p.trim()).join("\n\n") || null;

async function wipe(client: PoolClient) {
  // Inventory stays; it just stops pointing at the projects and install devices going away.
  await client.query(`UPDATE inventory_items SET project_id = NULL, install_device_id = NULL WHERE project_id IS NOT NULL OR install_device_id IS NOT NULL`);
  await client.query(`UPDATE inventory_transactions SET project_id = NULL, install_device_id = NULL WHERE project_id IS NOT NULL OR install_device_id IS NOT NULL`);
  // Tables that reference projects without ON DELETE CASCADE. Quotes take their categories, line
  // items and synthesis overrides with them; install zones take their devices.
  for (const table of ["quotes", "commissioning_checklists", "install_zones", "project_assets", "change_orders", "procurement_orders", "canvas_layouts", "audit_logs"]) {
    await client.query(`DELETE FROM ${table} WHERE project_id IS NOT NULL`);
  }
  // Cascades to tasks (and their calendar links), subcontractors and their documents, documents,
  // approvals, Workbook history and overrides, and CAMS client choices.
  const projects = await client.query(`DELETE FROM projects`);
  const clients = await client.query(`DELETE FROM clients`);
  console.log(`Wiped ${projects.rowCount} projects and ${clients.rowCount} clients`);
}

async function clientIdFor(client: PoolClient, name: string, seen: Map<string, string | null>): Promise<string | null> {
  const key = name.trim().toLowerCase();
  if (seen.has(key)) return seen.get(key)!;
  if (!key || isPlaceholderClient(key)) { seen.set(key, null); return null; }
  const inserted = await client.query(`INSERT INTO clients (name) VALUES ($1) ON CONFLICT ((lower(trim(name)))) DO NOTHING RETURNING id`, [name.trim()]);
  let id: string;
  if (inserted.rows[0]) { id = inserted.rows[0].id; counts.clients.created++; }
  else { id = (await client.query(`SELECT id FROM clients WHERE lower(trim(name)) = $1`, [key])).rows[0].id; counts.clients.skipped++; }
  seen.set(key, id);
  return id;
}

function dealValue(d: SeedDeal): { value: number; note: string | null } {
  if (d.value === null || d.value === undefined) return { value: 0, note: null };
  const amount = d.value.toLocaleString("en-US");
  if (d.valueCurrency === "USD") return { value: d.value, note: null };
  if (d.valueCurrency === "JMD") return { value: Math.round((d.value / JMD_PER_USD) * 100) / 100, note: `(converted from J$${amount})` };
  return { value: 0, note: `Value from Planner: ${amount}, currency not stated` };
}

async function insertProject(client: PoolClient, row: {
  name: string; client: string; clientId: string | null; value: number; stage: string; owner: string | null; collaborators: string[];
  dueDate: string | null; contacts: SeedContact[]; notes: string | null; stageHistoryStage: string; pipelineType: "sales" | "project";
  projectStage: string | null; supportType: string | null; plannerTaskId: string | null; createdAt: string;
}): Promise<string> {
  const owner = member(row.owner);
  const collaborators = row.collaborators.map(member).filter(Boolean).map((m) => ({ ...m!, role: "Collaborator" }));
  const contacts = row.contacts.map((c) => ({ name: c.name, title: c.title || "", email: c.email || "", phone: c.phone || "" }));
  const result = await client.query(
    `INSERT INTO projects (name, client, client_id, value, stage, risk, assignee_name, assignee_initials, assignee_color, due_date, location, contacts, notes,
       collaborators, stage_history, pipeline_type, project_stage, support_type, planner_task_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'low', $6, $7, $8, $9, '', $10::jsonb, $11, $12::jsonb, $13::jsonb, $14, $15, $16, $17, $18, $18) RETURNING id`,
    [row.name, row.client, row.clientId, row.value, row.stage, owner?.name ?? "", owner?.initials ?? "", owner?.color ?? "#3b82f6", row.dueDate,
     JSON.stringify(contacts), row.notes, JSON.stringify(collaborators), JSON.stringify([{ stage: row.stageHistoryStage, date: row.createdAt }]),
     row.pipelineType, row.projectStage, row.supportType, row.plannerTaskId, at(row.createdAt)]
  );
  return result.rows[0].id;
}

async function seedDeal(client: PoolClient, d: SeedDeal, clients: Map<string, string | null>) {
  const existing = await client.query(`SELECT id FROM projects WHERE planner_task_id = $1`, [d.plannerTaskId]);
  let projectId: string;
  if (existing.rows[0]) { projectId = existing.rows[0].id; counts.deals.skipped++; await clientIdFor(client, d.client, clients); }
  else {
    const { value, note } = dealValue(d);
    projectId = await insertProject(client, {
      name: d.name, client: d.client, clientId: await clientIdFor(client, d.client, clients), value, stage: d.stage, owner: d.owner,
      collaborators: d.collaborators, dueDate: d.dueDate, contacts: d.contacts, notes: paragraphs(d.notes, note), stageHistoryStage: d.stage,
      pipelineType: "sales", projectStage: null, supportType: null, plannerTaskId: d.plannerTaskId, createdAt: d.createdAt,
    });
    counts.deals.created++;
  }
  // Checklist items have no Planner id: match by title, counting repeats so two identical items both land.
  const seenTitles = new Map<string, number>();
  for (const item of d.tasks) {
    const n = (seenTitles.get(item.title) ?? 0) + 1;
    seenTitles.set(item.title, n);
    const have = Number((await client.query(`SELECT count(*) FROM tasks WHERE project_id = $1 AND title = $2`, [projectId, item.title])).rows[0].count);
    if (have >= n) { counts.dealTasks.skipped++; continue; }
    await client.query(
      `INSERT INTO tasks (project_id, title, status, priority, created_at, updated_at, outlook_sync) VALUES ($1, $2, $3, 'medium', $4, $4, FALSE)`,
      [projectId, item.title, item.status, at(d.createdAt)]
    );
    counts.dealTasks.created++;
  }
}

async function seedProject(client: PoolClient, p: SeedProject, clients: Map<string, string | null>) {
  const existing = await client.query(`SELECT id FROM projects WHERE pipeline_type = 'project' AND deleted_at IS NULL AND lower(trim(name)) = lower(trim($1)) LIMIT 1`, [p.name]);
  let projectId: string;
  if (existing.rows[0]) { projectId = existing.rows[0].id; counts.projects.skipped++; await clientIdFor(client, p.client, clients); }
  else {
    projectId = await insertProject(client, {
      name: p.name, client: p.client, clientId: await clientIdFor(client, p.client, clients), value: 0, stage: "lead", owner: p.owner,
      collaborators: p.collaborators, dueDate: p.dueDate, contacts: [], notes: null, stageHistoryStage: p.projectStage,
      pipelineType: "project", projectStage: p.projectStage, supportType: p.supportType, plannerTaskId: null, createdAt: p.createdAt,
    });
    counts.projects.created++;
  }
  for (const t of p.tasks) {
    const already = await client.query(`SELECT 1 FROM tasks WHERE planner_task_id = $1`, [t.plannerTaskId]);
    if (already.rows.length) { counts.projectTasks.skipped++; continue; }
    const done = t.status === "complete";
    const description = paragraphs(
      t.description,
      t.otherAssignees.length > 0 && `Also assigned: ${t.otherAssignees.join(", ")}`,
      done && t.completedBy && `Completed by ${t.completedBy}`,
    );
    // Anything due before today counts as already notified, so the overdue check skips it.
    await client.query(
      `INSERT INTO tasks (project_id, title, description, assignee, status, priority, due_date, planner_task_id, created_at, updated_at, outlook_sync, overdue_notified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE, CASE WHEN $7::timestamptz < CURRENT_DATE THEN NOW() END)`,
      [projectId, t.title, description, t.assignee, t.status, t.priority, t.dueDate, t.plannerTaskId, at(t.createdAt), at(done ? t.completedAt || t.createdAt : t.createdAt)]
    );
    counts.projectTasks.created++;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const doWipe = args.includes("--wipe");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) { console.error("Usage: npm run seed:planner -- <path-to-json> [--wipe]"); process.exit(1); }
  const data = JSON.parse(fs.readFileSync(file, "utf-8")) as SeedFile;
  if (!Array.isArray(data.salesDeals) || !Array.isArray(data.projects)) throw new Error("Seed file needs salesDeals and projects arrays");

  await initDB();
  const graph = isGraphConfigured();

  if (doWipe) {
    // Outlook events made from the old tasks live outside the database, so they're removed first.
    const linked = await pool.query(`SELECT task_id FROM task_calendar_events`);
    if (graph) for (const r of linked.rows) await removeTaskFromCalendar(r.task_id);
    else if (linked.rows.length) console.warn(`Graph isn't configured here: ${linked.rows.length} Outlook events made from old tasks were left on calendars`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (doWipe) await wipe(client);
    const clients = new Map<string, string | null>();
    for (const d of data.salesDeals) await seedDeal(client, d, clients);
    for (const p of data.projects) await seedProject(client, p, clients);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  const line = (label: string, c: { created: number; skipped: number }) => console.log(`  ${label.padEnd(22)} ${String(c.created).padStart(4)} created  ${String(c.skipped).padStart(4)} skipped`);
  console.log(`\nPlanner seed${doWipe ? " (after wipe)" : ""}:`);
  line("Sales deals", counts.deals);
  line("Project items", counts.projects);
  line("Project tasks", counts.projectTasks);
  line("Deal checklist tasks", counts.dealTasks);
  line("Clients", counts.clients);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await pool.end().catch(() => {});
    process.exit(1);
  });
