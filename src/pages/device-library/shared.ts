import type { DeviceTag } from "../../types";

export const TAG_STYLES: Record<DeviceTag, { bg: string; text: string; border: string }> = {
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

export const CAT_COLOR_DS: Record<string, { bg: string; text: string; label: string }> = {
  camera: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", label: "Camera" },
  "access-control": { bg: "rgba(139,92,246,0.12)", text: "#a78bfa", label: "Access" },
  nvr: { bg: "rgba(16,185,129,0.12)", text: "#34d399", label: "NVR" },
  analytics: { bg: "rgba(249,115,22,0.12)", text: "#fb923c", label: "VMS" },
  intercom: { bg: "rgba(20,184,166,0.12)", text: "#2dd4bf", label: "Intercom" },
  server: { bg: "rgba(234,179,8,0.12)", text: "#facc15", label: "Server" },
  other: { bg: "rgba(100,100,100,0.12)", text: "#8b949e", label: "Other" },
};
