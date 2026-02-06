const express = require("express");
const router = express.Router();
const Attempt = require("../model/attempt");
const controller = require("../controller/attempt");

router.post("/api/attempt/start", controller.startAttempt);
router.delete("/api/attempt/delete/:id", controller.delete);
router.get("/api/attempt/:id", async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id);

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt topilmadi",
      });
    }

    res.json({
      success: true,
      data: attempt,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
