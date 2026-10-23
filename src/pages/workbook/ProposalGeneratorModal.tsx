import { useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { FileDown, Loader2 } from "lucide-react";
import { totalsForSystems, type WorkbookTotals } from "../../../server/src/lib/workbookTotals";
import { API, downloadBlob } from "../../api";
import { G, SYSTEM_DISPLAY } from "../../lib/constants";

const jmd = (usd: number, rate: number) => `J$${(usd * rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function defaultValidUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

// Proposal options (systems, validity, terms) with a preview of the totals the document will
// show. The proposal is client-facing, so the preview is in JMD at the quote's locked rate.
export function ProposalGeneratorModal({ open, onClose, projectId, quoteId, totals, exchangeRate }: { open: boolean; onClose: () => void; projectId: string; quoteId?: string; totals: WorkbookTotals; exchangeRate: number }) {
  const [generating, setGenerating] = useState(false);
  const [systems, setSystems] = useState<string[]>(() => {
    const withValue = totals.systems.filter((s) => s.total !== 0).map((s) => s.system as string);
    return withValue.length > 0 ? withValue : totals.systems.map((s) => s.system as string);
  });
  const [validUntil, setValidUntil] = useState(defaultValidUntil);
  const [terms, setTerms] = useState("");
  const preview = totalsForSystems(totals, systems);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { blob, filename } = await API.proposals.generate(projectId, quoteId, { systems, validUntil: validUntil || undefined, terms: terms.trim() || undefined });
      downloadBlob(blob, filename);
      toast.success("Proposal generated");
      onClose();
    } catch { toast.error("Failed to generate proposal"); }
    finally { setGenerating(false); }
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={e => e.stopPropagation()} className="relative z-10 w-full max-w-[480px] rounded-2xl p-6 space-y-4" style={G.liquidGlass}>
        <div>
          <h3 className="text-white text-[16px] font-extrabold mb-1">Generate Proposal</h3>
          <p className="text-[#8b949e] text-[13px]">A branded Word document with scope, line items and pricing, in JMD at J${exchangeRate.toFixed(2)} per US$1.</p>
        </div>
        <div>
          <p className="text-[#8b949e] text-[12px] font-extrabold uppercase tracking-widest mb-2">Systems</p>
          <div className="flex flex-wrap gap-2">
            {totals.systems.map((s) => {
              const on = systems.includes(s.system);
              return (
                <button key={s.system} onClick={() => setSystems((prev) => (on ? prev.filter((x) => x !== s.system) : [...prev, s.system]))} className="h-8 px-3 rounded-lg text-[12px] font-extrabold cursor-pointer" style={on ? { background: "rgba(59,130,246,0.25)", border: "1px solid rgba(59,130,246,0.45)", color: "#fff" } : { ...G.btn, color: "#8b949e" }}>
                  {SYSTEM_DISPLAY[s.system].label} · {jmd(s.total, exchangeRate)}
                </button>
              );
            })}
          </div>
        </div>
        <label className="block">
          <span className="text-[#8b949e] text-[12px] font-extrabold uppercase tracking-widest">Valid until</span>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="mt-1 w-full h-9 rounded-lg px-3 text-[13px] text-white" style={{ ...G.input, colorScheme: "dark" }} />
        </label>
        <label className="block">
          <span className="text-[#8b949e] text-[12px] font-extrabold uppercase tracking-widest">Terms</span>
          <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={4} placeholder="e.g. 50% deposit on acceptance, balance on commissioning." className="mt-1 w-full rounded-lg px-3 py-2 text-[13px] text-white resize-y" style={G.input} />
        </label>
        <div className="rounded-xl p-3 space-y-1" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.20)" }}>
          <div className="flex justify-between text-[13px]"><span className="text-[#8b949e]">Subtotal</span><span className="text-white font-extrabold">{jmd(preview.subtotal, exchangeRate)}</span></div>
          <div className="flex justify-between text-[13px]"><span className="text-[#8b949e]">GCT (15%)</span><span className="text-white font-extrabold">{jmd(preview.gct, exchangeRate)}</span></div>
          <div className="flex justify-between text-[14px]"><span className="text-white font-extrabold">Total</span><span className="font-black" style={{ color: "#60a5fa" }}>{jmd(preview.total, exchangeRate)}</span></div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
          <button onClick={handleGenerate} disabled={generating || systems.length === 0} className="flex-1 h-10 rounded-xl text-white text-[14px] font-extrabold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "#3b82f6" }}>{generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}{generating ? "Generating..." : "Download Word Doc"}</button>
        </div>
      </motion.div>
    </div>
  );
}
