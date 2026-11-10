/**
 * Database Initialiser
 * -----------------------
 * Reads init_db.sql and executes it against the configured PostgreSQL database.
 *
 * Usage (from the project root or backend/ directory):
 *   node scripts/init_db.js
 *
 * Make sure your .env variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
 * are set before running this script.
 */

"use strict";

const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");

// Load .env from the backend directory
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "3rdEyeTech_DB",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
});

(async () => {
  const sqlPath = path.join(__dirname, "init_db.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  console.log("\n🗄️  Initialising 3rdEyeTech_DB …\n");

  try {
    await pool.query(sql);
    console.log("✅  Schema created successfully:");
    console.log("     • orders   table");
    console.log("     • payments table");
    console.log("     • refunds  table");
    console.log("     • indexes + trigger\n");
  } catch (err) {
    console.error("❌  Schema init failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();

