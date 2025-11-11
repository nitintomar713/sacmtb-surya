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
connectDB();

// ----------------- Express App -----------------
const app = express();

// ✅ Allowed domains for frontend access
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://sacmtb.com",
  "https://sacmtb-suryadmin.com",
];

// ----------------- Middleware -----------------
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without origin (e.g., Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS not allowed for this origin"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// 🧱 Security Headers for embedding safety
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
app.post(
  "/api/razorpay/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    try {
      const crypto = require("crypto");
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = crypto
        .createHmac("sha256", secret)
        .update(req.body)
        .digest("hex");

      if (signature === req.headers["x-razorpay-signature"]) {
        console.log("✅ Razorpay Webhook verified:", req.body);
        res.status(200).json({ success: true });
      } else {
        console.log("❌ Invalid Razorpay webhook signature");
        res.status(400).json({ success: false });
      }
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).json({ success: false });
    }
  }
);

// ----------------- API Routes -----------------
app.use("/api/orders", orderRoutes);
app.use("/api/games", gameScoreRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/upload", uploadRoutes);

// ----------------- Serve Frontend (For Render) -----------------
if (NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../frontend/build");
  app.use(express.static(frontendPath));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(frontendPath, "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("🚴‍♂️ SAC MTB Backend Running in Development Mode");
  });
}

// ----------------- Start Server -----------------
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
  await ensureAdminExists();
  console.log("✅ MongoDB Connected Successfully");
  console.log("✅ Email ENV Check:", process.env.EMAIL_HOST, process.env.EMAIL_USER);
});
