import { ALLOWED_EMAIL_DOMAIN } from "./microsoftAuth";

// The people whose Outlook calendars the Calendar tab shows, and the email each task assignee
// name maps to. Names match the app's TEAM list (task assignees are stored by name). Emails
// default to firstname@<ALLOWED_EMAIL_DOMAIN>; set TEAM_EMAILS ("Name=email, Name=email") to
// replace the list.
const DEFAULT_TEAM = ["Joshua", "Roger", "Donovan", "Michael", "Denise", "Rochelle", "Shanice", "Shavene", "Marvin", "Akeem"];

export interface TeamMember { name: string; email: string }

export function teamDirectory(): TeamMember[] {
  const configured = (process.env.TEAM_EMAILS || "")
    .split(",")
    .map((pair) => pair.split("=").map((s) => s.trim()))
    .filter(([name, email]) => name && email && email.includes("@"))
    .map(([name, email]) => ({ name, email: email.toLowerCase() }));
  if (configured.length > 0) return configured;
  return DEFAULT_TEAM.map((name) => ({ name, email: `${name.toLowerCase()}@${ALLOWED_EMAIL_DOMAIN}` }));
}

export function emailForTeamMember(name: string | null | undefined): string | null {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  return teamDirectory().find((m) => m.name.toLowerCase() === n || m.email === n)?.email ?? null;
}
