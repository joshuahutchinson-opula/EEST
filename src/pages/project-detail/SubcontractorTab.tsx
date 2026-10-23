import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Copy, Loader2, Paperclip, Plus, Share2, Trash2, Upload, UserCheck } from "lucide-react";
import { clsx } from "clsx";
import { API, fileHref } from "../../api";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { G } from "../../lib/constants";
import { isTechRole, useRole } from "../../lib/contexts";
import type { Subcontractor } from "../../types";

export function SubcontractorTab({ projectId }: { projectId: string }) {
  const tech = isTechRole(useRole());
  const [subs, setSubs] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [email, setEmail] = useState("");
  const [showDocs, setShowDocs] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [sharingSub, setSharingSub] = useState<string | null>(null);
  const [shareModalSub, setShareModalSub] = useState<Subcontractor | null>(null);

  useEffect(() => { API.subcontractors.list(projectId).then(setSubs).catch(() => setSubs([])).finally(() => setLoading(false)); }, [projectId]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    try { const created = await API.subcontractors.add(projectId, { name: name.trim(), trade: trade.trim(), email: email.trim() }); setSubs(prev => [...prev, created]); setName(""); setTrade(""); setEmail(""); setShowAdd(false); toast.success("Subcontractor added"); } catch { toast.error("Failed to add"); }
  };

  const handleDelete = async (subId: string) => { API.subcontractors.delete(subId).then(() => { setSubs(prev => prev.filter(x => x.id !== subId)); toast.success("Removed"); }).catch(() => toast.error("Failed to delete")); };

  const shareUrlFor = (token: string) => `${window.location.origin}/portal/subcontractor/${token}`;

  const handleShare = async (sub: Subcontractor) => {
    if (sub.shareToken) { setShareModalSub(sub); return; }
    setSharingSub(sub.id);
    try {
      const result = await API.subcontractors.generateShareLink(sub.id);
      const updated = { ...sub, shareToken: result.shareToken };
      setSubs(prev => prev.map(x => x.id === sub.id ? updated : x));
      setShareModalSub(updated);
    } catch { toast.error("Failed to generate share link"); }
    setSharingSub(null);
  };

  const handleRevokeShare = async (subId: string) => {
    try {
      await API.subcontractors.revokeShareLink(subId);
      setSubs(prev => prev.map(x => x.id === subId ? { ...x, shareToken: null } : x));
      setShareModalSub(null);
      toast.success("Link revoked");
    } catch { toast.error("Failed to revoke link"); }
  };

  const handleDocUpload = async (subId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(subId);
    try {
      const result = await API.documents.upload(projectId, file);
      await API.subcontractors.addDoc(subId, { filename: file.name, fileUrl: result.fileUrl });
      const updated = await API.subcontractors.list(projectId);
      setSubs(updated);
      toast.success("Document uploaded");
    } catch { toast.error("Upload failed"); }
    setUploadingDoc(null);
    e.target.value = "";
  };

  if (loading) return <Skeleton className="h-48 rounded-2xl" />;

  return (
    <div className="space-y-3">
      {shareModalSub && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={() => setShareModalSub(null)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
          <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={e => e.stopPropagation()} className="relative z-10 w-full max-w-[440px] rounded-2xl p-6" style={G.liquidGlass}>
            <h3 className="text-white text-[16px] font-extrabold mb-2">Shareable Link</h3>
            <p className="text-[#8b949e] text-[13px] mb-4">{shareModalSub.name} can view their documents through this link, read-only, without logging in.</p>
            <div className="flex items-center gap-2 mb-4"><input value={shareModalSub.shareToken ? shareUrlFor(shareModalSub.shareToken) : ""} readOnly className="flex-1 h-9 rounded-xl px-3 text-[13px] text-white" style={G.input} /><button onClick={() => { navigator.clipboard.writeText(shareUrlFor(shareModalSub.shareToken!)); toast.success("Copied"); }} className="h-9 px-3 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}><Copy className="w-3.5 h-3.5" /></button></div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleRevokeShare(shareModalSub.id)} className="flex-1 h-9 rounded-xl text-rose-400 text-[14px] font-bold cursor-pointer" style={G.btn}>Revoke Link</button>
              <button onClick={() => setShareModalSub(null)} className="flex-1 h-9 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Close</button>
            </div>
          </motion.div>
        </div>
      )}
      <div className="flex items-center justify-between"><p className="text-[#8b949e] text-[13px]">{subs.length} subcontractors</p><button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 h-8 px-3 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}><Plus className="w-3 h-3" /> Add</button></div>
      {showAdd && (
        <div className="rounded-xl p-3 space-y-2" style={G.card}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Company name" className="w-full h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} />
          <input value={trade} onChange={e => setTrade(e.target.value)} placeholder="Trade (e.g. Electrical)" className="w-full h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} />
          <button onClick={handleAdd} className="w-full h-8 rounded-lg text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#10b981" }}>Save</button>
        </div>
      )}
      {subs.length === 0 && !showAdd ? <EmptyState icon={UserCheck} title="No subcontractors" description="Add subcontractors working on this project." /> : subs.map((sub) => (
        <div key={sub.id} className="rounded-xl p-3" style={G.card}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0"><p className="text-white text-[14px] font-bold">{sub.name}</p><p className="text-[#8b949e] text-[12px]">{sub.trade}{sub.email ? ` · ${sub.email}` : ""}</p></div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!tech && <button onClick={() => handleShare(sub)} disabled={sharingSub === sub.id} className={clsx("flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[12px] font-extrabold cursor-pointer", sub.shareToken ? "text-blue-400" : "text-[#8b949e] hover:text-white")} style={G.btn}>{sharingSub === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}{sub.shareToken ? "Link" : "Share"}</button>}
              <button onClick={() => setShowDocs(showDocs === sub.id ? null : sub.id)} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/10" style={G.btn}><Paperclip className="w-3.5 h-3.5 text-[#8b949e]" /></button>
              <button onClick={() => handleDelete(sub.id)} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:bg-rose-500/10"><Trash2 className="w-3 h-3 text-rose-400" /></button>
            </div>
          </div>
          {showDocs === sub.id && (
            <div className="mt-2 pt-2 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between">
                <p className="text-[#8b949e] text-[11px] font-extrabold uppercase">Documents</p>
                <label className="text-[12px] text-blue-400 cursor-pointer flex items-center gap-1">{uploadingDoc === sub.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}{uploadingDoc === sub.id ? "Uploading..." : "Upload"}<input type="file" className="hidden" onChange={(e) => handleDocUpload(sub.id, e)} disabled={uploadingDoc === sub.id} /></label>
              </div>
              {sub.documents.length === 0 ? <p className="text-[#8b949e] text-[12px]">No documents</p> : sub.documents.map(doc => (<div key={doc.id} className="flex items-center gap-2"><Paperclip className="w-3 h-3 text-[#8b949e]" /><a href={fileHref(doc.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-white text-[12px] font-bold hover:text-blue-400">{doc.filename}</a></div>))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
