import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/userModel.js";
import { sendOTPEmail } from "../middleware/email.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import { OAuth2Client } from "google-auth-library";
import rateLimit from "express-rate-limit";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* -------------------------------------------------------------------------- */
/* 🛡️ RATE LIMITER (OTP Endpoints)                                            */
/* -------------------------------------------------------------------------- */
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: { message: "Too many OTP requests. Please try again later." },
});

/* -------------------------------------------------------------------------- */
/* ⚙️ HELPERS                                                                 */
/* -------------------------------------------------------------------------- */
const isValidEmail = (e) => typeof e === "string" && /\S+@\S+\.\S+/.test(e);
const isNonEmptyStr = (s) => typeof s === "string" && s.trim().length > 0;
const sanitizePhone = (p) => (typeof p === "string" ? p.replace(/\D/g, "") : "");

const createToken = (user) =>
  jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const devLog = (...args) => {
  if (process.env.NODE_ENV !== "production") console.log(...args);
};

/* -------------------------------------------------------------------------- */
/* 📝 REGISTER (SEND OTP)                                                     */
/* -------------------------------------------------------------------------- */
router.post("/register", otpLimiter, async (req, res) => {
  try {
    let { name, email, password, phone } = req.body;

    if (!isNonEmptyStr(name) || !isValidEmail(email) || !isNonEmptyStr(password)) {
      return res
        .status(400)
        .json({ message: "Name, valid email and password are required" });
    }

    phone = sanitizePhone(phone);
    let user = await User.findOne({ email });

    // Resend control
    if (user && user.otpExpires && Date.now() < new Date(user.otpExpires).getTime() - 4 * 60 * 1000) {
      return res
        .status(429)
        .json({ message: "Please wait before requesting another OTP." });
    }

    if (user && user.isVerified) {
      return res.status(400).json({ message: "User already exists. Please login." });
    }

    const otpPlain = crypto.randomInt(100000, 999999).toString();
    const otpHashed = crypto.createHash("sha256").update(otpPlain).digest("hex");
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    if (user) {
      user.otp = otpHashed;
      user.otpExpires = otpExpires;
      await user.save();
    } else {
      user = await User.create({
        name,
        email,
        password,
        phone,
        otp: otpHashed,
        otpExpires,
      });
    }

    await sendOTPEmail(email, otpPlain);
    devLog(`[Register] OTP ${otpPlain} sent to ${email}`);
    return res.status(201).json({ message: "OTP sent to email. Please verify." });
  } catch (err) {
    devLog("[Register Error]:", err);
    return res.status(500).json({ message: "Server error during registration" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔢 VERIFY OTP (RETURN TOKEN)                                               */
/* -------------------------------------------------------------------------- */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!isValidEmail(email) || !isNonEmptyStr(otp)) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email }).select("+otp +otpExpires");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.otp || !user.otpExpires)
      return res.status(400).json({ message: "No OTP found. Please request again." });

    if (Date.now() > new Date(user.otpExpires).getTime()) {
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      return res.status(400).json({ message: "OTP expired." });
    }

    const hashedProvided = crypto.createHash("sha256").update(String(otp)).digest("hex");
    if (hashedProvided !== user.otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = createToken(user);
    return res.json({
      message: "OTP verified successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    devLog("[Verify OTP Error]:", err);
    return res.status(500).json({ message: "Server error verifying OTP" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔐 LOGIN USER                                                              */
/* -------------------------------------------------------------------------- */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isValidEmail(email) || !isNonEmptyStr(password)) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const valid = await user.matchPassword(password);
    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isVerified)
      return res.status(403).json({ message: "Please verify your email first" });

    const token = createToken(user);
    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    devLog("[Login Error]:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔵 GOOGLE LOGIN                                                            */
/* -------------------------------------------------------------------------- */
router.post("/google-login", async (req, res) => {
  try {
    const { token: googleToken } = req.body;
    if (!googleToken) return res.status(400).json({ message: "Missing Google token" });

    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, picture, sub: googleId } = ticket.getPayload();
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        avatar: picture,
        isVerified: true,
      });
    }

    const token = createToken(user);
    return res.json({
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    devLog("[Google Login Error]:", err);
    return res.status(500).json({ message: "Google login failed" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔄 FORGOT & RESET PASSWORD                                                 */
/* -------------------------------------------------------------------------- */
router.post("/forgot-password", otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!isValidEmail(email)) return res.status(400).json({ message: "Valid email required" });

    const user = await User.findOne({ email }).select("+otp +otpExpires");
    if (!user) return res.status(404).json({ message: "User not found" });

    const otpPlain = crypto.randomInt(100000, 999999).toString();
    user.otp = crypto.createHash("sha256").update(otpPlain).digest("hex");
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    await sendOTPEmail(email, otpPlain);
    return res.json({ message: "OTP sent to email for password reset" });
  } catch (err) {
    devLog("[Forgot Password Error]:", err);
    return res.status(500).json({ message: "Server error during forgot password" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!isValidEmail(email) || !isNonEmptyStr(otp) || !isNonEmptyStr(newPassword)) {
      return res
        .status(400)
        .json({ message: "Email, OTP and new password are required" });
    }

    const user = await User.findOne({ email }).select("+password +otp +otpExpires");
    if (!user) return res.status(404).json({ message: "User not found" });

    const hashedProvided = crypto.createHash("sha256").update(String(otp)).digest("hex");
    if (hashedProvided !== user.otp) return res.status(400).json({ message: "Invalid OTP" });
    if (Date.now() > new Date(user.otpExpires).getTime())
      return res.status(400).json({ message: "OTP expired" });

    user.password = newPassword;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return res.json({ message: "Password reset successfully" });
  } catch (err) {
    devLog("[Reset Password Error]:", err);
    return res.status(500).json({ message: "Server error during password reset" });
  }
});

/* -------------------------------------------------------------------------- */
/* 👤 USER PROFILE + ADMIN                                                    */
/* -------------------------------------------------------------------------- */

// Get profile
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -otp -otpExpires");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    devLog("[Profile Error]:", err);
    res.status(500).json({ message: "Failed to load profile" });
  }
});

// ✅ Update profile
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name.trim();
    if (phone) user.phone = sanitizePhone(phone);
    if (avatar) user.avatar = avatar.trim();

    const updatedUser = await user.save();
    res.json({
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      avatar: updatedUser.avatar,
    });
  } catch (err) {
    devLog("[Profile Update Error]:", err);
    res.status(500).json({ message: "Error updating profile" });
  }
});

// Admin: get all users
router.get("/", protect, admin, async (req, res) => {
  try {
    const users = await User.find().select("-password -otp -otpExpires");
    res.status(200).json(users);
  } catch (err) {
    devLog("[Get Users Error]:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

export default router;
