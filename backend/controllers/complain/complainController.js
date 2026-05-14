const Complain = require('../../models').Complain;


exports.getComplains = async (req, res) => {
  try {
    const complains = await Complain.find({ school: req.school._id }).populate("createdBy", "name");
    res.json({ success: true, complains });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch complains.", error: err.message });
  }
};

exports.createComplain = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, message: "Title and description are required." });
    }
    const complain = new Complain({
      title,
      description, 
        school: req.school._id,
        createdBy: req.user._id,
    });
    await complain.save();
    res.status(201).json({ success: true, complain });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create complain.", error: err.message });
  }
};

exports.listComplains = async (req, res) => {
  try {
    let complains = await Complain.find({ school: req.params.id }).populate("user", "name");
    if (complains.length > 0) {
      res.send(complains)
    } else {
      res.send({ message: "No complains found" });
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.updateComplainStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["pending", "resolved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value." });
    }
    const complain = await Complain.findByIdAndUpdate(id, { status }, { new: true });
    if (!complain) {
      return res.status(404).json({ success: false, message: "Complain not found." });
    }
    res.json({ success: true, complain });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update complain status.", error: err.message });
  }
};

