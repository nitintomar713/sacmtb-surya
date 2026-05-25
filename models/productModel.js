// models/Product.js

import mongoose from "mongoose";
import slugify from "slugify";

const productSchema = new mongoose.Schema(

  {

    /* =========================================
       🆔 BASIC PRODUCT INFO
    ========================================= */

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
      default: "",
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

    /* =========================================
       🏷 CATEGORY
    ========================================= */

    category: {
      type: String,
      required: true,
      enum: [
        "Bicycle",
        "Toys",
      ],
      index: true,
    },

    type: {
      type: String,
      required: true,
      index: true,
    },

    /* =========================================
       💰 PRICING
    ========================================= */

    price: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },

    discountPrice: {
      type: Number,
      default: 0,
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

    /* =========================================
       📝 CONTENT
    ========================================= */

    description: {
      type: String,
      default: "",
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

    /* =========================================
       ✨ FEATURES
    ========================================= */

    features: [

      {

        title: {
          type: String,
          default: "",
        },

        desc: {
          type: String,
          default: "",
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

    /* =========================================
       📏 PRODUCT VARIANTS
    ========================================= */

    sizes: [

      {

        size: {
          type: String,
          default: "",
        },

        price: {
          type: Number,
          default: 0,
        },

        stock: {
          type: Number,
          default: 0,
        },

        sku: {
          type: String,
          default: "",
        },

      },

    ],

    /* =========================================
       🎨 COLOR OPTIONS
    ========================================= */

    colorOptions: [

      {

        name: {
          type: String,
          default: "",
        },

        code: {
          type: String,
          default: "#ffffff",
        },

        images: [

          {
            type: String,
          },

        ],

      },

    ],

    /* =========================================
       📊 SPECIFICATIONS
    ========================================= */

    specifications: {

      type: Map,

      of: String,

      default: {},
    },

    /* =========================================
       🖼 MAIN MEDIA
    ========================================= */

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

    /* =========================================
       🎥 EXPERIENCE MEDIA
    ========================================= */

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

    /* =========================================
       🎨 DYNAMIC UI THEMES
    ========================================= */

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
      enum: [
        "dark",
        "light",
      ],
      default: "dark",
    },

    stickyEnabled: {
      type: Boolean,
      default: true,
    },

    /* =========================================
       ⭐ REVIEWS
    ========================================= */

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

        name: {
          type: String,
          default: "",
        },

        image: {
          type: String,
          default: "",
        },

        rating: {
          type: Number,
          default: 5,
        },

        comment: {
          type: String,
          default: "",
        },

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

    /* =========================================
       🎛 SECTION CONTROLS
    ========================================= */

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

    /* =========================================
       🔍 SEO
    ========================================= */

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

    /* =========================================
       🚲 LEGACY FIELDS
    ========================================= */

    wheelSize: {
      type: String,
      default: "",
    },

    frameMaterial: {
      type: String,
      default: "",
    },

    suspension: {
      type: String,
      default: "",
    },

    brakeType: {
      type: String,
      default: "",
    },

    gears: {
      type: String,
      default: "",
    },

    weight: {
      type: String,
      default: "",
    },

  },

  {
    timestamps: true,
  }

);

/* =========================================
   🔥 INDEXES
========================================= */

productSchema.index({

  name: "text",

  description: "text",

  seoTitle: "text",

});

productSchema.index({

  category: 1,

  type: 1,

  price: 1,

});

productSchema.index({

  showInHomepage: 1,

  displayOrder: 1,

});

/* =========================================
   🔗 AUTO SLUG
========================================= */

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

/* =========================================
   📦 STOCK METHOD
========================================= */

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

/* =========================================
   🚀 MODEL
========================================= */

const Product = mongoose.model(
  "Product",
  productSchema
);

export default Product;