require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const express = require("express");
const cors = require("cors");
const { subscribe } = require("../../common/eventBus");
const client = require("prom-client");

const app = express();
app.use(cors());
app.use(express.json());
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const port = process.env.PORT || 4006;
const notifications = [];

function addNotification(type, payload) {
  const userId = payload?.userId || null;
  notifications.push({
    id: `n${notifications.length + 1}`,
    type,
    payload,
    userId,
    createdAt: new Date().toISOString(),
  });

  // Also create a notification for each seller involved in the order
  if (type === "ORDER_CREATED" && payload?.items) {
    const sellerIds = [...new Set(payload.items.map((i) => i.sellerId).filter(Boolean))];
    for (const sellerId of sellerIds) {
      const sellerItems = payload.items.filter((i) => i.sellerId === sellerId);
      const sellerTotal = sellerItems.reduce((s, i) => s + i.price * i.qty, 0);
      notifications.push({
        id: `n${notifications.length + 1}`,
        type: "SELLER_NEW_ORDER",
        payload: {
          orderId: payload.id,
          buyerId: payload.userId,
          sellerId,
          items: sellerItems,
          total: sellerTotal,
        },
        userId: sellerId,
        createdAt: new Date().toISOString(),
      });
    }
  }
}

app.get("/health", (_, res) => res.json({ ok: true, service: "notification" }));
app.get("/metrics", async (_, res) => {
  res.set("Content-Type", registry.contentType);
  res.send(await registry.metrics());
});
app.get("/notifications", (req, res) => {
  const userId = req.query.userId;
  const list = userId
    ? notifications.filter((n) => n.userId === userId)
    : notifications;
  res.json(list);
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
    console.log(`notification service listening on ${port}`);
    try {
      await startConsumers();
      console.log("notification consumers started");
    } catch (err) {
      console.log("notification consumers unavailable, running without broker:", err.message);
    }
  });
}

module.exports = { app, notifications, addNotification };
