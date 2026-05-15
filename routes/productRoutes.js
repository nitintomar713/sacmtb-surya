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

    if (page < 1) page = 1;

    /* LIMIT PROTECTION */

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

        { status: { $exists: false } }
      ]
    };

    /* CATEGORY */

    if (category) {

      filter.category = {

        $regex: `^${category}$`,

        $options: "i",
      };
    }

    /* TYPE */

    if (type) {

      filter.type = {

        $regex: `^${type}$`,

        $options: "i",
      };
    }

    /* FEATURED */

    if (featured === "true") {

      filter.isFeatured = true;
    }

    /* HOMEPAGE */

    if (homepage === "true") {

      filter.showInHomepage = true;
    }

    /* STATUS */

    if (status) {

      filter.status = status;
    }

    /* SEARCH */

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

    let query = Product.find(

      filter,

      search
      ? {
          score: {
            $meta: "textScore",
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
          $meta: "textScore",
        },

      });

    } else {

      query = query.sort({

        displayOrder: 1,

        createdAt: -1,
      });
    }

    /* =========================================
       EXECUTE QUERY
    ========================================= */

    const products =
      await query.lean();

    const total =
      await Product.countDocuments(
        filter
      );

    /* =========================================
       RESPONSE
    ========================================= */

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

    /* =========================================
       SAVE CACHE
    ========================================= */

    cache.set(
      cacheKey,
      response
    );

    /* =========================================
       SEND RESPONSE
    ========================================= */

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

          type:
            currentProduct.type,

          $or: [

            { status: "active" },

            {
              status: {
                $exists: false
              }
            }
          ]
        })

        .limit(6)

        .sort({

          rating: -1,

        })

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