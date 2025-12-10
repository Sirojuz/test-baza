const mongoose = require("mongoose");

const test = mongoose.Schema(
  {
    title: { type: String, required: true },
    desc: { type: String, required: true },
    duration: {
      type: Number, // minutlarda
      required: true,
    },
    testCode: {
      type: Number,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("test", test);
