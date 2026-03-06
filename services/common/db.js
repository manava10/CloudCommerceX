const { Pool } = require("pg");

// Allow self-signed certs (Aiven, etc.) - for dev/SDP only
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("aivencloud.com")) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const connectionString =
  process.env.DATABASE_URL ||
  `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}?sslmode=${process.env.PGSSLMODE || "require"}`;

const useSSL = !!connectionString && (
  connectionString.includes("sslmode=require") ||
  connectionString.includes("aivencloud.com")
);
const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

module.exports = { pool, query };
