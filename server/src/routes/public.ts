import { Router, Request, Response } from "express";
import pool from "../db";
import { signFileUrls } from "../lib/uploads";
import { loadProjectWorkbook } from "../lib/workbookData";
import { buildSectionRows } from "../lib/workbookTotals";
import { notifyClientApproval } from "../lib/alerts";
import { latestQuoteId } from "../lib/quoteRevisions";

const MAX_SIGNATURE_LENGTH = 400_000; // characters of PNG data URL
const money = (n: number) => Math.round(n * 100) / 100;

// Statuses a quote version can be approved from by the client.
const APPROVABLE_QUOTE_STATUSES = ["draft", "sent"];

// The quote version the client sees: the project's newest one, whatever its status. Amounts are
// JMD at the rate stored on that version.
async function clientQuote(projectId: string) {
  const quoteId = await latestQuoteId(pool, projectId);
  if (!quoteId) return null;
  const wb = await loadProjectWorkbook(projectId, quoteId);
  if (!wb?.quote) return null;
  const rate = wb.quote.exchangeRate;
  // Client-facing: Synthesis overrides are folded into the section's rows, no adjustment line.
  const rows = buildSectionRows(wb.totals, wb.categories, { foldAdjustments: true });
  return {
    id: wb.quote.id,
    refNumber: wb.quote.refNumber,
    revision: wb.quote.revision,
    status: wb.quote.status,
    exchangeRate: rate,
    sections: wb.totals.sections
      .filter((s) => (rows.get(s.section) || []).length > 0)
      .map((s) => ({
        section: s.section,
        name: s.name,
        totalJmd: money(s.total * rate),
        rows: (rows.get(s.section) || []).map((r) => ({ description: r.description, quantity: r.quantity, unitPriceJmd: money(r.unitPrice * rate), extendedJmd: money(r.extended * rate) })),
      })),
    subtotalJmd: money(wb.totals.subtotal * rate),
    gctJmd: money(wb.totals.gct * rate),
    totalJmd: money(wb.totals.total * rate),
  };
}

const router = Router();

// GET /api/public/status/:token — read-only client status page, no auth. Never returns the
// project's dollar value or contact info; change orders keep their cost impact (the client
// needs the price to approve one), project assets never carry pricing.
router.get("/status/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const projResult = await pool.query(
      `SELECT id, name, client, location, project_stage AS "projectStage", due_date AS "dueDate",
              cameras, devices, stage_history AS "stageHistory", pipeline_type AS "pipelineType",
              summary, assignee_name AS "assigneeName", assignee_initials AS "assigneeInitials",
              assignee_color AS "assigneeColor", collaborators
       FROM projects
       WHERE public_share_token = $1 AND public_share_enabled = TRUE AND deleted_at IS NULL`,
      [token]
    );
    if (projResult.rows.length === 0) {
      return res.status(404).json({ error: "Link not found or has been revoked" });
    }
    const project = projResult.rows[0];

    const [assetsResult, coResult, deviceStatusResult] = await Promise.all([
      pool.query(
        `SELECT pa.category, pa.quantity, pa.location, pa.purpose, pa.cable_spec AS "cableSpec",
                pa.coverage_photos AS "coveragePhotos", d.manufacturer, d.model
         FROM project_assets pa
         LEFT JOIN devices d ON d.id::text = pa.device_store_ref
         WHERE pa.project_id = $1
         ORDER BY pa.created_at`,
        [project.id]
      ),
      pool.query(
        `SELECT id, title, description, cost_impact AS "costImpact", status, created_at AS "createdAt"
         FROM change_orders WHERE project_id = $1 ORDER BY created_at DESC`,
        [project.id]
      ),
      pool.query(
        `SELECT d.status FROM install_devices d JOIN install_zones z ON z.id = d.zone_id WHERE z.project_id = $1`,
        [project.id]
      ),
    ]);

    const [quote, approvalsResult] = await Promise.all([
      clientQuote(project.id),
      pool.query(`SELECT target_type, target_id, signer_name, approved_at FROM approvals WHERE project_id = $1`, [project.id]),
    ]);
    const approvalFor = (type: string, id: string) => {
      const a = approvalsResult.rows.find((r) => r.target_type === type && r.target_id === id);
      return a ? { signerName: a.signer_name, approvedAt: a.approved_at } : undefined;
    };

    const totalDevices = deviceStatusResult.rows.length;
    const completeDevices = deviceStatusResult.rows.filter((r) => r.status === "complete").length;
    const progress = totalDevices > 0 ? Math.round((completeDevices / totalDevices) * 100) : 0;

    // Same "current pipeline only" rule as the authenticated Project Detail timeline (Phase 10)
    // — a client shouldn't see internal Sales-stage history mixed into their project's progress.
    const PROJECT_STAGE_VALUES = new Set(["support", "planning", "procurement", "installation", "commissioning", "complete"]);
    const stageHistory = (project.stageHistory || []).filter((e: { stage: string }) =>
      project.pipelineType === "project" ? PROJECT_STAGE_VALUES.has(e.stage) : !PROJECT_STAGE_VALUES.has(e.stage)
    );

    // Same dedup rule as the authenticated app's getDeduplicatedTeam: the assignee is always
    // "Account Owner", a collaborator sharing their name just adds another role rather than
    // appearing as a second person.
    const team: { name: string; initials: string; color: string; roles: string[] }[] = [];
    if (project.assigneeName) team.push({ name: project.assigneeName, initials: project.assigneeInitials || "", color: project.assigneeColor || "#3b82f6", roles: ["Account Owner"] });
    for (const c of (project.collaborators || []) as { name: string; initials: string; color: string; role: string }[]) {
      const existing = team.find((m) => m.name === c.name);
      if (existing) existing.roles.push(c.role);
      else team.push({ name: c.name, initials: c.initials, color: c.color, roles: [c.role] });
    }

    res.json({
      project: {
        name: project.name,
        client: project.client,
        location: project.location,
        projectStage: project.projectStage,
        dueDate: project.dueDate,
        cameras: project.cameras,
        devices: project.devices,
        progress,
        stageHistory,
        summary: project.summary || undefined,
        team,
      },
      changeOrders: coResult.rows.map((co) => ({ ...co, costImpact: Number(co.costImpact), approval: approvalFor("change_order", co.id) })),
      quote: quote ? { ...quote, approval: approvalFor("quote", quote.id) } : null,
      assets: assetsResult.rows.map((a) => ({ ...a, coveragePhotos: signFileUrls(a.coveragePhotos) })),
    });
  } catch (err) {
    console.error("GET /public/status/:token error:", err);
    res.status(500).json({ error: "Failed to fetch project status" });
  }
});

// POST /api/public/status/:token/approve — the client signs off the newest quote version or a submitted
// change order: typed name + drawn signature. Stored with time, IP and user agent; the quote or
// change order becomes approved and admins are notified.
router.post("/status/:token/approve", async (req: Request, res: Response) => {
  const { targetType, targetId, signerName, signature } = req.body || {};
  if (targetType !== "quote" && targetType !== "change_order") return res.status(400).json({ error: "targetType must be quote or change_order" });
  if (typeof targetId !== "string") return res.status(400).json({ error: "targetId is required" });
  if (typeof signerName !== "string" || !signerName.trim() || signerName.length > 120) return res.status(400).json({ error: "Type your full name to approve" });
  if (typeof signature !== "string" || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature) || signature.length > MAX_SIGNATURE_LENGTH) return res.status(400).json({ error: "A drawn signature is required" });

  const client = await pool.connect();
  try {
    const project = (await client.query(
      `SELECT id, name FROM projects WHERE public_share_token = $1 AND public_share_enabled = TRUE AND deleted_at IS NULL`,
      [req.params.token]
    )).rows[0];
    if (!project) return res.status(404).json({ error: "Link not found or has been revoked" });

    await client.query("BEGIN");
    // Lock the target row so two simultaneous approvals can't both succeed.
    const target = targetType === "quote"
      ? (await client.query(`SELECT id, status, ref_number, revision FROM quotes WHERE id::text = $1 AND project_id = $2 FOR UPDATE`, [targetId, project.id])).rows[0]
      : (await client.query(`SELECT id, status, title FROM change_orders WHERE id::text = $1 AND project_id = $2 FOR UPDATE`, [targetId, project.id])).rows[0];
    if (!target) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Nothing to approve here" }); }
    // A quote can be approved only while it's the version the client is shown (the newest one).
    const awaiting = targetType === "quote"
      ? APPROVABLE_QUOTE_STATUSES.includes(target.status) && (await latestQuoteId(client, project.id)) === target.id
      : target.status === "submitted";
    if (!awaiting) { await client.query("ROLLBACK"); return res.status(409).json({ error: target.status === "approved" ? "This has already been approved" : "This isn't awaiting approval" }); }

    const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() || req.socket.remoteAddress || null;
    await client.query(
      `INSERT INTO approvals (project_id, target_type, target_id, signer_name, signature, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [project.id, targetType, target.id, signerName.trim(), signature, ip, String(req.headers["user-agent"] || "").slice(0, 300)]
    );
    if (targetType === "quote") await client.query(`UPDATE quotes SET status = 'approved', updated_at = NOW() WHERE id = $1`, [target.id]);
    else await client.query(`UPDATE change_orders SET status = 'approved', updated_at = NOW() WHERE id = $1`, [target.id]);
    const what = targetType === "quote" ? `quote ${target.ref_number} (Rev ${target.revision})` : `change order "${target.title}"`;
    await client.query(
      `INSERT INTO audit_logs (project_id, event, details, user_name, notification_type, action_url) VALUES ($1, 'Client Approval', $2, 'System', 'client-approval', $3)`,
      [project.id, `${signerName.trim()} approved ${what} for ${project.name}.`, `/project/${project.id}`]
    );
    await client.query("COMMIT");
    res.json({ success: true });
    void notifyClientApproval({ projectName: project.name, what, signerName: signerName.trim() });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST /public/status/:token/approve error:", err);
    res.status(500).json({ error: "Failed to record approval" });
  } finally {
    client.release();
  }
});

export default router;
