import { DEFAULT_EXCHANGE_RATE } from "../lib/constants";
import type { AuditLogEntry, CatalogDevice, ChangeOrder, CommissioningItem, DocumentItem, InstallDevice, InstallStatus, InstallZone, InventoryItem, InventoryTransaction, NotificationItem, Project, ProjectAsset, PublicProjectStatus, PublicSubcontractor, Quote, QuoteLineItem, Subcontractor, SynthesisOverride, Task, WorkbookAuditEntry, WorkbookSettings, AuditTarget, CalendarEvent, TeamMemberInfo, ClientContact, ClientDetail, ClientSummary, SearchResults } from "../types";

export const API_BASE = import.meta.env.VITE_API_URL || "/api";

// The server hands out uploaded files as signed "/api/files/…" URLs; in production the API is
// a different host from the frontend, so resolve them against the API origin.
export const fileHref = (url: string) => (url.startsWith("/api/") ? API_BASE.replace(/\/api\/?$/, "") + url : url);

export function getSessionEmail(): string | null {
  const token = localStorage.getItem("auth_token");
  if (!token || token.split(".").length !== 3) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.email === "string" ? payload.email : null;
  } catch { return null; }
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) { super(`API error: ${status}`); this.status = status; this.body = body; }
}

export class UnauthorizedError extends Error {
  constructor() { super("Unauthorized"); this.name = "UnauthorizedError"; }
}

// Set by AuthenticatedApp on mount so a 401 from anywhere (an authenticated poll like
// NotificationBell, a stale token from a previous session, etc.) can drop the app back to
// the login view via a React state update — never a hard window.location reload, which would
// re-fetch the whole document (favicon/manifest included) and can loop if the token keeps
// coming back invalid.
export let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null) { onUnauthorized = fn; }

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = {};
  if (!(options?.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 && !path.startsWith("/auth/")) {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("app_logged_in");
    onUnauthorized?.();
    throw new UnauthorizedError();
  }
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  return res.json();
}

// For server-generated binary documents (docx/xlsx) — same auth/401 handling as apiFetch, but
// hands back the raw bytes plus whatever filename the server suggested via Content-Disposition,
// so the caller can trigger a same-tab download the same way the old client-side jsPDF/CSV
// exports did (build a blob, click a throwaway anchor), without a page navigation.
export async function apiFetchBlob(path: string, options?: RequestInit): Promise<{ blob: Blob; filename: string }> {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = {};
  if (!(options?.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 && !path.startsWith("/auth/")) {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("app_logged_in");
    onUnauthorized?.();
    throw new UnauthorizedError();
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  return { blob: await res.blob(), filename: match ? match[1] : "download" };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const API = {
  auth: {
    me: () => apiFetch<{ email: string; name: string; oid: string; role: "admin" | "tech"; allowedDomain: string }>("/auth/me"),
  },
  tutorials: {
    list: () => apiFetch<string[]>("/users/me/tutorials"),
    markSeen: (key: string) => apiFetch<void>(`/users/me/tutorials/${key}`, { method: "POST" }),
  },
  projects: {
    list: () => apiFetch<Project[]>("/projects"),
    get: (id: string) => apiFetch<Project>(`/projects/${id}`),
    create: (data: Partial<Project>) => apiFetch<Project>("/projects", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Project>) => apiFetch<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<void>(`/projects/${id}`, { method: "DELETE" }),
    generateShareLink: (id: string) => apiFetch<{ token: string }>(`/projects/${id}/share-link`, { method: "POST" }),
    revokeShareLink: (id: string) => apiFetch<void>(`/projects/${id}/share-link`, { method: "DELETE" }),
    closeoutReport: (id: string) => apiFetchBlob(`/projects/${id}/closeout-report`),
  },
  quotes: {
    list: () => apiFetch<Quote[]>("/quotes"),
    get: (id: string) => apiFetch<Quote>(`/quotes/${id}`),
    create: (data: Partial<Quote>) => apiFetch<Quote>("/quotes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Quote>) => apiFetch<Quote>(`/quotes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<void>(`/quotes/${id}`, { method: "DELETE" }),
    resetLineItemCost: (itemId: string) => apiFetch<QuoteLineItem>(`/quotes/line-items/${itemId}/reset-cost`, { method: "POST" }),
    createLineItem: (quoteId: string, data: Partial<QuoteLineItem> & { categoryId: string }) => apiFetch<QuoteLineItem>(`/quotes/${quoteId}/line-items`, { method: "POST", body: JSON.stringify(data) }),
    updateLineItem: (itemId: string, data: Partial<QuoteLineItem> & { version: number }) => apiFetch<QuoteLineItem>(`/quotes/line-items/${itemId}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteLineItem: (itemId: string, version: number) => apiFetch<void>(`/quotes/line-items/${itemId}?version=${version}`, { method: "DELETE" }),
    revise: (id: string) => apiFetch<Quote>(`/quotes/${id}/revise`, { method: "POST" }),
    reorderLineItems: (categoryId: string, itemIds: string[]) => apiFetch<void>(`/quotes/categories/${categoryId}/order`, { method: "PUT", body: JSON.stringify({ itemIds }) }),
  },
  devices: {
    list: () => apiFetch<CatalogDevice[]>("/devices"),
    get: (id: string) => apiFetch<CatalogDevice>(`/devices/${id}`),
    create: (data: Partial<CatalogDevice>) => apiFetch<CatalogDevice>("/devices", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CatalogDevice>) => apiFetch<CatalogDevice>(`/devices/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    bulk: (devices: Partial<CatalogDevice>[]) => apiFetch<{ imported: number }>("/devices/bulk", { method: "POST", body: JSON.stringify({ devices }) }),
  },
  install: {
    zones: () => apiFetch<InstallZone[]>("/install/zones"),
    createZone: (data: { name: string; projectId?: string; isQuickSupport?: boolean }) => apiFetch<InstallZone>("/install/zones", { method: "POST", body: JSON.stringify(data) }),
    addDevice: (zoneId: string, data: Partial<InstallDevice>) => apiFetch<InstallDevice>(`/install/zones/${zoneId}/devices`, { method: "POST", body: JSON.stringify(data) }),
    updateStatus: (zoneId: string, deviceId: string, status: InstallStatus) => apiFetch<void>(`/install/zones/${zoneId}/devices/${deviceId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    addInstalledPhoto: (zoneId: string, deviceId: string, photoUrl: string) => apiFetch<void>(`/install/zones/${zoneId}/devices/${deviceId}`, { method: "PATCH", body: JSON.stringify({ addPhoto: photoUrl }) }),
  },
  projectAssets: {
    list: (projectId: string) => apiFetch<ProjectAsset[]>(`/projects/${projectId}/assets`),
    create: (projectId: string, data: Partial<ProjectAsset>) => apiFetch<ProjectAsset>(`/projects/${projectId}/assets`, { method: "POST", body: JSON.stringify(data) }),
    update: (projectId: string, assetId: string, data: Partial<ProjectAsset>) => apiFetch<ProjectAsset>(`/projects/${projectId}/assets/${assetId}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (projectId: string, assetId: string) => apiFetch<void>(`/projects/${projectId}/assets/${assetId}`, { method: "DELETE" }),
    equipmentSummary: (projectId: string) => apiFetchBlob(`/projects/${projectId}/assets/equipment-summary`),
  },
  search: (q: string) => apiFetch<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
  exports: {
    quickbooks: (from?: string, to?: string) => apiFetchBlob(`/exports/quickbooks.csv?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}`),
  },
  clients: {
    list: () => apiFetch<ClientSummary[]>("/clients"),
    get: (id: string) => apiFetch<ClientDetail>(`/clients/${id}`),
    create: (data: { name: string; contacts?: ClientContact[]; sites?: string[] }) => apiFetch<ClientSummary>("/clients", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; contacts: ClientContact[]; sites: string[] }>) => apiFetch<ClientSummary>(`/clients/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  calendar: {
    employees: () => apiFetch<{ configured: boolean; employees: TeamMemberInfo[] }>("/calendar/employees"),
    events: (start: string, end: string, emails: string[]) => apiFetch<{ email: string; events: CalendarEvent[]; error?: string }[]>(`/calendar/events?start=${start}&end=${end}&emails=${encodeURIComponent(emails.join(","))}`),
    create: (data: { email: string; subject: string; start: string; end: string; isAllDay: boolean; location?: string; notes?: string }) => apiFetch<CalendarEvent>("/calendar/events", { method: "POST", body: JSON.stringify(data) }),
    update: (email: string, id: string, data: Partial<{ subject: string; start: string; end: string; isAllDay: boolean; location: string; notes: string }>) => apiFetch<CalendarEvent>(`/calendar/events/${encodeURIComponent(email)}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (email: string, id: string) => apiFetch<void>(`/calendar/events/${encodeURIComponent(email)}/${encodeURIComponent(id)}`, { method: "DELETE" }),
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
    log: (projectId: string, event: string, details: string, change?: { field: string; oldValue: string; newValue: string }) => apiFetch<void>(`/audit/${projectId}`, { method: "POST", body: JSON.stringify({ event, details, field: change?.field, oldValue: change?.oldValue, newValue: change?.newValue }) }),
  },
  changeOrders: {
    list: (projectId: string) => apiFetch<ChangeOrder[]>(`/change-orders/${projectId}`),
    create: (projectId: string, data: Partial<ChangeOrder>) => apiFetch<ChangeOrder>(`/change-orders/${projectId}`, { method: "POST", body: JSON.stringify(data) }),
    update: (projectId: string, id: string, data: Partial<ChangeOrder>) => apiFetch<ChangeOrder>(`/change-orders/${projectId}/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (projectId: string, id: string) => apiFetch<void>(`/change-orders/${projectId}/${id}`, { method: "DELETE" }),
    generateDocx: (projectId: string, id: string) => apiFetchBlob(`/change-orders/${projectId}/${id}/docx`),
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
    getSettings: () => apiFetch<WorkbookSettings>("/workbook/settings"),
    saveSettings: (data: { minMargin: number }) => apiFetch<WorkbookSettings>("/workbook/settings", { method: "PUT", body: JSON.stringify(data) }),
    getOverrides: (projectId: string, quoteId?: string) => apiFetch<SynthesisOverride[]>(`/workbook/${projectId}/overrides${quoteId ? `?quoteId=${quoteId}` : ""}`),
    saveOverrides: (projectId: string, overrides: Partial<SynthesisOverride>[], quoteId?: string) => apiFetch<void>(`/workbook/${projectId}/overrides`, { method: "PUT", body: JSON.stringify({ overrides, quoteId }) }),
    getAudit: (projectId: string, fieldPath?: string) => apiFetch<WorkbookAuditEntry[]>(`/workbook/${projectId}/audit${fieldPath ? `?fieldPath=${encodeURIComponent(fieldPath)}` : ""}`),
    logAudit: (projectId: string, fieldPath: string, oldValue: string, newValue: string, target?: AuditTarget) => apiFetch<void>(`/workbook/${projectId}/audit`, { method: "POST", body: JSON.stringify({ fieldPath, oldValue, newValue, ...target }) }),
    getPriceHistory: (deviceId: string) => apiFetch<{ price: number; recordedAt: string }[]>(`/workbook/devices/${deviceId}/price-history`),
    exportFullXlsx: (projectId: string, quoteId?: string) => apiFetchBlob(`/workbook/${projectId}/export-workbook-xlsx${quoteId ? `?quoteId=${quoteId}` : ""}`),
  },
  publicStatus: {
    get: (token: string) => apiFetch<PublicProjectStatus>(`/public/status/${token}`),
    approve: (token: string, data: { targetType: "quote" | "change_order"; targetId: string; signerName: string; signature: string }) => apiFetch<void>(`/public/status/${token}/approve`, { method: "POST", body: JSON.stringify(data) }),
  },
  inventory: {
    items: () => apiFetch<InventoryItem[]>("/inventory/items"),
    createItem: (data: Partial<InventoryItem>) => apiFetch<InventoryItem>("/inventory/items", { method: "POST", body: JSON.stringify(data) }),
    updateItem: (id: string, data: Partial<InventoryItem>) => apiFetch<InventoryItem>(`/inventory/items/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    transactions: () => apiFetch<InventoryTransaction[]>("/inventory/transactions"),
    createTransaction: (data: Partial<InventoryTransaction>) => apiFetch<InventoryTransaction>("/inventory/transactions", { method: "POST", body: JSON.stringify(data) }),
  },
  commissioning: {
    list: (projectId: string) => apiFetch<CommissioningItem[]>(`/commissioning/${projectId}`),
    sync: (projectId: string) => apiFetch<void>(`/commissioning/${projectId}/sync`, { method: "POST" }),
    add: (projectId: string, data: any) => apiFetch<CommissioningItem>(`/commissioning/${projectId}`, { method: "POST", body: JSON.stringify(data) }),
    update: (projectId: string, deviceId: string, data: any) => apiFetch<void>(`/commissioning/${projectId}/${deviceId}`, { method: "PATCH", body: JSON.stringify(data) }),
    bulk: (projectId: string, deviceIds: string[], status: string) => apiFetch<void>(`/commissioning/${projectId}/bulk`, { method: "POST", body: JSON.stringify({ deviceIds, status }) }),
    generateReport: (projectId: string) => apiFetchBlob(`/commissioning/${projectId}/report`, { method: "POST" }),
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
