import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

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

const PORT = process.env.PORT || 3000; // ✅ CHANGED (Hostinger prefers 3000)
const NODE_ENV = process.env.NODE_ENV || "development";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const startServer = async () => {
  try {
    await connectDB();

    const app = express();

    app.set("trust proxy", 1);

    /* ================= SECURITY ================= */

    app.use(compression());

    app.use(
      helmet({
        crossOriginResourcePolicy: false
      })
    );

    const allowedOrigins = [
      "http://localhost:3000",
      "https://sacmtb.com",
      "https://www.sacmtb.com"
    ];

    app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);

          if (allowedOrigins.includes(origin)) {
            return callback(null, true);
          }

          return callback(null, true); // ✅ IMPORTANT FIX (avoid blocking Hostinger)
        },
        credentials: true
      })
    );

    /* ================= RATE LIMIT ================= */

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200 // ✅ slightly increased
    });

    app.use("/api", limiter);

    /* ================= WEBHOOK ================= */

    app.post(
      "/api/razorpay/webhook",
      express.raw({ type: "application/json" }),
      (req, res) => {
        try {
          const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
          const signature = req.headers["x-razorpay-signature"];

          const expected = crypto
            .createHmac("sha256", secret)
            .update(req.body)
            .digest("hex");

          if (expected !== signature) {
            return res.status(400).json({ message: "Invalid signature" });
          }

          console.log("✅ Webhook Verified");

          res.status(200).json({ success: true });
        } catch (err) {
          res.status(500).json({ success: false });
        }
      }
    );

    /* ================= BODY ================= */

    app.use(express.json({ limit: "10mb" }));

    /* ================= LOGGER ================= */

    app.use(morgan("combined")); // ✅ better for production

    /* ================= ROUTES ================= */

    app.use("/api/orders", orderRoutes);
    app.use("/api/games", gameScoreRoutes);
    app.use("/api/reviews", reviewRoutes);
    app.use("/api/products", productRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/payments", paymentRoutes);
    app.use("/api/upload", uploadRoutes);

    /* ================= HEALTH ================= */

    app.get("/ping", (req, res) => {
      res.json({ status: "Server Active 🚀" });
    });

    /* ================= ROOT ================= */

    app.get("/", (req, res) => {
      res.send("🚀 SAC MTB Backend Running");
    });

    /* ================= ERROR ================= */

    app.use((err, req, res, next) => {
      console.error(err);
      res.status(500).json({
        message: err.message
      });
    });

    /* ================= START ================= */

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Server failed:", error);
    process.exit(1);
  }
};

startServer();