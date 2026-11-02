import { useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { G } from "../../lib/constants";
import type { InstallDevice } from "../../types";

// Confirms removing a device from its project; when an inventory unit was installed as the device,
// offers to check it back in to storage (otherwise it is left as "To be returned").
export function RemoveDeviceModal({ device, busy, onConfirm, onClose }: { device: InstallDevice; busy: boolean; onConfirm: (returnUnit: boolean) => void; onClose: () => void }) {
  const [returnUnit, setReturnUnit] = useState(true);
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[400px] rounded-2xl p-6" style={G.liquidGlass}>
        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(244,63,94,0.15)" }}><AlertTriangle className="w-5 h-5 text-rose-400" /></div><h3 className="text-white text-[16px] font-extrabold">Remove {device.name}?</h3></div>
        <p className="text-[#8b949e] text-[14px] mb-4">This removes the device and its as-built details from the project.</p>
        {device.inventoryUnitId && (
          <label className="flex items-start gap-2 mb-5 text-[#e6edf3] text-[13px] cursor-pointer">
            <input type="checkbox" checked={returnUnit} onChange={(e) => setReturnUnit(e.target.checked)} className="mt-0.5" />
            <span>Return its inventory unit to the Storage Unit<span className="block text-[#8b949e] text-[12px]">Untick to leave the unit marked “To be returned”.</span></span>
          </label>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-9 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
          <button disabled={busy} onClick={() => onConfirm(!!device.inventoryUnitId && returnUnit)} className="flex-1 h-9 rounded-xl text-white text-[14px] font-extrabold cursor-pointer disabled:opacity-50" style={{ background: "#f43f5e" }}>{busy ? "Removing…" : "Remove"}</button>
        </div>
      </motion.div>
    </div>
  );
}
