import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus, Trash2, X } from "lucide-react";
import { clsx } from "clsx";
import { API, ApiError } from "../../api";
import { G, TEAM } from "../../lib/constants";
import type { CalendarEvent, TeamMemberInfo } from "../../types";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function mondayOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

interface Draft { id?: string; email: string; subject: string; date: string; endDate: string; startTime: string; endTime: string; isAllDay: boolean; location: string; notes: string; readOnly: boolean }

// Admin-only master week view of every employee's Outlook calendar (via Microsoft Graph), with
// create/edit/delete written straight back to Outlook. Times are Jamaica local time.
export function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [employees, setEmployees] = useState<TeamMemberInfo[]>([]);
  const [configured, setConfigured] = useState(true);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [byEmail, setByEmail] = useState<Record<string, { events: CalendarEvent[]; error?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const visible = employees.filter((e) => !selected || selected.includes(e.email));

  useEffect(() => {
    API.calendar.employees().then((r) => { setEmployees(r.employees); setConfigured(r.configured); }).catch(() => setConfigured(false));
  }, []);

  const load = useCallback(async () => {
    if (!configured || employees.length === 0) { setLoading(false); return; }
    setLoading(true);
    try {
      const emails = (selected ?? employees.map((e) => e.email));
      const res = await API.calendar.events(`${isoDate(weekStart)}T00:00`, `${isoDate(addDays(weekStart, 7))}T00:00`, emails);
      setByEmail(Object.fromEntries(res.map((r) => [r.email, { events: r.events, error: r.error }])));
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) setConfigured(false);
      else toast.error("Failed to load calendars");
    } finally { setLoading(false); }
  }, [configured, employees, selected, weekStart]);
  useEffect(() => { load(); }, [load]);

  // Events touching a given day; all-day events end at midnight of the day after.
  const eventsOn = (email: string, day: Date) => {
    const d = isoDate(day);
    return (byEmail[email]?.events || []).filter((e) => {
      const s = e.start.slice(0, 10), en = e.end.slice(0, 10);
      return e.isAllDay ? s <= d && d < en : s === d || (s < d && d <= en && e.end.slice(11, 16) !== "00:00");
    });
  };

  const openNew = (email: string, day: Date) => setDraft({ email, subject: "", date: isoDate(day), endDate: isoDate(day), startTime: "09:00", endTime: "10:00", isAllDay: false, location: "", notes: "", readOnly: false });
  const openExisting = (e: CalendarEvent) => setDraft({
    id: e.id, email: e.email, subject: e.subject, date: e.start.slice(0, 10),
    endDate: e.isAllDay ? isoDate(addDays(new Date(`${e.end.slice(0, 10)}T00:00`), -1)) : e.end.slice(0, 10),
    startTime: e.start.slice(11, 16), endTime: e.end.slice(11, 16), isAllDay: e.isAllDay, location: e.location, notes: e.notes, readOnly: e.isTaskEvent,
  });

  const save = async () => {
    if (!draft || !draft.subject.trim()) return;
    const start = draft.isAllDay ? `${draft.date}T00:00` : `${draft.date}T${draft.startTime}`;
    const end = draft.isAllDay ? `${isoDate(addDays(new Date(`${draft.endDate || draft.date}T00:00`), 1))}T00:00` : `${draft.endDate || draft.date}T${draft.endTime}`;
    if (end <= start) { toast.error("The end must be after the start"); return; }
    setSaving(true);
    try {
      const body = { subject: draft.subject.trim(), start, end, isAllDay: draft.isAllDay, location: draft.location, notes: draft.notes };
      if (draft.id) await API.calendar.update(draft.email, draft.id, body);
      else await API.calendar.create({ ...body, email: draft.email });
      toast.success(draft.id ? "Event updated in Outlook" : "Event added to Outlook");
      setDraft(null);
      load();
    } catch { toast.error("Failed to save the event"); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!draft?.id) return;
    setSaving(true);
    try { await API.calendar.remove(draft.email, draft.id); toast.success("Event deleted from Outlook"); setDraft(null); load(); }
    catch { toast.error("Failed to delete the event"); }
    finally { setSaving(false); }
  };

  const colorFor = (email: string) => TEAM.find((t) => employees.find((e) => e.email === email)?.name === t.name)?.color || "#3b82f6";
  const today = isoDate(new Date());

  return (
    <div className="px-3 md:px-5 py-4 md:py-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-white font-extrabold text-2xl md:text-3xl tracking-tight">Calendar</h1>
          <p className="text-[#8b949e] text-[13px] mt-1">Everyone's Outlook calendar for the week. Changes here are saved to Outlook, and Outlook changes show here.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer" style={G.btn}><ChevronLeft className="w-4 h-4 text-[#8b949e]" /></button>
          <button onClick={() => setWeekStart(mondayOf(new Date()))} className="h-9 px-3 rounded-xl text-[13px] font-bold text-white cursor-pointer" style={G.btn}>This week</button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer" style={G.btn}><ChevronRight className="w-4 h-4 text-[#8b949e]" /></button>
          <span className="text-white text-[14px] font-extrabold ml-1">{weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {addDays(weekStart, 6).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      </div>

      {!configured ? (
        <div className="rounded-2xl p-6 text-center space-y-2" style={G.card}>
          <CalendarDays className="w-10 h-10 text-[#484f58] mx-auto" />
          <p className="text-white text-[15px] font-extrabold">Outlook calendars aren't connected yet</p>
          <p className="text-[#8b949e] text-[13px]">The server needs Microsoft Graph access: MS_TENANT_ID set to the tenant id, and the Calendars.ReadWrite application permission granted with admin consent on the app registration.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setSelected(null)} className={clsx("h-7 px-3 rounded-lg text-[12px] font-extrabold cursor-pointer", !selected ? "text-white" : "text-[#8b949e]")} style={!selected ? { background: "#475569" } : G.btn}>Everyone</button>
            {employees.map((e) => {
              const on = !!selected?.includes(e.email);
              return <button key={e.email} onClick={() => setSelected((prev) => { const cur = prev ?? []; const next = on ? cur.filter((x) => x !== e.email) : [...cur, e.email]; return next.length ? next : null; })} className={clsx("h-7 px-3 rounded-lg text-[12px] font-extrabold cursor-pointer", on ? "text-white" : "text-[#8b949e]")} style={on ? { background: colorFor(e.email) } : G.btn}>{e.name}</button>;
            })}
          </div>
          <div className="rounded-2xl overflow-x-auto" style={G.card}>
            <table className="w-full" style={{ minWidth: "980px", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                  <th className="w-[130px] px-3 py-2.5 text-left text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest">Person</th>
                  {days.map((d, i) => <th key={i} className={clsx("px-2 py-2.5 text-left text-[11px] font-extrabold uppercase tracking-widest", isoDate(d) === today ? "text-blue-400" : "text-[#8b949e]")}>{DAY_NAMES[i]} {d.getDate()}</th>)}
                </tr>
              </thead>
              <tbody>
                {visible.map((emp) => (
                  <tr key={emp.email} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="px-3 py-2 align-top">
                      <p className="text-white text-[13px] font-extrabold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: colorFor(emp.email) }} />{emp.name}</p>
                      {byEmail[emp.email]?.error && <p className="text-rose-400 text-[10px] mt-1" title={byEmail[emp.email]?.error}>Couldn't load calendar</p>}
                    </td>
                    {days.map((d, i) => (
                      <td key={i} className="group px-1.5 py-1.5 align-top" style={{ background: isoDate(d) === today ? "rgba(59,130,246,0.04)" : undefined }}>
                        <div className="space-y-1 min-h-[52px]">
                          {loading && !byEmail[emp.email] ? <Loader2 className="w-3 h-3 animate-spin text-[#484f58]" /> : eventsOn(emp.email, d).map((e) => (
                            <button key={e.id + isoDate(d)} onClick={() => openExisting(e)} className="w-full text-left rounded-md px-1.5 py-1 cursor-pointer" style={{ background: e.isTaskEvent ? "rgba(245,158,11,0.12)" : `${colorFor(emp.email)}22`, borderLeft: `2px solid ${e.isTaskEvent ? "#f59e0b" : colorFor(emp.email)}` }} title={e.subject}>
                              <span className="block text-[10px] text-[#8b949e]">{e.isAllDay ? "All day" : `${e.start.slice(11, 16)}–${e.end.slice(11, 16)}`}</span>
                              <span className="block text-[11px] text-white font-bold truncate">{e.subject}</span>
                            </button>
                          ))}
                          <button onClick={() => openNew(emp.email, d)} className="opacity-0 group-hover:opacity-100 w-full h-5 rounded flex items-center justify-center cursor-pointer hover:bg-white/[0.06]" title="Add event"><Plus className="w-3 h-3 text-[#8b949e]" /></button>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[#484f58] text-[11px]">Amber events come from project tasks (due date + assignee) and update when the task changes — edit the task rather than the event.</p>
        </>
      )}

      {draft && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={() => setDraft(null)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
          <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[460px] rounded-2xl p-6 space-y-3" style={G.liquidGlass}>
            <div className="flex items-center justify-between">
              <h3 className="text-white text-[16px] font-extrabold">{draft.id ? (draft.readOnly ? "Task event" : "Edit event") : "New event"} · {employees.find((e) => e.email === draft.email)?.name}</h3>
              <button onClick={() => setDraft(null)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer"><X className="w-4 h-4 text-[#8b949e]" /></button>
            </div>
            {draft.readOnly && <p className="text-amber-400 text-[12px]">This event is kept in sync with a project task. Change the task's due date or assignee instead.</p>}
            <input disabled={draft.readOnly} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="Title" className="w-full h-9 rounded-lg px-3 text-[13px] text-white" style={G.input} />
            <label className="flex items-center gap-2 text-[#8b949e] text-[13px]"><input disabled={draft.readOnly} type="checkbox" checked={draft.isAllDay} onChange={(e) => setDraft({ ...draft, isAllDay: e.target.checked })} /> All day</label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[#8b949e] text-[11px] font-bold">Start<input disabled={draft.readOnly} type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value, endDate: draft.endDate < e.target.value ? e.target.value : draft.endDate })} className="mt-1 w-full h-9 rounded-lg px-2 text-[13px] text-white" style={{ ...G.input, colorScheme: "dark" }} /></label>
              <label className="text-[#8b949e] text-[11px] font-bold">End<input disabled={draft.readOnly} type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} className="mt-1 w-full h-9 rounded-lg px-2 text-[13px] text-white" style={{ ...G.input, colorScheme: "dark" }} /></label>
              {!draft.isAllDay && <>
                <input disabled={draft.readOnly} type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} className="h-9 rounded-lg px-2 text-[13px] text-white" style={{ ...G.input, colorScheme: "dark" }} />
                <input disabled={draft.readOnly} type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} className="h-9 rounded-lg px-2 text-[13px] text-white" style={{ ...G.input, colorScheme: "dark" }} />
              </>}
            </div>
            <input disabled={draft.readOnly} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Location" className="w-full h-9 rounded-lg px-3 text-[13px] text-white" style={G.input} />
            <textarea disabled={draft.readOnly} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes" rows={3} className="w-full rounded-lg px-3 py-2 text-[13px] text-white resize-y" style={G.input} />
            {!draft.readOnly && (
              <div className="flex gap-2 pt-1">
                {draft.id && <button onClick={remove} disabled={saving} className="h-10 px-3 rounded-xl text-rose-400 cursor-pointer" style={{ background: "rgba(244,63,94,0.10)", border: "1px solid rgba(244,63,94,0.20)" }}><Trash2 className="w-4 h-4" /></button>}
                <button onClick={() => setDraft(null)} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
                <button onClick={save} disabled={saving || !draft.subject.trim()} className="flex-1 h-10 rounded-xl text-white text-[14px] font-extrabold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "#3b82f6" }}>{saving && <Loader2 className="w-4 h-4 animate-spin" />}Save to Outlook</button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
