import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { G } from "../lib/constants";

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = "Delete", danger = true }: { open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string; danger?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[380px] rounded-2xl p-6" style={G.liquidGlass}>
        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: danger ? "rgba(244,63,94,0.15)" : "rgba(59,130,246,0.15)" }}><AlertTriangle className={clsx("w-5 h-5", danger ? "text-rose-400" : "text-blue-400")} /></div><h3 className="text-white text-[16px] font-extrabold">{title}</h3></div>
        <p className="text-[#8b949e] text-[14px] mb-5">{message}</p>
        <div className="flex gap-2"><button onClick={onCancel} className="flex-1 h-9 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button><button onClick={onConfirm} className="flex-1 h-9 rounded-xl text-white text-[14px] font-extrabold cursor-pointer" style={{ background: danger ? "#f43f5e" : "#3b82f6" }}>{confirmLabel}</button></div>
      </motion.div>
    </div>
  );
}
