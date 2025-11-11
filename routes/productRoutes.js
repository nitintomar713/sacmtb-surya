import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import Product from "../models/productModel.js";
import streamifier from "streamifier";

const router = express.Router();

// ✅ Memory storage for uploads
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Confirm Cloudinary config
console.log("☁️ Cloudinary configured:", cloudinary.config().cloud_name);

// ==================== Products CRUD ====================

// ✅ Get all products
router.get("/", async (req, res) => {
  try {
    console.log("📦 Fetching all products...");
    const products = await Product.find({});
    console.log(`✅ Found ${products.length} products`);
    res.status(200).json(products);
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
});

// ✅ Get single product
router.get("/:id", async (req, res) => {
  try {
    console.log("🔍 Fetching product with ID:", req.params.id);
    const product = await Product.findById(req.params.id);
    if (!product) {
      console.warn("⚠️ Product not found:", req.params.id);
      return res.status(404).json({ message: "Product not found" });
    }
    console.log("✅ Product fetched:", product.name);
    res.status(200).json(product);
  } catch (error) {
    console.error("❌ Error fetching product:", error);
    res.status(500).json({ message: "Error fetching product", error: error.message });
  }
});

// ✅ Create new product
router.post("/", async (req, res) => {
  try {
    console.log("🆕 Creating new product:", req.body.name);
    console.log("Request body:", req.body);
    const product = await Product.create(req.body);
    console.log("✅ Product created:", product._id);
    res.status(201).json(product);
  } catch (error) {
    console.error("❌ Error creating product:", error);
    console.error("Full error object:", error);
    res.status(500).json({ message: "Error creating product", error: error.message });
  }
});

// ✅ Update product
router.put("/:id", async (req, res) => {
  try {
    console.log("♻️ Updating product:", req.params.id);
    console.log("Request body:", req.body);
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedProduct) {
      console.warn("⚠️ Product not found for update:", req.params.id);
      return res.status(404).json({ message: "Product not found" });
    }
    console.log("✅ Product updated:", updatedProduct.name);
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("❌ Error updating product:", error);
    console.error("Full error object:", error);
    res.status(500).json({ message: "Error updating product", error: error.message });
  }
});

// ✅ Delete product
router.delete("/:id", async (req, res) => {
  try {
    console.log("🗑 Deleting product:", req.params.id);
    await Product.findByIdAndDelete(req.params.id);
    console.log("✅ Product deleted successfully");
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting product:", error);
    console.error("Full error object:", error);
    res.status(500).json({ message: "Error deleting product", error: error.message });
  }
});

// ==================== Cloudinary Uploads ====================

// 🟢 Upload Multiple Images
router.post("/upload-images", upload.array("images", 5), async (req, res) => {
  try {
    console.log("🖼 Received image upload request");
    if (!req.files || req.files.length === 0) {
      console.warn("⚠️ No image files provided");
      return res.status(400).json({ message: "No images provided" });
    }

    console.log(`📸 ${req.files.length} image(s) received`);
    req.files.forEach((file, i) => {
      console.log(`File ${i + 1}: ${file.originalname} (${file.size} bytes)`);
    });

    const uploadPromises = req.files.map((file, index) => {
      console.log(`🚀 Uploading image ${index + 1}: ${file.originalname}`);
      return new Promise((resolve, reject) => {
        try {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: "image",
              folder: "sac_products",
              transformation: [{ width: 1000, crop: "limit" }],
            },
            (error, result) => {
              if (error) {
                console.error("❌ Cloudinary upload failed:", error);
                return reject(error);
              }
              console.log("✅ Image uploaded:", result.secure_url);
              resolve(result.secure_url);
            }
          );
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        } catch (err) {
          console.error("Streamifier error:", err);
          reject(err);
        }
      });
    });

    const imageUrls = await Promise.all(uploadPromises);
    console.log("✅ All images uploaded:", imageUrls);
    res.status(200).json({ imageUrls });
  } catch (error) {
    console.error("❌ Image upload failed:", error);
    console.error("Full error object:", error);
    res.status(500).json({ message: "Image upload failed", error: error.message });
  }
});

// 🟢 Upload Single Video
router.post("/upload-video", upload.single("video"), async (req, res) => {
  try {
    console.log("🎬 Received video upload request");
    console.log("Headers:", req.headers["content-type"]);

    if (!req.file) {
      console.warn("⚠️ No video file provided");
      return res.status(400).json({ message: "No video provided" });
    }

    console.log(`🚀 Uploading video: ${req.file.originalname} (${req.file.size} bytes)`);

    const videoUrl = await new Promise((resolve, reject) => {
      try {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "video",
            folder: "sac_videos",
            chunk_size: 6000000,
          },
          (error, result) => {
            if (error) {
              console.error("❌ Video upload failed:", error);
              return reject(error);
            }
            console.log("✅ Video uploaded:", result.secure_url);
            resolve(result.secure_url);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      } catch (err) {
        console.error("Streamifier error:", err);
        reject(err);
      }
    });

    res.status(200).json({ videoUrl });
  } catch (error) {
    console.error("❌ Video upload failed:", error);
    console.error("Full error object:", error);
    res.status(500).json({ message: "Video upload failed", error: error.message });
  }
});

export default router;
