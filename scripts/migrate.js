#!/usr/bin/env node
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { query } = require("../services/common/db");

async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
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
      qty INTEGER NOT NULL,
      price INTEGER NOT NULL
    )
  `);
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
  console.log("Migration complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
