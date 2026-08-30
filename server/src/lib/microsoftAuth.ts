import type * as Jose from "jose";

// `jose` ships ESM-only (no CommonJS build), but this server's tsconfig compiles
// with "module": "CommonJS", so a static `import ... from "jose"` becomes a
// `require("jose")` at runtime and crashes with ERR_REQUIRE_ESM. A plain
// `import("jose")` doesn't help either — targeting CommonJS, tsc downlevels
// dynamic import() into `Promise.resolve().then(() => require("jose"))`, which
// still calls the same broken require() under the hood, just a tick later.
// Constructing the import() call via `new Function(...)` hides it from tsc's
// transformer entirely, so the emitted code contains a real dynamic import()
// that Node's runtime (not tsc) resolves — which *does* know how to load ESM
// from a CommonJS module. Cached so the import only happens once.
const dynamicImportJose = new Function("return import('jose')") as () => Promise<typeof Jose>;
let josePromise: Promise<typeof Jose> | null = null;
function loadJose(): Promise<typeof Jose> {
  if (!josePromise) josePromise = dynamicImportJose();
  return josePromise;
}

const TENANT_ID = process.env.MS_TENANT_ID || "common";
const CLIENT_ID = process.env.MS_CLIENT_ID || "";
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.MS_REDIRECT_URI || "";
export const ALLOWED_EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || "e-techsystemsja.com").toLowerCase();

const AUTHORIZE_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`;
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
const JWKS_URI = `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`;

let msJwks: ReturnType<typeof Jose.createRemoteJWKSet> | null = null;
async function getMsJwks() {
  if (!msJwks) {
    const { createRemoteJWKSet } = await loadJose();
    msJwks = createRemoteJWKSet(new URL(JWKS_URI));
  }
  return msJwks;
}

const SESSION_SECRET = process.env.SESSION_JWT_SECRET;
if (!SESSION_SECRET) {
  console.warn("WARNING: SESSION_JWT_SECRET is not set. Using an insecure, process-local fallback — sessions will not survive a restart and this must not be used in production.");
}
const sessionSecretKey = new TextEncoder().encode(SESSION_SECRET || "insecure-dev-only-secret-set-SESSION_JWT_SECRET");

export function isMicrosoftAuthConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
}

export function buildAuthorizeUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    response_mode: "query",
    scope: "openid profile email",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForIdToken(code: string, codeVerifier: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Microsoft token exchange failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  if (!data.id_token) throw new Error("Microsoft token response did not include an id_token");
  return data.id_token as string;
}

export interface MicrosoftIdentity {
  email: string;
  name: string;
  oid: string;
}

export async function verifyMicrosoftIdToken(idToken: string): Promise<MicrosoftIdentity> {
  const { jwtVerify } = await loadJose();
  const jwks = await getMsJwks();
  const { payload } = await jwtVerify(idToken, jwks, {
    audience: CLIENT_ID,
  });
  if (!payload.iss || !String(payload.iss).startsWith("https://login.microsoftonline.com/")) {
    throw new Error("Unexpected token issuer");
  }
  const email = String(payload.email || payload.preferred_username || "").toLowerCase();
  if (!email) throw new Error("Microsoft account did not return an email claim");
  return {
    email,
    name: String(payload.name || email),
    oid: String(payload.oid || payload.sub || ""),
  };
}

export function isAllowedDomain(email: string): boolean {
  return email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

// Two roles, decided by a hardcoded email deny-list rather than a database table.
// Anyone not explicitly listed as "tech" defaults to "admin".
const TECH_EMAILS = new Set([
  "akeem@e-techsystemsja.com",
  "marvin@e-techsystemsja.com",
  "shanice@e-techsystemsja.com",
  "shavene@e-techsystemsja.com",
  "joshua@e-techsystemsja.com",
]);

export type Role = "admin" | "tech";

export function getRoleForEmail(email: string): Role {
  return TECH_EMAILS.has(email.toLowerCase()) ? "tech" : "admin";
}

export interface SessionUser { email: string; name: string; oid: string; role: Role }

export async function signSessionToken(user: SessionUser): Promise<string> {
  const { SignJWT } = await loadJose();
  return new SignJWT({ email: user.email, name: user.name, oid: user.oid, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(sessionSecretKey);
}

export async function verifySessionToken(token: string): Promise<Jose.JWTPayload & Partial<SessionUser>> {
  const { jwtVerify } = await loadJose();
  const { payload } = await jwtVerify(token, sessionSecretKey);
  return payload;
}
