const Test = require("../model/test");

exports.create = async (req, res) => {
  const { title, desc, start } = req.body;

  let result = new Test({
    title: title,
    desc: desc,
    start: start,
  });

  await result
    .save()
    .then((data) => {
      res.status(200).json({ succes: true, data: data });
    })
    .catch((err) => {
      res.status(400).json({ succes: false, data: err });
    });
};
exports.getAll = async (req, res) => {
  const result = await Test.find();

  res.status(200).json({
    succes: true,
    data: result,
  });
};

exports.getById = async (req, res) => {
  const result = await Test.findById({ _id: req.params.id });
  res.json(result);
};

exports.delete = async (req, res) => {
  try {
    const data = await Test.findById({ _id: req.params.id }).exec();

    if (!data) {
      res.status(404).json({ succes: false, data: "Post not found" });
      return;
    }

    await Test.findByIdAndDelete({ _id: req.params.id });
    res.status(200).json({ succes: true, data: "Post deleted" });
  } catch {
    res.status(500).json({ succes: false, data: "DeleteIshlamadi" });
  }
};
