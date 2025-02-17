const Inventory = require("../models/Inventory");
const Product = require("../models/Product");

// Get paginated inventory list with sorting
exports.getInventoryList = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const sortOrder = order === "desc" ? -1 : 1;

    // ✅ Fetch inventory and include serial numbers
    const inventory = await Inventory.find({ active: true })
      .populate(
        "productId",
        "productName sku category price active serialNumbers"
      )
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Inventory.countDocuments({ active: true });

    res.json({
      data: inventory,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single inventory item
exports.getActiveInventory = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const sortOrder = order === "desc" ? -1 : 1;

    // Fetch only active products
    const activeProducts = await Product.find({ active: true }).select("sku");
    const activeSkus = activeProducts.map((p) => p.sku);

    // Fetch only inventory items linked to active products
    const inventory = await Inventory.find({ sku: { $in: activeSkus } })
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Inventory.countDocuments({ sku: { $in: activeSkus } });

    res.json({
      data: inventory,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new inventory item
exports.createInventoryItem = async (req, res) => {
  try {
    const { productId, sku, category, stockLevel } = req.body;

    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid Product ID format" });
    }

    const newInventory = new Inventory({
      productId,
      sku,
      category,
      stockLevel: stockLevel || 0,
    });

    await newInventory.save();
    res.status(201).json({
      message: "✅ Inventory added successfully!",
      inventory: newInventory,
    });
  } catch (error) {
    console.error("❌ Error adding inventory:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Toggle Product Active/Inactive Instead of Deleting
exports.toggleProductStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    product.active = !product.active;
    await product.save();

    res.json({
      message: `Product ${
        product.active ? "reactivated" : "deactivated"
      } successfully`,
      product,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete inventory item
exports.deleteInventoryItem = async (req, res) => {
  try {
    const deletedItem = await Inventory.findByIdAndDelete(req.params.id);
    if (!deletedItem) return res.status(404).json({ error: "Item not found" });

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
