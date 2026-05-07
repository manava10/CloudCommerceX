require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const express = require("express");
const cors = require("cors");
const client = require("prom-client");

const app = express();
app.use(cors());
app.use(express.json());
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const port = process.env.PORT || 4002;
const useDb = !!process.env.DATABASE_URL;

let db;
if (useDb) {
  try {
    db = require("../../common/db");
  } catch (e) {
    console.warn("DB module load failed, using in-memory:", e.message);
  }
}

const products = [];

function mapProduct(row) {
  return {
    id: row.id,
    sellerId: row.seller_id || row.sellerId,
    name: row.name,
    price: Number(row.price),
    stock: Number(row.stock),
    image: row.image || "",
    description: row.description || "",
    storeName: row.store_name || row.storeName || null,
  };
}

function requireSeller(req, res, next) {
  const sellerId = req.headers["x-seller-id"];
  const role = req.headers["x-user-role"];
  if (!sellerId || role !== "seller") {
    return res.status(403).json({ error: "seller account required" });
  }
  req.sellerId = sellerId;
  next();
}

app.get("/health", (_, res) => res.json({ ok: true, service: "catalog" }));
app.get("/metrics", async (_, res) => {
  res.set("Content-Type", registry.contentType);
  res.send(await registry.metrics());
});
app.get("/products", async (req, res) => {
  const sellerId = req.query.sellerId;
  if (useDb && db) {
    try {
      const r = sellerId
        ? await db.query(
            `SELECT p.*, s.store_name
             FROM products p
             JOIN sellers s ON s.id = p.seller_id
             WHERE p.seller_id = $1
             ORDER BY p.created_at DESC`,
            [sellerId]
          )
        : await db.query(
            `SELECT p.*, s.store_name
             FROM products p
             JOIN sellers s ON s.id = p.seller_id
             ORDER BY p.created_at DESC`
          );
      return res.json(r.rows.map(mapProduct));
    } catch (err) {
      console.error("catalog list error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
  const list = sellerId ? products.filter((p) => p.sellerId === sellerId) : products;
  return res.json(list);
});

app.post("/products", requireSeller, async (req, res) => {
  const { name, price, stock, image, description } = req.body || {};
  if (!name || price == null || stock == null) {
    return res.status(400).json({ error: "name, price and stock are required" });
  }
  if (useDb && db) {
    try {
      const sequence = await db.query(
        "SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) + 1 as next FROM products"
      );
      const id = `p${sequence.rows[0].next}`;
      const r = await db.query(
        `INSERT INTO products (id, seller_id, name, price, stock, image, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [id, req.sellerId, name, Number(price), Number(stock), image || "", description || ""]
      );
      return res.status(201).json(mapProduct(r.rows[0]));
    } catch (err) {
      console.error("catalog create error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
  const product = {
    id: `p${products.length + 1}`,
    sellerId: req.sellerId,
    name,
    price: Number(price),
    stock: Number(stock),
    image: image || "",
    description: description || "",
  };
  products.push(product);
  return res.status(201).json(product);
});

app.get("/sellers/:sellerId/products", async (req, res) => {
  req.query.sellerId = req.params.sellerId;
  if (useDb && db) {
    try {
      const r = await db.query(
        `SELECT p.*, s.store_name
         FROM products p
         JOIN sellers s ON s.id = p.seller_id
         WHERE p.seller_id = $1
         ORDER BY p.created_at DESC`,
        [req.params.sellerId]
      );
      return res.json(r.rows.map(mapProduct));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  return res.json(products.filter((p) => p.sellerId === req.params.sellerId));
});

app.get("/products/:id", async (req, res) => {
  if (useDb && db) {
    try {
      const r = await db.query(
        `SELECT p.*, s.store_name
         FROM products p
         JOIN sellers s ON s.id = p.seller_id
         WHERE p.id = $1`,
        [req.params.id]
      );
      if (r.rows.length === 0) {
        return res.status(404).json({ error: "product not found" });
      }
      return res.json(mapProduct(r.rows[0]));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "product not found" });
  }
  return res.json(product);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`catalog service listening on ${port}`);
  });
}

module.exports = { app, products };
