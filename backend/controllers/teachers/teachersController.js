// backend/controllers/teachers/teachersController.js
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const { User } = require("../../models");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const ADMIN_CREATE_FIELDS = ["name", "email", "phone", "subject", "assignedClasses", "qualification", "avatar"];
const ADMIN_UPDATE_FIELDS = ["name", "email", "phone", "subject", "assignedClasses", "qualification", "avatar", "isDisabled"];
const SELF_UPDATE_FIELDS  = ["name", "phone", "qualification", "avatar", "email"];

function pickFields(body, allowed) {
  return allowed.reduce((acc, key) => { if (body[key] !== undefined) acc[key] = body[key]; return acc; }, {});
}

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

// GET /api/teachers/me
exports.viewOwnProfile = async (req, res) => {
  try {
    if (req.user.role !== "teacher") return res.status(403).json({ success: false, message: "This endpoint is for teachers only." });
    const teacher = await User.findOne({ _id: req.user.userId, role: "teacher" }).select("-passwordHash -otpHash -otpExpiry -__v").lean();
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher profile not found." });
    res.json({ success: true, teacher: teacherShape(teacher) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch profile." });
  }
};

// GET /api/teachers
exports.listOfAllTeachers = async (req, res) => {
  try {
    if (req.user.role === "parent") return res.status(403).json({ success: false, message: "Access denied." });

    const filter = { role: "teacher" };
    if (req.query.search?.trim()) {
      const q = req.query.search.trim();
      filter.$or = [{ name: { $regex: q, $options: "i" } }, { subject: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }];
    }
    if (req.query.subject?.trim()) filter.subject = { $regex: req.query.subject.trim(), $options: "i" };
    if (req.query.isDisabled === "true") {
      filter.isDisabled = true;
    } else if (req.query.isDisabled === "all") {
      // return both enabled and disabled teachers
    } else {
      filter.isDisabled = false;
    }

    const page    = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit   = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip    = (page - 1) * limit;
    const sortBy  = req.query.sortBy  === "subject" ? "subject" : "name";
    const sortDir = req.query.sortDir === "desc"    ? -1        : 1;

    const [teachers, total] = await Promise.all([
      User.find(filter).select("-passwordHash -otpHash -otpExpiry -__v").sort({ [sortBy]: sortDir }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    res.json({ success: true, teachers: teachers.map(teacherShape), total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch teachers." });
  }
};

// GET /api/teachers/:id
exports.viewAnyTeacherProfile = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid teacher ID." });
    if (req.user.role === "parent") return res.status(403).json({ success: false, message: "Access denied." });

    const teacher = await User.findOne({ _id: req.params.id, role: "teacher" }).select("-passwordHash -otpHash -otpExpiry -__v").lean();
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found." });
    res.json({ success: true, teacher: teacherShape(teacher) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch teacher." });
  }
};

// POST /api/teachers
exports.createNewTeacher = async (req, res) => {
  try {
    const { name, email, password, subject } = req.body;
    const missing = [];
    if (!name?.trim())    missing.push("name");
    if (!email?.trim())   missing.push("email");
    if (!subject?.trim()) missing.push("subject");
    if (missing.length > 0) return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}.` });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ success: false, message: "Enter a valid email address." });

    const exists = await User.findOne({ email: email.toLowerCase().trim() }).lean();
    if (exists) return res.status(409).json({ success: false, message: `A user with email "${email}" already exists.` });

    const temp         = password || Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(temp, 12);
    const fields       = pickFields(req.body, ADMIN_CREATE_FIELDS);

    const teacher = await User.create({ ...fields, name: name.trim(), email: email.toLowerCase().trim(), passwordHash, role: "teacher", isDisabled: false });

    res.status(201).json({ success: true, teacher: teacherShape(teacher.toObject()), message: `Teacher "${name}" added successfully.` });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: "A teacher with this email already exists." });
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/teachers/me
exports.updateOwnProfile = async (req, res) => {
  try {
    if (req.user.role !== "teacher") return res.status(403).json({ success: false, message: "This endpoint is for teachers only." });

    const updates = pickFields(req.body, SELF_UPDATE_FIELDS);

    if (req.body.newPassword) {
      if (!req.body.currentPassword) return res.status(400).json({ success: false, message: "Current password is required to set a new password." });
      const user  = await User.findById(req.user.userId).select("passwordHash").lean();
      const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ success: false, message: "Current password is incorrect." });
      if (req.body.newPassword.length < 8) return res.status(400).json({ success: false, message: "New password must be at least 8 characters." });
      updates.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, message: "No valid fields to update." });

    const teacher = await User.findOneAndUpdate({ _id: req.user.userId, role: "teacher" }, { $set: updates }, { new: true, runValidators: true })
      .select("-passwordHash -otpHash -otpExpiry -__v").lean();
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher profile not found." });

    res.json({ success: true, teacher: teacherShape(teacher), message: "Profile updated successfully." });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0];
      return res.status(409).json({ success: false, message: `A user with this ${field} already exists.` });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/teachers/:id
exports.updateAnyTeacherProfile = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid teacher ID." });

    const updates = pickFields(req.body, ADMIN_UPDATE_FIELDS);
    if (req.body.password) {
      if (req.body.password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
      updates.passwordHash = await bcrypt.hash(req.body.password, 12);
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, message: "No valid fields to update." });

    if (updates.email) {
      updates.email = updates.email.toLowerCase().trim();
      const dup = await User.findOne({ email: updates.email, _id: { $ne: req.params.id } }).lean();
      if (dup) return res.status(409).json({ success: false, message: `Email "${updates.email}" is already used by another user.` });
    }

    const teacher = await User.findOneAndUpdate({ _id: req.params.id, role: "teacher" }, { $set: updates }, { new: true, runValidators: true })
      .select("-passwordHash -otpHash -otpExpiry -__v").lean();
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found." });

    res.json({ success: true, teacher: teacherShape(teacher), message: `Teacher "${teacher.name}" updated successfully.` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/teachers/:id/assign-classes
exports.assignClassesToTeacher = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid teacher ID." });
    const { assignedClasses } = req.body;
    if (!Array.isArray(assignedClasses)) return res.status(400).json({ success: false, message: "assignedClasses must be an array of class names." });

    const teacher = await User.findOneAndUpdate({ _id: req.params.id, role: "teacher" }, { $set: { assignedClasses } }, { new: true })
      .select("-passwordHash -otpHash -otpExpiry -__v").lean();
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found." });

    res.json({ success: true, teacher: teacherShape(teacher), assignedClasses: teacher.assignedClasses, message: `Classes assigned to ${teacher.name}: ${assignedClasses.join(", ") || "none"}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to assign classes." });
  }
};

// PATCH /api/teachers/:id/toggle-status
exports.toggleTeacherStatus = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid teacher ID." });

    const teacher = await User.findOne({ _id: req.params.id, role: "teacher" }).lean();
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found." });

    const newStatus = !teacher.isDisabled;
    const updated   = await User.findByIdAndUpdate(req.params.id, { $set: { isDisabled: newStatus } }, { new: true }).select("-passwordHash -otpHash -otpExpiry -__v").lean();

    res.json({ success: true, teacher: teacherShape(updated), isDisabled: newStatus, message: `${teacher.name}'s account has been ${newStatus ? "disabled" : "re-enabled"}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update teacher status." });
  }
};

// DELETE /api/teachers/:id
exports.removeTeacher = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid teacher ID." });

    const teacher = await User.findOne({ _id: req.params.id, role: "teacher" }).lean();
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found." });

    if (req.query.hard === "true") {
      await User.findByIdAndDelete(req.params.id);
      return res.json({ success: true, message: `Teacher "${teacher.name}" permanently removed.` });
    }

    await User.findByIdAndUpdate(req.params.id, { $set: { isDisabled: true } });
    res.json({ success: true, message: `Teacher "${teacher.name}" has been deactivated. Their records are preserved.` });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to remove teacher." });
  }
};

// POST /api/teachers/:id/force-logout
exports.forceLogoutTeacher = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid teacher ID." });

    const teacher = await User.findOne({ _id: req.params.id, role: "teacher" }).lean();
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found." });

    await User.findByIdAndUpdate(req.params.id, { $set: { passwordHash: await bcrypt.hash(Math.random().toString(36), 12) } });
    res.json({ success: true, message: `All sessions for teacher "${teacher.name}" have been invalidated.` });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to force logout." });
  }
};
