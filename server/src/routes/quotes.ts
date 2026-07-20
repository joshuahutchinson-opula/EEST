import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// GET /api/quotes
router.get("/", async (_req: Request, res: Response) => {
  try {
    const quotesResult = await pool.query("SELECT * FROM quotes ORDER BY created_at DESC");
    const quotes = [];
    for (const q of quotesResult.rows) {
      const catsResult = await pool.query("SELECT * FROM quote_categories WHERE quote_id=$1 ORDER BY sort_order", [q.id]);
      const categories = [];
      for (const cat of catsResult.rows) {
        const itemsResult = await pool.query("SELECT * FROM quote_line_items WHERE category_id=$1 ORDER BY item_number", [cat.id]);
        categories.push({
          id: cat.id, name: cat.name, type: cat.type,
          lineItems: itemsResult.rows.map((li) => ({
            id: li.id, itemNumber: li.item_number, description: li.description || "",
            unitCost: Number(li.unit_cost), quantity: li.quantity, markupPercent: Number(li.markup_percent),
            sellPrice: Number(li.unit_cost) * (1 + Number(li.markup_percent)),
            costTotal: Number(li.unit_cost) * li.quantity,
            sellTotal: Number(li.unit_cost) * (1 + Number(li.markup_percent)) * li.quantity,
            profit: (Number(li.unit_cost) * (1 + Number(li.markup_percent)) * li.quantity) - (Number(li.unit_cost) * li.quantity),
            jmdConversion: Number(li.unit_cost) * (1 + Number(li.markup_percent)) * li.quantity * Number(q.exchange_rate),
          })),
          contingency: undefined,
        });
      }
      quotes.push({
        id: q.id, clientName: q.client_name, refNumber: q.ref_number, date: q.date ? new Date(q.date).toISOString().slice(0, 10) : "",
        status: q.status, quoteType: q.quote_type, categories, exchangeRate: Number(q.exchange_rate),
        createdAt: q.created_at, updatedAt: q.updated_at,
      });
    }
    res.json(quotes);
  } catch (err) {
    console.error("GET /quotes error:", err);
    res.status(500).json({ error: "Failed to fetch quotes" });
  }
});

// GET /api/quotes/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const qResult = await pool.query("SELECT * FROM quotes WHERE id=$1", [id]);
    if (qResult.rows.length === 0) return res.status(404).json({ error: "Quote not found" });
    const q = qResult.rows[0];
    const catsResult = await pool.query("SELECT * FROM quote_categories WHERE quote_id=$1 ORDER BY sort_order", [id]);
    const categories = [];
    for (const cat of catsResult.rows) {
      const itemsResult = await pool.query("SELECT * FROM quote_line_items WHERE category_id=$1 ORDER BY item_number", [cat.id]);
      categories.push({
        id: cat.id, name: cat.name, type: cat.type,
        lineItems: itemsResult.rows.map((li) => ({
          id: li.id, itemNumber: li.item_number, description: li.description || "",
          unitCost: Number(li.unit_cost), quantity: li.quantity, markupPercent: Number(li.markup_percent),
          sellPrice: Number(li.unit_cost) * (1 + Number(li.markup_percent)),
          costTotal: Number(li.unit_cost) * li.quantity,
          sellTotal: Number(li.unit_cost) * (1 + Number(li.markup_percent)) * li.quantity,
          profit: (Number(li.unit_cost) * (1 + Number(li.markup_percent)) * li.quantity) - (Number(li.unit_cost) * li.quantity),
          jmdConversion: Number(li.unit_cost) * (1 + Number(li.markup_percent)) * li.quantity * Number(q.exchange_rate),
        })),
      });
    }
    res.json({ id: q.id, clientName: q.client_name, refNumber: q.ref_number, date: q.date ? new Date(q.date).toISOString().slice(0, 10) : "", status: q.status, quoteType: q.quote_type, categories, exchangeRate: Number(q.exchange_rate) });
  } catch (err) {
    console.error("GET /quotes/:id error:", err);
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

// POST /api/quotes
router.post("/", async (req: Request, res: Response) => {
  try {
    const { clientName, refNumber, date, status, quoteType, categories, exchangeRate } = req.body;
    const qResult = await pool.query(
      "INSERT INTO quotes (client_name, ref_number, date, status, quote_type, exchange_rate) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [clientName, refNumber, date, status || "draft", quoteType || "Both", exchangeRate || 157.4]
    );
    const quote = qResult.rows[0];
    if (categories && Array.isArray(categories)) {
      for (const cat of categories) {
        const cResult = await pool.query(
          "INSERT INTO quote_categories (quote_id, name, type) VALUES ($1,$2,$3) RETURNING *",
          [quote.id, cat.name, cat.type || "Both"]
        );
        if (cat.lineItems && Array.isArray(cat.lineItems)) {
          for (const li of cat.lineItems) {
            await pool.query(
              "INSERT INTO quote_line_items (category_id, item_number, description, unit_cost, quantity, markup_percent) VALUES ($1,$2,$3,$4,$5,$6)",
              [cResult.rows[0].id, li.itemNumber, li.description, li.unitCost || 0, li.quantity || 0, li.markupPercent || 0]
            );
          }
        }
      }
    }
    res.status(201).json({ id: quote.id, clientName: quote.client_name, refNumber: quote.ref_number, date: quote.date ? new Date(quote.date).toISOString().slice(0, 10) : "", status: quote.status, quoteType: quote.quote_type, categories: [], exchangeRate: Number(quote.exchange_rate) });
  } catch (err) {
    console.error("POST /quotes error:", err);
    res.status(500).json({ error: "Failed to create quote" });
  }
});

// PATCH /api/quotes/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { clientName, refNumber, status, exchangeRate } = req.body;
    await pool.query(
      "UPDATE quotes SET client_name=COALESCE($2,client_name), ref_number=COALESCE($3,ref_number), status=COALESCE($4,status), exchange_rate=COALESCE($5,exchange_rate), updated_at=NOW() WHERE id=$1",
      [id, clientName, refNumber, status, exchangeRate]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /quotes/:id error:", err);
    res.status(500).json({ error: "Failed to update quote" });
  }
});

// DELETE /api/quotes/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await pool.query("DELETE FROM quotes WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /quotes/:id error:", err);
    res.status(500).json({ error: "Failed to delete quote" });
  }
});

export default router;