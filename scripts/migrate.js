#!/usr/bin/env node
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { query } = require("../services/common/db");

async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(30) DEFAULT 'customer',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'customer'");
  await query(`
    CREATE TABLE IF NOT EXISTS sellers (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) UNIQUE,
      store_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(50) PRIMARY KEY,
      seller_id VARCHAR(50) REFERENCES sellers(id),
      name VARCHAR(255) NOT NULL,
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      total INTEGER NOT NULL,
      status VARCHAR(50) DEFAULT 'CREATED',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id VARCHAR(50) NOT NULL,
      seller_id VARCHAR(50),
      qty INTEGER NOT NULL,
      price INTEGER NOT NULL,
      fulfillment_status VARCHAR(50) DEFAULT 'PROCESSING',
      courier VARCHAR(100),
      tracking_id VARCHAR(100),
      estimated_delivery_date DATE
    )
  `);
  await query("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS seller_id VARCHAR(50)");
  await query("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(50) DEFAULT 'PROCESSING'");
  await query("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS courier VARCHAR(100)");
  await query("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(100)");
  await query("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE");
  await query(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      product_id VARCHAR(50) NOT NULL,
      seller_id VARCHAR(50),
      qty INTEGER NOT NULL,
      price INTEGER NOT NULL,
      UNIQUE(user_id, product_id)
    )
  `);
  await query("ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS seller_id VARCHAR(50)");
  await query(`
    DELETE FROM cart_items ci
    USING sellers s
    WHERE ci.seller_id = s.id
      AND s.id = 's1'
      AND s.user_id = 'system'
  `);
  await query(`
    DELETE FROM order_items oi
    USING sellers s
    WHERE oi.seller_id = s.id
      AND s.id = 's1'
      AND s.user_id = 'system'
  `);
  await query(`
    DELETE FROM products p
    USING sellers s
    WHERE p.seller_id = s.id
      AND s.id = 's1'
      AND s.user_id = 'system'
  `);
  await query("DELETE FROM sellers WHERE id = 's1' AND user_id = 'system'");
  await query(`
    UPDATE cart_items ci
    SET seller_id = p.seller_id
    FROM products p
    WHERE ci.product_id = p.id
      AND ci.seller_id IS NULL
      AND p.seller_id IS NOT NULL
  `);
  await query(`
    UPDATE order_items oi
    SET seller_id = p.seller_id
    FROM products p
    WHERE oi.product_id = p.id
      AND oi.seller_id IS NULL
      AND p.seller_id IS NOT NULL
  `);
  await query("DELETE FROM cart_items WHERE seller_id IS NULL");
  await query("DELETE FROM products WHERE seller_id IS NULL");
  await query("DELETE FROM order_items WHERE seller_id IS NULL");
  await query(`
    DELETE FROM orders o
    WHERE NOT EXISTS (
      SELECT 1 FROM order_items oi WHERE oi.order_id = o.id
    )
  `);
  console.log("Migration complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
