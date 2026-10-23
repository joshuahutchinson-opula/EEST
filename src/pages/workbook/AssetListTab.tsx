import { useMemo, useState } from "react";
import { Download, EyeOff } from "lucide-react";
import { clsx } from "clsx";
import { isImportSection } from "../../../server/src/lib/workbookTotals";
import { G } from "../../lib/constants";
import { useAutoTutorial } from "../../lib/contexts";
import { downloadCSV } from "../../lib/utils";
import { recalcLineItem } from "./shared";
import type { AssetListItem, QuoteCategory, SystemType, TutorialStep } from "../../types";

export const ASSET_LIST_STEPS: TutorialStep[] = [
  { target: "wb-al-toggle", title: "Internal / Client View", description: "Toggle Client View to hide cost, markup, and profit columns — exactly what a client should see. Client View can be exported as a CSV." },
  { target: "wb-al-assets-table", title: "Line Items", description: "Every line item in this system's quote: rows synced from the project's Assets tab (labelled Asset, kept in sync automatically) and rows added by hand in the Workbook (labelled Manual)." },
];

export function AssetListTab({ quoteCategories, exchangeRate, fmt, systemFilter, onSystemFilterChange, exportName }: { quoteCategories: QuoteCategory[]; exchangeRate: number; fmt: (n: number, compact?: boolean) => string; systemFilter: SystemType; onSystemFilterChange: (s: SystemType) => void; exportName: string; }) {
  useAutoTutorial("workbook.asset-list", ASSET_LIST_STEPS);
  const [clientExportMode, setClientExportMode] = useState(false);

  const filteredCategories = useMemo(() => quoteCategories.filter(c => c.system === systemFilter && !isImportSection(c.sectionNumber)), [quoteCategories, systemFilter]);

  // Read from the same quote line items every other Workbook tab uses, so it can't drift from
  // Cost & Margin, BOM or Synthesis.
  const items = useMemo(() => {
    const out: AssetListItem[] = [];
    filteredCategories.forEach(cat => {
      cat.lineItems.filter(li => li.quantity > 0).forEach(li => {
        const r = recalcLineItem(li, exchangeRate);
        out.push({ id: li.id, item: li.description, qty: li.quantity, cost: li.unitCost, markupPercent: li.markupPercent, sell: r.sellPrice, costTotal: r.costTotal, total: r.sellTotal, profit: r.profit, isProjectAsset: !!li.projectAssetId, system: cat.system, sourceCategory: cat.name, sourceItemId: li.id });
      });
    });
    return out;
  }, [filteredCategories, exchangeRate]);
  const assetCount = items.filter(i => i.isProjectAsset).length;

  // Client-facing, so in JMD at the quote's locked rate.
  const exportClientView = () => {
    const jmd = (usd: number) => (usd * exchangeRate).toFixed(2);
    const rows = [["Item", "Section", "Qty", "Unit price (JMD)", "Total (JMD)"], ...items.map(i => [i.item, i.sourceCategory || "", String(i.qty), jmd(i.sell), jmd(i.total)])];
    rows.push(["Total", "", "", "", jmd(items.reduce((s, i) => s + i.total, 0))]);
    downloadCSV(`${exportName.replace(/\s+/g, "-")}-${systemFilter}-client-asset-list.csv`, rows);
  };

  const th = "px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest";
  return (
    <div className="space-y-4">
      <div data-tour="wb-al-filter" className="flex items-center gap-2">
        {(["VSS","EAC","Intercom"] as SystemType[]).map(s => (
          <button key={s} onClick={() => onSystemFilterChange(s)} className={clsx("h-9 md:h-7 px-3 rounded-lg text-[12px] font-extrabold cursor-pointer", systemFilter === s ? "text-white" : "text-[#8b949e]")} style={systemFilter === s ? { background: s === "VSS" ? "#3b82f6" : s === "EAC" ? "#8b5cf6" : "#14b8a6" } : G.btn}>{s}</button>
        ))}
      </div>
      <div data-tour="wb-al-toggle" className="flex items-center gap-2 mb-2">
        <button onClick={() => setClientExportMode(!clientExportMode)} className={clsx("flex items-center h-9 md:h-7 px-3 rounded-lg text-[12px] font-bold cursor-pointer", clientExportMode ? "text-white" : "text-[#8b949e]")} style={clientExportMode ? { background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.30)" } : G.btn}><EyeOff className="w-3 h-3 mr-1" />{clientExportMode ? "Client View" : "Internal View"}</button>
        {clientExportMode && <button onClick={exportClientView} disabled={items.length === 0} className="flex items-center gap-1 h-9 md:h-7 px-3 rounded-lg text-[12px] font-bold text-[#8b949e] hover:text-white cursor-pointer disabled:opacity-50" style={G.btn}><Download className="w-3 h-3" /> Export CSV</button>}
      </div>
      <div data-tour="wb-al-assets-table" className="rounded-2xl overflow-hidden" style={G.card}>
        <div className="w-full px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}><div className="flex items-center gap-2"><h3 className="text-white text-[15px] font-extrabold">Line Items</h3><span className="text-[#8b949e] text-[12px]">({items.length} · {assetCount} from assets, {items.length - assetCount} manual)</span></div></div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: clientExportMode ? "400px" : "860px" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th className={`${th} text-left`}>Item</th>
              {!clientExportMode && <th className={`${th} text-left`}>Source</th>}
              <th className={`${th} text-center`}>QTY</th>
              {!clientExportMode && <><th className={`${th} text-right`}>Cost</th><th className={`${th} text-right`}>Markup %</th></>}
              <th className={`${th} text-right`}>Sell</th>
              {!clientExportMode && <th className={`${th} text-right`}>Cost Total</th>}
              <th className={`${th} text-right`}>Total</th>
              {!clientExportMode && <th className={`${th} text-right`}>Profit</th>}
            </tr></thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={clientExportMode ? 4 : 9} className="px-3 py-4 text-[#8b949e] text-[13px] text-center">No line items for this system yet</td></tr>
              ) : items.map(item => (
                <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td className="px-3 py-2.5 text-white text-[13px] font-bold">{item.item}<span className="block text-[#484f58] text-[11px] font-normal">{item.sourceCategory}</span></td>
                  {!clientExportMode && <td className="px-3 py-2.5"><span className={clsx("text-[11px] font-extrabold px-2 py-0.5 rounded-full", item.isProjectAsset ? "bg-blue-500/12 text-blue-400" : "bg-white/[0.06] text-[#8b949e]")}>{item.isProjectAsset ? "Asset" : "Manual"}</span></td>}
                  <td className="px-3 py-2.5 text-white text-[13px] text-center">{item.qty}</td>
                  {!clientExportMode && <><td className="px-3 py-2.5 text-[#8b949e] text-[13px] text-right">{fmt(item.cost)}</td><td className="px-3 py-2.5 text-[#8b949e] text-[13px] text-right">{(item.markupPercent * 100).toFixed(0)}%</td></>}
                  <td className="px-3 py-2.5 text-white text-[13px] font-extrabold text-right">{fmt(item.sell)}</td>
                  {!clientExportMode && <td className="px-3 py-2.5 text-[#8b949e] text-[13px] text-right">{fmt(item.costTotal)}</td>}
                  <td className="px-3 py-2.5 text-white text-[13px] font-extrabold text-right">{fmt(item.total)}</td>
                  {!clientExportMode && <td className="px-3 py-2.5 text-[12px] font-extrabold text-right" style={{ color: item.profit >= 0 ? "#34d399" : "#f87171" }}>{fmt(item.profit)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
