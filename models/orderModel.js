import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    /* ================= USER ================= */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userEmail: {
      type: String,
      trim: true,
    },

    /* ================= ORDER ITEMS ================= */
    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        image: String,
        qty: {
          type: Number,
          required: true,
        },

        // 🔥 PRICE STRUCTURE (IMPORTANT)
        price: {
          type: Number,
          required: true, // ✅ FINAL PRICE (discounted if available)
        },
        originalPrice: {
          type: Number,   // MRP
        },
        discountPrice: {
          type: Number,   // Discounted price (if any)
        },
      },
    ],

    /* ================= SHIPPING ADDRESS ================= */
    shippingAddress: {
      fullName: {
        type: String,
        required: true,
        trim: true,
      },
      phoneNumber: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      postalCode: {
        type: String,
        required: true,
        trim: true,
      },
      country: {
        type: String,
        required: true,
        trim: true,
      },
    },

    /* ================= PAYMENT INFO ================= */
    paymentInfo: {
      id: String,
      status: String,
      orderId: String,      // Razorpay order ID
      paymentId: String,   // Razorpay payment ID
      signature: String,
    },

paymentMethod: {
  type: String,
  enum: ["COD", "ONLINE"],
  required: true,
},

    /* ================= PRICING ================= */
    itemsPrice: {
      type: Number,
      required: true,
    },
    taxPrice: {
      type: Number,
      required: true,
    },
    shippingPrice: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },

    /* ================= PAYMENT STATUS ================= */
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: Date,

    /* ================= SHIPPING STATUS ================= */
    isShipped: {
      type: Boolean,
      default: false,
    },
    shippedAt: Date,

    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: Date,

    deliveryPartner: String,
    trackingId: String,
    trackingLink: String,

    /* ================= ORDER STATUS ================= */
    status: {
      type: String,
      enum: [
        "cart",
        "created",   // Razorpay order created
        "waiting",   // Payment pending
        "shipping",
        "completed",
        "cancelled",
      ],
      default: "created",
    },

    cancellationReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
