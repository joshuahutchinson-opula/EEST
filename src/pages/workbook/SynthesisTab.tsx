import { Fragment, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { computeWorkbookTotals, type SectionTotal } from "../../../server/src/lib/workbookTotals";
import { G, SYSTEM_DISPLAY } from "../../lib/constants";
import { useAutoTutorial } from "../../lib/contexts";
import { OverrideIndicator } from "./OverrideIndicator";
import type { QuoteCategory, SynthesisOverride, TutorialStep } from "../../types";

export const PM_REFERENCE_RATE = 0.05;

export const CONTINGENCY_REFERENCE_RATE = 0.10;

export const SYNTHESIS_STEPS: TutorialStep[] = [
  { target: "wb-synth-table", title: "Section Subtotals", description: "Every section across Video, Access, and Intercom, grouped and collapsible. Click a value to override it manually — an override badge appears, with a reset button to go back to the auto-calculated figure." },
  { target: "wb-synth-total", title: "Grand Total", description: "The overall grand total, GCT (15%), and total with tax — this is the number that ultimately drives the client-facing quote." },
  { target: "wb-synth-reference", title: "Reference Figures", description: "Suggested PM and contingency percentages, shown for reference only — they're never applied to any total automatically." },
];

export function SynthesisTab({ quoteCategories, synthesisOverrides, fmt, onSaveOverride, fieldSaveStatus }: { quoteCategories: QuoteCategory[]; synthesisOverrides: SynthesisOverride[]; fmt: (n: number, compact?: boolean) => string; onSaveOverride: (sectionNumber: string, value: number | null, isOverridden: boolean) => void; fieldSaveStatus: Record<string, "saved" | "saving" | "">; }) {
  useAutoTutorial("workbook.synthesis", SYNTHESIS_STEPS);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const totals = useMemo(() => computeWorkbookTotals(quoteCategories, synthesisOverrides), [quoteCategories, synthesisOverrides]);

  const handleStartEdit = (sectionNumber: string, currentValue: number) => { setEditingSection(sectionNumber); setEditValue(String(currentValue)); };
  const handleSaveEdit = (sectionNumber: string) => { const val = parseFloat(editValue) || 0; onSaveOverride(sectionNumber, val, true); setEditingSection(null); };
  const handleResetOverride = (sectionNumber: string) => { onSaveOverride(sectionNumber, null, false); };

  const suggestedPM = totals.subtotal * PM_REFERENCE_RATE;
  const suggestedContingency = totals.subtotal * CONTINGENCY_REFERENCE_RATE;

  const renderSection = (section: SectionTotal) => {
    const value = section.total;
    const isOverridden = section.override !== null;
    const fieldKey = `synth-${section.section}`;
    const fs = fieldSaveStatus[fieldKey];
    return (
      <tr key={section.section} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
        <td className="px-4 py-2 text-[#8b949e] text-[12px] font-mono">{section.section}</td>
        <td className="px-4 py-2 text-white text-[13px] font-bold">{section.name}</td>
        <td className={clsx("px-4 py-2 text-[13px] font-extrabold text-right flex items-center justify-end gap-1", isOverridden ? "text-amber-400" : "text-[#8b949e]")}>
          {editingSection === section.section ? (
            <div className="flex items-center gap-1"><input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="bg-transparent text-white text-[13px] w-24 text-right focus:outline-none" style={G.input} autoFocus onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(section.section); if (e.key === "Escape") setEditingSection(null); }} /><button onClick={() => handleSaveEdit(section.section)} className="w-5 h-5 rounded flex items-center justify-center cursor-pointer" style={{ background: "rgba(16,185,129,0.15)" }}><CheckCircle2 className="w-3 h-3 text-emerald-400" /></button></div>
          ) : (<span className="cursor-pointer" onClick={() => handleStartEdit(section.section, value)}>{value !== 0 ? fmt(value) : "—"}</span>)}
          {isOverridden && <OverrideIndicator isOverridden={true} onReset={() => handleResetOverride(section.section)} />}
          {fs === "saving" && <Loader2 className="w-2.5 h-2.5 animate-spin text-[#8b949e]" />}
          {fs === "saved" && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-0">
      <div data-tour="wb-synth-table" className="rounded-2xl overflow-hidden" style={G.card}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: "700px" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-left">Item No</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-left">DESIGNATION</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Unit Price</th></tr></thead>
            <tbody>
              {totals.systems.map((sys, i) => {
                const meta = SYSTEM_DISPLAY[sys.system];
                const isCollapsed = !!collapsed[sys.system];
                return (
                  <Fragment key={sys.system}>
                    {i > 0 && <tr><td colSpan={3} className="px-4 py-1"></td></tr>}
                    <tr style={{ background: meta.tint, cursor: "pointer" }} onClick={() => setCollapsed(prev => ({ ...prev, [sys.system]: !isCollapsed }))}><td colSpan={3} className="px-4 py-2.5 text-white text-[14px] font-extrabold uppercase tracking-widest flex items-center gap-2">{isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} {meta.label}</td></tr>
                    {!isCollapsed && sys.sections.map(renderSection)}
                    {!isCollapsed && <tr style={{ background: "rgba(255,255,255,0.04)" }}><td colSpan={2} className="px-4 py-2 text-[#8b949e] text-[12px] font-extrabold text-right uppercase">Total {meta.short}</td><td className="px-4 py-2 text-white text-[14px] font-extrabold text-right">{fmt(sys.total)}</td></tr>}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div data-tour="wb-synth-total" className="rounded-2xl p-4 mt-4" style={{ ...G.card, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.20)" }}>
        <div className="space-y-2">
          <div className="flex justify-between py-1"><span className="text-[#8b949e] text-[13px]">Grand Total</span><span className="text-white text-[16px] font-extrabold">{fmt(totals.subtotal)}</span></div>
          <div className="flex justify-between py-1"><span className="text-[#8b949e] text-[14px]">Tax (GCT 15%)</span><span className="text-[#8b949e] text-[14px] font-extrabold">{fmt(totals.gct)}</span></div>
          <div className="flex justify-between py-2 border-t-2 border-white/10"><span className="text-white text-[16px] font-extrabold">Grand Total with Tax</span><span className="text-white text-[1.3rem] font-black" style={{ color: "#60a5fa" }}>{fmt(totals.total)}</span></div>
        </div>
      </div>
      <div data-tour="wb-synth-reference" className="rounded-2xl p-4 mt-3" style={G.subtle}>
        <p className="text-[#8b949e] text-[12px] font-extrabold uppercase tracking-widest mb-2">Reference</p>
        <div className="flex justify-between py-1"><span className="text-[#8b949e] text-[13px]">Suggested PM (5%)</span><span className="text-[#8b949e] text-[14px] font-extrabold">{fmt(suggestedPM)}</span></div>
        <div className="flex justify-between py-1"><span className="text-[#8b949e] text-[13px]">Suggested Contingency (10%)</span><span className="text-[#8b949e] text-[14px] font-extrabold">{fmt(suggestedContingency)}</span></div>
        <p className="text-[#484f58] text-[11px] italic mt-2">Not applied to any total — informational only.</p>
      </div>
    </div>
  );
}
