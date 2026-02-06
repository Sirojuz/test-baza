const Admin = require("../model/admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.register = async (req, res) => {
  try {
    const { name, phone, role, password } = req.body;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const exists = await Admin.findOne({ phone });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Bu telefon raqami bilan ro'yxatdan o'tilgan!",
      });
    }

    const result = new Admin({
      name: name,
      phone: phone,
      password: passwordHash,
      role: role,
    });

    result.save();
    res.json({ success: true, result: result });
  } catch (err) {
    console.log("Register error:", err);

    // Mongo duplicate key xatosi → E11000
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Bu telefon raqami allaqachon mavjud!",
      });
    }

    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const result = await Admin.find();
    res.json({ success: true, result: result });
  } catch (err) {
    res.json({ error: err });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await Admin.findById({ _id: req.params.id });
    res.json({ success: true, result: result });
  } catch (err) {
    res.json({ error: err });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Telefon va parol talab qilinadi!",
      });
    }

    const admin = await Admin.findOne({ phone }).select(
      "+password +role +name +phone",
    );

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi mavjud emas!",
      });
    }

    if (!admin.password) {
      return res.status(500).json({
        success: false,
        message:
          "Admin paroli DBda yo'q (password field empty). Registerni tekshiring.",
      });
    }

    const isMatch = await bcrypt.compare(String(password), admin.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Noto‘g‘ri parol!",
      });
    }

    const token = jwt.sign(
      { adminId: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "12h" },
    );

    return res.json({ success: true, token });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.decodeToken = async (req, res) => {
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

    const decode = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({ success: true, decodedToken: decode });
  } catch (err) {
    return res.status(401).json({ success: false, message: "Noto'g'ri token" });
  }
};

exports.delete = async (req, res) => {
  try {
    const data = await Admin.findById({ _id: req.params.id }).exec();

    if (!data) {
      res.status(404).json({ succes: false, data: "User not found" });
      return;
    }

    await Admin.findByIdAndDelete({ _id: req.params.id });
    res.status(200).json({ success: true, data: "User deleted" });
  } catch (err) {
    res.status(500).json({ succes: false, data: err });
  }
};
