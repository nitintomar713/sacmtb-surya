import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, default: "SAC MTB" },
    modelNumber: { type: String, trim: true },
    type: { type: String, enum: ["MTB", "Road", "Hybrid", "Kids", "Ladies"], default: "MTB" },
    description: { type: String, trim: true },
    bulletPoints: [{ type: String }], // 🟢 for key highlights
    price: { type: Number, required: true },
    discountPrice: { type: Number },
    category: { type: String, default: "Bicycle" },
    colorOptions: [{ type: String }],
    wheelSize: { type: String },
    frameMaterial: { type: String },
    suspension: { type: String },
    brakeType: { type: String },
    gears: { type: String },
    weight: { type: String },
    stock: { type: Number, default: 0 },
    imageUrls: [{ type: String }], // 🟢 Cloudinary image URLs
    videoUrl: { type: String }, // 🟢 Cloudinary video URL
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Auto stock management methods
productSchema.methods.decreaseStock = async function (quantity) {
  if (this.stock >= quantity) {
    this.stock -= quantity;
    await this.save();
  } else {
    throw new Error("Not enough stock");
  }
};

productSchema.methods.increaseStock = async function (quantity) {
  this.stock += quantity;
  await this.save();
};

const Product = mongoose.model("Product", productSchema);
export default Product;
