// src/middleware/email.js
import { transporter } from "../config/emailConfig.js";

// Admin email from environment
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@sacmtb.com";

/* ----------------------------- Send OTP Email ----------------------------- */
export const sendOTPEmail = async (email, otp) => {
  console.log(`📧 Sending OTP to: ${email}, OTP: ${otp}`);
  try {
    await transporter.sendMail({
      from: `"SAC MTB" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP for SAC MTB",
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    });
    console.log("✅ OTP email sent successfully");
    return true;
  } catch (err) {
    console.error("❌ Failed to send OTP email:", err);
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

    // Send to customer
    await transporter.sendMail({
      from: `"SAC MTB" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Order Confirmation - ${order._id}`,
      html,
    });

    // Send to admin
    const adminHtml = `
      <h3>New Order Received</h3>
      <p><strong>Customer:</strong> ${userName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Total:</strong> ₹${order.totalPrice?.toLocaleString() || "0"}</p>
      <p>Order ID: ${order._id}</p>
      <p>Login to your dashboard to manage this order.</p>
    `;
    await transporter.sendMail({
      from: `"SAC MTB" <${process.env.EMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `🆕 New Order Placed - ${order._id}`,
      html: adminHtml,
    });

    console.log("✅ Order confirmation emails sent to customer & admin");
    return true;
  } catch (err) {
    console.error("❌ Error in sendOrderConfirmationEmail:", err);
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
      const partner = order.deliveryPartner.toLowerCase();
      if (partner.includes("delhivery")) trackingLink = `https://www.delhivery.com/tracking/${order.trackingId}`;
      else if (partner.includes("bluedart")) trackingLink = `https://www.bluedart.com/trackyourshipment?trackNo=${order.trackingId}`;
      else if (partner.includes("ekart")) trackingLink = `https://ekartlogistics.com/shipmenttrack/${order.trackingId}`;
      else if (partner.includes("xpressbees")) trackingLink = `https://www.xpressbees.com/track?awb=${order.trackingId}`;
      else trackingLink = null;
    }

    const html = `
      <h2>Your order is on the way!</h2>
      <p>Order ID: <strong>${order._id}</strong></p>
      <p><strong>Delivery Partner:</strong> ${order.deliveryPartner}</p>
      <p><strong>Tracking ID:</strong> ${order.trackingId}</p>
      ${
        trackingLink
          ? `<p>You can track your shipment here: 
             <a href="${trackingLink}" target="_blank">${trackingLink}</a></p>`
          : `<p>Use the above tracking ID on ${order.deliveryPartner}'s website to track your shipment.</p>`
      }
      <p>Thank you for shopping with SAC MTB!</p>
    `;

    // Customer
    await transporter.sendMail({
      from: `"SAC MTB" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Shipment Details - ${order._id}`,
      html,
    });

    // Admin notification
    await transporter.sendMail({
      from: `"SAC MTB" <${process.env.EMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `📦 Order Shipped - ${order._id}`,
      html: `
        <h3>Order Shipped</h3>
        <p>Order ID: ${order._id}</p>
        <p>Customer: ${order.user?.name} (${order.user?.email})</p>
        <p>Delivery Partner: ${order.deliveryPartner}</p>
        <p>Tracking ID: ${order.trackingId}</p>
      `,
    });

    console.log("✅ Shipment emails sent to customer & admin");
    return true;
  } catch (err) {
    console.error("❌ Failed to send shipment email:", err);
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
      <p>We hope you loved your purchase. Thank you for shopping with SAC MTB!</p>
    `;

    // Customer
    await transporter.sendMail({
      from: `"SAC MTB" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Order Completed - ${order._id}`,
      html,
    });

    // Admin
    await transporter.sendMail({
      from: `"SAC MTB" <${process.env.EMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `✅ Order Delivered - ${order._id}`,
      html: `<p>Order ${order._id} has been delivered to ${order.user?.name} (${order.user?.email})</p>`,
    });

    console.log("✅ Order completion emails sent to customer & admin");
    return true;
  } catch (err) {
    console.error("❌ Failed to send order completion email:", err);
    return false;
  }
};

/* ----------------------------- Order Cancelled ----------------------------- */
export const sendOrderCancelledEmail = async (email, order) => {
  console.log(`📧 Sending order cancelled email to: ${email}`);
  try {
    const reason = order.cancellationReason || "No reason provided";
    const html = `
      <h2>Your order has been cancelled</h2>
      <p>Order ID: ${order._id}</p>
      <p>Reason: ${reason}</p>
      <p>If this was a mistake, please contact our support team.</p>
    `;

    // Customer
    await transporter.sendMail({
      from: `"SAC MTB" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Order Cancelled - ${order._id}`,
      html,
    });

    // Admin
    await transporter.sendMail({
      from: `"SAC MTB" <${process.env.EMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `❌ Order Cancelled - ${order._id}`,
      html: `<p>Order ${order._id} was cancelled by ${order.user?.name} (${order.user?.email})</p>
             <p>Reason: ${reason}</p>`,
    });

    console.log("✅ Order cancellation emails sent to customer & admin");
    return true;
  } catch (err) {
    console.error("❌ Failed to send cancellation email:", err);
    return false;
  }
};

/* ----------------------------- Send Invoice Email ----------------------------- */
export const sendInvoiceEmail = async (email, order, pdfPath) => {
  console.log(`📧 Sending invoice to: ${email}`);
  try {
    // Customer
    await transporter.sendMail({
      from: `"SAC MTB" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Invoice for Order - ${order._id}`,
      text: "Please find your invoice attached.",
      attachments: [{ filename: `Invoice-${order._id}.pdf`, path: pdfPath }],
    });

    // Admin
    await transporter.sendMail({
      from: `"SAC MTB" <${process.env.EMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `Invoice for Order - ${order._id}`,
      text: "Invoice attached for admin records.",
      attachments: [{ filename: `Invoice-${order._id}.pdf`, path: pdfPath }],
    });

    console.log("✅ Invoice emails sent to customer & admin");
    return true;
  } catch (err) {
    console.error("❌ Failed to send invoice email:", err);
    return false;
  }
};
