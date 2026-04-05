import Razorpay from "razorpay"

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" })
    }

    try {
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY,
            key_secret: process.env.RAZORPAY_SECRET
        })

        const order = await razorpay.orders.create({
            amount: req.body.amount,
            currency: "INR"
        })

        res.status(200).json(order)
    } catch (err) {
        console.error("Razorpay order error:", err)
        res.status(500).json({ error: "Failed to create order" })
    }
}
