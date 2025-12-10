const express = require("express");
const router = express.Router();
const controller = require("../controller/user");

router.post("/api/user/register", controller.register);
router.get("/api/user/all", controller.getAll);
router.get("/api/user/:id", controller.getById);
router.delete("/api/user/delete/all", controller.deleteAllStudents);

module.exports = router;
