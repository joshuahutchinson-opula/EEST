import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Pencil, PlusCircle, GripVertical, Trash2, Package, Clock } from "lucide-react";
import { clsx } from "clsx";
import { buildSectionRows, computeWorkbookTotals } from "../../../server/src/lib/workbookTotals";
import { InlineEditCell } from "../../components/InlineEditCell";
import { G, SYSTEM_DISPLAY } from "../../lib/constants";
import { useAutoTutorial } from "../../lib/contexts";
import { OverrideIndicator } from "./OverrideIndicator";
import { displayMoney, recalcLineItem, useLineItemReorder } from "./shared";
import type { QuoteCategory, QuoteLineItem, SynthesisOverride, SystemType, TutorialStep } from "../../types";

export const BOM_STEPS: TutorialStep[] = [
  { target: "wb-bom-table", title: "Bill of Materials", description: "The client-facing BOM, priced in JMD — switch between Video Surveillance, Access Control, and Intercom above the table. Every section's line items show quantity (click to edit), list price, and extended total. A section overridden on the Synthesis tab shows a badge and a price adjustment row, so its rows always add up to its total; contingency and import lines sit under their own sections, followed by the system total and the all-systems Subtotal, GCT, and Total." },
];

export function BomTab({ quoteCategories, synthesisOverrides, exchangeRate, currency, fmt, onLineItemUpdate, onAddLineItem, onAddFromLibrary, onOpenLabour, onDeleteLineItem, onReorderLineItems, onBomEditWithOverride, fieldSaveStatus, systemFilter, onSystemFilterChange }: { quoteCategories: QuoteCategory[]; synthesisOverrides: SynthesisOverride[]; exchangeRate: number; currency: "USD" | "JMD"; fmt: (n: number, compact?: boolean) => string; onLineItemUpdate: (categoryId: string, itemId: string, updates: Partial<QuoteLineItem>) => void; onAddLineItem: (categoryId: string) => void; onAddFromLibrary: (categoryId: string) => void; onOpenLabour: (categoryId: string) => void; onDeleteLineItem: (categoryId: string, itemId: string) => void; onReorderLineItems: (categoryId: string, orderedIds: string[]) => void; onBomEditWithOverride: (sectionNumber: string, sectionName: string, callback: () => void) => void; fieldSaveStatus: Record<string, "saved" | "saving" | "">; systemFilter: SystemType; onSystemFilterChange: (s: SystemType) => void; }) {
  useAutoTutorial("workbook.bom", BOM_STEPS);
  const { toDisplay, fromDisplay } = displayMoney(currency, exchangeRate);
  const { handleProps, rowProps } = useLineItemReorder(onReorderLineItems);
  const countedIds = (categoryId: string) => (quoteCategories.find(c => c.id === categoryId)?.lineItems || []).filter(li => li.quantity > 0).map(li => li.id);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [stickyScrollLeft, setStickyScrollLeft] = useState(0);
  // Description/List/Qty are locked by default — a row must be explicitly unlocked before any
  // of the three become editable, rather than being always-editable inline.
  const [unlockedRows, setUnlockedRows] = useState<Set<string>>(new Set());
  const toggleUnlock = (id: string) => setUnlockedRows((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  useEffect(() => { const body = bodyRef.current; if (!body) return; const handler = () => setStickyScrollLeft(body.scrollLeft); body.addEventListener("scroll", handler); return () => body.removeEventListener("scroll", handler); }, []);

  const totals = useMemo(() => computeWorkbookTotals(quoteCategories, synthesisOverrides), [quoteCategories, synthesisOverrides]);
  const sectionRows = useMemo(() => buildSectionRows(totals, quoteCategories), [totals, quoteCategories]);
  const itemLookup = useMemo(() => {
    const map = new Map<string, { categoryId: string; item: QuoteLineItem }>();
    quoteCategories.forEach(c => c.lineItems.forEach(li => map.set(li.id, { categoryId: c.id, item: li })));
    return map;
  }, [quoteCategories]);
  const system = totals.systems.find(s => s.system === systemFilter)!;
  // Contingency and Importation sections only appear once they carry a value.
  const visibleSections = system.sections.filter(s => s.kind === "items" || (sectionRows.get(s.section) || []).length > 0);
  const categoryFor = (section: string) => quoteCategories.find(c => c.system === systemFilter && String(c.sectionNumber) === section);

  return (
    <div className="space-y-4">
      <div data-tour="wb-bom-filter" className="flex items-center gap-2">
        {(["VSS","EAC","Intercom"] as SystemType[]).map(s => (
          <button key={s} onClick={() => onSystemFilterChange(s)} className={clsx("h-9 md:h-7 px-3 rounded-lg text-[12px] font-extrabold cursor-pointer", systemFilter === s ? "text-white" : "text-[#8b949e]")} style={systemFilter === s ? { background: s === "VSS" ? "#3b82f6" : s === "EAC" ? "#8b5cf6" : "#14b8a6" } : G.btn}>{s}</button>
        ))}
      </div>
      <div data-tour="wb-bom-table" className="rounded-2xl overflow-hidden" style={G.card}>
        <div className="sticky top-0 z-10 overflow-hidden" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(7,12,26,0.95)" }}>
          <div style={{ marginLeft: -stickyScrollLeft }}>
            <table style={{ minWidth: "900px" }}>
              <thead><tr style={{ background: "rgba(255,255,255,0.03)" }}><th className="sticky left-0 z-20 px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-left" style={{ background: "rgba(7,12,26,0.95)", minWidth: "100px" }}>Item No</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-left" style={{ minWidth: "250px" }}>Products – Description</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right" style={{ minWidth: "120px" }}>List</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-center" style={{ minWidth: "60px" }}>Qty</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right" style={{ minWidth: "140px" }}>Extended</th></tr></thead>
            </table>
          </div>
        </div>
        <div ref={bodyRef} className="overflow-x-auto" style={{ maxHeight: "calc(100vh - 420px)", scrollbarWidth: "thin" }}>
          <table style={{ minWidth: "900px" }}>
            <tbody>
              <tr style={{ background: SYSTEM_DISPLAY[systemFilter].tint }}><td colSpan={5} className="sticky left-0 px-4 py-2.5 text-white text-[14px] font-extrabold uppercase tracking-widest" style={{ background: "rgba(7,12,26,0.9)" }}>{SYSTEM_DISPLAY[systemFilter].label}</td></tr>
              {visibleSections.map(section => {
                const rows = sectionRows.get(section.section) || [];
                const category = categoryFor(section.section);
                const itemRowCount = rows.filter(r => r.kind === "item").length;
                let itemIndex = 0;
                return (
                  <Fragment key={section.section}>
                    <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                      <td className="sticky left-0 px-4 py-2 text-[#8b949e] text-[12px] font-mono" style={{ background: "rgba(7,12,26,0.9)" }}>{section.section}</td>
                      <td colSpan={4} className="px-4 py-2 text-white text-[13px] font-extrabold"><span className="inline-flex items-center gap-1">{section.name}{section.override !== null && <OverrideIndicator isOverridden={true} />}</span></td>
                    </tr>
                    {rows.length === 0 && (
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td className="sticky left-0 px-4 py-2" style={{ background: "rgba(7,12,26,0.9)" }}></td>
                        <td className="px-4 py-2 text-[#8b949e] text-[13px] italic">No items</td>
                        <td className="px-4 py-2 text-right text-white text-[13px]">—</td>
                        <td className="px-4 py-2 text-center text-[#8b949e] text-[13px]">0</td>
                        <td className="px-4 py-2 text-right text-white text-[13px] font-extrabold">—</td>
                      </tr>
                    )}
                    {rows.map((row, rowIndex) => {
                      if (row.kind !== "item") {
                        const tone = row.kind === "import" ? "text-amber-400" : row.kind === "adjustment" ? "text-amber-300 italic" : "text-white";
                        const label = row.kind === "adjustment" ? "Price adjustment (Synthesis override)" : row.description;
                        return (
                          <tr key={`${row.kind}-${rowIndex}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                            <td className="sticky left-0 px-4 py-2 text-[#8b949e] text-[12px] font-mono" style={{ background: "rgba(7,12,26,0.9)" }}>{row.kind === "adjustment" ? "" : row.kind === "import" ? `${section.section}.${rowIndex + 1}` : section.section}</td>
                            <td className={clsx("px-4 py-2 text-[13px] font-bold", tone)}>{label}</td>
                            <td className={clsx("px-4 py-2 text-right text-[13px]", tone)}>{fmt(row.unitPrice)}</td>
                            <td className="px-4 py-2 text-center text-[#8b949e] text-[13px]">{row.quantity}</td>
                            <td className={clsx("px-4 py-2 text-right text-[13px] font-extrabold", tone)}>{fmt(row.extended)}</td>
                          </tr>
                        );
                      }
                      const found = row.lineItemId ? itemLookup.get(row.lineItemId) : undefined;
                      if (!found) return null;
                      const item = recalcLineItem(found.item, exchangeRate);
                      itemIndex += 1;
                      const subNumber = itemRowCount > 1 ? `${section.section}.${itemIndex}` : section.section;
                      const fs = fieldSaveStatus[`bom-${found.categoryId}-${item.id}`];
                      const isUnlocked = unlockedRows.has(item.id);
                      const incomplete = item.unitCost === 0 || item.markupPercent === 0;
                      // Price and quantity edits change the section total, which may be overridden in Synthesis.
                      const editValue = (updates: Partial<QuoteLineItem>) => onBomEditWithOverride(section.section, section.name, () => onLineItemUpdate(found.categoryId, item.id, updates));
                      return (
                        <tr key={item.id} {...rowProps(found.categoryId, item.id, countedIds(found.categoryId))} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", borderLeft: incomplete ? "3px solid #f59e0b" : "3px solid transparent" }}>
                          <td className="sticky left-0 px-4 py-2 text-[#8b949e] text-[12px] font-mono" style={{ background: "rgba(7,12,26,0.9)", paddingLeft: itemRowCount > 1 ? "28px" : "16px" }}><span className="inline-flex items-center gap-1"><span {...handleProps(found.categoryId, item.id)} className="cursor-grab" title="Drag to reorder"><GripVertical className="w-3 h-3 text-[#484f58]" /></span>{subNumber}</span></td>
                          <td className="px-4 py-2 text-white text-[13px] font-bold max-w-[250px]">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => toggleUnlock(item.id)} className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center hover:bg-white/[0.08] cursor-pointer" title={isUnlocked ? "Lock this row" : "Unlock to edit this row"}><Pencil className={clsx("w-3 h-3", isUnlocked ? "text-blue-400" : "text-[#484f58]")} /></button>
                              {incomplete && <span title={item.unitCost === 0 ? "Cost is $0 — pricing incomplete" : "Markup is 0% — pricing incomplete"} className="flex-shrink-0"><AlertTriangle className="w-3 h-3 text-amber-400" /></span>}
                              {isUnlocked ? <InlineEditCell value={item.description} onChange={(val) => onLineItemUpdate(found.categoryId, item.id, { description: val })} /> : <span className="truncate">{item.description}</span>}
                              {isUnlocked && !item.projectAssetId && <button onClick={() => onDeleteLineItem(found.categoryId, item.id)} className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center cursor-pointer hover:bg-rose-500/10" title="Delete line item"><Trash2 className="w-3 h-3 text-rose-400" /></button>}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right text-white text-[13px]">{isUnlocked ? <InlineEditCell type="number" value={Number(toDisplay(item.sellPrice).toFixed(2))} onChange={(val) => { const newSellUSD = fromDisplay(parseFloat(val) || 0); const denom = 1 + item.markupPercent; editValue({ unitCost: denom !== 0 ? newSellUSD / denom : newSellUSD }); }} /> : fmt(item.sellPrice)}</td>
                          <td className="px-4 py-2 text-center">{isUnlocked ? <InlineEditCell type="number" value={item.quantity} onChange={(val) => editValue({ quantity: parseInt(val) || 0 })} /> : <span className="text-[#8b949e] text-[13px]">{item.quantity}</span>}</td>
                          <td className="px-4 py-2 text-right text-white text-[13px] font-extrabold flex items-center justify-end gap-1">{fmt(item.sellTotal)}{fs === "saving" && <Loader2 className="w-2.5 h-2.5 animate-spin text-[#8b949e]" />}{fs === "saved" && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}</td>
                        </tr>
                      );
                    })}
                    {section.kind === "items" && category && <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}><td colSpan={5} className="px-4 py-1.5"><span className="flex items-center gap-4"><button onClick={() => onAddLineItem(category.id)} className="flex items-center gap-1 text-[#8b949e] hover:text-white text-[12px] font-bold cursor-pointer"><PlusCircle className="w-3 h-3" /> Add Line Item</button><button onClick={() => onAddFromLibrary(category.id)} className="flex items-center gap-1 text-[#8b949e] hover:text-white text-[12px] font-bold cursor-pointer"><Package className="w-3 h-3" /> From Device Library</button>{[700, 1200, 1700].includes(category.sectionNumber) && <button onClick={() => onOpenLabour(category.id)} className="flex items-center gap-1 text-[#8b949e] hover:text-white text-[12px] font-bold cursor-pointer"><Clock className="w-3 h-3" /> Labour calculator</button>}</span></td></tr>}
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}><td colSpan={4} className="px-4 py-1.5 text-right text-[#8b949e] text-[12px] font-bold">{section.name} total</td><td className="px-4 py-1.5 text-right text-white text-[13px] font-extrabold">{fmt(section.total)}</td></tr>
                  </Fragment>
                );
              })}
              <tr style={{ background: "rgba(255,255,255,0.04)" }}><td colSpan={4} className="px-4 py-2.5 text-right text-white text-[13px] font-extrabold uppercase">{SYSTEM_DISPLAY[systemFilter].label} Total</td><td className="px-4 py-2.5 text-right text-white text-[15px] font-extrabold">{fmt(system.total)}</td></tr>
              <tr><td colSpan={5} className="px-4 pt-3 pb-1 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest">All systems</td></tr>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}><td colSpan={4} className="px-4 py-2.5 text-right text-white text-[13px] font-extrabold uppercase">Subtotal</td><td className="px-4 py-2.5 text-right text-white text-[15px] font-extrabold">{fmt(totals.subtotal)}</td></tr>
              <tr><td colSpan={4} className="px-4 py-2 text-right text-[#8b949e] text-[13px]">GCT (15%)</td><td className="px-4 py-2 text-right text-white text-[14px] font-extrabold">{fmt(totals.gct)}</td></tr>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}><td colSpan={4} className="px-4 py-2.5 text-right text-white text-[15px] font-extrabold uppercase">Total</td><td className="px-4 py-2.5 text-right text-white text-[16px] font-black" style={{ color: "#60a5fa" }}>{fmt(totals.total)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
