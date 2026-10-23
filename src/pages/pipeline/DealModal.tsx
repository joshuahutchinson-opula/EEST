import { useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Building2, ExternalLink, FileText, Link2, ListTodo, Mail, Package, Paperclip, Pencil, Phone, Save, StickyNote, Trash2, Users, X } from "lucide-react";
import { clsx } from "clsx";
import { DocumentList } from "../../components/DocumentList";
import { TaskList } from "../../components/TaskList";
import { G, LEAD_SOURCE_STYLES, SUPPORT_TYPE_LABELS } from "../../lib/constants";
import { isTechRole, useCurrency, useRole } from "../../lib/contexts";
import { fmtDateFull, getDeduplicatedTeam, projectStageBadge } from "../../lib/utils";
import { WorkbookSynthesisPreview } from "./WorkbookSynthesisPreview";
import { SUPPORT_TYPES } from "./shared";
import type { Column, Page, PipelineType, Project, ProjectColumn, SupportType } from "../../types";

export function DealModal({ project, column, onClose, navigate, onUpdate, onDelete, pipelineType, liveValue }: { project: Project; column: Column | ProjectColumn; onClose: () => void; navigate: (p: Page) => void; onUpdate: (p: Project) => void; onDelete: (id: string) => void; pipelineType: PipelineType; liveValue?: number | null }) {
  const [activeTab, setActiveTab] = useState("info");
  const { fmt } = useCurrency();
  const tech = isTechRole(useRole());
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editClient, setEditClient] = useState(project.client);
  const [editLocation, setEditLocation] = useState(project.location);
  const [editValue, setEditValue] = useState(String(project.value));
  const [editRisk, setEditRisk] = useState(project.risk);
  const [editDueDate, setEditDueDate] = useState(project.dueDate);
  const [editSummary, setEditSummary] = useState(project.summary || "");
  const [editNotes, setEditNotes] = useState(project.notes || "");
  const [editSupportType, setEditSupportType] = useState<SupportType>(project.supportType || "contract-support");
  const [saving, setSaving] = useState(false);
  const ls = project.leadSource ? LEAD_SOURCE_STYLES[project.leadSource] : null;
  const team = getDeduplicatedTeam(project);
  const isProjectPipeline = pipelineType === "project" || project.pipelineType === "project";
  const psBadge = isProjectPipeline ? projectStageBadge(project.projectStage || "planning") : null;

  const handleSave = async () => {
    setSaving(true);
    const updated: Project = { ...project, name: editName, client: editClient, location: editLocation, value: parseFloat(editValue) || project.value, risk: editRisk, dueDate: editDueDate, summary: editSummary, notes: editNotes, supportType: isProjectPipeline ? editSupportType : undefined, updatedAt: new Date().toISOString() };
    onUpdate(updated);
    setEditing(false);
    setSaving(false);
  };

  const copyProjectLink = () => {
    const url = `${window.location.origin}/project/${project.id}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied")).catch(() => toast.error("Failed to copy"));
  };

  const tabs = [
    { id: "info", label: "Info", icon: Building2 },
    { id: "tasks", label: "Tasks", icon: ListTodo },
    { id: "documents", label: "Files", icon: Paperclip },
    ...(tech ? [] : [{ id: "contact", label: "Contact", icon: Phone }]),
    { id: "notes", label: "Notes", icon: StickyNote },
    ...(tech ? [] : [{ id: "workbook", label: "Workbook", icon: FileText }]),
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93, y: 20 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[620px] max-h-[85vh] overflow-y-auto rounded-3xl" style={{ background: "rgba(7,12,26,0.78)", backdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 32px 80px rgba(0,0,0,0.9)" }}>
        <div className="relative px-5 md:px-7 pt-5 md:pt-7 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                {isProjectPipeline && psBadge ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full" style={{ background: `${psBadge.color}22`, color: psBadge.color, border: `1px solid ${psBadge.color}44` }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: psBadge.color }} />{psBadge.label}</span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full" style={{ background: `${column.color}22`, color: column.color, border: `1px solid ${column.color}44` }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: column.color }} />{column.label}</span>
                    {ls && <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: ls.bg, color: ls.text }}>{project.leadSource}</span>}
                  </>
                )}
                {isProjectPipeline && project.supportType && <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>{SUPPORT_TYPE_LABELS[project.supportType]}</span>}
              </div>
              <h2 className="text-white text-[1.2rem] md:text-[1.3rem] font-extrabold leading-snug">{project.name}</h2>
              <p className="text-[#8b949e] text-[14px] md:text-[15px] font-bold mt-1 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 flex-shrink-0" />{project.client}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={copyProjectLink} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><Link2 className="w-3.5 h-3.5 text-[#8b949e]" /></button>
              <button onClick={() => setEditing(!editing)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><Pencil className="w-4 h-4 text-[#8b949e]" /></button>
              <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><X className="w-4 h-4 text-[#8b949e]" /></button>
            </div>
          </div>
          {editing && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" className="w-full h-8 rounded-xl px-2 text-[14px] text-[#e6edf3]" style={G.input} />
              <input value={editClient} onChange={(e) => setEditClient(e.target.value)} placeholder="Client" className="w-full h-8 rounded-xl px-2 text-[14px] text-[#e6edf3]" style={G.input} />
              <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Location" className="w-full h-8 rounded-xl px-2 text-[14px] text-[#e6edf3]" style={G.input} />
              {!isProjectPipeline && <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Value" className="w-full h-8 rounded-xl px-2 text-[14px] text-[#e6edf3]" style={G.input} />}
              <select value={editRisk} onChange={(e) => setEditRisk(e.target.value as "low"|"medium"|"high")} className="w-full h-8 rounded-xl px-2 text-[14px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>{["low","medium","high"].map((r) => <option key={r} value={r} style={{ background: "#0d1117", color: "#e6edf3" }}>{r}</option>)}</select>
              <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="w-full h-8 rounded-xl px-2 text-[14px]" style={{ ...G.input, colorScheme: "dark", background: "#0d1117", color: "#e6edf3" }} />
              {isProjectPipeline && <select value={editSupportType} onChange={(e) => setEditSupportType(e.target.value as SupportType)} className="w-full h-8 rounded-xl px-2 text-[14px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>{SUPPORT_TYPES.map(st => <option key={st.id} value={st.id} style={{ background: "#0d1117", color: "#e6edf3" }}>{st.label}</option>)}</select>}
            </div>
          )}
          {editing && (
            <div className="mt-3 flex gap-2">
              <button onClick={handleSave} disabled={saving} className="flex-1 h-9 rounded-xl text-white text-[15px] font-extrabold cursor-pointer" style={{ background: "#10b981" }}><Save className="w-3.5 h-3.5 inline mr-1" />{saving ? "Saving…" : "Save"}</button>
              <button onClick={() => setEditing(false)} className="flex-1 h-9 rounded-xl text-[#8b949e] text-[15px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 px-5 md:px-7 border-b overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.07)", scrollbarWidth: "none" }}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={clsx("flex items-center gap-1.5 h-9 px-3 text-[13px] font-bold border-b-2 -mb-px transition-all whitespace-nowrap cursor-pointer", activeTab === tab.id ? "border-blue-500 text-white" : "border-transparent text-[#8b949e]")}><tab.icon className="w-3 h-3" />{tab.label}</button>
          ))}
        </div>
        <div className="px-5 md:px-7 py-4">
          {activeTab === "info" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ...(isProjectPipeline
                    ? (liveValue != null ? [{ label: "Value", value: fmt(liveValue, true), color: "#3b82f6" }] : [])
                    : [{ label: "Value", value: fmt(project.value, true), color: "#3b82f6" }]),
                  { label: "Devices", value: String(project.devices), color: "#06b6d4" },
                  { label: "Cameras", value: String(project.cameras), color: "#8b5cf6" },
                  { label: "Due Date", value: fmtDateFull(project.dueDate), color: "#f59e0b" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl px-3 py-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-[12px] font-extrabold uppercase tracking-widest mb-1" style={{ color: "rgba(139,148,158,0.85)" }}>{s.label}</p>
                    <p className="text-[1.4rem] font-extrabold tracking-tight leading-none" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
              {project.summary && <div className="rounded-xl p-3" style={G.subtle}><p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-1">Scope</p><p className="text-[#8b949e] text-[13px]">{project.summary}</p></div>}
              <div className="space-y-2">
                {team.map((m) => (
                  <div key={m.name} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-extrabold text-white" style={{ background: m.color }}>{m.initials}</div>
                    <span className="text-white text-[14px] font-bold">{m.name}</span>
                    <span className="text-[#8b949e] text-[12px]">· {m.roles.join(", ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === "tasks" && <TaskList projectId={project.id} />}
          {activeTab === "documents" && <DocumentList projectId={project.id} />}
          {activeTab === "contact" && (
            <div className="space-y-3">
              {project.contacts && project.contacts.length > 0 ? project.contacts.map((c, i) => (
                <div key={i} className="space-y-1.5 rounded-xl p-3" style={G.subtle}>
                  {c.name && <div className="flex items-center gap-2 text-[#e6edf3] text-[14px]"><Users className="w-3.5 h-3.5 text-[#8b949e]" />{c.name}{c.title && <span className="text-[#8b949e]">· {c.title}</span>}</div>}
                  {c.email && <div className="flex items-center gap-2 text-[#e6edf3] text-[14px]"><Mail className="w-3.5 h-3.5 text-[#8b949e]" />{c.email}</div>}
                  {c.phone && <div className="flex items-center gap-2 text-[#e6edf3] text-[14px]"><Phone className="w-3.5 h-3.5 text-[#8b949e]" />{c.phone}</div>}
                </div>
              )) : <p className="text-[#8b949e] text-[14px]">No contact info added yet.</p>}
            </div>
          )}
          {activeTab === "notes" && <div>{project.notes ? <p className="text-[#8b949e] text-[14px] whitespace-pre-wrap">{project.notes}</p> : <p className="text-[#8b949e] text-[14px]">No notes yet.</p>}</div>}
          {activeTab === "workbook" && (
            <WorkbookSynthesisPreview projectId={project.id} onOpenWorkbook={() => { navigate("workbook"); onClose(); }} />
          )}
        </div>
        <div className="px-5 md:px-7 pb-7 flex gap-2.5">
          <button onClick={() => { navigate("project-detail"); onClose(); }} className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-white text-[15px] font-extrabold cursor-pointer min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 20px rgba(59,130,246,0.4)" }}><ExternalLink className="w-3.5 h-3.5" />Open</button>
          <button onClick={() => { localStorage.setItem("pd_tab", "assets"); navigate("project-detail"); onClose(); }} className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-[#e6edf3] text-[15px] font-extrabold cursor-pointer min-h-[44px]" style={G.btn}><Package className="w-3.5 h-3.5 text-violet-400" />Assets</button>
          {!tech && <button onClick={() => { onDelete(project.id); onClose(); }} className="h-10 px-3 rounded-xl text-rose-400 text-[15px] font-extrabold cursor-pointer min-h-[44px]" style={{ background: "rgba(244,63,94,0.10)", border: "1px solid rgba(244,63,94,0.20)" }}><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
      </motion.div>
    </div>
  );
}
