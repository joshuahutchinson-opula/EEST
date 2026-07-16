import { useState, useMemo, createContext, useContext } from "react";
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
  Phone, Mail, MessageSquare, StickyNote, Users,
} from "lucide-react";
import { clsx } from "clsx";
import logoImg from "./assets/2026-06-14_21.13.34_e-techsystemsja.com_2f51395e09e8-removebg-preview (1).png";
import faviconWhite from "./assets/faviconwhite.png";

// ─── CSV export helper ────────────────────────────────────────────────────────
function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF export helper (simulated) ────────────────────────────────────────────
function downloadPDF(filename: string, _items: QuoteItem[]) {
  toast.success(`${filename} exported as PDF`);
}

// ─── Glass utility ────────────────────────────────────────────────────────────

const G = {
  card: {
    background: "rgba(255,255,255,0.055)",
    backdropFilter: "blur(24px) saturate(160%)",
    WebkitBackdropFilter: "blur(24px) saturate(160%)",
    border: "1px solid rgba(255,255,255,0.11)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.09)",
  } as React.CSSProperties,
  panel: {
    background: "rgba(7,12,26,0.72)",
    backdropFilter: "blur(40px) saturate(180%)",
    WebkitBackdropFilter: "blur(40px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
  } as React.CSSProperties,
  subtle: {
    background: "rgba(255,255,255,0.03)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.07)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
  } as React.CSSProperties,
  input: {
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.2)",
  } as React.CSSProperties,
  btn: {
    background: "rgba(255,255,255,0.07)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.13)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
  } as React.CSSProperties,
};

// ─── Currency ────────────────────────────────────────────────────────────────

const JMD_RATE = 157.4;

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
    const amt = currency === "JMD" ? usdAmt * JMD_RATE : usdAmt;
    const sym = currency === "JMD" ? "J$" : "$";
    if (compact) {
      if (amt >= 1_000_000) return `${sym}${(amt / 1_000_000).toFixed(2)}M`;
      if (amt >= 1_000) return `${sym}${(amt / 1_000).toFixed(0)}K`;
      return `${sym}${amt.toFixed(0)}`;
    }
    return `${sym}${amt.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Page =
  | "login"
  | "dashboard"
  | "design-studio"
  | "project-detail"
  | "design-canvas"
  | "quote-builder"
  | "install-tracker"
  | "device-library";

type Stage =
  | "assessment-scheduled"
  | "assessment-completed"
  | "design"
  | "proposal"
  | "negotiation"
  | "win"
  | "lose";

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
}

interface QuoteItem {
  id: string;
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
}

interface QuoteCtx {
  quoteItems: QuoteItem[];
  addToQuote: (device: CatalogDevice) => void;
}
const QuoteContext = createContext<QuoteCtx>({ quoteItems: [], addToQuote: () => {} });
const useQuote = () => useContext(QuoteContext);

type InstallStatus = "pending" | "in-progress" | "complete" | "failed";

interface InstallDevice {
  id: string;
  name: string;
  type: "camera" | "access" | "nvr";
  location: string;
  status: InstallStatus;
  assignee: string;
  notes?: string;
}

interface InstallZone {
  id: string;
  name: string;
  devices: InstallDevice[];
}

interface CatalogDevice {
  id: string;
  model: string;
  manufacturer: string;
  category: "camera" | "access-control" | "nvr" | "analytics" | "other";
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
}

// ─── Kanban Data ──────────────────────────────────────────────────────────────

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

const PROJECTS: Project[] = [
  {
    id: "p1", name: "Airport Terminal B — CCTV Upgrade", client: "Metro Airports Authority",
    value: 284000, stage: "assessment-scheduled", risk: "high",
    assignee: { name: "Marcus Webb", initials: "MW", color: "#8b5cf6" },
    dueDate: "2026-07-28", cameras: 124, devices: 18, location: "Terminal B, Gate 12–44",
    contact: { name: "Sandra Okonkwo", title: "Head of Facilities & Security", email: "s.okonkwo@metro-airports.gov", phone: "+1 (876) 555-0142" },
    summary: "Full CCTV refresh across Terminal B covering all gate areas, baggage claim, retail concourse, and perimeter. Client requires 4K resolution minimum and 90-day NVR retention. TSA compliance documentation required at project close.",
    notes: "Client flagged tight construction window — all cable runs must complete before new check-in kiosks are installed (Aug 10). Budget may flex by 10% if we include video analytics package.",
    collaborators: [{ name: "Sofia Reyes", initials: "SR", color: "#10b981", role: "Design Engineer" }, { name: "Derek Cho", initials: "DC", color: "#f59e0b", role: "Lead Installer" }],
  },
  {
    id: "p2", name: "Corporate HQ — Access Control", client: "Nexus Financial Group",
    value: 96500, stage: "assessment-scheduled", risk: "low",
    assignee: { name: "Priya Kapoor", initials: "PK", color: "#06b6d4" },
    dueDate: "2026-08-05", cameras: 32, devices: 44, location: "Floors 12–28, Lobby",
    contact: { name: "David Henriques", title: "VP of Corporate Security", email: "d.henriques@nexusfinancial.com", phone: "+1 (876) 555-0218" },
    summary: "Replace legacy card readers with biometric multi-factor access across 16 floors. Server room and trading floor require mantrap configuration. Integration with existing Lenel OnGuard PSIM required.",
    notes: "IT team is protective of server rooms — pre-coordinate cabling with their network team before scheduling installs.",
    collaborators: [{ name: "Marcus Webb", initials: "MW", color: "#8b5cf6", role: "Account Manager" }],
  },
  {
    id: "p3", name: "Warehouse — Perimeter CCTV", client: "Lakefront Logistics",
    value: 57200, stage: "assessment-scheduled", risk: "medium",
    assignee: { name: "Derek Cho", initials: "DC", color: "#f59e0b" },
    dueDate: "2026-08-12", cameras: 48, devices: 6, location: "Buildings A–F, Yard",
    contact: { name: "Trevor Campbell", title: "Operations Manager", email: "t.campbell@lakefrontlogistics.com", phone: "+1 (876) 555-0377" },
    summary: "Outdoor perimeter and loading dock surveillance across 6 warehouse buildings. License plate recognition at all 4 vehicle entry points. PTZ coverage of the main yard for after-hours monitoring.",
    notes: "High dust and vibration environment — specify IP66/IK10 rated housings throughout. Ask about extended warranty options.",
    collaborators: [{ name: "Priya Kapoor", initials: "PK", color: "#06b6d4", role: "Estimator" }],
  },
  {
    id: "p4", name: "Hotel Chain — Biometric Access", client: "Meridian Hotels & Resorts",
    value: 198000, stage: "assessment-completed", risk: "medium",
    assignee: { name: "Sofia Reyes", initials: "SR", color: "#10b981" },
    dueDate: "2026-07-22", cameras: 86, devices: 130, location: "4 Properties, 1,240 Rooms",
    contact: { name: "Yvonne Fletcher", title: "Director of Hotel Operations", email: "y.fletcher@meridianhotels.com", phone: "+1 (876) 555-0481" },
    summary: "Unified biometric door lock and access system across all 4 Meridian properties. Mobile key integration with the Meridian guest app is a core requirement. Includes staff entrance CCTV at all back-of-house areas.",
    notes: "Design must minimise visible hardware in guest-facing areas — client is brand-conscious. Wireless locks preferred where possible to avoid wall damage.",
    collaborators: [{ name: "Marcus Webb", initials: "MW", color: "#8b5cf6", role: "Account Manager" }, { name: "Derek Cho", initials: "DC", color: "#f59e0b", role: "Lead Installer" }],
  },
  {
    id: "p5", name: "Data Center — Full Security Stack", client: "Stratum Cloud Services",
    value: 421000, stage: "assessment-completed", risk: "high",
    assignee: { name: "Marcus Webb", initials: "MW", color: "#8b5cf6" },
    dueDate: "2026-07-19", cameras: 210, devices: 56, location: "Campus 1, Buildings 1–4",
    contact: { name: "James Whitfield", title: "CISO", email: "j.whitfield@stratumcloud.com", phone: "+1 (876) 555-0562" },
    summary: "Tier III data centre full security stack including mantrap access, per-aisle CCTV, biometric multi-factor authentication, and 24/7 NOC monitoring integration. SOC 2 Type II compliance documentation required.",
    notes: "All engineers must pass background check before site access. Coordinate security clearances at least 2 weeks in advance.",
    collaborators: [{ name: "Sofia Reyes", initials: "SR", color: "#10b981", role: "Design Engineer" }, { name: "Priya Kapoor", initials: "PK", color: "#06b6d4", role: "Compliance Lead" }],
  },
  {
    id: "p6", name: "Stadium — Event Security CCTV", client: "Riverside Sports Authority",
    value: 312000, stage: "assessment-completed", risk: "high",
    assignee: { name: "Derek Cho", initials: "DC", color: "#f59e0b" },
    dueDate: "2026-08-01", cameras: 156, devices: 24, location: "Main Stand, Concourse A–D",
    contact: { name: "Ryan McAllister", title: "Head of Safety & Security", email: "r.mcallister@riversidefc.com", phone: "+1 (876) 555-0645" },
    summary: "Multi-purpose stadium CCTV overhaul covering all seated areas, concourses, VIP lounges, pitch perimeter, and car parks. NVR must retain 60 days footage. Police integration via ONVIF required.",
    notes: "Project must be 100% complete before the Aug 18 season opener — zero extensions possible. Consider staging by concourse to allow partial handover.",
    collaborators: [{ name: "Marcus Webb", initials: "MW", color: "#8b5cf6", role: "Account Manager" }, { name: "Sofia Reyes", initials: "SR", color: "#10b981", role: "Design Engineer" }],
  },
  {
    id: "p7", name: "Retail Flagship — Loss Prevention", client: "Vanta Retail Co.",
    value: 68900, stage: "design", risk: "low",
    assignee: { name: "Priya Kapoor", initials: "PK", color: "#06b6d4" },
    dueDate: "2026-07-25", cameras: 54, devices: 22, location: "5th Avenue, Floors 1–3",
    contact: { name: "Laura Chin", title: "Loss Prevention Manager", email: "l.chin@vantaretail.com", phone: "+1 (876) 555-0724" },
    summary: "Flagship store camera system focused on loss prevention analytics, queue monitoring, and people-counting. POS exception reporting integration required. All cameras must be low-profile and brand-matched.",
    notes: "Store manager wants minimal disruption to trading hours — plan all installs for overnight or early morning shifts.",
    collaborators: [{ name: "Derek Cho", initials: "DC", color: "#f59e0b", role: "Lead Installer" }],
  },
  {
    id: "p8", name: "Research Campus — Biometric Entry", client: "Helion BioTech",
    value: 145500, stage: "design", risk: "medium",
    assignee: { name: "Sofia Reyes", initials: "SR", color: "#10b981" },
    dueDate: "2026-07-30", cameras: 72, devices: 88, location: "North Campus, Labs 1–12",
    contact: { name: "Dr. Amir Patel", title: "Head of Facilities", email: "a.patel@helionbiotech.com", phone: "+1 (876) 555-0819" },
    summary: "Biometric access control for 12 research laboratories with classified containment areas requiring dual-person authorisation. CCTV for corridors and common areas with 30-day retention.",
    notes: "Clean room labs require non-contaminating installation methods — no drilling or dust-generating work without prior containment approval.",
    collaborators: [{ name: "Priya Kapoor", initials: "PK", color: "#06b6d4", role: "Estimator" }, { name: "Marcus Webb", initials: "MW", color: "#8b5cf6", role: "Account Manager" }],
  },
  {
    id: "p9", name: "Bank Branch Network — NVR Rollout", client: "Crestline Federal Bank",
    value: 534000, stage: "design", risk: "high",
    assignee: { name: "Marcus Webb", initials: "MW", color: "#8b5cf6" },
    dueDate: "2026-08-08", cameras: 340, devices: 68, location: "34 Branches, Metro Region",
    contact: { name: "Patricia Goldstein", title: "SVP Physical Security", email: "p.goldstein@crestlinefederal.com", phone: "+1 (876) 555-0931" },
    summary: "Enterprise NVR rollout replacing end-of-life DVRs across the entire branch network. Centralised VMS monitoring from the bank's security operations centre. FFIEC compliance and encrypted storage mandatory.",
    notes: "Each branch has its own IT and facilities contacts — request the branch directory before scoping individual site visits.",
    collaborators: [{ name: "Sofia Reyes", initials: "SR", color: "#10b981", role: "Design Engineer" }, { name: "Derek Cho", initials: "DC", color: "#f59e0b", role: "Lead Installer" }, { name: "Priya Kapoor", initials: "PK", color: "#06b6d4", role: "Compliance Lead" }],
  },
  {
    id: "p10", name: "Office Park — IP Camera Migration", client: "Greenfield Properties",
    value: 42300, stage: "proposal", risk: "low",
    assignee: { name: "Derek Cho", initials: "DC", color: "#f59e0b" },
    dueDate: "2026-07-20", cameras: 38, devices: 8, location: "Buildings 1–7, Common Areas",
    contact: { name: "Brian Nunes", title: "Property Manager", email: "b.nunes@greenfieldproperties.com", phone: "+1 (876) 555-1014" },
    summary: "Analogue-to-IP camera migration across a 7-building office park. Existing cabling to be reused where possible using HD-over-coax encoders. Cloud-hosted VMS preferred.",
    notes: "Lead with encoder/coax reuse option to maximise cost savings. Premium upsell once they see image quality improvement.",
    collaborators: [{ name: "Priya Kapoor", initials: "PK", color: "#06b6d4", role: "Estimator" }],
  },
  {
    id: "p11", name: "Port Authority — Maritime Surveillance", client: "Coastline Port Authority",
    value: 875000, stage: "proposal", risk: "high",
    assignee: { name: "Priya Kapoor", initials: "PK", color: "#06b6d4" },
    dueDate: "2026-07-24", cameras: 412, devices: 84, location: "Piers 1–18, Dockside Perimeter",
    contact: { name: "Capt. Leon Morales", title: "Port Security Director", email: "l.morales@coastlineport.gov", phone: "+1 (876) 555-1127" },
    summary: "Comprehensive maritime security deployment covering all 18 piers, dockside perimeter, vehicle entry checkpoints, and cargo staging areas. Long-range PTZ cameras for vessel identification. Coast Guard monitoring integration.",
    notes: "Marine environment — corrosion-resistant housings and stainless steel mounting hardware throughout. Specify NEMA 4X minimum for all outdoor enclosures.",
    collaborators: [{ name: "Marcus Webb", initials: "MW", color: "#8b5cf6", role: "Account Manager" }, { name: "Derek Cho", initials: "DC", color: "#f59e0b", role: "Lead Installer" }],
  },
  {
    id: "p12", name: "School District — Visitor Management", client: "Northfield Unified Schools",
    value: 189000, stage: "proposal", risk: "medium",
    assignee: { name: "Sofia Reyes", initials: "SR", color: "#10b981" },
    dueDate: "2026-07-31", cameras: 96, devices: 140, location: "12 School Sites",
    contact: { name: "Denise Larkin", title: "Director of School Safety", email: "d.larkin@northfieldschools.edu", phone: "+1 (876) 555-1238" },
    summary: "Standardised visitor management and access control across all 12 district schools. Includes buzzer entry systems, visitor kiosks with ID scanning, and CCTV for all entry points. State Safe Schools Act compliance required.",
    notes: "School board approval required for contracts above $150K — align proposal timeline with the Aug board meeting.",
    collaborators: [{ name: "Priya Kapoor", initials: "PK", color: "#06b6d4", role: "Estimator" }, { name: "Marcus Webb", initials: "MW", color: "#8b5cf6", role: "Account Manager" }],
  },
  {
    id: "p13", name: "Casino — Floor Surveillance", client: "Golden Mirage Entertainment",
    value: 1240000, stage: "negotiation", risk: "high",
    assignee: { name: "Marcus Webb", initials: "MW", color: "#8b5cf6" },
    dueDate: "2026-07-18", cameras: 520, devices: 96, location: "Main Floor, VIP, Cage",
    contact: { name: "Victor Salinas", title: "VP of Surveillance", email: "v.salinas@goldenmirage.com", phone: "+1 (876) 555-1342" },
    summary: "Full-coverage surveillance deployment across the main casino floor, VIP suites, cage operations, and perimeter. Includes facial recognition integration, PTZ speed dome coverage of all gaming tables, and centralised Genetec Security Center VMS. POS exception reporting integration required.",
    notes: "Client pushing hard on price — offered 5% reduction but we can only go to 3% and maintain margin. Escalate to MD if they push below $1.19M. Client wants answer by July 20.",
    collaborators: [{ name: "Sofia Reyes", initials: "SR", color: "#10b981", role: "Design Engineer" }, { name: "Derek Cho", initials: "DC", color: "#f59e0b", role: "Lead Installer" }, { name: "Priya Kapoor", initials: "PK", color: "#06b6d4", role: "Compliance Lead" }],
  },
  {
    id: "p14", name: "Industrial Plant — Hazard Zone CCTV", client: "Ironworks Manufacturing",
    value: 267000, stage: "negotiation", risk: "high",
    assignee: { name: "Derek Cho", initials: "DC", color: "#f59e0b" },
    dueDate: "2026-07-21", cameras: 88, devices: 32, location: "Zones A–C, Control Room",
    contact: { name: "Gary Osei", title: "EHS & Security Manager", email: "g.osei@ironworksmanufacturing.com", phone: "+1 (876) 555-1453" },
    summary: "ATEX-certified CCTV deployment in hazardous Zone A–C areas. Explosion-proof camera housings required. Integration with SCADA control room monitoring and emergency evacuation panels.",
    notes: "ATEX certification paperwork must be submitted 2 weeks before install. Sub-contractor for hazardous area electrical work is required — confirm availability of Spark Electric.",
    collaborators: [{ name: "Marcus Webb", initials: "MW", color: "#8b5cf6", role: "Account Manager" }],
  },
  {
    id: "p15", name: "University — Perimeter & Campus Access", client: "Lakeside University",
    value: 398000, stage: "win", risk: "medium",
    assignee: { name: "Priya Kapoor", initials: "PK", color: "#06b6d4" },
    dueDate: "2026-06-30", cameras: 186, devices: 212, location: "Main Campus, 22 Buildings",
    contact: { name: "Prof. Angela Trent", title: "Head of Campus Security", email: "a.trent@lakesideuniversity.edu", phone: "+1 (876) 555-1566" },
    summary: "Campus-wide security upgrade including perimeter fence line cameras, building access control, and emergency blue-light station CCTV. Integration with the campus safety app for real-time alert push notifications.",
    notes: "Project WON — Phase 1 (perimeter) complete. Phase 2 (building access) 60% done. Final sign-off meeting scheduled Aug 5.",
    collaborators: [{ name: "Derek Cho", initials: "DC", color: "#f59e0b", role: "Lead Installer" }, { name: "Sofia Reyes", initials: "SR", color: "#10b981", role: "Design Engineer" }],
  },
  {
    id: "p16", name: "Embassy Row — High-Security Access", client: "Federal Diplomatic Services",
    value: 2100000, stage: "win", risk: "high",
    assignee: { name: "Marcus Webb", initials: "MW", color: "#8b5cf6" },
    dueDate: "2026-06-15", cameras: 640, devices: 320, location: "Embassy Complex, 8 Sites",
    contact: { name: "Cmdr. Patricia Reeves", title: "Regional Security Attaché", email: "p.reeves@fds.gov", phone: "+1 (876) 555-1677" },
    summary: "Classified high-security access control and surveillance across 8 embassy facilities. Multi-factor biometrics, bullet-resistant camera housings at vehicle entry points, encryption-at-rest NVR systems. Security cleared personnel only.",
    notes: "All project documentation must be marked RESTRICTED. No cloud storage of floor plans or device lists. Site access requires advance coordination with FDS security team.",
    collaborators: [{ name: "Sofia Reyes", initials: "SR", color: "#10b981", role: "Design Engineer" }, { name: "Priya Kapoor", initials: "PK", color: "#06b6d4", role: "Compliance Lead" }],
  },
  {
    id: "p17", name: "Shopping Mall — Retail Analytics", client: "Harborview Mall Group",
    value: 156000, stage: "win", risk: "low",
    assignee: { name: "Sofia Reyes", initials: "SR", color: "#10b981" },
    dueDate: "2026-07-01", cameras: 112, devices: 48, location: "Level 1–3, Food Court",
    contact: { name: "Melissa Huang", title: "Mall Operations Director", email: "m.huang@harborviewmall.com", phone: "+1 (876) 555-1782" },
    summary: "Smart retail analytics camera deployment across 3 mall levels including people counting, heat mapping, dwell time analytics, and queue measurement at food court. Data feeds into the mall's tenant reporting dashboard.",
    notes: "Project WON — analytics dashboard handover scheduled July 8. Strong candidate for referral and Phase 2 (car park ANPR).",
    collaborators: [{ name: "Derek Cho", initials: "DC", color: "#f59e0b", role: "Lead Installer" }],
  },
  {
    id: "p18", name: "Transit Hub — Multi-Modal CCTV", client: "Regional Transit Authority",
    value: 692000, stage: "win", risk: "high",
    assignee: { name: "Derek Cho", initials: "DC", color: "#f59e0b" },
    dueDate: "2026-06-28", cameras: 288, devices: 64, location: "Central Station, 4 Lines",
    contact: { name: "Commissioner Noel Baptiste", title: "Director of Transit Security", email: "n.baptiste@regionaltransit.gov", phone: "+1 (876) 555-1891" },
    summary: "Central transit hub full CCTV refresh covering all platforms, concourses, ticket halls, and bus interchange. Live feed integration with police control room. Encrypted fibre backbone.",
    notes: "Project WON — in maintenance period. Commission report submitted. Get client approval to use as case study reference.",
    collaborators: [{ name: "Marcus Webb", initials: "MW", color: "#8b5cf6", role: "Account Manager" }, { name: "Sofia Reyes", initials: "SR", color: "#10b981", role: "Design Engineer" }],
  },
  {
    id: "p19", name: "Boutique Hotel — Door Control", client: "The Ashfield Collection",
    value: 38500, stage: "lose", risk: "low",
    assignee: { name: "Priya Kapoor", initials: "PK", color: "#06b6d4" },
    dueDate: "2026-07-10", cameras: 22, devices: 60, location: "Main Building, 180 Rooms",
    contact: { name: "Oliver Ashfield", title: "Managing Director", email: "o.ashfield@ashfieldhotels.com", phone: "+1 (876) 555-1956" },
    summary: "Wireless door lock system and entry CCTV for a luxury boutique hotel. Salto KS integration with existing PMS. 180 guest rooms plus staff entrances.",
    notes: "LOST — client went with competitor on price. Our Salto KS licensing model was more expensive. Review if we can negotiate better Salto partner pricing.",
    collaborators: [],
  },
  {
    id: "p20", name: "Pharma — Clean Room Access", client: "Syntera Labs",
    value: 178000, stage: "lose", risk: "medium",
    assignee: { name: "Sofia Reyes", initials: "SR", color: "#10b981" },
    dueDate: "2026-07-05", cameras: 44, devices: 128, location: "R&D Facility, Clean Rooms 1–8",
    contact: { name: "Dr. Katherine Voss", title: "VP of R&D Operations", email: "k.voss@synteralabs.com", phone: "+1 (876) 555-2067" },
    summary: "ISO Class 5 clean room access control and CCTV for pharmaceutical R&D facility. All equipment must be gown-room compatible and non-particle-generating. 21 CFR Part 11 audit trail compliance required.",
    notes: "LOST — client selected a specialist pharmaceutical AV integrator. Explore clean room installation certification for key engineers.",
    collaborators: [{ name: "Marcus Webb", initials: "MW", color: "#8b5cf6", role: "Account Manager" }],
  },
];

// ─── Quote Data ───────────────────────────────────────────────────────────────

const INITIAL_QUOTE_ITEMS: QuoteItem[] = [
  { id: "q1", name: "Axis P3245-V Fixed Dome Network Camera", sku: "AXI-P3245V", qty: 280, unitPrice: 485 },
  { id: "q2", name: "Axis P5655-E 2MP PTZ Network Camera", sku: "AXI-P5655E", qty: 34, unitPrice: 2890 },
  { id: "q3", name: "Axis Camera Station S2212 Rack NVR (12-bay)", sku: "ACS-S2212", qty: 4, unitPrice: 6800 },
  { id: "q4", name: "Genetec Security Center 5.11 Enterprise (300-cam)", sku: "GSC-511-E", qty: 1, unitPrice: 22500 },
  { id: "q5", name: "Suprema BioLite N2 Biometric Reader", sku: "SUP-BION2", qty: 68, unitPrice: 890 },
  { id: "q6", name: "HID Edge EVO Solo Controller & Reader", sku: "HID-EVOS", qty: 34, unitPrice: 1240 },
  { id: "q7", name: "Cat6A Shielded Plenum Cable, 1000ft Reel", sku: "CAB-C6AP", qty: 14, unitPrice: 680 },
  { id: "q8", name: "Conduit & Cable Tray Installation (Labour Days)", sku: "LAB-COND", qty: 22, unitPrice: 1800 },
  { id: "q9", name: "Camera & Device Installation (Labour Days)", sku: "LAB-INST", qty: 48, unitPrice: 1600 },
  { id: "q10", name: "Commissioning, Configuration & Training (Days)", sku: "LAB-COMM", qty: 12, unitPrice: 2200 },
];

// ─── Install Data ─────────────────────────────────────────────────────────────

const INITIAL_ZONES: InstallZone[] = [
  { id: "z1", name: "Building Entry & Reception", devices: [
    { id: "d1", name: "Axis P3245-V Dome Camera", type: "camera", location: "Main Entry — Ceiling Center", status: "complete", assignee: "T. Morales" },
    { id: "d2", name: "Axis P3245-V Dome Camera", type: "camera", location: "Side Door — Wall Mount", status: "complete", assignee: "T. Morales" },
    { id: "d3", name: "Axis P5655-E PTZ Camera", type: "camera", location: "Parking Approach — Pole Mount", status: "complete", assignee: "T. Morales" },
    { id: "d4", name: "Suprema BioLite N2 Reader", type: "access", location: "Main Entry — Internal Frame", status: "complete", assignee: "J. Park" },
    { id: "d5", name: "HID EVO Solo Controller", type: "access", location: "Main Door — Electric Strike", status: "in-progress", assignee: "J. Park" },
  ]},
  { id: "z2", name: "Data Hall A — Aisles 1–4", devices: [
    { id: "d6", name: "Axis P3245-V Dome Camera", type: "camera", location: "Aisle A1 — North End Ceiling", status: "complete", assignee: "T. Morales" },
    { id: "d7", name: "Axis P3245-V Dome Camera", type: "camera", location: "Aisle A1 — South End Ceiling", status: "complete", assignee: "T. Morales" },
    { id: "d8", name: "Axis P3245-V Dome Camera", type: "camera", location: "Aisle A2 — North End Ceiling", status: "in-progress", assignee: "K. Singh" },
    { id: "d9", name: "Axis P3245-V Dome Camera", type: "camera", location: "Aisle A3 — Center Ceiling", status: "in-progress", assignee: "K. Singh" },
    { id: "d10", name: "Suprema BioLite N2 Reader", type: "access", location: "Hall A Entry — East Portal", status: "in-progress", assignee: "J. Park" },
    { id: "d11", name: "Suprema BioLite N2 Reader", type: "access", location: "Hall A Entry — West Portal", status: "pending", assignee: "J. Park" },
    { id: "d12", name: "HID EVO Solo Controller", type: "access", location: "Hall A — Door Frame Row 1", status: "pending", assignee: "J. Park" },
  ]},
  { id: "z3", name: "Data Hall B — Aisles 5–8", devices: [
    { id: "d13", name: "Axis P3245-V Dome Camera", type: "camera", location: "Aisle B1 — North End Ceiling", status: "pending", assignee: "K. Singh" },
    { id: "d14", name: "Axis P3245-V Dome Camera", type: "camera", location: "Aisle B1 — South End Ceiling", status: "pending", assignee: "K. Singh" },
    { id: "d15", name: "Axis P5655-E PTZ Camera", type: "camera", location: "Hall B — Center Ceiling", status: "pending", assignee: "T. Morales" },
    { id: "d16", name: "Suprema BioLite N2 Reader", type: "access", location: "Hall B Entry — Main Portal", status: "pending", assignee: "J. Park" },
    { id: "d17", name: "HID EVO Solo Controller", type: "access", location: "Hall B — Door Frame Row 1", status: "pending", assignee: "J. Park" },
  ]},
  { id: "z4", name: "Server Rooms 1 & 2", devices: [
    { id: "d18", name: "Axis P3245-V Dome Camera", type: "camera", location: "SR1 — Corner Ceiling NE", status: "failed", assignee: "T. Morales", notes: "Conduit blocked by existing HVAC duct — requires reroute. Estimated +1 day." },
    { id: "d19", name: "Axis P3245-V Dome Camera", type: "camera", location: "SR2 — Corner Ceiling NW", status: "pending", assignee: "K. Singh" },
    { id: "d20", name: "Suprema BioLite N2 Reader", type: "access", location: "SR1 Entry — Internal", status: "pending", assignee: "J. Park" },
    { id: "d21", name: "HID EVO Solo Controller", type: "access", location: "SR1 Entry — Door Frame", status: "pending", assignee: "J. Park" },
  ]},
  { id: "z5", name: "Network Operations Center", devices: [
    { id: "d22", name: "Dell PowerEdge R450 NVR", type: "nvr", location: "NOC Rack A — Position U4", status: "complete", assignee: "K. Singh" },
    { id: "d23", name: "Dell PowerEdge R450 NVR", type: "nvr", location: "NOC Rack A — Position U8", status: "in-progress", assignee: "K. Singh" },
    { id: "d24", name: "Genetec Security Center Server", type: "nvr", location: "NOC Rack B — Position U1", status: "pending", assignee: "K. Singh" },
    { id: "d25", name: "Axis Camera Station NVR", type: "nvr", location: "NOC Rack B — Position U4", status: "pending", assignee: "K. Singh" },
  ]},
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtValue(v: number) {
  return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}M` : `$${(v / 1000).toFixed(0)}K`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fovPath(cx: number, cy: number, rotDeg: number, fovDeg: number, r: number) {
  const rot = (rotDeg * Math.PI) / 180;
  const half = (fovDeg / 2 * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rot - half), y1 = cy + r * Math.sin(rot - half);
  const x2 = cx + r * Math.cos(rot + half), y2 = cy + r * Math.sin(rot + half);
  return `M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 0,1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`;
}
// ─── Currency Toggle ──────────────────────────────────────────────────────────

function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();
  return (
    <div className="flex items-center h-8 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
      {(["USD", "JMD"] as const).map((c) => (
        <button key={c} onClick={() => setCurrency(c)}
          className="h-full px-2.5 text-[11px] font-bold transition-all"
          style={currency === c
            ? { background: "#3b82f6", color: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)" }
            : { color: "#8b949e" }}>
          {c}
        </button>
      ))}
    </div>
  );
}

// ─── Shared Topbar ────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "dashboard" as Page, label: "Pipeline" },
  { id: "design-studio" as Page, label: "Projects" },
  { id: "quote-builder" as Page, label: "Quote Builder" },
  { id: "install-tracker" as Page, label: "Install Tracker" },
  { id: "device-library" as Page, label: "Device Library" },
];

function SearchPalette({ onClose, navigate }: { onClose: () => void; navigate: (p: Page) => void }) {
  const { fmt } = useCurrency();
  const [query, setQuery] = useState("");
  const q = query.toLowerCase().trim();

  const projectHits = q.length > 0
    ? PROJECTS.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        (p.contact?.name ?? "").toLowerCase().includes(q)
      ).slice(0, 6)
    : PROJECTS.slice(0, 5);

  const PAGE_LINKS: { label: string; sub: string; page: Page; icon: React.ElementType }[] = [
    { label: "Pipeline", sub: "Project kanban board", page: "dashboard", icon: TrendingUp },
    { label: "Projects", sub: "System Design Studio", page: "design-studio", icon: Layers },
    { label: "Quote Builder", sub: "Build and send quotes", page: "quote-builder", icon: DollarSign },
    { label: "Install Tracker", sub: "Track device installation", page: "install-tracker", icon: CheckSquare },
    { label: "Device Library", sub: "Product catalog & specifications", page: "device-library", icon: Package },
  ];

  const pageHits = q.length > 0
    ? PAGE_LINKS.filter((l) => l.label.toLowerCase().includes(q) || l.sub.toLowerCase().includes(q))
    : PAGE_LINKS;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[12vh]" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 400 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-[560px] rounded-2xl overflow-hidden"
        style={{ background: "rgba(7,12,26,0.92)", backdropFilter: "blur(48px) saturate(200%)", WebkitBackdropFilter: "blur(48px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 24px 64px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.10)" }}>
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Search className="w-4 h-4 text-[#8b949e] flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            placeholder="Search projects, clients, pages…"
            className="flex-1 bg-transparent text-white text-[14px] placeholder:text-[#484f58] focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="w-5 h-5 rounded flex items-center justify-center text-[#484f58] hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="text-[10px] px-1.5 py-0.5 rounded font-mono text-[#484f58]" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>Esc</kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {pageHits.length > 0 && (
            <div className="px-3 pt-3 pb-1">
              <p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest mb-1 px-1">Pages</p>
              {pageHits.map(({ label, sub, page, icon: Icon }) => (
                <button key={page} onClick={() => { navigate(page); onClose(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors text-left group">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.22)" }}>
                    <Icon className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[13px] font-semibold">{label}</p>
                    <p className="text-[#484f58] text-[11px]">{sub}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#484f58] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}

          {projectHits.length > 0 && (
            <div className="px-3 pt-2 pb-3" style={{ borderTop: pageHits.length > 0 ? "1px solid rgba(255,255,255,0.06)" : undefined }}>
              <p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest mb-1 px-1 pt-2">Projects</p>
              {projectHits.map((p) => {
                const col = COLUMNS.find((c) => c.id === p.stage)!;
                return (
                  <button key={p.id} onClick={() => { navigate("project-detail"); onClose(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors text-left group">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                      style={{ background: p.assignee.color, boxShadow: `0 0 10px ${p.assignee.color}44` }}>
                      {p.assignee.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[13px] font-semibold truncate">{p.name}</p>
                      <p className="text-[#8b949e] text-[11px] truncate">{p.client} · {fmt(p.value, true)}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: `${col.color}20`, color: col.color, border: `1px solid ${col.color}35` }}>
                      {col.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {q.length > 0 && projectHits.length === 0 && pageHits.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-[#484f58] text-[13px]">No results for "<span className="text-[#8b949e]">{query}</span>"</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function AppTopbar({ page, navigate, breadcrumb }: { page: Page; navigate: (p: Page) => void; breadcrumb?: { label: string; parent: Page } }) {
  const activeTab = NAV_ITEMS.find((n) => n.id === page)?.id ?? null;
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 flex items-center gap-5 px-5"
      style={{ background: "rgba(7,12,26,0.65)", backdropFilter: "blur(40px) saturate(180%)", WebkitBackdropFilter: "blur(40px) saturate(180%)", borderBottom: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.5)" }}>
      <button onClick={() => navigate("dashboard")} className="flex items-center gap-2.5 flex-shrink-0">
   <img src={faviconWhite} alt="E-Tech Systems" className="h-10 object-contain" style={{ marginTop: "-2px", marginBottom: "-2px" }} />
      </button>

      <div className="w-px h-4 flex-shrink-0" style={{ background: "rgba(255,255,255,0.12)" }} />

      {breadcrumb ? (
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(breadcrumb.parent)} className="flex items-center gap-1.5 text-[#8b949e] hover:text-white text-[12px] font-semibold transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />{breadcrumb.label}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[#484f58]" />
          <span className="text-white text-[12px] font-semibold">Project Detail</span>
        </div>
      ) : (
        <nav className="flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => navigate(item.id)}
              className={clsx("h-8 px-3.5 rounded-xl text-[13px] font-semibold transition-all duration-150",
                activeTab === item.id ? "text-white" : "text-[#8b949e] hover:text-white")}
              style={activeTab === item.id ? { background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" } : undefined}>
              {item.label}
            </button>
          ))}
        </nav>
      )}

      <div className="flex-1" />

      {showSearch && <SearchPalette onClose={() => setShowSearch(false)} navigate={navigate} />}
      <div className="flex items-center gap-1.5">
        <CurrencyToggle />
        <button onClick={() => setShowSearch(true)} className="flex items-center gap-2 h-8 px-3 rounded-xl text-[#8b949e] text-[12px] hover:text-white transition-all"
          style={G.btn}>
          <Search className="w-3.5 h-3.5" />
          <span>Search…</span>
          <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded font-mono opacity-60" style={{ background: "rgba(255,255,255,0.08)" }}>⌘K</kbd>
        </button>
        <div className="relative">
          <button onClick={() => { setShowNotifications(!showNotifications); setShowSettings(false); }}
            className="relative w-8 h-8 rounded-xl hover:bg-white/[0.06] flex items-center justify-center transition-colors">
            <Bell className={clsx("w-4 h-4 transition-colors", showNotifications ? "text-white" : "text-[#8b949e]")} />
            <span className="absolute top-1.5 right-1.5 w-[5px] h-[5px] rounded-full bg-blue-500" style={{ boxShadow: "0 0 6px #3b82f6" }} />
          </button>
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-10 w-80 z-[70] rounded-2xl overflow-hidden"
                style={{ background: "rgba(7,12,26,0.95)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 16px 48px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.09)" }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-white text-[13px] font-bold">Notifications</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">4 new</span>
                </div>
                {[
                  { icon: AlertTriangle, color: "text-amber-400", bg: "rgba(245,158,11,0.12)", title: "Negotiation deadline today", body: "Casino — Floor Surveillance · Victor Salinas expecting answer by EOD", time: "Just now" },
                  { icon: DollarSign, color: "text-blue-400", bg: "rgba(59,130,246,0.12)", title: "Quote Q-2026-044-v3 approved", body: "Crestline Federal Bank · $534K", time: "2h ago" },
                  { icon: CheckCircle2, color: "text-emerald-400", bg: "rgba(16,185,129,0.12)", title: "Install phase 1 complete", body: "Data Center — Stratum Cloud · Building Entry zone signed off", time: "5h ago" },
                  { icon: AlertCircle, color: "text-rose-400", bg: "rgba(244,63,94,0.12)", title: "Device defect logged", body: "SR1 Corner Ceiling NE — conduit blocked, reroute required", time: "Yesterday" },
                  { icon: Star, color: "text-violet-400", bg: "rgba(139,92,246,0.12)", title: "New project won", body: "Lakeside University · $398K Phase 1 complete", time: "2 days ago" },
                ].map((n, i) => (
                  <button key={i} onClick={() => setShowNotifications(false)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: n.bg }}>
                      <n.icon className={clsx("w-3.5 h-3.5", n.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[12px] font-semibold leading-snug">{n.title}</p>
                      <p className="text-[#8b949e] text-[11px] leading-snug mt-0.5 truncate">{n.body}</p>
                    </div>
                    <span className="text-[#484f58] text-[10px] flex-shrink-0 mt-0.5">{n.time}</span>
                  </button>
                ))}
                <div className="px-4 py-2.5">
                  <button className="w-full text-center text-blue-400 text-[12px] font-semibold hover:text-blue-300 transition-colors">
                    Mark all as read
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <button onClick={() => { setShowSettings(!showSettings); setShowNotifications(false); }}
            className="w-8 h-8 rounded-xl hover:bg-white/[0.06] flex items-center justify-center transition-colors">
            <Settings className={clsx("w-4 h-4 transition-colors", showSettings ? "text-white" : "text-[#8b949e]")} />
          </button>
          {showSettings && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setShowSettings(false)} />
              <div className="absolute right-0 top-10 w-72 z-[70] rounded-2xl overflow-hidden"
                style={{ background: "rgba(7,12,26,0.95)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 16px 48px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.09)" }}>
                <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-white text-[13px] font-bold">Settings</p>
                </div>
                <div className="p-3 space-y-1">
                  {[
                    { label: "Dark mode", sub: "Always on", on: true },
                    { label: "Email notifications", sub: "Quotes & approvals", on: true },
                    { label: "Desktop alerts", sub: "Deal stage changes", on: false },
                    { label: "Compact view", sub: "Denser kanban cards", on: false },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
                      <div>
                        <p className="text-white text-[12px] font-semibold">{s.label}</p>
                        <p className="text-[#484f58] text-[10px]">{s.sub}</p>
                      </div>
                      <div className={clsx("w-8 h-4.5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer",
                        s.on ? "bg-blue-500" : "bg-white/[0.10]")} style={{ height: "18px" }}>
                        <div className={clsx("w-3.5 h-3.5 rounded-full bg-white transition-transform shadow-sm",
                          s.on ? "translate-x-3" : "translate-x-0")} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <button onClick={() => { setShowSettings(false); navigate("login"); }}
                    className="w-full flex items-center gap-2 text-rose-400 text-[12px] font-semibold hover:text-rose-300 transition-colors">
                    <X className="w-3.5 h-3.5" /> Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <button onClick={() => navigate("login")} className="flex items-center gap-2 h-8 pl-1.5 pr-2.5 rounded-xl hover:bg-white/[0.06] transition-colors ml-1">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 0 12px rgba(139,92,246,0.5)" }}>
            MW
          </div>
          <span className="text-white text-[12px] font-semibold">Marcus</span>
          <ChevronDown className="w-3 h-3 text-[#484f58]" />
        </button>
      </div>
    </header>
  );
}

// ─── Deal Modal ───────────────────────────────────────────────────────────────

function DealModal({ project, column, onClose, navigate }: { project: Project; column: Column; onClose: () => void; navigate: (p: Page) => void }) {
  const [tab, setTab] = useState<"overview" | "contact" | "notes">("overview");
  const { fmt } = useCurrency();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 360 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-[540px] rounded-3xl overflow-hidden"
        style={{ background: "rgba(7,12,26,0.78)", backdropFilter: "blur(52px) saturate(200%)", WebkitBackdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 32px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.12)" }}>

        <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${column.color}dd, ${column.color}33)` }} />
        <div className="absolute inset-x-0 top-0 h-36 pointer-events-none" style={{ background: `radial-gradient(ellipse 80% 100% at 50% 0%, ${column.color}1a, transparent)` }} />

        <div className="relative px-7 pt-7 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full"
                  style={{ background: `${column.color}22`, color: column.color, border: `1px solid ${column.color}44` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: column.color, boxShadow: `0 0 6px ${column.color}` }} />
                  {column.label}
                </span>
                <span className={clsx("text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full",
                  project.risk === "high" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                  project.risk === "medium" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                  "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30")}>
                  {project.risk} risk
                </span>
              </div>
              <h2 className="text-white text-[1.1rem] font-bold leading-snug tracking-tight">{project.name}</h2>
              <p className="text-[#8b949e] text-[13px] font-semibold mt-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 flex-shrink-0" />{project.client}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 hover:bg-white/[0.08] transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
              <X className="w-4 h-4 text-[#8b949e]" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-5">
            {[
              { label: "Quote Value", value: fmt(project.value, true), color: "#3b82f6" },
              { label: "Devices", value: String(project.devices), color: "#06b6d4" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl px-3 py-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(139,148,158,0.85)" }}>{s.label}</p>
                <p className="text-[1.2rem] font-bold tracking-tight leading-none" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-0.5 px-7 mb-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {(["overview", "contact", "notes"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx("h-9 px-3.5 text-[12px] font-semibold capitalize border-b-2 transition-all -mb-px",
                tab === t ? "border-blue-500 text-white" : "border-transparent text-[#8b949e] hover:text-white")}>
              {t === "notes" ? "Notes & Summary" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="px-7 py-5 space-y-3 max-h-[340px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>

          {tab === "overview" && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: MapPin, label: "Location", value: project.location },
                  { icon: Calendar, label: "Due Date", value: fmtDate(project.dueDate) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-2xl px-4 py-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-3 h-3 text-[#484f58]" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#484f58]">{label}</p>
                    </div>
                    <p className="text-[#e6edf3] text-[12px] font-semibold leading-snug">{value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                  style={{ background: project.assignee.color, boxShadow: `0 0 16px ${project.assignee.color}55` }}>
                  {project.assignee.initials}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#484f58] mb-0.5">Account Owner</p>
                  <p className="text-white text-[13px] font-semibold">{project.assignee.name}</p>
                </div>
              </div>
              {project.collaborators && project.collaborators.length > 0 && (
                <div className="rounded-2xl px-4 py-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#484f58] mb-3 flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Team ({project.collaborators.length + 1})
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                        style={{ background: project.assignee.color }}>
                        {project.assignee.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[12px] font-semibold">{project.assignee.name}</p>
                        <p className="text-[#484f58] text-[10px]">Account Owner</p>
                      </div>
                    </div>
                    {project.collaborators.map((c) => (
                      <div key={c.name} className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                          style={{ background: c.color }}>
                          {c.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-[12px] font-semibold">{c.name}</p>
                          <p className="text-[#484f58] text-[10px]">{c.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "contact" && (
            <>
              {project.contact ? (
                <>
                  <div className="rounded-2xl px-4 py-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}>
                        {project.contact.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-white text-[14px] font-bold">{project.contact.name}</p>
                        <p className="text-[#8b949e] text-[12px]">{project.contact.title}</p>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <a href={`mailto:${project.contact.email}`} className="flex items-center gap-2.5 group">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}>
                          <Mail className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <span className="text-[#8b949e] text-[12px] group-hover:text-blue-400 transition-colors font-medium">{project.contact.email}</span>
                      </a>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)" }}>
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <span className="text-[#8b949e] text-[12px] font-medium">{project.contact.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl px-4 py-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#484f58] mb-1">Client Organisation</p>
                    <p className="text-white text-[13px] font-semibold">{project.client}</p>
                  </div>
                </>
              ) : (
                <p className="text-[#484f58] text-[13px] text-center py-4">No contact info on file.</p>
              )}
            </>
          )}

          {tab === "notes" && (
            <>
              {project.summary && (
                <div className="rounded-2xl px-4 py-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#484f58] mb-2.5 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" /> Request Summary
                  </p>
                  <p className="text-[#c9d1d9] text-[12px] leading-relaxed">{project.summary}</p>
                </div>
              )}
              {project.notes && (
                <div className="rounded-2xl px-4 py-4" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.20)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/70 mb-2.5 flex items-center gap-1.5">
                    <StickyNote className="w-3 h-3" /> Internal Notes
                  </p>
                  <p className="text-[#c9d1d9] text-[12px] leading-relaxed">{project.notes}</p>
                </div>
              )}
              {!project.summary && !project.notes && (
                <p className="text-[#484f58] text-[13px] text-center py-4">No notes on file.</p>
              )}
            </>
          )}
        </div>

        <div className="px-7 pb-7 flex gap-2.5">
          <button onClick={() => { navigate("project-detail"); onClose(); }}
            className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-white text-[13px] font-bold transition-all duration-150"
            style={{ background: "#3b82f6", boxShadow: "0 4px 20px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.2)" }}>
            <ExternalLink className="w-3.5 h-3.5" />Open Project
          </button>
          <button onClick={() => { navigate("design-canvas"); onClose(); }}
            className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-[#e6edf3] text-[13px] font-bold transition-all duration-150 hover:bg-white/[0.12]"
            style={G.btn}>
            <Layers className="w-3.5 h-3.5 text-violet-400" />Design
          </button>
          <button onClick={() => { navigate("quote-builder"); onClose(); }}
            className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-[#e6edf3] text-[13px] font-bold transition-all duration-150 hover:bg-white/[0.12]"
            style={G.btn}>
            <DollarSign className="w-3.5 h-3.5 text-blue-400" />Quote
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({ project, column, dragging, onDragStart, onDragEnd, onClick, onDelete }: {
  project: Project; column: Column; dragging: string | null;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDragEnd: () => void; onClick: () => void; onDelete: (id: string) => void;
}) {
  const { fmt } = useCurrency();
  const isDragging = dragging === project.id;
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      draggable onDragStart={(e) => { e.stopPropagation(); onDragStart(e, project.id); }} onDragEnd={onDragEnd}
      onClick={onClick}
      className={clsx("group relative rounded-2xl cursor-pointer select-none transition-all duration-200", isDragging ? "opacity-25 scale-[0.96]" : "hover:-translate-y-1")}
      style={{
        background: "rgba(255,255,255,0.055)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: isDragging ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,255,255,0.11)",
        borderLeft: `3px solid ${column.color}`,
        boxShadow: isDragging ? "none" : "0 2px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.09)",
      }}>
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.14)" }} />
      <div className="absolute left-2 top-4 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none">
        <GripVertical className="w-3 h-3 text-white" />
      </div>
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-white text-[13px] font-semibold leading-snug flex-1 min-w-0">{project.name}</h3>
          <div className="relative flex-shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center mt-0.5">
              <MoreHorizontal className="w-3.5 h-3.5 text-[#8b949e]" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                <div className="absolute right-0 top-7 z-20 w-40 rounded-xl overflow-hidden py-1"
                  style={{ background: "rgba(7,12,26,0.97)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 32px rgba(0,0,0,0.8)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(project.id); setMenuOpen(false); toast.success("Project deleted"); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 text-[12px] font-semibold hover:bg-rose-500/10 transition-colors text-left">
                    <Trash2 className="w-3.5 h-3.5" /> Delete project
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mb-1">
          <Building2 className="w-3 h-3 text-[#8b949e] flex-shrink-0" />
          <span className="text-[#8b949e] text-[11px] font-semibold truncate">{project.client}</span>
        </div>
        <div className="flex items-center gap-1.5 mb-3">
          <MapPin className="w-3 h-3 text-[#484f58] flex-shrink-0" />
          <span className="text-[#484f58] text-[11px] truncate">{project.location}</span>
        </div>
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-white font-bold text-[15px] tracking-tight">{fmt(project.value, true)}</span>
          <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide",
            project.risk === "high" ? "bg-rose-500/20 text-rose-400 border border-rose-500/25" :
            project.risk === "medium" ? "bg-amber-500/20 text-amber-400 border border-amber-500/25" :
            "bg-emerald-500/20 text-emerald-400 border border-emerald-500/25")}>
            {project.risk}
          </span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center gap-1 text-[#484f58] text-[11px]"><Camera className="w-3 h-3" />{project.cameras} cams</span>
          <span className="flex items-center gap-1 text-[#484f58] text-[11px]"><Fingerprint className="w-3 h-3" />{project.devices} devices</span>
        </div>
        <div className="flex items-center justify-between pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
              style={{ background: project.assignee.color, boxShadow: `0 0 8px ${project.assignee.color}60` }}>
              {project.assignee.initials}
            </div>
            <span className="text-[#8b949e] text-[11px] font-medium">{project.assignee.name.split(" ")[0]}</span>
          </div>
          <span className="flex items-center gap-1 text-[#484f58] text-[11px]"><Calendar className="w-3 h-3" />{fmtDate(project.dueDate)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({ column, projects, totalValue, dragging, isOver, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onCardClick, onDelete }: {
  column: Column; projects: Project[]; totalValue: number; dragging: string | null; isOver: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDragEnd: () => void; onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void; onDrop: () => void; onCardClick: (p: Project) => void; onDelete: (id: string) => void;
}) {
  const { fmt } = useCurrency();
  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      className="w-[272px] flex-shrink-0 flex flex-col rounded-2xl transition-all duration-200"
      style={isOver ? { background: "rgba(59,130,246,0.08)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(59,130,246,0.35)", boxShadow: "0 0 0 1px rgba(59,130,246,0.15) inset" } : { background: "rgba(255,255,255,0.032)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 2px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
      <div className="px-3.5 pt-3.5 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: column.color, boxShadow: `0 0 10px ${column.color}88` }} />
            <span className="text-white text-[12px] font-bold truncate leading-tight">{column.label}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <span className="text-[#8b949e] text-[11px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}>
              {projects.length}
            </span>
            <button className="w-5 h-5 rounded-lg hover:bg-white/[0.08] flex items-center justify-center transition-colors">
              <Plus className="w-3 h-3 text-[#484f58]" />
            </button>
          </div>
        </div>
        <p className="text-[#484f58] text-[11px] font-semibold ml-4">{fmt(totalValue, true)}</p>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 296px)", scrollbarWidth: "none", scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}>
        {projects.map((p) => (
          <KanbanCard key={p.id} project={p} column={column} dragging={dragging} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={() => onCardClick(p)} onDelete={onDelete} />
        ))}
        {isOver && <div className="h-14 rounded-xl border-2 border-dashed border-blue-500/35 bg-blue-500/[0.04] flex items-center justify-center"><p className="text-blue-400/60 text-[11px] font-semibold">Drop here</p></div>}
        {projects.length === 0 && !isOver && <div className="h-14 rounded-xl border border-dashed border-white/[0.04] flex items-center justify-center"><p className="text-[#484f58] text-[11px]">No projects</p></div>}
      </div>
    </div>
  );
}
// ─── New Project Modal ────────────────────────────────────────────────────────

const ASSIGNEES = [
  { name: "Donovan", initials: "DV", color: "#8b5cf6" },
  { name: "Roger", initials: "RG", color: "#06b6d4" },
  { name: "Michael", initials: "MC", color: "#f59e0b" },
  { name: "Rochelle", initials: "RC", color: "#10b981" },
  { name: "Joshua", initials: "JS", color: "#3b82f6" },
  { name: "Denise", initials: "DN", color: "#f97316" },
];

function NewProjectModal({ onClose, onAdd }: { onClose: () => void; onAdd: (p: Project) => void }) {
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [location, setLocation] = useState("");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<Stage>("assessment-scheduled");
  const [risk, setRisk] = useState<"low" | "medium" | "high">("low");
  const [assigneeIdx, setAssigneeIdx] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [summary, setSummary] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const canSubmit = name.trim() && client.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const assignee = ASSIGNEES[assigneeIdx];
    const newProject: Project = {
      id: `p${Date.now()}`,
      name: name.trim(),
      client: client.trim(),
      location: location.trim() || "TBD",
      value: Math.round(parseFloat(value.replace(/[^0-9.]/g, "")) * (value.includes("M") ? 1_000_000 : value.includes("K") ? 1000 : 1)) || 0,
      cameras: 0,
      devices: 0,
      stage,
      risk,
      assignee,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      summary: summary.trim() || undefined,
      contact: contactName.trim() ? { name: contactName.trim(), title: contactTitle.trim(), email: contactEmail.trim(), phone: contactPhone.trim() } : undefined,
    };
    onAdd(newProject);
    onClose();
  };

  const inputCls = "w-full h-9 rounded-xl px-3 text-[#e6edf3] text-[12px] placeholder:text-[#484f58] focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all";
  const labelCls = "block text-[#8b949e] text-[10px] font-bold uppercase tracking-widest mb-1.5";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 360 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-[600px] rounded-3xl overflow-hidden"
        style={{ background: "rgba(7,12,26,0.92)", backdropFilter: "blur(52px) saturate(200%)", WebkitBackdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 32px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.12)" }}>
        <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-3xl" style={{ background: "linear-gradient(90deg, #3b82f6dd, #8b5cf633)" }} />
        <div className="absolute inset-x-0 top-0 h-32 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(59,130,246,0.12), transparent)" }} />

        <div className="relative flex items-center justify-between px-7 pt-7 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-white text-[1.1rem] font-bold tracking-tight">New Project</h2>
            <p className="text-[#8b949e] text-[12px] mt-0.5">Add a new project to the pipeline</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
            <X className="w-4 h-4 text-[#8b949e]" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-7 py-5 space-y-4 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>Project Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HQ — CCTV Upgrade" className={inputCls} style={G.input} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Client *</label>
                <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Company name" className={inputCls} style={G.input} />
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Site address or description" className={inputCls} style={G.input} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Estimated Value (optional)</label>
              <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 95000 or 95K" className={inputCls} style={G.input} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Stage</label>
                <div className="relative">
                  <select value={stage} onChange={(e) => setStage(e.target.value as Stage)}
                    className={`${inputCls} appearance-none cursor-pointer pr-7`} style={G.input}>
                    {COLUMNS.map((c) => <option key={c.id} value={c.id} style={{ background: "#0d1117" }}>{c.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Risk</label>
                <div className="relative">
                  <select value={risk} onChange={(e) => setRisk(e.target.value as "low" | "medium" | "high")}
                    className={`${inputCls} appearance-none cursor-pointer pr-7`} style={G.input}>
                    {["low", "medium", "high"].map((r) => <option key={r} value={r} style={{ background: "#0d1117" }}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className={inputCls} style={{ ...G.input, colorScheme: "dark" }} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Account Owner</label>
              <div className="flex flex-wrap gap-2">
                {ASSIGNEES.map((a, i) => (
                  <button key={a.name} type="button" onClick={() => setAssigneeIdx(i)}
                    className="flex items-center gap-2 h-9 px-3 rounded-xl transition-all"
                    style={assigneeIdx === i ? { background: `${a.color}22`, border: `1px solid ${a.color}55` } : G.subtle}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                      style={{ background: a.color }}>
                      {a.initials}
                    </div>
                    <span className={`text-[11px] font-semibold ${assigneeIdx === i ? "text-white" : "text-[#8b949e]"}`}>{a.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "16px" }}>
              <p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest mb-3">Contact (optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Name</label>
                  <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Full name" className={inputCls} style={G.input} />
                </div>
                <div>
                  <label className={labelCls}>Title</label>
                  <input value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} placeholder="Job title" className={inputCls} style={G.input} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@company.com" className={inputCls} style={G.input} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 (876) 555-0000" className={inputCls} style={G.input} />
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>Project Scope</label>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief description of the project scope…"
                rows={3}
                className="w-full rounded-xl px-3 py-2.5 text-[#e6edf3] text-[12px] placeholder:text-[#484f58] focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none transition-all"
                style={G.input} />
            </div>
          </div>

          <div className="px-7 pb-7 pt-4 flex gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-xl text-[#8b949e] text-[13px] font-semibold hover:text-white transition-all"
              style={G.btn}>
              Cancel
            </button>
            <button type="submit" disabled={!canSubmit}
              className="flex-1 h-10 rounded-xl text-white text-[13px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#3b82f6", boxShadow: canSubmit ? "0 4px 20px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.2)" : "none" }}>
              Add to Pipeline
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Upload Floor Plan Modal ──────────────────────────────────────────────────

function UploadFloorPlanModal({ onClose }: { onClose: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) setFile(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setFile(e.target.files[0]);
  };

  const handleUpload = () => {
    if (file) {
      toast.success(`${file.name} uploaded — opening design canvas`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 360 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-[480px] rounded-3xl overflow-hidden"
        style={{ background: "rgba(7,12,26,0.92)", backdropFilter: "blur(52px) saturate(200%)", WebkitBackdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 32px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.12)" }}>
        <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-3xl" style={{ background: "linear-gradient(90deg, #8b5cf6dd, #8b5cf633)" }} />

        <div className="flex items-center justify-between px-6 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-white text-[1rem] font-bold">Upload Floor Plan</h2>
            <p className="text-[#8b949e] text-[12px] mt-0.5">Upload a floor plan or mockup to start designing</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08]"
            style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
            <X className="w-4 h-4 text-[#8b949e]" />
          </button>
        </div>

        <div className="p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={clsx("border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer",
              dragOver ? "border-violet-400 bg-violet-500/[0.06]" : file ? "border-emerald-500/40 bg-emerald-500/[0.03]" : "border-white/[0.10] hover:border-white/[0.20]")}
            onClick={() => document.getElementById("floorplan-upload")?.click()}>
            <input id="floorplan-upload" type="file" accept="image/*,.pdf,.dwg,.dxf" className="hidden" onChange={handleFileSelect} />
            {file ? (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)" }}>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-white text-[13px] font-semibold">{file.name}</p>
                <p className="text-[#484f58] text-[11px]">{(file.size / 1024).toFixed(0)} KB · Ready to upload</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.22)" }}>
                  <Upload className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <p className="text-white text-[13px] font-semibold">Drag & drop your floor plan</p>
                  <p className="text-[#484f58] text-[11px] mt-1">or click to browse files</p>
                </div>
                <p className="text-[#484f58] text-[10px]">Supports JPG, PNG, PDF, DWG, DXF</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={onClose}
              className="flex-1 h-10 rounded-xl text-[#8b949e] text-[13px] font-semibold hover:text-white transition-all"
              style={G.btn}>
              Cancel
            </button>
            <button onClick={handleUpload} disabled={!file}
              className="flex-1 h-10 rounded-xl text-white text-[13px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: "#8b5cf6", boxShadow: file ? "0 4px 20px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.2)" : "none" }}>
              <Upload className="w-3.5 h-3.5" /> Upload & Open Canvas
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Select Project Modal ─────────────────────────────────────────────────────

function SelectProjectModal({ onClose, onSelect, currentId }: { onClose: () => void; onSelect: (id: string) => void; currentId: string }) {
  const [search, setSearch] = useState("");
  const filtered = search.trim()
    ? PROJECTS.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase()))
    : PROJECTS;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 360 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-[500px] rounded-3xl overflow-hidden"
        style={{ background: "rgba(7,12,26,0.95)", backdropFilter: "blur(52px) saturate(200%)", WebkitBackdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 32px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.12)" }}>
        <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-3xl" style={{ background: "linear-gradient(90deg, #3b82f6dd, #3b82f633)" }} />

        <div className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-white text-[1rem] font-bold">Select Project</h2>
            <p className="text-[#8b949e] text-[12px] mt-0.5">Choose which project this quote is for</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08]"
            style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
            <X className="w-4 h-4 text-[#8b949e]" />
          </button>
        </div>

        <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#484f58]" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="w-full h-9 rounded-xl pl-8 pr-3 text-[13px] text-[#e6edf3] placeholder:text-[#484f58] focus:outline-none"
              style={G.input} />
          </div>
        </div>

        <div className="max-h-[340px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p.id); onClose(); }}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/[0.04] transition-colors text-left"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: p.id === currentId ? "rgba(59,130,246,0.06)" : "transparent" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ background: p.assignee.color, boxShadow: `0 0 10px ${p.assignee.color}44` }}>
                {p.assignee.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[13px] font-semibold truncate">{p.name}</p>
                <p className="text-[#8b949e] text-[11px] truncate">{p.client} · {fmtValue(p.value)}</p>
              </div>
              {p.id === currentId && (
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ navigate }: { navigate: (p: Page) => void }) {
  const { fmt } = useCurrency();
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Stage | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Project | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [progressAnim, setProgressAnim] = useState<{ id: string; stage: Stage } | null>(null);

  const active = projects.filter((p) => !["win", "lose"].includes(p.stage));
  const pipeline = active.reduce((s, p) => s + p.value, 0);
  const won = projects.filter((p) => p.stage === "win");
  const closed = projects.filter((p) => ["win", "lose"].includes(p.stage));
  const winRate = closed.length ? Math.round((won.length / closed.length) * 100) : 0;
  const negotiation = projects.filter((p) => p.stage === "negotiation");
  const negoValue = negotiation.reduce((s, p) => s + p.value, 0);
  const avgDeal = active.length ? Math.round(pipeline / active.length) : 0;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => { setDragging(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragEnd = () => { setDragging(null); setDragOverCol(null); };
  const handleDrop = (colId: Stage) => {
    if (dragging) {
      const project = projects.find((p) => p.id === dragging);
      if (project && project.stage !== colId && colId !== "lose") {
        setProgressAnim({ id: dragging, stage: colId });
        setTimeout(() => setProgressAnim(null), 1500);
      }
      setProjects((prev) => prev.map((p) => p.id === dragging ? { ...p, stage: colId } : p));
    }
    setDragging(null); setDragOverCol(null);
  };

  const selectedColumn = selectedDeal ? COLUMNS.find((c) => c.id === selectedDeal.stage)! : null;
  const STAT_COLORS = ["#3b82f6", "#10b981", "#f97316", "#8b5cf6"];

  return (
    <div>
      {selectedDeal && selectedColumn && (
        <DealModal project={selectedDeal} column={selectedColumn} onClose={() => setSelectedDeal(null)} navigate={navigate} />
      )}
      {showNewProject && (
        <NewProjectModal onClose={() => setShowNewProject(false)} onAdd={(p) => setProjects((prev) => [p, ...prev])} />
      )}
      {progressAnim && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[250] px-5 py-3 rounded-2xl flex items-center gap-3"
          style={{ background: "rgba(16,185,129,0.95)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(16,185,129,0.4)" }}>
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="text-white text-[13px] font-bold">Project advanced to {COLUMNS.find((c) => c.id === progressAnim.stage)?.label}</span>
        </motion.div>
      )}

      <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-white font-bold text-xl tracking-tight">Project Pipeline</h1>
            <p className="text-[#8b949e] text-[13px] mt-0.5">{projects.length} projects · FY 2026 · Q3</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewProject(true)} className="flex items-center gap-1.5 h-8 px-4 rounded-xl text-white text-[12px] font-bold transition-colors"
              style={{ background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.2)" }}>
              <Plus className="w-3.5 h-3.5" /> New Project
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Active Pipeline", value: pipeline, icon: TrendingUp, change: "+12% QoQ", pos: true, compact: true },
            { label: "Win Rate", value: winRate, icon: Star, change: "+4pp QoQ", pos: true, isPct: true, compact: false },
            { label: "In Negotiation", value: negoValue, icon: BarChart3, change: "Needs attention", pos: null, compact: true },
            { label: "Avg Deal Size", value: avgDeal, icon: DollarSign, change: "−$12K QoQ", pos: false, compact: false },
          ].map((stat, i) => (
            <div key={stat.label} className="rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5" style={G.card}>
              <div className="flex items-center justify-between mb-3">
              <span className="text-[#8b949e] text-[12px] font-extrabold uppercase tracking-[0.12em]">{stat.label}</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${STAT_COLORS[i]}18`, border: `1px solid ${STAT_COLORS[i]}30` }}>
                  <stat.icon className="w-3.5 h-3.5" style={{ color: STAT_COLORS[i] }} />
                </div>
              </div>
<p className="text-white text-[2rem] font-extrabold tracking-tight leading-none mb-1.5">
                {stat.isPct ? `${stat.value}%` : fmt(stat.value as number, stat.compact)}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-[#484f58] text-[11px]">
                  {stat.isPct ? `${won.length} of ${closed.length} closed` : stat.label === "Active Pipeline" ? `${active.length} active projects` : stat.label === "In Negotiation" ? `${negotiation.length} projects` : "Active projects"}
                </p>
                <p className={clsx("text-[11px] font-bold", stat.pos === true && "text-emerald-400", stat.pos === false && "text-rose-400", stat.pos === null && "text-amber-400")}>{stat.change}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto px-5 py-5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent", scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}>
        <div className="flex gap-3 min-w-max pb-3">
          {COLUMNS.map((col) => {
            const colProjects = projects.filter((p) => p.stage === col.id);
            return (
              <KanbanColumn key={col.id} column={col} projects={colProjects}
                totalValue={colProjects.reduce((s, p) => s + p.value, 0)}
                dragging={dragging} isOver={dragOverCol === col.id}
                onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={() => handleDrop(col.id)}
                onCardClick={(p) => setSelectedDeal(p)}
                onDelete={(id) => setProjects((prev) => prev.filter((p) => p.id !== id))} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Mini Floor Plan ──────────────────────────────────────────────────────────

function MiniFloorPlan({ project }: { project: Project }) {
  const hasDesign = ["design", "proposal", "negotiation", "win"].includes(project.stage);
  const variant = parseInt(project.id.replace("p", "")) % 3;
  if (!hasDesign) return (
    <div className="w-full h-full flex flex-col items-center justify-center rounded-lg border border-dashed"
      style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.09)" }}>
      <Upload className="w-5 h-5 text-[#484f58] mb-1.5" />
      <p className="text-[#484f58] text-[10px] font-semibold">No floor plan</p>
    </div>
  );
  if (variant === 0) return (
    <svg viewBox="0 0 200 112" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="112" fill="#070c1a" />
      <rect x="8" y="8" width="184" height="96" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.09)" strokeWidth="1" rx="1" />
      <rect x="8" y="8" width="60" height="40" fill="rgba(59,130,246,0.05)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
      <rect x="8" y="56" width="60" height="48" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
      <rect x="130" y="8" width="62" height="96" fill="rgba(139,92,246,0.04)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
      <text x="38" y="30" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">RECEPTION</text>
      <text x="38" y="82" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">OFFICE</text>
      <text x="161" y="56" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">SERVER</text>
      <path d={fovPath(18, 18, 135, 80, 28)} fill="rgba(59,130,246,0.18)" />
      <circle cx="18" cy="18" r="2.5" fill="#3b82f6" />
      <path d={fovPath(182, 18, 225, 80, 28)} fill="rgba(59,130,246,0.18)" />
      <circle cx="182" cy="18" r="2.5" fill="#3b82f6" />
      <path d={fovPath(18, 96, 45, 80, 28)} fill="rgba(59,130,246,0.18)" />
      <circle cx="18" cy="96" r="2.5" fill="#3b82f6" />
      <text x="186" y="109" textAnchor="end" fill="rgba(59,130,246,0.4)" fontSize="5" fontFamily="sans-serif">{project.cameras} cams</text>
    </svg>
  );
  if (variant === 1) return (
    <svg viewBox="0 0 200 112" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="112" fill="#070c1a" />
      <rect x="8" y="8" width="184" height="96" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.09)" strokeWidth="1" rx="1" />
      <rect x="8" y="8" width="184" height="22" fill="rgba(59,130,246,0.04)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
      <rect x="8" y="8" width="60" height="96" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      <text x="100" y="21" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">LOADING DOCK</text>
      <text x="38" y="68" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">STORAGE</text>
      <text x="133" y="72" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">WAREHOUSE FLOOR</text>
      {[30, 80, 130, 180].map((x, i) => (
        <g key={i}><path d={fovPath(x, 9, 90, 100, 40)} fill="rgba(59,130,246,0.12)" /><circle cx={x} cy={9} r="2.5" fill="#3b82f6" /></g>
      ))}
      <text x="186" y="109" textAnchor="end" fill="rgba(59,130,246,0.4)" fontSize="5" fontFamily="sans-serif">{project.cameras} cams</text>
    </svg>
  );
  return (
    <svg viewBox="0 0 200 112" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="112" fill="#070c1a" />
      <rect x="8" y="8" width="86" height="46" fill="rgba(59,130,246,0.05)" stroke="rgba(255,255,255,0.09)" strokeWidth="1" rx="1" />
      <rect x="106" y="8" width="86" height="46" fill="rgba(139,92,246,0.04)" stroke="rgba(255,255,255,0.09)" strokeWidth="1" rx="1" />
      <rect x="8" y="62" width="86" height="42" fill="rgba(16,185,129,0.03)" stroke="rgba(255,255,255,0.09)" strokeWidth="1" rx="1" />
      <rect x="106" y="62" width="86" height="42" fill="rgba(245,158,11,0.03)" stroke="rgba(255,255,255,0.09)" strokeWidth="1" rx="1" />
      <text x="51" y="30" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">DATA HALL A</text>
      <text x="149" y="30" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">DATA HALL B</text>
      <text x="51" y="84" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">SERVER ROOM</text>
      <text x="149" y="84" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="sans-serif">NOC</text>
      {[[18,18,135],[78,18,225],[18,98,45],[78,98,315],[118,18,135],[178,18,225],[118,98,45],[178,98,315]].map(([x,y,r],i) => (
        <g key={i}><path d={fovPath(x,y,r,80,24)} fill="rgba(59,130,246,0.15)" /><circle cx={x} cy={y} r="2" fill="#3b82f6" /></g>
      ))}
      <text x="186" y="109" textAnchor="end" fill="rgba(59,130,246,0.4)" fontSize="5" fontFamily="sans-serif">{project.cameras} cams</text>
    </svg>
  );
}

// ─── Stage badge ──────────────────────────────────────────────────────────────

function stageBadge(stage: Stage) {
  const map: Record<Stage, { label: string; cls: string }> = {
    "assessment-scheduled": { label: "Assessment", cls: "bg-amber-500/12 text-amber-400" },
    "assessment-completed": { label: "Assessed", cls: "bg-cyan-500/12 text-cyan-400" },
    design: { label: "In Design", cls: "bg-violet-500/12 text-violet-400" },
    proposal: { label: "Proposal", cls: "bg-blue-500/12 text-blue-400" },
    negotiation: { label: "Negotiating", cls: "bg-orange-500/12 text-orange-400" },
    win: { label: "Won", cls: "bg-emerald-500/12 text-emerald-400" },
    lose: { label: "Lost", cls: "bg-rose-500/12 text-rose-400" },
  };
  return map[stage];
}

// ─── System Design Studio ─────────────────────────────────────────────────────

function DesignStudio({ navigate }: { navigate: (p: Page) => void }) {
  const { fmt } = useCurrency();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<"all" | Stage>("all");
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [search, setSearch] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);

  const filtered = useMemo(() => {
    let result = projects;
    if (filter !== "all") result = result.filter((p) => p.stage === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || p.location.toLowerCase().includes(q));
    }
    return result;
  }, [projects, filter, search]);

  const stageFilters: { id: "all" | Stage; label: string }[] = [
    { id: "all", label: "All" }, { id: "design", label: "In Design" }, { id: "proposal", label: "Proposal" }, { id: "win", label: "Won" },
  ];
  const handleDelete = (id: string) => { setProjects((prev) => prev.filter((p) => p.id !== id)); toast.success("Project removed"); };

  return (
    <div className="px-5 py-6">
      {showUploadModal && <UploadFloorPlanModal onClose={() => setShowUploadModal(false)} />}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-bold text-xl tracking-tight">System Design Studio</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl p-0.5 gap-0.5" style={G.btn}>
            {(["grid", "list"] as const).map((m) => (
              <button key={m} onClick={() => setViewMode(m)}
                className={clsx("w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                  viewMode === m ? "text-white" : "text-[#484f58] hover:text-[#8b949e]")}
                style={viewMode === m ? { background: "rgba(255,255,255,0.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)" } : undefined}>
                {m === "grid" ? <Grid3x3 className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
          <button onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 h-8 px-4 rounded-xl text-white text-[12px] font-bold"
            style={{ background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.2)" }}>
            <Plus className="w-3.5 h-3.5" /> New Design
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {stageFilters.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={clsx("h-7 px-3 rounded-full text-[12px] font-semibold transition-all",
              filter === f.id ? "text-white" : "text-[#8b949e] hover:text-white")}
            style={filter === f.id ? { background: "#3b82f6", boxShadow: "0 2px 12px rgba(59,130,246,0.3)" } : G.subtle}>
            {f.label}
          </button>
        ))}
        <div className="relative ml-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="h-7 rounded-xl pl-7 pr-3 text-[12px] text-[#e6edf3] placeholder:text-[#484f58] focus:outline-none focus:ring-1 focus:ring-blue-500/50 w-44 transition-all"
            style={G.input} />
        </div>
        <span className="text-[#484f58] text-[12px] ml-1">{filtered.length} projects</span>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((project) => {
            const badge = stageBadge(project.stage);
            const hasDesign = ["design", "proposal", "negotiation", "win"].includes(project.stage);
            return (
              <div key={project.id} className="group rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 relative"
                style={{ ...G.card }}>
                <div className="relative h-[112px] bg-[#070c1a]" onClick={() => navigate("project-detail")}>
                  <MiniFloorPlan project={project} />
                  {hasDesign && (
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
                      <button onClick={(e) => { e.stopPropagation(); navigate("design-canvas"); }}
                        className="h-7 px-3 rounded-xl text-white text-[11px] font-bold flex items-center gap-1.5"
                        style={{ background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.4)" }}>
                        <Eye className="w-3 h-3" /> Open
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); downloadCSV(`${project.name.replace(/[^a-z0-9]/gi,"_")}.csv`, [["Name","Client","Stage","Value","Cameras","Devices","Location","Due Date"],[project.name,project.client,project.stage,String(project.value),String(project.cameras),String(project.devices),project.location,project.dueDate]]); toast.success("Exported project data"); }}
                        className="h-7 px-3 rounded-xl text-white text-[11px] font-bold flex items-center gap-1.5"
                        style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
                        <Download className="w-3 h-3" /> Export
                      </button>
                    </div>
                  )}
                  <div className={clsx("absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full", badge.cls)}>{badge.label}</div>
                </div>
                <div className="p-4" onClick={() => navigate("project-detail")}>
                  <h3 className="text-white text-[13px] font-semibold leading-snug mb-1 line-clamp-1">{project.name}</h3>
                  <p className="text-[#8b949e] text-[11px] font-medium mb-3 flex items-center gap-1"><Building2 className="w-3 h-3" /> {project.client}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-1 text-[#484f58] text-[11px]"><Camera className="w-3 h-3" />{project.cameras}</span>
                      <span className="flex items-center gap-1 text-[#484f58] text-[11px]"><Fingerprint className="w-3 h-3" />{project.devices}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ background: project.assignee.color, boxShadow: `0 0 8px ${project.assignee.color}55` }}>
                        {project.assignee.initials}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                        className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/20"
                        title="Delete project">
                        <Trash2 className="w-3 h-3 text-rose-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={G.card}>
          <div className="grid gap-4 px-4 py-2.5" style={{ gridTemplateColumns: "2fr 1fr 80px 80px 100px 80px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {["Project", "Client", "Cameras", "Devices", "Stage", "Value", ""].map((h) => (
              <span key={h} className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest">{h}</span>
            ))}
          </div>
          {filtered.map((project) => {
            const badge = stageBadge(project.stage);
            return (
              <div key={project.id}
                className="grid gap-4 px-4 py-3.5 items-center transition-all group hover:bg-white/[0.03]"
                style={{ gridTemplateColumns: "2fr 1fr 80px 80px 100px 80px 32px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="min-w-0 cursor-pointer" onClick={() => navigate("project-detail")}>
                  <p className="text-white text-[13px] font-semibold truncate group-hover:text-blue-400 transition-colors">{project.name}</p>
                  <p className="text-[#484f58] text-[11px] truncate">{project.location}</p>
                </div>
                <p className="text-[#8b949e] text-[12px] truncate font-medium">{project.client}</p>
                <p className="text-[#8b949e] text-[12px] flex items-center gap-1"><Camera className="w-3 h-3 text-[#484f58]" />{project.cameras}</p>
                <p className="text-[#8b949e] text-[12px] flex items-center gap-1"><Fingerprint className="w-3 h-3 text-[#484f58]" />{project.devices}</p>
                <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full w-fit", badge.cls)}>{badge.label}</span>
                <p className="text-white text-[13px] font-bold">{fmt(project.value, true)}</p>
                <button onClick={() => handleDelete(project.id)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/20">
                  <Trash2 className="w-3 h-3 text-rose-400" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Project Detail ───────────────────────────────────────────────────────────

const CASINO = PROJECTS.find((p) => p.id === "p13")!;
const AUDIT_LOG = [
  { id: "a1", action: "Quote v3 approved by client", user: "Marcus Webb", time: "2 hours ago", type: "approval" },
  { id: "a2", action: "Change order CO-004 raised — 12 additional cameras", user: "Priya Kapoor", time: "5 hours ago", type: "change" },
  { id: "a3", action: "Floor plan Rev C exported as PDF", user: "Sofia Reyes", time: "Yesterday 4:22 PM", type: "export" },
  { id: "a4", action: "Project stage moved to Negotiation", user: "Marcus Webb", time: "2 days ago", type: "stage" },
  { id: "a5", action: "Quote v2 sent to client — $1.24M", user: "Marcus Webb", time: "3 days ago", type: "quote" },
  { id: "a6", action: "Assessment report submitted", user: "Derek Cho", time: "5 days ago", type: "report" },
];

function ProjectDetail({ navigate }: { navigate: (p: Page) => void }) {
  const { fmt } = useCurrency();
  const [activeTab, setActiveTab] = useState("overview");
  const p = CASINO;
  const badge = stageBadge(p.stage);
  const tabs = ["overview", "quotes", "change-orders", "audit-log"];
  const tabLabels: Record<string, string> = { overview: "Overview", quotes: "Quotes", "change-orders": "Change Orders", "audit-log": "Audit Log" };
  const auditIcons: Record<string, React.ElementType> = { approval: CheckCircle2, change: AlertTriangle, export: Download, stage: Activity, quote: DollarSign, report: FileText };
  const auditColors: Record<string, string> = { approval: "text-emerald-400", change: "text-amber-400", export: "text-blue-400", stage: "text-violet-400", quote: "text-blue-400", report: "text-cyan-400" };

  return (
    <div className="px-5 py-6 max-w-[1200px]">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", badge.cls)}>{badge.label}</span>
            <span className="text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/12">HIGH RISK</span>
          </div>
          <h1 className="text-white font-bold text-2xl tracking-tight mb-1">{p.name}</h1>
          <p className="text-[#8b949e] text-[13px] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> {p.client} · <MapPin className="w-3.5 h-3.5 ml-1" /> {p.location}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {[
            { label: "Design", icon: Layers, color: "text-violet-400", action: () => navigate("design-canvas") },
            { label: "Install", icon: CheckSquare, color: "text-emerald-400", action: () => navigate("install-tracker") },
            { label: "Share", icon: Share2, color: "text-blue-400", action: undefined },
            { label: "Reports", icon: FileText, color: "text-cyan-400", action: undefined },
          ].map(({ label, icon: Icon, color, action }) => (
            <button key={label} onClick={action}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-white text-[12px] font-semibold transition-all hover:bg-white/[0.10]"
              style={G.btn}>
              <Icon className={clsx("w-3.5 h-3.5", color)} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: "Contract Value", value: fmt(p.value, true), icon: DollarSign, color: "#3b82f6" },
          { label: "Cameras", value: String(p.cameras), icon: Camera, color: "#8b5cf6" },
          { label: "Access Devices", value: String(p.devices), icon: Fingerprint, color: "#06b6d4" },
          { label: "Due Date", value: fmtDate(p.dueDate), icon: Calendar, color: "#f59e0b" },
          { label: "Install Progress", value: "0%", icon: Activity, color: "#10b981" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4" style={G.card}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#8b949e] text-[10px] font-bold uppercase tracking-[0.09em]">{s.label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}>
                <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-white text-xl font-bold tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-0.5 mb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={clsx("h-10 px-4 text-[13px] font-semibold border-b-2 transition-all -mb-px",
              activeTab === tab ? "border-blue-500 text-white" : "border-transparent text-[#8b949e] hover:text-white")}>
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            <div className="rounded-2xl p-5" style={G.card}>
              <h3 className="text-white text-[14px] font-bold mb-3">Project Scope</h3>
              <p className="text-[#8b949e] text-[13px] leading-relaxed">{p.summary ?? "Full-coverage surveillance deployment across the main casino floor, VIP suites, cage operations, and surrounding perimeter."}</p>
            </div>
            <div className="rounded-2xl p-5" style={G.card}>
              <h3 className="text-white text-[14px] font-bold mb-4">Project Team</h3>
              <div className="space-y-3">
                {[{ name: p.assignee.name, role: "Account Manager", initials: p.assignee.initials, color: p.assignee.color },
                  ...(p.collaborators ?? []).map(c => ({ name: c.name, role: c.role, initials: c.initials, color: c.color }))
                ].map((m) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                      style={{ background: m.color, boxShadow: `0 0 12px ${m.color}44` }}>{m.initials}</div>
                    <div><p className="text-white text-[13px] font-semibold">{m.name}</p><p className="text-[#8b949e] text-[11px]">{m.role}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={G.card}>
              <h3 className="text-white text-[14px] font-bold mb-4">Timeline</h3>
              <div className="space-y-3">
                {[
                  { phase: "Assessment", date: "Jun 12", done: true },
                  { phase: "Design", date: "Jun 30", done: true },
                  { phase: "Proposal Sent", date: "Jul 8", done: true },
                  { phase: "Negotiation", date: "Jul 18", done: false, current: true },
                  { phase: "Installation", date: "Aug 15", done: false },
                  { phase: "Sign-off", date: "Sep 1", done: false },
                ].map((item) => (
                  <div key={item.phase} className="flex items-center gap-3">
                    <div className={clsx("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                      item.done ? "bg-emerald-500/20" : item.current ? "bg-blue-500/20 ring-2 ring-blue-500/40" : "bg-white/[0.04]")}>
                      {item.done ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : item.current ? <Clock className="w-3 h-3 text-blue-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className={clsx("text-[12px] font-semibold", item.done ? "text-[#8b949e]" : item.current ? "text-white" : "text-[#484f58]")}>{item.phase}</span>
                      <span className="text-[#484f58] text-[11px]">{item.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-5" style={G.card}>
              <h3 className="text-white text-[14px] font-bold mb-3">Quick Links</h3>
              <div className="space-y-1.5">
                {[
                  { label: "Floor Plan Rev C", icon: Layers, color: "text-violet-400" },
                  { label: "Quote v3 — $1.24M", icon: DollarSign, color: "text-blue-400" },
                  { label: "Assessment Report", icon: FileText, color: "text-cyan-400" },
                  { label: "As-Built Draft", icon: Download, color: "text-emerald-400" },
                ].map((link) => (
                  <button key={link.label} className="w-full flex items-center gap-2.5 h-8 px-3 rounded-xl hover:bg-white/[0.05] transition-colors text-left">
                    <link.icon className={clsx("w-3.5 h-3.5 flex-shrink-0", link.color)} />
                    <span className="text-[#8b949e] text-[12px] font-medium hover:text-white transition-colors">{link.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "quotes" && (
        <div className="space-y-3">
          {[
            { id: "Q-2026-044-v3", date: "Jul 15, 2026", value: 1240000, status: "Pending Approval", margin: "31.4%" },
            { id: "Q-2026-044-v2", date: "Jul 8, 2026", value: 1185000, status: "Superseded", margin: "29.8%" },
            { id: "Q-2026-044-v1", date: "Jul 1, 2026", value: 1096000, status: "Superseded", margin: "27.2%" },
          ].map((q) => (
            <div key={q.id} className="flex items-center justify-between rounded-2xl p-4 transition-all group hover:-translate-y-0.5" style={G.card}>
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}>
                  <DollarSign className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-white text-[13px] font-semibold">{q.id}</p>
                  <p className="text-[#484f58] text-[11px]">{q.date} · Margin {q.margin}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", q.status === "Pending Approval" ? "bg-amber-500/12 text-amber-400" : "bg-white/[0.05] text-[#484f58]")}>{q.status}</span>
                <p className="text-white font-bold text-[15px]">{fmt(q.value, true)}</p>
                <button onClick={() => navigate("quote-builder")}
                  className="h-8 px-3 rounded-xl text-[#8b949e] text-[12px] font-semibold hover:text-white transition-all opacity-0 group-hover:opacity-100"
                  style={G.btn}>Open</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "change-orders" && (
        <div className="space-y-3">
          {[
            { id: "CO-004", title: "12 Additional PTZ Cameras — VIP Expansion", value: 58800, status: "Pending", date: "Jul 15" },
            { id: "CO-003", title: "Upgraded NVR Appliances (4× Dell R450)", value: 14200, status: "Approved", date: "Jul 10" },
            { id: "CO-002", title: "Extended Cable Runs — East Wing", value: 8900, status: "Approved", date: "Jul 5" },
            { id: "CO-001", title: "Additional Biometric Readers — High Security Zones", value: 22400, status: "Approved", date: "Jun 28" },
          ].map((co) => (
            <div key={co.id} className="flex items-center justify-between rounded-2xl p-4" style={G.card}>
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)" }}>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-white text-[13px] font-semibold">{co.id}</p>
                    <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-full", co.status === "Pending" ? "bg-amber-500/12 text-amber-400" : "bg-emerald-500/12 text-emerald-400")}>{co.status}</span>
                  </div>
                  <p className="text-[#8b949e] text-[12px]">{co.title}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-[15px]">+{fmt(co.value, true)}</p>
                <p className="text-[#484f58] text-[11px]">{co.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "audit-log" && (
        <div className="rounded-2xl overflow-hidden" style={G.card}>
          {AUDIT_LOG.map((entry) => {
            const Icon = auditIcons[entry.type] ?? FileText;
            return (
              <div key={entry.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Icon className={clsx("w-3.5 h-3.5", auditColors[entry.type])} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[13px] font-semibold">{entry.action}</p>
                  <p className="text-[#484f58] text-[11px]">{entry.user}</p>
                </div>
                <span className="text-[#484f58] text-[11px] flex-shrink-0">{entry.time}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ─── Design Canvas ────────────────────────────────────────────────────────────

const CANVAS_CAMERAS = [
  { id: "cam1", x: 118, y: 68, rot: 135, fov: 80, range: 90, label: "CAM-01 Reception NW", selected: false },
  { id: "cam2", x: 248, y: 68, rot: 225, fov: 80, range: 90, label: "CAM-02 Reception NE", selected: false },
  { id: "cam3", x: 418, y: 200, rot: 90, fov: 100, range: 80, label: "CAM-03 Corridor PTZ", selected: false },
  { id: "cam4", x: 518, y: 270, rot: 135, fov: 80, range: 110, label: "CAM-04 Hall A NW", selected: false },
  { id: "cam5", x: 870, y: 270, rot: 225, fov: 80, range: 110, label: "CAM-05 Hall A NE", selected: false },
  { id: "cam6", x: 518, y: 530, rot: 45, fov: 80, range: 110, label: "CAM-06 Hall A SW", selected: false },
  { id: "cam7", x: 870, y: 530, rot: 315, fov: 80, range: 110, label: "CAM-07 Hall A SE", selected: true },
  { id: "cam8", x: 108, y: 270, rot: 135, fov: 80, range: 100, label: "CAM-08 Hall B NW", selected: false },
  { id: "cam9", x: 358, y: 270, rot: 225, fov: 80, range: 100, label: "CAM-09 Hall B NE", selected: false },
  { id: "cam10", x: 108, y: 530, rot: 45, fov: 80, range: 100, label: "CAM-10 Hall B SW", selected: false },
];
const ACCESS_POINTS = [
  { id: "ac1", x: 118, y: 200, label: "AC-01 Reception Door" },
  { id: "ac2", x: 438, y: 370, label: "AC-02 Hall A Entry" },
  { id: "ac3", x: 358, y: 370, label: "AC-03 Hall B Entry" },
  { id: "ac4", x: 698, y: 68, label: "AC-04 Server Room 1" },
  { id: "ac5", x: 108, y: 430, label: "AC-05 Server Room 2" },
];
const CANVAS_TOOLS = [
  { id: "select", icon: MousePointer, label: "Select" },
  { id: "move", icon: Move, label: "Pan" },
  { id: "camera", icon: Camera, label: "Camera" },
  { id: "ptz", icon: RotateCcw, label: "PTZ Cam" },
  { id: "access", icon: Key, label: "Access Reader" },
  { id: "nvr", icon: Cpu, label: "NVR / Server" },
  { id: "cable", icon: Activity, label: "Cable Route" },
  { id: "zone", icon: Lock, label: "Zone" },
  { id: "label", icon: Pencil, label: "Label" },
  { id: "trash", icon: Trash2, label: "Delete" },
];

const CANVAS_DEVICE_LIBRARY = [
  { category: "Fixed Cameras", color: "#3b82f6", items: ["Axis P3245-V Dome", "Axis P3245-LV Vandal", "Axis P1448-LE 4K", "Axis Q6100-E Fisheye"] },
  { category: "PTZ Cameras", color: "#8b5cf6", items: ["Axis P5655-E PTZ", "Axis Q6215-LE PTZ", "Bosch MIC Fusion 9000i"] },
  { category: "Access Control", color: "#10b981", items: ["Suprema BioLite N2", "HID EVO Solo Controller", "Allegion Schlage NDE"] },
  { category: "Servers & NVR", color: "#f59e0b", items: ["Dell PowerEdge R450", "Axis S2212 NVR", "Genetec VMS Server"] },
];

function DesignCanvas({ navigate }: { navigate: (p: Page) => void }) {
  const [activeTool, setActiveTool] = useState("select");
  const [showDeviceTray, setShowDeviceTray] = useState(false);
  const [showProperties, setShowProperties] = useState(true);
  const [showFov, setShowFov] = useState(true);
  const [selectedCam, setSelectedCam] = useState("cam7");
  const [deviceSearch, setDeviceSearch] = useState("");
  const selected = CANVAS_CAMERAS.find((c) => c.id === selectedCam);

  const filteredDeviceLib = CANVAS_DEVICE_LIBRARY.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => item.toLowerCase().includes(deviceSearch.toLowerCase())),
  })).filter((cat) => cat.items.length > 0);

  const panelStyle: React.CSSProperties = {
    background: "rgba(7,12,26,0.80)",
    backdropFilter: "blur(40px) saturate(180%)",
    WebkitBackdropFilter: "blur(40px) saturate(180%)",
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#070c1a" }}>
      <header className="h-12 flex items-center gap-4 px-4 flex-shrink-0 z-40"
        style={{ ...panelStyle, borderBottom: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.5)" }}>
        <button onClick={() => navigate("project-detail")} className="flex items-center gap-1.5 text-[#8b949e] hover:text-white text-[12px] font-semibold transition-colors flex-shrink-0">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="w-px h-4 flex-shrink-0" style={{ background: "rgba(255,255,255,0.10)" }} />
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)" }}>
            <Layers className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div>
            <p className="text-white text-[12px] font-bold leading-none">Casino — Floor Surveillance</p>
            <p className="text-[#484f58] text-[10px]">Floor Plan Rev C · Golden Mirage Entertainment</p>
          </div>
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowFov(!showFov)}
          className={clsx("flex items-center gap-1.5 h-7 px-3 rounded-xl text-[11px] font-semibold transition-all",
            showFov ? "text-blue-400" : "text-[#8b949e] hover:text-white")}
          style={showFov ? { background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.30)" } : G.btn}>
          <Eye className="w-3 h-3" /> Show FOV
        </button>
        <button onClick={() => setShowDeviceTray(!showDeviceTray)}
          className={clsx("flex items-center gap-1.5 h-7 px-3 rounded-xl text-[11px] font-semibold transition-all",
            showDeviceTray ? "text-white" : "text-[#8b949e] hover:text-white")}
          style={G.btn}>
          <Package className="w-3 h-3" /> Devices
        </button>
        <div className="flex items-center gap-1 rounded-xl p-0.5" style={G.btn}>
          <button className="w-7 h-7 rounded-lg hover:bg-white/[0.08] flex items-center justify-center transition-colors"><ZoomOut className="w-3.5 h-3.5 text-[#8b949e]" /></button>
          <span className="text-white text-[11px] font-semibold px-2 min-w-[40px] text-center">100%</span>
          <button className="w-7 h-7 rounded-lg hover:bg-white/[0.08] flex items-center justify-center transition-colors"><ZoomIn className="w-3.5 h-3.5 text-[#8b949e]" /></button>
        </div>
        <button className="flex items-center gap-1.5 h-7 px-3 rounded-xl text-[#e6edf3] text-[11px] font-semibold hover:bg-white/[0.10] transition-all" style={G.btn}>
          <Download className="w-3 h-3" /> Export PDF
        </button>
        <button className="flex items-center gap-1.5 h-7 px-3 rounded-xl text-white text-[11px] font-bold"
          style={{ background: "#3b82f6", boxShadow: "0 2px 12px rgba(59,130,246,0.35)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <Share2 className="w-3 h-3" /> Share
        </button>
      </header>

      <div className="flex-1 relative overflow-hidden">
        <div className={clsx("absolute left-0 top-0 bottom-0 w-64 z-30 flex flex-col transition-transform duration-200", showDeviceTray ? "translate-x-0" : "-translate-x-full")}
          style={{ ...panelStyle, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-white text-[12px] font-bold">Device Library</p>
            <button onClick={() => setShowDeviceTray(false)} className="w-6 h-6 rounded-lg hover:bg-white/[0.08] flex items-center justify-center">
              <X className="w-3.5 h-3.5 text-[#8b949e]" />
            </button>
          </div>
          <div className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" />
              <input
                value={deviceSearch}
                onChange={(e) => setDeviceSearch(e.target.value)}
                placeholder="Search devices…"
                className="w-full h-7 rounded-xl pl-7 pr-2.5 text-[11px] text-[#e6edf3] placeholder:text-[#484f58] focus:outline-none"
                style={G.input} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {filteredDeviceLib.length === 0 && (
              <p className="text-[#484f58] text-[11px] text-center py-6">No devices match "{deviceSearch}"</p>
            )}
            {filteredDeviceLib.map((cat) => (
              <div key={cat.category} className="p-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color, boxShadow: `0 0 6px ${cat.color}` }} />{cat.category}
                </p>
                <div className="space-y-0.5">
                  {cat.items.map((item) => (
                    <button key={item} className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/[0.05] transition-colors flex items-center gap-2.5 group">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <Camera className="w-3 h-3 text-[#484f58]" />
                      </div>
                      <span className="text-[#8b949e] text-[11px] font-medium group-hover:text-white transition-colors truncate">{item}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center overflow-hidden cursor-crosshair">
          <svg viewBox="0 0 990 610" className="w-full h-full max-w-none" style={{ maxHeight: "calc(100vh - 140px)" }}>
            <rect width="990" height="610" fill="#070c1a" />
            <defs>
              <pattern id="cg" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.024)" strokeWidth="0.5" /></pattern>
              <pattern id="cg2" width="150" height="150" patternUnits="userSpaceOnUse"><path d="M 150 0 L 0 0 0 150" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" /></pattern>
            </defs>
            <rect width="990" height="610" fill="url(#cg)" />
            <rect width="990" height="610" fill="url(#cg2)" />
            <rect x="80" y="50" width="830" height="510" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" rx="2" />
            <rect x="80" y="50" width="220" height="150" fill="rgba(59,130,246,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x="190" y="132" textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize="9" fontFamily="sans-serif" fontWeight="600" letterSpacing="0.12em">RECEPTION</text>
            <rect x="640" y="50" width="270" height="150" fill="rgba(245,158,11,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x="775" y="132" textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize="9" fontFamily="sans-serif" fontWeight="600" letterSpacing="0.12em">SERVER ROOM 1</text>
            <rect x="80" y="200" width="830" height="60" fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <text x="495" y="234" textAnchor="middle" fill="rgba(255,255,255,0.08)" fontSize="8" fontFamily="sans-serif" fontWeight="600" letterSpacing="0.15em">MAIN CORRIDOR</text>
            <rect x="500" y="260" width="410" height="300" fill="rgba(139,92,246,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x="705" y="418" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="10" fontFamily="sans-serif" fontWeight="600" letterSpacing="0.12em">DATA HALL A</text>
            {[560,620,680,740,800,860].map((x) => <rect key={x} x={x} y="280" width="8" height="260" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" rx="1" />)}
            <rect x="80" y="260" width="360" height="300" fill="rgba(16,185,129,0.02)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x="260" y="418" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="10" fontFamily="sans-serif" fontWeight="600" letterSpacing="0.12em">DATA HALL B</text>
            {[120,160,200,240,280,320].map((x) => <rect key={x} x={x} y="280" width="8" height="260" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" rx="1" />)}
            <rect x="440" y="450" width="60" height="110" fill="rgba(6,182,212,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x="470" y="512" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="7" fontFamily="sans-serif" fontWeight="600" letterSpacing="0.1em">NOC</text>
            <rect x="80" y="450" width="220" height="110" fill="rgba(245,158,11,0.02)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x="190" y="512" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="9" fontFamily="sans-serif" fontWeight="600" letterSpacing="0.12em">SERVER ROOM 2</text>
            <rect x="300" y="199" width="30" height="3" fill="#070c1a" />
            <rect x="500" y="199" width="30" height="3" fill="#070c1a" />
            <rect x="180" y="199" width="30" height="3" fill="#070c1a" />
            <polyline points="190,200 190,240 470,240 470,260" fill="none" stroke="rgba(59,130,246,0.2)" strokeWidth="1.5" strokeDasharray="5,3" />
            <polyline points="694,200 694,240 470,240" fill="none" stroke="rgba(59,130,246,0.2)" strokeWidth="1.5" strokeDasharray="5,3" />
            <line x1="470" y1="260" x2="470" y2="450" stroke="rgba(59,130,246,0.2)" strokeWidth="1.5" strokeDasharray="5,3" />
            {showFov && CANVAS_CAMERAS.map((cam) => (
              <path key={`fov-${cam.id}`} d={fovPath(cam.x, cam.y, cam.rot, cam.fov, cam.range)}
                fill={cam.id === selectedCam ? "rgba(59,130,246,0.22)" : "rgba(59,130,246,0.10)"} />
            ))}
            {CANVAS_CAMERAS.map((cam) => (
              <g key={cam.id} onClick={() => setSelectedCam(cam.id)} style={{ cursor: "pointer" }}>
                <circle cx={cam.x} cy={cam.y} r={cam.id === selectedCam ? 7 : 5}
                  fill={cam.id === selectedCam ? "#3b82f6" : "#1d4ed8"}
                  stroke={cam.id === selectedCam ? "#93c5fd" : "rgba(59,130,246,0.5)"}
                  strokeWidth={cam.id === selectedCam ? 2 : 1} />
                {cam.id === selectedCam && <circle cx={cam.x} cy={cam.y} r="12" fill="none" stroke="rgba(59,130,246,0.4)" strokeWidth="1.5" strokeDasharray="3,2" />}
              </g>
            ))}
            {ACCESS_POINTS.map((ac) => (
              <g key={ac.id}>
                <rect x={ac.x-5} y={ac.y-5} width="10" height="10" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1.5" rx="1.5" />
                <text x={ac.x} y={ac.y+3} textAnchor="middle" fill="#10b981" fontSize="6" fontFamily="monospace">K</text>
              </g>
            ))}
            <g transform="translate(802,560)">
              <rect x="0" y="0" width="155" height="38" fill="rgba(7,12,26,0.9)" rx="6" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
              <circle cx="12" cy="12" r="4" fill="#3b82f6" />
              <text x="20" y="16" fill="rgba(255,255,255,0.5)" fontSize="7" fontFamily="sans-serif">Camera ({CANVAS_CAMERAS.length})</text>
              <rect x="8" y="24" width="8" height="8" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1" rx="1" />
              <text x="20" y="31" fill="rgba(255,255,255,0.5)" fontSize="7" fontFamily="sans-serif">Access control ({ACCESS_POINTS.length})</text>
              <line x1="80" y1="12" x2="110" y2="12" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5" strokeDasharray="4,2" />
              <text x="115" y="16" fill="rgba(255,255,255,0.5)" fontSize="7" fontFamily="sans-serif">Cable</text>
            </g>
          </svg>
        </div>

        {showProperties && selected && (
          <div className="absolute right-0 top-0 bottom-0 w-72 z-30 flex flex-col"
            style={{ ...panelStyle, borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-white text-[12px] font-bold">Properties</p>
              <button onClick={() => setShowProperties(false)} className="w-6 h-6 rounded-lg hover:bg-white/[0.08] flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-[#8b949e]" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4" style={{ scrollbarWidth: "none" }}>
              <div>
                <p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest mb-2">Device</p>
                <div className="rounded-xl p-3" style={G.card}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}>
                      <Camera className="w-4 h-4 text-blue-400" />
                    </div>
                    <div><p className="text-white text-[12px] font-bold">Axis P5655-E PTZ</p><p className="text-[#484f58] text-[10px]">Fixed Dome · IP Camera</p></div>
                  </div>
                  <p className="text-blue-400 text-[11px] font-semibold">{selected.label}</p>
                </div>
              </div>
              <div>
                <p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest mb-2">Position</p>
                <div className="grid grid-cols-2 gap-2">
                  {[{ label: "X", value: selected.x }, { label: "Y", value: selected.y }].map((f) => (
                    <div key={f.label} className="rounded-xl p-2.5" style={G.card}>
                      <p className="text-[#484f58] text-[10px] font-bold mb-1">{f.label}</p>
                      <p className="text-white text-[13px] font-bold">{f.value} px</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest mb-2">Field of View</p>
                <div className="space-y-2">
                  {[
                    { label: "Rotation", value: `${selected.rot}°` },
                    { label: "FOV Angle", value: `${selected.fov}°` },
                    { label: "Range", value: `${Math.round(selected.range * 0.3)} m` },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={G.card}>
                      <span className="text-[#8b949e] text-[11px] font-semibold">{f.label}</span>
                      <span className="text-white text-[12px] font-bold">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest mb-2">Specifications</p>
                <div className="rounded-xl p-3 space-y-2" style={G.card}>
                  {[["Resolution", "2MP (1920×1080)"], ["Sensor", "1/2.8\" Sony CMOS"], ["IR Range", "30 m"], ["PoE", "802.3at (PoE+)"], ["IP Rating", "IP66 / IK10"]].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-[#484f58] text-[11px]">{k}</span>
                      <span className="text-white text-[11px] font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 h-8 rounded-xl text-[#8b949e] text-[11px] font-semibold hover:text-white transition-all flex items-center justify-center gap-1.5" style={G.btn}>
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button className="flex-1 h-8 rounded-xl text-rose-400 text-[11px] font-semibold flex items-center justify-center gap-1.5"
                  style={{ background: "rgba(244,63,94,0.10)", border: "1px solid rgba(244,63,94,0.20)" }}>
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-3 py-2 rounded-2xl"
          style={{ background: "rgba(7,12,26,0.85)", backdropFilter: "blur(40px) saturate(180%)", WebkitBackdropFilter: "blur(40px) saturate(180%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.10)" }}>
          {CANVAS_TOOLS.map((tool, i) => (
            <div key={tool.id} className="flex items-center">
              {i === 2 && <div className="w-px h-6 mx-1" style={{ background: "rgba(255,255,255,0.10)" }} />}
              {i === 9 && <div className="w-px h-6 mx-1" style={{ background: "rgba(255,255,255,0.10)" }} />}
              <button onClick={() => setActiveTool(tool.id)} title={tool.label}
                className={clsx("w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150",
                  activeTool === tool.id ? "text-white" : "text-[#8b949e] hover:bg-white/[0.07] hover:text-white")}
                style={activeTool === tool.id ? { background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.45), inset 0 1px 0 rgba(255,255,255,0.2)" } : undefined}>
                <tool.icon className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="w-px h-6 mx-1" style={{ background: "rgba(255,255,255,0.10)" }} />
          <button onClick={() => setShowProperties(!showProperties)}
            className={clsx("w-9 h-9 rounded-xl flex items-center justify-center transition-all",
              showProperties ? "text-white" : "text-[#484f58] hover:text-white hover:bg-white/[0.05]")}
            style={showProperties ? { background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.12)" } : undefined}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quote Builder ────────────────────────────────────────────────────────────

const TAX_RATE = 0.085;

function QuoteBuilder({ navigate, quoteItems, setQuoteItems }: { navigate: (p: Page) => void; quoteItems: QuoteItem[]; setQuoteItems: React.Dispatch<React.SetStateAction<QuoteItem[]>> }) {
  const items = quoteItems;
  const setItems = setQuoteItems;
  const { fmt } = useCurrency();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [libSearch, setLibSearch] = useState("");
  const [libCategory, setLibCategory] = useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("p13");
  const [showProjectSelect, setShowProjectSelect] = useState(false);

  const selectedProject = PROJECTS.find((p) => p.id === selectedProjectId);

  const updateItem = (id: string, field: keyof QuoteItem, value: number) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const tax = subtotal * TAX_RATE;
    const grand = subtotal + tax;
    return { subtotal, tax, grand };
  }, [items]);

  const LABOUR_ITEMS = [
    { name: "Installation (Day)", sku: "LAB-INST", unitPrice: 1600 },
    { name: "Commissioning (Day)", sku: "LAB-COMM", unitPrice: 2200 },
    { name: "Cable Run (Drop)", sku: "LAB-CABL", unitPrice: 95 },
    { name: "Conduit Routing (Day)", sku: "LAB-COND", unitPrice: 1800 },
  ];

  const catalogGrouped = useMemo(() => {
    const CAT_LABELS: Record<string, string> = { camera: "Cameras", "access-control": "Access Control", nvr: "NVR / Storage", analytics: "VMS / Analytics" };
    const groups: Record<string, CatalogDevice[]> = {};
    CATALOG_DEVICES.forEach((d) => {
      const key = CAT_LABELS[d.category] ?? d.category;
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    return groups;
  }, []);

  const catalogCategories = ["all", ...Object.keys(catalogGrouped)];

  const filteredLib = useMemo(() => {
    const q = libSearch.toLowerCase().trim();
    const result: { category: string; devices: CatalogDevice[] }[] = [];
    Object.entries(catalogGrouped).forEach(([cat, devs]) => {
      if (libCategory !== "all" && cat !== libCategory) return;
      const matched = q ? devs.filter((d) => d.model.toLowerCase().includes(q) || d.manufacturer.toLowerCase().includes(q) || (d.sku ?? "").toLowerCase().includes(q)) : devs;
      if (matched.length > 0) result.push({ category: cat, devices: matched });
    });
    if (libCategory === "all" || libCategory === "Labour") {
      const labourMatched = q ? LABOUR_ITEMS.filter((l) => l.name.toLowerCase().includes(q)) : LABOUR_ITEMS;
      if (labourMatched.length) result.push({ category: "Labour", devices: labourMatched.map((l, i) => ({ id: `lab-${i}`, model: l.name, manufacturer: "Labour", category: "other" as const, price: l.unitPrice, sku: l.sku })) });
    }
    return result;
  }, [libSearch, libCategory, catalogGrouped]);

  const addFromLib = (device: CatalogDevice) => {
    if (!device.price) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.sku === device.sku);
      if (existing) {
        toast.success(`Qty +1 — ${device.model}`);
        return prev.map((i) => i.sku === device.sku ? { ...i, qty: i.qty + 1 } : i);
      }
      toast.success(`${device.model} added`);
      return [...prev, { id: `q${Date.now()}`, name: `${device.manufacturer} ${device.model}`, sku: device.sku ?? "", qty: 1, unitPrice: device.price! }];
    });
  };

  const sidebarStyle: React.CSSProperties = {
    background: "rgba(7,12,26,0.60)",
    backdropFilter: "blur(32px)",
    WebkitBackdropFilter: "blur(32px)",
  };

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {showProjectSelect && (
        <SelectProjectModal
          onClose={() => setShowProjectSelect(false)}
          onSelect={(id) => setSelectedProjectId(id)}
          currentId={selectedProjectId}
        />
      )}

      <div className="w-72 flex-shrink-0 flex flex-col" style={{ ...sidebarStyle, borderRight: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="px-3 pt-3 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-white text-[12px] font-bold mb-2">Device Library</p>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" />
            <input value={libSearch} onChange={(e) => setLibSearch(e.target.value)} placeholder="Search devices…"
              className="w-full h-7 rounded-xl pl-7 pr-2.5 text-[11px] text-[#e6edf3] placeholder:text-[#484f58] focus:outline-none" style={G.input} />
          </div>
          <div className="flex gap-1 flex-wrap">
            {catalogCategories.map((c) => (
              <button key={c} onClick={() => setLibCategory(c)}
                className="text-[9px] font-bold px-2 py-0.5 rounded-full transition-all"
                style={libCategory === c ? { background: "#3b82f620", color: "#60a5fa", border: "1px solid #3b82f640" } : { color: "#484f58", border: "1px solid rgba(255,255,255,0.06)" }}>
                {c === "all" ? "All" : c}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: "none" }}>
          {filteredLib.length === 0 && (
            <p className="text-[#484f58] text-[11px] text-center py-4">No match for "{libSearch}"</p>
          )}
          {filteredLib.map((group) => (
            <div key={group.category} className="mb-2">
              <p className="text-[#484f58] text-[9px] font-bold uppercase tracking-widest mb-1 px-3">{group.category}</p>
              {group.devices.map((device) => (
                <button key={device.id} onClick={() => addFromLib(device)}
                 className="w-full text-left px-3 py-2.5 hover:bg-white/[0.05] transition-colors flex items-center gap-3 group">
                  <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                    {device.imageUrl
                      ? <img src={device.imageUrl} alt={device.model} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                      : <Package className="w-3.5 h-3.5 text-[#484f58] m-auto mt-1.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#8b949e] text-[11px] font-semibold group-hover:text-white transition-colors truncate">{device.model}</p>
                    <p className="text-[#484f58] text-[9px] truncate">{device.manufacturer}</p>
                  </div>
                  <span className="text-[10px] font-bold text-[#3b82f6] flex-shrink-0">{device.price ? fmt(device.price, true) : "—"}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-white font-bold text-[15px]">Q-2026-044-v3</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/12 text-amber-400">Pending Approval</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowProjectSelect(true)}
                className="flex items-center gap-1.5 text-[#8b949e] hover:text-white text-[12px] font-semibold transition-colors"
                style={{ ...G.btn, padding: "4px 10px", borderRadius: "8px" }}>
                <Building2 className="w-3 h-3" />
                {selectedProject ? selectedProject.name : "Select project"}
                <ChevronDown className="w-3 h-3" />
              </button>
              {selectedProject && (
                <span className="text-[#484f58] text-[11px]">{selectedProject.client}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { downloadPDF(`Q-2026-044-v3_${selectedProject?.client?.replace(/[^a-z0-9]/gi,"_") ?? "quote"}.pdf`, items); }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[#8b949e] text-[12px] font-semibold hover:text-white transition-all" style={G.btn}>
              <FileText className="w-3.5 h-3.5" /> Export PDF
            </button>
            <button onClick={() => toast.success("Quote sent for approval — Marcus Webb notified")}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[#8b949e] text-[12px] font-semibold hover:text-white transition-all" style={G.btn}>
              <Share2 className="w-3.5 h-3.5" /> Send for Approval
            </button>
            <button onClick={() => toast.success("Quote Q-2026-044-v3 approved")}
              className="flex items-center gap-1.5 h-8 px-4 rounded-xl text-white text-[12px] font-bold"
              style={{ background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.2)" }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve Quote
            </button>
          </div>
        </div>

        <div className="grid gap-3 px-5 py-3 flex-shrink-0" style={{ gridTemplateColumns: "2fr 110px 130px 130px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          {["Line Item", "SKU", "Qty", "Line Total", ""].map((h) => (
            <span key={h} className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest">{h}</span>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
          {items.map((item, idx) => {
            const lineTotal = item.qty * item.unitPrice;
            const isSelected = selectedIds.has(item.id);
            return (
              <div key={item.id}
                onClick={() => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })}
                className={clsx("grid gap-4 px-5 py-4 items-center cursor-pointer transition-colors group",
                  isSelected ? "bg-blue-500/[0.07]" : "hover:bg-white/[0.02]",
                  idx % 2 === 1 && "bg-white/[0.01]")}
                style={{ gridTemplateColumns: "2fr 110px 130px 130px 32px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="min-w-0">
                  <p className="text-white text-[12px] font-semibold truncate">{item.name}</p>
                  <p className="text-[#484f58] text-[10px] tabular-nums">Unit: {fmt(item.unitPrice)}</p>
                </div>
                <span className="text-[#484f58] text-[11px] font-mono truncate">{item.sku}</span>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); updateItem(item.id, "qty", Math.max(1, item.qty - 1)); }} className="w-5 h-5 rounded-lg hover:bg-white/[0.10] flex items-center justify-center text-[#8b949e] transition-colors" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <ChevronDown className="w-2.5 h-2.5" />
                  </button>
                  <span className="text-white text-[12px] font-semibold w-10 text-center tabular-nums">{item.qty}</span>
                  <button onClick={(e) => { e.stopPropagation(); updateItem(item.id, "qty", item.qty + 1); }} className="w-5 h-5 rounded-lg hover:bg-white/[0.10] flex items-center justify-center text-[#8b949e] transition-colors" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <ChevronUp className="w-2.5 h-2.5" />
                  </button>
                </div>
                <span className="text-white text-[13px] font-bold tabular-nums">{fmt(lineTotal)}</span>
                <button onClick={(e) => { e.stopPropagation(); setItems((prev) => prev.filter((i) => i.id !== item.id)); }}
                  className="w-6 h-6 rounded-lg hover:bg-rose-500/15 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
                  <X className="w-3 h-3 text-rose-400" />
                </button>
              </div>
            );
          })}
          <div className="px-5 py-3">
            <button className="flex items-center gap-2 text-[#484f58] hover:text-blue-400 text-[12px] font-semibold transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add line item
            </button>
          </div>
        </div>
      </div>

      <div className="w-72 flex-shrink-0 flex flex-col" style={{ ...sidebarStyle, borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-white text-[12px] font-bold">Pricing Summary</p>
        </div>
        <div className="flex-1 p-4 space-y-3">
          <div className="rounded-2xl p-5" style={G.card}>
            <p className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest mb-1">Subtotal (ex. GCT)</p>
            <p className="text-white text-[1.4rem] font-bold tracking-tight tabular-nums">{fmt(totals.subtotal)}</p>
          </div>
          <div className="rounded-2xl p-4 space-y-2.5" style={G.card}>
            <div className="flex items-center justify-between">
              <span className="text-[#8b949e] text-[11px]">{`GCT (${(TAX_RATE * 100).toFixed(1)}%)`}</span>
              <span className="text-[#8b949e] text-[12px] font-bold tabular-nums">+{fmt(totals.tax)}</span>
            </div>
            <div className="pt-2.5 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-white text-[12px] font-bold">Grand Total</span>
              <span className="text-white text-[14px] font-bold tabular-nums">{fmt(totals.grand)}</span>
            </div>
          </div>
          <div className="rounded-2xl p-3" style={G.card}>
            <div className="grid grid-cols-2 gap-2">
              {[{ label: "Line Items", value: String(items.length) }, { label: "Total Units", value: String(items.reduce((s, i) => s + i.qty, 0)) }].map((s) => (
                <div key={s.label}>
                  <p className="text-[#484f58] text-[10px] font-bold mb-0.5">{s.label}</p>
                  <p className="text-white text-[14px] font-bold">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Device Library ───────────────────────────────────────────────────────────

const IMG = {
  dome: "https://images.unsplash.com/photo-1618482914248-29272d021005?w=400&q=80",
  bullet: "https://images.unsplash.com/photo-1496368077930-c1e31b4e5b44?w=400&q=80",
  ptz: "https://images.unsplash.com/photo-1589935447067-5531094415d1?w=400&q=80",
  outdoor: "https://images.unsplash.com/photo-1528312635006-8ea0bc49ec63?w=400&q=80",
  wall: "https://images.unsplash.com/photo-1549109926-58f039549485?w=400&q=80",
  rack: "https://images.unsplash.com/photo-1732327390234-c78eb47d1b88?w=400&q=80",
};

const CATALOG_DEVICES: CatalogDevice[] = [
  { id: "c1", model: "P3245-V", manufacturer: "Axis", category: "camera", resolution: "1920×1080 (2MP)", lens: "3–10mm P-Iris varifocal", sensor: "1/2.8\" progressive CMOS", nightVision: "IR 15m", weatherRating: "IP66 / IK10", powerInput: "PoE IEEE 802.3af (max 6.4W)", frameRate: "25/30fps", compression: "H.264, H.265, MJPEG", fov: "H: 102–28°  V: 56–16°", operatingTemp: "−30 °C to 50 °C", price: 485, sku: "AXI-P3245V", imageUrl: IMG.dome },
  { id: "c2", model: "P5655-E", manufacturer: "Axis", category: "camera", resolution: "1920×1080 (2MP)", lens: "4.3–129mm 30× optical autofocus", sensor: "1/2.8\" progressive CMOS", nightVision: "IR 250m", weatherRating: "IP66 / IK10", powerInput: "High PoE 802.3at (max 30W)", frameRate: "25/30fps", compression: "H.264, H.265, MJPEG", fov: "H: 62.9–2.2°", operatingTemp: "−40 °C to 65 °C", price: 2890, sku: "AXI-P5655E", imageUrl: IMG.ptz },
  { id: "c3", model: "M3046-V", manufacturer: "Axis", category: "camera", resolution: "2688×1520 (4MP)", lens: "2.4mm fixed", sensor: "1/3\" progressive CMOS", nightVision: "N/A (indoor)", weatherRating: "IK08", powerInput: "PoE IEEE 802.3af (max 4.7W)", frameRate: "25/30fps", compression: "H.264, H.265, MJPEG", fov: "H: 106°  V: 57°", operatingTemp: "0 °C to 45 °C", price: 385, sku: "AXI-M3046V", imageUrl: IMG.dome },
  { id: "c4", model: "P1465-LE", manufacturer: "Axis", category: "camera", resolution: "1920×1080 (2MP)", lens: "2.8mm fixed", sensor: "1/2.9\" progressive CMOS", nightVision: "IR 25m", weatherRating: "IP66 / IK10", powerInput: "PoE IEEE 802.3af (max 7.5W)", frameRate: "25/30fps", compression: "H.264, H.265, MJPEG", fov: "H: 102°  V: 55°", operatingTemp: "−40 °C to 55 °C", price: 520, sku: "AXI-P1465LE", imageUrl: IMG.bullet },
  { id: "c5", model: "Q6075-E", manufacturer: "Axis", category: "camera", resolution: "1920×1080 (2MP)", lens: "5.7–205mm 36× optical autofocus", sensor: "1/2.8\" progressive CMOS", nightVision: "IR 400m", weatherRating: "IP66 / IK10", powerInput: "High PoE 802.3at (max 55W)", frameRate: "25/30fps", compression: "H.264, H.265, MJPEG", fov: "H: 63.4–1.8°", operatingTemp: "−50 °C to 65 °C", price: 4200, sku: "AXI-Q6075E", imageUrl: IMG.ptz },
  { id: "c6", model: "Sarix IBE332-1IR", manufacturer: "Pelco", category: "camera", resolution: "3840×2160 (8MP)", lens: "2.8–12mm varifocal", sensor: "1/2.5\" progressive CMOS", nightVision: "IR 50m", weatherRating: "IP66 / IK10", powerInput: "PoE+ 802.3at (max 25.5W)", frameRate: "15fps @ 4K / 30fps @ 1080p", compression: "H.264, H.265, MJPEG", fov: "H: 117–33°", operatingTemp: "−40 °C to 50 °C", price: 795, sku: "PEL-IBE332", imageUrl: IMG.outdoor },
  { id: "c7", model: "Spectra Enhanced 7", manufacturer: "Pelco", category: "camera", resolution: "1920×1080 (2MP)", lens: "5.9–177mm 30× optical autofocus", sensor: "1/2.8\" progressive CMOS", nightVision: "IR 200m", weatherRating: "IP66 / IK10", powerInput: "24VAC / High PoE 802.3at", frameRate: "25/30fps", compression: "H.264, H.265", fov: "H: 62.3–2.1°", operatingTemp: "−40 °C to 65 °C", price: 3200, sku: "PEL-SE7", imageUrl: IMG.ptz },
  { id: "c8", model: "Optera IMM 12027", manufacturer: "Pelco", category: "camera", resolution: "12MP panoramic (4 × 3MP)", lens: "Four 2.8mm fixed sensors", sensor: "1/2.9\" CMOS (×4)", nightVision: "N/A", weatherRating: "IP66 / IK10", powerInput: "PoE+ 802.3at (max 25W)", frameRate: "12fps per sensor", compression: "H.264, MJPEG", fov: "360° horizontal", operatingTemp: "−40 °C to 50 °C", price: 2400, sku: "PEL-IMM12027", imageUrl: IMG.dome },
  { id: "c9", model: "ExSite Enhanced 2", manufacturer: "Pelco", category: "camera", resolution: "1920×1080 (2MP)", lens: "6.5–260mm 40× optical autofocus", sensor: "1/2.8\" progressive CMOS", nightVision: "IR 350m", weatherRating: "IP68 / IK10", powerInput: "24VAC", frameRate: "25/30fps", compression: "H.264, H.265", fov: "H: 53.5–1.4°", operatingTemp: "−50 °C to 60 °C", price: 5800, sku: "PEL-EXE2", imageUrl: IMG.ptz },
  { id: "c10", model: "H5A Dome", manufacturer: "Avigilon", category: "camera", resolution: "3840×2160 (8MP)", lens: "4.9–8mm varifocal", sensor: "1/2.5\" progressive CMOS", nightVision: "IR 30m", weatherRating: "IK10", powerInput: "PoE+ 802.3at (max 25.5W)", frameRate: "20fps @ 8MP / 30fps @ 4MP", compression: "H.264, H.265", fov: "H: 108–65°", operatingTemp: "−10 °C to 50 °C", price: 950, sku: "AVI-H5A-DO", imageUrl: IMG.dome },
  { id: "c11", model: "H5A Bullet", manufacturer: "Avigilon", category: "camera", resolution: "3840×2160 (8MP)", lens: "4.9–8mm varifocal", sensor: "1/2.5\" progressive CMOS", nightVision: "IR 50m", weatherRating: "IP67 / IK10", powerInput: "PoE+ 802.3at (max 25.5W)", frameRate: "20fps @ 8MP / 30fps @ 4MP", compression: "H.264, H.265", fov: "H: 108–65°", operatingTemp: "−40 °C to 50 °C", price: 985, sku: "AVI-H5A-BO", imageUrl: IMG.bullet },
  { id: "c12", model: "H5SL PTZ", manufacturer: "Avigilon", category: "camera", resolution: "1920×1080 (2MP)", lens: "4.7–94mm 20× optical autofocus", sensor: "1/2.8\" progressive CMOS", nightVision: "IR 150m", weatherRating: "IP66 / IK10", powerInput: "High PoE 802.3at (max 55W)", frameRate: "30fps", compression: "H.264, H.265", fov: "H: 60.1–3.1°", operatingTemp: "−40 °C to 60 °C", price: 3600, sku: "AVI-H5SL-PTZ", imageUrl: IMG.ptz },
  { id: "c13", model: "H6A Fisheye", manufacturer: "Avigilon", category: "camera", resolution: "7680×4320 (32MP)", lens: "1.05mm fisheye", sensor: "1/1.8\" progressive CMOS", nightVision: "N/A", weatherRating: "IK10", powerInput: "PoE+ 802.3at (max 25.5W)", frameRate: "15fps @ 32MP / 30fps @ 8MP", compression: "H.264, H.265", fov: "360° panoramic", operatingTemp: "0 °C to 40 °C", price: 1850, sku: "AVI-H6A-FE", imageUrl: IMG.dome },
  { id: "n1", model: "Security Center 5.11", manufacturer: "Genetec", category: "analytics", sku: "GSC-511-E", price: 22500, channels: "300 cameras", imageUrl: IMG.rack },
  { id: "n2", model: "Synergis Cloud Link", manufacturer: "Genetec", category: "access-control", sku: "GSC-SCL", price: 1850, readers: "32 doors", imageUrl: IMG.rack },
  { id: "n3", model: "AutoVu ALPR 6.0", manufacturer: "Genetec", category: "analytics", sku: "GSC-ALPR", price: 8500, channels: "License plate recognition", imageUrl: IMG.outdoor },
  { id: "a1", model: "BioLite N2", manufacturer: "Suprema", category: "access-control", authentication: "Fingerprint + RFID", weatherRating: "IP65", powerInput: "12VDC / PoE", price: 890, sku: "SUP-BION2", imageUrl: IMG.wall },
  { id: "a2", model: "BioStation 3", manufacturer: "Suprema", category: "access-control", authentication: "Face + Fingerprint + Card", weatherRating: "IP65", powerInput: "12VDC / PoE", price: 1450, sku: "SUP-BS3", imageUrl: IMG.wall },
  { id: "a3", model: "Edge EVO Solo", manufacturer: "HID", category: "access-control", authentication: "Multi-tech RFID", weatherRating: "IP65 / IK08", powerInput: "12VDC", price: 1240, sku: "HID-EVOS", imageUrl: IMG.wall },
  { id: "a4", model: "Signo 20", manufacturer: "HID", category: "access-control", authentication: "Biometric keypad", weatherRating: "IP67 / IK09", powerInput: "12-24VDC / PoE", price: 980, sku: "HID-SIGNO20", imageUrl: IMG.wall },
  { id: "s1", model: "Camera Station S2212", manufacturer: "Axis", category: "nvr", storage: "12-bay rack", channels: "64 cameras", powerInput: "Redundant PSU", price: 6800, sku: "ACS-S2212", imageUrl: IMG.rack },
  { id: "s2", model: "VideoXpert Pro", manufacturer: "Pelco", category: "nvr", storage: "16-bay rack", channels: "128 cameras", powerInput: "Redundant PSU", price: 8900, sku: "PEL-VXPRO", imageUrl: IMG.rack },
  { id: "s3", model: "ACC 7 Server", manufacturer: "Avigilon", category: "nvr", storage: "Custom build", channels: "256 cameras", powerInput: "Redundant PSU", price: 12000, sku: "AVI-ACC7", imageUrl: IMG.rack },
];

const CAT_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  camera: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", label: "Camera" },
  "access-control": { bg: "rgba(139,92,246,0.12)", text: "#a78bfa", label: "Access" },
  nvr: { bg: "rgba(16,185,129,0.12)", text: "#34d399", label: "NVR" },
  analytics: { bg: "rgba(249,115,22,0.12)", text: "#fb923c", label: "VMS" },
  other: { bg: "rgba(100,100,100,0.12)", text: "#8b949e", label: "Other" },
};

function DeviceSpecModal({ device, onClose }: { device: CatalogDevice; onClose: () => void }) {
  const { addToQuote } = useQuote();
  const { fmt } = useCurrency();
  const cc = CAT_COLOR[device.category] ?? CAT_COLOR.other;
  const specs: { label: string; value?: string }[] = [
    { label: "SKU", value: device.sku },
    { label: "Category", value: cc.label },
    { label: "Resolution", value: device.resolution },
    { label: "Sensor", value: device.sensor },
    { label: "Lens", value: device.lens },
    { label: "Frame Rate", value: device.frameRate },
    { label: "Compression", value: device.compression },
    { label: "Field of View", value: device.fov },
    { label: "Night Vision", value: device.nightVision },
    { label: "Weather Rating", value: device.weatherRating },
    { label: "Power Input", value: device.powerInput },
    { label: "Storage", value: device.storage },
    { label: "Max Cameras", value: device.channels },
    { label: "Max Readers", value: device.readers },
    { label: "Authentication", value: device.authentication },
    { label: "Operating Temp", value: device.operatingTemp },
  ].filter((s) => !!s.value);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 340 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-[780px] rounded-3xl overflow-hidden flex"
        style={{ background: "rgba(7,12,26,0.95)", backdropFilter: "blur(52px) saturate(200%)", WebkitBackdropFilter: "blur(52px) saturate(200%)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 40px 100px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.12)", maxHeight: "88vh" }}>
        <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${cc.text}cc, ${cc.text}22)` }} />
        <div className="w-56 flex-shrink-0 relative" style={{ background: "rgba(255,255,255,0.03)" }}>
          {device.imageUrl
            ? <img src={device.imageUrl} alt={device.model} className="w-full h-full object-cover opacity-80" style={{ minHeight: "320px" }} />
            : <div className="w-full h-full flex items-center justify-center" style={{ minHeight: "320px" }}><Camera className="w-16 h-16 text-[#484f58]" /></div>}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, transparent 60%, rgba(7,12,26,0.8))" }} />
          <div className="absolute bottom-4 left-4">
            <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider" style={{ background: cc.bg, color: cc.text }}>
              {cc.label}
            </span>
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-6 pb-4 flex items-start justify-between flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div>
              <p className="text-[#8b949e] text-[12px] font-semibold">{device.manufacturer}</p>
              <h2 className="text-white text-[1.25rem] font-bold tracking-tight mt-0.5">{device.model}</h2>
              {device.price && (
                <p className="text-[1rem] font-bold mt-1 tabular-nums" style={{ color: cc.text }}>{fmt(device.price)} <span className="text-[#484f58] text-[11px] font-normal">/ unit (excl. GCT)</span></p>
              )}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] transition-colors flex-shrink-0"
              style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
              <X className="w-4 h-4 text-[#8b949e]" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: "none" }}>
            <div className="grid grid-cols-2 gap-3">
              {specs.map((s) => (
                <div key={s.label} className="rounded-xl p-3" style={G.subtle}>
                  <p className="text-[#484f58] text-[9px] font-bold uppercase tracking-widest mb-1">{s.label}</p>
                  <p className="text-white text-[12px] font-semibold">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="px-6 py-4 flex items-center gap-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <button onClick={() => { addToQuote(device); onClose(); }}
              className="flex items-center gap-2 h-9 px-5 rounded-xl text-white text-[12px] font-bold"
              style={{ background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.2)" }}>
              <Plus className="w-3.5 h-3.5" /> Add to Quote
            </button>
            <button onClick={() => toast.success(`Spec sheet for ${device.model} would open here`)}
              className="flex items-center gap-2 h-9 px-4 rounded-xl text-[#8b949e] text-[12px] font-semibold hover:text-white transition-all"
              style={G.btn}>
              <ExternalLink className="w-3.5 h-3.5" /> Spec Sheet
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DeviceLibrary({ navigate: _navigate }: { navigate: (p: Page) => void }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [manufacturerFilter, setManufacturerFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedDevice, setSelectedDevice] = useState<CatalogDevice | null>(null);
  const { addToQuote } = useQuote();
  const { fmt } = useCurrency();

  const manufacturers = Array.from(new Set(CATALOG_DEVICES.map((d) => d.manufacturer))).sort();
  const categories: { id: string; label: string }[] = [
    { id: "all", label: "All Devices" },
    { id: "camera", label: "Cameras" },
    { id: "access-control", label: "Access Control" },
    { id: "nvr", label: "NVR / Storage" },
    { id: "analytics", label: "Analytics / VMS" },
  ];

  const filtered = useMemo(() => {
    let result = CATALOG_DEVICES;
    if (categoryFilter !== "all") result = result.filter((d) => d.category === categoryFilter);
    if (manufacturerFilter !== "all") result = result.filter((d) => d.manufacturer === manufacturerFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d) => d.model.toLowerCase().includes(q) || d.manufacturer.toLowerCase().includes(q) || (d.sku ?? "").toLowerCase().includes(q));
    }
    return result;
  }, [search, categoryFilter, manufacturerFilter]);

  const inputCls = "h-9 rounded-xl px-3 text-[#e6edf3] text-[12px] placeholder:text-[#484f58] focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all";

  return (
    <div className="px-5 py-6">
      {selectedDevice && <DeviceSpecModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-bold text-xl tracking-tight">Device Library</h1>
          <p className="text-[#8b949e] text-[13px] mt-0.5">{filtered.length} products · Axis · Avigilon · Pelco · Genetec · Suprema · HID</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center h-8 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <button onClick={() => setViewMode("grid")} className="h-full px-2.5 flex items-center justify-center transition-all"
              style={viewMode === "grid" ? { background: "#3b82f620", color: "#60a5fa" } : { color: "#484f58" }}>
              <Grid3x3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setViewMode("table")} className="h-full px-2.5 flex items-center justify-center transition-all"
              style={viewMode === "table" ? { background: "#3b82f620", color: "#60a5fa" } : { color: "#484f58" }}>
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={() => { toast.success("Device catalog exported"); downloadCSV("device-library.csv", [["Model","Manufacturer","Category","SKU","Price (USD)","Resolution","Lens","Sensor","Night Vision","Weather","Power","Frame Rate","Compression","FOV","Operating Temp"], ...filtered.map((d) => [d.model, d.manufacturer, d.category, d.sku ?? "", d.price ? String(d.price) : "", d.resolution ?? "", d.lens ?? "", d.sensor ?? "", d.nightVision ?? "", d.weatherRating ?? "", d.powerInput ?? "", d.frameRate ?? "", d.compression ?? "", d.fov ?? "", d.operatingTemp ?? ""])]); }}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-[#8b949e] text-[12px] font-semibold hover:text-white transition-all" style={G.btn}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#484f58]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search model, SKU…" className={`${inputCls} pl-9 w-full`} style={G.input} />
        </div>
        <div className="flex gap-2">
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCategoryFilter(c.id)}
              className="h-9 px-3.5 rounded-xl text-[12px] font-semibold transition-all"
              style={categoryFilter === c.id
                ? { background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.35)", color: "#60a5fa" }
                : { ...G.btn, color: "#8b949e" }}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <select value={manufacturerFilter} onChange={(e) => setManufacturerFilter(e.target.value)}
            className={`${inputCls} appearance-none cursor-pointer pr-7 min-w-[150px]`} style={G.input}>
            <option value="all" style={{ background: "#0d1117" }}>All Brands</option>
            {manufacturers.map((m) => <option key={m} value={m} style={{ background: "#0d1117" }}>{m}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58] pointer-events-none" />
        </div>
      </div>

      {viewMode === "grid" && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {filtered.map((device) => {
            const cc = CAT_COLOR[device.category] ?? CAT_COLOR.other;
            return (
              <div key={device.id} onClick={() => setSelectedDevice(device)}
                className="rounded-2xl overflow-hidden cursor-pointer group transition-all hover:-translate-y-1"
                style={{ ...G.card, boxShadow: "0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.09)" }}>
                <div className="relative h-36 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                  {device.imageUrl
                    ? <img src={device.imageUrl} alt={device.model} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" />
                    : <div className="w-full h-full flex items-center justify-center"><Camera className="w-12 h-12 text-[#484f58]" /></div>}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,12,26,0.7) 0%, transparent 60%)" }} />
                  <div className="absolute top-2.5 left-2.5">
                    <span className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm" style={{ background: cc.bg, color: cc.text, border: `1px solid ${cc.text}30` }}>{cc.label}</span>
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    <button onClick={(e) => { e.stopPropagation(); addToQuote(device); }}
                      className="w-7 h-7 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                      style={{ background: "rgba(59,130,246,0.9)", boxShadow: "0 4px 12px rgba(59,130,246,0.4)" }}>
                      <Plus className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>
                <div className="p-3.5">
                  <p className="text-[#8b949e] text-[10px] font-semibold">{device.manufacturer}</p>
                  <p className="text-white text-[13px] font-bold mt-0.5 truncate">{device.model}</p>
                  {device.resolution && <p className="text-[#484f58] text-[10px] mt-1 truncate">{device.resolution}</p>}
                  {device.authentication && <p className="text-[#484f58] text-[10px] mt-1 truncate">{device.authentication}</p>}
                  {device.channels && !device.resolution && <p className="text-[#484f58] text-[10px] mt-1 truncate">{device.channels}</p>}
                  <div className="flex items-center justify-between mt-3 pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-[#484f58] text-[9px] font-mono">{device.sku}</span>
                    <span className="font-bold text-[12px] tabular-nums" style={{ color: cc.text }}>{device.price ? fmt(device.price) : "—"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "table" && (
        <div className="rounded-2xl overflow-hidden" style={G.card}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: "1100px" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["", "Model", "Manufacturer", "Category", "Resolution", "Sensor", "Night Vision", "Weather", "Power", "Frame Rate", "SKU", "Price"].map((h) => (
                    <th key={h} className={`${h === "Price" ? "text-right" : "text-left"} px-4 py-3 text-[#484f58] text-[10px] font-bold uppercase tracking-widest`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((device, i) => {
                  const cc = CAT_COLOR[device.category] ?? CAT_COLOR.other;
                  return (
                    <tr key={device.id} onClick={() => setSelectedDevice(device)} className="cursor-pointer hover:bg-white/[0.02] transition-colors group"
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <td className="px-4 py-2.5">
                        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)" }}>
                          {device.imageUrl ? <img src={device.imageUrl} alt={device.model} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" /> : <Camera className="w-4 h-4 text-[#484f58] m-auto mt-2.5" />}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-white text-[12px] font-semibold">{device.model}</td>
                      <td className="px-4 py-2.5 text-[#8b949e] text-[11px]">{device.manufacturer}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider" style={{ background: cc.bg, color: cc.text }}>{cc.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-[#8b949e] text-[11px]">{device.resolution || device.channels || "—"}</td>
                      <td className="px-4 py-2.5 text-[#8b949e] text-[11px]">{device.sensor || device.authentication || "—"}</td>
                      <td className="px-4 py-2.5 text-[#8b949e] text-[11px]">{device.nightVision || "—"}</td>
                      <td className="px-4 py-2.5 text-[#8b949e] text-[11px]">{device.weatherRating || "—"}</td>
                      <td className="px-4 py-2.5 text-[#8b949e] text-[11px]">{device.powerInput || device.storage || "—"}</td>
                      <td className="px-4 py-2.5 text-[#8b949e] text-[11px]">{device.frameRate || "—"}</td>
                      <td className="px-4 py-2.5 text-[#484f58] text-[10px] font-mono">{device.sku}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-white text-[12px] font-bold tabular-nums">{device.price ? fmt(device.price) : "—"}</span>
                          <button onClick={(e) => { e.stopPropagation(); addToQuote(device); }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                            style={{ background: "#3b82f6" }}>
                            <Plus className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Install Tracker ──────────────────────────────────────────────────────────

const STATUS_META: Record<InstallStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  complete: { label: "Complete", color: "text-emerald-400", bg: "bg-emerald-500/12", icon: CheckCircle2 },
  "in-progress": { label: "In Progress", color: "text-blue-400", bg: "bg-blue-500/12", icon: Clock },
  failed: { label: "Failed / Defect", color: "text-rose-400", bg: "bg-rose-500/12", icon: AlertTriangle },
  pending: { label: "Pending", color: "text-[#484f58]", bg: "bg-white/[0.04]", icon: AlertCircle },
};

function InstallTracker({ navigate: _navigate }: { navigate: (p: Page) => void }) {
  const [zones, setZones] = useState<InstallZone[]>(INITIAL_ZONES);
  const [expandedZone, setExpandedZone] = useState<string | null>("z1");
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceLocation, setNewDeviceLocation] = useState("");
  const [newDeviceType, setNewDeviceType] = useState<"camera" | "access" | "nvr">("camera");
  const [newDeviceZone, setNewDeviceZone] = useState("z1");
  const [newDeviceAssignee, setNewDeviceAssignee] = useState("T. Morales");

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;
    const device: InstallDevice = {
      id: `d${Date.now()}`, name: newDeviceName.trim(), type: newDeviceType,
      location: newDeviceLocation.trim() || "TBD", status: "pending", assignee: newDeviceAssignee,
    };
    setZones((prev) => prev.map((z) => z.id === newDeviceZone ? { ...z, devices: [...z.devices, device] } : z));
    setShowAddDevice(false); setNewDeviceName(""); setNewDeviceLocation("");
    setExpandedZone(newDeviceZone);
    toast.success("Device added to install list");
  };

  const handleExport = () => {
    const rows: string[][] = [["Zone","Device","Type","Location","Assignee","Status"]];
    zones.forEach((z) => z.devices.forEach((d) => rows.push([z.name, d.name, d.type, d.location, d.assignee, d.status])));
    downloadCSV("install-report.csv", rows);
    toast.success("Install report exported");
  };

  const updateStatus = (zoneId: string, deviceId: string, status: InstallStatus) => {
    setZones((prev) => prev.map((z) => z.id !== zoneId ? z : { ...z, devices: z.devices.map((d) => d.id !== deviceId ? d : { ...d, status }) }));
  };

  const allDevices = zones.flatMap((z) => z.devices);
  const complete = allDevices.filter((d) => d.status === "complete").length;
  const inProg = allDevices.filter((d) => d.status === "in-progress").length;
  const failed = allDevices.filter((d) => d.status === "failed").length;
  const total = allDevices.length;
  const pct = Math.round((complete / total) * 100);
  const typeIcons: Record<string, React.ElementType> = { camera: Camera, access: Key, nvr: Cpu };

  return (
    <div className="px-5 py-6 max-w-[1100px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-bold text-xl tracking-tight">Install Tracker</h1>
          <p className="text-[#8b949e] text-[13px] mt-0.5">Data Center — Full Security Stack · Stratum Cloud Services</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[#8b949e] text-[12px] font-semibold hover:text-white transition-all" style={G.btn}>
            <Download className="w-3.5 h-3.5" /> Export Report
          </button>
          <button onClick={() => setShowAddDevice(true)} className="flex items-center gap-1.5 h-8 px-4 rounded-xl text-white text-[12px] font-bold"
            style={{ background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.2)" }}>
            <Plus className="w-3.5 h-3.5" /> Add Device
          </button>
        </div>
      </div>
      {showAddDevice && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowAddDevice(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} />
          <motion.div initial={{ opacity: 0, scale: 0.94, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 360 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-[440px] rounded-3xl overflow-hidden"
            style={{ background: "rgba(7,12,26,0.92)", backdropFilter: "blur(52px)", WebkitBackdropFilter: "blur(52px)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 32px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.11)" }}>
            <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-3xl" style={{ background: "linear-gradient(90deg, #3b82f6dd, #3b82f633)" }} />
            <div className="flex items-center justify-between px-6 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div><h2 className="text-white text-[1rem] font-bold">Add Device</h2><p className="text-[#8b949e] text-[12px] mt-0.5">Add a new device to the install list</p></div>
              <button onClick={() => setShowAddDevice(false)} className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-white/[0.08]" style={{ border: "1px solid rgba(255,255,255,0.10)" }}><X className="w-4 h-4 text-[#8b949e]" /></button>
            </div>
            <form onSubmit={handleAddDevice} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[#8b949e] text-[10px] font-bold uppercase tracking-widest mb-1.5">Device Name *</label>
                <input value={newDeviceName} onChange={(e) => setNewDeviceName(e.target.value)} placeholder="e.g. Axis P3245-V Dome Camera"
                  className="w-full h-9 rounded-xl px-3 text-[#e6edf3] text-[12px] placeholder:text-[#484f58] focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  style={G.input} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8b949e] text-[10px] font-bold uppercase tracking-widest mb-1.5">Type</label>
                  <div className="relative">
                    <select value={newDeviceType} onChange={(e) => setNewDeviceType(e.target.value as "camera" | "access" | "nvr")}
                      className="w-full h-9 rounded-xl px-3 text-[#e6edf3] text-[12px] focus:outline-none appearance-none cursor-pointer pr-7"
                      style={G.input}>
                      <option value="camera" style={{ background: "#0d1117" }}>Camera</option>
                      <option value="access" style={{ background: "#0d1117" }}>Access Control</option>
                      <option value="nvr" style={{ background: "#0d1117" }}>NVR / Server</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[#8b949e] text-[10px] font-bold uppercase tracking-widest mb-1.5">Zone</label>
                  <div className="relative">
                    <select value={newDeviceZone} onChange={(e) => setNewDeviceZone(e.target.value)}
                      className="w-full h-9 rounded-xl px-3 text-[#e6edf3] text-[12px] focus:outline-none appearance-none cursor-pointer pr-7"
                      style={G.input}>
                      {zones.map((z) => <option key={z.id} value={z.id} style={{ background: "#0d1117" }}>{z.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58] pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[#8b949e] text-[10px] font-bold uppercase tracking-widest mb-1.5">Install Location</label>
                <input value={newDeviceLocation} onChange={(e) => setNewDeviceLocation(e.target.value)} placeholder="e.g. Ceiling NW Corner — Row 4"
                  className="w-full h-9 rounded-xl px-3 text-[#e6edf3] text-[12px] placeholder:text-[#484f58] focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  style={G.input} />
              </div>
              <div>
                <label className="block text-[#8b949e] text-[10px] font-bold uppercase tracking-widest mb-1.5">Assigned Technician</label>
                <div className="relative">
                  <select value={newDeviceAssignee} onChange={(e) => setNewDeviceAssignee(e.target.value)}
                    className="w-full h-9 rounded-xl px-3 text-[#e6edf3] text-[12px] focus:outline-none appearance-none cursor-pointer pr-7"
                    style={G.input}>
                    {["T. Morales", "K. Singh", "J. Park"].map((a) => <option key={a} value={a} style={{ background: "#0d1117" }}>{a}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58] pointer-events-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddDevice(false)}
                  className="flex-1 h-10 rounded-xl text-[#8b949e] text-[13px] font-semibold hover:text-white transition-all" style={G.btn}>Cancel</button>
                <button type="submit" disabled={!newDeviceName.trim()}
                  className="flex-1 h-10 rounded-xl text-white text-[13px] font-bold disabled:opacity-40"
                  style={{ background: "#3b82f6", boxShadow: "0 4px 20px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.2)" }}>Add Device</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="rounded-2xl p-5 mb-5" style={G.card}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[#8b949e] text-[11px] font-bold uppercase tracking-widest mb-1">Overall Completion</p>
            <p className="text-white text-[2rem] font-bold tracking-tight leading-none">{pct}%</p>
          </div>
          <div className="grid grid-cols-4 gap-4 text-right">
            {[
              { label: "Complete", count: complete, color: "text-emerald-400" },
              { label: "In Progress", count: inProg, color: "text-blue-400" },
              { label: "Failed", count: failed, color: "text-rose-400" },
              { label: "Pending", count: total - complete - inProg - failed, color: "text-[#484f58]" },
            ].map((s) => (
              <div key={s.label}>
                <p className={clsx("text-[1.3rem] font-bold leading-none", s.color)}>{s.count}</p>
                <p className="text-[#484f58] text-[10px] font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative w-full h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)" }}>
          <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          <div className="absolute top-0 h-full rounded-full" style={{ background: "rgba(59,130,246,0.4)", left: `${pct}%`, width: `${Math.round((inProg / total) * 100)}%` }} />
          <div className="absolute top-0 h-full rounded-full" style={{ background: "rgba(244,63,94,0.4)", left: `${Math.round(((complete + inProg) / total) * 100)}%`, width: `${Math.round((failed / total) * 100)}%` }} />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-[#8b949e] text-[11px]">{complete} of {total} devices installed</span>
          {failed > 0 && <span className="text-rose-400 text-[11px] font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{failed} defect{failed > 1 ? "s" : ""} require attention</span>}
        </div>
      </div>

      <div className="space-y-3">
        {zones.map((zone) => {
          const zComplete = zone.devices.filter((d) => d.status === "complete").length;
          const zPct = Math.round((zComplete / zone.devices.length) * 100);
          const isExpanded = expandedZone === zone.id;
          return (
            <div key={zone.id} className="rounded-2xl overflow-hidden" style={G.card}>
              <button onClick={() => setExpandedZone(isExpanded ? null : zone.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex-1 flex items-center gap-4 min-w-0">
                  <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                    zPct === 100 ? "bg-emerald-500/15" : zPct > 0 ? "bg-blue-500/15" : "bg-white/[0.04]")}
                    style={{ border: `1px solid ${zPct === 100 ? "rgba(16,185,129,0.25)" : zPct > 0 ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.07)"}` }}>
                    {zPct === 100 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : zPct > 0 ? <Clock className="w-4 h-4 text-blue-400" /> : <AlertCircle className="w-4 h-4 text-[#484f58]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-[13px] font-bold text-left">{zone.name}</p>
                    <p className="text-[#484f58] text-[11px] text-left">{zone.devices.length} devices · {zComplete} complete</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.3)" }}>
                    <div className={clsx("h-full rounded-full transition-all", zPct === 100 ? "bg-emerald-500" : "bg-blue-500")} style={{ width: `${zPct}%` }} />
                  </div>
                  <span className={clsx("text-[12px] font-bold w-10 text-right", zPct === 100 ? "text-emerald-400" : "text-white")}>{zPct}%</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-[#484f58]" /> : <ChevronDown className="w-4 h-4 text-[#484f58]" />}
                </div>
              </button>
              {isExpanded && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="grid gap-4 px-5 py-2.5" style={{ gridTemplateColumns: "36px 2fr 1.5fr 120px 1fr", background: "rgba(255,255,255,0.02)" }}>
                    {["", "Device", "Location", "Assignee", "Status"].map((h) => (
                      <span key={h} className="text-[#484f58] text-[10px] font-bold uppercase tracking-widest">{h}</span>
                    ))}
                  </div>
                  {zone.devices.map((device, i) => {
                    const meta = STATUS_META[device.status];
                    const TypeIcon = typeIcons[device.type] ?? Camera;
                    return (
                      <div key={device.id}
                        className={clsx("grid gap-4 px-5 py-3.5 items-center hover:bg-white/[0.015] transition-colors", i % 2 === 1 && "bg-white/[0.01]")}
                        style={{ gridTemplateColumns: "36px 2fr 1.5fr 120px 1fr", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <TypeIcon className="w-3.5 h-3.5 text-[#484f58]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-[12px] font-semibold truncate">{device.name}</p>
                          {device.notes && <p className="text-rose-400 text-[10px] flex items-center gap-1 mt-0.5 truncate"><AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" /> {device.notes}</p>}
                        </div>
                        <p className="text-[#8b949e] text-[11px] truncate">{device.location}</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                            style={{ background: "rgba(59,130,246,0.4)" }}>
                            {device.assignee.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="text-[#8b949e] text-[11px] truncate">{device.assignee}</span>
                        </div>
                        <div className="relative">
                          <select value={device.status} onChange={(e) => updateStatus(zone.id, device.id, e.target.value as InstallStatus)}
                            className={clsx("w-full h-7 rounded-xl border px-2 text-[11px] font-bold appearance-none cursor-pointer transition-all focus:outline-none pr-6", meta.bg, meta.color, "border-transparent hover:border-white/[0.10]")}
                            style={{ backgroundColor: "transparent" }}>
                            {Object.entries(STATUS_META).map(([val, m]) => (
                              <option key={val} value={val} style={{ backgroundColor: "#0d1117", color: "#e6edf3" }}>{m.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58] pointer-events-none" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 1100);
  };

  const inputCls = "w-full h-11 rounded-2xl px-4 text-[#e6edf3] text-[13px] placeholder:text-[#484f58] focus:outline-none transition-all";

  return (
    <div className="h-screen flex overflow-hidden">
      <div className="hidden lg:flex w-[48%] flex-shrink-0 flex-col relative overflow-hidden" style={{ background: "#070c1a" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse 80% 60% at 10% 10%, rgba(30,64,175,0.45) 0%, transparent 65%), radial-gradient(ellipse 60% 55% at 90% 90%, rgba(88,28,135,0.35) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 55% 50%, rgba(7,12,26,0.9) 0%, transparent 100%)" }} />
        <div className="absolute inset-0 opacity-[0.018]" style={{ backgroundImage: "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 48px)" }} />

        <div className="relative z-10 flex flex-col h-full p-12">
          <div className="mb-auto">
            <img src={logoImg} alt="E-Tech Systems" className="h-10 object-contain object-left" style={{ filter: "brightness(1.1)" }} />
          </div>

          <div className="flex flex-col justify-center flex-1 py-12">
            <span className="text-blue-400 text-[11px] font-bold tracking-[0.20em] uppercase mb-5 block">Security System Design & Integration Platform</span>
            <h1 className="text-white text-[2.6rem] font-bold leading-[1.12] tracking-tight mb-6">
              Full-Lifecycle<br />Security Project<br /><span className="text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>Management.</span>
            </h1>
            <p className="text-[#8b949e] text-[13px] leading-relaxed mb-10 max-w-[380px]">
              From site assessment to systems design to final installation. Design floor plans, build quotes, manage installs, and auto-generate reports in one platform.
            </p>

            <div className="space-y-3">
              {[
                { icon: Camera, title: "System Design Studio", desc: "Place cameras, Map cable routes, build floorplan", color: "#3b82f6" },
                { icon: BarChart3, title: "Quote Builder & Asset Library", desc: "Auto-generate quotes, proposals, access to full partner asset library", color: "#8b5cf6" },
              ].map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="flex items-start gap-4 p-4 rounded-2xl transition-all hover:-translate-y-0.5"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}20`, border: `1px solid ${color}35`, boxShadow: `0 0 16px ${color}25` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-white text-[13px] font-bold mb-0.5">{title}</p>
                    <p className="text-[#8b949e] text-[12px] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[#484f58] text-[11px]">© 2026 E-Tech Systems · All rights reserved</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative" style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(ellipse 60% 50% at 80% 20%, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 20% 80%, rgba(139,92,246,0.06) 0%, transparent 60%)" }} />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative z-10 w-full max-w-[380px]"
        >
          <div className="lg:hidden mb-10">
            <img src={logoImg} alt="E-Tech Systems" className="h-9 object-contain object-left" style={{ filter: "brightness(1.1)" }} />
          </div>

          <div className="rounded-3xl p-8"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(40px) saturate(160%)", WebkitBackdropFilter: "blur(40px) saturate(160%)", boxShadow: "0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.10)" }}>

            <h2 className="text-white text-[1.5rem] font-bold mb-1 tracking-tight">Welcome back</h2>
            <p className="text-[#8b949e] text-[13px] mb-7">Sign in to your workspace</p>

            <button onClick={submit}
              className="w-full flex items-center justify-center gap-3 h-11 rounded-2xl text-white text-[13px] font-bold transition-all duration-150 mb-6 hover:bg-white/[0.12] active:scale-[0.99]"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09)" }}>
              <svg width="17" height="17" viewBox="0 0 21 21" fill="none" aria-hidden="true">
                <rect width="10" height="10" fill="#f25022" /><rect x="11" width="10" height="10" fill="#7fba00" />
                <rect y="11" width="10" height="10" fill="#00a4ef" /><rect x="11" y="11" width="10" height="10" fill="#ffb900" />
              </svg>
              Continue with Microsoft
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              <span className="text-[#484f58] text-[11px] font-semibold">or continue with email</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-[#e6edf3] text-[11px] font-bold mb-1.5 uppercase tracking-[0.07em]">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={inputCls} style={G.input} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[#e6edf3] text-[11px] font-bold uppercase tracking-[0.07em]">Password</label>
                  <button type="button" className="text-blue-400 text-[12px] font-semibold hover:text-blue-300 transition-colors">Forgot password?</button>
                </div>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={clsx(inputCls, "pr-11")} style={G.input} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#484f58] hover:text-[#8b949e] transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-11 rounded-2xl text-white font-bold text-[13px] transition-all duration-150 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
                style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", boxShadow: "0 4px 20px rgba(59,130,246,0.45), inset 0 1px 0 rgba(255,255,255,0.2)" }}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="text-center text-[#484f58] text-[12px] mt-6">
              Need access?{" "}
              <button className="text-blue-400 hover:text-blue-300 transition-colors font-semibold">Contact your administrator</button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>("login");
  const [currency, setCurrency] = useState<"USD" | "JMD">("USD");
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>(INITIAL_QUOTE_ITEMS);

  const currencyCtx: CurrencyCtx = useMemo(() => ({
    currency,
    setCurrency,
    fmt: makeFmt(currency),
  }), [currency]);

  const addToQuote = (device: CatalogDevice) => {
    if (!device.price) return;
    setQuoteItems((prev) => {
      const existing = prev.find((i) => i.sku === device.sku);
      if (existing) {
        toast.success(`Qty updated — ${device.model} in quote`);
        return prev.map((i) => i.sku === device.sku ? { ...i, qty: i.qty + 1 } : i);
      }
      toast.success(`${device.model} added to quote`);
      return [...prev, { id: `q${Date.now()}`, name: `${device.manufacturer} ${device.model}`, sku: device.sku ?? "", qty: 1, unitPrice: device.price! }];
    });
  };

  const quoteCtx: QuoteCtx = { quoteItems, addToQuote };

  if (page === "login") return (
    <CurrencyContext.Provider value={currencyCtx}>
      <LoginPage onLogin={() => setPage("dashboard")} />
    </CurrencyContext.Provider>
  );
  if (page === "design-canvas") return (
    <CurrencyContext.Provider value={currencyCtx}>
      <DesignCanvas navigate={setPage} />
    </CurrencyContext.Provider>
  );

  const breadcrumb = page === "project-detail" ? { label: "Projects", parent: "design-studio" as Page } : undefined;

  return (
    <CurrencyContext.Provider value={currencyCtx}>
      <QuoteContext.Provider value={quoteCtx}>
        <div className="min-h-screen bg-background">
          <Toaster position="bottom-right" theme="dark" toastOptions={{ style: { background: "rgba(7,12,26,0.95)", border: "1px solid rgba(255,255,255,0.12)", color: "#e6edf3", backdropFilter: "blur(20px)" } }} />
          <AppTopbar page={page} navigate={setPage} breadcrumb={breadcrumb} />
          <div className="pt-14">
            {page === "dashboard" && <Dashboard navigate={setPage} />}
            {page === "design-studio" && <DesignStudio navigate={setPage} />}
            {page === "project-detail" && <ProjectDetail navigate={setPage} />}
            {page === "quote-builder" && <QuoteBuilder navigate={setPage} quoteItems={quoteItems} setQuoteItems={setQuoteItems} />}
            {page === "install-tracker" && <InstallTracker navigate={setPage} />}
            {page === "device-library" && <DeviceLibrary navigate={setPage} />}
          </div>
        </div>
      </QuoteContext.Provider>
    </CurrencyContext.Provider>
  );
}
