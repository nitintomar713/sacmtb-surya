import Review from "../models/reviewModel.js";

// ➕ Add Review
export const addReview = async (req, res) => {
  try {
    const { productId, name, rating, comment } = req.body;

    if (!productId || !name || !rating || !comment) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Rating validation
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be 1-5" });
    }

    // Prevent duplicate review
    const existingReview = await Review.findOne({
      productId,
      userId: req.user._id,
    });

    if (existingReview) {
      return res.status(400).json({
        message: "You already reviewed this product",
      });
    }

    const review = await Review.create({
      productId,
      name,
      rating,
      comment,
      userId: req.user._id, // ✅ secure
    });

    res.status(201).json({
      message: "Review added successfully",
      review,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📖 Get Reviews
export const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ productId })
      .sort({ createdAt: -1 });

    res.json(reviews);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🗑 Delete Review
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Authorization check
    if (
      review.userId.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await review.deleteOne();

    res.json({ message: "Review deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};