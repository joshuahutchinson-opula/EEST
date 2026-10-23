import { useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { G } from "../lib/constants";
import type { AsBuilt } from "../types";

const FIELDS: { key: keyof AsBuilt; label: string; placeholder: string; type?: string }[] = [
  { key: "serialNumber", label: "Serial number", placeholder: "e.g. ACCC8E123456" },
  { key: "macAddress", label: "MAC address", placeholder: "AA:BB:CC:DD:EE:FF" },
  { key: "ipAddress", label: "IP address", placeholder: "192.168.1.20" },
  { key: "firmware", label: "Firmware", placeholder: "e.g. 11.8.64" },
  { key: "warrantyExpiry", label: "Warranty expiry", placeholder: "", type: "date" },
];

// As-built details for an installed device (serial, MAC, IP, firmware, warranty expiry).
export function AsBuiltModal({ deviceName, value, onSave, onClose }: { deviceName: string; value?: AsBuilt; onSave: (v: AsBuilt) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<AsBuilt>({ serialNumber: value?.serialNumber ?? "", macAddress: value?.macAddress ?? "", ipAddress: value?.ipAddress ?? "", firmware: value?.firmware ?? "", warrantyExpiry: value?.warrantyExpiry ?? "" });
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[420px] rounded-2xl p-6 space-y-3" style={G.liquidGlass}>
        <div className="flex items-center justify-between">
          <div><h3 className="text-white text-[16px] font-extrabold">As-built details</h3><p className="text-[#8b949e] text-[12px]">{deviceName}</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer"><X className="w-4 h-4 text-[#8b949e]" /></button>
        </div>
        {FIELDS.map((f) => (
          <label key={f.key} className="block text-[#8b949e] text-[11px] font-bold">{f.label}
            <input type={f.type || "text"} value={draft[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} className="mt-1 w-full h-9 rounded-lg px-3 text-[13px] text-white" style={{ ...G.input, colorScheme: "dark" }} />
          </label>
        ))}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
          <button onClick={() => onSave(draft)} className="flex-1 h-10 rounded-xl text-white text-[14px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}>Save</button>
        </div>
      </motion.div>
    </div>
  );
}
