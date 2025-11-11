// ✅ Load environment variables first (must come before everything)
import dotenv from "dotenv";
dotenv.config();

// ----------------- Imports -----------------
import express from "express";
import cors from "cors";
import morgan from "morgan";
import bcrypt from "bcryptjs";
import connectDB from "./config/db.js";

// ✅ Import models (needed for admin creation)
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

// ----------------- Connect to DB -----------------
connectDB();

// ----------------- Create Express app -----------------
const app = express();
const allowedOrigins = ["http://localhost:3000", "http://localhost:3001", "https://sacmtb.com", "https://sacmtb-suryadmin.com"];

// ----------------- Middleware -----------------


app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed for this origin"));
    }
  },
  credentials: true, // allow cookies / auth headers
}));
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

app.use(express.json());
app.use(morgan("dev"));

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

// ----------------- Razorpay webhook (optional) -----------------
app.post("/api/razorpay/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const crypto = require("crypto");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(req.body)
    .digest("hex");

  if (signature === req.headers["x-razorpay-signature"]) {
    console.log("✅ Webhook verified:", req.body);
    res.status(200).json({ success: true });
  } else {
    console.log("❌ Invalid webhook signature");
    res.status(400).json({ success: false });
  }
});

// ----------------- Routes -----------------
app.use("/api/orders", orderRoutes);
app.use("/api/games", gameScoreRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/upload", uploadRoutes);

// ----------------- Test route -----------------
app.get("/", (req, res) => {
  res.send("🚴‍♂️ SAC MTB Backend Running Successfully");
});

// ----------------- Start Server -----------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  console.log("✅ MongoDB Connected Successfully");

  // Ensure admin exists on startup
  await ensureAdminExists();

  // Log environment sanity check
  console.log("✅ Email ENV Check:", process.env.EMAIL_HOST, process.env.EMAIL_USER);
});
