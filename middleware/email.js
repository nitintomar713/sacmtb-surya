// src/middleware/email.js

import { sendEmail } from "../config/emailConfig.js";

const ADMIN_EMAIL =

  process.env.ADMIN_EMAIL ||

  "admin@sacmtb.com";

/* =========================================
   OTP EMAIL
========================================= */

export const sendOTPEmail =
async (email, otp) => {

  try {

    console.log(
      "📨 Sending OTP to:",
      email
    );

    const html = `

      <div
      style="
      font-family:Arial;
      padding:20px;
      background:#f8fafc;
      ">

        <div
        style="
        max-width:500px;
        margin:auto;
        background:white;
        border-radius:12px;
        padding:30px;
        ">

          <h2
          style="
          color:#111827;
          margin-bottom:10px;
          ">
            SAC MTB Admin Login
          </h2>

          <p
          style="
          color:#4b5563;
          font-size:15px;
          ">
            Use the OTP below to continue:
          </p>

          <div
          style="
          text-align:center;
          margin:30px 0;
          ">

            <h1
            style="
            font-size:42px;
            letter-spacing:8px;
            color:#2563eb;
            margin:0;
            ">
              ${otp}
            </h1>

          </div>

          <p
          style="
          color:#6b7280;
          font-size:14px;
          ">
            This OTP is valid for
            <strong>
              5 minutes
            </strong>.
          </p>

          <p
          style="
          color:#9ca3af;
          font-size:13px;
          margin-top:25px;
          ">
            If you did not request this login,
            please ignore this email.
          </p>

        </div>

      </div>
    `;

    /* =========================
       SEND EMAIL
    ========================= */

    const result =

      await sendEmail(

        email,

        "Your OTP for SAC MTB",

        html
      );

    console.log(
      "✅ OTP EMAIL SENT:",
      result
    );

    return true;

  } catch (err) {

    console.error(

      "❌ OTP EMAIL ERROR:",

      err.response?.body ||

      err.message ||

      err
    );

    return false;
  }
};

/* =========================================
   ORDER CONFIRMATION
========================================= */

export const sendOrderConfirmationEmail =
async (
  email,
  order,
  isAdmin = false
) => {

  try {

    const userName =

      order.user?.name ||

      "Customer";

    const shipping =
      order.shippingAddress || {};

    const itemsHtml =

      order.orderItems?.length

      ?

      order.orderItems
      .map(

        (item)=>`

        <li
        style="
        margin-bottom:8px;
        ">

          ${item.name}

          ×

          ${item.qty}

          —

          ₹${item.price?.toLocaleString()}

        </li>
      `
      )

      .join("")

      :

      "<li>No items found</li>";

    const html = `

      <div
      style="
      font-family:Arial;
      padding:20px;
      ">

        <h2>

          ${
            isAdmin

            ?

            "🆕 New Order Received"

            :

            `Thanks for your order, ${userName}!`
          }

        </h2>

        <p>

          <strong>
            Order ID:
          </strong>

          ${order._id}

        </p>

        <h3>
          Shipping Address
        </h3>

        <p>

          ${shipping.address || ""},

          ${shipping.city || ""},

          ${shipping.state || ""}

          -

          ${shipping.postalCode || ""}

          <br/>

          ${shipping.country || ""}

        </p>

        <h3>
          Items
        </h3>

        <ul>

          ${itemsHtml}

        </ul>

        <h3>

          Total Paid:

          ₹${order.totalPrice?.toLocaleString()}

        </h3>

      </div>
    `;

    const subject =

      isAdmin

      ?

      `🆕 New Order - ${order._id}`

      :

      `Order Confirmed - ${order._id}`;

    await sendEmail(
      email,
      subject,
      html
    );

    console.log(
      "✅ Order confirmation email sent"
    );

    return true;

  } catch (err) {

    console.error(

      "❌ Order email error:",

      err.response?.body ||

      err.message ||

      err
    );

    return false;
  }
};

/* =========================================
   SHIPMENT EMAIL
========================================= */

export const sendShipmentEmail =
async (email, order) => {

  if (
    !order.deliveryPartner ||
    !order.trackingId
  ) return false;

  try {

    const partner =
      order.deliveryPartner
      .toLowerCase();

    const links = {

      delhivery:
      `https://www.delhivery.com/tracking/${order.trackingId}`,

      bluedart:
      `https://www.bluedart.com/trackyourshipment?trackNo=${order.trackingId}`,

      xpressbees:
      `https://www.xpressbees.com/track?awb=${order.trackingId}`,
    };

    const matchedKey =

      Object.keys(links)
      .find((k)=>

        partner.includes(k)
      );

    const trackingLink =

      matchedKey

      ?

      links[matchedKey]

      :

      null;

    const html = `

      <div
      style="
      font-family:Arial;
      padding:20px;
      ">

        <h2>
          Your order is on the way 🚚
        </h2>

        <p>

          <strong>
            Order ID:
          </strong>

          ${order._id}

        </p>

        <p>

          <strong>
            Courier:
          </strong>

          ${order.deliveryPartner}

        </p>

        <p>

          <strong>
            Tracking ID:
          </strong>

          ${order.trackingId}

        </p>

        ${
          trackingLink

          ?

          `
          <a
          href="${trackingLink}"
          target="_blank"
          style="
          color:#2563eb;
          ">
            Track Shipment
          </a>
          `

          :

          ""
        }

      </div>
    `;

    await sendEmail(

      email,

      `Order Shipped - ${order._id}`,

      html
    );

    await sendEmail(

      ADMIN_EMAIL,

      `📦 Order Shipped - ${order._id}`,

      html
    );

    console.log(
      "✅ Shipment email sent"
    );

    return true;

  } catch (err) {

    console.error(

      "❌ Shipment email error:",

      err.response?.body ||

      err.message ||

      err
    );

    return false;
  }
};

/* =========================================
   CANCEL EMAIL
========================================= */

export const sendOrderCancelledEmail =
async (email, order) => {

  try {

    const reason =

      order.cancellationReason ||

      "No reason provided";

    const html = `

      <div
      style="
      font-family:Arial;
      padding:20px;
      ">

        <h2>
          Order Cancelled ❌
        </h2>

        <p>

          <strong>
            Order ID:
          </strong>

          ${order._id}

        </p>

        <p>

          <strong>
            Reason:
          </strong>

          ${reason}

        </p>

      </div>
    `;

    await sendEmail(

      email,

      `Order Cancelled - ${order._id}`,

      html
    );

    await sendEmail(

      ADMIN_EMAIL,

      `❌ Order Cancelled - ${order._id}`,

      html
    );

    console.log(
      "✅ Cancellation email sent"
    );

    return true;

  } catch (err) {

    console.error(

      "❌ Cancel email error:",

      err.response?.body ||

      err.message ||

      err
    );

    return false;
  }
};

/* =========================================
   DELIVERY EMAIL
========================================= */

export const sendOrderCompletionEmail =
async (email, order) => {

  try {

    const html = `

      <div
      style="
      font-family:Arial;
      padding:20px;
      ">

        <h2>
          Order Delivered 🎉
        </h2>

        <p>

          <strong>
            Order ID:
          </strong>

          ${order._id}

        </p>

        <p>
          We hope you enjoy your ride 🚴‍♂️
        </p>

      </div>
    `;

    await sendEmail(

      email,

      `Order Delivered - ${order._id}`,

      html
    );

    await sendEmail(

      ADMIN_EMAIL,

      `✅ Order Delivered - ${order._id}`,

      html
    );

    console.log(
      "✅ Delivery email sent"
    );

    return true;

  } catch (err) {

    console.error(

      "❌ Delivery email error:",

      err.response?.body ||

      err.message ||

      err
    );

    return false;
  }
};