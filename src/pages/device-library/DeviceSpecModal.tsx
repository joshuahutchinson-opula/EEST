import { motion } from "motion/react";
import { Plus, X } from "lucide-react";
import { G } from "../../lib/constants";
import { useCurrency, useQuote } from "../../lib/contexts";
import { DeviceImage } from "./DeviceImage";
import { CAT_COLOR_DS, TAG_STYLES } from "./shared";
import type { CatalogDevice } from "../../types";

export function DeviceSpecModal({ device, onClose }: { device: CatalogDevice; onClose: () => void }) {
  const { addToQuote } = useQuote();
  const { fmt } = useCurrency();
  const cc = CAT_COLOR_DS[device.category] ?? CAT_COLOR_DS.other;
  const specs: { label: string; value?: string }[] = [
    { label: "SKU", value: device.sku },
    { label: "Category", value: cc.label },
    { label: "System", value: device.system },
    { label: "Camera Type", value: device.cameraType },
    { label: "Resolution", value: device.resolution },
    { label: "Sensor", value: device.sensor },
    { label: "Lens", value: device.lens },
    { label: "Frame Rate", value: device.frameRate },
    { label: "Compression", value: device.compression },
    { label: "FOV", value: device.fov },
    { label: "Night Vision", value: device.nightVision },
    { label: "Weather Rating", value: device.weatherRating },
    { label: "Power Input", value: device.powerInput },
    { label: "Storage", value: device.storage },
    { label: "Operating Temp", value: device.operatingTemp },
    { label: "Authentication", value: device.authentication },
    { label: "Channels", value: device.channels },
    { label: "Readers", value: device.readers },
  ].filter((s) => !!s.value);
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93, y: 18 }} transition={{ type: "spring", damping: 26, stiffness: 340 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[780px] max-h-[90vh] overflow-y-auto rounded-3xl flex flex-col md:flex-row" style={{ background: "rgba(7,12,26,0.95)", backdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 40px 100px rgba(0,0,0,0.95)" }}>
        <div className="w-full md:w-56 flex-shrink-0 relative flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)", minHeight: "250px" }}>
          <DeviceImage device={device} className="w-full h-full object-contain p-4" style={{ maxHeight: "320px" }} iconClassName="w-16 h-16 text-[#8b949e]" />
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5">
            <span className="inline-block px-2 py-0.5 rounded-lg text-[12px] font-extrabold uppercase" style={{ background: cc.bg, color: cc.text }}>{cc.label}</span>
            {device.cameraType && <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-extrabold uppercase" style={{ background: "rgba(255,255,255,0.08)", color: "#e6edf3" }}>{device.cameraType}</span>}
            {device.tags?.map((tag) => { const ts = TAG_STYLES[tag]; return ts ? <span key={tag} className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-extrabold uppercase" style={{ background: ts.bg, color: ts.text, border: `1px solid ${ts.border}` }}>{tag}</span> : null; })}
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 md:px-6 pt-5 md:pt-6 pb-4 flex items-start justify-between flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div><p className="text-[#8b949e] text-[13px] font-bold">{device.manufacturer}</p><h2 className="text-white text-[1.3rem] font-extrabold mt-0.5">{device.model}</h2>{device.price && <p className="text-[1.1rem] font-extrabold mt-1" style={{ color: cc.text }}>{fmt(device.price)} <span className="text-[#8b949e] text-[12px] font-medium">/ unit</span></p>}</div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer min-w-[44px] min-h-[44px]" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><X className="w-4 h-4 text-[#8b949e]" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 md:px-6 py-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">{specs.map((s) => (<div key={s.label} className="rounded-xl p-3" style={G.subtle}><p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-1">{s.label}</p><p className="text-white text-[13px] font-bold">{s.value}</p></div>))}</div></div>
          <div className="px-5 md:px-6 py-4 flex items-center gap-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}><button onClick={() => { addToQuote(device); onClose(); }} className="flex items-center gap-2 h-9 px-4 rounded-xl text-white text-[13px] font-extrabold cursor-pointer min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}><Plus className="w-3.5 h-3.5" /> Add to Quote</button></div>
        </div>
      </motion.div>
    </div>
  );
}
