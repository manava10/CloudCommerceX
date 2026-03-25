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
  { id: "p1", name: "Keychron K2 Mechanical Keyboard", price: 6999, stock: 30, image: "https://images.unsplash.com/photo-1595225476474-87563907a212?w=600&h=400&fit=crop" },
  { id: "p2", name: "Logitech MX Master 3S", price: 8999, stock: 50, image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&h=400&fit=crop" },
  { id: "p3", name: "Anker USB-C Thunderbolt Hub", price: 4499, stock: 20, image: "https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=600&h=400&fit=crop" },
  { id: "p4", name: "Ergonomic Monitor Desk Stand", price: 2999, stock: 25, image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&h=400&fit=crop" },
  { id: "p5", name: "Sony INZONE H9 Headset", price: 22990, stock: 15, image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&h=400&fit=crop" },
  { id: "p6", name: "Minimalist LED Desk Lamp", price: 1999, stock: 40, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&h=400&fit=crop" },
  { id: "p7", name: "Apple iPad Pro 12.9", price: 99900, stock: 10, image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&h=400&fit=crop" },
  { id: "p8", name: "Noise Cancelling Earbuds", price: 14999, stock: 65, image: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&h=400&fit=crop" },
  { id: "p9", name: "Ultra-Wide Curve Monitor", price: 45000, stock: 12, image: "https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=600&h=400&fit=crop" },
  { id: "p10", name: "Smart RGB Hexagon Panels", price: 8599, stock: 80, image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&h=400&fit=crop" },
  { id: "p11", name: "Standing Desk Converter", price: 12500, stock: 22, image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600&h=400&fit=crop" },
  { id: "p12", name: "High-Speed SSD 1TB", price: 7999, stock: 100, image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=400&fit=crop" },
  { id: "p13", name: "Stream Deck MK.2", price: 14999, stock: 45, image: "https://images.unsplash.com/photo-1626218174358-7769486c4b79?w=600&h=400&fit=crop" },
  { id: "p14", name: "HD Desktop Microphone", price: 9500, stock: 35, image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&h=400&fit=crop" },
  { id: "p15", name: "Acoustic Wall Panels (Pack of 12)", price: 3500, stock: 120, image: "https://images.unsplash.com/photo-1582806202450-482d8c39acfd?w=600&h=400&fit=crop" },
  { id: "p16", name: "Wireless Charging Mouse Pad", price: 4999, stock: 60, image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&h=400&fit=crop" },
  { id: "p17", name: "Pro Web Camera 4K", price: 18999, stock: 18, image: "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=600&h=400&fit=crop" },
  { id: "p18", name: "Dual Monitor Arm", price: 6500, stock: 55, image: "https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=600&h=400&fit=crop" },
  { id: "p19", name: "Mechanical Numpad", price: 3499, stock: 40, image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&h=400&fit=crop" },
  { id: "p20", name: "Cable Management Kit", price: 1200, stock: 200, image: "https://images.unsplash.com/photo-1600320668875-c990def280ed?w=600&h=400&fit=crop" }
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
