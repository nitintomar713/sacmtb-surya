// routes/reviewRoutes.js
import express from "express";
import {
  addReview,
  getReviewsByProduct,
  deleteReview,
} from "../middleware/reviewMiddleware.js";

const router = express.Router();

// POST → Add new review
router.post("/", addReview);

// GET → Get all reviews for one product
router.get("/:productId", getReviewsByProduct);

// DELETE → Delete review by ID
router.delete("/:id", deleteReview);

export default router;
