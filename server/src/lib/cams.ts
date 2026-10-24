// Client for CAMS, E-Tech's asset management app (repo joshuahutchinson-opula/E-Tech-CCSM).
// EEST's server talks to CAMS with one dedicated CAMS admin account; the browser never does.

export type CamsImportType = "cameras" | "doors" | "servers" | "switches" | "software";
export const CAMS_IMPORT_TYPES: CamsImportType[] = ["cameras", "doors", "servers", "switches", "software"];

export class CamsError extends Error {
  constructor(message: string, readonly status: number, readonly body?: { imported?: number }) { super(message); }
}

const config = () => ({
  url: (process.env.CAMS_API_URL || "").replace(/\/+$/, ""),
  username: process.env.CAMS_USERNAME || "",
  password: process.env.CAMS_PASSWORD || "",
});

export function isCamsConfigured(): boolean {
  const c = config();
  return !!(c.url && c.username && c.password);
}

// CAMS tokens last 42 days; keep one in memory and log in again when CAMS rejects it.
let cachedToken: string | null = null;

async function login(): Promise<string> {
  const c = config();
  const res = await fetch(`${c.url}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: c.username, password: c.password }),
  });
  const body = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
  if (!res.ok || !body.token) throw new CamsError(`CAMS login failed: ${body.error || res.statusText}`, 502);
  cachedToken = body.token;
  return body.token;
}

export async function cams<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  if (!isCamsConfigured()) throw new CamsError("CAMS isn't configured", 503);
  const send = async (token: string) => fetch(`${config().url}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let res = await send(cachedToken || (await login()));
  if (res.status === 401) res = await send(await login());
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new CamsError(data?.error || `CAMS returned ${res.status}`, res.status >= 500 ? 502 : res.status, data as { imported?: number });
  return data;
}

// --- Which CAMS table an installed device goes to -------------------------------------------

// An install device created from a Project Asset carries the asset's category and the linked
// catalog device. Older devices (added before that link existed) only have their install type,
// so that is used as a fallback where it is unambiguous.
export interface CamsSourceDevice {
  type: string;                    // install_devices.type
  assetCategory: string | null;    // project_assets.category
  catalogCategory: string | null;  // devices.category
}

const SKIPPED_CATEGORY_LABEL: Record<string, string> = {
  "cable-wire": "Cable runs", intercom: "Intercoms", other: "Other items", rack: "Racks", ups: "UPS units",
  "patch-panel": "Patch panels", "poe-injector": "PoE injectors", analytics: "Analytics",
};

export function camsTypeFor(d: CamsSourceDevice): { type: CamsImportType } | { skip: string } {
  const category = d.assetCategory ?? ({ camera: "camera", access: "access-control", door: "access-control", nvr: "network-hardware", software: "software", intercom: "intercom" } as Record<string, string>)[d.type] ?? null;
  const catalog = d.catalogCategory ?? (d.type === "nvr" ? "nvr" : null);
  if (category === "camera") return { type: "cameras" };
  if (category === "access-control") return { type: "doors" };
  if (category === "software") return { type: "software" };
  if (category === "network-hardware") {
    if (catalog === "server" || catalog === "nvr") return { type: "servers" };
    if (catalog === "switch" || catalog === "poe-injector") return { type: "switches" };
    if (!catalog) return { skip: "Network hardware with no catalog device, so it can't be told apart as a server or switch" };
    return { skip: `${SKIPPED_CATEGORY_LABEL[catalog] || catalog} aren't tracked in CAMS` };
  }
  if (category) return { skip: `${SKIPPED_CATEGORY_LABEL[category] || category} aren't tracked in CAMS` };
  return { skip: `"${d.type}" devices with no linked Project Asset aren't tracked in CAMS` };
}

// --- Rows in the shape of each CAMS import (index.html ASSET_CSV_COLUMNS) ---------------------

export interface CamsRowSource {
  name: string;
  notes: string | null;
  manufacturer: string | null;
  model: string | null;
  resolution: string | null;
  serialNumber: string | null;
  macAddress: string | null;
  ipAddress: string | null;
  firmware: string | null;
  warrantyExpiry: string | null;   // YYYY-MM-DD
  completedAt: string | null;      // YYYY-MM-DD
}

// Every column CAMS expects is present; anything EEST doesn't track is an empty string.
export function camsRow(type: CamsImportType, d: CamsRowSource, zone: string, clientId: number): Record<string, string | number> {
  const s = (v: string | null) => v || "";
  const common = { client_id: clientId, name: d.name, status: "Online", comments: s(d.notes) };
  switch (type) {
    case "cameras":
      return { ...common, zone, model: s(d.model), manufacturer: s(d.manufacturer), resolution: s(d.resolution), archiver: "", ip_address: s(d.ipAddress), mac_address: s(d.macAddress), warranty: s(d.warrantyExpiry), purchase_date: "", date_cleaned: "" };
    case "doors":
      return { ...common, zone, tech: "", reader: "", lock_type: "", door_swing: "", access_type: "", anti_passback: "", controller_type: "", ip_address: s(d.ipAddress), install_date: s(d.completedAt), warranty_expiry: s(d.warrantyExpiry) };
    case "servers":
      return { ...common, zone, make: s(d.manufacturer), model: s(d.model), capacity: "", used: "", health: "", apps: "", serial: s(d.serialNumber), purchase_date: "", warranty_expiry: s(d.warrantyExpiry) };
    case "switches":
      return { ...common, zone, model: s(d.model), firmware: s(d.firmware), ip_address: s(d.ipAddress), mac: s(d.macAddress), purchase_date: "", warranty_expiry: s(d.warrantyExpiry) };
    case "software":
      // CAMS software has no zone, make or model; vendor and version are its equivalents.
      return { ...common, vendor: s(d.manufacturer), version: s(d.firmware), license_type: "", expiry_date: "", purchase_date: "", warranty_expiry: s(d.warrantyExpiry) };
  }
}
