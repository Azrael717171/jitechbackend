const JobOrder = require("../models/JobOrder");
const Sale = require("../models/Sale"); // Import Sale model

// Add indexing to improve search performance
JobOrder.collection.createIndex({ jobOrderID: 1, clientName: 1 });

// Create a new Job Order (based on Sale)
exports.createJobOrder = async (req, res) => {
  try {
    console.log("Incoming Job Order Data:", req.body);

    const {
      saleID, // The Sale ID to reference Sale model
      address,
      contactInfo,
      description,
      installationDate,
      status,
    } = req.body;

    if (!saleID || !address || !contactInfo || !description || !installationDate || !status) {
      console.error("Missing required fields:", req.body);
      return res.status(400).json({ error: "All fields are required" });
    }

    // Fetch the Sale record by SaleID to get client details
    const sale = await Sale.findById(saleID);
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    // Create the JobOrder record
    const newJobOrder = new JobOrder({
      saleID,
      clientName: sale.clientName, // Automatically populate client name
      address,
      contactInfo,
      description,
      installationDate,
      status,
    });

    // Save JobOrder to the database
    await newJobOrder.save();

    console.log("Job Order created successfully:", newJobOrder);
    res.status(201).json({
      message: "Job Order created successfully",
      jobOrder: newJobOrder,
    });
  } catch (error) {
    console.error("🔥 Error creating Job Order:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all Job Orders with pagination, sorting, and filtering
exports.getJobOrders = async (req, res) => {
  try {
    let { page = 1, limit = 10, search, sortBy = 'installationDate', order = 'desc' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const query = {};

    // If search query exists, filter by jobOrderID or clientName
    if (search) {
      query.$or = [
        { jobOrderID: { $regex: search, $options: "i" } }, // Case-insensitive JobOrder ID
        { clientName: { $regex: search, $options: "i" } } // Case-insensitive Client Name
      ];
    }

    // Sorting logic
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortQuery = { [sortBy]: sortOrder };

    // Fetch job orders with pagination and populate Sale fields (clientName)
    const jobOrders = await JobOrder.find(query)
      .populate("saleID", "clientName") // Populate Sale info (clientName) 
      .sort(sortQuery) // Apply sorting
      .skip((page - 1) * limit)
      .limit(limit);

    // Count total job orders matching the query (for pagination)
    const total = await JobOrder.countDocuments(query);

    res.json({
      data: jobOrders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single Job Order by ID
exports.getJobOrderById = async (req, res) => {
  try {
    const jobOrder = await JobOrder.findById(req.params.id).populate("saleID", "clientName");
    if (!jobOrder) return res.status(404).json({ error: "Job Order not found" });
    res.json(jobOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a Job Order by ID
exports.updateJobOrder = async (req, res) => {
  try {
    const { saleID, address, contactInfo, description, installationDate, status } = req.body;

    if (!saleID || !address || !contactInfo || !description || !installationDate || !status) {
      console.error("Missing required fields:", req.body);
      return res.status(400).json({ error: "All fields are required" });
    }

    // Fetch the existing Job Order by ID
    const jobOrder = await JobOrder.findById(req.params.id);
    if (!jobOrder) {
      return res.status(404).json({ error: "Job Order not found" });
    }

    // Fetch the Sale record
    const sale = await Sale.findById(saleID);
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    // Update the Job Order record
    jobOrder.saleID = saleID;
    jobOrder.clientName = sale.clientName; // Ensure clientName is updated
    jobOrder.address = address;
    jobOrder.contactInfo = contactInfo;
    jobOrder.description = description;
    jobOrder.installationDate = installationDate;
    jobOrder.status = status;

    // Save the updated Job Order
    const updatedJobOrder = await jobOrder.save();

    res.json({
      message: "Job Order updated successfully",
      jobOrder: updatedJobOrder,
    });
  } catch (error) {
    console.error("Error updating Job Order:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a Job Order by ID
exports.deleteJobOrder = async (req, res) => {
  try {
    const jobOrder = await JobOrder.findByIdAndDelete(req.params.id);
    if (!jobOrder) {
      return res.status(404).json({ error: "Job Order not found" });
    }
    res.json({ message: "Job Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting job order:", error);
    res.status(500).json({ error: error.message });
  }
};
