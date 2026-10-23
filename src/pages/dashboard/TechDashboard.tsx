import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { API } from "../../api";
import { Skeleton } from "../../components/Skeleton";
import { G } from "../../lib/constants";
import { useSessionUser } from "../../lib/contexts";
import { fmtDateFull } from "../../lib/utils";
import { daysUntil } from "./shared";
import type { Page, Subcontractor, Task, TaskStatus } from "../../types";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = { "todo": "To Do", "in-progress": "In Progress", "review": "Review", "complete": "Complete" };

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = { "todo": "#8b949e", "in-progress": "#3b82f6", "review": "#f59e0b", "complete": "#10b981" };

export const TECH_TREND_DAYS = 7;

// A genuinely different dashboard for the Tech role — not OpsDashboard with data hidden. No
// company-wide project counts, no financial figures, no Pulse-style aggregate metrics: just
// what this specific signed-in person is on the hook for, across every project they're
// assigned to, plus a small personal workload picture.
export function TechDashboard({ navigate }: { navigate: (p: Page) => void }) {
  const { name: myName, email: myEmail } = useSessionUser();
  const [loading, setLoading] = useState(true);
  const [myTasks, setMyTasks] = useState<(Task & { projectName: string })[]>([]);
  const [mySubTasks, setMySubTasks] = useState<(Task & { projectName: string })[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const allProjects = await API.projects.list();
        const projectPipeline = allProjects.filter((p) => p.pipelineType === "project");
        const projectName = new Map(projectPipeline.map((p) => [p.id, p.name]));

        const taskLists = await Promise.all(projectPipeline.map((p) => API.tasks.list(p.id).catch(() => [] as Task[])));
        const allTasks = taskLists.flat();
        if (!alive) return;
        setMyTasks(allTasks.filter((t) => t.assignee === myName).map((t) => ({ ...t, projectName: projectName.get(t.projectId) || "—" })));

        // A Tech's own subcontractor-assigned tasks, if their signed-in email happens to match
        // a Subcontractor record's email on any of these projects — there's no other link
        // between a Tech's account and a Subcontractor entity in the data model.
        if (myEmail) {
          const subLists = await Promise.all(projectPipeline.map((p) => API.subcontractors.list(p.id).catch(() => [] as Subcontractor[])));
          const matchedSubIds = new Set(subLists.flat().filter((s) => s.email && s.email.toLowerCase() === myEmail.toLowerCase()).map((s) => s.id));
          if (alive && matchedSubIds.size > 0) {
            setMySubTasks(allTasks.filter((t) => t.subcontractorId && matchedSubIds.has(t.subcontractorId)).map((t) => ({ ...t, projectName: projectName.get(t.projectId) || "—" })));
          }
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [myName, myEmail]);

  if (loading) return (<div className="px-3 md:px-5 py-4 md:py-6 space-y-4 max-w-[1400px] mx-auto w-full"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 rounded-2xl" /><div className="grid grid-cols-3 gap-3"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div></div>);

  const sortedTasks = [...myTasks].sort((a, b) => {
    if ((a.status === "complete") !== (b.status === "complete")) return a.status === "complete" ? 1 : -1;
    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return aDue - bDue;
  });
  const openTasks = myTasks.filter((t) => t.status !== "complete");
  const overdueCount = openTasks.filter((t) => t.dueDate && daysUntil(t.dueDate) < 0).length;
  const statusCounts = (["todo", "in-progress", "review", "complete"] as TaskStatus[]).map((s) => ({ status: s, count: myTasks.filter((t) => t.status === s).length }));

  const trendDays = Array.from({ length: TECH_TREND_DAYS }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (TECH_TREND_DAYS - 1 - i));
    const dateStr = d.toDateString();
    const count = myTasks.filter((t) => t.status === "complete" && new Date(t.updatedAt).toDateString() === dateStr).length;
    return { label: d.toLocaleDateString("en-US", { weekday: "short" }), count };
  });
  const trendMax = Math.max(1, ...trendDays.map((d) => d.count));

  const renderTaskRow = (task: Task & { projectName: string }) => {
    const overdue = task.status !== "complete" && task.dueDate && daysUntil(task.dueDate) < 0;
    return (
      <div key={task.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${TASK_STATUS_COLORS[task.status]}20`, color: TASK_STATUS_COLORS[task.status] }}>{TASK_STATUS_LABELS[task.status]}</span>
            <p className="text-white text-[13px] font-bold truncate">{task.title}</p>
          </div>
          <p className="text-[#8b949e] text-[11px] mt-0.5">{task.projectName}</p>
        </div>
        {task.dueDate && <span className={clsx("text-[12px] flex-shrink-0 ml-2", overdue ? "text-rose-400 font-extrabold" : "text-[#8b949e]")}>{fmtDateFull(task.dueDate)}</span>}
      </div>
    );
  };

  return (
    <div className="px-3 md:px-5 py-4 md:py-6 max-w-[1400px] mx-auto w-full space-y-4 md:space-y-6">
      <div><h1 className="text-white font-extrabold text-2xl md:text-3xl tracking-tight">My Dashboard</h1><p className="text-[#8b949e] text-[13px] mt-0.5">{myName ? `Welcome back, ${myName}` : "Your assigned work, at a glance"}</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {[
          { label: "Open Tasks", value: openTasks.length, color: "#3b82f6" },
          { label: "Overdue", value: overdueCount, color: "#f43f5e" },
          { label: "In Progress", value: myTasks.filter((t) => t.status === "in-progress").length, color: "#f59e0b" },
          { label: "Completed", value: myTasks.filter((t) => t.status === "complete").length, color: "#10b981" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-3 md:p-4" style={G.card}>
            <p className="text-[#8b949e] text-[11px] md:text-[12px] font-extrabold uppercase tracking-widest mb-2">{s.label}</p>
            <p className="text-2xl md:text-3xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={G.card}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}><h3 className="text-white text-[15px] font-extrabold">My Tasks</h3></div>
        {sortedTasks.length === 0 ? (
          <div className="px-4 py-6 text-center"><CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" /><p className="text-[#8b949e] text-[13px]">No tasks assigned to you right now.</p></div>
        ) : sortedTasks.map(renderTaskRow)}
      </div>

      {mySubTasks.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={G.card}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}><h3 className="text-white text-[15px] font-extrabold">My Subcontractor Assignments</h3></div>
          {mySubTasks.map(renderTaskRow)}
        </div>
      )}

      <div>
        <h3 className="text-white text-[15px] font-extrabold mb-3">My Workload</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-2xl p-4" style={G.card}>
            <p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-3">By Status</p>
            <div className="space-y-1.5">{statusCounts.map((s) => (<div key={s.status} className="flex items-center justify-between"><span className="text-[#8b949e] text-[13px]">{TASK_STATUS_LABELS[s.status]}</span><span className="text-white text-[13px] font-extrabold">{s.count}</span></div>))}</div>
          </div>
          <div className="rounded-2xl p-4" style={G.card}>
            <p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-3">Completed, Last {TECH_TREND_DAYS} Days</p>
            <div className="flex items-end justify-between gap-1.5" style={{ height: "64px" }}>
              {trendDays.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                  <div className="w-full rounded-t" style={{ height: `${Math.max((d.count / trendMax) * 100, d.count > 0 ? 8 : 2)}%`, background: d.count > 0 ? "#10b981" : "rgba(255,255,255,0.08)" }} />
                  <span className="text-[#484f58] text-[10px] font-bold">{d.label[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
