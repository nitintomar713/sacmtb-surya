import express from "express";
import multer from "multer";
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/userModel.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* -------------------------------------------------------------------------- */
/*                     📤 Upload User Avatar to Cloudinary                    */
/* -------------------------------------------------------------------------- */
router.post("/avatar", protect, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log(`🖼 Uploading avatar for user: ${req.user._id}`);

    const imageUrl = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "user_avatars",
          resource_type: "image",
          transformation: [{ width: 600, height: 600, crop: "fill", gravity: "face" }],
        },
        (error, result) => {
          if (error) {
            console.error("❌ Cloudinary Upload Failed:", error);
            reject(error);
          } else {
            console.log("✅ Uploaded to Cloudinary:", result.secure_url);
            resolve(result.secure_url);
          }
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.avatar = imageUrl;
    await user.save();

    res.status(200).json({
      message: "Avatar uploaded successfully",
      imageUrl,
    });
  } catch (error) {
    console.error("❌ Avatar upload failed:", error);
    res.status(500).json({ message: "Server error during avatar upload" });
  }
});

export default router;
