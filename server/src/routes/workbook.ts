import { Router, Request, Response } from "express";
import pool from "../db";
import { requireAdmin, sessionUserName } from "../lib/roles";
import { buildProposalDocx } from "../lib/docxDocuments";
import { buildWorkbookXlsx } from "../lib/xlsxExport";
import { buildFullWorkbookXlsx } from "../lib/workbookXlsxFull";
import { loadProjectWorkbook } from "../lib/workbookData";
import { buildSectionRows, totalsForSystems } from "../lib/workbookTotals";
import { DEFAULT_EXCHANGE_RATE } from "../lib/exchangeRate";
import { FROZEN_QUOTE_MESSAGE, isQuoteFrozen, latestQuoteId } from "../lib/quoteRevisions";

// Which quote version a request is about: ?quoteId= (or body.quoteId), defaulting to the
// project's newest version. Returns null if the quote doesn't belong to the project.
async function resolveQuoteId(req: Request): Promise<string | null> {
  const requested = (req.query.quoteId as string | undefined) || req.body?.quoteId;
  if (!requested) return latestQuoteId(pool, req.params.projectId);
  const found = await pool.query(`SELECT id FROM quotes WHERE id::text = $1 AND project_id::text = $2`, [requested, req.params.projectId]);
  return found.rows[0]?.id ?? null;
}

const router = Router();

// The Workbook (Asset List, Cost & Margin, BOM, Synthesis, proposals) is fully off-limits
// to the Tech role — not just visually hidden, since these routes are exclusively read/
// written by the Workbook UI itself (unlike quotes.ts, which Project Assets syncing also
// depends on and therefore can't be blocked wholesale).
router.use(requireAdmin);

// Team-wide Workbook settings. minMargin is the percentage under which the pricing badge flags
// an item; the default applies until an admin saves one.
const DEFAULT_MIN_MARGIN = 20;

router.get("/settings", async (_req: Request, res: Response) => {
  try {
    const row = (await pool.query(`SELECT value, updated_by AS "updatedBy", updated_at AS "updatedAt" FROM app_settings WHERE key = 'workbook.min_margin'`)).rows[0];
    res.json({ minMargin: row ? Number(row.value) : DEFAULT_MIN_MARGIN, updatedBy: row?.updatedBy ?? null, updatedAt: row?.updatedAt ?? null });
  } catch (err) {
    console.error("GET /workbook/settings error:", err);
    res.status(500).json({ error: "Failed to load Workbook settings" });
  }
});

router.put("/settings", async (req: Request, res: Response) => {
  try {
    const minMargin = Number(req.body?.minMargin);
    if (!Number.isFinite(minMargin) || minMargin < 0 || minMargin > 100) return res.status(400).json({ error: "minMargin must be a number from 0 to 100" });
    const result = await pool.query(
      `INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES ('workbook.min_margin', $1::jsonb, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()
       RETURNING updated_by AS "updatedBy", updated_at AS "updatedAt"`,
      [JSON.stringify(minMargin), sessionUserName(req)]
    );
    res.json({ minMargin, ...result.rows[0] });
  } catch (err) {
    console.error("PUT /workbook/settings error:", err);
    res.status(500).json({ error: "Failed to save Workbook settings" });
  }
});

router.get("/:projectId/overrides", async (req: Request, res: Response) => {
  try {
    const quoteId = await resolveQuoteId(req);
    if (!quoteId) return res.json([]);
    const result = await pool.query(
      `SELECT id, project_id AS "projectId", section_number AS "sectionNumber",
              override_value AS "overrideValue", is_overridden AS "isOverridden",
              overridden_by AS "overriddenBy", overridden_at AS "overriddenAt"
       FROM synthesis_overrides WHERE quote_id = $1 ORDER BY section_number`,
      [quoteId]
    );
    res.json(result.rows.map(row => ({
      ...row,
      overrideValue: row.overrideValue !== null ? Number(row.overrideValue) : null,
    })));
  } catch (err) {
    console.error("GET /workbook/:projectId/overrides error:", err);
    res.status(500).json({ error: "Failed to fetch overrides" });
  }
});

router.put("/:projectId/overrides", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { overrides } = req.body;
    if (!Array.isArray(overrides)) return res.status(400).json({ error: "overrides must be an array" });
    const quoteId = await resolveQuoteId(req);
    if (!quoteId) return res.status(400).json({ error: "This project has no quote to override" });
    if (await isQuoteFrozen(pool, quoteId)) return res.status(409).json({ error: FROZEN_QUOTE_MESSAGE, frozen: true });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const o of overrides) {
        await client.query(
          `INSERT INTO synthesis_overrides (project_id, quote_id, section_number, override_value, is_overridden, overridden_by)
           VALUES ($1, $6, $2, $3, $4, $5)
           ON CONFLICT (quote_id, section_number)
           DO UPDATE SET override_value = EXCLUDED.override_value, is_overridden = EXCLUDED.is_overridden,
             overridden_by = EXCLUDED.overridden_by, overridden_at = NOW()`,
          [projectId, o.sectionNumber, o.overrideValue, o.isOverridden ?? false, sessionUserName(req), quoteId]
        );
      }
      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("PUT /workbook/:projectId/overrides error:", err);
    res.status(500).json({ error: "Failed to save overrides" });
  }
});

router.get("/:projectId/audit", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { fieldPath } = req.query;
    let query = `SELECT id, project_id AS "projectId", field_path AS "fieldPath", old_value AS "oldValue",
                        new_value AS "newValue", changed_by AS "changedBy", changed_at AS "changedAt",
                        entity_type AS "entityType", entity_id AS "entityId", field, quote_id AS "quoteId"
                 FROM workbook_audit WHERE project_id = $1`;
    const params: any[] = [projectId];
    if (fieldPath) { query += ` AND field_path = $2`; params.push(fieldPath); }
    query += ` ORDER BY changed_at DESC LIMIT 100`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /workbook/:projectId/audit error:", err);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});

router.post("/:projectId/audit", async (req: Request, res: Response) => {
  try {
    const { fieldPath, oldValue, newValue, entityType, entityId, field, quoteId } = req.body;
    const structured = (entityType === "line-item" || entityType === "override") && typeof entityId === "string" && typeof field === "string";
    // Trust the verified session, not a client-supplied changedBy.
    const sessionUser = (req as any).user as { name?: string } | undefined;
    const changedBy = sessionUser?.name || "Unknown";
    const result = await pool.query(
      `INSERT INTO workbook_audit (project_id, field_path, old_value, new_value, changed_by, entity_type, entity_id, field, quote_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, (SELECT id FROM quotes WHERE id::text = $9)) RETURNING id`,
      [req.params.projectId, fieldPath, oldValue || "", newValue || "", changedBy, structured ? entityType : null, structured ? entityId : null, structured ? field : null, structured && typeof quoteId === "string" ? quoteId : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /workbook/:projectId/audit error:", err);
    res.status(500).json({ error: "Failed to log audit" });
  }
});

router.get("/devices/:deviceId/price-history", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, device_id AS "deviceId", price, recorded_at AS "recordedAt"
       FROM device_price_history WHERE device_id = $1 ORDER BY recorded_at DESC LIMIT 20`,
      [req.params.deviceId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET price-history error:", err);
    res.status(500).json({ error: "Failed to fetch price history" });
  }
});

router.post("/devices/:deviceId/price-history", async (req: Request, res: Response) => {
  try {
    const { price } = req.body;
    const result = await pool.query(
      `INSERT INTO device_price_history (device_id, price) VALUES ($1, $2) RETURNING id`,
      [req.params.deviceId, price]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST price-history error:", err);
    res.status(500).json({ error: "Failed to record price" });
  }
});

router.post("/:projectId/proposal", async (req: Request, res: Response) => {
  try {
    const quoteId = await resolveQuoteId(req);
    const wb = await loadProjectWorkbook(req.params.projectId, quoteId);
    if (!wb) return res.status(404).json({ error: "Project not found" });

    const rows = buildSectionRows(wb.totals, wb.categories, { foldAdjustments: true });
    // Options: which systems to include (default all), a validity date and terms text.
    const { systems, validUntil, terms } = (req.body || {}) as { systems?: unknown; validUntil?: unknown; terms?: unknown };
    const included = Array.isArray(systems) && systems.length > 0 ? systems.filter((s): s is string => typeof s === "string") : wb.totals.systems.map((s) => s.system as string);
    const subset = totalsForSystems(wb.totals, included);
    const categories = wb.totals.sections
      .filter((s) => included.includes(s.system))
      .map((s) => ({ system: s.system, sectionNumber: s.section, name: s.name, items: (rows.get(s.section) || []).map((r) => ({ description: r.description, quantity: r.quantity, total: r.extended })) }))
      .filter((c) => c.items.length > 0);

    const proposalData = {
      project: wb.project,
      refNumber: wb.quote?.refNumber || undefined,
      exchangeRate: wb.quote?.exchangeRate ?? DEFAULT_EXCHANGE_RATE,
      categories,
      grandTotal: subset.subtotal,
      gctAmount: subset.gct,
      grandTotalWithTax: subset.total,
      generatedAt: new Date().toISOString(),
      validUntil: typeof validUntil === "string" && /^\d{4}-\d{2}-\d{2}$/.test(validUntil) ? validUntil : undefined,
      terms: typeof terms === "string" ? terms.slice(0, 5000) : undefined,
    };
    const buffer = await buildProposalDocx(proposalData);
    const filename = `${(wb.project.name as string).replace(/\s+/g, "-")}-proposal.docx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error("POST /workbook/:projectId/proposal error:", err);
    res.status(500).json({ error: "Failed to generate proposal" });
  }
});

// GET /api/workbook/:projectId/export-xlsx — populates the real MOH-SurAc template's Synthesis
// and {System} BoM sheets with this project's live Workbook data. Separate from the docx
// Proposal — an additional export option, not a replacement.
router.get("/:projectId/export-xlsx", async (req: Request, res: Response) => {
  try {
    const quoteId = await resolveQuoteId(req);
    const wb = await loadProjectWorkbook(req.params.projectId, quoteId);
    if (!wb) return res.status(404).json({ error: "Project not found" });

    const buffer = await buildWorkbookXlsx({
      projectName: wb.project.name,
      clientName: wb.project.client,
      refNumber: wb.quote?.refNumber || "",
      exchangeRate: wb.quote?.exchangeRate ?? DEFAULT_EXCHANGE_RATE,
      generatedAt: new Date().toISOString(),
      totals: wb.totals,
      rows: buildSectionRows(wb.totals, wb.categories, { foldAdjustments: true }),
    });
    const filename = `${(wb.project.name as string).replace(/\s+/g, "-")}-workbook.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error("GET /workbook/:projectId/export-xlsx error:", err);
    res.status(500).json({ error: "Failed to generate workbook export" });
  }
});

// GET /api/workbook/:projectId/export-workbook-xlsx — the whole Workbook (Asset List, Cost & Margin,
// BOM, Synthesis, cover sheet) as an internal spreadsheet. Separate from the MOH template export.
router.get("/:projectId/export-workbook-xlsx", async (req: Request, res: Response) => {
  try {
    const quoteId = await resolveQuoteId(req);
    const wb = await loadProjectWorkbook(req.params.projectId, quoteId);
    if (!wb) return res.status(404).json({ error: "Project not found" });
    const buffer = await buildFullWorkbookXlsx(wb);
    const rev = wb.quote ? `-rev${wb.quote.revision}` : "";
    const filename = `${(wb.project.name as string).replace(/\s+/g, "-")}${rev}-full-workbook.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error("GET /workbook/:projectId/export-workbook-xlsx error:", err);
    res.status(500).json({ error: "Failed to generate workbook export" });
  }
});

export default router;