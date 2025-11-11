import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userEmail: { type: String }, // optional for easy reference in emails

    orderItems: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: String,
        qty: Number,
        price: Number,
        image: String,
      },
    ],

    shippingAddress: {
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },

    paymentInfo: {
      id: String,
      status: String, // "COD" or "Paid"
      orderId: String,
      paymentId: String,
      signature: String,
    },

    itemsPrice: Number,
    taxPrice: Number,
    shippingPrice: Number,
    totalPrice: Number,

    isPaid: { type: Boolean, default: false },
    paidAt: Date,

    isShipped: { type: Boolean, default: false },
    shippedAt: Date,

    isDelivered: { type: Boolean, default: false },
    deliveredAt: Date,

    // ---------------- Shipment Details ----------------
    deliveryPartner: String,
    trackingId: String,
    trackingLink: String, // 👈 tracking URL for easy frontend access

    // ---------------- Order Status ----------------
    status: {
      type: String,
      enum: ["cart", "waiting", "shipping", "completed", "cancelled"],
      default: "waiting",
    },
    cancellationReason: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
