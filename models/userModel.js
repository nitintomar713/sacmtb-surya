import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,        // Automatically creates index
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },

    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10,15}$/, "Please enter a valid phone number"],
    },

    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    avatar: {
      type: String,
      default: "/images/default-avatar.png",
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
    },

    // ================= OTP =================
    otp: {
      type: String,
      select: false,
    },

    otpExpires: {
      type: Date,
      select: false,
    },

    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    // ================= Status =================
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);



// =======================================
// 🔐 Password Hash Middleware
// =======================================
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});



// =======================================
// 🔑 Compare Password
// =======================================
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};



// =======================================
// 🔢 OTP Utilities
// =======================================
userSchema.methods.clearOTP = function () {
  this.otp = null;
  this.otpExpires = null;
  this.otpAttempts = 0;
};

userSchema.methods.isOTPValid = function (otp) {
  const hashed = crypto
    .createHash("sha256")
    .update(String(otp))
    .digest("hex");

  return this.otp === hashed && Date.now() < this.otpExpires;
};



// =======================================
// 🛡 Hide Sensitive Fields
// =======================================
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpires;
  delete obj.otpAttempts;
  delete obj.__v;
  return obj;
};



// =======================================
// 🚀 Model Export
// =======================================
const User = mongoose.model("User", userSchema);
export default User;
