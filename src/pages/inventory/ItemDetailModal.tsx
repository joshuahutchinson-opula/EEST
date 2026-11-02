import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Boxes, Loader2, Package, Pencil, Trash2, X } from "lucide-react";
import { API, ApiError, fileHref } from "../../api";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { G } from "../../lib/constants";
import { isTechRole, useRole } from "../../lib/contexts";
import type { InventoryAction, InventoryItemDetail, InventoryLocation, Project } from "../../types";
import { ItemFormModal } from "./ItemFormModal";
import {
  ACTION_BUTTON_LABELS, actionLabel, BULK_ACTIONS, isLowStock, itemPhoto, itemTitle, TECH_ACTIONS, TECH_CHECK_IN_FROM, UNIT_ACTIONS_FROM, UNIT_STATUS_META, whereLabel,
} from "./shared";

const errMsg = (err: unknown, fallback: string) => (err instanceof ApiError ? (err.body as { error?: string } | null)?.error : null) || fallback;
const when = (d: string) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

// An item's details, the actions available to the viewer, and its full transaction timeline.
export function ItemDetailModal({ itemId, locations, onClose, onChanged }: { itemId: string; locations: InventoryLocation[]; onClose: () => void; onChanged: () => void }) {
  const tech = isTechRole(useRole());
  const [item, setItem] = useState<InventoryItemDetail | null>(null);
  const [action, setAction] = useState<InventoryAction | null>(null);
  const [form, setForm] = useState({ quantity: "", purpose: "", projectId: "", locationId: "", destination: "", notes: "" });
  const [projects, setProjects] = useState<Project[]>([]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => API.inventory.get(itemId).then(setItem).catch(() => { toast.error("Failed to load item"); onClose(); }), [itemId, onClose]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { API.projects.list().then((ps) => setProjects(ps.filter((p) => p.pipelineType === "project"))).catch(() => {}); }, []);

  if (!item) return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center"><div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)" }} /><Loader2 className="relative w-6 h-6 text-blue-400 animate-spin" /></div>
  );

  const unit = item.kind === "unit";
  const available: InventoryAction[] = unit
    ? (Object.keys(UNIT_ACTIONS_FROM) as InventoryAction[]).filter((a) => item.status && UNIT_ACTIONS_FROM[a]!.includes(item.status))
        .filter((a) => !tech || (TECH_ACTIONS.includes(a) && (a !== "check_in" || TECH_CHECK_IN_FROM.includes(item.status!))))
    : BULK_ACTIONS.filter((a) => !tech || TECH_ACTIONS.includes(a));
  const activeLocations = locations.filter((l) => !l.archived);

  const startAction = (a: InventoryAction) => {
    setAction(a);
    setForm({ quantity: a === "adjust" ? String(item.quantityOnHand) : "", purpose: "", projectId: "", locationId: "", destination: "", notes: "" });
  };

  const submitAction = async () => {
    if (!action) return;
    setBusy(true);
    try {
      await API.inventory.act(item.id, {
        action,
        quantity: unit ? undefined : Number(form.quantity),
        purpose: form.purpose || undefined,
        projectId: form.projectId || undefined,
        locationId: form.locationId || undefined,
        destination: form.destination || undefined,
        notes: form.notes || undefined,
      });
      toast.success(ACTION_BUTTON_LABELS[action] + " — logged");
      setAction(null);
      await load();
      onChanged();
    } catch (err) { toast.error(errMsg(err, "Failed to log that")); }
    finally { setBusy(false); }
  };

  const deleteItem = async () => {
    setConfirmDelete(false);
    try { await API.inventory.deleteItem(item.id); toast.success("Item deleted"); onChanged(); onClose(); }
    catch (err) { toast.error(errMsg(err, "Failed to delete item")); }
  };

  const photos = item.photos.length ? item.photos : item.deviceImageUrl ? [item.deviceImageUrl] : [];
  const meta = item.status ? UNIT_STATUS_META[item.status] : null;
  const details: [string, string | undefined][] = unit
    ? [["Make / model", [item.manufacturer, item.model].filter(Boolean).join(" ") || undefined], ["Serial", item.serialNumber], ["MAC", item.macAddress], ["Purchase date", item.purchaseDate],
       ["Warranty expiry", item.warrantyExpiry], ["Supplier", item.supplier], ...(!tech ? [["Purchase cost", item.purchaseCost !== undefined ? item.purchaseCost.toLocaleString("en-US", { style: "currency", currency: "USD" }) : undefined] as [string, string | undefined]] : []),
       ["Location", whereLabel(item)], ["Held by", item.status === "checked_out" ? item.holderName : undefined]]
    : [["Category", item.category], ["Part number", item.partNumber], ["Size / spec", item.sizeSpec], ["Compatible with", item.compatibleWith], ["Supplier", item.supplier],
       ["Low-stock level", item.lowStockLevel?.toString()], ["Location", whereLabel(item)]];
  const needsQty = !unit;
  const inputCls = "mt-1 w-full h-9 rounded-lg px-3 text-[13px] text-white";

  return (
    <>
    {editing && <ItemFormModal kind={item.kind} item={item} locations={locations} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); onChanged(); }} />}
    <ConfirmDialog open={confirmDelete} title="Delete this item?" message="This removes the item and its whole history. Use Retire instead to keep the history." onConfirm={deleteItem} onCancel={() => setConfirmDelete(false)} />
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[760px] max-h-[90vh] overflow-y-auto rounded-2xl p-5 md:p-6 space-y-5" style={G.liquidGlass}>
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
            {itemPhoto(item) ? <img src={fileHref(itemPhoto(item)!)} alt="" className="w-full h-full object-cover" /> : unit ? <Package className="w-7 h-7 text-[#8b949e]" /> : <Boxes className="w-7 h-7 text-[#8b949e]" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest">{unit ? "Tracked unit" : "Bulk stock"}</p>
            <h3 className="text-white text-[18px] font-extrabold truncate">{itemTitle(item)}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {meta && <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-extrabold" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>}
              {!unit && <span className="text-white text-[14px] font-extrabold">{item.quantityOnHand} on hand</span>}
              {isLowStock(item) && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>Low stock</span>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!tech && <button onClick={() => setEditing(true)} title="Edit" className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer"><Pencil className="w-4 h-4 text-[#8b949e]" /></button>}
            {!tech && <button onClick={() => setConfirmDelete(true)} title="Delete" className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-rose-500/10 cursor-pointer"><Trash2 className="w-4 h-4 text-rose-400" /></button>}
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer"><X className="w-4 h-4 text-[#8b949e]" /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
          {details.map(([k, v]) => (
            <div key={k}><p className="text-[#8b949e] text-[11px] font-bold">{k}</p><p className="text-[#e6edf3] text-[13px] break-words">{v || "—"}</p></div>
          ))}
        </div>
        {item.notes && <p className="text-[#c9d1d9] text-[13px] whitespace-pre-wrap rounded-xl p-3" style={G.subtle}>{item.notes}</p>}
        {photos.length > 1 && (
          <div className="flex gap-2 flex-wrap">{photos.map((p, i) => <a key={p + i} href={fileHref(p)} target="_blank" rel="noreferrer"><img src={fileHref(p)} alt="" className="w-16 h-16 rounded-lg object-cover" style={{ border: "1px solid rgba(255,255,255,0.12)" }} /></a>)}</div>
        )}

        {available.length > 0 && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {available.map((a) => (
                <button key={a} onClick={() => (action === a ? setAction(null) : startAction(a))} className="h-8 px-3 rounded-xl text-[12px] font-extrabold cursor-pointer" style={action === a ? { background: "#3b82f6", color: "#fff" } : { ...G.btn, color: a === "mark_defective" ? "#fb7185" : "#e6edf3" }}>{ACTION_BUTTON_LABELS[a]}</button>
              ))}
            </div>
            {action && (
              <div className="rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-3" style={G.subtle}>
                {needsQty && (
                  <label className="block text-[#8b949e] text-[11px] font-bold">{action === "adjust" ? "New on-hand count" : "Quantity"}
                    <input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inputCls} style={G.input} />
                  </label>
                )}
                {(action === "reserve" || action === "check_out") && (
                  <label className="block text-[#8b949e] text-[11px] font-bold">Project{action === "reserve" ? "" : " (optional)"}
                    <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className={`${inputCls} cursor-pointer`} style={{ ...G.input, background: "#0d1117" }}>
                      <option value="">{action === "reserve" ? "Pick a project…" : "None"}</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                )}
                {(action === "check_in" || action === "received") && (
                  <label className="block text-[#8b949e] text-[11px] font-bold">Location
                    <select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className={`${inputCls} cursor-pointer`} style={{ ...G.input, background: "#0d1117" }}>
                      <option value="">{item.locationName ? `Keep (${item.locationName})` : "Storage"}</option>
                      {activeLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </label>
                )}
                {(action === "send_for_repair" || action === "send_to_supplier") && (
                  <label className="block text-[#8b949e] text-[11px] font-bold">Destination
                    <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="e.g. supplier or repair shop" className={inputCls} style={G.input} />
                  </label>
                )}
                <label className="block text-[#8b949e] text-[11px] font-bold">Purpose
                  <input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder={action === "mark_defective" ? "What's wrong?" : "Optional"} className={inputCls} style={G.input} />
                </label>
                <label className="block text-[#8b949e] text-[11px] font-bold sm:col-span-2">Notes
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} style={G.input} />
                </label>
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <button onClick={() => setAction(null)} className="h-9 px-4 rounded-xl text-[#8b949e] text-[13px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
                  <button onClick={submitAction} disabled={busy || (action === "reserve" && !form.projectId) || (needsQty && form.quantity === "")} className="h-9 px-4 rounded-xl text-white text-[13px] font-extrabold cursor-pointer disabled:opacity-50" style={{ background: "#10b981" }}>{busy ? "Saving…" : ACTION_BUTTON_LABELS[action]}</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <h4 className="text-white text-[14px] font-extrabold mb-3">History</h4>
          {item.transactions.length === 0 ? <p className="text-[#8b949e] text-[13px]">No activity yet.</p> : (
            <ol className="relative ml-2 space-y-3" style={{ borderLeft: "1px solid rgba(255,255,255,0.10)" }}>
              {[...item.transactions].reverse().map((tx) => {
                const s = tx.statusAfter ? UNIT_STATUS_META[tx.statusAfter] : null;
                const extras = [
                  tx.projectName && (tx.action === "install" || tx.action === "remove_from_site" ? `at ${tx.projectName}` : `for ${tx.projectName}`),
                  tx.destination && (tx.action === "install" ? `as ${tx.destination}` : `to ${tx.destination}`),
                  tx.locationName && (tx.action === "check_in" || tx.action === "received") && `into ${tx.locationName}`,
                ].filter(Boolean).join(" ");
                return (
                  <li key={tx.id} className="pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full" style={{ background: s?.color ?? "#8b949e" }} />
                    <p className="text-[#e6edf3] text-[13px]">
                      <span className="font-extrabold">{actionLabel(tx)}</span>
                      {!unit && tx.quantity !== 0 && <span className="text-[#8b949e]"> {tx.quantity > 0 ? "+" : ""}{tx.quantity}{tx.quantityAfter !== undefined ? ` → ${tx.quantityAfter}` : ""}</span>}
                      {extras && <span className="text-[#c9d1d9]"> {extras}</span>}
                    </p>
                    <p className="text-[#8b949e] text-[11px]">{when(tx.createdAt)} · {tx.userName}{tx.purpose ? ` · ${tx.purpose}` : ""}</p>
                    {tx.notes && <p className="text-[#8b949e] text-[12px] italic">{tx.notes}</p>}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </motion.div>
    </div>
    </>
  );
}
