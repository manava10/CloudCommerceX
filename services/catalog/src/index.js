const express = require("express");
const cors = require("cors");
const client = require("prom-client");

const app = express();
app.use(cors());
app.use(express.json());
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const port = process.env.PORT || 4002;

const products = [
  { id: "p1", name: "Mechanical Keyboard", price: 3499, stock: 30, image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=300&fit=crop" },
  { id: "p2", name: "Wireless Mouse", price: 1799, stock: 50, image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=300&fit=crop" },
  { id: "p3", name: "USB-C Hub", price: 2299, stock: 20, image: "https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400&h=300&fit=crop" },
  { id: "p4", name: "Monitor Stand", price: 2499, stock: 25, image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop" },
  { id: "p5", name: "Webcam HD", price: 4299, stock: 15, image: "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400&h=300&fit=crop" },
  { id: "p6", name: "Desk Lamp", price: 1299, stock: 40, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop" },
];

app.get("/health", (_, res) => res.json({ ok: true, service: "catalog" }));
app.get("/metrics", async (_, res) => {
  res.set("Content-Type", registry.contentType);
  res.send(await registry.metrics());
});
app.get("/products", (_, res) => res.json(products));
app.get("/products/:id", (req, res) => {
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
