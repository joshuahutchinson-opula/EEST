import { useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Search, X } from "lucide-react";
import { G } from "../../lib/constants";
import type { Project } from "../../types";

export function SelectProjectModal({ onClose, onSelect, currentId, projects }: { onClose: () => void; onSelect: (id: string) => void; currentId: string; projects: Project[] }) {
  const [search, setSearch] = useState("");
  const filtered = search.trim() ? projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase())) : projects;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 14 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[500px] max-h-[80vh] overflow-y-auto rounded-3xl" style={{ background: "rgba(7,12,26,0.95)", backdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 32px 80px rgba(0,0,0,0.9)" }}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}><h2 className="text-white text-[1.2rem] font-extrabold">Select Project</h2><button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer min-w-[44px] min-h-[44px]" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><X className="w-4 h-4 text-[#8b949e]" /></button></div>
        <div className="px-4 py-3"><div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#484f58]" /><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects…" className="w-full h-9 rounded-xl pl-8 pr-3 text-[15px] text-[#e6edf3] focus:outline-none" style={G.input} /></div></div>
        <div className="max-h-[340px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {filtered.map((p) => (
            <button key={p.id} onClick={() => { onSelect(p.id); onClose(); }} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/[0.04] transition-colors text-left cursor-pointer min-h-[44px]" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: p.id === currentId ? "rgba(59,130,246,0.06)" : "transparent" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-extrabold text-white flex-shrink-0" style={{ background: p.assignee.color }}>{p.assignee.initials}</div>
              <div className="flex-1 min-w-0"><p className="text-white text-[15px] font-bold truncate">{p.name}</p><p className="text-[#8b949e] text-[13px] truncate">{p.client}</p></div>
              {p.id === currentId && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
