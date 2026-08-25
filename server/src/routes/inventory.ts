import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// GET /api/inventory/items
router.get("/items", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT ii.id, ii.name, ii.quantity_on_hand AS "quantityOnHand", 
              ii.location, ii.notes, ii.created_at AS "createdAt", ii.updated_at AS "updatedAt",
              d.model, d.manufacturer, d.sku, ii.device_id AS "deviceId"
       FROM inventory_items ii
       LEFT JOIN devices d ON d.id = ii.device_id
       ORDER BY ii.name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /inventory/items error:", err);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// POST /api/inventory/items
router.post("/items", async (req: Request, res: Response) => {
  try {
    const { name, quantityOnHand, location, notes, deviceId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    const result = await pool.query(
      `INSERT INTO inventory_items (name, quantity_on_hand, location, notes, device_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, quantity_on_hand AS "quantityOnHand", location, notes, device_id AS "deviceId"`,
      [name.trim(), quantityOnHand || 0, location || null, notes || null, deviceId || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /inventory/items error:", err);
    res.status(500).json({ error: "Failed to create inventory item" });
  }
});

// PATCH /api/inventory/items/:id
router.patch("/items/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantityOnHand, location, notes } = req.body;
    const result = await pool.query(
      `UPDATE inventory_items 
       SET quantity_on_hand = COALESCE($2, quantity_on_hand),
           location = COALESCE($3, location),
           notes = COALESCE($4, notes),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, quantity_on_hand AS "quantityOnHand", location, notes`,
      [id, quantityOnHand, location, notes]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Inventory item not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /inventory/items/:id error:", err);
    res.status(500).json({ error: "Failed to update inventory item" });
  }
});

// GET /api/inventory/transactions
router.get("/transactions", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT it.id, it.item_id AS "itemId", it.user_name AS "userName", 
              it.action, it.quantity, it.purpose, it.notes, it.created_at AS "createdAt",
              ii.name AS "itemName"
       FROM inventory_transactions it
       JOIN inventory_items ii ON ii.id = it.item_id
       ORDER BY it.created_at DESC
       LIMIT 500`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /inventory/transactions error:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// POST /api/inventory/transactions
router.post("/transactions", async (req: Request, res: Response) => {
  try {
    const { itemId, userName, action, quantity, purpose, notes } = req.body;
    if (!itemId || !action) {
      return res.status(400).json({ error: "itemId and action are required" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `INSERT INTO inventory_transactions (item_id, user_name, action, quantity, purpose, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, item_id AS "itemId", user_name AS "userName", action, quantity, purpose, notes, created_at AS "createdAt"`,
        [itemId, userName || "Unknown", action, quantity || 0, purpose || null, notes || null]
      );

      const qtyChange = action === "Sold" || action === "Loaned" || action === "Disposed"
        ? -Math.abs(quantity || 0)
        : action === "Returned" ? Math.abs(quantity || 0) : 0;

      await client.query(
        `UPDATE inventory_items 
         SET quantity_on_hand = GREATEST(0, quantity_on_hand + $2),
             updated_at = NOW()
         WHERE id = $1`,
        [itemId, qtyChange]
      );

      await client.query("COMMIT");
      res.status(201).json(result.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /inventory/transactions error:", err);
    res.status(500).json({ error: "Failed to log transaction" });
  }
});

export default router;