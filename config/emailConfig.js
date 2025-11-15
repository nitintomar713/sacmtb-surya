// config/emailConfig.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Create transporter
export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,       // smtp.hostinger.com
  port: process.env.EMAIL_PORT,       // 465 or 587
  secure: process.env.EMAIL_PORT == 465, // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER, // support@sacmtb.com
    pass: process.env.EMAIL_PASS, // Hostinger email password
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify transporter connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP connection failed:", error);
  } else {
    console.log("✅ SMTP transporter is ready to send emails");
  }
});
