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

    badge: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "active",
        "draft",
        "outofstock",
      ],
      default: "active",
    },

    displayOrder: {
      type: Number,
      default: 0,
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

    deliveryInfo: {
      type: String,
      default:
        "Free Delivery Available",
    },

    warranty: {
      type: String,
      default: "",
    },

    /* ============================
       📝 CONTENT & MARKETING
    ============================ */

    description: {
      type: String,
      trim: true,
    },

    heroTitle: {
      type: String,
      default: "",
    },

    heroSubtitle: {
      type: String,
      default: "",
    },

    heroDescription: {
      type: String,
      default: "",
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

        icon: {
          type: String,
          default: "",
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
      default: "",
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

    rotationSpeed: {
      type: Number,
      default: 30,
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

    stickyEnabled: {
      type: Boolean,
      default: true,
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
       🎛️ SECTION CONTROLS
    ============================ */

    showStorySection: {
      type: Boolean,
      default: true,
    },

    showExperienceSection: {
      type: Boolean,
      default: true,
    },

    showReviewsSection: {
      type: Boolean,
      default: true,
    },

    showSpecificationsSection: {
      type: Boolean,
      default: true,
    },

    /* ============================
       🔍 SEO
    ============================ */

    seoTitle: {
      type: String,
      default: "",
    },

    seoDescription: {
      type: String,
      default: "",
    },

    seoKeywords: [
      {
        type: String,
      },
    ],

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

// SEARCH INDEX

productSchema.index({
  name: "text",
  description: "text",
  seoTitle: "text",
});

// FILTER INDEX

productSchema.index({
  category: 1,
  type: 1,
  price: 1,
});

// HOMEPAGE INDEX

productSchema.index({
  showInHomepage: 1,
  displayOrder: 1,
});

// FEATURED INDEX

productSchema.index({
  isFeatured: 1,
});

/* ============================
   🛠️ MIDDLEWARE
============================ */

// AUTO SLUG

productSchema.pre(
  "save",
  function (next) {

    if (
      this.isModified("name")
    ) {

      this.slug = slugify(
        this.name,
        {
          lower: true,
          strict: true,
        }
      );
    }

    next();
  }
);

/* ============================
   📦 STOCK METHODS
============================ */

productSchema.methods.decreaseStock =
async function (quantity) {

  if (
    this.stock >= quantity
  ) {

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