const test = require("node:test");
const assert = require("node:assert/strict");

const { app: authApp, users: memoryUsers } = require("../services/auth/src/index");
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

  const testEmail = `demo-${Date.now()}@cloudcommercx.dev`;

  try {
    const registerResponse = await fetch(`${auth.baseUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "secret123" }),
    });
    assert.equal(registerResponse.status, 201);
    
    const db = require("../services/common/db");
    const r = await db.query("SELECT otp FROM users WHERE email = $1", [testEmail]);
    const otp = r.rows[0].otp;

    const verifyResponse = await fetch(`${auth.baseUrl}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, otp }),
    });
    assert.equal(verifyResponse.status, 200);
    const verifyData = await verifyResponse.json();
    assert.ok(verifyData.token);

    const loginResponse = await fetch(`${auth.baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "secret123" }),
    });
    assert.equal(loginResponse.status, 200);
    const loginData = await loginResponse.json();
    assert.ok(loginData.token);

    const productResponse = await fetch(`${catalog.baseUrl}/products`);
    assert.equal(productResponse.status, 200);
    const products = await productResponse.json();
    assert.ok(Array.isArray(products));
  } finally {
    auth.server.close();
    catalog.server.close();
    if (!!process.env.DATABASE_URL) {
      try { await require("../services/common/db").end(); } catch (e) {}
    }
    setTimeout(() => process.exit(0), 50); // Force exit hanging AMQP connections
  }
});
