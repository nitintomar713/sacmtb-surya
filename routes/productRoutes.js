import express from "express";
import multer from "multer";
import Product from "../models/productModel.js";
import NodeCache from "node-cache";

const router = express.Router();

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
   Supports:
   - category
   - type
   - search
   - pagination
========================================= */

router.get("/", async (req, res) => {

  try {

    let page =
      Number(req.query.page) || 1;

    if (page < 1) page = 1;

    const limit = 12;

    const skip =
      (page - 1) * limit;

    const {
      category,
      type,
      search,
    } = req.query;

    const filter = {};

    /* =========================================
       CATEGORY FILTER
    ========================================= */

    if (category) {

      filter.category = {
        $regex: `^${category}$`,
        $options: "i",
      };
    }

    /* =========================================
       TYPE FILTER
    ========================================= */

    if (type) {

      filter.type = {
        $regex: `^${type}$`,
        $options: "i",
      };
    }

    /* =========================================
       TEXT SEARCH
    ========================================= */

    if (search) {

      filter.$text = {
        $search: search,
      };
    }

    /* =========================================
       CACHE
    ========================================= */

    const cacheKey =
      `products-${page}-${category || "all"}-${type || "all"}-${search || "none"}`;

    const cached =
      cache.get(cacheKey);

    if (cached) {

      return res
        .status(200)
        .json(cached);
    }

    /* =========================================
       FETCH PRODUCTS
    ========================================= */

    const products =
      await Product.find(filter)

      .select(`
        name
        slug
        thumbnail
        imageUrls
        price
        discountPrice
        category
        type
        stock
        rating
        isFeatured
        showInHomepage
        themeColor
        secondaryColor
        accentColor
        createdAt
      `)

      .skip(skip)

      .limit(limit)

      .sort({
        createdAt: -1,
      })

      .lean();

    const total =
      await Product.countDocuments(
        filter
      );

    const response = {

      products,

      total,

      page,

      pages:
        Math.ceil(total / limit),
    };

    cache.set(cacheKey, response);

    res.status(200).json(response);

  } catch (error) {

    console.error(
      "❌ Error fetching products:",
      error
    );

    res.status(500).json({
      message:
        "Error fetching products",
    });
  }
});

/* =========================================
   GET FEATURED PRODUCTS
========================================= */

router.get(
  "/homepage/featured",
  async (req, res) => {

    try {

      const products =
        await Product.find({

          showInHomepage: true,

        })

        .limit(8)

        .sort({
          createdAt: -1,
        })

        .lean();

      res.status(200).json(
        products
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({

        message:
          "Error fetching featured products",

      });
    }
  }
);

/* =========================================
   GET PRODUCT BY SLUG
========================================= */

router.get(
  "/slug/:slug",
  async (req, res) => {

    try {

      const product =
        await Product.findOne({

          slug: req.params.slug,

        }).lean();

      if (!product) {

        return res.status(404).json({

          message:
            "Product not found",

        });
      }

      res.status(200).json(
        product
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({

        message:
          "Error fetching product",

      });
    }
  }
);

/* =========================================
   GET SINGLE PRODUCT
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

    cache.set(cacheKey, product);

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

    });
  }
});

/* =========================================
   RELATED PRODUCTS
========================================= */

router.get(
  "/:id/related",
  async (req, res) => {

    try {

      const currentProduct =
        await Product.findById(
          req.params.id
        );

      if (!currentProduct) {

        return res.status(404).json({

          message:
            "Product not found",

        });
      }

      const relatedProducts =
        await Product.find({

          _id: {
            $ne:
              currentProduct._id,
          },

          category:
            currentProduct.category,

        })

        .limit(6)

        .lean();

      res.status(200).json(
        relatedProducts
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({

        message:
          "Error fetching related products",

      });
    }
  }
);

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
      specifications,

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

    let specs = specifications;

    if (
      typeof specifications ===
      "string"
    ) {

      specs =
        JSON.parse(specifications);
    }

    const product =
      await Product.create({

        ...req.body,

        specifications: specs,

        themeColor:
          req.body.themeColor ||
          "#9dff00",

        secondaryColor:
          req.body.secondaryColor ||
          "#050505",

        accentColor:
          req.body.accentColor ||
          "#ffffff",

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

    });
  }
});

/* =========================================
   UPDATE PRODUCT
========================================= */

router.put("/:id", async (req, res) => {

  try {

    const updated =
      await Product.findByIdAndUpdate(

        req.params.id,

        {
          $set: req.body,
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

    });
  }
});

export default router;