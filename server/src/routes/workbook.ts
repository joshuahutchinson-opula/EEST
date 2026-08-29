import { Router, Request, Response } from "express";
import pool from "../db";
import { requireAdmin } from "../lib/roles";
import { buildProposalDocx } from "../lib/docxDocuments";
import { buildWorkbookXlsx, XlsxCategory } from "../lib/xlsxExport";

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
          [projectId, o.sectionNumber, o.overrideValue, o.isOverridden ?? false, o.overriddenBy || null]
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
    const { projectId } = req.params;
    const projectResult = await pool.query(`SELECT id, name, client, summary, location FROM projects WHERE id = $1`, [projectId]);
    if (projectResult.rows.length === 0) return res.status(404).json({ error: "Project not found" });

    const quoteResult = await pool.query(
      `SELECT q.ref_number AS "refNumber", q.date, q.status, q.exchange_rate AS "exchangeRate",
              qc.system, qc.section_number AS "sectionNumber", qc.name AS "categoryName",
              qli.description, qli.unit_cost AS "unitCost", qli.quantity, qli.markup_percent AS "markupPercent"
       FROM quotes q
       LEFT JOIN quote_categories qc ON qc.quote_id = q.id
       LEFT JOIN quote_line_items qli ON qli.category_id = qc.id
       WHERE q.project_id = $1
       ORDER BY qc.system, qc.section_number, qli.item_number`,
      [projectId]
    );

    const exchangeRate = quoteResult.rows[0]?.exchangeRate || 163;
    const grouped: Record<string, any> = {};
    let grandTotal = 0;

    for (const row of quoteResult.rows) {
      if (!row.categoryName || !row.description) continue;
      const key = row.categoryName;
      if (!grouped[key]) grouped[key] = { system: row.system, sectionNumber: row.sectionNumber, name: row.categoryName, items: [] };
      const unitCost = parseFloat(row.unitCost) || 0;
      const qty = parseInt(row.quantity) || 0;
      const markup = parseFloat(row.markupPercent) || 0;
      const sellPrice = unitCost * (1 + markup);
      const total = sellPrice * qty;
      grandTotal += total;
      grouped[key].items.push({ description: row.description, unitCost, quantity: qty, markupPercent: markup, sellPrice, total });
    }

    const gct = grandTotal * 0.15;
    const proposalData = {
      project: projectResult.rows[0],
      exchangeRate,
      categories: Object.values(grouped) as any,
      grandTotal,
      gctAmount: gct,
      grandTotalWithTax: grandTotal + gct,
      generatedAt: new Date().toISOString(),
    };
    const buffer = await buildProposalDocx(proposalData);
    const filename = `${(proposalData.project.name as string).replace(/\s+/g, "-")}-proposal.docx`;
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
    const { projectId } = req.params;
    const projectResult = await pool.query(`SELECT id, name, client FROM projects WHERE id = $1`, [projectId]);
    if (projectResult.rows.length === 0) return res.status(404).json({ error: "Project not found" });

    const [quoteResult, overridesResult] = await Promise.all([
      pool.query(
        `SELECT q.ref_number AS "refNumber", q.exchange_rate AS "exchangeRate",
                qc.system, qc.section_number AS "sectionNumber", qc.name AS "categoryName", qc.import_rate_percent AS "importRatePercent",
                qli.description, qli.unit_cost AS "unitCost", qli.quantity, qli.markup_percent AS "markupPercent"
         FROM quotes q
         LEFT JOIN quote_categories qc ON qc.quote_id = q.id
         LEFT JOIN quote_line_items qli ON qli.category_id = qc.id
         WHERE q.project_id = $1
         ORDER BY qc.system, qc.section_number, qli.item_number`,
        [projectId]
      ),
      pool.query(
        `SELECT section_number AS "sectionNumber", override_value AS "overrideValue", is_overridden AS "isOverridden"
         FROM synthesis_overrides WHERE project_id = $1 AND is_overridden = TRUE`,
        [projectId]
      ),
    ]);

    const exchangeRate = quoteResult.rows[0]?.exchangeRate || 163;
    const grouped = new Map<string, XlsxCategory>();
    for (const row of quoteResult.rows) {
      if (!row.categoryName || !row.description) continue;
      const key = `${row.system}-${row.sectionNumber}`;
      if (!grouped.has(key)) {
        grouped.set(key, { system: row.system, sectionNumber: Number(row.sectionNumber), name: row.categoryName, importRatePercent: Number(row.importRatePercent) || 0, lineItems: [] });
      }
      grouped.get(key)!.lineItems.push({
        description: row.description,
        unitCost: parseFloat(row.unitCost) || 0,
        quantity: parseInt(row.quantity, 10) || 0,
        markupPercent: parseFloat(row.markupPercent) || 0,
      });
    }

    // Contingency Plan (700.5 for VSS, 1200.5 for EAC) has no backing quote_categories row at
    // all in this app — it only ever exists as a manual Synthesis override on that pseudo-
    // section — so it's represented here as a single synthetic line item carrying that
    // override amount, the only place its value actually lives.
    for (const o of overridesResult.rows) {
      const sectionNumber = parseFloat(o.sectionNumber);
      if (sectionNumber % 1 === 0 || o.overrideValue === null) continue;
      const system: XlsxCategory["system"] = sectionNumber < 900 ? "VSS" : sectionNumber < 1400 ? "EAC" : "Intercom";
      grouped.set(`${system}-${sectionNumber}`, {
        system,
        sectionNumber,
        name: "Contingency Plan",
        importRatePercent: 0,
        lineItems: [{ description: "Contingency Plan", unitCost: Number(o.overrideValue), quantity: 1, markupPercent: 0 }],
      });
    }

    const buffer = await buildWorkbookXlsx({
      projectName: projectResult.rows[0].name,
      clientName: projectResult.rows[0].client,
      refNumber: quoteResult.rows[0]?.refNumber || "",
      exchangeRate,
      categories: [...grouped.values()],
    });
    const filename = `${(projectResult.rows[0].name as string).replace(/\s+/g, "-")}-workbook.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error("GET /workbook/:projectId/export-xlsx error:", err);
    res.status(500).json({ error: "Failed to generate workbook export" });
  }
});

export default router;