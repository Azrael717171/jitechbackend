const StockMovement = require("../models/StockMovement");
const Inventory = require("../models/Inventory");

// Add stock movement (increase/decrease stock)
exports.addStockMovement = async (req, res) => {
  try {
    const { inventoryId, type, quantity, serialNumbers, reason } = req.body;

    const inventoryItem = await Inventory.findById(inventoryId);
    if (!inventoryItem) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    // Validate serial numbers for INCREASE type
    if (
      type === "INCREASE" &&
      (!serialNumbers || serialNumbers.length !== quantity)
    ) {
      return res
        .status(400)
        .json({ error: "Serial numbers must match the quantity" });
    }

    // Update inventory stock level
    if (type === "INCREASE") {
      inventoryItem.stockLevel += quantity;
      inventoryItem.serialNumbers.push(...serialNumbers); // ✅ Store serial numbers in Inventory
    } else if (type === "DECREASE") {
      inventoryItem.stockLevel -= quantity;

      // ✅ Remove serial numbers from Inventory when stock decreases
      inventoryItem.serialNumbers = inventoryItem.serialNumbers.filter(
        (sn) => !serialNumbers.includes(sn)
      );
    }

    await inventoryItem.save();

    // Create Stock Movement record
    const stockMovement = new StockMovement({
      inventoryId,
      type,
      quantity,
      serialNumbers,
      reason,
      timestamp: new Date(),
    });

    await stockMovement.save();

    res.json({
      message: "Stock successfully updated!",
      stockMovement,
      newStockLevel: inventoryItem.stockLevel,
    });
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ Fetch Stock Movements with Pagination
exports.getStockMovements = async (req, res) => {
  try {
    let { page = 1, limit = 5 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const stockMovements = await StockMovement.find()
      .sort({ timestamp: -1 }) // ✅ Sort newest first
      .skip((page - 1) * limit) // ✅ Pagination offset
      .limit(limit)
      .populate("inventoryId", "productName");

    const total = await StockMovement.countDocuments(); // ✅ Total count

    res.json({
      data: stockMovements,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("❌ Error fetching stock movements:", error);
    res.status(500).json({ error: "Server error" });
  }
};
