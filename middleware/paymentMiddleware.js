// paymentMiddleware.js
import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../models/orderModel.js";

/* =============================================================================
   1️⃣ CREATE RAZORPAY ORDER (Also creates DB order for ONLINE payments)
============================================================================= */
export const createRazorpayOrder = async (req, res) => {
  console.log("💳 [CREATE RAZORPAY ORDER] Incoming:", req.body);

  try {
    const {
      userId,
      orderItems,
      shippingAddress,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    } = req.body;

    console.log("➡ Validating request...");

    if (!userId) {
      console.log("❌ Missing userId");
      return res.status(400).json({ message: "User ID missing" });
    }

    if (!orderItems || orderItems.length === 0) {
      console.log("❌ Missing order items");
      return res.status(400).json({ message: "Order items missing" });
    }

    if (!totalPrice) {
      console.log("❌ Missing total price");
      return res.status(400).json({ message: "Total price missing" });
    }

    // 1️⃣ Create ORDER IN DATABASE (Unpaid)
    console.log("📝 Creating unpaid ONLINE order in DB...");

    const order = await Order.create({
      user: userId,
      userEmail: "",
      orderItems,
      shippingAddress,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      paymentMethod: "ONLINE",
      isPaid: false,
      status: "cart",
    });

    console.log("✔️ Local DB Order Created:", order._id);

    // 2️⃣ Create Razorpay Order
    console.log("🔧 Connecting to Razorpay...");

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    console.log("💸 Creating Razorpay order for amount:", totalPrice);

    const rpOrder = await razorpay.orders.create({
      amount: Math.round(order.totalPrice * 100),
      currency: "INR",
      receipt: `rcpt_${order._id}`,
      payment_capture: 1,
    });

    console.log("✔️ Razorpay Order Created:", rpOrder.id);

    // 3️⃣ Save Razorpay order ID
    order.razorpayOrderId = rpOrder.id;
    await order.save();

    console.log("💾 Razorpay order ID saved to DB");

    return res.json({
      success: true,
      message: "Razorpay order created successfully",
      orderId: order._id,
      razorpayOrder: rpOrder,
    });

  } catch (err) {
    console.error("❌ createRazorpayOrder error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
      error: err.message,
    });
  }
};


/* =============================================================================
   2️⃣ VERIFY RAZORPAY PAYMENT
============================================================================= */
export const verifyPayment = async (req, res) => {
  console.log("🔍 [VERIFY PAYMENT] Incoming:", req.body);

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    console.log("➡ Validating Razorpay fields...");

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.log("❌ Missing Razorpay parameters");
      return res.status(400).json({ message: "Missing Razorpay fields" });
    }

    if (!orderId) {
      console.log("❌ Order ID missing");
      return res.status(400).json({ message: "Order ID missing" });
    }

    // Fetch order
    console.log("📝 Fetching order from DB:", orderId);

    const order = await Order.findById(orderId).populate("user", "email name");

    if (!order) {
      console.log("❌ Order not found");
      return res.status(404).json({ message: "Order not found" });
    }

    console.log("✔️ Order fetched. Verifying signature...");

    // 1️⃣ Signature Verification
    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expected !== razorpay_signature) {
      console.log("❌ Signature mismatch!");
      return res.status(400).json({ message: "Invalid Razorpay signature" });
    }

    console.log("✔️ Signature verified successfully!");

    // 2️⃣ Mark Order As Paid
    order.isPaid = true;
    order.paidAt = Date.now();
    order.status = "waiting";
    order.paymentInfo = {
      id: razorpay_payment_id,
      status: "Paid",
      orderId: razorpay_order_id,
      signature: razorpay_signature,
    };

    await order.save();

    console.log("💰 Order marked as PAID:", order._id);

    return res.json({
      success: true,
      message: "Payment verified successfully",
      order,
    });

  } catch (err) {
    console.error("❌ verifyPayment error:", err);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: err.message,
    });
  }
};
