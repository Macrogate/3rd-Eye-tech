/**
 * Migration: Convert notes columns from JSONB → TEXT
 * ---------------------------------------------------
 * Run from the backend/ directory:
 *   node scripts/migrate_notes_to_text.js
 */

"use strict";

const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "3rdEyeTech_DB",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
});

(async () => {
  const client = await pool.connect();
  try {
    console.log("\n🔄  Running migration: notes JSONB → TEXT\n");

    // ── Check current type of orders.notes ───────────────────────
    const { rows: colInfo } = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'notes'
    `);

    if (colInfo.length && colInfo[0].data_type === "text") {
      console.log("✅  orders.notes is already TEXT — no migration needed.\n");
    } else {
      await client.query(`
        ALTER TABLE orders
          ALTER COLUMN notes TYPE TEXT
          USING (notes->>'purpose')
      `);
      console.log("✅  orders.notes   → converted JSONB to TEXT (extracted 'purpose')");
    }

    // ── Check current type of refunds.notes ──────────────────────
    const { rows: refColInfo } = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'refunds' AND column_name = 'notes'
    `);

    if (refColInfo.length && refColInfo[0].data_type === "text") {
      console.log("✅  refunds.notes is already TEXT — no migration needed.\n");
    } else {
      await client.query(`
        ALTER TABLE refunds
          ALTER COLUMN notes TYPE TEXT
          USING COALESCE(notes->>'purpose', notes::TEXT)
      `);
      console.log("✅  refunds.notes  → converted JSONB to TEXT");
    }

    console.log("\n🎉  Migration complete!\n");
  } catch (err) {
    console.error("❌  Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
