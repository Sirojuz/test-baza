const Admin = require("../model/admin");

exports.register = async (req, res) => {
  try {
    const { name, phone, role, password } = req.body;

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
      password: password,
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

    // Maydonlar bo‘sh bo‘lsa
    if (!phone || !password) {
      return res.json({
        success: false,
        message: "Telefon va parol talab qilinadi!",
      });
    }

    // Adminni topish
    const admin = await Admin.findOne({ phone });

    if (!admin) {
      return res.json({
        success: false,
        message: "Foydalanuvchi mavjud emas!",
      });
    }

    // Parolni tekshirish
    if (admin.password !== password) {
      return res.json({
        success: false,
        message: "Parol noto‘g‘ri!",
      });
    }

    // LOGIN muvaffaqiyatli
    return res.json({
      success: true,
      message: "Muvaffaqiyatli login!",
      data: {
        id: admin._id,
        name: admin.name,
        phone: admin.phone,
        role: admin.role,
      },
    });
  } catch (error) {
    return res.json({ success: false, error: error.message });
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
