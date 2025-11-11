import crypto from "crypto";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import { razorpay } from "../config/razorpay.js";
import {
  sendOrderConfirmationEmail,
  sendShipmentEmail,
  sendOrderCompletionEmail,
  sendOrderCancelledEmail,
} from "../middleware/email.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@sacmtb.com";

/* ----------------------------- Create Order ----------------------------- */
export const createOrder = async (req, res) => {
  const { orderItems, shippingAddress, itemsPrice, taxPrice, shippingPrice, totalPrice, paymentMethod } = req.body;

  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!orderItems || orderItems.length === 0) return res.status(400).json({ message: "No items in the order" });

    const order = await Order.create({
      user: req.user._id,
      orderItems,
      shippingAddress,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      status: paymentMethod === "COD" ? "waiting" : "cart",
      isPaid: paymentMethod === "COD" ? true : false,
      paymentInfo: paymentMethod === "COD" ? { status: "COD" } : {},
    });

    await order.populate("user", "name email");

    // 🧾 Send emails for COD immediately
    if (paymentMethod === "COD") {
      try {
        await sendOrderConfirmationEmail(order.user.email, order); // customer
        console.log(`✅ Order confirmation email sent to customer ${order.user.email}`);

        // Admin notification
        await sendOrderConfirmationEmail(ADMIN_EMAIL, order);
        console.log(`📩 Order notification sent to admin ${ADMIN_EMAIL}`);
      } catch (err) {
        console.error("❌ Failed to send COD emails:", err);
      }
      return res.json({ success: true, order });
    }

    // 💳 Online payment: create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: totalPrice * 100,
      currency: "INR",
      receipt: `rcpt_${order._id}`,
    });

    res.json({ success: true, order, razorpayOrder });
  } catch (err) {
    console.error("❌ Error creating order:", err);
    res.status(500).json({ message: "Failed to create order" });
  }
};

/* ----------------------------- Verify Payment ----------------------------- */
export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature)
      return res.status(400).json({ message: "Payment verification failed" });

    const order = await Order.findById(orderId).populate("user", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });

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

    // Reduce stock
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock = Math.max(product.stock - item.qty, 0);
        await product.save();
      }
    }

    // Send confirmation emails
    try {
      await sendOrderConfirmationEmail(order.user.email, order); // customer
      await sendOrderConfirmationEmail(ADMIN_EMAIL, order); // admin
      console.log("✅ Payment verified emails sent to customer & admin");
    } catch (err) {
      console.error("❌ Failed to send payment confirmation emails:", err);
    }

    res.json({ success: true, message: "Payment verified & order confirmed", order });
  } catch (err) {
    console.error("❌ Payment verification error:", err);
    res.status(500).json({ message: "Payment verification failed" });
  }
};

/* ----------------------------- Update Order Status (Admin) ----------------------------- */
export const updateOrderStatus = async (req, res) => {
  const { status, deliveryPartner, trackingId, cancellationReason } = req.body;

  try {
    const order = await Order.findById(req.params.id).populate("user", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // SHIPPING
    if (status === "shipping") {
      if (!deliveryPartner || !trackingId)
        return res.status(400).json({ message: "Missing tracking details" });

      const dp = deliveryPartner.toLowerCase().trim();
      let trackingLink = "";
      if (dp.includes("delhivery")) trackingLink = `https://www.delhivery.com/tracking/${trackingId}`;
      else if (dp.includes("bluedart")) trackingLink = `https://www.bluedart.com/tracking?trackno=${trackingId}`;
      else if (dp.includes("ekart")) trackingLink = `https://ekartlogistics.com/status/${trackingId}`;
      else if (dp.includes("xpressbees")) trackingLink = `https://www.xpressbees.com/track-shipment/${trackingId}`;

      Object.assign(order, {
        status: "shipping",
        isShipped: true,
        shippedAt: Date.now(),
        deliveryPartner,
        trackingId,
        trackingLink,
      });

      await order.save();

      try {
        await sendShipmentEmail(order.user.email, order);
        await sendShipmentEmail(ADMIN_EMAIL, order);
        console.log("📦 Shipment emails sent to customer & admin");
      } catch (err) {
        console.error("❌ Failed to send shipment emails:", err);
      }

      return res.json({ success: true, message: "Shipment updated & emails sent", order });
    }

    // COMPLETED
    if (status === "completed") {
      order.status = "completed";
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      await order.save();

      try {
        await sendOrderCompletionEmail(order.user.email, order);
        await sendOrderCompletionEmail(ADMIN_EMAIL, order);
        console.log("✅ Completion emails sent");
      } catch (err) {
        console.error("❌ Failed to send completion emails:", err);
      }

      return res.json({ success: true, message: "Order marked completed", order });
    }

    // CANCELLED
    if (status === "cancelled") {
      order.status = "cancelled";
      if (cancellationReason) order.cancellationReason = cancellationReason;
      await order.save();

      try {
        await sendOrderCancelledEmail(order.user.email, order);
        await sendOrderCancelledEmail(ADMIN_EMAIL, order);
        console.log("⚠️ Cancellation emails sent");
      } catch (err) {
        console.error("❌ Failed to send cancellation emails:", err);
      }

      return res.json({ success: true, message: "Order cancelled", order });
    }

    // WAITING
    if (status === "waiting") {
      order.status = "waiting";
      await order.save();
      return res.json({ success: true, message: "Order moved to waiting", order });
    }

    return res.status(400).json({ message: "Invalid order status" });
  } catch (err) {
    console.error("❌ Error updating order status:", err);
    res.status(500).json({ message: "Failed to update order status" });
  }
};
