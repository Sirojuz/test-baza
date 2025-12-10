const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    // Test mavzusi ID
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "test",
      required: true,
    },

    // ⭐ YANGI QO‘SHILADI — attempt ID bilan bog‘lash uchun
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "attempt",
      required: true,
    },

    correct: Number,
    wrong: Number,
    total: Number,
    percent: Number,
    grade: Number,

    // Talaba tanlagan variantlar
    answers: [Number],
  },
  { timestamps: true }
);

module.exports = mongoose.model("result", resultSchema);
