import express from "express";
import { protect, admin } from "../middleware/authMiddleware.js";
import {
  createOrder,
  verifyPayment,
  updateOrderStatus,
} from "../middleware/orderMiddleware.js";
import Order from "../models/orderModel.js";

const router = express.Router();

/* ----------------------------- Create Order ----------------------------- */
router.post("/create", protect, createOrder); 
// ✅ createOrder middleware now sends order confirmation to customer & admin

/* ----------------------------- Verify Razorpay Payment ----------------------------- */
router.post("/verify", protect, verifyPayment);
// ✅ verifyPayment middleware updates order, reduces stock, and sends emails

/* ----------------------------- Update Order Status (Admin) ----------------------------- */
router.put("/:id/status", protect, admin, updateOrderStatus);
// ✅ Admin can update status (shipping, completed, cancelled)
// 🔹 Shipment emails & notifications are handled inside updateOrderStatus

/* ----------------------------- Get All Orders (Admin) ----------------------------- */
router.get("/", protect, admin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email phone")
      .populate("orderItems.product", "name price image");
    res.json(orders);
  } catch (error) {
    console.error("❌ Failed to fetch all orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/* ----------------------------- Get Orders for Logged-in User ----------------------------- */
router.get("/myorders", protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("user", "name email phone")
      .populate("orderItems.product", "name price image");
    res.json(orders);
  } catch (error) {
    console.error("❌ Failed to fetch user orders:", error);
    res.status(500).json({ message: "Failed to fetch your orders" });
  }
});

export default router;
