const Test = require("../model/test");
const TestOne = require("../model/testOne");
const TestInfo = require("../model/testInfo");
const Attempt = require("../model/attempt");
const Results = require("../model/result");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

function generateTestCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

exports.create = async (req, res) => {
  try {
    const { title, desc, duration, creator } = req.body;

    let testCode;
    let exists = true;

    while (exists) {
      testCode = generateTestCode();
      exists = await Test.findOne({ testCode });
    }

    const newTest = await Test.create({
      title,
      desc,
      duration,
      testCode, // yangi maydon
      creator,
    });

    res.json({ success: true, data: newTest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleTestStatus = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return res
        .status(404)
        .json({ success: false, message: "Test topilmadi" });
    }

    test.isActive = !test.isActive; // ochiq ↔ yopiq
    await test.save();

    res.json({
      success: true,
      isActive: test.isActive,
      message: test.isActive ? "Test ochildi" : "Test yopildi",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAll = async (req, res) => {
  const result = await Test.find();

  res.status(200).json({
    succes: true,
    data: result,
  });
};

exports.getById = async (req, res) => {
  try {
    let id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID noto'g'ri",
      });
    }

    const test = await Test.findById(id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test topilmadi",
      });
    }

    res.json({
      success: true,
      data: test,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getByCode = async (req, res) => {
  try {
    const test = await Test.findOne({ testCode: req.params.code });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test kod topilmadi!",
      });
    }

    res.json({ success: true, data: test });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

function normalizeUploadRel(value) {
  if (!value) return null;
  let s = String(value).trim();

  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      s = new URL(s).pathname;
    }
  } catch {}

  s = s.split("?")[0].split("#")[0];

  if (!s.startsWith("/uploads/")) return null;
  return s;
}

function relToAbsUploadPath(rel) {
  const fileName = rel.replace("/uploads/", "");
  const abs = path.join(UPLOAD_DIR, fileName);

  if (!abs.startsWith(UPLOAD_DIR)) return null;
  return abs;
}

async function safeUnlink(absPath) {
  try {
    await fs.promises.unlink(absPath);
  } catch (e) {
    if (e && e.code === "ENOENT") return;
    console.error("unlink error:", absPath, e?.message);
  }
}

exports.delete = async (req, res) => {
  try {
    const testIdRaw = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(testIdRaw)) {
      return res
        .status(400)
        .json({ success: false, message: "Noto‘g‘ri testId" });
    }

    const testId = new mongoose.Types.ObjectId(testIdRaw);

    const test = await Test.findById(testId);
    if (!test) {
      return res
        .status(404)
        .json({ success: false, message: "Test topilmadi" });
    }

    const questions = await TestOne.find({ testId }).lean();

    const imagesSet = new Set();
    for (const q of questions) {
      (q.questionBlocks || []).forEach((b) => {
        if (b?.type === "image") {
          const rel = normalizeUploadRel(b.value);
          if (rel) imagesSet.add(rel);
        }
      });

      (q.options || []).forEach((opt) => {
        (opt.blocks || []).forEach((b) => {
          if (b?.type === "image") {
            const rel = normalizeUploadRel(b.value);
            if (rel) imagesSet.add(rel);
          }
        });
      });
    }

    const images = Array.from(imagesSet);
    if (images.length === 0) {
      await Promise.all([
        Test.deleteOne({ _id: testId }),
        TestOne.deleteMany({ testId }),
        TestInfo.deleteMany({ testId }),
        Attempt.deleteMany({ testId }),
        Results.deleteMany({ testId }),
      ]);

      return res.json({
        success: true,
        message: "Test o‘chirildi (rasm yo‘q)",
      });
    }
    const usedElsewhereAgg = await TestOne.aggregate([
      { $match: { testId: { $ne: testId } } },
      {
        $project: {
          imgs1: {
            $filter: {
              input: "$questionBlocks",
              as: "b",
              cond: {
                $and: [
                  { $eq: ["$$b.type", "image"] },
                  { $in: ["$$b.value", images] },
                ],
              },
            },
          },
          imgs2: {
            $reduce: {
              input: "$options",
              initialValue: [],
              in: {
                $concatArrays: [
                  "$$value",
                  {
                    $filter: {
                      input: "$$this.blocks",
                      as: "bb",
                      cond: {
                        $and: [
                          { $eq: ["$$bb.type", "image"] },
                          { $in: ["$$bb.value", images] },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          all: {
            $concatArrays: [
              { $map: { input: "$imgs1", as: "x", in: "$$x.value" } },
              { $map: { input: "$imgs2", as: "y", in: "$$y.value" } },
            ],
          },
        },
      },
      { $unwind: "$all" },
      { $group: { _id: "$all" } },
    ]);

    const usedElsewhere = new Set(usedElsewhereAgg.map((x) => x._id));

    const deletable = images.filter((rel) => !usedElsewhere.has(rel));

    await Promise.all([
      Test.deleteOne({ _id: testId }),
      TestOne.deleteMany({ testId }),
      TestInfo.deleteMany({ testId }),
      Attempt.deleteMany({ testId }),
      Results.deleteMany({ testId }),
    ]);

    await Promise.allSettled(
      deletable
        .map(relToAbsUploadPath)
        .filter(Boolean)
        .map((abs) => safeUnlink(abs))
    );

    return res.status(200).json({
      success: true,
      message: "Test, savollar va tegishli rasmlar o‘chirildi",
      imagesFound: images.length,
      imagesDeletedTried: deletable.length,
      imagesKeptBecauseUsedElsewhere: images.length - deletable.length,
    });
  } catch (err) {
    console.error("DELETE TEST ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Testni o‘chirishda xatolik",
    });
  }
};
