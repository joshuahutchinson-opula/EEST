import { useEffect, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { computeWorkbookTotals } from "../../../server/src/lib/workbookTotals";
import { API } from "../../api";
import { Skeleton } from "../../components/Skeleton";
import { G, SYSTEM_DISPLAY } from "../../lib/constants";
import { useCurrency } from "../../lib/contexts";
import type { Quote, SynthesisOverride } from "../../types";
import { latestQuoteFor } from "../../lib/utils";

export function WorkbookSynthesisPreview({ projectId, onOpenWorkbook }: { projectId: string; onOpenWorkbook: () => void }) {
  const { fmt } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [overrides, setOverrides] = useState<SynthesisOverride[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([API.quotes.list(), API.workbook.getOverrides(projectId)])
      .then(([quotes, ov]) => { if (!alive) return; setQuote(latestQuoteFor(quotes, projectId) || null); setOverrides(ov); })
      .catch(() => { if (alive) { setQuote(null); setOverrides([]); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [projectId]);

  if (loading) return <div className="space-y-2 py-2"><Skeleton className="h-10 w-full rounded-xl" /><Skeleton className="h-10 w-full rounded-xl" /><Skeleton className="h-20 w-full rounded-2xl" /></div>;

  if (!quote || quote.categories.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <FileText className="w-10 h-10 text-[#484f58]" />
        <p className="text-[#8b949e] text-[14px]">No workbook yet for this project</p>
        <button onClick={onOpenWorkbook} className="h-9 px-5 rounded-xl text-white text-[14px] font-extrabold cursor-pointer min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 20px rgba(59,130,246,0.4)" }}>Open Workbook <ExternalLink className="w-3 h-3 inline ml-1" /></button>
      </div>
    );
  }

  const totals = computeWorkbookTotals(quote.categories, overrides);
  const groupTotals = totals.systems.map(sys => ({ label: SYSTEM_DISPLAY[sys.system].label, value: sys.total })).filter(g => g.value !== 0);
  const grandTotal = totals.subtotal;
  const tax = totals.gct;
  const totalWithTax = totals.total;

  return (
    <div className="space-y-3">
      {groupTotals.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={G.card}>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            {groupTotals.map(g => (
              <div key={g.label} className="flex items-center justify-between px-4 py-2.5"><span className="text-[#8b949e] text-[13px] font-bold">{g.label}</span><span className="text-white text-[14px] font-extrabold">{fmt(g.value)}</span></div>
            ))}
          </div>
        </div>
      )}
      <div className="rounded-2xl p-4" style={{ ...G.card, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.20)" }}>
        <div className="flex justify-between py-1"><span className="text-[#8b949e] text-[13px]">Grand Total</span><span className="text-white text-[15px] font-extrabold">{fmt(grandTotal)}</span></div>
        <div className="flex justify-between py-1"><span className="text-[#8b949e] text-[13px]">Tax (GCT 15%)</span><span className="text-[#8b949e] text-[13px] font-extrabold">{fmt(tax)}</span></div>
        <div className="flex justify-between py-2 mt-1" style={{ borderTop: "2px solid rgba(255,255,255,0.10)" }}><span className="text-white text-[14px] font-extrabold">Total with Tax</span><span className="text-[1.1rem] font-black" style={{ color: "#60a5fa" }}>{fmt(totalWithTax)}</span></div>
      </div>
      <button onClick={onOpenWorkbook} className="w-full h-9 rounded-xl text-white text-[14px] font-extrabold cursor-pointer flex items-center justify-center gap-2 min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 20px rgba(59,130,246,0.4)" }}>Open Full Workbook <ExternalLink className="w-3 h-3" /></button>
    </div>
  );
}
