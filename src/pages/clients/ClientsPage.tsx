import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, ChevronRight, Loader2, MapPin, Plus, Search, Trash2, Users } from "lucide-react";
import { clsx } from "clsx";
import { API, ApiError } from "../../api";
import { EmptyState } from "../../components/EmptyState";
import { SELECTION_CHANGED } from "../../components/GlobalSearch";
import { Skeleton } from "../../components/Skeleton";
import { G } from "../../lib/constants";
import { isTechRole, useCurrency, useRole } from "../../lib/contexts";
import { projectStageBadge, stageBadge } from "../../lib/utils";
import type { ClientContact, ClientDetail, ClientSummary, Page } from "../../types";

// Client records and every project for a client. Admins can edit names, contacts and sites;
// Tech sees clients they have a project with, without contacts or values.
export function ClientsPage({ navigate }: { navigate: (p: Page) => void }) {
  const tech = isTechRole(useRole());
  const { fmt } = useCurrency();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(() => localStorage.getItem("active_client_id"));
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [draft, setDraft] = useState<{ name: string; contacts: ClientContact[]; sites: string[] } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onChange = () => setSelectedId(localStorage.getItem("active_client_id"));
    window.addEventListener(SELECTION_CHANGED, onChange);
    return () => window.removeEventListener(SELECTION_CHANGED, onChange);
  }, []);
  const loadList = useCallback(() => API.clients.list().then(setClients).catch(() => toast.error("Failed to load clients")).finally(() => setLoading(false)), []);
  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    localStorage.setItem("active_client_id", selectedId);
    setDraft(null);
    API.clients.get(selectedId).then(setDetail).catch(() => { setDetail(null); setSelectedId(null); localStorage.removeItem("active_client_id"); });
  }, [selectedId]);

  const filtered = useMemo(() => { const q = search.trim().toLowerCase(); return q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients; }, [clients, search]);

  const openProject = (id: string) => { localStorage.setItem("active_project_id", id); navigate("project-detail"); };

  const createClient = async () => {
    const name = window.prompt("New client name");
    if (!name?.trim()) return;
    try { const c = await API.clients.create({ name: name.trim() }); await loadList(); setSelectedId(c.id); toast.success("Client added"); }
    catch (err) { toast.error((err instanceof ApiError ? (err.body as { error?: string } | null)?.error : null) || "Failed to add client"); }
  };

  const save = async () => {
    if (!detail || !draft) return;
    setSaving(true);
    try {
      await API.clients.update(detail.id, draft);
      const fresh = await API.clients.get(detail.id);
      setDetail(fresh); setDraft(null); loadList();
      toast.success("Client saved");
    } catch (err) { toast.error((err instanceof ApiError ? (err.body as { error?: string } | null)?.error : null) || "Failed to save client"); }
    finally { setSaving(false); }
  };

  const input = "w-full h-8 rounded-lg px-2 text-[13px] text-white";
  return (
    <div className="px-3 md:px-5 py-4 md:py-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-extrabold text-2xl md:text-3xl tracking-tight">Clients</h1>
          {!tech && <button onClick={createClient} className="flex items-center gap-1 h-8 px-3 rounded-xl text-white text-[13px] font-bold cursor-pointer" style={{ background: "#3b82f6" }}><Plus className="w-3.5 h-3.5" /> Client</button>}
        </div>
        <div className="flex items-center gap-2 h-9 px-3 rounded-xl" style={G.input}><Search className="w-3.5 h-3.5 text-[#8b949e]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients" className="flex-1 bg-transparent text-white text-[13px] focus:outline-none" /></div>
        <div className="rounded-2xl overflow-hidden" style={G.card}>
          {loading ? <div className="p-3 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
            : filtered.length === 0 ? <p className="text-[#8b949e] text-[13px] p-4 text-center">No clients</p>
            : filtered.map((c) => (
              <button key={c.id} onClick={() => setSelectedId(c.id)} className={clsx("w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer hover:bg-white/[0.04]", selectedId === c.id && "bg-white/[0.06]")} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="text-white text-[14px] font-bold truncate">{c.name}</span>
                <span className="text-[#8b949e] text-[12px] flex-shrink-0">{c.projectCount} project{c.projectCount === 1 ? "" : "s"}</span>
              </button>
            ))}
        </div>
      </div>

      <div>
        {!detail ? (
          <div className="rounded-2xl p-8" style={G.card}><EmptyState icon={Building2} title="Select a client" description="Pick a client to see its contacts, sites and every project." /></div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={G.card}>
              <div className="flex items-center justify-between gap-3 mb-4">
                {draft ? <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="flex-1 h-10 rounded-lg px-3 text-[18px] font-extrabold text-white" style={G.input} /> : <h2 className="text-white text-[1.5rem] font-extrabold">{detail.name}</h2>}
                {!tech && (draft
                  ? <div className="flex gap-2"><button onClick={() => setDraft(null)} className="h-8 px-3 rounded-lg text-[#8b949e] text-[13px] font-bold cursor-pointer" style={G.btn}>Cancel</button><button onClick={save} disabled={saving || !draft.name.trim()} className="h-8 px-3 rounded-lg text-white text-[13px] font-extrabold cursor-pointer flex items-center gap-1 disabled:opacity-50" style={{ background: "#3b82f6" }}>{saving && <Loader2 className="w-3 h-3 animate-spin" />}Save</button></div>
                  : <button onClick={() => setDraft({ name: detail.name, contacts: detail.contacts, sites: detail.sites })} className="h-8 px-3 rounded-lg text-white text-[13px] font-bold cursor-pointer" style={G.btn}>Edit</button>)}
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                {!tech && (
                  <div>
                    <p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Contacts</p>
                    {draft ? (
                      <div className="space-y-2">
                        {draft.contacts.map((c, i) => (
                          <div key={i} className="grid grid-cols-2 gap-1.5 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                            {(["name", "title", "email", "phone"] as const).map((k) => <input key={k} value={c[k] || ""} placeholder={k[0].toUpperCase() + k.slice(1)} onChange={(e) => setDraft({ ...draft, contacts: draft.contacts.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)) })} className={input} style={G.input} />)}
                            <button onClick={() => setDraft({ ...draft, contacts: draft.contacts.filter((_, j) => j !== i) })} className="col-span-2 text-left text-rose-400 text-[11px] cursor-pointer flex items-center gap-1"><Trash2 className="w-3 h-3" /> Remove</button>
                          </div>
                        ))}
                        <button onClick={() => setDraft({ ...draft, contacts: [...draft.contacts, { name: "", title: "", email: "", phone: "" }] })} className="text-blue-400 text-[12px] font-bold cursor-pointer flex items-center gap-1"><Plus className="w-3 h-3" /> Add contact</button>
                      </div>
                    ) : detail.contacts.length === 0 ? <p className="text-[#8b949e] text-[13px]">No contacts</p> : detail.contacts.map((c, i) => (
                      <div key={i} className="mb-2"><p className="text-white text-[13px] font-bold">{c.name}{c.title ? <span className="text-[#8b949e] font-normal"> · {c.title}</span> : null}</p><p className="text-[#8b949e] text-[12px]">{[c.email, c.phone].filter(Boolean).join(" · ")}</p></div>
                    ))}
                  </div>
                )}
                <div>
                  <p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> Sites</p>
                  {draft ? (
                    <div className="space-y-1.5">
                      {draft.sites.map((s, i) => <div key={i} className="flex gap-1.5"><input value={s} onChange={(e) => setDraft({ ...draft, sites: draft.sites.map((x, j) => (j === i ? e.target.value : x)) })} className={input} style={G.input} /><button onClick={() => setDraft({ ...draft, sites: draft.sites.filter((_, j) => j !== i) })} className="w-8 h-8 flex items-center justify-center cursor-pointer"><Trash2 className="w-3 h-3 text-rose-400" /></button></div>)}
                      <button onClick={() => setDraft({ ...draft, sites: [...draft.sites, ""] })} className="text-blue-400 text-[12px] font-bold cursor-pointer flex items-center gap-1"><Plus className="w-3 h-3" /> Add site</button>
                    </div>
                  ) : detail.sites.length === 0 ? <p className="text-[#8b949e] text-[13px]">No sites</p> : detail.sites.map((s, i) => <p key={i} className="text-white text-[13px] mb-1">{s}</p>)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={G.card}>
              <p className="px-5 py-3 text-white text-[15px] font-extrabold" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Projects ({detail.projects.length})</p>
              {detail.projects.length === 0 ? <p className="text-[#8b949e] text-[13px] p-5">No projects yet.</p> : detail.projects.map((p) => {
                const badge = p.pipelineType === "project" ? projectStageBadge(p.projectStage || "planning") : stageBadge(p.stage);
                return (
                  <button key={p.id} onClick={() => openProject(p.id)} className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left cursor-pointer hover:bg-white/[0.04]" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="min-w-0">
                      <p className="text-white text-[14px] font-bold truncate">{p.name}</p>
                      <p className="text-[#8b949e] text-[12px] truncate">{p.pipelineType === "project" ? "Projects" : "Sales"}{p.location ? ` · ${p.location}` : ""}{p.assigneeName ? ` · ${p.assigneeName}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!tech && p.value > 0 && <span className="text-[#8b949e] text-[12px] font-bold">{fmt(p.value)}</span>}
                      <span className={clsx("text-[11px] font-extrabold px-2 py-0.5 rounded-full", badge.cls)}>{badge.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#484f58]" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
