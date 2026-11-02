// Project client names that are placeholders, not clients: no client record is created for them
// (by the boot backfill in db.ts, linkProjectClient, or the Planner seed). Lowercase, trimmed.
export const NO_CLIENT_RECORD_NAMES = ["unassigned", "unassigned (hotels)"];

export const isPlaceholderClient = (name: string | null | undefined) => NO_CLIENT_RECORD_NAMES.includes(String(name ?? "").trim().toLowerCase());
