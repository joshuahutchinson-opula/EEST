import { Router, Request, Response } from "express";
import pool from "../db";
import { requireAdmin, sessionUserName } from "../lib/roles";
import { buildProposalDocx } from "../lib/docxDocuments";
import { buildWorkbookXlsx } from "../lib/xlsxExport";
import { loadProjectWorkbook } from "../lib/workbookData";
import { buildSectionRows } from "../lib/workbookTotals";
import { DEFAULT_EXCHANGE_RATE } from "../lib/exchangeRate";

const router = Router();

// The Workbook (Asset List, Cost & Margin, BOM, Synthesis, proposals) is fully off-limits
// to the Tech role — not just visually hidden, since these routes are exclusively read/
// written by the Workbook UI itself (unlike quotes.ts, which Project Assets syncing also
// depends on and therefore can't be blocked wholesale).
router.use(requireAdmin);

router.get("/:projectId/overrides", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, project_id AS "projectId", section_number AS "sectionNumber",
              override_value AS "overrideValue", is_overridden AS "isOverridden",
              overridden_by AS "overriddenBy", overridden_at AS "overriddenAt"
       FROM synthesis_overrides WHERE project_id = $1 ORDER BY section_number`,
      [req.params.projectId]
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
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const o of overrides) {
        await client.query(
          `INSERT INTO synthesis_overrides (project_id, section_number, override_value, is_overridden, overridden_by)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (project_id, section_number)
           DO UPDATE SET override_value = EXCLUDED.override_value, is_overridden = EXCLUDED.is_overridden,
             overridden_by = EXCLUDED.overridden_by, overridden_at = NOW()`,
          [projectId, o.sectionNumber, o.overrideValue, o.isOverridden ?? false, sessionUserName(req)]
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
                        new_value AS "newValue", changed_by AS "changedBy", changed_at AS "changedAt"
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
    const { fieldPath, oldValue, newValue } = req.body;
    // Trust the verified session, not a client-supplied changedBy.
    const sessionUser = (req as any).user as { name?: string } | undefined;
    const changedBy = sessionUser?.name || "Unknown";
    const result = await pool.query(
      `INSERT INTO workbook_audit (project_id, field_path, old_value, new_value, changed_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.params.projectId, fieldPath, oldValue || "", newValue || "", changedBy]
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
    const wb = await loadProjectWorkbook(req.params.projectId);
    if (!wb) return res.status(404).json({ error: "Project not found" });

    const rows = buildSectionRows(wb.totals, wb.categories, { foldAdjustments: true });
    const categories = wb.totals.sections
      .map((s) => ({ system: s.system, sectionNumber: s.section, name: s.name, items: (rows.get(s.section) || []).map((r) => ({ description: r.description, quantity: r.quantity, total: r.extended })) }))
      .filter((c) => c.items.length > 0);

    const proposalData = {
      project: wb.project,
      refNumber: wb.quote?.refNumber || undefined,
      exchangeRate: wb.quote?.exchangeRate ?? DEFAULT_EXCHANGE_RATE,
      categories,
      grandTotal: wb.totals.subtotal,
      gctAmount: wb.totals.gct,
      grandTotalWithTax: wb.totals.total,
      generatedAt: new Date().toISOString(),
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
    const wb = await loadProjectWorkbook(req.params.projectId);
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

export default router;