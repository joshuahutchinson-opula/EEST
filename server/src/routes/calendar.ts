import { Router, Request, Response } from "express";
import { requireAdmin } from "../lib/roles";
import { graph, GraphError, isGraphConfigured } from "../lib/graph";
import { teamDirectory } from "../lib/team";
import { CALENDAR_TIME_ZONE } from "../lib/calendarSync";

// The admin Calendar tab. Outlook is the source of truth: events are read live from each
// employee's calendar through Microsoft Graph and every create/edit/delete is written straight
// back, so changes made in Outlook show here and vice versa.
const router = Router();
router.use(requireAdmin);

const TZ_HEADER = { Prefer: `outlook.timezone="${CALENDAR_TIME_ZONE}"` };
const isMember = (email: string) => teamDirectory().some((m) => m.email === email.toLowerCase());

function sendGraphError(res: Response, err: unknown, fallback: string) {
  if (err instanceof GraphError) return res.status(err.status === 503 ? 503 : err.status === 404 ? 404 : 502).json({ error: err.message });
  console.error(fallback, err);
  res.status(500).json({ error: fallback });
}

function mapEvent(e: any, email: string) {
  return {
    id: e.id,
    email,
    subject: e.subject || "(no title)",
    start: e.start?.dateTime,
    end: e.end?.dateTime,
    isAllDay: !!e.isAllDay,
    location: e.location?.displayName || "",
    notes: e.bodyPreview || "",
    isTaskEvent: (e.categories || []).includes("EEST Task"),
    webLink: e.webLink,
  };
}

// Graph event body from the app's editor fields. start/end are local (Jamaica) "YYYY-MM-DDTHH:mm".
function eventBody(b: any) {
  const body: any = {};
  if (b.subject !== undefined) body.subject = String(b.subject);
  if (b.location !== undefined) body.location = { displayName: String(b.location) };
  if (b.notes !== undefined) body.body = { contentType: "text", content: String(b.notes) };
  if (b.isAllDay !== undefined) body.isAllDay = !!b.isAllDay;
  if (b.start) body.start = { dateTime: String(b.start), timeZone: CALENDAR_TIME_ZONE };
  if (b.end) body.end = { dateTime: String(b.end), timeZone: CALENDAR_TIME_ZONE };
  return body;
}

const validRange = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v);

router.get("/employees", (_req: Request, res: Response) => {
  res.json({ configured: isGraphConfigured(), employees: teamDirectory() });
});

// GET /api/calendar/events?start=YYYY-MM-DDTHH:mm&end=...&emails=a,b
router.get("/events", async (req: Request, res: Response) => {
  const { start, end } = req.query;
  if (!validRange(start) || !validRange(end)) return res.status(400).json({ error: "start and end are required (YYYY-MM-DDTHH:mm)" });
  const requested = String(req.query.emails || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const emails = requested.length ? requested.filter(isMember) : teamDirectory().map((m) => m.email);
  try {
    const results = await Promise.all(emails.map(async (email) => {
      try {
        const data = await graph<{ value: any[] }>(
          "GET",
          `/users/${encodeURIComponent(email)}/calendarView?startDateTime=${start}&endDateTime=${end}&$top=200&$orderby=start/dateTime&$select=id,subject,start,end,isAllDay,location,bodyPreview,categories,webLink`,
          undefined,
          TZ_HEADER
        );
        return { email, events: data.value.map((e) => mapEvent(e, email)) };
      } catch (err) {
        if (err instanceof GraphError && err.status === 503) throw err;
        return { email, events: [], error: err instanceof Error ? err.message : "Failed to load calendar" };
      }
    }));
    res.json(results);
  } catch (err) {
    sendGraphError(res, err, "Failed to load calendars");
  }
});

router.post("/events", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (typeof email !== "string" || !isMember(email)) return res.status(400).json({ error: "email must be a team member" });
  if (!req.body.subject || !validRange(req.body.start) || !validRange(req.body.end)) return res.status(400).json({ error: "subject, start and end are required" });
  try {
    const created = await graph("POST", `/users/${encodeURIComponent(email)}/events`, eventBody(req.body), TZ_HEADER);
    res.status(201).json(mapEvent(created, email.toLowerCase()));
  } catch (err) {
    sendGraphError(res, err, "Failed to create event");
  }
});

router.patch("/events/:email/:eventId", async (req: Request, res: Response) => {
  const { email, eventId } = req.params;
  if (!isMember(email)) return res.status(400).json({ error: "email must be a team member" });
  if ((req.body.start && !validRange(req.body.start)) || (req.body.end && !validRange(req.body.end))) return res.status(400).json({ error: "start/end must be YYYY-MM-DDTHH:mm" });
  try {
    const updated = await graph("PATCH", `/users/${encodeURIComponent(email)}/events/${encodeURIComponent(eventId)}`, eventBody(req.body), TZ_HEADER);
    res.json(mapEvent(updated, email.toLowerCase()));
  } catch (err) {
    sendGraphError(res, err, "Failed to update event");
  }
});

router.delete("/events/:email/:eventId", async (req: Request, res: Response) => {
  const { email, eventId } = req.params;
  if (!isMember(email)) return res.status(400).json({ error: "email must be a team member" });
  try {
    await graph("DELETE", `/users/${encodeURIComponent(email)}/events/${encodeURIComponent(eventId)}`);
    res.json({ success: true });
  } catch (err) {
    sendGraphError(res, err, "Failed to delete event");
  }
});

export default router;
