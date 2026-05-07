require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const express = require("express");
const cors = require("cors");
const { subscribe } = require("../../common/eventBus");
const client = require("prom-client");
const { sendOrderStatusEmail } = require("./email");

const app = express();
app.use(cors());
app.use(express.json());
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const port = process.env.PORT || 4006;
const useDb = !!process.env.DATABASE_URL;

let db;
if (useDb) {
  try {
    db = require("../../common/db");
  } catch (e) {
    console.warn("DB module load failed, using in-memory:", e.message);
  }
}

const fallbackNotifications = [];

async function addNotification(type, payload) {
  const userId = payload?.userId || null;
  const createdAt = new Date().toISOString();
  
  if (useDb && db) {
    try {
      if (userId) {
        await db.query(
          "INSERT INTO notifications (user_id, type, payload, created_at) VALUES ($1, $2, $3, $4)",
          [userId, type, JSON.stringify(payload), createdAt]
        );
      }
      
      // Also create a notification for each seller involved in the order
      if (type === "ORDER_CREATED" && payload?.items) {
        const sellerIds = [...new Set(payload.items.map((i) => i.sellerId).filter(Boolean))];
        for (const sellerId of sellerIds) {
          const sellerItems = payload.items.filter((i) => i.sellerId === sellerId);
          const sellerTotal = sellerItems.reduce((s, i) => s + i.price * i.qty, 0);
          
          await db.query(
            "INSERT INTO notifications (user_id, type, payload, created_at) VALUES ($1, $2, $3, $4)",
            [
              sellerId, 
              "SELLER_NEW_ORDER", 
              JSON.stringify({
                orderId: payload.id,
                buyerId: payload.userId,
                sellerId,
                items: sellerItems,
                total: sellerTotal,
              }), 
              createdAt
            ]
          );
        }
      }

      // Send email for order status updates
      if (type === "ORDER_STATUS_UPDATED" && payload?.orderId && payload?.status) {
        const numericOrderId = String(payload.orderId).replace(/^o/, "");
        try {
          const r = await db.query(
            "SELECT u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = $1",
            [numericOrderId]
          );
          if (r.rows.length > 0) {
            sendOrderStatusEmail(r.rows[0].email, payload.orderId, payload.status).catch(e => console.error("Email dispatch failed:", e));
          }
        } catch (err) {
          console.error("Failed to query user email for order status update:", err);
        }
      }

      // Send email for order creation
      if (type === "ORDER_CREATED" && payload?.id && payload?.userId) {
        try {
          const r = await db.query("SELECT email FROM users WHERE id = $1", [payload.userId.replace(/^u/, "")]);
          if (r.rows.length > 0) {
            sendOrderStatusEmail(r.rows[0].email, payload.id, "CREATED").catch(e => console.error("Email dispatch failed:", e));
          }
        } catch (err) {
          console.error("Failed to query user email for order creation:", err);
        }
      }
    } catch (err) {
      console.error("Failed to save notification to DB:", err);
    }
  } else {
    // In-memory fallback
    fallbackNotifications.push({
      id: `n${fallbackNotifications.length + 1}`,
      type,
      payload,
      userId,
      createdAt,
    });

    if (type === "ORDER_CREATED" && payload?.items) {
      const sellerIds = [...new Set(payload.items.map((i) => i.sellerId).filter(Boolean))];
      for (const sellerId of sellerIds) {
        const sellerItems = payload.items.filter((i) => i.sellerId === sellerId);
        const sellerTotal = sellerItems.reduce((s, i) => s + i.price * i.qty, 0);
        fallbackNotifications.push({
          id: `n${fallbackNotifications.length + 1}`,
          type: "SELLER_NEW_ORDER",
          payload: {
            orderId: payload.id,
            buyerId: payload.userId,
            sellerId,
            items: sellerItems,
            total: sellerTotal,
          },
          userId: sellerId,
          createdAt,
        });
      }
    }
  }
}

app.get("/health", (_, res) => res.json({ ok: true, service: "notification" }));
app.get("/metrics", async (_, res) => {
  res.set("Content-Type", registry.contentType);
  res.send(await registry.metrics());
});

app.get("/notifications", async (req, res) => {
  const userId = req.query.userId;
  
  if (useDb && db) {
    try {
      let r;
      if (userId) {
        r = await db.query(
          "SELECT id, user_id as \"userId\", type, payload, is_read as \"isRead\", created_at as \"createdAt\" FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
          [userId]
        );
      } else {
        r = await db.query(
          "SELECT id, user_id as \"userId\", type, payload, is_read as \"isRead\", created_at as \"createdAt\" FROM notifications ORDER BY created_at DESC"
        );
      }
      return res.json(r.rows);
    } catch (err) {
      console.error("Failed to fetch notifications from DB:", err);
      return res.status(500).json({ error: "Failed to fetch notifications" });
    }
  }
  
  const list = userId
    ? fallbackNotifications.filter((n) => n.userId === userId)
    : fallbackNotifications;
  // Sort descending by date to match DB behavior
  res.json(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

async function startConsumers() {
  const ok1 = await subscribe("order.created", (payload) =>
    addNotification("ORDER_CREATED", payload)
  );
  const ok2 = await subscribe("payment.completed", (payload) =>
    addNotification("PAYMENT_COMPLETED", payload)
  );
  const ok3 = await subscribe("order.status_updated", (payload) =>
    addNotification("ORDER_STATUS_UPDATED", payload)
  );
  if (!ok1 || !ok2) {
    throw new Error("RabbitMQ not available (RABBITMQ_URL not set or connection failed)");
  }
}

if (require.main === module) {
  app.listen(port, async () => {
    console.log(`notification service listening on ${port} (db: ${useDb && db ? "yes" : "no"})`);
    try {
      await startConsumers();
      console.log("notification consumers started");
    } catch (err) {
      console.log("notification consumers unavailable, running without broker:", err.message);
    }
  });
}

module.exports = { app, addNotification };
