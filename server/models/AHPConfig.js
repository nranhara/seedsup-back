const mongoose = require("mongoose");

const ahpConfigSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "default" },
    expertName: { type: String, required: true, trim: true },
    comparisons: {
      price_rating: { type: Number, required: true },
      price_distance: { type: Number, required: true },
      price_stock: { type: Number, required: true },
      rating_distance: { type: Number, required: true },
      rating_stock: { type: Number, required: true },
      distance_stock: { type: Number, required: true },
    },
    matrix: { type: [[Number]], required: true },
    weights: {
      price: { type: Number, required: true },
      rating: { type: Number, required: true },
      distance_km: { type: Number, required: true },
      stock: { type: Number, required: true },
    },
    consistencyIndex: { type: Number, required: true },
    consistencyRatio: { type: Number, required: true },
    isConsistent: { type: Boolean, required: true },
    source: { type: String, default: "expert" },
  },
  { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("AHPConfig", ahpConfigSchema);
