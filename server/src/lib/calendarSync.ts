import pool from "../db";
import { graph, GraphError, isGraphConfigured } from "./graph";
import { emailForTeamMember } from "./team";

// Jamaica (UTC-5, no daylight saving), as a Windows time zone name, which Graph always accepts.
export const CALENDAR_TIME_ZONE = "SA Pacific Standard Time";

const appBaseUrl = () => process.env.APP_BASE_URL || "";

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function taskEventBody(t: any) {
  const date = new Date(t.due_date).toISOString().slice(0, 10);
  const done = t.status === "complete";
  return {
    subject: `${done ? "Done: " : "Task due: "}${t.title} (${t.project_name})`,
    isAllDay: true,
    start: { dateTime: `${date}T00:00:00`, timeZone: CALENDAR_TIME_ZONE },
    end: { dateTime: `${nextDay(date)}T00:00:00`, timeZone: CALENDAR_TIME_ZONE },
    showAs: "free",
    categories: ["EEST Task"],
    body: { contentType: "text", content: `${t.description || ""}\n\nProject: ${t.project_name}\nPriority: ${t.priority}\nStatus: ${t.status}${appBaseUrl() ? `\n${appBaseUrl()}` : ""}`.trim() },
  };
}

// Keeps a task's Outlook event in step with the task: created on the assignee's calendar when
// it has a due date and an assignee, updated when it changes, moved when the assignee changes,
// removed when either is cleared. Best effort — failures are logged, never thrown at callers.
export async function syncTaskToCalendar(taskId: string): Promise<void> {
  if (!isGraphConfigured()) return;
  try {
    const task = (await pool.query(`SELECT t.*, p.name AS project_name FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = $1`, [taskId])).rows[0];
    const link = (await pool.query(`SELECT user_email, event_id FROM task_calendar_events WHERE task_id = $1`, [taskId])).rows[0];
    const email = task && task.due_date ? emailForTeamMember(task.assignee) : null;

    if (link && link.user_email !== email) {
      await graph("DELETE", `/users/${encodeURIComponent(link.user_email)}/events/${link.event_id}`).catch((err) => { if (!(err instanceof GraphError && err.status === 404)) throw err; });
      await pool.query(`DELETE FROM task_calendar_events WHERE task_id = $1`, [taskId]);
    }
    if (!email) return;

    if (link && link.user_email === email) {
      try {
        await graph("PATCH", `/users/${encodeURIComponent(email)}/events/${link.event_id}`, taskEventBody(task));
        await pool.query(`UPDATE task_calendar_events SET synced_at = NOW() WHERE task_id = $1`, [taskId]);
        return;
      } catch (err) {
        if (!(err instanceof GraphError && err.status === 404)) throw err;
        // Deleted in Outlook — fall through and recreate it.
      }
    }
    const created = await graph<{ id: string }>("POST", `/users/${encodeURIComponent(email)}/events`, taskEventBody(task));
    await pool.query(
      `INSERT INTO task_calendar_events (task_id, user_email, event_id, synced_at) VALUES ($1, $2, $3, NOW())
       ON CONFLICT (task_id) DO UPDATE SET user_email = EXCLUDED.user_email, event_id = EXCLUDED.event_id, synced_at = NOW()`,
      [taskId, email, created.id]
    );
  } catch (err) {
    console.error(`[calendar] Failed to sync task ${taskId}:`, err);
  }
}

// Call before deleting a task (its link row cascades away with it).
export async function removeTaskFromCalendar(taskId: string): Promise<void> {
  if (!isGraphConfigured()) return;
  try {
    const link = (await pool.query(`SELECT user_email, event_id FROM task_calendar_events WHERE task_id = $1`, [taskId])).rows[0];
    if (!link) return;
    await graph("DELETE", `/users/${encodeURIComponent(link.user_email)}/events/${link.event_id}`).catch((err) => { if (!(err instanceof GraphError && err.status === 404)) throw err; });
    await pool.query(`DELETE FROM task_calendar_events WHERE task_id = $1`, [taskId]);
  } catch (err) {
    console.error(`[calendar] Failed to remove task ${taskId} from calendar:`, err);
  }
}
