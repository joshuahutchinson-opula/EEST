import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { Building2, Camera, FileDown, Grid3x3, Layers, List, Search, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { API, downloadBlob } from "../../api";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { G } from "../../lib/constants";
import { isTechRole, useAutoTutorial, useRole } from "../../lib/contexts";
import { projectStageBadge, stageBadge } from "../../lib/utils";
import { ProjectAssetSummary } from "./ProjectAssetSummary";
import type { Page, Project, ProjectStage, Stage, TutorialStep } from "../../types";

export const PROJECTS_STEPS: TutorialStep[] = [
  { target: "proj-view-toggle", title: "Grid or List", description: "Switch between a visual card grid and a dense table view of every project." },
  { target: "proj-filters", title: "Filter & Search", description: "Filter by sales or project stage, or search by name, client, or location." },
  { target: "proj-card", title: "Project Cards", description: "Each card shows a live asset summary, current stage badge, client, camera count, and assignee. Hover to reveal the delete button, or click anywhere else on the card to open its full detail." },
];

export function ProjectsPage({ navigate }: { navigate: (p: Page) => void }) {
  const tech = isTechRole(useRole());
  useAutoTutorial("projects", PROJECTS_STEPS);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<"all" | Stage | ProjectStage>("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => { setLoading(true); try { const data = await API.projects.list(); setProjects(data); } catch { setProjects([]); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(null);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try { await API.projects.delete(id); toast.success("Project deleted"); } catch { toast.error("Failed to delete project"); fetchProjects(); }
  };

  const filtered = useMemo(() => {
    let result = projects;
    if (filter !== "all") result = result.filter((p) => p.stage === filter || p.projectStage === filter);
    if (search.trim()) { const q = search.toLowerCase(); result = result.filter((p) => p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)); }
    return result;
  }, [projects, filter, search]);

  const stageFilters: { id: "all" | Stage | ProjectStage; label: string }[] = [
    { id: "all", label: "All" },
    { id: "lead", label: "Lead" },
    { id: "opportunity", label: "Opportunity" },
    { id: "proposal", label: "Proposal" },
    { id: "win", label: "Won" },
    { id: "planning", label: "Planning" },
    { id: "installation", label: "Installation" },
  ];

  const openProject = (projectId: string) => {
    localStorage.setItem("active_project_id", projectId);
    navigate("project-detail");
  };

  if (loading) return <div className="px-3 md:px-5 py-4 md:py-6 space-y-4"><Skeleton className="h-10 w-56" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div></div>;

  const deletingProject = confirmDeleteId ? projects.find((p) => p.id === confirmDeleteId) : null;

  return (
    <div className="px-3 md:px-5 py-4 md:py-6">
      <ConfirmDialog open={!!deletingProject} title="Delete Project" message={`Are you sure you want to delete "${deletingProject?.name}"? This action cannot be undone.`} onConfirm={() => handleDelete(confirmDeleteId!)} onCancel={() => setConfirmDeleteId(null)} />
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div><h1 className="text-white font-extrabold text-2xl md:text-3xl tracking-tight">Projects</h1></div>
        <div className="flex items-center gap-2">
          {!tech && <button onClick={async () => { try { const { blob, filename } = await API.exports.quickbooks(); downloadBlob(blob, filename); toast.success("QuickBooks export downloaded"); } catch { toast.error("Failed to build the QuickBooks export"); } }} className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[#8b949e] hover:text-white text-[13px] font-bold cursor-pointer" style={G.btn} title="Approved quotes as a QuickBooks invoice-import CSV"><FileDown className="w-3.5 h-3.5" /> QuickBooks CSV</button>}
          <div data-tour="proj-view-toggle" className="flex items-center rounded-xl p-0.5 gap-0.5" style={G.btn}>
            {(["grid","list"] as const).map((m) => (
              <button key={m} onClick={() => setViewMode(m)} className={clsx("w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer", viewMode === m ? "text-white" : "text-[#8b949e]")} style={viewMode === m ? { background: "rgba(255,255,255,0.12)" } : undefined}>{m === "grid" ? <Grid3x3 className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}</button>
            ))}
          </div>
        </div>
      </div>
      <div data-tour="proj-filters" className="flex items-center gap-2 mb-4 md:mb-5 flex-wrap">
            {stageFilters.map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)} className={clsx("h-7 px-3 rounded-full text-[13px] md:text-[14px] font-bold cursor-pointer", filter === f.id ? "text-white" : "text-[#8b949e]")} style={filter === f.id ? { background: "#3b82f6", boxShadow: "0 2px 12px rgba(59,130,246,0.3)" } : G.subtle}>{f.label}</button>
            ))}
            <div className="relative ml-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-7 rounded-xl pl-7 pr-3 text-[13px] md:text-[14px] text-[#e6edf3] focus:outline-none w-36 md:w-44" style={G.input} /></div>
            <span className="text-[#8b949e] text-[13px] md:text-[14px] ml-1">{filtered.length} projects</span>
          </div>
          {filtered.length === 0 ? <EmptyState icon={Layers} title="No projects found" description="" /> : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((project) => {
                  const isProjPipe = project.pipelineType === "project";
                  const badge = isProjPipe ? projectStageBadge(project.projectStage || "planning") : stageBadge(project.stage);
                  return (
                    <motion.div data-tour="proj-card" key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="group rounded-2xl overflow-hidden cursor-pointer transition-all md:hover:-translate-y-1" style={{ ...G.card }} onClick={() => openProject(project.id)}>
                      <div className="relative h-[100px] md:h-[112px] bg-[#070c1a]"><ProjectAssetSummary projectId={project.id} /><div className={clsx("absolute top-2 right-2 text-[12px] font-extrabold px-2 py-0.5 rounded-full", badge.cls)}>{badge.label}</div>{!tech && <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(project.id); }} className="absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }} title="Delete project"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>}</div>
                      <div className="p-3 md:p-4"><h3 className="text-white text-[14px] md:text-[15px] font-bold leading-snug mb-1 line-clamp-1">{project.name}</h3><p className="text-[#8b949e] text-[12px] md:text-[13px] font-semibold mb-2 flex items-center gap-1"><Building2 className="w-3 h-3" /> {project.client}</p><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex items-center gap-1 text-[#8b949e] text-[12px]"><Camera className="w-3 h-3" />{project.cameras}</span></div><div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white" style={{ background: project.assignee.color }}>{project.assignee.initials}</div></div></div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={G.card}>
              <div className="overflow-x-auto">
                <div className="grid gap-3 px-3 py-2.5" style={{ gridTemplateColumns: "2fr 1fr 80px 80px 100px 44px", minWidth: "640px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{["Project","Client","Cameras","Devices","Stage",""].map((h) => (<span key={h} className="text-[#8b949e] text-[12px] font-extrabold uppercase tracking-widest">{h}</span>))}</div>
                {filtered.map((project) => {
                  const isProjPipe = project.pipelineType === "project";
                  const badge = isProjPipe ? projectStageBadge(project.projectStage || "planning") : stageBadge(project.stage);
                  return (
                    <div key={project.id} className="group grid gap-3 px-3 py-3.5 items-center cursor-pointer hover:bg-white/[0.03]" style={{ gridTemplateColumns: "2fr 1fr 80px 80px 100px 44px", minWidth: "640px", borderBottom: "1px solid rgba(255,255,255,0.04)" }} onClick={() => openProject(project.id)}>
                      <div><p className="text-white text-[14px] font-bold truncate">{project.name}</p><p className="text-[#8b949e] text-[12px] truncate">{project.location}</p></div>
                      <p className="text-[#8b949e] text-[13px] truncate">{project.client}</p>
                      <p className="text-[#8b949e] text-[13px]">{project.cameras}</p>
                      <p className="text-[#8b949e] text-[13px]">{project.devices}</p>
                      <span className={clsx("text-[12px] font-extrabold px-2 py-0.5 rounded-full w-fit", badge.cls)}>{badge.label}</span>
                      {!tech && <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(project.id); }} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg hover:bg-rose-500/10 flex items-center justify-center cursor-pointer transition-opacity" title="Delete project"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
    </div>
  );
}
