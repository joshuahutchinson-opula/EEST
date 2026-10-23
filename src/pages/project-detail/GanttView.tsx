import { useEffect, useState } from "react";
import { GanttChartSquare } from "lucide-react";
import { API } from "../../api";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { G } from "../../lib/constants";
import type { Task } from "../../types";

export function GanttView({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { API.tasks.list(projectId).then(setTasks).catch(() => setTasks([])).finally(() => setLoading(false)); }, [projectId]);
  if (loading) return <Skeleton className="h-64 rounded-2xl" />;
  if (tasks.length === 0) return <EmptyState icon={GanttChartSquare} title="No tasks" description="Add tasks to see the timeline." />;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const today = new Date();
  const startDate = new Date(Math.min(...tasks.map(t => new Date(t.createdAt).getTime()), today.getTime() - 30*24*60*60*1000));
  const endDate = new Date(Math.max(...tasks.map(t => t.dueDate ? new Date(t.dueDate).getTime() : 0), today.getTime() + 60*24*60*60*1000));
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000*60*60*24));
  const getX = (dateStr: string) => { const d = new Date(dateStr); return ((d.getTime() - startDate.getTime()) / (1000*60*60*24) / totalDays) * 100; };
  return (
    <div className="rounded-2xl p-4 overflow-x-auto" style={G.card}>
      <div style={{ minWidth: "700px" }}>
        <div className="flex items-center mb-3"><GanttChartSquare className="w-4 h-4 text-blue-400 mr-2" /><span className="text-white text-[15px] font-extrabold">Project Timeline</span></div>
        <div className="flex" style={{ marginLeft: "200px" }}>{Array.from({ length: Math.ceil(totalDays/30) }).map((_, i) => { const d = new Date(startDate); d.setDate(d.getDate() + i*30); return <div key={i} className="text-[#8b949e] text-[11px] font-extrabold flex-1 text-center border-l border-white/5">{months[d.getMonth()]}</div>; })}</div>
        <div className="mt-3 space-y-2">{tasks.map(task => { const startPct = getX(task.createdAt); const duePct = task.dueDate ? getX(task.dueDate) : startPct + 15; const width = Math.max(duePct - startPct, 5); return (<div key={task.id} className="flex items-center gap-2"><div className="w-[200px] flex-shrink-0 text-white text-[13px] font-bold truncate">{task.title}</div><div className="flex-1 relative h-7"><div className="absolute rounded-full h-5 top-1" style={{ left: `${startPct}%`, width: `${width}%`, background: task.status === "complete" ? "rgba(16,185,129,0.4)" : task.status === "in-progress" ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.15)", border: `1px solid ${task.status === "complete" ? "rgba(16,185,129,0.6)" : task.status === "in-progress" ? "rgba(59,130,246,0.6)" : "rgba(255,255,255,0.2)"}` }}><span className="absolute inset-0 flex items-center px-2 text-[10px] font-extrabold text-white truncate">{task.assignee || ""}</span></div></div></div>); })}</div>
      </div>
    </div>
  );
}
