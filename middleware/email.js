// src/middleware/email.js
import { transporter } from "../config/emailConfig.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@sacmtb.com";
const FROM_EMAIL = `"SAC MTB" <${process.env.EMAIL_USER}>`;

/* ----------------------------- Send OTP Email ----------------------------- */
export const sendOTPEmail = async (email, otp) => {
  console.log(`📧 Sending OTP to: ${email}, OTP: ${otp}`);
  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "Your OTP for SAC MTB",
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    });

    console.log("✅ OTP email sent successfully");
    return true;
  } catch (err) {
    console.error("❌ Failed to send OTP email:", err.message);
    return false;
  }
};

/* ----------------------------- Order Confirmation ----------------------------- */
export const sendOrderConfirmationEmail = async (email, order) => {
  console.log(`📧 Sending order confirmation email to: ${email}`);
  try {
    const userName = order.user?.name || "Customer";
    const itemsHtml = order.orderItems
      ?.map(
        (item) =>
          `<li>${item.name} - Qty: ${item.qty} - ₹${item.price?.toLocaleString() || "0"}</li>`
      )
      .join("");

    const shipping = order.shippingAddress || {};
    const html = `
      <h2>Thank you for your order, ${userName}!</h2>
      <p>Order ID: ${order._id}</p>
      <p><strong>Shipping Address:</strong><br>
      ${shipping.address}, ${shipping.city}, ${shipping.state} - ${shipping.postalCode}, ${shipping.country}</p>
      <h3>Items:</h3>
      <ul>${itemsHtml}</ul>
      <p><strong>Total:</strong> ₹${order.totalPrice?.toLocaleString() || "0"}</p>
      <p>We’ll notify you once your order is shipped.</p>
    `;

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: `Order Confirmation - ${order._id}`,
      html,
    });

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `🆕 New Order Placed - ${order._id}`,
      html: `
        <h3>New Order Received</h3>
        <p><strong>Customer:</strong> ${userName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Total:</strong> ₹${order.totalPrice?.toLocaleString() || "0"}</p>
        <p>Order ID: ${order._id}</p>
      `,
    });

    console.log("✅ Order confirmation emails sent");
    return true;
  } catch (err) {
    console.error("❌ Error in sendOrderConfirmationEmail:", err.message);
    return false;
  }
};

/* ----------------------------- Shipment Details ----------------------------- */
export const sendShipmentEmail = async (email, order) => {
  if (!order.deliveryPartner || !order.trackingId) return false;
  console.log(`📧 Sending shipment details to: ${email}`);

  try {
    let trackingLink = order.trackingLink;
    if (!trackingLink) {
      const id = order.trackingId;
      const partner = order.deliveryPartner.toLowerCase();

      const links = {
        delhivery: `https://www.delhivery.com/tracking/${id}`,
        bluedart: `https://www.bluedart.com/trackyourshipment?trackNo=${id}`,
        ekart: `https://ekartlogistics.com/shipmenttrack/${id}`,
        xpressbees: `https://www.xpressbees.com/track?awb=${id}`,
      };

      trackingLink =
        Object.keys(links).find((key) => partner.includes(key))
          ? links[Object.keys(links).find((key) => partner.includes(key))]
          : null;
    }

    const html = `
      <h2>Your order is on the way!</h2>
      <p>Order ID: <strong>${order._id}</strong></p>
      <p><strong>Delivery Partner:</strong> ${order.deliveryPartner}</p>
      <p><strong>Tracking ID:</strong> ${order.trackingId}</p>
      ${
        trackingLink
          ? `<p>Track here: <a href="${trackingLink}" target="_blank">${trackingLink}</a></p>`
          : `<p>Use this tracking ID on the delivery partner's website.</p>`
      }
    `;

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: `Shipment Details - ${order._id}`,
      html,
    });

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `📦 Order Shipped - ${order._id}`,
      html: `
        <h3>Order Shipped</h3>
        <p>Customer: ${order.user?.name} (${order.user?.email})</p>
        <p>Partner: ${order.deliveryPartner}</p>
        <p>Tracking ID: ${order.trackingId}</p>
      `,
    });

    console.log("✅ Shipment emails sent");
    return true;
  } catch (err) {
    console.error("❌ Failed to send shipment email:", err.message);
    return false;
  }
};

/* ----------------------------- Order Completion ----------------------------- */
export const sendOrderCompletionEmail = async (email, order) => {
  console.log(`📧 Sending order completion email to: ${email}`);

  try {
    const html = `
      <h2>Your order has been delivered!</h2>
      <p>Order ID: ${order._id}</p>
      <p>We hope you loved your purchase.</p>
    `;

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: `Order Completed - ${order._id}`,
      html,
    });

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `✅ Order Delivered - ${order._id}`,
      html: `<p>Order ${order._id} delivered to ${order.user?.name} (${order.user?.email})</p>`,
    });

    console.log("✅ Order completion emails sent");
    return true;
  } catch (err) {
    console.error("❌ Failed to send completion email:", err.message);
    return false;
  }
};

/* ----------------------------- Order Cancelled ----------------------------- */
export const sendOrderCancelledEmail = async (email, order) => {
  console.log(`📧 Sending order cancelled e-mail to: ${email}`);

  try {
    const reason = order.cancellationReason || "No reason provided";

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: `Order Cancelled - ${order._id}`,
      html: `
        <h2>Your order has been cancelled</h2>
        <p>Order ID: ${order._id}</p>
        <p>Reason: ${reason}</p>
      `,
    });

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `❌ Order Cancelled - ${order._id}`,
      html: `
        <p>Order ${order._id} cancelled by ${order.user?.name} (${order.user?.email})</p>
        <p>Reason: ${reason}</p>
      `,
    });

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
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: `Invoice - ${order._id}`,
      text: "Invoice attached.",
      attachments: [{ filename: `Invoice-${order._id}.pdf`, path: pdfPath }],
    });

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Invoice - ${order._id}`,
      text: "Admin copy of invoice.",
      attachments: [{ filename: `Invoice-${order._id}.pdf`, path: pdfPath }],
    });

    console.log("✅ Invoice emails sent");
    return true;
  } catch (err) {
    console.error("❌ Failed to send invoice email:", err.message);
    return false;
  }
};
