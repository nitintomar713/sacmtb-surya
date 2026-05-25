// routes/productRoutes.js

import express from "express";
import multer from "multer";
import Product from "../models/productModel.js";
import NodeCache from "node-cache";

const router = express.Router();

/* =========================================
   CACHE
========================================= */

const cache = new NodeCache({
  stdTTL: 300,
});

/* =========================================
   MULTER
========================================= */

const upload = multer({

  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/* =========================================
   GET PRODUCTS
========================================= */

router.get("/", async (req, res) => {

  try {

    let page =
      Number(req.query.page) || 1;

    if (page < 1)
      page = 1;

    const limit =
      Math.min(
        Number(req.query.limit) || 12,
        50
      );

    const skip =
      (page - 1) * limit;

    const {
      category,
      type,
      search,
      featured,
      homepage,
      status,
    } = req.query;

    /* =========================================
       FILTER
    ========================================= */

    const filter = {

      $or: [

        { status: "active" },

        {
          status: {
            $exists: false
          }
        }
      ]
    };

    if (category) {

      filter.category = {

        $regex: `^${category}$`,

        $options: "i",
      };
    }

    if (type) {

      filter.type = {

        $regex: `^${type}$`,

        $options: "i",
      };
    }

    if (featured === "true") {

      filter.isFeatured = true;
    }

    if (homepage === "true") {

      filter.showInHomepage = true;
    }

    if (status) {

      filter.status = status;
    }

    if (search) {

      filter.$text = {

        $search: search,
      };
    }

    /* =========================================
       CACHE KEY
    ========================================= */

    const cacheKey =

      `products-${page}-${limit}-${category || "all"}-${type || "all"}-${search || "none"}-${featured || "false"}-${homepage || "false"}-${status || "active"}`;

    const cached =
      cache.get(cacheKey);

    if (cached) {

      return res
        .status(200)
        .json(cached);
    }

    /* =========================================
       QUERY
    ========================================= */

    let query =
      Product.find(

        filter,

        search

        ? {
            score: {
              $meta:
              "textScore",
            },
          }

        : {}

      )

      .select(`

        name
        slug

        thumbnail
        imageUrls

        badge

        price
        discountPrice

        category
        type

        stock

        sizes

        rating
        numReviews

        themeColor
        secondaryColor
        accentColor

        deliveryInfo
        warranty

        isFeatured
        showInHomepage

        status
        displayOrder

        createdAt

      `)

      .skip(skip)

      .limit(limit);

    /* =========================================
       SORT
    ========================================= */

    if (search) {

      query = query.sort({

        score: {
          $meta:
          "textScore",
        },
      });

    } else {

      query = query.sort({

        displayOrder: 1,

        createdAt: -1,
      });
    }

    const products =
      await query.lean();

    const total =
      await Product.countDocuments(
        filter
      );

    const response = {

      products,

      total,

      page,

      pages:

        Math.max(
          1,
          Math.ceil(total / limit)
        ),
    };

    cache.set(
      cacheKey,
      response
    );

    res.status(200).json(
      response
    );

  } catch (error) {

    console.error(
      "❌ Error fetching products:",
      error
    );

    res.status(500).json({

      success:false,

      message:
      "Error fetching products",

      error:
      error.message,
    });
  }
});

/* =========================================
   HOMEPAGE PRODUCTS
========================================= */

router.get(
  "/homepage/featured",
  async (req, res) => {

    try {

      const cacheKey =
        "homepage-products";

      const cached =
        cache.get(cacheKey);

      if (cached) {

        return res
          .status(200)
          .json(cached);
      }

      const products =
        await Product.find({

          showInHomepage: true,

          $or: [

            { status: "active" },

            {
              status: {
                $exists: false
              }
            }
          ]
        })

        .sort({

          displayOrder: 1,

          createdAt: -1,

        })

        .limit(8)

        .lean();

      cache.set(
        cacheKey,
        products
      );

      res.status(200).json(
        products
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({

        message:
          "Error fetching homepage products",

        error:
          error.message,
      });
    }
  }
);

/* =========================================
   FEATURED PRODUCTS
========================================= */

router.get(
  "/featured/all",
  async (req, res) => {

    try {

      const cacheKey =
        "featured-products";

      const cached =
        cache.get(cacheKey);

      if (cached) {

        return res
          .status(200)
          .json(cached);
      }

      const products =
        await Product.find({

          isFeatured: true,

          $or: [

            { status: "active" },

            {
              status: {
                $exists: false
              }
            }
          ]
        })

        .sort({

          displayOrder: 1,

        })

        .lean();

      cache.set(
        cacheKey,
        products
      );

      res.status(200).json(
        products
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({

        message:
          "Error fetching featured products",

        error:
          error.message,
      });
    }
  }
);

/* =========================================
   PRODUCT BY SLUG
========================================= */

router.get(
  "/slug/:slug",
  async (req, res) => {

    try {

      const cacheKey =
        `slug-${req.params.slug}`;

      const cached =
        cache.get(cacheKey);

      if (cached) {

        return res
          .status(200)
          .json(cached);
      }

      const product =
        await Product.findOne({

          slug:
            req.params.slug,

          $or: [

            { status: "active" },

            {
              status: {
                $exists: false
              }
            }
          ]

        }).lean();

      if (!product) {

        return res.status(404).json({

          message:
            "Product not found",

        });
      }

      cache.set(
        cacheKey,
        product
      );

      res.status(200).json(
        product
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({

        message:
          "Error fetching product",

        error:
          error.message,
      });
    }
  }
);

/* =========================================
   SINGLE PRODUCT
========================================= */

router.get("/:id", async (req, res) => {

  try {

    const cacheKey =
      `product-${req.params.id}`;

    const cached =
      cache.get(cacheKey);

    if (cached) {

      return res
        .status(200)
        .json(cached);
    }

    const product =
      await Product.findById(
        req.params.id
      ).lean();

    if (!product) {

      return res.status(404).json({

        message:
          "Product not found",

      });
    }

    cache.set(
      cacheKey,
      product
    );

    res.status(200).json(
      product
    );

  } catch (error) {

    console.error(
      "❌ Error fetching product:",
      error
    );

    res.status(500).json({

      message:
        "Error fetching product",

      error:
      error.message,
    });
  }
});

/* =========================================
   CREATE PRODUCT
========================================= */

router.post("/", async (req, res) => {

  try {

    const {

      name,
      price,
      category,
      type,
    } = req.body;

    if (
      !name ||
      !price ||
      !category ||
      !type
    ) {

      return res.status(400).json({

        message:
          "Name, price, category and type are required",

      });
    }

    /* =========================================
       SPECIFICATIONS
    ========================================= */

    let specifications =
      req.body.specifications || {};

    if (
      typeof specifications ===
      "string"
    ) {

      specifications =
        JSON.parse(specifications);
    }

    /* =========================================
       SEO KEYWORDS
    ========================================= */

    let seoKeywords =
      req.body.seoKeywords || [];

    if (
      typeof seoKeywords ===
      "string"
    ) {

      seoKeywords =

        seoKeywords

          .split(",")

          .map((k)=>
            k.trim()
          );
    }

    /* =========================================
       VARIANTS
    ========================================= */

    let sizes =
      req.body.sizes || [];

    if (
      typeof sizes ===
      "string"
    ) {

      sizes =
        JSON.parse(sizes);
    }

    sizes = sizes.map((item)=>({

      size:
        item.size || "",

      price:
        Number(item.price) || 0,

      stock:
        Number(item.stock) || 0,

      sku:
        item.sku || "",
    }));

    /* =========================================
       COLORS
    ========================================= */

    let colorOptions =
      req.body.colorOptions || [];

    if (
      typeof colorOptions ===
      "string"
    ) {

      colorOptions =
        JSON.parse(colorOptions);
    }

    const product =
      await Product.create({

        ...req.body,

        price:
          Number(req.body.price),

        discountPrice:
          Number(
            req.body.discountPrice
          ) || 0,

        stock:
          Number(req.body.stock
          ) || 0,

        displayOrder:
          Number(
            req.body.displayOrder
          ) || 0,

        specifications,

        seoKeywords,

        sizes,

        colorOptions,

        themeColor:
          req.body.themeColor ||
          "#9dff00",

        secondaryColor:
          req.body.secondaryColor ||
          "#050505",

        accentColor:
          req.body.accentColor ||
          "#ffffff",

        status:
          req.body.status ||
          "active",
      });

    cache.flushAll();

    res.status(201).json(
      product
    );

  } catch (error) {

    console.error(
      "❌ Error creating product:",
      error
    );

    res.status(500).json({

      message:
        "Error creating product",

      error:
        error.message,
    });
  }
});

/* =========================================
   UPDATE PRODUCT
========================================= */

router.put("/:id", async (req, res) => {

  try {

    /* =========================================
       SPECIFICATIONS
    ========================================= */

    let specifications =
      req.body.specifications || {};

    if (
      typeof specifications ===
      "string"
    ) {

      specifications =
        JSON.parse(specifications);
    }

    /* =========================================
       SEO KEYWORDS
    ========================================= */

    let seoKeywords =
      req.body.seoKeywords || [];

    if (
      typeof seoKeywords ===
      "string"
    ) {

      seoKeywords =

        seoKeywords

          .split(",")

          .map((k)=>
            k.trim()
          );
    }

    /* =========================================
       VARIANTS
    ========================================= */

    let sizes =
      req.body.sizes || [];

    if (
      typeof sizes ===
      "string"
    ) {

      sizes =
        JSON.parse(sizes);
    }

    sizes = sizes.map((item)=>({

      size:
        item.size || "",

      price:
        Number(item.price) || 0,

      stock:
        Number(item.stock) || 0,

      sku:
        item.sku || "",
    }));

    /* =========================================
       COLORS
    ========================================= */

    let colorOptions =
      req.body.colorOptions || [];

    if (
      typeof colorOptions ===
      "string"
    ) {

      colorOptions =
        JSON.parse(colorOptions);
    }

    /* =========================================
       UPDATE
    ========================================= */

    const updated =
      await Product.findByIdAndUpdate(

        req.params.id,

        {

          $set: {

            ...req.body,

            price:
              Number(req.body.price),

            discountPrice:
              Number(
                req.body.discountPrice
              ) || 0,

            stock:
              Number(req.body.stock
              ) || 0,

            displayOrder:
              Number(
                req.body.displayOrder
              ) || 0,

            specifications,

            seoKeywords,

            sizes,

            colorOptions,
          },
        },

        {

          new: true,

          runValidators: true,
        }

      ).lean();

    if (!updated) {

      return res.status(404).json({

        message:
          "Product not found",

      });
    }

    cache.flushAll();

    res.status(200).json(
      updated
    );

  } catch (error) {

    console.error(
      "❌ Error updating product:",
      error
    );

    res.status(500).json({

      message:
        "Error updating product",

      error:
        error.message,
    });
  }
});

/* =========================================
   DELETE PRODUCT
========================================= */

router.delete("/:id", async (req, res) => {

  try {

    const deleted =
      await Product.findByIdAndDelete(
        req.params.id
      );

    if (!deleted) {

      return res.status(404).json({

        message:
          "Product not found",

      });
    }

    cache.flushAll();

    res.status(200).json({

      message:
        "Product deleted successfully",

    });

  } catch (error) {

    console.error(
      "❌ Error deleting product:",
      error
    );

    res.status(500).json({

      message:
        "Error deleting product",

      error:
      error.message,
    });
  }
});

export default router;