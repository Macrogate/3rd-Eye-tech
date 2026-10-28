const crypto = require("crypto");


function safeCompare(valueA, valueB) {

    const bufferA =
        Buffer.from(String(valueA));

    const bufferB =
        Buffer.from(String(valueB));

    if (
        bufferA.length !==
        bufferB.length
    ) {
        return false;
    }

    return crypto.timingSafeEqual(
        bufferA,
        bufferB
    );
}


function verifyPaymentSignature({
    orderId,
    paymentId,
    signature
}) {

    const expectedSignature =
        crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
            )
            .update(
                `${orderId}|${paymentId}`
            )
            .digest("hex");


    return safeCompare(
        expectedSignature,
        signature
    );
}


function verifyWebhookSignature(
    rawBody,
    signature
) {

    if (!signature) {
        return false;
    }

    const expectedSignature =
        crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_WEBHOOK_SECRET
            )
            .update(rawBody)
            .digest("hex");


    return safeCompare(
        expectedSignature,
        signature
    );
}


module.exports = {
    safeCompare,
    verifyPaymentSignature,
    verifyWebhookSignature
};