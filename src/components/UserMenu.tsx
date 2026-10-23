import { useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, LogOut } from "lucide-react";
import { CURRENT_USER } from "../lib/constants";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 h-8 pl-1.5 pr-2.5 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer min-h-[44px] md:min-h-0">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold flex-shrink-0" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 0 12px rgba(139,92,246,0.5)" }}>{CURRENT_USER.initials}</div>
        <span className="text-white text-[14px] font-bold hidden md:inline">{CURRENT_USER.name}</span>
        <ChevronDown className="w-3 h-3 text-[#8b949e] hidden md:block" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -8 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} className="absolute right-0 top-full mt-2 z-[60] w-56 rounded-2xl overflow-hidden" style={{ background: "rgba(7,12,26,0.97)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 32px rgba(0,0,0,0.8)", backdropFilter: "blur(20px)" }}>
            <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-extrabold flex-shrink-0" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 0 12px rgba(139,92,246,0.5)" }}>{CURRENT_USER.initials}</div>
              <div><p className="text-white text-[14px] font-bold">{CURRENT_USER.name}</p><p className="text-[#484f58] text-[12px]">Administrator</p></div>
            </div>
            <div className="py-1">
              <button onClick={() => { setOpen(false); localStorage.removeItem("auth_token"); localStorage.removeItem("app_logged_in"); localStorage.removeItem("app_page"); window.location.href = "/"; }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#8b949e] hover:text-white hover:bg-white/[0.05] transition-colors text-left cursor-pointer min-h-[44px] text-[14px] font-bold"><LogOut className="w-3.5 h-3.5 text-rose-400" /> Sign Out</button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
