import { Router, Request, Response } from "express";
import pool from "../db";
import { isTech } from "../lib/roles";

const router = Router();

// Field paths that carry a dollar value or client contact info — audit entries logging a change
// to one of these must never reach a Tech-authenticated request, even though today's frontend
// only ever logs stage-transition fields (see the comment on POST below). This is a server-side
// guardrail against a future caller writing e.g. "value" or "contacts" into the audit trail and
// having it served back to Tech verbatim.
const TECH_HIDDEN_AUDIT_FIELDS = new Set(["value", "contacts", "costImpact", "unitCost", "sellPrice", "costTotal", "sellTotal", "profit"]);

// GET /api/audit/:projectId
router.get("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      "SELECT * FROM audit_logs WHERE project_id = $1 ORDER BY created_at DESC LIMIT 100",
      [projectId]
    );
    const tech = isTech(req);
    res.json(
      result.rows
        .filter((row) => !tech || !TECH_HIDDEN_AUDIT_FIELDS.has(row.field_path))
        .map((row) => ({
          id: row.id,
          projectId: row.project_id,
          event: row.event,
          details: row.details,
          user: row.user_name,
          userEmail: row.user_email || undefined,
          field: row.field_path || undefined,
          oldValue: row.old_value ?? undefined,
          newValue: row.new_value ?? undefined,
          timestamp: row.created_at,
        }))
    );
  } catch (err) {
    console.error("GET /audit/:projectId error:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// POST /api/audit/:projectId
router.post("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { event, details, field, oldValue, newValue } = req.body;
    // The authenticated caller (from the verified session token) is the real "who" — never
    // trust a user_name the client might pass in the body.
    const sessionUser = (req as any).user as { name?: string; email?: string } | undefined;
    const userName = sessionUser?.name || "Unknown";
    const userEmail = sessionUser?.email || null;
    await pool.query(
      `INSERT INTO audit_logs (project_id, event, details, user_name, user_email, field_path, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [projectId, event, details || "", userName, userEmail, field || null, oldValue ?? null, newValue ?? null]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("POST /audit/:projectId error:", err);
    res.status(500).json({ error: "Failed to log audit event" });
  }
});

export default router;
