import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((err) => {
  if (err) {
    console.error("❌ SMTP Connection Failed");
    console.error(err);
  } else {
    console.log("✅ SMTP Connected Successfully");
    console.log("📧 Using:", process.env.EMAIL_USER);
  }
});

export const sendEmail = async (toEmail, subject, htmlContent) => {
  try {
    const info = await transporter.sendMail({
      from: `"SAC MTB" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      html: htmlContent,
    });

    console.log("✅ Email Sent");
    console.log("Message ID:", info.messageId);

    return true;
  } catch (err) {
    console.error("❌ Email Error");
    console.error(err);

    return false;
  }
};