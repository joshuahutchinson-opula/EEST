import { Request, Response, NextFunction } from "express";
import { verifySessionToken } from "../lib/microsoftAuth";

// Paths (relative to the mount point, e.g. mounted at app.use("/api", authMiddleware))
// that must remain reachable without a session: the entire OAuth login/callback/me flow
// (each of its routes enforces whatever it individually needs), the health check, and
// the read-only subcontractor portal (its own share-token secures it).
const PUBLIC_PATH_PATTERNS = [
  /^\/auth\//,
  /^\/health$/,
  /^\/subcontractors\/public\//,
  /^\/public\/status\//,
];

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_PATH_PATTERNS.some((rx) => rx.test(req.path))) return next();

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = await verifySessionToken(token);
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}
