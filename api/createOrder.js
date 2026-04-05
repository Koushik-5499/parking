const Razorpay = require("razorpay")

export default async function handler(req, res) {
    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY,
        key_secret: process.env.RAZORPAY_SECRET
    })

    const order = await razorpay.orders.create({
        amount: req.body.amount,
        currency: "INR"
    })

    res.status(200).json(order)
}
