const express = require('express');
const router = express.Router();
const Quotation = require('../models/Quotation');

// Get all quotations
router.get('/', async (req, res) => {
  try {
    const quotations = await Quotation.find().sort({ createdAt: -1 });
    res.json(quotations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new quotation
router.post('/', async (req, res) => {
  const quotation = new Quotation(req.body);
  try {
    const savedQuotation = await quotation.save();
    res.status(201).json(savedQuotation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
