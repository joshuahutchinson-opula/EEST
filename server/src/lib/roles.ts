import { Request, Response, NextFunction } from "express";
import type { Role } from "./microsoftAuth";

// authMiddleware (server/src/middleware/auth.ts) verifies the session JWT and attaches its
// payload — including role, decided once at login from the TECH_EMAILS deny-list — to
// req.user. Routes trust req.user.role rather than re-deriving it, since it only ever gets
// there via a signature-verified token.
export function getRequestRole(req: Request): Role {
  const role = (req as any).user?.role;
  return role === "tech" ? "tech" : "admin";
}

export function isTech(req: Request): boolean {
  return getRequestRole(req) === "tech";
}

// For routes that must be fully inaccessible to Tech (e.g. Workbook), not just have
// their response data stripped.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (isTech(req)) return res.status(403).json({ error: "Forbidden for this role" });
  next();
}
