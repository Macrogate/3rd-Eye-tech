function rupeesToPaise(value) {

    const amountString =
        String(value).trim();


    const match =
        amountString.match(
            /^(\d+)(?:\.(\d{1,2}))?$/
        );


    if (!match) {

        throw new Error(
            "Enter a valid amount with maximum 2 decimal places"
        );
    }


    const rupees =
        Number(match[1]);


    const paise =
        Number(
            (match[2] || "")
                .padEnd(2, "0") ||
            0
        );


    const totalPaise =
        rupees * 100 +
        paise;


    if (
        !Number.isSafeInteger(
            totalPaise
        ) ||
        totalPaise <= 0
    ) {

        throw new Error(
            "Invalid payment amount"
        );
    }


    return totalPaise;
}


module.exports = {
    rupeesToPaise
};