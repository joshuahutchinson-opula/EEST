import { useCurrency } from "../lib/contexts";

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();
  return (
    <div className="flex items-center h-8 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
      {(["USD", "JMD"] as const).map((c) => (<button key={c} onClick={() => setCurrency(c)} className="h-full px-2.5 text-[13px] font-extrabold transition-all cursor-pointer" style={currency === c ? { background: "#3b82f6", color: "#fff" } : { color: "#8b949e" }}>{c}</button>))}
    </div>
  );
}
