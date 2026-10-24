import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Building2, Camera, Layers, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
import { G } from "../../lib/constants";
import { isTechRole, useRole } from "../../lib/contexts";
import { projectStageBadge, stageBadge } from "../../lib/utils";
import { ProjectAssetSummary } from "./ProjectAssetSummary";
import type { Project } from "../../types";

// The Pipeline's Grid and List views (formerly the Projects page): every project in the current
// pipeline as cards with a live asset summary, or as a dense table. Clicking opens Project Detail.
export function ProjectBrowser({ projects, viewMode, onOpen, onDelete }: { projects: Project[]; viewMode: "grid" | "list"; onOpen: (id: string) => void; onDelete: (id: string) => void }) {
  const tech = isTechRole(useRole());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deletingProject = confirmDeleteId ? projects.find((p) => p.id === confirmDeleteId) : null;

  return (
    <>
      <ConfirmDialog open={!!deletingProject} title="Delete Project" message={`Are you sure you want to delete "${deletingProject?.name}"? This action cannot be undone.`} onConfirm={() => { onDelete(confirmDeleteId!); setConfirmDeleteId(null); }} onCancel={() => setConfirmDeleteId(null)} />
      {projects.length === 0 ? <EmptyState icon={Layers} title="No projects found" description="" /> : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          <AnimatePresence mode="popLayout">
            {projects.map((project) => {
              const isProjPipe = project.pipelineType === "project";
              const badge = isProjPipe ? projectStageBadge(project.projectStage || "planning") : stageBadge(project.stage);
              return (
                <motion.div data-tour="proj-card" key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="group rounded-2xl overflow-hidden cursor-pointer transition-all md:hover:-translate-y-1" style={{ ...G.card }} onClick={() => onOpen(project.id)}>
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
            <div className="grid gap-3 px-3 py-2.5" style={{ gridTemplateColumns: "2fr 1fr 80px 80px 100px 44px", minWidth: "640px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{["Project", "Client", "Cameras", "Devices", "Stage", ""].map((h) => (<span key={h} className="text-[#8b949e] text-[12px] font-extrabold uppercase tracking-widest">{h}</span>))}</div>
            {projects.map((project) => {
              const isProjPipe = project.pipelineType === "project";
              const badge = isProjPipe ? projectStageBadge(project.projectStage || "planning") : stageBadge(project.stage);
              return (
                <div key={project.id} className="group grid gap-3 px-3 py-3.5 items-center cursor-pointer hover:bg-white/[0.03]" style={{ gridTemplateColumns: "2fr 1fr 80px 80px 100px 44px", minWidth: "640px", borderBottom: "1px solid rgba(255,255,255,0.04)" }} onClick={() => onOpen(project.id)}>
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
    </>
  );
}
