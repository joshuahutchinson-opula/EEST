import { useState } from "react";
import { motion } from "motion/react";
import { Plus, Trash2, X } from "lucide-react";
import { G } from "../../lib/constants";
import type { QuoteCategory } from "../../types";

export interface LabourRow { id?: string; role: string; hours: number; rateUsd: number }

// Professional Services labour: role x hours x rate. Each row becomes one line item in the
// section; reopening shows the rows that generated the section's current labour items.
export function LabourCalculatorModal({ category, currency, exchangeRate, fmt, onSave, onClose }: { category: QuoteCategory; currency: "USD" | "JMD"; exchangeRate: number; fmt: (n: number) => string; onSave: (rows: LabourRow[]) => void; onClose: () => void }) {
  const toShown = (usd: number) => (currency === "JMD" ? usd * exchangeRate : usd);
  const fromShown = (v: number) => (currency === "JMD" ? v / exchangeRate : v);
  const [rows, setRows] = useState<{ id?: string; role: string; hours: string; rate: string }[]>(() => {
    const existing = category.lineItems.filter((li) => li.labour).map((li) => ({ id: li.id, role: li.labour!.role, hours: String(li.labour!.hours), rate: String(Number(toShown(li.labour!.rate).toFixed(2))) }));
    return existing.length > 0 ? existing : [{ role: "", hours: "", rate: "" }];
  });
  const update = (i: number, patch: Partial<(typeof rows)[number]>) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const parsed = rows.map((r) => ({ id: r.id, role: r.role.trim(), hours: parseFloat(r.hours) || 0, rateUsd: fromShown(parseFloat(r.rate) || 0) }));
  const valid = parsed.filter((r) => r.role && r.hours > 0);
  const total = valid.reduce((s, r) => s + r.hours * r.rateUsd, 0);
  const sym = currency === "JMD" ? "J$" : "$";

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[620px] rounded-2xl" style={G.liquidGlass}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div><h3 className="text-white text-[16px] font-extrabold">Labour calculator</h3><p className="text-[#8b949e] text-[12px] mt-0.5">{category.sectionNumber} — {category.name}. Each row becomes a line item (cost = hours × rate).</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer"><X className="w-4 h-4 text-[#8b949e]" /></button>
        </div>
        <div className="p-5 space-y-2">
          <div className="grid grid-cols-[1fr_90px_110px_110px_28px] gap-2 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest"><span>Role</span><span>Hours</span><span>Rate ({sym}/h)</span><span className="text-right">Cost</span><span /></div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_110px_110px_28px] gap-2 items-center">
              <input value={r.role} onChange={(e) => update(i, { role: e.target.value })} placeholder="e.g. Installer" className="h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} />
              <input type="number" value={r.hours} onChange={(e) => update(i, { hours: e.target.value })} className="h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} />
              <input type="number" value={r.rate} onChange={(e) => update(i, { rate: e.target.value })} className="h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} />
              <span className="text-right text-white text-[13px] font-extrabold">{fmt(parsed[i].hours * parsed[i].rateUsd)}</span>
              <button onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:bg-rose-500/10"><Trash2 className="w-3 h-3 text-rose-400" /></button>
            </div>
          ))}
          <button onClick={() => setRows((prev) => [...prev, { role: "", hours: "", rate: "" }])} className="flex items-center gap-1 text-[#8b949e] hover:text-white text-[12px] font-bold cursor-pointer"><Plus className="w-3 h-3" /> Add role</button>
          <div className="flex justify-between pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}><span className="text-[#8b949e] text-[13px]">Labour cost</span><span className="text-white text-[15px] font-extrabold">{fmt(total)}</span></div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
          <button onClick={() => onSave(valid)} className="flex-1 h-10 rounded-xl text-white text-[14px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}>Save to section</button>
        </div>
      </motion.div>
    </div>
  );
}
