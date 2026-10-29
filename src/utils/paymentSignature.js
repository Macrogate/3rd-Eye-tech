const crypto = require("crypto");

/**
 * Verifies the Razorpay payment signature after a successful payment.
 * Razorpay signs the payload with: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
 *
 * @param {string} orderId       - razorpay_order_id returned on checkout
 * @param {string} paymentId     - razorpay_payment_id returned on checkout
 * @param {string} razorpaySign  - razorpay_signature returned on checkout
 * @returns {boolean}
 */
const verifyPaymentSignature = (orderId, paymentId, razorpaySign) => {
  const body = `${orderId}|${paymentId}`;
  const expectedSign = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSign, "hex"),
    Buffer.from(razorpaySign, "hex")
  );
};

/**
 * Verifies the Razorpay webhook signature.
 * Razorpay signs the raw request body with the webhook secret.
 *
 * @param {string | Buffer} rawBody      - Raw request body (must be the original buffer, not parsed JSON)
 * @param {string}          webhookSign  - X-Razorpay-Signature header value
 * @returns {boolean}
 */
const verifyWebhookSignature = (rawBody, webhookSign) => {
  const expectedSign = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSign, "hex"),
    Buffer.from(webhookSign, "hex")
  );
};

module.exports = { verifyPaymentSignature, verifyWebhookSignature };
