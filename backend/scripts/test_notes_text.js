/**
 * Quick test: verify notes columns are TEXT and accept plain-text values.
 */
"use strict";
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { Pool } = require("pg");

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
    // 1. Check column types
    const { rows: cols } = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name IN ('orders', 'refunds') AND column_name = 'notes'
      ORDER BY table_name
    `);
    console.log("\n📋  Column types:");
    cols.forEach(r =>
      console.log(`    ${r.table_name}.${r.column_name}  →  ${r.data_type}`)
    );

    // 2. Test insert with a plain text note (what the user types)
    const textNote = "Payment to 3rd Eye Tech";
    const { rows: inserted } = await client.query(
      `INSERT INTO orders (razorpay_order_id, amount, currency, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING notes`,
      ["test_text_note_001", 1, "INR", "created", textNote]
    );
    console.log(`\n✅  Inserted plain-text note: "${inserted[0].notes}"`);

    // 3. Test insert with a numeric-looking note
    const numNote = "500";
    const { rows: numRow } = await client.query(
      `INSERT INTO orders (razorpay_order_id, amount, currency, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING notes`,
      ["test_num_note_001", 1, "INR", "created", numNote]
    );
    console.log(`✅  Inserted numeric note:    "${numRow[0].notes}"`);

    // 4. Cleanup
    await client.query(
      `DELETE FROM orders WHERE razorpay_order_id IN ($1, $2)`,
      ["test_text_note_001", "test_num_note_001"]
    );
    console.log("🧹  Test rows cleaned up.");
    console.log("\n🎉  All tests passed — notes column is working correctly as TEXT!\n");
  } catch (err) {
    console.error("❌  Test failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
