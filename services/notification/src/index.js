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
  notifications.push({
    id: `n${notifications.length + 1}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
  });
}

app.get("/health", (_, res) => res.json({ ok: true, service: "notification" }));
app.get("/metrics", async (_, res) => {
  res.set("Content-Type", registry.contentType);
  res.send(await registry.metrics());
});
app.get("/notifications", (_, res) => res.json(notifications));

async function startConsumers() {
  await subscribe("order.created", (payload) => addNotification("ORDER_CREATED", payload));
  await subscribe("payment.completed", (payload) => addNotification("PAYMENT_COMPLETED", payload));
}

if (require.main === module) {
  app.listen(port, async () => {
    console.log(`notification service listening on ${port}`);
    try {
      await startConsumers();
      console.log("notification consumers started");
    } catch (err) {
      console.log("notification consumers unavailable, running without broker");
    }
  });
}

module.exports = { app, notifications, addNotification };
