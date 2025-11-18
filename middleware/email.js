// src/middleware/email.js
import { sendEmail } from "../config/emailConfig.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@sacmtb.com";

/* ----------------------------- Send OTP Email ----------------------------- */
export const sendOTPEmail = async (email, otp) => {
  console.log(`📧 Sending OTP to: ${email}, OTP: ${otp}`);

  const html = `
    <div style="font-family: Arial; font-size:16px;">
      <h2>Your OTP Code</h2>
      <p>Your OTP is:</p>
      <h1 style="font-size: 38px; color:#2563eb;">${otp}</h1>
      <p>This OTP is valid for 5 minutes.</p>
    </div>
  `;

  const sent = await sendEmail(email, "Your OTP for SAC MTB", html);
  if (sent) console.log("✅ OTP email sent successfully");
  return sent;
};

/* ----------------------------- Order Confirmation ----------------------------- */
export const sendOrderConfirmationEmail = async (email, order) => {
  console.log(`📧 Sending order confirmation email to: ${email}`);

  try {
    const userName = order.user?.name || "Customer";
    const shipping = order.shippingAddress || {};

    const itemsHtml = order.orderItems
      ?.map(
        (item) =>
          `<li>${item.name} - Qty: ${item.qty} - ₹${item.price?.toLocaleString()}</li>`
      )
      .join("");

    const html = `
      <h2>Thanks for your order, ${userName}!</h2>
      <p>Order ID: <strong>${order._id}</strong></p>

      <h3>Shipping Address:</h3>
      <p>${shipping.address}, ${shipping.city}, ${shipping.state} - ${shipping.postalCode}, ${shipping.country}</p>

      <h3>Items Ordered:</h3>
      <ul>${itemsHtml}</ul>

      <h3>Total Amount: ₹${order.totalPrice?.toLocaleString()}</h3>
    `;

    await sendEmail(email, `Order Confirmation - ${order._id}`, html);

    await sendEmail(
      ADMIN_EMAIL,
      `🆕 New Order Placed - ${order._id}`,
      `<h3>New order received from ${userName} (${email})</h3>
       <p>Total Amount: ₹${order.totalPrice?.toLocaleString()}</p>`
    );

    console.log("✅ Order confirmation emails sent");
    return true;
  } catch (err) {
    console.error("❌ Error sending order confirmation:", err.message);
    return false;
  }
};

/* ----------------------------- Shipment Details ----------------------------- */
export const sendShipmentEmail = async (email, order) => {
  if (!order.deliveryPartner || !order.trackingId) return false;

  console.log(`📧 Sending shipment details to: ${email}`);

  try {
    const { deliveryPartner, trackingId } = order;

    // Auto-generate tracking link
    const partner = deliveryPartner.toLowerCase();
    const trackingLinks = {
      delhivery: `https://www.delhivery.com/tracking/${trackingId}`,
      bluedart: `https://www.bluedart.com/trackyourshipment?trackNo=${trackingId}`,
      ekart: `https://ekartlogistics.com/shipmenttrack/${trackingId}`,
      xpressbees: `https://www.xpressbees.com/track?awb=${trackingId}`,
    };

    const trackingLink =
      Object.keys(trackingLinks).find((k) => partner.includes(k))
        ? trackingLinks[Object.keys(trackingLinks).find((k) => partner.includes(k))]
        : null;

    const html = `
      <h2>Your order is on the way!</h2>
      <p>Order ID: <strong>${order._id}</strong></p>
      <p><strong>Delivery Partner:</strong> ${deliveryPartner}</p>
      <p><strong>Tracking ID:</strong> ${trackingId}</p>
      ${
        trackingLink
          ? `<p>Track here: <a href="${trackingLink}" target="_blank">${trackingLink}</a></p>`
          : `<p>Use this tracking ID on the courier website.</p>`
      }
    `;

    await sendEmail(email, `Shipment Details - ${order._id}`, html);

    await sendEmail(
      ADMIN_EMAIL,
      `📦 Order Shipped - ${order._id}`,
      `<h3>Order shipped</h3>
       <p>Customer: ${order.user?.name} (${order.user?.email})</p>
       <p>Partner: ${deliveryPartner}</p>
       <p>Tracking: ${trackingId}</p>`
    );

    console.log("✅ Shipment emails sent");
    return true;
  } catch (err) {
    console.error("❌ Failed to send shipment email:", err.message);
    return false;
  }
};

/* ----------------------------- Order Completion ----------------------------- */
export const sendOrderCompletionEmail = async (email, order) => {
  console.log(`📧 Sending delivery confirmation to: ${email}`);

  try {
    const html = `
      <h2>Your order has been delivered!</h2>
      <p>Order ID: <strong>${order._id}</strong></p>
      <p>We hope you love your bicycle ❤️</p>
    `;

    await sendEmail(email, `Order Delivered - ${order._id}`, html);

    await sendEmail(
      ADMIN_EMAIL,
      `✅ Order Delivered - ${order._id}`,
      `<p>Order delivered to ${order.user?.name} (${order.user?.email})</p>`
    );

    console.log("✅ Delivery emails sent");
    return true;
  } catch (err) {
    console.error("❌ Failed to send delivery email:", err.message);
    return false;
  }
};

/* ----------------------------- Order Cancelled ----------------------------- */
export const sendOrderCancelledEmail = async (email, order) => {
  console.log(`📧 Sending cancellation email to: ${email}`);

  try {
    const reason = order.cancellationReason || "No reason provided";

    await sendEmail(
      email,
      `Order Cancelled - ${order._id}`,
      `
      <h2>Your order was cancelled</h2>
      <p>Order ID: ${order._id}</p>
      <p><strong>Reason:</strong> ${reason}</p>
    `
    );

    await sendEmail(
      ADMIN_EMAIL,
      `❌ Order Cancelled - ${order._id}`,
      `
      <p>Order cancelled by ${order.user?.name} (${order.user?.email})</p>
      <p>Reason: ${reason}</p>
    `
    );

    console.log("✅ Cancel emails sent");
    return true;
  } catch (err) {
    console.error("❌ Failed to send cancel email:", err.message);
    return false;
  }
};

/* ----------------------------- Send Invoice ----------------------------- */
export const sendInvoiceEmail = async (email, order, pdfPath) => {
  console.log(`📧 Sending invoice to: ${email}`);

  try {
    await sendEmail(
      email,
      `Invoice - ${order._id}`,
      `<p>Your invoice is attached.</p>`
    );

    // Brevo supports attachments via "sendTransacEmail"
    await sendEmail(
      ADMIN_EMAIL,
      `Invoice - ${order._id}`,
      `<p>Admin copy attached.</p>`
    );

    console.log("✅ Invoice emails sent");
    return true;
  } catch (err) {
    console.error("❌ Failed to send invoice email:", err.message);
    return false;
  }
};
