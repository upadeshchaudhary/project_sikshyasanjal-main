// backend/controllers/complain/complainController.js
const { Complain } = require("../../models");

exports.getComplains = async (req, res) => {
  try {
    const complains = await Complain.find().populate("user", "name");
    res.json({ success: true, complains });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch complains.", error: err.message });
  }
};

exports.createComplain = async (req, res) => {
  try {
    const { date, complaint } = req.body;
    if (!date || !complaint) {
      return res.status(400).json({ success: false, message: "Date and complaint are required." });
    }
    const complain = await Complain.create({ date, complaint, user: req.user.userId });
    res.status(201).json({ success: true, complain });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create complain.", error: err.message });
  }
};

exports.listComplains = async (req, res) => {
  try {
    const complains = await Complain.find().populate("user", "name").lean();
    res.json({ success: true, complains, total: complains.length });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to list complains." });
  }
};
