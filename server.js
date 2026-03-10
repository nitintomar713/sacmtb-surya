// ----------------- Load ENV -----------------
import dotenv from "dotenv";
dotenv.config();

// ----------------- Imports -----------------
import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import compression from "compression";
import helmet from "helmet";

import connectDB from "./config/db.js";

// Routes
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import gameScoreRoutes from "./routes/gameRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

// ----------------- Setup -----------------
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------- Connect DB -----------------
connectDB();

// ----------------- App Init -----------------
const app = express();

// Trust proxy (CRITICAL for Render/Heroku SSL and rate limiting)
app.set("trust proxy", 1);

// ----------------- Middleware -----------------
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false, // Set to false if you experience issues with Cloudinary images
}));

// Allowed Origins (Updated for your specific domains)
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://sacmtb.com",
  "https://www.sacmtb.com",
  "https://sacmtb-suryadmin.com",
  "https://suryaadmin.sacmtb.com",
  "https://sacmtb-surya.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS policy: This origin is not allowed"));
    },
    credentials: true,
  })
);

// Body Parser with RawBody for Webhooks
app.use(
  express.json({
    limit: "5mb", // Increased for detailed product specs
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

if (NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ----------------- Razorpay Webhook -----------------
// (Keep this BEFORE general routes to avoid middleware interference)
app.post("/api/razorpay/webhook", (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!secret || !signature) return res.status(400).json({ message: "Missing signature" });

    const expected = crypto
      .createHmac("sha256", secret)
      .update(req.rawBody)
      .digest("hex");

    if (expected !== signature) return res.status(400).json({ message: "Invalid signature" });

    console.log("✅ Razorpay Webhook Verified");
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ success: false });
  }
});

// ----------------- Routes -----------------
app.use("/api/orders", orderRoutes);
app.use("/api/games", gameScoreRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/products", productRoutes); // This handles both Bicycles & Toys now!
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/upload", uploadRoutes);

// Health Route
app.get("/ping", (req, res) => res.status(200).json({ status: "Server Active 🚀" }));

// ----------------- Production Static -----------------
if (NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../frontend/build");
  app.use(express.static(frontendPath));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(frontendPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => res.send("🚴‍♂️ SAC MTB Backend Running"));
}

// ----------------- 🔴 Global Error Handler -----------------
// This prevents the server from crashing and sends a clean message to the client
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: NODE_ENV === "production" ? null : err.stack,
  });
});

// ----------------- Start Server -----------------
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
});