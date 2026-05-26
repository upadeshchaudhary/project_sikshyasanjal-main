const { Enquiry } = require("../../models");

// POST /api/enquiry
exports.createEnquiry = async (req, res) => {
  try {
    const { firstName, lastName, email, type, message } = req.body;

    if (!firstName || !lastName || !email || !type || !message) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const enquiry = await Enquiry.create({
      firstName,
      lastName,
      email,
      type,
      message,
    });

    res.status(201).json({ success: true, enquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to submit enquiry.", error: err.message });
  }
};

// GET /api/enquiry (Admin only)
exports.getEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    res.json({ success: true, enquiries });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch enquiries." });
  }
};
