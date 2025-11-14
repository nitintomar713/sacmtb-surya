import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import Product from "../models/productModel.js";
import streamifier from "streamifier";

const router = express.Router();

// ✅ Memory storage & file size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

// ✅ Confirm Cloudinary configuration
console.log("☁️ Cloudinary configured:", cloudinary.config().cloud_name);


// ===========================================================
// 🛍️ PRODUCT CRUD ROUTES
// ===========================================================

// ✅ Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({});
    res.status(200).json(products);
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    res.status(500).json({ message: "Error fetching products" });
  }
});

// ✅ Get single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
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
      return res.status(400).json({ message: "Name and price are required" });

    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    console.error("❌ Error creating product:", error);
    res.status(500).json({ message: "Error creating product" });
  }
});

// ✅ Update product
router.put("/:id", async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Product not found" });
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
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting product:", error);
    res.status(500).json({ message: "Error deleting product" });
  }
});

// ===========================================================
// ☁️ CLOUDINARY UPLOADS
// ===========================================================

// 🟢 Upload multiple images
router.post("/upload-images", upload.array("images", 5), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ message: "No images provided" });

    const uploadPromises = req.files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "sac_products",
              resource_type: "image",
              transformation: [{ width: 1000, crop: "limit" }],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          );
          streamifier.createReadStream(file.buffer).pipe(stream);
        })
    );

    const imageUrls = await Promise.all(uploadPromises);
    res.status(200).json({ success: true, message: "Images uploaded", imageUrls });
  } catch (error) {
    console.error("❌ Image upload failed:", error);
    res.status(500).json({ message: "Image upload failed", error: error.message });
  }
});

// 🟢 Upload single video
router.post("/upload-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No video provided" });

    const videoUrl = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "sac_videos",
          resource_type: "video",
          chunk_size: 6000000,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    res.status(200).json({ success: true, videoUrl });
  } catch (error) {
    console.error("❌ Video upload failed:", error);
    res.status(500).json({ message: "Video upload failed", error: error.message });
  }
});

export default router;
