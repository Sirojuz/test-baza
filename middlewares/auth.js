const jwt = require("jsonwebtoken");
const Admin = require("../model/admin");

module.exports = async function auth(req, res, next) {
  try {
    const raw =
      req.headers.token ||
      req.headers.authorization ||
      req.headers.Authorization;

    if (!raw) {
      return res.status(401).json({ success: false, message: "Token yo‘q" });
    }

    const token = String(raw).startsWith("Bearer ")
      ? String(raw).slice(7)
      : String(raw);

    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ success: false, message: "JWT_SECRET yo‘q (server env)" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const adminId = decoded.adminId || decoded.id || decoded._id;
    if (!adminId) {
      return res
        .status(401)
        .json({ success: false, message: "Token noto‘g‘ri (adminId yo‘q)" });
    }

    const admin = await Admin.findById(adminId).lean();
    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "User topilmadi" });
    }

    req.user = {
      _id: admin._id,
      role: admin.role,
      name: admin.name,
      phone: admin.phone,
    };

    next();
  } catch (e) {
    console.log("AUTH ERROR:", e.name, e.message);
    return res.status(401).json({ success: false, message: "Token yaroqsiz" });
  }
};
