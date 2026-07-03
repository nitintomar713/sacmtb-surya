import express from "express";
import multer from "multer";
import streamifier from "streamifier";
import cloudinary, {
  assertCloudinaryConfigured,
} from "../config/cloudinary.js";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/userModel.js";

const router = express.Router();
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PRODUCT_FILES = 10;
const UPLOAD_DEBUG = process.env.UPLOAD_DEBUG !== "false";

// Memory storage is best for serverless/Render deployments
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_PRODUCT_FILES,
  },
  fileFilter: (req, file, callback) => {
    if (file.mimetype?.startsWith("image/")) {
      callback(null, true);
      return;
    }

    const error = new Error(
      `Unsupported file type "${file.mimetype || "unknown"}"`
    );
    error.code = "INVALID_FILE_TYPE";
    error.field = file.fieldname;
    callback(error);
  },
});

const getSafeRequestHeaders = (req) => ({
  "content-type": req.headers["content-type"],
  "content-length": req.headers["content-length"],
  origin: req.headers.origin,
  "user-agent": req.headers["user-agent"],
  authorization: req.headers.authorization
    ? "Bearer [redacted]"
    : "not provided",
});

const logIncomingUpload = (req, res, next) => {
  if (UPLOAD_DEBUG) {
    console.log("[Upload debug][Incoming request]", {
      method: req.method,
      path: req.originalUrl,
      headers: getSafeRequestHeaders(req),
      bodyBeforeMulter: req.body,
      filesBeforeMulter: req.files,
    });
  }

  next();
};

const getFileMetadata = (file) => ({
  fieldname: file.fieldname,
  originalname: file.originalname,
  mimetype: file.mimetype,
  size: file.size,
  hasBuffer: Buffer.isBuffer(file.buffer),
});

const handleMulterError = (error, req, res, next) => {
  if (!error) {
    if (UPLOAD_DEBUG) {
      console.log("[Upload debug][After Multer]", {
        body: req.body,
        files: Array.isArray(req.files)
          ? req.files.map(getFileMetadata)
          : req.file
            ? [getFileMetadata(req.file)]
            : [],
      });
    }

    next();
    return;
  }

  console.error("[Upload debug][Multer error]", {
    name: error.name,
    code: error.code,
    field: error.field,
    message: error.message,
    stack: error.stack,
    headers: getSafeRequestHeaders(req),
  });

  const status =
    error.code === "LIMIT_FILE_SIZE" ? 413 : 400;

  const messageByCode = {
    LIMIT_FILE_SIZE: "Each image must be 5MB or smaller",
    LIMIT_FILE_COUNT: "A maximum of 10 images can be uploaded at once",
    LIMIT_UNEXPECTED_FILE:
      'Unexpected file field. Product images must use the field name "images"',
    INVALID_FILE_TYPE: "Only image files are allowed",
  };

  res.status(status).json({
    message:
      messageByCode[error.code] ||
      "Invalid multipart upload request",
    code: error.code || "MULTER_ERROR",
    field: error.field,
  });
};

const productImagesMiddleware = (req, res, next) => {
  upload.array("images", MAX_PRODUCT_FILES)(
    req,
    res,
    (error) => handleMulterError(error, req, res, next)
  );
};

const avatarMiddleware = (req, res, next) => {
  upload.single("avatar")(
    req,
    res,
    (error) => handleMulterError(error, req, res, next)
  );
};

const logCloudinaryError = (label, error, file) => {
  console.error(`[Upload debug][Cloudinary error][${label}]`, {
    file: file ? getFileMetadata(file) : undefined,
    name: error?.name,
    code: error?.code,
    httpCode: error?.http_code,
    message: error?.message,
    stack: error?.stack,
  });
};

/* -------------------------------------------------------------------------- */
/* 📤 Upload Multiple Product Images to Cloudinary             */
/* -------------------------------------------------------------------------- */
router.post("/", logIncomingUpload, productImagesMiddleware, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message:
          'No images received. Send multipart/form-data using the field name "images"',
        receivedContentType:
          req.headers["content-type"] || "not provided",
      });
    }

    assertCloudinaryConfigured();

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
            if (error) {
              logCloudinaryError("product", error, file);
              reject(error);
              return;
            }

            if (!result?.secure_url) {
              const resultError =
                new Error("Cloudinary returned no secure URL");
              logCloudinaryError("product", resultError, file);
              reject(resultError);
              return;
            }

            resolve(result.secure_url);
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
    logCloudinaryError("product route", error);

    if (error.code === "CLOUDINARY_CONFIG_MISSING") {
      return res.status(503).json({
        message:
          "Image upload service is not configured on the server",
        code: error.code,
      });
    }

    res.status(502).json({
      message: "Cloudinary image upload failed",
      code: error.code || "CLOUDINARY_UPLOAD_FAILED",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* 📤 Upload User Avatar to Cloudinary                         */
/* -------------------------------------------------------------------------- */
router.post(
  "/avatar",
  protect,
  logIncomingUpload,
  avatarMiddleware,
  async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    assertCloudinaryConfigured();

    const imageUrl = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "user_avatars",
          resource_type: "image",
          transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
        },
        (error, result) => {
          if (error) {
            logCloudinaryError("avatar", error, req.file);
            reject(error);
            return;
          }

          resolve(result.secure_url);
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
    logCloudinaryError("avatar route", error);

    const status =
      error.code === "CLOUDINARY_CONFIG_MISSING" ? 503 : 502;

    res.status(status).json({
      message:
        status === 503
          ? "Image upload service is not configured on the server"
          : "Avatar upload failed",
      code: error.code,
    });
  }
  }
);

export default router;
