import mongoose from "mongoose";
import slugify from "slugify";

const productSchema = new mongoose.Schema(
  {
    /* ============================
       🆔 IDENTITY & BRANDING
    ============================ */
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
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

    /* ============================
       🏷️ CATEGORIZATION
    ============================ */
    category: {
      type: String,
      required: true,
      enum: ["Bicycle", "Toys"], // Main separation
      index: true,
    },
    type: {
      type: String, // e.g., "MTB", "Kids", "Jeeps", "Cars", "Bikes"
      required: true,
      index: true,
    },

    /* ============================
       💰 PRICING & INVENTORY
    ============================ */
    price: {
      type: Number,
      required: true,
      index: true,
    },
    discountPrice: {
      type: Number,
    },
    stock: {
      type: Number,
      default: 0,
      index: true,
    },

    /* ============================
       📝 CONTENT & MARKETING
    ============================ */
    description: {
      type: String,
      trim: true,
    },
    // For your "Features" section (Icon + Title + Description)
    features: [
      {
        title: { type: String },
        desc: { type: String },
      }
    ],
    // For your raw bullet points (existing data)
    bulletPoints: [{ type: String }],

    /* ============================
       📊 TECHNICAL SPECIFICATIONS (DYNAMIC)
    ============================ */
    // For Bicycles: { "Gears": "21 Speed", "Brake": "Dual Disc" }
    // For Toys: { "Battery": "12V", "Motors": "Double Motor" }
    specifications: {
      type: Map,
      of: String,
      default: {},
    },

    /* ============================
       🖼️ MEDIA
    ============================ */
    imageUrls: [{ type: String }],
    videoUrl: {
      type: String,
      default: "",
    },

    /* ============================
       ⭐ REVIEWS & RANKING
    ============================ */
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

    /* ============================
       🚲 LEGACY FIELDS (To keep old data working)
    ============================ */
    wheelSize: String,
    frameMaterial: String,
    suspension: String,
    brakeType: String,
    gears: String,
    weight: String,
    colorOptions: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

/* ============================
   🔥 PERFORMANCE INDEXES
============================ */

// Search indexing for the search bar
productSchema.index({ name: "text", description: "text" });

// Optimized filtering for the Products/Toys pages
productSchema.index({ category: 1, type: 1, price: 1 });

/* ============================
   🛠️ MIDDLEWARE & METHODS
============================ */

// Automatically create a URL-friendly slug from the name
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Stock Management Methods
productSchema.methods.decreaseStock = async function (quantity) {
  if (this.stock >= quantity) {
    this.stock -= quantity;
    return await this.save();
  }
  throw new Error("Insufficient stock available.");
};

const Product = mongoose.model("Product", productSchema);

export default Product;