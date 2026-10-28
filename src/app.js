const express =
    require("express");

const cors =
    require("cors");

const helmet =
    require("helmet");

const rateLimit =
    require(
        "express-rate-limit"
    );


const paymentRoutes =
    require(
        "./routes/payment.routes"
    );


const {
    razorpayWebhook
} = require(
    "./controllers/payment.controller"
);


const errorHandler =
    require(
        "./middleware/errorHandler"
    );


const app =
    express();


/* =====================================================
   REVERSE PROXY
===================================================== */

app.set(
    "trust proxy",
    1
);


/* =====================================================
   SECURITY HEADERS
===================================================== */

app.use(
    helmet()
);


/* =====================================================
   CORS
===================================================== */

const allowedOrigins =
    (
        process.env
            .ALLOWED_ORIGINS ||
        ""
    )
        .split(",")
        .map(
            origin =>
                origin.trim()
        )
        .filter(Boolean);


app.use(
    cors({

        origin(
            origin,
            callback
        ) {

            /*
             * Allows Postman/curl/server calls.
             */
            if (!origin) {

                return callback(
                    null,
                    true
                );
            }


            if (
                allowedOrigins
                    .includes(origin)
            ) {

                return callback(
                    null,
                    true
                );
            }


            return callback(
                new Error(
                    "Origin not allowed"
                )
            );
        },


        methods: [
            "GET",
            "POST"
        ]
    })
);


/* =====================================================
   WEBHOOK

   MUST BE BEFORE express.json()
===================================================== */

app.post(
    "/api/razorpay/webhook",

    express.raw({
        type:
            "application/json",

        limit:
            "200kb"
    }),

    razorpayWebhook
);


/* =====================================================
   NORMAL REQUEST JSON PARSER
===================================================== */

app.use(
    express.json({
        limit:
            "50kb"
    })
);


/* =====================================================
   RATE LIMITING
===================================================== */

const generalLimiter =
    rateLimit({

        windowMs:
            15 * 60 * 1000,

        limit:
            200,

        standardHeaders:
            true,

        legacyHeaders:
            false
    });


const createOrderLimiter =
    rateLimit({

        windowMs:
            60 * 1000,

        limit:
            20,

        standardHeaders:
            true,

        legacyHeaders:
            false,

        message: {

            success:
                false,

            message:
                "Too many payment attempts. Please try again shortly."
        }
    });


const verificationLimiter =
    rateLimit({

        windowMs:
            60 * 1000,

        limit:
            30,

        standardHeaders:
            true,

        legacyHeaders:
            false
    });


app.use(
    "/api",
    generalLimiter
);


app.use(
    "/api/create-order",
    createOrderLimiter
);


app.use(
    "/api/verify-payment",
    verificationLimiter
);


/* =====================================================
   HEALTH CHECK
===================================================== */

app.get(
    "/api/health",

    (req, res) => {

        return res.json({

            success: true,

            service:
                "Razorpay Payment API",

            environment:
                process.env.NODE_ENV ||
                "development"
        });
    }
);


/* =====================================================
   PAYMENT ROUTES
===================================================== */

app.use(
    "/api",
    paymentRoutes
);


/* =====================================================
   404
===================================================== */

app.use(
    (req, res) => {

        return res
            .status(404)
            .json({

                success: false,

                message:
                    "API endpoint not found"
            });
    }
);


/* =====================================================
   ERROR HANDLER
===================================================== */

app.use(
    errorHandler
);


module.exports = app;