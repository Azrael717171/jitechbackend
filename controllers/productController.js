const Product = require("../models/Product");
const Inventory = require("../models/Inventory");

// Create Product & Automatically Add to Inventory
exports.createProduct = async (req, res) => {
  try {
    const { productName, sku, category, price, requiresSerialNumber } =
      req.body;

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      return res.status(400).json({ error: "SKU already exists" });
    }

    // Create Product Entry
    const newProduct = new Product({
      productName,
      sku,
      category,
      price,
      requiresSerialNumber,
    });
    await newProduct.save();

    // Create Inventory Entry with stockLevel: 0
    const newInventory = new Inventory({
      productId: newProduct._id,
      productName,
      sku,
      category,
      stockLevel: 0, // Default stock
    });
    await newInventory.save();

    res
      .status(201)
      .json({ message: "Product added successfully", product: newProduct });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().lean(); // ✅ Use lean() for faster queries

    // ✅ Fetch inventory details for each product
    const inventoryData = await Inventory.find()
      .select("productId stockLevel serialNumbers")
      .lean();

    // ✅ Merge inventory data into products list
    const mergedProducts = products.map((product) => {
      const inventoryItem = inventoryData.find(
        (inv) => inv.productId.toString() === product._id.toString()
      );
      return {
        ...product,
        stockLevel: inventoryItem ? inventoryItem.stockLevel : 0, // Default 0 if no stock entry
        serialNumbers: inventoryItem ? inventoryItem.serialNumbers : [], // Default empty array
      };
    });

    res.json({ data: mergedProducts });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Fetch a single product by ID
exports.getProductById = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid Product ID format" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Update Product and Sync Inventory Active Status
exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const { productName, sku, category, price, active, requiresSerialNumber } =
      req.body;

    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid Product ID format" });
    }

    const existingProduct = await Product.findById(productId);
    if (!existingProduct)
      return res.status(404).json({ error: "Product not found" });

    // ✅ Update Product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { productName, sku, category, price, active, requiresSerialNumber },
      { new: true }
    );

    // ✅ Sync Inventory Status (Mark inactive if product is inactive)
    await Inventory.updateMany(
      { productId },
      { $set: { sku, category, active: active } } // ✅ Ensure inventory follows product active status
    );

    res.json({
      message: "Product and inventory updated successfully!",
      product: updatedProduct,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Manually trigger inventory update
exports.updateInventoryForProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) return res.status(404).json({ error: "Product not found" });

    await Inventory.updateMany(
      { productId },
      {
        $set: {
          sku: product.sku,
          category: product.category,
          active: product.active, // ✅ Ensure active status syncs
        },
      }
    );

    res.json({ message: "Inventory updated after product update!" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Delete Product & Remove from Inventory
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    // ✅ Remove product and associated inventory
    await Product.findByIdAndDelete(req.params.id);
    await Inventory.findOneAndDelete({ productId: product._id });

    res.json({ message: "Product and linked inventory deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
