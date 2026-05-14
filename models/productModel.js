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
      enum: ["Bicycle", "Toys"],
      index: true,
    },

    type: {
      type: String,
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

    storyTitle: {
      type: String,
      default: "",
    },

    storyDescription: {
      type: String,
      default: "",
    },

    /* ============================
       ✨ FEATURES
    ============================ */

    features: [
      {
        title: {
          type: String,
        },

        desc: {
          type: String,
        },
      },
    ],

    bulletPoints: [
      {
        type: String,
      },
    ],

    /* ============================
       📏 PRODUCT VARIANTS
    ============================ */

    sizes: [
      {
        type: String,
      },
    ],

    colorOptions: [
      {
        type: String,
      },
    ],

    /* ============================
       📊 SPECIFICATIONS
    ============================ */

    specifications: {
      type: Map,
      of: String,
      default: {},
    },

    /* ============================
       🖼️ MEDIA
    ============================ */

    thumbnail: {
      type: String,
    },

    imageUrls: [
      {
        type: String,
      },
    ],

    videoUrl: {
      type: String,
      default: "",
    },

    /* ============================
       🎥 EXPERIENCE MEDIA
    ============================ */

    experienceImages: [
      {
        type: String,
      },
    ],

    experienceVideo: {
      type: String,
      default: "",
    },

    /* ============================
       🎨 DYNAMIC UI THEMES
    ============================ */

    themeColor: {
      type: String,
      default: "#9dff00",
    },

    secondaryColor: {
      type: String,
      default: "#050505",
    },

    accentColor: {
      type: String,
      default: "#ffffff",
    },

    themeMode: {
      type: String,
      enum: ["dark", "light"],
      default: "dark",
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

    featuredReviews: [
      {
        name: String,

        image: String,

        rating: Number,

        comment: String,

        verified: {
          type: Boolean,
          default: true,
        },
      },
    ],

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    showInHomepage: {
      type: Boolean,
      default: false,
    },

    /* ============================
       🚲 LEGACY FIELDS
    ============================ */

    wheelSize: String,

    frameMaterial: String,

    suspension: String,

    brakeType: String,

    gears: String,

    weight: String,
  },

  {
    timestamps: true,
  }
);

/* ============================
   🔥 PERFORMANCE INDEXES
============================ */

// Search indexing
productSchema.index({
  name: "text",
  description: "text",
});

// Optimized filtering
productSchema.index({
  category: 1,
  type: 1,
  price: 1,
});

/* ============================
   🛠️ MIDDLEWARE
============================ */

// Auto slug generation

productSchema.pre("save", function (next) {

  if (this.isModified("name")) {

    this.slug = slugify(
      this.name,
      {
        lower: true,
        strict: true,
      }
    );
  }

  next();
});

/* ============================
   📦 STOCK METHODS
============================ */

productSchema.methods.decreaseStock =
async function (quantity) {

  if (this.stock >= quantity) {

    this.stock -= quantity;

    return await this.save();
  }

  throw new Error(
    "Insufficient stock available."
  );
};

/* ============================
   🚀 MODEL
============================ */

const Product = mongoose.model(
  "Product",
  productSchema
);

export default Product;