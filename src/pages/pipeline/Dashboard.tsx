import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Activity, AlertTriangle, BarChart3, CheckCircle2, DollarSign, Layers, Plus, Star, TrendingUp, Wrench } from "lucide-react";
import { clsx } from "clsx";
import { API } from "../../api";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { G, PROJECT_COLUMNS } from "../../lib/constants";
import { isTechRole, useAutoTutorial, useCurrency, useRole } from "../../lib/contexts";
import { computeSynthesisTotal } from "../../lib/utils";
import { DealModal } from "./DealModal";
import { KanbanColumn } from "./KanbanColumn";
import { NewProjectModal } from "./NewProjectModal";
import { COLUMNS } from "./shared";
import type { Page, PipelineType, Project, ProjectStage, Quote, Stage, TutorialStep } from "../../types";

export const DASHBOARD_STEPS: TutorialStep[] = [
  { target: "db-stats", title: "Pipeline Stats", description: "Track pipeline value, win rate, deals in negotiation, and average deal size at a glance — these switch to project-health stats (active projects, in installation, overdue, tickets resolved) when you're viewing the Project pipeline." },
  { target: "db-pipeline-toggle", title: "Sales vs. Project Pipeline", description: "Toggle between the Sales pipeline (Lead through Won) and the Project pipeline (Planning through Complete) — two different boards sharing this one screen." },
  { target: "db-kanban-column", title: "Kanban Columns", description: "Each column is a stage. Drag any card from one column to another to move it through the pipeline — the move saves automatically and logs to the project's audit trail." },
  { target: "db-kanban-card", title: "Card Details", description: "Every card shows the client, value, risk, assignee, due date, and a quick-actions menu for deleting the deal or (once a sales deal is Won) moving it into the Project pipeline. Click a card to open its full detail." },
  { target: "db-new-project", title: "New Project", description: "Add a new lead or project directly from here." },
  { target: "nav-projects", title: "More Sections", description: "Head to Projects, Workbook, Installation, or Device Library from the nav bar to dig into a specific project." },
];

export function Dashboard({ navigate }: { navigate: (p: Page) => void }) {
  const { fmt } = useCurrency();
  const role = useRole();
  const tech = isTechRole(role);
  useAutoTutorial("pipeline", DASHBOARD_STEPS);
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Project | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [progressAnim, setProgressAnim] = useState<{ id: string; stage: string } | null>(null);
  const [pipelineType, setPipelineType] = useState<PipelineType>(() => (localStorage.getItem("pipeline_type") as PipelineType) || "sales");
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const scrollDragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null);
  const [scrollThumb, setScrollThumb] = useState({ widthPct: 100, leftPct: 0 });
  const [scrollThumbActive, setScrollThumbActive] = useState(false);

  useEffect(() => { localStorage.setItem("pipeline_type", pipelineType); }, [pipelineType]);
  useEffect(() => { if (tech) setPipelineType("project"); }, [tech]);

  const fetchProjects = useCallback(async () => { setLoading(true); try { const data = await API.projects.list(); setProjects(data); } catch { setProjects([]); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { API.quotes.list().then(setQuotes).catch(() => setQuotes([])); }, []);

  const salesProjects = projects.filter(p => !p.pipelineType || p.pipelineType === "sales");
  const projectProjects = projects.filter(p => p.pipelineType === "project");
  const currentProjects = pipelineType === "sales" ? salesProjects : projectProjects;
  // Project-pipeline items never have a manually-entered value — their card/column totals are
  // always the live Workbook Synthesis grand total (no per-project override lookup here, to
  // avoid an extra fetch per card; ProjectDetail's own stat card is override-aware).
  const projectValues = useMemo(() => {
    const map = new Map<string, number | null>();
    projectProjects.forEach((p) => map.set(p.id, computeSynthesisTotal(quotes.find((q) => q.projectId === p.id))));
    return map;
  }, [projectProjects, quotes]);

  const activeSales = salesProjects.filter((p) => !["win", "lose"].includes(p.stage));
  const pipeline = activeSales.reduce((s, p) => s + p.value, 0);
  const won = salesProjects.filter((p) => p.stage === "win");
  const closed = salesProjects.filter((p) => ["win", "lose"].includes(p.stage));
  const winRate = closed.length ? Math.round((won.length / closed.length) * 100) : 0;
  const negotiation = salesProjects.filter((p) => p.stage === "negotiation");
  const negoValue = negotiation.reduce((s, p) => s + p.value, 0);
  const avgDeal = activeSales.length ? Math.round(pipeline / activeSales.length) : 0;

  const activeProjects = projectProjects.filter(p => p.projectStage !== "complete").length;
  const inInstallation = projectProjects.filter(p => p.projectStage === "installation").length;
  const overdueProjects = projectProjects.filter(p => p.dueDate && new Date(p.dueDate) < new Date() && p.projectStage !== "complete").length;
  const ticketsResolved = projectProjects.filter(p => p.projectStage === "support" && p.stage === "win").length;

  const logAudit = async (projectId: string, event: string, details: string, change?: { field: string; oldValue: string; newValue: string }) => { try { await API.audit.log(projectId, event, details, change); } catch {} };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => { setDragging(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragEnd = () => { setDragging(null); setDragOverCol(null); };
  const handleDrop = async (colId: string) => {
    if (dragging) {
      const project = projects.find((p) => p.id === dragging);
      if (project) {
        const oldStage = pipelineType === "sales" ? project.stage : project.projectStage;
        if (oldStage !== colId && colId !== "lose") { setProgressAnim({ id: dragging, stage: colId }); setTimeout(() => setProgressAnim(null), 1500); }
        if (pipelineType === "sales") {
          const newStage = colId as Stage;
          const stageHistory = [...(project.stageHistory || []), { stage: newStage, date: new Date().toISOString().slice(0, 10) }];
          setProjects((prev) => prev.map((p) => p.id === dragging ? { ...p, stage: newStage, stageHistory } : p));
          try {
            await API.projects.update(dragging, { stage: newStage, stageHistory });
            await logAudit(dragging, "Stage Change", `Moved from ${oldStage} to ${newStage}`, { field: "stage", oldValue: String(oldStage), newValue: newStage });
            if (newStage === "win") { API.notifications.salesWin({ projectId: dragging, projectName: project.name, clientName: project.client }).catch(() => {}); }
          } catch {}
        } else {
          const newStage = colId as ProjectStage;
          const stageHistory = [...(project.stageHistory || []), { stage: newStage, date: new Date().toISOString().slice(0, 10) }];
          setProjects((prev) => prev.map((p) => p.id === dragging ? { ...p, projectStage: newStage, stageHistory } : p));
          try { await API.projects.update(dragging, { projectStage: newStage, stageHistory }); await logAudit(dragging, "Project Stage Change", `Moved from ${oldStage} to ${newStage}`, { field: "projectStage", oldValue: String(oldStage), newValue: newStage }); } catch {}
        }
      }
    }
    setDragging(null); setDragOverCol(null);
  };

  const handleMoveToProjects = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const stageHistory = [...(project.stageHistory || []), { stage: "planning" as ProjectStage, date: new Date().toISOString().slice(0, 10) }];
    const updated: Project = { ...project, pipelineType: "project", projectStage: "planning", leadSource: undefined, stageHistory, updatedAt: new Date().toISOString() };
    setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
    try {
      await API.projects.update(projectId, { pipelineType: "project", projectStage: "planning", leadSource: undefined, stageHistory });
      await API.audit.log(projectId, "Moved to Projects", "Moved from Sales Win to Projects Planning", { field: "pipelineType", oldValue: "sales", newValue: "project" });
      toast.success("Moved to Projects Pipeline");
    } catch { fetchProjects(); }
  };

  const handleDelete = async (id: string) => { setProjects((prev) => prev.filter((p) => p.id !== id)); try { await API.projects.delete(id); toast.success("Project deleted"); } catch { fetchProjects(); } };
  const handleUpdate = async (updated: Project) => { setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p)); setSelectedDeal(updated); try { await API.projects.update(updated.id, updated); toast.success("Updated"); } catch { fetchProjects(); } };

  const selectedColumn = selectedDeal ? [...COLUMNS, ...PROJECT_COLUMNS].find((c) => (pipelineType === "sales" ? c.id === selectedDeal.stage : c.id === selectedDeal.projectStage))! : null;
  const STAT_COLORS = ["#3b82f6", "#10b981", "#f97316", "#8b5cf6"];

  // Custom draggable scrollbar synced to the board's real horizontal scroll
  const updateScrollThumb = useCallback(() => {
    const el = boardScrollRef.current;
    if (!el) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    if (scrollWidth <= clientWidth) { setScrollThumb({ widthPct: 100, leftPct: 0 }); return; }
    const widthPct = Math.max((clientWidth / scrollWidth) * 100, 10);
    const maxLeftPct = 100 - widthPct;
    const leftPct = (scrollLeft / (scrollWidth - clientWidth)) * maxLeftPct;
    setScrollThumb({ widthPct, leftPct });
  }, []);
  useEffect(() => { updateScrollThumb(); }, [currentProjects.length, pipelineType, updateScrollThumb]);
  useEffect(() => {
    window.addEventListener("resize", updateScrollThumb);
    return () => window.removeEventListener("resize", updateScrollThumb);
  }, [updateScrollThumb]);
  const scrollToPct = (leftPct: number) => {
    const el = boardScrollRef.current;
    if (!el) return;
    const maxLeftPct = 100 - scrollThumb.widthPct;
    const clamped = Math.min(Math.max(leftPct, 0), maxLeftPct);
    el.scrollLeft = maxLeftPct > 0 ? (clamped / maxLeftPct) * (el.scrollWidth - el.clientWidth) : 0;
  };
  const handleThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const el = boardScrollRef.current;
    if (!el) return;
    scrollDragRef.current = { startX: e.clientX, startScrollLeft: el.scrollLeft };
    setScrollThumbActive(true);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const handleThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = scrollDragRef.current;
    const el = boardScrollRef.current;
    const track = scrollTrackRef.current;
    if (!drag || !el || !track) return;
    const trackWidth = track.clientWidth;
    const scrollableWidth = el.scrollWidth - el.clientWidth;
    const thumbWidthPx = (scrollThumb.widthPct / 100) * trackWidth;
    const draggableTrackPx = trackWidth - thumbWidthPx;
    if (draggableTrackPx <= 0) return;
    const deltaX = e.clientX - drag.startX;
    el.scrollLeft = drag.startScrollLeft + deltaX * (scrollableWidth / draggableTrackPx);
  };
  const handleThumbPointerUp = () => { scrollDragRef.current = null; setScrollThumbActive(false); };
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = scrollTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const clickPct = ((e.clientX - rect.left) / rect.width) * 100;
    scrollToPct(clickPct - scrollThumb.widthPct / 2);
  };

  if (loading) return (
    <div className="px-3 md:px-5 py-4 md:py-6 space-y-4">
      <Skeleton className="h-10 w-48" />
      <div className="flex gap-2 mb-4"><Skeleton className="h-8 w-32 rounded-full" /><Skeleton className="h-8 w-32 rounded-full" /></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      <div className="flex gap-2 md:gap-3 overflow-hidden">{[1,2,3,4,5,6,7].map(i => <Skeleton key={i} className="w-[272px] h-[400px] rounded-2xl flex-shrink-0" />)}</div>
    </div>
  );

  const columns = pipelineType === "sales" ? COLUMNS : PROJECT_COLUMNS;

  return (
    <div>
      {selectedDeal && selectedColumn && <DealModal project={selectedDeal} column={selectedColumn} onClose={() => setSelectedDeal(null)} navigate={navigate} onUpdate={handleUpdate} onDelete={handleDelete} pipelineType={pipelineType} liveValue={projectValues.get(selectedDeal.id)} />}
      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} onAdd={async (p) => { setProjects((prev) => [p, ...prev]); try { await API.projects.create(p); } catch { fetchProjects(); } }} pipelineType={pipelineType} />}
      {progressAnim && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[250] px-5 py-3 rounded-2xl flex items-center gap-3" style={{ background: "rgba(16,185,129,0.95)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(16,185,129,0.4)" }}>
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="text-white text-[15px] font-extrabold">Project advanced to {columns.find((c) => c.id === progressAnim.stage)?.label}</span>
        </motion.div>
      )}
      <div className="px-3 md:px-5 pt-4 md:pt-6 pb-4 md:pb-5 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-4 md:mb-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-white font-extrabold text-2xl md:text-3xl tracking-tight">{pipelineType === "sales" ? "Sales Pipeline" : "Project Pipeline"}</h1>
              {!tech && (
                <div data-tour="db-pipeline-toggle" className="flex items-center h-7 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <button onClick={() => setPipelineType("sales")} className={clsx("h-full px-3 text-[12px] font-extrabold cursor-pointer", pipelineType === "sales" ? "text-white" : "text-[#484f58]")} style={pipelineType === "sales" ? { background: "#3b82f6" } : undefined}>Sales</button>
                  <button onClick={() => setPipelineType("project")} className={clsx("h-full px-3 text-[12px] font-extrabold cursor-pointer", pipelineType === "project" ? "text-white" : "text-[#484f58]")} style={pipelineType === "project" ? { background: "#8b5cf6" } : undefined}>Projects</button>
                </div>
              )}
            </div>
            <p className="text-[#8b949e] text-[13px] md:text-[15px] mt-0.5">{currentProjects.length} projects</p>
          </div>
          <button data-tour="db-new-project" onClick={() => setShowNewProject(true)} className="flex items-center gap-1.5 h-8 px-3 md:px-4 rounded-xl text-white text-[13px] md:text-[14px] font-extrabold cursor-pointer min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}><Plus className="w-3.5 h-3.5" /> New Project</button>
        </div>
        {pipelineType === "sales" ? (
          <div data-tour="db-stats" className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {[{ label: "Active Pipeline", value: pipeline, icon: TrendingUp },{ label: "Win Rate", value: winRate, icon: Star, isPct: true },{ label: "In Negotiation", value: negoValue, icon: BarChart3 },{ label: "Avg Deal Size", value: avgDeal, icon: DollarSign }].map((stat, i) => (
              <div key={stat.label} className="rounded-2xl p-3 md:p-4" style={G.card}>
                <div className="flex items-center justify-between mb-2"><span className="text-[#8b949e] text-[12px] md:text-[14px] font-black uppercase tracking-[0.08em]">{stat.label}</span><div className="w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center" style={{ background: `${STAT_COLORS[i]}18` }}><stat.icon className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: STAT_COLORS[i] }} /></div></div>
                <p className="text-white text-[1.6rem] md:text-[2.2rem] font-black tracking-tight leading-none">{stat.isPct ? `${stat.value}%` : fmt(stat.value as number, true)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div data-tour="db-stats" className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {[{ label: "Active Projects", value: activeProjects, icon: Activity },{ label: "In Installation", value: inInstallation, icon: Wrench },{ label: "Overdue", value: overdueProjects, icon: AlertTriangle },{ label: "Tickets Resolved", value: ticketsResolved, icon: CheckCircle2 }].map((stat, i) => (
              <div key={stat.label} className="rounded-2xl p-3 md:p-4" style={G.card}>
                <div className="flex items-center justify-between mb-2"><span className="text-[#8b949e] text-[12px] md:text-[14px] font-black uppercase tracking-[0.08em]">{stat.label}</span><div className="w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center" style={{ background: `${STAT_COLORS[i]}18` }}><stat.icon className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: STAT_COLORS[i] }} /></div></div>
                <p className="text-white text-[1.6rem] md:text-[2.2rem] font-black tracking-tight leading-none">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {currentProjects.length === 0 ? (
        <EmptyState icon={Layers} title="No projects yet" description={`Create your first ${pipelineType === "sales" ? "sales" : "project"} pipeline item.`} action={{ label: "New Project", onClick: () => setShowNewProject(true) }} />
      ) : (
        <div className="px-3 md:px-5 py-4 md:py-5">
          {scrollThumb.widthPct < 100 && (
            <div ref={scrollTrackRef} onPointerDown={handleTrackPointerDown} className="relative h-2.5 mb-3 rounded-full" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div
                onPointerDown={handleThumbPointerDown}
                onPointerMove={handleThumbPointerMove}
                onPointerUp={handleThumbPointerUp}
                onPointerCancel={handleThumbPointerUp}
                className={clsx("absolute top-0 bottom-0 rounded-full transition-colors", scrollThumbActive ? "cursor-grabbing" : "cursor-grab")}
                style={{
                  width: `${scrollThumb.widthPct}%`,
                  left: `${scrollThumb.leftPct}%`,
                  background: scrollThumbActive ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.22)",
                  backdropFilter: "blur(12px) saturate(180%)",
                  border: "1px solid rgba(255,255,255,0.30)",
                  boxShadow: scrollThumbActive ? "0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.35)" : "inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              />
            </div>
          )}
          <div ref={boardScrollRef} onScroll={updateScrollThumb} className="overflow-x-auto" style={{ scrollbarWidth: "none", scrollBehavior: scrollThumbActive ? "auto" : "smooth" }}>
            <div className="flex gap-2 md:gap-3 min-w-max pb-3">
              {columns.map((col) => {
                const colProjects = currentProjects.filter((p) => pipelineType === "sales" ? p.stage === col.id : p.projectStage === col.id);
                const totalValue = pipelineType === "sales" ? colProjects.reduce((s, p) => s + p.value, 0) : colProjects.reduce((s, p) => s + (projectValues.get(p.id) || 0), 0);
                return <KanbanColumn key={col.id} column={col} projects={colProjects} totalValue={totalValue} dragging={dragging} isOver={dragOverCol === col.id} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }} onDragLeave={() => setDragOverCol(null)} onDrop={() => handleDrop(col.id)} onCardClick={(p) => setSelectedDeal(p)} onDelete={handleDelete} onMoveToProjects={handleMoveToProjects} projectValues={projectValues} />;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
