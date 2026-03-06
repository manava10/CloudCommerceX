require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const client = require("prom-client");

const app = express();
const jwtSecret = process.env.JWT_SECRET || "dev-secret";
app.use(cors());
app.use(express.json());
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const port = process.env.PORT || 3000;

const serviceUrls = {
  auth: process.env.AUTH_URL || "http://localhost:4001",
  catalog: process.env.CATALOG_URL || "http://localhost:4002",
  cart: process.env.CART_URL || "http://localhost:4003",
  order: process.env.ORDER_URL || "http://localhost:4004",
  payment: process.env.PAYMENT_URL || "http://localhost:4005",
  notification: process.env.NOTIFICATION_URL || "http://localhost:4006",
};

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "unauthorized" });
  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = { id: decoded.sub };
    next();
  } catch {
    return res.status(401).json({ error: "invalid or expired token" });
  }
}

async function forward(req, res, targetBase, stripPrefix) {
  const suffix = req.originalUrl.replace(stripPrefix, "");
  const url = `${targetBase}${suffix}`;
  const headers = { "Content-Type": "application/json" };
  if (req.headers.authorization) headers["Authorization"] = req.headers.authorization;
  const body =
    req.method === "GET" || req.method === "DELETE" ? undefined : JSON.stringify(req.body || {});

  try {
    const response = await fetch(url, {
      method: req.method,
      headers,
      body,
    });

    const text = await response.text();
    res.status(response.status);
    try {
      return res.json(text ? JSON.parse(text) : {});
    } catch {
      return res.send(text);
    }
  } catch (err) {
    return res.status(502).json({ error: "downstream service unavailable" });
  }
}

app.get("/health", (_, res) => {
  res.json({ ok: true, service: "gateway" });
});
app.get("/metrics", async (_, res) => {
  res.set("Content-Type", registry.contentType);
  res.send(await registry.metrics());
});

app.use("/api/auth", (req, res) => forward(req, res, serviceUrls.auth, "/api/auth"));
app.use("/api/catalog", (req, res) => forward(req, res, serviceUrls.catalog, "/api/catalog"));
app.use("/api/cart", requireAuth, (req, res) => forward(req, res, serviceUrls.cart, "/api/cart"));
app.use("/api/order", requireAuth, (req, res) => forward(req, res, serviceUrls.order, "/api/order"));
app.use("/api/payment", requireAuth, (req, res) => forward(req, res, serviceUrls.payment, "/api/payment"));
app.use("/api/notification", requireAuth, (req, res) =>
  forward(req, res, serviceUrls.notification, "/api/notification")
);

const frontendPath = path.resolve(__dirname, "../../../frontend-react/dist");
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
}
app.use((_, res) => {
  const indexPath = path.join(frontendPath, "index.html");
  if (fs.existsSync(indexPath)) {
    return res.type("html").send(fs.readFileSync(indexPath, "utf8"));
  }
  res.type("html").send(
    "<h1>CloudCommercX</h1><p>Run <code>npm run build:frontend</code> then restart.</p>"
  );
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`gateway service listening on ${port}`);
  });
}

module.exports = { app };
