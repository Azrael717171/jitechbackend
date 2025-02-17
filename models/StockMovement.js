const mongoose = require("mongoose");

const StockMovementSchema = new mongoose.Schema(
  {
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    type: { type: String, enum: ["INCREASE", "DECREASE"], required: true },
    quantity: { type: Number, required: true },
    serialNumbers: [{ type: String }],
    reason: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockMovement", StockMovementSchema);
