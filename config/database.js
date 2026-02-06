const mongoose = require("mongoose");
const mongoUrl = "mongodb://127.0.0.1:27017/test-baza";

module.exports = async function connectDB() {
  try {
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB ishladi:", mongoUrl);
  } catch (error) {
    console.log("Error on connecting database:", error.message);
    process.exit(1);
  }
};
