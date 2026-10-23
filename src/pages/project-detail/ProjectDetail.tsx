import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Activity, AlertTriangle, Building2, Calendar, Camera, CheckCircle2, CheckSquare, ChevronRight, Clock, Copy, DollarSign, FileDown, Fingerprint, History, MapPin, Package, Plus, Share2, FileText } from "lucide-react";
import { clsx } from "clsx";
import { API, downloadBlob } from "../../api";
import { DocumentList } from "../../components/DocumentList";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { TaskList } from "../../components/TaskList";
import { G, LEAD_SOURCE_STYLES, SUPPORT_TYPE_LABELS, TEAM } from "../../lib/constants";
import { isTechRole, useAutoTutorial, useCurrency, useRole } from "../../lib/contexts";
import { computeSynthesisTotal, fmtDate, fmtDateFull, getDeduplicatedTeam, projectStageBadge, stageBadge, latestQuoteFor } from "../../lib/utils";
import { CommissioningTab } from "./CommissioningTab";
import { GanttView } from "./GanttView";
import { ProjectAssetsTab } from "./ProjectAssetsTab";
import { SubcontractorTab } from "./SubcontractorTab";
import type { AuditLogEntry, ChangeOrder, InstallZone, Page, Project, ProjectAsset, Quote, SynthesisOverride, TutorialStep } from "../../types";

export const PD_OVERVIEW_STEPS: TutorialStep[] = [
  { target: "pd-stats", title: "Key Stats", description: "Value, live camera and device counts (pulled straight from the Assets tab), due date, and install progress." },
  { target: "pd-tabs", title: "Everything About This Project", description: "Overview, Tasks, Files, Assets, Change Orders, Audit Log, Timeline, Subcontractors, and Commissioning all live behind these tabs." },
  { target: "pd-scope", title: "Project Scope", description: "A written summary of what this project covers." },
  { target: "pd-team", title: "Team", description: "Everyone assigned to this project and their role." },
  { target: "pd-timeline", title: "Stage Timeline", description: "The full history of stage changes this project has gone through, with dates." },
  { target: "pd-quick-actions", title: "Quick Actions", description: "Jump straight to the Assets tab, the Installation page for this project, or generate a client-facing shareable link." },
];

export function ProjectDetail({ navigate }: { navigate: (p: Page) => void }) {
  const { fmt } = useCurrency();
  const tech = isTechRole(useRole());
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("pd_tab") || "overview");
  useAutoTutorial("project-detail", PD_OVERVIEW_STEPS, activeTab === "overview");
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [showNewCO, setShowNewCO] = useState(false);
  const [newCOTitle, setNewCOTitle] = useState("");
  const [newCODesc, setNewCODesc] = useState("");
  const [newCOCost, setNewCOCost] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [projectAssets, setProjectAssets] = useState<ProjectAsset[]>([]);
  const [installZones, setInstallZones] = useState<InstallZone[]>([]);
  const [projectQuote, setProjectQuote] = useState<Quote | null>(null);
  const [synthOverrides, setSynthOverrides] = useState<SynthesisOverride[]>([]);

  useEffect(() => { localStorage.setItem("pd_tab", activeTab); }, [activeTab]);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.projects.list();
      const activeProjectId = localStorage.getItem("active_project_id");
      const proj = data.find(p => p.id === activeProjectId) || data[0];
      setProject(proj || null);
    } catch { setProject(null); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchProject(); }, [fetchProject]);

  useEffect(() => {
    if (project) {
      API.audit.list(project.id).then(setAuditLog).catch(() => setAuditLog([]));
      API.changeOrders.list(project.id).then(setChangeOrders).catch(() => setChangeOrders([]));
      API.projectAssets.list(project.id).then(setProjectAssets).catch(() => setProjectAssets([]));
      API.install.zones().then(zones => setInstallZones(zones.filter(z => z.projectId === project.id))).catch(() => setInstallZones([]));
      if (project.pipelineType === "project") {
        API.quotes.list().then(qs => setProjectQuote(latestQuoteFor(qs, project.id) || null)).catch(() => setProjectQuote(null));
        API.workbook.getOverrides(project.id).then(setSynthOverrides).catch(() => setSynthOverrides([]));
      }
    }
  }, [project]);

  const handleCreateCO = async () => {
    if (!project || !newCOTitle.trim()) return;
    const co: Partial<ChangeOrder> = { projectId: project.id, title: newCOTitle.trim(), description: newCODesc.trim(), costImpact: parseFloat(newCOCost) || 0, status: "draft" };
    try { const created = await API.changeOrders.create(project.id, co); setChangeOrders((prev) => [...prev, created]); setShowNewCO(false); setNewCOTitle(""); setNewCODesc(""); setNewCOCost(""); toast.success("Change order created"); } catch { toast.error("Failed to create change order"); }
  };

  const handleGenerateShareLink = async () => {
    if (!project) return;
    try { const result = await API.projects.generateShareLink(project.id); setShareUrl(`${window.location.origin}/portal/project/${result.token}`); setShowShareModal(true); } catch { toast.error("Failed to generate link"); }
  };

  const handleRevokeShareLink = async () => {
    if (!project) return;
    try { await API.projects.revokeShareLink(project.id); setShowShareModal(false); toast.success("Link revoked"); } catch { toast.error("Failed to revoke link"); }
  };

  if (loading) return (<div className="px-3 md:px-5 py-4 md:py-6 space-y-4"><Skeleton className="h-8 w-64" /><div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div><Skeleton className="h-64 rounded-2xl" /></div>);
  if (!project) return <EmptyState icon={Building2} title="No project selected" description="Select a project from the Projects tab." />;

  const p = project!;
  const isProjPipe = p.pipelineType === "project";
  const badge = isProjPipe ? projectStageBadge(p.projectStage || "planning") : stageBadge(p.stage);
  const ls = p.leadSource ? LEAD_SOURCE_STYLES[p.leadSource] : null;
  const team = getDeduplicatedTeam(p);
  const tabs = ["overview","tasks","documents","assets","change-orders","audit-log","gantt","subcontractors","commissioning"];
  const tabLabels: Record<string, string> = { overview: "Overview", tasks: "Tasks", documents: "Files", assets: "Assets", "change-orders": "Change Orders", "audit-log": "Audit Log", gantt: "Timeline", subcontractors: "Subcontractors", commissioning: "Commissioning" };
  const stageHistory = p.stageHistory || [{ stage: isProjPipe ? (p.projectStage || "planning") : p.stage, date: p.createdAt?.slice(0,10) || new Date().toISOString().slice(0,10) }];
  const PROJECT_STAGE_VALUES = new Set<string>(["support", "planning", "procurement", "installation", "commissioning", "complete"]);
  const currentPipelineHistory = stageHistory.filter((e) => typeof e.stage !== "string" || (isProjPipe ? PROJECT_STAGE_VALUES.has(e.stage) : !PROJECT_STAGE_VALUES.has(e.stage)));
  const priorPipelineHistory = stageHistory.filter((e) => typeof e.stage === "string" && (isProjPipe ? !PROJECT_STAGE_VALUES.has(e.stage) : PROJECT_STAGE_VALUES.has(e.stage)));
  const liveCameraCount = projectAssets.filter(a => a.category === "camera").reduce((s, a) => s + a.quantity, 0);
  const liveDeviceCount = projectAssets.filter(a => a.category !== "cable-wire").reduce((s, a) => s + a.quantity, 0);
  const installDevices = installZones.flatMap(z => z.devices);
  const liveProgress = installDevices.length > 0 ? Math.round((installDevices.filter(d => d.status === "complete").length / installDevices.length) * 100) : 0;
  const liveValue = isProjPipe ? computeSynthesisTotal(projectQuote, synthOverrides) : null;
  const valueCard = tech ? [] : (isProjPipe
    ? (liveValue != null ? [{ label: "Value", value: fmt(liveValue, true), icon: DollarSign, color: "#3b82f6" }] : [])
    : [{ label: "Value", value: fmt(p.value, true), icon: DollarSign, color: "#3b82f6" }]);

  return (
    <div className="px-3 md:px-5 py-4 md:py-6 max-w-[1600px] mx-auto w-full">
      {showShareModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
          <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={e => e.stopPropagation()} className="relative z-10 w-full max-w-[440px] rounded-2xl p-6" style={G.liquidGlass}>
            <h3 className="text-white text-[16px] font-extrabold mb-2">Shareable Link</h3>
            <p className="text-[#8b949e] text-[13px] mb-4">Clients can view project progress, change orders, and assets — no login, no pricing on assets, no contract value.</p>
            <div className="flex items-center gap-2 mb-4"><input value={shareUrl} readOnly className="flex-1 h-9 rounded-xl px-3 text-[13px] text-white" style={G.input} /><button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Copied"); }} className="h-9 px-3 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}><Copy className="w-3.5 h-3.5" /></button></div>
            <div className="flex gap-2">
              <button onClick={handleRevokeShareLink} className="flex-1 h-9 rounded-xl text-rose-400 text-[14px] font-bold cursor-pointer" style={{ background: "rgba(244,63,94,0.10)", border: "1px solid rgba(244,63,94,0.20)" }}>Revoke Link</button>
              <button onClick={() => setShowShareModal(false)} className="flex-1 h-9 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Close</button>
            </div>
          </motion.div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 md:mb-6 gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={clsx("text-[12px] font-extrabold px-2 py-0.5 rounded-full", badge.cls)}>{badge.label}</span>
            {!isProjPipe && ls && <span className="text-[12px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: ls.bg, color: ls.text }}>{p.leadSource}</span>}
            {!isProjPipe && <span className="text-rose-400 text-[12px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/12">{p.risk.toUpperCase()} RISK</span>}
            {isProjPipe && p.supportType && <span className="text-[12px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>{SUPPORT_TYPE_LABELS[p.supportType]}</span>}
          </div>
          <h1 className="text-white font-extrabold text-3xl md:text-4xl tracking-tight mb-1">{p.name}</h1>
          <p className="text-[#8b949e] text-[14px] md:text-[15px] flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {p.client} · <MapPin className="w-3.5 h-3.5 ml-1" /> {p.location}</p>
        </div>
        <div data-tour="pd-quick-actions" className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {[{ label: "Assets", icon: Package, action: () => setActiveTab("assets") },{ label: "Installation", icon: CheckSquare, action: () => navigate("install-tracker") }].map(({ label, icon: Icon, action }) => (
            <button key={label} onClick={action} className="flex items-center gap-1.5 h-9 px-3 md:px-4 rounded-xl text-white text-[13px] md:text-[14px] font-bold hover:bg-white/[0.10] cursor-pointer min-h-[44px]" style={G.btn}><Icon className="w-3.5 h-3.5" /> {label}</button>
          ))}
          {!tech && isProjPipe && (p.projectStage === "commissioning" || p.projectStage === "complete") && <button onClick={async () => { try { const { blob, filename } = await API.projects.closeoutReport(p.id); downloadBlob(blob, filename); toast.success("Close-out report generated"); } catch { toast.error("Failed to generate close-out report"); } }} className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-white text-[13px] font-bold cursor-pointer" style={G.btn} title="Internal close-out report (Word)"><FileText className="w-3.5 h-3.5" /> Close-out report</button>}
          {!tech && <button onClick={handleGenerateShareLink} className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-white text-[13px] font-bold cursor-pointer" style={G.btn}><Share2 className="w-3.5 h-3.5" /> Share</button>}
        </div>
      </div>
      <div data-tour="pd-stats" className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 mb-4 md:mb-6">
        {[
          ...valueCard,
          { label: "Cameras", value: String(liveCameraCount), icon: Camera, color: "#8b5cf6" },
          { label: "Devices", value: String(liveDeviceCount), icon: Fingerprint, color: "#06b6d4" },
          { label: "Due Date", value: fmtDate(p.dueDate), icon: Calendar, color: "#f59e0b" },
          { label: "Progress", value: `${liveProgress}%`, icon: Activity, color: "#10b981" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-3 md:p-4" style={G.card}>
            <div className="flex items-center justify-between mb-2 md:mb-3"><span className="text-[#8b949e] text-[11px] md:text-[12px] font-extrabold uppercase">{s.label}</span><div className="w-6 h-6 md:w-7 md:h-7 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}><s.icon className="w-3 h-3" style={{ color: s.color }} /></div></div>
            <p className="text-white text-2xl md:text-3xl font-extrabold">{s.value}</p>
          </div>
        ))}
      </div>
      <div data-tour="pd-tabs" className="flex items-center gap-0.5 mb-4 md:mb-5 overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", scrollbarWidth: "none" }}>
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={clsx("h-10 px-3 md:px-4 text-[14px] md:text-[15px] font-bold border-b-2 transition-all -mb-px whitespace-nowrap cursor-pointer min-h-[44px]", activeTab === tab ? "border-blue-500 text-white" : "border-transparent text-[#8b949e]")}>{tabLabels[tab]}</button>
        ))}
      </div>
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <div data-tour="pd-scope" className="rounded-2xl p-4 md:p-5" style={G.card}><h3 className="text-white text-[15px] md:text-[16px] font-extrabold mb-3">Project Scope</h3><p className="text-[#8b949e] text-[14px] leading-relaxed">{p.summary ?? "No scope defined yet."}</p></div>
            <div data-tour="pd-team" className="rounded-2xl p-4 md:p-5" style={G.card}><h3 className="text-white text-[15px] md:text-[16px] font-extrabold mb-4">Team</h3><div className="space-y-3">{team.map((m) => (<div key={m.name} className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl flex items-center justify-center text-[13px] font-extrabold text-white" style={{ background: m.color }}>{m.initials}</div><div><p className="text-white text-[14px] font-bold">{m.name}</p><p className="text-[#8b949e] text-[12px]">{m.roles.join(", ")}</p></div></div>))}</div></div>
          </div>
          <div className="space-y-4">
            <div data-tour="pd-timeline" className="rounded-2xl p-4 md:p-5" style={G.card}>
              <h3 className="text-white text-[15px] md:text-[16px] font-extrabold mb-4">{isProjPipe ? "Project History" : "Timeline"}</h3>
              <div className="space-y-2">
                {currentPipelineHistory.map((entry, i) => {
                  const isLast = i === currentPipelineHistory.length - 1;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className={clsx("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", isLast ? "bg-blue-500/20 ring-2 ring-blue-500/40" : "bg-emerald-500/20")}>{isLast ? <Clock className="w-3 h-3 text-blue-400" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400" />}</div>
                      <div className="flex-1 flex items-center justify-between"><span className={clsx("text-[13px] font-bold", isLast ? "text-white" : "text-[#8b949e]")}>{typeof entry.stage === "string" ? entry.stage.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : entry.stage}</span><span className="text-[#8b949e] text-[12px]">{fmtDateFull(entry.date)}</span></div>
                    </div>
                  );
                })}
              </div>
              {priorPipelineHistory.length > 0 && (
                <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-2">Sales History</p>
                  <div className="space-y-2">
                    {priorPipelineHistory.map((entry, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-white/[0.06]"><CheckCircle2 className="w-3 h-3 text-[#8b949e]" /></div>
                        <div className="flex-1 flex items-center justify-between"><span className="text-[13px] font-bold text-[#8b949e]">{typeof entry.stage === "string" ? entry.stage.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : entry.stage}</span><span className="text-[#8b949e] text-[12px]">{fmtDateFull(entry.date)}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {activeTab === "tasks" && <TaskList projectId={p.id} />}
      {activeTab === "documents" && <DocumentList projectId={p.id} />}
      {activeTab === "change-orders" && (
        <div>
          <div className="flex items-center justify-between mb-3"><p className="text-[#8b949e] text-[13px]">{changeOrders.length} change orders</p><button onClick={() => setShowNewCO(true)} className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}><Plus className="w-3 h-3" /> New Change Order</button></div>
          {showNewCO && (
            <div className="rounded-2xl p-4 mb-3" style={G.card}>
              <div className="space-y-2">
                <input value={newCOTitle} onChange={(e) => setNewCOTitle(e.target.value)} placeholder="Title" className="w-full h-9 rounded-xl px-3 text-[14px] text-[#e6edf3] focus:outline-none" style={G.input} />
                <textarea value={newCODesc} onChange={(e) => setNewCODesc(e.target.value)} placeholder="Description" rows={2} className="w-full rounded-xl px-3 py-2 text-[14px] text-[#e6edf3] focus:outline-none resize-none" style={G.input} />
                {!tech && <input type="number" value={newCOCost} onChange={(e) => setNewCOCost(e.target.value)} placeholder="Cost Impact" className="w-full h-9 rounded-xl px-3 text-[14px] text-[#e6edf3] focus:outline-none" style={G.input} />}
                <div className="flex gap-2"><button onClick={handleCreateCO} className="flex-1 h-9 rounded-xl text-white text-[14px] font-extrabold cursor-pointer" style={{ background: "#10b981" }}>Create</button><button onClick={() => setShowNewCO(false)} className="flex-1 h-9 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button></div>
              </div>
            </div>
          )}
          {changeOrders.length === 0 && !showNewCO ? <EmptyState icon={AlertTriangle} title="No change orders" description="Create one to track scope changes." /> : (
            <div className="space-y-2">{changeOrders.map((co) => (<div key={co.id} className="rounded-2xl p-4" style={G.card}><div className="flex items-center justify-between"><div><p className="text-white text-[15px] font-bold">{co.title}</p>{co.description && <p className="text-[#8b949e] text-[13px] mt-0.5">{co.description}</p>}</div><span className={clsx("text-[12px] font-extrabold px-2 py-0.5 rounded-full", co.status === "approved" ? "bg-emerald-500/12 text-emerald-400" : co.status === "submitted" ? "bg-blue-500/12 text-blue-400" : co.status === "rejected" ? "bg-rose-500/12 text-rose-400" : "bg-amber-500/12 text-amber-400")}>{co.status}</span></div><div className="flex items-center justify-between mt-2"><span className="text-[#8b949e] text-[12px]">{co.createdBy} · {fmtDateFull(co.createdAt)}</span><div className="flex items-center gap-2">{!tech && co.costImpact !== 0 && <span className="text-white text-[14px] font-extrabold">{fmt(co.costImpact)}</span>}{!tech && <button onClick={async () => { try { const { blob, filename } = await API.changeOrders.generateDocx(p.id, co.id); downloadBlob(blob, filename); } catch { toast.error("Failed to generate document"); } }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.08] cursor-pointer" title="Download Change Order document"><FileDown className="w-3.5 h-3.5 text-[#8b949e]" /></button>}</div></div></div>))}</div>
          )}
        </div>
      )}
      {activeTab === "audit-log" && (
        <div>
          {auditLog.length === 0 ? <EmptyState icon={History} title="No audit entries" description="Activity will appear here automatically." /> : (
            <div className="space-y-1">{auditLog.map((entry) => (<div key={entry.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.02]" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}><div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0" style={{ background: TEAM.find(t => t.name === entry.user)?.color || "#3b82f6" }}>{(TEAM.find(t => t.name === entry.user)?.initials || "??")}</div><div className="flex-1 min-w-0"><p className="text-white text-[13px] font-bold">{entry.event}<span className="text-[#484f58] text-[11px] font-semibold ml-1.5">{entry.user}</span></p>{entry.field && entry.oldValue !== undefined && entry.newValue !== undefined ? (<div className="flex items-center gap-1.5 mt-0.5 text-[12px]"><span className="text-[#484f58] font-mono">{entry.field}:</span><span className="text-rose-400 line-through">{entry.oldValue}</span><ChevronRight className="w-3 h-3 text-[#484f58]" /><span className="text-emerald-400">{entry.newValue}</span></div>) : (<p className="text-[#8b949e] text-[12px]">{entry.details}</p>)}</div><span className="text-[#8b949e] text-[12px] flex-shrink-0">{new Date(entry.timestamp).toLocaleString()}</span></div>))}</div>
          )}
        </div>
      )}
      {activeTab === "assets" && <ProjectAssetsTab projectId={p.id} projectName={p.name} clientName={p.client} />}
      {activeTab === "gantt" && <GanttView projectId={p.id} />}
      {activeTab === "subcontractors" && <SubcontractorTab projectId={p.id} />}
      {activeTab === "commissioning" && <CommissioningTab projectId={p.id} />}
    </div>
  );
}
