const mongoose = require("mongoose");

module.exports = function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Auth kerak" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Ruxsat yo‘q" });
    }
    next();
  };
};
