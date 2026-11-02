import { motion } from "motion/react";
import { Package, X } from "lucide-react";
import { fileHref } from "../../api";
import { G } from "../../lib/constants";
import type { InventoryItem } from "../../types";
import { itemPhoto, itemTitle, UNIT_STATUS_META } from "../inventory/shared";

// Pick the inventory unit that was installed as a device. Candidates come from the server already
// filtered to the device's Device Library model and to units in storage or checked out to the user.
export function UnitPickerModal({ deviceName, units, matchedModel, busy, onPick, onClose }: { deviceName: string; units: InventoryItem[]; matchedModel: boolean; busy: boolean; onPick: (unit: InventoryItem) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[460px] max-h-[85vh] overflow-y-auto rounded-2xl p-6 space-y-3" style={G.liquidGlass}>
        <div className="flex items-center justify-between">
          <div><h3 className="text-white text-[16px] font-extrabold">Which unit did you install?</h3><p className="text-[#8b949e] text-[12px]">{deviceName}{matchedModel ? " · matching model" : ""}</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer"><X className="w-4 h-4 text-[#8b949e]" /></button>
        </div>
        {units.length === 0 ? <p className="text-[#8b949e] text-[13px]">No matching units in storage or checked out to you.</p> : (
          <div className="space-y-1.5">
            {units.map((u) => {
              const photo = itemPhoto(u);
              const meta = u.status ? UNIT_STATUS_META[u.status] : null;
              return (
                <button key={u.id} disabled={busy} onClick={() => onPick(u)} className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-white/[0.06] cursor-pointer disabled:opacity-50" style={G.subtle}>
                  <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)" }}>{photo ? <img src={fileHref(photo)} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-[#8b949e]" />}</div>
                  <div className="flex-1 min-w-0"><p className="text-white text-[13px] font-bold truncate">{itemTitle(u)}</p><p className="text-[#8b949e] text-[11px] font-mono truncate">S/N {u.serialNumber || "—"}{u.macAddress ? ` · ${u.macAddress}` : ""}</p></div>
                  {meta && <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold whitespace-nowrap" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>}
                </button>
              );
            })}
          </div>
        )}
        <button onClick={onClose} className="w-full h-10 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Skip</button>
      </motion.div>
    </div>
  );
}
