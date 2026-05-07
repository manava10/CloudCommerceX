require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const express = require("express");
const cors = require("cors");
const { publish, subscribe } = require("../../common/eventBus");
const client = require("prom-client");

const app = express();
app.use(cors());
app.use(express.json());
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const port = process.env.PORT || 4004;
const useDb = !!process.env.DATABASE_URL;

let db;
if (useDb) {
  try {
    db = require("../../common/db");
  } catch (e) {
    console.warn("DB module load failed, using in-memory:", e.message);
  }
}

const orders = [];

app.get("/health", (_, res) => res.json({ ok: true, service: "order" }));
app.get("/metrics", async (_, res) => {
  res.set("Content-Type", registry.contentType);
  res.send(await registry.metrics());
});

// ── List orders (supports ?userId= and ?sellerId= filters) ──
app.get("/orders", async (req, res) => {
  const userId = req.query.userId;
  const sellerId = req.query.sellerId;

  if (useDb && db) {
    try {
      let r;
      if (sellerId) {
        // Seller view: orders that contain at least one item from this seller
        const numericSellerId = String(sellerId).replace(/^u/, "");
        r = await db.query(
          `SELECT DISTINCT o.id, o.user_id as "userId", o.total, o.status, o.created_at as "createdAt"
           FROM orders o
           INNER JOIN order_items oi ON oi.order_id = o.id
           WHERE oi.seller_id = $1
           ORDER BY o.created_at DESC`,
          [numericSellerId]
        );
      } else if (userId) {
        r = await db.query(
          `SELECT o.id, o.user_id as "userId", o.total, o.status, o.created_at as "createdAt"
           FROM orders o WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
          [userId]
        );
      } else {
        r = await db.query(
          `SELECT o.id, o.user_id as "userId", o.total, o.status, o.created_at as "createdAt"
           FROM orders o ORDER BY o.created_at DESC`
        );
      }

      const list = await Promise.all(
        r.rows.map(async (row) => {
          const items = await db.query(
            `SELECT product_id as "productId", qty, price, seller_id as "sellerId" FROM order_items WHERE order_id = $1`,
            [row.id]
          );
          return {
            id: `o${row.id}`,
            userId: row.userId,
            items: items.rows.map((it) => ({
              ...it,
              sellerId: it.sellerId ? `u${it.sellerId}` : null,
            })),
            total: row.total,
            status: row.status,
            createdAt: row.createdAt,
          };
        })
      );
      return res.json(list);
    } catch (err) {
      console.error("orders list error:", err);
      const msg = process.env.NODE_ENV === "production" ? "failed to list orders" : err.message;
      return res.status(500).json({ error: msg });
    }
  }
  const filtered = userId ? orders.filter((o) => o.userId === userId) : orders;
  return res.json(filtered);
});

// ── Create order ──
app.post("/orders", async (req, res) => {
  const { userId, items } = req.body || {};
  if (!userId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "userId and items are required" });
  }
  const total = items.reduce((acc, item) => acc + Number(item.price) * Number(item.qty), 0);

  if (useDb && db) {
    try {
      // Look up seller_id for each product via Catalog service (respects service boundaries)
      const catalogUrl = process.env.CATALOG_URL || "http://localhost:4002";
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          let sellerId = null;
          try {
            const resp = await fetch(`${catalogUrl}/products/${item.productId}`);
            if (resp.ok) {
              const product = await resp.json();
              if (product.sellerId) {
                sellerId = String(product.sellerId).replace(/^u/, "");
              }
            }
          } catch { /* catalog unavailable, proceed without seller */ }
          return { ...item, sellerId };
        })
      );

      const r = await db.query(
        "INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3) RETURNING id",
        [userId, total, "CREATED"]
      );
      const orderId = r.rows[0].id;
      for (const item of enrichedItems) {
        await db.query(
          "INSERT INTO order_items (order_id, product_id, qty, price, seller_id) VALUES ($1, $2, $3, $4, $5)",
          [orderId, item.productId, item.qty || 1, item.price, item.sellerId]
        );
      }
      const order = {
        id: `o${orderId}`,
        userId,
        items: enrichedItems.map((it) => ({
          productId: it.productId,
          qty: it.qty,
          price: it.price,
          sellerId: it.sellerId ? `u${it.sellerId}` : null,
        })),
        total,
        status: "CREATED",
        createdAt: new Date().toISOString(),
      };
      await publish("order.created", order);
      return res.status(201).json(order);
    } catch (err) {
      console.error("order create error:", err);
      const msg = process.env.NODE_ENV === "production" ? "failed to create order" : err.message;
      return res.status(500).json({ error: msg });
    }
  }

  const order = {
    id: `o${orders.length + 1}`,
    userId,
    items,
    total,
    status: "CREATED",
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  await publish("order.created", order);
  return res.status(201).json(order);
});

// ── Update order status ──
app.patch("/orders/:id/status", async (req, res) => {
  const id = String(req.params.id || "").replace(/^o/, "");
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: "status required" });

  const validStatuses = ["CREATED", "PAID", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `invalid status. Must be one of: ${validStatuses.join(", ")}` });
  }

  if (useDb && db) {
    try {
      await db.query("UPDATE orders SET status = $1 WHERE id = $2", [status, id]);
      await publish("order.status_updated", { orderId: `o${id}`, status });
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  const o = orders.find((x) => x.id === `o${id}`);
  if (o) o.status = status;
  return res.json({ ok: true });
});

async function startPaymentListener() {
  try {
    await subscribe("payment.completed", async (payload) => {
      const orderId = String(payload.orderId || "").replace(/^o/, "");
      if (!orderId) return;
      if (useDb && db) {
        await db.query("UPDATE orders SET status = $1 WHERE id = $2", ["PAID", orderId]);
      } else {
        const o = orders.find((x) => x.id === `o${orderId}`);
        if (o) o.status = "PAID";
      }
    });
    console.log("order service: payment listener started");
  } catch (e) {
    console.log("order service: payment listener unavailable (no broker)");
  }
}

if (require.main === module) {
  app.listen(port, async () => {
    console.log(`order service listening on ${port} (db: ${useDb && db ? "yes" : "no"})`);
    await startPaymentListener();
  });
}

module.exports = { app, orders };
