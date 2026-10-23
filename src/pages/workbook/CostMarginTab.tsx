import { Fragment } from "react";
import { AlertTriangle, CheckCircle2, GripVertical, Loader2, PlusCircle, RotateCcw, Trash2, Package, Clock } from "lucide-react";
import { clsx } from "clsx";
import { InlineEditCell } from "../../components/InlineEditCell";
import { G } from "../../lib/constants";
import { useAutoTutorial } from "../../lib/contexts";
import { PriceDeviationBadge } from "./PriceDeviationBadge";
import { displayMoney, recalcLineItem, useLineItemReorder } from "./shared";
import type { QuoteCategory, QuoteLineItem, SystemType, TutorialStep } from "../../types";

export const COST_MARGIN_STEPS: TutorialStep[] = [
  { target: "wb-cm-filter", title: "System Filter", description: "Switch between Video Surveillance, Access Control, and Intercom — each has its own set of sections and line items." },
  { target: "wb-cm-table", title: "Cost & Margin Table", description: "Click any Qty, Cost, or Markup % cell to edit it inline — Sell Price, Total Cost, Total Sell, and Profit recalculate automatically, plus an Import line where a section carries an import rate. This data is internal only and never appears in client exports." },
];

export function CostMarginTab({ quoteCategories, exchangeRate, currency, fmt: _fmt, onLineItemUpdate, onAddLineItem, onAddFromLibrary, onOpenLabour, onDeleteLineItem, onReorderLineItems, onResetCost, priceDeviation, fieldSaveStatus, systemFilter, onSystemFilterChange }: { quoteCategories: QuoteCategory[]; exchangeRate: number; currency: "USD" | "JMD"; fmt: (n: number, compact?: boolean) => string; onLineItemUpdate: (categoryId: string, itemId: string, updates: Partial<QuoteLineItem>) => void; onAddLineItem: (categoryId: string) => void; onAddFromLibrary: (categoryId: string) => void; onOpenLabour: (categoryId: string) => void; onDeleteLineItem: (categoryId: string, itemId: string) => void; onReorderLineItems: (categoryId: string, orderedIds: string[]) => void; onResetCost: (categoryId: string, itemId: string) => void; priceDeviation: (li: QuoteLineItem) => number | null; fieldSaveStatus: Record<string, "saved" | "saving" | "">; systemFilter: SystemType; onSystemFilterChange: (s: SystemType) => void; }) {
  useAutoTutorial("workbook.cost-margin", COST_MARGIN_STEPS);
  const { toDisplay, fromDisplay } = displayMoney(currency, exchangeRate);
  const sym = currency === "JMD" ? "J$" : "$";
  const shown = (usd: number) => {
    const v = toDisplay(usd);
    return `${v < 0 ? "-" : ""}${sym}${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const { handleProps, rowProps } = useLineItemReorder(onReorderLineItems);
  const filteredCategories = quoteCategories.filter(c => c.system === systemFilter && c.sectionNumber !== 800 && c.sectionNumber !== 1300 && c.sectionNumber !== 1800);
  const importCategories = quoteCategories.filter(c => c.system === systemFilter && (c.sectionNumber === 800 || c.sectionNumber === 1300 || c.sectionNumber === 1800));

  const systemCostTotal = filteredCategories.reduce((s, c) => s + c.lineItems.reduce((ls, li) => ls + recalcLineItem(li, exchangeRate).costTotal, 0), 0);
  const systemSellTotal = filteredCategories.reduce((s, c) => s + c.lineItems.reduce((ls, li) => ls + recalcLineItem(li, exchangeRate).sellTotal, 0), 0);
  const systemProfit = systemSellTotal - systemCostTotal;
  const systemImportTotal = filteredCategories.reduce((s, c) => s + (c.lineItems.reduce((ls, li) => ls + recalcLineItem(li, exchangeRate).costTotal, 0) * c.importRatePercent), 0);
  const systemSubtotal = systemCostTotal + systemImportTotal;

  return (
    <div className="space-y-4">
      <div data-tour="wb-cm-filter" className="flex items-center gap-2">
        {(["VSS","EAC","Intercom"] as SystemType[]).map(s => (
          <button key={s} onClick={() => onSystemFilterChange(s)} className={clsx("h-9 md:h-7 px-3 rounded-lg text-[12px] font-extrabold cursor-pointer", systemFilter === s ? "text-white" : "text-[#8b949e]")} style={systemFilter === s ? { background: s === "VSS" ? "#3b82f6" : s === "EAC" ? "#8b5cf6" : "#14b8a6" } : G.btn}>{s}</button>
        ))}
      </div>
      <div data-tour="wb-cm-table" className="rounded-2xl overflow-hidden" style={G.card}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: "900px" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-left">Item No</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-left">Description</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-center">Qty</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Cost</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Markup %</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Sell</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Total Cost</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Total Sell</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Profit</th></tr></thead>
            <tbody>
              {filteredCategories.map(category => (
                <Fragment key={category.id}>
                  <tr style={{ background: "rgba(255,255,255,0.02)" }}><td colSpan={9} className="px-3 py-2 text-white text-[13px] font-extrabold">{category.sectionNumber} — {category.name}</td></tr>
                  {category.lineItems.filter(li => li.quantity > 0).map((li, i) => {
                    const r = recalcLineItem(li, exchangeRate);
                    const fieldKey = `cm-${category.id}-${li.id}`;
                    const fs = fieldSaveStatus[fieldKey];
                    const itemNumber = category.lineItems.filter(x => x.quantity > 0).length > 1 ? `${category.sectionNumber}.${i + 1}` : String(category.sectionNumber);
                    const incomplete = li.unitCost === 0 || li.markupPercent === 0;
                    return (
                      <tr key={li.id} {...rowProps(category.id, li.id, category.lineItems.filter(x => x.quantity > 0).map(x => x.id))} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", borderLeft: incomplete ? "3px solid #f59e0b" : "3px solid transparent" }}>
                        <td className="px-3 py-2 text-[#8b949e] text-[12px] font-mono"><span className="inline-flex items-center gap-1"><span {...handleProps(category.id, li.id)} className="cursor-grab" title="Drag to reorder"><GripVertical className="w-3 h-3 text-[#484f58]" /></span>{itemNumber}</span></td>
                        <td className="px-3 py-2 text-white text-[13px] font-bold"><span className="flex items-center gap-1.5">{incomplete && <span title={li.unitCost === 0 ? "Cost is $0 — pricing incomplete" : "Markup is 0% — pricing incomplete"} className="flex-shrink-0"><AlertTriangle className="w-3 h-3 text-amber-400" /></span>}{li.projectAssetId ? li.description : <InlineEditCell value={li.description} placeholder="Description" onChange={(val) => onLineItemUpdate(category.id, li.id, { description: val })} />}{!li.projectAssetId && <button onClick={() => onDeleteLineItem(category.id, li.id)} className="ml-auto w-5 h-5 rounded flex items-center justify-center cursor-pointer hover:bg-rose-500/10" title="Delete line item"><Trash2 className="w-3 h-3 text-rose-400" /></button>}</span></td>
                        <td className="px-3 py-2 text-center"><InlineEditCell type="number" value={li.quantity} onChange={(val) => onLineItemUpdate(category.id, li.id, { quantity: parseInt(val) || 0 })} /></td>
                        <td className="px-3 py-2 text-right"><span className="inline-flex items-center justify-end gap-1">{li.projectAssetId && li.costOverridden && <button onClick={() => onResetCost(category.id, li.id)} className="w-5 h-5 rounded flex items-center justify-center cursor-pointer hover:bg-white/[0.08]" title="Cost edited by hand — click to use the asset's cost again"><RotateCcw className="w-3 h-3 text-amber-400" /></button>}<span className="text-[#8b949e] text-[12px]">{sym}</span><InlineEditCell type="number" value={Number(toDisplay(li.unitCost).toFixed(2))} onChange={(val) => onLineItemUpdate(category.id, li.id, { unitCost: fromDisplay(parseFloat(val) || 0) })} />{(() => { const dev = priceDeviation(li); return dev !== null && <PriceDeviationBadge deviation={dev} />; })()}</span></td>
                        <td className="px-3 py-2 text-right"><InlineEditCell type="number" value={(li.markupPercent * 100).toFixed(1)} onChange={(val) => onLineItemUpdate(category.id, li.id, { markupPercent: (parseFloat(val) || 0) / 100 })} /><span className="text-[#8b949e] text-[12px]">%</span></td>
                        <td className="px-3 py-2 text-right text-white text-[13px] font-extrabold">{shown(r.sellPrice)}</td>
                        <td className="px-3 py-2 text-right text-[#8b949e] text-[13px]">{shown(r.costTotal)}</td>
                        <td className="px-3 py-2 text-right text-white text-[13px] font-extrabold">{shown(r.sellTotal)}</td>
                        <td className="px-3 py-2 text-right text-[13px] font-extrabold" style={{ color: r.profit >= 0 ? "#34d399" : "#f87171" }}>{shown(r.profit)}{fs === "saving" && <Loader2 className="w-2.5 h-2.5 animate-spin text-[#8b949e] ml-1 inline" />}{fs === "saved" && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 ml-1 inline" />}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}><td colSpan={9} className="px-3 py-1.5"><span className="flex items-center gap-4"><button onClick={() => onAddLineItem(category.id)} className="flex items-center gap-1 text-[#8b949e] hover:text-white text-[12px] font-bold cursor-pointer"><PlusCircle className="w-3 h-3" /> Add Line Item</button><button onClick={() => onAddFromLibrary(category.id)} className="flex items-center gap-1 text-[#8b949e] hover:text-white text-[12px] font-bold cursor-pointer"><Package className="w-3 h-3" /> From Device Library</button>{[700, 1200, 1700].includes(category.sectionNumber) && <button onClick={() => onOpenLabour(category.id)} className="flex items-center gap-1 text-[#8b949e] hover:text-white text-[12px] font-bold cursor-pointer"><Clock className="w-3 h-3" /> Labour calculator</button>}</span></td></tr>
                  {category.importRatePercent > 0 && (
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td colSpan={6} className="px-3 py-2 text-right text-[#8b949e] text-[12px] font-bold">Import ({Math.round(category.importRatePercent * 100)}% of cost)</td>
                      <td className="px-3 py-2 text-right text-amber-400 text-[13px] font-extrabold">{shown(category.lineItems.reduce((s, li) => s + recalcLineItem(li, exchangeRate).costTotal, 0) * category.importRatePercent)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  )}
                </Fragment>
              ))}
              <tr style={{ background: "rgba(255,255,255,0.04)" }}><td colSpan={6} className="px-3 py-2.5 text-right text-white text-[13px] font-extrabold uppercase">System Subtotal</td><td className="px-3 py-2.5 text-right text-white text-[14px] font-extrabold">{shown(systemSubtotal)}</td><td className="px-3 py-2.5 text-right text-white text-[14px] font-extrabold">{shown(systemSellTotal)}</td><td className="px-3 py-2.5 text-right text-emerald-400 text-[14px] font-extrabold">{shown(systemProfit)}</td></tr>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}><td colSpan={6} className="px-3 py-2 text-right text-[#8b949e] text-[12px]">Cost Total</td><td className="px-3 py-2 text-right text-white text-[13px] font-extrabold">{shown(systemCostTotal)}</td><td colSpan={2}></td></tr>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}><td colSpan={6} className="px-3 py-2 text-right text-[#8b949e] text-[12px]">Import Total</td><td className="px-3 py-2 text-right text-white text-[13px] font-extrabold">{shown(systemImportTotal)}</td><td colSpan={2}></td></tr>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}><td colSpan={6} className="px-3 py-2 text-right text-[#8b949e] text-[12px]">Profit</td><td colSpan={2}></td><td className="px-3 py-2 text-right text-emerald-400 text-[13px] font-extrabold">{shown(systemProfit)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-[#8b949e] text-[11px] italic">Internal only — never included in client exports. Cost/margin data stays hidden from proposals.</div>
    </div>
  );
}
