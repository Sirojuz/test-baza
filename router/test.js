const express = require("express");
const router = express.Router();
const test = require("../controller/test");

const auth = require("../middlewares/auth");
const requireRole = require("../middlewares/requireRole");
const validateObjectId = require("../middlewares/validateObjectId");

router.post(
  "/api/test/create",
  auth,
  requireRole("admin", "teacher"),
  test.create,
);
router.put(
  "/api/test/toggle/:id",
  auth,
  requireRole("admin", "teacher"),
  validateObjectId("id"),
  test.toggleTestStatus,
);
router.delete(
  "/api/test/delete/:id",
  auth,
  requireRole("admin"),
  validateObjectId("id"),
  test.delete,
);
router.get(
  "/api/test/all",
  auth,
  requireRole("admin", "teacher", "student"),
  test.getAll,
);
router.get(
  "/api/test/byId/:id",
  auth,
  requireRole("admin", "teacher"),
  validateObjectId("id"),
  test.getById,
);
router.get("/api/test/byCode/:code", test.getByCode);

module.exports = router;
