// backend/controllers/settings/settingsController.js
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const { School, User } = require("../../models");
const { getCurrentAcademicYear } = require("../../utils/calendar");

const SCHOOL_UPDATE_FIELDS = ["address", "phone", "email", "academicYear", "classes", "subjects", "logoUrl", "estYear"];

function pickFields(body, allowed) {
  return allowed.reduce((acc, key) => { if (body[key] !== undefined) acc[key] = body[key]; return acc; }, {});
}

// GET /api/settings
exports.getSchoolSettings = async (req, res) => {
  try {
    const [school, admin] = await Promise.all([
      School.findOne().select("-__v").lean(),
      User.findById(req.user.userId).select("name email phone avatar lastLogin createdAt").lean(),
    ]);

    if (!school) return res.status(404).json({ success: false, message: "School not found." });
    school.academicYear = getCurrentAcademicYear();
    res.json({ success: true, school, admin });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch settings." });
  }
};

// PUT /api/settings/school
exports.updateSchoolSettings = async (req, res) => {
  try {
    if (req.body.name !== undefined) {
      return res.status(403).json({ success: false, message: "School name cannot be changed after setup." });
    }

    const updates = pickFields(req.body, SCHOOL_UPDATE_FIELDS);
    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, message: "No valid fields to update." });

    if (updates.classes !== undefined) {
      if (!Array.isArray(updates.classes)) return res.status(400).json({ success: false, message: "classes must be an array of class names." });
      updates.classes = [...new Set(updates.classes.map(c => c.trim()).filter(Boolean))];
    }

    if (updates.subjects !== undefined) {
      if (!Array.isArray(updates.subjects)) return res.status(400).json({ success: false, message: "subjects must be an array of subject names." });
      updates.subjects = [...new Set(updates.subjects.map(s => s.trim()).filter(Boolean))];
    }

    if (updates.phone) {
      const cleaned = updates.phone.replace(/[\s-]/g, "");
      if (!/^(\+977)?[0-9]{7,10}$/.test(cleaned)) return res.status(400).json({ success: false, message: "Enter a valid Nepali phone number." });
    }

    if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }

    const school = await School.findOneAndUpdate({}, { $set: updates }, { new: true, runValidators: true }).select("-__v").lean();
    if (!school) return res.status(404).json({ success: false, message: "School not found." });

    school.academicYear = getCurrentAcademicYear();
    res.json({ success: true, school, message: "School settings updated successfully." });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/settings/profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const PROFILE_FIELDS = ["name", "phone", "avatar", "email"];
    const updates  = pickFields(req.body, PROFILE_FIELDS);

    if (req.body.newPassword) {
      if (!req.body.currentPassword) return res.status(400).json({ success: false, message: "Current password is required to set a new password." });
      const user = await User.findById(userId).select("passwordHash").lean();
      const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash || "");
      if (!valid) return res.status(401).json({ success: false, message: "Current password is incorrect." });
      if (req.body.newPassword.length < 8) return res.status(400).json({ success: false, message: "New password must be at least 8 characters." });
      updates.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, message: "No valid fields to update." });

    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true })
      .select("name email phone avatar lastLogin createdAt role").lean();

    res.json({ success: true, user, message: "Profile updated successfully." });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0];
      return res.status(409).json({ success: false, message: `A user with this ${field} already exists.` });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/settings/stats
exports.getSettingStats = async (req, res) => {
  try {
    const [totalStudents, totalTeachers, totalParents, totalHomework, totalNotices] = await Promise.all([
      mongoose.model("Student").countDocuments({ isActive: true }),
      User.countDocuments({ role: "teacher", isDisabled: false }),
      User.countDocuments({ role: "parent",  isDisabled: false }),
      mongoose.model("Homework").countDocuments({}),
      mongoose.model("Notice").countDocuments({}),
    ]);

    res.json({ success: true, stats: { totalStudents, totalTeachers, totalParents, totalHomework, totalNotices } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch statistics." });
  }
};
