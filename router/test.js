const express = require("express");
const router = express.Router();
const test = require("../controller/test");

router.post("/api/test/create", test.create);
router.get("/api/test/all", test.getAll);
router.get("/api/test/byId/:id", test.getById);
router.get("/api/test/byCode/:code", test.getByCode);
router.delete("/api/test/delete/:id", test.delete);

module.exports = router;
