// src/middleware/email.js
import { sendEmail } from "../config/emailConfig.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@sacmtb.com";

/* ----------------------------- OTP EMAIL ----------------------------- */
export const sendOTPEmail = async (email, otp) => {
  console.log(`📧 Sending OTP to: ${email}`);

  const html = `
    <div style="font-family:Arial">
      <h2>Your OTP Code</h2>
      <p>Use the OTP below to continue:</p>
      <h1 style="color:#2563eb">${otp}</h1>
      <p>This OTP is valid for 5 minutes.</p>
    </div>
  `;

  return sendEmail(email, "Your OTP for SAC MTB", html);
};

/* ----------------------------- ORDER CONFIRMATION ----------------------------- */
export const sendOrderConfirmationEmail = async (email, order, isAdmin = false) => {
  console.log(`📧 Sending order confirmation to: ${email}`);

  try {
    const userName = order.user?.name || "Customer";
    const shipping = order.shippingAddress || {};

    const itemsHtml = order.orderItems
      ?.map(
        (item) =>
          `<li>${item.name} × ${item.qty} — ₹${item.price?.toLocaleString()}</li>`
      )
      .join("");

    const html = `
      <div style="font-family:Arial">
        <h2>${isAdmin ? "🆕 New Order Received" : `Thanks for your order, ${userName}!`}</h2>

        <p><strong>Order ID:</strong> ${order._id}</p>

        <h3>Shipping Address</h3>
        <p>
          ${shipping.address || ""}, ${shipping.city || ""}, 
          ${shipping.state || ""} - ${shipping.postalCode || ""}<br/>
          ${shipping.country || ""}
        </p>

        <h3>Items</h3>
        <ul>${itemsHtml}</ul>

        <h3>Total Paid: ₹${order.totalPrice?.toLocaleString()}</h3>
      </div>
    `;

    await sendEmail(
      email,
      isAdmin ? `🆕 New Order - ${order._id}` : `Order Confirmed - ${order._id}`,
      html
    );

    console.log("✅ Order confirmation email sent");
    return true;
  } catch (err) {
    console.error("❌ Order email error:", err.message);
    return false;
  }
};

/* ----------------------------- SHIPMENT EMAIL ----------------------------- */
export const sendShipmentEmail = async (email, order) => {
  if (!order.deliveryPartner || !order.trackingId) return false;

  console.log(`📦 Sending shipment email to: ${email}`);

  try {
    const partner = order.deliveryPartner.toLowerCase();
    const links = {
      delhivery: `https://www.delhivery.com/tracking/${order.trackingId}`,
      bluedart: `https://www.bluedart.com/trackyourshipment?trackNo=${order.trackingId}`,
      xpressbees: `https://www.xpressbees.com/track?awb=${order.trackingId}`,
    };

    const trackingLink =
      Object.keys(links).find((k) => partner.includes(k)) &&
      links[Object.keys(links).find((k) => partner.includes(k))];

    const html = `
      <h2>Your order is on the way 🚚</h2>
      <p><strong>Order ID:</strong> ${order._id}</p>
      <p><strong>Courier:</strong> ${order.deliveryPartner}</p>
      <p><strong>Tracking ID:</strong> ${order.trackingId}</p>
      ${
        trackingLink
          ? `<a href="${trackingLink}" target="_blank">Track Shipment</a>`
          : ""
      }
    `;

    await sendEmail(email, `Order Shipped - ${order._id}`, html);
    await sendEmail(ADMIN_EMAIL, `📦 Order Shipped - ${order._id}`, html);

    return true;
  } catch (err) {
    console.error("❌ Shipment email error:", err.message);
    return false;
  }
};

/* ----------------------------- DELIVERY EMAIL ----------------------------- */
export const sendOrderCompletionEmail = async (email, order) => {
  console.log(`📧 Sending delivery email to: ${email}`);

  const html = `
    <h2>Order Delivered 🎉</h2>
    <p>Order ID: ${order._id}</p>
    <p>We hope you enjoy your ride 🚴‍♂️</p>
  `;

  await sendEmail(email, `Order Delivered - ${order._id}`, html);
  await sendEmail(ADMIN_EMAIL, `✅ Order Delivered - ${order._id}`, html);

  return true;
};

/* ----------------------------- CANCEL EMAIL ----------------------------- */
export const sendOrderCancelledEmail = async (email, order) => {
  const reason = order.cancellationReason || "No reason provided";

  await sendEmail(
    email,
    `Order Cancelled - ${order._id}`,
    `<p>Your order was cancelled.<br/>Reason: ${reason}</p>`
  );

  await sendEmail(
    ADMIN_EMAIL,
    `❌ Order Cancelled - ${order._id}`,
    `<p>Reason: ${reason}</p>`
  );

  return true;
};
