import express from "express";
import User from "../models/userModel.js";
import { sendOTPEmail } from "../middleware/email.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const router = express.Router();

// ----------------- Config -----------------
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "tomarnitin713@gmail.com";
const JWT_SECRET = process.env.JWT_SECRET;

// ----------------- Admin Auth Middleware -----------------
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin)
      return res.status(403).json({ message: "Not authorized as admin" });
    req.user = decoded;
    next();
  } catch (err) {
    console.error("[Admin Auth] Token verification failed:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ----------------- Send OTP -----------------
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (email !== ADMIN_EMAIL)
      return res.status(403).json({ message: "Not authorized" });

    let adminUser = await User.findOne({ email });
    if (!adminUser) {
      adminUser = await User.create({
        name: "Super Admin",
        email,
        phone: "9999999999",
        password: "admin@otp",
        isVerified: true,
        isAdmin: true,
      });
      console.log("[Admin] Auto-created default admin:", email);
    } else {
      console.log("ℹ️ Admin already exists");
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    adminUser.otp = hashedOTP;
    adminUser.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // ✅ proper Date
    adminUser.otpAttempts = 0;
    await adminUser.save();

    console.log("[Send OTP] Expires At:", adminUser.otpExpires.toLocaleString());

    await sendOTPEmail(email, otp);
    console.log(`[Admin OTP] Email sent to ${email}`);
    res.json({ message: "OTP sent successfully to admin email" });
  } catch (error) {
    console.error("[Admin Send OTP Error]:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------- Verify OTP -----------------
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (email !== ADMIN_EMAIL)
      return res.status(403).json({ message: "Not authorized" });

    // ✅ Include hidden fields for verification
    const user = await User.findOne({ email, isAdmin: true }).select("+otp +otpExpires +otpAttempts");
    if (!user) return res.status(404).json({ message: "Admin not found" });

    console.log("[Verify OTP] Received:", otp);
    console.log(
      "[Verify OTP] Expiry:",
      user.otpExpires ? new Date(user.otpExpires).toLocaleString() : "No expiry stored"
    );

    // No OTP stored
    if (!user.otp) {
      return res.status(400).json({ message: "No OTP found, please request a new one" });
    }

    // OTP expired
    if (Date.now() > new Date(user.otpExpires).getTime()) {
      user.clearOTP();
      await user.save();
      return res.status(400).json({ message: "OTP expired, please request a new one" });
    }

    // Compare hashed OTPs
    const hashedProvidedOTP = crypto.createHash("sha256").update(String(otp).trim()).digest("hex");

    if (hashedProvidedOTP !== user.otp) {
      user.otpAttempts += 1;
      await user.save();

      if (user.otpAttempts >= 3) {
        user.isBlocked = true;
        await user.save();
        return res.status(403).json({ message: "Too many failed attempts. Admin blocked." });
      }

      return res.status(400).json({ message: "Invalid OTP, please try again" });
    }

    // ✅ OTP valid
    user.clearOTP();
    await user.save();

    const token = jwt.sign(
      { id: user._id, isAdmin: true },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`[Admin Login] Successful for ${email}`);
    res.json({
      message: "Admin logged in successfully",
      token,
      user: { name: user.name, email: user.email, role: "admin" },
    });
  } catch (error) {
    console.error("[Admin Verify OTP Error]:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------- Get All Users (Admin only) -----------------
router.get("/users", adminAuth, async (req, res) => {
  try {
    const users = await User.find().select("-password -otp -otpExpires");
    res.json(users);
  } catch (error) {
    console.error("[Admin] Get users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------- Delete User -----------------
router.delete("/users/:id", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await User.deleteOne({ _id: req.params.id });
    console.log("[Admin] User deleted successfully:", req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("[Admin] Delete user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------- Block / Unblock User -----------------
router.patch("/users/:id/block", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
      message: `User ${user.isBlocked ? "blocked" : "unblocked"} successfully`,
      user,
    });
  } catch (error) {
    console.error("[Admin] Block/Unblock error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
