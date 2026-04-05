const crypto = require("crypto")

export default async function handler(req, res) {
    const { order_id, payment_id, signature } = req.body

    const body = order_id + "|" + payment_id

    const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(body)
        .digest("hex")

    if (expected === signature) {
        res.status(200).json({ success: true })
    } else {
        res.status(400).json({ success: false })
    }
}
