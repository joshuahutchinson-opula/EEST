import { useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Building2, Calendar, Camera, Fingerprint, MoreHorizontal, StickyNote, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { LEAD_SOURCE_STYLES, SUPPORT_TYPE_LABELS } from "../../lib/constants";
import { isTechRole, useCurrency, useRole } from "../../lib/contexts";
import { fmtDate, projectStageBadge } from "../../lib/utils";
import type { Column, Project, ProjectColumn } from "../../types";

export function KanbanCard({ project, column, dragging, onDragStart, onDragEnd, onClick, onDelete, onMoveToProjects, liveValue }: { project: Project; column: Column | ProjectColumn; dragging: string | null; onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void; onDragEnd: () => void; onClick: () => void; onDelete: (id: string) => void; onMoveToProjects?: (id: string) => void; liveValue?: number | null; }) {
  const { fmt } = useCurrency();
  const tech = isTechRole(useRole());
  const isDragging = dragging === project.id;
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ls = project.leadSource ? LEAD_SOURCE_STYLES[project.leadSource] : null;
  const isProjectPipeline = project.pipelineType === "project";
  const isOverdue = project.dueDate ? new Date(project.dueDate) < new Date() && !["win","lose","complete"].includes(project.stage) && project.projectStage !== "complete" : false;
  const isDueSoon = project.dueDate && !isOverdue ? (new Date(project.dueDate).getTime() - new Date().getTime()) < 7 * 24 * 60 * 60 * 1000 && !["win","lose","complete"].includes(project.stage) && project.projectStage !== "complete" : false;
  const [showNotes, setShowNotes] = useState(false);
  const allCollaborators = project.collaborators || [];
  const psBadge = isProjectPipeline ? projectStageBadge(project.projectStage || "planning") : null;

  return (
    <>
      {confirmDelete && <ConfirmDialog open={confirmDelete} title="Delete Project" message={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`} onConfirm={() => { onDelete(project.id); setConfirmDelete(false); toast.success("Project deleted"); }} onCancel={() => setConfirmDelete(false)} />}
      <motion.div data-tour="db-kanban-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} draggable onDragStart={(e) => { e.stopPropagation(); onDragStart(e as unknown as React.DragEvent<HTMLDivElement>, project.id); }} onDragEnd={onDragEnd} onClick={onClick} className={clsx("group relative rounded-2xl cursor-pointer select-none transition-all duration-200", isDragging ? "opacity-25 scale-[0.96]" : "md:hover:-translate-y-1")} style={{ background: "rgba(255,255,255,0.055)", backdropFilter: "blur(24px)", border: isDragging ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,255,255,0.11)", borderLeft: `3px solid ${isProjectPipeline ? (psBadge?.color || "#3b82f6") : column.color}`, boxShadow: isDragging ? "none" : "0 2px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.09)" }}>
        <div className="p-3 md:p-4 md:pl-5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {isOverdue && <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" title="Overdue" />}
              {isDueSoon && !isOverdue && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" title="Due soon" />}
              <h3 className="text-white text-[14px] md:text-[15px] font-bold leading-snug break-words">{project.name}</h3>
            </div>
            <div className="relative flex-shrink-0">
              <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center mt-0.5 cursor-pointer min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"><MoreHorizontal className="w-3.5 h-3.5 text-[#8b949e]" /></button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                  <div className="absolute right-0 top-7 z-20 w-40 rounded-xl overflow-hidden py-1" style={{ background: "rgba(7,12,26,0.97)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 32px rgba(0,0,0,0.8)", backdropFilter: "blur(20px)" }}>
                    {!tech && <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-rose-400 text-[14px] font-bold hover:bg-rose-500/10 transition-colors text-left cursor-pointer min-h-[44px]"><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mb-1"><Building2 className="w-3 h-3 text-[#8b949e] flex-shrink-0" /><span className="text-[#8b949e] text-[12px] md:text-[13px] font-bold truncate">{project.client}</span></div>
          <div className="flex items-center flex-wrap gap-1.5 mb-2">
            {isProjectPipeline ? (
              <>
                {psBadge && <span className={clsx("text-[12px] font-extrabold px-1.5 py-0.5 rounded-full", psBadge.cls)}>{psBadge.label}</span>}
                {project.supportType && <span className="text-[12px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>{SUPPORT_TYPE_LABELS[project.supportType]}</span>}
              </>
            ) : (
              <>
                {ls && <span className="text-[12px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: ls.bg, color: ls.text }}>{project.leadSource}</span>}
                <span className={clsx("text-[10px] md:text-[11px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide", project.risk === "high" ? "bg-rose-500/20 text-rose-400" : project.risk === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400")}>{project.risk}</span>
              </>
            )}
          </div>
          {!isProjectPipeline && <div className="flex items-center gap-2 mb-2.5"><span className="text-white font-extrabold text-[16px] md:text-[17px] tracking-tight">{fmt(project.value, true)}</span></div>}
          {isProjectPipeline && liveValue != null && <div className="flex items-center gap-2 mb-2.5"><span className="text-white font-extrabold text-[16px] md:text-[17px] tracking-tight">{fmt(liveValue, true)}</span></div>}
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center gap-1 text-[#8b949e] text-[14px] md:text-[15px] font-semibold"><Camera className="w-3 h-3" />{project.cameras} cams</span>
            <span className="flex items-center gap-1 text-[#8b949e] text-[14px] md:text-[15px] font-semibold"><Fingerprint className="w-3 h-3" />{project.devices} devices</span>
          </div>
          {project.notes && (
            <div className="relative mb-2">
              <button onClick={(e) => { e.stopPropagation(); setShowNotes(!showNotes); }} className="text-[13px] text-[#8b949e] hover:text-[#e6edf3] font-extrabold cursor-pointer flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notes</button>
              {showNotes && <div className="absolute top-full left-0 mt-1 w-48 rounded-xl p-2 z-30 text-[13px] text-[#8b949e]" style={{ background: "rgba(7,12,26,0.97)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>{project.notes}</div>}
            </div>
          )}
          <div className="flex items-center justify-between pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0" style={{ background: project.assignee.color, boxShadow: `0 0 8px ${project.assignee.color}60` }}>{project.assignee.initials}</div>
              <span className="text-[#8b949e] text-[14px] md:text-[15px] font-bold truncate max-w-[60px]">{project.assignee.name}</span>
              {allCollaborators.length > 0 && (
                <div className="flex items-center -space-x-1.5 ml-0.5">
                  {allCollaborators.slice(0, 3).map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white ring-1 ring-black/30" style={{ background: c.color }} title={c.name}>{c.initials}</div>
                  ))}
                  {allCollaborators.length > 3 && <span className="text-[#8b949e] text-[10px] ml-1">+{allCollaborators.length - 3}</span>}
                </div>
              )}
            </div>
            <span className={clsx("flex items-center gap-1 text-[14px] md:text-[15px] font-bold", isOverdue ? "text-rose-400" : isDueSoon ? "text-amber-400" : "text-[#484f58]")}><Calendar className="w-3 h-3" />{fmtDate(project.dueDate)}</span>
          </div>
          {project.stage === "win" && !isProjectPipeline && onMoveToProjects && (
            <button onClick={(e) => { e.stopPropagation(); onMoveToProjects(project.id); }} className="mt-2 w-full h-7 rounded-lg text-[12px] font-extrabold text-white cursor-pointer" style={{ background: "#8b5cf6" }}>Move to Projects</button>
          )}
        </div>
      </motion.div>
    </>
  );
}
