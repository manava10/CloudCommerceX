const test = require("node:test");
const assert = require("node:assert/strict");

const { app: authApp } = require("../services/auth/src/index");
const { app: catalogApp } = require("../services/catalog/src/index");

function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

test("auth register/login and catalog listing works", async () => {
  const auth = await startServer(authApp);
  const catalog = await startServer(catalogApp);

  try {
    const registerResponse = await fetch(`${auth.baseUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@cloudcommercx.dev", password: "secret123" }),
    });
    assert.equal(registerResponse.status, 201);

    const loginResponse = await fetch(`${auth.baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@cloudcommercx.dev", password: "secret123" }),
    });
    assert.equal(loginResponse.status, 200);
    const loginData = await loginResponse.json();
    assert.ok(loginData.token);

    const productResponse = await fetch(`${catalog.baseUrl}/products`);
    assert.equal(productResponse.status, 200);
    const products = await productResponse.json();
    assert.ok(products.length > 0);
  } finally {
    auth.server.close();
    catalog.server.close();
  }
});
