const express = require("express");
const router = express.Router();
const controller = require("../controller/admin");

router.post("/api/admin/register", controller.register);
router.get("/api/admin/all", controller.getAll);
router.get("/api/admin/:id", controller.getById);
router.post("/api/admin/login", controller.login);
router.delete("/api/admin/delete/:id", controller.delete);

module.exports = router;
