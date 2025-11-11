// controllers/reviewController.js
import Review from "../models/reviewModel.js";

// ➕ Add a review
export const addReview = async (req, res) => {
  try {
    const { productId, name, rating, comment, userId } = req.body;

    if (!productId || !name || !rating || !comment) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const review = await Review.create({
      productId,
      name,
      rating,
      comment,
      userId,
    });

    res.status(201).json({ message: "Review added successfully", review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📖 Get all reviews for a product
export const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ productId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🗑 Delete a review (admin or same user)
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    await review.remove();
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
