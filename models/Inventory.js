const mongoose = require("mongoose");

const InventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    stockLevel: { type: Number, required: true, default: 0 },
    serialNumbers: [{ type: String }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inventory", InventorySchema);
