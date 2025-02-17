const mongoose = require('mongoose');


const QuotationSchema = new mongoose.Schema({
  quotationNumber: { type: String, unique: true },
  companyName: { type: String, required: true },
  address: { type: String, required: true },
  contactNo: { type: String, required: true },
  tin: { type: String },
  clientName: { type: String, required: true },
  quotationDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  reference: { type: String },
  salesPerson: { type: String },
  paymentTerm: { type: String }
}, { timestamps: true });


module.exports = mongoose.model('Quotation', QuotationSchema);
