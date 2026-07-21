import { useState, useMemo, createContext, useContext, useEffect, useCallback, useRef } from "react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera, Fingerprint, Building2, MapPin, Calendar,
  DollarSign, Eye, Layers, MoreHorizontal, GripVertical, Plus,
  Search, Bell, Settings, TrendingUp, Star, BarChart3,
  ChevronDown, Loader2, ArrowLeft, CheckCircle2, Clock,
  AlertTriangle, Key, Download, Share2, FileText,
  Grid3x3, List, ZoomIn, ZoomOut, MousePointer, Move,
  Trash2, X, Package, AlertCircle, RotateCcw,
  ChevronRight, Upload, Pencil, Lock,
  Cpu, Activity, CheckSquare, ChevronUp, ExternalLink,
  Phone, Mail, MessageSquare, StickyNote, Users, Store,
  DoorOpen, PanelRight, Zap, Server, Cable, Box, Save,
} from "lucide-react";
import { clsx } from "clsx";
import logoImg from "./assets/2026-06-14_21.13.34_e-techsystemsja.com_2f51395e09e8-removebg-preview (1).png";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const GCT_RATE = 0.15;
const TEAM = [
  { name: "Joshua", initials: "JS", color: "#3b82f6" },
  { name: "Roger", initials: "RG", color: "#06b6d4" },
  { name: "Donovan", initials: "DV", color: "#8b5cf6" },
  { name: "Michael", initials: "MC", color: "#f59e0b" },
  { name: "Denise", initials: "DN", color: "#f97316" },
  { name: "Rochelle", initials: "RC", color: "#10b981" },
];
const CURRENT_USER = TEAM[0];

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function fmtDateFull(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

function fovPath(cx: number, cy: number, rotDeg: number, fovDeg: number, r: number) {
  const rot = (rotDeg * Math.PI) / 180; const half = (fovDeg / 2 * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rot - half), y1 = cy + r * Math.sin(rot - half);
  const x2 = cx + r * Math.cos(rot + half), y2 = cy + r * Math.sin(rot + half);
  return `M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 0,1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`;
}

const G = {
  card: { background: "rgba(255,255,255,0.055)", backdropFilter: "blur(24px) saturate(160%)", WebkitBackdropFilter: "blur(24px) saturate(160%)", border: "1px solid rgba(255,255,255,0.11)", boxShadow: "0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.09)" } as React.CSSProperties,
  panel: { background: "rgba(7,12,26,0.72)", backdropFilter: "blur(40px) saturate(180%)", WebkitBackdropFilter: "blur(40px) saturate(180%)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)" } as React.CSSProperties,
  subtle: { background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" } as React.CSSProperties,
  input: { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.2)" } as React.CSSProperties,
  btn: { background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" } as React.CSSProperties,
  liquidGlass: { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(28px) saturate(180%)", WebkitBackdropFilter: "blur(28px) saturate(180%)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)", borderRadius: "16px" } as React.CSSProperties,
};

interface CurrencyCtx { currency: "USD" | "JMD"; setCurrency: (c: "USD" | "JMD") => void; fmt: (usdAmt: number, compact?: boolean) => string; }
const CurrencyContext = createContext<CurrencyCtx>({ currency: "USD", setCurrency: () => {}, fmt: (n) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` });
const useCurrency = () => useContext(CurrencyContext);

function makeFmt(currency: "USD" | "JMD") {
  return (usdAmt: number, compact = false): string => {
    const amt = currency === "JMD" ? usdAmt * (parseFloat(localStorage.getItem("fx_rate") || "157.4")) : usdAmt;
    const sym = currency === "JMD" ? "J$" : "$";
    if (compact) { if (amt >= 1_000_000) return `${sym}${(amt / 1_000_000).toFixed(2)}M`; if (amt >= 1_000) return `${sym}${(amt / 1_000).toFixed(0)}K`; return `${sym}${amt.toFixed(0)}`; }
    return `${sym}${amt.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };
}

type Page = "login" | "dashboard" | "design-studio" | "project-detail" | "design-canvas" | "workbook" | "install-tracker" | "device-store";
type Stage = "assessment-scheduled" | "assessment-completed" | "design" | "proposal" | "negotiation" | "win" | "lose";
type LeadSource = "Tender" | "Single Source" | "Inbound" | "Referral" | "Recurring Client" | "Outbound";
type QuoteType = "Video Surveillance" | "Access Control" | "Both";

interface Project { id: string; name: string; client: string; value: number; stage: Stage; risk: "low" | "medium" | "high"; assignee: { name: string; initials: string; color: string }; dueDate: string; cameras: number; devices: number; location: string; contact?: { name: string; title: string; email: string; phone: string }; summary?: string; notes?: string; collaborators?: { name: string; initials: string; color: string; role: string }[]; leadSource?: LeadSource; stageHistory?: { stage: Stage; date: string }[]; createdAt?: string; updatedAt?: string; }
interface QuoteLineItem { id: string; itemNumber: string; description: string; unitCost: number; quantity: number; markupPercent: number; sellPrice: number; costTotal: number; sellTotal: number; profit: number; jmdConversion: number; }
interface QuoteCategory { id: string; name: string; type: QuoteType; lineItems: QuoteLineItem[]; contingency?: QuoteLineItem; }
interface Quote { id: string; clientName: string; refNumber: string; date: string; status: "draft" | "sent" | "approved" | "rejected"; quoteType: QuoteType; categories: QuoteCategory[]; exchangeRate: number; projectId?: string; createdAt?: string; updatedAt?: string; }
interface QuoteCtx { currentQuote: Quote | null; setCurrentQuote: (q: Quote | null) => void; addToQuote: (device: CatalogDevice) => void; }
const QuoteContext = createContext<QuoteCtx>({ currentQuote: null, setCurrentQuote: () => {}, addToQuote: () => {} });
const useQuote = () => useContext(QuoteContext);

type InstallStatus = "pending" | "in-progress" | "complete" | "failed";
interface InstallDevice { id: string; name: string; type: "camera" | "access" | "nvr" | "door" | "panel" | "power" | "server"; location: string; status: InstallStatus; assignee: string; notes?: string; }
interface InstallZone { id: string; name: string; devices: InstallDevice[]; projectId?: string; }

type DeviceTag = "LPR" | "Night Vision" | "Thermal" | "PTZ" | "Panoramic" | "WDR" | "Lightfinder" | "IR" | "4K" | "8MP" | "Indoor" | "Outdoor";
type CameraType = "Dome" | "Bullet" | "PTZ" | "Box" | "Panoramic" | "Thermal";
interface CatalogDevice { id: string; model: string; manufacturer: string; category: "camera" | "access-control" | "nvr" | "analytics" | "other"; cameraType?: CameraType; resolution?: string; lens?: string; sensor?: string; nightVision?: string; weatherRating?: string; powerInput?: string; storage?: string; channels?: string; readers?: string; authentication?: string; price?: number; sku?: string; discontinued?: boolean; imageUrl?: string; frameRate?: string; compression?: string; fov?: string; operatingTemp?: string; msrp?: number; tags?: DeviceTag[]; }
interface Column { id: Stage; label: string; color: string; }

const COLUMNS: Column[] = [
  { id: "assessment-scheduled", label: "Assessment Scheduled", color: "#f59e0b" },
  { id: "assessment-completed", label: "Assessment Completed", color: "#06b6d4" },
  { id: "design", label: "Design", color: "#8b5cf6" },
  { id: "proposal", label: "Proposal", color: "#3b82f6" },
  { id: "negotiation", label: "Negotiation", color: "#f97316" },
  { id: "win", label: "Win", color: "#10b981" },
  { id: "lose", label: "Lose", color: "#f43f5e" },
];

const CAMERA_TYPES: CameraType[] = ["Dome", "Bullet", "PTZ", "Box", "Panoramic", "Thermal"];

const LEAD_SOURCE_STYLES: Record<LeadSource, { bg: string; text: string }> = {
  "Tender": { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  "Single Source": { bg: "rgba(16,185,129,0.15)", text: "#34d399" },
  "Inbound": { bg: "rgba(139,92,246,0.15)", text: "#a78bfa" },
  "Referral": { bg: "rgba(245,158,11,0.15)", text: "#fbbf24" },
  "Recurring Client": { bg: "rgba(236,72,153,0.15)", text: "#f472b6" },
  "Outbound": { bg: "rgba(239,68,68,0.15)", text: "#f87171" },
};

const TAG_STYLES: Record<DeviceTag, { bg: string; text: string; border: string }> = {
  "LPR": { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", border: "rgba(59,130,246,0.30)" },
  "Night Vision": { bg: "rgba(16,185,129,0.15)", text: "#34d399", border: "rgba(16,185,129,0.30)" },
  "Thermal": { bg: "rgba(245,158,11,0.15)", text: "#fbbf24", border: "rgba(245,158,11,0.30)" },
  "PTZ": { bg: "rgba(139,92,246,0.15)", text: "#a78bfa", border: "rgba(139,92,246,0.30)" },
  "Panoramic": { bg: "rgba(236,72,153,0.15)", text: "#f472b6", border: "rgba(236,72,153,0.30)" },
  "WDR": { bg: "rgba(6,182,212,0.15)", text: "#22d3ee", border: "rgba(6,182,212,0.30)" },
  "Lightfinder": { bg: "rgba(168,85,247,0.15)", text: "#c084fc", border: "rgba(168,85,247,0.30)" },
  "IR": { bg: "rgba(239,68,68,0.15)", text: "#f87171", border: "rgba(239,68,68,0.30)" },
  "4K": { bg: "rgba(34,197,94,0.15)", text: "#4ade80", border: "rgba(34,197,94,0.30)" },
  "8MP": { bg: "rgba(251,146,60,0.15)", text: "#fb923c", border: "rgba(251,146,60,0.30)" },
  "Indoor": { bg: "rgba(148,163,184,0.15)", text: "#94a3b8", border: "rgba(148,163,184,0.30)" },
  "Outdoor": { bg: "rgba(71,85,105,0.15)", text: "#64748b", border: "rgba(71,85,105,0.30)" },
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = {};
  if (!(options?.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

const API = {
  projects: { list: () => apiFetch<Project[]>("/projects"), get: (id: string) => apiFetch<Project>(`/projects/${id}`), create: (data: Partial<Project>) => apiFetch<Project>("/projects", { method: "POST", body: JSON.stringify(data) }), update: (id: string, data: Partial<Project>) => apiFetch<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }), delete: (id: string) => apiFetch<void>(`/projects/${id}`, { method: "DELETE" }) },
  quotes: { list: () => apiFetch<Quote[]>("/quotes"), get: (id: string) => apiFetch<Quote>(`/quotes/${id}`), create: (data: Partial<Quote>) => apiFetch<Quote>("/quotes", { method: "POST", body: JSON.stringify(data) }), update: (id: string, data: Partial<Quote>) => apiFetch<Quote>(`/quotes/${id}`, { method: "PATCH", body: JSON.stringify(data) }), delete: (id: string) => apiFetch<void>(`/quotes/${id}`, { method: "DELETE" }) },
  devices: { list: () => apiFetch<CatalogDevice[]>("/devices"), get: (id: string) => apiFetch<CatalogDevice>(`/devices/${id}`), create: (data: Partial<CatalogDevice>) => apiFetch<CatalogDevice>("/devices", { method: "POST", body: JSON.stringify(data) }), bulk: (devices: Partial<CatalogDevice>[]) => apiFetch<{ imported: number }>("/devices/bulk", { method: "POST", body: JSON.stringify({ devices }) }) },
  install: { zones: () => apiFetch<InstallZone[]>("/install/zones"), createZone: (data: { name: string; projectId?: string }) => apiFetch<InstallZone>("/install/zones", { method: "POST", body: JSON.stringify(data) }), addDevice: (zoneId: string, data: Partial<InstallDevice>) => apiFetch<InstallDevice>(`/install/zones/${zoneId}/devices`, { method: "POST", body: JSON.stringify(data) }), updateStatus: (zoneId: string, deviceId: string, status: InstallStatus) => apiFetch<void>(`/install/zones/${zoneId}/devices/${deviceId}`, { method: "PATCH", body: JSON.stringify({ status }) }) },
  canvas: { get: (projectId: string) => apiFetch<{ projectId: string; layoutData: any }>(`/canvas/${projectId}`), save: (projectId: string, data: any) => apiFetch<void>(`/canvas/${projectId}`, { method: "PUT", body: JSON.stringify(data) }), upload: (projectId: string, file: File) => { const fd = new FormData(); fd.append("file", file); return apiFetch<{ url: string }>(`/canvas/${projectId}/upload`, { method: "POST", body: fd }); } },
  fx: { getRate: async () => { try { const res = await fetch("https://open.er-api.com/v6/latest/USD"); const data = await res.json(); const rate = data.rates?.JMD || 157.4; localStorage.setItem("fx_rate", String(rate)); return rate; } catch { return parseFloat(localStorage.getItem("fx_rate") || "157.4"); } } },
};

function Skeleton({ className }: { className?: string }) { return <div className={clsx("animate-pulse rounded-2xl", className)} style={{ background: "rgba(255,255,255,0.04)" }} />; }

function EmptyState({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.18)" }}><Icon className="w-8 h-8 text-blue-400" /></div>
      <h3 className="text-white text-[15px] font-bold mb-1.5">{title}</h3><p className="text-[#8b949e] text-[13px] max-w-sm mb-5">{description}</p>
      {action && <button onClick={action.onClick} className="h-9 px-5 rounded-xl text-white text-[13px] font-bold cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}>{action.label}</button>}
    </div>
  );
}

function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();
  return (
    <div className="flex items-center h-8 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
      {(["USD", "JMD"] as const).map((c) => (<button key={c} onClick={() => setCurrency(c)} className="h-full px-2.5 text-[11px] font-bold transition-all cursor-pointer active:scale-[0.97] transition-transform" style={currency === c ? { background: "#3b82f6", color: "#fff" } : { color: "#8b949e" }}>{c}</button>))}
    </div>
  );
}
const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: "dashboard", label: "Pipeline" }, { id: "design-studio", label: "Projects" }, { id: "workbook", label: "Workbook" }, { id: "install-tracker", label: "Install Tracker" }, { id: "device-store", label: "Device Store" },
];

function AppTopbar({ page, navigate, breadcrumb }: { page: Page; navigate: (p: Page) => void; breadcrumb?: { label: string; parent: Page } }) {
  const activeTab = NAV_ITEMS.find((n) => n.id === page)?.id ?? null;
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 flex items-center gap-3 md:gap-5 px-3 md:px-5"
      style={{ background: "rgba(7,12,26,0.65)", backdropFilter: "blur(40px) saturate(180%)", borderBottom: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.5)" }}>
      <button onClick={() => navigate("dashboard")} className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]">
        <img src={logoImg} alt="E-Tech Systems" className="h-8 md:h-10 object-contain" style={{ filter: "brightness(1.1)", marginTop: "-2px", marginBottom: "-2px" }} />
      </button>
      <div className="w-px h-4 flex-shrink-0 hidden md:block" style={{ background: "rgba(255,255,255,0.12)" }} />
      {breadcrumb ? (
        <div className="flex items-center gap-2"><button onClick={() => navigate(breadcrumb.parent)} className="flex items-center gap-1.5 text-[#8b949e] hover:text-white text-[12px] font-semibold transition-colors cursor-pointer active:scale-[0.97] transition-transform"><ArrowLeft className="w-3.5 h-3.5" />{breadcrumb.label}</button><ChevronRight className="w-3.5 h-3.5 text-[#484f58]" /><span className="text-white text-[12px] font-semibold">Project Detail</span></div>
      ) : (
        <nav className="flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {NAV_ITEMS.map((item) => (<button key={item.id} onClick={() => navigate(item.id)} className={clsx("h-8 px-2.5 md:px-3.5 rounded-xl text-[11px] md:text-[13px] font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer active:scale-[0.97] transition-transform", activeTab === item.id ? "text-white" : "text-[#8b949e] hover:text-white")} style={activeTab === item.id ? { background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" } : undefined}>{item.label}</button>))}
        </nav>
      )}
      <div className="flex-1" />
      <div className="flex items-center gap-1 md:gap-1.5">
        <div className="hidden md:block"><CurrencyToggle /></div>
        <button onClick={() => navigate("login")} className="flex items-center gap-2 h-8 pl-1.5 pr-2.5 rounded-xl hover:bg-white/[0.06] transition-colors ml-1 cursor-pointer active:scale-[0.97] transition-transform min-h-[44px] md:min-h-0"><div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 0 12px rgba(139,92,246,0.5)" }}>{CURRENT_USER.initials}</div><span className="text-white text-[12px] font-semibold hidden md:inline">{CURRENT_USER.name}</span></button>
      </div>
    </header>
  );
}

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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => { setDragging(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragEnd = () => { setDragging(null); setDragOverCol(null); };
  const handleDrop = async (colId: Stage) => {
    if (dragging) {
      const project = projects.find((p) => p.id === dragging);
      if (project && project.stage !== colId && colId !== "lose") { setProgressAnim({ id: dragging, stage: colId }); setTimeout(() => setProgressAnim(null), 1500); }
      setProjects((prev) => prev.map((p) => p.id === dragging ? { ...p, stage: colId, stageHistory: [...(p.stageHistory || []), { stage: colId, date: new Date().toISOString().slice(0, 10) }] } : p));
      try { await API.projects.update(dragging, { stage: colId }); } catch {}
    }
    setDragging(null); setDragOverCol(null);
  };
  const handleDelete = async (id: string) => { setProjects((prev) => prev.filter((p) => p.id !== id)); try { await API.projects.delete(id); toast.success("Project deleted"); } catch { fetchProjects(); } };
  const handleUpdate = async (updated: Project) => { setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p)); setSelectedDeal(updated); try { await API.projects.update(updated.id, updated); toast.success("Updated"); } catch { fetchProjects(); } };

  const selectedColumn = selectedDeal ? COLUMNS.find((c) => c.id === selectedDeal.stage)! : null;
  const STAT_COLORS = ["#3b82f6", "#10b981", "#f97316", "#8b5cf6"];

  if (loading) return <div className="px-3 md:px-5 py-4 md:py-6 space-y-4"><Skeleton className="h-10 w-48" /><div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div></div>;

  return (
    <div>
      {selectedDeal && selectedColumn && <DealModal project={selectedDeal} column={selectedColumn} onClose={() => setSelectedDeal(null)} navigate={navigate} onUpdate={handleUpdate} onDelete={(id) => { handleDelete(id); setSelectedDeal(null); }} />}
      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} onAdd={async (p) => { setProjects((prev) => [p, ...prev]); try { await API.projects.create(p); } catch { fetchProjects(); } }} />}
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
  const [name, setName] = useState(""); const [client, setClient] = useState(""); const [location, setLocation] = useState(""); const [value, setValue] = useState(""); const [stage, setStage] = useState<Stage>("assessment-scheduled"); const [risk, setRisk] = useState<"low" | "medium" | "high">("low"); const [dueDate, setDueDate] = useState(""); const [summary, setSummary] = useState(""); const [leadSource, setLeadSource] = useState<LeadSource>("Inbound"); const [contactName, setContactName] = useState(""); const [contactTitle, setContactTitle] = useState(""); const [contactEmail, setContactEmail] = useState(""); const [contactPhone, setContactPhone] = useState(""); const [submitting, setSubmitting] = useState(false);
  const [collabSelect, setCollabSelect] = useState(""); const [collabRole, setCollabRole] = useState(""); const [collaborators, setCollaborators] = useState<{ name: string; initials: string; color: string; role: string }[]>([]);
  const canSubmit = name.trim() && client.trim();

  const addCollaborator = () => { if (!collabSelect) return; const member = TEAM.find(t => t.name === collabSelect); if (!member || collaborators.find(c => c.name === member.name)) return; setCollaborators((prev) => [...prev, { name: member.name, initials: member.initials, color: member.color, role: collabRole.trim() || "Team Member" }]); setCollabSelect(""); setCollabRole(""); };

  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!canSubmit || submitting) return; setSubmitting(true); const newProject: Project = { id: crypto.randomUUID?.() || `p${Date.now()}`, name: name.trim(), client: client.trim(), location: location.trim() || "TBD", value: Math.round(parseFloat(value.replace(/[^0-9.]/g, "")) * (value.includes("M") ? 1_000_000 : value.includes("K") ? 1000 : 1)) || 0, cameras: 0, devices: 0, stage, risk, assignee: CURRENT_USER, dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), summary: summary.trim() || undefined, leadSource, collaborators: collaborators.length > 0 ? collaborators : undefined, stageHistory: [{ stage, date: new Date().toISOString().slice(0, 10) }], contact: contactName.trim() ? { name: contactName.trim(), title: contactTitle.trim(), email: contactEmail.trim(), phone: contactPhone.trim() } : undefined }; onAdd(newProject); setSubmitting(false); onClose(); };

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
      </div><div className="px-5 md:px-7 pb-7 pt-4 flex gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}><button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[13px] font-semibold cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={G.btn}>Cancel</button><button type="submit" disabled={!canSubmit || submitting} className="flex-1 h-10 rounded-xl text-white text-[13px] font-bold transition-all disabled:opacity-40 cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={{ background: "#3b82f6", boxShadow: canSubmit ? "0 4px 20px rgba(59,130,246,0.4)" : "none" }}>{submitting ? "Adding…" : "Add to Pipeline"}</button></div></form>
    </motion.div></div>
  );
}

function DealModal({ project, column, onClose, navigate, onUpdate, onDelete }: { project: Project; column: Column; onClose: () => void; navigate: (p: Page) => void; onUpdate: (p: Project) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false); const { fmt } = useCurrency();
  const [editName, setEditName] = useState(project.name); const [editClient, setEditClient] = useState(project.client); const [editLocation, setEditLocation] = useState(project.location); const [editValue, setEditValue] = useState(String(project.value)); const [editRisk, setEditRisk] = useState(project.risk); const [editDueDate, setEditDueDate] = useState(project.dueDate); const [saving, setSaving] = useState(false);
  const ls = project.leadSource ? LEAD_SOURCE_STYLES[project.leadSource] : null;

  const handleSave = async () => { setSaving(true); const updated: Project = { ...project, name: editName, client: editClient, location: editLocation, value: parseFloat(editValue) || project.value, risk: editRisk, dueDate: editDueDate }; onUpdate(updated); setEditing(false); setSaving(false); };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}><div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} /><motion.div initial={{ opacity: 0, scale: 0.93, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-3xl" style={{ background: "rgba(7,12,26,0.78)", backdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 32px 80px rgba(0,0,0,0.9)" }}>
      <div className="relative px-5 md:px-7 pt-5 md:pt-7 pb-5">
        <div className="flex items-start justify-between gap-4"><div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5"><span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full" style={{ background: `${column.color}22`, color: column.color, border: `1px solid ${column.color}44` }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: column.color }} />{column.label}</span>{ls && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: ls.bg, color: ls.text }}>{project.leadSource}</span>}</div>
          {editing ? <input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-white text-[1.1rem] font-bold bg-transparent border-b border-blue-500 w-full focus:outline-none" /> : <h2 className="text-white text-[1rem] md:text-[1.1rem] font-bold leading-snug">{project.name}</h2>}
          {editing ? <input value={editClient} onChange={(e) => setEditClient(e.target.value)} className="text-[#8b949e] text-[13px] bg-transparent border-b border-blue-500 w-full mt-1 focus:outline-none" /> : <p className="text-[#8b949e] text-[12px] md:text-[13px] font-semibold mt-1 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 flex-shrink-0" />{project.client}</p>}
        </div>
        <div className="flex gap-2"><button onClick={() => setEditing(!editing)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer active:scale-[0.97] transition-transform" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><Pencil className="w-4 h-4 text-[#8b949e]" /></button><button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer active:scale-[0.97] transition-transform" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><X className="w-4 h-4 text-[#8b949e]" /></button></div></div>
        {editing && <div className="grid grid-cols-2 gap-2 mt-3"><input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Location" className="w-full h-8 rounded-xl px-2 text-[12px] bg-transparent text-white" style={G.input} /><input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Value" className="w-full h-8 rounded-xl px-2 text-[12px] bg-transparent text-white" style={G.input} /><select value={editRisk} onChange={(e) => setEditRisk(e.target.value as "low"|"medium"|"high")} className="w-full h-8 rounded-xl px-2 text-[12px] bg-transparent text-white" style={G.input}>{["low","medium","high"].map((r) => <option key={r} value={r}>{r}</option>)}</select><input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="w-full h-8 rounded-xl px-2 text-[12px] bg-transparent text-white" style={{ ...G.input, colorScheme: "dark" }} /></div>}
        {editing && <div className="mt-3 flex gap-2"><button onClick={handleSave} disabled={saving} className="flex-1 h-9 rounded-xl text-white text-[13px] font-bold cursor-pointer active:scale-[0.97] transition-transform" style={{ background: "#10b981" }}><Save className="w-3.5 h-3.5 inline mr-1" />{saving ? "Saving…" : "Save"}</button><button onClick={() => setEditing(false)} className="flex-1 h-9 rounded-xl text-[#8b949e] text-[13px] font-semibold cursor-pointer active:scale-[0.97] transition-transform" style={G.btn}>Cancel</button></div>}
        <div className="grid grid-cols-2 gap-2 mt-3">{[{ label: "Value", value: fmt(project.value, true), color: "#3b82f6" },{ label: "Devices", value: String(project.devices), color: "#06b6d4" }].map((s) => (<div key={s.label} className="rounded-2xl px-3 py-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}><p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(139,148,158,0.85)" }}>{s.label}</p><p className="text-[1.2rem] font-bold tracking-tight leading-none" style={{ color: s.color }}>{s.value}</p></div>))}</div>
        <div className="mt-3 space-y-2"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ background: project.assignee.color }}>{project.assignee.initials}</div><span className="text-white text-[12px] font-semibold">{project.assignee.name}</span><span className="text-[#484f58] text-[10px]">· Account Owner</span></div>{project.collaborators?.map((c) => (<div key={c.name} className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ background: c.color }}>{c.initials}</div><span className="text-white text-[12px] font-semibold">{c.name}</span><span className="text-[#484f58] text-[10px]">· {c.role}</span></div>))}</div>
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

function UploadFloorPlanModal({ onClose, onUpload }: { onClose: () => void; onUpload: (file: File) => void }) {
  const [dragOver, setDragOver] = useState(false); const [file, setFile] = useState<File | null>(null); const [uploading, setUploading] = useState(false);
  const handleUpload = async () => { if (!file) return; setUploading(true); try { onUpload(file); onClose(); } catch { toast.error("Upload failed"); } finally { setUploading(false); } };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}><div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} /><motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[480px] rounded-3xl" style={{ background: "rgba(7,12,26,0.92)", backdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 32px 80px rgba(0,0,0,0.9)" }}><div className="flex items-center justify-between px-6 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}><div><h2 className="text-white text-[1rem] font-bold">Upload Floor Plan</h2></div><button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer active:scale-[0.97] transition-transform min-w-[44px] min-h-[44px]" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><X className="w-4 h-4 text-[#8b949e]" /></button></div><div className="p-6"><div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length > 0) setFile(e.dataTransfer.files[0]); }} className={clsx("border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer", dragOver ? "border-violet-400 bg-violet-500/[0.06]" : file ? "border-emerald-500/40 bg-emerald-500/[0.03]" : "border-white/[0.10] hover:border-white/[0.20]")} onClick={() => document.getElementById("floorplan-upload")?.click()}><input id="floorplan-upload" type="file" accept="image/*,.pdf,.dwg,.dxf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />{file ? <div className="space-y-2"><div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}><CheckCircle2 className="w-6 h-6 text-emerald-400" /></div><p className="text-white text-[13px] font-semibold">{file.name}</p><p className="text-[#484f58] text-[11px]">{(file.size / 1024).toFixed(0)} KB</p></div> : <div className="space-y-3"><div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)" }}><Upload className="w-6 h-6 text-violet-400" /></div><div><p className="text-white text-[13px] font-semibold">Drag & drop your floor plan</p><p className="text-[#484f58] text-[11px] mt-1">or click to browse files</p></div></div>}</div><div className="flex gap-3 mt-5"><button onClick={onClose} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[13px] font-semibold cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={G.btn}>Cancel</button><button onClick={handleUpload} disabled={!file || uploading} className="flex-1 h-10 rounded-xl text-white text-[13px] font-bold disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={{ background: "#8b5cf6", boxShadow: file ? "0 4px 20px rgba(139,92,246,0.4)" : "none" }}>{uploading ? "Uploading…" : "Upload"}</button></div></div></motion.div></div>
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [studioView, setStudioView] = useState<"projects" | "canvas">("projects");
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [canvasImageUrl, setCanvasImageUrl] = useState<string>("");

  const fetchProjects = useCallback(async () => { setLoading(true); try { const data = await API.projects.list(); setProjects(data); if (data.length > 0 && !activeProjectId) setActiveProjectId(data[0].id); } catch { setProjects([]); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleUpload = async (file: File) => {
    if (!activeProjectId) { toast.error("Select a project first"); return; }
    try { const result = await API.canvas.upload(activeProjectId, file); setCanvasImageUrl(result.url); setStudioView("canvas"); toast.success("Floor plan uploaded"); } catch { toast.error("Upload failed"); }
  };

  const filtered = useMemo(() => { let result = projects; if (filter !== "all") result = result.filter((p) => p.stage === filter); if (search.trim()) { const q = search.toLowerCase(); result = result.filter((p) => p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)); } return result; }, [projects, filter, search]);
  const stageFilters: { id: "all" | Stage; label: string }[] = [{ id: "all", label: "All" },{ id: "design", label: "In Design" },{ id: "proposal", label: "Proposal" },{ id: "win", label: "Won" }];
  const handleDelete = async (id: string) => { setProjects((prev) => prev.filter((p) => p.id !== id)); try { await API.projects.delete(id); toast.success("Project removed"); } catch { fetchProjects(); } };

  if (loading) return <div className="px-3 md:px-5 py-4 md:py-6 space-y-4"><Skeleton className="h-10 w-56" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div></div>;

  return (
    <div className="px-3 md:px-5 py-4 md:py-6">
      {showUploadModal && <UploadFloorPlanModal onClose={() => setShowUploadModal(false)} onUpload={handleUpload} />}
      <div className="flex items-center justify-between mb-4 md:mb-6"><div><h1 className="text-white font-bold text-lg md:text-xl tracking-tight">System Design Studio</h1></div><div className="flex items-center gap-2"><div className="flex items-center rounded-xl p-0.5 gap-0.5" style={G.btn}><button onClick={() => setStudioView("projects")} className={clsx("h-7 px-3 rounded-lg text-[11px] md:text-[12px] font-semibold transition-all cursor-pointer active:scale-[0.97] transition-transform", studioView === "projects" ? "text-white" : "text-[#484f58]")} style={studioView === "projects" ? { background: "rgba(255,255,255,0.12)" } : undefined}>Projects</button><button onClick={() => setStudioView("canvas")} className={clsx("h-7 px-3 rounded-lg text-[11px] md:text-[12px] font-semibold transition-all cursor-pointer active:scale-[0.97] transition-transform", studioView === "canvas" ? "text-white" : "text-[#484f58]")} style={studioView === "canvas" ? { background: "rgba(255,255,255,0.12)" } : undefined}>Canvas</button></div>{studioView === "projects" && <div className="flex items-center rounded-xl p-0.5 gap-0.5" style={G.btn}>{(["grid","list"] as const).map((m) => (<button key={m} onClick={() => setViewMode(m)} className={clsx("w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-[0.97] transition-transform", viewMode === m ? "text-white" : "text-[#484f58]")} style={viewMode === m ? { background: "rgba(255,255,255,0.12)" } : undefined}>{m === "grid" ? <Grid3x3 className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}</button>))}</div>}</div></div>

      {studioView === "canvas" ? (
        <div className="rounded-2xl overflow-hidden relative" style={{ ...G.card, minHeight: "50vh" }}>
          {canvasImageUrl ? <div className="relative w-full" style={{ paddingBottom: "56.25%" }}><img src={canvasImageUrl} alt="Floor Plan" className="absolute inset-0 w-full h-full object-contain" /></div> : <svg viewBox="0 0 990 610" className="w-full" style={{ maxHeight: "70vh" }}><rect width="990" height="610" fill="#070c1a" /><defs><pattern id="cgds" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.024)" strokeWidth="0.5" /></pattern></defs><rect width="990" height="610" fill="url(#cgds)" /><rect x="80" y="50" width="830" height="510" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" rx="2" /><rect x="80" y="50" width="220" height="150" fill="rgba(59,130,246,0.04)" /><text x="190" y="132" textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize="9" fontFamily="sans-serif">RECEPTION</text></svg>}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none"><div className="px-3 py-1.5 rounded-xl text-[10px] md:text-[11px] font-semibold text-white pointer-events-auto" style={G.liquidGlass}>Floor Plan</div><button onClick={() => navigate("design-canvas")} className="px-3 py-1.5 rounded-xl text-[10px] md:text-[11px] font-bold text-white pointer-events-auto cursor-pointer active:scale-[0.97] transition-transform" style={{ background: "#3b82f6" }}>Open Canvas</button></div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4 md:mb-5 flex-wrap">{stageFilters.map((f) => (<button key={f.id} onClick={() => setFilter(f.id)} className={clsx("h-7 px-3 rounded-full text-[11px] md:text-[12px] font-semibold transition-all cursor-pointer active:scale-[0.97] transition-transform", filter === f.id ? "text-white" : "text-[#8b949e]")} style={filter === f.id ? { background: "#3b82f6", boxShadow: "0 2px 12px rgba(59,130,246,0.3)" } : G.subtle}>{f.label}</button>))}<div className="relative ml-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-7 rounded-xl pl-7 pr-3 text-[11px] md:text-[12px] text-[#e6edf3] focus:outline-none w-36 md:w-44" style={G.input} /></div><span className="text-[#484f58] text-[11px] md:text-[12px] ml-1">{filtered.length} projects</span></div>
          {filtered.length === 0 ? <EmptyState icon={Layers} title="No projects found" /> : viewMode === "grid" ? (
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

  const fetchProject = useCallback(async () => { setLoading(true); try { const data = await API.projects.list(); if (data.length > 0) setProject(data[0]); else setProject(null); const qData = await API.quotes.list(); setQuotes(qData.filter((q: Quote) => q.projectId === data[0]?.id)); } catch { setProject(null); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchProject(); }, [fetchProject]);

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
      {activeTab === "quotes" && (quotes.length === 0 ? <EmptyState icon={DollarSign} title="No workbook yet" /> : <div className="space-y-3">{quotes.map((q) => (<div key={q.id} className="flex items-center justify-between rounded-2xl p-4" style={G.card}><div className="flex items-center gap-4"><DollarSign className="w-4 h-4 text-blue-400" /><div><p className="text-white text-[13px] font-semibold">{q.refNumber}</p><p className="text-[#484f58] text-[11px]">{q.date} · {q.status}</p></div></div><button onClick={() => navigate("workbook")} className="h-8 px-3 rounded-xl text-[#8b949e] text-[12px] font-semibold hover:text-white cursor-pointer" style={G.btn}>Open</button></div>))}</div>)}
      {activeTab === "change-orders" && <EmptyState icon={AlertTriangle} title="No change orders" />}
      {activeTab === "audit-log" && <EmptyState icon={FileText} title="No audit entries" />}
    </div>
  );
}
type CanvasDevice = { id: string; type: "camera" | "door" | "panel" | "power" | "server" | "cable"; x: number; y: number; rot: number; fov?: number; range?: number; label: string; selected?: boolean; connectedTo?: string[]; doorConfig?: { swing: "inswinging" | "outswinging"; lockType: string; readers: string[]; accessType: string; keyOverride: boolean }; cablePoints?: { x: number; y: number }[]; };

const CANVAS_TOOLS = [
  { id: "select", icon: MousePointer, label: "Select" }, { id: "move", icon: Move, label: "Pan" }, { id: "camera", icon: Camera, label: "Camera" },
  { id: "door", icon: DoorOpen, label: "Door" }, { id: "panel", icon: PanelRight, label: "Panel" }, { id: "power", icon: Zap, label: "Power" },
  { id: "server", icon: Server, label: "NVR" }, { id: "cable", icon: Cable, label: "Cable" }, { id: "trash", icon: Trash2, label: "Delete" },
];

function DesignCanvas({ navigate }: { navigate: (p: Page) => void }) {
  const [activeTool, setActiveTool] = useState("select"); const [showDeviceTray, setShowDeviceTray] = useState(false); const [showProperties, setShowProperties] = useState(true);
  const [showFov, setShowFov] = useState(true); const [view3D, setView3D] = useState(false); const [devices, setDevices] = useState<CanvasDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null); const [deviceSearch, setDeviceSearch] = useState("");
  const [canvasScale, setCanvasScale] = useState(1); const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [canvasImageUrl, setCanvasImageUrl] = useState<string>("");
  const [draggingDevice, setDraggingDevice] = useState<string | null>(null);
  const [cablePoints, setCablePoints] = useState<{ x: number; y: number }[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const canvasRef = useRef<HTMLDivElement>(null); const touchStartRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  const selected = devices.find((c) => c.id === selectedId);

  useEffect(() => { const loadCanvas = async () => { try { const projects = await API.projects.list(); const pid = projects[0]?.id; if (pid) { setProjectId(pid); const data = await API.canvas.get(pid); if (data.layoutData?.imageUrl) setCanvasImageUrl(data.layoutData.imageUrl); if (data.layoutData?.devices) setDevices(data.layoutData.devices); } } catch {} }; loadCanvas(); }, []);
  const saveCanvas = useCallback(async () => { if (!projectId) return; try { await API.canvas.save(projectId, { devices, imageUrl: canvasImageUrl }); } catch {} }, [devices, canvasImageUrl, projectId]);
  useEffect(() => { const t = setTimeout(() => { if (devices.length > 0 || canvasImageUrl) saveCanvas(); }, 2000); return () => clearTimeout(t); }, [devices, canvasImageUrl, saveCanvas]);

  const addDevice = (type: CanvasDevice["type"], x: number, y: number) => { const newDevice: CanvasDevice = { id: `dev${Date.now()}`, type, x, y, rot: 0, fov: type === "camera" ? 80 : undefined, range: type === "camera" ? 90 : undefined, label: `${type.toUpperCase()}-${String(devices.length + 1).padStart(2, "0")}`, doorConfig: type === "door" ? { swing: "inswinging", lockType: "Electric Strike", readers: [], accessType: "Card", keyOverride: true } : undefined }; setDevices((prev) => [...prev, newDevice]); setSelectedId(newDevice.id); };

  const handleCanvasMouseDown = (e: React.MouseEvent) => { if (activeTool === "move") return; const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return; const x = ((e.clientX - rect.left) / rect.width) * 990; const y = ((e.clientY - rect.top) / rect.height) * 610;
    if (activeTool === "select") { const clicked = devices.find((d) => Math.hypot(d.x - x, d.y - y) < 12); if (clicked) { setSelectedId(clicked.id); setDraggingDevice(clicked.id); } else { setSelectedId(null); } return; }
    if (activeTool === "cable") { setCablePoints((prev) => [...prev, { x, y }]); return; }
    if (activeTool === "trash") { const clicked = devices.find((d) => Math.hypot(d.x - x, d.y - y) < 12); if (clicked) { setDevices((prev) => prev.filter((d) => d.id !== clicked.id)); if (selectedId === clicked.id) setSelectedId(null); } return; }
    addDevice(activeTool as CanvasDevice["type"], x, y);
  };
  const handleCanvasMouseMove = (e: React.MouseEvent) => { if (!draggingDevice) return; const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return; const x = ((e.clientX - rect.left) / rect.width) * 990; const y = ((e.clientY - rect.top) / rect.height) * 610; setDevices((prev) => prev.map((d) => d.id === draggingDevice ? { ...d, x, y } : d)); };
  const handleCanvasMouseUp = () => { setDraggingDevice(null); };
  const handleCanvasDoubleClick = () => { if (activeTool === "cable" && cablePoints.length >= 2) { const newCable: CanvasDevice = { id: `dev${Date.now()}`, type: "cable", x: cablePoints[0].x, y: cablePoints[0].y, rot: 0, label: `CABLE-${String(devices.filter(d=>d.type==="cable").length+1).padStart(2,"0")}`, cablePoints: [...cablePoints] }; setDevices((prev) => [...prev, newCable]); setCablePoints([]); } };
  const handleTouchStart = (e: React.TouchEvent) => { if (e.touches.length === 2) { const dx = e.touches[0].clientX - e.touches[1].clientX; const dy = e.touches[0].clientY - e.touches[1].clientY; touchStartRef.current = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2, dist: Math.hypot(dx, dy) }; } };
  const handleTouchMove = (e: React.TouchEvent) => { if (!touchStartRef.current) return; if (e.touches.length === 2) { const dx = e.touches[0].clientX - e.touches[1].clientX; const dy = e.touches[0].clientY - e.touches[1].clientY; const newDist = Math.hypot(dx, dy); const scale = touchStartRef.current.dist > 0 ? newDist / touchStartRef.current.dist : 1; setCanvasScale((prev) => Math.max(0.5, Math.min(3, prev * scale))); touchStartRef.current = { ...touchStartRef.current, dist: newDist }; } };
  const getDeviceColor = (type: CanvasDevice["type"]) => { const colors: Record<string, string> = { camera: "#3b82f6", door: "#f59e0b", panel: "#f97316", power: "#ef4444", server: "#ec4899", cable: "#8b5cf6" }; return colors[type] || "#3b82f6"; };
  const updateDoorConfig = (deviceId: string, config: Partial<CanvasDevice["doorConfig"]>) => { setDevices((prev) => prev.map((d) => d.id === deviceId ? { ...d, doorConfig: { ...d.doorConfig!, ...config } } : d)); };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#070c1a" }}>
      <header className="h-12 flex items-center gap-2 md:gap-4 px-3 md:px-4 flex-shrink-0 z-40" style={G.liquidGlass}>
        <button onClick={() => navigate("design-studio")} className="flex items-center gap-1.5 text-[#8b949e] hover:text-white text-[11px] font-semibold flex-shrink-0 cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]"><ArrowLeft className="w-3.5 h-3.5" /><span className="hidden md:inline">Back</span></button>
        <div className="flex-1" />
        <button onClick={() => setView3D(!view3D)} className={clsx("flex items-center gap-1.5 h-7 px-2 rounded-xl text-[10px] font-semibold cursor-pointer active:scale-[0.97] transition-transform", view3D ? "text-violet-400" : "text-[#8b949e]")} style={view3D ? { background: "rgba(139,92,246,0.15)" } : G.btn}><Box className="w-3 h-3" /> {view3D ? "2D" : "3D"}</button>
        <button onClick={() => setShowFov(!showFov)} className={clsx("flex items-center gap-1.5 h-7 px-2 rounded-xl text-[10px] font-semibold cursor-pointer active:scale-[0.97] transition-transform", showFov ? "text-blue-400" : "text-[#8b949e]")} style={showFov ? { background: "rgba(59,130,246,0.15)" } : G.btn}><Eye className="w-3 h-3" /> FOV</button>
        <button onClick={() => setShowDeviceTray(!showDeviceTray)} className={clsx("flex items-center gap-1.5 h-7 px-2 rounded-xl text-[10px] font-semibold cursor-pointer active:scale-[0.97] transition-transform", showDeviceTray ? "text-white" : "text-[#8b949e]")} style={G.btn}><Package className="w-3 h-3" /> Devices</button>
        <button onClick={() => { const svg = canvasRef.current?.querySelector("svg"); if (svg) { const data = new XMLSerializer().serializeToString(svg); const blob = new Blob([data], { type: "image/svg+xml" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "floor-plan.svg"; a.click(); URL.revokeObjectURL(url); toast.success("Exported"); } }} className="flex items-center gap-1.5 h-7 px-2 rounded-xl text-[#e6edf3] text-[10px] font-semibold cursor-pointer active:scale-[0.97] transition-transform" style={G.btn}><Download className="w-3 h-3" /> Export</button>
      </header>
      <div className="flex-1 relative overflow-hidden">
        <motion.div className="absolute left-0 top-0 bottom-0 w-64 z-30 flex flex-col" style={G.liquidGlass} animate={{ x: showDeviceTray ? 0 : -256 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}><p className="text-white text-[12px] font-bold">Devices</p><button onClick={() => setShowDeviceTray(false)} className="w-6 h-6 rounded-lg hover:bg-white/[0.08] flex items-center justify-center cursor-pointer active:scale-[0.97] transition-transform min-w-[44px] min-h-[44px]"><X className="w-3.5 h-3.5 text-[#8b949e]" /></button></div>
          <div className="px-3 py-2.5"><div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" /><input value={deviceSearch} onChange={(e) => setDeviceSearch(e.target.value)} placeholder="Search…" className="w-full h-7 rounded-xl pl-7 pr-2.5 text-[11px] text-[#e6edf3] focus:outline-none" style={G.input} /></div></div>
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {[{ category: "Cameras", color: "#3b82f6", items: ["Fixed Dome","PTZ","Bullet","Panoramic"] },{ category: "Doors & Access", color: "#f59e0b", items: ["Door","Electric Strike","Maglock","Reader"] },{ category: "Infrastructure", color: "#10b981", items: ["Panel","PoE Switch","Server"] }].map((cat) => (
              <div key={cat.category} className="p-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}><p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />{cat.category}</p>
                <div className="space-y-0.5">{cat.items.filter(i => i.toLowerCase().includes(deviceSearch.toLowerCase())).map((item) => (<button key={item} onClick={() => { if (cat.category === "Cameras") setActiveTool("camera"); else if (cat.category === "Doors & Access") setActiveTool("door"); else if (item === "Panel") setActiveTool("panel"); else if (item === "PoE Switch") setActiveTool("power"); else if (item === "Server") setActiveTool("server"); }} className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/[0.05] transition-colors flex items-center gap-2.5 group cursor-pointer active:scale-[0.97] transition-transform"><div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)" }}><Camera className="w-3 h-3 text-[#484f58]" /></div><span className="text-[#8b949e] text-[11px] font-medium group-hover:text-white truncate">{item}</span></button>))}</div></div>))}
          </div>
        </motion.div>
        <div ref={canvasRef} className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ cursor: activeTool === "move" ? "grab" : "crosshair", touchAction: "none" }} onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onDoubleClick={handleCanvasDoubleClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
          <svg viewBox="0 0 990 610" className="w-full h-full max-w-none" style={{ transform: `scale(${canvasScale}) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`, maxHeight: "calc(100vh - 140px)" }}>
            <rect width="990" height="610" fill="#070c1a" />
            {canvasImageUrl && <image href={canvasImageUrl} x="0" y="0" width="990" height="610" opacity="0.35" />}
            <defs><pattern id="cg" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.024)" strokeWidth="0.5" /></pattern></defs>
            <rect width="990" height="610" fill="url(#cg)" />
            <rect x="80" y="50" width="830" height="510" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" rx="2" />
            <rect x="80" y="50" width="220" height="150" fill="rgba(59,130,246,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" /><text x="190" y="132" textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize="9" fontFamily="sans-serif">RECEPTION</text>
            <rect x="640" y="50" width="270" height="150" fill="rgba(245,158,11,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" /><text x="775" y="132" textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize="9" fontFamily="sans-serif">SERVER ROOM</text>
            <rect x="80" y="200" width="830" height="60" fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" /><text x="495" y="234" textAnchor="middle" fill="rgba(255,255,255,0.08)" fontSize="8" fontFamily="sans-serif">CORRIDOR</text>
            <rect x="500" y="260" width="410" height="300" fill="rgba(139,92,246,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" /><text x="705" y="418" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="10" fontFamily="sans-serif">DATA HALL A</text>
            <rect x="80" y="260" width="360" height="300" fill="rgba(16,185,129,0.02)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" /><text x="260" y="418" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="10" fontFamily="sans-serif">DATA HALL B</text>
            <rect x="440" y="450" width="60" height="110" fill="rgba(6,182,212,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" /><text x="470" y="512" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="7" fontFamily="sans-serif">NOC</text>
            {showFov && devices.filter(d => d.type === "camera").map((cam) => (<path key={`fov-${cam.id}`} d={fovPath(cam.x, cam.y, cam.rot, cam.fov || 80, cam.range || 90)} fill={cam.id === selectedId ? "rgba(59,130,246,0.22)" : "rgba(59,130,246,0.10)"} />))}
            {devices.map((dev) => { const color = getDeviceColor(dev.type); const isSelected = dev.id === selectedId;
              if (dev.type === "camera") return (<g key={dev.id} style={{ cursor: "pointer" }}><circle cx={dev.x} cy={dev.y} r={isSelected ? 7 : 5} fill={color} stroke={isSelected ? "#fff" : "rgba(255,255,255,0.5)"} strokeWidth={isSelected ? 2 : 1} />{isSelected && <circle cx={dev.x} cy={dev.y} r="12" fill="none" stroke="rgba(59,130,246,0.4)" strokeWidth="1.5" strokeDasharray="3,2" />}</g>);
              if (dev.type === "door") return (<g key={dev.id} style={{ cursor: "pointer" }}><rect x={dev.x-8} y={dev.y-3} width="16" height="6" fill="rgba(245,158,11,0.2)" stroke={color} strokeWidth={isSelected ? 2 : 1} rx="1" /><line x1={dev.x} y1={dev.y-3} x2={dev.x} y2={dev.y+8} stroke={color} strokeWidth="1" /><path d={dev.doorConfig?.swing === "outswinging" ? `M${dev.x-6},${dev.y+4} Q${dev.x},${dev.y-4} ${dev.x+6},${dev.y+4}` : `M${dev.x-6},${dev.y+4} Q${dev.x},${dev.y+12} ${dev.x+6},${dev.y+4}`} fill="none" stroke={color} strokeWidth="1" /></g>);
              if (dev.type === "panel") return (<g key={dev.id} style={{ cursor: "pointer" }}><rect x={dev.x-10} y={dev.y-7} width="20" height="14" fill="rgba(249,115,22,0.15)" stroke={color} strokeWidth={isSelected ? 2 : 1} rx="1" /><text x={dev.x} y={dev.y+1} textAnchor="middle" fill={color} fontSize="5" fontFamily="monospace">PNL</text></g>);
              if (dev.type === "power") return (<g key={dev.id} style={{ cursor: "pointer" }}><rect x={dev.x-8} y={dev.y-6} width="16" height="12" fill="rgba(239,68,68,0.15)" stroke={color} strokeWidth={isSelected ? 2 : 1} rx="1" /><text x={dev.x} y={dev.y+1} textAnchor="middle" fill={color} fontSize="4" fontFamily="monospace">PWR</text></g>);
              if (dev.type === "server") return (<g key={dev.id} style={{ cursor: "pointer" }}><rect x={dev.x-8} y={dev.y-8} width="16" height="16" fill="rgba(236,72,153,0.15)" stroke={color} strokeWidth={isSelected ? 2 : 1} rx="1" /><text x={dev.x} y={dev.y+1} textAnchor="middle" fill={color} fontSize="5" fontFamily="monospace">NVR</text></g>);
              if (dev.type === "cable" && dev.cablePoints) { const pts = dev.cablePoints.map(p => `${p.x},${p.y}`).join(" "); const len = dev.cablePoints.reduce((s,p,i) => i===0?0:s+Math.hypot(p.x-dev.cablePoints![i-1].x,p.y-dev.cablePoints![i-1].y),0); return (<g key={dev.id} style={{ cursor: "pointer" }}><polyline points={pts} fill="none" stroke={color} strokeWidth={isSelected?2.5:1.5} strokeDasharray={isSelected?"none":"6,3"} />{isSelected && <text x={dev.cablePoints[0].x+5} y={dev.cablePoints[0].y-5} fill="#fff" fontSize="7" fontFamily="sans-serif">{Math.round(len*0.3)}m</text>}</g>); }
              return null;
            })}
            {activeTool === "cable" && cablePoints.length > 0 && (<><polyline points={cablePoints.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4,2" />{cablePoints.map((p,i)=>(<circle key={i} cx={p.x} cy={p.y} r="3" fill="#8b5cf6" />))}</>)}
            <g transform="translate(10,580)"><rect x="0" y="0" width="250" height="24" fill="rgba(7,12,26,0.9)" rx="6" /><text x="12" y="16" fill="rgba(255,255,255,0.5)" fontSize="7" fontFamily="sans-serif">{devices.length} devices · {Math.round(canvasScale*100)}% {activeTool==="cable"?"· Click, double-click to finish":""}</text></g>
          </svg>
        </div>
        {showProperties && selected && (
          <div className="absolute right-0 top-0 bottom-0 w-72 z-30 flex flex-col" style={G.liquidGlass}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}><p className="text-white text-[12px] font-bold">Properties</p><button onClick={() => setShowProperties(false)} className="w-6 h-6 rounded-lg hover:bg-white/[0.08] flex items-center justify-center cursor-pointer active:scale-[0.97] transition-transform min-w-[44px] min-h-[44px]"><X className="w-3.5 h-3.5 text-[#8b949e]" /></button></div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4" style={{ scrollbarWidth: "none" }}>
              <div><p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest mb-2">Device</p><div className="rounded-xl p-3" style={G.card}><p className="text-white text-[12px] font-bold">{selected.label}</p><p className="text-[#484f58] text-[10px] mt-1 capitalize">{selected.type}</p></div></div>
              <div><p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest mb-2">Position</p><div className="grid grid-cols-2 gap-2">{[{ label: "X", value: Math.round(selected.x) },{ label: "Y", value: Math.round(selected.y) }].map((f) => (<div key={f.label} className="rounded-xl p-2.5" style={G.card}><p className="text-[#484f58] text-[10px] font-bold mb-1">{f.label}</p><p className="text-white text-[13px] font-bold">{f.value} px</p></div>))}</div></div>
              {selected.type === "door" && selected.doorConfig && (<div className="space-y-2"><p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest">Door Config</p><div className="rounded-xl p-3 space-y-2" style={G.card}>
                <div className="flex items-center justify-between"><span className="text-[#8b949e] text-[11px]">Swing</span><select value={selected.doorConfig.swing} onChange={(e) => updateDoorConfig(selected.id, { swing: e.target.value as "inswinging"|"outswinging" })} className="bg-transparent text-white text-[11px] font-semibold cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: "6px", padding: "2px 6px" }}><option value="inswinging">Inswinging</option><option value="outswinging">Outswinging</option></select></div>
                <div className="flex items-center justify-between"><span className="text-[#8b949e] text-[11px]">Lock</span><select value={selected.doorConfig.lockType} onChange={(e) => updateDoorConfig(selected.id, { lockType: e.target.value })} className="bg-transparent text-white text-[11px] font-semibold cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: "6px", padding: "2px 6px" }}><option>Electric Strike</option><option>Maglock</option><option>Deadbolt</option><option>Crash Bar</option></select></div>
                <div className="flex items-center justify-between"><span className="text-[#8b949e] text-[11px]">Access</span><select value={selected.doorConfig.accessType} onChange={(e) => updateDoorConfig(selected.id, { accessType: e.target.value })} className="bg-transparent text-white text-[11px] font-semibold cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: "6px", padding: "2px 6px" }}><option>Card</option><option>Biometric</option><option>Keypad</option><option>Combo</option></select></div>
                <div className="flex items-center justify-between"><span className="text-[#8b949e] text-[11px]">Key Override</span><button onClick={() => updateDoorConfig(selected.id, { keyOverride: !selected.doorConfig?.keyOverride })} className={clsx("px-2 py-0.5 rounded text-[10px] font-bold", selected.doorConfig?.keyOverride ? "bg-emerald-500/20 text-emerald-400" : "bg-white/[0.05] text-[#484f58]")}>{selected.doorConfig?.keyOverride ? "Yes" : "No"}</button></div>
              </div></div>)}
              <button onClick={() => { setDevices((prev) => prev.filter((d) => d.id !== selected.id)); setSelectedId(null); }} className="w-full h-8 rounded-xl text-rose-400 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.97] transition-transform" style={{ background: "rgba(244,63,94,0.10)", border: "1px solid rgba(244,63,94,0.20)" }}><Trash2 className="w-3 h-3" /> Delete</button>
            </div>
          </div>
        )}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-2 py-2 rounded-2xl overflow-x-auto max-w-[95vw]" style={G.liquidGlass}>
          {CANVAS_TOOLS.map((tool) => (<button key={tool.id} onClick={() => { setActiveTool(tool.id); if (tool.id !== "cable") setCablePoints([]); }} title={tool.label} className={clsx("w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 cursor-pointer active:scale-[0.97] transition-transform min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0", activeTool === tool.id ? "text-white" : "text-[#8b949e]")} style={activeTool === tool.id ? { background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.45)" } : undefined}><tool.icon className="w-3.5 h-3.5" /></button>))}
          <div className="w-px h-6 mx-1" style={{ background: "rgba(255,255,255,0.10)" }} />
          <button onClick={() => setShowProperties(!showProperties)} className={clsx("w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 cursor-pointer active:scale-[0.97] transition-transform min-w-[44px] min-h-[44px]", showProperties ? "text-white" : "text-[#484f58]")} style={showProperties ? { background: "rgba(255,255,255,0.10)" } : undefined}><ChevronRight className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
function Workbook({ navigate }: { navigate: (p: Page) => void }) {
  const { fmt } = useCurrency();
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [showProjectSelect, setShowProjectSelect] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(parseFloat(localStorage.getItem("fx_rate") || "157.4"));
  const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem("wb_tab") || "asset-list");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "">("saved");
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => { localStorage.setItem("wb_tab", activeTab); }, [activeTab]);
  useEffect(() => { API.fx.getRate().then(r => setExchangeRate(r)); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projData, quoteData] = await Promise.all([API.projects.list(), API.quotes.list()]);
      setProjects(projData);
      setQuotes(quoteData);
      if (!selectedProjectId && projData.length > 0) {
        setSelectedProjectId(projData[0].id);
        const pq = quoteData.find((q: Quote) => q.projectId === projData[0].id);
        if (pq) setSelectedQuoteId(pq.id);
      }
    } catch { setProjects([]); setQuotes([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (!selectedProjectId && projects.length > 0) { setShowProjectSelect(true); } }, [projects, selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedQuote = quotes.find((q) => q.id === selectedQuoteId);
  const projectQuotes = quotes.filter((q) => q.projectId === selectedProjectId);

  useEffect(() => {
    if (selectedProjectId && !selectedQuoteId) {
      const pq = quotes.find((q) => q.projectId === selectedProjectId);
      if (pq) setSelectedQuoteId(pq.id);
    }
  }, [selectedProjectId, quotes, selectedQuoteId]);

  const quoteCategories = selectedQuote?.categories || [];

  const recalcLineItem = (item: QuoteLineItem): QuoteLineItem => {
    const sellPrice = item.unitCost * (1 + item.markupPercent);
    const costTotal = item.unitCost * item.quantity;
    const sellTotal = sellPrice * item.quantity;
    const profit = sellTotal - costTotal;
    return { ...item, sellPrice, costTotal, sellTotal, profit, jmdConversion: sellTotal * exchangeRate };
  };

  const categorySubtotals = quoteCategories.map((cat) => {
    const activeItems = cat.lineItems.filter((li) => li.quantity > 0);
    return { category: cat, subtotal: activeItems.reduce((s, li) => s + li.sellTotal, 0) };
  });
  const grandTotalPreTax = categorySubtotals.reduce((s, cs) => s + cs.subtotal, 0);
  const gctAmount = grandTotalPreTax * GCT_RATE;
  const grandTotal = grandTotalPreTax + gctAmount;

  const autoSave = useCallback(async (q: Quote) => {
    setSaveStatus("saving");
    try { await API.quotes.update(q.id, { categories: q.categories, exchangeRate }); setTimeout(() => setSaveStatus("saved"), 800); } catch { setSaveStatus("saved"); }
  }, [exchangeRate]);

  const updateQuoteLineItem = (categoryId: string, itemId: string, updates: Partial<QuoteLineItem>) => {
    setQuotes((prev) => prev.map((q) => {
      if (q.id !== selectedQuoteId) return q;
      const updated = { ...q, categories: q.categories.map((cat) => cat.id !== categoryId ? cat : { ...cat, lineItems: cat.lineItems.map((li) => li.id === itemId ? recalcLineItem({ ...li, ...updates }) : li) }) };
      autoSave(updated);
      return updated;
    }));
  };

  const addLineItem = (categoryId: string) => {
    setQuotes((prev) => prev.map((q) => {
      if (q.id !== selectedQuoteId) return q;
      const updated = { ...q, categories: q.categories.map((cat) => {
        if (cat.id !== categoryId) return cat;
        const newItem: QuoteLineItem = { id: crypto.randomUUID?.() || `li${Date.now()}`, itemNumber: String(cat.lineItems.length + 1).padStart(2, "0"), description: "", unitCost: 0, quantity: 0, markupPercent: 0.35, sellPrice: 0, costTotal: 0, sellTotal: 0, profit: 0, jmdConversion: 0 };
        return { ...cat, lineItems: [...cat.lineItems, newItem] };
      }) };
      autoSave(updated);
      return updated;
    }));
  };

  const toggleCollapse = (id: string) => { setCollapsedCategories((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }); };

  if (loading) return <div className="px-3 md:px-5 py-4 md:py-6 space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 rounded-2xl" /></div>;

  const wbTabs = [
    { id: "asset-list", label: "Asset List" },
    { id: "bom", label: "BOM" },
    { id: "synthesis", label: "Synthesis" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">
      {showProjectSelect && <SelectProjectModal onClose={() => setShowProjectSelect(false)} onSelect={(id) => { setSelectedProjectId(id); setShowProjectSelect(false); }} currentId={selectedProjectId} projects={projects} />}
      <div className="px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between flex-shrink-0 gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div>
          <h1 className="text-white font-bold text-lg md:text-xl tracking-tight">Workbook</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <button onClick={() => setShowProjectSelect(true)} className="flex items-center gap-1.5 text-[#8b949e] hover:text-white text-[11px] font-semibold transition-colors cursor-pointer active:scale-[0.97] transition-transform" style={{ ...G.btn, padding: "4px 10px", borderRadius: "8px" }}><Building2 className="w-3 h-3" />{selectedProject ? selectedProject.name : "Select project"}<ChevronDown className="w-3 h-3" /></button>
            {selectedQuote && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/12 text-amber-400">{selectedQuote.refNumber} · {selectedQuote.status}</span>}
            {saveStatus === "saving" && <span className="text-[10px] text-[#484f58] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
            {saveStatus === "saved" && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Saved</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl" style={G.subtle}><span className="text-[#484f58] text-[10px] font-bold uppercase">USD→JMD</span><input type="number" value={exchangeRate} onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 157.4)} className="w-20 h-7 rounded-lg bg-transparent text-white text-[12px] font-bold text-center focus:outline-none" style={G.input} /></div>
          {selectedQuote && (
            <button onClick={async () => { setGeneratingPDF(true); try { const { jsPDF } = await import("jspdf"); const doc = new jsPDF(); doc.setFontSize(16); doc.text("Workbook - " + (selectedQuote.refNumber || ""), 14, 22); doc.setFontSize(10); let y = 35; quoteCategories.forEach((cat) => { doc.setFontSize(12); doc.text(cat.name, 14, y); y += 7; cat.lineItems.filter(li => li.quantity > 0).forEach((li) => { const r = recalcLineItem(li); doc.text(`${li.description} x${li.quantity} = $${r.sellTotal.toFixed(2)}`, 20, y); y += 5; if (y > 270) { doc.addPage(); y = 20; } }); y += 5; }); doc.text(`Subtotal: $${grandTotalPreTax.toFixed(2)}`, 14, y); y += 6; doc.text(`GCT: $${gctAmount.toFixed(2)}`, 14, y); y += 6; doc.text(`Total: $${grandTotal.toFixed(2)}`, 14, y); doc.save(`Workbook_${selectedQuote.refNumber || "draft"}.pdf`); toast.success("PDF exported"); } catch { toast.error("PDF failed"); } finally { setGeneratingPDF(false); } }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[#8b949e] text-[10px] font-semibold hover:text-white transition-all cursor-pointer active:scale-[0.97] transition-transform" style={G.btn}><FileText className="w-3.5 h-3.5" /> Export PDF</button>
          )}
        </div>
      </div>
      {!selectedQuote ? (
        <div className="flex-1 flex items-center justify-center"><EmptyState icon={DollarSign} title="No workbook" description="Select a project to view its workbook." action={{ label: "Select Project", onClick: () => setShowProjectSelect(true) }} /></div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", scrollbarWidth: "none" }}>
            {wbTabs.map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={clsx("h-8 px-3 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-[0.97] transition-transform", activeTab === tab.id ? "text-white" : "text-[#8b949e] hover:text-white")} style={activeTab === tab.id ? { background: "rgba(59,130,246,0.20)", border: "1px solid rgba(59,130,246,0.30)" } : undefined}>{tab.label}</button>))}
          </div>
          <div className="flex-1 overflow-y-auto px-3 md:px-5 py-4 space-y-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
            {activeTab === "asset-list" && quoteCategories.filter(c => ["Video Security Equipment","Access Control Equipment","Software","Compute & Storage","Networking"].includes(c.name)).map((category) => {
              const isCollapsed = collapsedCategories.has(category.id);
              const activeItems = category.lineItems.filter(li => li.quantity > 0);
              return (
                <div key={category.id} className="rounded-2xl overflow-hidden" style={G.card}>
                  <button onClick={() => toggleCollapse(category.id)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={{ borderBottom: isCollapsed ? "none" : "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center gap-2"><h3 className="text-white text-[13px] font-bold">{category.name}</h3><span className="text-[#484f58] text-[10px]">({activeItems.length})</span></div>
                    <div className="flex items-center gap-3"><span className="text-[#8b949e] text-[11px] font-bold">{fmt(activeItems.reduce((s,li)=>s+li.sellTotal,0))}</span>{isCollapsed ? <ChevronDown className="w-4 h-4 text-[#484f58]" /> : <ChevronUp className="w-4 h-4 text-[#484f58]" />}</div>
                  </button>
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ minWidth: "800px" }}>
                        <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{["Item","QTY","Cost","Mark up %","Sell","Cost Total","Total","Profit"].map((h) => (<th key={h} className="px-3 py-2.5 text-[#484f58] text-[9px] font-bold uppercase tracking-widest text-left">{h}</th>))}</tr></thead>
                        <tbody>
                          {category.lineItems.map((item, idx) => { const r = recalcLineItem(item); return (<tr key={item.id} className="hover:bg-white/[0.02]" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}><td className="px-3 py-2.5"><input value={item.description} onChange={(e) => updateQuoteLineItem(category.id, item.id, { description: e.target.value })} className="bg-transparent text-white text-[11px] font-semibold w-full min-w-[120px] focus:outline-none" /></td><td className="px-3 py-2.5"><input type="number" value={item.quantity} onChange={(e) => updateQuoteLineItem(category.id, item.id, { quantity: parseInt(e.target.value)||0 })} className="bg-transparent text-white text-[11px] w-16 text-center focus:outline-none" style={G.input} /></td><td className="px-3 py-2.5"><input type="number" value={item.unitCost} onChange={(e) => updateQuoteLineItem(category.id, item.id, { unitCost: parseFloat(e.target.value)||0 })} className="bg-transparent text-white text-[11px] w-20 text-right focus:outline-none" style={G.input} /></td><td className="px-3 py-2.5"><input type="number" value={Math.round(item.markupPercent*100)} onChange={(e) => updateQuoteLineItem(category.id, item.id, { markupPercent: (parseFloat(e.target.value)||0)/100 })} className="bg-transparent text-white text-[11px] w-16 text-center focus:outline-none" style={G.input} /><span className="text-[#484f58] text-[10px]">%</span></td><td className="px-3 py-2.5 text-white text-[11px] font-bold text-right">{fmt(r.sellPrice)}</td><td className="px-3 py-2.5 text-[#8b949e] text-[11px] text-right">{fmt(r.costTotal)}</td><td className="px-3 py-2.5 text-white text-[11px] font-bold text-right">{fmt(r.sellTotal)}</td><td className="px-3 py-2.5 text-[10px] font-bold text-right" style={{ color: r.profit>=0?"#34d399":"#f87171" }}>{fmt(r.profit)}</td></tr>); })}
                          <tr><td colSpan={8} className="px-3 py-2"><button onClick={() => addLineItem(category.id)} className="text-[#484f58] hover:text-blue-400 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"><Plus className="w-3 h-3" /> Add item</button></td></tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
            {activeTab === "synthesis" && (
              <div className="space-y-4">
                {quoteCategories.map((category) => {
                  const isCollapsed = collapsedCategories.has(category.id);
                  const activeItems = category.lineItems.filter(li => li.quantity > 0);
                  const catSubtotal = activeItems.reduce((s, li) => s + li.sellTotal, 0);
                  return (
                    <div key={category.id} className="rounded-2xl overflow-hidden" style={G.card}>
                      <button onClick={() => toggleCollapse(category.id)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={{ borderBottom: isCollapsed ? "none" : "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                        <div className="flex items-center gap-2"><h3 className="text-white text-[13px] font-bold">{category.name}</h3><span className="text-[#484f58] text-[10px]">({activeItems.length})</span></div>
                        <div className="flex items-center gap-3"><span className="text-[#8b949e] text-[11px] font-bold">{fmt(catSubtotal)}</span>{isCollapsed ? <ChevronDown className="w-4 h-4 text-[#484f58]" /> : <ChevronUp className="w-4 h-4 text-[#484f58]" />}</div>
                      </button>
                      {!isCollapsed && category.lineItems.length > 0 && (
                        <div className="overflow-x-auto"><table className="w-full" style={{ minWidth: "500px" }}><thead><tr>{["#","Description","Qty","Total"].map(h=><th key={h} className="px-3 py-2 text-[#484f58] text-[9px] font-bold uppercase text-left">{h}</th>)}</tr></thead><tbody>{activeItems.map((item, idx) => { const r = recalcLineItem(item); return (<tr key={item.id}><td className="px-3 py-2 text-[#484f58] text-[10px]">{String(idx+1).padStart(2,"0")}</td><td className="px-3 py-2 text-white text-[11px]">{item.description}</td><td className="px-3 py-2 text-white text-[11px] text-center">{item.quantity}</td><td className="px-3 py-2 text-white text-[11px] font-bold text-right">{fmt(r.sellTotal)}</td></tr>); })}</tbody></table></div>
                      )}
                    </div>
                  );
                })}
                <div className="rounded-2xl p-4" style={{ ...G.card, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.20)" }}>
                  <h3 className="text-white text-[14px] font-bold mb-3">Synthesis</h3>
                  <div className="space-y-2">
                    {categorySubtotals.map((cs) => (<div key={cs.category.id} className="flex justify-between py-1"><span className="text-[#8b949e] text-[12px]">{cs.category.name}</span><span className="text-white text-[12px] font-bold">{fmt(cs.subtotal)}</span></div>))}
                    <div className="flex justify-between py-2 border-t border-white/10"><span className="text-[#8b949e] text-[12px]">Subtotal</span><span className="text-white text-[13px] font-bold">{fmt(grandTotalPreTax)}</span></div>
                    <div className="flex justify-between py-1"><span className="text-[#8b949e] text-[12px]">GCT (15%)</span><span className="text-[#8b949e] text-[12px] font-bold">{fmt(gctAmount)}</span></div>
                    <div className="flex justify-between py-2 border-t-2 border-white/10"><span className="text-white text-[14px] font-bold">Grand Total</span><span className="text-white text-[1.1rem] font-extrabold" style={{ color: "#60a5fa" }}>{fmt(grandTotal)}</span></div>
                  </div>
                </div>
              </div>
            )}
            {(activeTab === "bom" || (activeTab !== "asset-list" && activeTab !== "synthesis")) && <EmptyState icon={Package} title={activeTab === "bom" ? "BOM coming soon" : "Coming soon"} description="This tab will be available in the next update." />}
          </div>
        </div>
      )}
    </div>
  );
}
const CAT_COLOR: Record<string, { bg: string; text: string; label: string }> = { camera: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", label: "Camera" }, "access-control": { bg: "rgba(139,92,246,0.12)", text: "#a78bfa", label: "Access" }, nvr: { bg: "rgba(16,185,129,0.12)", text: "#34d399", label: "NVR" }, analytics: { bg: "rgba(249,115,22,0.12)", text: "#fb923c", label: "VMS" }, other: { bg: "rgba(100,100,100,0.12)", text: "#8b949e", label: "Other" } };

function DeviceSpecModal({ device, onClose }: { device: CatalogDevice; onClose: () => void }) {
  const { addToQuote } = useQuote(); const { fmt } = useCurrency(); const cc = CAT_COLOR[device.category] ?? CAT_COLOR.other;
  const specs: { label: string; value?: string }[] = [
    { label: "SKU", value: device.sku },{ label: "Category", value: cc.label },{ label: "Camera Type", value: device.cameraType },
    { label: "Resolution", value: device.resolution },{ label: "Sensor", value: device.sensor },{ label: "Lens", value: device.lens },
    { label: "Frame Rate", value: device.frameRate },{ label: "Compression", value: device.compression },{ label: "FOV", value: device.fov },
    { label: "Night Vision", value: device.nightVision },{ label: "Weather Rating", value: device.weatherRating },{ label: "Power Input", value: device.powerInput },
    { label: "Storage", value: device.storage },{ label: "Operating Temp", value: device.operatingTemp },{ label: "Authentication", value: device.authentication },
    { label: "Channels", value: device.channels },{ label: "Readers", value: device.readers },
  ].filter((s) => !!s.value);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}><div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)" }} /><motion.div initial={{ opacity: 0, scale: 0.93, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 26, stiffness: 340 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[780px] max-h-[90vh] overflow-y-auto rounded-3xl flex flex-col md:flex-row" style={{ background: "rgba(7,12,26,0.95)", backdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 40px 100px rgba(0,0,0,0.95)" }}>
      <div className="w-full md:w-56 flex-shrink-0 relative flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)", minHeight: "250px" }}>
        {device.imageUrl ? <img src={device.imageUrl} alt={device.model} className="w-full h-full object-contain p-4" style={{ maxHeight: "320px" }} /> : <div className="w-full h-full flex items-center justify-center"><Camera className="w-16 h-16 text-[#484f58]" /></div>}
        <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5">
          <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase" style={{ background: cc.bg, color: cc.text }}>{cc.label}</span>
          {device.cameraType && <span className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase" style={{ background: "rgba(255,255,255,0.08)", color: "#e6edf3" }}>{device.cameraType}</span>}
          {device.tags?.map((tag) => { const ts = TAG_STYLES[tag]; return ts ? <span key={tag} className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase" style={{ background: ts.bg, color: ts.text, border: `1px solid ${ts.border}` }}>{tag}</span> : null; })}
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden"><div className="px-5 md:px-6 pt-5 md:pt-6 pb-4 flex items-start justify-between flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}><div><p className="text-[#8b949e] text-[11px] font-semibold">{device.manufacturer}</p><h2 className="text-white text-[1.1rem] font-bold mt-0.5">{device.model}</h2>{device.price && <p className="text-[0.9rem] font-bold mt-1" style={{ color: cc.text }}>{fmt(device.price)} <span className="text-[#484f58] text-[10px] font-normal">/ unit</span></p>}</div><button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer active:scale-[0.97] transition-transform min-w-[44px] min-h-[44px]" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><X className="w-4 h-4 text-[#8b949e]" /></button></div>
        <div className="flex-1 overflow-y-auto px-5 md:px-6 py-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">{specs.map((s) => (<div key={s.label} className="rounded-xl p-3" style={G.subtle}><p className="text-[#484f58] text-[9px] font-bold uppercase tracking-widest mb-1">{s.label}</p><p className="text-white text-[11px] font-semibold">{s.value}</p></div>))}</div></div>
        <div className="px-5 md:px-6 py-4 flex items-center gap-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}><button onClick={() => { addToQuote(device); onClose(); }} className="flex items-center gap-2 h-9 px-4 rounded-xl text-white text-[11px] font-bold cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}><Plus className="w-3.5 h-3.5" /> Add to Quote</button></div>
      </div>
    </motion.div></div>
  );
}

function DeviceStore({ navigate: _navigate }: { navigate: (p: Page) => void }) {
  const [search, setSearch] = useState(""); const [categoryFilter, setCategoryFilter] = useState<string>("all"); const [cameraTypeFilter, setCameraTypeFilter] = useState<string>("all"); const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedDevice, setSelectedDevice] = useState<CatalogDevice | null>(null); const [devices, setDevices] = useState<CatalogDevice[]>([]);
  const [loading, setLoading] = useState(true); const { addToQuote } = useQuote(); const { fmt } = useCurrency();
  const [csvUploading, setCsvUploading] = useState(false);

  const fetchDevices = useCallback(async () => { setLoading(true); try { const data = await API.devices.list(); setDevices(data); } catch { setDevices([]); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setCsvUploading(true); try { const text = await file.text(); const lines = text.split("\n").filter(l => l.trim()); const headers = lines[0].split(",").map(h => h.trim().replace(/"/g,"")); const parsed = lines.slice(1).map(line => { const vals = line.split(",").map(v => v.trim().replace(/"/g,"")); const obj: any = {}; headers.forEach((h,i) => { obj[h] = vals[i]; }); return { model: obj.Model||obj.model||"", manufacturer: obj.Manufacturer||obj.manufacturer||"Unknown", category: "camera" as const, cameraType: obj["Camera Type"]||undefined, resolution: obj["Max Video Resolution"]||undefined, lens: obj["Sensor/Lens/Horizontal FOV"]||undefined, price: parseFloat(obj.Price||"0")||undefined, sku: obj.SKU||obj.Model||undefined, imageUrl: obj["Image URL"]||obj.Image||undefined, tags: [] as DeviceTag[] }; }); if (parsed.length > 0) { await API.devices.bulk(parsed); toast.success(`Imported ${parsed.length} devices`); fetchDevices(); } } catch { toast.error("CSV import failed"); } finally { setCsvUploading(false); e.target.value = ""; } };

  const categories: { id: string; label: string }[] = [{ id: "all", label: "All" },{ id: "camera", label: "Cameras" },{ id: "access-control", label: "Access" },{ id: "nvr", label: "NVR" },{ id: "analytics", label: "VMS" }];
  const filtered = useMemo(() => { let result = devices; if (categoryFilter !== "all") result = result.filter((d) => d.category === categoryFilter); if (cameraTypeFilter !== "all") result = result.filter((d) => d.cameraType === cameraTypeFilter); if (search.trim()) { const q = search.toLowerCase(); result = result.filter((d) => d.model.toLowerCase().includes(q) || d.manufacturer.toLowerCase().includes(q) || (d.sku??"").toLowerCase().includes(q) || (d.tags??[]).some(t=>t.toLowerCase().includes(q))); } return result; }, [devices, search, categoryFilter, cameraTypeFilter]);

  if (loading) return <div className="px-3 md:px-5 py-4 md:py-6 space-y-4"><Skeleton className="h-10 w-48" /><div className="grid gap-3 md:gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div></div>;

  return (
    <div className="px-3 md:px-5 py-4 md:py-6">
      {selectedDevice && <DeviceSpecModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />}
      <div className="flex items-center justify-between mb-4 md:mb-6"><div><h1 className="text-white font-bold text-lg md:text-xl tracking-tight">Device Store</h1><p className="text-[#8b949e] text-[11px] mt-0.5">{filtered.length} products</p></div><div className="flex items-center gap-2"><label className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[#8b949e] text-[11px] font-semibold hover:text-white cursor-pointer active:scale-[0.97] transition-transform" style={G.btn}><Upload className="w-3.5 h-3.5" /> {csvUploading ? "Importing…" : "Import CSV"}<input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} disabled={csvUploading} /></label><div className="flex items-center h-8 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}><button onClick={() => setViewMode("grid")} className="h-full px-2.5 flex items-center justify-center cursor-pointer active:scale-[0.97] transition-transform" style={viewMode==="grid"?{background:"#3b82f620",color:"#60a5fa"}:{color:"#484f58"}}><Grid3x3 className="w-3.5 h-3.5" /></button><button onClick={() => setViewMode("table")} className="h-full px-2.5 flex items-center justify-center cursor-pointer active:scale-[0.97] transition-transform" style={viewMode==="table"?{background:"#3b82f620",color:"#60a5fa"}:{color:"#484f58"}}><List className="w-3.5 h-3.5" /></button></div></div></div>
      <div className="mb-4 md:mb-5 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#484f58]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search model, SKU, tags…" className="h-9 rounded-xl pl-9 w-full text-[12px] text-[#e6edf3] focus:outline-none" style={G.input} /></div>
        <div className="flex gap-1.5 flex-wrap">{categories.map((c) => (<button key={c.id} onClick={() => setCategoryFilter(c.id)} className="h-8 px-2.5 rounded-xl text-[11px] font-semibold cursor-pointer active:scale-[0.97] transition-transform whitespace-nowrap" style={categoryFilter===c.id?{background:"rgba(59,130,246,0.15)",color:"#60a5fa",border:"1px solid rgba(59,130,246,0.35)"}:{...G.btn,color:"#8b949e"}}>{c.label}</button>))}</div>
        <div className="relative"><select value={cameraTypeFilter} onChange={(e) => setCameraTypeFilter(e.target.value)} className="h-8 rounded-xl px-2.5 text-[11px] font-semibold cursor-pointer appearance-none pr-6" style={G.btn}><option value="all">All Types</option>{CAMERA_TYPES.map(ct=><option key={ct} value={ct}>{ct}</option>)}</select><ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58] pointer-events-none" /></div>
      </div>
      {devices.length === 0 ? <EmptyState icon={Store} title="Device store is empty" description="Import a CSV to populate the catalog." /> : filtered.length === 0 ? <EmptyState icon={Search} title="No devices match" description="Try adjusting filters." /> : viewMode === "grid" ? (
        <div className="grid gap-3 md:gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>{filtered.map((device) => { const cc = CAT_COLOR[device.category] ?? CAT_COLOR.other; return (<div key={device.id} onClick={() => setSelectedDevice(device)} className="rounded-2xl overflow-hidden cursor-pointer group transition-all md:hover:-translate-y-1" style={{ ...G.card }}><div className="relative h-32 md:h-36 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>{device.imageUrl ? <img src={device.imageUrl} alt={device.model} className="w-full h-full object-contain p-3 opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" /> : <div className="w-full h-full flex items-center justify-center"><Camera className="w-12 h-12 text-[#484f58]" /></div>}<div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1"><span className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase" style={{ background: cc.bg, color: cc.text }}>{cc.label}</span>{device.cameraType && <span className="inline-block px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase" style={{ background: "rgba(255,255,255,0.08)", color: "#e6edf3" }}>{device.cameraType}</span>}</div></div><div className="p-3"><p className="text-[#8b949e] text-[9px] font-semibold">{device.manufacturer}</p><p className="text-white text-[12px] font-bold mt-0.5 truncate">{device.model}</p>{device.resolution && <p className="text-[#484f58] text-[9px] mt-1 truncate">{device.resolution}</p>}<div className="flex flex-wrap gap-1 mt-2">{device.tags?.slice(0,3).map((tag) => { const ts = TAG_STYLES[tag]; return ts ? <span key={tag} className="inline-block px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase" style={{ background: ts.bg, color: ts.text }}>{tag}</span> : null; })}</div><div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}><span className="text-[#484f58] text-[8px] font-mono">{device.sku}</span><span className="font-bold text-[11px]" style={{ color: cc.text }}>{device.price ? fmt(device.price) : "—"}</span></div></div></div>); })}</div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={G.card}><div className="overflow-x-auto"><table className="w-full" style={{ minWidth: "700px" }}><thead><tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{["","Model","Manufacturer","Type","Resolution","Tags","SKU","Price"].map((h) => (<th key={h} className={`${h==="Price"?"text-right":"text-left"} px-3 py-3 text-[#484f58] text-[10px] font-bold uppercase tracking-widest`}>{h}</th>))}</tr></thead><tbody>{filtered.map((device, i) => { const cc = CAT_COLOR[device.category] ?? CAT_COLOR.other; return (<tr key={device.id} onClick={() => setSelectedDevice(device)} className="cursor-pointer hover:bg-white/[0.02] transition-colors group" style={{ borderBottom: i<filtered.length-1?"1px solid rgba(255,255,255,0.04)":"none" }}><td className="px-3 py-2.5"><div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)" }}>{device.imageUrl ? <img src={device.imageUrl} alt={device.model} className="w-full h-full object-contain p-1 opacity-70" /> : <Camera className="w-4 h-4 text-[#484f58] m-auto mt-2.5" />}</div></td><td className="px-3 py-2.5 text-white text-[11px] font-semibold">{device.model}</td><td className="px-3 py-2.5 text-[#8b949e] text-[10px]">{device.manufacturer}</td><td className="px-3 py-2.5"><span className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase" style={{ background: cc.bg, color: cc.text }}>{device.cameraType || cc.label}</span></td><td className="px-3 py-2.5 text-[#8b949e] text-[10px]">{device.resolution||"—"}</td><td className="px-3 py-2.5"><div className="flex flex-wrap gap-1">{device.tags?.map((tag) => { const ts = TAG_STYLES[tag]; return ts ? <span key={tag} className="inline-block px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase" style={{ background: ts.bg, color: ts.text }}>{tag}</span> : null; })}</div></td><td className="px-3 py-2.5 text-[#484f58] text-[10px] font-mono">{device.sku}</td><td className="px-3 py-2.5 text-right"><span className="text-white text-[11px] font-bold">{device.price?fmt(device.price):"—"}</span></td></tr>); })}</tbody></table></div></div>
      )}
    </div>
  );
}
const STATUS_META: Record<InstallStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = { complete: { label: "Complete", color: "text-emerald-400", bg: "bg-emerald-500/12", icon: CheckCircle2 }, "in-progress": { label: "In Progress", color: "text-blue-400", bg: "bg-blue-500/12", icon: Clock }, failed: { label: "Failed", color: "text-rose-400", bg: "bg-rose-500/12", icon: AlertTriangle }, pending: { label: "Pending", color: "text-[#484f58]", bg: "bg-white/[0.04]", icon: AlertCircle } };

function InstallTracker({ navigate: _navigate }: { navigate: (p: Page) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [zones, setZones] = useState<InstallZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projData, zoneData] = await Promise.all([API.projects.list(), API.install.zones()]);
      setProjects(projData.filter((p: Project) => p.stage === "win"));
      setZones(zoneData);
    } catch { setProjects([]); setZones([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (zoneId: string, deviceId: string, status: InstallStatus) => {
    setZones((prev) => prev.map((z) => z.id !== zoneId ? z : { ...z, devices: z.devices.map((d) => d.id !== deviceId ? d : { ...d, status }) }));
    try { await API.install.updateStatus(zoneId, deviceId, status); } catch {}
  };

  const typeIcons: Record<string, React.ElementType> = { camera: Camera, access: Key, nvr: Cpu, door: DoorOpen, panel: PanelRight, power: Zap, server: Server };

  if (loading) return <div className="px-3 md:px-5 py-4 md:py-6 space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div>;

  const allDevices = zones.flatMap((z) => z.devices);
  const complete = allDevices.filter((d) => d.status === "complete").length;
  const total = allDevices.length;
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0;

  return (
    <div className="px-3 md:px-5 py-4 md:py-6 max-w-[1100px]">
      <div className="mb-4 md:mb-6"><h1 className="text-white font-bold text-lg md:text-xl tracking-tight">Install Tracker</h1><p className="text-[#8b949e] text-[11px] mt-0.5">{total} devices across {zones.length} zones · {projects.length} projects</p></div>

      {projects.length === 0 ? <EmptyState icon={CheckSquare} title="No active installs" description="Projects in Win stage will appear here." /> : (
        <>
          <div className="rounded-2xl p-4 md:p-5 mb-4" style={G.card}>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3"><div><p className="text-white text-[1.6rem] md:text-[2rem] font-bold">{pct}%</p><p className="text-[#484f58] text-[10px]">{complete} of {total} complete</p></div><div className="grid grid-cols-4 gap-3">{[{ label: "Complete", count: complete, color: "text-emerald-400" },{ label: "In Progress", count: allDevices.filter(d=>d.status==="in-progress").length, color: "text-blue-400" },{ label: "Failed", count: allDevices.filter(d=>d.status==="failed").length, color: "text-rose-400" },{ label: "Pending", count: allDevices.filter(d=>d.status==="pending").length, color: "text-[#484f58]" }].map((s) => (<div key={s.label}><p className={clsx("text-[1.1rem] font-bold", s.color)}>{s.count}</p><p className="text-[#484f58] text-[9px]">{s.label}</p></div>))}</div></div>
            <div className="relative w-full h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}><div className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full" style={{ width: `${pct}%` }} /></div>
          </div>
          <div className="space-y-3">
            {projects.map((project) => {
              const projectZones = zones.filter((z) => z.projectId === project.id);
              const projectDevices = projectZones.flatMap((z) => z.devices);
              const pComplete = projectDevices.filter((d) => d.status === "complete").length;
              const pPct = projectDevices.length > 0 ? Math.round((pComplete / projectDevices.length) * 100) : 0;
              const isExpanded = expandedProject === project.id;
              return (
                <div key={project.id} className="rounded-2xl overflow-hidden" style={G.card}>
                  <button onClick={() => setExpandedProject(isExpanded ? null : project.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]">
                    <div className="flex-1 min-w-0"><p className="text-white text-[12px] font-bold text-left">{project.name}</p><p className="text-[#484f58] text-[10px]">{projectDevices.length} devices · {pComplete} complete</p></div>
                    <div className="flex items-center gap-3 flex-shrink-0"><div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}><div className={clsx("h-full rounded-full", pPct===100?"bg-emerald-500":"bg-blue-500")} style={{ width: `${pPct}%` }} /></div><span className={clsx("text-[11px] font-bold w-10 text-right", pPct===100?"text-emerald-400":"text-white")}>{pPct}%</span>{isExpanded ? <ChevronUp className="w-4 h-4 text-[#484f58]" /> : <ChevronDown className="w-4 h-4 text-[#484f58]" />}</div>
                  </button>
                  {isExpanded && projectDevices.length > 0 && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      {projectDevices.map((device, i) => { const meta = STATUS_META[device.status]; const TypeIcon = typeIcons[device.type] ?? Camera; return (
                        <div key={device.id} className={clsx("grid gap-2 px-3 py-3 items-center hover:bg-white/[0.015] transition-colors", i%2===1&&"bg-white/[0.01]")} style={{ gridTemplateColumns: "36px 2fr 1fr 120px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}><TypeIcon className="w-3.5 h-3.5 text-[#484f58]" /></div>
                          <div className="min-w-0"><p className="text-white text-[11px] font-semibold truncate">{device.name}</p><p className="text-[#484f58] text-[9px]">{device.location}</p></div>
                          <span className="text-[#8b949e] text-[10px] truncate">{device.assignee}</span>
                          <select value={device.status} onChange={(e) => { const z = projectZones.find(z => z.devices.some(d => d.id === device.id)); if (z) updateStatus(z.id, device.id, e.target.value as InstallStatus); }} className={clsx("w-full h-7 rounded-xl border px-2 text-[10px] font-bold appearance-none cursor-pointer", meta.bg, meta.color)} style={{ backgroundColor: "transparent" }}>
                            {Object.entries(STATUS_META).map(([val, m]) => (<option key={val} value={val} style={{ background: "#0d1117", color: "#e6edf3" }}>{m.label}</option>))}
                          </select>
                        </div>
                      );})}
                    </div>
                  )}
                  {isExpanded && projectDevices.length === 0 && <div className="px-4 py-6 text-center"><p className="text-[#484f58] text-[11px]">No devices assigned yet.</p></div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [showPw, setShowPw] = useState(false); const [loading, setLoading] = useState(false);
  const submit = (e?: React.FormEvent) => { e?.preventDefault(); setLoading(true); setTimeout(() => { setLoading(false); onLogin(); }, 1100); };
  const inputCls = "w-full h-11 rounded-2xl px-4 text-[#e6edf3] text-[13px] placeholder:text-[#484f58] focus:outline-none transition-all";
  return (
    <div className="h-screen flex overflow-hidden">
      <div className="hidden lg:flex w-[48%] flex-shrink-0 flex-col relative overflow-hidden" style={{ background: "#070c1a" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse 80% 60% at 10% 10%, rgba(30,64,175,0.45) 0%, transparent 65%), radial-gradient(ellipse 60% 55% at 90% 90%, rgba(88,28,135,0.35) 0%, transparent 65%)" }} />
        <div className="relative z-10 flex flex-col h-full p-8 md:p-12">
          <div className="mb-auto"><img src={logoImg} alt="E-Tech Systems" className="h-8 md:h-10 object-contain object-left" style={{ filter: "brightness(1.1)" }} /></div>
          <div className="flex flex-col justify-center flex-1 py-8">
            <span className="text-blue-400 text-[10px] md:text-[11px] font-bold tracking-[0.15em] uppercase mb-4 block">Security System Design & Integration Platform</span>
            <h1 className="text-white text-[2rem] md:text-[2.6rem] font-bold leading-[1.12] tracking-tight mb-4">Full-Lifecycle<br />Security Project<br /><span className="text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>Management.</span></h1>
            <p className="text-[#8b949e] text-[11px] md:text-[13px] leading-relaxed mb-8 max-w-[380px]">From site assessment to systems design to final installation. Design floor plans, build quotes, manage installs, and auto-generate reports in one platform.</p>
            <div className="space-y-2">{[{ icon: Camera, title: "System Design Studio", desc: "Place cameras, map cable routes, build floorplans", color: "#3b82f6" },{ icon: BarChart3, title: "Workbook & Asset Library", desc: "Auto-generate quotes, proposals, access to full partner asset library", color: "#8b5cf6" }].map(({ icon: Icon, title, desc, color }) => (<div key={title} className="flex items-start gap-3 p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}><div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}><Icon className="w-4 h-4" style={{ color }} /></div><div><p className="text-white text-[12px] font-bold mb-0.5">{title}</p><p className="text-[#8b949e] text-[11px]">{desc}</p></div></div>))}</div>
          </div>
          <p className="text-[#484f58] text-[10px]">© 2026 E-Tech Systems</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 relative" style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(40px)" }}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="relative z-10 w-full max-w-[380px]">
          <div className="rounded-3xl p-6 md:p-8" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(40px) saturate(160%)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
            <h2 className="text-white text-[1.3rem] md:text-[1.5rem] font-bold mb-1">Welcome back</h2><p className="text-[#8b949e] text-[12px] mb-6">Sign in to your workspace</p>
            <button onClick={submit} className="w-full flex items-center justify-center gap-3 h-11 rounded-2xl text-white text-[12px] font-bold transition-all mb-5 hover:bg-white/[0.12] cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
              <svg width="20" height="20" viewBox="0 0 21 21" fill="none"><rect width="10" height="10" fill="#f25022" /><rect x="11" width="10" height="10" fill="#7fba00" /><rect y="11" width="10" height="10" fill="#00a4ef" /><rect x="11" y="11" width="10" height="10" fill="#ffb900" /></svg>
              Continue with Microsoft
            </button>
            <div className="flex items-center gap-3 mb-5"><div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} /><span className="text-[#484f58] text-[10px] font-semibold">or continue with email</span><div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} /></div>
            <form onSubmit={submit} className="space-y-3"><div><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className={inputCls} style={G.input} /></div><div className="relative"><input type={showPw?"text":"password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={clsx(inputCls, "pr-11")} style={G.input} /><button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#484f58]"><Eye className="w-4 h-4" /></button></div><button type="submit" disabled={loading} className="w-full h-11 rounded-2xl text-white font-bold text-[12px] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", boxShadow: "0 4px 20px rgba(59,130,246,0.45)" }}>{loading && <Loader2 className="w-4 h-4 animate-spin" />}{loading?"Signing in…":"Sign in"}</button></form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
export default function App() {
  const [page, setPage] = useState<Page>(() => {
    const saved = localStorage.getItem("app_page");
    const loggedIn = localStorage.getItem("auth_token") || localStorage.getItem("app_logged_in");
    return loggedIn && saved ? (saved as Page) : "login";
  });
  const [currency, setCurrency] = useState<"USD" | "JMD">("USD");
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (page !== "login") localStorage.setItem("app_page", page);
  }, [page]);

  useEffect(() => {
    API.fx.getRate();
  }, []);

  const handleLogin = () => {
    localStorage.setItem("auth_token", "stub-jwt-token");
    localStorage.setItem("app_logged_in", "true");
    setPage("dashboard");
  };

  const currencyCtx: CurrencyCtx = useMemo(() => ({ currency, setCurrency, fmt: makeFmt(currency) }), [currency]);

  const addToQuote = (device: CatalogDevice) => {
    const price = device.price;
    if (!price || !currentQuote) return;
    setCurrentQuote((prev) => {
      if (!prev) return prev;
      const firstCat = prev.categories[0];
      if (!firstCat) return prev;
      const sellPrice = price * 1.35;
      const newItem: QuoteLineItem = { id: crypto.randomUUID?.() || `li${Date.now()}`, itemNumber: String(firstCat.lineItems.length + 1).padStart(2, "0"), description: `${device.manufacturer} ${device.model}`, unitCost: price, quantity: 1, markupPercent: 0.35, sellPrice, costTotal: price, sellTotal: sellPrice, profit: sellPrice - price, jmdConversion: sellPrice * (parseFloat(localStorage.getItem("fx_rate") || "157.4")) };
      return { ...prev, categories: prev.categories.map((c, i) => i === 0 ? { ...c, lineItems: [...c.lineItems, newItem] } : c) };
    });
    toast.success(`${device.model} added to quote`);
  };

  const quoteCtx: QuoteCtx = { currentQuote, setCurrentQuote, addToQuote };

  if (page === "login") return (<CurrencyContext.Provider value={currencyCtx}><LoginPage onLogin={handleLogin} /></CurrencyContext.Provider>);
  if (page === "design-canvas") return (<CurrencyContext.Provider value={currencyCtx}><DesignCanvas navigate={setPage} /></CurrencyContext.Provider>);

  const breadcrumb = page === "project-detail" ? { label: "Projects", parent: "design-studio" as Page } : undefined;

  return (
    <CurrencyContext.Provider value={currencyCtx}>
      <QuoteContext.Provider value={quoteCtx}>
        <div className="min-h-screen bg-background">
          <Toaster position="bottom-right" theme="dark" toastOptions={{ style: { background: "rgba(7,12,26,0.95)", border: "1px solid rgba(255,255,255,0.12)", color: "#e6edf3", backdropFilter: "blur(20px)" } }} />
          <AppTopbar page={page} navigate={setPage} breadcrumb={breadcrumb} />
          <div className="pt-14">
            <AnimatePresence mode="wait">
              {page === "dashboard" && <Dashboard key="dashboard" navigate={setPage} />}
              {page === "design-studio" && <DesignStudio key="design-studio" navigate={setPage} />}
              {page === "project-detail" && <ProjectDetail key="project-detail" navigate={setPage} />}
              {page === "workbook" && <Workbook key="workbook" navigate={setPage} />}
              {page === "install-tracker" && <InstallTracker key="install-tracker" navigate={setPage} />}
              {page === "device-store" && <DeviceStore key="device-store" navigate={setPage} />}
            </AnimatePresence>
          </div>
        </div>
      </QuoteContext.Provider>
    </CurrencyContext.Provider>
  );
}
