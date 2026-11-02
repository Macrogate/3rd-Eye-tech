const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const {
  createOrder,
  verifyPayment,
  getOrder,
  getOrderPayments,
  getPayment,
  refundPayment,
  handleWebhook,
} = require("../controller/payment.controller");

// ── Rate Limiters ────────────────────────────────────────────
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: "Too many order requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many verification requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const refundLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, message: "Too many refund requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Routes ───────────────────────────────────────────────────

/**
 * @route   POST /api/payment/create-order
 * @desc    Create a new Razorpay order
 * @body    { amount, currency?, receipt?, notes? }
 * @access  Public (protect with auth middleware in production)
 */
router.post("/create-order", orderLimiter, createOrder);

/**
 * @route   POST /api/payment/verify
 * @desc    Verify Razorpay payment signature after checkout
 * @body    { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * @access  Public
 */
router.post("/verify", verifyLimiter, verifyPayment);

/**
 * @route   POST /api/payment/refund
 * @desc    Initiate a refund for a captured payment
 * @body    { paymentId, amount?, notes?, speed? }
 * @access  Protected (add auth middleware before going to production)
 */
router.post("/refund", refundLimiter, refundPayment);

/**
 * @route   GET /api/payment/order/:orderId
 * @desc    Fetch a specific Razorpay order
 * @access  Protected
 */
router.get("/order/:orderId", getOrder);

/**
 * @route   GET /api/payment/order/:orderId/payments
 * @desc    Fetch all payments linked to an order
 * @access  Protected
 */
router.get("/order/:orderId/payments", getOrderPayments);

/**
 * @route   GET /api/payment/:paymentId
 * @desc    Fetch a specific Razorpay payment
 * @access  Protected
 */
router.get("/:paymentId", getPayment);

/**
 * @route   POST /api/payment/webhook
 * @desc    Razorpay webhook endpoint — validates signature, dispatches events
 * @note    Raw body must be preserved (configured in app.js)
 * @access  Public (Razorpay servers only)
 */
router.post("/webhook", handleWebhook);

module.exports = router;
