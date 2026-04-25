// backend/routes/settings.js
//
// School settings — admin can read/update school configuration.
// School NAME is locked from editing (PRD requirement).
// Individual user settings (theme, notifications) stored in localStorage
// on the frontend — no backend persistence needed for those.

const express  = require("express");
const router   = express.Router();
const mongoose = require("mongoose");
const { School, User } = require("../models");
const {
  protect,
  requireAdmin,
} = require("../middleware/auth");

router.use(protect);

// ── Whitelisted school fields admin can update ────────────────────────────────
// NOTE: 'name' is intentionally excluded — PRD: school name is locked
const SCHOOL_UPDATE_FIELDS = [
  "address", "phone", "email",
  "academicYear", "classes", "subjects",
  "logoUrl", "estYear",
];

function pickFields(body, allowed) {
  return allowed.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/settings — Get school settings + current admin profile
// Admin only
// ════════════════════════════════════════════════════════════════════════════════
router.get("/", requireAdmin, async (req, res) => {
  try {
    const [school, admin] = await Promise.all([
      School.findById(req.school._id)
        .select("-__v")
        .lean(),
      User.findById(req.user.userId)
        .select("name email phone avatar lastLogin createdAt")
        .lean(),
    ]);

    if (!school) {
      return res.status(404).json({ success: false, message: "School not found." });
    }

    res.json({
      success: true,
      school,
      admin,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch settings." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// PUT /api/settings/school — Update school configuration
// Admin only
// LOCKED: school name cannot be changed
// ════════════════════════════════════════════════════════════════════════════════
router.put("/school", requireAdmin, async (req, res) => {
  try {
    // Explicit rejection if someone tries to change school name
    if (req.body.name !== undefined) {
      return res.status(403).json({
        success: false,
        message: "School name cannot be changed. It is locked after registration.",
      });
    }

    const updates = pickFields(req.body, SCHOOL_UPDATE_FIELDS);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update." });
    }

    // Validate classes array if provided
    if (updates.classes !== undefined) {
      if (!Array.isArray(updates.classes)) {
        return res.status(400).json({
          success: false,
          message: "classes must be an array of class names.",
        });
      }
      // Sanitize — trim each class name, remove duplicates
      updates.classes = [...new Set(updates.classes.map(c => c.trim()).filter(Boolean))];
    }

    // Validate subjects array if provided
    if (updates.subjects !== undefined) {
      if (!Array.isArray(updates.subjects)) {
        return res.status(400).json({
          success: false,
          message: "subjects must be an array of subject names.",
        });
      }
      updates.subjects = [...new Set(updates.subjects.map(s => s.trim()).filter(Boolean))];
    }

    // Validate phone format if provided
    if (updates.phone) {
      const cleaned = updates.phone.replace(/[\s-]/g, "");
      if (!/^(\+977)?[0-9]{7,10}$/.test(cleaned)) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid Nepali phone number.",
        });
      }
    }

    // Validate email if provided
    if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }

    const school = await School.findByIdAndUpdate(
      req.school._id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select("-__v")
      .lean();

    if (!school) {
      return res.status(404).json({ success: false, message: "School not found." });
    }

    // Clear school middleware cache so updated data is served immediately
    try {
      const { clearSchoolCache } = require("../middleware/school");
      clearSchoolCache(school.domain);
    } catch {
      // Cache clear is non-critical
    }

    res.json({
      success: true,
      school,
      message: "School settings updated successfully.",
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// PUT /api/settings/profile — Admin updates their own profile
// ════════════════════════════════════════════════════════════════════════════════
router.put("/profile", requireAdmin, async (req, res) => {
  try {
    const bcrypt = require("bcryptjs");
    const { userId } = req.user;

    const PROFILE_FIELDS = ["name", "phone", "avatar"];
    const updates = pickFields(req.body, PROFILE_FIELDS);

    // Handle password change
    if (req.body.newPassword) {
      if (!req.body.currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required to set a new password.",
        });
      }

      const admin = await User.findById(userId).select("passwordHash").lean();
      const valid = await bcrypt.compare(req.body.currentPassword, admin.passwordHash || "");

      if (!valid) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect.",
        });
      }

      if (req.body.newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 8 characters.",
        });
      }

      updates.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update." });
    }

    const admin = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select("name email phone avatar lastLogin createdAt")
      .lean();

    res.json({
      success: true,
      admin,
      message: "Profile updated successfully.",
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/settings/stats — School-wide statistics for settings page overview
// Admin only
// ════════════════════════════════════════════════════════════════════════════════
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const { Student, User: UserModel, Homework, Notice } = require("../models");

    const [
      totalStudents,
      totalTeachers,
      totalParents,
      totalHomework,
      totalNotices,
    ] = await Promise.all([
      mongoose.model("Student").countDocuments({ school: req.school._id, isActive: true }),
      UserModel.countDocuments({ school: req.school._id, role: "teacher", isDisabled: false }),
      UserModel.countDocuments({ school: req.school._id, role: "parent",  isDisabled: false }),
      mongoose.model("Homework").countDocuments({ school: req.school._id }),
      mongoose.model("Notice").countDocuments({ school: req.school._id }),
    ]);

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalTeachers,
        totalParents,
        totalHomework,
        totalNotices,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch statistics." });
  }
});

module.exports = router;