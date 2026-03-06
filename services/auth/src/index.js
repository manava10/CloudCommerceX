require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const client = require("prom-client");

const app = express();
app.use(cors());
app.use(express.json());
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const port = process.env.PORT || 4001;
const jwtSecret = process.env.JWT_SECRET || "dev-secret";
const useDb = !!process.env.DATABASE_URL;

let db;
if (useDb) {
  try {
    db = require("../../common/db");
  } catch (e) {
    console.warn("DB module load failed, using in-memory:", e.message);
  }
}

const users = [];

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

app.get("/health", (_, res) => res.json({ ok: true, service: "auth" }));
app.get("/metrics", async (_, res) => {
  res.set("Content-Type", registry.contentType);
  res.send(await registry.metrics());
});

app.post("/register", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  if (useDb && db) {
    try {
      const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "user already exists" });
      }
      const hash = hashPassword(password);
      const r = await db.query(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
        [email, hash]
      );
      const id = `u${r.rows[0].id}`;
      return res.status(201).json({ id, email });
    } catch (err) {
      console.error("register db error:", err);
      const msg = process.env.NODE_ENV === "production" ? "registration failed" : err.message;
      return res.status(500).json({ error: msg });
    }
  }
  if (users.find((u) => u.email === email)) {
    return res.status(409).json({ error: "user already exists" });
  }
  const user = {
    id: `u${users.length + 1}`,
    email,
    passwordHash: hashPassword(password),
  };
  users.push(user);
  return res.status(201).json({ id: user.id, email: user.email });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (useDb && db) {
    try {
      const r = await db.query("SELECT id, email, password_hash FROM users WHERE email = $1", [
        email,
      ]);
      const row = r.rows[0];
      if (!row || row.password_hash !== hashPassword(password || "")) {
        return res.status(401).json({ error: "invalid credentials" });
      }
      const token = jwt.sign({ sub: `u${row.id}`, email: row.email }, jwtSecret, {
        expiresIn: "1h",
      });
      return res.json({ token, user: { id: `u${row.id}`, email: row.email } });
    } catch (err) {
      console.error("login db error:", err);
      const msg = process.env.NODE_ENV === "production" ? "login failed" : err.message;
      return res.status(500).json({ error: msg });
    }
  }
  const user = users.find((u) => u.email === email);
  if (!user || user.passwordHash !== hashPassword(password || "")) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const token = jwt.sign({ sub: user.id, email: user.email }, jwtSecret, {
    expiresIn: "1h",
  });
  return res.json({ token, user: { id: user.id, email: user.email } });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`auth service listening on ${port} (db: ${useDb && db ? "yes" : "no"})`);
  });
}

module.exports = { app, users };
