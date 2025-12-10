const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  testId: { type: mongoose.Schema.Types.ObjectId, required: true },
  questions: { type: Array, required: true }, // random tanlangan testlar
  createdAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "finished"],
    default: "pending",
  },
});

module.exports = mongoose.model("attempt", attemptSchema);
