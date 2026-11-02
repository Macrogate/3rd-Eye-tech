const paymentService = require("../services.js/payment.service");
const { verifyPaymentSignature, verifyWebhookSignature } = require("../utils/paymentSignature");

// ─────────────────────────────────────────────────────────────
// POST /api/payment/create-order
// Body: { amount, currency?, receipt?, notes? }
// ─────────────────────────────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const { amount, currency, receipt, notes } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: "Amount is required.",
      });
    }

    const order = await paymentService.createOrder({ amount, currency, receipt, notes });

    return res.status(201).json({
      success: true,
      message: "Order created successfully.",
      order,
      key: process.env.RAZORPAY_KEY_ID, // sent to frontend for Razorpay checkout initialisation
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/payment/verify
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// ─────────────────────────────────────────────────────────────
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are all required.",
      });
    }

    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed. Payment is invalid.",
      });
    }

    // ── Fetch full payment details from Razorpay ──
    const payment = await paymentService.fetchPayment(razorpay_payment_id);

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully.",
      payment,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/payment/order/:orderId
// ─────────────────────────────────────────────────────────────
const getOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await paymentService.fetchOrder(orderId);

    return res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/payment/order/:orderId/payments
// ─────────────────────────────────────────────────────────────
const getOrderPayments = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const payments = await paymentService.fetchOrderPayments(orderId);

    return res.status(200).json({ success: true, payments });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/payment/:paymentId
// ─────────────────────────────────────────────────────────────
const getPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const payment = await paymentService.fetchPayment(paymentId);

    return res.status(200).json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/payment/refund
// Body: { paymentId, amount?, notes?, speed? }
// ─────────────────────────────────────────────────────────────
const refundPayment = async (req, res, next) => {
  try {
    const { paymentId, amount, notes, speed } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "paymentId is required.",
      });
    }

    const refund = await paymentService.refundPayment(paymentId, amount, notes, speed);

    return res.status(200).json({
      success: true,
      message: "Refund initiated successfully.",
      refund,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/payment/webhook
// Razorpay sends events here. Validate with webhook secret.
// NOTE: This route MUST receive the raw body (not JSON-parsed).
// ─────────────────────────────────────────────────────────────
const handleWebhook = (req, res, next) => {
  try {
    const webhookSign = req.headers["x-razorpay-signature"];

    if (!webhookSign) {
      return res.status(400).json({
        success: false,
        message: "Missing X-Razorpay-Signature header.",
      });
    }

    const isValid = verifyWebhookSignature(req.rawBody, webhookSign);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Webhook signature verification failed.",
      });
    }

    const event = req.body;
    console.log(`[Webhook] Received event: ${event.event}`);

    switch (event.event) {
      case "payment.captured":
        // TODO: Update order status to "paid" in your database
        console.log("[Webhook] Payment captured:", event.payload.payment.entity.id);
        break;

      case "payment.failed":
        // TODO: Mark order as failed in your database
        console.log("[Webhook] Payment failed:", event.payload.payment.entity.id);
        break;

      case "refund.created":
        // TODO: Update refund record in your database
        console.log("[Webhook] Refund created:", event.payload.refund.entity.id);
        break;

      case "order.paid":
        // TODO: Fulfil the order in your database
        console.log("[Webhook] Order paid:", event.payload.order.entity.id);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.event}`);
    }

    // Razorpay expects a 200 response to acknowledge receipt
    return res.status(200).json({ success: true, received: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getOrder,
  getOrderPayments,
  getPayment,
  refundPayment,
  handleWebhook,
};
