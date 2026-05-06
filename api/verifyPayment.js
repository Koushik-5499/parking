import crypto from "crypto"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    if (!process.env.RAZORPAY_SECRET) {
      console.error("[Payment API] FATAL ERROR: RAZORPAY_SECRET is missing.");
      return res.status(500).json({ error: "Server configuration error: Payment verification unavailable" });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    
    console.log(`[Payment API] Verifying payment for order ID: ${body.razorpay_order_id}`);

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = body

    const sign = razorpay_order_id + "|" + razorpay_payment_id

    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(sign.toString())
      .digest("hex")

    if (expectedSign === razorpay_signature) {
      console.log(`[Payment API] ✅ Signature verified successfully for payment ${razorpay_payment_id}`);
      return res.status(200).json({ success: true })
    } else {
      console.error(`[Payment API] ❌ Invalid signature detected for payment ${razorpay_payment_id}`);
      return res.status(400).json({ success: false, error: "Invalid signature" })
    }
  } catch (err) {
    console.error("Verification error:", err)
    return res.status(500).json({ success: false, error: "Verification failed" })
  }
}
