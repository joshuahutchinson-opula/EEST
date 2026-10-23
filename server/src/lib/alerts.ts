import pool from "../db";
import { graph, isGraphConfigured } from "./graph";
import { emailForTeamMember, teamDirectory } from "./team";
import { getRoleForEmail } from "./microsoftAuth";

// Email alerts sent through Microsoft Graph sendMail from MAIL_SENDER (a mailbox in the tenant),
// using the app registration's Mail.Send application permission. Off unless MAIL_SENDER is set.
// Best effort: failures are logged, never thrown at callers.

export function isMailConfigured(): boolean {
  return isGraphConfigured() && Boolean(process.env.MAIL_SENDER);
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const appLink = (label: string) => (process.env.APP_BASE_URL ? `<p><a href="${esc(process.env.APP_BASE_URL)}">${esc(label)}</a></p>` : "");

function layout(heading: string, rows: [string, string][], footer: string) {
  return `<div style="font-family:Calibri,Arial,sans-serif;font-size:14px;color:#1f2937">
  <h2 style="color:#1D4D89;margin:0 0 12px">${esc(heading)}</h2>
  <table style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="padding:3px 12px 3px 0;color:#6b7280">${esc(k)}</td><td style="padding:3px 0"><b>${esc(v)}</b></td></tr>`).join("")}</table>
  ${appLink("Open EEST")}
  <p style="color:#9ca3af;font-size:12px;margin-top:18px">${esc(footer)}</p>
</div>`;
}

export async function sendMail(to: string[], subject: string, html: string): Promise<void> {
  const recipients = [...new Set(to.filter(Boolean).map((e) => e.toLowerCase()))];
  if (!isMailConfigured() || recipients.length === 0) return;
  try {
    await graph("POST", `/users/${encodeURIComponent(process.env.MAIL_SENDER!)}/sendMail`, {
      message: { subject, body: { contentType: "HTML", content: html }, toRecipients: recipients.map((address) => ({ emailAddress: { address } })) },
      saveToSentItems: false,
    });
  } catch (err) {
    console.error(`[alerts] Failed to send "${subject}" to ${recipients.join(", ")}:`, err);
  }
}

const adminEmails = () => teamDirectory().filter((m) => getRoleForEmail(m.email) === "admin").map((m) => m.email);
const dateText = (d: unknown) => (d ? new Date(String(d)).toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric" }) : "No due date");

async function taskWithProject(taskId: string) {
  return (await pool.query(`SELECT t.*, p.name AS project_name FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = $1`, [taskId])).rows[0];
}

// A task was created with, or reassigned to, someone: tell them.
export async function notifyTaskAssigned(taskId: string, assignedBy: string): Promise<void> {
  if (!isMailConfigured()) return;
  try {
    const t = await taskWithProject(taskId);
    const to = t && emailForTeamMember(t.assignee);
    if (!to) return;
    await sendMail([to], `Task assigned: ${t.title}`, layout("You've been assigned a task", [
      ["Task", t.title], ["Project", t.project_name], ["Priority", t.priority], ["Due", dateText(t.due_date)], ["Assigned by", assignedBy],
    ], "You're receiving this because a task was assigned to you in EEST."));
  } catch (err) {
    console.error(`[alerts] Task assignment alert failed for ${taskId}:`, err);
  }
}

// A client approved a quote or change order from the share link: tell the admins.
export async function notifyClientApproval(details: { projectName: string; what: string; signerName: string }): Promise<void> {
  if (!isMailConfigured()) return;
  await sendMail(adminEmails(), `Client approval: ${details.what} — ${details.projectName}`, layout("A client approved online", [
    ["Project", details.projectName], ["Approved", details.what], ["Signed by", details.signerName], ["When", new Date().toLocaleString("en-JM")],
  ], "Sent to E-Tech admins when a client approves through a project share link."));
}

// Emails each assignee once about each of their tasks that has become overdue.
export async function sendOverdueAlerts(): Promise<number> {
  if (!isMailConfigured()) return 0;
  let sent = 0;
  try {
    const overdue = await pool.query(
      `SELECT t.id, t.title, t.assignee, t.due_date, t.priority, p.name AS project_name FROM tasks t JOIN projects p ON p.id = t.project_id
       WHERE p.deleted_at IS NULL AND t.status <> 'complete' AND t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE AND t.overdue_notified_at IS NULL`
    );
    for (const t of overdue.rows) {
      const to = emailForTeamMember(t.assignee);
      if (to) {
        await sendMail([to], `Overdue task: ${t.title}`, layout("A task assigned to you is overdue", [
          ["Task", t.title], ["Project", t.project_name], ["Priority", t.priority], ["Was due", dateText(t.due_date)],
        ], "Sent once per overdue task by EEST's daily check."));
        sent++;
      }
      await pool.query(`UPDATE tasks SET overdue_notified_at = NOW() WHERE id = $1`, [t.id]);
    }
  } catch (err) {
    console.error("[alerts] Overdue task check failed:", err);
  }
  return sent;
}

// Daily overdue check: once shortly after start, then every 24 hours.
export function startOverdueChecks(): void {
  if (!isMailConfigured()) return;
  setTimeout(() => { void sendOverdueAlerts(); }, 60_000);
  setInterval(() => { void sendOverdueAlerts(); }, 24 * 60 * 60 * 1000);
}
