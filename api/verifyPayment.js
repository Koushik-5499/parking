import crypto from "crypto"

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" })
    }

    try {
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
    } catch (err) {
        console.error("Verification error:", err)
        res.status(500).json({ success: false, error: "Verification failed" })
    }
}
