import express from "express";
import multer from "multer";
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/userModel.js";

const router = express.Router();

// Memory storage is best for serverless/Render deployments
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit per file
});

/* -------------------------------------------------------------------------- */
/* 📤 Upload Multiple Product Images to Cloudinary             */
/* -------------------------------------------------------------------------- */
// This matches your Products.jsx call: API.post("/upload", formData)
router.post("/", upload.array("images", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No images provided" });
    }

    console.log(`📸 Uploading ${req.files.length} images to Cloudinary...`);

    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "products",
            resource_type: "image",
            // Optimization for high-quality product photos
            transformation: [{ quality: "auto", fetch_format: "auto" }],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        streamifier.createReadStream(file.buffer).pipe(uploadStream);
      });
    });

    const imageUrls = await Promise.all(uploadPromises);

    res.status(200).json({
      message: "Images uploaded successfully",
      imageUrls,
    });
  } catch (error) {
    console.error("❌ Product upload failed:", error);
    res.status(500).json({ message: "Server error during image upload" });
  }
});

/* -------------------------------------------------------------------------- */
/* 📤 Upload User Avatar to Cloudinary                         */
/* -------------------------------------------------------------------------- */
router.post("/avatar", protect, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const imageUrl = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "user_avatars",
          resource_type: "image",
          transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    // Update User Profile
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.avatar = imageUrl;
    await user.save();

    res.status(200).json({ message: "Avatar updated", imageUrl });
  } catch (error) {
    res.status(500).json({ message: "Avatar upload failed" });
  }
});

export default router;