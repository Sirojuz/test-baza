const express = require("express");
const router = express.Router();
const controller = require("../controller/result");

const auth = require("../middlewares/auth");
const requireRole = require("../middlewares/requireRole");
const validateObjectId = require("../middlewares/validateObjectId");

router.post("/api/result/save", controller.saveResult);
router.put(
  "/api/result/edit/:id",
  auth,
  requireRole("admin", "teacher"),
  validateObjectId("id"),
  controller.editResult,
);

router.delete(
  "/api/result/delete/:id",
  auth,
  requireRole("admin"),
  validateObjectId("id"),
  controller.deleteResultById,
);
router.get("/api/result/:id", validateObjectId("id"), controller.getByAttempt);
router.get(
  "/api/test/:testId/results",
  auth,
  requireRole("admin", "teacher"),
  validateObjectId("testId"),
  controller.getResultsByTest,
);

module.exports = router;
