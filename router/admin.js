const express = require("express");
const router = express.Router();
const controller = require("../controller/admin");

const auth = require("../middlewares/auth");
const requireRole = require("../middlewares/requireRole");

router.post("/api/admin/login", controller.login);

router.get(
  "/api/admin/decode",
  auth,
  requireRole("admin", "teacher"),
  controller.decodeToken,
);
router.get("/api/admin/all", auth, requireRole("admin"), controller.getAll);
router.get("/api/admin/:id", auth, requireRole("admin"), controller.getById);
router.delete(
  "/api/admin/delete/:id",
  auth,
  requireRole("admin"),
  controller.delete,
);

module.exports = router;
