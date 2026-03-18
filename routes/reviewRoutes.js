import express from "express";
import {
  addReview,
  getReviewsByProduct,
  deleteReview,
} from "../middleware/reviewMiddleware.js";

import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Add review (logged-in user only)
router.post("/", protect, addReview);

// Get reviews (public)
router.get("/:productId", getReviewsByProduct);

// Delete review (admin only)
router.delete("/:id", protect, admin, deleteReview);

export default router;