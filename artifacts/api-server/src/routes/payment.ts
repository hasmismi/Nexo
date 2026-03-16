import { Router } from "express";
import crypto from "crypto";

const router = Router();

const getKeys = () => {
  const key_id = process.env.RAZORPAY_KEY_ID ?? "";
  const key_secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  return { key_id, key_secret };
};

router.post("/create-order", async (req, res) => {
  try {
    const { key_id, key_secret } = getKeys();
    if (!key_id || !key_secret) {
      return res.status(503).json({ message: "Payment not configured. Please add Razorpay API keys." });
    }

    const { amount_paise, receipt } = req.body;
    if (!amount_paise || amount_paise < 100) {
      return res.status(400).json({ message: "amount_paise must be at least 100" });
    }

    const auth = Buffer.from(`${key_id}:${key_secret}`).toString("base64");
    const response: any = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount_paise),
        currency: "INR",
        receipt: receipt ?? `rcpt_${Date.now()}`,
      }),
    });

    if (!response.ok) {
      const err: any = await response.json().catch(() => ({}));
      console.error("Razorpay order creation failed:", err);
      return res.status(502).json({ message: err?.error?.description ?? "Failed to create payment order" });
    }

    const order: any = await response.json();
    return res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id,
    });
  } catch (err) {
    console.error("create-order error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const { key_secret } = getKeys();
    if (!key_secret) {
      return res.status(503).json({ message: "Payment not configured" });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(body)
      .digest("hex");

    const verified = expectedSignature === razorpay_signature;
    if (!verified) {
      return res.status(400).json({ message: "Payment verification failed", verified: false });
    }

    return res.json({ verified: true, payment_id: razorpay_payment_id });
  } catch (err) {
    console.error("verify error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
