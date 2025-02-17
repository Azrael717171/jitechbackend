require("dotenv").config();
const express = require("express");
const cors = require("cors");

const inventoryRoutes = require("./routes/inventoryRoute");
const productRoutes = require("./routes/productRoute");
const stockMovementRoutes = require("./routes/stockMovementRoute");
const quotationRoutes = require("./routes/quotationRoutes");
const salesRoutes = require("./routes/saleRoute")

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/inventory", inventoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stock-movements", stockMovementRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/sales", salesRoutes)

module.exports = app;
