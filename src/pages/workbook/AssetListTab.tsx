import { useMemo, useState } from "react";
import { EyeOff } from "lucide-react";
import { clsx } from "clsx";
import { G } from "../../lib/constants";
import { useAutoTutorial } from "../../lib/contexts";
import { recalcLineItem } from "./shared";
import type { AssetListItem, QuoteCategory, QuoteLineItem, SystemType, TutorialStep } from "../../types";

export const ASSET_LIST_STEPS: TutorialStep[] = [
  { target: "wb-al-toggle", title: "Internal / Client View", description: "Toggle Client View to hide cost, markup, and profit columns — exactly what a client should see." },
  { target: "wb-al-assets-table", title: "Project Assets", description: "Every device pulled in from the project's Assets tab, kept in sync automatically — edit it here or there and it updates in both places. Manually added line items stay visible and editable on Cost & Margin, BOM, and Synthesis." },
];

export function AssetListTab({ quoteCategories, exchangeRate, fmt, systemFilter, onSystemFilterChange }: { quoteCategories: QuoteCategory[]; exchangeRate: number; fmt: (n: number, compact?: boolean) => string; systemFilter: SystemType; onSystemFilterChange: (s: SystemType) => void; }) {
  useAutoTutorial("workbook.asset-list", ASSET_LIST_STEPS);
  const [clientExportMode, setClientExportMode] = useState(false);

  const filteredCategories = useMemo(() => quoteCategories.filter(c => c.system === systemFilter), [quoteCategories, systemFilter]);

  // Project-asset rows are read from the same real QuoteLineItem data every other Workbook
  // tab reads (tagged via projectAssetId when Project Assets syncs), not a separate in-memory
  // preview computed straight from projectAssets — so this can never drift from Cost & Margin,
  // BOM, or Synthesis.
  const allItems = useMemo(() => {
    const items: AssetListItem[] = [];
    filteredCategories.forEach(cat => {
      cat.lineItems.filter(li => li.quantity > 0).forEach(li => {
        const r = recalcLineItem(li, exchangeRate);
        items.push({ id: li.id, item: li.description, qty: li.quantity, cost: li.unitCost, markupPercent: li.markupPercent, sell: r.sellPrice, costTotal: r.costTotal, total: r.sellTotal, profit: r.profit, isProjectAsset: !!li.projectAssetId, system: cat.system, sourceCategory: cat.name, sourceItemId: li.id });
      });
    });
    return items;
  }, [filteredCategories, exchangeRate]);
  const assetItems = allItems.filter(i => i.isProjectAsset);

  return (
    <div className="space-y-4">
      <div data-tour="wb-al-filter" className="flex items-center gap-2">
        {(["VSS","EAC","Intercom"] as SystemType[]).map(s => (
          <button key={s} onClick={() => onSystemFilterChange(s)} className={clsx("h-9 md:h-7 px-3 rounded-lg text-[12px] font-extrabold cursor-pointer", systemFilter === s ? "text-white" : "text-[#8b949e]")} style={systemFilter === s ? { background: s === "VSS" ? "#3b82f6" : s === "EAC" ? "#8b5cf6" : "#14b8a6" } : G.btn}>{s}</button>
        ))}
      </div>
      <div data-tour="wb-al-toggle" className="flex items-center gap-2 mb-2"><button onClick={() => setClientExportMode(!clientExportMode)} className={clsx("h-9 md:h-7 px-3 rounded-lg text-[12px] font-bold cursor-pointer", clientExportMode ? "text-white" : "text-[#8b949e]")} style={clientExportMode ? { background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.30)" } : G.btn}><EyeOff className="w-3 h-3 mr-1" />{clientExportMode ? "Client View" : "Internal View"}</button></div>
      <div data-tour="wb-al-assets-table" className="rounded-2xl overflow-hidden" style={G.card}>
        <div className="w-full px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}><div className="flex items-center gap-2"><h3 className="text-white text-[15px] font-extrabold">Project Assets</h3><span className="text-[#8b949e] text-[12px]">({assetItems.length})</span></div></div>
        <div className="overflow-x-auto"><table className="w-full" style={{ minWidth: clientExportMode ? "400px" : "800px" }}><thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-left">Item</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-center">QTY</th>{!clientExportMode && <><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Cost</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Markup %</th></>}<th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Sell</th>{!clientExportMode && <th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Cost Total</th>}<th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Total</th>{!clientExportMode && <th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Profit</th>}</tr></thead><tbody>{assetItems.length === 0 ? (<tr><td colSpan={clientExportMode ? 4 : 8} className="px-3 py-4 text-[#8b949e] text-[13px] text-center">No project assets yet</td></tr>) : assetItems.map(item => (<tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}><td className="px-3 py-2.5 text-white text-[13px] font-bold">{item.item}</td><td className="px-3 py-2.5 text-white text-[13px] text-center">{item.qty}</td>{!clientExportMode && <><td className="px-3 py-2.5 text-[#8b949e] text-[13px] text-right">{fmt(item.cost)}</td><td className="px-3 py-2.5 text-[#8b949e] text-[13px] text-right">{(item.markupPercent * 100).toFixed(0)}%</td></>}<td className="px-3 py-2.5 text-white text-[13px] font-extrabold text-right">{fmt(item.sell)}</td>{!clientExportMode && <td className="px-3 py-2.5 text-[#8b949e] text-[13px] text-right">{fmt(item.costTotal)}</td>}<td className="px-3 py-2.5 text-white text-[13px] font-extrabold text-right">{fmt(item.total)}</td>{!clientExportMode && <td className="px-3 py-2.5 text-[12px] font-extrabold text-right" style={{ color: item.profit >= 0 ? "#34d399" : "#f87171" }}>{fmt(item.profit)}</td>}</tr>))}</tbody></table></div>
      </div>
    </div>
  );
}
