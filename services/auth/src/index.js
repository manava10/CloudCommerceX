require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const client = require("prom-client");
const { sendOTPEmail } = require("./email");

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

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.get("/health", (_, res) => res.json({ ok: true, service: "auth" }));
app.get("/metrics", async (_, res) => {
  res.set("Content-Type", registry.contentType);
  res.send(await registry.metrics());
});

// ── Register ──
app.post("/register", async (req, res) => {
  const { email, password, role, storeName, storeDescription } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  const userRole = role === "seller" ? "seller" : "buyer";

  if (userRole === "seller" && !storeName) {
    return res.status(400).json({ error: "storeName is required for seller registration" });
  }

  if (useDb && db) {
    try {
      const existing = await db.query("SELECT id, is_verified FROM users WHERE email = $1", [email]);
      if (existing.rows.length > 0) {
        if (existing.rows[0].is_verified) {
          return res.status(409).json({ error: "user already exists" });
        } else {
          // Resend OTP for unverified users
          const otp = generateOTP();
          await db.query("UPDATE users SET otp = $1, otp_expires_at = NOW() + INTERVAL '15 minutes' WHERE email = $2", [otp, email]);
          sendOTPEmail(email, otp).catch(e => console.error("Failed to send OTP email:", e));
          return res.status(201).json({ id: `u${existing.rows[0].id}`, email, role: userRole, storeName: storeName || null, requireVerification: true });
        }
      }
      const hash = hashPassword(password);
      const otp = generateOTP();
      const r = await db.query(
        "INSERT INTO users (email, password_hash, role, store_name, store_description, otp, otp_expires_at, is_verified) VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '15 minutes', false) RETURNING id",
        [email, hash, userRole, storeName || null, storeDescription || null, otp]
      );
      const id = `u${r.rows[0].id}`;
      
      // Send the OTP asynchronously
      sendOTPEmail(email, otp).catch(e => console.error("Failed to send OTP email:", e));
      
      return res.status(201).json({ id, email, role: userRole, storeName: storeName || null, requireVerification: true });
    } catch (err) {
      console.error("register db error:", err);
      const msg = process.env.NODE_ENV === "production" ? "registration failed" : err.message;
      return res.status(500).json({ error: msg });
    }
  }

  // In-memory fallback
  if (users.find((u) => u.email === email)) {
    return res.status(409).json({ error: "user already exists" });
  }
  const otp = generateOTP();
  const user = {
    id: `u${users.length + 1}`,
    email,
    passwordHash: hashPassword(password),
    role: userRole,
    storeName: storeName || null,
    storeDescription: storeDescription || null,
    isVerified: false,
    otp,
    otpExpiresAt: Date.now() + 15 * 60 * 1000
  };
  users.push(user);
  sendOTPEmail(email, otp).catch(e => console.error("Failed to send OTP email:", e));
  return res.status(201).json({ id: user.id, email: user.email, role: user.role, storeName: user.storeName, requireVerification: true });
});

// ── Verify OTP ──
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) return res.status(400).json({ error: "email and otp are required" });

  if (useDb && db) {
    try {
      const r = await db.query(
        "SELECT id, role, store_name, is_verified FROM users WHERE email = $1 AND otp = $2 AND otp_expires_at > NOW()",
        [email, otp]
      );
      if (r.rows.length === 0) {
        return res.status(400).json({ error: "invalid or expired OTP" });
      }
      const row = r.rows[0];
      if (row.is_verified) {
        return res.status(400).json({ error: "user already verified" });
      }

      await db.query("UPDATE users SET is_verified = true, otp = null, otp_expires_at = null WHERE id = $1", [row.id]);
      
      const token = jwt.sign(
        { sub: `u${row.id}`, email, role: row.role || "buyer" },
        jwtSecret,
        { expiresIn: "1h" }
      );
      return res.json({
        token,
        user: { id: `u${row.id}`, email, role: row.role || "buyer", storeName: row.store_name || null },
      });
    } catch (err) {
      console.error("verify db error:", err);
      return res.status(500).json({ error: "verification failed" });
    }
  }

  // In-memory fallback
  const user = users.find((u) => u.email === email && u.otp === otp && u.otpExpiresAt > Date.now());
  if (!user) return res.status(400).json({ error: "invalid or expired OTP" });
  if (user.isVerified) return res.status(400).json({ error: "user already verified" });
  
  user.isVerified = true;
  user.otp = null;
  user.otpExpiresAt = null;

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role || "buyer" },
    jwtSecret,
    { expiresIn: "1h" }
  );
  return res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role || "buyer", storeName: user.storeName || null },
  });
});

// ── Login ──
app.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (useDb && db) {
    try {
      const r = await db.query(
        "SELECT id, email, password_hash, role, store_name, is_verified FROM users WHERE email = $1",
        [email]
      );
      const row = r.rows[0];
      if (!row || row.password_hash !== hashPassword(password || "")) {
        return res.status(401).json({ error: "invalid credentials" });
      }
      if (!row.is_verified) {
        return res.status(403).json({ error: "account not verified", requireVerification: true });
      }
      const token = jwt.sign(
        { sub: `u${row.id}`, email: row.email, role: row.role || "buyer" },
        jwtSecret,
        { expiresIn: "1h" }
      );
      return res.json({
        token,
        user: {
          id: `u${row.id}`,
          email: row.email,
          role: row.role || "buyer",
          storeName: row.store_name || null,
        },
      });
    } catch (err) {
      console.error("login db error:", err);
      const msg = process.env.NODE_ENV === "production" ? "login failed" : err.message;
      return res.status(500).json({ error: msg });
    }
  }

  // In-memory fallback
  const user = users.find((u) => u.email === email);
  if (!user || user.passwordHash !== hashPassword(password || "")) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  if (!user.isVerified) {
    return res.status(403).json({ error: "account not verified", requireVerification: true });
  }
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role || "buyer" },
    jwtSecret,
    { expiresIn: "1h" }
  );
  return res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role || "buyer", storeName: user.storeName || null },
  });
});

// ── Get current user profile ──
app.get("/me", (req, res) => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "unauthorized" });
  try {
    const decoded = jwt.verify(token, jwtSecret);
    return res.json({
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role || "buyer",
    });
  } catch {
    return res.status(401).json({ error: "invalid or expired token" });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`auth service listening on ${port} (db: ${useDb && db ? "yes" : "no"})`);
  });
}

module.exports = { app, users };
