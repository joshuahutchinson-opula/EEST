import { AnimatePresence } from "motion/react";
import { PROJECT_COLUMNS } from "../../lib/constants";
import { useCurrency } from "../../lib/contexts";
import { KanbanCard } from "./KanbanCard";
import type { Column, Project, ProjectColumn } from "../../types";

export function KanbanColumn({ column, projects, totalValue, dragging, isOver, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onCardClick, onQuickView, onDelete, onMoveToProjects, projectValues }: { column: Column | ProjectColumn; projects: Project[]; totalValue: number; dragging: string | null; isOver: boolean; onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void; onDragEnd: () => void; onDragOver: (e: React.DragEvent<HTMLDivElement>) => void; onDragLeave: () => void; onDrop: () => void; onCardClick: (p: Project) => void; onQuickView: (p: Project) => void; onDelete: (id: string) => void; onMoveToProjects?: (id: string) => void; projectValues?: Map<string, number | null>; }) {
  const { fmt } = useCurrency();
  const isProjectColumn = PROJECT_COLUMNS.some(c => c.id === column.id);
  return (
    <div data-tour="db-kanban-column" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} className="w-[260px] md:w-[272px] flex-shrink-0 flex flex-col rounded-2xl transition-all duration-200" style={isOver ? { background: "rgba(59,130,246,0.08)", backdropFilter: "blur(24px)", border: "1px solid rgba(59,130,246,0.35)" } : { background: "rgba(255,255,255,0.032)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 2px 20px rgba(0,0,0,0.3)" }}>
      <div className="px-3.5 pt-3.5 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: column.color, boxShadow: `0 0 10px ${column.color}88` }} />
            <span className="text-white text-[13px] md:text-[14px] font-extrabold truncate leading-tight">{column.label}</span>
          </div>
          <span className="text-[#8b949e] text-[13px] md:text-[14px] px-1.5 py-0.5 rounded-full font-extrabold" style={{ background: "rgba(255,255,255,0.08)" }}>{projects.length}</span>
        </div>
        {(!isProjectColumn || totalValue > 0) && <p className="text-[#484f58] text-[14px] md:text-[15px] font-extrabold ml-4">{fmt(totalValue, true)}</p>}
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ scrollbarWidth: "none", scrollBehavior: "smooth", WebkitOverflowScrolling: "touch", minHeight: "120px", maxHeight: "calc(100vh - 250px)" }}>
        <AnimatePresence mode="popLayout">
          {projects.map((p) => (
            <KanbanCard key={p.id} project={p} column={column} dragging={dragging} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={() => onCardClick(p)} onQuickView={() => onQuickView(p)} onDelete={onDelete} onMoveToProjects={onMoveToProjects} liveValue={projectValues?.get(p.id)} />
          ))}
        </AnimatePresence>
        {isOver && <div className="h-14 rounded-xl border-2 border-dashed border-blue-500/35 bg-blue-500/[0.04] flex items-center justify-center"><p className="text-blue-400/60 text-[14px] font-extrabold">Drop here</p></div>}
        {projects.length === 0 && !isOver && <div className="h-14 rounded-xl border border-dashed border-white/[0.04] flex items-center justify-center"><p className="text-[#484f58] text-[14px] font-semibold">No projects</p></div>}
      </div>
    </div>
  );
}
