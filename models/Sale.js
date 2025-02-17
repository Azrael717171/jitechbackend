const mongoose = require("mongoose");
const Counter = require("./Counter"); // Ensure the path is correct

const SaleSchema = new mongoose.Schema(
  {
    saleID: {
      type: String,
      unique: true,
    },
    clientName: { type: String, required: true },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    dateOfPurchase: { type: Date, required: true },
    warranty: { type: String, required: true },
    termPayable: { type: String, required: true },
    modeOfPayment: { type: String, required: true },
    status: { type: String, required: true },
  },
  { timestamps: true }
);

// Pre-save hook to auto-generate custom saleID if it's a new document.
SaleSchema.pre("save", async function (next) {
  const sale = this;
  if (!sale.isNew) return next();

  try {
    const counter = await Counter.findOneAndUpdate(
      { _id: "saleID" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    // Generate saleID in the format [SA-0000]
    sale.saleID = `SA-${counter.seq.toString().padStart(4, "0")}`;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Sale", SaleSchema);
