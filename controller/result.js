const Result = require("../model/result");
const Attempt = require("../model/attempt");
const User = require("../model/user");
const mongoose = require("mongoose");

exports.saveResult = async (req, res) => {
  try {
    const {
      studentId,
      testId,
      attemptId,
      correct,
      wrong,
      total,
      percent,
      grade,
      answers,
    } = req.body;

    const newResult = await Result.create({
      studentId: new mongoose.Types.ObjectId(studentId),
      testId: new mongoose.Types.ObjectId(testId),
      attemptId,
      correct,
      wrong,
      total,
      percent,
      grade,
      answers,
    });

    await Attempt.findByIdAndUpdate(attemptId, { status: "finished" });

    res.json({
      success: true,
      message: "Natija saqlandi!",
      data: newResult,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getByAttempt = async (req, res) => {
  try {
    const result = await Result.findOne({ attemptId: req.params.id });

    if (!result) {
      return res.json({
        success: false,
        message: "Natija topilmadi",
        data: null,
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.getResultsByTest = async (req, res) => {
  try {
    const testId = req.params.testId;

    // 1) Natijalarni olish
    const results = await Result.find({ testId })
      .populate("studentId", "name faculty groupNumber")
      .populate("attemptId") // attempts.data
      .populate("testId"); // test mavzusi

    if (!results.length) {
      return res.json({
        success: false,
        message: "Bu test bo‘yicha hali natija yo‘q",
        data: [],
      });
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//  Ozgardi +
