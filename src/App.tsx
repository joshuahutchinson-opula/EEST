function KanbanCard({ project, column, dragging, onDragStart, onDragEnd, onClick, onDelete }: { project: Project; column: Column; dragging: string | null; onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void; onDragEnd: () => void; onClick: () => void; onDelete: (id: string) => void; }) {
  const { fmt } = useCurrency(); const isDragging = dragging === project.id; const [menuOpen, setMenuOpen] = useState(false);
  const ls = project.leadSource ? LEAD_SOURCE_STYLES[project.leadSource] : null;
  return (
    <div draggable onDragStart={(e) => { e.stopPropagation(); onDragStart(e, project.id); }} onDragEnd={onDragEnd} onClick={onClick} className={clsx("group relative rounded-2xl cursor-pointer select-none transition-all duration-200", isDragging ? "opacity-25 scale-[0.96]" : "md:hover:-translate-y-1")} style={{ background: "rgba(255,255,255,0.055)", backdropFilter: "blur(24px)", border: isDragging ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,255,255,0.11)", borderLeft: `3px solid ${column.color}`, boxShadow: isDragging ? "none" : "0 2px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.09)" }}>
      <div className="p-3 md:p-4 md:pl-5">
        <div className="flex items-start justify-between gap-2 mb-2"><h3 className="text-white text-[12px] md:text-[13px] font-semibold leading-snug flex-1 min-w-0">{project.name}</h3>
          <div className="relative flex-shrink-0"><button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center mt-0.5 cursor-pointer active:scale-[0.97] transition-transform min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"><MoreHorizontal className="w-3.5 h-3.5 text-[#8b949e]" /></button>
            {menuOpen && <><div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} /><div className="absolute right-0 top-7 z-20 w-40 rounded-xl overflow-hidden py-1" style={{ background: "rgba(7,12,26,0.97)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 32px rgba(0,0,0,0.8)", backdropFilter: "blur(20px)" }}><button onClick={(e) => { e.stopPropagation(); onDelete(project.id); setMenuOpen(false); toast.success("Project deleted"); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-rose-400 text-[12px] font-semibold hover:bg-rose-500/10 transition-colors text-left cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]"><Trash2 className="w-3.5 h-3.5" /> Delete</button></div></>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mb-1"><Building2 className="w-3 h-3 text-[#8b949e] flex-shrink-0" /><span className="text-[#8b949e] text-[10px] md:text-[11px] font-semibold truncate">{project.client}</span></div>
        <div className="flex items-center flex-wrap gap-1.5 mb-2">
          {ls && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: ls.bg, color: ls.text }}>{project.leadSource}</span>}
          <span className={clsx("text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide", project.risk === "high" ? "bg-rose-500/20 text-rose-400" : project.risk === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400")}>{project.risk}</span>
        </div>
        <div className="flex items-center gap-2 mb-2.5"><span className="text-white font-bold text-[14px] md:text-[15px] tracking-tight">{fmt(project.value, true)}</span></div>
        <div className="flex items-center gap-3 mb-3"><span className="flex items-center gap-1 text-[#484f58] text-[10px] md:text-[11px]"><Camera className="w-3 h-3" />{project.cameras} cams</span><span className="flex items-center gap-1 text-[#484f58] text-[10px] md:text-[11px]"><Fingerprint className="w-3 h-3" />{project.devices} devices</span></div>
        <div className="flex items-center justify-between pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: project.assignee.color, boxShadow: `0 0 8px ${project.assignee.color}60` }}>{project.assignee.initials}</div><span className="text-[#8b949e] text-[10px] md:text-[11px] font-medium">{project.assignee.name}</span>{project.collaborators && project.collaborators.length > 0 && <span className="text-[#484f58] text-[10px]">+{project.collaborators.length}</span>}</div>
          <span className="flex items-center gap-1 text-[#484f58] text-[10px] md:text-[11px]"><Calendar className="w-3 h-3" />{fmtDate(project.dueDate)}</span>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ column, projects, totalValue, dragging, isOver, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onCardClick, onDelete }: { column: Column; projects: Project[]; totalValue: number; dragging: string | null; isOver: boolean; onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void; onDragEnd: () => void; onDragOver: (e: React.DragEvent<HTMLDivElement>) => void; onDragLeave: () => void; onDrop: () => void; onCardClick: (p: Project) => void; onDelete: (id: string) => void; }) {
  const { fmt } = useCurrency();
  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} className="w-[260px] md:w-[272px] flex-shrink-0 flex flex-col rounded-2xl transition-all duration-200" style={isOver ? { background: "rgba(59,130,246,0.08)", backdropFilter: "blur(24px)", border: "1px solid rgba(59,130,246,0.35)" } : { background: "rgba(255,255,255,0.032)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 2px 20px rgba(0,0,0,0.3)" }}>
      <div className="px-3.5 pt-3.5 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}><div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2 min-w-0"><div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: column.color, boxShadow: `0 0 10px ${column.color}88` }} /><span className="text-white text-[11px] md:text-[12px] font-bold truncate leading-tight">{column.label}</span></div><span className="text-[#8b949e] text-[10px] md:text-[11px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(255,255,255,0.08)" }}>{projects.length}</span></div><p className="text-[#484f58] text-[10px] md:text-[11px] font-semibold ml-4">{fmt(totalValue, true)}</p></div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ scrollbarWidth: "none", scrollBehavior: "smooth", WebkitOverflowScrolling: "touch", minHeight: "120px", maxHeight: "calc(100vh - 250px)" }}>{projects.map((p) => (<KanbanCard key={p.id} project={p} column={column} dragging={dragging} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={() => onCardClick(p)} onDelete={onDelete} />))}{isOver && <div className="h-14 rounded-xl border-2 border-dashed border-blue-500/35 bg-blue-500/[0.04] flex items-center justify-center"><p className="text-blue-400/60 text-[11px] font-semibold">Drop here</p></div>}{projects.length === 0 && !isOver && <div className="h-14 rounded-xl border border-dashed border-white/[0.04] flex items-center justify-center"><p className="text-[#484f58] text-[11px]">No projects</p></div>}</div>
    </div>
  );
}

function Dashboard({ navigate }: { navigate: (p: Page) => void }) {
  const { fmt } = useCurrency();
  const [projects, setProjects] = useState<Project[]>([]); const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null); const [dragOverCol, setDragOverCol] = useState<Stage | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Project | null>(null); const [showNewProject, setShowNewProject] = useState(false);
  const [progressAnim, setProgressAnim] = useState<{ id: string; stage: Stage } | null>(null);

  const fetchProjects = useCallback(async () => { setLoading(true); try { const data = await API.projects.list(); setProjects(data); } catch { setProjects([]); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const active = projects.filter((p) => !["win", "lose"].includes(p.stage));
  const pipeline = active.reduce((s, p) => s + p.value, 0);
  const won = projects.filter((p) => p.stage === "win"); const closed = projects.filter((p) => ["win", "lose"].includes(p.stage));
  const winRate = closed.length ? Math.round((won.length / closed.length) * 100) : 0;
  const negotiation = projects.filter((p) => p.stage === "negotiation"); const negoValue = negotiation.reduce((s, p) => s + p.value, 0);
  const avgDeal = active.length ? Math.round(pipeline / active.length) : 0;

  const logAudit = async (projectId: string, event: string, details: string) => { try { await API.audit.log(projectId, event, details); } catch {} };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => { setDragging(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragEnd = () => { setDragging(null); setDragOverCol(null); };
  const handleDrop = async (colId: Stage) => {
    if (dragging) {
      const project = projects.find((p) => p.id === dragging);
      if (project && project.stage !== colId && colId !== "lose") { setProgressAnim({ id: dragging, stage: colId }); setTimeout(() => setProgressAnim(null), 1500); }
      const oldStage = project?.stage;
      setProjects((prev) => prev.map((p) => p.id === dragging ? { ...p, stage: colId, stageHistory: [...(p.stageHistory || []), { stage: colId, date: new Date().toISOString().slice(0, 10) }] } : p));
      try { await API.projects.update(dragging, { stage: colId }); await logAudit(dragging, "Stage Change", `Moved from ${oldStage} to ${colId}`); } catch {}
    }
    setDragging(null); setDragOverCol(null);
  };
  const handleDelete = async (id: string) => { setProjects((prev) => prev.filter((p) => p.id !== id)); try { await API.projects.delete(id); toast.success("Project deleted"); } catch { fetchProjects(); } };
  const handleUpdate = async (updated: Project) => { setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p)); setSelectedDeal(updated); try { await API.projects.update(updated.id, updated); await logAudit(updated.id, "Project Edited", "Project details updated"); toast.success("Updated"); } catch { fetchProjects(); } };

  const selectedColumn = selectedDeal ? COLUMNS.find((c) => c.id === selectedDeal.stage)! : null;
  const STAT_COLORS = ["#3b82f6", "#10b981", "#f97316", "#8b5cf6"];

  if (loading) return <div className="px-3 md:px-5 py-4 md:py-6 space-y-4"><Skeleton className="h-10 w-48" /><div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div></div>;

  return (
    <div>
      {selectedDeal && selectedColumn && <DealModal project={selectedDeal} column={selectedColumn} onClose={() => setSelectedDeal(null)} navigate={navigate} onUpdate={handleUpdate} onDelete={(id) => { handleDelete(id); setSelectedDeal(null); }} />}
      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} onAdd={async (p) => { setProjects((prev) => [p, ...prev]); try { await API.projects.create(p); await logAudit(p.id, "Project Created", `Project "${p.name}" created`); } catch { fetchProjects(); } }} />}
      {progressAnim && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[250] px-5 py-3 rounded-2xl flex items-center gap-3" style={{ background: "rgba(16,185,129,0.95)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(16,185,129,0.4)" }}><CheckCircle2 className="w-5 h-5 text-white" /><span className="text-white text-[13px] font-bold">Project advanced to {COLUMNS.find((c) => c.id === progressAnim.stage)?.label}</span></motion.div>}
      <div className="px-3 md:px-5 pt-4 md:pt-6 pb-4 md:pb-5 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-4 md:mb-5"><div><h1 className="text-white font-bold text-lg md:text-xl tracking-tight">Project Pipeline</h1><p className="text-[#8b949e] text-[11px] md:text-[13px] mt-0.5">{projects.length} projects</p></div><button onClick={() => setShowNewProject(true)} className="flex items-center gap-1.5 h-8 px-3 md:px-4 rounded-xl text-white text-[11px] md:text-[12px] font-bold cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}><Plus className="w-3.5 h-3.5" /> New Project</button></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {[{ label: "Active Pipeline", value: pipeline, icon: TrendingUp },{ label: "Win Rate", value: winRate, icon: Star, isPct: true },{ label: "In Negotiation", value: negoValue, icon: BarChart3 },{ label: "Avg Deal Size", value: avgDeal, icon: DollarSign }].map((stat, i) => (
            <div key={stat.label} className="rounded-2xl p-3 md:p-4 transition-all duration-200 md:hover:-translate-y-0.5" style={G.card}><div className="flex items-center justify-between mb-2 md:mb-3"><span className="text-[#8b949e] text-[10px] md:text-[12px] font-extrabold uppercase tracking-[0.08em]">{stat.label}</span><div className="w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center" style={{ background: `${STAT_COLORS[i]}18`, border: `1px solid ${STAT_COLORS[i]}30` }}><stat.icon className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: STAT_COLORS[i] }} /></div></div><p className="text-white text-[1.4rem] md:text-[2rem] font-extrabold tracking-tight leading-none mb-1">{stat.isPct ? `${stat.value}%` : fmt(stat.value as number, true)}</p></div>
          ))}
        </div>
      </div>
      {projects.length === 0 ? <EmptyState icon={Layers} title="No projects yet" description="Create your first project." action={{ label: "New Project", onClick: () => setShowNewProject(true) }} /> : (
        <div className="overflow-x-auto px-3 md:px-5 py-4 md:py-5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent", scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}><div className="flex gap-2 md:gap-3 min-w-max pb-3">{COLUMNS.map((col) => { const colProjects = projects.filter((p) => p.stage === col.id); return <KanbanColumn key={col.id} column={col} projects={colProjects} totalValue={colProjects.reduce((s, p) => s + p.value, 0)} dragging={dragging} isOver={dragOverCol === col.id} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }} onDragLeave={() => setDragOverCol(null)} onDrop={() => handleDrop(col.id)} onCardClick={(p) => setSelectedDeal(p)} onDelete={handleDelete} />; })}</div></div>
      )}
    </div>
  );
}

function NewProjectModal({ onClose, onAdd }: { onClose: () => void; onAdd: (p: Project) => void }) {
  const [name, setName] = useState(""); const [client, setClient] = useState(""); const [location, setLocation] = useState(""); const [value, setValue] = useState(""); const [stage, setStage] = useState<Stage>("assessment-scheduled"); const [risk, setRisk] = useState<"low" | "medium" | "high">("low"); const [dueDate, setDueDate] = useState(""); const [summary, setSummary] = useState(""); const [leadSource, setLeadSource] = useState<LeadSource>("Inbound"); const [contactName, setContactName] = useState(""); const [contactTitle, setContactTitle] = useState(""); const [contactEmail, setContactEmail] = useState(""); const [contactPhone, setContactPhone] = useState(""); const [notes, setNotes] = useState(""); const [submitting, setSubmitting] = useState(false);
  const [collabSelect, setCollabSelect] = useState(""); const [collabRole, setCollabRole] = useState(""); const [collaborators, setCollaborators] = useState<{ name: string; initials: string; color: string; role: string }[]>([]);
  const canSubmit = name.trim() && client.trim();

  const addCollaborator = () => { if (!collabSelect) return; const member = TEAM.find(t => t.name === collabSelect); if (!member || collaborators.find(c => c.name === member.name)) return; setCollaborators((prev) => [...prev, { name: member.name, initials: member.initials, color: member.color, role: collabRole.trim() || "Team Member" }]); setCollabSelect(""); setCollabRole(""); };

  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!canSubmit || submitting) return; setSubmitting(true); const now = new Date().toISOString(); const newProject: Project = { id: crypto.randomUUID?.() || `p${Date.now()}`, name: name.trim(), client: client.trim(), location: location.trim() || "TBD", value: Math.round(parseFloat(value.replace(/[^0-9.]/g, "")) * (value.includes("M") ? 1_000_000 : value.includes("K") ? 1000 : 1)) || 0, cameras: 0, devices: 0, stage, risk, assignee: CURRENT_USER, dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), summary: summary.trim() || undefined, notes: notes.trim() || undefined, leadSource, collaborators: collaborators.length > 0 ? collaborators : undefined, stageHistory: [{ stage, date: new Date().toISOString().slice(0, 10) }], contact: contactName.trim() ? { name: contactName.trim(), title: contactTitle.trim(), email: contactEmail.trim(), phone: contactPhone.trim() } : undefined, createdAt: now, updatedAt: now }; onAdd(newProject); setSubmitting(false); onClose(); };

  const inputCls = "w-full h-9 rounded-xl px-3 text-[#e6edf3] text-[12px] placeholder:text-[#484f58] focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all";
  const labelCls = "block text-[#8b949e] text-[10px] font-bold uppercase tracking-widest mb-1.5";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}><div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} /><motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-3xl" style={{ background: "rgba(7,12,26,0.92)", backdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 32px 80px rgba(0,0,0,0.9)" }}>
      <div className="flex items-center justify-between px-5 md:px-7 pt-5 md:pt-7 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}><div><h2 className="text-white text-[1rem] md:text-[1.1rem] font-bold">New Project</h2><p className="text-[#8b949e] text-[12px] mt-0.5">Account Owner: {CURRENT_USER.name}</p></div><button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer active:scale-[0.97] transition-transform min-w-[44px] min-h-[44px]" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><X className="w-4 h-4 text-[#8b949e]" /></button></div>
      <form onSubmit={handleSubmit}><div className="px-5 md:px-7 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-4"><div className="col-span-2"><label className={labelCls}>Project Name *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HQ — CCTV Upgrade" className={inputCls} style={G.input} /></div></div>
        <div className="grid grid-cols-2 gap-4"><div><label className={labelCls}>Client *</label><input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Company name" className={inputCls} style={G.input} /></div><div><label className={labelCls}>Location</label><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Site address" className={inputCls} style={G.input} /></div></div>
        <div className="grid grid-cols-2 gap-4"><div><label className={labelCls}>Estimated Value</label><input value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 95000" className={inputCls} style={G.input} /></div><div><label className={labelCls}>Lead Source</label><div className="relative"><select value={leadSource} onChange={(e) => setLeadSource(e.target.value as LeadSource)} className={`${inputCls} appearance-none cursor-pointer pr-7`} style={G.input}>{(["Tender","Single Source","Inbound","Referral","Recurring Client","Outbound"] as LeadSource[]).map((ls) => (<option key={ls} value={ls} style={{ background: "#0d1117" }}>{ls}</option>))}</select><ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" /></div></div></div>
        <div className="grid grid-cols-3 gap-4"><div><label className={labelCls}>Stage</label><div className="relative"><select value={stage} onChange={(e) => setStage(e.target.value as Stage)} className={`${inputCls} appearance-none cursor-pointer pr-7`} style={G.input}>{COLUMNS.map((c) => (<option key={c.id} value={c.id} style={{ background: "#0d1117" }}>{c.label}</option>))}</select><ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" /></div></div><div><label className={labelCls}>Risk</label><div className="relative"><select value={risk} onChange={(e) => setRisk(e.target.value as "low"|"medium"|"high")} className={`${inputCls} appearance-none cursor-pointer pr-7`} style={G.input}>{["low","medium","high"].map((r) => (<option key={r} value={r} style={{ background: "#0d1117" }}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>))}</select><ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" /></div></div><div><label className={labelCls}>Due Date</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} style={{ ...G.input, colorScheme: "dark" }} /></div></div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "12px" }}><label className={labelCls}>Collaborators</label><div className="flex gap-2 mb-2"><div className="relative flex-1"><select value={collabSelect} onChange={(e) => setCollabSelect(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`} style={G.input}><option value="">Select team member</option>{TEAM.filter(t => !collaborators.find(c => c.name === t.name)).map((t) => (<option key={t.name} value={t.name} style={{ background: "#0d1117" }}>{t.name}</option>))}</select></div><input value={collabRole} onChange={(e) => setCollabRole(e.target.value)} placeholder="Role" className={`${inputCls} flex-1`} style={G.input} /><button type="button" onClick={addCollaborator} className="h-9 px-3 rounded-xl text-white text-[12px] font-bold cursor-pointer active:scale-[0.97] transition-transform" style={{ background: "#3b82f6" }}><Plus className="w-3.5 h-3.5" /></button></div>{collaborators.length > 0 && <div className="flex flex-wrap gap-2">{collaborators.map((c, i) => (<span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}><span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: c.color }}>{c.initials}</span>{c.name} · {c.role}<button type="button" onClick={() => setCollaborators((prev) => prev.filter((_, j) => j !== i))} className="ml-1 text-[#484f58] hover:text-rose-400"><X className="w-3 h-3" /></button></span>))}</div>}</div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "12px" }}><p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest mb-3">Contact (optional)</p><div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>Name</label><input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Full name" className={inputCls} style={G.input} /></div><div><label className={labelCls}>Title</label><input value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} placeholder="Job title" className={inputCls} style={G.input} /></div><div><label className={labelCls}>Email</label><input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@company.com" className={inputCls} style={G.input} /></div><div><label className={labelCls}>Phone</label><input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 (876) 555-0000" className={inputCls} style={G.input} /></div></div></div>
        <div><label className={labelCls}>Project Scope</label><textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief description…" rows={3} className="w-full rounded-xl px-3 py-2.5 text-[#e6edf3] text-[12px] placeholder:text-[#484f58] focus:outline-none resize-none transition-all" style={G.input} /></div>
        <div><label className={labelCls}>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes…" rows={2} className="w-full rounded-xl px-3 py-2.5 text-[#e6edf3] text-[12px] placeholder:text-[#484f58] focus:outline-none resize-none transition-all" style={G.input} /></div>
      </div><div className="px-5 md:px-7 pb-7 pt-4 flex gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}><button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[13px] font-semibold cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={G.btn}>Cancel</button><button type="submit" disabled={!canSubmit || submitting} className="flex-1 h-10 rounded-xl text-white text-[13px] font-bold transition-all disabled:opacity-40 cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={{ background: "#3b82f6", boxShadow: canSubmit ? "0 4px 20px rgba(59,130,246,0.4)" : "none" }}>{submitting ? "Adding…" : "Add to Pipeline"}</button></div></form>
    </motion.div></div>
  );
}

function DealModal({ project, column, onClose, navigate, onUpdate, onDelete }: { project: Project; column: Column; onClose: () => void; navigate: (p: Page) => void; onUpdate: (p: Project) => void; onDelete: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState("info"); const { fmt } = useCurrency();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(project.name); const [editClient, setEditClient] = useState(project.client); const [editLocation, setEditLocation] = useState(project.location); const [editValue, setEditValue] = useState(String(project.value)); const [editRisk, setEditRisk] = useState(project.risk); const [editDueDate, setEditDueDate] = useState(project.dueDate); const [editSummary, setEditSummary] = useState(project.summary || ""); const [editNotes, setEditNotes] = useState(project.notes || "");
  const [saving, setSaving] = useState(false);
  const ls = project.leadSource ? LEAD_SOURCE_STYLES[project.leadSource] : null;

  const handleSave = async () => { setSaving(true); const updated: Project = { ...project, name: editName, client: editClient, location: editLocation, value: parseFloat(editValue) || project.value, risk: editRisk, dueDate: editDueDate, summary: editSummary, notes: editNotes, updatedAt: new Date().toISOString() }; onUpdate(updated); setEditing(false); setSaving(false); };

  const tabs = [
    { id: "info", label: "Info", icon: Building2 },
    { id: "contact", label: "Contact", icon: Phone },
    { id: "notes", label: "Notes", icon: StickyNote },
    { id: "workbook", label: "Workbook", icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}><div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} /><motion.div initial={{ opacity: 0, scale: 0.93, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[560px] max-h-[85vh] overflow-y-auto rounded-3xl" style={{ background: "rgba(7,12,26,0.78)", backdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 32px 80px rgba(0,0,0,0.9)" }}>
      <div className="relative px-5 md:px-7 pt-5 md:pt-7 pb-3">
        <div className="flex items-start justify-between gap-4"><div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5"><span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full" style={{ background: `${column.color}22`, color: column.color, border: `1px solid ${column.color}44` }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: column.color }} />{column.label}</span>{ls && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: ls.bg, color: ls.text }}>{project.leadSource}</span>}</div>
          <h2 className="text-white text-[1rem] md:text-[1.1rem] font-bold leading-snug">{project.name}</h2>
          <p className="text-[#8b949e] text-[12px] md:text-[13px] font-semibold mt-1 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 flex-shrink-0" />{project.client}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0"><button onClick={() => setEditing(!editing)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer active:scale-[0.97] transition-transform" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><Pencil className="w-4 h-4 text-[#8b949e]" /></button><button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer active:scale-[0.97] transition-transform" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><X className="w-4 h-4 text-[#8b949e]" /></button></div></div>
        {editing && <div className="grid grid-cols-2 gap-2 mt-3"><input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" className="w-full h-8 rounded-xl px-2 text-[12px] bg-transparent text-white" style={G.input} /><input value={editClient} onChange={(e) => setEditClient(e.target.value)} placeholder="Client" className="w-full h-8 rounded-xl px-2 text-[12px] bg-transparent text-white" style={G.input} /><input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Location" className="w-full h-8 rounded-xl px-2 text-[12px] bg-transparent text-white" style={G.input} /><input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Value" className="w-full h-8 rounded-xl px-2 text-[12px] bg-transparent text-white" style={G.input} /><select value={editRisk} onChange={(e) => setEditRisk(e.target.value as "low"|"medium"|"high")} className="w-full h-8 rounded-xl px-2 text-[12px] bg-transparent text-white" style={G.input}>{["low","medium","high"].map((r) => <option key={r} value={r}>{r}</option>)}</select><input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="w-full h-8 rounded-xl px-2 text-[12px] bg-transparent text-white" style={{ ...G.input, colorScheme: "dark" }} /></div>}
        {editing && <div className="mt-3 flex gap-2"><button onClick={handleSave} disabled={saving} className="flex-1 h-9 rounded-xl text-white text-[13px] font-bold cursor-pointer active:scale-[0.97] transition-transform" style={{ background: "#10b981" }}><Save className="w-3.5 h-3.5 inline mr-1" />{saving ? "Saving…" : "Save"}</button><button onClick={() => setEditing(false)} className="flex-1 h-9 rounded-xl text-[#8b949e] text-[13px] font-semibold cursor-pointer active:scale-[0.97] transition-transform" style={G.btn}>Cancel</button></div>}
      </div>

      <div className="flex items-center gap-0.5 px-5 md:px-7 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={clsx("flex items-center gap-1.5 h-9 px-3 text-[11px] font-semibold border-b-2 -mb-px transition-all cursor-pointer active:scale-[0.97] transition-transform", activeTab === tab.id ? "border-blue-500 text-white" : "border-transparent text-[#8b949e]")}>
            <tab.icon className="w-3 h-3" />{tab.label}
          </button>
        ))}
      </div>

      <div className="px-5 md:px-7 py-4">
        {activeTab === "info" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">{[{ label: "Value", value: fmt(project.value, true), color: "#3b82f6" },{ label: "Devices", value: String(project.devices), color: "#06b6d4" },{ label: "Cameras", value: String(project.cameras), color: "#8b5cf6" },{ label: "Due Date", value: fmtDateFull(project.dueDate), color: "#f59e0b" }].map((s) => (<div key={s.label} className="rounded-2xl px-3 py-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}><p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(139,148,158,0.85)" }}>{s.label}</p><p className="text-[1.2rem] font-bold tracking-tight leading-none" style={{ color: s.color }}>{s.value}</p></div>))}</div>
            {project.summary && <div className="rounded-xl p-3" style={G.subtle}><p className="text-[#484f58] text-[9px] font-bold uppercase tracking-widest mb-1">Scope</p><p className="text-[#8b949e] text-[11px]">{project.summary}</p></div>}
            <div className="space-y-2"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ background: project.assignee.color }}>{project.assignee.initials}</div><span className="text-white text-[12px] font-semibold">{project.assignee.name}</span><span className="text-[#484f58] text-[10px]">· Account Owner</span></div>{project.collaborators?.map((c) => (<div key={c.name} className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ background: c.color }}>{c.initials}</div><span className="text-white text-[12px] font-semibold">{c.name}</span><span className="text-[#484f58] text-[10px]">· {c.role}</span></div>))}</div>
          </div>
        )}
        {activeTab === "contact" && (
          <div className="space-y-2">
            {project.contact ? (
              <div className="space-y-2">
                {project.contact.name && <div className="flex items-center gap-2 text-[#e6edf3] text-[12px]"><Users className="w-3.5 h-3.5 text-[#484f58]" />{project.contact.name}{project.contact.title && <span className="text-[#484f58]">· {project.contact.title}</span>}</div>}
                {project.contact.email && <div className="flex items-center gap-2 text-[#e6edf3] text-[12px]"><Mail className="w-3.5 h-3.5 text-[#484f58]" />{project.contact.email}</div>}
                {project.contact.phone && <div className="flex items-center gap-2 text-[#e6edf3] text-[12px]"><Phone className="w-3.5 h-3.5 text-[#484f58]" />{project.contact.phone}</div>}
              </div>
            ) : <p className="text-[#484f58] text-[12px]">No contact info added yet.</p>}
          </div>
        )}
        {activeTab === "notes" && (
          <div>
            {project.notes ? <p className="text-[#8b949e] text-[12px] whitespace-pre-wrap">{project.notes}</p> : <p className="text-[#484f58] text-[12px]">No notes yet.</p>}
          </div>
        )}
        {activeTab === "workbook" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <FileText className="w-10 h-10 text-[#484f58]" />
            <p className="text-[#8b949e] text-[12px]">View full workbook for this project</p>
            <button onClick={() => { navigate("workbook"); onClose(); }} className="h-9 px-5 rounded-xl text-white text-[12px] font-bold cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 20px rgba(59,130,246,0.4)" }}>Open Workbook <ExternalLink className="w-3 h-3 inline ml-1" /></button>
          </div>
        )}
      </div>

      <div className="px-5 md:px-7 pb-7 flex gap-2.5"><button onClick={() => { navigate("project-detail"); onClose(); }} className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-white text-[13px] font-bold cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 20px rgba(59,130,246,0.4)" }}><ExternalLink className="w-3.5 h-3.5" />Open</button><button onClick={() => { navigate("design-canvas"); onClose(); }} className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-[#e6edf3] text-[13px] font-bold cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={G.btn}><Layers className="w-3.5 h-3.5 text-violet-400" />Design</button><button onClick={() => { onDelete(project.id); onClose(); }} className="h-10 px-3 rounded-xl text-rose-400 text-[13px] font-bold cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={{ background: "rgba(244,63,94,0.10)", border: "1px solid rgba(244,63,94,0.20)" }}><Trash2 className="w-3.5 h-3.5" /></button></div>
    </motion.div></div>
  );
}

function MiniFloorPlan({ project }: { project: Project }) {
  const hasDesign = ["design", "proposal", "negotiation", "win"].includes(project.stage);
  const variant = parseInt(project.id.replace(/\D/g, "").slice(-1) || "0") % 3;
  if (!hasDesign) return <div className="w-full h-full flex flex-col items-center justify-center rounded-lg border border-dashed" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.09)" }}><Upload className="w-5 h-5 text-[#484f58] mb-1.5" /><p className="text-[#484f58] text-[10px] font-semibold">No floor plan</p></div>;
  if (variant === 0) return <svg viewBox="0 0 200 112" className="w-full h-full"><rect width="200" height="112" fill="#070c1a" /><rect x="8" y="8" width="184" height="96" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.09)" strokeWidth="1" rx="1" /><rect x="8" y="8" width="60" height="40" fill="rgba(59,130,246,0.05)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" /><rect x="8" y="56" width="60" height="48" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" /><rect x="130" y="8" width="62" height="96" fill="rgba(139,92,246,0.04)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" /><text x="38" y="30" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">RECEPTION</text><text x="38" y="82" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">OFFICE</text><text x="161" y="56" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">SERVER</text><path d={fovPath(18,18,135,80,28)} fill="rgba(59,130,246,0.18)" /><circle cx="18" cy="18" r="2.5" fill="#3b82f6" /><path d={fovPath(182,18,225,80,28)} fill="rgba(59,130,246,0.18)" /><circle cx="182" cy="18" r="2.5" fill="#3b82f6" /><path d={fovPath(18,96,45,80,28)} fill="rgba(59,130,246,0.18)" /><circle cx="18" cy="96" r="2.5" fill="#3b82f6" /><text x="186" y="109" textAnchor="end" fill="rgba(59,130,246,0.4)" fontSize="5" fontFamily="sans-serif">{project.cameras} cams</text></svg>;
  if (variant === 1) return <svg viewBox="0 0 200 112" className="w-full h-full"><rect width="200" height="112" fill="#070c1a" /><rect x="8" y="8" width="184" height="96" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.09)" strokeWidth="1" rx="1" /><rect x="8" y="8" width="184" height="22" fill="rgba(59,130,246,0.04)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" /><rect x="8" y="8" width="60" height="96" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" /><text x="100" y="21" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">LOADING DOCK</text><text x="38" y="68" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">STORAGE</text><text x="133" y="72" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">WAREHOUSE</text>{[30,80,130,180].map((x,i) => <g key={i}><path d={fovPath(x,9,90,100,40)} fill="rgba(59,130,246,0.12)" /><circle cx={x} cy={9} r="2.5" fill="#3b82f6" /></g>)}<text x="186" y="109" textAnchor="end" fill="rgba(59,130,246,0.4)" fontSize="5" fontFamily="sans-serif">{project.cameras} cams</text></svg>;
  return <svg viewBox="0 0 200 112" className="w-full h-full"><rect width="200" height="112" fill="#070c1a" /><rect x="8" y="8" width="86" height="46" fill="rgba(59,130,246,0.05)" stroke="rgba(255,255,255,0.09)" strokeWidth="1" rx="1" /><rect x="106" y="8" width="86" height="46" fill="rgba(139,92,246,0.04)" stroke="rgba(255,255,255,0.09)" strokeWidth="1" rx="1" /><rect x="8" y="62" width="86" height="42" fill="rgba(16,185,129,0.03)" stroke="rgba(255,255,255,0.09)" strokeWidth="1" rx="1" /><rect x="106" y="62" width="86" height="42" fill="rgba(245,158,11,0.03)" stroke="rgba(255,255,255,0.09)" strokeWidth="1" rx="1" /><text x="51" y="30" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">DATA HALL A</text><text x="149" y="30" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">DATA HALL B</text><text x="51" y="84" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">SERVER ROOM</text><text x="149" y="84" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">NOC</text>{[[18,18,135],[78,18,225],[18,98,45],[78,98,315],[118,18,135],[178,18,225],[118,98,45],[178,98,315]].map(([x,y,r],i) => <g key={i}><path d={fovPath(x,y,r,80,24)} fill="rgba(59,130,246,0.15)" /><circle cx={x} cy={y} r="2" fill="#3b82f6" /></g>)}<text x="186" y="109" textAnchor="end" fill="rgba(59,130,246,0.4)" fontSize="5" fontFamily="sans-serif">{project.cameras} cams</text></svg>;
}

function stageBadge(stage: Stage) { const map: Record<Stage, { label: string; cls: string }> = { "assessment-scheduled": { label: "Assessment", cls: "bg-amber-500/12 text-amber-400" }, "assessment-completed": { label: "Assessed", cls: "bg-cyan-500/12 text-cyan-400" }, design: { label: "In Design", cls: "bg-violet-500/12 text-violet-400" }, proposal: { label: "Proposal", cls: "bg-blue-500/12 text-blue-400" }, negotiation: { label: "Negotiating", cls: "bg-orange-500/12 text-orange-400" }, win: { label: "Won", cls: "bg-emerald-500/12 text-emerald-400" }, lose: { label: "Lost", cls: "bg-rose-500/12 text-rose-400" } }; return map[stage]; }

function UploadFloorPlanModal({ onClose, onUpload, mode }: { onClose: () => void; onUpload: (file: File, type: "2d" | "3d") => void; mode: "2d" | "3d" }) {
  const [dragOver, setDragOver] = useState(false); const [file, setFile] = useState<File | null>(null); const [uploading, setUploading] = useState(false);
  const handleUpload = async () => { if (!file) return; setUploading(true); try { onUpload(file, mode); onClose(); } catch { toast.error("Upload failed"); } finally { setUploading(false); } };
  const twoDAccept = "image/*,.pdf,.dwg,.dxf";
  const threeDAccept = "image/*,.glb,.gltf,.obj,.stl,.fbx";
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}><div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} /><motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[480px] rounded-3xl" style={{ background: "rgba(7,12,26,0.92)", backdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 32px 80px rgba(0,0,0,0.9)" }}><div className="flex items-center justify-between px-6 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}><div><h2 className="text-white text-[1rem] font-bold">Upload {mode === "2d" ? "Floor Plan" : "3D Model / Rendering"}</h2><p className="text-[#484f58] text-[10px] mt-1">{mode === "2d" ? "PNG, JPG, PDF, DWG, DXF" : "PNG, JPG, GLB, GLTF, OBJ, STL, FBX"}</p></div><button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer active:scale-[0.97] transition-transform min-w-[44px] min-h-[44px]" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><X className="w-4 h-4 text-[#8b949e]" /></button></div><div className="p-6"><div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length > 0) setFile(e.dataTransfer.files[0]); }} className={clsx("border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer", dragOver ? "border-violet-400 bg-violet-500/[0.06]" : file ? "border-emerald-500/40 bg-emerald-500/[0.03]" : "border-white/[0.10] hover:border-white/[0.20]")} onClick={() => document.getElementById("floorplan-upload-2")?.click()}><input id="floorplan-upload-2" type="file" accept={mode === "2d" ? twoDAccept : threeDAccept} className="hidden" onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />{file ? <div className="space-y-2"><div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}><CheckCircle2 className="w-6 h-6 text-emerald-400" /></div><p className="text-white text-[13px] font-semibold">{file.name}</p><p className="text-[#484f58] text-[11px]">{(file.size / 1024).toFixed(0)} KB</p></div> : <div className="space-y-3"><div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)" }}><Upload className="w-6 h-6 text-violet-400" /></div><div><p className="text-white text-[13px] font-semibold">Drag & drop your {mode === "2d" ? "floor plan" : "3D file"}</p><p className="text-[#484f58] text-[11px] mt-1">or click to browse files</p></div></div>}</div><div className="flex gap-3 mt-5"><button onClick={onClose} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[13px] font-semibold cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={G.btn}>Cancel</button><button onClick={handleUpload} disabled={!file || uploading} className="flex-1 h-10 rounded-xl text-white text-[13px] font-bold disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={{ background: "#8b5cf6", boxShadow: file ? "0 4px 20px rgba(139,92,246,0.4)" : "none" }}>{uploading ? "Uploading…" : "Upload"}</button></div></div></motion.div></div>
  );
}

function SelectProjectModal({ onClose, onSelect, currentId, projects }: { onClose: () => void; onSelect: (id: string) => void; currentId: string; projects: Project[] }) {
  const [search, setSearch] = useState(""); const filtered = search.trim() ? projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase())) : projects;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}><div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }} /><motion.div initial={{ opacity: 0, scale: 0.94, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[500px] max-h-[80vh] overflow-y-auto rounded-3xl" style={{ background: "rgba(7,12,26,0.95)", backdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 32px 80px rgba(0,0,0,0.9)" }}><div className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}><h2 className="text-white text-[1rem] font-bold">Select Project</h2><button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer active:scale-[0.97] transition-transform min-w-[44px] min-h-[44px]" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><X className="w-4 h-4 text-[#8b949e]" /></button></div><div className="px-4 py-3"><div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#484f58]" /><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects…" className="w-full h-9 rounded-xl pl-8 pr-3 text-[13px] text-[#e6edf3] focus:outline-none" style={G.input} /></div></div><div className="max-h-[340px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>{filtered.map((p) => (<button key={p.id} onClick={() => { onSelect(p.id); onClose(); }} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/[0.04] transition-colors text-left cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: p.id === currentId ? "rgba(59,130,246,0.06)" : "transparent" }}><div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: p.assignee.color }}>{p.assignee.initials}</div><div className="flex-1 min-w-0"><p className="text-white text-[13px] font-semibold truncate">{p.name}</p><p className="text-[#8b949e] text-[11px] truncate">{p.client}</p></div>{p.id === currentId && <CheckCircle2 className="w-4 h-4 text-blue-400" />}</button>))}</div></motion.div></div>
  );
}

function DesignStudio({ navigate }: { navigate: (p: Page) => void }) {
  const { fmt } = useCurrency();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<"all" | Stage>("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showUploadModal, setShowUploadModal] = useState<"2d" | "3d" | null>(null);
  const [studioView, setStudioView] = useState<"projects" | "canvas">("projects");
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [canvasImageUrl, setCanvasImageUrl] = useState<string>("");
  const [canvas3DUrl, setCanvas3DUrl] = useState<string>("");
  const [view3D, setView3D] = useState(false);
  const [floorPlanOpacity, setFloorPlanOpacity] = useState(1);
  const [floorPlanScale, setFloorPlanScale] = useState(1);
  const [floorPlanRotation, setFloorPlanRotation] = useState(0);

  const fetchProjects = useCallback(async () => { setLoading(true); try { const data = await API.projects.list(); setProjects(data); if (data.length > 0 && !activeProjectId) setActiveProjectId(data[0].id); } catch { setProjects([]); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleUpload = async (file: File, type: "2d" | "3d") => {
    if (!activeProjectId) { toast.error("Select a project first"); return; }
    try { const result = await API.canvas.upload(activeProjectId, file); if (type === "2d") { setCanvasImageUrl(result.url); setStudioView("canvas"); } else { setCanvas3DUrl(result.url); } toast.success(type === "2d" ? "Floor plan uploaded" : "3D file uploaded"); } catch { toast.error("Upload failed"); }
  };

  const filtered = useMemo(() => { let result = projects; if (filter !== "all") result = result.filter((p) => p.stage === filter); if (search.trim()) { const q = search.toLowerCase(); result = result.filter((p) => p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)); } return result; }, [projects, filter, search]);
  const stageFilters: { id: "all" | Stage; label: string }[] = [{ id: "all", label: "All" },{ id: "design", label: "In Design" },{ id: "proposal", label: "Proposal" },{ id: "win", label: "Won" }];
  const handleDelete = async (id: string) => { setProjects((prev) => prev.filter((p) => p.id !== id)); try { await API.projects.delete(id); toast.success("Project removed"); } catch { fetchProjects(); } };

  if (loading) return <div className="px-3 md:px-5 py-4 md:py-6 space-y-4"><Skeleton className="h-10 w-56" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div></div>;

  return (
    <div className="px-3 md:px-5 py-4 md:py-6">
      {showUploadModal && <UploadFloorPlanModal onClose={() => setShowUploadModal(null)} onUpload={handleUpload} mode={showUploadModal} />}
      <div className="flex items-center justify-between mb-4 md:mb-6"><div><h1 className="text-white font-bold text-lg md:text-xl tracking-tight">System Design Studio</h1></div><div className="flex items-center gap-2"><div className="flex items-center rounded-xl p-0.5 gap-0.5" style={G.btn}><button onClick={() => setStudioView("projects")} className={clsx("h-7 px-3 rounded-lg text-[11px] md:text-[12px] font-semibold transition-all cursor-pointer active:scale-[0.97] transition-transform", studioView === "projects" ? "text-white" : "text-[#484f58]")} style={studioView === "projects" ? { background: "rgba(255,255,255,0.12)" } : undefined}>Projects</button><button onClick={() => setStudioView("canvas")} className={clsx("h-7 px-3 rounded-lg text-[11px] md:text-[12px] font-semibold transition-all cursor-pointer active:scale-[0.97] transition-transform", studioView === "canvas" ? "text-white" : "text-[#484f58]")} style={studioView === "canvas" ? { background: "rgba(255,255,255,0.12)" } : undefined}>Canvas</button></div>{studioView === "projects" && <div className="flex items-center rounded-xl p-0.5 gap-0.5" style={G.btn}>{(["grid","list"] as const).map((m) => (<button key={m} onClick={() => setViewMode(m)} className={clsx("w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-[0.97] transition-transform", viewMode === m ? "text-white" : "text-[#484f58]")} style={viewMode === m ? { background: "rgba(255,255,255,0.12)" } : undefined}>{m === "grid" ? <Grid3x3 className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}</button>))}</div>}</div></div>

      {studioView === "canvas" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowUploadModal("2d")} className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-white text-[11px] font-semibold cursor-pointer active:scale-[0.97] transition-transform" style={G.btn}><Upload className="w-3 h-3" /> Upload 2D Floor Plan</button>
            <button onClick={() => setShowUploadModal("3d")} className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-white text-[11px] font-semibold cursor-pointer active:scale-[0.97] transition-transform" style={G.btn}><Box className="w-3 h-3" /> Upload 3D Model/Rendering</button>
            {(canvasImageUrl || canvas3DUrl) && (
              <button onClick={() => setView3D(!view3D)} className={clsx("flex items-center gap-1.5 h-8 px-3 rounded-xl text-[11px] font-semibold cursor-pointer active:scale-[0.97] transition-transform", view3D ? "text-violet-400" : "text-[#8b949e]")} style={view3D ? { background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.35)" } : G.btn}>
                {view3D ? "Switch to 2D" : "Switch to 3D"}
              </button>
            )}
          </div>
          {!view3D && canvasImageUrl && (
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <div className="flex items-center gap-2"><Sun className="w-3 h-3 text-[#484f58]" /><input type="range" min="0.1" max="1" step="0.05" value={floorPlanOpacity} onChange={(e) => setFloorPlanOpacity(parseFloat(e.target.value))} className="w-20" /><span className="text-[#8b949e] text-[10px]">{Math.round(floorPlanOpacity * 100)}%</span></div>
              <div className="flex items-center gap-2"><ZoomIn className="w-3 h-3 text-[#484f58]" /><input type="range" min="0.5" max="3" step="0.1" value={floorPlanScale} onChange={(e) => setFloorPlanScale(parseFloat(e.target.value))} className="w-20" /><span className="text-[#8b949e] text-[10px]">{Math.round(floorPlanScale * 100)}%</span></div>
              <div className="flex items-center gap-2"><RotateCcw className="w-3 h-3 text-[#484f58]" /><input type="range" min="-180" max="180" step="1" value={floorPlanRotation} onChange={(e) => setFloorPlanRotation(parseInt(e.target.value))} className="w-20" /><span className="text-[#8b949e] text-[10px]">{floorPlanRotation}°</span></div>
            </div>
          )}
          <div className="rounded-2xl overflow-hidden relative" style={{ ...G.card, minHeight: "50vh" }}>
            {view3D && canvas3DUrl ? (
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}><img src={canvas3DUrl} alt="3D Rendering" className="absolute inset-0 w-full h-full object-contain" /></div>
            ) : canvasImageUrl ? (
              <div className="relative w-full" style={{ paddingBottom: "56.25%", overflow: "hidden" }}>
                <img src={canvasImageUrl} alt="Floor Plan" className="absolute" style={{ opacity: floorPlanOpacity, transform: `scale(${floorPlanScale}) rotate(${floorPlanRotation}deg)`, transformOrigin: "center center", left: "50%", top: "50%", marginLeft: "-50%", marginTop: "-28.125%", maxWidth: "100%", maxHeight: "100%" }} />
              </div>
            ) : (
              <svg viewBox="0 0 990 610" className="w-full" style={{ maxHeight: "70vh" }}><rect width="990" height="610" fill="#070c1a" /><defs><pattern id="cgds" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.024)" strokeWidth="0.5" /></pattern></defs><rect width="990" height="610" fill="url(#cgds)" /><rect x="80" y="50" width="830" height="510" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" rx="2" /><rect x="80" y="50" width="220" height="150" fill="rgba(59,130,246,0.04)" /><text x="190" y="132" textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize="9" fontFamily="sans-serif">RECEPTION</text></svg>
            )}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none"><div className="px-3 py-1.5 rounded-xl text-[10px] md:text-[11px] font-semibold text-white pointer-events-auto" style={G.liquidGlass}>{view3D ? "3D View" : "Floor Plan"}</div><button onClick={() => navigate("design-canvas")} className="px-3 py-1.5 rounded-xl text-[10px] md:text-[11px] font-bold text-white pointer-events-auto cursor-pointer active:scale-[0.97] transition-transform" style={{ background: "#3b82f6" }}>Open Canvas</button></div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4 md:mb-5 flex-wrap">{stageFilters.map((f) => (<button key={f.id} onClick={() => setFilter(f.id)} className={clsx("h-7 px-3 rounded-full text-[11px] md:text-[12px] font-semibold transition-all cursor-pointer active:scale-[0.97] transition-transform", filter === f.id ? "text-white" : "text-[#8b949e]")} style={filter === f.id ? { background: "#3b82f6", boxShadow: "0 2px 12px rgba(59,130,246,0.3)" } : G.subtle}>{f.label}</button>))}<div className="relative ml-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-7 rounded-xl pl-7 pr-3 text-[11px] md:text-[12px] text-[#e6edf3] focus:outline-none w-36 md:w-44" style={G.input} /></div><span className="text-[#484f58] text-[11px] md:text-[12px] ml-1">{filtered.length} projects</span></div>
          {filtered.length === 0 ? <EmptyState icon={Layers} title="No projects found" description="" /> : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">{filtered.map((project) => { const badge = stageBadge(project.stage); return (<div key={project.id} className="group rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 md:hover:-translate-y-1 relative" style={{ ...G.card }}><div className="relative h-[100px] md:h-[112px] bg-[#070c1a]" onClick={() => { setActiveProjectId(project.id); navigate("project-detail"); }}><MiniFloorPlan project={project} /><div className={clsx("absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full", badge.cls)}>{badge.label}</div></div><div className="p-3 md:p-4" onClick={() => { setActiveProjectId(project.id); navigate("project-detail"); }}><h3 className="text-white text-[12px] md:text-[13px] font-semibold leading-snug mb-1 line-clamp-1">{project.name}</h3><p className="text-[#8b949e] text-[10px] md:text-[11px] font-medium mb-2 flex items-center gap-1"><Building2 className="w-3 h-3" /> {project.client}</p><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex items-center gap-1 text-[#484f58] text-[10px]"><Camera className="w-3 h-3" />{project.cameras}</span></div><div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: project.assignee.color }}>{project.assignee.initials}</div></div></div></div>); })}</div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={G.card}><div className="overflow-x-auto"><div className="grid gap-3 px-3 py-2.5" style={{ gridTemplateColumns: "2fr 1fr 80px 80px 100px 80px", minWidth: "600px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{["Project","Client","Cameras","Devices","Stage","Value"].map((h) => (<span key={h} className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest">{h}</span>))}</div>{filtered.map((project) => { const badge = stageBadge(project.stage); return (<div key={project.id} className="grid gap-3 px-3 py-3.5 items-center transition-all group hover:bg-white/[0.03] cursor-pointer" style={{ gridTemplateColumns: "2fr 1fr 80px 80px 100px 80px", minWidth: "600px", borderBottom: "1px solid rgba(255,255,255,0.04)" }} onClick={() => { setActiveProjectId(project.id); navigate("project-detail"); }}><div><p className="text-white text-[12px] font-semibold truncate">{project.name}</p><p className="text-[#484f58] text-[10px] truncate">{project.location}</p></div><p className="text-[#8b949e] text-[11px] truncate">{project.client}</p><p className="text-[#8b949e] text-[11px]">{project.cameras}</p><p className="text-[#8b949e] text-[11px]">{project.devices}</p><span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full w-fit", badge.cls)}>{badge.label}</span><p className="text-white text-[12px] font-bold">{fmt(project.value, true)}</p></div>); })}</div></div>
          )}
        </>
      )}
    </div>
  );
}

function ProjectDetail({ navigate }: { navigate: (p: Page) => void }) {
  const { fmt } = useCurrency();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [showNewCO, setShowNewCO] = useState(false);
  const [newCOTitle, setNewCOTitle] = useState("");
  const [newCODesc, setNewCODesc] = useState("");
  const [newCOCost, setNewCOCost] = useState("");

  const fetchProject = useCallback(async () => { setLoading(true); try { const data = await API.projects.list(); if (data.length > 0) setProject(data[0]); else setProject(null); const qData = await API.quotes.list(); setQuotes(qData.filter((q: Quote) => q.projectId === data[0]?.id)); } catch { setProject(null); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchProject(); }, [fetchProject]);

  useEffect(() => {
    if (project) {
      API.audit.list(project.id).then(setAuditLog).catch(() => setAuditLog([]));
      API.changeOrders.list(project.id).then(setChangeOrders).catch(() => setChangeOrders([]));
    }
  }, [project]);

  const handleCreateCO = async () => {
    if (!project || !newCOTitle.trim()) return;
    const co: Partial<ChangeOrder> = {
      projectId: project.id,
      title: newCOTitle.trim(),
      description: newCODesc.trim(),
      costImpact: parseFloat(newCOCost) || 0,
      status: "draft",
      createdBy: CURRENT_USER.name,
    };
    try {
      const created = await API.changeOrders.create(project.id, co);
      setChangeOrders((prev) => [...prev, created]);
      setShowNewCO(false);
      setNewCOTitle(""); setNewCODesc(""); setNewCOCost("");
      toast.success("Change order created");
    } catch { toast.error("Failed to create change order"); }
  };

  if (loading) return <div className="px-3 md:px-5 py-4 md:py-6 space-y-4"><Skeleton className="h-8 w-64" /><div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div></div>;
  if (!project) return <EmptyState icon={Building2} title="No project selected" description="Select a project from the Projects tab." />;

  const p = project!; const badge = stageBadge(p.stage); const ls = p.leadSource ? LEAD_SOURCE_STYLES[p.leadSource] : null;
  const tabs = ["overview","quotes","change-orders","audit-log"];
  const tabLabels: Record<string, string> = { overview: "Overview", quotes: "Quotes", "change-orders": "Change Orders", "audit-log": "Audit Log" };
  const stageHistory = p.stageHistory || [{ stage: p.stage, date: p.createdAt?.slice(0,10) || new Date().toISOString().slice(0,10) }];

  return (
    <div className="px-3 md:px-5 py-4 md:py-6 max-w-[1200px]">
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 md:mb-6 gap-4"><div className="min-w-0"><div className="flex items-center gap-2 mb-2 flex-wrap"><span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", badge.cls)}>{badge.label}</span>{ls && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: ls.bg, color: ls.text }}>{p.leadSource}</span>}<span className="text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/12">{p.risk.toUpperCase()} RISK</span></div><h1 className="text-white font-bold text-xl md:text-2xl tracking-tight mb-1">{p.name}</h1><p className="text-[#8b949e] text-[12px] md:text-[13px] flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {p.client} · <MapPin className="w-3.5 h-3.5 ml-1" /> {p.location}</p></div><div className="flex items-center gap-2 flex-shrink-0 flex-wrap">{[{ label: "Design", icon: Layers, action: () => navigate("design-canvas") },{ label: "Install", icon: CheckSquare, action: () => navigate("install-tracker") }].map(({ label, icon: Icon, action }) => (<button key={label} onClick={action} className="flex items-center gap-1.5 h-9 px-3 md:px-4 rounded-xl text-white text-[11px] md:text-[12px] font-semibold hover:bg-white/[0.10] cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={G.btn}><Icon className="w-3.5 h-3.5" /> {label}</button>))}</div></div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 mb-4 md:mb-6">{[{ label: "Contract Value", value: fmt(p.value, true), icon: DollarSign, color: "#3b82f6" },{ label: "Cameras", value: String(p.cameras), icon: Camera, color: "#8b5cf6" },{ label: "Devices", value: String(p.devices), icon: Fingerprint, color: "#06b6d4" },{ label: "Due Date", value: fmtDate(p.dueDate), icon: Calendar, color: "#f59e0b" },{ label: "Progress", value: "0%", icon: Activity, color: "#10b981" }].map((s) => (<div key={s.label} className="rounded-2xl p-3 md:p-4" style={G.card}><div className="flex items-center justify-between mb-2 md:mb-3"><span className="text-[#8b949e] text-[9px] md:text-[10px] font-bold uppercase">{s.label}</span><div className="w-6 h-6 md:w-7 md:h-7 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}><s.icon className="w-3 h-3" style={{ color: s.color }} /></div></div><p className="text-white text-lg md:text-xl font-bold">{s.value}</p></div>))}</div>
      <div className="flex items-center gap-0.5 mb-4 md:mb-5 overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", scrollbarWidth: "none" }}>{tabs.map((tab) => (<button key={tab} onClick={() => setActiveTab(tab)} className={clsx("h-10 px-3 md:px-4 text-[12px] md:text-[13px] font-semibold border-b-2 transition-all -mb-px whitespace-nowrap cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]", activeTab === tab ? "border-blue-500 text-white" : "border-transparent text-[#8b949e]")}>{tabLabels[tab]}</button>))}</div>
      {activeTab === "overview" && (<div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="md:col-span-2 space-y-4"><div className="rounded-2xl p-4 md:p-5" style={G.card}><h3 className="text-white text-[13px] md:text-[14px] font-bold mb-3">Project Scope</h3><p className="text-[#8b949e] text-[12px] leading-relaxed">{p.summary ?? "No scope defined yet."}</p></div><div className="rounded-2xl p-4 md:p-5" style={G.card}><h3 className="text-white text-[13px] md:text-[14px] font-bold mb-4">Team</h3><div className="space-y-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white" style={{ background: p.assignee.color }}>{p.assignee.initials}</div><div><p className="text-white text-[12px] font-semibold">{p.assignee.name}</p><p className="text-[#8b949e] text-[10px]">Account Owner</p></div></div>{p.collaborators?.map((c) => (<div key={c.name} className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white" style={{ background: c.color }}>{c.initials}</div><div><p className="text-white text-[12px] font-semibold">{c.name}</p><p className="text-[#8b949e] text-[10px]">{c.role}</p></div></div>))}</div></div></div><div className="space-y-4"><div className="rounded-2xl p-4 md:p-5" style={G.card}><h3 className="text-white text-[13px] md:text-[14px] font-bold mb-4">Timeline</h3><div className="space-y-2">{COLUMNS.filter(c => !["win","lose"].includes(c.id)).map((col) => { const entry = stageHistory.find((s: any) => s.stage === col.id); const colIndex = COLUMNS.indexOf(col); const currentIndex = COLUMNS.indexOf(COLUMNS.find((c) => c.id === p.stage)!); const isPast = colIndex < currentIndex; const isCurrent = col.id === p.stage; return (<div key={col.id} className="flex items-center gap-3"><div className={clsx("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", isPast ? "bg-emerald-500/20" : isCurrent ? "bg-blue-500/20 ring-2 ring-blue-500/40" : "bg-white/[0.04]")}>{isPast ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : isCurrent ? <Clock className="w-3 h-3 text-blue-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-white/20" />}</div><div className="flex-1 flex items-center justify-between"><span className={clsx("text-[11px] font-semibold", isPast ? "text-[#8b949e]" : isCurrent ? "text-white" : "text-[#484f58]")}>{col.label}</span><span className="text-[#484f58] text-[10px]">{entry?.date ? fmtDateFull(entry.date) : "—"}</span></div></div>); })}</div></div></div></div>)}
      {activeTab === "quotes" && (quotes.length === 0 ? <EmptyState icon={DollarSign} title="No workbook yet" description="" /> : <div className="space-y-3">{quotes.map((q) => (<div key={q.id} className="flex items-center justify-between rounded-2xl p-4" style={G.card}><div className="flex items-center gap-4"><DollarSign className="w-4 h-4 text-blue-400" /><div><p className="text-white text-[13px] font-semibold">{q.refNumber}</p><p className="text-[#484f58] text-[11px]">{q.date} · {q.status}</p></div></div><button onClick={() => navigate("workbook")} className="h-8 px-3 rounded-xl text-[#8b949e] text-[12px] font-semibold hover:text-white cursor-pointer" style={G.btn}>Open</button></div>))}</div>)}
      {activeTab === "change-orders" && (
        <div>
          <div className="flex items-center justify-between mb-3"><p className="text-[#8b949e] text-[11px]">{changeOrders.length} change orders</p><button onClick={() => setShowNewCO(true)} className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-white text-[11px] font-bold cursor-pointer active:scale-[0.97] transition-transform" style={{ background: "#3b82f6" }}><Plus className="w-3 h-3" /> New Change Order</button></div>
          {showNewCO && (
            <div className="rounded-2xl p-4 mb-3" style={G.card}>
              <div className="space-y-2">
                <input value={newCOTitle} onChange={(e) => setNewCOTitle(e.target.value)} placeholder="Title" className="w-full h-9 rounded-xl px-3 text-[12px] text-[#e6edf3] focus:outline-none" style={G.input} />
                <textarea value={newCODesc} onChange={(e) => setNewCODesc(e.target.value)} placeholder="Description" rows={2} className="w-full rounded-xl px-3 py-2 text-[12px] text-[#e6edf3] focus:outline-none resize-none" style={G.input} />
                <input type="number" value={newCOCost} onChange={(e) => setNewCOCost(e.target.value)} placeholder="Cost Impact" className="w-full h-9 rounded-xl px-3 text-[12px] text-[#e6edf3] focus:outline-none" style={G.input} />
                <div className="flex gap-2"><button onClick={handleCreateCO} className="flex-1 h-9 rounded-xl text-white text-[12px] font-bold cursor-pointer active:scale-[0.97] transition-transform" style={{ background: "#10b981" }}>Create</button><button onClick={() => setShowNewCO(false)} className="flex-1 h-9 rounded-xl text-[#8b949e] text-[12px] font-semibold cursor-pointer active:scale-[0.97] transition-transform" style={G.btn}>Cancel</button></div>
              </div>
            </div>
          )}
          {changeOrders.length === 0 && !showNewCO ? <EmptyState icon={AlertTriangle} title="No change orders" description="Create one to track scope changes." /> : (
            <div className="space-y-2">{changeOrders.map((co) => (<div key={co.id} className="rounded-2xl p-4" style={G.card}><div className="flex items-center justify-between"><div><p className="text-white text-[13px] font-semibold">{co.title}</p>{co.description && <p className="text-[#8b949e] text-[11px] mt-0.5">{co.description}</p>}</div><span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", co.status === "approved" ? "bg-emerald-500/12 text-emerald-400" : co.status === "submitted" ? "bg-blue-500/12 text-blue-400" : co.status === "rejected" ? "bg-rose-500/12 text-rose-400" : "bg-amber-500/12 text-amber-400")}>{co.status}</span></div><div className="flex items-center justify-between mt-2"><span className="text-[#484f58] text-[10px]">{co.createdBy} · {fmtDateFull(co.createdAt)}</span>{co.costImpact !== 0 && <span className="text-white text-[12px] font-bold">{fmt(co.costImpact)}</span>}</div></div>))}</div>
          )}
        </div>
      )}
      {activeTab === "audit-log" && (
        <div>
          {auditLog.length === 0 ? <EmptyState icon={History} title="No audit entries" description="Activity will appear here automatically." /> : (
            <div className="space-y-1">
              {auditLog.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.02]" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: TEAM.find(t => t.name === entry.user)?.color || "#3b82f6" }}>{(TEAM.find(t => t.name === entry.user)?.initials || "??")}</div>
                  <div className="flex-1 min-w-0"><p className="text-white text-[11px] font-semibold">{entry.event}</p><p className="text-[#8b949e] text-[10px]">{entry.details}</p></div>
                  <span className="text-[#484f58] text-[10px] flex-shrink-0">{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
