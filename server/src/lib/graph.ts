// Microsoft Graph with app-only (client credentials) auth, using the same Entra app registration
// as sign-in. Needs a real tenant id in MS_TENANT_ID ("common"/"organizations" can't issue
// app-only tokens) and admin-consented application permissions on the app registration
// (Calendars.ReadWrite for the calendar, Mail.Send for email alerts).

const GRAPH = "https://graph.microsoft.com/v1.0";

function config() {
  return {
    tenant: process.env.MS_TENANT_ID || "",
    clientId: process.env.MS_CLIENT_ID || "",
    clientSecret: process.env.MS_CLIENT_SECRET || "",
  };
}

export function isGraphConfigured(): boolean {
  const { tenant, clientId, clientSecret } = config();
  return Boolean(clientId && clientSecret && tenant && !["common", "organizations", "consumers"].includes(tenant.toLowerCase()));
}

export class GraphError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function appToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const { tenant, clientId, clientSecret } = config();
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }).toString(),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new GraphError(res.status, `Graph token request failed: ${data.error_description || data.error || res.status}`);
  cachedToken = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

export async function graph<T = any>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  if (!isGraphConfigured()) throw new GraphError(503, "Microsoft Graph isn't configured (set MS_TENANT_ID to the tenant id, plus MS_CLIENT_ID and MS_CLIENT_SECRET).");
  const res = await fetch(`${GRAPH}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await appToken()}`, "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204 || res.status === 202) return undefined as T;
  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try { message = JSON.parse(text)?.error?.message || text; } catch {}
    throw new GraphError(res.status, `Graph ${method} ${path} failed (${res.status}): ${message}`);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}
