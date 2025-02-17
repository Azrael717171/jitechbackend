require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.PORT || 5000;

// Debugging: Check if MONGO_URL is loaded
console.log("🔍 MONGO_URL from .env:", process.env.MONGO_URL);

// Ensure MONGO_URL is defined before connecting
if (!process.env.MONGO_URL) {
  console.error("❌ MONGO_URL is undefined! Check your .env file.");
  process.exit(1); // Stop execution if missing
}

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
