// ✅ Load environment variables first
import dotenv from "dotenv";
dotenv.config();

// ----------------- Imports -----------------
import express from "express";
import cors from "cors";
import morgan from "morgan";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import connectDB from "./config/db.js";
import User from "./models/userModel.js";

// ✅ Import routes
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import gameScoreRoutes from "./routes/gameRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

// ----------------- Environment setup -----------------
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------- Connect to DB -----------------
connectDB().catch((err) => {
  console.error("❌ MongoDB connection failed on startup:", err);
  process.exit(1);
});

// ----------------- Express App -----------------
const app = express();

// ✅ Allowed domains for frontend access
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://sacmtb.com",
  "https://sacmtb-suryadmin.com",
  "https://sacmtb-surya.onrender.com", // Add your live Render URL too
];

// ----------------- Middleware -----------------
// CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without origin (e.g., Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS not allowed for this origin"));
    },
    credentials: true,
  })
);

// Capture raw body for webhook verification while also parsing JSON for other routes.
// The verify function stores raw body only when content-type is application/json.
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      // store raw body for webhook verification (string or Buffer)
      // We'll use this in the webhook route: req.rawBody
      req.rawBody = buf;
    },
  })
);

app.use(morgan("dev"));

// 🧱 Security Headers
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// ----------------- Admin auto-create -----------------
const ensureAdminExists = async () => {
  try {
    const adminEmail = "tomarnitin713@gmail.com";
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await User.create({
        name: "Super Admin",
        email: adminEmail,
        phone: "9999999999",
        password: hashedPassword,
        isVerified: true,
        isAdmin: true,
      });
      console.log(`✅ Admin auto-created: ${adminEmail}`);
    } else {
      console.log("ℹ️ Admin already exists");
    }
  } catch (err) {
    console.error("❌ Error creating admin:", err);
  }
};

// ----------------- Razorpay webhook -----------------
/**
 * IMPORTANT NOTES:
 * - Razorpay requires the exact raw request body (bytes) to compute signature.
 * - We stored the raw body in req.rawBody in the express.json verify middleware above.
 * - Make sure process.env.RAZORPAY_WEBHOOK_SECRET is set to the value shown in Razorpay webhook settings.
 */
app.post("/api/razorpay/webhook", (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error("❌ Missing RAZORPAY_WEBHOOK_SECRET env var");
      return res.status(500).json({ success: false, message: "Webhook secret not configured" });
    }

    const signature = req.headers["x-razorpay-signature"];
    if (!signature) {
      console.warn("❌ Missing x-razorpay-signature header");
      return res.status(400).json({ success: false, message: "Missing signature header" });
    }

    // Use the raw body bytes exactly as sent
    const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");

    if (expected !== signature) {
      console.warn("❌ Invalid Razorpay webhook signature");
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // At this point the webhook is verified. You can process payload:
    // req.body contains parsed JSON because express.json ran earlier.
    console.log("✅ Razorpay Webhook verified:", req.body?.event || "[no event field]");

    // TODO: pass the payload to your order controller's webhook handler or process here
    // e.g., razorpayWebhookHandler(req, res) or push to a job queue
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ success: false });
  }
});

// ----------------- API Routes -----------------
app.use("/api/orders", orderRoutes);
app.use("/api/games", gameScoreRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/upload", uploadRoutes);

// ----------------- Serve Frontend (Render Compatible) -----------------
if (NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../frontend/build");
  app.use(express.static(frontendPath));

  // Express catch-all route for SPA
  app.get(/.*/, (req, res) => {
    res.sendFile(path.resolve(frontendPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("🚴‍♂️ SAC MTB Backend Running in Development Mode");
  });
}

// ----------------- Start Server -----------------
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
  await ensureAdminExists();
  console.log("✅ MongoDB Connected Successfully (if connectDB succeeded earlier)");
  console.log("✅ Email ENV Check:", process.env.EMAIL_HOST || "N/A", process.env.EMAIL_USER || "N/A");
});
