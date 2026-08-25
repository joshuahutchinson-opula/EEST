import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// ============ SYNTHESIS OVERRIDES ============

// GET /api/workbook/:projectId/overrides
router.get("/:projectId/overrides", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      `SELECT id, project_id AS "projectId", section_number AS "sectionNumber", 
              override_value AS "overrideValue", is_overridden AS "isOverridden",
              overridden_by AS "overriddenBy", overridden_at AS "overriddenAt"
       FROM synthesis_overrides 
       WHERE project_id = $1
       ORDER BY section_number`,
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /workbook/:projectId/overrides error:", err);
    res.status(500).json({ error: "Failed to fetch synthesis overrides" });
  }
});

// PUT /api/workbook/:projectId/overrides
router.put("/:projectId/overrides", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { overrides } = req.body;

    if (!Array.isArray(overrides)) {
      return res.status(400).json({ error: "overrides must be an array" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const override of overrides) {
        await client.query(
          `INSERT INTO synthesis_overrides 
             (project_id, section_number, override_value, is_overridden, overridden_by)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (project_id, section_number) 
           DO UPDATE SET 
             override_value = EXCLUDED.override_value,
             is_overridden = EXCLUDED.is_overridden,
             overridden_by = EXCLUDED.overridden_by,
             overridden_at = NOW()`,
          [
            projectId,
            override.sectionNumber,
            override.overrideValue,
            override.isOverridden ?? false,
            override.overriddenBy || null,
          ]
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
    res.status(500).json({ error: "Failed to save synthesis overrides" });
  }
});

// ============ WORKBOOK AUDIT ============

// GET /api/workbook/:projectId/audit
router.get("/:projectId/audit", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { fieldPath, limit } = req.query;

    let query = `
      SELECT id, project_id AS "projectId", field_path AS "fieldPath",
             old_value AS "oldValue", new_value AS "newValue",
             changed_by AS "changedBy", changed_at AS "changedAt"
      FROM workbook_audit
      WHERE project_id = $1
    `;
    const params: any[] = [projectId];

    if (fieldPath) {
      query += ` AND field_path = $2`;
      params.push(fieldPath);
    }

    query += ` ORDER BY changed_at DESC`;

    if (limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(parseInt(limit as string) || 50);
    } else {
      query += ` LIMIT 100`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /workbook/:projectId/audit error:", err);
    res.status(500).json({ error: "Failed to fetch workbook audit log" });
  }
});

// POST /api/workbook/:projectId/audit
router.post("/:projectId/audit", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { fieldPath, oldValue, newValue, changedBy } = req.body;

    if (!fieldPath) {
      return res.status(400).json({ error: "fieldPath is required" });
    }

    const result = await pool.query(
      `INSERT INTO workbook_audit 
         (project_id, field_path, old_value, new_value, changed_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, project_id AS "projectId", field_path AS "fieldPath",
                 old_value AS "oldValue", new_value AS "newValue",
                 changed_by AS "changedBy", changed_at AS "changedAt"`,
      [projectId, fieldPath, oldValue || "", newValue || "", changedBy || "System"]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /workbook/:projectId/audit error:", err);
    res.status(500).json({ error: "Failed to log workbook audit entry" });
  }
});

// ============ PRICE HISTORY ============

// GET /api/workbook/devices/:deviceId/price-history
router.get("/devices/:deviceId/price-history", async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const result = await pool.query(
      `SELECT id, device_id AS "deviceId", price, recorded_at AS "recordedAt"
       FROM device_price_history
       WHERE device_id = $1
       ORDER BY recorded_at DESC
       LIMIT 20`,
      [deviceId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /workbook/devices/:deviceId/price-history error:", err);
    res.status(500).json({ error: "Failed to fetch price history" });
  }
});

// POST /api/workbook/devices/:deviceId/price-history
router.post("/devices/:deviceId/price-history", async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { price } = req.body;
    if (price === undefined || price === null) {
      return res.status(400).json({ error: "price is required" });
    }
    const result = await pool.query(
      `INSERT INTO device_price_history (device_id, price)
       VALUES ($1, $2)
       RETURNING id, device_id AS "deviceId", price, recorded_at AS "recordedAt"`,
      [deviceId, price]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /workbook/devices/:deviceId/price-history error:", err);
    res.status(500).json({ error: "Failed to record price history" });
  }
});

// ============ PROPOSAL GENERATION ============

// POST /api/workbook/:projectId/proposal
router.post("/:projectId/proposal", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const projectResult = await pool.query(
      `SELECT id, name, client, summary, location, value FROM projects WHERE id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    const quoteResult = await pool.query(
      `SELECT q.id, q.ref_number AS "refNumber", q.date, q.status, 
              qc.name AS "categoryName", qc.type AS "categoryType",
              qli.id AS "itemId", qli.item_number AS "itemNumber", qli.description,
              qli.unit_cost AS "unitCost", qli.quantity, qli.markup_percent AS "markupPercent"
       FROM quotes q
       LEFT JOIN quote_categories qc ON qc.quote_id = q.id
       LEFT JOIN quote_line_items qli ON qli.category_id = qc.id
       WHERE q.project_id = $1
       ORDER BY qc.sort_order, qli.item_number`,
      [projectId]
    );

    const project = projectResult.rows[0];

    const categories: Record<string, { name: string; type: string; items: any[] }> = {};
    let grandTotal = 0;

    for (const row of quoteResult.rows) {
      if (!row.categoryName) continue;
      if (!categories[row.categoryName]) {
        categories[row.categoryName] = { name: row.categoryName, type: row.categoryType, items: [] };
      }
      if (row.description) {
        const unitCost = parseFloat(row.unitCost) || 0;
        const quantity = parseInt(row.quantity) || 0;
        const markupPercent = parseFloat(row.markupPercent) || 0;
        const sellPrice = unitCost * (1 + markupPercent);
        const total = sellPrice * quantity;
        grandTotal += total;
        categories[row.categoryName].items.push({
          itemNumber: row.itemNumber,
          description: row.description,
          unitCost,
          quantity,
          markupPercent,
          sellPrice,
          total,
        });
      }
    }

    const gctRate = 0.15;
    const gctAmount = grandTotal * gctRate;
    const grandTotalWithTax = grandTotal + gctAmount;

    res.json({
      url: `/api/workbook/${projectId}/proposal/download`,
      project,
      categories: Object.values(categories),
      grandTotal,
      gctAmount,
      grandTotalWithTax,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("POST /workbook/:projectId/proposal error:", err);
    res.status(500).json({ error: "Failed to generate proposal" });
  }
});

export default router;