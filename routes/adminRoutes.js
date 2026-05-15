import express from "express";
import User from "../models/userModel.js";
import { sendOTPEmail } from "../middleware/email.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const router = express.Router();

/* =========================================
   CONFIG
========================================= */

const ADMIN_EMAIL =

  (
    process.env.ADMIN_EMAIL ||
    "tomarnitin713@gmail.com"
  )

  .trim()

  .toLowerCase();

const JWT_SECRET =
  process.env.JWT_SECRET;

/* =========================================
   ADMIN AUTH MIDDLEWARE
========================================= */

const adminAuth = (
  req,
  res,
  next
) => {

  const token =
    req.headers.authorization
    ?.split(" ")[1];

  if (!token) {

    return res
      .status(401)
      .json({

        success:false,

        message:
          "No token provided",
      });
  }

  try {

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );

    if (!decoded.isAdmin) {

      return res
        .status(403)
        .json({

          success:false,

          message:
            "Not authorized as admin",
        });
    }

    req.user = decoded;

    next();

  } catch (err) {

    console.error(
      "[Admin Auth] Token verification failed:",
      err
    );

    return res
      .status(401)
      .json({

        success:false,

        message:
          "Invalid token",
      });
  }
};

/* =========================================
   SEND OTP
========================================= */

router.post(
  "/send-otp",

  async (req, res) => {

    try {

      let { email } =
        req.body;

      if (!email) {

        return res
          .status(400)
          .json({

            success:false,

            message:
              "Email is required",
          });
      }

      /* =========================
         NORMALIZE EMAIL
      ========================= */

      email =
        email
          .trim()
          .toLowerCase();

      console.log(
        "📧 USER EMAIL:",
        email
      );

      console.log(
        "🔐 ADMIN EMAIL:",
        ADMIN_EMAIL
      );

      /* =========================
         ADMIN CHECK
      ========================= */

      if (
        email !==
        ADMIN_EMAIL
      ) {

        return res
          .status(403)
          .json({

            success:false,

            message:
              "Not authorized",
          });
      }

      /* =========================
         FIND OR CREATE ADMIN
      ========================= */

      let adminUser =
        await User.findOne({
          email,
        });

      if (!adminUser) {

        adminUser =
          await User.create({

            name:
              "Super Admin",

            email,

            phone:
              "9999999999",

            password:
              "admin@otp",

            isVerified: true,

            isAdmin: true,
          });

        console.log(
          "✅ Admin auto-created:",
          email
        );

      } else {

        console.log(
          "ℹ️ Admin already exists"
        );
      }

      /* =========================
         GENERATE OTP
      ========================= */

      const otp =

        crypto
          .randomInt(
            100000,
            999999
          )
          .toString();

      console.log(
        "🔑 GENERATED OTP:",
        otp
      );

      const hashedOTP =

        crypto
          .createHash(
            "sha256"
          )
          .update(otp)
          .digest("hex");

      adminUser.otp =
        hashedOTP;

      adminUser.otpExpires =

        new Date(

          Date.now() +
          5 * 60 * 1000
        );

      adminUser.otpAttempts = 0;

      await adminUser.save();

      console.log(
        "⏰ OTP Expires:",
        adminUser.otpExpires
      );

      /* =========================
         SEND EMAIL
      ========================= */

      await sendOTPEmail(
        email,
        otp
      );

      console.log(
        `✅ OTP sent to ${email}`
      );

      return res
        .status(200)
        .json({

          success:true,

          message:
            "OTP sent successfully",
        });

    } catch (error) {

      console.error(
        "[Admin Send OTP Error]:",
        error
      );

      return res
        .status(500)
        .json({

          success:false,

          message:
            "Server error",
        });
    }
  }
);

/* =========================================
   VERIFY OTP
========================================= */

router.post(
  "/verify-otp",

  async (req, res) => {

    try {

      let {
        email,
        otp,
      } = req.body;

      if (
        !email ||
        !otp
      ) {

        return res
          .status(400)
          .json({

            success:false,

            message:
              "Email and OTP required",
          });
      }

      /* =========================
         NORMALIZE EMAIL
      ========================= */

      email =
        email
          .trim()
          .toLowerCase();

      /* =========================
         ADMIN CHECK
      ========================= */

      if (
        email !==
        ADMIN_EMAIL
      ) {

        return res
          .status(403)
          .json({

            success:false,

            message:
              "Not authorized",
          });
      }

      /* =========================
         FIND ADMIN
      ========================= */

      const user =
        await User.findOne({

          email,

          isAdmin:true,

        }).select(

          "+otp +otpExpires +otpAttempts"
        );

      if (!user) {

        return res
          .status(404)
          .json({

            success:false,

            message:
              "Admin not found",
          });
      }

      console.log(
        "📥 Received OTP:",
        otp
      );

      console.log(
        "⏰ Stored Expiry:",
        user.otpExpires
      );

      /* =========================
         OTP EXISTS
      ========================= */

      if (!user.otp) {

        return res
          .status(400)
          .json({

            success:false,

            message:
              "No OTP found. Please request again.",
          });
      }

      /* =========================
         OTP EXPIRED
      ========================= */

      if (

        Date.now()

        >

        new Date(
          user.otpExpires
        ).getTime()

      ) {

        user.clearOTP();

        await user.save();

        return res
          .status(400)
          .json({

            success:false,

            message:
              "OTP expired",
          });
      }

      /* =========================
         VERIFY OTP
      ========================= */

      const hashedProvidedOTP =

        crypto
          .createHash(
            "sha256"
          )
          .update(
            String(otp).trim()
          )
          .digest("hex");

      if (

        hashedProvidedOTP
        !==
        user.otp

      ) {

        user.otpAttempts += 1;

        await user.save();

        if (

          user.otpAttempts
          >= 3

        ) {

          user.isBlocked = true;

          await user.save();

          return res
            .status(403)
            .json({

              success:false,

              message:
                "Too many attempts. Admin blocked.",
            });
        }

        return res
          .status(400)
          .json({

            success:false,

            message:
              "Invalid OTP",
          });
      }

      /* =========================
         SUCCESS
      ========================= */

      user.clearOTP();

      await user.save();

      const token =

        jwt.sign(

          {

            id:user._id,

            isAdmin:true,
          },

          JWT_SECRET,

          {

            expiresIn:"7d",
          }
        );

      console.log(
        `✅ Admin logged in: ${email}`
      );

      return res
        .status(200)
        .json({

          success:true,

          message:
            "Admin logged in successfully",

          token,

          user:{

            name:user.name,

            email:user.email,

            role:"admin",
          }
        });

    } catch (error) {

      console.error(
        "[Admin Verify OTP Error]:",
        error
      );

      return res
        .status(500)
        .json({

          success:false,

          message:
            "Server error",
        });
    }
  }
);

/* =========================================
   GET ALL USERS
========================================= */

router.get(
  "/users",

  adminAuth,

  async (req, res) => {

    try {

      const users =
        await User.find()

        .select(
          "-password -otp -otpExpires"
        );

      res.json(users);

    } catch (error) {

      console.error(
        "[Admin] Get users error:",
        error
      );

      res.status(500).json({

        success:false,

        message:
          "Server error",
      });
    }
  }
);

/* =========================================
   DELETE USER
========================================= */

router.delete(
  "/users/:id",

  adminAuth,

  async (req, res) => {

    try {

      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {

        return res
          .status(404)
          .json({

            success:false,

            message:
              "User not found",
          });
      }

      await User.deleteOne({

        _id:
          req.params.id,
      });

      console.log(
        "🗑 User deleted:",
        req.params.id
      );

      res.json({

        success:true,

        message:
          "User deleted successfully",
      });

    } catch (error) {

      console.error(
        "[Admin Delete User Error]:",
        error
      );

      res.status(500).json({

        success:false,

        message:
          "Server error",
      });
    }
  }
);

/* =========================================
   BLOCK / UNBLOCK USER
========================================= */

router.patch(
  "/users/:id/block",

  adminAuth,

  async (req, res) => {

    try {

      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {

        return res
          .status(404)
          .json({

            success:false,

            message:
              "User not found",
          });
      }

      user.isBlocked =
        !user.isBlocked;

      await user.save();

      res.json({

        success:true,

        message:

          `User ${
            user.isBlocked
            ? "blocked"
            : "unblocked"
          } successfully`,

        user,
      });

    } catch (error) {

      console.error(
        "[Admin Block Error]:",
        error
      );

      res.status(500).json({

        success:false,

        message:
          "Server error",
      });
    }
  }
);

export default router;