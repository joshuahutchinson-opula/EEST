import { useState, useMemo, createContext, useContext, useEffect, useCallback, useRef, Fragment } from "react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera, Fingerprint, Building2, MapPin, Calendar,
  DollarSign, Layers, MoreHorizontal, GripVertical, Plus,
  Search, Bell, Settings, TrendingUp, Star, BarChart3,
  ChevronDown, Loader2, ArrowLeft, CheckCircle2, Clock,
  AlertTriangle, Key, Download, Share2, FileText,
  Grid3x3, List, Move,
  Trash2, X, Package, AlertCircle, RotateCcw,
  ChevronRight, ChevronLeft, Upload, Pencil, Lock,
  Cpu, Activity, CheckSquare, ChevronUp, ExternalLink,
  Phone, Mail, MessageSquare, StickyNote, Users, Store,
  DoorOpen, PanelRight, Zap, Server, Cable, Box, Save,
  Sun, Moon, SlidersHorizontal, ShoppingCart, History,
  RotateCw, Maximize2, Minimize2, LogOut,
  ListTodo, PlusCircle, GanttChart, ClipboardCheck,
  Link2, Copy, Filter, CheckCheck, Paperclip, Image,
  BellRing, Layout, BarChart4, Table2, Hash, Info, FileDown,
  Printer, Wrench, ClipboardList, Truck, PackageCheck,
  UserCheck, Send, EyeOff, GanttChartSquare, Boxes, PackageOpen, Sparkles,
} from "lucide-react";
import { clsx } from "clsx";
import logoImg from "./assets/2026-06-14_21.13.34_e-techsystemsja.com_2f51395e09e8-removebg-preview (1).png";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const GCT_RATE = 0.15;
const DEFAULT_EXCHANGE_RATE = 163;
const PM_REFERENCE_RATE = 0.05;
const CONTINGENCY_REFERENCE_RATE = 0.10;

const TEAM = [
  { name: "Joshua", initials: "JS", color: "#3b82f6" },
  { name: "Roger", initials: "RG", color: "#06b6d4" },
  { name: "Donovan", initials: "DV", color: "#8b5cf6" },
  { name: "Michael", initials: "MC", color: "#f59e0b" },
  { name: "Denise", initials: "DN", color: "#f97316" },
  { name: "Rochelle", initials: "RC", color: "#10b981" },
  { name: "Shanice", initials: "SC", color: "#ef4444" },
  { name: "Shavene", initials: "SV", color: "#ec4899" },
  { name: "Marvin", initials: "MV", color: "#14b8a6" },
  { name: "Akeem", initials: "AK", color: "#f97316" },
];
const CURRENT_USER = TEAM[0];

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function fmtDateFull(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

const G = {
  card: { background: "rgba(255,255,255,0.055)", backdropFilter: "blur(24px) saturate(160%)", WebkitBackdropFilter: "blur(24px) saturate(160%)", border: "1px solid rgba(255,255,255,0.11)", boxShadow: "0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.09)" } as React.CSSProperties,
  panel: { background: "rgba(7,12,26,0.72)", backdropFilter: "blur(40px) saturate(180%)", WebkitBackdropFilter: "blur(40px) saturate(180%)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)" } as React.CSSProperties,
  subtle: { background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" } as React.CSSProperties,
  input: { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.2)" } as React.CSSProperties,
  btn: { background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" } as React.CSSProperties,
  liquidGlass: { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(28px) saturate(180%)", WebkitBackdropFilter: "blur(28px) saturate(180%)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)", borderRadius: "16px" } as React.CSSProperties,
};

interface CurrencyCtx {
  currency: "USD" | "JMD";
  setCurrency: (c: "USD" | "JMD") => void;
  fmt: (usdAmt: number, compact?: boolean) => string;
}
const CurrencyContext = createContext<CurrencyCtx>({
  currency: "USD",
  setCurrency: () => {},
  fmt: (n) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
});
const useCurrency = () => useContext(CurrencyContext);

function makeFmt(currency: "USD" | "JMD") {
  return (usdAmt: number, compact = false): string => {
    const amt = currency === "JMD" ? usdAmt * (parseFloat(localStorage.getItem("fx_rate") || String(DEFAULT_EXCHANGE_RATE))) : usdAmt;
    const sym = currency === "JMD" ? "J$" : "$";
    if (compact) {
      if (amt >= 1_000_000_000) return `${sym}${(amt / 1_000_000_000).toFixed(2)}B`;
      if (amt >= 1_000_000) return `${sym}${(amt / 1_000_000).toFixed(2)}M`;
      if (amt >= 1_000) return `${sym}${(amt / 1_000).toFixed(0)}K`;
      return `${sym}${amt.toFixed(0)}`;
    }
    return `${sym}${amt.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };
}

type Page = "login" | "dashboard" | "projects" | "project-detail" | "workbook" | "install-tracker" | "device-library";
type Stage = "lead" | "opportunity" | "assessment-scheduled" | "assessment-completed" | "proposal" | "negotiation" | "win" | "lose";
type ProjectStage = "support" | "planning" | "procurement" | "installation" | "commissioning" | "complete";
type PipelineType = "sales" | "project";
type LeadSource = "Tender" | "Single Source" | "Inbound" | "Referral" | "Recurring Client" | "Outbound";
type QuoteType = "Video Surveillance" | "Access Control" | "Intercom" | "Multiple";
type SystemType = "VSS" | "EAC" | "Intercom";
type TaskStatus = "todo" | "in-progress" | "review" | "complete";
type TaskPriority = "low" | "medium" | "high";
type SupportType = "contract-support" | "pre-paid" | "post-paid" | "sla";
type DeviceLibraryTab = "store" | "inventory";
type WorkbookTab = "asset-list" | "cost-margin" | "bom" | "synthesis";

interface AuditLogEntry { id: string; projectId: string; event: string; details: string; timestamp: string; user: string; notificationType?: string; actionUrl?: string; }
interface ChangeOrder { id: string; projectId: string; title: string; description: string; costImpact: number; status: "draft" | "submitted" | "approved" | "rejected"; createdAt: string; updatedAt: string; createdBy: string; }
interface Project {
  id: string;
  name: string;
  client: string;
  value: number;
  stage: Stage;
  risk: "low" | "medium" | "high";
  assignee: { name: string; initials: string; color: string };
  dueDate: string;
  cameras: number;
  devices: number;
  location: string;
  contact?: { name: string; title: string; email: string; phone: string };
  summary?: string;
  notes?: string;
  collaborators?: { name: string; initials: string; color: string; role: string }[];
  leadSource?: LeadSource;
  stageHistory?: { stage: Stage | ProjectStage; date: string }[];
  createdAt?: string;
  updatedAt?: string;
  pipelineType?: PipelineType;
  projectStage?: ProjectStage | string;
  supportType?: SupportType;
}
interface Task { id: string; projectId: string; title: string; description?: string; assignee?: string; subcontractorId?: string; status: TaskStatus; priority: TaskPriority; dueDate?: string; createdAt: string; updatedAt: string; }
interface DocumentItem { id: string; projectId: string; filename: string; fileUrl: string; fileType?: string; fileSize?: number; uploadedBy?: string; createdAt: string; }
interface NotificationItem { id: string; user: string; projectId?: string; event: string; details?: string; isRead: boolean; timestamp: string; notificationType?: string; actionUrl?: string; }
interface QuoteLineItem {
  id: string;
  itemNumber: string;
  description: string;
  unitCost: number;
  quantity: number;
  markupPercent: number;
  sellPrice: number;
  costTotal: number;
  sellTotal: number;
  profit: number;
  jmdConversion: number;
  projectAssetId?: string;
}
interface QuoteCategory {
  id: string;
  name: string;
  type: QuoteType;
  system: SystemType;
  sectionNumber: number;
  importRatePercent: number;
  lineItems: QuoteLineItem[];
  contingency?: QuoteLineItem;
}
interface Quote {
  id: string;
  clientName: string;
  refNumber: string;
  date: string;
  status: "draft" | "sent" | "approved" | "rejected";
  quoteType: QuoteType;
  categories: QuoteCategory[];
  exchangeRate: number;
  projectId?: string;
  createdAt?: string;
  updatedAt?: string;
}
interface QuoteCtx {
  currentQuote: Quote | null;
  setCurrentQuote: (q: Quote | null) => void;
  addToQuote: (device: CatalogDevice) => void;
}
const QuoteContext = createContext<QuoteCtx>({ currentQuote: null, setCurrentQuote: () => {}, addToQuote: () => {} });
const useQuote = () => useContext(QuoteContext);

type InstallStatus = "pending" | "in-progress" | "complete" | "failed";
interface InstallDevice { id: string; name: string; type: "camera" | "access" | "nvr" | "door" | "panel" | "power" | "server" | "intercom"; location: string; status: InstallStatus; assignee: string; notes?: string; }
interface InstallZone { id: string; name: string; devices: InstallDevice[]; projectId?: string; isQuickSupport?: boolean; }

type DeviceTag = "LPR" | "Night Vision" | "Thermal" | "PTZ" | "Panoramic" | "WDR" | "Lightfinder" | "IR" | "4K" | "8MP" | "Indoor" | "Outdoor";
type CameraType = "Dome" | "Bullet" | "PTZ" | "Box" | "Panoramic" | "Thermal";
interface CatalogDevice {
  id: string;
  model: string;
  manufacturer: string;
  category: "camera" | "access-control" | "nvr" | "analytics" | "intercom" | "other" | "switch" | "poe-injector" | "patch-panel" | "rack" | "ups";
  system: SystemType;
  cameraType?: CameraType;
  resolution?: string;
  lens?: string;
  sensor?: string;
  nightVision?: string;
  weatherRating?: string;
  powerInput?: string;
  storage?: string;
  channels?: string;
  readers?: string;
  authentication?: string;
  price?: number;
  sku?: string;
  discontinued?: boolean;
  imageUrl?: string;
  frameRate?: string;
  compression?: string;
  fov?: string;
  operatingTemp?: string;
  msrp?: number;
  tags?: DeviceTag[];
}
interface Column { id: Stage; label: string; color: string; }
interface ProjectColumn { id: ProjectStage; label: string; color: string; }

type AssetCategory = "camera" | "access-control" | "network-hardware" | "cable-wire" | "intercom" | "other";

interface CableSpec {
  cableType: "CAT-6" | "CAT-6A" | "Fiber-SM" | "Fiber-MM" | "Coax-RG59" | "Power-18AWG" | "Power-14AWG" | "Speaker-Wire" | "Other";
  lengthFt?: number;
  shielding?: "UTP" | "STP" | "FTP";
  jacketRating?: "Plenum (CMP)" | "Riser (CMR)" | "PVC (CM)" | "Direct Burial";
  connectorType?: string;
  color?: string;
  runDescription?: string;
  costPerFt?: number;
}

interface ProjectAsset {
  id: string;
  projectId: string;
  category: AssetCategory;
  system: SystemType;
  deviceStoreRef?: string;
  cableSpec?: CableSpec;
  unitCost?: number;
  quantity: number;
  location: string;
  zoneId?: string;
  purpose: string;
  coveragePhotos?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

type IconType = React.ComponentType<{ className?: string }>;

interface SynthesisOverride { id: string; projectId: string; sectionNumber: string; overrideValue: number | null; isOverridden: boolean; overriddenBy?: string; overriddenAt?: string; }
interface WorkbookAuditEntry { id: string; projectId: string; fieldPath: string; oldValue: string; newValue: string; changedBy: string; changedAt: string; }
interface AssetListItem { id: string; item: string; qty: number; cost: number; markupPercent: number; sell: number; costTotal: number; total: number; profit: number; isProjectAsset?: boolean; deviceType?: string; system?: SystemType; sourceCategory?: string; sourceItemId?: string; }
interface InventoryItem { id: string; name: string; quantityOnHand: number; location?: string; notes?: string; deviceId?: string; model?: string; manufacturer?: string; sku?: string; }
interface InventoryTransaction { id: string; itemId: string; itemName: string; userName: string; action: string; quantity: number; purpose?: string; notes?: string; createdAt: string; }
interface Subcontractor { id: string; projectId: string; name: string; trade?: string; email?: string; shareToken?: string | null; createdAt: string; documents: { id: string; filename: string; fileUrl: string; uploadedBy?: string; createdAt: string; }[]; }
interface PublicSubcontractor { id: string; name: string; trade?: string; email?: string; projectName: string; createdAt: string; documents: { id: string; filename: string; fileUrl: string; createdAt: string; }[]; tasks: { id: string; title: string; description?: string; status: TaskStatus; priority: TaskPriority; dueDate?: string; }[]; }
interface ProcurementOrder { id: string; projectId: string; supplierName?: string; status: string; totalCost: number; generatedFrom?: string; createdAt: string; items: { id: string; description: string; quantity: number; unitCost: number; totalCost: number; leadTimeDays?: number; trackingNumber?: string; received: boolean; }[]; }
interface CommissioningItem { id: string; projectId: string; deviceId?: string; deviceName: string; location?: string; status: "pending" | "pass" | "fail"; notes?: string; photos?: string[]; }
interface CommissioningReportData {
  project: { name: string; client: string } | null;
  summary: { total: number; passed: number; failed: number; pending: number };
  devices: { deviceName: string; location?: string; status: string; notes?: string }[];
  generatedAt: string;
}
interface ProposalData {
  project: { id: string; name: string; client: string; summary?: string; location?: string };
  exchangeRate: number;
  categories: { system: string; sectionNumber: number; name: string; items: { description: string; unitCost: number; quantity: number; markupPercent: number; sellPrice: number; total: number }[] }[];
  grandTotal: number;
  gctAmount: number;
  grandTotalWithTax: number;
  generatedAt: string;
}

const SYSTEM_CATEGORIES: Record<SystemType, { sectionNumber: number; name: string; defaultMarkup: number; importRatePercent: number; importBasis: "sellTotal" | "costTotal"; }[]> = {
  VSS: [
    { sectionNumber: 100, name: "Video Management System Software", defaultMarkup: 0.35, importRatePercent: 0, importBasis: "costTotal" },
    { sectionNumber: 200, name: "Compute and Storage", defaultMarkup: 0.35, importRatePercent: 0.22, importBasis: "costTotal" },
    { sectionNumber: 300, name: "Control Room", defaultMarkup: 0.30, importRatePercent: 0, importBasis: "costTotal" },
    { sectionNumber: 400, name: "Video Security Equipment", defaultMarkup: 0.30, importRatePercent: 0.44, importBasis: "costTotal" },
    { sectionNumber: 500, name: "Network", defaultMarkup: 0.30, importRatePercent: 0.44, importBasis: "costTotal" },
    { sectionNumber: 600, name: "Network Infrastructure", defaultMarkup: 0.30, importRatePercent: 0.44, importBasis: "costTotal" },
    { sectionNumber: 700, name: "Professional Services", defaultMarkup: 0.50, importRatePercent: 0, importBasis: "costTotal" },
    { sectionNumber: 800, name: "Importation", defaultMarkup: 0, importRatePercent: 0, importBasis: "costTotal" },
  ],
  EAC: [
    { sectionNumber: 900, name: "Access Control System Software", defaultMarkup: 0.35, importRatePercent: 0, importBasis: "costTotal" },
    { sectionNumber: 1000, name: "Hardware", defaultMarkup: 0.35, importRatePercent: 0.44, importBasis: "costTotal" },
    { sectionNumber: 1100, name: "Infrastructure", defaultMarkup: 0.35, importRatePercent: 0.44, importBasis: "costTotal" },
    { sectionNumber: 1200, name: "Professional Services", defaultMarkup: 0.50, importRatePercent: 0, importBasis: "costTotal" },
    { sectionNumber: 1300, name: "Importation", defaultMarkup: 0, importRatePercent: 0, importBasis: "costTotal" },
  ],
  Intercom: [
    { sectionNumber: 1400, name: "Intercom System Software", defaultMarkup: 0.25, importRatePercent: 0, importBasis: "costTotal" },
    { sectionNumber: 1500, name: "Hardware", defaultMarkup: 0.25, importRatePercent: 0.50, importBasis: "costTotal" },
    { sectionNumber: 1600, name: "Infrastructure", defaultMarkup: 0.25, importRatePercent: 0, importBasis: "costTotal" },
    { sectionNumber: 1700, name: "Professional Services", defaultMarkup: 0.50, importRatePercent: 0, importBasis: "costTotal" },
    { sectionNumber: 1800, name: "Importation", defaultMarkup: 0, importRatePercent: 0, importBasis: "costTotal" },
  ],
};

const SYNTHESIS_SECTIONS = [
  { section: "100", name: "Video Management System Software", group: "video" },
  { section: "200", name: "Compute and Storage", group: "video" },
  { section: "300", name: "Control Room", group: "video" },
  { section: "400", name: "Video Security Equipment", group: "video" },
  { section: "500", name: "Network", group: "video" },
  { section: "600", name: "Network Infrastructure", group: "video" },
  { section: "700", name: "Professional Services", group: "video" },
  { section: "700.5", name: "Contingency Plan", group: "video" },
  { section: "800", name: "Importation", group: "video" },
  { section: "900", name: "Access Control System Software", group: "access" },
  { section: "1000", name: "Hardware", group: "access" },
  { section: "1100", name: "Infrastructure", group: "access" },
  { section: "1200", name: "Professional Services", group: "access" },
  { section: "1200.5", name: "Contingency Plan", group: "access" },
  { section: "1300", name: "Importation", group: "access" },
  { section: "1400", name: "Intercom System Software", group: "intercom" },
  { section: "1500", name: "Hardware", group: "intercom" },
  { section: "1600", name: "Infrastructure", group: "intercom" },
  { section: "1700", name: "Professional Services", group: "intercom" },
  { section: "1800", name: "Importation", group: "intercom" },
] as const;

const COLUMNS: Column[] = [
  { id: "lead", label: "Lead", color: "#f43f5e" },
  { id: "opportunity", label: "Opportunity", color: "#f97316" },
  { id: "assessment-scheduled", label: "Assessment Scheduled", color: "#f59e0b" },
  { id: "assessment-completed", label: "Assessment Completed", color: "#06b6d4" },
  { id: "proposal", label: "Proposal", color: "#3b82f6" },
  { id: "negotiation", label: "Negotiation", color: "#8b5cf6" },
  { id: "win", label: "Win", color: "#10b981" },
  { id: "lose", label: "Lose", color: "#f43f5e" },
];

const PROJECT_COLUMNS: ProjectColumn[] = [
  { id: "support", label: "Support Tasks", color: "#f59e0b" },
  { id: "planning", label: "Planning", color: "#3b82f6" },
  { id: "procurement", label: "Procurement", color: "#8b5cf6" },
  { id: "installation", label: "Installation", color: "#f97316" },
  { id: "commissioning", label: "Commissioning", color: "#06b6d4" },
  { id: "complete", label: "Complete", color: "#10b981" },
];

const SUPPORT_TYPES: { id: SupportType; label: string }[] = [
  { id: "contract-support", label: "Contract Support" },
  { id: "pre-paid", label: "Pre-Paid" },
  { id: "post-paid", label: "Post-Paid" },
  { id: "sla", label: "SLA" },
];

const SUPPORT_TYPE_LABELS: Record<SupportType, string> = {
  "contract-support": "Contract Support",
  "pre-paid": "Pre-Paid",
  "post-paid": "Post-Paid",
  "sla": "SLA",
};

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

function stageBadge(stage: Stage | string) {
  const map: Record<string, { label: string; cls: string }> = {
    "lead": { label: "Lead", cls: "bg-rose-500/15 text-rose-400" },
    "opportunity": { label: "Opportunity", cls: "bg-orange-500/15 text-orange-400" },
    "assessment-scheduled": { label: "Assessment", cls: "bg-amber-500/15 text-amber-400" },
    "assessment-completed": { label: "Assessed", cls: "bg-cyan-500/15 text-cyan-400" },
    "proposal": { label: "Proposal", cls: "bg-blue-500/15 text-blue-400" },
    "negotiation": { label: "Negotiating", cls: "bg-violet-500/15 text-violet-400" },
    "win": { label: "Won", cls: "bg-emerald-500/15 text-emerald-400" },
    "lose": { label: "Lost", cls: "bg-rose-500/15 text-rose-400" },
    "design": { label: "Design", cls: "bg-violet-500/15 text-violet-400" },
  };
  return map[stage] || map["lead"];
}

function projectStageBadge(stage: ProjectStage | string) {
  const map: Record<string, { label: string; cls: string; color: string }> = {
    "support": { label: "Support", cls: "bg-amber-500/15 text-amber-400", color: "#f59e0b" },
    "planning": { label: "Planning", cls: "bg-blue-500/15 text-blue-400", color: "#3b82f6" },
    "procurement": { label: "Procurement", cls: "bg-violet-500/15 text-violet-400", color: "#8b5cf6" },
    "installation": { label: "Installation", cls: "bg-orange-500/15 text-orange-400", color: "#f97316" },
    "commissioning": { label: "Commissioning", cls: "bg-cyan-500/15 text-cyan-400", color: "#06b6d4" },
    "complete": { label: "Complete", cls: "bg-emerald-500/15 text-emerald-400", color: "#10b981" },
  };
  return map[stage] || map["planning"];
}

function getSessionEmail(): string | null {
  const token = localStorage.getItem("auth_token");
  if (!token || token.split(".").length !== 3) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.email === "string" ? payload.email : null;
  } catch { return null; }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = {};
  if (!(options?.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 && !path.startsWith("/auth/")) {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("app_logged_in");
    window.location.href = "/";
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

const API = {
  projects: {
    list: () => apiFetch<Project[]>("/projects"),
    get: (id: string) => apiFetch<Project>(`/projects/${id}`),
    create: (data: Partial<Project>) => apiFetch<Project>("/projects", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Project>) => apiFetch<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<void>(`/projects/${id}`, { method: "DELETE" }),
  },
  quotes: {
    list: () => apiFetch<Quote[]>("/quotes"),
    get: (id: string) => apiFetch<Quote>(`/quotes/${id}`),
    create: (data: Partial<Quote>) => apiFetch<Quote>("/quotes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Quote>) => apiFetch<Quote>(`/quotes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<void>(`/quotes/${id}`, { method: "DELETE" }),
  },
  devices: {
    list: () => apiFetch<CatalogDevice[]>("/devices"),
    get: (id: string) => apiFetch<CatalogDevice>(`/devices/${id}`),
    create: (data: Partial<CatalogDevice>) => apiFetch<CatalogDevice>("/devices", { method: "POST", body: JSON.stringify(data) }),
    bulk: (devices: Partial<CatalogDevice>[]) => apiFetch<{ imported: number }>("/devices/bulk", { method: "POST", body: JSON.stringify({ devices }) }),
  },
  install: {
    zones: () => apiFetch<InstallZone[]>("/install/zones"),
    createZone: (data: { name: string; projectId?: string; isQuickSupport?: boolean }) => apiFetch<InstallZone>("/install/zones", { method: "POST", body: JSON.stringify(data) }),
    addDevice: (zoneId: string, data: Partial<InstallDevice>) => apiFetch<InstallDevice>(`/install/zones/${zoneId}/devices`, { method: "POST", body: JSON.stringify(data) }),
    updateStatus: (zoneId: string, deviceId: string, status: InstallStatus) => apiFetch<void>(`/install/zones/${zoneId}/devices/${deviceId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  },
  projectAssets: {
    list: (projectId: string) => apiFetch<ProjectAsset[]>(`/projects/${projectId}/assets`),
    create: (projectId: string, data: Partial<ProjectAsset>) => apiFetch<ProjectAsset>(`/projects/${projectId}/assets`, { method: "POST", body: JSON.stringify(data) }),
    update: (projectId: string, assetId: string, data: Partial<ProjectAsset>) => apiFetch<ProjectAsset>(`/projects/${projectId}/assets/${assetId}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (projectId: string, assetId: string) => apiFetch<void>(`/projects/${projectId}/assets/${assetId}`, { method: "DELETE" }),
  },
  fx: {
    getRate: async () => {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await res.json();
        const rate = data.rates?.JMD || DEFAULT_EXCHANGE_RATE;
        localStorage.setItem("fx_rate", String(rate));
        localStorage.setItem("fx_rate_updated", new Date().toISOString());
        return rate;
      } catch { return parseFloat(localStorage.getItem("fx_rate") || String(DEFAULT_EXCHANGE_RATE)); }
    },
  },
  audit: {
    list: (projectId: string) => apiFetch<AuditLogEntry[]>(`/audit/${projectId}`),
    log: (projectId: string, event: string, details: string) => apiFetch<void>(`/audit/${projectId}`, { method: "POST", body: JSON.stringify({ event, details }) }),
  },
  changeOrders: {
    list: (projectId: string) => apiFetch<ChangeOrder[]>(`/change-orders/${projectId}`),
    create: (projectId: string, data: Partial<ChangeOrder>) => apiFetch<ChangeOrder>(`/change-orders/${projectId}`, { method: "POST", body: JSON.stringify(data) }),
    update: (projectId: string, id: string, data: Partial<ChangeOrder>) => apiFetch<ChangeOrder>(`/change-orders/${projectId}/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (projectId: string, id: string) => apiFetch<void>(`/change-orders/${projectId}/${id}`, { method: "DELETE" }),
  },
  tasks: {
    list: (projectId: string) => apiFetch<Task[]>(`/tasks/${projectId}`),
    create: (projectId: string, data: Partial<Task>) => apiFetch<Task>(`/tasks/${projectId}`, { method: "POST", body: JSON.stringify(data) }),
    update: (projectId: string, id: string, data: Partial<Task>) => apiFetch<Task>(`/tasks/${projectId}/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (projectId: string, id: string) => apiFetch<void>(`/tasks/${projectId}/${id}`, { method: "DELETE" }),
  },
  documents: {
    list: (projectId: string) => apiFetch<DocumentItem[]>(`/documents/${projectId}`),
    upload: (projectId: string, file: File) => { const fd = new FormData(); fd.append("file", file); return apiFetch<DocumentItem>(`/documents/${projectId}`, { method: "POST", body: fd }); },
    delete: (projectId: string, id: string) => apiFetch<void>(`/documents/${projectId}/${id}`, { method: "DELETE" }),
  },
  notifications: {
    list: () => apiFetch<NotificationItem[]>("/notifications"),
    create: (data: Partial<NotificationItem>) => apiFetch<void>("/notifications", { method: "POST", body: JSON.stringify(data) }),
    markRead: (id: string) => apiFetch<void>(`/notifications/${id}/read`, { method: "PATCH" }),
    markAllRead: () => apiFetch<void>("/notifications/read-all", { method: "PATCH" }),
    salesWin: (data: { projectId: string; projectName: string; clientName?: string }) => apiFetch<void>("/notifications/sales-win", { method: "POST", body: JSON.stringify(data) }),
  },
  workbook: {
    getOverrides: (projectId: string) => apiFetch<SynthesisOverride[]>(`/workbook/${projectId}/overrides`),
    saveOverrides: (projectId: string, overrides: Partial<SynthesisOverride>[]) => apiFetch<void>(`/workbook/${projectId}/overrides`, { method: "PUT", body: JSON.stringify({ overrides }) }),
    getAudit: (projectId: string, fieldPath?: string) => apiFetch<WorkbookAuditEntry[]>(`/workbook/${projectId}/audit${fieldPath ? `?fieldPath=${encodeURIComponent(fieldPath)}` : ""}`),
    logAudit: (projectId: string, fieldPath: string, oldValue: string, newValue: string) => apiFetch<void>(`/workbook/${projectId}/audit`, { method: "POST", body: JSON.stringify({ fieldPath, oldValue, newValue, changedBy: CURRENT_USER.name }) }),
    getPriceHistory: (deviceId: string) => apiFetch<{ price: number; recordedAt: string }[]>(`/workbook/devices/${deviceId}/price-history`),
  },
  proposals: { generate: (projectId: string) => apiFetch<ProposalData>(`/workbook/${projectId}/proposal`, { method: "POST" }) },
  share: { generate: (projectId: string, type: string) => apiFetch<{ token: string; url: string }>("/share/generate", { method: "POST", body: JSON.stringify({ projectId, type }) }) },
  inventory: {
    items: () => apiFetch<InventoryItem[]>("/inventory/items"),
    createItem: (data: Partial<InventoryItem>) => apiFetch<InventoryItem>("/inventory/items", { method: "POST", body: JSON.stringify(data) }),
    updateItem: (id: string, data: Partial<InventoryItem>) => apiFetch<InventoryItem>(`/inventory/items/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    transactions: () => apiFetch<InventoryTransaction[]>("/inventory/transactions"),
    createTransaction: (data: Partial<InventoryTransaction>) => apiFetch<InventoryTransaction>("/inventory/transactions", { method: "POST", body: JSON.stringify(data) }),
  },
  procurement: {
    list: (projectId: string) => apiFetch<ProcurementOrder[]>(`/procurement/${projectId}`),
    createPO: (projectId: string, data: any) => apiFetch<ProcurementOrder>(`/procurement/${projectId}`, { method: "POST", body: JSON.stringify(data) }),
    updateItem: (itemId: string, data: any) => apiFetch<void>(`/procurement/items/${itemId}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  commissioning: {
    list: (projectId: string) => apiFetch<CommissioningItem[]>(`/commissioning/${projectId}`),
    sync: (projectId: string) => apiFetch<void>(`/commissioning/${projectId}/sync`, { method: "POST" }),
    add: (projectId: string, data: any) => apiFetch<CommissioningItem>(`/commissioning/${projectId}`, { method: "POST", body: JSON.stringify(data) }),
    update: (projectId: string, deviceId: string, data: any) => apiFetch<void>(`/commissioning/${projectId}/${deviceId}`, { method: "PATCH", body: JSON.stringify(data) }),
    bulk: (projectId: string, deviceIds: string[], status: string) => apiFetch<void>(`/commissioning/${projectId}/bulk`, { method: "POST", body: JSON.stringify({ deviceIds, status }) }),
    generateReport: (projectId: string) => apiFetch<CommissioningReportData>(`/commissioning/${projectId}/report`, { method: "POST" }),
  },
  subcontractors: {
    list: (projectId: string) => apiFetch<Subcontractor[]>(`/subcontractors/${projectId}`),
    add: (projectId: string, data: any) => apiFetch<Subcontractor>(`/subcontractors/${projectId}`, { method: "POST", body: JSON.stringify(data) }),
    delete: (subId: string) => apiFetch<void>(`/subcontractors/${subId}`, { method: "DELETE" }),
    addDoc: (subId: string, data: any) => apiFetch<void>(`/subcontractors/${subId}/documents`, { method: "POST", body: JSON.stringify(data) }),
    generateShareLink: (subId: string) => apiFetch<{ id: string; shareToken: string }>(`/subcontractors/${subId}/share`, { method: "POST" }),
    revokeShareLink: (subId: string) => apiFetch<void>(`/subcontractors/${subId}/share`, { method: "DELETE" }),
    getPublic: (token: string) => apiFetch<PublicSubcontractor>(`/subcontractors/public/${token}`),
  },
};

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function recalcLineItem(item: QuoteLineItem, exchangeRate: number): QuoteLineItem {
  const unitCost = toNum(item.unitCost);
  const quantity = toNum(item.quantity);
  const markupPercent = toNum(item.markupPercent);
  const sellPrice = unitCost * (1 + markupPercent);
  const costTotal = unitCost * quantity;
  const sellTotal = sellPrice * quantity;
  const profit = sellTotal - costTotal;
  return { ...item, unitCost, quantity, markupPercent, sellPrice, costTotal, sellTotal, profit, jmdConversion: sellTotal * toNum(exchangeRate) };
}

function Skeleton({ className }: { className?: string }) { return <div className={clsx("animate-pulse rounded-2xl", className)} style={{ background: "rgba(255,255,255,0.04)" }} />; }
function SkeletonCard() {
  return (
    <div className="rounded-2xl p-4 space-y-3" style={G.card}>
      <div className="flex items-center gap-2"><Skeleton className="w-6 h-6 rounded-full" /><Skeleton className="h-4 w-32" /></div>
      <Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-20" />
      <div className="flex justify-between pt-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-12" /></div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }: { icon: IconType; title: string; description: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.18)" }}><Icon className="w-8 h-8 text-blue-400" /></div>
      <h3 className="text-white text-[17px] font-extrabold mb-1.5">{title}</h3><p className="text-[#8b949e] text-[15px] max-w-sm mb-5">{description}</p>
      {action && <button onClick={action.onClick} className="h-9 px-5 rounded-xl text-white text-[15px] font-extrabold cursor-pointer min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}>{action.label}</button>}
    </div>
  );
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel }: { open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[380px] rounded-2xl p-6" style={G.liquidGlass}>
        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(244,63,94,0.15)" }}><AlertTriangle className="w-5 h-5 text-rose-400" /></div><h3 className="text-white text-[16px] font-extrabold">{title}</h3></div>
        <p className="text-[#8b949e] text-[14px] mb-5">{message}</p>
        <div className="flex gap-2"><button onClick={onCancel} className="flex-1 h-9 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button><button onClick={onConfirm} className="flex-1 h-9 rounded-xl text-white text-[14px] font-extrabold cursor-pointer" style={{ background: "#f43f5e" }}>Delete</button></div>
      </motion.div>
    </div>
  );
}

function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();
  return (
    <div className="flex items-center h-8 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
      {(["USD", "JMD"] as const).map((c) => (<button key={c} onClick={() => setCurrency(c)} className="h-full px-2.5 text-[13px] font-extrabold transition-all cursor-pointer" style={currency === c ? { background: "#3b82f6", color: "#fff" } : { color: "#8b949e" }}>{c}</button>))}
    </div>
  );
}
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    API.notifications.list().then(setNotifications).catch(() => {});
    const interval = setInterval(() => { API.notifications.list().then(setNotifications).catch(() => {}); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => { await API.notifications.markAllRead(); setNotifications(prev => prev.map(n => ({ ...n, isRead: true }))); };

  const handleNotificationClick = (n: NotificationItem) => {
    API.notifications.markRead(n.id).catch(() => {});
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
    if (n.actionUrl) {
      const page = localStorage.getItem("app_page") || "dashboard";
      if (n.actionUrl.includes("/project/")) {
        const projectId = n.actionUrl.split("/project/")[1];
        localStorage.setItem("active_project_id", projectId);
        window.location.href = "/";
      }
    }
  };

  const filtered = filter === "unread" ? notifications.filter(n => !n.isRead) : notifications;

  const grouped = useMemo(() => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const groups: { label: string; items: NotificationItem[] }[] = [
      { label: "Today", items: [] },
      { label: "Yesterday", items: [] },
      { label: "Earlier", items: [] },
    ];
    for (const n of filtered) {
      const d = new Date(n.timestamp).toDateString();
      if (d === today) groups[0].items.push(n);
      else if (d === yesterday) groups[1].items.push(n);
      else groups[2].items.push(n);
    }
    return groups.filter(g => g.items.length > 0);
  }, [filtered]);

  return (
    <div className="relative">
      <button data-tour="tour-notifications" onClick={() => setOpen(!open)} className="relative w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] transition-colors cursor-pointer" style={G.btn}>
        <Bell className="w-3.5 h-3.5 text-[#8b949e]" />
        {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -8 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} className="absolute right-0 top-full mt-2 z-[60] w-80 rounded-2xl overflow-hidden" style={{ background: "rgba(7,12,26,0.97)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 32px rgba(0,0,0,0.8)", backdropFilter: "blur(20px)" }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-white text-[14px] font-extrabold">Notifications</p>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && <button onClick={handleMarkAllRead} className="text-[12px] text-blue-400 font-bold hover:text-blue-300 cursor-pointer">Mark all read</button>}
                <button onClick={() => setFilter(filter === "all" ? "unread" : "all")} className="text-[12px] text-[#8b949e] font-bold cursor-pointer">{filter === "all" ? "Unread" : "All"}</button>
              </div>
            </div>
            <div className="max-h-[360px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center"><Bell className="w-8 h-8 text-[#484f58] mx-auto mb-2" /><p className="text-[#484f58] text-[13px]">No notifications</p></div>
              ) : (
                grouped.map(group => (
                  <div key={group.label}>
                    <div className="px-4 py-2 text-[#484f58] text-[11px] font-extrabold uppercase tracking-widest" style={{ background: "rgba(255,255,255,0.02)" }}>{group.label}</div>
                    {group.items.map(n => (
                      <div key={n.id} className={clsx("px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer", !n.isRead && "bg-white/[0.02]")} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }} onClick={() => handleNotificationClick(n)}>
                        <div className="flex items-start gap-2">
                          <div className={clsx("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", !n.isRead ? "bg-blue-400" : "bg-transparent")} />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-[13px] font-bold">{n.event}</p>
                            {n.details && <p className="text-[#8b949e] text-[12px] mt-0.5">{n.details}</p>}
                            <p className="text-[#484f58] text-[11px] mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

function UserMenu({ onReplayTour }: { onReplayTour: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button data-tour="tour-user-menu" onClick={() => setOpen(!open)} className="flex items-center gap-2 h-8 pl-1.5 pr-2.5 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer min-h-[44px] md:min-h-0">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold flex-shrink-0" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 0 12px rgba(139,92,246,0.5)" }}>{CURRENT_USER.initials}</div>
        <span className="text-white text-[14px] font-bold hidden md:inline">{CURRENT_USER.name}</span>
        <ChevronDown className="w-3 h-3 text-[#8b949e] hidden md:block" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -8 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} className="absolute right-0 top-full mt-2 z-[60] w-56 rounded-2xl overflow-hidden" style={{ background: "rgba(7,12,26,0.97)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 32px rgba(0,0,0,0.8)", backdropFilter: "blur(20px)" }}>
            <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-extrabold flex-shrink-0" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 0 12px rgba(139,92,246,0.5)" }}>{CURRENT_USER.initials}</div>
              <div><p className="text-white text-[14px] font-bold">{CURRENT_USER.name}</p><p className="text-[#484f58] text-[12px]">Administrator</p></div>
            </div>
            <div className="py-1">
              <button onClick={() => { setOpen(false); onReplayTour(); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#8b949e] hover:text-white hover:bg-white/[0.05] transition-colors text-left cursor-pointer min-h-[44px] text-[14px] font-bold"><Sparkles className="w-3.5 h-3.5 text-blue-400" /> Replay Tour</button>
              <button onClick={() => { setOpen(false); localStorage.removeItem("auth_token"); localStorage.removeItem("app_logged_in"); localStorage.removeItem("app_page"); window.location.href = "/"; }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#8b949e] hover:text-white hover:bg-white/[0.05] transition-colors text-left cursor-pointer min-h-[44px] text-[14px] font-bold"><LogOut className="w-3.5 h-3.5 text-rose-400" /> Sign Out</button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

interface TourStep { target: string; page?: Page; title: string; description: string }
const TOUR_STEPS: TourStep[] = [
  { target: "nav-dashboard", page: "dashboard", title: "Pipeline", description: "Track every sales lead and support project through its stages — Lead to Won on the sales side, Planning to Complete on the project side." },
  { target: "nav-projects", page: "projects", title: "Projects", description: "Browse every active project here. Click into one to see its assets, workbook, tasks, and install progress in one place." },
  { target: "nav-workbook", page: "workbook", title: "Workbook", description: "Build out Asset List, Cost & Margin, BOM, and Synthesis for a project's quote — everything rolls up automatically as you go." },
  { target: "nav-install-tracker", page: "install-tracker", title: "Install Tracker", description: "Track device-by-device installation progress across every project currently in the Installation stage." },
  { target: "nav-device-library", page: "device-library", title: "Device Library", description: "Your catalog of cameras, access control, and network hardware — the building blocks you pull into a project's Assets." },
  { target: "tour-notifications", title: "Notifications", description: "Stay on top of task assignments, sales wins, and updates across every project from here." },
  { target: "tour-user-menu", title: "Your Account", description: "Sign out, or replay this tour any time from here." },
];

function OnboardingTour({ page, navigate, onFinish }: { page: Page; navigate: (p: Page) => void; onFinish: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = TOUR_STEPS[stepIndex];

  useEffect(() => { if (step.page && step.page !== page) navigate(step.page); }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let raf = 0;
    let attempts = 0;
    const locate = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) { setRect(el.getBoundingClientRect()); return; }
      if (attempts++ < 30) raf = requestAnimationFrame(locate);
    };
    setRect(null);
    locate();
    const onResize = () => { const el = document.querySelector(`[data-tour="${step.target}"]`); if (el) setRect(el.getBoundingClientRect()); };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); window.removeEventListener("scroll", onResize, true); };
  }, [stepIndex, page]);

  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const goNext = () => { if (isLast) onFinish(); else setStepIndex((i) => i + 1); };
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const pad = 8;
  const spotlight = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;
  const tooltipTop = spotlight ? Math.min(spotlight.top + spotlight.height + 14, window.innerHeight - 220) : window.innerHeight / 2 - 90;
  const tooltipLeft = spotlight ? Math.min(Math.max(spotlight.left, 16), window.innerWidth - 336) : window.innerWidth / 2 - 160;

  return (
    <div className="fixed inset-0 z-[600]">
      <AnimatePresence>
        {spotlight && (
          <motion.div key="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="absolute inset-0" style={{ background: "rgba(2,4,10,0.78)", clipPath: `polygon(0 0, 0 100%, ${spotlight.left}px 100%, ${spotlight.left}px ${spotlight.top}px, ${spotlight.left + spotlight.width}px ${spotlight.top}px, ${spotlight.left + spotlight.width}px ${spotlight.top + spotlight.height}px, ${spotlight.left}px ${spotlight.top + spotlight.height}px, ${spotlight.left}px 100%, 100% 100%, 100% 0)` }} />
        )}
      </AnimatePresence>
      {spotlight && (
        <motion.div key={`ring-${stepIndex}`} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 22, stiffness: 300 }} className="absolute rounded-2xl pointer-events-none" style={{ top: spotlight.top, left: spotlight.left, width: spotlight.width, height: spotlight.height, border: "2px solid #3b82f6", boxShadow: "0 0 0 4px rgba(59,130,246,0.20), 0 0 24px rgba(59,130,246,0.35)" }} />
      )}
      <AnimatePresence mode="wait">
        <motion.div key={stepIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ type: "spring", damping: 28, stiffness: 340 }} className="absolute w-[320px] rounded-2xl p-5" style={{ top: tooltipTop, left: tooltipLeft, ...G.liquidGlass }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-400 text-[11px] font-extrabold uppercase tracking-widest">Step {stepIndex + 1} of {TOUR_STEPS.length}</span>
            <button onClick={onFinish} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/[0.08] cursor-pointer"><X className="w-3.5 h-3.5 text-[#8b949e]" /></button>
          </div>
          <h3 className="text-white text-[16px] font-extrabold mb-1.5">{step.title}</h3>
          <p className="text-[#8b949e] text-[13px] leading-relaxed mb-4">{step.description}</p>
          <div className="flex items-center justify-between">
            <button onClick={onFinish} className="text-[#8b949e] hover:text-white text-[13px] font-bold cursor-pointer">Skip tour</button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && <button onClick={goBack} className="h-8 px-3 rounded-lg text-[#8b949e] hover:text-white text-[13px] font-bold cursor-pointer" style={G.btn}>Back</button>}
              <button onClick={goNext} className="h-8 px-3.5 rounded-lg text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}>{isLast ? "Finish" : "Next"}</button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: "dashboard", label: "Pipeline" },
  { id: "projects", label: "Projects" },
  { id: "workbook", label: "Workbook" },
  { id: "install-tracker", label: "Install Tracker" },
  { id: "device-library", label: "Device Library" },
];

function Breadcrumb({ page, projectName }: { page: Page; projectName?: string }) {
  const crumbs: { label: string; page?: Page }[] = [];
  if (page === "dashboard") crumbs.push({ label: "Pipeline", page: "dashboard" });
  else if (page === "projects") crumbs.push({ label: "Projects", page: "projects" });
  else if (page === "workbook") crumbs.push({ label: "Workbook", page: "workbook" });
  else if (page === "install-tracker") crumbs.push({ label: "Install Tracker", page: "install-tracker" });
  else if (page === "device-library") crumbs.push({ label: "Device Library", page: "device-library" });
  else if (page === "project-detail") crumbs.push({ label: "Projects", page: "projects" }, { label: projectName || "Project Detail" });
  return (
    <div className="flex items-center gap-1.5 text-[13px]">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3 h-3 text-[#484f58]" />}
          {crumb.page ? <button className="text-[#8b949e] hover:text-white font-bold transition-colors cursor-pointer">{crumb.label}</button> : <span className="text-white font-bold">{crumb.label}</span>}
        </span>
      ))}
    </div>
  );
}

function AppTopbar({ page, navigate, breadcrumb, onReplayTour }: { page: Page; navigate: (p: Page) => void; breadcrumb?: { label: string; parent: Page }; onReplayTour: () => void }) {
  const activeTab = NAV_ITEMS.find((n) => n.id === page)?.id ?? null;
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 flex items-center gap-3 md:gap-5 px-3 md:px-5" style={{ background: "rgba(7,12,26,0.65)", backdropFilter: "blur(40px) saturate(180%)", borderBottom: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.5)" }}>
      <button onClick={() => navigate("dashboard")} className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer min-h-[44px]">
        <img src={logoImg} alt="E-Tech Systems" className="h-8 md:h-10 object-contain" style={{ filter: "brightness(1.1)", marginTop: "-2px", marginBottom: "-2px" }} />
      </button>
      <div className="w-px h-4 flex-shrink-0 hidden md:block" style={{ background: "rgba(255,255,255,0.12)" }} />
      {breadcrumb ? (
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(breadcrumb.parent)} className="flex items-center gap-1.5 text-[#8b949e] hover:text-white text-[14px] font-bold transition-colors cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />{breadcrumb.label}</button>
          <ChevronRight className="w-3.5 h-3.5 text-[#484f58]" />
          <span className="text-white text-[14px] font-bold">Project Detail</span>
        </div>
      ) : (
        <nav className="flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} data-tour={`nav-${item.id}`} onClick={() => navigate(item.id)} className={clsx("h-8 px-2.5 md:px-3.5 rounded-xl text-[13px] md:text-[15px] font-bold transition-all duration-150 whitespace-nowrap cursor-pointer", activeTab === item.id ? "text-white" : "text-[#8b949e] hover:text-white")} style={activeTab === item.id ? { background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" } : undefined}>{item.label}</button>
          ))}
        </nav>
      )}
      <div className="flex-1" />
      <div className="flex items-center gap-1 md:gap-1.5">
        <div className="hidden md:block"><CurrencyToggle /></div>
        <NotificationBell />
        <UserMenu onReplayTour={onReplayTour} />
      </div>
    </header>
  );
}

function KanbanCard({ project, column, dragging, onDragStart, onDragEnd, onClick, onDelete, onMoveToProjects }: { project: Project; column: Column | ProjectColumn; dragging: string | null; onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void; onDragEnd: () => void; onClick: () => void; onDelete: (id: string) => void; onMoveToProjects?: (id: string) => void; }) {
  const { fmt } = useCurrency();
  const isDragging = dragging === project.id;
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ls = project.leadSource ? LEAD_SOURCE_STYLES[project.leadSource] : null;
  const isProjectPipeline = project.pipelineType === "project";
  const isOverdue = project.dueDate ? new Date(project.dueDate) < new Date() && !["win","lose","complete"].includes(project.stage) && project.projectStage !== "complete" : false;
  const isDueSoon = project.dueDate && !isOverdue ? (new Date(project.dueDate).getTime() - new Date().getTime()) < 7 * 24 * 60 * 60 * 1000 && !["win","lose","complete"].includes(project.stage) && project.projectStage !== "complete" : false;
  const [showNotes, setShowNotes] = useState(false);
  const allCollaborators = project.collaborators || [];
  const psBadge = isProjectPipeline ? projectStageBadge(project.projectStage || "planning") : null;

  return (
    <>
      {confirmDelete && <ConfirmDialog open={confirmDelete} title="Delete Project" message={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`} onConfirm={() => { onDelete(project.id); setConfirmDelete(false); toast.success("Project deleted"); }} onCancel={() => setConfirmDelete(false)} />}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} draggable onDragStart={(e) => { e.stopPropagation(); onDragStart(e as unknown as React.DragEvent<HTMLDivElement>, project.id); }} onDragEnd={onDragEnd} onClick={onClick} className={clsx("group relative rounded-2xl cursor-pointer select-none transition-all duration-200", isDragging ? "opacity-25 scale-[0.96]" : "md:hover:-translate-y-1")} style={{ background: "rgba(255,255,255,0.055)", backdropFilter: "blur(24px)", border: isDragging ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,255,255,0.11)", borderLeft: `3px solid ${isProjectPipeline ? (psBadge?.color || "#3b82f6") : column.color}`, boxShadow: isDragging ? "none" : "0 2px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.09)" }}>
        <div className="p-3 md:p-4 md:pl-5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {isOverdue && <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" title="Overdue" />}
              {isDueSoon && !isOverdue && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" title="Due soon" />}
              <h3 className="text-white text-[14px] md:text-[15px] font-bold leading-snug truncate">{project.name}</h3>
            </div>
            <div className="relative flex-shrink-0">
              <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center mt-0.5 cursor-pointer min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"><MoreHorizontal className="w-3.5 h-3.5 text-[#8b949e]" /></button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                  <div className="absolute right-0 top-7 z-20 w-40 rounded-xl overflow-hidden py-1" style={{ background: "rgba(7,12,26,0.97)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 32px rgba(0,0,0,0.8)", backdropFilter: "blur(20px)" }}>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-rose-400 text-[14px] font-bold hover:bg-rose-500/10 transition-colors text-left cursor-pointer min-h-[44px]"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mb-1"><Building2 className="w-3 h-3 text-[#8b949e] flex-shrink-0" /><span className="text-[#8b949e] text-[12px] md:text-[13px] font-bold truncate">{project.client}</span></div>
          <div className="flex items-center flex-wrap gap-1.5 mb-2">
            {isProjectPipeline ? (
              <>
                {psBadge && <span className={clsx("text-[12px] font-extrabold px-1.5 py-0.5 rounded-full", psBadge.cls)}>{psBadge.label}</span>}
                {project.supportType && <span className="text-[12px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>{SUPPORT_TYPE_LABELS[project.supportType]}</span>}
              </>
            ) : (
              <>
                {ls && <span className="text-[12px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: ls.bg, color: ls.text }}>{project.leadSource}</span>}
                <span className={clsx("text-[12px] md:text-[13px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wide", project.risk === "high" ? "bg-rose-500/20 text-rose-400" : project.risk === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400")}>{project.risk}</span>
              </>
            )}
          </div>
          {!isProjectPipeline && <div className="flex items-center gap-2 mb-2.5"><span className="text-white font-extrabold text-[16px] md:text-[17px] tracking-tight">{fmt(project.value, true)}</span></div>}
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center gap-1 text-[#8b949e] text-[14px] md:text-[15px] font-semibold"><Camera className="w-3 h-3" />{project.cameras} cams</span>
            <span className="flex items-center gap-1 text-[#8b949e] text-[14px] md:text-[15px] font-semibold"><Fingerprint className="w-3 h-3" />{project.devices} devices</span>
          </div>
          {project.notes && (
            <div className="relative mb-2">
              <button onClick={(e) => { e.stopPropagation(); setShowNotes(!showNotes); }} className="text-[13px] text-[#8b949e] hover:text-[#e6edf3] font-extrabold cursor-pointer flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notes</button>
              {showNotes && <div className="absolute top-full left-0 mt-1 w-48 rounded-xl p-2 z-30 text-[13px] text-[#8b949e]" style={{ background: "rgba(7,12,26,0.97)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>{project.notes}</div>}
            </div>
          )}
          <div className="flex items-center justify-between pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0" style={{ background: project.assignee.color, boxShadow: `0 0 8px ${project.assignee.color}60` }}>{project.assignee.initials}</div>
              <span className="text-[#8b949e] text-[14px] md:text-[15px] font-bold truncate max-w-[60px]">{project.assignee.name}</span>
              {allCollaborators.length > 0 && (
                <div className="flex items-center -space-x-1.5 ml-0.5">
                  {allCollaborators.slice(0, 3).map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white ring-1 ring-black/30" style={{ background: c.color }} title={c.name}>{c.initials}</div>
                  ))}
                  {allCollaborators.length > 3 && <span className="text-[#8b949e] text-[10px] ml-1">+{allCollaborators.length - 3}</span>}
                </div>
              )}
            </div>
            <span className={clsx("flex items-center gap-1 text-[14px] md:text-[15px] font-bold", isOverdue ? "text-rose-400" : isDueSoon ? "text-amber-400" : "text-[#484f58]")}><Calendar className="w-3 h-3" />{fmtDate(project.dueDate)}</span>
          </div>
          {project.stage === "win" && !isProjectPipeline && onMoveToProjects && (
            <button onClick={(e) => { e.stopPropagation(); onMoveToProjects(project.id); }} className="mt-2 w-full h-7 rounded-lg text-[12px] font-extrabold text-white cursor-pointer" style={{ background: "#8b5cf6" }}>Move to Projects</button>
          )}
        </div>
      </motion.div>
    </>
  );
}

function KanbanColumn({ column, projects, totalValue, dragging, isOver, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onCardClick, onDelete, onMoveToProjects }: { column: Column | ProjectColumn; projects: Project[]; totalValue: number; dragging: string | null; isOver: boolean; onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void; onDragEnd: () => void; onDragOver: (e: React.DragEvent<HTMLDivElement>) => void; onDragLeave: () => void; onDrop: () => void; onCardClick: (p: Project) => void; onDelete: (id: string) => void; onMoveToProjects?: (id: string) => void; }) {
  const { fmt } = useCurrency();
  const isProjectColumn = PROJECT_COLUMNS.some(c => c.id === column.id);
  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} className="w-[260px] md:w-[272px] flex-shrink-0 flex flex-col rounded-2xl transition-all duration-200" style={isOver ? { background: "rgba(59,130,246,0.08)", backdropFilter: "blur(24px)", border: "1px solid rgba(59,130,246,0.35)" } : { background: "rgba(255,255,255,0.032)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 2px 20px rgba(0,0,0,0.3)" }}>
      <div className="px-3.5 pt-3.5 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: column.color, boxShadow: `0 0 10px ${column.color}88` }} />
            <span className="text-white text-[13px] md:text-[14px] font-extrabold truncate leading-tight">{column.label}</span>
          </div>
          <span className="text-[#8b949e] text-[13px] md:text-[14px] px-1.5 py-0.5 rounded-full font-extrabold" style={{ background: "rgba(255,255,255,0.08)" }}>{projects.length}</span>
        </div>
        {!isProjectColumn && <p className="text-[#484f58] text-[14px] md:text-[15px] font-extrabold ml-4">{fmt(totalValue, true)}</p>}
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ scrollbarWidth: "none", scrollBehavior: "smooth", WebkitOverflowScrolling: "touch", minHeight: "120px", maxHeight: "calc(100vh - 250px)" }}>
        <AnimatePresence mode="popLayout">
          {projects.map((p) => (
            <KanbanCard key={p.id} project={p} column={column} dragging={dragging} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={() => onCardClick(p)} onDelete={onDelete} onMoveToProjects={onMoveToProjects} />
          ))}
        </AnimatePresence>
        {isOver && <div className="h-14 rounded-xl border-2 border-dashed border-blue-500/35 bg-blue-500/[0.04] flex items-center justify-center"><p className="text-blue-400/60 text-[14px] font-extrabold">Drop here</p></div>}
        {projects.length === 0 && !isOver && <div className="h-14 rounded-xl border border-dashed border-white/[0.04] flex items-center justify-center"><p className="text-[#484f58] text-[14px] font-semibold">No projects</p></div>}
      </div>
    </div>
  );
}
function Dashboard({ navigate }: { navigate: (p: Page) => void }) {
  const { fmt } = useCurrency();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Project | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [progressAnim, setProgressAnim] = useState<{ id: string; stage: string } | null>(null);
  const [pipelineType, setPipelineType] = useState<PipelineType>(() => (localStorage.getItem("pipeline_type") as PipelineType) || "sales");
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const scrollDragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null);
  const [scrollThumb, setScrollThumb] = useState({ widthPct: 100, leftPct: 0 });
  const [scrollThumbActive, setScrollThumbActive] = useState(false);

  useEffect(() => { localStorage.setItem("pipeline_type", pipelineType); }, [pipelineType]);

  const fetchProjects = useCallback(async () => { setLoading(true); try { const data = await API.projects.list(); setProjects(data); } catch { setProjects([]); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const salesProjects = projects.filter(p => !p.pipelineType || p.pipelineType === "sales");
  const projectProjects = projects.filter(p => p.pipelineType === "project");
  const currentProjects = pipelineType === "sales" ? salesProjects : projectProjects;

  const activeSales = salesProjects.filter((p) => !["win", "lose"].includes(p.stage));
  const pipeline = activeSales.reduce((s, p) => s + p.value, 0);
  const won = salesProjects.filter((p) => p.stage === "win");
  const closed = salesProjects.filter((p) => ["win", "lose"].includes(p.stage));
  const winRate = closed.length ? Math.round((won.length / closed.length) * 100) : 0;
  const negotiation = salesProjects.filter((p) => p.stage === "negotiation");
  const negoValue = negotiation.reduce((s, p) => s + p.value, 0);
  const avgDeal = activeSales.length ? Math.round(pipeline / activeSales.length) : 0;

  const activeProjects = projectProjects.filter(p => p.projectStage !== "complete").length;
  const inInstallation = projectProjects.filter(p => p.projectStage === "installation").length;
  const overdueProjects = projectProjects.filter(p => p.dueDate && new Date(p.dueDate) < new Date() && p.projectStage !== "complete").length;
  const ticketsResolved = projectProjects.filter(p => p.projectStage === "support" && p.stage === "win").length;

  const logAudit = async (projectId: string, event: string, details: string) => { try { await API.audit.log(projectId, event, details); } catch {} };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => { setDragging(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragEnd = () => { setDragging(null); setDragOverCol(null); };
  const handleDrop = async (colId: string) => {
    if (dragging) {
      const project = projects.find((p) => p.id === dragging);
      if (project) {
        const oldStage = pipelineType === "sales" ? project.stage : project.projectStage;
        if (oldStage !== colId && colId !== "lose") { setProgressAnim({ id: dragging, stage: colId }); setTimeout(() => setProgressAnim(null), 1500); }
        if (pipelineType === "sales") {
          const newStage = colId as Stage;
          const stageHistory = [...(project.stageHistory || []), { stage: newStage, date: new Date().toISOString().slice(0, 10) }];
          setProjects((prev) => prev.map((p) => p.id === dragging ? { ...p, stage: newStage, stageHistory } : p));
          try {
            await API.projects.update(dragging, { stage: newStage, stageHistory });
            await logAudit(dragging, "Stage Change", `Moved from ${oldStage} to ${newStage}`);
            if (newStage === "win") { API.notifications.salesWin({ projectId: dragging, projectName: project.name, clientName: project.client }).catch(() => {}); }
          } catch {}
        } else {
          const newStage = colId as ProjectStage;
          const stageHistory = [...(project.stageHistory || []), { stage: newStage, date: new Date().toISOString().slice(0, 10) }];
          setProjects((prev) => prev.map((p) => p.id === dragging ? { ...p, projectStage: newStage, stageHistory } : p));
          try { await API.projects.update(dragging, { projectStage: newStage, stageHistory }); await logAudit(dragging, "Project Stage Change", `Moved from ${oldStage} to ${newStage}`); } catch {}
        }
      }
    }
    setDragging(null); setDragOverCol(null);
  };

  const handleMoveToProjects = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const stageHistory = [...(project.stageHistory || []), { stage: "planning" as ProjectStage, date: new Date().toISOString().slice(0, 10) }];
    const updated: Project = { ...project, pipelineType: "project", projectStage: "planning", leadSource: undefined, stageHistory, updatedAt: new Date().toISOString() };
    setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
    try {
      await API.projects.update(projectId, { pipelineType: "project", projectStage: "planning", leadSource: undefined, stageHistory });
      await API.audit.log(projectId, "Moved to Projects", "Moved from Sales Win to Projects Planning");
      toast.success("Moved to Projects Pipeline");
    } catch { fetchProjects(); }
  };

  const handleDelete = async (id: string) => { setProjects((prev) => prev.filter((p) => p.id !== id)); try { await API.projects.delete(id); toast.success("Project deleted"); } catch { fetchProjects(); } };
  const handleUpdate = async (updated: Project) => { setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p)); setSelectedDeal(updated); try { await API.projects.update(updated.id, updated); toast.success("Updated"); } catch { fetchProjects(); } };

  const selectedColumn = selectedDeal ? [...COLUMNS, ...PROJECT_COLUMNS].find((c) => (pipelineType === "sales" ? c.id === selectedDeal.stage : c.id === selectedDeal.projectStage))! : null;
  const STAT_COLORS = ["#3b82f6", "#10b981", "#f97316", "#8b5cf6"];

  // Custom draggable scrollbar synced to the board's real horizontal scroll
  const updateScrollThumb = useCallback(() => {
    const el = boardScrollRef.current;
    if (!el) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    if (scrollWidth <= clientWidth) { setScrollThumb({ widthPct: 100, leftPct: 0 }); return; }
    const widthPct = Math.max((clientWidth / scrollWidth) * 100, 10);
    const maxLeftPct = 100 - widthPct;
    const leftPct = (scrollLeft / (scrollWidth - clientWidth)) * maxLeftPct;
    setScrollThumb({ widthPct, leftPct });
  }, []);
  useEffect(() => { updateScrollThumb(); }, [currentProjects.length, pipelineType, updateScrollThumb]);
  useEffect(() => {
    window.addEventListener("resize", updateScrollThumb);
    return () => window.removeEventListener("resize", updateScrollThumb);
  }, [updateScrollThumb]);
  const scrollToPct = (leftPct: number) => {
    const el = boardScrollRef.current;
    if (!el) return;
    const maxLeftPct = 100 - scrollThumb.widthPct;
    const clamped = Math.min(Math.max(leftPct, 0), maxLeftPct);
    el.scrollLeft = maxLeftPct > 0 ? (clamped / maxLeftPct) * (el.scrollWidth - el.clientWidth) : 0;
  };
  const handleThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const el = boardScrollRef.current;
    if (!el) return;
    scrollDragRef.current = { startX: e.clientX, startScrollLeft: el.scrollLeft };
    setScrollThumbActive(true);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const handleThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = scrollDragRef.current;
    const el = boardScrollRef.current;
    const track = scrollTrackRef.current;
    if (!drag || !el || !track) return;
    const trackWidth = track.clientWidth;
    const scrollableWidth = el.scrollWidth - el.clientWidth;
    const thumbWidthPx = (scrollThumb.widthPct / 100) * trackWidth;
    const draggableTrackPx = trackWidth - thumbWidthPx;
    if (draggableTrackPx <= 0) return;
    const deltaX = e.clientX - drag.startX;
    el.scrollLeft = drag.startScrollLeft + deltaX * (scrollableWidth / draggableTrackPx);
  };
  const handleThumbPointerUp = () => { scrollDragRef.current = null; setScrollThumbActive(false); };
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = scrollTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const clickPct = ((e.clientX - rect.left) / rect.width) * 100;
    scrollToPct(clickPct - scrollThumb.widthPct / 2);
  };

  if (loading) return (
    <div className="px-3 md:px-5 py-4 md:py-6 space-y-4">
      <Skeleton className="h-10 w-48" />
      <div className="flex gap-2 mb-4"><Skeleton className="h-8 w-32 rounded-full" /><Skeleton className="h-8 w-32 rounded-full" /></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      <div className="flex gap-2 md:gap-3 overflow-hidden">{[1,2,3,4,5,6,7].map(i => <Skeleton key={i} className="w-[272px] h-[400px] rounded-2xl flex-shrink-0" />)}</div>
    </div>
  );

  const columns = pipelineType === "sales" ? COLUMNS : PROJECT_COLUMNS;

  return (
    <div>
      {selectedDeal && selectedColumn && <DealModal project={selectedDeal} column={selectedColumn} onClose={() => setSelectedDeal(null)} navigate={navigate} onUpdate={handleUpdate} onDelete={handleDelete} pipelineType={pipelineType} />}
      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} onAdd={async (p) => { setProjects((prev) => [p, ...prev]); try { await API.projects.create(p); } catch { fetchProjects(); } }} pipelineType={pipelineType} />}
      {progressAnim && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[250] px-5 py-3 rounded-2xl flex items-center gap-3" style={{ background: "rgba(16,185,129,0.95)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(16,185,129,0.4)" }}>
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="text-white text-[15px] font-extrabold">Project advanced to {columns.find((c) => c.id === progressAnim.stage)?.label}</span>
        </motion.div>
      )}
      <div className="px-3 md:px-5 pt-4 md:pt-6 pb-4 md:pb-5 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-4 md:mb-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-white font-extrabold text-2xl md:text-3xl tracking-tight">{pipelineType === "sales" ? "Sales Pipeline" : "Project Pipeline"}</h1>
              <div className="flex items-center h-7 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
                <button onClick={() => setPipelineType("sales")} className={clsx("h-full px-3 text-[12px] font-extrabold cursor-pointer", pipelineType === "sales" ? "text-white" : "text-[#484f58]")} style={pipelineType === "sales" ? { background: "#3b82f6" } : undefined}>Sales</button>
                <button onClick={() => setPipelineType("project")} className={clsx("h-full px-3 text-[12px] font-extrabold cursor-pointer", pipelineType === "project" ? "text-white" : "text-[#484f58]")} style={pipelineType === "project" ? { background: "#8b5cf6" } : undefined}>Projects</button>
              </div>
            </div>
            <p className="text-[#8b949e] text-[13px] md:text-[15px] mt-0.5">{currentProjects.length} projects</p>
          </div>
          <button onClick={() => setShowNewProject(true)} className="flex items-center gap-1.5 h-8 px-3 md:px-4 rounded-xl text-white text-[13px] md:text-[14px] font-extrabold cursor-pointer min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}><Plus className="w-3.5 h-3.5" /> New Project</button>
        </div>
        {pipelineType === "sales" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {[{ label: "Active Pipeline", value: pipeline, icon: TrendingUp },{ label: "Win Rate", value: winRate, icon: Star, isPct: true },{ label: "In Negotiation", value: negoValue, icon: BarChart3 },{ label: "Avg Deal Size", value: avgDeal, icon: DollarSign }].map((stat, i) => (
              <div key={stat.label} className="rounded-2xl p-3 md:p-4" style={G.card}>
                <div className="flex items-center justify-between mb-2"><span className="text-[#8b949e] text-[12px] md:text-[14px] font-black uppercase tracking-[0.08em]">{stat.label}</span><div className="w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center" style={{ background: `${STAT_COLORS[i]}18` }}><stat.icon className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: STAT_COLORS[i] }} /></div></div>
                <p className="text-white text-[1.6rem] md:text-[2.2rem] font-black tracking-tight leading-none">{stat.isPct ? `${stat.value}%` : fmt(stat.value as number, true)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {[{ label: "Active Projects", value: activeProjects, icon: Activity },{ label: "In Installation", value: inInstallation, icon: Wrench },{ label: "Overdue", value: overdueProjects, icon: AlertTriangle },{ label: "Tickets Resolved", value: ticketsResolved, icon: CheckCircle2 }].map((stat, i) => (
              <div key={stat.label} className="rounded-2xl p-3 md:p-4" style={G.card}>
                <div className="flex items-center justify-between mb-2"><span className="text-[#8b949e] text-[12px] md:text-[14px] font-black uppercase tracking-[0.08em]">{stat.label}</span><div className="w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center" style={{ background: `${STAT_COLORS[i]}18` }}><stat.icon className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: STAT_COLORS[i] }} /></div></div>
                <p className="text-white text-[1.6rem] md:text-[2.2rem] font-black tracking-tight leading-none">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {currentProjects.length === 0 ? (
        <EmptyState icon={Layers} title="No projects yet" description={`Create your first ${pipelineType === "sales" ? "sales" : "project"} pipeline item.`} action={{ label: "New Project", onClick: () => setShowNewProject(true) }} />
      ) : (
        <div className="px-3 md:px-5 py-4 md:py-5">
          {scrollThumb.widthPct < 100 && (
            <div ref={scrollTrackRef} onPointerDown={handleTrackPointerDown} className="relative h-2.5 mb-3 rounded-full" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div
                onPointerDown={handleThumbPointerDown}
                onPointerMove={handleThumbPointerMove}
                onPointerUp={handleThumbPointerUp}
                onPointerCancel={handleThumbPointerUp}
                className={clsx("absolute top-0 bottom-0 rounded-full transition-colors", scrollThumbActive ? "cursor-grabbing" : "cursor-grab")}
                style={{
                  width: `${scrollThumb.widthPct}%`,
                  left: `${scrollThumb.leftPct}%`,
                  background: scrollThumbActive ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.22)",
                  backdropFilter: "blur(12px) saturate(180%)",
                  border: "1px solid rgba(255,255,255,0.30)",
                  boxShadow: scrollThumbActive ? "0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.35)" : "inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              />
            </div>
          )}
          <div ref={boardScrollRef} onScroll={updateScrollThumb} className="overflow-x-auto" style={{ scrollbarWidth: "none", scrollBehavior: scrollThumbActive ? "auto" : "smooth" }}>
            <div className="flex gap-2 md:gap-3 min-w-max pb-3">
              {columns.map((col) => {
                const colProjects = currentProjects.filter((p) => pipelineType === "sales" ? p.stage === col.id : p.projectStage === col.id);
                const totalValue = colProjects.reduce((s, p) => s + p.value, 0);
                return <KanbanColumn key={col.id} column={col} projects={colProjects} totalValue={totalValue} dragging={dragging} isOver={dragOverCol === col.id} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }} onDragLeave={() => setDragOverCol(null)} onDrop={() => handleDrop(col.id)} onCardClick={(p) => setSelectedDeal(p)} onDelete={handleDelete} onMoveToProjects={handleMoveToProjects} />;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewProjectModal({ onClose, onAdd, pipelineType }: { onClose: () => void; onAdd: (p: Project) => void; pipelineType: PipelineType }) {
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
      assignee: CURRENT_USER,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      summary: summary.trim() || undefined,
      notes: notes.trim() || undefined,
      leadSource: pipelineType === "sales" ? leadSource : undefined,
      collaborators: collaborators.length > 0 ? collaborators : undefined,
      stageHistory: [{ stage: pipelineType === "sales" ? stage : projectStage, date: new Date().toISOString().slice(0, 10) }],
      contact: contactName.trim() ? { name: contactName.trim(), title: contactTitle.trim(), email: contactEmail.trim(), phone: contactPhone.trim() } : undefined,
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
          <div><h2 className="text-white text-[1.2rem] md:text-[1.3rem] font-extrabold">New {pipelineType === "sales" ? "Sales" : "Project"} Project</h2><p className="text-[#8b949e] text-[14px] mt-0.5">Account Owner: {CURRENT_USER.name}</p></div>
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
                    {TEAM.filter(t => !collaborators.find(c => c.name === t.name)).map((t) => (<option key={t.name} value={t.name} style={{ background: "#0d1117", color: "#e6edf3" }}>{t.name}</option>))}
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
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "12px" }}>
              <p className="text-[#8b949e] text-[12px] font-extrabold uppercase tracking-widest mb-3">Contact (optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Name</label><input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Full name" className={inputCls} style={G.input} /></div>
                <div><label className={labelCls}>Title</label><input value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} placeholder="Job title" className={inputCls} style={G.input} /></div>
                <div><label className={labelCls}>Email</label><input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@company.com" className={inputCls} style={G.input} /></div>
                <div><label className={labelCls}>Phone</label><input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 (876) 555-0000" className={inputCls} style={G.input} /></div>
              </div>
            </div>
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

function getDeduplicatedTeam(project: Project): { name: string; initials: string; color: string; roles: string[] }[] {
  const members: { name: string; initials: string; color: string; roles: string[] }[] = [];
  members.push({ name: project.assignee.name, initials: project.assignee.initials, color: project.assignee.color, roles: ["Account Owner"] });
  if (project.collaborators) {
    for (const c of project.collaborators) {
      const existing = members.find(m => m.name === c.name);
      if (existing) existing.roles.push(c.role);
      else members.push({ name: c.name, initials: c.initials, color: c.color, roles: [c.role] });
    }
  }
  return members;
}

function TaskList({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newSubcontractorId, setNewSubcontractorId] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueTime, setNewDueTime] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchTasks = useCallback(async () => { setLoading(true); try { const data = await API.tasks.list(projectId); setTasks(data); } catch { setTasks([]); } finally { setLoading(false); } }, [projectId]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { API.subcontractors.list(projectId).then(setSubcontractors).catch(() => setSubcontractors([])); }, [projectId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "t" || e.key === "T") { if (!(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLSelectElement)) { setShowNew(prev => !prev); } } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const dueDate = newDueDate ? `${newDueDate}${newDueTime ? "T" + newDueTime : ""}` : undefined;
      const created = await API.tasks.create(projectId, { title: newTitle.trim(), description: newDescription.trim() || undefined, assignee: newAssignee || undefined, subcontractorId: newSubcontractorId || undefined, priority: newPriority, dueDate, status: "todo" });
      setTasks(prev => [created, ...prev]);
      setNewTitle(""); setNewDescription(""); setNewAssignee(""); setNewSubcontractorId(""); setNewPriority("medium"); setNewDueDate(""); setNewDueTime(""); setShowNew(false);
      toast.success("Task added");
    } catch { toast.error("Failed to create task"); }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => { setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t)); try { await API.tasks.update(projectId, taskId, { status }); } catch { fetchTasks(); } };

  const handleDelete = async (taskId: string) => { setTasks(prev => prev.filter(t => t.id !== taskId)); try { await API.tasks.delete(projectId, taskId); toast.success("Task deleted"); } catch { fetchTasks(); } setConfirmDelete(null); };

  const handleEditSave = async () => {
    if (!editingTask || !editingTask.title.trim()) return;
    setTasks(prev => prev.map(t => t.id === editingTask.id ? editingTask : t));
    try { await API.tasks.update(projectId, editingTask.id, editingTask); toast.success("Task updated"); } catch { fetchTasks(); }
    setEditingTask(null);
  };

  const filteredTasks = statusFilter === "all" ? tasks : tasks.filter(t => t.status === statusFilter);
  const priorityColors: Record<TaskPriority, string> = { low: "#94a3b8", medium: "#fbbf24", high: "#f87171" };

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <div className="space-y-3">
      {confirmDelete && <ConfirmDialog open={true} title="Delete Task" message="Are you sure you want to delete this task?" onConfirm={() => handleDelete(confirmDelete)} onCancel={() => setConfirmDelete(null)} />}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          {(["all","todo","in-progress","review","complete"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={clsx("h-7 px-2.5 rounded-lg text-[12px] font-bold cursor-pointer", statusFilter === s ? "text-white" : "text-[#484f58]")} style={statusFilter === s ? { background: "rgba(255,255,255,0.10)" } : G.btn}>{s === "all" ? "All" : s === "in-progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
        <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[12px] font-bold text-white cursor-pointer" style={{ background: "#3b82f6" }}><Plus className="w-3 h-3" /> Add Task <span className="text-[10px] text-blue-200 ml-1">(T)</span></button>
      </div>
      {showNew && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-xl p-3 space-y-2" style={G.card}>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task title..." className="w-full h-8 rounded-lg px-2.5 text-[13px] text-[#e6edf3] focus:outline-none" style={G.input} />
          <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full rounded-lg px-2.5 py-2 text-[13px] text-[#e6edf3] focus:outline-none resize-none" style={G.input} />
          <div className="flex gap-2 flex-wrap">
            <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} className="h-7 rounded-lg px-2 text-[12px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>
              <option value="">Assignee</option>
              {TEAM.map(t => <option key={t.name} value={t.name} style={{ background: "#0d1117", color: "#e6edf3" }}>● {t.name}</option>)}
            </select>
            <select value={newSubcontractorId} onChange={(e) => setNewSubcontractorId(e.target.value)} className="h-7 rounded-lg px-2 text-[12px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>
              <option value="">Subcontractor</option>
              {subcontractors.map(s => <option key={s.id} value={s.id} style={{ background: "#0d1117", color: "#e6edf3" }}>{s.name}{s.trade ? ` (${s.trade})` : ""}</option>)}
            </select>
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as TaskPriority)} className="h-7 rounded-lg px-2 text-[12px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>
              <option value="low" style={{ background: "#0d1117", color: "#94a3b8" }}>● Low</option>
              <option value="medium" style={{ background: "#0d1117", color: "#fbbf24" }}>● Medium</option>
              <option value="high" style={{ background: "#0d1117", color: "#f87171" }}>● High</option>
            </select>
            <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="h-7 rounded-lg px-2 text-[12px]" style={{ ...G.input, colorScheme: "dark", background: "#0d1117", color: "#e6edf3" }} />
            <input type="time" value={newDueTime} onChange={(e) => setNewDueTime(e.target.value)} className="h-7 rounded-lg px-2 text-[12px]" style={{ ...G.input, colorScheme: "dark", background: "#0d1117", color: "#e6edf3" }} />
            <button onClick={handleCreate} className="h-7 px-3 rounded-lg text-[12px] font-extrabold text-white cursor-pointer" style={{ background: "#10b981" }}>Save</button>
          </div>
        </motion.div>
      )}
      {editingTask && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-xl p-3 space-y-2" style={{ ...G.card, border: "1px solid rgba(59,130,246,0.35)" }}>
          <input value={editingTask.title} onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })} className="w-full h-8 rounded-lg px-2.5 text-[13px] text-[#e6edf3]" style={G.input} />
          <textarea value={editingTask.description || ""} onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })} rows={2} className="w-full rounded-lg px-2.5 py-2 text-[13px] text-[#e6edf3] resize-none" style={G.input} />
          <div className="flex gap-2 flex-wrap">
            <select value={editingTask.assignee || ""} onChange={(e) => setEditingTask({ ...editingTask, assignee: e.target.value })} className="h-7 rounded-lg px-2 text-[12px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>
              <option value="">Assignee</option>
              {TEAM.map(t => <option key={t.name} value={t.name} style={{ background: "#0d1117", color: "#e6edf3" }}>{t.name}</option>)}
            </select>
            <select value={editingTask.subcontractorId || ""} onChange={(e) => setEditingTask({ ...editingTask, subcontractorId: e.target.value || undefined })} className="h-7 rounded-lg px-2 text-[12px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>
              <option value="">Subcontractor</option>
              {subcontractors.map(s => <option key={s.id} value={s.id} style={{ background: "#0d1117", color: "#e6edf3" }}>{s.name}{s.trade ? ` (${s.trade})` : ""}</option>)}
            </select>
            <select value={editingTask.priority} onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })} className="h-7 rounded-lg px-2 text-[12px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
            <input type="date" value={editingTask.dueDate?.split("T")[0] || ""} onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })} className="h-7 rounded-lg px-2 text-[12px]" style={{ ...G.input, colorScheme: "dark", background: "#0d1117", color: "#e6edf3" }} />
            <button onClick={handleEditSave} className="h-7 px-3 rounded-lg text-[12px] font-extrabold text-white cursor-pointer" style={{ background: "#10b981" }}>Update</button>
            <button onClick={() => setEditingTask(null)} className="h-7 px-3 rounded-lg text-[12px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
          </div>
        </motion.div>
      )}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-6"><p className="text-[#8b949e] text-[13px]">{statusFilter === "all" ? "No tasks yet" : `No ${statusFilter} tasks`}</p></div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map(task => {
              const assignee = TEAM.find(t => t.name === task.assignee);
              const subcontractor = subcontractors.find(s => s.id === task.subcontractorId);
              return (
                <motion.div key={task.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} onClick={() => setEditingTask(task)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl group hover:bg-white/[0.03] cursor-pointer" style={G.subtle}>
                  <button onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, task.status === "complete" ? "todo" : task.status === "todo" ? "in-progress" : task.status === "in-progress" ? "review" : "complete"); }} className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer", task.status === "complete" ? "bg-emerald-500 border-emerald-500" : "border-[#484f58] hover:border-white/50")}>{task.status === "complete" && <CheckCircle2 className="w-3 h-3 text-white" />}</button>
                  <div className="flex-1 min-w-0">
                    <p className={clsx("text-[13px] font-bold", task.status === "complete" ? "text-[#484f58] line-through" : "text-white")}>{task.title}</p>
                    {task.description && <p className="text-[#8b949e] text-[12px] mt-0.5 truncate">{task.description}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {assignee && <span className="text-[#8b949e] text-[12px] flex items-center gap-1"><div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white" style={{ background: assignee.color }}>{assignee.initials}</div><span className="text-[#e6edf3]">{assignee.name}</span></span>}
                      {subcontractor && <span className="text-[12px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}><Users className="w-2.5 h-2.5" /> {subcontractor.name}</span>}
                      <span className="text-[12px] font-extrabold" style={{ color: priorityColors[task.priority] }}>{task.priority}</span>
                      {task.dueDate && <span className="text-[#8b949e] text-[12px]">{new Date(task.dueDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(task.id); }} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-rose-500/10 flex items-center justify-center cursor-pointer"><Trash2 className="w-3 h-3 text-rose-400" /></button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function DocumentList({ projectId }: { projectId: string }) {
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
      {documents.length === 0 ? <p className="text-[#8b949e] text-[13px]">No files uploaded yet</p> : documents.map(doc => (
        <div key={doc.id} className="flex items-center justify-between px-3 py-2 rounded-xl group hover:bg-white/[0.02]" style={G.subtle}>
          <div className="flex items-center gap-2 min-w-0">
            <Paperclip className="w-3.5 h-3.5 text-[#484f58] flex-shrink-0" />
            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-white text-[13px] font-bold truncate hover:text-blue-400">{doc.filename}</a>
            <span className="text-[#8b949e] text-[11px] flex-shrink-0">{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : ""}</span>
          </div>
          <button onClick={() => setConfirmDelete(doc.id)} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-rose-500/10 flex items-center justify-center cursor-pointer flex-shrink-0"><Trash2 className="w-3 h-3 text-rose-400" /></button>
        </div>
      ))}
    </div>
  );
}
function WorkbookSynthesisPreview({ projectId, onOpenWorkbook }: { projectId: string; onOpenWorkbook: () => void }) {
  const { fmt } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [overrides, setOverrides] = useState<SynthesisOverride[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([API.quotes.list(), API.workbook.getOverrides(projectId)])
      .then(([quotes, ov]) => { if (!alive) return; setQuote(quotes.find(q => q.projectId === projectId) || null); setOverrides(ov); })
      .catch(() => { if (alive) { setQuote(null); setOverrides([]); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [projectId]);

  if (loading) return <div className="space-y-2 py-2"><Skeleton className="h-10 w-full rounded-xl" /><Skeleton className="h-10 w-full rounded-xl" /><Skeleton className="h-20 w-full rounded-2xl" /></div>;

  if (!quote || quote.categories.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <FileText className="w-10 h-10 text-[#484f58]" />
        <p className="text-[#8b949e] text-[14px]">No workbook yet for this project</p>
        <button onClick={onOpenWorkbook} className="h-9 px-5 rounded-xl text-white text-[14px] font-extrabold cursor-pointer min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 20px rgba(59,130,246,0.4)" }}>Open Workbook <ExternalLink className="w-3 h-3 inline ml-1" /></button>
      </div>
    );
  }

  const exchangeRate = toNum(quote.exchangeRate, DEFAULT_EXCHANGE_RATE);
  const getSectionSubtotal = (sectionNumber: string): number => {
    const cat = quote.categories.find(c => String(c.sectionNumber) === sectionNumber);
    if (!cat) return 0;
    return cat.lineItems.filter(li => li.quantity > 0).reduce((s, li) => s + recalcLineItem(li, exchangeRate).sellTotal, 0);
  };
  const getDisplayValue = (sectionNumber: string): number => {
    const override = overrides.find(o => o.sectionNumber === sectionNumber && o.isOverridden);
    if (override && override.overrideValue !== null) return toNum(override.overrideValue);
    return getSectionSubtotal(sectionNumber);
  };
  const groupTotal = (group: "video" | "access" | "intercom") => SYNTHESIS_SECTIONS.filter(s => s.group === group).reduce((s, sec) => s + getDisplayValue(sec.section), 0);
  const groupTotals = [
    { label: "Video Surveillance", value: groupTotal("video") },
    { label: "Access Control", value: groupTotal("access") },
    { label: "Intercom", value: groupTotal("intercom") },
  ].filter(g => g.value > 0);
  const grandTotal = groupTotals.reduce((s, g) => s + g.value, 0);
  const tax = grandTotal * GCT_RATE;
  const totalWithTax = grandTotal + tax;

  return (
    <div className="space-y-3">
      {groupTotals.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={G.card}>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            {groupTotals.map(g => (
              <div key={g.label} className="flex items-center justify-between px-4 py-2.5"><span className="text-[#8b949e] text-[13px] font-bold">{g.label}</span><span className="text-white text-[14px] font-extrabold">{fmt(g.value)}</span></div>
            ))}
          </div>
        </div>
      )}
      <div className="rounded-2xl p-4" style={{ ...G.card, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.20)" }}>
        <div className="flex justify-between py-1"><span className="text-[#8b949e] text-[13px]">Grand Total</span><span className="text-white text-[15px] font-extrabold">{fmt(grandTotal)}</span></div>
        <div className="flex justify-between py-1"><span className="text-[#8b949e] text-[13px]">Tax (GCT 15%)</span><span className="text-[#8b949e] text-[13px] font-extrabold">{fmt(tax)}</span></div>
        <div className="flex justify-between py-2 mt-1" style={{ borderTop: "2px solid rgba(255,255,255,0.10)" }}><span className="text-white text-[14px] font-extrabold">Total with Tax</span><span className="text-[1.1rem] font-black" style={{ color: "#60a5fa" }}>{fmt(totalWithTax)}</span></div>
      </div>
      <button onClick={onOpenWorkbook} className="w-full h-9 rounded-xl text-white text-[14px] font-extrabold cursor-pointer flex items-center justify-center gap-2 min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 20px rgba(59,130,246,0.4)" }}>Open Full Workbook <ExternalLink className="w-3 h-3" /></button>
    </div>
  );
}

function DealModal({ project, column, onClose, navigate, onUpdate, onDelete, pipelineType }: { project: Project; column: Column | ProjectColumn; onClose: () => void; navigate: (p: Page) => void; onUpdate: (p: Project) => void; onDelete: (id: string) => void; pipelineType: PipelineType }) {
  const [activeTab, setActiveTab] = useState("info");
  const { fmt } = useCurrency();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editClient, setEditClient] = useState(project.client);
  const [editLocation, setEditLocation] = useState(project.location);
  const [editValue, setEditValue] = useState(String(project.value));
  const [editRisk, setEditRisk] = useState(project.risk);
  const [editDueDate, setEditDueDate] = useState(project.dueDate);
  const [editSummary, setEditSummary] = useState(project.summary || "");
  const [editNotes, setEditNotes] = useState(project.notes || "");
  const [editSupportType, setEditSupportType] = useState<SupportType>(project.supportType || "contract-support");
  const [saving, setSaving] = useState(false);
  const ls = project.leadSource ? LEAD_SOURCE_STYLES[project.leadSource] : null;
  const team = getDeduplicatedTeam(project);
  const isProjectPipeline = pipelineType === "project" || project.pipelineType === "project";
  const psBadge = isProjectPipeline ? projectStageBadge(project.projectStage || "planning") : null;

  const handleSave = async () => {
    setSaving(true);
    const updated: Project = { ...project, name: editName, client: editClient, location: editLocation, value: parseFloat(editValue) || project.value, risk: editRisk, dueDate: editDueDate, summary: editSummary, notes: editNotes, supportType: isProjectPipeline ? editSupportType : undefined, updatedAt: new Date().toISOString() };
    onUpdate(updated);
    setEditing(false);
    setSaving(false);
  };

  const copyProjectLink = () => {
    const url = `${window.location.origin}/project/${project.id}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied")).catch(() => toast.error("Failed to copy"));
  };

  const tabs = [
    { id: "info", label: "Info", icon: Building2 },
    { id: "tasks", label: "Tasks", icon: ListTodo },
    { id: "documents", label: "Files", icon: Paperclip },
    { id: "contact", label: "Contact", icon: Phone },
    { id: "notes", label: "Notes", icon: StickyNote },
    { id: "workbook", label: "Workbook", icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93, y: 20 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[620px] max-h-[85vh] overflow-y-auto rounded-3xl" style={{ background: "rgba(7,12,26,0.78)", backdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 32px 80px rgba(0,0,0,0.9)" }}>
        <div className="relative px-5 md:px-7 pt-5 md:pt-7 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                {isProjectPipeline && psBadge ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full" style={{ background: `${psBadge.color}22`, color: psBadge.color, border: `1px solid ${psBadge.color}44` }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: psBadge.color }} />{psBadge.label}</span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full" style={{ background: `${column.color}22`, color: column.color, border: `1px solid ${column.color}44` }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: column.color }} />{column.label}</span>
                    {ls && <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: ls.bg, color: ls.text }}>{project.leadSource}</span>}
                  </>
                )}
                {isProjectPipeline && project.supportType && <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>{SUPPORT_TYPE_LABELS[project.supportType]}</span>}
              </div>
              <h2 className="text-white text-[1.2rem] md:text-[1.3rem] font-extrabold leading-snug">{project.name}</h2>
              <p className="text-[#8b949e] text-[14px] md:text-[15px] font-bold mt-1 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 flex-shrink-0" />{project.client}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={copyProjectLink} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><Link2 className="w-3.5 h-3.5 text-[#8b949e]" /></button>
              <button onClick={() => setEditing(!editing)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><Pencil className="w-4 h-4 text-[#8b949e]" /></button>
              <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><X className="w-4 h-4 text-[#8b949e]" /></button>
            </div>
          </div>
          {editing && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" className="w-full h-8 rounded-xl px-2 text-[14px] text-[#e6edf3]" style={G.input} />
              <input value={editClient} onChange={(e) => setEditClient(e.target.value)} placeholder="Client" className="w-full h-8 rounded-xl px-2 text-[14px] text-[#e6edf3]" style={G.input} />
              <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Location" className="w-full h-8 rounded-xl px-2 text-[14px] text-[#e6edf3]" style={G.input} />
              {!isProjectPipeline && <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Value" className="w-full h-8 rounded-xl px-2 text-[14px] text-[#e6edf3]" style={G.input} />}
              <select value={editRisk} onChange={(e) => setEditRisk(e.target.value as "low"|"medium"|"high")} className="w-full h-8 rounded-xl px-2 text-[14px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>{["low","medium","high"].map((r) => <option key={r} value={r} style={{ background: "#0d1117", color: "#e6edf3" }}>{r}</option>)}</select>
              <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="w-full h-8 rounded-xl px-2 text-[14px]" style={{ ...G.input, colorScheme: "dark", background: "#0d1117", color: "#e6edf3" }} />
              {isProjectPipeline && <select value={editSupportType} onChange={(e) => setEditSupportType(e.target.value as SupportType)} className="w-full h-8 rounded-xl px-2 text-[14px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>{SUPPORT_TYPES.map(st => <option key={st.id} value={st.id} style={{ background: "#0d1117", color: "#e6edf3" }}>{st.label}</option>)}</select>}
            </div>
          )}
          {editing && (
            <div className="mt-3 flex gap-2">
              <button onClick={handleSave} disabled={saving} className="flex-1 h-9 rounded-xl text-white text-[15px] font-extrabold cursor-pointer" style={{ background: "#10b981" }}><Save className="w-3.5 h-3.5 inline mr-1" />{saving ? "Saving…" : "Save"}</button>
              <button onClick={() => setEditing(false)} className="flex-1 h-9 rounded-xl text-[#8b949e] text-[15px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 px-5 md:px-7 border-b overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.07)", scrollbarWidth: "none" }}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={clsx("flex items-center gap-1.5 h-9 px-3 text-[13px] font-bold border-b-2 -mb-px transition-all whitespace-nowrap cursor-pointer", activeTab === tab.id ? "border-blue-500 text-white" : "border-transparent text-[#8b949e]")}><tab.icon className="w-3 h-3" />{tab.label}</button>
          ))}
        </div>
        <div className="px-5 md:px-7 py-4">
          {activeTab === "info" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Value", value: isProjectPipeline ? "—" : fmt(project.value, true), color: "#3b82f6" },
                  { label: "Devices", value: String(project.devices), color: "#06b6d4" },
                  { label: "Cameras", value: String(project.cameras), color: "#8b5cf6" },
                  { label: "Due Date", value: fmtDateFull(project.dueDate), color: "#f59e0b" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl px-3 py-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-[12px] font-extrabold uppercase tracking-widest mb-1" style={{ color: "rgba(139,148,158,0.85)" }}>{s.label}</p>
                    <p className="text-[1.4rem] font-extrabold tracking-tight leading-none" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
              {project.summary && <div className="rounded-xl p-3" style={G.subtle}><p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-1">Scope</p><p className="text-[#8b949e] text-[13px]">{project.summary}</p></div>}
              <div className="space-y-2">
                {team.map((m) => (
                  <div key={m.name} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-extrabold text-white" style={{ background: m.color }}>{m.initials}</div>
                    <span className="text-white text-[14px] font-bold">{m.name}</span>
                    <span className="text-[#8b949e] text-[12px]">· {m.roles.join(", ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === "tasks" && <TaskList projectId={project.id} />}
          {activeTab === "documents" && <DocumentList projectId={project.id} />}
          {activeTab === "contact" && (
            <div className="space-y-2">
              {project.contact ? (
                <div className="space-y-2">
                  {project.contact.name && <div className="flex items-center gap-2 text-[#e6edf3] text-[14px]"><Users className="w-3.5 h-3.5 text-[#8b949e]" />{project.contact.name}{project.contact.title && <span className="text-[#8b949e]">· {project.contact.title}</span>}</div>}
                  {project.contact.email && <div className="flex items-center gap-2 text-[#e6edf3] text-[14px]"><Mail className="w-3.5 h-3.5 text-[#8b949e]" />{project.contact.email}</div>}
                  {project.contact.phone && <div className="flex items-center gap-2 text-[#e6edf3] text-[14px]"><Phone className="w-3.5 h-3.5 text-[#8b949e]" />{project.contact.phone}</div>}
                </div>
              ) : <p className="text-[#8b949e] text-[14px]">No contact info added yet.</p>}
            </div>
          )}
          {activeTab === "notes" && <div>{project.notes ? <p className="text-[#8b949e] text-[14px] whitespace-pre-wrap">{project.notes}</p> : <p className="text-[#8b949e] text-[14px]">No notes yet.</p>}</div>}
          {activeTab === "workbook" && (
            <WorkbookSynthesisPreview projectId={project.id} onOpenWorkbook={() => { navigate("workbook"); onClose(); }} />
          )}
        </div>
        <div className="px-5 md:px-7 pb-7 flex gap-2.5">
          <button onClick={() => { navigate("project-detail"); onClose(); }} className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-white text-[15px] font-extrabold cursor-pointer min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 20px rgba(59,130,246,0.4)" }}><ExternalLink className="w-3.5 h-3.5" />Open</button>
          <button onClick={() => { localStorage.setItem("pd_tab", "assets"); navigate("project-detail"); onClose(); }} className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-[#e6edf3] text-[15px] font-extrabold cursor-pointer min-h-[44px]" style={G.btn}><Package className="w-3.5 h-3.5 text-violet-400" />Assets</button>
          <button onClick={() => { onDelete(project.id); onClose(); }} className="h-10 px-3 rounded-xl text-rose-400 text-[15px] font-extrabold cursor-pointer min-h-[44px]" style={{ background: "rgba(244,63,94,0.10)", border: "1px solid rgba(244,63,94,0.20)" }}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </motion.div>
    </div>
  );
}

const ASSET_CATEGORY_ICONS: Record<AssetCategory, IconType> = {
  camera: Camera,
  "access-control": Fingerprint,
  "network-hardware": Server,
  "cable-wire": Cable,
  intercom: MessageSquare,
  other: Box,
};

function ProjectAssetSummary({ projectId }: { projectId: string }) {
  const [assets, setAssets] = useState<ProjectAsset[] | null>(null);

  useEffect(() => {
    let alive = true;
    API.projectAssets.list(projectId).then((data) => { if (alive) setAssets(data); }).catch(() => { if (alive) setAssets([]); });
    return () => { alive = false; };
  }, [projectId]);

  if (assets === null) return <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-4 h-4 text-[#484f58] animate-spin" /></div>;

  const groups = (Object.keys(ASSET_CATEGORY_LABELS) as AssetCategory[])
    .map((cat) => {
      const items = assets.filter((a) => a.category === cat);
      if (items.length === 0) return null;
      if (cat === "cable-wire") return { cat, count: items.reduce((s, a) => s + (a.cableSpec?.lengthFt || 0) * a.quantity, 0), suffix: "ft" };
      return { cat, count: items.reduce((s, a) => s + a.quantity, 0), suffix: "" };
    })
    .filter((g): g is { cat: AssetCategory; count: number; suffix: string } => g !== null);

  if (groups.length === 0) return <div className="w-full h-full flex flex-col items-center justify-center rounded-lg border border-dashed" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.09)" }}><Package className="w-5 h-5 text-[#484f58] mb-1.5" /><p className="text-[#8b949e] text-[12px] font-bold">No assets yet</p></div>;

  return (
    <div className="w-full h-full flex items-center justify-center px-3">
      <div className="grid grid-cols-3 gap-1.5 w-full">
        {groups.slice(0, 6).map((g) => {
          const Icon = ASSET_CATEGORY_ICONS[g.cat];
          return (
            <div key={g.cat} title={ASSET_CATEGORY_LABELS[g.cat]} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Icon className="w-3.5 h-3.5 text-[#8b949e] flex-shrink-0" />
              <span className="text-white text-[12px] font-bold">{g.count}{g.suffix}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SelectProjectModal({ onClose, onSelect, currentId, projects }: { onClose: () => void; onSelect: (id: string) => void; currentId: string; projects: Project[] }) {
  const [search, setSearch] = useState("");
  const filtered = search.trim() ? projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase())) : projects;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 14 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[500px] max-h-[80vh] overflow-y-auto rounded-3xl" style={{ background: "rgba(7,12,26,0.95)", backdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 32px 80px rgba(0,0,0,0.9)" }}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}><h2 className="text-white text-[1.2rem] font-extrabold">Select Project</h2><button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer min-w-[44px] min-h-[44px]" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><X className="w-4 h-4 text-[#8b949e]" /></button></div>
        <div className="px-4 py-3"><div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#484f58]" /><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects…" className="w-full h-9 rounded-xl pl-8 pr-3 text-[15px] text-[#e6edf3] focus:outline-none" style={G.input} /></div></div>
        <div className="max-h-[340px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {filtered.map((p) => (
            <button key={p.id} onClick={() => { onSelect(p.id); onClose(); }} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/[0.04] transition-colors text-left cursor-pointer min-h-[44px]" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: p.id === currentId ? "rgba(59,130,246,0.06)" : "transparent" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-extrabold text-white flex-shrink-0" style={{ background: p.assignee.color }}>{p.assignee.initials}</div>
              <div className="flex-1 min-w-0"><p className="text-white text-[15px] font-bold truncate">{p.name}</p><p className="text-[#8b949e] text-[13px] truncate">{p.client}</p></div>
              {p.id === currentId && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function ProjectsPage({ navigate }: { navigate: (p: Page) => void }) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<"all" | Stage | ProjectStage>("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => { setLoading(true); try { const data = await API.projects.list(); setProjects(data); } catch { setProjects([]); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(null);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try { await API.projects.delete(id); toast.success("Project deleted"); } catch { toast.error("Failed to delete project"); fetchProjects(); }
  };

  const filtered = useMemo(() => {
    let result = projects;
    if (filter !== "all") result = result.filter((p) => p.stage === filter || p.projectStage === filter);
    if (search.trim()) { const q = search.toLowerCase(); result = result.filter((p) => p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)); }
    return result;
  }, [projects, filter, search]);

  const stageFilters: { id: "all" | Stage | ProjectStage; label: string }[] = [
    { id: "all", label: "All" },
    { id: "lead", label: "Lead" },
    { id: "opportunity", label: "Opportunity" },
    { id: "proposal", label: "Proposal" },
    { id: "win", label: "Won" },
    { id: "planning", label: "Planning" },
    { id: "installation", label: "Installation" },
  ];

  const openProject = (projectId: string) => {
    localStorage.setItem("active_project_id", projectId);
    navigate("project-detail");
  };

  if (loading) return <div className="px-3 md:px-5 py-4 md:py-6 space-y-4"><Skeleton className="h-10 w-56" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div></div>;

  const deletingProject = confirmDeleteId ? projects.find((p) => p.id === confirmDeleteId) : null;

  return (
    <div className="px-3 md:px-5 py-4 md:py-6">
      <ConfirmDialog open={!!deletingProject} title="Delete Project" message={`Are you sure you want to delete "${deletingProject?.name}"? This action cannot be undone.`} onConfirm={() => handleDelete(confirmDeleteId!)} onCancel={() => setConfirmDeleteId(null)} />
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div><h1 className="text-white font-extrabold text-2xl md:text-3xl tracking-tight">Projects</h1></div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl p-0.5 gap-0.5" style={G.btn}>
            {(["grid","list"] as const).map((m) => (
              <button key={m} onClick={() => setViewMode(m)} className={clsx("w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer", viewMode === m ? "text-white" : "text-[#8b949e]")} style={viewMode === m ? { background: "rgba(255,255,255,0.12)" } : undefined}>{m === "grid" ? <Grid3x3 className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4 md:mb-5 flex-wrap">
            {stageFilters.map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)} className={clsx("h-7 px-3 rounded-full text-[13px] md:text-[14px] font-bold cursor-pointer", filter === f.id ? "text-white" : "text-[#8b949e]")} style={filter === f.id ? { background: "#3b82f6", boxShadow: "0 2px 12px rgba(59,130,246,0.3)" } : G.subtle}>{f.label}</button>
            ))}
            <div className="relative ml-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-7 rounded-xl pl-7 pr-3 text-[13px] md:text-[14px] text-[#e6edf3] focus:outline-none w-36 md:w-44" style={G.input} /></div>
            <span className="text-[#8b949e] text-[13px] md:text-[14px] ml-1">{filtered.length} projects</span>
          </div>
          {filtered.length === 0 ? <EmptyState icon={Layers} title="No projects found" description="" /> : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((project) => {
                  const isProjPipe = project.pipelineType === "project";
                  const badge = isProjPipe ? projectStageBadge(project.projectStage || "planning") : stageBadge(project.stage);
                  return (
                    <motion.div key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="group rounded-2xl overflow-hidden cursor-pointer transition-all md:hover:-translate-y-1" style={{ ...G.card }} onClick={() => openProject(project.id)}>
                      <div className="relative h-[100px] md:h-[112px] bg-[#070c1a]"><ProjectAssetSummary projectId={project.id} /><div className={clsx("absolute top-2 right-2 text-[12px] font-extrabold px-2 py-0.5 rounded-full", badge.cls)}>{badge.label}</div><button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(project.id); }} className="absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }} title="Delete project"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button></div>
                      <div className="p-3 md:p-4"><h3 className="text-white text-[14px] md:text-[15px] font-bold leading-snug mb-1 line-clamp-1">{project.name}</h3><p className="text-[#8b949e] text-[12px] md:text-[13px] font-semibold mb-2 flex items-center gap-1"><Building2 className="w-3 h-3" /> {project.client}</p><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex items-center gap-1 text-[#8b949e] text-[12px]"><Camera className="w-3 h-3" />{project.cameras}</span></div><div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white" style={{ background: project.assignee.color }}>{project.assignee.initials}</div></div></div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={G.card}>
              <div className="overflow-x-auto">
                <div className="grid gap-3 px-3 py-2.5" style={{ gridTemplateColumns: "2fr 1fr 80px 80px 100px 44px", minWidth: "640px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{["Project","Client","Cameras","Devices","Stage",""].map((h) => (<span key={h} className="text-[#8b949e] text-[12px] font-extrabold uppercase tracking-widest">{h}</span>))}</div>
                {filtered.map((project) => {
                  const isProjPipe = project.pipelineType === "project";
                  const badge = isProjPipe ? projectStageBadge(project.projectStage || "planning") : stageBadge(project.stage);
                  return (
                    <div key={project.id} className="group grid gap-3 px-3 py-3.5 items-center cursor-pointer hover:bg-white/[0.03]" style={{ gridTemplateColumns: "2fr 1fr 80px 80px 100px 44px", minWidth: "640px", borderBottom: "1px solid rgba(255,255,255,0.04)" }} onClick={() => openProject(project.id)}>
                      <div><p className="text-white text-[14px] font-bold truncate">{project.name}</p><p className="text-[#8b949e] text-[12px] truncate">{project.location}</p></div>
                      <p className="text-[#8b949e] text-[13px] truncate">{project.client}</p>
                      <p className="text-[#8b949e] text-[13px]">{project.cameras}</p>
                      <p className="text-[#8b949e] text-[13px]">{project.devices}</p>
                      <span className={clsx("text-[12px] font-extrabold px-2 py-0.5 rounded-full w-fit", badge.cls)}>{badge.label}</span>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(project.id); }} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg hover:bg-rose-500/10 flex items-center justify-center cursor-pointer transition-opacity" title="Delete project"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
    </div>
  );
}
function ProjectDetail({ navigate }: { navigate: (p: Page) => void }) {
  const { fmt } = useCurrency();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("pd_tab") || "overview");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [showNewCO, setShowNewCO] = useState(false);
  const [newCOTitle, setNewCOTitle] = useState("");
  const [newCODesc, setNewCODesc] = useState("");
  const [newCOCost, setNewCOCost] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [projectAssets, setProjectAssets] = useState<ProjectAsset[]>([]);
  const [installZones, setInstallZones] = useState<InstallZone[]>([]);

  useEffect(() => { localStorage.setItem("pd_tab", activeTab); }, [activeTab]);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.projects.list();
      const activeProjectId = localStorage.getItem("active_project_id");
      const proj = data.find(p => p.id === activeProjectId) || data[0];
      if (proj) {
        setProject(proj);
        const qData = await API.quotes.list();
        setQuotes(qData.filter((q: Quote) => q.projectId === proj.id));
      } else {
        setProject(null);
      }
    } catch { setProject(null); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchProject(); }, [fetchProject]);

  useEffect(() => {
    if (project) {
      API.audit.list(project.id).then(setAuditLog).catch(() => setAuditLog([]));
      API.changeOrders.list(project.id).then(setChangeOrders).catch(() => setChangeOrders([]));
      API.projectAssets.list(project.id).then(setProjectAssets).catch(() => setProjectAssets([]));
      API.install.zones().then(zones => setInstallZones(zones.filter(z => z.projectId === project.id))).catch(() => setInstallZones([]));
    }
  }, [project]);

  const handleCreateCO = async () => {
    if (!project || !newCOTitle.trim()) return;
    const co: Partial<ChangeOrder> = { projectId: project.id, title: newCOTitle.trim(), description: newCODesc.trim(), costImpact: parseFloat(newCOCost) || 0, status: "draft", createdBy: CURRENT_USER.name };
    try { const created = await API.changeOrders.create(project.id, co); setChangeOrders((prev) => [...prev, created]); setShowNewCO(false); setNewCOTitle(""); setNewCODesc(""); setNewCOCost(""); toast.success("Change order created"); } catch { toast.error("Failed to create change order"); }
  };

  const handleGenerateShareLink = async () => {
    if (!project) return;
    try { const result = await API.share.generate(project.id, "project-view"); setShareUrl(result.url); setShowShareModal(true); } catch { toast.error("Failed to generate link"); }
  };

  if (loading) return (<div className="px-3 md:px-5 py-4 md:py-6 space-y-4"><Skeleton className="h-8 w-64" /><div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div><Skeleton className="h-64 rounded-2xl" /></div>);
  if (!project) return <EmptyState icon={Building2} title="No project selected" description="Select a project from the Projects tab." />;

  const p = project!;
  const isProjPipe = p.pipelineType === "project";
  const badge = isProjPipe ? projectStageBadge(p.projectStage || "planning") : stageBadge(p.stage);
  const ls = p.leadSource ? LEAD_SOURCE_STYLES[p.leadSource] : null;
  const team = getDeduplicatedTeam(p);
  const tabs = ["overview","tasks","documents","quotes","assets","change-orders","audit-log","gantt","subcontractors","procurement","commissioning"];
  const tabLabels: Record<string, string> = { overview: "Overview", tasks: "Tasks", documents: "Files", quotes: "Quotes", assets: "Assets", "change-orders": "Change Orders", "audit-log": "Audit Log", gantt: "Timeline", subcontractors: "Subcontractors", procurement: "Procurement", commissioning: "Commissioning" };
  const stageHistory = p.stageHistory || [{ stage: p.stage, date: p.createdAt?.slice(0,10) || new Date().toISOString().slice(0,10) }];
  const liveCameraCount = projectAssets.filter(a => a.category === "camera").reduce((s, a) => s + a.quantity, 0);
  const liveDeviceCount = projectAssets.filter(a => a.category !== "cable-wire").reduce((s, a) => s + a.quantity, 0);
  const installDevices = installZones.flatMap(z => z.devices);
  const liveProgress = installDevices.length > 0 ? Math.round((installDevices.filter(d => d.status === "complete").length / installDevices.length) * 100) : 0;

  return (
    <div className="px-3 md:px-5 py-4 md:py-6 max-w-[1600px] mx-auto w-full">
      {showShareModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
          <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={e => e.stopPropagation()} className="relative z-10 w-full max-w-[440px] rounded-2xl p-6" style={G.liquidGlass}>
            <h3 className="text-white text-[16px] font-extrabold mb-2">Shareable Link</h3>
            <p className="text-[#8b949e] text-[13px] mb-4">Clients can view project progress without logging in.</p>
            <div className="flex items-center gap-2 mb-4"><input value={shareUrl} readOnly className="flex-1 h-9 rounded-xl px-3 text-[13px] text-white" style={G.input} /><button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Copied"); }} className="h-9 px-3 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}><Copy className="w-3.5 h-3.5" /></button></div>
            <button onClick={() => setShowShareModal(false)} className="w-full h-9 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Close</button>
          </motion.div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 md:mb-6 gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={clsx("text-[12px] font-extrabold px-2 py-0.5 rounded-full", badge.cls)}>{badge.label}</span>
            {!isProjPipe && ls && <span className="text-[12px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: ls.bg, color: ls.text }}>{p.leadSource}</span>}
            {!isProjPipe && <span className="text-rose-400 text-[12px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/12">{p.risk.toUpperCase()} RISK</span>}
            {isProjPipe && p.supportType && <span className="text-[12px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>{SUPPORT_TYPE_LABELS[p.supportType]}</span>}
          </div>
          <h1 className="text-white font-extrabold text-3xl md:text-4xl tracking-tight mb-1">{p.name}</h1>
          <p className="text-[#8b949e] text-[14px] md:text-[15px] flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {p.client} · <MapPin className="w-3.5 h-3.5 ml-1" /> {p.location}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {[{ label: "Assets", icon: Package, action: () => setActiveTab("assets") },{ label: "Install", icon: CheckSquare, action: () => navigate("install-tracker") }].map(({ label, icon: Icon, action }) => (
            <button key={label} onClick={action} className="flex items-center gap-1.5 h-9 px-3 md:px-4 rounded-xl text-white text-[13px] md:text-[14px] font-bold hover:bg-white/[0.10] cursor-pointer min-h-[44px]" style={G.btn}><Icon className="w-3.5 h-3.5" /> {label}</button>
          ))}
          <button onClick={handleGenerateShareLink} className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-white text-[13px] font-bold cursor-pointer" style={G.btn}><Share2 className="w-3.5 h-3.5" /> Share</button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 mb-4 md:mb-6">
        {[
          { label: "Contract Value", value: isProjPipe ? "—" : fmt(p.value, true), icon: DollarSign, color: "#3b82f6" },
          { label: "Cameras", value: String(liveCameraCount), icon: Camera, color: "#8b5cf6" },
          { label: "Devices", value: String(liveDeviceCount), icon: Fingerprint, color: "#06b6d4" },
          { label: "Due Date", value: fmtDate(p.dueDate), icon: Calendar, color: "#f59e0b" },
          { label: "Progress", value: `${liveProgress}%`, icon: Activity, color: "#10b981" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-3 md:p-4" style={G.card}>
            <div className="flex items-center justify-between mb-2 md:mb-3"><span className="text-[#8b949e] text-[11px] md:text-[12px] font-extrabold uppercase">{s.label}</span><div className="w-6 h-6 md:w-7 md:h-7 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}><s.icon className="w-3 h-3" style={{ color: s.color }} /></div></div>
            <p className="text-white text-2xl md:text-3xl font-extrabold">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-0.5 mb-4 md:mb-5 overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", scrollbarWidth: "none" }}>
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={clsx("h-10 px-3 md:px-4 text-[14px] md:text-[15px] font-bold border-b-2 transition-all -mb-px whitespace-nowrap cursor-pointer min-h-[44px]", activeTab === tab ? "border-blue-500 text-white" : "border-transparent text-[#8b949e]")}>{tabLabels[tab]}</button>
        ))}
      </div>
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-2xl p-4 md:p-5" style={G.card}><h3 className="text-white text-[15px] md:text-[16px] font-extrabold mb-3">Project Scope</h3><p className="text-[#8b949e] text-[14px] leading-relaxed">{p.summary ?? "No scope defined yet."}</p></div>
            <div className="rounded-2xl p-4 md:p-5" style={G.card}><h3 className="text-white text-[15px] md:text-[16px] font-extrabold mb-4">Team</h3><div className="space-y-3">{team.map((m) => (<div key={m.name} className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl flex items-center justify-center text-[13px] font-extrabold text-white" style={{ background: m.color }}>{m.initials}</div><div><p className="text-white text-[14px] font-bold">{m.name}</p><p className="text-[#8b949e] text-[12px]">{m.roles.join(", ")}</p></div></div>))}</div></div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl p-4 md:p-5" style={G.card}>
              <h3 className="text-white text-[15px] md:text-[16px] font-extrabold mb-4">Timeline</h3>
              <div className="space-y-2">
                {stageHistory.map((entry, i) => {
                  const isLast = i === stageHistory.length - 1;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className={clsx("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", isLast ? "bg-blue-500/20 ring-2 ring-blue-500/40" : "bg-emerald-500/20")}>{isLast ? <Clock className="w-3 h-3 text-blue-400" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400" />}</div>
                      <div className="flex-1 flex items-center justify-between"><span className={clsx("text-[13px] font-bold", isLast ? "text-white" : "text-[#8b949e]")}>{typeof entry.stage === "string" ? entry.stage.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : entry.stage}</span><span className="text-[#8b949e] text-[12px]">{fmtDateFull(entry.date)}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === "tasks" && <TaskList projectId={p.id} />}
      {activeTab === "documents" && <DocumentList projectId={p.id} />}
      {activeTab === "quotes" && (quotes.length === 0 ? <EmptyState icon={DollarSign} title="No workbook yet" description="" /> : <div className="space-y-3">{quotes.map((q) => (<div key={q.id} className="flex items-center justify-between rounded-2xl p-4" style={G.card}><div className="flex items-center gap-4"><DollarSign className="w-4 h-4 text-blue-400" /><div><p className="text-white text-[15px] font-bold">{q.refNumber}</p><p className="text-[#8b949e] text-[13px]">{q.date} · {q.status}</p></div></div><button onClick={() => navigate("workbook")} className="h-8 px-3 rounded-xl text-[#8b949e] text-[14px] font-bold hover:text-white cursor-pointer" style={G.btn}>Open</button></div>))}</div>)}
      {activeTab === "change-orders" && (
        <div>
          <div className="flex items-center justify-between mb-3"><p className="text-[#8b949e] text-[13px]">{changeOrders.length} change orders</p><button onClick={() => setShowNewCO(true)} className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}><Plus className="w-3 h-3" /> New Change Order</button></div>
          {showNewCO && (
            <div className="rounded-2xl p-4 mb-3" style={G.card}>
              <div className="space-y-2">
                <input value={newCOTitle} onChange={(e) => setNewCOTitle(e.target.value)} placeholder="Title" className="w-full h-9 rounded-xl px-3 text-[14px] text-[#e6edf3] focus:outline-none" style={G.input} />
                <textarea value={newCODesc} onChange={(e) => setNewCODesc(e.target.value)} placeholder="Description" rows={2} className="w-full rounded-xl px-3 py-2 text-[14px] text-[#e6edf3] focus:outline-none resize-none" style={G.input} />
                <input type="number" value={newCOCost} onChange={(e) => setNewCOCost(e.target.value)} placeholder="Cost Impact" className="w-full h-9 rounded-xl px-3 text-[14px] text-[#e6edf3] focus:outline-none" style={G.input} />
                <div className="flex gap-2"><button onClick={handleCreateCO} className="flex-1 h-9 rounded-xl text-white text-[14px] font-extrabold cursor-pointer" style={{ background: "#10b981" }}>Create</button><button onClick={() => setShowNewCO(false)} className="flex-1 h-9 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button></div>
              </div>
            </div>
          )}
          {changeOrders.length === 0 && !showNewCO ? <EmptyState icon={AlertTriangle} title="No change orders" description="Create one to track scope changes." /> : (
            <div className="space-y-2">{changeOrders.map((co) => (<div key={co.id} className="rounded-2xl p-4" style={G.card}><div className="flex items-center justify-between"><div><p className="text-white text-[15px] font-bold">{co.title}</p>{co.description && <p className="text-[#8b949e] text-[13px] mt-0.5">{co.description}</p>}</div><span className={clsx("text-[12px] font-extrabold px-2 py-0.5 rounded-full", co.status === "approved" ? "bg-emerald-500/12 text-emerald-400" : co.status === "submitted" ? "bg-blue-500/12 text-blue-400" : co.status === "rejected" ? "bg-rose-500/12 text-rose-400" : "bg-amber-500/12 text-amber-400")}>{co.status}</span></div><div className="flex items-center justify-between mt-2"><span className="text-[#8b949e] text-[12px]">{co.createdBy} · {fmtDateFull(co.createdAt)}</span>{co.costImpact !== 0 && <span className="text-white text-[14px] font-extrabold">{fmt(co.costImpact)}</span>}</div></div>))}</div>
          )}
        </div>
      )}
      {activeTab === "audit-log" && (
        <div>
          {auditLog.length === 0 ? <EmptyState icon={History} title="No audit entries" description="Activity will appear here automatically." /> : (
            <div className="space-y-1">{auditLog.map((entry) => (<div key={entry.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.02]" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}><div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0" style={{ background: TEAM.find(t => t.name === entry.user)?.color || "#3b82f6" }}>{(TEAM.find(t => t.name === entry.user)?.initials || "??")}</div><div className="flex-1 min-w-0"><p className="text-white text-[13px] font-bold">{entry.event}</p><p className="text-[#8b949e] text-[12px]">{entry.details}</p></div><span className="text-[#8b949e] text-[12px] flex-shrink-0">{new Date(entry.timestamp).toLocaleString()}</span></div>))}</div>
          )}
        </div>
      )}
      {activeTab === "assets" && <ProjectAssetsTab projectId={p.id} projectName={p.name} clientName={p.client} />}
      {activeTab === "gantt" && <GanttView projectId={p.id} />}
      {activeTab === "subcontractors" && <SubcontractorTab projectId={p.id} />}
      {activeTab === "procurement" && <ProcurementTab projectId={p.id} />}
      {activeTab === "commissioning" && <CommissioningTab projectId={p.id} />}
    </div>
  );
}

function GanttView({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { API.tasks.list(projectId).then(setTasks).catch(() => setTasks([])).finally(() => setLoading(false)); }, [projectId]);
  if (loading) return <Skeleton className="h-64 rounded-2xl" />;
  if (tasks.length === 0) return <EmptyState icon={GanttChartSquare} title="No tasks" description="Add tasks to see the timeline." />;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const today = new Date();
  const startDate = new Date(Math.min(...tasks.map(t => new Date(t.createdAt).getTime()), today.getTime() - 30*24*60*60*1000));
  const endDate = new Date(Math.max(...tasks.map(t => t.dueDate ? new Date(t.dueDate).getTime() : 0), today.getTime() + 60*24*60*60*1000));
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000*60*60*24));
  const getX = (dateStr: string) => { const d = new Date(dateStr); return ((d.getTime() - startDate.getTime()) / (1000*60*60*24) / totalDays) * 100; };
  return (
    <div className="rounded-2xl p-4 overflow-x-auto" style={G.card}>
      <div style={{ minWidth: "700px" }}>
        <div className="flex items-center mb-3"><GanttChartSquare className="w-4 h-4 text-blue-400 mr-2" /><span className="text-white text-[15px] font-extrabold">Project Timeline</span></div>
        <div className="flex" style={{ marginLeft: "200px" }}>{Array.from({ length: Math.ceil(totalDays/30) }).map((_, i) => { const d = new Date(startDate); d.setDate(d.getDate() + i*30); return <div key={i} className="text-[#8b949e] text-[11px] font-extrabold flex-1 text-center border-l border-white/5">{months[d.getMonth()]}</div>; })}</div>
        <div className="mt-3 space-y-2">{tasks.map(task => { const startPct = getX(task.createdAt); const duePct = task.dueDate ? getX(task.dueDate) : startPct + 15; const width = Math.max(duePct - startPct, 5); return (<div key={task.id} className="flex items-center gap-2"><div className="w-[200px] flex-shrink-0 text-white text-[13px] font-bold truncate">{task.title}</div><div className="flex-1 relative h-7"><div className="absolute rounded-full h-5 top-1" style={{ left: `${startPct}%`, width: `${width}%`, background: task.status === "complete" ? "rgba(16,185,129,0.4)" : task.status === "in-progress" ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.15)", border: `1px solid ${task.status === "complete" ? "rgba(16,185,129,0.6)" : task.status === "in-progress" ? "rgba(59,130,246,0.6)" : "rgba(255,255,255,0.2)"}` }}><span className="absolute inset-0 flex items-center px-2 text-[10px] font-extrabold text-white truncate">{task.assignee || ""}</span></div></div></div>); })}</div>
      </div>
    </div>
  );
}
function SubcontractorTab({ projectId }: { projectId: string }) {
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
      await API.subcontractors.addDoc(subId, { filename: file.name, fileUrl: result.fileUrl, uploadedBy: CURRENT_USER.name });
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
              <button onClick={() => handleShare(sub)} disabled={sharingSub === sub.id} className={clsx("flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[12px] font-extrabold cursor-pointer", sub.shareToken ? "text-blue-400" : "text-[#8b949e] hover:text-white")} style={G.btn}>{sharingSub === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}{sub.shareToken ? "Link" : "Share"}</button>
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
              {sub.documents.length === 0 ? <p className="text-[#8b949e] text-[12px]">No documents</p> : sub.documents.map(doc => (<div key={doc.id} className="flex items-center gap-2"><Paperclip className="w-3 h-3 text-[#8b949e]" /><a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-white text-[12px] font-bold hover:text-blue-400">{doc.filename}</a></div>))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProcurementTab({ projectId }: { projectId: string }) {
  const [pos, setPos] = useState<ProcurementOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [supplierName, setSupplierName] = useState("");

  useEffect(() => { API.procurement.list(projectId).then(setPos).catch(() => setPos([])).finally(() => setLoading(false)); }, [projectId]);

  const handleGeneratePO = async () => {
    try {
      const quotes = await API.quotes.list();
      const q = quotes.find(q => q.projectId === projectId);
      const hardwareCategories = ["Video Security Equipment", "Access Control Equipment", "Compute & Storage", "Networking", "Hardware", "Infrastructure", "Intercom System Software"];
      const items = q?.categories
        .filter(c => hardwareCategories.includes(c.name))
        .flatMap(c => c.lineItems.filter(li => li.quantity > 0).map(li => ({ description: li.description, quantity: li.quantity, unitCost: li.unitCost }))) || [];
      const po = await API.procurement.createPO(projectId, { supplierName: supplierName.trim() || null, generatedFrom: "BOM", items });
      setPos(prev => [po, ...prev]);
      setShowGenerate(false);
      setSupplierName("");
      toast.success(`PO generated with ${items.length} items`);
    } catch { toast.error("Failed to generate PO"); }
  };

  const toggleReceived = async (itemId: string, received: boolean) => {
    API.procurement.updateItem(itemId, { received }).then(() => setPos(prev => prev.map(po => ({ ...po, items: po.items.map(i => i.id === itemId ? { ...i, received } : i) })))).catch(() => {});
  };

  if (loading) return <Skeleton className="h-48 rounded-2xl" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><p className="text-[#8b949e] text-[13px]">{pos.length} purchase orders</p><button onClick={() => setShowGenerate(!showGenerate)} className="flex items-center gap-1 h-8 px-3 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}><FileText className="w-3 h-3" /> Generate PO from BOM</button></div>
      {showGenerate && (
        <div className="rounded-xl p-3 space-y-2" style={G.card}>
          <input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Supplier name (optional)" className="w-full h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} />
          <button onClick={handleGeneratePO} className="w-full h-8 rounded-lg text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#10b981" }}>Generate</button>
        </div>
      )}
      {pos.length === 0 && !showGenerate ? <EmptyState icon={Truck} title="No purchase orders" description="Generate a PO from the workbook BOM." /> : pos.map((po) => (
        <div key={po.id} className="rounded-xl p-3" style={G.card}>
          <div className="flex items-center justify-between mb-2"><p className="text-white text-[14px] font-bold">PO #{po.id.slice(0,8)}</p><span className="text-[12px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/12 text-amber-400">{po.status}</span></div>
          {po.supplierName && <p className="text-[#8b949e] text-[12px]">Supplier: {po.supplierName}</p>}
          <p className="text-[#8b949e] text-[12px]">Total: ${toNum(po.totalCost).toFixed(2)}</p>
          <div className="mt-2 space-y-1">{po.items.map(item => (
            <div key={item.id} className="flex items-center gap-2">
              <button onClick={() => toggleReceived(item.id, !item.received)} className={clsx("w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0", item.received ? "bg-emerald-500 border-emerald-500" : "border-[#484f58]")}>{item.received && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}</button>
              <span className={clsx("text-[12px] flex-1", item.received ? "text-[#8b949e] line-through" : "text-white")}>{item.description} × {item.quantity}</span>
            </div>
          ))}</div>
        </div>
      ))}
    </div>
  );
}

function CommissioningTab({ projectId }: { projectId: string }) {
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
    API.commissioning.update(projectId, deviceId, { status }).then(() => setChecklist(prev => prev.map(x => x.deviceId === deviceId ? { ...x, status } : x))).catch(() => {});
    if (status === "fail") {
      API.tasks.create(projectId, { title: `${checklist.find(x => x.deviceId === deviceId)?.deviceName || "Device"} failed commissioning`, priority: "high", status: "todo" }).catch(() => {});
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
      const data = await API.commissioning.generateReport(projectId);
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 18;
      const ensureRoom = (needed: number) => { if (y + needed > pageHeight - 16) { doc.addPage(); y = 18; } };

      doc.setFontSize(18); doc.text("Commissioning Handover Report", 14, y); y += 8;
      if (data.project) { doc.setFontSize(11); doc.text(`${data.project.name} — ${data.project.client}`, 14, y); y += 6; }
      doc.setFontSize(9); doc.setTextColor(120); doc.text(`Generated ${new Date(data.generatedAt).toLocaleDateString()}`, 14, y); doc.setTextColor(0); y += 8;

      doc.setFontSize(10);
      doc.text(`${data.summary.total} devices — ${data.summary.passed} passed, ${data.summary.failed} failed, ${data.summary.pending} pending`, 14, y); y += 8;

      doc.setFontSize(9);
      data.devices.forEach(d => {
        ensureRoom(6);
        doc.text(d.deviceName, 14, y);
        doc.text(d.location || "—", 100, y);
        doc.text(d.status.toUpperCase(), 196, y, { align: "right" });
        y += 5;
        if (d.notes) { ensureRoom(5); doc.setFontSize(8); doc.setTextColor(120); doc.text(d.notes, 16, y); doc.setTextColor(0); doc.setFontSize(9); y += 5; }
      });

      doc.save(`${(data.project?.name || "project").replace(/\s+/g, "-")}-commissioning-report.pdf`);
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
      {checklist.length === 0 && !showAdd ? <EmptyState icon={ClipboardCheck} title="No commissioning data" description="Sync from Install Tracker or add devices manually." action={{ label: "Sync Devices", onClick: async () => { await API.commissioning.sync(projectId); const data = await API.commissioning.list(projectId); setChecklist(data); toast.success("Synced"); } }} /> : checklist.map((item) => (
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
          {item.photos && item.photos.length > 0 && <div className="flex gap-2 mt-2 flex-wrap">{item.photos.map((p, i) => <img key={i} src={p} alt="" className="w-16 h-16 rounded-lg object-cover" style={{ border: "1px solid rgba(255,255,255,0.10)" }} />)}</div>}
        </div>
      ))}
    </div>
  );
}

const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = { camera: "Camera", "access-control": "Access Control", "network-hardware": "Network Hardware", "cable-wire": "Cable / Wire", intercom: "Intercom", other: "Other" };
const CATALOG_CATEGORIES_FOR_ASSET: Record<AssetCategory, CatalogDevice["category"][]> = {
  camera: ["camera"],
  "access-control": ["access-control"],
  "network-hardware": ["switch", "poe-injector", "patch-panel", "rack", "ups", "nvr"],
  "cable-wire": [],
  intercom: ["intercom"],
  other: ["camera", "access-control", "nvr", "analytics", "intercom", "other", "switch", "poe-injector", "patch-panel", "rack", "ups"],
};
const INSTALL_DEVICE_TYPE_FOR_ASSET: Record<AssetCategory, InstallDevice["type"] | null> = { camera: "camera", "access-control": "access", "network-hardware": "server", "cable-wire": null, intercom: "intercom", other: "panel" };
const DEFAULT_SYSTEM_FOR_ASSET: Record<AssetCategory, SystemType> = { camera: "VSS", "access-control": "EAC", "network-hardware": "VSS", "cable-wire": "VSS", intercom: "Intercom", other: "VSS" };

function ProjectAssetsTab({ projectId, projectName, clientName }: { projectId: string; projectName: string; clientName: string }) {
  const { fmt } = useCurrency();
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [storeDevices, setStoreDevices] = useState<CatalogDevice[]>([]);
  const [zones, setZones] = useState<InstallZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | "all">("all");
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);

  const [category, setCategory] = useState<AssetCategory>("camera");
  const [system, setSystem] = useState<SystemType>("VSS");
  const [deviceStoreRef, setDeviceStoreRef] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [location, setLocation] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [cableType, setCableType] = useState<CableSpec["cableType"]>("CAT-6");
  const [lengthFt, setLengthFt] = useState("");
  const [runDescription, setRunDescription] = useState("");
  const [costPerFt, setCostPerFt] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const resetForm = () => { setCategory("camera"); setSystem("VSS"); setDeviceStoreRef(""); setQuantity("1"); setLocation(""); setZoneId(""); setPurpose(""); setNotes(""); setCableType("CAT-6"); setLengthFt(""); setRunDescription(""); setCostPerFt(""); setUnitPrice(""); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [assetData, deviceData, zoneData] = await Promise.all([API.projectAssets.list(projectId), API.devices.list(), API.install.zones()]);
      setAssets(assetData);
      setStoreDevices(deviceData);
      setZones(zoneData.filter(z => z.projectId === projectId));
    } catch { setAssets([]); } finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAddForm = () => { resetForm(); setEditingAssetId(null); setShowForm(true); };

  const openEditForm = (asset: ProjectAsset) => {
    setEditingAssetId(asset.id);
    setCategory(asset.category);
    setSystem(asset.system);
    setDeviceStoreRef(asset.deviceStoreRef || "");
    setQuantity(String(asset.quantity));
    setLocation(asset.location);
    setZoneId(asset.zoneId || "");
    setPurpose(asset.purpose);
    setNotes(asset.notes || "");
    if (asset.category === "cable-wire" && asset.cableSpec) {
      setCableType(asset.cableSpec.cableType);
      setLengthFt(asset.cableSpec.lengthFt !== undefined ? String(asset.cableSpec.lengthFt) : "");
      setRunDescription(asset.cableSpec.runDescription || "");
      setCostPerFt(asset.cableSpec.costPerFt !== undefined ? String(asset.cableSpec.costPerFt) : "");
      setUnitPrice("");
    } else {
      setCableType("CAT-6"); setLengthFt(""); setRunDescription(""); setCostPerFt("");
      setUnitPrice(String(assetUnitCost(asset, storeDevices) || ""));
    }
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingAssetId(null); resetForm(); };

  const handleSave = async () => {
    const qty = parseInt(quantity) || 1;
    const cableSpec: CableSpec | undefined = category === "cable-wire" ? { cableType, lengthFt: parseFloat(lengthFt) || undefined, runDescription: runDescription.trim() || undefined, costPerFt: parseFloat(costPerFt) || undefined } : undefined;
    const payload = { category, system, deviceStoreRef: deviceStoreRef || undefined, cableSpec, unitCost: category === "cable-wire" ? undefined : (parseFloat(unitPrice) || 0), quantity: qty, location: location.trim(), zoneId: zoneId || undefined, purpose: purpose.trim(), notes: notes.trim() || undefined };
    setSaving(true);
    try {
      let result: ProjectAsset;
      if (editingAssetId) {
        result = await API.projectAssets.update(projectId, editingAssetId, payload);
        setAssets(prev => prev.map(a => a.id === result.id ? result : a));
        toast.success("Asset updated");
      } else {
        result = await API.projectAssets.create(projectId, payload);
        setAssets(prev => [...prev, result]);
        const installType = INSTALL_DEVICE_TYPE_FOR_ASSET[category];
        if (zoneId && installType) {
          API.install.addDevice(zoneId, { name: describeAsset(result, storeDevices), type: installType, location: location.trim(), status: "pending" }).catch(() => {});
        }
        toast.success("Asset added");
      }
      upsertAssetLineItem(projectId, result, storeDevices).catch(() => {});
      closeForm();
    } catch { toast.error(editingAssetId ? "Failed to update asset" : "Failed to add asset"); } finally { setSaving(false); }
  };

  const handleDelete = async (asset: ProjectAsset) => {
    try {
      await API.projectAssets.delete(projectId, asset.id);
      setAssets(prev => prev.filter(a => a.id !== asset.id));
      removeAssetLineItem(projectId, asset.id).catch(() => {});
      toast.success("Asset removed");
    } catch { toast.error("Failed to remove asset"); }
  };

  const handlePriceUpdate = async (asset: ProjectAsset, newPrice: number) => {
    try {
      let updated: ProjectAsset;
      if (asset.category === "cable-wire" && asset.cableSpec) {
        const cableSpec = { ...asset.cableSpec, costPerFt: newPrice };
        updated = await API.projectAssets.update(projectId, asset.id, { cableSpec });
      } else {
        updated = await API.projectAssets.update(projectId, asset.id, { unitCost: newPrice });
      }
      setAssets(prev => prev.map(a => a.id === asset.id ? updated : a));
      upsertAssetLineItem(projectId, updated, storeDevices).catch(() => {});
      toast.success("Price updated");
    } catch { toast.error("Failed to update price"); }
  };

  const handlePhotoUpload = async (asset: ProjectAsset, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(asset.id);
    try {
      const result = await API.documents.upload(projectId, file);
      const photos = [...(asset.coveragePhotos || []), result.fileUrl];
      const updated = await API.projectAssets.update(projectId, asset.id, { coveragePhotos: photos });
      setAssets(prev => prev.map(a => a.id === asset.id ? updated : a));
      toast.success("Photo uploaded");
    } catch { toast.error("Upload failed"); }
    setUploadingPhoto(null);
    e.target.value = "";
  };

  const filtered = useMemo(() => {
    let result = assets;
    if (categoryFilter !== "all") result = result.filter(a => a.category === categoryFilter);
    if (search.trim()) { const q = search.toLowerCase(); result = result.filter(a => describeAsset(a, storeDevices).toLowerCase().includes(q) || a.location.toLowerCase().includes(q) || a.purpose.toLowerCase().includes(q)); }
    return result;
  }, [assets, storeDevices, categoryFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<AssetCategory, ProjectAsset[]>();
    filtered.forEach(a => { const list = map.get(a.category) || []; list.push(a); map.set(a.category, list); });
    return map;
  }, [filtered]);

  const exportRows = () => filtered.map(a => ({ category: ASSET_CATEGORY_LABELS[a.category], item: describeAsset(a, storeDevices), qty: a.quantity, location: a.location, purpose: a.purpose }));

  const exportCsv = () => {
    const rows = exportRows();
    const csv = ["Category,Item,Qty,Location,Purpose", ...rows.map(r => [r.category, r.item, r.qty, r.location, r.purpose].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${projectName.replace(/\s+/g, "-")}-equipment-list.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("Equipment Summary", 14, 18);
    doc.setFontSize(10); doc.text(`${projectName} — ${clientName}`, 14, 26);
    doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 32);
    let y = 44;
    Array.from(grouped.entries()).forEach(([cat, items]) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(12); doc.text(ASSET_CATEGORY_LABELS[cat], 14, y); y += 6;
      doc.setFontSize(9);
      items.forEach(a => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(`${describeAsset(a, storeDevices)}  ×${a.quantity}  ${a.location || "—"}  ${a.purpose || ""}`, 18, y);
        y += 5;
      });
      y += 4;
    });
    doc.save(`${projectName.replace(/\s+/g, "-")}-equipment-summary.pdf`);
  };

  const availableDevices = storeDevices.filter(d => CATALOG_CATEGORIES_FOR_ASSET[category].includes(d.category));

  if (loading) return <div className="space-y-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-40 rounded-2xl" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={openAddForm} className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}><Plus className="w-3.5 h-3.5" /> Add Asset</button>
        <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets…" className="h-9 rounded-xl pl-7 pr-3 text-[13px] text-[#e6edf3] focus:outline-none w-48" style={G.input} /></div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as AssetCategory | "all")} className="h-9 rounded-xl px-2 text-[13px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>
          <option value="all">All Categories</option>
          {(Object.keys(ASSET_CATEGORY_LABELS) as AssetCategory[]).map(c => <option key={c} value={c}>{ASSET_CATEGORY_LABELS[c]}</option>)}
        </select>
        <div className="flex-1" />
        <span className="text-[#8b949e] text-[13px]">{filtered.length} assets</span>
        <button onClick={exportCsv} className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[#8b949e] hover:text-white text-[13px] font-bold cursor-pointer" style={G.btn}><Download className="w-3.5 h-3.5" /> CSV</button>
        <button onClick={exportPdf} className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[#8b949e] hover:text-white text-[13px] font-bold cursor-pointer" style={G.btn}><FileDown className="w-3.5 h-3.5" /> PDF</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={closeForm}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
          <div onClick={e => e.stopPropagation()} className="relative z-10 w-full max-w-[560px] max-h-[85vh] overflow-y-auto rounded-2xl p-6 space-y-3" style={G.liquidGlass}>
            <h3 className="text-white text-[16px] font-extrabold mb-2">{editingAssetId ? "Edit Asset" : "Add Asset"}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Category</label><select value={category} onChange={e => { setCategory(e.target.value as AssetCategory); setDeviceStoreRef(""); setSystem(DEFAULT_SYSTEM_FOR_ASSET[e.target.value as AssetCategory]); }} className="w-full h-9 rounded-xl px-2 text-[13px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>{(Object.keys(ASSET_CATEGORY_LABELS) as AssetCategory[]).map(c => <option key={c} value={c}>{ASSET_CATEGORY_LABELS[c]}</option>)}</select></div>
              <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">System</label><select value={system} onChange={e => setSystem(e.target.value as SystemType)} className="w-full h-9 rounded-xl px-2 text-[13px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}><option value="VSS">VSS</option><option value="EAC">EAC</option><option value="Intercom">Intercom</option></select></div>
            </div>
            {category === "cable-wire" ? (
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Cable Type</label><select value={cableType} onChange={e => setCableType(e.target.value as CableSpec["cableType"])} className="w-full h-9 rounded-xl px-2 text-[13px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>{["CAT-6","CAT-6A","Fiber-SM","Fiber-MM","Coax-RG59","Power-18AWG","Power-14AWG","Speaker-Wire","Other"].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Length (ft)</label><input type="number" value={lengthFt} onChange={e => setLengthFt(e.target.value)} className="w-full h-9 rounded-xl px-3 text-[13px] text-white focus:outline-none" style={G.input} /></div>
                <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Cost / ft</label><input type="number" value={costPerFt} onChange={e => setCostPerFt(e.target.value)} className="w-full h-9 rounded-xl px-3 text-[13px] text-white focus:outline-none" style={G.input} /></div>
                <div className="col-span-2"><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Run Description</label><input value={runDescription} onChange={e => setRunDescription(e.target.value)} placeholder="e.g. Camera 3 to IDF closet" className="w-full h-9 rounded-xl px-3 text-[13px] text-white focus:outline-none" style={G.input} /></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Device (optional)</label><select value={deviceStoreRef} onChange={e => { const ref = e.target.value; setDeviceStoreRef(ref); const sd = availableDevices.find(d => d.id === ref); setUnitPrice(sd?.price ? String(sd.price) : ""); }} className="w-full h-9 rounded-xl px-2 text-[13px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}><option value="">— Generic / unspecified —</option>{availableDevices.map(d => <option key={d.id} value={d.id}>{d.manufacturer} {d.model}</option>)}</select></div>
                <div className="col-span-2"><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Unit Price (editable)</label><input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="0.00" className="w-full h-9 rounded-xl px-3 text-[13px] text-white focus:outline-none" style={G.input} /></div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Quantity</label><input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full h-9 rounded-xl px-3 text-[13px] text-white focus:outline-none" style={G.input} /></div>
              <div className="col-span-2"><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Location</label><input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. North parking entrance" className="w-full h-9 rounded-xl px-3 text-[13px] text-white focus:outline-none" style={G.input} /></div>
            </div>
            <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Zone (optional — links to Install Tracker)</label><select value={zoneId} onChange={e => setZoneId(e.target.value)} className="w-full h-9 rounded-xl px-2 text-[13px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}><option value="">— No zone —</option>{zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}</select></div>
            <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Purpose</label><input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. LPR capture at vehicle entry" className="w-full h-9 rounded-xl px-3 text-[13px] text-white focus:outline-none" style={G.input} /></div>
            <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full rounded-xl px-3 py-2 text-[13px] text-white focus:outline-none resize-none" style={G.input} /></div>
            <div className="flex gap-2 pt-2">
              <button onClick={closeForm} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 h-10 rounded-xl text-white text-[14px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}>{saving ? (editingAssetId ? "Saving…" : "Adding…") : (editingAssetId ? "Save Changes" : "Add Asset")}</button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="No assets yet" description="Add cameras, access control, network hardware, or cable runs to this project." action={{ label: "Add Asset", onClick: openAddForm }} />
      ) : (
        Array.from(grouped.entries()).map(([cat, items]) => (
          <div key={cat} className="rounded-2xl overflow-hidden" style={G.card}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}><h3 className="text-white text-[14px] font-extrabold">{ASSET_CATEGORY_LABELS[cat]}</h3><span className="text-[#8b949e] text-[12px]">({items.length})</span></div>
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              {items.map(asset => (
                <div key={asset.id} onClick={() => openEditForm(asset)} className="px-4 py-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-white/[0.02]" title="Click to edit asset">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[13px] font-bold">{describeAsset(asset, storeDevices)} <span className="text-[#8b949e] font-semibold">×{asset.quantity}</span></p>
                    <p className="text-[#8b949e] text-[12px] mt-0.5">{asset.location || "No location set"}{asset.purpose ? ` · ${asset.purpose}` : ""}</p>
                    <div className="flex items-center gap-1.5 mt-1.5" onClick={e => e.stopPropagation()}>
                      <span className="text-[#484f58] text-[11px] font-extrabold uppercase tracking-widest">Unit Price</span>
                      <InlineEditCell type="number" value={assetUnitCost(asset, storeDevices)} onChange={(val) => handlePriceUpdate(asset, parseFloat(val) || 0)} />
                      <span className="text-[#484f58] text-[11px]">· Total {fmt(assetUnitCost(asset, storeDevices) * asset.quantity)}</span>
                    </div>
                    {asset.zoneId && <p className="text-[#484f58] text-[11px] mt-0.5">Zone: {zones.find(z => z.id === asset.zoneId)?.name || asset.zoneId}</p>}
                    {asset.notes && <p className="text-[#484f58] text-[11px] mt-0.5 italic">{asset.notes}</p>}
                    {asset.coveragePhotos && asset.coveragePhotos.length > 0 && <div className="flex gap-2 mt-2 flex-wrap">{asset.coveragePhotos.map((p, i) => <img key={i} src={p} alt="" className="w-14 h-14 rounded-lg object-cover" style={{ border: "1px solid rgba(255,255,255,0.10)" }} />)}</div>}
                    <label onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 mt-2 text-[11px] text-blue-400 cursor-pointer">{uploadingPhoto === asset.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} {uploadingPhoto === asset.id ? "Uploading…" : "Add coverage photo"}<input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(asset, e)} disabled={uploadingPhoto === asset.id} /></label>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(asset); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-500/10 cursor-pointer flex-shrink-0"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const CATEGORY_SECTION: Record<AssetCategory, Partial<Record<SystemType, number>>> = {
  camera: { VSS: 400, EAC: 1000, Intercom: 1500 },
  "access-control": { VSS: 400, EAC: 1000, Intercom: 1500 },
  "network-hardware": { VSS: 600, EAC: 1100, Intercom: 1600 },
  "cable-wire": { VSS: 600, EAC: 1100, Intercom: 1600 },
  intercom: { VSS: 400, EAC: 1000, Intercom: 1500 },
  other: { VSS: 400, EAC: 1000, Intercom: 1500 },
};

async function getOrCreateProjectQuote(projectId: string, system: SystemType): Promise<Quote> {
  const quotes = await API.quotes.list();
  const existing = quotes.find((q: Quote) => q.projectId === projectId);
  if (existing) return existing;
  const projects = await API.projects.list();
  const proj = projects.find((p: Project) => p.id === projectId);
  const sysCategories = SYSTEM_CATEGORIES[system] || SYSTEM_CATEGORIES.VSS;
  const categories: QuoteCategory[] = sysCategories.map(sc => ({ id: crypto.randomUUID?.() || `cat-${sc.sectionNumber}`, name: sc.name, type: system === "Intercom" ? "Intercom" as QuoteType : system === "EAC" ? "Access Control" as QuoteType : "Video Surveillance" as QuoteType, system, sectionNumber: sc.sectionNumber, importRatePercent: sc.importRatePercent, lineItems: [] }));
  return API.quotes.create({ clientName: proj?.client || "", refNumber: `Q-${projectId.slice(0, 8).toUpperCase()}`, date: new Date().toISOString().slice(0, 10), status: "draft", quoteType: system === "Intercom" ? "Intercom" as QuoteType : "Multiple" as QuoteType, exchangeRate: parseFloat(localStorage.getItem("fx_rate") || String(DEFAULT_EXCHANGE_RATE)), projectId, categories });
}

// Creates or updates the one QuoteLineItem tied to this ProjectAsset (matched by id, not
// description, since descriptions can collide or change) so Cost & Margin, BOM, and Synthesis
// all reflect the asset's current category/system/price/quantity — the same real data
// Asset List reads, not a separate in-memory preview.
async function upsertAssetLineItem(projectId: string, asset: ProjectAsset, storeDevices: CatalogDevice[]) {
  if (!projectId) return;
  try {
    const price = assetUnitCost(asset, storeDevices);
    const description = describeAsset(asset, storeDevices);
    const quote = await getOrCreateProjectQuote(projectId, asset.system);
    const categories: QuoteCategory[] = quote.categories.map(c => ({ ...c, lineItems: [...c.lineItems] }));

    let existingCatIndex = -1;
    categories.forEach((cat, i) => { if (cat.lineItems.some(li => li.projectAssetId === asset.id)) existingCatIndex = i; });
    const existingItem = existingCatIndex !== -1 ? categories[existingCatIndex].lineItems.find(li => li.projectAssetId === asset.id) : undefined;

    const sysCategories = SYSTEM_CATEGORIES[asset.system] || SYSTEM_CATEGORIES.VSS;
    const targetSection = CATEGORY_SECTION[asset.category]?.[asset.system] ?? sysCategories[3]?.sectionNumber ?? sysCategories[0].sectionNumber;
    let targetCat = categories.find(c => c.system === asset.system && c.sectionNumber === targetSection);
    if (!targetCat) {
      const sc = sysCategories.find(s => s.sectionNumber === targetSection);
      targetCat = { id: crypto.randomUUID?.() || `cat${Date.now()}`, name: sc?.name || "Hardware", type: asset.system === "Intercom" ? "Intercom" as QuoteType : asset.system === "EAC" ? "Access Control" as QuoteType : "Video Surveillance" as QuoteType, system: asset.system, sectionNumber: targetSection, importRatePercent: sc?.importRatePercent || 0, lineItems: [] };
      categories.push(targetCat);
    }

    if (existingCatIndex !== -1 && categories[existingCatIndex] !== targetCat) {
      categories[existingCatIndex].lineItems = categories[existingCatIndex].lineItems.filter(li => li.projectAssetId !== asset.id);
    }

    const markupPercent = existingItem?.markupPercent ?? (sysCategories.find(s => s.sectionNumber === targetSection)?.defaultMarkup || 0.35);
    const sellPrice = price * (1 + markupPercent);
    const updatedItem: QuoteLineItem = {
      id: existingItem?.id || crypto.randomUUID?.() || `li${Date.now()}`,
      itemNumber: existingItem?.itemNumber || String(targetCat.lineItems.length + 1).padStart(2, "0"),
      description,
      unitCost: price,
      quantity: asset.quantity,
      markupPercent,
      sellPrice,
      costTotal: price * asset.quantity,
      sellTotal: sellPrice * asset.quantity,
      profit: (sellPrice - price) * asset.quantity,
      jmdConversion: sellPrice * asset.quantity * (parseFloat(localStorage.getItem("fx_rate") || String(DEFAULT_EXCHANGE_RATE))),
      projectAssetId: asset.id,
    };
    targetCat.lineItems = targetCat.lineItems.some(li => li.projectAssetId === asset.id)
      ? targetCat.lineItems.map(li => li.projectAssetId === asset.id ? updatedItem : li)
      : [...targetCat.lineItems, updatedItem];

    await API.quotes.update(quote.id, { categories });
  } catch (err) { console.error("Workbook asset sync failed:", err); }
}

async function removeAssetLineItem(projectId: string, assetId: string) {
  if (!projectId) return;
  try {
    const quotes = await API.quotes.list();
    const quote = quotes.find((q: Quote) => q.projectId === projectId);
    if (!quote) return;
    const categories = quote.categories.map(cat => ({ ...cat, lineItems: cat.lineItems.filter(li => li.projectAssetId !== assetId) }));
    await API.quotes.update(quote.id, { categories });
  } catch (err) { console.error("Workbook asset removal failed:", err); }
}

function describeAsset(asset: ProjectAsset, storeDevices: CatalogDevice[]): string {
  const sd = asset.deviceStoreRef ? storeDevices.find(d => d.id === asset.deviceStoreRef) : null;
  if (sd) return `${sd.manufacturer} ${sd.model}`;
  if (asset.cableSpec) return `${asset.cableSpec.cableType}${asset.cableSpec.runDescription ? " — " + asset.cableSpec.runDescription : ""}`;
  return asset.purpose || asset.category;
}

function assetUnitCost(asset: ProjectAsset, storeDevices: CatalogDevice[]): number {
  if (asset.category === "cable-wire") {
    if (asset.cableSpec?.costPerFt && asset.cableSpec.lengthFt) return asset.cableSpec.costPerFt * asset.cableSpec.lengthFt;
    return 0;
  }
  if (asset.unitCost !== undefined && asset.unitCost !== null) return asset.unitCost;
  const sd = asset.deviceStoreRef ? storeDevices.find(d => d.id === asset.deviceStoreRef) : null;
  if (sd?.price) return sd.price;
  return 0;
}

function InlineEditCell({ value, onChange, onSave, type = "text", disabled, placeholder }: { value: string | number; onChange: (val: string) => void; onSave?: () => void; type?: "text" | "number"; disabled?: boolean; placeholder?: string; }) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  useEffect(() => { if (!editing) setLocalValue(String(value)); }, [value, editing]);
  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); if (type === "number") inputRef.current.select(); } }, [editing, type]);
  const handleCommit = useCallback(() => { if (String(localValue) !== String(value)) { onChange(localValue); setSaveState("saving"); setTimeout(() => setSaveState("saved"), 600); setTimeout(() => setSaveState("idle"), 2000); onSave?.(); } setEditing(false); }, [localValue, value, onChange, onSave]);
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); handleCommit(); } else if (e.key === "Escape") { setLocalValue(String(value)); setEditing(false); } else if (e.key === "Tab") { e.preventDefault(); handleCommit(); } };
  return (
    <div className="relative group inline-flex items-center min-w-[40px]">
      {editing ? (<input ref={inputRef} type={type} value={localValue} onChange={e => setLocalValue(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleCommit} disabled={disabled} placeholder={placeholder} className="bg-transparent text-white text-[13px] font-bold w-full focus:outline-none px-1 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.25)", minWidth: "60px" }} />) : (<span onClick={() => !disabled && setEditing(true)} className={clsx("px-1 py-0.5 rounded transition-colors hover:bg-white/[0.04]", disabled ? "cursor-default hover:bg-transparent" : "cursor-pointer")} tabIndex={disabled ? -1 : 0}>{String(value) || placeholder || "—"}</span>)}
      {saveState === "saving" && <Loader2 className="w-2.5 h-2.5 animate-spin text-[#484f58] ml-1 flex-shrink-0" />}
      {saveState === "saved" && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 ml-1 flex-shrink-0" />}
    </div>
  );
}

function OverrideConflictModal({ open, sectionName, onUpdateOverride, onKeepOverride, onCancel }: { open: boolean; sectionName: string; onUpdateOverride: () => void; onKeepOverride: () => void; onCancel: () => void; }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={e => e.stopPropagation()} className="relative z-10 w-full max-w-[440px] rounded-2xl p-6" style={G.liquidGlass}>
        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}><AlertTriangle className="w-5 h-5 text-amber-400" /></div><div><h3 className="text-white text-[16px] font-extrabold">Manual Override Detected</h3><p className="text-[#8b949e] text-[13px] mt-0.5">"{sectionName}" has a manual override in Synthesis.</p></div></div>
        <p className="text-[#8b949e] text-[14px] mb-5">Editing the BOM will recalculate this section. Update override or keep the manual value?</p>
        <div className="flex gap-2"><button onClick={onCancel} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button><button onClick={onKeepOverride} className="flex-1 h-10 rounded-xl text-white text-[14px] font-bold cursor-pointer" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>Keep Override</button><button onClick={onUpdateOverride} className="flex-1 h-10 rounded-xl text-white text-[14px] font-extrabold cursor-pointer" style={{ background: "#f59e0b", boxShadow: "0 4px 16px rgba(245,158,11,0.35)" }}>Update Override</button></div>
      </motion.div>
    </div>
  );
}

function PriceDeviationBadge({ deviation }: { deviation: number }) { if (Math.abs(deviation) <= 50) return null; const isHigh = deviation > 50; return (<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold cursor-help ml-1" style={{ background: isHigh ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)", color: isHigh ? "#fbbf24" : "#f87171", border: `1px solid ${isHigh ? "rgba(245,158,11,0.30)" : "rgba(239,68,68,0.30)"}` }} title={`Price deviates ${deviation > 0 ? "+" : ""}${deviation.toFixed(0)}% from historical average`}><AlertTriangle className="w-2.5 h-2.5" />{deviation > 0 ? "+" : ""}{deviation.toFixed(0)}%</span>); }

function OverrideIndicator({ isOverridden, onReset }: { isOverridden: boolean; onReset?: () => void }) { if (!isOverridden) return null; return (<button onClick={e => { e.stopPropagation(); onReset?.(); }} className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer ml-1 flex-shrink-0" style={{ background: "rgba(245,158,11,0.20)", border: "1px solid rgba(245,158,11,0.40)" }} title="Manually overridden — click to reset"><Pencil className="w-2.5 h-2.5 text-amber-400" /></button>); }

function FieldAuditModal({ open, entries, onClose }: { open: boolean; entries: WorkbookAuditEntry[]; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={e => e.stopPropagation()} className="relative z-10 w-full max-w-[500px] max-h-[70vh] overflow-y-auto rounded-2xl" style={G.liquidGlass}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}><h3 className="text-white text-[16px] font-extrabold">Change History</h3><button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer"><X className="w-4 h-4 text-[#8b949e]" /></button></div>
        <div className="p-4 space-y-2">{entries.length === 0 ? <p className="text-[#8b949e] text-[14px] text-center py-4">No changes recorded</p> : entries.map(entry => (<div key={entry.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}><div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0" style={{ background: TEAM.find(t => t.name === entry.changedBy)?.color || "#3b82f6" }}>{TEAM.find(t => t.name === entry.changedBy)?.initials || "??"}</div><div className="flex-1 min-w-0"><p className="text-white text-[13px] font-bold">{entry.fieldPath}</p><div className="flex items-center gap-1.5 mt-1 text-[12px]"><span className="text-rose-400 line-through">{entry.oldValue}</span><ChevronRight className="w-3 h-3 text-[#484f58]" /><span className="text-emerald-400">{entry.newValue}</span></div><p className="text-[#8b949e] text-[11px] mt-1">{new Date(entry.changedAt).toLocaleString()}</p></div></div>))}</div>
      </motion.div>
    </div>
  );
}

function SummaryBar({ totalCost, totalSell, blendedMargin, fmt, onGenerateProposal }: { totalCost: number; totalSell: number; blendedMargin: number; fmt: (n: number) => string; onGenerateProposal?: () => void; }) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-4 px-4 py-2.5 rounded-xl mb-3 flex-wrap" style={{ ...G.liquidGlass, borderColor: "rgba(59,130,246,0.25)" }}>
      <div className="flex items-center gap-2"><span className="text-[#8b949e] text-[12px] font-extrabold uppercase">Total Cost</span><span className="text-white text-[16px] font-extrabold">{fmt(totalCost)}</span></div>
      <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.10)" }} />
      <div className="flex items-center gap-2"><span className="text-[#8b949e] text-[12px] font-extrabold uppercase">Total Sell</span><span className="text-emerald-400 text-[16px] font-extrabold">{fmt(totalSell)}</span></div>
      <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.10)" }} />
      <div className="flex items-center gap-2"><span className="text-[#8b949e] text-[12px] font-extrabold uppercase">Blended Margin</span><span className={clsx("text-[16px] font-extrabold", blendedMargin >= 30 ? "text-emerald-400" : blendedMargin >= 15 ? "text-amber-400" : "text-rose-400")}>{blendedMargin.toFixed(1)}%</span></div>
      <div className="flex-1" />
      {onGenerateProposal && <button onClick={onGenerateProposal} className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-white text-[12px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}><FileDown className="w-3 h-3" /> Generate Proposal</button>}
    </div>
  );
}

function CostMarginTab({ quoteCategories, exchangeRate, fmt, onLineItemUpdate, fieldSaveStatus, systemFilter, onSystemFilterChange }: { quoteCategories: QuoteCategory[]; exchangeRate: number; fmt: (n: number, compact?: boolean) => string; onLineItemUpdate: (categoryId: string, itemId: string, updates: Partial<QuoteLineItem>) => void; fieldSaveStatus: Record<string, "saved" | "saving" | "">; systemFilter: SystemType; onSystemFilterChange: (s: SystemType) => void; }) {
  const filteredCategories = quoteCategories.filter(c => c.system === systemFilter && c.sectionNumber !== 800 && c.sectionNumber !== 1300 && c.sectionNumber !== 1800);
  const importCategories = quoteCategories.filter(c => c.system === systemFilter && (c.sectionNumber === 800 || c.sectionNumber === 1300 || c.sectionNumber === 1800));

  const systemCostTotal = filteredCategories.reduce((s, c) => s + c.lineItems.reduce((ls, li) => ls + recalcLineItem(li, exchangeRate).costTotal, 0), 0);
  const systemSellTotal = filteredCategories.reduce((s, c) => s + c.lineItems.reduce((ls, li) => ls + recalcLineItem(li, exchangeRate).sellTotal, 0), 0);
  const systemProfit = systemSellTotal - systemCostTotal;
  const systemImportTotal = filteredCategories.reduce((s, c) => s + (c.lineItems.reduce((ls, li) => ls + recalcLineItem(li, exchangeRate).costTotal, 0) * c.importRatePercent), 0);
  const systemSubtotal = systemCostTotal + systemImportTotal;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["VSS","EAC","Intercom"] as SystemType[]).map(s => (
          <button key={s} onClick={() => onSystemFilterChange(s)} className={clsx("h-9 md:h-7 px-3 rounded-lg text-[12px] font-extrabold cursor-pointer", systemFilter === s ? "text-white" : "text-[#8b949e]")} style={systemFilter === s ? { background: s === "VSS" ? "#3b82f6" : s === "EAC" ? "#8b5cf6" : "#14b8a6" } : G.btn}>{s}</button>
        ))}
      </div>
      <div className="rounded-2xl overflow-hidden" style={G.card}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: "900px" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-left">Item No</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-left">Description</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-center">Qty</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Cost (USD)</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Markup %</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Sell (USD)</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Total Cost</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Total Sell</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Profit</th></tr></thead>
            <tbody>
              {filteredCategories.map(category => (
                <Fragment key={category.id}>
                  <tr style={{ background: "rgba(255,255,255,0.02)" }}><td colSpan={9} className="px-3 py-2 text-white text-[13px] font-extrabold">{category.sectionNumber} — {category.name}</td></tr>
                  {category.lineItems.filter(li => li.quantity > 0).map((li, i) => {
                    const r = recalcLineItem(li, exchangeRate);
                    const fieldKey = `cm-${category.id}-${li.id}`;
                    const fs = fieldSaveStatus[fieldKey];
                    const itemNumber = category.lineItems.filter(x => x.quantity > 0).length > 1 ? `${category.sectionNumber}.${i + 1}` : String(category.sectionNumber);
                    return (
                      <tr key={li.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td className="px-3 py-2 text-[#8b949e] text-[12px] font-mono">{itemNumber}</td>
                        <td className="px-3 py-2 text-white text-[13px] font-bold">{li.description}</td>
                        <td className="px-3 py-2 text-center"><InlineEditCell type="number" value={li.quantity} onChange={(val) => onLineItemUpdate(category.id, li.id, { quantity: parseInt(val) || 0 })} /></td>
                        <td className="px-3 py-2 text-right"><InlineEditCell type="number" value={li.unitCost} onChange={(val) => onLineItemUpdate(category.id, li.id, { unitCost: parseFloat(val) || 0 })} /></td>
                        <td className="px-3 py-2 text-right"><InlineEditCell type="number" value={Math.round(li.markupPercent * 100)} onChange={(val) => onLineItemUpdate(category.id, li.id, { markupPercent: (parseFloat(val) || 0) / 100 })} /><span className="text-[#8b949e] text-[12px]">%</span></td>
                        <td className="px-3 py-2 text-right text-white text-[13px] font-extrabold">{r.sellPrice.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-[#8b949e] text-[13px]">{r.costTotal.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-white text-[13px] font-extrabold">{r.sellTotal.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-[13px] font-extrabold" style={{ color: r.profit >= 0 ? "#34d399" : "#f87171" }}>{r.profit.toFixed(2)}{fs === "saving" && <Loader2 className="w-2.5 h-2.5 animate-spin text-[#8b949e] ml-1 inline" />}{fs === "saved" && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 ml-1 inline" />}</td>
                      </tr>
                    );
                  })}
                  {category.importRatePercent > 0 && (
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td colSpan={6} className="px-3 py-2 text-right text-[#8b949e] text-[12px] font-bold">Import ({Math.round(category.importRatePercent * 100)}% of cost)</td>
                      <td className="px-3 py-2 text-right text-amber-400 text-[13px] font-extrabold">{(category.lineItems.reduce((s, li) => s + recalcLineItem(li, exchangeRate).costTotal, 0) * category.importRatePercent).toFixed(2)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  )}
                </Fragment>
              ))}
              <tr style={{ background: "rgba(255,255,255,0.04)" }}><td colSpan={6} className="px-3 py-2.5 text-right text-white text-[13px] font-extrabold uppercase">System Subtotal</td><td className="px-3 py-2.5 text-right text-white text-[14px] font-extrabold">{systemSubtotal.toFixed(2)}</td><td className="px-3 py-2.5 text-right text-white text-[14px] font-extrabold">{systemSellTotal.toFixed(2)}</td><td className="px-3 py-2.5 text-right text-emerald-400 text-[14px] font-extrabold">{systemProfit.toFixed(2)}</td></tr>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}><td colSpan={6} className="px-3 py-2 text-right text-[#8b949e] text-[12px]">Cost Total</td><td className="px-3 py-2 text-right text-white text-[13px] font-extrabold">{systemCostTotal.toFixed(2)}</td><td colSpan={2}></td></tr>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}><td colSpan={6} className="px-3 py-2 text-right text-[#8b949e] text-[12px]">Import Total</td><td className="px-3 py-2 text-right text-white text-[13px] font-extrabold">{systemImportTotal.toFixed(2)}</td><td colSpan={2}></td></tr>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}><td colSpan={6} className="px-3 py-2 text-right text-[#8b949e] text-[12px]">Profit</td><td colSpan={2}></td><td className="px-3 py-2 text-right text-emerald-400 text-[13px] font-extrabold">{systemProfit.toFixed(2)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-[#8b949e] text-[11px] italic">Internal only — never included in client exports. Cost/margin data stays hidden from proposals.</div>
    </div>
  );
}
function BomTab({ quoteCategories, synthesisOverrides, exchangeRate, fmt, onLineItemUpdate, onAddLineItem, onBomEditWithOverride, fieldSaveStatus, systemFilter, onSystemFilterChange }: { quoteCategories: QuoteCategory[]; synthesisOverrides: SynthesisOverride[]; exchangeRate: number; fmt: (n: number, compact?: boolean) => string; onLineItemUpdate: (categoryId: string, itemId: string, updates: Partial<QuoteLineItem>) => void; onAddLineItem: (categoryId: string) => void; onBomEditWithOverride: (sectionNumber: string, sectionName: string, callback: () => void) => void; fieldSaveStatus: Record<string, "saved" | "saving" | "">; systemFilter: SystemType; onSystemFilterChange: (s: SystemType) => void; }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [stickyScrollLeft, setStickyScrollLeft] = useState(0);

  useEffect(() => { const body = bodyRef.current; if (!body) return; const handler = () => setStickyScrollLeft(body.scrollLeft); body.addEventListener("scroll", handler); return () => body.removeEventListener("scroll", handler); }, []);

  const systemCategories = quoteCategories.filter(c => c.system === systemFilter);
  const activeCategories = systemCategories.filter(c => c.sectionNumber !== 800 && c.sectionNumber !== 1300 && c.sectionNumber !== 1800);
  const importCategories = systemCategories.filter(c => c.sectionNumber === 800 || c.sectionNumber === 1300 || c.sectionNumber === 1800);

  const bomData = activeCategories.map(cat => {
    const items = cat.lineItems.filter(li => li.quantity > 0);
    const children = items.map((item, i) => ({ subNumber: items.length > 1 ? `${cat.sectionNumber}.${i + 1}` : String(cat.sectionNumber), item: recalcLineItem(item, exchangeRate) }));
    const subtotal = children.reduce((s, c) => s + c.item.sellTotal, 0);
    const override = synthesisOverrides.find(o => o.sectionNumber === String(cat.sectionNumber) && o.isOverridden);
    return { ...cat, items, children, subtotal, override, displayPrice: override ? override.overrideValue! : subtotal, importAmount: cat.importRatePercent > 0 ? children.reduce((s, c) => s + c.item.costTotal, 0) * cat.importRatePercent : 0 };
  });

  const grandTotal = bomData.reduce((s, b) => s + b.displayPrice + b.importAmount, 0);
  const tax = grandTotal * GCT_RATE;
  const totalWithTax = grandTotal + tax;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["VSS","EAC","Intercom"] as SystemType[]).map(s => (
          <button key={s} onClick={() => onSystemFilterChange(s)} className={clsx("h-9 md:h-7 px-3 rounded-lg text-[12px] font-extrabold cursor-pointer", systemFilter === s ? "text-white" : "text-[#8b949e]")} style={systemFilter === s ? { background: s === "VSS" ? "#3b82f6" : s === "EAC" ? "#8b5cf6" : "#14b8a6" } : G.btn}>{s}</button>
        ))}
      </div>
      <div className="rounded-2xl overflow-hidden" style={G.card}>
        <div className="sticky top-0 z-10 overflow-hidden" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(7,12,26,0.95)" }}>
          <div style={{ marginLeft: -stickyScrollLeft }}>
            <table style={{ minWidth: "900px" }}>
              <thead><tr style={{ background: "rgba(255,255,255,0.03)" }}><th className="sticky left-0 z-20 px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-left" style={{ background: "rgba(7,12,26,0.95)", minWidth: "100px" }}>Item No</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-left" style={{ minWidth: "250px" }}>Products – Description</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right" style={{ minWidth: "120px" }}>List (JMD)</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-center" style={{ minWidth: "60px" }}>Qty</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right" style={{ minWidth: "140px" }}>Extended (JMD)</th></tr></thead>
            </table>
          </div>
        </div>
        <div ref={bodyRef} className="overflow-x-auto" style={{ maxHeight: "calc(100vh - 420px)", scrollbarWidth: "thin" }}>
          <table style={{ minWidth: "900px" }}>
            <tbody>
              <tr style={{ background: systemFilter === "VSS" ? "rgba(59,130,246,0.06)" : systemFilter === "EAC" ? "rgba(139,92,246,0.06)" : "rgba(20,184,166,0.06)" }}><td colSpan={5} className="sticky left-0 px-4 py-2.5 text-white text-[14px] font-extrabold uppercase tracking-widest" style={{ background: "rgba(7,12,26,0.9)" }}>{systemFilter === "VSS" ? "Video Surveillance" : systemFilter === "EAC" ? "Access Control" : "Intercom"}</td></tr>
              {bomData.map(section => {
                if (section.children.length === 0) return (
                  <tr key={section.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td className="sticky left-0 px-4 py-2 text-[#8b949e] text-[12px] font-mono" style={{ background: "rgba(7,12,26,0.9)" }}>{section.sectionNumber}</td>
                    <td className="px-4 py-2 text-[#8b949e] text-[13px]">{section.name}</td>
                    <td className="px-4 py-2 text-right text-white text-[13px]">—</td>
                    <td className="px-4 py-2 text-center text-[#8b949e] text-[13px]">0</td>
                    <td className="px-4 py-2 text-right text-white text-[13px] font-extrabold flex items-center justify-end gap-1">—{section.override && <OverrideIndicator isOverridden={true} />}</td>
                  </tr>
                );
                return section.children.map((child, ci) => {
                  const listPriceJMD = child.item.sellPrice * exchangeRate;
                  const extendedJMD = listPriceJMD * child.item.quantity;
                  const fieldKey = `bom-${section.id}-${child.item.id}`;
                  const fs = fieldSaveStatus[fieldKey];
                  return (
                    <tr key={child.item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td className="sticky left-0 px-4 py-2 text-[#8b949e] text-[12px] font-mono" style={{ background: "rgba(7,12,26,0.9)", paddingLeft: section.children.length > 1 ? "28px" : "16px" }}>{child.subNumber}</td>
                      <td className="px-4 py-2 text-white text-[13px] font-bold max-w-[250px] truncate">{child.item.description}</td>
                      <td className="px-4 py-2 text-right text-white text-[13px]">{fmt(listPriceJMD)}</td>
                      <td className="px-4 py-2 text-center"><InlineEditCell type="number" value={child.item.quantity} onChange={(val) => onLineItemUpdate(section.id, child.item.id, { quantity: parseInt(val) || 0 })} /></td>
                      <td className="px-4 py-2 text-right text-white text-[13px] font-extrabold flex items-center justify-end gap-1">{fmt(extendedJMD)}{fs === "saving" && <Loader2 className="w-2.5 h-2.5 animate-spin text-[#8b949e]" />}{fs === "saved" && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}</td>
                    </tr>
                  );
                });
              })}
              {bomData.filter(b => b.importAmount > 0).map(section => (
                <tr key={`import-${section.id}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td className="sticky left-0 px-4 py-2 text-[#8b949e] text-[12px] font-mono" style={{ background: "rgba(7,12,26,0.9)" }}>{section.sectionNumber}.9</td>
                  <td className="px-4 py-2 text-amber-400 text-[13px] font-bold">Import ({Math.round(section.importRatePercent * 100)}%)</td>
                  <td className="px-4 py-2 text-right text-amber-400 text-[13px]">{fmt(section.importAmount * exchangeRate)}</td>
                  <td className="px-4 py-2 text-center text-[#8b949e] text-[13px]">1</td>
                  <td className="px-4 py-2 text-right text-amber-400 text-[13px] font-extrabold">{fmt(section.importAmount * exchangeRate)}</td>
                </tr>
              ))}
              <tr style={{ background: "rgba(255,255,255,0.04)" }}><td colSpan={4} className="px-4 py-2.5 text-right text-white text-[13px] font-extrabold uppercase">Subtotal</td><td className="px-4 py-2.5 text-right text-white text-[15px] font-extrabold">{fmt(grandTotal)}</td></tr>
              <tr><td colSpan={4} className="px-4 py-2 text-right text-[#8b949e] text-[13px]">GCT (15%)</td><td className="px-4 py-2 text-right text-white text-[14px] font-extrabold">{fmt(tax)}</td></tr>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}><td colSpan={4} className="px-4 py-2.5 text-right text-white text-[15px] font-extrabold uppercase">Total</td><td className="px-4 py-2.5 text-right text-white text-[16px] font-black" style={{ color: "#60a5fa" }}>{fmt(totalWithTax)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SynthesisTab({ quoteCategories, synthesisOverrides, exchangeRate, fmt, onSaveOverride, fieldSaveStatus }: { quoteCategories: QuoteCategory[]; synthesisOverrides: SynthesisOverride[]; exchangeRate: number; fmt: (n: number, compact?: boolean) => string; onSaveOverride: (sectionNumber: string, value: number | null, isOverridden: boolean) => void; fieldSaveStatus: Record<string, "saved" | "saving" | "">; }) {
  const [collapsedVideo, setCollapsedVideo] = useState(false);
  const [collapsedAccess, setCollapsedAccess] = useState(false);
  const [collapsedIntercom, setCollapsedIntercom] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const getSectionSubtotal = (sectionNumber: string): number => {
    const cat = quoteCategories.find(c => String(c.sectionNumber) === sectionNumber);
    if (!cat) return 0;
    return cat.lineItems.filter(li => li.quantity > 0).reduce((s, li) => s + recalcLineItem(li, exchangeRate).sellTotal, 0);
  };

  const getDisplayValue = (section: typeof SYNTHESIS_SECTIONS[number]): { value: number; isOverridden: boolean } => {
    const override = synthesisOverrides.find(o => o.sectionNumber === section.section && o.isOverridden);
    if (override && override.overrideValue !== null) return { value: toNum(override.overrideValue), isOverridden: true };
    return { value: getSectionSubtotal(section.section), isOverridden: false };
  };

  const handleStartEdit = (sectionNumber: string, currentValue: number) => { setEditingSection(sectionNumber); setEditValue(String(currentValue)); };
  const handleSaveEdit = (sectionNumber: string) => { const val = parseFloat(editValue) || 0; onSaveOverride(sectionNumber, val, true); setEditingSection(null); };
  const handleResetOverride = (sectionNumber: string) => { onSaveOverride(sectionNumber, null, false); };

  const videoSections = SYNTHESIS_SECTIONS.filter(s => s.group === "video");
  const accessSections = SYNTHESIS_SECTIONS.filter(s => s.group === "access");
  const intercomSections = SYNTHESIS_SECTIONS.filter(s => s.group === "intercom");
  const videoTotal = videoSections.reduce((s, sec) => s + getDisplayValue(sec).value, 0);
  const accessTotal = accessSections.reduce((s, sec) => s + getDisplayValue(sec).value, 0);
  const intercomTotal = intercomSections.reduce((s, sec) => s + getDisplayValue(sec).value, 0);
  const grandTotal = videoTotal + accessTotal + intercomTotal;
  const tax = grandTotal * GCT_RATE;
  const totalWithTax = grandTotal + tax;
  const suggestedPM = grandTotal * PM_REFERENCE_RATE;
  const suggestedContingency = grandTotal * CONTINGENCY_REFERENCE_RATE;

  const renderSection = (section: typeof SYNTHESIS_SECTIONS[number]) => {
    const { value, isOverridden } = getDisplayValue(section);
    const fieldKey = `synth-${section.section}`;
    const fs = fieldSaveStatus[fieldKey];
    return (
      <tr key={section.section} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
        <td className="px-4 py-2 text-[#8b949e] text-[12px] font-mono">{section.section}</td>
        <td className="px-4 py-2 text-white text-[13px] font-bold">{section.name}</td>
        <td className={clsx("px-4 py-2 text-[13px] font-extrabold text-right flex items-center justify-end gap-1", isOverridden ? "text-amber-400" : "text-[#8b949e]")}>
          {editingSection === section.section ? (
            <div className="flex items-center gap-1"><input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="bg-transparent text-white text-[13px] w-24 text-right focus:outline-none" style={G.input} autoFocus onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(section.section); if (e.key === "Escape") setEditingSection(null); }} /><button onClick={() => handleSaveEdit(section.section)} className="w-5 h-5 rounded flex items-center justify-center cursor-pointer" style={{ background: "rgba(16,185,129,0.15)" }}><CheckCircle2 className="w-3 h-3 text-emerald-400" /></button></div>
          ) : (<span className="cursor-pointer" onClick={() => handleStartEdit(section.section, value)}>{value > 0 ? fmt(value) : "—"}</span>)}
          {isOverridden && <OverrideIndicator isOverridden={true} onReset={() => handleResetOverride(section.section)} />}
          {fs === "saving" && <Loader2 className="w-2.5 h-2.5 animate-spin text-[#8b949e]" />}
          {fs === "saved" && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-0">
      <div className="rounded-2xl overflow-hidden" style={G.card}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: "700px" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-left">Item No</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-left">DESIGNATION</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Unit Price</th></tr></thead>
            <tbody>
              <tr style={{ background: "rgba(59,130,246,0.06)", cursor: "pointer" }} onClick={() => setCollapsedVideo(!collapsedVideo)}><td colSpan={3} className="px-4 py-2.5 text-white text-[14px] font-extrabold uppercase tracking-widest flex items-center gap-2">{collapsedVideo ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} Video Surveillance</td></tr>
              {!collapsedVideo && videoSections.map(renderSection)}
              {!collapsedVideo && <tr style={{ background: "rgba(255,255,255,0.04)" }}><td colSpan={2} className="px-4 py-2 text-[#8b949e] text-[12px] font-extrabold text-right uppercase">Total Video</td><td className="px-4 py-2 text-white text-[14px] font-extrabold text-right">{fmt(videoTotal)}</td></tr>}
              <tr><td colSpan={3} className="px-4 py-1"></td></tr>
              <tr style={{ background: "rgba(139,92,246,0.06)", cursor: "pointer" }} onClick={() => setCollapsedAccess(!collapsedAccess)}><td colSpan={3} className="px-4 py-2.5 text-white text-[14px] font-extrabold uppercase tracking-widest flex items-center gap-2">{collapsedAccess ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} Access Control</td></tr>
              {!collapsedAccess && accessSections.map(renderSection)}
              {!collapsedAccess && <tr style={{ background: "rgba(255,255,255,0.04)" }}><td colSpan={2} className="px-4 py-2 text-[#8b949e] text-[12px] font-extrabold text-right uppercase">Total Access</td><td className="px-4 py-2 text-white text-[14px] font-extrabold text-right">{fmt(accessTotal)}</td></tr>}
              <tr><td colSpan={3} className="px-4 py-1"></td></tr>
              <tr style={{ background: "rgba(20,184,166,0.06)", cursor: "pointer" }} onClick={() => setCollapsedIntercom(!collapsedIntercom)}><td colSpan={3} className="px-4 py-2.5 text-white text-[14px] font-extrabold uppercase tracking-widest flex items-center gap-2">{collapsedIntercom ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} Intercom</td></tr>
              {!collapsedIntercom && intercomSections.map(renderSection)}
              {!collapsedIntercom && <tr style={{ background: "rgba(255,255,255,0.04)" }}><td colSpan={2} className="px-4 py-2 text-[#8b949e] text-[12px] font-extrabold text-right uppercase">Total Intercom</td><td className="px-4 py-2 text-white text-[14px] font-extrabold text-right">{fmt(intercomTotal)}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-2xl p-4 mt-4" style={{ ...G.card, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.20)" }}>
        <div className="space-y-2">
          <div className="flex justify-between py-1"><span className="text-[#8b949e] text-[13px]">Grand Total</span><span className="text-white text-[16px] font-extrabold">{fmt(grandTotal)}</span></div>
          <div className="flex justify-between py-1"><span className="text-[#8b949e] text-[14px]">Tax (GCT 15%)</span><span className="text-[#8b949e] text-[14px] font-extrabold">{fmt(tax)}</span></div>
          <div className="flex justify-between py-2 border-t-2 border-white/10"><span className="text-white text-[16px] font-extrabold">Grand Total with Tax</span><span className="text-white text-[1.3rem] font-black" style={{ color: "#60a5fa" }}>{fmt(totalWithTax)}</span></div>
        </div>
      </div>
      <div className="rounded-2xl p-4 mt-3" style={G.subtle}>
        <p className="text-[#8b949e] text-[12px] font-extrabold uppercase tracking-widest mb-2">Reference</p>
        <div className="flex justify-between py-1"><span className="text-[#8b949e] text-[13px]">Suggested PM (5%)</span><span className="text-[#8b949e] text-[14px] font-extrabold">{fmt(suggestedPM)}</span></div>
        <div className="flex justify-between py-1"><span className="text-[#8b949e] text-[13px]">Suggested Contingency (10%)</span><span className="text-[#8b949e] text-[14px] font-extrabold">{fmt(suggestedContingency)}</span></div>
        <p className="text-[#484f58] text-[11px] italic mt-2">Not applied to any total — informational only.</p>
      </div>
    </div>
  );
}

function AssetListTab({ quoteCategories, exchangeRate, fmt, onLineItemUpdate, fieldSaveStatus }: { quoteCategories: QuoteCategory[]; exchangeRate: number; fmt: (n: number, compact?: boolean) => string; onLineItemUpdate: (categoryId: string, itemId: string, updates: Partial<QuoteLineItem>) => void; fieldSaveStatus: Record<string, "saved" | "saving" | "">; }) {
  const [clientExportMode, setClientExportMode] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const toggleCollapse = (id: string) => { setCollapsedCategories(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }); };

  // Project-asset rows are read from the same real QuoteLineItem data every other Workbook
  // tab reads (tagged via projectAssetId when Project Assets syncs), not a separate in-memory
  // preview computed straight from projectAssets — so this can never drift from Cost & Margin,
  // BOM, or Synthesis.
  const allItems = useMemo(() => {
    const items: AssetListItem[] = [];
    quoteCategories.forEach(cat => {
      cat.lineItems.filter(li => li.quantity > 0).forEach(li => {
        const r = recalcLineItem(li, exchangeRate);
        items.push({ id: li.id, item: li.description, qty: li.quantity, cost: li.unitCost, markupPercent: li.markupPercent, sell: r.sellPrice, costTotal: r.costTotal, total: r.sellTotal, profit: r.profit, isProjectAsset: !!li.projectAssetId, system: cat.system, sourceCategory: cat.name, sourceItemId: li.id });
      });
    });
    return items;
  }, [quoteCategories, exchangeRate]);
  const assetItems = allItems.filter(i => i.isProjectAsset);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2"><button onClick={() => setClientExportMode(!clientExportMode)} className={clsx("h-9 md:h-7 px-3 rounded-lg text-[12px] font-bold cursor-pointer", clientExportMode ? "text-white" : "text-[#8b949e]")} style={clientExportMode ? { background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.30)" } : G.btn}><EyeOff className="w-3 h-3 mr-1" />{clientExportMode ? "Client View" : "Internal View"}</button></div>
      {assetItems.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={G.card}>
          <div className="w-full px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}><div className="flex items-center gap-2"><h3 className="text-white text-[15px] font-extrabold">Project Assets</h3><span className="text-[#8b949e] text-[12px]">({assetItems.length})</span></div></div>
          <div className="overflow-x-auto"><table className="w-full" style={{ minWidth: clientExportMode ? "400px" : "800px" }}><thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-left">Item</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-center">QTY</th>{!clientExportMode && <><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Cost</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Markup %</th></>}<th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Sell</th>{!clientExportMode && <th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Cost Total</th>}<th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Total</th>{!clientExportMode && <th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Profit</th>}</tr></thead><tbody>{assetItems.map(item => (<tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}><td className="px-3 py-2.5 text-white text-[13px] font-bold">{item.item}</td><td className="px-3 py-2.5 text-white text-[13px] text-center">{item.qty}</td>{!clientExportMode && <><td className="px-3 py-2.5 text-[#8b949e] text-[13px] text-right">{fmt(item.cost)}</td><td className="px-3 py-2.5 text-[#8b949e] text-[13px] text-right">{(item.markupPercent * 100).toFixed(0)}%</td></>}<td className="px-3 py-2.5 text-white text-[13px] font-extrabold text-right">{fmt(item.sell)}</td>{!clientExportMode && <td className="px-3 py-2.5 text-[#8b949e] text-[13px] text-right">{fmt(item.costTotal)}</td>}<td className="px-3 py-2.5 text-white text-[13px] font-extrabold text-right">{fmt(item.total)}</td>{!clientExportMode && <td className="px-3 py-2.5 text-[12px] font-extrabold text-right" style={{ color: item.profit >= 0 ? "#34d399" : "#f87171" }}>{fmt(item.profit)}</td>}</tr>))}</tbody></table></div>
        </div>
      )}
      {quoteCategories.filter(c => !c.name.includes("Importation")).map(category => {
        const isCollapsed = collapsedCategories.has(category.id);
        const items = allItems.filter(i => i.sourceCategory === category.name && !i.isProjectAsset);
        if (items.length === 0) return null;
        return (
          <div key={category.id} className="rounded-2xl overflow-hidden" style={G.card}>
            <button onClick={() => toggleCollapse(category.id)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer" style={{ borderBottom: isCollapsed ? "none" : "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center gap-2"><h3 className="text-white text-[15px] font-extrabold">{category.name}</h3><span className="text-[#8b949e] text-[12px]">({items.length})</span><span className="text-[#484f58] text-[11px] font-mono">[{category.system}]</span></div>
              <div className="flex items-center gap-3"><span className="text-[#8b949e] text-[13px] font-extrabold">{fmt(items.reduce((s,i) => s + i.total, 0))}</span>{isCollapsed ? <ChevronDown className="w-4 h-4 text-[#8b949e]" /> : <ChevronUp className="w-4 h-4 text-[#8b949e]" />}</div>
            </button>
            {!isCollapsed && <div className="overflow-x-auto"><table className="w-full" style={{ minWidth: clientExportMode ? "400px" : "800px" }}><thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-left">Item</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-center">QTY</th>{!clientExportMode && <><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Cost</th><th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Markup %</th></>}<th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Sell</th>{!clientExportMode && <th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Cost Total</th>}<th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Total</th>{!clientExportMode && <th className="px-3 py-2.5 text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest text-right">Profit</th>}</tr></thead><tbody>{items.map(item => (<tr key={item.id} className="hover:bg-white/[0.02]" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}><td className="px-3 py-2.5"><InlineEditCell value={item.item} onChange={(val) => { if (item.sourceCategory && item.sourceItemId) { const cat = quoteCategories.find(c => c.name === item.sourceCategory); if (cat) onLineItemUpdate(cat.id, item.sourceItemId!, { description: val }); } }} /></td><td className="px-3 py-2.5"><InlineEditCell type="number" value={item.qty} onChange={(val) => { if (item.sourceCategory && item.sourceItemId) { const cat = quoteCategories.find(c => c.name === item.sourceCategory); if (cat) onLineItemUpdate(cat.id, item.sourceItemId!, { quantity: parseInt(val) || 0 }); } }} /></td>{!clientExportMode && <><td className="px-3 py-2.5"><InlineEditCell type="number" value={item.cost} onChange={(val) => { if (item.sourceCategory && item.sourceItemId) { const cat = quoteCategories.find(c => c.name === item.sourceCategory); if (cat) onLineItemUpdate(cat.id, item.sourceItemId!, { unitCost: parseFloat(val) || 0 }); } }} /></td><td className="px-3 py-2.5 text-[#8b949e] text-[13px] text-right">{(item.markupPercent * 100).toFixed(0)}%</td></>}<td className="px-3 py-2.5 text-white text-[13px] font-extrabold text-right">{fmt(item.sell)}</td>{!clientExportMode && <td className="px-3 py-2.5 text-[#8b949e] text-[13px] text-right">{fmt(item.costTotal)}</td>}<td className="px-3 py-2.5 text-white text-[13px] font-extrabold text-right">{fmt(item.total)}</td>{!clientExportMode && <td className="px-3 py-2.5 text-[12px] font-extrabold text-right" style={{ color: item.profit >= 0 ? "#34d399" : "#f87171" }}>{fmt(item.profit)}</td>}</tr>))}</tbody></table></div>}
          </div>
        );
      })}
    </div>
  );
}
function ProposalGeneratorModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string; }) {
  const { fmt } = useCurrency();
  const [generating, setGenerating] = useState(false);
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await API.proposals.generate(projectId);
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 18;
      const ensureRoom = (needed: number) => { if (y + needed > pageHeight - 16) { doc.addPage(); y = 18; } };

      doc.setFontSize(18); doc.text("Project Proposal", 14, y); y += 8;
      doc.setFontSize(11); doc.text(`${data.project.name} — ${data.project.client}`, 14, y); y += 6;
      if (data.project.location) { doc.setFontSize(10); doc.text(data.project.location, 14, y); y += 6; }
      doc.setFontSize(9); doc.setTextColor(120); doc.text(`Generated ${new Date(data.generatedAt).toLocaleDateString()}`, 14, y); doc.setTextColor(0); y += 8;
      if (data.project.summary) { doc.setFontSize(10); const lines = doc.splitTextToSize(data.project.summary, 180); doc.text(lines, 14, y); y += lines.length * 5 + 4; }

      data.categories.forEach(cat => {
        ensureRoom(16);
        doc.setFontSize(12); doc.text(`${cat.sectionNumber} — ${cat.name}`, 14, y); y += 6;
        doc.setFontSize(9);
        cat.items.forEach(item => {
          ensureRoom(6);
          doc.text(item.description, 16, y);
          doc.text(`×${item.quantity}`, 130, y);
          doc.text(fmt(item.total), 196, y, { align: "right" });
          y += 5;
        });
        y += 3;
      });

      ensureRoom(24);
      doc.setFontSize(11);
      doc.text("Grand Total", 130, y); doc.text(fmt(data.grandTotal), 196, y, { align: "right" }); y += 6;
      doc.text("GCT (15%)", 130, y); doc.text(fmt(data.gctAmount), 196, y, { align: "right" }); y += 6;
      doc.setFontSize(13);
      doc.text("Total", 130, y); doc.text(fmt(data.grandTotalWithTax), 196, y, { align: "right" });

      doc.save(`${data.project.name.replace(/\s+/g, "-")}-proposal.pdf`);
      toast.success("Proposal generated");
      onClose();
    } catch { toast.error("Failed to generate proposal"); }
    finally { setGenerating(false); }
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={e => e.stopPropagation()} className="relative z-10 w-full max-w-[480px] rounded-2xl p-6" style={G.liquidGlass}>
        <h3 className="text-white text-[16px] font-extrabold mb-2">Generate Proposal</h3>
        <p className="text-[#8b949e] text-[13px] mb-4">Creates a formatted PDF with project scope, device list, pricing summary, company boilerplate, and terms.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
          <button onClick={handleGenerate} disabled={generating} className="flex-1 h-10 rounded-xl text-white text-[14px] font-extrabold cursor-pointer flex items-center justify-center gap-2" style={{ background: "#3b82f6" }}>{generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}{generating ? "Generating..." : "Generate PDF"}</button>
        </div>
      </motion.div>
    </div>
  );
}

function Workbook({ navigate }: { navigate: (p: Page) => void }) {
  const { fmt } = useCurrency();
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => localStorage.getItem("wb_last_project") || "");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [showProjectSelect, setShowProjectSelect] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(parseFloat(localStorage.getItem("fx_rate") || String(DEFAULT_EXCHANGE_RATE)));
  const [activeTab, setActiveTab] = useState<WorkbookTab>(() => (localStorage.getItem("wb_tab") as WorkbookTab) || "asset-list");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "">("saved");
  const [projectAssets, setProjectAssets] = useState<ProjectAsset[]>([]);
  const [storeDevices, setStoreDevices] = useState<CatalogDevice[]>([]);
  const [fieldSaveStatus, setFieldSaveStatus] = useState<Record<string, "saved" | "saving" | "">>({});
  const [synthesisOverrides, setSynthesisOverrides] = useState<SynthesisOverride[]>([]);
  const [workbookAudit, setWorkbookAudit] = useState<WorkbookAuditEntry[]>([]);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [overrideConflict, setOverrideConflict] = useState<{ sectionNumber: string; sectionName: string; pendingCallback: (() => void) | null } | null>(null);
  const [systemFilter, setSystemFilter] = useState<SystemType>("VSS");

  useEffect(() => { localStorage.setItem("wb_tab", activeTab); }, [activeTab]);
  useEffect(() => { API.fx.getRate().then(r => setExchangeRate(r)); }, []);
  useEffect(() => { API.devices.list().then(setStoreDevices).catch(() => setStoreDevices([])); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projData, quoteData] = await Promise.all([API.projects.list(), API.quotes.list()]);
      setProjects(projData);
      setQuotes(quoteData);
      const lastId = localStorage.getItem("wb_last_project");
      const pid = lastId && projData.find(p => p.id === lastId) ? lastId : projData[0]?.id || "";
      if (pid && !selectedProjectId) {
        setSelectedProjectId(pid);
        const pq = quoteData.find((q: Quote) => q.projectId === pid);
        if (pq) setSelectedQuoteId(pq.id);
      }
    } catch { setProjects([]); setQuotes([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (!selectedProjectId && projects.length > 0) { setShowProjectSelect(true); } }, [projects, selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem("wb_last_project", selectedProjectId);
      API.projectAssets.list(selectedProjectId).then(setProjectAssets).catch(() => setProjectAssets([]));
      API.workbook.getOverrides(selectedProjectId).then(setSynthesisOverrides).catch(() => setSynthesisOverrides([]));
      API.workbook.getAudit(selectedProjectId).then(setWorkbookAudit).catch(() => setWorkbookAudit([]));
    }
  }, [selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedQuote = quotes.find((q) => q.id === selectedQuoteId);
  useEffect(() => { if (selectedProjectId && !selectedQuoteId) { const pq = quotes.find((q) => q.projectId === selectedProjectId); if (pq) setSelectedQuoteId(pq.id); } }, [selectedProjectId, quotes, selectedQuoteId]);
  const quoteCategories = selectedQuote?.categories || [];

  const autoSave = useCallback(async (q: Quote) => { setSaveStatus("saving"); try { await API.quotes.update(q.id, { categories: q.categories, exchangeRate }); setTimeout(() => setSaveStatus("saved"), 800); } catch { setSaveStatus("saved"); } }, [exchangeRate]);

  const updateQuoteLineItem = (categoryId: string, itemId: string, updates: Partial<QuoteLineItem>) => {
    const fieldKey = `li-${categoryId}-${itemId}`;
    setFieldSaveStatus(prev => ({ ...prev, [fieldKey]: "saving" }));
    setQuotes((prev) => prev.map((q) => {
      if (q.id !== selectedQuoteId) return q;
      const updated = { ...q, categories: q.categories.map((cat) => cat.id !== categoryId ? cat : { ...cat, lineItems: cat.lineItems.map((li) => li.id === itemId ? recalcLineItem({ ...li, ...updates }, exchangeRate) : li) }) };
      autoSave(updated);
      return updated;
    }));
    setTimeout(() => setFieldSaveStatus(prev => ({ ...prev, [fieldKey]: "saved" })), 600);
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

  const handleSaveOverride = async (sectionNumber: string, value: number | null, isOverridden: boolean) => {
    const fieldKey = `synth-${sectionNumber}`;
    setFieldSaveStatus(prev => ({ ...prev, [fieldKey]: "saving" }));
    try {
      await API.workbook.saveOverrides(selectedProjectId, [{ projectId: selectedProjectId, sectionNumber, overrideValue: value, isOverridden, overriddenBy: CURRENT_USER.name }]);
      setSynthesisOverrides(prev => {
        const existing = prev.findIndex(o => o.sectionNumber === sectionNumber);
        if (existing >= 0) { const updated = [...prev]; updated[existing] = { ...updated[existing], overrideValue: value, isOverridden, overriddenBy: CURRENT_USER.name }; return updated; }
        return [...prev, { id: crypto.randomUUID?.() || `ovr${Date.now()}`, projectId: selectedProjectId, sectionNumber, overrideValue: value, isOverridden, overriddenBy: CURRENT_USER.name, overriddenAt: new Date().toISOString() }];
      });
      setTimeout(() => setFieldSaveStatus(prev => ({ ...prev, [fieldKey]: "saved" })), 600);
    } catch { setFieldSaveStatus(prev => ({ ...prev, [fieldKey]: "" })); }
  };

  const handleBomEditWithOverride = (sectionNumber: string, sectionName: string, callback: () => void) => {
    const override = synthesisOverrides.find(o => o.sectionNumber === sectionNumber && o.isOverridden);
    if (override) { setOverrideConflict({ sectionNumber, sectionName, pendingCallback: callback }); } else { callback(); }
  };

  const wbTabs = [
    { id: "asset-list" as WorkbookTab, label: "Asset List", description: "Every camera, access point, network device, and cable run pulled from Project Assets plus any manually added line items." },
    { id: "cost-margin" as WorkbookTab, label: "Cost & Margin", description: "Set unit cost and markup per line item to see sell price and profit before it rolls up into the quote." },
    { id: "bom" as WorkbookTab, label: "BOM", description: "The bill of materials grouped by section, with import costs applied — this is what becomes the client-facing quote." },
    { id: "synthesis" as WorkbookTab, label: "Synthesis", description: "Section subtotals across Video, Access, and Intercom rolled up into a grand total with tax — override any section if needed." },
  ];
  const activeTabIndex = wbTabs.findIndex(t => t.id === activeTab);

  const workbookTotals = useMemo(() => {
    let totalCost = 0, totalSell = 0;
    projectAssets.forEach(asset => {
      const unitCost = assetUnitCost(asset, storeDevices);
      totalCost += unitCost * asset.quantity;
      totalSell += unitCost * 1.35 * asset.quantity;
    });
    quoteCategories.forEach(cat => {
      cat.lineItems.filter(li => li.quantity > 0).forEach(li => {
        const r = recalcLineItem(li, exchangeRate);
        totalCost += r.costTotal;
        totalSell += r.sellTotal;
      });
    });
    const totalProfit = totalSell - totalCost;
    return { totalCost, totalSell, blendedMargin: totalSell > 0 ? (totalProfit / totalSell) * 100 : 0 };
  }, [projectAssets, storeDevices, quoteCategories, exchangeRate]);

  if (loading) return (<div className="px-3 md:px-5 py-4 md:py-6 space-y-4"><Skeleton className="h-10 w-48" /><div className="flex gap-2"><Skeleton className="h-8 w-24 rounded-lg" /><Skeleton className="h-8 w-24 rounded-lg" /><Skeleton className="h-8 w-24 rounded-lg" /><Skeleton className="h-8 w-24 rounded-lg" /></div><Skeleton className="h-64 rounded-2xl" /></div>);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">
      {overrideConflict && <OverrideConflictModal open={true} sectionName={overrideConflict.sectionName} onUpdateOverride={() => { overrideConflict.pendingCallback?.(); handleSaveOverride(overrideConflict.sectionNumber, null, false); setOverrideConflict(null); }} onKeepOverride={() => { overrideConflict.pendingCallback?.(); setOverrideConflict(null); }} onCancel={() => setOverrideConflict(null)} />}
      {showProjectSelect && <SelectProjectModal onClose={() => setShowProjectSelect(false)} onSelect={(id: string) => { setSelectedProjectId(id); setShowProjectSelect(false); }} currentId={selectedProjectId} projects={projects} />}
      {showProposalModal && <ProposalGeneratorModal open={true} onClose={() => setShowProposalModal(false)} projectId={selectedProjectId} />}
      <div className="px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between flex-shrink-0 gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div>
          <h1 className="text-white font-extrabold text-2xl md:text-3xl tracking-tight">Workbook</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <button onClick={() => setShowProjectSelect(true)} className="flex items-center gap-1.5 text-[#8b949e] hover:text-white text-[13px] font-bold cursor-pointer" style={{ ...G.btn, padding: "4px 10px", borderRadius: "8px" }}><Building2 className="w-3 h-3" />{selectedProject ? selectedProject.name : "Select project"}<ChevronDown className="w-3 h-3" /></button>
            {selectedQuote && <span className="text-[12px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/12 text-amber-400">{selectedQuote.refNumber} · {selectedQuote.status}</span>}
            {saveStatus === "saving" && <span className="text-[12px] text-[#8b949e] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
            {saveStatus === "saved" && <span className="text-[12px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Saved</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl" style={G.subtle}><span className="text-[#8b949e] text-[12px] font-extrabold uppercase">FX Rate</span><span className="text-white text-[14px] font-extrabold">J$ {exchangeRate.toFixed(2)}</span></div>
          <button onClick={() => setShowProposalModal(true)} className="flex items-center gap-1.5 h-9 md:h-7 px-3 rounded-lg text-white text-[12px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}><FileDown className="w-3 h-3" /> Proposal</button>
        </div>
      </div>
      {!selectedQuote && projectAssets.length === 0 ? (
        <div className="flex-1 flex items-center justify-center"><EmptyState icon={DollarSign} title="No workbook" description="Select a project to view its workbook." action={{ label: "Select Project", onClick: () => setShowProjectSelect(true) }} /></div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 md:px-6 pt-3 flex-shrink-0">
            <SummaryBar totalCost={workbookTotals.totalCost} totalSell={workbookTotals.totalSell} blendedMargin={workbookTotals.blendedMargin} fmt={fmt} />
          </div>
          <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", scrollbarWidth: "none" }}>
            {wbTabs.map((tab, i) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={clsx("flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-bold whitespace-nowrap cursor-pointer", activeTab === tab.id ? "text-white" : "text-[#8b949e] hover:text-white")} style={activeTab === tab.id ? { background: "rgba(59,130,246,0.20)", border: "1px solid rgba(59,130,246,0.30)" } : undefined}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0" style={{ background: activeTab === tab.id ? "#3b82f6" : "rgba(255,255,255,0.08)", color: activeTab === tab.id ? "#fff" : "#8b949e" }}>{i + 1}</span>
                {tab.label}
              </button>
            ))}
          </div>
          <p className="px-4 md:px-6 pt-2.5 pb-1 text-[#8b949e] text-[12px] md:text-[13px] flex-shrink-0">{wbTabs[activeTabIndex]?.description}</p>
          <div className="flex-1 overflow-y-auto px-3 md:px-5 py-4 space-y-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
            {activeTab === "asset-list" && <AssetListTab quoteCategories={quoteCategories} exchangeRate={exchangeRate} fmt={fmt} onLineItemUpdate={updateQuoteLineItem} fieldSaveStatus={fieldSaveStatus} />}
            {activeTab === "cost-margin" && <CostMarginTab quoteCategories={quoteCategories} exchangeRate={exchangeRate} fmt={fmt} onLineItemUpdate={updateQuoteLineItem} fieldSaveStatus={fieldSaveStatus} systemFilter={systemFilter} onSystemFilterChange={setSystemFilter} />}
            {activeTab === "bom" && <BomTab quoteCategories={quoteCategories} synthesisOverrides={synthesisOverrides} exchangeRate={exchangeRate} fmt={fmt} onLineItemUpdate={updateQuoteLineItem} onAddLineItem={addLineItem} onBomEditWithOverride={handleBomEditWithOverride} fieldSaveStatus={fieldSaveStatus} systemFilter={systemFilter} onSystemFilterChange={setSystemFilter} />}
            {activeTab === "synthesis" && <SynthesisTab quoteCategories={quoteCategories} synthesisOverrides={synthesisOverrides} exchangeRate={exchangeRate} fmt={fmt} onSaveOverride={handleSaveOverride} fieldSaveStatus={fieldSaveStatus} />}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
              {activeTabIndex > 0 ? (
                <button onClick={() => setActiveTab(wbTabs[activeTabIndex - 1].id)} className="flex items-center gap-1.5 h-10 md:h-9 px-4 rounded-xl text-[#8b949e] hover:text-white text-[13px] font-bold cursor-pointer" style={G.btn}><ChevronLeft className="w-3.5 h-3.5" /> {wbTabs[activeTabIndex - 1].label}</button>
              ) : <span />}
              {activeTabIndex < wbTabs.length - 1 && (
                <button onClick={() => setActiveTab(wbTabs[activeTabIndex + 1].id)} className="flex items-center gap-1.5 h-10 md:h-9 px-4 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}>Next: {wbTabs[activeTabIndex + 1].label} <ChevronRight className="w-3.5 h-3.5" /></button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CAT_COLOR_DS: Record<string, { bg: string; text: string; label: string }> = {
  camera: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", label: "Camera" },
  "access-control": { bg: "rgba(139,92,246,0.12)", text: "#a78bfa", label: "Access" },
  nvr: { bg: "rgba(16,185,129,0.12)", text: "#34d399", label: "NVR" },
  analytics: { bg: "rgba(249,115,22,0.12)", text: "#fb923c", label: "VMS" },
  intercom: { bg: "rgba(20,184,166,0.12)", text: "#2dd4bf", label: "Intercom" },
  other: { bg: "rgba(100,100,100,0.12)", text: "#8b949e", label: "Other" },
};

function DeviceSpecModal({ device, onClose }: { device: CatalogDevice; onClose: () => void }) {
  const { addToQuote } = useQuote();
  const { fmt } = useCurrency();
  const cc = CAT_COLOR_DS[device.category] ?? CAT_COLOR_DS.other;
  const specs: { label: string; value?: string }[] = [
    { label: "SKU", value: device.sku },
    { label: "Category", value: cc.label },
    { label: "System", value: device.system },
    { label: "Camera Type", value: device.cameraType },
    { label: "Resolution", value: device.resolution },
    { label: "Sensor", value: device.sensor },
    { label: "Lens", value: device.lens },
    { label: "Frame Rate", value: device.frameRate },
    { label: "Compression", value: device.compression },
    { label: "FOV", value: device.fov },
    { label: "Night Vision", value: device.nightVision },
    { label: "Weather Rating", value: device.weatherRating },
    { label: "Power Input", value: device.powerInput },
    { label: "Storage", value: device.storage },
    { label: "Operating Temp", value: device.operatingTemp },
    { label: "Authentication", value: device.authentication },
    { label: "Channels", value: device.channels },
    { label: "Readers", value: device.readers },
  ].filter((s) => !!s.value);
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93, y: 18 }} transition={{ type: "spring", damping: 26, stiffness: 340 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[780px] max-h-[90vh] overflow-y-auto rounded-3xl flex flex-col md:flex-row" style={{ background: "rgba(7,12,26,0.95)", backdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 40px 100px rgba(0,0,0,0.95)" }}>
        <div className="w-full md:w-56 flex-shrink-0 relative flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)", minHeight: "250px" }}>
          {device.imageUrl ? <img src={device.imageUrl} alt={device.model} className="w-full h-full object-contain p-4" style={{ maxHeight: "320px" }} /> : <div className="w-full h-full flex items-center justify-center"><Camera className="w-16 h-16 text-[#8b949e]" /></div>}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5">
            <span className="inline-block px-2 py-0.5 rounded-lg text-[12px] font-extrabold uppercase" style={{ background: cc.bg, color: cc.text }}>{cc.label}</span>
            {device.cameraType && <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-extrabold uppercase" style={{ background: "rgba(255,255,255,0.08)", color: "#e6edf3" }}>{device.cameraType}</span>}
            {device.tags?.map((tag) => { const ts = TAG_STYLES[tag]; return ts ? <span key={tag} className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-extrabold uppercase" style={{ background: ts.bg, color: ts.text, border: `1px solid ${ts.border}` }}>{tag}</span> : null; })}
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 md:px-6 pt-5 md:pt-6 pb-4 flex items-start justify-between flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div><p className="text-[#8b949e] text-[13px] font-bold">{device.manufacturer}</p><h2 className="text-white text-[1.3rem] font-extrabold mt-0.5">{device.model}</h2>{device.price && <p className="text-[1.1rem] font-extrabold mt-1" style={{ color: cc.text }}>{fmt(device.price)} <span className="text-[#8b949e] text-[12px] font-medium">/ unit</span></p>}</div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer min-w-[44px] min-h-[44px]" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><X className="w-4 h-4 text-[#8b949e]" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 md:px-6 py-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">{specs.map((s) => (<div key={s.label} className="rounded-xl p-3" style={G.subtle}><p className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest mb-1">{s.label}</p><p className="text-white text-[13px] font-bold">{s.value}</p></div>))}</div></div>
          <div className="px-5 md:px-6 py-4 flex items-center gap-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}><button onClick={() => { addToQuote(device); onClose(); }} className="flex items-center gap-2 h-9 px-4 rounded-xl text-white text-[13px] font-extrabold cursor-pointer min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}><Plus className="w-3.5 h-3.5" /> Add to Quote</button></div>
        </div>
      </motion.div>
    </div>
  );
}

function DeviceLibrary({ navigate: _navigate }: { navigate: (p: Page) => void }) {
  const [activeTab, setActiveTab] = useState<DeviceLibraryTab>("store");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [systemFilter, setSystemFilter] = useState<SystemType | "all">("all");
  const [selectedDevice, setSelectedDevice] = useState<CatalogDevice | null>(null);
  const [devices, setDevices] = useState<CatalogDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const { fmt } = useCurrency();
  const [csvUploading, setCsvUploading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [invName, setInvName] = useState("");
  const [invQty, setInvQty] = useState("");
  const [invLocation, setInvLocation] = useState("");
  const [showTransaction, setShowTransaction] = useState<string | null>(null);
  const [txUserName, setTxUserName] = useState("");
  const [txAction, setTxAction] = useState("Sold");
  const [txQty, setTxQty] = useState("");
  const [txPurpose, setTxPurpose] = useState("");
  const [txNotes, setTxNotes] = useState("");

  const fetchDevices = useCallback(async () => { setLoading(true); try { const data = await API.devices.list(); setDevices(data); } catch { setDevices([]); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const fetchInventory = useCallback(async () => { try { const [items, txs] = await Promise.all([API.inventory.items(), API.inventory.transactions()]); setInventory(items); setTransactions(txs); } catch { setInventory([]); setTransactions([]); } }, []);
  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setCsvUploading(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      const headers = lines[0].split(",").map(h => h.trim().replace(/"/g,""));
      const VALID_CATEGORIES: CatalogDevice["category"][] = ["camera", "access-control", "nvr", "analytics", "intercom", "other", "switch", "poe-injector", "patch-panel", "rack", "ups"];
      const parseCategory = (raw: string | undefined): CatalogDevice["category"] => {
        const normalized = (raw || "").trim().toLowerCase().replace(/\s+/g, "-");
        return (VALID_CATEGORIES.find(c => c === normalized) || "other") as CatalogDevice["category"];
      };
      const parsed = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim().replace(/"/g,""));
        const obj: any = {};
        headers.forEach((h,i) => { obj[h] = vals[i]; });
        return { model: obj.Model||obj.model||"", manufacturer: obj.Manufacturer||obj.manufacturer||"Unknown", category: parseCategory(obj.Category||obj.category), system: (obj.System as SystemType) || "VSS", cameraType: obj["Camera Type"]||undefined, resolution: obj["Max Video Resolution"]||undefined, lens: obj["Sensor/Lens/Horizontal FOV"]||undefined, price: parseFloat(obj.Price||"0")||undefined, sku: obj.SKU||obj.Model||undefined, imageUrl: obj["Image URL"]||obj.Image||undefined, tags: [] as DeviceTag[] };
      });
      if (parsed.length > 0) { await API.devices.bulk(parsed); toast.success(`Imported ${parsed.length} devices`); fetchDevices(); }
    } catch { toast.error("CSV import failed"); }
    finally { setCsvUploading(false); e.target.value = ""; }
  };

  const handleAddInventoryItem = async () => {
    if (!invName.trim()) return;
    try { await API.inventory.createItem({ name: invName.trim(), quantityOnHand: parseInt(invQty) || 0, location: invLocation.trim() || undefined }); fetchInventory(); setInvName(""); setInvQty(""); setInvLocation(""); setShowAddItem(false); toast.success("Item added"); } catch { toast.error("Failed to add item"); }
  };

  const handleAddTransaction = async (itemId: string) => {
    if (!txUserName.trim() || !txQty) return;
    try { await API.inventory.createTransaction({ itemId, userName: txUserName.trim(), action: txAction, quantity: parseInt(txQty), purpose: txPurpose.trim() || undefined, notes: txNotes.trim() || undefined }); fetchInventory(); setShowTransaction(null); setTxUserName(""); setTxQty(""); setTxPurpose(""); setTxNotes(""); toast.success("Transaction logged"); } catch { toast.error("Failed to log transaction"); }
  };

  const categories: { id: string; label: string }[] = [{ id: "all", label: "All" },{ id: "camera", label: "Cameras" },{ id: "access-control", label: "Access" },{ id: "nvr", label: "NVR" },{ id: "analytics", label: "VMS" },{ id: "intercom", label: "Intercom" }];
  const filtered = useMemo(() => {
    let result = devices;
    if (categoryFilter !== "all") result = result.filter((d) => d.category === categoryFilter);
    if (systemFilter !== "all") result = result.filter((d) => d.system === systemFilter);
    if (search.trim()) { const q = search.toLowerCase(); result = result.filter((d) => d.model.toLowerCase().includes(q) || d.manufacturer.toLowerCase().includes(q) || (d.sku??"").toLowerCase().includes(q) || (d.tags??[]).some(t=>t.toLowerCase().includes(q))); }
    return result;
  }, [devices, search, categoryFilter, systemFilter]);

  return (
    <div className="px-3 md:px-5 py-4 md:py-6">
      {selectedDevice && <DeviceSpecModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div><h1 className="text-white font-extrabold text-2xl md:text-3xl tracking-tight">Device Library</h1><p className="text-[#8b949e] text-[13px] mt-0.5">{activeTab === "store" ? `${filtered.length} products` : `${inventory.length} inventory items`}</p></div>
        <div className="flex items-center h-8 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <button onClick={() => setActiveTab("store")} className="h-full px-3 text-[12px] font-extrabold cursor-pointer" style={activeTab === "store" ? { background: "#3b82f6", color: "#fff" } : { color: "#8b949e" }}>Device Store</button>
          <button onClick={() => setActiveTab("inventory")} className="h-full px-3 text-[12px] font-extrabold cursor-pointer" style={activeTab === "inventory" ? { background: "#8b5cf6", color: "#fff" } : { color: "#8b949e" }}>Inventory</button>
        </div>
      </div>
      {activeTab === "store" ? (
        <>
          <div className="mb-4 md:mb-5 flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[160px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search model, SKU, tags…" className="h-9 rounded-xl pl-9 w-full text-[14px] text-[#e6edf3] focus:outline-none" style={G.input} /></div>
            <div className="flex gap-1.5 flex-wrap">{categories.map((c) => (<button key={c.id} onClick={() => setCategoryFilter(c.id)} className="h-8 px-2.5 rounded-xl text-[13px] font-bold cursor-pointer whitespace-nowrap" style={categoryFilter===c.id?{background:"rgba(59,130,246,0.15)",color:"#60a5fa",border:"1px solid rgba(59,130,246,0.35)"}:{...G.btn,color:"#8b949e"}}>{c.label}</button>))}</div>
            <select value={systemFilter} onChange={(e) => setSystemFilter(e.target.value as SystemType | "all")} className="h-8 rounded-xl px-2 text-[13px] cursor-pointer" style={{ ...G.btn, background: "#0d1117", color: "#e6edf3" }}>
              <option value="all" style={{ background: "#0d1117", color: "#e6edf3" }}>All Systems</option>
              <option value="VSS" style={{ background: "#0d1117", color: "#e6edf3" }}>VSS</option>
              <option value="EAC" style={{ background: "#0d1117", color: "#e6edf3" }}>EAC</option>
              <option value="Intercom" style={{ background: "#0d1117", color: "#e6edf3" }}>Intercom</option>
            </select>
            <label className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[#8b949e] text-[13px] font-bold hover:text-white cursor-pointer" style={G.btn}><Upload className="w-3.5 h-3.5" /> {csvUploading ? "Importing…" : "Import CSV"}<input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} disabled={csvUploading} /></label>
          </div>
          {devices.length === 0 ? <EmptyState icon={Store} title="Device store is empty" description="Import a CSV to populate the catalog." /> : filtered.length === 0 ? <EmptyState icon={Search} title="No devices match" description="Try adjusting filters." /> : (
            <div className="grid gap-3 md:gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {filtered.map((device) => {
                const cc = CAT_COLOR_DS[device.category] ?? CAT_COLOR_DS.other;
                return (
                  <div key={device.id} onClick={() => setSelectedDevice(device)} className="rounded-2xl overflow-hidden cursor-pointer group transition-all md:hover:-translate-y-1" style={{ ...G.card }}>
                    <div className="relative h-32 md:h-36 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                      {device.imageUrl ? <img src={device.imageUrl} alt={device.model} className="w-full h-full object-contain p-3 opacity-70 group-hover:opacity-90" /> : <div className="w-full h-full flex items-center justify-center"><Camera className="w-12 h-12 text-[#8b949e]" /></div>}
                      <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                        <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-extrabold uppercase" style={{ background: cc.bg, color: cc.text }}>{cc.label}</span>
                        {device.cameraType && <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase" style={{ background: "rgba(255,255,255,0.08)", color: "#e6edf3" }}>{device.cameraType}</span>}
                      </div>
                      <div className="absolute bottom-2 left-2"><span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase" style={{ background: "rgba(0,0,0,0.5)", color: "#e6edf3" }}>{device.system}</span></div>
                    </div>
                    <div className="p-3">
                      <p className="text-[#8b949e] text-[11px] font-bold">{device.manufacturer}</p>
                      <p className="text-white text-[14px] font-extrabold mt-0.5 truncate">{device.model}</p>
                      <div className="flex flex-wrap gap-1 mt-2">{device.tags?.slice(0,3).map((tag) => { const ts = TAG_STYLES[tag]; return ts ? <span key={tag} className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase" style={{ background: ts.bg, color: ts.text }}>{tag}</span> : null; })}</div>
                      <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}><span className="text-[#8b949e] text-[10px] font-mono">{device.sku}</span><span className="font-extrabold text-[13px]" style={{ color: cc.text }}>{device.price ? fmt(device.price) : "—"}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setShowAddItem(!showAddItem)} className="flex items-center gap-1 h-8 px-3 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#8b5cf6" }}><Plus className="w-3 h-3" /> Add Item</button>
          {showAddItem && (
            <div className="rounded-xl p-3 space-y-2" style={G.card}>
              <input value={invName} onChange={e => setInvName(e.target.value)} placeholder="Item name" className="w-full h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} />
              <input type="number" value={invQty} onChange={e => setInvQty(e.target.value)} placeholder="Quantity on hand" className="w-full h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} />
              <input value={invLocation} onChange={e => setInvLocation(e.target.value)} placeholder="Storage location" className="w-full h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} />
              <button onClick={handleAddInventoryItem} className="w-full h-8 rounded-lg text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#10b981" }}>Save</button>
            </div>
          )}
          {inventory.length === 0 && !showAddItem ? <EmptyState icon={PackageOpen} title="No inventory items" description="Add items to track physical stock." /> : (
            <div className="rounded-2xl overflow-hidden" style={G.card}>
              <div className="overflow-x-auto"><table className="w-full" style={{ minWidth: "600px" }}><thead><tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}><th className="px-3 py-3 text-[#8b949e] text-[12px] font-extrabold uppercase tracking-widest text-left">Item</th><th className="px-3 py-3 text-[#8b949e] text-[12px] font-extrabold uppercase tracking-widest text-center">Qty</th><th className="px-3 py-3 text-[#8b949e] text-[12px] font-extrabold uppercase tracking-widest text-left">Location</th><th className="px-3 py-3 text-[#8b949e] text-[12px] font-extrabold uppercase tracking-widest text-right">Action</th></tr></thead><tbody>{inventory.map((item) => (<tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}><td className="px-3 py-2.5 text-white text-[13px] font-bold">{item.name}</td><td className="px-3 py-2.5 text-white text-[13px] text-center font-extrabold">{item.quantityOnHand}</td><td className="px-3 py-2.5 text-[#8b949e] text-[12px]">{item.location || "—"}</td><td className="px-3 py-2.5 text-right"><button onClick={() => { setShowTransaction(showTransaction === item.id ? null : item.id); setTxAction("Sold"); }} className="h-7 px-2 rounded-lg text-[12px] font-extrabold text-blue-400 cursor-pointer" style={{ background: "rgba(59,130,246,0.12)" }}>Log Transaction</button></td></tr>))}</tbody></table></div>
            </div>
          )}
          {showTransaction && (
            <div className="rounded-xl p-3 space-y-2" style={G.card}>
              <div className="flex gap-2"><input value={txUserName} onChange={e => setTxUserName(e.target.value)} placeholder="Who took it" className="flex-1 h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} /><select value={txAction} onChange={e => setTxAction(e.target.value)} className="h-8 rounded-lg px-2 text-[13px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>{["Sold","Loaned","Disposed","Returned"].map(a => <option key={a} value={a} style={{ background: "#0d1117", color: "#e6edf3" }}>{a}</option>)}</select></div>
              <div className="flex gap-2"><input type="number" value={txQty} onChange={e => setTxQty(e.target.value)} placeholder="Qty" className="w-24 h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} /><input value={txPurpose} onChange={e => setTxPurpose(e.target.value)} placeholder="Purpose" className="flex-1 h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} /></div>
              <input value={txNotes} onChange={e => setTxNotes(e.target.value)} placeholder="Notes" className="w-full h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} />
              <button onClick={() => handleAddTransaction(showTransaction)} className="w-full h-8 rounded-lg text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#10b981" }}>Save Transaction</button>
            </div>
          )}
          {transactions.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={G.card}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}><h3 className="text-white text-[15px] font-extrabold">Recent Transactions</h3></div>
              <div className="overflow-x-auto"><table className="w-full" style={{ minWidth: "500px" }}><thead><tr><th className="px-3 py-2 text-[#8b949e] text-[11px] font-extrabold uppercase text-left">Item</th><th className="px-3 py-2 text-[#8b949e] text-[11px] font-extrabold uppercase text-left">User</th><th className="px-3 py-2 text-[#8b949e] text-[11px] font-extrabold uppercase text-left">Action</th><th className="px-3 py-2 text-[#8b949e] text-[11px] font-extrabold uppercase text-center">Qty</th><th className="px-3 py-2 text-[#8b949e] text-[11px] font-extrabold uppercase text-left">Date</th></tr></thead><tbody>{transactions.map(tx => (<tr key={tx.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}><td className="px-3 py-2 text-white text-[12px] font-bold">{tx.itemName}</td><td className="px-3 py-2 text-[#8b949e] text-[12px]">{tx.userName}</td><td className="px-3 py-2 text-[#8b949e] text-[12px]">{tx.action}</td><td className="px-3 py-2 text-white text-[12px] text-center">{tx.quantity}</td><td className="px-3 py-2 text-[#8b949e] text-[12px]">{new Date(tx.createdAt).toLocaleDateString()}</td></tr>))}</tbody></table></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
const STATUS_META: Record<InstallStatus, { label: string; color: string; bg: string; icon: IconType }> = {
  complete: { label: "Complete", color: "text-emerald-400", bg: "bg-emerald-500/12", icon: CheckCircle2 },
  "in-progress": { label: "In Progress", color: "text-blue-400", bg: "bg-blue-500/12", icon: Clock },
  failed: { label: "Failed", color: "text-rose-400", bg: "bg-rose-500/12", icon: AlertTriangle },
  pending: { label: "Pending", color: "text-[#8b949e]", bg: "bg-white/[0.04]", icon: AlertCircle },
};

function InstallTracker({ navigate: _navigate }: { navigate: (p: Page) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [zones, setZones] = useState<InstallZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InstallStatus | "all">("all");
  const [addTaskProjectId, setAddTaskProjectId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskDueDate, setTaskDueDate] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projData, zoneData] = await Promise.all([API.projects.list(), API.install.zones()]);
      setProjects(projData.filter((p: Project) => p.projectStage === "installation"));
      setZones(zoneData);
    } catch { setProjects([]); setZones([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (zoneId: string, deviceId: string, status: InstallStatus) => {
    setZones((prev) => prev.map((z) => z.id !== zoneId ? z : { ...z, devices: z.devices.map((d) => d.id !== deviceId ? d : { ...d, status }) }));
    try { await API.install.updateStatus(zoneId, deviceId, status); } catch {}
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
        <div><h1 className="text-white font-extrabold text-2xl md:text-3xl tracking-tight">Install Tracker</h1><p className="text-[#8b949e] text-[13px] mt-0.5">{total} devices across {zones.length} zones</p></div>
      </div>
      {projects.length === 0 && zones.length === 0 ? <EmptyState icon={CheckSquare} title="No active installs" description="Projects in Installation stage will appear here." /> : (
        <>
          <div className="rounded-2xl p-4 md:p-5 mb-4" style={G.card}>
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
          <div className="flex items-center gap-1 mb-3">
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
                <div key={project.id} className="rounded-2xl overflow-hidden" style={G.card}>
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
                      <div key={device.id} className="grid gap-2 px-3 py-3 items-center" style={{ gridTemplateColumns: "36px 2fr 1fr 120px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}><TypeIcon className="w-3.5 h-3.5 text-[#8b949e]" /></div>
                        <div className="min-w-0"><p className="text-white text-[13px] font-bold truncate">{device.name}</p><p className="text-[#8b949e] text-[11px]">{device.location}</p></div>
                        <span className="text-[#8b949e] text-[12px] truncate">{device.assignee}</span>
                        <select value={device.status} onChange={(e) => { const z = projectZones.find(z => z.devices.some(d => d.id === device.id)); if (z) updateStatus(z.id, device.id, e.target.value as InstallStatus); }} className={clsx("w-full h-7 rounded-xl border px-2 text-[12px] font-extrabold appearance-none cursor-pointer", meta.bg, meta.color)} style={{ background: "#0d1117" }}>
                          {Object.entries(STATUS_META).map(([val, m]) => (<option key={val} value={val} style={{ background: "#0d1117", color: "#e6edf3" }}>{m.label}</option>))}
                        </select>
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

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  domain_not_allowed: "Only @e-techsystemsja.com accounts can sign in to EEST.",
  state_mismatch: "Your sign-in session expired before it could complete. Please try again.",
  missing_state: "Your sign-in session expired before it could complete. Please try again.",
  missing_code: "Microsoft didn't return a sign-in code. Please try again.",
  sign_in_failed: "Something went wrong signing you in. Please try again.",
};

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const authError = useMemo(() => new URLSearchParams(window.location.search).get("auth_error"), []);
  const errorMessage = authError ? (AUTH_ERROR_MESSAGES[authError] || (authError.startsWith("microsoft_") ? "Microsoft sign-in was cancelled or denied." : "Sign-in failed. Please try again.")) : null;
  const signInWithMicrosoft = () => { setLoading(true); window.location.href = `${API_BASE}/auth/microsoft/login`; };
  return (
    <div className="h-screen flex overflow-hidden">
      <div className="hidden lg:flex w-[48%] flex-shrink-0 flex-col relative overflow-hidden" style={{ background: "#070c1a" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse 80% 60% at 10% 10%, rgba(30,64,175,0.45) 0%, transparent 65%), radial-gradient(ellipse 60% 55% at 90% 90%, rgba(88,28,135,0.35) 0%, transparent 65%)" }} />
        <div className="relative z-10 flex flex-col h-full p-8 md:p-12">
          <div className="mb-auto"><img src={logoImg} alt="E-Tech Systems" className="h-8 md:h-10 object-contain object-left" style={{ filter: "brightness(1.1)" }} /></div>
          <div className="flex flex-col justify-center flex-1 py-8">
            <span className="text-blue-400 text-[12px] md:text-[13px] font-extrabold tracking-[0.15em] uppercase mb-4 block">Security System Design & Integration Platform</span>
            <h1 className="text-white text-[2.2rem] md:text-[2.8rem] font-extrabold leading-[1.12] tracking-tight mb-4">Full-Lifecycle<br />Security Project<br /><span className="text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>Management.</span></h1>
            <p className="text-[#8b949e] text-[13px] md:text-[15px] leading-relaxed mb-8 max-w-[380px]">From New lead to New client, from Site Assessment to Final Installation. Track Leads, Design Site Plans, Build Financial Workbooks, Manage Installations, and Auto-Generate Reports in One Platform.</p>
            <div className="space-y-2">
              {[
                { icon: Camera, title: "Projects", desc: "Browse every project by stage and owner, then drill in for its Project Assets, Workbook, and Install Tracker", color: "#3b82f6" },
                { icon: BarChart3, title: "Sales & Tech Pipeline Tracker", desc: "Track Leads, Manage Tech Projects, Generate Workbooks and Reports", color: "#8b5cf6" },
              ].map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="flex items-start gap-3 p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}><Icon className="w-4 h-4" style={{ color }} /></div>
                  <div><p className="text-white text-[14px] font-extrabold mb-0.5">{title}</p><p className="text-[#8b949e] text-[13px]">{desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[#8b949e] text-[12px]">© 2026 E-Tech Systems Limited</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 relative" style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(40px)" }}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="relative z-10 w-full max-w-[380px]">
          <div className="rounded-3xl p-6 md:p-8" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(40px) saturate(160%)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
            <h2 className="text-white text-[1.5rem] md:text-[1.7rem] font-extrabold mb-1">Welcome back</h2>
            <p className="text-[#8b949e] text-[14px] mb-6">Sign in with your E-Tech Systems Microsoft account</p>
            {errorMessage && <div className="mb-5 px-3 py-2.5 rounded-xl text-[13px] text-rose-300" style={{ background: "rgba(244,63,94,0.10)", border: "1px solid rgba(244,63,94,0.25)" }}>{errorMessage}</div>}
            <button onClick={signInWithMicrosoft} disabled={loading} className="w-full flex items-center justify-center gap-3 h-11 rounded-2xl text-white text-[14px] font-extrabold transition-all hover:bg-white/[0.12] cursor-pointer min-h-[44px] disabled:opacity-60" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg width="20" height="20" viewBox="0 0 21 21" fill="none"><rect width="10" height="10" fill="#f25022" /><rect x="11" width="10" height="10" fill="#7fba00" /><rect y="11" width="10" height="10" fill="#00a4ef" /><rect x="11" y="11" width="10" height="10" fill="#ffb900" /></svg>}
              {loading ? "Redirecting to Microsoft…" : "Sign in with Microsoft"}
            </button>
            <p className="text-[#484f58] text-[12px] mt-5 text-center">Restricted to @e-techsystemsja.com accounts.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
function SubcontractorPortal({ token }: { token: string }) {
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
                      <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/[0.04] transition-colors">
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

export default function App() {
  const portalMatch = window.location.pathname.match(/^\/portal\/subcontractor\/([^/]+)/);
  if (portalMatch) return <SubcontractorPortal token={portalMatch[1]} />;

  // Completes the Microsoft OAuth redirect: the server hands the session token back
  // in the URL fragment (never sent to a server on the next request) rather than a
  // query param, so pick it up here before AuthenticatedApp's initial state reads localStorage.
  if (window.location.hash.startsWith("#auth_token=")) {
    const token = decodeURIComponent(window.location.hash.slice("#auth_token=".length));
    localStorage.setItem("auth_token", token);
    localStorage.setItem("app_logged_in", "true");
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const [page, setPage] = useState<Page>(() => {
    const saved = localStorage.getItem("app_page");
    const loggedIn = localStorage.getItem("auth_token") || localStorage.getItem("app_logged_in");
    return loggedIn ? ((saved as Page) || "dashboard") : "login";
  });
  const [currency, setCurrency] = useState<"USD" | "JMD">("USD");
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const onboardingKey = useMemo(() => `onboarding_complete:${getSessionEmail() || "local"}`, []);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem(onboardingKey));
  const [showTour, setShowTour] = useState(false);
  const finishTour = () => { setShowTour(false); localStorage.setItem(onboardingKey, "true"); };

  useEffect(() => { if (page !== "login") localStorage.setItem("app_page", page); }, [page]);
  useEffect(() => { API.fx.getRate(); const interval = setInterval(() => API.fx.getRate(), 24 * 60 * 60 * 1000); return () => clearInterval(interval); }, []);

  const currencyCtx: CurrencyCtx = useMemo(() => ({ currency, setCurrency, fmt: makeFmt(currency) }), [currency]);

  const addToQuote = (device: CatalogDevice) => {
    const price = device.price;
    if (!price || !currentQuote) return;
    setCurrentQuote((prev) => {
      if (!prev) return prev;
      const firstCat = prev.categories[0];
      if (!firstCat) return prev;
      const sellPrice = price * 1.35;
      const newItem: QuoteLineItem = {
        id: crypto.randomUUID?.() || `li${Date.now()}`,
        itemNumber: String(firstCat.lineItems.length + 1).padStart(2, "0"),
        description: `${device.manufacturer} ${device.model}`,
        unitCost: price,
        quantity: 1,
        markupPercent: 0.35,
        sellPrice,
        costTotal: price,
        sellTotal: sellPrice,
        profit: sellPrice - price,
        jmdConversion: sellPrice * (parseFloat(localStorage.getItem("fx_rate") || String(DEFAULT_EXCHANGE_RATE))),
      };
      return { ...prev, categories: prev.categories.map((c, i) => i === 0 ? { ...c, lineItems: [...c.lineItems, newItem] } : c) };
    });
    toast.success(`${device.model} added to quote`);
  };

  const quoteCtx: QuoteCtx = { currentQuote, setCurrentQuote, addToQuote };

  if (page === "login") return (<CurrencyContext.Provider value={currencyCtx}><LoginPage /></CurrencyContext.Provider>);

  const breadcrumb = page === "project-detail" ? { label: "Projects", parent: "projects" as Page } : undefined;

  return (
    <CurrencyContext.Provider value={currencyCtx}>
      <QuoteContext.Provider value={quoteCtx}>
        <div className="min-h-screen bg-background">
          <Toaster position="bottom-right" theme="dark" toastOptions={{ style: { background: "rgba(7,12,26,0.95)", border: "1px solid rgba(255,255,255,0.12)", color: "#e6edf3", backdropFilter: "blur(20px)" } }} />
          <AppTopbar page={page} navigate={setPage} breadcrumb={breadcrumb} onReplayTour={() => { setShowTour(true); }} />
          <div className="pt-14">
            <AnimatePresence mode="wait">
              <motion.div key={page} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                {page === "dashboard" && <Dashboard navigate={setPage} />}
                {page === "projects" && <ProjectsPage navigate={setPage} />}
                {page === "project-detail" && <ProjectDetail navigate={setPage} />}
                {page === "workbook" && <Workbook navigate={setPage} />}
                {page === "install-tracker" && <InstallTracker navigate={setPage} />}
                {page === "device-library" && <DeviceLibrary navigate={setPage} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        {showOnboarding && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" onClick={() => { setShowOnboarding(false); localStorage.setItem(onboardingKey, "true"); }}>
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[500px] rounded-3xl p-8 text-center" style={G.liquidGlass}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}><Zap className="w-8 h-8 text-blue-400" /></div>
              <h2 className="text-white text-[1.4rem] font-extrabold mb-2">Welcome to EEST</h2>
              <p className="text-[#8b949e] text-[14px] mb-6">Your full-lifecycle security project platform. Take a 30-second guided tour to see where everything lives.</p>
              <div className="space-y-3 mb-6 text-left">
                {[
                  { icon: BarChart3, label: "Pipeline", desc: "Track sales leads and manage projects through every stage", color: "#3b82f6" },
                  { icon: Layers, label: "Projects", desc: "Manage every project's assets, workbook, and install tracker in one place", color: "#8b5cf6" },
                  { icon: FileText, label: "Workbook", desc: "Auto-generate BOMs, cost summaries, and proposals", color: "#10b981" },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}20` }}><item.icon className="w-4 h-4" style={{ color: item.color }} /></div>
                    <div><p className="text-white text-[14px] font-bold">{item.label}</p><p className="text-[#8b949e] text-[12px]">{item.desc}</p></div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowOnboarding(false); localStorage.setItem(onboardingKey, "true"); }} className="h-11 px-4 rounded-xl text-[#8b949e] hover:text-white text-[14px] font-bold cursor-pointer" style={G.btn}>Skip</button>
                <button onClick={() => { setShowOnboarding(false); setShowTour(true); }} className="flex-1 h-11 rounded-xl text-white text-[15px] font-extrabold cursor-pointer flex items-center justify-center gap-2" style={{ background: "#3b82f6", boxShadow: "0 4px 20px rgba(59,130,246,0.4)" }}><Sparkles className="w-4 h-4" /> Start Tour</button>
              </div>
            </motion.div>
          </div>
        )}
        {showTour && <OnboardingTour page={page} navigate={setPage} onFinish={finishTour} />}
      </QuoteContext.Provider>
    </CurrencyContext.Provider>
  );
}