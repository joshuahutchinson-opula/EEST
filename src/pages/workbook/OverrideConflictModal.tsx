import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { G } from "../../lib/constants";

export function OverrideConflictModal({ open, sectionName, onUpdateOverride, onKeepOverride, onCancel }: { open: boolean; sectionName: string; onUpdateOverride: () => void; onKeepOverride: () => void; onCancel: () => void; }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={e => e.stopPropagation()} className="relative z-10 w-full max-w-[440px] rounded-2xl p-6" style={G.liquidGlass}>
        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}><AlertTriangle className="w-5 h-5 text-amber-400" /></div><div><h3 className="text-white text-[16px] font-extrabold">Manual Override Detected</h3><p className="text-[#8b949e] text-[13px] mt-0.5">"{sectionName}" has a manual override in Synthesis.</p></div></div>
        <p className="text-[#8b949e] text-[14px] mb-5">Editing the BOM will recalculate this section. Update override or keep the manual value?</p>
        <div className="flex gap-2"><button onClick={onCancel} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button><button onClick={onKeepOverride} className="flex-1 h-10 rounded-xl text-white text-[14px] font-bold cursor-pointer" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>Keep Override</button><button onClick={onUpdateOverride} className="flex-1 h-10 rounded-xl text-white text-[14px] font-extrabold cursor-pointer" style={{ background: "#f59e0b", boxShadow: "0 4px 16px rgba(245,158,11,0.35)" }}>Update Override</button></div>
      </motion.div>
    </div>
  );
}
