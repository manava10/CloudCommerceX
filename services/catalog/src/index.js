require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const client = require("prom-client");

const app = express();
app.use(cors());
app.use(express.json());
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const port = process.env.PORT || 4002;
const jwtSecret = process.env.JWT_SECRET || "dev-secret";
const useDb = !!process.env.DATABASE_URL;

let db;
if (useDb) {
  try {
    db = require("../../common/db");
  } catch (e) {
    console.warn("DB module load failed, using in-memory:", e.message);
  }
}

// ── In-memory fallback (empty — all products must belong to a seller) ──
const fallbackProducts = [];

// ── Auth middleware for seller endpoints ──
function extractUser(req) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
}

function requireSeller(req, res, next) {
  const user = extractUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  if (user.role !== "seller") return res.status(403).json({ error: "seller access required" });
  req.user = user;
  next();
}

// ── Health / Metrics ──
app.get("/health", (_, res) => res.json({ ok: true, service: "catalog" }));
app.get("/metrics", async (_, res) => {
  res.set("Content-Type", registry.contentType);
  res.send(await registry.metrics());
});

// ── Public: list all active products ──
app.get("/products", async (req, res) => {
  if (useDb && db) {
    try {
      const sellerId = req.query.sellerId;
      let r;
      if (sellerId) {
        const numericId = String(sellerId).replace(/^u/, "");
        r = await db.query(
          `SELECT id, seller_id as "sellerId", name, description, price, stock, image, category, status, created_at as "createdAt"
           FROM products WHERE seller_id = $1 ORDER BY created_at DESC`,
          [numericId]
        );
      } else {
        r = await db.query(
          `SELECT id, seller_id as "sellerId", name, description, price, stock, image, category, status, created_at as "createdAt"
           FROM products WHERE status = 'active' ORDER BY created_at DESC`
        );
      }
      const list = r.rows.map((row) => ({
        id: `p${row.id}`,
        sellerId: row.sellerId ? `u${row.sellerId}` : null,
        name: row.name,
        description: row.description,
        price: row.price,
        stock: row.stock,
        image: row.image,
        category: row.category,
        status: row.status,
        createdAt: row.createdAt,
      }));
      return res.json(list);
    } catch (err) {
      console.error("products list error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
  return res.json(fallbackProducts);
});

// ── Public: get single product ──
app.get("/products/:id", async (req, res) => {
  if (useDb && db) {
    try {
      const numericId = String(req.params.id).replace(/^p/, "");
      const r = await db.query(
        `SELECT id, seller_id as "sellerId", name, description, price, stock, image, category, status
         FROM products WHERE id = $1`,
        [numericId]
      );
      if (r.rows.length === 0) return res.status(404).json({ error: "product not found" });
      const row = r.rows[0];
      return res.json({
        id: `p${row.id}`,
        sellerId: row.sellerId ? `u${row.sellerId}` : null,
        name: row.name,
        description: row.description,
        price: row.price,
        stock: row.stock,
        image: row.image,
        category: row.category,
        status: row.status,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  const product = fallbackProducts.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "product not found" });
  return res.json(product);
});

// ── Seller: create product ──
app.post("/products", requireSeller, async (req, res) => {
  const { name, description, price, stock, image, category } = req.body || {};
  if (!name || !price) {
    return res.status(400).json({ error: "name and price are required" });
  }
  const sellerId = String(req.user.sub).replace(/^u/, "");

  if (useDb && db) {
    try {
      const r = await db.query(
        `INSERT INTO products (seller_id, name, description, price, stock, image, category, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active') RETURNING id, created_at as "createdAt"`,
        [sellerId, name, description || null, Number(price), Number(stock) || 0, image || null, category || null]
      );
      const row = r.rows[0];
      return res.status(201).json({
        id: `p${row.id}`,
        sellerId: `u${sellerId}`,
        name,
        description: description || null,
        price: Number(price),
        stock: Number(stock) || 0,
        image: image || null,
        category: category || null,
        status: "active",
        createdAt: row.createdAt,
      });
    } catch (err) {
      console.error("product create error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // In-memory fallback
  const product = {
    id: `p${fallbackProducts.length + 1}`,
    sellerId: req.user.sub,
    name,
    description: description || null,
    price: Number(price),
    stock: Number(stock) || 0,
    image: image || null,
    category: category || null,
    status: "active",
  };
  fallbackProducts.push(product);
  return res.status(201).json(product);
});

// ── Seller: update product ──
app.put("/products/:id", requireSeller, async (req, res) => {
  const numericId = String(req.params.id).replace(/^p/, "");
  const sellerId = String(req.user.sub).replace(/^u/, "");
  const { name, description, price, stock, image, category, status } = req.body || {};

  if (useDb && db) {
    try {
      // Verify ownership
      const check = await db.query("SELECT seller_id FROM products WHERE id = $1", [numericId]);
      if (check.rows.length === 0) return res.status(404).json({ error: "product not found" });
      if (String(check.rows[0].seller_id) !== sellerId) {
        return res.status(403).json({ error: "you do not own this product" });
      }

      const r = await db.query(
        `UPDATE products SET
           name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           stock = COALESCE($4, stock),
           image = COALESCE($5, image),
           category = COALESCE($6, category),
           status = COALESCE($7, status),
           updated_at = NOW()
         WHERE id = $8
         RETURNING id, seller_id as "sellerId", name, description, price, stock, image, category, status, updated_at as "updatedAt"`,
        [name || null, description, price ? Number(price) : null, stock != null ? Number(stock) : null, image, category, status, numericId]
      );
      const row = r.rows[0];
      return res.json({
        id: `p${row.id}`,
        sellerId: `u${row.sellerId}`,
        name: row.name,
        description: row.description,
        price: row.price,
        stock: row.stock,
        image: row.image,
        category: row.category,
        status: row.status,
        updatedAt: row.updatedAt,
      });
    } catch (err) {
      console.error("product update error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
  return res.status(501).json({ error: "not implemented without database" });
});

// ── Seller: delete (archive) product ──
app.delete("/products/:id", requireSeller, async (req, res) => {
  const numericId = String(req.params.id).replace(/^p/, "");
  const sellerId = String(req.user.sub).replace(/^u/, "");

  if (useDb && db) {
    try {
      const check = await db.query("SELECT seller_id FROM products WHERE id = $1", [numericId]);
      if (check.rows.length === 0) return res.status(404).json({ error: "product not found" });
      if (String(check.rows[0].seller_id) !== sellerId) {
        return res.status(403).json({ error: "you do not own this product" });
      }
      await db.query("UPDATE products SET status = 'archived', updated_at = NOW() WHERE id = $1", [numericId]);
      return res.json({ ok: true, message: "product archived" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  return res.status(501).json({ error: "not implemented without database" });
});

// ── Seller: get own products ──
app.get("/seller/:sellerId/products", async (req, res) => {
  const numericId = String(req.params.sellerId).replace(/^u/, "");
  if (useDb && db) {
    try {
      const r = await db.query(
        `SELECT id, seller_id as "sellerId", name, description, price, stock, image, category, status, created_at as "createdAt"
         FROM products WHERE seller_id = $1 ORDER BY created_at DESC`,
        [numericId]
      );
      const list = r.rows.map((row) => ({
        id: `p${row.id}`,
        sellerId: `u${row.sellerId}`,
        name: row.name,
        description: row.description,
        price: row.price,
        stock: row.stock,
        image: row.image,
        category: row.category,
        status: row.status,
        createdAt: row.createdAt,
      }));
      return res.json(list);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  return res.json(fallbackProducts.filter((p) => p.sellerId === req.params.sellerId));
});

// ── Seller: stats ──
app.get("/seller/:sellerId/stats", async (req, res) => {
  const numericId = String(req.params.sellerId).replace(/^u/, "");
  if (useDb && db) {
    try {
      const productCount = await db.query(
        "SELECT COUNT(*) as count FROM products WHERE seller_id = $1 AND status != 'archived'",
        [numericId]
      );
      const totalStock = await db.query(
        "SELECT COALESCE(SUM(stock), 0) as total FROM products WHERE seller_id = $1 AND status = 'active'",
        [numericId]
      );
      const orderStats = await db.query(
        `SELECT COUNT(DISTINCT oi.order_id) as order_count, COALESCE(SUM(oi.price * oi.qty), 0) as revenue
         FROM order_items oi WHERE oi.seller_id = $1`,
        [numericId]
      );
      return res.json({
        productCount: parseInt(productCount.rows[0].count, 10),
        totalStock: parseInt(totalStock.rows[0].total, 10),
        orderCount: parseInt(orderStats.rows[0].order_count, 10),
        revenue: parseInt(orderStats.rows[0].revenue, 10),
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  return res.json({ productCount: 0, totalStock: 0, orderCount: 0, revenue: 0 });
});

// ── Event Listeners ──
const { subscribe } = require("../../common/eventBus");

async function startEventListeners() {
  try {
    await subscribe("payment.completed", async (payload) => {
      if (!useDb || !db || !payload.orderId) return;
      
      const orderId = String(payload.orderId).replace(/^o/, "");
      
      try {
        // Fetch order items to know what to decrement
        const orderItemsRes = await db.query(
          "SELECT product_id, qty FROM order_items WHERE order_id = $1", 
          [orderId]
        );
        
        for (const item of orderItemsRes.rows) {
          const numericId = String(item.product_id).replace(/^p/, "");
          await db.query(
            "UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1",
            [item.qty, numericId]
          );
        }
      } catch (err) {
        console.error("Failed to decrement stock for order:", err);
      }
    });
    console.log("catalog service: payment listener started (stock decrement)");
  } catch (e) {
    console.log("catalog service: event listener unavailable (no broker)");
  }
}

if (require.main === module) {
  app.listen(port, async () => {
    console.log(`catalog service listening on ${port} (db: ${useDb && db ? "yes" : "no"})`);
    await startEventListeners();
  });
}

module.exports = { app, products: fallbackProducts };
