const express = require('express');
const router = express.Router();
const JobOrderController = require('../controllers/jobOrderController');

// Create a new Job Order
router.post('/', JobOrderController.createJobOrder);

// Get all Job Orders with pagination and sorting
router.get('/', JobOrderController.getJobOrders);

// Get a single Job Order by ID
router.get('/:id', JobOrderController.getJobOrderById);

// Update a Job Order by ID
router.put('/:id', JobOrderController.updateJobOrder);

// Delete a Job Order by ID
router.delete('/:id', JobOrderController.deleteJobOrder);

module.exports = router;
