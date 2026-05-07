#!/usr/bin/env node
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { query } = require("../services/common/db");

async function migrate() {
  // ── Users table ──
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'buyer',
      store_name VARCHAR(255),
      store_description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add role / store columns if they don't exist (safe for existing DBs)
  await query(`
    DO $$ BEGIN
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'buyer';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS store_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS store_description TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp VARCHAR(10);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;
    END $$;
  `);

  // ── Products table ──
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      category VARCHAR(100),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ── Orders table ──
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      total INTEGER NOT NULL,
      status VARCHAR(50) DEFAULT 'CREATED',
      shipping_address JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add shipping_address to orders if missing
  await query(`
    DO $$ BEGIN
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;
    END $$;
  `);

  // ── Order items table ──
  await query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id VARCHAR(50) NOT NULL,
      qty INTEGER NOT NULL,
      price INTEGER NOT NULL,
      seller_id INTEGER
    )
  `);

  // Add seller_id to order_items if missing
  await query(`
    DO $$ BEGIN
      ALTER TABLE order_items ADD COLUMN IF NOT EXISTS seller_id INTEGER;
    END $$;
  `);

  // ── Cart items table ──
  await query(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      product_id VARCHAR(50) NOT NULL,
      qty INTEGER NOT NULL,
      price INTEGER NOT NULL,
      UNIQUE(user_id, product_id)
    )
  `);

  // ── Notifications table ──
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      type VARCHAR(50) NOT NULL,
      payload JSONB,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log("Migration complete. Products must be created by registered sellers.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
