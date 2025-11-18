// config/emailConfig.js
import dotenv from "dotenv";
import Brevo from "@getbrevo/brevo";

dotenv.config();

// Create Brevo Transactional Email API client
export const brevoClient = new Brevo.TransactionalEmailsApi();

// Set API Key
brevoClient.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// Universal sendEmail function
export const sendEmail = async (toEmail, subject, htmlContent) => {
  try {
    const emailData = {
      sender: {
        name: process.env.BREVO_SENDER_NAME,
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email: toEmail }],
      subject,
      htmlContent,
    };

    await brevoClient.sendTransacEmail(emailData);

    console.log(`📩 Email sent via Brevo → ${toEmail}`);
    return true;

  } catch (error) {
    console.error("❌ Brevo Email Error:", error.message);
    return false;
  }
};
