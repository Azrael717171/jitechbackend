const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const quotationRoutes = require('./routes/quotationRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/test', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

// API Routes
app.use('/api/quotations', quotationRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
