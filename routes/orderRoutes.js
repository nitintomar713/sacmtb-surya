import express from "express";
import { protect, admin } from "../middleware/authMiddleware.js";

import {
  createOrder,
  updateOrderStatus,
  getOrderById,
  getMyOrders,
  getAllOrders,
} from "../middleware/orderMiddleware.js";

const router = express.Router();

/* ============================================================
   1️⃣ CREATE ORDER (COD ONLY)
   Online payments use: /api/payments/create-order
============================================================ */
router.post("/create", protect, createOrder);

/* ============================================================
   2️⃣ GET ORDER OF LOGGED-IN USER
============================================================ */
router.get("/myorders", protect, getMyOrders);

/* ============================================================
   3️⃣ GET ALL ORDERS (ADMIN ONLY)
============================================================ */
router.get("/", protect, admin, getAllOrders);

/* ============================================================
   4️⃣ GET SINGLE ORDER (USER / ADMIN)
============================================================ */
router.get("/:id", protect, getOrderById);

/* ============================================================
   5️⃣ UPDATE ORDER STATUS (ADMIN)
============================================================ */
router.put("/:id/status", protect, admin, updateOrderStatus);

export default router;
