import { Request, Response, NextFunction } from "express";
import pool from "../db";
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

// Tech may only touch projects in the Projects pipeline, never Sales.
export async function techMayAccessProject(projectId: string | null | undefined): Promise<boolean> {
  if (!projectId) return false;
  const result = await pool.query(
    `SELECT 1 FROM projects WHERE id::text = $1 AND pipeline_type = 'project' AND deleted_at IS NULL`,
    [projectId]
  );
  return result.rows.length > 0;
}

type ProjectIdResolver = (req: Request) => Promise<string | null | undefined> | string | null | undefined;

// The one guard every per-project route uses: works out which project the request targets
// (the :projectId param by default) and rejects Tech unless it's a Projects-pipeline project.
// Usable as middleware or as a router.param callback.
export function requireProjectAccess(resolveProjectId: ProjectIdResolver = (req) => req.params.projectId) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!isTech(req)) return next();
    try {
      if (await techMayAccessProject(await resolveProjectId(req))) return next();
      res.status(403).json({ error: "Forbidden for this role" });
    } catch (err) {
      console.error("requireProjectAccess error:", err);
      res.status(500).json({ error: "Failed to check project access" });
    }
  };
}
