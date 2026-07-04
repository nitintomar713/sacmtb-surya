import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const protect = async (req, res, next) => {
  try {
    console.log("[UPLOAD DEBUG] Authentication middleware running", {
      method: req.method,
      path: req.originalUrl,
    });

    let token;

    // Check for token in headers or cookies
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      console.error("[UPLOAD DEBUG] Authentication token missing", {
        userId: undefined,
        role: undefined,
      });
      return res.status(401).json({ message: "No token provided, not authorized" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("[UPLOAD DEBUG] Decoded user", decoded);
      console.log("[UPLOAD DEBUG] Decoded user id", decoded?.id);
    } catch (error) {
      console.error("[UPLOAD DEBUG] Authentication decode error", {
        error,
        message: error.message,
        stack: error.stack,
      });
      return res
        .status(401)
        .json({ message: "Invalid or expired token, please login again" });
    }

    // Find the user
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      console.error("[UPLOAD DEBUG] Authenticated user not found", {
        userId: decoded.id,
        role: undefined,
      });
      return res.status(401).json({ message: "User not found, unauthorized" });
    }

    console.log("[UPLOAD DEBUG] Authenticated user", user);
    console.log("[UPLOAD DEBUG] Authenticated user id", user._id);
    console.log(
      "[UPLOAD DEBUG] Authenticated user role",
      user.isAdmin ? "admin" : "user"
    );

    // Optional checks
    if (!user.isVerified) {
      return res.status(403).json({ message: "Email not verified" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: "User account is blocked" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("[UPLOAD DEBUG] Authentication middleware error", {
      error,
      message: error.message,
      stack: error.stack,
    });
    console.error("[Auth Middleware Error]:", error);
    res.status(500).json({ message: "Server error during authentication" });
  }
};

export const admin = (req, res, next) => {
  if (req.user?.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: "Access denied, admin only" });
  }
};
