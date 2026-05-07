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
const fulfillmentStatuses = new Set([
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);

function itemTrackingFields(item = {}) {
  return {
    fulfillmentStatus: item.fulfillmentStatus || "PROCESSING",
    courier: item.courier || "",
    trackingId: item.trackingId || "",
    estimatedDeliveryDate: item.estimatedDeliveryDate || null,
  };
}

function canCancelOrderItems(items = []) {
  return items.every((item) => {
    const status = item.fulfillmentStatus || item.fulfillment_status || "PROCESSING";
    return status !== "DELIVERED" && status !== "CANCELLED";
  });
}

async function getSellerIdForProduct(productId) {
  const catalogUrl = process.env.CATALOG_URL || "http://localhost:4002";
  const response = await fetch(`${catalogUrl}/products/${productId}`);
  if (!response.ok) {
    return null;
  }
  const product = await response.json();
  return product.sellerId || null;
}

async function normalizeOrderItems(items) {
  const normalized = [];
  for (const item of items) {
    let sellerId = item.sellerId || null;
    if (!sellerId) {
      sellerId = await getSellerIdForProduct(item.productId);
    }
    if (!sellerId) {
      throw new Error(`product ${item.productId} is not linked to a seller`);
    }
    normalized.push({ ...item, sellerId });
  }
  return normalized;
}

app.get("/health", (_, res) => res.json({ ok: true, service: "order" }));
app.get("/metrics", async (_, res) => {
  res.set("Content-Type", registry.contentType);
  res.send(await registry.metrics());
});

app.get("/orders", async (req, res) => {
  const userId = req.query.userId;
  if (useDb && db) {
    try {
      const r = userId
        ? await db.query(
            "SELECT o.id, o.user_id as \"userId\", o.total, o.status, o.created_at as \"createdAt\" FROM orders o WHERE o.user_id = $1 ORDER BY o.created_at DESC",
            [userId]
          )
        : await db.query(
            "SELECT o.id, o.user_id as \"userId\", o.total, o.status, o.created_at as \"createdAt\" FROM orders o ORDER BY o.created_at DESC"
          );
      const list = await Promise.all(
        r.rows.map(async (row) => {
          const items = await db.query(
            `SELECT
              product_id as "productId",
              seller_id as "sellerId",
              qty,
              price,
              fulfillment_status as "fulfillmentStatus",
              courier,
              tracking_id as "trackingId",
              estimated_delivery_date as "estimatedDeliveryDate"
             FROM order_items
             WHERE order_id = $1`,
            [row.id]
          );
          return {
            id: `o${row.id}`,
            userId: row.userId,
            items: items.rows,
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

app.get("/sellers/:sellerId/orders", async (req, res) => {
  const sellerId = req.params.sellerId;
  const authenticatedSellerId = req.headers["x-seller-id"];
  if (authenticatedSellerId && authenticatedSellerId !== sellerId) {
    return res.status(403).json({ error: "seller cannot access another seller's orders" });
  }
  if (useDb && db) {
    try {
      const r = await db.query(
        `SELECT
          o.id,
          o.user_id as "userId",
          o.total,
          o.status as "paymentStatus",
          o.created_at as "createdAt",
          oi.product_id as "productId",
          oi.seller_id as "sellerId",
          oi.qty,
          oi.price,
          oi.fulfillment_status as "fulfillmentStatus",
          oi.courier,
          oi.tracking_id as "trackingId",
          oi.estimated_delivery_date as "estimatedDeliveryDate"
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE oi.seller_id = $1
         ORDER BY o.created_at DESC`,
        [sellerId]
      );
      const grouped = new Map();
      for (const row of r.rows) {
        const id = `o${row.id}`;
        if (!grouped.has(id)) {
          grouped.set(id, {
            id,
            userId: row.userId,
            total: Number(row.total),
            paymentStatus: row.paymentStatus,
            createdAt: row.createdAt,
            items: [],
          });
        }
        grouped.get(id).items.push({
          productId: row.productId,
          sellerId: row.sellerId,
          qty: row.qty,
          price: row.price,
          fulfillmentStatus: row.fulfillmentStatus,
          courier: row.courier || "",
          trackingId: row.trackingId || "",
          estimatedDeliveryDate: row.estimatedDeliveryDate,
        });
      }
      return res.json([...grouped.values()]);
    } catch (err) {
      console.error("seller orders list error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
  const sellerOrders = orders
    .map((order) => ({
      ...order,
      paymentStatus: order.status,
      items: order.items.filter((item) => item.sellerId === sellerId),
    }))
    .filter((order) => order.items.length > 0);
  return res.json(sellerOrders);
});

app.post("/orders", async (req, res) => {
  const { userId, items } = req.body || {};
  if (!userId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "userId and items are required" });
  }
  let orderItems;
  try {
    orderItems = await normalizeOrderItems(items);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  const total = orderItems.reduce((acc, item) => acc + Number(item.price) * Number(item.qty), 0);

  if (useDb && db) {
    try {
      const r = await db.query(
        "INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3) RETURNING id",
        [userId, total, "CREATED"]
      );
      const orderId = r.rows[0].id;
      for (const item of orderItems) {
        await db.query(
          `INSERT INTO order_items (order_id, product_id, seller_id, qty, price, fulfillment_status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, item.productId, item.sellerId, item.qty || 1, item.price, "PROCESSING"]
        );
      }
      const order = {
        id: `o${orderId}`,
        userId,
        items: orderItems.map((item) => ({ ...item, ...itemTrackingFields(item) })),
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
    items: orderItems.map((item) => ({ ...item, ...itemTrackingFields(item) })),
    total,
    status: "CREATED",
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  await publish("order.created", order);
  return res.status(201).json(order);
});

app.patch("/sellers/:sellerId/orders/:orderId/items/:productId/tracking", async (req, res) => {
  const sellerId = req.params.sellerId;
  const authenticatedSellerId = req.headers["x-seller-id"];
  if (authenticatedSellerId && authenticatedSellerId !== sellerId) {
    return res.status(403).json({ error: "seller cannot update another seller's order" });
  }

  const orderId = String(req.params.orderId || "").replace(/^o/, "");
  const productId = req.params.productId;
  const {
    fulfillmentStatus = "PROCESSING",
    courier = "",
    trackingId = "",
    estimatedDeliveryDate = null,
  } = req.body || {};

  if (!fulfillmentStatuses.has(fulfillmentStatus)) {
    return res.status(400).json({ error: "invalid fulfillmentStatus" });
  }

  if (useDb && db) {
    try {
      const r = await db.query(
        `UPDATE order_items
         SET fulfillment_status = $1,
             courier = $2,
             tracking_id = $3,
             estimated_delivery_date = $4
         WHERE order_id = $5
           AND product_id = $6
           AND seller_id = $7
         RETURNING
           product_id as "productId",
           seller_id as "sellerId",
           qty,
           price,
           fulfillment_status as "fulfillmentStatus",
           courier,
           tracking_id as "trackingId",
           estimated_delivery_date as "estimatedDeliveryDate"`,
        [
          fulfillmentStatus,
          courier || null,
          trackingId || null,
          estimatedDeliveryDate || null,
          orderId,
          productId,
          sellerId,
        ]
      );
      if (r.rows.length === 0) {
        return res.status(404).json({ error: "seller order item not found" });
      }
      return res.json(r.rows[0]);
    } catch (err) {
      console.error("seller tracking update error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  const order = orders.find((x) => x.id === `o${orderId}`);
  const item = order?.items.find((x) => x.productId === productId && x.sellerId === sellerId);
  if (!item) {
    return res.status(404).json({ error: "seller order item not found" });
  }
  item.fulfillmentStatus = fulfillmentStatus;
  item.courier = courier;
  item.trackingId = trackingId;
  item.estimatedDeliveryDate = estimatedDeliveryDate;
  return res.json(item);
});

app.patch("/orders/:id/cancel", async (req, res) => {
  const id = String(req.params.id || "").replace(/^o/, "");
  const userId = req.headers["x-user-id"] || req.body?.userId;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  if (useDb && db) {
    try {
      const orderResult = await db.query(
        `SELECT id, user_id as "userId", total, status, created_at as "createdAt"
         FROM orders
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      const order = orderResult.rows[0];
      if (!order) {
        return res.status(404).json({ error: "order not found" });
      }
      if (order.status === "CANCELLED") {
        return res.status(400).json({ error: "order is already cancelled" });
      }

      const itemsResult = await db.query(
        `SELECT
          product_id as "productId",
          seller_id as "sellerId",
          qty,
          price,
          fulfillment_status as "fulfillmentStatus",
          courier,
          tracking_id as "trackingId",
          estimated_delivery_date as "estimatedDeliveryDate"
         FROM order_items
         WHERE order_id = $1`,
        [id]
      );

      if (!canCancelOrderItems(itemsResult.rows)) {
        return res.status(409).json({ error: "delivered or already cancelled items cannot be cancelled" });
      }

      await db.query("UPDATE orders SET status = $1 WHERE id = $2", ["CANCELLED", id]);
      await db.query(
        `UPDATE order_items
         SET fulfillment_status = $1,
             courier = NULL,
             tracking_id = NULL,
             estimated_delivery_date = NULL
         WHERE order_id = $2`,
        ["CANCELLED", id]
      );

      const updatedItems = itemsResult.rows.map((item) => ({
        ...item,
        fulfillmentStatus: "CANCELLED",
        courier: "",
        trackingId: "",
        estimatedDeliveryDate: null,
      }));
      return res.json({
        id: `o${order.id}`,
        userId: order.userId,
        total: order.total,
        status: "CANCELLED",
        createdAt: order.createdAt,
        items: updatedItems,
      });
    } catch (err) {
      console.error("order cancel error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  const order = orders.find((x) => x.id === `o${id}` && x.userId === userId);
  if (!order) {
    return res.status(404).json({ error: "order not found" });
  }
  if (order.status === "CANCELLED") {
    return res.status(400).json({ error: "order is already cancelled" });
  }
  if (!canCancelOrderItems(order.items)) {
    return res.status(409).json({ error: "delivered or already cancelled items cannot be cancelled" });
  }
  order.status = "CANCELLED";
  order.items = order.items.map((item) => ({
    ...item,
    fulfillmentStatus: "CANCELLED",
    courier: "",
    trackingId: "",
    estimatedDeliveryDate: null,
  }));
  return res.json(order);
});

app.patch("/orders/:id/status", async (req, res) => {
  const id = String(req.params.id || "").replace(/^o/, "");
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: "status required" });
  if (useDb && db) {
    try {
      await db.query("UPDATE orders SET status = $1 WHERE id = $2", [status, id]);
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
