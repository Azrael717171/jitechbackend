const mongoose = require("mongoose");
const Counter = require("./Counter"); // Ensure the path is correct
const Sale = require("./Sale"); // Assuming Sale model is in the same directory

// JobOrder Schema
const JobOrderSchema = new mongoose.Schema({
  jobOrderID: { type: String, unique: true },
  saleID: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true }, // Reference to the Sale model
  clientName: { type: String, required: true },
  address: { type: String, required: true },
  contactInfo: { type: String, required: true },
  description: { type: String, required: true },
  installationDate: { type: Date, required: true },
  status: { type: String, required: true },
}, { timestamps: true });

// Pre-save hook to auto-generate custom jobOrderID if it's a new document.
JobOrderSchema.pre("save", async function (next) {
  const jobOrder = this;
  if (!jobOrder.isNew) return next();

  try {
    const counter = await Counter.findOneAndUpdate(
      { _id: "jobOrderID" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    // Generate jobOrderID in the format [JO-0000]
    jobOrder.jobOrderID = `JO-${counter.seq.toString().padStart(4, "0")}`;

    // Fetch the client name from the referenced Sale model
    const sale = await Sale.findById(jobOrder.saleID);
    if (sale) {
      jobOrder.clientName = sale.clientName; // Set the clientName based on Sale's clientName
    }

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("JobOrder", JobOrderSchema);
