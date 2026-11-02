import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { API, ApiError, fileHref } from "../../api";
import { G } from "../../lib/constants";
import type { CatalogDevice, InventoryCategory, InventoryItem, InventoryKind, InventoryLocation } from "../../types";

type Draft = Record<string, string>;

const FIELD_KEYS = ["name", "deviceId", "categoryId", "partNumber", "sizeSpec", "compatibleWith", "supplier", "notes", "lowStockLevel", "serialNumber", "macAddress",
  "purchaseDate", "warrantyExpiry", "purchaseCost", "locationId", "storageSpot"] as const;

const inputCls = "mt-1 w-full h-9 rounded-lg px-3 text-[13px] text-white";
const labelCls = "block text-[#8b949e] text-[11px] font-bold";

// Add or edit (admin only) a tracked unit or a bulk item.
export function ItemFormModal({ kind, item, locations, categories, onClose, onSaved }: { kind: InventoryKind; item?: InventoryItem; locations: InventoryLocation[]; categories: InventoryCategory[]; onClose: () => void; onSaved: (item: InventoryItem) => void }) {
  const [draft, setDraft] = useState<Draft>(() => Object.fromEntries(FIELD_KEYS.map((k) => [k, item?.[k] !== undefined && item?.[k] !== null ? String(item[k]) : ""])));
  const [photos, setPhotos] = useState<string[]>(item?.photos ?? []);
  const [quantity, setQuantity] = useState("0");
  const [devices, setDevices] = useState<CatalogDevice[]>([]);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const unit = kind === "unit";

  useEffect(() => { if (unit) API.devices.list().then(setDevices).catch(() => {}); }, [unit]);
  const set = (k: string, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const linked = devices.find((d) => d.id === draft.deviceId);
  const deviceMatches = useMemo(() => {
    const q = deviceSearch.trim().toLowerCase();
    if (!q) return [];
    return devices.filter((d) => `${d.manufacturer} ${d.model} ${d.sku ?? ""}`.toLowerCase().includes(q)).slice(0, 8);
  }, [devices, deviceSearch]);
  const activeLocations = locations.filter((l) => !l.archived || l.id === draft.locationId);
  const activeCategories = categories.filter((c) => !c.archived || c.id === draft.categoryId);
  const defaultLocation = locations.find((l) => l.isDefault)?.name ?? "Storage Unit";

  const uploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const f of files) { const { url } = await API.inventory.uploadPhoto(f); setPhotos((p) => [...p, url]); }
    } catch { toast.error("Photo upload failed"); }
    setUploading(false);
    e.target.value = "";
  };

  const save = async () => {
    if (!draft.name.trim() && !(unit && draft.deviceId)) { toast.error(unit ? "Give it a name or link a Device Library model" : "Name is required"); return; }
    setSaving(true);
    const body: Record<string, unknown> = { ...draft, photos };
    if (!unit) { for (const k of ["deviceId", "serialNumber", "macAddress", "warrantyExpiry", "purchaseDate", "purchaseCost"]) delete body[k]; }
    else delete body.lowStockLevel;
    try {
      const saved = item ? await API.inventory.updateItem(item.id, body) : await API.inventory.createItem({ ...body, kind, quantity: unit ? 1 : Number(quantity) || 0 } as never);
      toast.success(item ? "Item updated" : unit ? "Unit added" : "Bulk item added");
      onSaved(saved);
    } catch (err) {
      toast.error((err instanceof ApiError ? (err.body as { error?: string } | null)?.error : null) || "Failed to save item");
    } finally { setSaving(false); }
  };

  const field = (key: string, label: string, opts: { type?: string; placeholder?: string } = {}) => (
    <label className={labelCls}>{label}
      <input type={opts.type || "text"} value={draft[key]} placeholder={opts.placeholder} onChange={(e) => set(key, e.target.value)} className={inputCls} style={{ ...G.input, colorScheme: "dark" }} />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[620px] max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4" style={G.liquidGlass}>
        <div className="flex items-center justify-between">
          <div><h3 className="text-white text-[17px] font-extrabold">{item ? "Edit" : "Add"} {unit ? "tracked unit" : "bulk item"}</h3><p className="text-[#8b949e] text-[12px]">{unit ? "One record per physical, serial-numbered unit." : "Counted by quantity. Each type or variant is its own item."}</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer"><X className="w-4 h-4 text-[#8b949e]" /></button>
        </div>

        {unit && (
          <div className={labelCls}>Device Library model (optional)
            {linked ? (
              <div className="mt-1 flex items-center justify-between h-9 rounded-lg px-3" style={G.input}>
                <span className="text-white text-[13px] truncate">{linked.manufacturer} {linked.model}</span>
                <button onClick={() => set("deviceId", "")} className="text-[#8b949e] hover:text-white text-[12px] cursor-pointer">Unlink</button>
              </div>
            ) : draft.deviceId ? (
              <div className="mt-1 flex items-center justify-between h-9 rounded-lg px-3" style={G.input}><span className="text-[#8b949e] text-[13px]">{item?.manufacturer} {item?.model}</span><button onClick={() => set("deviceId", "")} className="text-[#8b949e] hover:text-white text-[12px] cursor-pointer">Unlink</button></div>
            ) : (
              <div className="relative">
                <input value={deviceSearch} onChange={(e) => setDeviceSearch(e.target.value)} placeholder="Search model or SKU…" className={inputCls} style={G.input} />
                {deviceMatches.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg overflow-hidden" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.12)" }}>
                    {deviceMatches.map((d) => (
                      <button key={d.id} onClick={() => { set("deviceId", d.id); setDeviceSearch(""); }} className="w-full text-left px-3 py-2 text-[13px] text-[#e6edf3] hover:bg-white/[0.06] cursor-pointer">{d.manufacturer} {d.model} <span className="text-[#8b949e] text-[11px]">{d.sku}</span></button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <span className="block mt-1 font-normal text-[11px]">Fills make, model and the default photo.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field("name", unit ? "Name (defaults to make + model)" : "Name", { placeholder: unit ? "" : "e.g. Pendant mount, white" })}
          <label className={labelCls}>Category
            <select value={draft.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={`${inputCls} cursor-pointer`} style={{ ...G.input, background: "#0d1117" }}>
              <option value="">None</option>
              {activeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          {unit && field("serialNumber", "Serial number")}
          {unit ? field("macAddress", "MAC address", { placeholder: "AA:BB:CC:DD:EE:FF" }) : field("partNumber", "Part number")}
          {unit ? field("purchaseDate", "Purchase date", { type: "date" }) : field("sizeSpec", "Size / spec", { placeholder: "e.g. 1.5 in, 10 m" })}
          {unit ? field("warrantyExpiry", "Warranty expiry", { type: "date" }) : field("compatibleWith", "Compatible with")}
          {field("supplier", "Supplier")}
          {unit ? field("purchaseCost", "Purchase cost (admin only)", { type: "number" }) : field("lowStockLevel", "Low-stock level", { type: "number", placeholder: "Warn at or below" })}
          {!unit && !item && (
            <label className={labelCls}>Starting quantity
              <input type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} style={G.input} />
            </label>
          )}
          <label className={labelCls}>Location
            <select value={draft.locationId} onChange={(e) => set("locationId", e.target.value)} className={`${inputCls} cursor-pointer`} style={{ ...G.input, background: "#0d1117" }}>
              {!item && <option value="">{defaultLocation}</option>}
              {activeLocations.filter((l) => item || !l.isDefault).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          {field("storageSpot", "Storage spot", { placeholder: "e.g. Shelf B2" })}
        </div>

        <label className={labelCls}>Notes
          <textarea value={draft.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className="mt-1 w-full rounded-lg px-3 py-2 text-[13px] text-white" style={G.input} />
        </label>

        <div>
          <p className={labelCls}>Photos</p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {photos.map((p, i) => (
              <div key={p + i} className="relative w-16 h-16 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
                <img src={fileHref(p)} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-md flex items-center justify-center cursor-pointer" style={{ background: "rgba(0,0,0,0.6)" }}><X className="w-3 h-3 text-white" /></button>
              </div>
            ))}
            <label className="w-16 h-16 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[#8b949e] hover:text-white text-[10px] font-bold cursor-pointer" style={G.btn}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}{uploading ? "" : "Add"}
              <input type="file" accept="image/*" multiple className="hidden" onChange={uploadPhotos} disabled={uploading} />
            </label>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
          <button onClick={save} disabled={saving || uploading} className="flex-1 h-10 rounded-xl text-white text-[14px] font-extrabold cursor-pointer disabled:opacity-50" style={{ background: "#3b82f6" }}>{saving ? "Saving…" : item ? "Save" : "Add"}</button>
        </div>
      </motion.div>
    </div>
  );
}
