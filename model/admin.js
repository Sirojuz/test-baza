const mongoose = require("mongoose");

const admin = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: Number,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "teacher"],
      default: "teacher",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("admin", admin);
