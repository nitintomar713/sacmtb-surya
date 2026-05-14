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

/* ================= ROUTES ================= */

import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import gameScoreRoutes from "./routes/gameRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

/* ================= CONFIG ================= */

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================= START SERVER ================= */

const startServer = async () => {

  try {

    await connectDB();

    const app = express();

    app.set("trust proxy", 1);

    /* =========================================
       SECURITY
    ========================================= */

    app.use(compression());

    app.use(
      helmet({
        crossOriginResourcePolicy: false,
      })
    );

    /* =========================================
       CORS FIX
    ========================================= */

    const allowedOrigins = [
      "http://localhost:3000",
      "https://sacmtb.com",
      "https://www.sacmtb.com",
    ];

    app.use(
      cors({
        origin: function (origin, callback) {

          // allow requests with no origin
          if (!origin) {
            return callback(null, true);
          }

          if (allowedOrigins.includes(origin)) {
            return callback(null, true);
          }

          return callback(
            new Error("CORS not allowed")
          );
        },

        methods: [
          "GET",
          "POST",
          "PUT",
          "DELETE",
          "OPTIONS",
        ],

        allowedHeaders: [
          "Content-Type",
          "Authorization",
        ],

        credentials: true,
      })
    );

    /* IMPORTANT */
    app.options("*", cors());

    /* =========================================
       EXTRA HEADERS FIX
    ========================================= */

    app.use((req, res, next) => {

      res.header(
        "Access-Control-Allow-Origin",
        req.headers.origin || "*"
      );

      res.header(
        "Access-Control-Allow-Credentials",
        "true"
      );

      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
      );

      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );

      next();
    });

    /* =========================================
       BODY PARSER
    ========================================= */

    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true }));

    /* =========================================
       LOGGER
    ========================================= */

    app.use(morgan("combined"));

    /* =========================================
       RATE LIMIT
    ========================================= */

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
    });

    app.use("/api", limiter);

    /* =========================================
       WEBHOOK
    ========================================= */

    app.post(
      "/api/razorpay/webhook",
      express.raw({ type: "application/json" }),
      (req, res) => {

        try {

          const secret =
            process.env.RAZORPAY_WEBHOOK_SECRET;

          const signature =
            req.headers["x-razorpay-signature"];

          const expected = crypto
            .createHmac("sha256", secret)
            .update(req.body)
            .digest("hex");

          if (expected !== signature) {

            return res.status(400).json({
              message: "Invalid signature",
            });
          }

          console.log("✅ Webhook Verified");

          res.status(200).json({
            success: true,
          });

        } catch (err) {

          res.status(500).json({
            success: false,
          });
        }
      }
    );

    /* =========================================
       API ROUTES
    ========================================= */

    app.use("/api/orders", orderRoutes);
    app.use("/api/games", gameScoreRoutes);
    app.use("/api/reviews", reviewRoutes);
    app.use("/api/products", productRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/payments", paymentRoutes);
    app.use("/api/upload", uploadRoutes);

    /* =========================================
       HEALTH CHECK
    ========================================= */

    app.get("/ping", (req, res) => {

      res.json({
        status: "Server Active 🚀",
      });
    });

    /* =========================================
       ROOT
    ========================================= */

    app.get("/", (req, res) => {

      res.send("🚀 SAC MTB Backend Running");
    });

    /* =========================================
       ERROR HANDLER
    ========================================= */

    app.use((err, req, res, next) => {

      console.error(err);

      res.status(500).json({
        success: false,
        message: err.message,
      });
    });

    /* =========================================
       START SERVER
    ========================================= */

    app.listen(PORT, "0.0.0.0", () => {

      console.log(
        `🚀 Server running on port ${PORT}`
      );
    });

  } catch (error) {

    console.error(
      "❌ Server failed:",
      error
    );

    process.exit(1);
  }
};

startServer();