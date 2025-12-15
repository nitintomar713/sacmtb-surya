// routes/paymentRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createRazorpayOrder,
  verifyPayment,
} from "../middleware/paymentMiddleware.js";

const router = express.Router();

/* ============================================================
   1️⃣ CREATE RAZORPAY ORDER
   Requires: orderId (created by /orders/create)
   Protected → Only logged-in users can initiate payment
============================================================ */
router.post("/create-order", protect, createRazorpayOrder);

/* ============================================================
   2️⃣ VERIFY PAYMENT (After Razorpay success)
   Protected → Must verify the correct user’s order
============================================================ */
router.post("/verify", protect, verifyPayment);

export default router;
