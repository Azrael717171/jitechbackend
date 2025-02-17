const express = require('express'); 
const router = express.Router();
const Quotation = require('../models/Quotation');

/// Function to generate a unique random Quotation Number
async function generateQuotationNumber() {
  let quotationNumber;
  let exists = true;

  while (exists) {
    const randomNum = Math.floor(10000 + Math.random() * 90000); // Generates a 5-digit random number
    quotationNumber = `QTN-${new Date().getFullYear()}-${randomNum}`;
    
    // Check if the generated quotationNumber already exists
    const existingQuotation = await Quotation.findOne({ quotationNumber });
    exists = existingQuotation !== null;
  }

  return quotationNumber;
}

// Get all quotations
router.get('/', async (req, res) => {
  try {
    const quotations = await Quotation.find().sort({ createdAt: -1 });
    res.json(quotations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new quotation with a generated quotationNumber
router.post('/', async (req, res) => {
  try {
    const quotationNumber = await generateQuotationNumber(); // Generate quotation number
    const quotation = new Quotation({ ...req.body, quotationNumber }); // Include in new Quotation
    const savedQuotation = await quotation.save();
    res.status(201).json(savedQuotation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
