import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import Product from "../models/productModel.js";
import streamifier from "streamifier";
import NodeCache from "node-cache";

const router = express.Router();
const cache = new NodeCache({ stdTTL: 300 }); // 5 min cache

// =======================
// Multer Setup
// =======================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ===========================================================
// 🛍️ PRODUCT ROUTES (OPTIMIZED)
// ===========================================================

// ✅ Get products with pagination + filter + cache
router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    const category = req.query.category;
    const keyword = req.query.search;

    const filter = {};

    if (category) filter.category = category;
    if (keyword)
      filter.name = { $regex: keyword, $options: "i" };

    const cacheKey = `products-${page}-${category}-${keyword}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      return res.status(200).json(cached);
    }

    const products = await Product.find(filter)
      .select("name price image category stock createdAt")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    cache.set(cacheKey, products);

    res.status(200).json(products);
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    res.status(500).json({ message: "Error fetching products" });
  }
});

// ✅ Get single product (optimized)
router.get("/:id", async (req, res) => {
  try {
    const cacheKey = `product-${req.params.id}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      return res.status(200).json(cached);
    }

    const product = await Product.findById(req.params.id)
      .lean();

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    cache.set(cacheKey, product);

    res.status(200).json(product);
  } catch (error) {
    console.error("❌ Error fetching product:", error);
    res.status(500).json({ message: "Error fetching product" });
  }
});

// ✅ Create product
router.post("/", async (req, res) => {
  try {
    if (!req.body.name || !req.body.price)
      return res.status(400).json({ message: "Name and price required" });

    const product = await Product.create(req.body);

    cache.flushAll(); // clear cache after new product

    res.status(201).json(product);
  } catch (error) {
    console.error("❌ Error creating product:", error);
    res.status(500).json({ message: "Error creating product" });
  }
});

// ✅ Update product
router.put("/:id", async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).lean();

    if (!updated)
      return res.status(404).json({ message: "Product not found" });

    cache.flushAll();

    res.status(200).json(updated);
  } catch (error) {
    console.error("❌ Error updating product:", error);
    res.status(500).json({ message: "Error updating product" });
  }
});

// ✅ Delete product
router.delete("/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);

    cache.flushAll();

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting product:", error);
    res.status(500).json({ message: "Error deleting product" });
  }
});

export default router;
