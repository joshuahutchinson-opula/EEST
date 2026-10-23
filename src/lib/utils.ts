import { computeWorkbookTotals } from "../../server/src/lib/workbookTotals";
import { DEFAULT_EXCHANGE_RATE } from "./constants";
import type { Project, ProjectStage, Quote, Stage, SynthesisOverride } from "../types";

export function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

export function fmtDateFull(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

export function makeFmt(currency: "USD" | "JMD", rate?: number) {
  return (usdAmt: number, compact = false): string => {
    const amt = currency === "JMD" ? usdAmt * (rate ?? parseFloat(localStorage.getItem("fx_rate") || String(DEFAULT_EXCHANGE_RATE))) : usdAmt;
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

export function stageBadge(stage: Stage | string) {
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

export function projectStageBadge(stage: ProjectStage | string) {
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

export function getDeduplicatedTeam(project: Project): { name: string; initials: string; color: string; roles: string[] }[] {
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

// A project's displayed "value" is never manually entered once it's in the Project pipeline —
// it's always this, the live Workbook Synthesis grand total (with GCT), the same number
// Synthesis itself displays. Returns null when there's no quote yet or it's still empty, so
// callers can omit the value entirely rather than showing a misleading $0.
export function computeSynthesisTotal(quote: Quote | undefined | null, overrides: SynthesisOverride[] = []): number | null {
  if (!quote || quote.categories.length === 0) return null;
  const totals = computeWorkbookTotals(quote.categories, overrides);
  return totals.subtotal > 0 ? totals.total : null;
}
