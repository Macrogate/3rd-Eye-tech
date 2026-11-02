const razorpay = require("../config/razorpay");

/**
 * Creates a new Razorpay order.
 *
 * @param {object} options
 * @param {number} options.amount   - Amount in smallest currency unit (paise for INR). e.g. ₹500 → 50000
 * @param {string} options.currency - ISO 4217 currency code (default: "INR")
 * @param {string} [options.receipt]       - Your internal receipt / order reference ID
 * @param {object} [options.notes]         - Key-value metadata (max 15 pairs, 256 chars each)
 * @returns {Promise<object>} Razorpay Order object
 */
const createOrder = async ({ amount, currency = "INR", receipt, notes = {} }) => {
  if (!amount || amount <= 0) {
    throw new Error("Amount must be a positive integer (in paise).");
  }

  const orderOptions = {
    amount: Math.round(amount), // ensure integer
    currency,
    receipt: receipt || `receipt_${Date.now()}`,
    notes,
    payment_capture: 1, // auto-capture payment
  };

  const order = await razorpay.orders.create(orderOptions);
  return order;
};

/**
 * Fetches details of a specific Razorpay order.
 *
 * @param {string} orderId - Razorpay order ID (order_XXXX)
 * @returns {Promise<object>}
 */
const fetchOrder = async (orderId) => {
  if (!orderId) throw new Error("Order ID is required.");
  return await razorpay.orders.fetch(orderId);
};

/**
 * Fetches all payments linked to a Razorpay order.
 *
 * @param {string} orderId - Razorpay order ID
 * @returns {Promise<object>}
 */
const fetchOrderPayments = async (orderId) => {
  if (!orderId) throw new Error("Order ID is required.");
  return await razorpay.orders.fetchPayments(orderId);
};

/**
 * Fetches details of a specific Razorpay payment.
 *
 * @param {string} paymentId - Razorpay payment ID (pay_XXXX)
 * @returns {Promise<object>}
 */
const fetchPayment = async (paymentId) => {
  if (!paymentId) throw new Error("Payment ID is required.");
  return await razorpay.payments.fetch(paymentId);
};

/**
 * Initiates a refund for a captured payment.
 *
 * @param {string} paymentId     - Razorpay payment ID (pay_XXXX)
 * @param {number} [amount]      - Amount to refund in paise. Omit for full refund.
 * @param {object} [notes]       - Optional metadata for the refund
 * @param {string} [speed]       - "normal" (5-7 days) | "optimum" (instant if eligible). Default: "normal"
 * @returns {Promise<object>} Refund object
 */
const refundPayment = async (paymentId, amount, notes = {}, speed = "normal") => {
  if (!paymentId) throw new Error("Payment ID is required.");

  const refundOptions = { speed, notes };
  if (amount) refundOptions.amount = Math.round(amount);

  return await razorpay.payments.refund(paymentId, refundOptions);
};

module.exports = {
  createOrder,
  fetchOrder,
  fetchOrderPayments,
  fetchPayment,
  refundPayment,
};
