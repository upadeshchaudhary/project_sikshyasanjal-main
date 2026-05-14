// backend/routes/notices.js
const express  = require("express");
const router   = express.Router();
const mongoose = require("mongoose");
const { Notice } = require("../../models");
const {
  authMiddleware,
  requireTeacherOrAdmin,
} = require("../../middleware/authMiddleware");

router.use(authMiddleware);

// ── Whitelisted fields ────────────────────────────────────────────────────────
const ALLOWED_FIELDS = [
  "title", "body", "category", "isImportant",
  "targetRoles", "expiresAt",
];

const VALID_CATEGORIES = [
  "exam", "holiday", "event", "urgent", "general", "meeting",
];

function pickFields(body) {
  return ALLOWED_FIELDS.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});
}

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/notices — Notice board
// All roles can read notices
// Filters: category, isImportant, page, limit
// Expired notices automatically excluded
// ════════════════════════════════════════════════════════════════════════════════
exports.getNotices = async (req, res) => {
  try {
    const { role } = req.user;

    const filter = {
      school: req.school._id,
      // Exclude expired notices (expiresAt null means never expires)
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    };

    // Filter by targetRoles — parents should only see notices meant for them
    if (role === "parent") {
      filter.targetRoles = { $in: ["parent"] };
    }

    // Optional filters
    if (req.query.category?.trim()) {
      if (!VALID_CATEGORIES.includes(req.query.category.trim())) {
        return res.status(400).json({
          success: false,
          message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}.`,
        });
      }
      filter.category = req.query.category.trim();
    }

    if (req.query.important === "true")  filter.isImportant = true;
    if (req.query.important === "false") filter.isImportant = false;

    // Pagination
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const [notices, total] = await Promise.all([
      Notice.find(filter)
        .populate("postedBy", "name role")
        .sort({ isImportant: -1, createdAt: -1 }) // important first, then newest
        .skip(skip)
        .limit(limit)
        .lean(),
      Notice.countDocuments(filter),
    ]);

    res.json({
      success:    true,
      notices,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch notices." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/notices/important — Top important notices for dashboard widget
// Returns latest 5 important notices (all roles)
// ════════════════════════════════════════════════════════════════════════════════
exports.getImportantNotices = async (req, res) => {
  try {
    const { role } = req.user;

    const filter = {
      school:      req.school._id,
      isImportant: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    };

    if (role === "parent") {
      filter.targetRoles = { $in: ["parent"] };
    }

    const notices = await Notice.find(filter)
      .populate("postedBy", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({ success: true, notices });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch important notices." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/notices/:id — Single notice
// All roles can read; parents only see notices targeted at them
// ════════════════════════════════════════════════════════════════════════════════
exports.getNoticeById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid notice ID." });
    }

    const { role } = req.user;

    const notice = await Notice.findOne({
      _id:    req.params.id,
      school: req.school._id,
    })
      .populate("postedBy", "name role")
      .lean();

    if (!notice) {
      return res.status(404).json({ success: false, message: "Notice not found." });
    }

    // Parent: cannot see notices not targeted at them
    if (role === "parent" && !notice.targetRoles.includes("parent")) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this notice.",
      });
    }

    res.json({ success: true, notice });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch notice." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/notices — Create a notice
// Admin or Teacher only
// ════════════════════════════════════════════════════════════════════════════════
exports.createNotice = async (req, res) => {
  try {
    const { title, body } = req.body;
    const { userId } = req.user;

    // Required field validation
    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: "Notice title is required." });
    }
    if (!body?.trim()) {
      return res.status(400).json({ success: false, message: "Notice body is required." });
    }

    // Validate category if provided
    const category = req.body.category?.trim() || "general";
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}.`,
      });
    }

    // Validate targetRoles if provided
    const targetRoles = req.body.targetRoles;
    if (targetRoles !== undefined) {
      if (!Array.isArray(targetRoles) || targetRoles.length === 0) {
        return res.status(400).json({
          success: false,
          message: "targetRoles must be a non-empty array.",
        });
      }
      const VALID_ROLES = ["admin", "teacher", "parent"];
      const invalidRoles = targetRoles.filter(r => !VALID_ROLES.includes(r));
      if (invalidRoles.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid roles: ${invalidRoles.join(", ")}. Must be admin, teacher, or parent.`,
        });
      }
    }

    // Validate expiresAt if provided
    let expiresAt = null;
    if (req.body.expiresAt) {
      expiresAt = new Date(req.body.expiresAt);
      if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
        return res.status(400).json({
          success: false,
          message: "expiresAt must be a valid future date.",
        });
      }
    }

    const fields = pickFields(req.body);

    const notice = await Notice.create({
      ...fields,
      title:      title.trim(),
      body:       body.trim(),
      category,
      expiresAt,
      school:     req.school._id,
      postedBy:   userId,           // FIXED: use userId from JWT
    });

    await notice.populate("postedBy", "name role");

    res.status(201).json({ success: true, notice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// PUT /api/notices/:id — Edit a notice
// Admin: can edit any notice
// Teacher: can only edit their OWN notices
// Parent: cannot edit (blocked by requireTeacherOrAdmin)
// ════════════════════════════════════════════════════════════════════════════════
exports.updateNotice = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid notice ID." });
    }

    const { role, userId } = req.user;

    // Fetch existing to check ownership
    const existing = await Notice.findOne({
      _id:    req.params.id,
      school: req.school._id,
    }).lean();

    if (!existing) {
      return res.status(404).json({ success: false, message: "Notice not found." });
    }

    // FIXED: teacher can only edit their own notice
    if (role === "teacher") {
      if (existing.postedBy.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only edit notices that you posted.",
        });
      }
    }

    const updates = pickFields(req.body);

    // Validate category if being updated
    if (updates.category && !VALID_CATEGORIES.includes(updates.category)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}.`,
      });
    }

    // Validate expiresAt if being updated
    if (updates.expiresAt) {
      const exp = new Date(updates.expiresAt);
      if (isNaN(exp.getTime()) || exp <= new Date()) {
        return res.status(400).json({
          success: false,
          message: "expiresAt must be a valid future date.",
        });
      }
      updates.expiresAt = exp;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update." });
    }

    const notice = await Notice.findOneAndUpdate(
      { _id: req.params.id, school: req.school._id },
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("postedBy", "name role")
      .lean();

    res.json({ success: true, notice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// DELETE /api/notices/:id
// Admin: can delete any notice
// Teacher: can only delete their OWN notice
// Parent: cannot delete (blocked by requireTeacherOrAdmin)
// ════════════════════════════════════════════════════════════════════════════════
exports.deleteNotice = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid notice ID." });
    }

    const { role, userId } = req.user;

    const existing = await Notice.findOne({
      _id:    req.params.id,
      school: req.school._id,
    }).lean();

    // FIXED: return 404 when notice doesn't exist
    if (!existing) {
      return res.status(404).json({ success: false, message: "Notice not found." });
    }

    // FIXED: teacher can only delete their own notice
    if (role === "teacher") {
      if (existing.postedBy.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only delete notices that you posted.",
        });
      }
    }

    await Notice.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Notice "${existing.title}" has been deleted.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete notice." });
  }
};
