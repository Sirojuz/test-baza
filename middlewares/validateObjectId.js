const mongoose = require("mongoose");

module.exports = function validateObjectId(paramName = "id") {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "ID noto‘g‘ri" });
    }
    next();
  };
};
