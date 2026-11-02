import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Check, Plus, X } from "lucide-react";
import { ApiError } from "../../api";
import { G } from "../../lib/constants";

const errMsg = (err: unknown, fallback: string) => (err instanceof ApiError ? (err.body as { error?: string } | null)?.error : null) || fallback;

interface ManagedEntry { id: string; name: string; archived: boolean; isDefault?: boolean }

// Admin: add, rename and archive inventory locations or categories. Archived entries stay on
// existing items but can't be picked for new ones. The default location can't be archived.
export function ListManagerModal({ title, noun, placeholder, entries, create, update, onClose, onChanged }: {
  title: string; noun: string; placeholder: string; entries: ManagedEntry[];
  create: (name: string) => Promise<unknown>; update: (id: string, data: { name?: string; archived?: boolean }) => Promise<unknown>;
  onClose: () => void; onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [names, setNames] = useState<Record<string, string>>(() => Object.fromEntries(entries.map((l) => [l.id, l.name])));

  const run = async (fn: () => Promise<unknown>, ok: string, fail: string) => {
    try { await fn(); toast.success(ok); onChanged(); } catch (err) { toast.error(errMsg(err, fail)); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[460px] max-h-[85vh] overflow-y-auto rounded-2xl p-6 space-y-4" style={G.liquidGlass}>
        <div className="flex items-center justify-between">
          <h3 className="text-white text-[17px] font-extrabold">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer"><X className="w-4 h-4 text-[#8b949e]" /></button>
        </div>
        <div className="space-y-2">
          {entries.map((l) => {
            const renamed = (names[l.id] ?? l.name).trim();
            return (
              <div key={l.id} className="flex items-center gap-2">
                <input value={names[l.id] ?? l.name} onChange={(e) => setNames({ ...names, [l.id]: e.target.value })} className="flex-1 h-9 rounded-lg px-3 text-[13px]" style={{ ...G.input, color: l.archived ? "#8b949e" : "#fff" }} />
                {renamed && renamed !== l.name && <button onClick={() => run(() => update(l.id, { name: renamed }), `${noun} renamed`, "Failed to rename")} title="Save name" className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: "#10b981" }}><Check className="w-4 h-4 text-white" /></button>}
                {l.isDefault ? <span className="w-9 text-center text-[10px] font-extrabold uppercase text-[#8b949e]" title="New stock and returned units go here">Default</span> : (
                  <button onClick={() => run(() => update(l.id, { archived: !l.archived }), l.archived ? `${noun} restored` : `${noun} archived`, "Failed to update")} title={l.archived ? "Restore" : "Archive"} className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer" style={G.btn}>
                    {l.archived ? <ArchiveRestore className="w-4 h-4 text-[#8b949e]" /> : <Archive className="w-4 h-4 text-[#8b949e]" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) { run(() => create(newName.trim()), `${noun} added`, `Failed to add ${noun.toLowerCase()}`); setNewName(""); } }} placeholder={placeholder} className="flex-1 h-9 rounded-lg px-3 text-[13px] text-white mt-2" style={G.input} />
          <button disabled={!newName.trim()} onClick={() => { run(() => create(newName.trim()), `${noun} added`, `Failed to add ${noun.toLowerCase()}`); setNewName(""); }} className="mt-2 flex items-center gap-1 h-9 px-3 rounded-lg text-white text-[13px] font-extrabold cursor-pointer disabled:opacity-40" style={{ background: "#3b82f6" }}><Plus className="w-3.5 h-3.5" /> Add</button>
        </div>
      </motion.div>
    </div>
  );
}
