const express = require("express");
const router = express.Router();
const saleController = require("../controllers/saleController");

// Create a sale
router.post("/", saleController.createSale);

// Get all sales
router.get("/", saleController.getSales);

// Get a sale by ID
router.get("/:id", saleController.getSaleById);

// Update a sale
router.put("/:id", saleController.updateSale);

// Delete a sale
router.delete("/:id", saleController.deleteSale);

module.exports = router;
