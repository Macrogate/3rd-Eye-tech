const { Pool } = require("pg");

/**
 * PostgreSQL Connection Pool
 * Reads connection config from environment variables.
 * The pool is shared across the entire application lifecycle.
 */
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "3rdEyeTech_DB",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  max: 10,                // maximum pool size
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected error on idle client:", err.message);
});

/**
 * Test that the pool can reach the database.
 * Called once at server startup.
 */
const connectDB = async () => {
  const client = await pool.connect();
  console.log("[DB] Connected to PostgreSQL →", process.env.DB_NAME || "3rdEyeTech_DB");
  client.release();
};

module.exports = { pool, connectDB };

