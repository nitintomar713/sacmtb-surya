// config/cloudinary.js
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

// ✅ Load environment variables first
dotenv.config();

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dofdazq5r", // fallback for safety
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🧾 Display Cloudinary configuration check
// console.log("☁️ Cloudinary Configuration Check:");
// console.log("----------------------------------");
// console.log("🌩️ CLOUD NAME :", process.env.CLOUDINARY_CLOUD_NAME || "❌ MISSING");
// console.log("🔑 API KEY     :", process.env.CLOUDINARY_API_KEY ? "✅ PRESENT" : "❌ MISSING");
// console.log("🕵️ API SECRET  :", process.env.CLOUDINARY_API_SECRET ? "✅ PRESENT" : "❌ MISSING");
// console.log("----------------------------------");

// ⚠️ Warn if credentials are incomplete
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.error("⚠️ Cloudinary credentials are not fully set in the .env file!");
} else {
  console.log("✅ Cloudinary configured successfully:", cloudinary.config().cloud_name);
}

export default cloudinary;
