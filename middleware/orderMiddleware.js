// middleware/orderMiddleware.js
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import {
  sendOrderConfirmationEmail,
  sendShipmentEmail,
  sendOrderCompletionEmail,
  sendOrderCancelledEmail,
} from "../middleware/email.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@sacmtb.com";

/* ============================================================
   1️⃣ CREATE ORDER (COD ONLY)
============================================================ */
export const createOrder = async (req, res) => {
  console.log("\n📦 [CREATE ORDER] Incoming:", req.body);

  try {
    if (!req.user) {
      console.log("❌ Unauthorized");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      orderItems,
      shippingAddress,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      paymentMethod,
    } = req.body;

    console.log("➡ Payment Method:", paymentMethod);

    // Reject online payments here
    if (paymentMethod !== "COD") {
      console.log("❌ Online payment tried on /orders/create");
      return res.status(400).json({
        message: "Online payments must use /payments/create-order",
      });
    }

    if (!orderItems?.length) {
      console.log("❌ No items provided");
      return res.status(400).json({ message: "No items in order" });
    }

    // 🔍 Validate stock
    console.log("🛒 Checking stock...");
    for (const item of orderItems) {
      const product = await Product.findById(item.product);

      if (!product) {
        console.log("❌ Product missing:", item.product);
        return res.status(404).json({ message: `Product not found: ${item.product}` });
      }

      if (product.stock < item.qty) {
        console.log(`❌ Insufficient stock for ${product.name}`);
        return res.status(400).json({
          message: `Only ${product.stock} left for ${product.name}`,
        });
      }
    }

    console.log("✔ Stock OK");

    // 📝 Create Order
    console.log("📝 Creating COD order...");
    const order = await Order.create({
      user: req.user.id,
      userEmail: req.user.email,
      orderItems,
      shippingAddress,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      paymentMethod: "COD",
      isPaid: true,
      paidAt: Date.now(),
      status: "waiting",
      paymentInfo: { status: "COD" },
    });

    await order.populate("user", "name email");
    console.log("✔ COD Order Created:", order._id);

    // 📉 Deduct stock
    console.log("📉 Updating stock...");
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock = Math.max(0, product.stock - item.qty);
        await product.save();
        console.log(`✔ Stock updated for ${product.name}`);
      }
    }

    // ✉ Email notifications
    console.log("✉ Sending confirmation emails...");
    try {
      await sendOrderConfirmationEmail(order.user.email, order);
      await sendOrderConfirmationEmail(ADMIN_EMAIL, order);
      console.log("✔ Emails sent");
    } catch (emailErr) {
      console.error("❌ Email Error:", emailErr.message);
    }

    return res.status(201).json({ success: true, order });
  } catch (err) {
    console.error("❌ CREATE ORDER ERROR:", err);
    return res.status(500).json({ message: "Failed to create order" });
  }
};

/* ============================================================
   2️⃣ UPDATE ORDER STATUS (Admin)
============================================================ */
export const updateOrderStatus = async (req, res) => {
  console.log("\n🚚 [UPDATE ORDER STATUS]", req.params.id, req.body);

  try {
    const { status, deliveryPartner, trackingId, cancellationReason } = req.body;

    const order = await Order.findById(req.params.id).populate("user", "name email");
    if (!order) {
      console.log("❌ Order not found");
      return res.status(404).json({ message: "Order not found" });
    }

    console.log("➡ Current:", order.status, "| New:", status);

    /* ------------------ SHIPPING ------------------ */
    if (status === "shipping") {
      if (!deliveryPartner || !trackingId) {
        console.log("❌ Missing tracking info");
        return res.status(400).json({ message: "Tracking details missing" });
      }

      order.status = "shipping";
      order.isShipped = true;
      order.shippedAt = Date.now();
      order.deliveryPartner = deliveryPartner;
      order.trackingId = trackingId;

      const dp = deliveryPartner.toLowerCase();
      if (dp.includes("bluedart"))
        order.trackingLink = `https://www.bluedart.com/tracking?trackno=${trackingId}`;
      else if (dp.includes("delhivery"))
        order.trackingLink = `https://www.delhivery.com/tracking/${trackingId}`;
      else if (dp.includes("xpressbees"))
        order.trackingLink = `https://www.xpressbees.com/track-shipment/${trackingId}`;
      else order.trackingLink = "";

      await order.save();

      console.log("✉ Sending shipment emails");
      await sendShipmentEmail(order.user.email, order);
      await sendShipmentEmail(ADMIN_EMAIL, order);

      return res.json({ success: true, order });
    }

    /* ------------------ COMPLETED ------------------ */
    if (status === "completed") {
      order.status = "completed";
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      await order.save();

      await sendOrderCompletionEmail(order.user.email, order);
      await sendOrderCompletionEmail(ADMIN_EMAIL, order);

      return res.json({ success: true, order });
    }

    /* ------------------ CANCELLED ------------------ */
    if (status === "cancelled") {
      order.status = "cancelled";
      order.cancellationReason = cancellationReason || "Cancelled by admin";
      await order.save();

      await sendOrderCancelledEmail(order.user.email, order);
      await sendOrderCancelledEmail(ADMIN_EMAIL, order);

      return res.json({ success: true, order });
    }

    console.log("❌ Invalid status value");
    return res.status(400).json({ message: "Invalid status" });
  } catch (err) {
    console.error("❌ UPDATE ORDER ERROR:", err);
    return res.status(500).json({ message: "Failed to update order status" });
  }
};

/* ============================================================
   3️⃣ GET SINGLE ORDER
============================================================ */
export const getOrderById = async (req, res) => {
  console.log("\n📄 [GET ORDER]", req.params.id);

  try {
    const order = await Order.findById(req.params.id).populate("user", "name email");

    if (!order) {
      console.log("❌ Order not found");
      return res.status(404).json({ message: "Order not found" });
    }

    if (
      !req.user.isAdmin &&
      req.user._id.toString() !== order.user._id.toString()
    ) {
      console.log("❌ Forbidden access");
      return res.status(403).json({ message: "Forbidden" });
    }

    console.log("✔ Order fetched:", order._id);
    return res.json({ success: true, order });
  } catch (err) {
    console.error("❌ GET ORDER ERROR:", err);
    return res.status(500).json({ message: "Failed to get order" });
  }
};

/* ============================================================
   4️⃣ GET USER ORDERS
============================================================ */
export const getMyOrders = async (req, res) => {
  console.log("\n📦 [GET MY ORDERS] User:", req.user._id);

  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    console.log(`✔ Found ${orders.length} orders`);
    return res.json({ success: true, orders });
  } catch (err) {
    console.error("❌ MY ORDERS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
};

/* ============================================================
   5️⃣ GET ALL ORDERS (Admin)
============================================================ */
export const getAllOrders = async (req, res) => {
  console.log("\n📊 [ADMIN] Fetching ALL orders");

  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    const totalAmount = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

    console.log(`✔ Found ${orders.length} orders`);
    return res.json({ success: true, orders, totalAmount });
  } catch (err) {
    console.error("❌ GET ALL ORDERS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
};

export default {
  createOrder,
  updateOrderStatus,
  getOrderById,
  getMyOrders,
  getAllOrders,
};
