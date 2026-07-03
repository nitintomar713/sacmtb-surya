import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

const requiredCloudinaryVariables = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missingCloudinaryVariables =
  requiredCloudinaryVariables.filter(
    (name) => !process.env[name]?.trim()
  );

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

if (missingCloudinaryVariables.length > 0) {
  console.error(
    "[Cloudinary config] Missing required environment variables:",
    missingCloudinaryVariables
  );
} else {
  console.log(
    "[Cloudinary config] Ready for cloud:",
    cloudinary.config().cloud_name
  );
}

export const assertCloudinaryConfigured = () => {
  if (missingCloudinaryVariables.length === 0) return;

  const error = new Error(
    `Missing Cloudinary environment variables: ${missingCloudinaryVariables.join(", ")}`
  );
  error.code = "CLOUDINARY_CONFIG_MISSING";
  throw error;
};

export default cloudinary;
