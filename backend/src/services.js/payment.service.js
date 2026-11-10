/**
 * Payment Service
 * -----------------
 * Thin wrapper around the Razorpay SDK.
 * Every mutating action also persists state to PostgreSQL via the DB query layer.
 */

"use strict";

const razorpay = require("../config/razorpay");
const db = require("../db/queries");

// ═══════════════════════════════════════════════════════════════
//  ORDERS
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a new Razorpay order and persists it to the database.
 *
 * @param {object} options
 * @param {number} options.amount          - Amount in paise (₹1 = 100 paise)
 * @param {string} [options.currency]      - ISO 4217 code (default: "INR")
 * @param {string} [options.receipt]       - Your internal receipt / order reference ID
 * @param {object} [options.notes]         - Key-value metadata (max 15 pairs, 256 chars each)
 * @param {string} [options.customer_name]
 * @param {string} [options.customer_email]
 * @param {string} [options.customer_phone]
 * @returns {Promise<object>} Razorpay Order object
 */
const createOrder = async ({
  amount,
  currency = "INR",
  receipt,
  notes = {},
  customer_name,
  customer_email,
  customer_phone,
}) => {
  if (!amount || amount <= 0) {
    throw new Error("Amount must be a positive integer (in paise).");
  }

  const resolvedReceipt = receipt || `receipt_${Date.now()}`;

  const orderOptions = {
    amount: Math.round(amount),
    currency,
    receipt: resolvedReceipt,
    notes,
    payment_capture: 1, // auto-capture
  };

  const order = await razorpay.orders.create(orderOptions);

  // ── Persist to DB ─────────────────────────────────────────
  await db.insertOrder({
    razorpay_order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    receipt: order.receipt,
    customer_name,
    customer_email,
    customer_phone,
    notes,
  });

  return order;
};

/**
 * Fetches details of a specific Razorpay order.
 *
 * @param {string} orderId
 * @returns {Promise<object>}
 */
const fetchOrder = async (orderId) => {
  if (!orderId) throw new Error("Order ID is required.");
  return await razorpay.orders.fetch(orderId);
};

/**
 * Fetches all payments linked to a Razorpay order.
 *
 * @param {string} orderId
 * @returns {Promise<object>}
 */
const fetchOrderPayments = async (orderId) => {
  if (!orderId) throw new Error("Order ID is required.");
  return await razorpay.orders.fetchPayments(orderId);
};

// ═══════════════════════════════════════════════════════════════
//  PAYMENTS
// ═══════════════════════════════════════════════════════════════

/**
 * Fetches a Razorpay payment and persists it to the database.
 *
 * @param {string} paymentId
 * @returns {Promise<object>} Razorpay Payment object
 */
const fetchPayment = async (paymentId) => {
  if (!paymentId) throw new Error("Payment ID is required.");

  const payment = await razorpay.payments.fetch(paymentId);

  // ── Upsert to DB (safe if called multiple times) ──────────
  await db.insertPayment({
    razorpay_payment_id: payment.id,
    razorpay_order_id: payment.order_id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    method: payment.method,
    email: payment.email,
    contact: payment.contact,
  });

  // ── Mark the linked order as paid ─────────────────────────
  if (payment.status === "captured") {
    await db.updateOrderStatus(payment.order_id, "paid");
  }

  return payment;
};

// ═══════════════════════════════════════════════════════════════
//  REFUNDS
// ═══════════════════════════════════════════════════════════════

/**
 * Initiates a refund via Razorpay and persists it to the database.
 *
 * @param {string} paymentId          - Razorpay payment ID (pay_XXXX)
 * @param {number} [amount]           - Amount to refund in paise; omit for full refund
 * @param {object} [notes]            - Optional metadata for the refund
 * @param {string} [speed]            - "normal" (5-7 days) | "optimum" (instant if eligible)
 * @returns {Promise<object>} Razorpay Refund object
 */
const refundPayment = async (paymentId, amount, notes = {}, speed = "normal") => {
  if (!paymentId) throw new Error("Payment ID is required.");

  const refundOptions = { speed, notes };
  if (amount) refundOptions.amount = Math.round(amount);

  const refund = await razorpay.payments.refund(paymentId, refundOptions);

  // ── Persist to DB ─────────────────────────────────────────
  await db.insertRefund({
    razorpay_refund_id: refund.id,
    razorpay_payment_id: refund.payment_id,
    amount: refund.amount,
    status: refund.status,
    speed: refund.speed_requested || speed,
    notes,
  });

  return refund;
};

module.exports = {
  createOrder,
  fetchOrder,
  fetchOrderPayments,
  fetchPayment,
  refundPayment,
};
