import dotenv from "dotenv";
import { BrevoClient } from "@getbrevo/brevo";

dotenv.config();

// ------------------ INIT CLIENT ------------------
console.log("🔧 Initializing Brevo Client...");

export const brevoClient = new BrevoClient({
apiKey: process.env.BREVO_API_KEY,
});

// Debug env check
console.log("🔑 API KEY PRESENT:", !!process.env.BREVO_API_KEY);
console.log("📧 SENDER EMAIL:", process.env.BREVO_SENDER_EMAIL);

// ------------------ SEND EMAIL ------------------
export const sendEmail = async (toEmail, subject, htmlContent) => {
try {
console.log("📨 Sending Email...");
console.log("➡ To:", toEmail);
console.log("➡ Subject:", subject);


// 🚨 MAIN FIX HERE
const response = await brevoClient.sendTransacEmail({
  sender: {
    name: process.env.BREVO_SENDER_NAME || "SAC MTB",
    email: process.env.BREVO_SENDER_EMAIL,
  },
  to: [{ email: toEmail }],
  subject,
  htmlContent,
});

console.log("✅ Email API Response:", response);
console.log(`📩 Email sent successfully → ${toEmail}`);

return true;
//remove

} catch (error) {
console.error("❌ EMAIL ERROR OCCURRED");

//remove
// Full debug logs
console.error("👉 Error Message:", error.message);
console.error("👉 Full Error:", error);

if (error.response) {
  console.error("👉 Brevo Response:", error.response);
}

return false;
//remove

}
};
