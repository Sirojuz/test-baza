const express = require("express");
const router = express.Router();
const controller = require("../controller/testOne");
const path = require("path");
const multer = require("multer");

// ✅ MIDDLEWARES
const auth = require("../middlewares/auth");
const requireRole = require("../middlewares/requireRole");
const validateObjectId = require("../middlewares/validateObjectId");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const upload = multer({
  dest: UPLOAD_DIR,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.originalname.toLowerCase().endsWith(".docx");

    if (!ok) return cb(new Error("Faqat .docx fayl qabul qilinadi"));
    cb(null, true);
  },
});

router.post(
  "/api/testOne/upload",
  auth,
  requireRole("admin", "teacher"),
  upload.single("file"),
  controller.uploadWord,
);

router.get(
  "/api/testOne/start",
  controller.startTest,
);

router.post(
  "/api/testOne/create",
  auth,
  requireRole("admin", "teacher"),
  controller.create,
);

router.get(
  "/api/testOne/all",
  auth,
  requireRole("admin", "teacher"),
  controller.getAll,
);

router.get(
  "/api/testOne/:id",
  auth,
  requireRole("admin", "teacher"),
  validateObjectId("id"),
  controller.getById,
);

router.put(
  "/api/testOne/update/:id",
  auth,
  requireRole("admin", "teacher"),
  validateObjectId("id"),
  controller.update,
);

router.delete(
  "/api/testOne/delete/:id",
  auth,
  requireRole("admin"),
  validateObjectId("id"),
  controller.delete,
);

module.exports = router;
