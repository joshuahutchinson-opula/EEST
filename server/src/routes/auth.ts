import { Router, Request, Response } from "express";
import crypto from "crypto";
import {
  isMicrosoftAuthConfigured,
  buildAuthorizeUrl,
  exchangeCodeForIdToken,
  verifyMicrosoftIdToken,
  isAllowedDomain,
  signSessionToken,
  verifySessionToken,
  ALLOWED_EMAIL_DOMAIN,
} from "../lib/microsoftAuth";

const router = Router();

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5173";
const OAUTH_COOKIE = "ms_oauth_state";

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

// GET /api/auth/microsoft/login — redirect to Microsoft's OAuth2/OIDC authorize endpoint
router.get("/microsoft/login", (req: Request, res: Response) => {
  if (!isMicrosoftAuthConfigured()) {
    return res.status(500).send("Microsoft sign-in is not configured. Set MS_CLIENT_ID, MS_CLIENT_SECRET, and MS_REDIRECT_URI.");
  }
  const state = base64url(crypto.randomBytes(16));
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());

  const cookiePayload = base64url(Buffer.from(JSON.stringify({ state, codeVerifier })));
  res.setHeader("Set-Cookie", `${OAUTH_COOKIE}=${cookiePayload}; Max-Age=300; Path=/; HttpOnly; SameSite=Lax${req.secure ? "; Secure" : ""}`);
  res.redirect(buildAuthorizeUrl(state, codeChallenge));
});

// GET /api/auth/microsoft/callback — Microsoft redirects here with ?code=&state=
router.get("/microsoft/callback", async (req: Request, res: Response) => {
  const clearCookie = `${OAUTH_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`;
  try {
    const { code, state, error } = req.query as Record<string, string | undefined>;
    if (error) return res.redirect(`${APP_BASE_URL}/?auth_error=microsoft_${encodeURIComponent(error)}`);
    if (!code || !state) return res.redirect(`${APP_BASE_URL}/?auth_error=missing_code`);

    const cookies = parseCookies(req.headers.cookie);
    const raw = cookies[OAUTH_COOKIE];
    if (!raw) { res.setHeader("Set-Cookie", clearCookie); return res.redirect(`${APP_BASE_URL}/?auth_error=missing_state`); }
    const { state: expectedState, codeVerifier } = JSON.parse(Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    res.setHeader("Set-Cookie", clearCookie);
    if (state !== expectedState) return res.redirect(`${APP_BASE_URL}/?auth_error=state_mismatch`);

    const idToken = await exchangeCodeForIdToken(code, codeVerifier);
    const identity = await verifyMicrosoftIdToken(idToken);

    if (!isAllowedDomain(identity.email)) {
      console.warn(`Rejected sign-in from disallowed domain: ${identity.email}`);
      return res.redirect(`${APP_BASE_URL}/?auth_error=domain_not_allowed`);
    }

    const sessionToken = await signSessionToken(identity);
    res.redirect(`${APP_BASE_URL}/#auth_token=${encodeURIComponent(sessionToken)}`);
  } catch (err) {
    console.error("GET /auth/microsoft/callback error:", err);
    res.setHeader("Set-Cookie", clearCookie);
    res.redirect(`${APP_BASE_URL}/?auth_error=sign_in_failed`);
  }
});

// GET /api/auth/me — returns the signed-in user's identity for the current session token
router.get("/me", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = await verifySessionToken(token);
    res.json({ email: payload.email, name: payload.name, oid: payload.oid, allowedDomain: ALLOWED_EMAIL_DOMAIN });
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
});

export default router;
