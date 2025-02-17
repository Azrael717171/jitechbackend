const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const StockMovement = require("../models/StockMovement");

// Create a new sale and update inventory & stock movements accordingly.
exports.createSale = async (req, res) => {
  try {
    const {
      clientName,
      product: productId, // Expecting product ID selected from the frontend.
      quantity,
      dateOfPurchase,
      warranty,
      termPayable,
      modeOfPayment,
      status,
    } = req.body;

    // Validate required fields
    if (!clientName || !productId || !quantity || !dateOfPurchase || !warranty || !termPayable || !modeOfPayment || !status) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Fetch the product details.
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Calculate total amount: product price * quantity
    const totalAmount = product.price * quantity;

    // Find the corresponding inventory record using productId.
    const inventory = await Inventory.findOne({ productId: product._id });
    if (!inventory) {
      return res.status(404).json({ error: "Inventory record not found for the product" });
    }

    // Check if there is enough stock.
    if (inventory.stockLevel < quantity) {
      return res.status(400).json({ error: "Insufficient stock for the sale" });
    }

    // Create the Sale record.
    const newSale = new Sale({
      clientName,
      product: product._id,
      quantity,
      totalAmount,
      dateOfPurchase,
      warranty,
      termPayable,
      modeOfPayment,
      status,
    });

    // Deduct the quantity from the inventory.
    inventory.stockLevel -= quantity;
    await inventory.save();

    // Create a Stock Movement record for the decrease.
    const stockMovement = new StockMovement({
      inventoryId: inventory._id,
      type: "DECREASE",
      quantity,
      serialNumbers: [], // For products that require serial numbers, you could pass an array here.
      reason: "Sale deduction",
      timestamp: new Date(),
    });
    await stockMovement.save();

    // Save the sale record.
    await newSale.save();

    res.status(201).json({
      message: "Sale created successfully and inventory updated",
      sale: newSale,
      newStockLevel: inventory.stockLevel,
    });
  } catch (error) {
    console.error("Error creating sale:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all sales
exports.getSales = async (req, res) => {
  try {
    const sales = await Sale.find().populate("product", "productName sku category price");
    // The returned documents will include the custom saleID field automatically.
    res.json({ data: sales });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single sale by ID
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate("product", "productName sku category price");
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
      product: newProductId,
      quantity: newQuantity,
      dateOfPurchase,
      warranty,
      termPayable,
      modeOfPayment,
      status,
    } = req.body;

    // 1. Fetch the existing sale record
    const oldSale = await Sale.findById(saleId);
    if (!oldSale) return res.status(404).json({ error: "Sale not found" });

    // 2. Reverse the effects of the old sale on inventory
    // Fetch the old product's inventory record
    const oldInventory = await Inventory.findOne({ productId: oldSale.product });
    if (!oldInventory)
      return res.status(404).json({ error: "Old product inventory not found" });

    // Add back the old quantity to the old product's inventory
    oldInventory.stockLevel += oldSale.quantity;
    await oldInventory.save();

    // Optionally, record a stock movement for reversal:
    const reversalMovement = new StockMovement({
      inventoryId: oldInventory._id,
      type: "INCREASE",
      quantity: oldSale.quantity,
      serialNumbers: [], // Adjust if serials are handled
      reason: "Sale update reversal",
      timestamp: new Date(),
    });
    await reversalMovement.save();

    // 3. Apply the new sale details

    // If the product has changed, the new inventory must be used.
    // Fetch the new product details
    const newProduct = await Product.findById(newProductId);
    if (!newProduct)
      return res.status(404).json({ error: "New product not found" });

    // Calculate the new total amount based on the new product price and quantity
    const newTotalAmount = newProduct.price * newQuantity;

    // Fetch the new product's inventory record
    const newInventory = await Inventory.findOne({ productId: newProductId });
    if (!newInventory)
      return res.status(404).json({ error: "New product inventory not found" });

    // Check if there is enough stock for the new sale quantity
    if (newInventory.stockLevel < newQuantity) {
      return res.status(400).json({ error: "Insufficient stock for new product" });
    }

    // Deduct the new quantity from the new product's inventory
    newInventory.stockLevel -= newQuantity;
    await newInventory.save();

    // Optionally, record a stock movement for the new sale:
    const saleMovement = new StockMovement({
      inventoryId: newInventory._id,
      type: "DECREASE",
      quantity: newQuantity,
      serialNumbers: [], // Adjust if serial numbers are needed
      reason: "Sale update deduction",
      timestamp: new Date(),
    });
    await saleMovement.save();

    // 4. Update the sale document with new details
    const updatedSale = await Sale.findByIdAndUpdate(
      saleId,
      {
        clientName,
        product: newProductId,
        quantity: newQuantity,
        totalAmount: newTotalAmount,
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


// Delete a sale (Optionally, you might consider reversing the stock deduction)
exports.deleteSale = async (req, res) => {
  try {
    const saleId = req.params.id;
    const sale = await Sale.findById(saleId);
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    // OPTIONAL: Reverse the sale's effect on inventory.
    const product = await Product.findById(sale.product);
    const inventory = await Inventory.findOne({ productId: product._id });
    if (inventory) {
      inventory.stockLevel += sale.quantity;
      await inventory.save();

      // Record the reversal in stock movements.
      const stockMovement = new StockMovement({
        inventoryId: inventory._id,
        type: "INCREASE",
        quantity: sale.quantity,
        serialNumbers: [], // Adjust if handling serial numbers.
        reason: "Sale deletion - stock restored",
        timestamp: new Date(),
      });
      await stockMovement.save();
    }

    await Sale.findByIdAndDelete(saleId);

    res.json({ message: "Sale deleted and inventory updated accordingly" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
