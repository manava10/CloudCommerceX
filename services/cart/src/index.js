require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const express = require("express");
const cors = require("cors");
const client = require("prom-client");

const app = express();
app.use(cors());
app.use(express.json());
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const port = process.env.PORT || 4003;
const useDb = !!process.env.DATABASE_URL;

let db;
if (useDb) {
  try {
    db = require("../../common/db");
  } catch (e) {
    console.warn("DB module load failed, using in-memory:", e.message);
  }
}

const carts = new Map();

function getCartInMemory(userId) {
  if (!carts.has(userId)) {
    carts.set(userId, { userId, items: [] });
  }
  return carts.get(userId);
}

app.get("/health", (_, res) => res.json({ ok: true, service: "cart" }));
app.get("/metrics", async (_, res) => {
  res.set("Content-Type", registry.contentType);
  res.send(await registry.metrics());
});

app.get("/cart/:userId", async (req, res) => {
  const userId = req.params.userId;
  if (useDb && db) {
    try {
      const r = await db.query(
        "SELECT product_id as \"productId\", qty, price FROM cart_items WHERE user_id = $1",
        [userId]
      );
      return res.json({ userId, items: r.rows });
    } catch (err) {
      console.error("cart get error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
  return res.json(getCartInMemory(userId));
});

app.post("/cart/:userId/items", async (req, res) => {
  const userId = req.params.userId;
  const { productId, qty, price } = req.body || {};
  if (!productId || !qty || !price) {
    return res.status(400).json({ error: "productId, qty, price are required" });
  }
  
  // Synchronous Inter-Service Communication (Stock Verification)
  try {
    const catalogUrl = process.env.CATALOG_URL || "http://localhost:4002";
    const catalogRes = await fetch(`${catalogUrl}/products/${productId}`);
    if (!catalogRes.ok) {
      return res.status(400).json({ error: "invalid product or catalog unavailable" });
    }
    const productData = await catalogRes.json();
    if (productData.stock < qty) {
      return res.status(400).json({ error: `Insufficient stock! Only ${productData.stock} left for ${productData.name}.` });
    }
  } catch (err) {
    console.warn("Could not reach catalog service for stock validation:", err.message);
    return res.status(502).json({ error: "Unable to verify stock inventory at this time." });
  }

  if (useDb && db) {
    try {
      await db.query(
        `INSERT INTO cart_items (user_id, product_id, qty, price)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, product_id)
         DO UPDATE SET qty = cart_items.qty + EXCLUDED.qty`,
        [userId, productId, Number(qty), Number(price)]
      );
      const r = await db.query(
        "SELECT product_id as \"productId\", qty, price FROM cart_items WHERE user_id = $1",
        [userId]
      );
      return res.status(201).json({ userId, items: r.rows });
    } catch (err) {
      console.error("cart add error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
  const cart = getCartInMemory(userId);
  const existing = cart.items.find((item) => item.productId === productId);
  if (existing) {
    existing.qty += Number(qty);
  } else {
    cart.items.push({ productId, qty: Number(qty), price: Number(price) });
  }
  return res.status(201).json(cart);
});

app.delete("/cart/:userId/items/:productId", async (req, res) => {
  const userId = req.params.userId;
  const productId = req.params.productId;
  if (useDb && db) {
    try {
      await db.query("DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2", [
        userId,
        productId,
      ]);
      const r = await db.query(
        "SELECT product_id as \"productId\", qty, price FROM cart_items WHERE user_id = $1",
        [userId]
      );
      return res.json({ userId, items: r.rows });
    } catch (err) {
      console.error("cart remove error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
  const cart = getCartInMemory(userId);
  cart.items = cart.items.filter((item) => item.productId !== productId);
  return res.json(cart);
});

app.delete("/cart/:userId", async (req, res) => {
  const userId = req.params.userId;
  if (useDb && db) {
    try {
      await db.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
      return res.status(204).send();
    } catch (err) {
      console.error("cart clear error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
  carts.set(userId, { userId, items: [] });
  return res.status(204).send();
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`cart service listening on ${port} (db: ${useDb && db ? "yes" : "no"})`);
  });
}

module.exports = { app, carts };
