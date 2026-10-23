import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, CheckCircle2, ClipboardCheck, Clock, Loader2, Plus, X } from "lucide-react";
import { clsx } from "clsx";
import { API, downloadBlob, fileHref } from "../../api";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { G } from "../../lib/constants";
import type { CommissioningItem } from "../../types";

export function CommissioningTab({ projectId }: { projectId: string }) {
  const [checklist, setChecklist] = useState<CommissioningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await API.commissioning.sync(projectId);
        const data = await API.commissioning.list(projectId);
        setChecklist(data);
      } catch { setChecklist([]); } finally { setLoading(false); }
    };
    load();
  }, [projectId]);

  const handleAdd = async () => {
    if (!newDeviceName.trim()) return;
    try {
      const created = await API.commissioning.add(projectId, { deviceName: newDeviceName.trim(), location: newLocation.trim() || null, deviceId: crypto.randomUUID?.() });
      setChecklist(prev => [...prev, created]);
      setNewDeviceName(""); setNewLocation(""); setShowAdd(false);
      toast.success("Added");
    } catch { toast.error("Failed to add"); }
  };

  const handleUpdate = async (deviceId: string, status: "pass" | "fail") => {
    API.commissioning.update(projectId, deviceId, { status }).then(() => setChecklist(prev => prev.map(x => x.deviceId === deviceId ? { ...x, status } : x))).catch(() => toast.error("Failed to save commissioning status"));
    if (status === "fail") {
      API.tasks.create(projectId, { title: `${checklist.find(x => x.deviceId === deviceId)?.deviceName || "Device"} failed commissioning`, priority: "high", status: "todo" }).catch(() => toast.error("Failed to create the follow-up task"));
    }
  };

  const handleBulkAction = async (status: "pass" | "fail") => {
    const ids = Array.from(selectedDevices);
    if (ids.length === 0) return;
    try {
      await API.commissioning.bulk(projectId, ids, status);
      setChecklist(prev => prev.map(x => ids.includes(x.deviceId || x.id) ? { ...x, status } : x));
      setSelectedDevices(new Set());
      toast.success(`Marked ${ids.length} devices as ${status}`);
    } catch { toast.error("Bulk update failed"); }
  };

  const handlePhotoUpload = async (deviceId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(deviceId);
    try {
      const result = await API.documents.upload(projectId, file);
      const item = checklist.find(x => x.deviceId === deviceId);
      const photos = [...(item?.photos || []), result.fileUrl];
      await API.commissioning.update(projectId, deviceId, { photos });
      setChecklist(prev => prev.map(x => x.deviceId === deviceId ? { ...x, photos } : x));
      toast.success("Photo uploaded");
    } catch { toast.error("Upload failed"); }
    setUploadingPhoto(null);
    e.target.value = "";
  };

  const handleSaveNote = async (deviceId: string) => {
    await API.commissioning.update(projectId, deviceId, { notes: noteText });
    setChecklist(prev => prev.map(x => x.deviceId === deviceId ? { ...x, notes: noteText } : x));
    setEditingNotes(null);
    setNoteText("");
    toast.success("Note saved");
  };

  const handleGenerateReport = async () => {
    try {
      const { blob, filename } = await API.commissioning.generateReport(projectId);
      downloadBlob(blob, filename);
      toast.success("Report generated");
    } catch { toast.error("Failed to generate report"); }
  };

  const toggleSelect = (deviceId: string) => {
    setSelectedDevices(prev => {
      const next = new Set(prev);
      next.has(deviceId) ? next.delete(deviceId) : next.add(deviceId);
      return next;
    });
  };

  if (loading) return <Skeleton className="h-48 rounded-2xl" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[#8b949e] text-[13px]">{checklist.length} devices{selectedDevices.size > 0 && ` · ${selectedDevices.size} selected`}</p>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 h-8 px-3 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}><Plus className="w-3 h-3" /> Add</button>
          <button onClick={handleGenerateReport} className="flex items-center gap-1 h-8 px-3 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#10b981" }}><ClipboardCheck className="w-3 h-3" /> Handover Report</button>
        </div>
      </div>
      {selectedDevices.size > 0 && (
        <div className="flex gap-2 px-3 py-2 rounded-xl" style={G.subtle}>
          <button onClick={() => handleBulkAction("pass")} className="h-7 px-3 rounded-lg text-[12px] font-extrabold text-emerald-400 cursor-pointer" style={{ background: "rgba(16,185,129,0.12)" }}>Bulk Pass</button>
          <button onClick={() => handleBulkAction("fail")} className="h-7 px-3 rounded-lg text-[12px] font-extrabold text-rose-400 cursor-pointer" style={{ background: "rgba(244,63,94,0.12)" }}>Bulk Fail</button>
          <button onClick={() => setSelectedDevices(new Set())} className="h-7 px-3 rounded-lg text-[12px] font-bold cursor-pointer" style={G.btn}>Clear</button>
        </div>
      )}
      {showAdd && (
        <div className="rounded-xl p-3 space-y-2" style={G.card}>
          <input value={newDeviceName} onChange={e => setNewDeviceName(e.target.value)} placeholder="Device name" className="w-full h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} />
          <input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Location" className="w-full h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} />
          <button onClick={handleAdd} className="w-full h-8 rounded-lg text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#10b981" }}>Save</button>
        </div>
      )}
      {checklist.length === 0 && !showAdd ? <EmptyState icon={ClipboardCheck} title="No commissioning data" description="Sync from Installation or add devices manually." action={{ label: "Sync Devices", onClick: async () => { await API.commissioning.sync(projectId); const data = await API.commissioning.list(projectId); setChecklist(data); toast.success("Synced"); } }} /> : checklist.map((item) => (
        <div key={item.id} className="rounded-xl p-3" style={G.card}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => toggleSelect(item.deviceId || item.id)} className={clsx("w-4 h-4 rounded border-2 flex items-center justify-center", selectedDevices.has(item.deviceId || item.id) ? "bg-blue-500 border-blue-500" : "border-[#484f58]")}>{selectedDevices.has(item.deviceId || item.id) && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}</button>
              <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center", item.status === "pass" ? "bg-emerald-500/20" : item.status === "fail" ? "bg-rose-500/20" : "bg-white/5")}>{item.status === "pass" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : item.status === "fail" ? <X className="w-3.5 h-3.5 text-rose-400" /> : <Clock className="w-3.5 h-3.5 text-[#8b949e]" />}</div>
              <div><p className="text-white text-[14px] font-bold">{item.deviceName}</p><p className="text-[#8b949e] text-[12px]">{item.location || ""}</p></div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleUpdate(item.deviceId || item.id, "pass")} className="h-7 px-2 rounded-lg text-[12px] font-extrabold text-emerald-400 cursor-pointer" style={{ background: "rgba(16,185,129,0.12)" }}>Pass</button>
              <button onClick={() => handleUpdate(item.deviceId || item.id, "fail")} className="h-7 px-2 rounded-lg text-[12px] font-extrabold text-rose-400 cursor-pointer" style={{ background: "rgba(244,63,94,0.12)" }}>Fail</button>
              <label className="h-7 px-2 rounded-lg text-[12px] font-extrabold text-blue-400 cursor-pointer flex items-center gap-1" style={{ background: "rgba(59,130,246,0.12)" }}>{uploadingPhoto === (item.deviceId || item.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />} Photo<input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload(item.deviceId || item.id, e)} disabled={uploadingPhoto === (item.deviceId || item.id)} /></label>
              <button onClick={() => { setEditingNotes(editingNotes === (item.deviceId || item.id) ? null : (item.deviceId || item.id)); setNoteText(item.notes || ""); }} className="h-7 px-2 rounded-lg text-[12px] font-extrabold text-amber-400 cursor-pointer" style={{ background: "rgba(245,158,11,0.12)" }}>Note</button>
            </div>
          </div>
          {item.notes && editingNotes !== (item.deviceId || item.id) && <p className="text-[#8b949e] text-[12px] mt-2">{item.notes}</p>}
          {editingNotes === (item.deviceId || item.id) && (
            <div className="mt-2 space-y-2">
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={2} placeholder="Notes…" className="w-full rounded-lg px-2 py-1.5 text-[13px] text-white resize-none" style={G.input} />
              <div className="flex gap-2"><button onClick={() => handleSaveNote(item.deviceId || item.id)} className="h-7 px-3 rounded-lg text-[12px] font-extrabold text-white cursor-pointer" style={{ background: "#10b981" }}>Save</button><button onClick={() => setEditingNotes(null)} className="h-7 px-3 rounded-lg text-[12px] font-bold cursor-pointer" style={G.btn}>Cancel</button></div>
            </div>
          )}
          {item.photos && item.photos.length > 0 && <div className="flex gap-2 mt-2 flex-wrap">{item.photos.map((p, i) => <img key={i} src={fileHref(p)} alt="" className="w-16 h-16 rounded-lg object-cover" style={{ border: "1px solid rgba(255,255,255,0.10)" }} />)}</div>}
        </div>
      ))}
    </div>
  );
}
