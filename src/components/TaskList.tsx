import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Plus, Trash2, Users } from "lucide-react";
import { clsx } from "clsx";
import { API } from "../api";
import { ConfirmDialog } from "./ConfirmDialog";
import { Skeleton } from "./Skeleton";
import { G, TEAM, TEAM_ALPHABETICAL } from "../lib/constants";
import type { Subcontractor, Task, TaskPriority, TaskStatus } from "../types";

export function TaskList({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newSubcontractorId, setNewSubcontractorId] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueTime, setNewDueTime] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchTasks = useCallback(async () => { setLoading(true); try { const data = await API.tasks.list(projectId); setTasks(data); } catch { setTasks([]); } finally { setLoading(false); } }, [projectId]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { API.subcontractors.list(projectId).then(setSubcontractors).catch(() => setSubcontractors([])); }, [projectId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "t" || e.key === "T") { if (!(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLSelectElement)) { setShowNew(prev => !prev); } } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const dueDate = newDueDate ? `${newDueDate}${newDueTime ? "T" + newDueTime : ""}` : undefined;
      const created = await API.tasks.create(projectId, { title: newTitle.trim(), description: newDescription.trim() || undefined, assignee: newAssignee || undefined, subcontractorId: newSubcontractorId || undefined, priority: newPriority, dueDate, status: "todo" });
      setTasks(prev => [created, ...prev]);
      setNewTitle(""); setNewDescription(""); setNewAssignee(""); setNewSubcontractorId(""); setNewPriority("medium"); setNewDueDate(""); setNewDueTime(""); setShowNew(false);
      toast.success("Task added");
    } catch { toast.error("Failed to create task"); }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => { setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t)); try { await API.tasks.update(projectId, taskId, { status }); } catch { fetchTasks(); } };

  const handleDelete = async (taskId: string) => { setTasks(prev => prev.filter(t => t.id !== taskId)); try { await API.tasks.delete(projectId, taskId); toast.success("Task deleted"); } catch { fetchTasks(); } setConfirmDelete(null); };

  const handleEditSave = async () => {
    if (!editingTask || !editingTask.title.trim()) return;
    setTasks(prev => prev.map(t => t.id === editingTask.id ? editingTask : t));
    try { await API.tasks.update(projectId, editingTask.id, editingTask); toast.success("Task updated"); } catch { fetchTasks(); }
    setEditingTask(null);
  };

  const filteredTasks = statusFilter === "all" ? tasks : tasks.filter(t => t.status === statusFilter);
  const priorityColors: Record<TaskPriority, string> = { low: "#94a3b8", medium: "#fbbf24", high: "#f87171" };

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <div className="space-y-3">
      {confirmDelete && <ConfirmDialog open={true} title="Delete Task" message="Are you sure you want to delete this task?" onConfirm={() => handleDelete(confirmDelete)} onCancel={() => setConfirmDelete(null)} />}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          {(["all","todo","in-progress","review","complete"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={clsx("h-7 px-2.5 rounded-lg text-[12px] font-bold cursor-pointer", statusFilter === s ? "text-white" : "text-[#484f58]")} style={statusFilter === s ? { background: "rgba(255,255,255,0.10)" } : G.btn}>{s === "all" ? "All" : s === "in-progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
        <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[12px] font-bold text-white cursor-pointer" style={{ background: "#3b82f6" }}><Plus className="w-3 h-3" /> Add Task <span className="text-[10px] text-blue-200 ml-1">(T)</span></button>
      </div>
      {showNew && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-xl p-3 space-y-2" style={G.card}>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task title..." className="w-full h-8 rounded-lg px-2.5 text-[13px] text-[#e6edf3] focus:outline-none" style={G.input} />
          <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full rounded-lg px-2.5 py-2 text-[13px] text-[#e6edf3] focus:outline-none resize-none" style={G.input} />
          <div className="flex gap-2 flex-wrap">
            <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} className="h-7 rounded-lg px-2 text-[12px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>
              <option value="">Assignee</option>
              {TEAM_ALPHABETICAL.map(t => <option key={t.name} value={t.name} style={{ background: "#0d1117", color: "#e6edf3" }}>● {t.name}</option>)}
            </select>
            <select value={newSubcontractorId} onChange={(e) => setNewSubcontractorId(e.target.value)} className="h-7 rounded-lg px-2 text-[12px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>
              <option value="">Subcontractor</option>
              {subcontractors.map(s => <option key={s.id} value={s.id} style={{ background: "#0d1117", color: "#e6edf3" }}>{s.name}{s.trade ? ` (${s.trade})` : ""}</option>)}
            </select>
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as TaskPriority)} className="h-7 rounded-lg px-2 text-[12px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>
              <option value="low" style={{ background: "#0d1117", color: "#94a3b8" }}>● Low</option>
              <option value="medium" style={{ background: "#0d1117", color: "#fbbf24" }}>● Medium</option>
              <option value="high" style={{ background: "#0d1117", color: "#f87171" }}>● High</option>
            </select>
            <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="h-7 rounded-lg px-2 text-[12px]" style={{ ...G.input, colorScheme: "dark", background: "#0d1117", color: "#e6edf3" }} />
            <input type="time" value={newDueTime} onChange={(e) => setNewDueTime(e.target.value)} className="h-7 rounded-lg px-2 text-[12px]" style={{ ...G.input, colorScheme: "dark", background: "#0d1117", color: "#e6edf3" }} />
            <button onClick={handleCreate} className="h-7 px-3 rounded-lg text-[12px] font-extrabold text-white cursor-pointer" style={{ background: "#10b981" }}>Save</button>
          </div>
        </motion.div>
      )}
      {editingTask && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-xl p-3 space-y-2" style={{ ...G.card, border: "1px solid rgba(59,130,246,0.35)" }}>
          <input value={editingTask.title} onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })} className="w-full h-8 rounded-lg px-2.5 text-[13px] text-[#e6edf3]" style={G.input} />
          <textarea value={editingTask.description || ""} onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })} rows={2} className="w-full rounded-lg px-2.5 py-2 text-[13px] text-[#e6edf3] resize-none" style={G.input} />
          <div className="flex gap-2 flex-wrap">
            <select value={editingTask.assignee || ""} onChange={(e) => setEditingTask({ ...editingTask, assignee: e.target.value })} className="h-7 rounded-lg px-2 text-[12px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>
              <option value="">Assignee</option>
              {TEAM_ALPHABETICAL.map(t => <option key={t.name} value={t.name} style={{ background: "#0d1117", color: "#e6edf3" }}>{t.name}</option>)}
            </select>
            <select value={editingTask.subcontractorId || ""} onChange={(e) => setEditingTask({ ...editingTask, subcontractorId: e.target.value || undefined })} className="h-7 rounded-lg px-2 text-[12px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>
              <option value="">Subcontractor</option>
              {subcontractors.map(s => <option key={s.id} value={s.id} style={{ background: "#0d1117", color: "#e6edf3" }}>{s.name}{s.trade ? ` (${s.trade})` : ""}</option>)}
            </select>
            <select value={editingTask.priority} onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })} className="h-7 rounded-lg px-2 text-[12px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
            <input type="date" value={editingTask.dueDate?.split("T")[0] || ""} onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })} className="h-7 rounded-lg px-2 text-[12px]" style={{ ...G.input, colorScheme: "dark", background: "#0d1117", color: "#e6edf3" }} />
            <button onClick={handleEditSave} className="h-7 px-3 rounded-lg text-[12px] font-extrabold text-white cursor-pointer" style={{ background: "#10b981" }}>Update</button>
            <button onClick={() => setEditingTask(null)} className="h-7 px-3 rounded-lg text-[12px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
          </div>
        </motion.div>
      )}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-6"><p className="text-[#8b949e] text-[13px]">{statusFilter === "all" ? "No tasks yet" : `No ${statusFilter} tasks`}</p></div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map(task => {
              const assignee = TEAM.find(t => t.name === task.assignee);
              const subcontractor = subcontractors.find(s => s.id === task.subcontractorId);
              return (
                <motion.div key={task.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} onClick={() => setEditingTask(task)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl group hover:bg-white/[0.03] cursor-pointer" style={G.subtle}>
                  <button onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, task.status === "complete" ? "todo" : task.status === "todo" ? "in-progress" : task.status === "in-progress" ? "review" : "complete"); }} className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer", task.status === "complete" ? "bg-emerald-500 border-emerald-500" : "border-[#484f58] hover:border-white/50")}>{task.status === "complete" && <CheckCircle2 className="w-3 h-3 text-white" />}</button>
                  <div className="flex-1 min-w-0">
                    <p className={clsx("text-[13px] font-bold", task.status === "complete" ? "text-[#484f58] line-through" : "text-white")}>{task.title}</p>
                    {task.description && <p className="text-[#8b949e] text-[12px] mt-0.5 truncate">{task.description}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {assignee && <span className="text-[#8b949e] text-[12px] flex items-center gap-1"><div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white" style={{ background: assignee.color }}>{assignee.initials}</div><span className="text-[#e6edf3]">{assignee.name}</span></span>}
                      {subcontractor && <span className="text-[12px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}><Users className="w-2.5 h-2.5" /> {subcontractor.name}</span>}
                      <span className="text-[12px] font-extrabold" style={{ color: priorityColors[task.priority] }}>{task.priority}</span>
                      {task.dueDate && <span className="text-[#8b949e] text-[12px]">{new Date(task.dueDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(task.id); }} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-rose-500/10 flex items-center justify-center cursor-pointer"><Trash2 className="w-3 h-3 text-rose-400" /></button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
