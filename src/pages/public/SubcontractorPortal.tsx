import { useEffect, useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, Paperclip } from "lucide-react";
import { clsx } from "clsx";
import logoImg from "../../assets/2026-06-14_21.13.34_e-techsystemsja.com_2f51395e09e8-removebg-preview (1).png";
import { API, fileHref } from "../../api";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { G } from "../../lib/constants";
import type { PublicSubcontractor, TaskPriority } from "../../types";

export function SubcontractorPortal({ token }: { token: string }) {
  const [sub, setSub] = useState<PublicSubcontractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    API.subcontractors.getPublic(token).then(setSub).catch(() => setError(true)).finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8" style={{ background: "#05070d" }}>
      <div className="w-full max-w-[560px]">
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <img src={logoImg} alt="E-Tech Systems" className="h-9 object-contain" style={{ filter: "brightness(1.1)" }} />
        </div>
        <div className="rounded-3xl p-6 md:p-8" style={G.liquidGlass}>
          {loading ? (
            <div className="space-y-3"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-24 rounded-2xl" /></div>
          ) : error || !sub ? (
            <EmptyState icon={AlertTriangle} title="Link not found" description="This link has been revoked or doesn't exist. Contact the project team for a new one." />
          ) : (
            <>
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest mb-3" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>Read-only portal</span>
              <h1 className="text-white font-extrabold text-3xl md:text-4xl tracking-tight mb-1">{sub.name}</h1>
              <p className="text-[#8b949e] text-[14px] md:text-[15px] mb-6 flex items-center gap-1.5 flex-wrap"><Building2 className="w-3.5 h-3.5" /> {sub.projectName}{sub.trade ? ` · ${sub.trade}` : ""}</p>
              <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-3">Assigned Tasks</p>
                {sub.tasks.length === 0 ? (
                  <p className="text-[#8b949e] text-[13px]">No tasks assigned yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sub.tasks.map(task => {
                      const priorityColors: Record<TaskPriority, string> = { low: "#94a3b8", medium: "#fbbf24", high: "#f87171" };
                      return (
                        <div key={task.id} className="flex items-start gap-2 p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                          <div className={clsx("w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", task.status === "complete" ? "bg-emerald-500" : "border-2 border-[#484f58]")}>{task.status === "complete" && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}</div>
                          <div className="flex-1 min-w-0">
                            <p className={clsx("text-[13px] font-bold", task.status === "complete" ? "text-[#484f58] line-through" : "text-white")}>{task.title}</p>
                            {task.description && <p className="text-[#8b949e] text-[12px] mt-0.5">{task.description}</p>}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] font-extrabold" style={{ color: priorityColors[task.priority] }}>{task.priority}</span>
                              {task.dueDate && <span className="text-[#8b949e] text-[11px]">{new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-3">Documents</p>
                {sub.documents.length === 0 ? (
                  <p className="text-[#8b949e] text-[13px]">No documents have been shared yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sub.documents.map(doc => (
                      <a key={doc.id} href={fileHref(doc.fileUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/[0.04] transition-colors">
                        <Paperclip className="w-3.5 h-3.5 text-[#8b949e] flex-shrink-0" />
                        <span className="text-white text-[13px] font-bold truncate">{doc.filename}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
