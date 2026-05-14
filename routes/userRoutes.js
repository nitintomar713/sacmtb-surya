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

/* ================= RATE LIMIT ================= */
const otpLimiter = rateLimit({
windowMs: 60 * 1000,
max: 3,
message: { message: "Too many OTP requests. Try later." },
});

/* ================= HELPERS ================= */
const isValidEmail = (e) => /\S+@\S+.\S+/.test(e);
const isNonEmpty = (s) => typeof s === "string" && s.trim().length > 0;

const createToken = (user) =>
jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, {
expiresIn: "7d",
});

/* ================= REGISTER ================= */
router.post("/register", otpLimiter, async (req, res) => {
try {
const { name, email, password, phone } = req.body;


if (!isNonEmpty(name) || !isValidEmail(email) || !isNonEmpty(password)) {
  return res.status(400).json({ message: "All fields required" });
}

let user = await User.findOne({ email });

if (user && user.isVerified) {
  return res.status(400).json({ message: "User already exists" });
}

const otp = crypto.randomInt(100000, 999999).toString();

if (user) {
  user.otp = crypto.createHash("sha256").update(otp).digest("hex");
  user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
  await user.save();
} else {
  user = await User.create({
    name,
    email,
    password,
    phone,
    otp: crypto.createHash("sha256").update(otp).digest("hex"),
    otpExpires: new Date(Date.now() + 5 * 60 * 1000),
  });
}

await sendOTPEmail(email, otp);

res.status(201).json({ message: "OTP sent to email" });

} catch (err) {
res.status(500).json({ message: "Register error" });
}
});

/* ================= VERIFY OTP ================= */
router.post("/verify-otp", async (req, res) => {
try {
const { email, otp } = req.body;


const user = await User.findOne({ email }).select("+otp +otpExpires");
if (!user) return res.status(404).json({ message: "User not found" });

const hashed = crypto.createHash("sha256").update(otp).digest("hex");

if (hashed !== user.otp) {
  return res.status(400).json({ message: "Invalid OTP" });
}

if (Date.now() > new Date(user.otpExpires)) {
  return res.status(400).json({ message: "OTP expired" });
}

user.isVerified = true;
user.otp = null;
user.otpExpires = null;

await user.save();

const token = createToken(user);

res.json({
  message: "Verified",
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
  },
});


} catch {
res.status(500).json({ message: "Verify error" });
}
});

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
try {
const { email, password } = req.body;


if (!isValidEmail(email) || !isNonEmpty(password)) {
  return res.status(400).json({ message: "Email & password required" });
}

const user = await User.findOne({ email }).select("+password");

if (!user) {
  return res.status(400).json({ message: "Email not registered" });
}

const valid = await user.matchPassword(password);

if (!valid) {
  return res.status(400).json({ message: "Incorrect password" });
}

// 🔥 AUTO RESEND OTP
if (!user.isVerified) {
  const otp = crypto.randomInt(100000, 999999).toString();

  user.otp = crypto.createHash("sha256").update(otp).digest("hex");
  user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
  await user.save();

  await sendOTPEmail(user.email, otp);

  return res.status(403).json({
    message: "Account not verified. OTP sent again.",
  });
}

const token = createToken(user);

res.json({
  message: "Login success",
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
  },
});


} catch {
res.status(500).json({ message: "Login error" });
}
});

/* ================= GOOGLE LOGIN ================= */
router.post("/google-login", async (req, res) => {
try {
const { token } = req.body;


const ticket = await client.verifyIdToken({
  idToken: token,
  audience: process.env.GOOGLE_CLIENT_ID,
});

const { email, name, picture } = ticket.getPayload();

let user = await User.findOne({ email });

if (!user) {
  user = await User.create({
    name,
    email,
    avatar: picture,
    isVerified: true,
  });
}

const jwtToken = createToken(user);

res.json({
  message: "Google login success",
  token: jwtToken,
  user: { id: user._id, name, email },
});


} catch {
res.status(500).json({ message: "Google login failed" });
}
});

/* ================= FORGOT PASSWORD ================= */
router.post("/forgot-password", otpLimiter, async (req, res) => {
try {
const { email } = req.body;


const user = await User.findOne({ email });

if (!user) return res.status(404).json({ message: "User not found" });

const otp = crypto.randomInt(100000, 999999).toString();

user.otp = crypto.createHash("sha256").update(otp).digest("hex");
user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
await user.save();

await sendOTPEmail(email, otp);

res.json({ message: "OTP sent for reset" });


} catch {
res.status(500).json({ message: "Error" });
}
});

/* ================= RESET PASSWORD ================= */
router.post("/reset-password", async (req, res) => {
try {
const { email, otp, newPassword } = req.body;


const user = await User.findOne({ email }).select("+otp +otpExpires");

const hashed = crypto.createHash("sha256").update(otp).digest("hex");

if (hashed !== user.otp) return res.status(400).json({ message: "Invalid OTP" });

if (Date.now() > new Date(user.otpExpires)) {
  return res.status(400).json({ message: "OTP expired" });
}

user.password = newPassword;
user.otp = null;
user.otpExpires = null;

await user.save();

res.json({ message: "Password reset successful" });


} catch {
res.status(500).json({ message: "Reset error" });
}
});

/* ================= PROFILE ================= */
router.get("/profile", protect, async (req, res) => {
const user = await User.findById(req.user._id);
res.json(user);
});

/* ================= ADMIN ================= */
router.get("/", protect, admin, async (req, res) => {
const users = await User.find();
res.json(users);
});

export default router;
