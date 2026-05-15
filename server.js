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

const PORT =
  process.env.PORT || 3000;

const NODE_ENV =
  process.env.NODE_ENV ||
  "development";

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

/* ================= START SERVER ================= */

const startServer = async () => {

  try {

    /* =========================================
       CONNECT DATABASE
    ========================================= */

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
       CORS
    ========================================= */

    const allowedOrigins = [

      "http://localhost:3000",

      "http://localhost:5173",

      "https://sacmtb.com",

      "https://www.sacmtb.com",
    ];

    const corsOptions = {

      origin: function (
        origin,
        callback
      ) {

        /* allow mobile apps/postman/server */

        if (!origin) {

          return callback(
            null,
            true
          );
        }

        /* allowed origins */

        if (
          allowedOrigins.includes(
            origin
          )
        ) {

          return callback(
            null,
            true
          );
        }

        return callback(

          new Error(
            `CORS blocked for: ${origin}`
          )
        );
      },

      credentials: true,

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
    };

    app.use(cors(corsOptions));

    app.options(
      "*",
      cors(corsOptions)
    );

    /* =========================================
       BODY PARSER
    ========================================= */

    app.use(
      express.json({
        limit: "10mb",
      })
    );

    app.use(
      express.urlencoded({
        extended: true,
      })
    );

    /* =========================================
       STATIC FILES
    ========================================= */

    app.use(

      "/uploads",

      express.static(
        path.join(
          __dirname,
          "uploads"
        )
      )
    );

    /* =========================================
       LOGGER
    ========================================= */

    if (
      NODE_ENV ===
      "development"
    ) {

      app.use(morgan("dev"));

    } else {

      app.use(
        morgan("combined")
      );
    }

    /* =========================================
       RATE LIMIT
    ========================================= */

    const limiter =
      rateLimit({

        windowMs:
          15 * 60 * 1000,

        max: 200,

        message: {

          success: false,

          message:
            "Too many requests. Try again later.",
        },
      });

    app.use(
      "/api",
      limiter
    );

    /* =========================================
       WEBHOOK
    ========================================= */

    app.post(

      "/api/razorpay/webhook",

      express.raw({
        type:
          "application/json",
      }),

      (req, res) => {

        try {

          const secret =
            process.env
              .RAZORPAY_WEBHOOK_SECRET;

          const signature =
            req.headers[
              "x-razorpay-signature"
            ];

          const expected =
            crypto
              .createHmac(
                "sha256",
                secret
              )
              .update(req.body)
              .digest("hex");

          if (
            expected !==
            signature
          ) {

            return res
              .status(400)
              .json({

                success:false,

                message:
                  "Invalid signature",
              });
          }

          console.log(
            "✅ Webhook Verified"
          );

          return res
            .status(200)
            .json({

              success: true,
            });

        } catch (err) {

          console.error(err);

          return res
            .status(500)
            .json({

              success:false,

              message:
                "Webhook Error",
            });
        }
      }
    );

    /* =========================================
       API ROUTES
    ========================================= */

    app.use(
      "/api/orders",
      orderRoutes
    );

    app.use(
      "/api/games",
      gameScoreRoutes
    );

    app.use(
      "/api/reviews",
      reviewRoutes
    );

    app.use(
      "/api/products",
      productRoutes
    );

    app.use(
      "/api/users",
      userRoutes
    );

    app.use(
      "/api/admin",
      adminRoutes
    );

    app.use(
      "/api/payments",
      paymentRoutes
    );

    app.use(
      "/api/upload",
      uploadRoutes
    );

    /* =========================================
       HEALTH CHECK
    ========================================= */

    app.get(
      "/ping",
      (req, res) => {

        res.status(200).json({

          success: true,

          status:
            "Server Active 🚀",

          environment:
            NODE_ENV,
        });
      }
    );

    /* =========================================
       ROOT
    ========================================= */

    app.get(
      "/",
      (req, res) => {

        res.send(
          "🚀 SAC MTB Backend Running"
        );
      }
    );

    /* =========================================
       404
    ========================================= */

    app.use((req, res) => {

      res.status(404).json({

        success:false,

        message:
          "Route Not Found",
      });
    });

    /* =========================================
       ERROR HANDLER
    ========================================= */

    app.use(
      (
        err,
        req,
        res,
        next
      ) => {

        console.error(
          "❌ ERROR:",
          err.message
        );

        res.status(
          err.status || 500
        ).json({

          success:false,

          message:
            err.message ||
            "Server Error",
        });
      }
    );

    /* =========================================
       START SERVER
    ========================================= */

    app.listen(
      PORT,
      "0.0.0.0",
      () => {

        console.log(

          `🚀 Server running on port ${PORT}`
        );

        console.log(

          `🌍 ENV: ${NODE_ENV}`
        );
      }
    );

  } catch (error) {

    console.error(
      "❌ Server failed:",
      error
    );

    process.exit(1);
  }
};

startServer();