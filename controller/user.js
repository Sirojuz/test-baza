const User = require("../model/user");
const Result = require("../model/result");

exports.register = async (req, res) => {
  try {
    const { name, faculty, groupNumber, role } = req.body;

    const result = new User({
      name: name,
      faculty: faculty,
      groupNumber: groupNumber,
      role: role,
    });

    result.save();
    res.json({ success: true, result: result });
  } catch (err) {
    res.json({ error: err });
  }
};

exports.getAll = async (req, res) => {
  try {
    const result = await User.find();
    res.json({ success: true, result: result });
  } catch (err) {
    res.json({ error: err });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await User.findById({ _id: req.params.id });
    res.json({ success: true, result: result });
  } catch (err) {
    res.json({ error: err });
  }
};

exports.deleteAllStudents = async (req, res) => {
  try {
    // faqat admin o‘chira oladi
    if (req.body.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Ruxsat yo‘q! Buni faqat admin bajarishi mumkin.",
      });
    }

    // 1) Barcha studentlarni o‘chirish
    const deleteStudents = await User.deleteMany({ role: "student" });

    // 2) Barcha resultlarni o‘chirish
    const deleteResults = await Result.deleteMany({});

    res.json({
      success: true,
      message: "Barcha talabalar va barcha natijalar o‘chirildi!",
      deletedStudents: deleteStudents.deletedCount,
      deletedResults: deleteResults.deletedCount,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
