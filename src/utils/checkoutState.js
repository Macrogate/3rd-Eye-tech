const crypto = require("crypto");

const {
    safeCompare
} = require("./signature");


function createCheckoutState(payload) {

    const encodedPayload =
        Buffer
            .from(
                JSON.stringify(payload)
            )
            .toString("base64url");


    const signature =
        crypto
            .createHmac(
                "sha256",
                process.env.CHECKOUT_STATE_SECRET
            )
            .update(encodedPayload)
            .digest("base64url");


    return `${encodedPayload}.${signature}`;
}


function verifyCheckoutState(token) {

    if (
        !token ||
        typeof token !== "string"
    ) {
        throw new Error(
            "Checkout state is missing"
        );
    }


    const parts =
        token.split(".");


    if (parts.length !== 2) {
        throw new Error(
            "Invalid checkout state"
        );
    }


    const [
        encodedPayload,
        receivedSignature
    ] = parts;


    const expectedSignature =
        crypto
            .createHmac(
                "sha256",
                process.env.CHECKOUT_STATE_SECRET
            )
            .update(encodedPayload)
            .digest("base64url");


    if (
        !safeCompare(
            expectedSignature,
            receivedSignature
        )
    ) {
        throw new Error(
            "Invalid checkout state signature"
        );
    }


    let payload;

    try {

        payload =
            JSON.parse(
                Buffer
                    .from(
                        encodedPayload,
                        "base64url"
                    )
                    .toString("utf8")
            );

    } catch {

        throw new Error(
            "Invalid checkout state"
        );
    }


    if (
        !payload.exp ||
        Date.now() > payload.exp
    ) {
        throw new Error(
            "Checkout session expired"
        );
    }


    return payload;
}


module.exports = {
    createCheckoutState,
    verifyCheckoutState
};  