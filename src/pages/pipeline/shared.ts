import type { Column, SupportType } from "../../types";

export const COLUMNS: Column[] = [
  { id: "lead", label: "Lead", color: "#f43f5e" },
  { id: "opportunity", label: "Opportunity", color: "#f97316" },
  { id: "assessment-scheduled", label: "Assessment Scheduled", color: "#f59e0b" },
  { id: "assessment-completed", label: "Assessment Completed", color: "#06b6d4" },
  { id: "proposal", label: "Proposal", color: "#3b82f6" },
  { id: "negotiation", label: "Negotiation", color: "#8b5cf6" },
  { id: "win", label: "Win", color: "#10b981" },
  { id: "lose", label: "Lose", color: "#f43f5e" },
];

export const SUPPORT_TYPES: { id: SupportType; label: string }[] = [
  { id: "contract-support", label: "Contract Support" },
  { id: "pre-paid", label: "Pre-Paid" },
  { id: "post-paid", label: "Post-Paid" },
  { id: "sla", label: "SLA" },
];
