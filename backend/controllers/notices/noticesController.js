// backend/controllers/notices/noticesController.js
const mongoose = require("mongoose");
const { Notice } = require("../../models");

const ALLOWED_FIELDS    = ["title", "body", "category", "isImportant", "targetRoles", "expiresAt"];
const VALID_CATEGORIES  = ["exam", "holiday", "event", "urgent", "general", "meeting"];
const pickFields = (body) => ALLOWED_FIELDS.reduce((acc, key) => { if (body[key] !== undefined) acc[key] = body[key]; return acc; }, {});
const isValidId  = (id)  => mongoose.Types.ObjectId.isValid(id);

// GET /api/notices
exports.getNotices = async (req, res) => {
  try {
    const { role } = req.user;
    const filter = { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] };

    if (role === "parent") filter.targetRoles = { $in: ["parent"] };

    if (req.query.category?.trim()) {
      if (!VALID_CATEGORIES.includes(req.query.category.trim())) {
        return res.status(400).json({ success: false, message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}.` });
      }
      filter.category = req.query.category.trim();
    }

    if (req.query.important === "true")  filter.isImportant = true;
    if (req.query.important === "false") filter.isImportant = false;

    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const [notices, total] = await Promise.all([
      Notice.find(filter).populate("postedBy", "name role").sort({ isImportant: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notice.countDocuments(filter),
    ]);

    res.json({ success: true, notices, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch notices." });
  }
};

// GET /api/notices/important
exports.getImportantNotices = async (req, res) => {
  try {
    const { role } = req.user;
    const filter = { isImportant: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] };
    if (role === "parent") filter.targetRoles = { $in: ["parent"] };

    const notices = await Notice.find(filter).populate("postedBy", "name").sort({ createdAt: -1 }).limit(5).lean();
    res.json({ success: true, notices });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch important notices." });
  }
};

// GET /api/notices/:id
exports.getNoticeById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid notice ID." });

    const { role } = req.user;
    const notice   = await Notice.findById(req.params.id).populate("postedBy", "name role").lean();
    if (!notice) return res.status(404).json({ success: false, message: "Notice not found." });

    if (role === "parent" && !notice.targetRoles.includes("parent")) {
      return res.status(403).json({ success: false, message: "You do not have access to this notice." });
    }

    res.json({ success: true, notice });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch notice." });
  }
};

// POST /api/notices
exports.createNotice = async (req, res) => {
  try {
    const { title, body } = req.body;
    const { userId } = req.user;

    if (!title?.trim()) return res.status(400).json({ success: false, message: "Notice title is required." });
    if (!body?.trim())  return res.status(400).json({ success: false, message: "Notice body is required." });

    const category = req.body.category?.trim() || "general";
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}.` });
    }

    const targetRoles = req.body.targetRoles;
    if (targetRoles !== undefined) {
      if (!Array.isArray(targetRoles) || targetRoles.length === 0) {
        return res.status(400).json({ success: false, message: "targetRoles must be a non-empty array." });
      }
      const VALID_ROLES  = ["admin", "teacher", "parent"];
      const invalidRoles = targetRoles.filter(r => !VALID_ROLES.includes(r));
      if (invalidRoles.length > 0) {
        return res.status(400).json({ success: false, message: `Invalid roles: ${invalidRoles.join(", ")}.` });
      }
    }

    let expiresAt = null;
    if (req.body.expiresAt) {
      expiresAt = new Date(req.body.expiresAt);
      if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
        return res.status(400).json({ success: false, message: "expiresAt must be a valid future date." });
      }
    }

    const fields = pickFields(req.body);
    const notice = await Notice.create({ ...fields, title: title.trim(), body: body.trim(), category, expiresAt, postedBy: userId });
    await notice.populate("postedBy", "name role");

    res.status(201).json({ success: true, notice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/notices/:id
exports.updateNotice = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid notice ID." });

    const { role, userId } = req.user;
    const existing = await Notice.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ success: false, message: "Notice not found." });

    if (role === "teacher" && existing.postedBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You can only edit notices that you posted." });
    }

    const updates = pickFields(req.body);
    if (updates.category && !VALID_CATEGORIES.includes(updates.category)) {
      return res.status(400).json({ success: false, message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}.` });
    }
    if (updates.expiresAt) {
      const exp = new Date(updates.expiresAt);
      if (isNaN(exp.getTime()) || exp <= new Date()) return res.status(400).json({ success: false, message: "expiresAt must be a valid future date." });
      updates.expiresAt = exp;
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, message: "No valid fields to update." });

    const notice = await Notice.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true })
      .populate("postedBy", "name role").lean();

    res.json({ success: true, notice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/notices/:id
exports.deleteNotice = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid notice ID." });

    const { role, userId } = req.user;
    const existing = await Notice.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ success: false, message: "Notice not found." });

    if (role === "teacher" && existing.postedBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You can only delete notices that you posted." });
    }

    await Notice.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: `Notice "${existing.title}" has been deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete notice." });
  }
};
