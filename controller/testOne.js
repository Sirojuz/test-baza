const Test = require("../model/testOne");
const fs = require("fs");
const mammoth = require("mammoth");

// WORD FILE UPLOAD → PARSE → DB SAVE
exports.uploadWord = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "File yuklanmadi!" });
    }

    // Wordni o'qish
    const result = await mammoth.extractRawText({ path: req.file.path });
    const text = result.value;
    const tests = parseWord(text);

    // DB ga saqlash
    const saved = await Test.insertMany(tests);

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      totalSaved: saved.length,
      tests: saved,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// WORD PARSER FUNKSIYASI
function parseWord(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const tests = [];
  let question = "";
  let options = [];

  for (let line of lines) {
    if (/^\d+\./.test(line)) {
      if (question && options.length === 4) {
        tests.push(testBuilder(question, options));
      }
      question = line.replace(/^\d+\.\s*/, "");
      options = [];
    }

    if (/^[A-D]\)/i.test(line)) {
      const isCorrect = line.includes("*");
      const option = line
        .replace("*", "")
        .replace(/^[A-D]\)\s*/, "")
        .trim();
      options.push({ text: option, isCorrect });
    }
  }

  if (question && options.length === 4) {
    tests.push(testBuilder(question, options));
  }

  return tests;
}

// WORD → MODEL FORMATIGA O‘GIRISH
function testBuilder(question, opts) {
  const optionTexts = opts.map((o) => o.text);
  const correctIndex = opts.findIndex((o) => o.isCorrect);

  return {
    question,
    options: optionTexts,
    correctIndex,
  };
}

// CRUD
exports.getAll = async (req, res) => {
  try {
    const data = await Test.find();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const saved = await Test.create(req.body);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await Test.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Test o'chirildi" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
