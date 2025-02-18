const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const StockMovement = require("../models/StockMovement");

// Add indexing to improve search performance
Sale.collection.createIndex({ saleID: 1, clientName: 1 });

// Create a new sale (with multiple sale items) and update inventory & stock movements accordingly.
exports.createSale = async (req, res) => {
  try {
    console.log("Incoming Sale Data:", req.body); // 🔍 Log request data

    const {
      clientName,
      saleItems, // Expecting an array of { product, quantity }
      dateOfPurchase,
      warranty,
      termPayable,
      modeOfPayment,
      status,
    } = req.body;

    if (
      !clientName ||
      !saleItems ||
      !Array.isArray(saleItems) ||
      saleItems.length === 0 ||
      !dateOfPurchase ||
      !warranty ||
      !termPayable ||
      !modeOfPayment ||
      !status
    ) {
      console.error("Missing required fields:", req.body);
      return res.status(400).json({ error: "All fields are required" });
    }

    let computedOverallTotal = 0;
    const processedSaleItems = [];

    for (let item of saleItems) {
      const { product: productId, quantity } = item;
      if (!productId || !quantity) {
        console.error("Invalid sale item:", item);
        return res.status(400).json({ error: "Each sale item must have a product and quantity" });
      }

      // Fetch the product details.
      const product = await Product.findById(productId);
      if (!product) {
        console.error("Product not found:", productId);
        return res.status(404).json({ error: `Product not found: ${productId}` });
      }

      // Calculate total amount for this item.
      const itemTotal = product.price * quantity;

      // Find the corresponding inventory record using productId.
      const inventory = await Inventory.findOne({ productId: product._id });
      if (!inventory) {
        console.error("Inventory record not found for product:", product._id);
        return res.status(404).json({ error: `Inventory record not found for product: ${product._id}` });
      }

      // Check if there is enough stock.
      if (inventory.stockLevel < quantity) {
        console.error("Insufficient stock for product:", product.productName);
        return res.status(400).json({ error: `Insufficient stock for product: ${product.productName}` });
      }

      // Deduct the quantity from the inventory.
      inventory.stockLevel -= quantity;
      await inventory.save();

      // Create a Stock Movement record for the decrease.
      const stockMovement = new StockMovement({
        inventoryId: inventory._id,
        type: "DECREASE",
        quantity,
        serialNumbers: [],
        reason: "Sale deduction",
        timestamp: new Date(),
      });
      await stockMovement.save();

      computedOverallTotal += itemTotal;
      processedSaleItems.push({
        product: product._id,
        quantity,
        totalAmount: itemTotal,
      });
    }

    // Create the Sale record.
    const newSale = new Sale({
      clientName,
      saleItems: processedSaleItems,
      overallTotalAmount: computedOverallTotal,
      dateOfPurchase,
      warranty,
      termPayable,
      modeOfPayment,
      status,
    });

    await newSale.save();

    console.log("Sale created successfully:", newSale);
    res.status(201).json({ message: "Sale created successfully", sale: newSale });

  } catch (error) {
    console.error("🔥 Error creating sale:", error); // 🔥 Log full error
    res.status(500).json({ error: error.message });
  }
};

// Get all sales
exports.getSales = async (req, res) => {
  try {
    let { page = 1, limit = 10, search, sortBy = 'dateOfPurchase', order = 'desc' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const query = {};

    // If search query exists, filter by saleID or clientName
    if (search) {
      query.$or = [
        { saleID: { $regex: search, $options: "i" } }, // Case-insensitive Sale ID
        { clientName: { $regex: search, $options: "i" } } // Case-insensitive Client Name
      ];
    }

    // Sorting logic
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortQuery = { [sortBy]: sortOrder };

    // Fetch sales with pagination and populate saleItems.product to show product details
    const sales = await Sale.find(query)
      .populate("saleItems.product", "productName sku category price")
      .sort(sortQuery) // Apply sorting
      .skip((page - 1) * limit)
      .limit(limit);

    // Count total sales matching the query (for pagination)
    const total = await Sale.countDocuments(query);

    res.json({
      data: sales,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get a single sale by ID
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate("saleItems.product", "productName sku category price");
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update sale and synchronize inventory and stock movements
exports.updateSale = async (req, res) => {
  try {
    const saleId = req.params.id;
    const {
      clientName,
      saleItems, // New sale items array
      dateOfPurchase,
      warranty,
      termPayable,
      modeOfPayment,
      status,
    } = req.body;

    // 1. Fetch the existing sale record.
    const oldSale = await Sale.findById(saleId);
    if (!oldSale) return res.status(404).json({ error: "Sale not found" });

    // 2. Reverse the effects of the old sale on inventory.
    // For each old sale item, add back the quantity to its inventory.
    for (let oldItem of oldSale.saleItems) {
      const oldInventory = await Inventory.findOne({ productId: oldItem.product });
      if (oldInventory) {
        oldInventory.stockLevel += oldItem.quantity;
        await oldInventory.save();

        // Record reversal stock movement.
        const reversalMovement = new StockMovement({
          inventoryId: oldInventory._id,
          type: "INCREASE",
          quantity: oldItem.quantity,
          serialNumbers: [], // Adjust if needed.
          reason: "Sale update reversal",
          timestamp: new Date(),
        });
        await reversalMovement.save();
      }
    }

    // 3. Process new sale items.
    let computedOverallTotal = 0;
    const processedSaleItems = [];

    for (let item of saleItems) {
      const { product: productId, quantity } = item;
      if (!productId || !quantity) {
        return res
          .status(400)
          .json({ error: "Each sale item must have a product and quantity" });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ error: `Product not found: ${productId}` });
      }

      const itemTotal = product.price * quantity;

      const inventory = await Inventory.findOne({ productId: product._id });
      if (!inventory) {
        return res
          .status(404)
          .json({ error: `Inventory record not found for product: ${product._id}` });
      }

      if (inventory.stockLevel < quantity) {
        return res
          .status(400)
          .json({ error: `Insufficient stock for product: ${product.productName}` });
      }

      // Deduct new quantity from inventory.
      inventory.stockLevel -= quantity;
      await inventory.save();

      // Record stock movement for new sale.
      const saleMovement = new StockMovement({
        inventoryId: inventory._id,
        type: "DECREASE",
        quantity,
        serialNumbers: [],
        reason: "Sale update deduction",
        timestamp: new Date(),
      });
      await saleMovement.save();

      computedOverallTotal += itemTotal;

      processedSaleItems.push({
        product: product._id,
        quantity,
        totalAmount: itemTotal,
      });
    }

    // 4. Update the sale document with new details.
    const updatedSale = await Sale.findByIdAndUpdate(
      saleId,
      {
        clientName,
        saleItems: processedSaleItems,
        overallTotalAmount: computedOverallTotal,
        dateOfPurchase,
        warranty,
        termPayable,
        modeOfPayment,
        status,
      },
      { new: true }
    );

    res.json({ message: "Sale updated successfully", sale: updatedSale });
  } catch (error) {
    console.error("Error updating sale:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a sale (Optionally, reverse the sale's effect on inventory)
exports.deleteSale = async (req, res) => {
  try {
    const saleId = req.params.id;
    const sale = await Sale.findById(saleId);
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    // Reverse the sale's effects: add back stock for each sale item.
    for (let item of sale.saleItems) {
      const inventory = await Inventory.findOne({ productId: item.product });
      if (inventory) {
        inventory.stockLevel += item.quantity;
        await inventory.save();

        const stockMovement = new StockMovement({
          inventoryId: inventory._id,
          type: "INCREASE",
          quantity: item.quantity,
          serialNumbers: [],
          reason: "Sale deletion - stock restored",
          timestamp: new Date(),
        });
        await stockMovement.save();
      }
    }

    await Sale.findByIdAndDelete(saleId);

    res.json({ message: "Sale deleted and inventory updated accordingly" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
