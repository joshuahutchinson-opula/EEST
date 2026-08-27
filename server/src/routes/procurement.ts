import { Router, Request, Response } from "express";
import pool from "../db";
import { isTech } from "../lib/roles";

const router = Router();

router.get("/:projectId", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT po.id, po.project_id AS "projectId", po.supplier_name AS "supplierName",
              po.status, po.total_cost AS "totalCost", po.generated_from AS "generatedFrom",
              po.created_at AS "createdAt",
              COALESCE(json_agg(json_build_object(
                'id', pi.id, 'description', pi.description, 'quantity', pi.quantity,
                'unitCost', pi.unit_cost, 'totalCost', pi.total_cost,
                'leadTimeDays', pi.lead_time_days, 'trackingNumber', pi.tracking_number, 'received', pi.received
              ) ORDER BY pi.id) FILTER (WHERE pi.id IS NOT NULL), '[]') AS items
       FROM procurement_orders po
       LEFT JOIN procurement_items pi ON pi.order_id = po.id
       WHERE po.project_id = $1
       GROUP BY po.id ORDER BY po.created_at DESC`,
      [req.params.projectId]
    );
    const tech = isTech(req);
    const rows = result.rows.map(row => ({
      ...row,
      totalCost: tech ? 0 : Number(row.totalCost) || 0,
      items: (row.items || []).map((item: any) => ({
        ...item,
        unitCost: tech ? 0 : Number(item.unitCost) || 0,
        totalCost: tech ? 0 : Number(item.totalCost) || 0,
      })),
    }));
    res.json(rows);
  } catch (err) {
    console.error("GET /procurement/:projectId error:", err);
    res.status(500).json({ error: "Failed to fetch POs" });
  }
});

router.post("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { supplierName, generatedFrom, items } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const orderResult = await client.query(
        `INSERT INTO procurement_orders (project_id, supplier_name, generated_from) VALUES ($1, $2, $3) RETURNING id`,
        [projectId, supplierName || null, generatedFrom || null]
      );
      const orderId = orderResult.rows[0].id;
      let totalCost = 0;
      if (Array.isArray(items)) {
        for (const item of items) {
          const qty = item.quantity || 0;
          const unitCost = item.unitCost || 0;
          const itemTotal = qty * unitCost;
          totalCost += itemTotal;
          await client.query(
            `INSERT INTO procurement_items (order_id, description, quantity, unit_cost, total_cost, lead_time_days, tracking_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [orderId, item.description || "", qty, unitCost, itemTotal, item.leadTimeDays || null, item.trackingNumber || null]
          );
        }
      }
      await client.query(`UPDATE procurement_orders SET total_cost = $2 WHERE id = $1`, [orderId, totalCost]);
      await client.query("COMMIT");
      const tech = isTech(req);
      res.status(201).json({
        id: orderId, projectId, supplierName: supplierName || null, status: "pending",
        totalCost: tech ? 0 : totalCost, generatedFrom: generatedFrom || null, createdAt: new Date().toISOString(),
        items: (items || []).map((item: any) => tech ? { ...item, unitCost: 0, totalCost: 0 } : item),
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /procurement/:projectId error:", err);
    res.status(500).json({ error: "Failed to create PO" });
  }
});

router.patch("/items/:itemId", async (req: Request, res: Response) => {
  try {
    const { received, trackingNumber } = req.body;
    const result = await pool.query(
      `UPDATE procurement_items SET received = COALESCE($2, received), tracking_number = COALESCE($3, tracking_number)
       WHERE id = $1 RETURNING id, received, tracking_number AS "trackingNumber"`,
      [req.params.itemId, received, trackingNumber]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Item not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /procurement/items/:itemId error:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

export default router;