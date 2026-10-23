import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { API } from "../../api";
import { Skeleton } from "../../components/Skeleton";
import { G, PROJECT_COLUMNS } from "../../lib/constants";
import { isTechRole, useAutoTutorial, useRole } from "../../lib/contexts";
import { fmtDateFull } from "../../lib/utils";
import { daysUntil } from "./shared";
import type { CommissioningItem, Page, Project, Quote, Task, TutorialStep } from "../../types";

export const OPS_DASHBOARD_STEPS: TutorialStep[] = [
  { target: "ops-now", title: "Now", description: "Everything that needs a human today — overdue tasks and overdue subcontractor work, projects with no activity in a week, and commissioning items or proposals that have been sitting too long." },
  { target: "ops-pulse", title: "Pulse", description: "A health check on the Project pipeline — how projects are distributed across stages, average time spent per stage, and new vs. closed this week." },
  { target: "ops-next", title: "Next", description: "What's coming in the next 14 days — project due dates and upcoming task deadlines, across every active project." },
];

export const OPS_STALLED_DAYS = 7;

export const OPS_PENDING_DAYS = 5;

export const OPS_LOOKAHEAD_DAYS = 14;

export function daysSince(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  return (Date.now() - new Date(dateStr).getTime()) / (24 * 60 * 60 * 1000);
}

export function OpsDashboard({ navigate }: { navigate: (p: Page) => void }) {
  const tech = isTechRole(useRole());
  useAutoTutorial("ops-dashboard", OPS_DASHBOARD_STEPS);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [commissioning, setCommissioning] = useState<CommissioningItem[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    API.projects.list().then(async (allProjects) => {
      if (!alive) return;
      const projectPipeline = allProjects.filter((p) => p.pipelineType === "project");
      const [taskLists, commissioningLists, quoteList] = await Promise.all([
        Promise.all(projectPipeline.map((p) => API.tasks.list(p.id).catch(() => [] as Task[]))),
        Promise.all(projectPipeline.map((p) => API.commissioning.list(p.id).catch(() => [] as CommissioningItem[]))),
        API.quotes.list().catch(() => [] as Quote[]),
      ]);
      if (!alive) return;
      setProjects(allProjects);
      setTasks(taskLists.flat());
      setCommissioning(commissioningLists.flat());
      setQuotes(quoteList);
      setLoading(false);
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) return (<div className="px-3 md:px-5 py-4 md:py-6 space-y-4 max-w-[1400px] mx-auto w-full"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 rounded-2xl" /><div className="grid grid-cols-3 gap-3"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div><Skeleton className="h-40 rounded-2xl" /></div>);

  const projectPipeline = projects.filter((p) => p.pipelineType === "project");
  const openTasks = tasks.filter((t) => t.status !== "complete");
  const overdueTasks = openTasks.filter((t) => t.dueDate && daysUntil(t.dueDate) < 0);
  const overdueSubTasks = overdueTasks.filter((t) => t.subcontractorId);
  const stalledProjects = projectPipeline.filter((p) => p.projectStage !== "complete" && daysSince(p.updatedAt) >= OPS_STALLED_DAYS);
  const pendingCommissioning = commissioning.filter((c) => c.status === "pending" && daysSince(c.createdAt) >= OPS_PENDING_DAYS);
  const staleProposals = quotes.filter((q) => q.status === "draft" && daysSince(q.createdAt || q.date) >= OPS_PENDING_DAYS);

  const nowRows: { label: string; count: number; urgency: "high" | "medium" | "low" }[] = ([
    { label: "Overdue tasks", count: overdueTasks.length, urgency: "high" },
    { label: "Overdue subcontractor tasks", count: overdueSubTasks.length, urgency: "high" },
    { label: `Projects stalled ${OPS_STALLED_DAYS}+ days`, count: stalledProjects.length, urgency: "medium" },
    { label: `Commissioning pending ${OPS_PENDING_DAYS}+ days`, count: pendingCommissioning.length, urgency: "medium" },
    { label: `Proposals in draft ${OPS_PENDING_DAYS}+ days`, count: staleProposals.length, urgency: "low" },
  ] as const).filter((r) => r.count > 0);

  const stageCounts = PROJECT_COLUMNS.map((c) => ({ label: c.label, count: projectPipeline.filter((p) => p.projectStage === c.id).length })).filter((s) => s.count > 0);
  const avgTimeInStage = projectPipeline.length > 0
    ? Math.round(projectPipeline.reduce((sum, p) => {
        const history = p.stageHistory || [];
        const currentEntry = [...history].reverse().find((h) => h.stage === p.projectStage);
        return sum + daysSince(currentEntry?.date || p.createdAt);
      }, 0) / projectPipeline.length)
    : 0;
  const newThisWeek = projectPipeline.filter((p) => daysSince(p.createdAt) <= 7).length;
  const closedThisWeek = projectPipeline.filter((p) => {
    if (p.projectStage !== "complete") return false;
    const lastEntry = (p.stageHistory || [])[((p.stageHistory || []).length) - 1];
    return lastEntry?.stage === "complete" && daysSince(lastEntry.date) <= 7;
  }).length;

  const nextItems = [
    ...projectPipeline.filter((p) => p.dueDate && daysUntil(p.dueDate) >= 0 && daysUntil(p.dueDate) <= OPS_LOOKAHEAD_DAYS).map((p) => ({ label: p.name, sublabel: "Project due", date: p.dueDate })),
    ...openTasks.filter((t) => t.dueDate && daysUntil(t.dueDate) >= 0 && daysUntil(t.dueDate) <= OPS_LOOKAHEAD_DAYS).map((t) => ({ label: t.title, sublabel: "Task due", date: t.dueDate! })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const urgencyStyle = { high: { border: "#f43f5e", bg: "rgba(244,63,94,0.08)", badge: "bg-rose-500/20 text-rose-400" }, medium: { border: "#f59e0b", bg: "rgba(245,158,11,0.08)", badge: "bg-amber-500/20 text-amber-400" }, low: { border: "#8b949e", bg: "rgba(139,148,158,0.06)", badge: "bg-white/[0.08] text-[#8b949e]" } };

  return (
    <div className="px-3 md:px-5 py-4 md:py-6 max-w-[1400px] mx-auto w-full space-y-4 md:space-y-6">
      <div><h1 className="text-white font-extrabold text-2xl md:text-3xl tracking-tight">Dashboard</h1><p className="text-[#8b949e] text-[13px] mt-0.5">What needs attention right now, at a glance</p></div>

      <div data-tour="ops-now" className="rounded-2xl overflow-hidden" style={G.card}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <h3 className="text-white text-[15px] font-extrabold">Now</h3>
          {nowRows.length > 0 && <span className="text-[12px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400">{nowRows.reduce((s, r) => s + r.count, 0)} need attention</span>}
        </div>
        {nowRows.length === 0 ? (
          <div className="px-4 py-6 text-center"><CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" /><p className="text-[#8b949e] text-[13px]">Nothing urgent — everything's on track.</p></div>
        ) : (
          <div>
            {nowRows.map((row) => {
              const style = urgencyStyle[row.urgency];
              return (
                <div key={row.label} className="flex items-center justify-between px-4 py-3" style={{ borderLeft: `3px solid ${style.border}`, background: style.bg, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span className="text-white text-[13px] font-bold">{row.label}</span>
                  <span className={clsx("text-[12px] font-extrabold px-2 py-0.5 rounded-full", style.badge)}>{row.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!tech && (
        <div data-tour="ops-pulse">
          <h3 className="text-white text-[15px] font-extrabold mb-3">Pulse</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl p-4" style={G.card}>
              <p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-3">Stage Distribution</p>
              {stageCounts.length === 0 ? <p className="text-[#8b949e] text-[13px]">No active projects</p> : (
                <div className="space-y-1.5">{stageCounts.map((s) => (<div key={s.label} className="flex items-center justify-between"><span className="text-[#8b949e] text-[13px]">{s.label}</span><span className="text-white text-[13px] font-extrabold">{s.count}</span></div>))}</div>
              )}
            </div>
            <div className="rounded-2xl p-4 flex flex-col items-center justify-center text-center" style={G.card}>
              <p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-2">Avg Time in Stage</p>
              <p className="text-white text-[2rem] font-extrabold leading-none">{avgTimeInStage}<span className="text-[14px] text-[#8b949e] font-bold ml-1">days</span></p>
            </div>
            <div className="rounded-2xl p-4" style={G.card}>
              <p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-3">This Week</p>
              <div className="flex items-center justify-between"><span className="text-[#8b949e] text-[13px]">New</span><span className="text-emerald-400 text-[15px] font-extrabold">{newThisWeek}</span></div>
              <div className="flex items-center justify-between mt-1.5"><span className="text-[#8b949e] text-[13px]">Closed</span><span className="text-blue-400 text-[15px] font-extrabold">{closedThisWeek}</span></div>
            </div>
          </div>
        </div>
      )}

      <div data-tour="ops-next" className="rounded-2xl overflow-hidden" style={G.card}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}><h3 className="text-white text-[15px] font-extrabold">Next 14 Days</h3></div>
        {nextItems.length === 0 ? (
          <div className="px-4 py-6 text-center"><Calendar className="w-8 h-8 text-[#484f58] mx-auto mb-2" /><p className="text-[#8b949e] text-[13px]">Nothing due in the next {OPS_LOOKAHEAD_DAYS} days.</p></div>
        ) : (
          <div>{nextItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="min-w-0"><p className="text-white text-[13px] font-bold truncate">{item.label}</p><p className="text-[#8b949e] text-[11px]">{item.sublabel}</p></div>
              <span className="text-[#8b949e] text-[12px] flex-shrink-0">{fmtDateFull(item.date)}</span>
            </div>
          ))}</div>
        )}
      </div>

      <button onClick={() => navigate("pipeline")} className="text-[#8b949e] hover:text-white text-[13px] font-bold cursor-pointer flex items-center gap-1.5">View full Pipeline <ChevronRight className="w-3.5 h-3.5" /></button>
    </div>
  );
}
