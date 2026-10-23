import { useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, Plus, X } from "lucide-react";
import { G, PROJECT_COLUMNS, TEAM, TEAM_ALPHABETICAL } from "../../lib/constants";
import { isTechRole, useRole, useSessionUser } from "../../lib/contexts";
import { teamMemberFor } from "../../lib/utils";
import { COLUMNS, SUPPORT_TYPES } from "./shared";
import type { LeadSource, PipelineType, Project, ProjectStage, Stage, SupportType } from "../../types";

export function NewProjectModal({ onClose, onAdd, pipelineType }: { onClose: () => void; onAdd: (p: Project) => void; pipelineType: PipelineType }) {
  const tech = isTechRole(useRole());
  const me = teamMemberFor(useSessionUser().name);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [location, setLocation] = useState("");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<Stage>("lead");
  const [projectStage, setProjectStage] = useState<ProjectStage>("planning");
  const [risk, setRisk] = useState<"low" | "medium" | "high">("low");
  const [dueDate, setDueDate] = useState("");
  const [summary, setSummary] = useState("");
  const [leadSource, setLeadSource] = useState<LeadSource>("Inbound");
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contacts, setContacts] = useState<{ name: string; title: string; email: string; phone: string }[]>([]);
  const addContact = () => {
    if (!contactName.trim()) return;
    setContacts((prev) => [...prev, { name: contactName.trim(), title: contactTitle.trim(), email: contactEmail.trim(), phone: contactPhone.trim() }]);
    setContactName(""); setContactTitle(""); setContactEmail(""); setContactPhone("");
  };
  const removeContact = (idx: number) => setContacts((prev) => prev.filter((_, i) => i !== idx));
  const [notes, setNotes] = useState("");
  const [supportType, setSupportType] = useState<SupportType>("contract-support");
  const [submitting, setSubmitting] = useState(false);
  const [collabSelect, setCollabSelect] = useState("");
  const [collabRole, setCollabRole] = useState("");
  const [collaborators, setCollaborators] = useState<{ name: string; initials: string; color: string; role: string }[]>([]);
  const canSubmit = name.trim() && client.trim();

  const addCollaborator = () => {
    if (!collabSelect) return;
    const member = TEAM.find(t => t.name === collabSelect);
    if (!member || collaborators.find(c => c.name === member.name)) return;
    setCollaborators((prev) => [...prev, { name: member.name, initials: member.initials, color: member.color, role: collabRole.trim() || "Team Member" }]);
    setCollabSelect(""); setCollabRole("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const now = new Date().toISOString();
    const newProject: Project = {
      id: crypto.randomUUID?.() || `p${Date.now()}`,
      name: name.trim(),
      client: client.trim(),
      location: location.trim() || "TBD",
      value: pipelineType === "sales" ? (Math.round(parseFloat(value.replace(/[^0-9.]/g, "")) * (value.includes("M") ? 1_000_000 : value.includes("K") ? 1000 : 1)) || 0) : 0,
      cameras: 0,
      devices: 0,
      stage,
      risk,
      assignee: me,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      summary: summary.trim() || undefined,
      notes: notes.trim() || undefined,
      leadSource: pipelineType === "sales" ? leadSource : undefined,
      collaborators: collaborators.length > 0 ? collaborators : undefined,
      stageHistory: [{ stage: pipelineType === "sales" ? stage : projectStage, date: new Date().toISOString().slice(0, 10) }],
      contacts: (() => { const all = [...contacts, ...(contactName.trim() ? [{ name: contactName.trim(), title: contactTitle.trim(), email: contactEmail.trim(), phone: contactPhone.trim() }] : [])]; return all.length > 0 ? all : undefined; })(),
      createdAt: now,
      updatedAt: now,
      pipelineType,
      projectStage: pipelineType === "project" ? projectStage : undefined,
      supportType: pipelineType === "project" ? supportType : undefined,
    };
    onAdd(newProject);
    setSubmitting(false);
    onClose();
  };

  const inputCls = "w-full h-9 rounded-xl px-3 text-[#e6edf3] text-[14px] placeholder:text-[#484f58] focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all";
  const labelCls = "block text-[#8b949e] text-[12px] font-extrabold uppercase tracking-widest mb-1.5";
  const selectStyle = { ...G.input, background: "#0d1117", color: "#e6edf3" };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 16 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-3xl" style={{ background: "rgba(7,12,26,0.92)", backdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 32px 80px rgba(0,0,0,0.9)" }}>
        <div className="flex items-center justify-between px-5 md:px-7 pt-5 md:pt-7 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div><h2 className="text-white text-[1.2rem] md:text-[1.3rem] font-extrabold">New {pipelineType === "sales" ? "Sales" : "Project"} Project</h2><p className="text-[#8b949e] text-[14px] mt-0.5">Account Owner: {me.name}</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer min-w-[44px] min-h-[44px]" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><X className="w-4 h-4 text-[#8b949e]" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-5 md:px-7 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4"><div className="col-span-2"><label className={labelCls}>Project Name *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HQ — CCTV Upgrade" className={inputCls} style={G.input} /></div></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Client *</label><input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Company name" className={inputCls} style={G.input} /></div>
              <div><label className={labelCls}>Location</label><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Site address" className={inputCls} style={G.input} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {pipelineType === "sales" && (
                <div><label className={labelCls}>Estimated Value</label><input value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 95000" className={inputCls} style={G.input} /></div>
              )}
              {pipelineType === "sales" && (
                <div>
                  <label className={labelCls}>Lead Source</label>
                  <div className="relative">
                    <select value={leadSource} onChange={(e) => setLeadSource(e.target.value as LeadSource)} className={`${inputCls} appearance-none cursor-pointer pr-7`} style={selectStyle}>
                      {(["Tender","Single Source","Inbound","Referral","Recurring Client","Outbound"] as LeadSource[]).map((ls) => (<option key={ls} value={ls} style={{ background: "#0d1117", color: "#e6edf3" }}>{ls}</option>))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" />
                  </div>
                </div>
              )}
              {pipelineType === "project" && <div className="col-span-2" />}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {pipelineType === "sales" ? (
                <div>
                  <label className={labelCls}>Stage</label>
                  <div className="relative">
                    <select value={stage} onChange={(e) => setStage(e.target.value as Stage)} className={`${inputCls} appearance-none cursor-pointer pr-7`} style={selectStyle}>
                      {COLUMNS.map((c) => (<option key={c.id} value={c.id} style={{ background: "#0d1117", color: "#e6edf3" }}>{c.label}</option>))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className={labelCls}>Stage</label>
                  <div className="relative">
                    <select value={projectStage} onChange={(e) => setProjectStage(e.target.value as ProjectStage)} className={`${inputCls} appearance-none cursor-pointer pr-7`} style={selectStyle}>
                      {PROJECT_COLUMNS.map((c) => (<option key={c.id} value={c.id} style={{ background: "#0d1117", color: "#e6edf3" }}>{c.label}</option>))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" />
                  </div>
                </div>
              )}
              <div>
                <label className={labelCls}>Risk</label>
                <div className="relative">
                  <select value={risk} onChange={(e) => setRisk(e.target.value as "low"|"medium"|"high")} className={`${inputCls} appearance-none cursor-pointer pr-7`} style={selectStyle}>
                    {["low","medium","high"].map((r) => (<option key={r} value={r} style={{ background: "#0d1117", color: "#e6edf3" }}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" />
                </div>
              </div>
              <div><label className={labelCls}>Due Date</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} style={{ ...G.input, colorScheme: "dark" }} /></div>
            </div>
            {pipelineType === "project" && (
              <div>
                <label className={labelCls}>Support Type</label>
                <div className="relative">
                  <select value={supportType} onChange={(e) => setSupportType(e.target.value as SupportType)} className={`${inputCls} appearance-none cursor-pointer pr-7`} style={selectStyle}>
                    {SUPPORT_TYPES.map((st) => (<option key={st.id} value={st.id} style={{ background: "#0d1117", color: "#e6edf3" }}>{st.label}</option>))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" />
                </div>
              </div>
            )}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "12px" }}>
              <label className={labelCls}>Collaborators</label>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <select value={collabSelect} onChange={(e) => setCollabSelect(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`} style={selectStyle}>
                    <option value="" style={{ background: "#0d1117", color: "#e6edf3" }}>Select team member</option>
                    {TEAM_ALPHABETICAL.filter(t => !collaborators.find(c => c.name === t.name)).map((t) => (<option key={t.name} value={t.name} style={{ background: "#0d1117", color: "#e6edf3" }}>{t.name}</option>))}
                  </select>
                </div>
                <input value={collabRole} onChange={(e) => setCollabRole(e.target.value)} placeholder="Role" className={`${inputCls} flex-1`} style={G.input} />
                <button type="button" onClick={addCollaborator} className="h-9 px-3 rounded-xl text-white text-[14px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}><Plus className="w-3.5 h-3.5" /></button>
              </div>
              {collaborators.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {collaborators.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[13px] font-bold" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white" style={{ background: c.color }}>{c.initials}</span>
                      {c.name} · {c.role}
                      <button type="button" onClick={() => setCollaborators((prev) => prev.filter((_, j) => j !== i))} className="ml-1 text-[#8b949e] hover:text-rose-400"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {!tech && <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "12px" }}>
              <p className="text-[#8b949e] text-[12px] font-extrabold uppercase tracking-widest mb-3">Contacts (optional)</p>
              {contacts.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {contacts.map((c, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2" style={G.subtle}>
                      <span className="text-[#e6edf3] text-[13px] font-bold truncate">{c.name}{c.title && <span className="text-[#8b949e] font-semibold"> · {c.title}</span>}</span>
                      <button type="button" onClick={() => removeContact(i)} className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-rose-500/10 cursor-pointer"><X className="w-3 h-3 text-rose-400" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Name</label><input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Full name" className={inputCls} style={G.input} /></div>
                <div><label className={labelCls}>Title</label><input value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} placeholder="Job title" className={inputCls} style={G.input} /></div>
                <div><label className={labelCls}>Email</label><input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@company.com" className={inputCls} style={G.input} /></div>
                <div><label className={labelCls}>Phone</label><input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 (876) 555-0000" className={inputCls} style={G.input} /></div>
              </div>
              <button type="button" onClick={addContact} disabled={!contactName.trim()} className="mt-2 flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-extrabold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}><Plus className="w-3 h-3" /> Add Another Contact</button>
            </div>}
            <div><label className={labelCls}>Project Scope</label><textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief description…" rows={3} className="w-full rounded-xl px-3 py-2.5 text-[#e6edf3] text-[14px] placeholder:text-[#484f58] focus:outline-none resize-none" style={G.input} /></div>
            <div><label className={labelCls}>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes…" rows={2} className="w-full rounded-xl px-3 py-2.5 text-[#e6edf3] text-[14px] placeholder:text-[#484f58] focus:outline-none resize-none" style={G.input} /></div>
          </div>
          <div className="px-5 md:px-7 pb-7 pt-4 flex gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[15px] font-bold cursor-pointer min-h-[44px]" style={G.btn}>Cancel</button>
            <button type="submit" disabled={!canSubmit || submitting} className="flex-1 h-10 rounded-xl text-white text-[15px] font-extrabold disabled:opacity-40 cursor-pointer min-h-[44px]" style={{ background: "#3b82f6", boxShadow: canSubmit ? "0 4px 20px rgba(59,130,246,0.4)" : "none" }}>{submitting ? "Adding…" : "Add to Pipeline"}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
