import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import rateLimit from "express-rate-limit";

import User from "../models/userModel.js";
import ArenaSetting from "../models/ArenaSetting.js";

import { sendOTPEmail } from "../middleware/email.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

/* =====================================================
   RATE LIMIT
===================================================== */

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: {
    message: "Too many OTP requests. Try again later.",
  },
});

/* =====================================================
   HELPERS
===================================================== */

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isNonEmpty = (value) =>
  typeof value === "string" &&
  value.trim().length > 0;

const createToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      isAdmin: user.isAdmin,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,

  participationId: user.participationId,
  riderNumber: user.riderNumber,
  gameRegistered: user.gameRegistered,

  isVerified: user.isVerified,
  isAdmin: user.isAdmin,
});

/* =====================================================
   SAC ARENA REGISTRATION
===================================================== */

const registerArenaUser = async (user) => {

  if (user.gameRegistered) {
    return user;
  }

  // Find settings document
  let arena = await ArenaSetting.findOne();

  // First time only
  if (!arena) {

    arena = await ArenaSetting.create({
      totalRegistered: 5000,
      totalSlots: 20000,
      launchDate: new Date("2027-01-01"),
    });

  }

  // Increment counter
  arena.totalRegistered += 1;

  await arena.save();

  // Assign values
  user.riderNumber = arena.totalRegistered;

  user.participationId =
    `SACRIDER-${String(arena.totalRegistered).padStart(6, "0")}`;

  user.gameRegistered = true;

  return user;

};
/* =====================================================
   REGISTER
===================================================== */

router.post("/register", otpLimiter, async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (
      !isNonEmpty(name) ||
      !isValidEmail(email) ||
      !isNonEmpty(password)
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    let user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (user && user.isVerified) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const otp = crypto
      .randomInt(100000, 999999)
      .toString();

    const hashedOTP = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    if (user) {
      user.name = name;
      user.phone = phone;
      user.password = password;

      user.otp = hashedOTP;
      user.otpExpires = new Date(
        Date.now() + 5 * 60 * 1000
      );
    } else {
      user = new User({
        name,
        email: email.toLowerCase(),
        phone,
        password,

        otp: hashedOTP,
        otpExpires: new Date(
          Date.now() + 5 * 60 * 1000
        ),
      });
    }

    await user.save();

    await sendOTPEmail(email, otp);

    return res.status(201).json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (error) {

    console.error("Register Error:", error);

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
});


/* =====================================================
   VERIFY OTP
===================================================== */

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log("========== VERIFY OTP ==========");
    console.log("Email:", email);
    console.log("OTP:", otp);

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+otp +otpExpires");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("User Found:", user.email);

    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({
        success: false,
        message: "OTP not generated",
      });
    }

    const hashedOTP = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    console.log("Entered Hash:", hashedOTP);
    console.log("DB Hash:", user.otp);

    if (hashedOTP !== user.otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (Date.now() > user.otpExpires.getTime()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;

    console.log("Before Arena Registration");

    await registerArenaUser(user);

    console.log("Participation ID:", user.participationId);
    console.log("Rider Number:", user.riderNumber);

    await user.save();

    console.log("User Saved");

    const token = createToken(user);

    console.log("JWT Created");

    return res.json({
      success: true,
      message: "Account verified successfully",
      token,
      user: userResponse(user),
    });

  }  catch (error) {

  console.log("================================");
  console.log("VERIFY OTP ERROR");
  console.log(error);
  console.log(error.message);
  console.log(error.stack);
  console.log("================================");

  return res.status(500).json({
    success: false,
    message: error.message
  });

}
});
/* =====================================================
   LOGIN
===================================================== */

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      !isValidEmail(email) ||
      !isNonEmpty(password)
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password +otp +otpExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Email not registered",
      });
    }

    const isMatch =
      await user.matchPassword(password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password",
      });
    }

    /* ----------------------------
       EMAIL NOT VERIFIED
    ----------------------------- */

    if (!user.isVerified) {

      const otp = crypto
        .randomInt(100000, 999999)
        .toString();

      user.otp = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

      user.otpExpires = new Date(
        Date.now() + 5 * 60 * 1000
      );

      await user.save();

      await sendOTPEmail(
        user.email,
        otp
      );

      return res.status(403).json({
        success: false,
        message:
          "Account not verified. A new OTP has been sent.",
      });
    }

    /* ----------------------------
       AUTO REGISTER IN ARENA
    ----------------------------- */

    await registerArenaUser(user);

    await user.save();

    const token =
      createToken(user);

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: userResponse(user),
    });

  } catch (error) {

    console.error(
      "Login Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});


/* =====================================================
   GOOGLE LOGIN
===================================================== */

router.post(
  "/google-login",
  async (req, res) => {

    try {

      const { token } = req.body;

      const ticket =
        await client.verifyIdToken({

          idToken: token,

          audience:
            process.env.GOOGLE_CLIENT_ID,

        });

      const payload =
        ticket.getPayload();

      const {
        email,
        name,
        picture,
        sub,
      } = payload;

      let user =
        await User.findOne({
          email:
            email.toLowerCase(),
        });

      /* ----------------------------
         CREATE USER
      ----------------------------- */

      if (!user) {

        user =
          await User.create({

            name,

            email:
              email.toLowerCase(),

            avatar:
              picture,

            googleId:
              sub,

            isVerified:
              true,

          });

      }

      /* ----------------------------
         UPDATE GOOGLE INFO
      ----------------------------- */

      else {

        if (
          !user.googleId
        ) {

          user.googleId =
            sub;

        }

        if (
          picture &&
          !user.avatar
        ) {

          user.avatar =
            picture;

        }

      }

      /* ----------------------------
         AUTO REGISTER
      ----------------------------- */

      await registerArenaUser(
        user
      );

      await user.save();

      const jwtToken =
        createToken(user);

      return res.json({

        success: true,

        message:
          "Google login successful",

        token:
          jwtToken,

        user:
          userResponse(user),

      });

    } catch (error) {

      console.error(
        "Google Login Error:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Google login failed",

      });

    }
  }
);
/* =====================================================
   FORGOT PASSWORD
===================================================== */

router.post(
  "/forgot-password",
  otpLimiter,
  async (req, res) => {
    try {

      const { email } = req.body;

      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: "Valid email is required",
        });
      }

      const user = await User.findOne({
        email: email.toLowerCase(),
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const otp = crypto
        .randomInt(100000, 999999)
        .toString();

      user.otp = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

      user.otpExpires = new Date(
        Date.now() + 5 * 60 * 1000
      );

      await user.save();

      await sendOTPEmail(
        user.email,
        otp
      );

      return res.json({
        success: true,
        message:
          "Password reset OTP sent successfully",
      });

    } catch (error) {

      console.error(
        "Forgot Password Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to process request",
      });

    }
  }
);


/* =====================================================
   RESET PASSWORD
===================================================== */

router.post(
  "/reset-password",
  async (req, res) => {

    try {

      const {
        email,
        otp,
        newPassword,
      } = req.body;

      if (
        !isValidEmail(email) ||
        !isNonEmpty(newPassword)
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Email, OTP and password are required",
        });

      }

      const user =
        await User.findOne({
          email:
            email.toLowerCase(),
        }).select(
          "+otp +otpExpires +password"
        );

      if (!user) {

        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });

      }

      if (
        !user.otp ||
        !user.otpExpires
      ) {

        return res.status(400).json({
          success: false,
          message:
            "OTP not found",
        });

      }

      const hashedOTP =
        crypto
          .createHash("sha256")
          .update(String(otp))
          .digest("hex");

      if (
        hashedOTP !== user.otp
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Invalid OTP",
        });

      }

      if (
        Date.now() >
        user.otpExpires.getTime()
      ) {

        return res.status(400).json({
          success: false,
          message:
            "OTP expired",
        });

      }

      user.password =
        newPassword;

      user.otp = undefined;
      user.otpExpires = undefined;
      user.otpAttempts = 0;

      await user.save();

      return res.json({
        success: true,
        message:
          "Password reset successful",
      });

    } catch (error) {

      console.error(
        "Reset Password Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Password reset failed",
      });

    }
  }
);


/* =====================================================
   PROFILE
===================================================== */

router.get(
  "/profile",
  protect,
  async (req, res) => {

    try {

      const user =
        await User.findById(
          req.user._id
        );

      if (!user) {

        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });

      }

      return res.json({
        success: true,
        user:
          userResponse(user),
      });

    } catch (error) {

      console.error(
        "Profile Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch profile",
      });

    }
  }
);


/* =====================================================
   ADMIN - ALL USERS
===================================================== */

router.get(
  "/",
  protect,
  admin,
  async (req, res) => {

    try {

      const users =
        await User.find()
          .sort({
            createdAt: -1,
          });

      return res.json({
        success: true,
        count: users.length,
        users:
          users.map(
            userResponse
          ),
      });

    } catch (error) {

      console.error(
        "Admin Users Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch users",
      });

    }
  }
);


/* =====================================================
   EXPORT
===================================================== */

export default router;