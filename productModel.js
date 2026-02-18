import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true, // Faster search
    },

    brand: {
      type: String,
      default: "SAC MTB",
      trim: true,
    },

    modelNumber: {
      type: String,
      trim: true,
    },

    type: {
      type: String,
      enum: ["MTB", "Road", "Hybrid", "Kids", "Ladies"],
      default: "MTB",
      index: true,
    },

    description: {
      type: String,
      trim: true,
    },

    bulletPoints: [
      {
        type: String,
        trim: true,
      },
    ],

    price: {
      type: Number,
      required: true,
      index: true,
    },

    discountPrice: {
      type: Number,
    },

    category: {
      type: String,
      default: "Bicycle",
      index: true,
    },

    colorOptions: [{ type: String }],

    wheelSize: {
      type: String,
      index: true,
    },

    frameMaterial: String,
    suspension: String,
    brakeType: String,
    gears: String,
    weight: String,

    stock: {
      type: Number,
      default: 0,
      index: true,
    },

    imageUrls: [
      {
        type: String,
      },
    ],

    videoUrl: String,

    rating: {
      type: Number,
      default: 0,
      index: true,
    },

    numReviews: {
      type: Number,
      default: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);



// ============================
// 🔥 PERFORMANCE INDEXES
// ============================

// Compound index for filtering + sorting
productSchema.index({ category: 1, createdAt: -1 });

// Search index
productSchema.index({ name: "text", description: "text" });

// Featured products quick load
productSchema.index({ isFeatured: 1, createdAt: -1 });



// ============================
// 📦 STOCK METHODS (Optimized)
// ============================

productSchema.methods.decreaseStock = async function (quantity) {
  if (this.stock >= quantity) {
    this.stock -= quantity;
    await this.save({ validateBeforeSave: false });
  } else {
    throw new Error("Not enough stock");
  }
};

productSchema.methods.increaseStock = async function (quantity) {
  this.stock += quantity;
  await this.save({ validateBeforeSave: false });
};

const Product = mongoose.model("Product", productSchema);

export default Product;
