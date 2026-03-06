require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const express = require("express");
const cors = require("cors");
const { publish } = require("../../common/eventBus");
const client = require("prom-client");

const app = express();
app.use(cors());
app.use(express.json());
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const port = process.env.PORT || 4005;
const payments = [];

app.get("/health", (_, res) => res.json({ ok: true, service: "payment" }));
app.get("/metrics", async (_, res) => {
  res.set("Content-Type", registry.contentType);
  res.send(await registry.metrics());
});
app.get("/payments", (_, res) => res.json(payments));

app.post("/payments", async (req, res) => {
  const { orderId, amount, userId } = req.body || {};
  if (!orderId || !amount) {
    return res.status(400).json({ error: "orderId and amount are required" });
  }
  const payment = {
    id: `pay${payments.length + 1}`,
    orderId,
    amount: Number(amount),
    userId: userId || null,
    status: "SUCCESS",
    processedAt: new Date().toISOString(),
  };
  payments.push(payment);
  await publish("payment.completed", payment);
  return res.status(201).json(payment);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`payment service listening on ${port}`);
  });
}

module.exports = { app, payments };
