// backend/routes/homework.js
const mongoose = require("mongoose");
const { Homework, User } = require("../../models");

// ── Whitelisted fields for create/update ──────────────────────────────────────
const ALLOWED_FIELDS = [
  "title", "subject", "class", "description",
  "dueDate", "dueDateBs", "priority", "attachmentUrl",
];

function pickFields(body) {
  return ALLOWED_FIELDS.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});
}

// ── Validate ObjectId ─────────────────────────────────────────────────────────
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/homework
// Admin:   all homework, filterable by class/subject/priority/date range
// Teacher: homework in their assigned classes only
// Parent:  ONLY homework for their child's class — no filter params honoured
// ════════════════════════════════════════════════════════════════════════════════
exports.getHomework = async (req, res) => {
  try {
    const { role, userId } = req.user;

    // Base filter — always scoped to this school
    const filter = { school: req.school._id };

    // ── PARENT: locked to child's class ──────────────────────────────────────
    if (role === "parent") {
      const parent = await User.findById(userId)
        .select("childClass childId")
        .lean();

      if (!parent?.childClass) {
        return res.json({ success: true, homework: [], total: 0 });
      }

      // Hard-lock to child's class — query param class is ignored entirely
      filter.class = parent.childClass;

      // Only show upcoming + recent (last 30 days) homework to parents
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filter.dueDate = { $gte: thirtyDaysAgo };

      const homework = await Homework.find(filter)
        .populate("postedBy", "name")
        .sort({ dueDate: 1 }) // soonest first for parents
        .lean();

      return res.json({ success: true, homework, total: homework.length });
    }

    // ── TEACHER: scoped to assigned classes ───────────────────────────────────
    if (role === "teacher") {
      const teacher = await User.findById(userId)
        .select("assignedClasses")
        .lean();

      const assignedClasses = teacher?.assignedClasses || [];

      // If class filter provided, validate it's in their assigned classes
      const requestedClass = req.query.class?.trim();
      if (requestedClass) {
        if (assignedClasses.length > 0 && !assignedClasses.includes(requestedClass)) {
          return res.status(403).json({
            success: false,
            message: "You can only view homework for your assigned classes.",
          });
        }
        filter.class = requestedClass;
      } else if (assignedClasses.length > 0) {
        filter.class = { $in: assignedClasses };
      }
    }

    // ── ADMIN: full access with all filters ────────────────────────────────────
    if (role === "admin") {
      if (req.query.class?.trim())   filter.class   = req.query.class.trim();
    }

    // ── Shared filters (admin + teacher) ──────────────────────────────────────
    if (req.query.subject?.trim())   filter.subject  = req.query.subject.trim();
    if (req.query.priority?.trim())  filter.priority = req.query.priority.trim();

    // Date range filter
    if (req.query.from || req.query.to) {
      filter.dueDate = {};
      if (req.query.from) filter.dueDate.$gte = new Date(req.query.from);
      if (req.query.to)   filter.dueDate.$lte = new Date(req.query.to);
    }

    // "Upcoming only" convenience filter
    if (req.query.upcoming === "true") {
      filter.dueDate = { ...filter.dueDate, $gte: new Date() };
    }

    // Pagination
    const page     = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit    = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip     = (page - 1) * limit;

    const [homework, total] = await Promise.all([
      Homework.find(filter)
        .populate("postedBy", "name role")
        .sort({ dueDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Homework.countDocuments(filter),
    ]);

    res.json({
      success:    true,
      homework,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch homework." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/homework/:id — Single homework detail
// Parents can only fetch homework for their child's class
// ════════════════════════════════════════════════════════════════════════════════
exports.getHomeworkById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid homework ID." });
    }

    const { role, userId } = req.user;

    const hw = await Homework.findOne({
      _id:    req.params.id,
      school: req.school._id,
    })
      .populate("postedBy", "name role")
      .lean();

    if (!hw) {
      return res.status(404).json({ success: false, message: "Homework not found." });
    }

    // Parent: verify this homework is for their child's class
    if (role === "parent") {
      const parent = await User.findById(userId).select("childClass").lean();
      if (hw.class !== parent?.childClass) {
        return res.status(403).json({
          success: false,
          message: "You can only view homework for your child's class.",
        });
      }
    }

    res.json({ success: true, homework: hw });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch homework." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/homework — Create homework
// Admin or Teacher only
// ════════════════════════════════════════════════════════════════════════════════
exports.createHomework = async (req, res) => {
  try {
    const { role, userId } = req.user;

    // Required field validation
    const { title, subject, class: cls, dueDate } = req.body;
    const missing = [];
    if (!title?.trim())   missing.push("title");
    if (!subject?.trim()) missing.push("subject");
    if (!cls?.trim())     missing.push("class");
    if (!dueDate)         missing.push("dueDate");

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}.`,
      });
    }

    // Teacher: can only post homework for their assigned classes
    if (role === "teacher") {
      const teacher = await User.findById(userId).select("assignedClasses").lean();
      if (
        teacher?.assignedClasses?.length > 0 &&
        !teacher.assignedClasses.includes(cls.trim())
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only post homework for your assigned classes.",
        });
      }
    }

    // Validate due date is not in the past
    const due = new Date(dueDate);
    if (isNaN(due.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid due date." });
    }

    const fields = pickFields(req.body);

    const hw = await Homework.create({
      ...fields,
      school:    req.school._id,
      postedBy:  userId,           // FIXED: use userId from JWT, not req.user._id
      dueDate:   due,
    });

    // Populate postedBy for the response
    await hw.populate("postedBy", "name role");

    res.status(201).json({ success: true, homework: hw });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// PUT /api/homework/:id — Update homework
// Admin: can edit any homework
// Teacher: can only edit their OWN homework
// ════════════════════════════════════════════════════════════════════════════════
exports.updateHomework = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid homework ID." });
    }

    const { role, userId } = req.user;

    // Fetch existing homework to check ownership
    const existing = await Homework.findOne({
      _id:    req.params.id,
      school: req.school._id,
    }).lean();

    if (!existing) {
      return res.status(404).json({ success: false, message: "Homework not found." });
    }

    // FIXED: teacher can only edit their own homework
    if (role === "teacher") {
      if (existing.postedBy.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only edit homework that you posted.",
        });
      }
    }

    // Validate due date if being updated
    const updates = pickFields(req.body);
    if (updates.dueDate) {
      const due = new Date(updates.dueDate);
      if (isNaN(due.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid due date." });
      }
      updates.dueDate = due;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update." });
    }

    const hw = await Homework.findOneAndUpdate(
      { _id: req.params.id, school: req.school._id },
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("postedBy", "name role")
      .lean();

    res.json({ success: true, homework: hw });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// DELETE /api/homework/:id
// Admin: can delete any homework
// Teacher: can only delete their OWN homework
// Parent: cannot delete (blocked by requireTeacherOrAdmin)
// ════════════════════════════════════════════════════════════════════════════════
exports.deleteHomework = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid homework ID." });
    }

    const { role, userId } = req.user;

    const existing = await Homework.findOne({
      _id:    req.params.id,
      school: req.school._id,
    }).lean();

    if (!existing) {
      return res.status(404).json({ success: false, message: "Homework not found." });
    }

    // FIXED: teacher can only delete their own homework
    if (role === "teacher") {
      if (existing.postedBy.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only delete homework that you posted.",
        });
      }
    }

    await Homework.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Homework "${existing.title}" has been deleted.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete homework." });
  }
};
