// config/emailConfig.js
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

export const sendEmail = async (toEmail, subject, htmlContent) => {
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: process.env.BREVO_SENDER_NAME,
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [{ email: toEmail }],
        subject,
        htmlContent,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📩 Email sent:", response.data.messageId);
    return true;

  } catch (error) {
    console.error("❌ Email Error:", error.response?.data || error.message);
    return false;
  }
};