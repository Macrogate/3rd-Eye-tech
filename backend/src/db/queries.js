/**
 * Database Query Layer
 * ----------------------
 * All raw SQL for orders, payments, and refunds lives here.
 * Controllers and services call these functions instead of
 * issuing SQL directly.
 */

"use strict";

const { pool } = require("../config/db");

// ═══════════════════════════════════════════════════════════════
//  ORDERS
// ═══════════════════════════════════════════════════════════════

/**
 * Insert a new order row when a Razorpay order is created.
 *
 * @param {object} p
 * @param {string} p.razorpay_order_id
 * @param {number} p.amount            - in paise
 * @param {string} p.currency
 * @param {string} p.receipt
 * @param {string} [p.customer_name]
 * @param {string} [p.customer_email]
 * @param {string} [p.customer_phone]
 * @param {object} [p.notes]          - Stored as plain text (purpose field extracted)
 * @returns {Promise<object>}  Inserted row
 */
const insertOrder = async ({
  razorpay_order_id,
  amount,
  currency,
  receipt,
  customer_name,
  customer_email,
  customer_phone,
  notes,
}) => {
  // Razorpay sends amounts in paise (smallest unit). Convert to rupees for readability.
  const amountInRupees = Math.round(amount) / 100;

  // Save ONLY the purpose text in the notes TEXT column
  let dbNotes = null;
  if (notes && typeof notes === "object") {
    const purpose = notes.purpose || notes.note || null;
    dbNotes = purpose ? String(purpose).trim() : null;
  } else if (typeof notes === "string" && notes.trim()) {
    dbNotes = notes.trim();
  }

  const { rows } = await pool.query(
    `INSERT INTO orders
       (razorpay_order_id, amount, currency, receipt,
        customer_name, customer_email, customer_phone, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      razorpay_order_id,
      amountInRupees,
      currency,
      receipt,
      customer_name || null,
      customer_email || null,
      customer_phone || null,
      dbNotes,
    ]
  );
  return rows[0];
};

/**
 * Update the status of an existing order.
 *
 * @param {string} razorpay_order_id
 * @param {string} status  - 'paid' | 'failed'
 * @returns {Promise<object>}  Updated row
 */
const updateOrderStatus = async (razorpay_order_id, status) => {
  const { rows } = await pool.query(
    `UPDATE orders
     SET status = $1, updated_at = NOW()
     WHERE razorpay_order_id = $2
     RETURNING *`,
    [status, razorpay_order_id]
  );
  return rows[0];
};

/**
 * Find an order by its Razorpay order ID.
 *
 * @param {string} razorpay_order_id
 * @returns {Promise<object|null>}
 */
const findOrderById = async (razorpay_order_id) => {
  const { rows } = await pool.query(
    "SELECT * FROM orders WHERE razorpay_order_id = $1",
    [razorpay_order_id]
  );
  return rows[0] || null;
};

// ═══════════════════════════════════════════════════════════════
//  PAYMENTS
// ═══════════════════════════════════════════════════════════════

/**
 * Insert a payment record after successful signature verification.
 *
 * @param {object} p
 * @param {string} p.razorpay_payment_id
 * @param {string} p.razorpay_order_id
 * @param {number} p.amount
 * @param {string} p.currency
 * @param {string} p.status
 * @param {string} [p.method]
 * @param {string} [p.email]
 * @param {string} [p.contact]
 * @returns {Promise<object>}  Inserted row
 */
const insertPayment = async ({
  razorpay_payment_id,
  razorpay_order_id,
  amount,
  currency,
  status,
  method,
  email,
  contact,
}) => {
  // Convert paise → rupees before storing
  const amountInRupees = Math.round(amount) / 100;

  const { rows } = await pool.query(
    `INSERT INTO payments
       (razorpay_payment_id, razorpay_order_id, amount, currency,
        status, method, email, contact)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (razorpay_payment_id) DO NOTHING
     RETURNING *`,
    [
      razorpay_payment_id,
      razorpay_order_id,
      amountInRupees,
      currency || "INR",
      status || "captured",
      method || null,
      email || null,
      contact || null,
    ]
  );
  return rows[0];
};

/**
 * Find a payment by its Razorpay payment ID.
 *
 * @param {string} razorpay_payment_id
 * @returns {Promise<object|null>}
 */
const findPaymentById = async (razorpay_payment_id) => {
  const { rows } = await pool.query(
    "SELECT * FROM payments WHERE razorpay_payment_id = $1",
    [razorpay_payment_id]
  );
  return rows[0] || null;
};

/**
 * Find all payment rows linked to a given Razorpay order.
 *
 * @param {string} razorpay_order_id
 * @returns {Promise<object[]>}
 */
const findPaymentsByOrderId = async (razorpay_order_id) => {
  const { rows } = await pool.query(
    "SELECT * FROM payments WHERE razorpay_order_id = $1 ORDER BY created_at DESC",
    [razorpay_order_id]
  );
  return rows;
};

// ═══════════════════════════════════════════════════════════════
//  REFUNDS
// ═══════════════════════════════════════════════════════════════

/**
 * Insert a refund record.
 *
 * @param {object} p
 * @param {string} p.razorpay_refund_id
 * @param {string} p.razorpay_payment_id
 * @param {number} p.amount
 * @param {string} p.status
 * @param {string} p.speed
 * @param {object} [p.notes]          - Stored as plain text (purpose field extracted)
 * @returns {Promise<object>}  Inserted row
 */
const insertRefund = async ({
  razorpay_refund_id,
  razorpay_payment_id,
  amount,
  status,
  speed,
  notes,
}) => {
  // Convert paise → rupees before storing
  const amountInRupees = Math.round(amount) / 100;

  const { rows } = await pool.query(
    `INSERT INTO refunds
       (razorpay_refund_id, razorpay_payment_id, amount, status, speed, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (razorpay_refund_id) DO NOTHING
     RETURNING *`,
    [
      razorpay_refund_id,
      razorpay_payment_id,
      amountInRupees,
      status || "created",
      speed || "normal",
      notes
        ? (typeof notes === "object"
            ? String(notes.purpose || notes.note || JSON.stringify(notes)).trim() || null
            : String(notes).trim() || null)
        : null,
    ]
  );
  return rows[0];
};

module.exports = {
  // orders
  insertOrder,
  updateOrderStatus,
  findOrderById,
  // payments
  insertPayment,
  findPaymentById,
  findPaymentsByOrderId,
  // refunds
  insertRefund,
};

