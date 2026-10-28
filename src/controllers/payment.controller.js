const crypto = require("crypto");

const razorpay =
    require("../config/razorpay");

const {
    rupeesToPaise
} = require("../utils/amount");

const {
    createCheckoutState,
    verifyCheckoutState
} = require(
    "../utils/checkoutState"
);

const {
    verifyPaymentSignature,
    verifyWebhookSignature
} = require("../utils/signature");


const processedWebhookEvents =
    new Map();


/*
 * Keep webhook event IDs in memory
 * for a short period to reduce replay /
 * duplicate processing.
 *
 * IMPORTANT:
 * This is NOT durable after server restart.
 */

const WEBHOOK_EVENT_TTL =
    60 * 60 * 1000;


function cleanupWebhookCache() {

    const now =
        Date.now();

    for (
        const [eventId, time]
        of processedWebhookEvents
    ) {

        if (
            now - time >
            WEBHOOK_EVENT_TTL
        ) {

            processedWebhookEvents
                .delete(eventId);
        }
    }
}


/* =====================================================
   CREATE ORDER
===================================================== */

async function createOrder(
    req,
    res
) {

    try {

        const {
            amount
        } = req.body;


        if (
            amount === undefined ||
            amount === null ||
            amount === ""
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Amount is required"
                });
        }


        let amountInPaise;

        try {

            amountInPaise =
                rupeesToPaise(amount);

        } catch (error) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        error.message
                });
        }


        const minimum =
            Math.round(
                Number(
                    process.env
                        .MIN_PAYMENT_AMOUNT ||
                    1
                ) * 100
            );


        const maximum =
            Math.round(
                Number(
                    process.env
                        .MAX_PAYMENT_AMOUNT ||
                    100000
                ) * 100
            );


        if (
            amountInPaise <
            minimum
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        `Minimum payment amount is ₹${minimum / 100}`
                });
        }


        if (
            amountInPaise >
            maximum
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        `Maximum payment amount is ₹${maximum / 100}`
                });
        }


        const receipt =
            `rcpt_${Date.now()}_${crypto
                .randomBytes(4)
                .toString("hex")}`;


        const order =
            await razorpay
                .orders
                .create({

                    amount:
                        amountInPaise,

                    currency:
                        "INR",

                    receipt
                });


        /*
         * Valid for 15 minutes.
         */

        const checkoutState =
            createCheckoutState({

                orderId:
                    order.id,

                amount:
                    Number(
                        order.amount
                    ),

                currency:
                    order.currency,

                exp:
                    Date.now() +
                    15 * 60 * 1000
            });


        return res
            .status(201)
            .json({

                success: true,

                data: {

                    key:
                        process.env
                            .RAZORPAY_KEY_ID,

                    orderId:
                        order.id,

                    amount:
                        Number(
                            order.amount
                        ),

                    currency:
                        order.currency,

                    checkoutState
                }
            });


    } catch (error) {

        console.error(
            "Create order error:",
            error.message
        );


        return res
            .status(500)
            .json({
                success: false,
                message:
                    "Unable to create payment order"
            });
    }
}


/* =====================================================
   VERIFY PAYMENT
===================================================== */

async function verifyPayment(
    req,
    res
) {

    try {

        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            checkoutState
        } = req.body;


        if (
            !razorpay_payment_id ||
            !razorpay_order_id ||
            !razorpay_signature ||
            !checkoutState
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Payment verification data is missing"
                });
        }


        /*
         * STEP 1
         * Validate trusted checkout token.
         */

        let trustedState;

        try {

            trustedState =
                verifyCheckoutState(
                    checkoutState
                );

        } catch (error) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        error.message
                });
        }


        /*
         * STEP 2
         * The browser's order ID must
         * equal our signed order ID.
         */

        if (
            razorpay_order_id !==
            trustedState.orderId
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Order ID mismatch"
                });
        }


        /*
         * STEP 3
         * Verify Razorpay HMAC signature.
         */

        const signatureValid =
            verifyPaymentSignature({

                orderId:
                    trustedState.orderId,

                paymentId:
                    razorpay_payment_id,

                signature:
                    razorpay_signature
            });


        if (!signatureValid) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Invalid payment signature"
                });
        }


        /*
         * STEP 4
         * Fetch payment directly from
         * Razorpay.
         */

        const payment =
            await razorpay
                .payments
                .fetch(
                    razorpay_payment_id
                );


        /*
         * STEP 5
         * Check payment/order relationship.
         */

        if (
            payment.order_id !==
            trustedState.orderId
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Payment does not belong to this order"
                });
        }


        /*
         * STEP 6
         * Check exact amount.
         */

        if (
            Number(payment.amount) !==
            Number(
                trustedState.amount
            )
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Payment amount mismatch"
                });
        }


        /*
         * STEP 7
         * Verify currency.
         */

        if (
            payment.currency !==
            trustedState.currency
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Payment currency mismatch"
                });
        }


        /*
         * STEP 8
         * Only captured payments are
         * considered successful.
         */

        if (
            payment.status !==
            "captured"
        ) {

            return res
                .status(202)
                .json({
                    success: false,
                    pending: true,
                    message:
                        `Payment status is ${payment.status}`
                });
        }


        /*
         * Do NOT log customer payment
         * credentials/card details.
         */

        console.log(
            "Payment verified:",
            {
                paymentId:
                    payment.id,

                orderId:
                    payment.order_id,

                amount:
                    payment.amount,

                currency:
                    payment.currency,

                status:
                    payment.status
            }
        );


        return res.json({

            success: true,

            message:
                "Payment verified successfully",

            data: {

                paymentId:
                    payment.id,

                orderId:
                    payment.order_id,

                amount:
                    Number(
                        payment.amount
                    ),

                currency:
                    payment.currency,

                status:
                    payment.status
            }
        });


    } catch (error) {

        console.error(
            "Verify payment error:",
            error.message
        );


        return res
            .status(500)
            .json({
                success: false,
                message:
                    "Unable to verify payment"
            });
    }
}


/* =====================================================
   WEBHOOK
===================================================== */

function razorpayWebhook(
    req,
    res
) {

    try {

        if (
            !process.env
                .RAZORPAY_WEBHOOK_SECRET
        ) {

            return res
                .status(503)
                .send(
                    "Webhook not configured"
                );
        }


        const signature =
            req.headers[
                "x-razorpay-signature"
            ];


        if (!signature) {

            return res
                .status(400)
                .send(
                    "Missing webhook signature"
                );
        }


        /*
         * Signature MUST be calculated on
         * the raw body.
         */

        const signatureValid =
            verifyWebhookSignature(
                req.body,
                signature
            );


        if (!signatureValid) {

            return res
                .status(400)
                .send(
                    "Invalid webhook signature"
                );
        }


        const event =
            JSON.parse(
                req.body.toString(
                    "utf8"
                )
            );


        /*
         * Razorpay may provide an event ID.
         *
         * If unavailable, create a stable
         * fingerprint from the signed body.
         */

        const eventId =
            req.headers[
                "x-razorpay-event-id"
            ] ||
            crypto
                .createHash(
                    "sha256"
                )
                .update(req.body)
                .digest("hex");


        cleanupWebhookCache();


        if (
            processedWebhookEvents
                .has(eventId)
        ) {

            /*
             * Acknowledge duplicates
             * without processing again.
             */

            return res
                .status(200)
                .send("OK");
        }


        /*
         * Record before processing.
         */

        processedWebhookEvents.set(
            eventId,
            Date.now()
        );


        /*
         * Handle only the events
         * relevant to this project.
         */

        switch (event.event) {

            case "payment.captured": {

                const payment =
                    event
                        ?.payload
                        ?.payment
                        ?.entity;


                if (payment) {

                    console.log(
                        "Webhook payment captured:",
                        {
                            paymentId:
                                payment.id,

                            orderId:
                                payment.order_id,

                            amount:
                                payment.amount,

                            currency:
                                payment.currency
                        }
                    );
                }

                break;
            }


            case "payment.failed": {

                const payment =
                    event
                        ?.payload
                        ?.payment
                        ?.entity;


                if (payment) {

                    console.log(
                        "Webhook payment failed:",
                        {
                            paymentId:
                                payment.id,

                            orderId:
                                payment.order_id
                        }
                    );
                }

                break;
            }


            default:

                console.log(
                    "Webhook received:",
                    event.event
                );
        }


        return res
            .status(200)
            .send("OK");


    } catch (error) {

        console.error(
            "Webhook error:",
            error.message
        );


        /*
         * Return non-2xx so Razorpay
         * can retry if appropriate.
         */

        return res
            .status(500)
            .send(
                "Webhook processing failed"
            );
    }
}


module.exports = {
    createOrder,
    verifyPayment,
    razorpayWebhook
};