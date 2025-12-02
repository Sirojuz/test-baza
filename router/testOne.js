const express = require("express");
const router = express.Router();
const controller = require("../controller/testOne");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

// Word yuklash
router.post("/api/testOne/upload", upload.single("file"), controller.uploadWord);

// CRUD
router.post("/api/testOne/create", controller.create);
router.get("/api/testOne/all", controller.getAll);
router.put("/api/testOne/update/:id", controller.update);
router.delete("/api/testOne/delete/:id", controller.delete);

module.exports = router;
