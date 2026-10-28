function errorHandler(
    error,
    req,
    res,
    next
) {

    console.error(
        "Unhandled error:",
        error
    );


    if (
        error.message ===
        "Origin not allowed"
    ) {

        return res
            .status(403)
            .json({

                success: false,

                message:
                    "Origin is not allowed"
            });
    }


    return res
        .status(500)
        .json({

            success: false,

            message:
                "Internal server error"
        });
}


module.exports =
    errorHandler;