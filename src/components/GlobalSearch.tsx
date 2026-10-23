import { useEffect, useRef, useState } from "react";
import { Building2, Cpu, FolderKanban, Hash, Loader2, Search, X } from "lucide-react";
import { API } from "../api";
import type { Page, SearchResults } from "../types";

export const SELECTION_CHANGED = "eest:selection-changed";

const EMPTY: SearchResults = { projects: [], clients: [], devices: [], serials: [] };

// Top-bar search across projects, clients, catalog devices and as-built serial/MAC numbers.
export function GlobalSearch({ navigate }: { navigate: (p: Page) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(EMPTY); return; }
    setLoading(true);
    const t = setTimeout(() => {
      API.search(term).then(setResults).catch(() => setResults(EMPTY)).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (page: Page, key?: string, value?: string) => {
    if (key && value) localStorage.setItem(key, value);
    setOpen(false);
    setQ("");
    navigate(page);
    // Lets the target page reload if it was already open on a different selection.
    window.dispatchEvent(new Event(SELECTION_CHANGED));
  };

  const total = results.projects.length + results.clients.length + results.devices.length + results.serials.length;
  const row = "w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg hover:bg-white/[0.06] cursor-pointer";
  const group = (label: string) => <p className="px-3 pt-2 pb-1 text-[#484f58] text-[10px] font-extrabold uppercase tracking-widest">{label}</p>;

  return (
    <div ref={boxRef} className="relative hidden md:block">
      <div className="flex items-center gap-1.5 h-8 w-[200px] lg:w-[240px] px-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
        {loading ? <Loader2 className="w-3.5 h-3.5 text-[#8b949e] animate-spin" /> : <Search className="w-3.5 h-3.5 text-[#8b949e]" />}
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); (e.target as HTMLInputElement).blur(); } }} placeholder="Search projects, clients, serials…" className="flex-1 min-w-0 bg-transparent text-white text-[13px] focus:outline-none" />
        {q && <button onClick={() => setQ("")} className="cursor-pointer"><X className="w-3 h-3 text-[#8b949e]" /></button>}
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-h-[70vh] overflow-y-auto rounded-xl p-1.5 z-[70]" style={{ background: "rgba(13,17,23,0.98)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}>
          {!loading && total === 0 && <p className="text-[#8b949e] text-[13px] px-3 py-3">No matches</p>}
          {results.projects.length > 0 && <>{group("Projects")}{results.projects.map((p) => (
            <button key={p.id} onClick={() => go("project-detail", "active_project_id", p.id)} className={row}><FolderKanban className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" /><span className="min-w-0"><span className="block text-white text-[13px] font-bold truncate">{p.name}</span><span className="block text-[#8b949e] text-[11px] truncate">{p.client} · {p.pipelineType === "project" ? "Projects" : "Sales"}</span></span></button>
          ))}</>}
          {results.clients.length > 0 && <>{group("Clients")}{results.clients.map((c) => (
            <button key={c.id} onClick={() => go("clients", "active_client_id", c.id)} className={row}><Building2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /><span className="min-w-0"><span className="block text-white text-[13px] font-bold truncate">{c.name}</span><span className="block text-[#8b949e] text-[11px]">{c.projectCount} project{c.projectCount === 1 ? "" : "s"}</span></span></button>
          ))}</>}
          {results.serials.length > 0 && <>{group("Serial / MAC")}{results.serials.map((s) => (
            <button key={s.id} onClick={() => go("project-detail", "active_project_id", s.projectId)} className={row}><Hash className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" /><span className="min-w-0"><span className="block text-white text-[13px] font-bold truncate">{s.serialNumber || s.macAddress}</span><span className="block text-[#8b949e] text-[11px] truncate">{s.deviceName} · {s.projectName}</span></span></button>
          ))}</>}
          {results.devices.length > 0 && <>{group("Device Library")}{results.devices.map((d) => (
            <button key={d.id} onClick={() => go("device-library", "device_library_search", d.name)} className={row}><Cpu className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" /><span className="min-w-0"><span className="block text-white text-[13px] font-bold truncate">{d.name}</span><span className="block text-[#8b949e] text-[11px] truncate">{d.category}{d.sku ? ` · ${d.sku}` : ""}</span></span></button>
          ))}</>}
        </div>
      )}
    </div>
  );
}
