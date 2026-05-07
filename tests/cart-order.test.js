const test = require("node:test");
const assert = require("node:assert/strict");

const { app: cartApp } = require("../services/cart/src/index");
const { app: orderApp } = require("../services/order/src/index");
const { app: catalogApp, products: catalogProducts } = require("../services/catalog/src/index");

function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

test("cart and order flow works", async () => {
  const catalog = await startServer(catalogApp);
  process.env.CATALOG_URL = catalog.baseUrl; // Inject dynamically so the cart service can find it for stock validation

  const isDb = !!process.env.DATABASE_URL;
  let testProductId = "p1";

  if (isDb) {
    const db = require("../services/common/db");
    const r = await db.query(
      "INSERT INTO products (name, price, stock, status) VALUES ($1, $2, $3, 'active') RETURNING id",
      ["Test Product", 6999, 10]
    );
    testProductId = `p${r.rows[0].id}`;
  } else {
    // Inject a mock product so stock validation passes
    catalogProducts.length = 0; // Clear any existing
    catalogProducts.push({
      id: "p1",
      sellerId: "u2",
      name: "Test Product",
      price: 6999,
      stock: 10,
      status: "active"
    });
  }

  const cart = await startServer(cartApp);
  const order = await startServer(orderApp);

  try {
    // Clear cart first to prevent state leakage between test runs
    await fetch(`${cart.baseUrl}/cart/u1`, { method: "DELETE" });

    const addItemResponse = await fetch(`${cart.baseUrl}/cart/u1/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: testProductId, qty: 2, price: 6999 }),
    });
    assert.equal(addItemResponse.status, 201);
    const cartData = await addItemResponse.json();
    assert.equal(cartData.items.length, 1);
    assert.equal(cartData.items[0].qty, 2);

    const orderResponse = await fetch(`${order.baseUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", items: cartData.items }),
    });
    assert.equal(orderResponse.status, 201);
    const orderData = await orderResponse.json();
    assert.equal(orderData.status, "CREATED");
    assert.equal(orderData.total, 13998);
  } finally {
    cart.server.close();
    order.server.close();
    catalog.server.close();
    if (!!process.env.DATABASE_URL) {
      try { await require("../services/common/db").end(); } catch (e) {}
    }
    setTimeout(() => process.exit(0), 50); // Force exit hanging AMQP connections
  }
});
