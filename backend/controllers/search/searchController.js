// backend/controllers/search/searchController.js
const mongoose = require("mongoose");
const { User } = require("../../models");

const MAX_PER_TYPE  = 5;
const GLOBAL_LIMIT  = 20;
const MIN_QUERY_LEN = 2;

function shape(type, doc, subtitle) {
  return { type, _id: doc._id, name: doc.name || null, title: doc.title || null, subtitle: subtitle || "" };
}

// GET /api/search?q=searchterm
exports.searchDashboard = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const q = req.query.q?.trim();

    if (!q || q.length < MIN_QUERY_LEN) return res.json({ success: true, results: [], total: 0 });
    if (q.length > 100) return res.status(400).json({ success: false, message: "Search query is too long." });

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex   = { $regex: escaped, $options: "i" };
    const results = [];

    if (role === "parent") {
      const parent = await User.findById(userId).select("childId childName childClass").lean();
      if (!parent?.childClass) return res.json({ success: true, results: [], total: 0 });

      const [homework, notices] = await Promise.all([
        mongoose.model("Homework").find({ class: parent.childClass, title: regex }).select("title subject class dueDate dueDateBs priority").sort({ dueDate: 1 }).limit(MAX_PER_TYPE).lean(),
        mongoose.model("Notice").find({ title: regex, targetRoles: { $in: ["parent"] }, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }).select("title category isImportant createdAt").sort({ isImportant: -1, createdAt: -1 }).limit(MAX_PER_TYPE).lean(),
      ]);

      homework.forEach(h => results.push(shape("homework", h, `${h.subject} · Class ${h.class}${h.dueDateBs ? ` · Due: ${h.dueDateBs}` : ""}`)));
      notices.forEach(n  => results.push(shape("notice",   n, `${n.category}${n.isImportant ? " · Important" : ""}`)));
      return res.json({ success: true, results: results.slice(0, GLOBAL_LIMIT), total: results.length });
    }

    if (role === "teacher") {
      const teacher         = await User.findById(userId).select("assignedClasses").lean();
      const assignedClasses = teacher?.assignedClasses || [];
      const studentFilter   = { isActive: true, name: regex };
      if (assignedClasses.length > 0) studentFilter.class = { $in: assignedClasses };

      const [students, homework, notices, teachers] = await Promise.all([
        mongoose.model("Student").find(studentFilter).select("name class rollNo").sort({ name: 1 }).limit(MAX_PER_TYPE).lean(),
        mongoose.model("Homework").find({ title: regex, ...(assignedClasses.length > 0 ? { class: { $in: assignedClasses } } : {}) }).select("title subject class dueDate dueDateBs priority").sort({ dueDate: 1 }).limit(MAX_PER_TYPE).lean(),
        mongoose.model("Notice").find({ title: regex, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }).select("title category isImportant createdAt").sort({ isImportant: -1, createdAt: -1 }).limit(MAX_PER_TYPE).lean(),
        User.find({ role: "teacher", name: regex, _id: { $ne: userId }, isDisabled: false }).select("name subject").limit(3).lean(),
      ]);

      students.forEach(s => results.push(shape("student", s, `Class ${s.class} · Roll ${s.rollNo}`)));
      homework.forEach(h => results.push(shape("homework", h, `${h.subject} · Class ${h.class}${h.dueDateBs ? ` · Due: ${h.dueDateBs}` : ""}`)));
      notices.forEach(n  => results.push(shape("notice",   n, `${n.category}${n.isImportant ? " · Important" : ""}`)));
      teachers.forEach(t => results.push(shape("teacher",  t, t.subject || "Teacher")));
      return res.json({ success: true, results: results.slice(0, GLOBAL_LIMIT), total: results.length });
    }

    if (role === "admin") {
      const [students, teachers, homework, notices, calendar] = await Promise.all([
        mongoose.model("Student").find({ isActive: true, name: regex }).select("name class rollNo parentName parentPhone").sort({ class: 1, rollNo: 1 }).limit(MAX_PER_TYPE).lean(),
        User.find({ role: "teacher", isDisabled: false, $or: [{ name: regex }, { subject: regex }] }).select("name subject email assignedClasses").limit(MAX_PER_TYPE).lean(),
        mongoose.model("Homework").find({ title: regex }).select("title subject class dueDate dueDateBs priority").populate("postedBy", "name").sort({ createdAt: -1 }).limit(MAX_PER_TYPE).lean(),
        mongoose.model("Notice").find({ title: regex }).select("title category isImportant createdAt").sort({ isImportant: -1, createdAt: -1 }).limit(MAX_PER_TYPE).lean(),
        mongoose.model("AcademicCalendar").find({ title: regex }).select("title type startDateBs startDate").sort({ startDate: 1 }).limit(3).lean(),
      ]);

      students.forEach(s => results.push(shape("student",  s, `Class ${s.class} · Roll ${s.rollNo}${s.parentName ? ` · Parent: ${s.parentName}` : ""}`)));
      teachers.forEach(t => results.push(shape("teacher",  t, `${t.subject || "Teacher"}${t.assignedClasses?.length ? ` · ${t.assignedClasses.join(", ")}` : ""}`)));
      homework.forEach(h => results.push(shape("homework", h, `${h.subject} · Class ${h.class}${h.dueDateBs ? ` · Due: ${h.dueDateBs}` : ""}`)));
      notices.forEach(n  => results.push(shape("notice",   n, `${n.category}${n.isImportant ? " · Important" : ""}`)));
      calendar.forEach(e => results.push(shape("calendar", e, `${e.type}${e.startDateBs ? ` · ${e.startDateBs}` : ""}`)));
      return res.json({ success: true, results: results.slice(0, GLOBAL_LIMIT), total: results.length });
    }

    res.json({ success: true, results: [], total: 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: "Search failed. Please try again." });
  }
};
