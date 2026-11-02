// The team: display name (how task assignees and project owners are stored), initials and avatar
// colour. Shared by the frontend (src/lib/constants.ts) and the server (team directory, seeding).
// No imports, so the frontend can use it directly.
export const TEAM_MEMBERS = [
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
  { name: "Venessa", initials: "VC", color: "#84cc16" },
];

export type TeamMemberStyle = (typeof TEAM_MEMBERS)[number];
