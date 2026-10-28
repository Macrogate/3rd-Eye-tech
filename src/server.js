require("dotenv").config();


const requiredEnvironmentVariables = [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "CHECKOUT_STATE_SECRET"
];


for (
    const key
    of requiredEnvironmentVariables
) {

    if (!process.env[key]) {

        console.error(
            `Missing required environment variable: ${key}`
        );

        process.exit(1);
    }
}


const app =
    require("./app");


const PORT =
    Number(
        process.env.PORT ||
        5000
    );


const HOST =
    process.env.HOST ||
    "localhost";


const server =
    app.listen(
        PORT,
        HOST,

        () => {

            console.log(
                `Razorpay API running on http://${HOST}:${PORT}`
            );

            console.log(
                `Environment: ${
                    process.env.NODE_ENV ||
                    "development"
                }`
            );
        }
    );


/* =====================================================
   GRACEFUL SHUTDOWN
===================================================== */

function shutdown(signal) {

    console.log(
        `${signal} received. Shutting down...`
    );


    server.close(
        () => {

            console.log(
                "HTTP server closed."
            );

            process.exit(0);
        }
    );


    setTimeout(
        () => {

            console.error(
                "Forced shutdown."
            );

            process.exit(1);

        },
        10000
    ).unref();
}


process.on(
    "SIGTERM",
    () =>
        shutdown(
            "SIGTERM"
        )
);


process.on(
    "SIGINT",
    () =>
        shutdown(
            "SIGINT"
        )
);