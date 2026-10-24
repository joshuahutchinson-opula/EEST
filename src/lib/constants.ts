import { type WorkbookSystem } from "../../server/src/lib/workbookTotals";
import type { AssetCategory, CameraType, LeadSource, ProjectColumn, SupportType } from "../types";

export const DEFAULT_EXCHANGE_RATE = 163;

export const TEAM = [
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


export const TEAM_ALPHABETICAL = [...TEAM].sort((a, b) => a.name.localeCompare(b.name));

// The Dashboard calendar's team filter. A person can sit on more than one team (Rochelle does).
export const CALENDAR_TEAMS = {
  Sales: ["Roger", "Donovan", "Michael", "Denise", "Rochelle"],
  Tech: ["Joshua", "Shanice", "Shavene", "Marvin", "Akeem", "Rochelle"],
} as const;
export type CalendarTeam = keyof typeof CALENDAR_TEAMS;

export const G = {
  card: { background: "rgba(255,255,255,0.055)", backdropFilter: "blur(24px) saturate(160%)", WebkitBackdropFilter: "blur(24px) saturate(160%)", border: "1px solid rgba(255,255,255,0.11)", boxShadow: "0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.09)" } as React.CSSProperties,
  panel: { background: "rgba(7,12,26,0.72)", backdropFilter: "blur(40px) saturate(180%)", WebkitBackdropFilter: "blur(40px) saturate(180%)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)" } as React.CSSProperties,
  subtle: { background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" } as React.CSSProperties,
  input: { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.2)" } as React.CSSProperties,
  btn: { background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" } as React.CSSProperties,
  liquidGlass: { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(28px) saturate(180%)", WebkitBackdropFilter: "blur(28px) saturate(180%)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)", borderRadius: "16px" } as React.CSSProperties,
};

export const SYSTEM_DISPLAY: Record<WorkbookSystem, { label: string; short: string; tint: string }> = {
  VSS: { label: "Video Surveillance", short: "Video", tint: "rgba(59,130,246,0.06)" },
  EAC: { label: "Access Control", short: "Access", tint: "rgba(139,92,246,0.06)" },
  Intercom: { label: "Intercom", short: "Intercom", tint: "rgba(20,184,166,0.06)" },
};

export const PROJECT_COLUMNS: ProjectColumn[] = [
  { id: "support", label: "Support Tasks", color: "#f59e0b" },
  { id: "planning", label: "Planning", color: "#3b82f6" },
  { id: "procurement", label: "Procurement", color: "#8b5cf6" },
  { id: "installation", label: "Installation", color: "#f97316" },
  { id: "commissioning", label: "Commissioning", color: "#06b6d4" },
  { id: "complete", label: "Complete", color: "#10b981" },
];

export const SUPPORT_TYPE_LABELS: Record<SupportType, string> = {
  "contract-support": "Contract Support",
  "pre-paid": "Pre-Paid",
  "post-paid": "Post-Paid",
  "sla": "SLA",
};

export const CAMERA_TYPES: CameraType[] = ["Dome", "Bullet", "PTZ", "Box", "Panoramic", "Thermal"];

export const LEAD_SOURCE_STYLES: Record<LeadSource, { bg: string; text: string }> = {
  "Tender": { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  "Single Source": { bg: "rgba(16,185,129,0.15)", text: "#34d399" },
  "Inbound": { bg: "rgba(139,92,246,0.15)", text: "#a78bfa" },
  "Referral": { bg: "rgba(245,158,11,0.15)", text: "#fbbf24" },
  "Recurring Client": { bg: "rgba(236,72,153,0.15)", text: "#f472b6" },
  "Outbound": { bg: "rgba(239,68,68,0.15)", text: "#f87171" },
};

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = { camera: "Camera", "access-control": "Access Control", "network-hardware": "Network Hardware", "cable-wire": "Cable / Wire", intercom: "Intercom", software: "Software", other: "Other" };
