const express = require("express");
const router = express.Router();
const stockMovementController = require("../controllers/stockMovementController");

// Routes
router.post("/", stockMovementController.addStockMovement);
router.get("/", stockMovementController.getStockMovements);

module.exports = router;
