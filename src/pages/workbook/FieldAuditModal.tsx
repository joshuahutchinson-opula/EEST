import { motion } from "motion/react";
import { ChevronRight, X } from "lucide-react";
import { G, TEAM } from "../../lib/constants";
import type { WorkbookAuditEntry } from "../../types";

export function FieldAuditModal({ open, entries, onClose }: { open: boolean; entries: WorkbookAuditEntry[]; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={e => e.stopPropagation()} className="relative z-10 w-full max-w-[500px] max-h-[70vh] overflow-y-auto rounded-2xl" style={G.liquidGlass}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}><h3 className="text-white text-[16px] font-extrabold">Change History</h3><button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer"><X className="w-4 h-4 text-[#8b949e]" /></button></div>
        <div className="p-4 space-y-2">{entries.length === 0 ? <p className="text-[#8b949e] text-[14px] text-center py-4">No changes recorded</p> : entries.map(entry => (<div key={entry.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}><div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0" style={{ background: TEAM.find(t => t.name === entry.changedBy)?.color || "#3b82f6" }}>{TEAM.find(t => t.name === entry.changedBy)?.initials || "??"}</div><div className="flex-1 min-w-0"><p className="text-white text-[13px] font-bold">{entry.fieldPath}</p><div className="flex items-center gap-1.5 mt-1 text-[12px]"><span className="text-rose-400 line-through">{entry.oldValue}</span><ChevronRight className="w-3 h-3 text-[#484f58]" /><span className="text-emerald-400">{entry.newValue}</span></div><p className="text-[#8b949e] text-[11px] mt-1">{new Date(entry.changedAt).toLocaleString()}</p></div></div>))}</div>
      </motion.div>
    </div>
  );
}
