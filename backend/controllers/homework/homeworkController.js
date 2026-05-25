// backend/controllers/homework/homeworkController.js
const mongoose = require("mongoose");
const { Homework, User } = require("../../models");

const ALLOWED_FIELDS = ["title", "subject", "class", "description", "dueDate", "dueDateBs", "priority", "attachmentUrl"];
const pickFields = (body) => ALLOWED_FIELDS.reduce((acc, key) => { if (body[key] !== undefined) acc[key] = body[key]; return acc; }, {});
const isValidId  = (id) => mongoose.Types.ObjectId.isValid(id);

// GET /api/homework
exports.getHomework = async (req, res) => {
  try {
    const { role, userId } = req.user;
    const filter = {};

    if (role === "parent") {
      const parent = await User.findById(userId).select("childClass childId").lean();
      if (!parent?.childClass) return res.json({ success: true, homework: [], total: 0 });
      filter.class = parent.childClass;
      const homework = await Homework.find(filter).populate("postedBy", "name").sort({ dueDate: -1 }).lean();
      return res.json({ success: true, homework, total: homework.length });
    }

    if (role === "teacher") {
      const teacher         = await User.findById(userId).select("assignedClasses").lean();
      const assignedClasses = teacher?.assignedClasses || [];
      const requestedClass  = req.query.class?.trim();
      if (requestedClass) {
        if (assignedClasses.length > 0 && !assignedClasses.includes(requestedClass)) {
          return res.status(403).json({ success: false, message: "You can only view homework for your assigned classes." });
        }
        filter.class = requestedClass;
      } else if (assignedClasses.length > 0) {
        filter.class = { $in: assignedClasses };
      }
    }

    if (role === "admin" && req.query.class?.trim()) filter.class = req.query.class.trim();

    if (req.query.subject?.trim())  filter.subject  = req.query.subject.trim();
    if (req.query.priority?.trim()) filter.priority = req.query.priority.trim();

    if (req.query.from || req.query.to) {
      filter.dueDate = {};
      if (req.query.from) filter.dueDate.$gte = new Date(req.query.from);
      if (req.query.to)   filter.dueDate.$lte = new Date(req.query.to);
    }
    if (req.query.upcoming === "true") filter.dueDate = { ...filter.dueDate, $gte: new Date() };

    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const [homework, total] = await Promise.all([
      Homework.find(filter).populate("postedBy", "name role").sort({ dueDate: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Homework.countDocuments(filter),
    ]);

    res.json({ success: true, homework, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch homework." });
  }
};

// GET /api/homework/:id
exports.getHomeworkById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid homework ID." });

    const { role, userId } = req.user;
    const hw = await Homework.findById(req.params.id).populate("postedBy", "name role").lean();
    if (!hw) return res.status(404).json({ success: false, message: "Homework not found." });

    if (role === "parent") {
      const parent = await User.findById(userId).select("childClass").lean();
      if (hw.class !== parent?.childClass) {
        return res.status(403).json({ success: false, message: "You can only view homework for your child's class." });
      }
    }

    res.json({ success: true, homework: hw });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch homework." });
  }
};

// POST /api/homework
exports.createHomework = async (req, res) => {
  try {
    const { role, userId } = req.user;
    const { title, subject, class: cls, dueDate } = req.body;

    const missing = [];
    if (!title?.trim())   missing.push("title");
    if (!subject?.trim()) missing.push("subject");
    if (!cls?.trim())     missing.push("class");
    if (!dueDate)         missing.push("dueDate");
    if (missing.length > 0) return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}.` });

    if (role === "teacher") {
      const teacher = await User.findById(userId).select("assignedClasses").lean();
      if (teacher?.assignedClasses?.length > 0 && !teacher.assignedClasses.includes(cls.trim())) {
        return res.status(403).json({ success: false, message: "You can only post homework for your assigned classes." });
      }
    }

    const due = new Date(dueDate);
    if (isNaN(due.getTime())) return res.status(400).json({ success: false, message: "Invalid due date." });

    const fields = pickFields(req.body);
    const hw     = await Homework.create({ ...fields, postedBy: userId, dueDate: due });
    await hw.populate("postedBy", "name role");

    res.status(201).json({ success: true, homework: hw });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/homework/:id
exports.updateHomework = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid homework ID." });

    const { role, userId } = req.user;
    const existing = await Homework.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ success: false, message: "Homework not found." });

    if (role === "teacher" && existing.postedBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You can only edit homework that you posted." });
    }

    const updates = pickFields(req.body);
    if (updates.dueDate) {
      const due = new Date(updates.dueDate);
      if (isNaN(due.getTime())) return res.status(400).json({ success: false, message: "Invalid due date." });
      updates.dueDate = due;
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, message: "No valid fields to update." });

    const hw = await Homework.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true })
      .populate("postedBy", "name role").lean();

    res.json({ success: true, homework: hw });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/homework/:id
exports.deleteHomework = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid homework ID." });

    const { role, userId } = req.user;
    const existing = await Homework.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ success: false, message: "Homework not found." });

    if (role === "teacher" && existing.postedBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You can only delete homework that you posted." });
    }

    await Homework.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: `Homework "${existing.title}" has been deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete homework." });
  }
};
