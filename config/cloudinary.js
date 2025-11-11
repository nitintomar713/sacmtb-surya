import dotenv from "dotenv";
dotenv.config(); // ✅ Load .env FIRST

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🧾 Log Cloudinary configuration check
console.log("☁️ Cloudinary Configuration Check:");
console.log("----------------------------------");
console.log("🌩️ CLOUD NAME :", process.env.CLOUDINARY_CLOUD_NAME || "❌ MISSING");
console.log("🔑 API KEY     :", process.env.CLOUDINARY_API_KEY ? "✅ PRESENT" : "❌ MISSING");
console.log("🕵️ API SECRET  :", process.env.CLOUDINARY_API_SECRET ? "✅ PRESENT" : "❌ MISSING");
console.log("----------------------------------");

if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.error("⚠️ Cloudinary credentials are not fully set in .env file!");
}

export default cloudinary;
