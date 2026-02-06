const mongoose = require("mongoose");

const blockSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["text", "image", "math"],
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const optionSchema = new mongoose.Schema(
  {
    blocks: {
      type: [blockSchema],
      default: [],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "Variant bo‘sh bo‘lmasligi kerak!",
      },
    },
  },
  { _id: false }
);

const testOneSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "test",
      required: true,
    },

    questionBlocks: {
      type: [blockSchema],
      default: [],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "Savol bo‘sh bo‘lmasligi kerak!",
      },
    },

    options: {
      type: [optionSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 2,
        message: "Kamida 2 ta variant bo‘lishi kerak!",
      },
    },

    correctIndex: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("testOne", testOneSchema);
