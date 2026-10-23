import { clsx } from "clsx";
import { G } from "../../lib/constants";

export function SummaryBar({ totalCost, totalSell, blendedMargin, fmt }: { totalCost: number; totalSell: number; blendedMargin: number; fmt: (n: number) => string; }) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-4 px-4 py-2.5 rounded-xl mb-3 flex-wrap" style={{ ...G.liquidGlass, borderColor: "rgba(59,130,246,0.25)" }}>
      <div className="flex items-center gap-2"><span className="text-[#8b949e] text-[12px] font-extrabold uppercase">Total Cost</span><span className="text-white text-[16px] font-extrabold">{fmt(totalCost)}</span></div>
      <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.10)" }} />
      <div className="flex items-center gap-2"><span className="text-[#8b949e] text-[12px] font-extrabold uppercase">Total Sell</span><span className="text-emerald-400 text-[16px] font-extrabold">{fmt(totalSell)}</span></div>
      <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.10)" }} />
      <div className="flex items-center gap-2"><span className="text-[#8b949e] text-[12px] font-extrabold uppercase">Blended Margin</span><span className={clsx("text-[16px] font-extrabold", blendedMargin >= 30 ? "text-emerald-400" : blendedMargin >= 15 ? "text-amber-400" : "text-rose-400")}>{blendedMargin.toFixed(1)}%</span></div>
    </div>
  );
}
