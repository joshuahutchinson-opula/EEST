import { useEffect, useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, Clock, MapPin } from "lucide-react";
import { clsx } from "clsx";
import logoImg from "../../assets/2026-06-14_21.13.34_e-techsystemsja.com_2f51395e09e8-removebg-preview (1).png";
import { API, ApiError, fileHref } from "../../api";
import { ApprovalDialog } from "./ApprovalDialog";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { ASSET_CATEGORY_LABELS, G } from "../../lib/constants";
import { fmtDateFull, projectStageBadge } from "../../lib/utils";
import type { PublicProjectStatus } from "../../types";

export function publicAssetDescription(a: PublicProjectStatus["assets"][number]): string {
  if (a.manufacturer || a.model) return `${a.manufacturer || ""} ${a.model || ""}`.trim();
  if (a.cableSpec) return `${a.cableSpec.cableType}${a.cableSpec.runDescription ? " — " + a.cableSpec.runDescription : ""}`;
  return a.purpose || ASSET_CATEGORY_LABELS[a.category];
}

export function ClientStatusPage({ token }: { token: string }) {
  const [data, setData] = useState<PublicProjectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [approving, setApproving] = useState<{ targetType: "quote" | "change_order"; targetId: string; title: string; summary: string } | null>(null);

  const load = () => API.publicStatus.get(token).then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  useEffect(() => { load(); }, [token]);

  const jmd = (n: number) => `J$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const submitApproval = async (signerName: string, signature: string) => {
    if (!approving) return;
    try {
      await API.publicStatus.approve(token, { targetType: approving.targetType, targetId: approving.targetId, signerName, signature });
    } catch (err) {
      throw new Error((err instanceof ApiError ? (err.body as { error?: string } | null)?.error : null) || "Couldn't record the approval. Please try again.");
    }
    setApproving(null);
    await load();
  };

  const fmtUSD = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "#05070d" }}>
      {approving && <ApprovalDialog title={approving.title} summary={approving.summary} onClose={() => setApproving(null)} onSubmit={submitApproval} />}
      <div className="w-full max-w-[720px] mx-auto">
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <img src={logoImg} alt="E-Tech Systems" className="h-9 object-contain" style={{ filter: "brightness(1.1)" }} />
        </div>
        {loading ? (
          <div className="space-y-3"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-32 rounded-2xl" /></div>
        ) : error || !data ? (
          <div className="rounded-3xl p-6 md:p-8" style={G.liquidGlass}><EmptyState icon={AlertTriangle} title="Link not found" description="This link has been revoked or doesn't exist. Contact the project team for a new one." /></div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-3xl p-6 md:p-8" style={G.liquidGlass}>
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest mb-3" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>Project status</span>
              <h1 className="text-white font-extrabold text-3xl md:text-4xl tracking-tight mb-1">{data.project.name}</h1>
              <p className="text-[#8b949e] text-[14px] md:text-[15px] mb-6 flex items-center gap-1.5 flex-wrap"><Building2 className="w-3.5 h-3.5" /> {data.project.client} · <MapPin className="w-3.5 h-3.5 ml-1" /> {data.project.location}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-6">
                {[
                  { label: "Stage", value: projectStageBadge(data.project.projectStage).label, color: "#3b82f6" },
                  { label: "Cameras", value: String(data.project.cameras), color: "#8b5cf6" },
                  { label: "Due Date", value: fmtDateFull(data.project.dueDate), color: "#f59e0b" },
                  { label: "Progress", value: `${data.project.progress}%`, color: "#10b981" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl px-3 py-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest mb-1" style={{ color: "rgba(139,148,158,0.85)" }}>{s.label}</p>
                    <p className="text-[1.2rem] font-extrabold tracking-tight leading-none" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
              {data.project.summary && (
                <div className="mb-5">
                  <p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-2">Project Scope</p>
                  <p className="text-[#8b949e] text-[13px] leading-relaxed">{data.project.summary}</p>
                </div>
              )}
              {data.project.team.length > 0 && (
                <div className="mb-5">
                  <p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-3">Team</p>
                  <div className="space-y-2">
                    {data.project.team.map((m) => (
                      <div key={m.name} className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-extrabold text-white flex-shrink-0" style={{ background: m.color }}>{m.initials}</div>
                        <div><p className="text-white text-[13px] font-bold">{m.name}</p><p className="text-[#8b949e] text-[11px]">{m.roles.join(", ")}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.project.stageHistory.length > 0 && (
                <div>
                  <p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-3">Timeline</p>
                  <div className="space-y-2">
                    {data.project.stageHistory.map((entry, i) => {
                      const isLast = i === data.project.stageHistory.length - 1;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className={clsx("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", isLast ? "bg-blue-500/20 ring-2 ring-blue-500/40" : "bg-emerald-500/20")}>{isLast ? <Clock className="w-3 h-3 text-blue-400" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400" />}</div>
                          <div className="flex-1 flex items-center justify-between"><span className={clsx("text-[13px] font-bold", isLast ? "text-white" : "text-[#8b949e]")}>{entry.stage.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span><span className="text-[#8b949e] text-[12px]">{fmtDateFull(entry.date)}</span></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {data.quote && (
              <div className="rounded-3xl p-6 md:p-8" style={G.liquidGlass}>
                <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                  <div><p className="text-white text-[15px] font-extrabold">Quotation {data.quote.refNumber} · Rev {data.quote.revision}</p><p className="text-[#8b949e] text-[12px] mt-0.5">Prices in Jamaican dollars (J$ {data.quote.exchangeRate.toFixed(2)} per US$1)</p></div>
                  {data.quote.approval
                    ? <span className="text-[12px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/12 text-emerald-400">Approved by {data.quote.approval.signerName} · {fmtDateFull(data.quote.approval.approvedAt)}</span>
                    : data.quote.status === "sent" && <button onClick={() => setApproving({ targetType: "quote", targetId: data.quote!.id, title: `Approve quotation ${data.quote!.refNumber}`, summary: `Rev ${data.quote!.revision} · total ${jmd(data.quote!.totalJmd)} incl. GCT` })} className="h-9 px-4 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#10b981" }}>Review &amp; approve</button>}
                </div>
                <div className="space-y-3">
                  {data.quote.sections.map((s) => (
                    <div key={s.section}>
                      <p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-1">{s.section} — {s.name}</p>
                      {s.rows.map((r, i) => (
                        <div key={i} className="flex items-baseline justify-between gap-3 py-1 text-[13px]" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <span className="text-white">{r.description}{r.quantity !== 1 && <span className="text-[#8b949e]"> × {r.quantity}</span>}</span>
                          <span className="text-white font-bold whitespace-nowrap">{jmd(r.extendedJmd)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
                  <div className="flex justify-between text-[13px]"><span className="text-[#8b949e]">Subtotal</span><span className="text-white font-bold">{jmd(data.quote.subtotalJmd)}</span></div>
                  <div className="flex justify-between text-[13px]"><span className="text-[#8b949e]">GCT (15%)</span><span className="text-white font-bold">{jmd(data.quote.gctJmd)}</span></div>
                  <div className="flex justify-between text-[15px]"><span className="text-white font-extrabold">Total</span><span className="font-black" style={{ color: "#60a5fa" }}>{jmd(data.quote.totalJmd)}</span></div>
                </div>
              </div>
            )}

            <div className="rounded-3xl p-6 md:p-8" style={G.liquidGlass}>
              <p className="text-white text-[15px] font-extrabold mb-3">Change Orders</p>
              {data.changeOrders.length === 0 ? <p className="text-[#8b949e] text-[13px]">No change orders yet.</p> : (
                <div className="space-y-2">
                  {data.changeOrders.map((co, i) => (
                    <div key={i} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between"><p className="text-white text-[14px] font-bold">{co.title}</p><span className={clsx("text-[11px] font-extrabold px-2 py-0.5 rounded-full", co.status === "approved" ? "bg-emerald-500/12 text-emerald-400" : co.status === "submitted" ? "bg-blue-500/12 text-blue-400" : co.status === "rejected" ? "bg-rose-500/12 text-rose-400" : "bg-amber-500/12 text-amber-400")}>{co.status}</span></div>
                      {co.description && <p className="text-[#8b949e] text-[13px] mt-1">{co.description}</p>}
                      {co.costImpact !== 0 && <p className="text-white text-[14px] font-extrabold mt-2">{fmtUSD(co.costImpact)}</p>}
                      {co.approval
                        ? <p className="text-emerald-400 text-[12px] font-bold mt-2">Approved by {co.approval.signerName} · {fmtDateFull(co.approval.approvedAt)}</p>
                        : co.status === "submitted" && <button onClick={() => setApproving({ targetType: "change_order", targetId: co.id, title: `Approve change order`, summary: `${co.title}${co.costImpact ? ` · ${fmtUSD(co.costImpact)}` : ""}` })} className="mt-3 h-8 px-3 rounded-lg text-white text-[12px] font-extrabold cursor-pointer" style={{ background: "#10b981" }}>Approve</button>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl p-6 md:p-8" style={G.liquidGlass}>
              <p className="text-white text-[15px] font-extrabold mb-3">Assets</p>
              {data.assets.length === 0 ? <p className="text-[#8b949e] text-[13px]">No assets recorded yet.</p> : (
                <div className="space-y-2">
                  {data.assets.map((a, i) => (
                    <div key={i} className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <p className="text-white text-[13px] font-bold">{publicAssetDescription(a)} <span className="text-[#8b949e] font-semibold">×{a.quantity}</span></p>
                      <p className="text-[#8b949e] text-[12px] mt-0.5">{a.location || "No location set"}{a.purpose ? ` · ${a.purpose}` : ""}</p>
                      {a.coveragePhotos && a.coveragePhotos.length > 0 && <div className="flex gap-2 mt-2 flex-wrap">{a.coveragePhotos.map((p, pi) => <img key={pi} src={fileHref(p)} alt="" className="w-14 h-14 rounded-lg object-cover" style={{ border: "1px solid rgba(255,255,255,0.10)" }} />)}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
