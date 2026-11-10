"use strict";

const paymentService = require("../services.js/payment.service");
const { verifyPaymentSignature, verifyWebhookSignature } = require("../utils/paymentSignature");
const db = require("../db/queries");

// ─────────────────────────────────────────────────────────────
// POST /api/payment/create-order
// Body: { amount, currency?, receipt?, notes?, name?, email?, phone? }
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

    // The frontend sends name/email/phone inside the notes object.
    // We read them from there so they are also saved as dedicated DB columns.
    const customer_name  = notes?.name  || null;
    const customer_email = notes?.email || null;
    const customer_phone = notes?.phone || null;

    const order = await paymentService.createOrder({
      amount,
      currency,
      receipt,
      notes,
      customer_name,
      customer_email,
      customer_phone,
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully.",
      order,
      key: process.env.RAZORPAY_KEY_ID,
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
      // Mark the order as failed in DB on bad signature
      await db.updateOrderStatus(razorpay_order_id, "failed").catch(() => {});
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed. Payment is invalid.",
      });
    }

    // Fetch payment from Razorpay; service also persists it to DB
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
const handleWebhook = async (req, res, next) => {
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
      case "payment.captured": {
        const p = event.payload.payment.entity;
        console.log("[Webhook] Payment captured:", p.id);
        // Persist payment + mark order paid
        await db.insertPayment({
          razorpay_payment_id: p.id,
          razorpay_order_id: p.order_id,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          method: p.method,
          email: p.email,
          contact: p.contact,
        }).catch((err) => console.error("[Webhook] DB insertPayment error:", err.message));
        await db.updateOrderStatus(p.order_id, "paid")
          .catch((err) => console.error("[Webhook] DB updateOrderStatus error:", err.message));
        break;
      }

      case "payment.failed": {
        const p = event.payload.payment.entity;
        console.log("[Webhook] Payment failed:", p.id);
        await db.updateOrderStatus(p.order_id, "failed")
          .catch((err) => console.error("[Webhook] DB updateOrderStatus error:", err.message));
        break;
      }

      case "refund.created": {
        const r = event.payload.refund.entity;
        console.log("[Webhook] Refund created:", r.id);
        await db.insertRefund({
          razorpay_refund_id: r.id,
          razorpay_payment_id: r.payment_id,
          amount: r.amount,
          status: r.status,
          speed: r.speed_requested || "normal",
          notes: r.notes || {},
        }).catch((err) => console.error("[Webhook] DB insertRefund error:", err.message));
        break;
      }

      case "order.paid": {
        const o = event.payload.order.entity;
        console.log("[Webhook] Order paid:", o.id);
        await db.updateOrderStatus(o.id, "paid")
          .catch((err) => console.error("[Webhook] DB updateOrderStatus error:", err.message));
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.event}`);
    }

    // Razorpay expects a 200 to acknowledge receipt
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
