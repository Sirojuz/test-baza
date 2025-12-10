const Attempt = require("../model/attempt");
const TestOne = require("../model/testOne");
const TestInfo = require("../model/testInfo");
const Test = require("../model/test");
const mongoose = require("mongoose");

exports.startAttempt = async (req, res) => {
  try {
    const { studentId, testId } = req.body;

    if (!studentId || !testId) {
      return res.status(400).json({
        success: false,
        message: "studentId va testId yuborilishi shart!",
      });
    }

    // 1) Testni topamiz
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test topilmadi!",
      });
    }

    // Test uchun berilgan vaqt (minutlarda)
    const duration = Number(test.duration || 0); // agar qo‘ymagan bo‘lsa 0 bo‘ladi
    const now = new Date();
    const finishTime =
      duration > 0 ? new Date(now.getTime() + duration * 60000) : null;

    // 2) Oldin boshlaganmi?
    let attempt = await Attempt.findOne({ studentId, testId });

    if (attempt) {
      // 1) Agar allaqachon yakunlagan bo‘lsa → qayta ruxsat yo‘q
      if (attempt.status === "finished") {
        return res.json({
          success: false,
          already: true,
          reason: "already_finished",
          message: "Siz bu testni allaqachon yakunlagansiz.",
        });
      }

      // 2) Agar finishTime bor va vaqt tugagan bo‘lsa → qayta ruxsat yo‘q
      if (attempt.finishTime && new Date() > attempt.finishTime) {
        return res.json({
          success: false,
          already: true,
          reason: "time_over",
          message: "Test vaqti tugagan.",
        });
      }

      // 3) Test hali davom etayotgan bo‘lsa → savollarni qaytaramiz
      return res.json({
        success: true,
        attemptId: attempt._id,
        questions: attempt.questions || [],
        finishTime: attempt.finishTime,
      });
    }

    // 3) Random savollar sonini TestInfo dan olamiz
    const info = await TestInfo.findOne({ testId });
    if (!info || !info.randomCount) {
      return res.status(400).json({
        success: false,
        message: "Ushbu test uchun randomCount topilmadi (TestInfo yo‘q).",
      });
    }

    const randomCount = info.randomCount;

    // 4) Random savollarni tanlaymiz
    const questions = await TestOne.aggregate([
      { $match: { testId: new mongoose.Types.ObjectId(testId) } },
      { $sample: { size: randomCount } },
    ]);

    if (!questions.length) {
      return res.status(400).json({
        success: false,
        message: "Bu test uchun savollar topilmadi (TestOne bo‘sh).",
      });
    }

    // 5) Yangi attempt yaratamiz
    attempt = await Attempt.create({
      studentId,
      testId,
      questions,
      startTime: now,
      finishTime,
    });

    return res.json({
      success: true,
      attemptId: attempt._id,
      questions,
      finishTime,
    });
  } catch (err) {
    console.error("startAttempt error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
