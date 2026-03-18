import mongoose from "mongoose";

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
      required: true,
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

/* ================= INDEXES ================= */
reviewSchema.index({ productId: 1 });
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

/* ================= CALCULATE RATING ================= */
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

  const Product = mongoose.model("Product");

  if (result.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      rating: Number(result[0].averageRating.toFixed(1)),
      numReviews: result[0].numReviews,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      rating: 0,
      numReviews: 0,
    });
  }
}

/* ================= HOOKS ================= */

// After save
reviewSchema.post("save", async function () {
  await calculateAverageRating(this.productId);
});

// After delete (FIXED)
reviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await calculateAverageRating(doc.productId);
  }
});

const Review = mongoose.model("Review", reviewSchema);

export default Review;