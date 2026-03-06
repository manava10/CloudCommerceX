const test = require("node:test");
const assert = require("node:assert/strict");

const { app: cartApp } = require("../services/cart/src/index");
const { app: orderApp } = require("../services/order/src/index");

function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

test("cart and order flow works", async () => {
  const cart = await startServer(cartApp);
  const order = await startServer(orderApp);

  try {
    const addItemResponse = await fetch(`${cart.baseUrl}/cart/u1/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: "p1", qty: 2, price: 3499 }),
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
    assert.equal(orderData.total, 6998);
  } finally {
    cart.server.close();
    order.server.close();
  }
});
