// models/reviewModel.js
import mongoose from "mongoose";
import Product from "./productModel.js";

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// 🧮 Function to calculate average rating and update product
async function calculateAverageRating(productId) {
  const result = await mongoose.model("Review").aggregate([
    { $match: { productId } },
    {
      $group: {
        _id: "$productId",
        averageRating: { $avg: "$rating" },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      rating: result[0].averageRating.toFixed(1),
      numReviews: result[0].numReviews,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      rating: 0,
      numReviews: 0,
    });
  }
}

// 🧩 Hooks to auto-update product after save/delete
reviewSchema.post("save", async function () {
  await calculateAverageRating(this.productId);
});

reviewSchema.post("remove", async function () {
  await calculateAverageRating(this.productId);
});

const Review = mongoose.model("Review", reviewSchema);
export default Review;
