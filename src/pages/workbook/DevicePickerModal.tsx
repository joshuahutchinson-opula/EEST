import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, X } from "lucide-react";
import { G } from "../../lib/constants";
import type { CatalogDevice } from "../../types";

// Picks a catalog device to add as a line item (description and cost filled from the device).
export function DevicePickerModal({ devices, fmt, onPick, onClose }: { devices: CatalogDevice[]; fmt: (n: number) => string; onPick: (device: CatalogDevice) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? devices.filter((d) => `${d.manufacturer} ${d.model} ${d.sku || ""} ${d.category}`.toLowerCase().includes(q)) : devices;
    return list.slice(0, 100);
  }, [devices, search]);
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[560px] max-h-[75vh] flex flex-col rounded-2xl" style={G.liquidGlass}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 className="text-white text-[16px] font-extrabold">Add from Device Library</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer"><X className="w-4 h-4 text-[#8b949e]" /></button>
        </div>
        <div className="px-5 py-3">
          <div className="flex items-center gap-2 h-9 px-3 rounded-xl" style={G.input}>
            <Search className="w-3.5 h-3.5 text-[#8b949e]" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search manufacturer, model or SKU" className="flex-1 bg-transparent text-white text-[13px] focus:outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {filtered.length === 0 ? (
            <p className="text-[#8b949e] text-[13px] text-center py-6">No matching devices</p>
          ) : filtered.map((d) => (
            <button key={d.id} onClick={() => onPick(d)} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.05] cursor-pointer">
              <div className="min-w-0">
                <p className="text-white text-[13px] font-bold truncate">{d.manufacturer} {d.model}</p>
                <p className="text-[#8b949e] text-[11px] truncate">{d.category}{d.sku ? ` · ${d.sku}` : ""}</p>
              </div>
              <span className="text-[#8b949e] text-[13px] font-extrabold flex-shrink-0">{d.price ? fmt(d.price) : "No price"}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
