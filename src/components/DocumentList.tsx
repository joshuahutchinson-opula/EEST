import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { API, fileHref } from "../api";
import { ConfirmDialog } from "./ConfirmDialog";
import { Skeleton } from "./Skeleton";
import { G } from "../lib/constants";
import type { DocumentItem } from "../types";

export function DocumentList({ projectId }: { projectId: string }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => { setLoading(true); try { const data = await API.documents.list(projectId); setDocuments(data); } catch { setDocuments([]); } finally { setLoading(false); } }, [projectId]);
  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { await API.documents.upload(projectId, file); fetchDocs(); toast.success("File uploaded"); } catch { toast.error("Upload failed"); }
    setUploading(false); e.target.value = "";
  };

  const handleDelete = async (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    try { await API.documents.delete(projectId, id); toast.success("File deleted"); } catch { fetchDocs(); }
    setConfirmDelete(null);
  };

  if (loading) return <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>;

  return (
    <div className="space-y-2">
      {confirmDelete && <ConfirmDialog open={true} title="Delete File" message="Are you sure you want to delete this file?" onConfirm={() => handleDelete(confirmDelete)} onCancel={() => setConfirmDelete(null)} />}
      <label className="flex items-center gap-2 h-8 px-3 rounded-xl text-[#8b949e] text-[13px] font-bold hover:text-white cursor-pointer w-fit" style={G.btn}>
        <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading..." : "Upload File"}
        <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>
      {documents.length === 0 ? <p className="text-[#8b949e] text-[13px]">No files uploaded yet</p> : documents.map(doc => {
        const ext = doc.filename.split(".").pop()?.toLowerCase() || "";
        const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);
        const isPdf = ext === "pdf";
        return (
          <div key={doc.id} className="flex items-center justify-between px-3 py-2 rounded-xl group hover:bg-white/[0.02]" style={G.subtle}>
            <div className="relative group/preview flex items-center gap-2 min-w-0">
              <Paperclip className="w-3.5 h-3.5 text-[#484f58] flex-shrink-0" />
              <a href={fileHref(doc.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-white text-[13px] font-bold truncate hover:text-blue-400">{doc.filename}</a>
              <span className="text-[#8b949e] text-[11px] flex-shrink-0">{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : ""}</span>
              <div className="hidden group-hover/preview:flex absolute z-50 pointer-events-none items-center justify-center rounded-xl overflow-hidden" style={{ bottom: "calc(100% + 8px)", left: 0, width: "200px", height: "200px", background: "rgba(7,12,26,0.97)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>
                {isImage ? (
                  <img src={fileHref(doc.fileUrl)} alt="" className="w-full h-full object-cover" />
                ) : isPdf ? (
                  <iframe src={`${fileHref(doc.fileUrl)}#page=1&view=FitH`} className="w-full h-full" style={{ border: "none" }} title={doc.filename} />
                ) : (
                  <div className="flex flex-col items-center gap-2"><FileText className="w-10 h-10 text-[#8b949e]" /><span className="text-[#8b949e] text-[11px] uppercase font-bold">{ext || "file"}</span></div>
                )}
              </div>
            </div>
            <button onClick={() => setConfirmDelete(doc.id)} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-rose-500/10 flex items-center justify-center cursor-pointer flex-shrink-0"><Trash2 className="w-3 h-3 text-rose-400" /></button>
          </div>
        );
      })}
    </div>
  );
}
