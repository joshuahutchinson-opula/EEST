import { useState, useMemo, createContext, useContext, useEffect, useCallback, useRef, Suspense } from "react";
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
  Sun, Moon, SlidersHorizontal, ShoppingCart, History,
  RotateCw, Maximize2, Minimize2,
} from "lucide-react";
import { clsx } from "clsx";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Canvas as ThreeCanvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import * as pdfjsLib from "pdfjs-dist";
import logoImg from "./assets/2026-06-14_21.13.34_e-techsystemsja.com_2f51395e09e8-removebg-preview (1).png";

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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

interface AuditLogEntry { id: string; projectId: string; event: string; details: string; timestamp: string; user: string; }
interface ChangeOrder { id: string; projectId: string; title: string; description: string; costImpact: number; status: "draft" | "submitted" | "approved" | "rejected"; createdAt: string; updatedAt: string; createdBy: string; }
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

type CanvasDevice = { id: string; type: "camera" | "door" | "panel" | "power" | "server" | "cable"; x: number; y: number; rot: number; fov?: number; range?: number; label: string; selected?: boolean; connectedTo?: string[]; doorConfig?: { swing: "inswinging" | "outswinging"; lockType: string; readers: string[]; accessType: string; keyOverride: boolean }; cablePoints?: { x: number; y: number }[]; deviceStoreRef?: string; imageUrl?: string; };
type FloorPlanFile = { id: string; type: "2d" | "3d"; url: string; originalName: string; format: string; is3DModel?: boolean; };

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
  "Tender": { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" }, "Single Source": { bg: "rgba(16,185,129,0.15)", text: "#34d399" },
  "Inbound": { bg: "rgba(139,92,246,0.15)", text: "#a78bfa" }, "Referral": { bg: "rgba(245,158,11,0.15)", text: "#fbbf24" },
  "Recurring Client": { bg: "rgba(236,72,153,0.15)", text: "#f472b6" }, "Outbound": { bg: "rgba(239,68,68,0.15)", text: "#f87171" },
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
  audit: { list: (projectId: string) => apiFetch<AuditLogEntry[]>(`/audit/${projectId}`), log: (projectId: string, event: string, details: string) => apiFetch<void>(`/audit/${projectId}`, { method: "POST", body: JSON.stringify({ event, details }) }) },
  changeOrders: { list: (projectId: string) => apiFetch<ChangeOrder[]>(`/change-orders/${projectId}`), create: (projectId: string, data: Partial<ChangeOrder>) => apiFetch<ChangeOrder>(`/change-orders/${projectId}`, { method: "POST", body: JSON.stringify(data) }), update: (projectId: string, id: string, data: Partial<ChangeOrder>) => apiFetch<ChangeOrder>(`/change-orders/${projectId}/${id}`, { method: "PATCH", body: JSON.stringify(data) }), delete: (projectId: string, id: string) => apiFetch<void>(`/change-orders/${projectId}/${id}`, { method: "DELETE" }) },
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
// ============ 3D MODEL VIEWER COMPONENTS ============

function GLTFModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  return <primitive object={clonedScene} scale={1} position={[0, -0.5, 0]} rotation={[0, 0, 0]} />;
}

function ThreeDViewer({ file }: { file: FloorPlanFile }) {
  if (!file.is3DModel) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: "#070c1a" }}>
        <img src={file.url} alt="3D Rendering" className="max-w-full max-h-full object-contain" />
      </div>
    );
  }
  return (
    <ThreeCanvas camera={{ position: [3, 2, 5], fov: 50 }} style={{ background: "#070c1a" }}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />
        <GLTFModel url={file.url} />
        <Environment preset="city" />
        <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={5} blur={2.5} />
        <OrbitControls enableDamping dampingFactor={0.05} />
        <gridHelper args={[10, 10, "#333", "#222"]} />
      </Suspense>
    </ThreeCanvas>
  );
}

// ============ DESIGN CANVAS (REWRITTEN) ============

const CANVAS_TOOLS = [
  { id: "select", icon: MousePointer, label: "Select" },
  { id: "move", icon: Move, label: "Pan" },
  { id: "camera", icon: Camera, label: "Camera" },
  { id: "door", icon: DoorOpen, label: "Door" },
  { id: "panel", icon: PanelRight, label: "Panel" },
  { id: "power", icon: Zap, label: "Power" },
  { id: "server", icon: Server, label: "NVR" },
  { id: "cable", icon: Cable, label: "Cable" },
  { id: "trash", icon: Trash2, label: "Delete" },
];

function DesignCanvas({ navigate }: { navigate: (p: Page) => void }) {
  const [activeTool, setActiveTool] = useState("select");
  const [showDeviceTray, setShowDeviceTray] = useState(false);
  const [showProperties, setShowProperties] = useState(true);
  const [showFov, setShowFov] = useState(true);
  const [view3D, setView3D] = useState(false);
  const [devices, setDevices] = useState<CanvasDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [storeSearch, setStoreSearch] = useState("");
  const [draggingDevice, setDraggingDevice] = useState<string | null>(null);
  const [cablePoints, setCablePoints] = useState<{ x: number; y: number }[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [storeDevices, setStoreDevices] = useState<CatalogDevice[]>([]);
  const [floorPlan2D, setFloorPlan2D] = useState<FloorPlanFile | null>(null);
  const [floorPlan3D, setFloorPlan3D] = useState<FloorPlanFile | null>(null);
  const [pdfRendering, setPdfRendering] = useState(false);
  const [canvasRotation, setCanvasRotation] = useState(0);
  const [floorPlanOpacity, setFloorPlanOpacity] = useState(1);
  const transformRef = useRef<any>(null);

  const selected = devices.find((c) => c.id === selectedId);
  const storeDevice = selected?.deviceStoreRef ? storeDevices.find(d => d.id === selected.deviceStoreRef) : null;

  useEffect(() => {
    API.devices.list().then(setStoreDevices).catch(() => setStoreDevices([]));
  }, []);

  useEffect(() => {
    const loadCanvas = async () => {
      try {
        const projects = await API.projects.list();
        const pid = projects[0]?.id;
        if (pid) {
          setProjectId(pid);
          const data = await API.canvas.get(pid);
          if (data.layoutData?.imageUrl) {
            setFloorPlan2D({ id: "2d-" + pid, type: "2d", url: data.layoutData.imageUrl, originalName: "floor-plan", format: data.layoutData.imageUrl.match(/\.(\w+)(\?|$)/)?.[1] || "png" });
          }
          if (data.layoutData?.image3DUrl) {
            const is3DModel = /\.(glb|gltf|obj|stl|fbx)$/i.test(data.layoutData.image3DUrl);
            setFloorPlan3D({ id: "3d-" + pid, type: "3d", url: data.layoutData.image3DUrl, originalName: "3d-model", format: data.layoutData.image3DUrl.match(/\.(\w+)(\?|$)/)?.[1] || "png", is3DModel });
          }
          if (data.layoutData?.devices) setDevices(data.layoutData.devices);
        }
      } catch {}
    };
    loadCanvas();
  }, []);

  const saveCanvas = useCallback(async () => {
    if (!projectId) return;
    try {
      await API.canvas.save(projectId, {
        devices,
        imageUrl: floorPlan2D?.url || "",
        image3DUrl: floorPlan3D?.url || "",
      });
    } catch {}
  }, [devices, floorPlan2D, floorPlan3D, projectId]);

  useEffect(() => {
    const t = setTimeout(() => { if (devices.length > 0 || floorPlan2D || floorPlan3D) saveCanvas(); }, 2000);
    return () => clearTimeout(t);
  }, [devices, floorPlan2D, floorPlan3D, saveCanvas]);

  const addDevice = (type: CanvasDevice["type"], x: number, y: number, storeRef?: string, imgUrl?: string) => {
    const newDevice: CanvasDevice = {
      id: `dev${Date.now()}`, type, x, y, rot: 0,
      fov: type === "camera" ? 80 : undefined,
      range: type === "camera" ? 90 : undefined,
      label: `${type.toUpperCase()}-${String(devices.length + 1).padStart(2, "0")}`,
      doorConfig: type === "door" ? { swing: "inswinging", lockType: "Electric Strike", readers: [], accessType: "Card", keyOverride: true } : undefined,
      deviceStoreRef: storeRef,
      imageUrl: imgUrl,
    };
    setDevices((prev) => [...prev, newDevice]);
    setSelectedId(newDevice.id);
  };

  const placeDeviceFromStore = (device: CatalogDevice, x: number, y: number) => {
    const typeMap: Record<string, CanvasDevice["type"]> = { camera: "camera", "access-control": "door", nvr: "server", analytics: "server", other: "camera" };
    const canvasType = typeMap[device.category] || "camera";
    addDevice(canvasType, x, y, device.id, device.imageUrl);
    toast.success(`${device.model} placed`);
  };

  const getDeviceColor = (type: CanvasDevice["type"]) => {
    const colors: Record<string, string> = { camera: "#3b82f6", door: "#f59e0b", panel: "#f97316", power: "#ef4444", server: "#ec4899", cable: "#8b5cf6" };
    return colors[type] || "#3b82f6";
  };

  const updateDoorConfig = (deviceId: string, config: Partial<CanvasDevice["doorConfig"]>) => {
    setDevices((prev) => prev.map((d) => d.id === deviceId ? { ...d, doorConfig: { ...d.doorConfig!, ...config } } : d));
  };

  const handleCanvasClick = (e: any) => {
    if (activeTool === "move" || activeTool === "select" || activeTool === "trash") return;
    const transformState = transformRef.current?.state;
    if (!transformState) return;
    const scale = transformState.scale;
    const posX = (e.clientX - transformState.positionX) / scale;
    const posY = (e.clientY - transformState.positionY) / scale;
    const x = posX;
    const y = posY;
    if (activeTool === "cable") {
      setCablePoints((prev) => [...prev, { x, y }]);
      return;
    }
    addDevice(activeTool as CanvasDevice["type"], x, y);
  };

  const handleDoubleClick = () => {
    if (activeTool === "cable" && cablePoints.length >= 2) {
      const newCable: CanvasDevice = {
        id: `dev${Date.now()}`, type: "cable",
        x: cablePoints[0].x, y: cablePoints[0].y, rot: 0,
        label: `CABLE-${String(devices.filter(d => d.type === "cable").length + 1).padStart(2, "0")}`,
        cablePoints: [...cablePoints],
      };
      setDevices((prev) => [...prev, newCable]);
      setCablePoints([]);
    }
  };

  const handleDeviceClick = (deviceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTool === "trash") {
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      if (selectedId === deviceId) setSelectedId(null);
      return;
    }
    if (activeTool === "select") {
      setSelectedId(deviceId);
      setDraggingDevice(deviceId);
    }
  };

  const handleDeviceMouseDown = (deviceId: string, e: React.MouseEvent) => {
    if (activeTool === "select") {
      setDraggingDevice(deviceId);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggingDevice || activeTool !== "select") return;
    const transformState = transformRef.current?.state;
    if (!transformState) return;
    const scale = transformState.scale;
    const posX = (e.clientX - transformState.positionX) / scale;
    const posY = (e.clientY - transformState.positionY) / scale;
    setDevices((prev) => prev.map((d) => d.id === draggingDevice ? { ...d, x: posX, y: posY } : d));
  };

  const handleCanvasMouseUp = () => {
    setDraggingDevice(null);
  };

  const filteredStoreDevices = storeSearch.trim()
    ? storeDevices.filter(d => d.model.toLowerCase().includes(storeSearch.toLowerCase()) || d.manufacturer.toLowerCase().includes(storeSearch.toLowerCase()))
    : storeDevices;

  const CAT_COLOR: Record<string, { bg: string; text: string; label: string }> = {
    camera: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", label: "Camera" },
    "access-control": { bg: "rgba(139,92,246,0.12)", text: "#a78bfa", label: "Access" },
    nvr: { bg: "rgba(16,185,129,0.12)", text: "#34d399", label: "NVR" },
    analytics: { bg: "rgba(249,115,22,0.12)", text: "#fb923c", label: "VMS" },
    other: { bg: "rgba(100,100,100,0.12)", text: "#8b949e", label: "Other" },
  };

  const uploadFile = async (type: "2d" | "3d") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = type === "2d" ? "image/*,.pdf,.dwg,.dxf" : "image/*,.glb,.gltf,.obj,.stl,.fbx";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file || !projectId) return;
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (type === "2d" && ext === "pdf") {
        setPdfRendering(true);
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport }).promise;
          const dataUrl = canvas.toDataURL("image/png");
          const result = await API.canvas.upload(projectId, new File([await (await fetch(dataUrl)).blob()], file.name.replace(".pdf", ".png"), { type: "image/png" }));
          setFloorPlan2D({ id: "2d-" + projectId, type: "2d", url: result.url, originalName: file.name, format: "png" });
          toast.success("PDF rendered and uploaded");
        } catch { toast.error("Failed to render PDF"); }
        setPdfRendering(false);
        return;
      }
      try {
        const result = await API.canvas.upload(projectId, file);
        if (type === "2d") {
          setFloorPlan2D({ id: "2d-" + projectId, type: "2d", url: result.url, originalName: file.name, format: ext });
        } else {
          const is3DModel = /\.(glb|gltf|obj|stl|fbx)$/i.test(file.name);
          setFloorPlan3D({ id: "3d-" + projectId, type: "3d", url: result.url, originalName: file.name, format: ext, is3DModel });
        }
        toast.success(type === "2d" ? "Floor plan uploaded" : "3D file uploaded");
      } catch { toast.error("Upload failed"); }
    };
    input.click();
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#070c1a" }}>
      {/* Header */}
      <header className="h-12 flex items-center gap-2 md:gap-4 px-3 md:px-4 flex-shrink-0 z-40" style={G.liquidGlass}>
        <button onClick={() => navigate("design-studio")} className="flex items-center gap-1.5 text-[#8b949e] hover:text-white text-[11px] font-semibold flex-shrink-0 cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]"><ArrowLeft className="w-3.5 h-3.5" /><span className="hidden md:inline">Back</span></button>
        <div className="flex-1" />
        {pdfRendering && <span className="text-[#8b949e] text-[10px] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Rendering PDF...</span>}
        <button onClick={() => uploadFile("2d")} className="flex items-center gap-1.5 h-7 px-2 rounded-xl text-[#8b949e] hover:text-white text-[10px] font-semibold cursor-pointer active:scale-[0.97] transition-transform" style={G.btn}><Upload className="w-3 h-3" /> 2D</button>
        <button onClick={() => uploadFile("3d")} className="flex items-center gap-1.5 h-7 px-2 rounded-xl text-[#8b949e] hover:text-white text-[10px] font-semibold cursor-pointer active:scale-[0.97] transition-transform" style={G.btn}><Box className="w-3 h-3" /> 3D</button>
        <button onClick={() => setView3D(!view3D)} className={clsx("flex items-center gap-1.5 h-7 px-2 rounded-xl text-[10px] font-semibold cursor-pointer active:scale-[0.97] transition-transform", view3D ? "text-violet-400" : "text-[#8b949e]")} style={view3D ? { background: "rgba(139,92,246,0.15)" } : G.btn}><Eye className="w-3 h-3" /> {view3D ? "2D" : "3D"}</button>
        <button onClick={() => setShowFov(!showFov)} className={clsx("flex items-center gap-1.5 h-7 px-2 rounded-xl text-[10px] font-semibold cursor-pointer active:scale-[0.97] transition-transform", showFov ? "text-blue-400" : "text-[#8b949e]")} style={showFov ? { background: "rgba(59,130,246,0.15)" } : G.btn}><Eye className="w-3 h-3" /> FOV</button>
        <button onClick={() => setShowDeviceTray(!showDeviceTray)} className={clsx("flex items-center gap-1.5 h-7 px-2 rounded-xl text-[10px] font-semibold cursor-pointer active:scale-[0.97] transition-transform", showDeviceTray ? "text-white" : "text-[#8b949e]")} style={G.btn}><Store className="w-3 h-3" /> Store</button>
        {!view3D && floorPlan2D && (
          <div className="flex items-center gap-2 ml-2">
            <input type="range" min="0.1" max="1" step="0.05" value={floorPlanOpacity} onChange={(e) => setFloorPlanOpacity(parseFloat(e.target.value))} className="w-16 h-1" />
            <span className="text-[#8b949e] text-[9px]">{Math.round(floorPlanOpacity * 100)}%</span>
            <button onClick={() => setCanvasRotation((prev) => prev - 15)} className="w-6 h-6 rounded flex items-center justify-center text-[#8b949e] hover:text-white cursor-pointer" style={G.btn}><RotateCcw className="w-3 h-3" /></button>
            <button onClick={() => setCanvasRotation((prev) => prev + 15)} className="w-6 h-6 rounded flex items-center justify-center text-[#8b949e] hover:text-white cursor-pointer" style={G.btn}><RotateCw className="w-3 h-3" /></button>
            <span className="text-[#8b949e] text-[9px]">{canvasRotation}°</span>
          </div>
        )}
      </header>

      {/* Main canvas area */}
      <div className="flex-1 relative overflow-hidden" onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp}>
        {/* Device Store tray */}
        <motion.div className="absolute left-0 top-0 bottom-0 w-80 z-30 flex flex-col" style={G.liquidGlass} animate={{ x: showDeviceTray ? 0 : -320 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-white text-[12px] font-bold">Device Store</p>
            <button onClick={() => setShowDeviceTray(false)} className="w-6 h-6 rounded-lg hover:bg-white/[0.08] flex items-center justify-center cursor-pointer active:scale-[0.97] transition-transform min-w-[44px] min-h-[44px]"><X className="w-3.5 h-3.5 text-[#8b949e]" /></button>
          </div>
          <div className="px-3 py-2.5">
            <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" /><input value={storeSearch} onChange={(e) => setStoreSearch(e.target.value)} placeholder="Search device store..." className="w-full h-7 rounded-xl pl-7 pr-2.5 text-[11px] text-[#e6edf3] focus:outline-none" style={G.input} /></div>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {filteredStoreDevices.map((device) => {
              const cc = CAT_COLOR[device.category] ?? CAT_COLOR.other;
              return (
                <button key={device.id} onClick={() => { setActiveTool("select"); placeDeviceFromStore(device, 400, 300); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.04] transition-colors cursor-pointer active:scale-[0.97] transition-transform text-left" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)" }}>{device.imageUrl ? <img src={device.imageUrl} alt="" className="w-full h-full object-contain p-0.5 opacity-70" /> : <Camera className="w-3.5 h-3.5 text-[#484f58]" />}</div>
                  <div className="flex-1 min-w-0"><p className="text-white text-[11px] font-semibold truncate">{device.model}</p><p className="text-[#484f58] text-[9px]">{device.manufacturer}{device.price ? ` · $${device.price.toFixed(0)}` : ""}</p></div>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase flex-shrink-0" style={{ background: cc.bg, color: cc.text }}>{cc.label}</span>
                </button>
              );
            })}
            {filteredStoreDevices.length === 0 && <div className="px-4 py-8 text-center"><p className="text-[#484f58] text-[11px]">No devices found</p></div>}
          </div>
        </motion.div>

        {/* Canvas */}
        {view3D && floorPlan3D ? (
          <div className="absolute inset-0">
            <ThreeDViewer file={floorPlan3D} />
            <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl text-[10px] font-semibold text-white" style={G.liquidGlass}>3D View — {floorPlan3D.originalName}</div>
          </div>
        ) : (
          <TransformWrapper
            ref={transformRef}
            initialScale={1}
            minScale={0.2}
            maxScale={5}
            centerOnInit
            wheel={{ step: 0.1 }}
            panning={{ excluded: ["device-icon"] }}
            onPanning={(ref) => { if (activeTool !== "move") ref.stop(); }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
                  <div
                    className="relative"
                    style={{
                      width: "100%",
                      height: "100%",
                      minWidth: "2000px",
                      minHeight: "1500px",
                      background: "#070c1a",
                      backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.015) 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                      transform: `rotate(${canvasRotation}deg)`,
                      transformOrigin: "center center",
                    }}
                    onClick={handleCanvasClick}
                    onDoubleClick={handleDoubleClick}
                  >
                    {/* Floor plan image */}
                    {floorPlan2D && (
                      <img
                        src={floorPlan2D.url}
                        alt="Floor Plan"
                        className="absolute left-1/2 top-1/2"
                        style={{
                          transform: "translate(-50%, -50%)",
                          opacity: floorPlanOpacity,
                          maxWidth: "90%",
                          maxHeight: "90%",
                          pointerEvents: "none",
                          userSelect: "none",
                        }}
                        draggable={false}
                      />
                    )}

                    {/* Cable being drawn */}
                    {activeTool === "cable" && cablePoints.length > 0 && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
                        <polyline
                          points={cablePoints.map(p => `${p.x},${p.y}`).join(" ")}
                          fill="none"
                          stroke="#8b5cf6"
                          strokeWidth="2"
                          strokeDasharray="6,3"
                        />
                        {cablePoints.map((p, i) => (
                          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#8b5cf6" />
                        ))}
                      </svg>
                    )}

                    {/* Devices */}
                    {devices.map((dev) => {
                      const color = getDeviceColor(dev.type);
                      const isSelected = dev.id === selectedId;
                      const deviceStoreItem = dev.deviceStoreRef ? storeDevices.find(d => d.id === dev.deviceStoreRef) : null;

                      return (
                        <div
                          key={dev.id}
                          className="device-icon absolute cursor-pointer"
                          style={{
                            left: dev.x,
                            top: dev.y,
                            transform: "translate(-50%, -50%)",
                            zIndex: 20,
                          }}
                          onClick={(e) => handleDeviceClick(dev.id, e)}
                          onMouseDown={(e) => handleDeviceMouseDown(dev.id, e)}
                        >
                          {dev.type === "camera" && (
                            <div className="relative">
                              {deviceStoreItem?.imageUrl ? (
                                <img src={deviceStoreItem.imageUrl} alt="" className="w-8 h-8 object-contain rounded" style={{ border: isSelected ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.3)", background: "rgba(0,0,0,0.6)" }} />
                              ) : (
                                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: color, border: isSelected ? "2px solid #fff" : "1px solid rgba(255,255,255,0.5)", boxShadow: isSelected ? `0 0 12px ${color}` : "none" }}>
                                  <Camera className="w-3 h-3 text-white" />
                                </div>
                              )}
                              {showFov && (
                                <svg className="absolute" style={{ left: "-45px", top: "-45px", width: "100px", height: "100px", pointerEvents: "none", transform: `rotate(${dev.rot}deg)` }}>
                                  <path d={fovPath(50, 50, 0, dev.fov || 80, dev.range || 45)} fill={isSelected ? "rgba(59,130,246,0.22)" : "rgba(59,130,246,0.08)"} />
                                </svg>
                              )}
                            </div>
                          )}
                          {dev.type === "door" && (
                            <div className="relative" style={{ transform: `rotate(${dev.rot}deg)` }}>
                              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.2)", border: isSelected ? "2px solid #f59e0b" : "1px solid rgba(245,158,11,0.5)" }}>
                                <DoorOpen className="w-3.5 h-3.5 text-amber-400" />
                                {dev.doorConfig?.swing === "outswinging" ? (
                                  <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2,10 Q2,2 10,2" fill="none" stroke="#f59e0b" strokeWidth="1" /></svg>
                                ) : (
                                  <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2,2 Q2,10 10,10" fill="none" stroke="#f59e0b" strokeWidth="1" /></svg>
                                )}
                              </div>
                            </div>
                          )}
                          {dev.type === "panel" && (
                            <div className="px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1" style={{ background: "rgba(249,115,22,0.2)", border: isSelected ? "2px solid #f97316" : "1px solid rgba(249,115,22,0.5)", color: "#f97316" }}>
                              <PanelRight className="w-3 h-3" />PNL
                            </div>
                          )}
                          {dev.type === "power" && (
                            <div className="px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1" style={{ background: "rgba(239,68,68,0.2)", border: isSelected ? "2px solid #ef4444" : "1px solid rgba(239,68,68,0.5)", color: "#ef4444" }}>
                              <Zap className="w-3 h-3" />PWR
                            </div>
                          )}
                          {dev.type === "server" && (
                            <div className="px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1" style={{ background: "rgba(236,72,153,0.2)", border: isSelected ? "2px solid #ec4899" : "1px solid rgba(236,72,153,0.5)", color: "#ec4899" }}>
                              <Server className="w-3 h-3" />NVR
                            </div>
                          )}
                          {dev.type === "cable" && dev.cablePoints && (
                            <svg className="absolute pointer-events-none" style={{ left: 0, top: 0, width: "100%", height: "100%", overflow: "visible" }}>
                              <polyline
                                points={dev.cablePoints.map(p => `${p.x - dev.x},${p.y - dev.y}`).join(" ")}
                                fill="none"
                                stroke={color}
                                strokeWidth={isSelected ? 2.5 : 1.5}
                                strokeDasharray={isSelected ? "none" : "6,3"}
                              />
                            </svg>
                          )}
                          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-semibold whitespace-nowrap" style={{ color: isSelected ? "#fff" : "#484f58", textShadow: isSelected ? "0 0 6px rgba(0,0,0,0.8)" : "none" }}>
                            {dev.label}
                          </div>
                        </div>
                      );
                    })}

                    {!floorPlan2D && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <Upload className="w-12 h-12 text-[#484f58] mx-auto mb-3" />
                          <p className="text-[#484f58] text-[14px] font-semibold">Upload a floor plan or 3D model to begin</p>
                          <p className="text-[#484f58] text-[11px] mt-1">Use the toolbar buttons above</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TransformComponent>

                {/* Zoom controls */}
                <div className="absolute bottom-20 right-4 z-40 flex flex-col gap-1">
                  <button onClick={() => zoomIn()} className="w-8 h-8 rounded-xl flex items-center justify-center text-white cursor-pointer active:scale-[0.97] transition-transform" style={G.btn}><ZoomIn className="w-3.5 h-3.5" /></button>
                  <button onClick={() => zoomOut()} className="w-8 h-8 rounded-xl flex items-center justify-center text-white cursor-pointer active:scale-[0.97] transition-transform" style={G.btn}><ZoomOut className="w-3.5 h-3.5" /></button>
                  <button onClick={() => resetTransform()} className="w-8 h-8 rounded-xl flex items-center justify-center text-white cursor-pointer active:scale-[0.97] transition-transform" style={G.btn}><Maximize2 className="w-3.5 h-3.5" /></button>
                </div>
              </>
            )}
          </TransformWrapper>
        )}

        {/* Properties panel */}
        {showProperties && selected && (
          <div className="absolute right-0 top-0 bottom-0 w-72 z-30 flex flex-col" style={G.liquidGlass}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-white text-[12px] font-bold">Properties</p>
              <button onClick={() => setShowProperties(false)} className="w-6 h-6 rounded-lg hover:bg-white/[0.08] flex items-center justify-center cursor-pointer active:scale-[0.97] transition-transform min-w-[44px] min-h-[44px]"><X className="w-3.5 h-3.5 text-[#8b949e]" /></button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4" style={{ scrollbarWidth: "none" }}>
              <div>
                <p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest mb-2">Device</p>
                <div className="rounded-xl p-3" style={G.card}>
                  <p className="text-white text-[12px] font-bold">{selected.label}</p>
                  <p className="text-[#484f58] text-[10px] mt-1 capitalize">{selected.type}</p>
                </div>
              </div>
              {storeDevice && (
                <div className="space-y-3">
                  <div><p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest mb-2">Device Store Info</p>
                    <div className="rounded-xl p-3 space-y-2" style={G.card}>
                      <p className="text-white text-[12px] font-bold">{storeDevice.model}</p>
                      <p className="text-[#8b949e] text-[10px]">{storeDevice.manufacturer}</p>
                      {storeDevice.resolution && <div className="flex justify-between"><span className="text-[#484f58] text-[10px]">Resolution</span><span className="text-white text-[10px] font-semibold">{storeDevice.resolution}</span></div>}
                      {storeDevice.lens && <div className="flex justify-between"><span className="text-[#484f58] text-[10px]">Lens</span><span className="text-white text-[10px] font-semibold">{storeDevice.lens}</span></div>}
                      {storeDevice.sensor && <div className="flex justify-between"><span className="text-[#484f58] text-[10px]">Sensor</span><span className="text-white text-[10px] font-semibold">{storeDevice.sensor}</span></div>}
                      {storeDevice.frameRate && <div className="flex justify-between"><span className="text-[#484f58] text-[10px]">Frame Rate</span><span className="text-white text-[10px] font-semibold">{storeDevice.frameRate}</span></div>}
                      {storeDevice.price && <div className="flex justify-between"><span className="text-[#484f58] text-[10px]">Price</span><span className="text-white text-[10px] font-bold">${storeDevice.price.toFixed(2)}</span></div>}
                    </div>
                  </div>
                </div>
              )}
              <div>
                <p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest mb-2">Position</p>
                <div className="grid grid-cols-2 gap-2">
                  {[{ label: "X", value: Math.round(selected.x) },{ label: "Y", value: Math.round(selected.y) }].map((f) => (
                    <div key={f.label} className="rounded-xl p-2.5" style={G.card}><p className="text-[#484f58] text-[10px] font-bold mb-1">{f.label}</p><p className="text-white text-[13px] font-bold">{f.value} px</p></div>
                  ))}
                </div>
              </div>
              {selected.type === "camera" && (
                <div className="space-y-2">
                  <p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest">Camera Settings</p>
                  <div className="rounded-xl p-3 space-y-2" style={G.card}>
                    <div className="flex items-center justify-between"><span className="text-[#8b949e] text-[11px]">Rotation</span>
                      <input type="range" min="0" max="360" value={selected.rot} onChange={(e) => setDevices((prev) => prev.map((d) => d.id === selected.id ? { ...d, rot: parseInt(e.target.value) } : d))} className="w-24" />
                      <span className="text-white text-[10px] font-bold">{selected.rot}°</span>
                    </div>
                    <div className="flex items-center justify-between"><span className="text-[#8b949e] text-[11px]">FOV</span>
                      <select value={selected.fov || 80} onChange={(e) => setDevices((prev) => prev.map((d) => d.id === selected.id ? { ...d, fov: parseInt(e.target.value) } : d))} className="bg-transparent text-white text-[11px] font-semibold cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: "6px", padding: "2px 6px" }}>
                        <option value="60">60°</option><option value="80">80°</option><option value="100">100°</option><option value="120">120°</option><option value="180">180°</option><option value="360">360°</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between"><span className="text-[#8b949e] text-[11px]">Range</span>
                      <input type="number" value={selected.range || 90} onChange={(e) => setDevices((prev) => prev.map((d) => d.id === selected.id ? { ...d, range: parseInt(e.target.value) || 90 } : d))} className="bg-transparent text-white text-[11px] w-16 text-center font-semibold" style={G.input} />
                      <span className="text-[#484f58] text-[10px]">px</span>
                    </div>
                  </div>
                </div>
              )}
              {selected.type === "door" && selected.doorConfig && (
                <div className="space-y-2">
                  <p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest">Door Config</p>
                  <div className="rounded-xl p-3 space-y-2" style={G.card}>
                    <div className="flex items-center justify-between"><span className="text-[#8b949e] text-[11px]">Swing</span>
                      <select value={selected.doorConfig.swing} onChange={(e) => updateDoorConfig(selected.id, { swing: e.target.value as "inswinging"|"outswinging" })} className="bg-transparent text-white text-[11px] font-semibold cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: "6px", padding: "2px 6px" }}>
                        <option value="inswinging">Inswinging</option><option value="outswinging">Outswinging</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between"><span className="text-[#8b949e] text-[11px]">Lock</span>
                      <select value={selected.doorConfig.lockType} onChange={(e) => updateDoorConfig(selected.id, { lockType: e.target.value })} className="bg-transparent text-white text-[11px] font-semibold cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: "6px", padding: "2px 6px" }}>
                        <option>Electric Strike</option><option>Maglock</option><option>Deadbolt</option><option>Crash Bar</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between"><span className="text-[#8b949e] text-[11px]">Access</span>
                      <select value={selected.doorConfig.accessType} onChange={(e) => updateDoorConfig(selected.id, { accessType: e.target.value })} className="bg-transparent text-white text-[11px] font-semibold cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: "6px", padding: "2px 6px" }}>
                        <option>Card</option><option>Biometric</option><option>Keypad</option><option>Combo</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between"><span className="text-[#8b949e] text-[11px]">Key Override</span>
                      <button onClick={() => updateDoorConfig(selected.id, { keyOverride: !selected.doorConfig?.keyOverride })} className={clsx("px-2 py-0.5 rounded text-[10px] font-bold", selected.doorConfig?.keyOverride ? "bg-emerald-500/20 text-emerald-400" : "bg-white/[0.05] text-[#484f58]")}>{selected.doorConfig?.keyOverride ? "Yes" : "No"}</button>
                    </div>
                  </div>
                </div>
              )}
              <button onClick={() => { setDevices((prev) => prev.filter((d) => d.id !== selected.id)); setSelectedId(null); }} className="w-full h-8 rounded-xl text-rose-400 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.97] transition-transform" style={{ background: "rgba(244,63,94,0.10)", border: "1px solid rgba(244,63,94,0.20)" }}><Trash2 className="w-3 h-3" /> Delete</button>
            </div>
          </div>
        )}

        {/* Bottom toolbar */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-2 py-2 rounded-2xl overflow-x-auto max-w-[95vw]" style={G.liquidGlass}>
          {CANVAS_TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => { setActiveTool(tool.id); if (tool.id !== "cable") setCablePoints([]); if (tool.id === "move") setDraggingDevice(null); }}
              title={tool.label}
              className={clsx("w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 cursor-pointer active:scale-[0.97] transition-transform min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0", activeTool === tool.id ? "text-white" : "text-[#8b949e]")}
              style={activeTool === tool.id ? { background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.45)" } : undefined}
            >
              <tool.icon className="w-3.5 h-3.5" />
            </button>
          ))}
          <div className="w-px h-6 mx-1" style={{ background: "rgba(255,255,255,0.10)" }} />
          <button onClick={() => setShowProperties(!showProperties)} className={clsx("w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 cursor-pointer active:scale-[0.97] transition-transform min-w-[44px] min-h-[44px]", showProperties ? "text-white" : "text-[#484f58]")} style={showProperties ? { background: "rgba(255,255,255,0.10)" } : undefined}><ChevronRight className="w-3.5 h-3.5" /></button>
          <span className="text-[#484f58] text-[9px] ml-1">{devices.length} devices</span>
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

  const BOM_CATEGORIES = [
    { section: 100, name: "General Requirements" },
    { section: 200, name: "Video Surveillance Equipment" },
    { section: 300, name: "Access Control Equipment" },
    { section: 400, name: "Software & Licensing" },
    { section: 500, name: "Compute & Storage" },
    { section: 600, name: "Networking & Infrastructure" },
    { section: 700, name: "Installation & Labor" },
    { section: 800, name: "Professional Services" },
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
            {activeTab === "bom" && (
              <div className="space-y-4">
                {BOM_CATEGORIES.map((bomCat) => {
                  const matchingCat = quoteCategories.find(c => {
                    const nameMap: Record<number, string> = {
                      100: "General Requirements",
                      200: "Video Security Equipment",
                      300: "Access Control Equipment",
                      400: "Software",
                      500: "Compute & Storage",
                      600: "Networking",
                      700: "Installation & Labor",
                      800: "Professional Services",
                    };
                    return c.name === nameMap[bomCat.section];
                  });
                  const items = matchingCat?.lineItems.filter(li => li.quantity > 0) || [];
                  const catSubtotal = items.reduce((s, li) => s + recalcLineItem(li).sellTotal, 0);
                  const isCollapsed = collapsedCategories.has(`bom-${bomCat.section}`);
                  return (
                    <div key={bomCat.section} className="rounded-2xl overflow-hidden" style={G.card}>
                      <button onClick={() => toggleCollapse(`bom-${bomCat.section}`)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer active:scale-[0.97] transition-transform min-h-[44px]" style={{ borderBottom: isCollapsed ? "none" : "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                        <div className="flex items-center gap-3"><span className="text-[#484f58] text-[12px] font-bold font-mono">{bomCat.section}</span><h3 className="text-white text-[13px] font-bold">{bomCat.name}</h3><span className="text-[#484f58] text-[10px]">({items.length})</span></div>
                        <div className="flex items-center gap-3"><span className="text-[#8b949e] text-[11px] font-bold">{fmt(catSubtotal)}</span>{isCollapsed ? <ChevronDown className="w-4 h-4 text-[#484f58]" /> : <ChevronUp className="w-4 h-4 text-[#484f58]" />}</div>
                      </button>
                      {!isCollapsed && items.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full" style={{ minWidth: "500px" }}>
                            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{["#","Description","QTY","Unit Cost","Extended"].map(h => <th key={h} className="px-3 py-2 text-[#484f58] text-[9px] font-bold uppercase text-left">{h}</th>)}</tr></thead>
                            <tbody>
                              {items.map((item, idx) => { const r = recalcLineItem(item); return (
                                <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                  <td className="px-3 py-2 text-[#484f58] text-[10px] font-mono">{String(idx+1).padStart(2,"0")}</td>
                                  <td className="px-3 py-2 text-white text-[11px] font-semibold">{item.description}</td>
                                  <td className="px-3 py-2 text-white text-[11px] text-center">{item.quantity}</td>
                                  <td className="px-3 py-2 text-white text-[11px] text-right">{fmt(r.unitCost)}</td>
                                  <td className="px-3 py-2 text-white text-[11px] font-bold text-right">{fmt(r.sellTotal)}</td>
                                </tr>
                              );})}
                              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                                <td colSpan={4} className="px-3 py-2 text-[#8b949e] text-[10px] font-bold text-right uppercase">Section {bomCat.section} Subtotal</td>
                                <td className="px-3 py-2 text-white text-[11px] font-bold text-right">{fmt(catSubtotal)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                      {!isCollapsed && items.length === 0 && <div className="px-4 py-3 text-[#484f58] text-[10px]">No items in this section</div>}
                    </div>
                  );
                })}
                <div className="rounded-2xl p-4" style={{ ...G.card, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.20)" }}>
                  <h3 className="text-white text-[14px] font-bold mb-3">BOM Summary</h3>
                  <div className="space-y-2">
                    {BOM_CATEGORIES.map((bomCat) => {
                      const matchingCat = quoteCategories.find(c => {
                        const nameMap: Record<number, string> = { 100: "General Requirements", 200: "Video Security Equipment", 300: "Access Control Equipment", 400: "Software", 500: "Compute & Storage", 600: "Networking", 700: "Installation & Labor", 800: "Professional Services" };
                        return c.name === nameMap[bomCat.section];
                      });
                      const subtotal = (matchingCat?.lineItems.filter(li => li.quantity > 0) || []).reduce((s, li) => s + recalcLineItem(li).sellTotal, 0);
                      return (<div key={bomCat.section} className="flex justify-between py-1"><span className="text-[#8b949e] text-[11px]">{bomCat.section} — {bomCat.name}</span><span className="text-white text-[11px] font-bold">{fmt(subtotal)}</span></div>);
                    })}
                    <div className="flex justify-between py-2 border-t border-white/10"><span className="text-[#8b949e] text-[12px]">Subtotal</span><span className="text-white text-[13px] font-bold">{fmt(grandTotalPreTax)}</span></div>
                    <div className="flex justify-between py-1"><span className="text-[#8b949e] text-[12px]">GCT (15%)</span><span className="text-[#8b949e] text-[12px] font-bold">{fmt(gctAmount)}</span></div>
                    <div className="flex justify-between py-2 border-t-2 border-white/10"><span className="text-white text-[14px] font-bold">Grand Total</span><span className="text-white text-[1.1rem] font-extrabold" style={{ color: "#60a5fa" }}>{fmt(grandTotal)}</span></div>
                  </div>
                </div>
              </div>
            )}
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
                <div className="rounded-2xl p-4" style={G.card}>
                  <h3 className="text-white text-[13px] font-bold mb-3">Importation</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ minWidth: "500px" }}>
                      <thead><tr>{["Description","QTY","List Price","Extended"].map(h => <th key={h} className="px-3 py-2 text-[#484f58] text-[9px] font-bold uppercase text-left">{h}</th>)}</tr></thead>
                      <tbody>
                        {[{ desc: "Shipping / Freight" },{ desc: "Importation Tax" }].map((row) => (
                          <tr key={row.desc}>
                            <td className="px-3 py-2 text-white text-[11px] font-semibold">{row.desc}</td>
                            <td className="px-3 py-2"><input type="number" defaultValue={0} className="bg-transparent text-white text-[11px] w-16 text-center focus:outline-none" style={G.input} /></td>
                            <td className="px-3 py-2"><input type="number" defaultValue={0} className="bg-transparent text-white text-[11px] w-24 text-right focus:outline-none" style={G.input} /></td>
                            <td className="px-3 py-2 text-white text-[11px] font-bold text-right">{fmt(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="rounded-2xl p-4" style={G.card}>
                  <h3 className="text-white text-[13px] font-bold mb-3">Professional Services</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ minWidth: "500px" }}>
                      <thead><tr>{["Description","QTY","List Price","Extended"].map(h => <th key={h} className="px-3 py-2 text-[#484f58] text-[9px] font-bold uppercase text-left">{h}</th>)}</tr></thead>
                      <tbody>
                        {["Equipment Installation","Software / Platform Setup","Project Management","Contingency"].map((svc) => (
                          <tr key={svc}>
                            <td className="px-3 py-2 text-white text-[11px] font-semibold">{svc}</td>
                            <td className="px-3 py-2"><input type="number" defaultValue={0} className="bg-transparent text-white text-[11px] w-16 text-center focus:outline-none" style={G.input} /></td>
                            <td className="px-3 py-2"><input type="number" defaultValue={0} className="bg-transparent text-white text-[11px] w-24 text-right focus:outline-none" style={G.input} /></td>
                            <td className="px-3 py-2 text-white text-[11px] font-bold text-right">{fmt(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
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
          </div>
        </div>
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

const CAT_COLOR_DS: Record<string, { bg: string; text: string; label: string }> = { camera: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", label: "Camera" }, "access-control": { bg: "rgba(139,92,246,0.12)", text: "#a78bfa", label: "Access" }, nvr: { bg: "rgba(16,185,129,0.12)", text: "#34d399", label: "NVR" }, analytics: { bg: "rgba(249,115,22,0.12)", text: "#fb923c", label: "VMS" }, other: { bg: "rgba(100,100,100,0.12)", text: "#8b949e", label: "Other" } };

function DeviceSpecModal({ device, onClose }: { device: CatalogDevice; onClose: () => void }) {
  const { addToQuote } = useQuote(); const { fmt } = useCurrency(); const cc = CAT_COLOR_DS[device.category] ?? CAT_COLOR_DS.other;
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
        <div className="grid gap-3 md:gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>{filtered.map((device) => { const cc = CAT_COLOR_DS[device.category] ?? CAT_COLOR_DS.other; return (<div key={device.id} onClick={() => setSelectedDevice(device)} className="rounded-2xl overflow-hidden cursor-pointer group transition-all md:hover:-translate-y-1" style={{ ...G.card }}><div className="relative h-32 md:h-36 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>{device.imageUrl ? <img src={device.imageUrl} alt={device.model} className="w-full h-full object-contain p-3 opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" /> : <div className="w-full h-full flex items-center justify-center"><Camera className="w-12 h-12 text-[#484f58]" /></div>}<div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1"><span className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase" style={{ background: cc.bg, color: cc.text }}>{cc.label}</span>{device.cameraType && <span className="inline-block px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase" style={{ background: "rgba(255,255,255,0.08)", color: "#e6edf3" }}>{device.cameraType}</span>}</div></div><div className="p-3"><p className="text-[#8b949e] text-[9px] font-semibold">{device.manufacturer}</p><p className="text-white text-[12px] font-bold mt-0.5 truncate">{device.model}</p>{device.resolution && <p className="text-[#484f58] text-[9px] mt-1 truncate">{device.resolution}</p>}<div className="flex flex-wrap gap-1 mt-2">{device.tags?.slice(0,3).map((tag) => { const ts = TAG_STYLES[tag]; return ts ? <span key={tag} className="inline-block px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase" style={{ background: ts.bg, color: ts.text }}>{tag}</span> : null; })}</div><div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}><span className="text-[#484f58] text-[8px] font-mono">{device.sku}</span><span className="font-bold text-[11px]" style={{ color: cc.text }}>{device.price ? fmt(device.price) : "—"}</span></div></div></div>); })}</div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={G.card}><div className="overflow-x-auto"><table className="w-full" style={{ minWidth: "700px" }}><thead><tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{["","Model","Manufacturer","Type","Resolution","Tags","SKU","Price"].map((h) => (<th key={h} className={`${h==="Price"?"text-right":"text-left"} px-3 py-3 text-[#484f58] text-[10px] font-bold uppercase tracking-widest`}>{h}</th>))}</tr></thead><tbody>{filtered.map((device, i) => { const cc = CAT_COLOR_DS[device.category] ?? CAT_COLOR_DS.other; return (<tr key={device.id} onClick={() => setSelectedDevice(device)} className="cursor-pointer hover:bg-white/[0.02] transition-colors group" style={{ borderBottom: i<filtered.length-1?"1px solid rgba(255,255,255,0.04)":"none" }}><td className="px-3 py-2.5"><div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)" }}>{device.imageUrl ? <img src={device.imageUrl} alt={device.model} className="w-full h-full object-contain p-1 opacity-70" /> : <Camera className="w-4 h-4 text-[#484f58] m-auto mt-2.5" />}</div></td><td className="px-3 py-2.5 text-white text-[11px] font-semibold">{device.model}</td><td className="px-3 py-2.5 text-[#8b949e] text-[10px]">{device.manufacturer}</td><td className="px-3 py-2.5"><span className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase" style={{ background: cc.bg, color: cc.text }}>{device.cameraType || cc.label}</span></td><td className="px-3 py-2.5 text-[#8b949e] text-[10px]">{device.resolution||"—"}</td><td className="px-3 py-2.5"><div className="flex flex-wrap gap-1">{device.tags?.map((tag) => { const ts = TAG_STYLES[tag]; return ts ? <span key={tag} className="inline-block px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase" style={{ background: ts.bg, color: ts.text }}>{tag}</span> : null; })}</div></td><td className="px-3 py-2.5 text-[#484f58] text-[10px] font-mono">{device.sku}</td><td className="px-3 py-2.5 text-right"><span className="text-white text-[11px] font-bold">{device.price?fmt(device.price):"—"}</span></td></tr>); })}</tbody></table></div></div>
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
