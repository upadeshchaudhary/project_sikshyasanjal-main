// backend/routes/teachers.js
// Teachers are stored in the User collection with role: "teacher"
// All queries use User.find({ role: "teacher", school: ... })

const express   = require("express");
const router    = express.Router();
const mongoose  = require("mongoose");
const bcrypt    = require("bcryptjs");
const { User }  = require("../models");
const {
  protect,
  requireAdmin,
  requireTeacherOrAdmin,
} = require("../middleware/auth");

router.use(protect);

// ── Helpers ───────────────────────────────────────────────────────────────────
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Whitelisted fields admin can set when creating/updating a teacher
const ADMIN_CREATE_FIELDS = [
  "name", "email", "phone",
  "subject", "assignedClasses", "qualification",
  "avatar",
];

const ADMIN_UPDATE_FIELDS = [
  "name", "email", "phone",
  "subject", "assignedClasses", "qualification",
  "avatar", "isDisabled",
];

// Fields a teacher can update on their own profile
const SELF_UPDATE_FIELDS = [
  "name", "phone", "qualification", "avatar",
];

function pickFields(body, allowed) {
  return allowed.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});
}

// Safe teacher shape — never leak passwordHash, otpHash, googleId
function teacherShape(user) {
  return {
    _id:             user._id,
    name:            user.name,
    email:           user.email           || null,
    phone:           user.phone           || null,
    subject:         user.subject         || null,
    assignedClasses: user.assignedClasses || [],
    qualification:   user.qualification   || null,
    avatar:          user.avatar          || null,
    isDisabled:      user.isDisabled      || false,
    lastLogin:       user.lastLogin       || null,
    createdAt:       user.createdAt,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/teachers/me — Teacher views their own profile
// Available to teachers only
// ════════════════════════════════════════════════════════════════════════════════
router.get("/me", async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "This endpoint is for teachers only.",
      });
    }

    const teacher = await User.findOne({
      _id:    userId,
      school: req.school._id,
      role:   "teacher",
    })
      .select("-passwordHash -otpHash -otpExpiry -googleId -__v")
      .lean();

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher profile not found." });
    }

    res.json({ success: true, teacher: teacherShape(teacher) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch profile." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/teachers — List all teachers
// Admin: full list with pagination
// Teacher: full list (read-only, needed to assign homework/attendance)
// Parent: BLOCKED — no access to teacher directory
// ════════════════════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const { role } = req.user;

    // FIXED: parents cannot access teacher list
    if (role === "parent") {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const filter = {
      school: req.school._id,
      role:   "teacher",         // FIXED: query User collection by role
    };

    // Optional filters
    if (req.query.search?.trim()) {
      const q = req.query.search.trim();
      filter.$or = [
        { name:    { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { email:   { $regex: q, $options: "i" } },
      ];
    }

    if (req.query.subject?.trim()) {
      filter.subject = { $regex: req.query.subject.trim(), $options: "i" };
    }

    if (req.query.isDisabled !== undefined) {
      filter.isDisabled = req.query.isDisabled === "true";
    } else {
      filter.isDisabled = false; // default: only active teachers
    }

    // Pagination
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const sortBy  = req.query.sortBy  === "subject" ? "subject" : "name";
    const sortDir = req.query.sortDir === "desc"    ? -1        : 1;

    const [teachers, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash -otpHash -otpExpiry -googleId -__v")
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success:    true,
      teachers:   teachers.map(teacherShape),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch teachers." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/teachers/:id — Single teacher profile
// Admin + Teacher: can view any teacher
// Parent: blocked
// ════════════════════════════════════════════════════════════════════════════════
router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid teacher ID." });
    }

    const { role } = req.user;

    if (role === "parent") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const teacher = await User.findOne({
      _id:    req.params.id,
      school: req.school._id,
      role:   "teacher",
    })
      .select("-passwordHash -otpHash -otpExpiry -googleId -__v")
      .lean();

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found." });
    }

    res.json({ success: true, teacher: teacherShape(teacher) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch teacher." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/teachers — Add a new teacher
// Admin only
// Creates a User document with role: "teacher"
// ════════════════════════════════════════════════════════════════════════════════
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { name, email, password, subject } = req.body;

    // Required field validation
    const missing = [];
    if (!name?.trim())    missing.push("name");
    if (!email?.trim())   missing.push("email");
    if (!subject?.trim()) missing.push("subject");

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}.`,
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    // Check for duplicate email in this school
    const exists = await User.findOne({
      school: req.school._id,
      email:  email.toLowerCase().trim(),
    }).lean();

    if (exists) {
      return res.status(409).json({
        success: false,
        message: `A user with email "${email}" already exists in this school.`,
      });
    }

    // FIXED: hash password before saving — never store plaintext
    let passwordHash;
    if (password) {
      passwordHash = await bcrypt.hash(password, 12);
    } else {
      // Auto-generate a temporary password if none provided
      const temp     = Math.random().toString(36).slice(-8);
      passwordHash   = await bcrypt.hash(temp, 12);
    }

    // FIXED: field whitelisting — role always forced to "teacher"
    const fields = pickFields(req.body, ADMIN_CREATE_FIELDS);

    const teacher = await User.create({
      ...fields,
      name:         name.trim(),
      email:        email.toLowerCase().trim(),
      passwordHash,
      role:         "teacher",       // FIXED: always "teacher" — cannot be overridden
      school:       req.school._id,  // FIXED: always this school — cannot be overridden
      isDisabled:   false,
    });

    res.status(201).json({
      success: true,
      teacher: teacherShape(teacher.toObject()),
      message: `Teacher "${name}" added successfully.`,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A teacher with this email already exists.",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// PUT /api/teachers/me — Teacher updates their own profile
// Teacher only — limited fields
// ════════════════════════════════════════════════════════════════════════════════
router.put("/me", async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "This endpoint is for teachers only.",
      });
    }

    // FIXED: teachers can only update safe self-fields
    const updates = pickFields(req.body, SELF_UPDATE_FIELDS);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update." });
    }

    // Handle password change separately with current password verification
    if (req.body.newPassword) {
      if (!req.body.currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required to set a new password.",
        });
      }

      const user = await User.findById(userId).select("passwordHash").lean();
      const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);

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

    const teacher = await User.findOneAndUpdate(
      { _id: userId, school: req.school._id, role: "teacher" },
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select("-passwordHash -otpHash -otpExpiry -googleId -__v")
      .lean();

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher profile not found." });
    }

    res.json({
      success: true,
      teacher: teacherShape(teacher),
      message: "Profile updated successfully.",
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// PUT /api/teachers/:id — Admin updates any teacher's profile
// Admin only
// ════════════════════════════════════════════════════════════════════════════════
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid teacher ID." });
    }

    // FIXED: field whitelisting — role, school, passwordHash cannot be changed via this route
    const updates = pickFields(req.body, ADMIN_UPDATE_FIELDS);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update." });
    }

    // If admin is resetting password
    if (req.body.password) {
      if (req.body.password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters.",
        });
      }
      // FIXED: always hash — never store plaintext
      updates.passwordHash = await bcrypt.hash(req.body.password, 12);
    }

    // Validate email uniqueness if being changed
    if (updates.email) {
      updates.email = updates.email.toLowerCase().trim();
      const duplicate = await User.findOne({
        school: req.school._id,
        email:  updates.email,
        _id:    { $ne: req.params.id },
      }).lean();

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `Email "${updates.email}" is already used by another user in this school.`,
        });
      }
    }

    const teacher = await User.findOneAndUpdate(
      {
        _id:    req.params.id,
        school: req.school._id,
        role:   "teacher",         // FIXED: scoped to teachers only
      },
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select("-passwordHash -otpHash -otpExpiry -googleId -__v")
      .lean();

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found." });
    }

    res.json({
      success: true,
      teacher: teacherShape(teacher),
      message: `Teacher "${teacher.name}" updated successfully.`,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// PATCH /api/teachers/:id/assign-classes — Assign classes to a teacher
// Admin only
// ════════════════════════════════════════════════════════════════════════════════
router.patch("/:id/assign-classes", requireAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid teacher ID." });
    }

    const { assignedClasses } = req.body;

    if (!Array.isArray(assignedClasses)) {
      return res.status(400).json({
        success: false,
        message: "assignedClasses must be an array of class names.",
      });
    }

    const teacher = await User.findOneAndUpdate(
      { _id: req.params.id, school: req.school._id, role: "teacher" },
      { $set: { assignedClasses } },
      { new: true }
    )
      .select("-passwordHash -otpHash -otpExpiry -googleId -__v")
      .lean();

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found." });
    }

    res.json({
      success:         true,
      teacher:         teacherShape(teacher),
      assignedClasses: teacher.assignedClasses,
      message:         `Classes assigned to ${teacher.name}: ${assignedClasses.join(", ") || "none"}.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to assign classes." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// PATCH /api/teachers/:id/toggle-status — Enable or disable a teacher account
// Admin only
// ════════════════════════════════════════════════════════════════════════════════
router.patch("/:id/toggle-status", requireAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid teacher ID." });
    }

    const teacher = await User.findOne({
      _id:    req.params.id,
      school: req.school._id,
      role:   "teacher",
    }).lean();

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found." });
    }

    const newStatus = !teacher.isDisabled;

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { isDisabled: newStatus } },
      { new: true }
    )
      .select("-passwordHash -otpHash -otpExpiry -googleId -__v")
      .lean();

    res.json({
      success:    true,
      teacher:    teacherShape(updated),
      isDisabled: newStatus,
      message:    `${teacher.name}'s account has been ${newStatus ? "disabled" : "re-enabled"}.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update teacher status." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// DELETE /api/teachers/:id — Remove a teacher
// Admin only — soft delete (isDisabled = true)
// Hard delete requires explicit ?hard=true query param
// ════════════════════════════════════════════════════════════════════════════════
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid teacher ID." });
    }

    const teacher = await User.findOne({
      _id:    req.params.id,
      school: req.school._id,
      role:   "teacher",
    }).lean();

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found." });
    }

    if (req.query.hard === "true") {
      // Hard delete — also clears their assignments from routines
      await User.findByIdAndDelete(req.params.id);

      // Note: ClassRoutine embeds teacher name as string — no cascade needed
      // Homework/Attendance/Results have postedBy/markedBy refs — left as is for audit trail

      return res.json({
        success: true,
        message: `Teacher "${teacher.name}" permanently removed.`,
      });
    }

    // Default: soft delete
    await User.findByIdAndUpdate(req.params.id, { $set: { isDisabled: true } });

    res.json({
      success: true,
      message: `Teacher "${teacher.name}" has been deactivated. Their records are preserved.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to remove teacher." });
  }
});

module.exports = router;