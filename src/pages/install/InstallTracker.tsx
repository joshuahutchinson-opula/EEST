import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, Camera, CheckCircle2, CheckSquare, ChevronDown, ChevronUp, Clock, Cpu, DoorOpen, Key, Loader2, PanelRight, Phone, Plus, Server, Upload, Zap } from "lucide-react";
import { clsx } from "clsx";
import { API, fileHref } from "../../api";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { G } from "../../lib/constants";
import { useAutoTutorial } from "../../lib/contexts";
import type { IconType, InstallStatus, InstallZone, Page, Project, TaskPriority, TutorialStep } from "../../types";
import { cacheData, isNetworkError, readCachedData, submit } from "../../lib/offlineQueue";

export const STATUS_META: Record<InstallStatus, { label: string; color: string; bg: string; icon: IconType }> = {
  complete: { label: "Complete", color: "text-emerald-400", bg: "bg-emerald-500/12", icon: CheckCircle2 },
  "in-progress": { label: "In Progress", color: "text-blue-400", bg: "bg-blue-500/12", icon: Clock },
  failed: { label: "Failed", color: "text-rose-400", bg: "bg-rose-500/12", icon: AlertTriangle },
  pending: { label: "Pending", color: "text-[#8b949e]", bg: "bg-white/[0.04]", icon: AlertCircle },
};

export const INSTALL_TRACKER_STEPS: TutorialStep[] = [
  { target: "it-progress", title: "Overall Progress", description: "Percent complete across every zone in every project currently in the Installation stage, broken down by Complete, In Progress, Failed, and Pending." },
  { target: "it-filter", title: "Status Filter", description: "Narrow the device list down to just one status." },
  { target: "it-project-row", title: "Projects & Zones", description: "Click a project to expand its zones and devices. \"Task\" adds a quick task (title, priority, due date) directly to that project." },
  { target: "it-device-row", title: "Device Status", description: "Each device shows its assignee and a status dropdown — Pending, In Progress, Complete, or Failed — that updates immediately." },
  { target: "it-device-photo", title: "As-Installed Photo", description: "Attach a photo of the device as it was actually installed — separate from the pre-install coverage photo on Project Assets." },
];

export function InstallTracker({ navigate: _navigate }: { navigate: (p: Page) => void }) {
  useAutoTutorial("install-tracker", INSTALL_TRACKER_STEPS);
  const [projects, setProjects] = useState<Project[]>([]);
  const [zones, setZones] = useState<InstallZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InstallStatus | "all">("all");
  const [addTaskProjectId, setAddTaskProjectId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [uploadingDevicePhoto, setUploadingDevicePhoto] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projData, zoneData] = await Promise.all([API.projects.list(), API.install.zones()]);
      setProjects(projData.filter((p: Project) => p.projectStage === "installation"));
      setZones(zoneData);
      cacheData("install", { projects: projData, zones: zoneData });
    } catch (err) {
      // Offline: fall back to the last data loaded on this device.
      const cached = isNetworkError(err) ? readCachedData<{ projects: Project[]; zones: InstallZone[] }>("install") : null;
      if (cached) { setProjects(cached.projects.filter((p) => p.projectStage === "installation")); setZones(cached.zones); toast.message("Offline — showing the last loaded installation data", { id: "offline-install" }); }
      else { setProjects([]); setZones([]); }
    }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (zoneId: string, deviceId: string, status: InstallStatus) => {
    setZones((prev) => prev.map((z) => z.id !== zoneId ? z : { ...z, devices: z.devices.map((d) => d.id !== deviceId ? d : { ...d, status }) }));
    try { await submit({ kind: "request", label: "install status", path: `/install/zones/${zoneId}/devices/${deviceId}`, method: "PATCH", body: { status } }); } catch { toast.error("Failed to save device status"); fetchData(); }
  };

  const handleDevicePhotoUpload = async (projectId: string, zoneId: string, deviceId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDevicePhoto(deviceId);
    try {
      const result = await submit({ kind: "photo", label: "install photo", projectId, file, fileName: file.name, path: `/install/zones/${zoneId}/devices/${deviceId}` });
      // A queued photo shows from this device until it syncs.
      const shown = result.fileUrl || URL.createObjectURL(file);
      setZones((prev) => prev.map((z) => z.id !== zoneId ? z : { ...z, devices: z.devices.map((d) => d.id !== deviceId ? d : { ...d, installedPhotos: [...(d.installedPhotos || []), shown] }) }));
      if (!result.queued) toast.success("As-installed photo uploaded");
    } catch { toast.error("Upload failed"); }
    setUploadingDevicePhoto(null);
    e.target.value = "";
  };

  const handleAddTask = async (projectId: string) => {
    if (!taskTitle.trim()) return;
    try {
      await API.tasks.create(projectId, { title: taskTitle.trim(), priority: taskPriority, dueDate: taskDueDate || undefined, status: "todo" });
      setTaskTitle(""); setTaskPriority("medium"); setTaskDueDate(""); setAddTaskProjectId(null);
      toast.success("Task added to project");
    } catch { toast.error("Failed to add task"); }
  };

  const typeIcons: Record<string, IconType> = { camera: Camera, access: Key, nvr: Cpu, door: DoorOpen, panel: PanelRight, power: Zap, server: Server, intercom: Phone };

  if (loading) return (<div className="px-3 md:px-5 py-4 md:py-6 space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div>);

  const allDevices = zones.flatMap((z) => z.devices);
  const complete = allDevices.filter((d) => d.status === "complete").length;
  const total = allDevices.length;
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0;

  return (
    <div className="px-3 md:px-5 py-4 md:py-6 max-w-[1600px] mx-auto w-full">
      <div className="mb-4 md:mb-6 flex items-center justify-between">
        <div><h1 className="text-white font-extrabold text-2xl md:text-3xl tracking-tight">Installation</h1><p className="text-[#8b949e] text-[13px] mt-0.5">{total} devices across {zones.length} zones</p></div>
      </div>
      {projects.length === 0 && zones.length === 0 ? <EmptyState icon={CheckSquare} title="No active installs" description="Projects in Installation stage will appear here." /> : (
        <>
          <div data-tour="it-progress" className="rounded-2xl p-4 md:p-5 mb-4" style={G.card}>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
              <div><p className="text-white text-[1.8rem] md:text-[2.2rem] font-extrabold">{pct}%</p><p className="text-[#8b949e] text-[12px]">{complete} of {total} complete</p></div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Complete", count: complete, color: "text-emerald-400" },
                  { label: "In Progress", count: allDevices.filter(d=>d.status==="in-progress").length, color: "text-blue-400" },
                  { label: "Failed", count: allDevices.filter(d=>d.status==="failed").length, color: "text-rose-400" },
                  { label: "Pending", count: allDevices.filter(d=>d.status==="pending").length, color: "text-[#8b949e]" },
                ].map((s) => (<div key={s.label}><p className={clsx("text-[1.3rem] font-extrabold", s.color)}>{s.count}</p><p className="text-[#8b949e] text-[11px]">{s.label}</p></div>))}
              </div>
            </div>
            <div className="relative w-full h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}><div className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full" style={{ width: `${pct}%` }} /></div>
          </div>
          <div data-tour="it-filter" className="flex items-center gap-1 mb-3">
            {(["all","pending","in-progress","complete","failed"] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={clsx("h-7 px-2.5 rounded-lg text-[12px] font-bold cursor-pointer", statusFilter === s ? "text-white" : "text-[#8b949e]")} style={statusFilter === s ? { background: "rgba(255,255,255,0.10)" } : G.btn}>{s === "all" ? "All" : s === "in-progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}</button>
            ))}
          </div>
          <div className="space-y-3">
            {projects.map((project) => {
              const projectZones = zones.filter((z) => z.projectId === project.id);
              const projectDevices = projectZones.flatMap((z) => z.devices).filter(d => statusFilter === "all" || d.status === statusFilter);
              const isExpanded = expandedProject === project.id;
              return (
                <div key={project.id} data-tour="it-project-row" className="rounded-2xl overflow-hidden" style={G.card}>
                  <div className="w-full flex items-center gap-3 px-4 py-3">
                    <button onClick={() => setExpandedProject(isExpanded ? null : project.id)} className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer min-h-[44px]">
                      <div className="flex-1 min-w-0 text-left"><p className="text-white text-[14px] font-extrabold">{project.name}</p><p className="text-[#8b949e] text-[12px]">{projectDevices.length} devices</p></div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-[#8b949e]" /> : <ChevronDown className="w-4 h-4 text-[#8b949e]" />}
                    </button>
                    <button onClick={() => setAddTaskProjectId(addTaskProjectId === project.id ? null : project.id)} className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[12px] font-extrabold text-white cursor-pointer flex-shrink-0" style={{ background: "#3b82f6" }}><Plus className="w-3 h-3" /> Task</button>
                  </div>
                  {addTaskProjectId === project.id && (
                    <div className="px-4 pb-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task title…" className="w-full h-8 rounded-lg px-2 text-[13px] text-white mt-3" style={G.input} />
                      <div className="flex gap-2 flex-wrap">
                        <select value={taskPriority} onChange={e => setTaskPriority(e.target.value as TaskPriority)} className="h-8 rounded-lg px-2 text-[12px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>
                          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                        </select>
                        <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} className="h-8 rounded-lg px-2 text-[12px]" style={{ ...G.input, colorScheme: "dark", background: "#0d1117", color: "#e6edf3" }} />
                        <button onClick={() => handleAddTask(project.id)} className="h-8 px-3 rounded-lg text-[12px] font-extrabold text-white cursor-pointer" style={{ background: "#10b981" }}>Add to Project</button>
                      </div>
                    </div>
                  )}
                  {isExpanded && projectDevices.map((device) => {
                    const meta = STATUS_META[device.status];
                    const TypeIcon = typeIcons[device.type] ?? Camera;
                    return (
                      <div key={device.id} data-tour="it-device-row" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="grid gap-2 px-3 py-3 items-center" style={{ gridTemplateColumns: "36px 2fr 1fr 120px" }}>
                          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}><TypeIcon className="w-3.5 h-3.5 text-[#8b949e]" /></div>
                          <div className="min-w-0"><p className="text-white text-[13px] font-bold truncate">{device.name}</p><p className="text-[#8b949e] text-[11px]">{device.location}</p></div>
                          <span className="text-[#8b949e] text-[12px] truncate">{device.assignee}</span>
                          <select value={device.status} onChange={(e) => { const z = projectZones.find(z => z.devices.some(d => d.id === device.id)); if (z) updateStatus(z.id, device.id, e.target.value as InstallStatus); }} className={clsx("w-full h-7 rounded-xl border px-2 text-[12px] font-extrabold appearance-none cursor-pointer", meta.bg, meta.color)} style={{ background: "#0d1117" }}>
                            {Object.entries(STATUS_META).map(([val, m]) => (<option key={val} value={val} style={{ background: "#0d1117", color: "#e6edf3" }}>{m.label}</option>))}
                          </select>
                        </div>
                        <div className="px-3 pb-3 pl-[52px] flex items-center gap-2 flex-wrap" data-tour="it-device-photo">
                          {(device.installedPhotos || []).map((p, i) => <img key={i} src={fileHref(p)} alt="" className="w-12 h-12 rounded-lg object-cover" style={{ border: "1px solid rgba(255,255,255,0.10)" }} />)}
                          <label className="inline-flex items-center gap-1 text-[11px] text-blue-400 cursor-pointer">
                            {uploadingDevicePhoto === device.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} {uploadingDevicePhoto === device.id ? "Uploading…" : "Add as-installed photo"}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const z = projectZones.find(z => z.devices.some(d => d.id === device.id)); if (z) handleDevicePhotoUpload(project.id, z.id, device.id, e); }} disabled={uploadingDevicePhoto === device.id} />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
