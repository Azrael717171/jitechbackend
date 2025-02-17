const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");

// Routes
router.get("/", inventoryController.getInventoryList);
router.get("/active", inventoryController.getActiveInventory);
router.post("/add", inventoryController.createInventoryItem);
router.put("/:id/deactivate", inventoryController.toggleProductStatus);
router.delete("/:id", inventoryController.deleteInventoryItem);

module.exports = router;
