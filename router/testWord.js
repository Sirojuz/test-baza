const express = require("express");
const router = express.Router();

const wordController = require("../controller/testResultToWord");

router.get("/api/test/:id/results/word", wordController.downloadResultsWord);

module.exports = router;
