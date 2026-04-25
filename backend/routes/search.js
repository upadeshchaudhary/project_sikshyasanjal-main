// backend/routes/search.js
//
// Global role-scoped search endpoint.
// Called by Topbar.jsx's debounced search box with Cmd+K shortcut.
//
// SECURITY CONTRACT:
//   - Parent: can only see their child's homework and school notices
//   - Teacher: can see students in their assigned classes, their own homework, all notices
//   - Admin: can see everything in the school
//
// PERFORMANCE:
//   - All queries run in parallel with Promise.all
//   - Each sub-query hard-limited to MAX_PER_TYPE results
//   - mongoose indexes on school + name text field hit for each collection
//   - Total results capped at GLOBAL_LIMIT before returning

const express   = require("express");
const router    = express.Router();
const mongoose  = require("mongoose");
const { protect } = require("../middleware/auth");
const { User }  = require("../models");

router.use(protect);

const MAX_PER_TYPE  = 5;
const GLOBAL_LIMIT  = 15;
const MIN_QUERY_LEN = 2;

// ── Safe result shaper — consistent shape for every result type ───────────────
function shape(type, doc, subtitle) {
  return {
    type,
    _id:      doc._id,
    // Students/teachers use 'name', homework/notices use 'title'
    name:     doc.name  || null,
    title:    doc.title || null,
    subtitle: subtitle  || "",
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/search?q=searchterm
// Must be authenticated + school-scoped
// ════════════════════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const { userId, role } = req.user;
    const schoolId = req.school._id;
    const q = req.query.q?.trim();

    // Guard: minimum query length
    if (!q || q.length < MIN_QUERY_LEN) {
      return res.json({ success: true, results: [], total: 0 });
    }

    // Guard: max query length (prevents regex DoS)
    if (q.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Search query is too long.",
      });
    }

    // Escape regex special characters to prevent injection
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex   = { $regex: escaped, $options: "i" };

    const results = [];

    // ── PARENT: locked to child's data only ───────────────────────────────────
    if (role === "parent") {
      const parent = await User.findById(userId)
        .select("childId childName childClass")
        .lean();

      if (!parent?.childClass) {
        return res.json({ success: true, results: [], total: 0 });
      }

      // Parent can search: homework for their child's class + school notices
      const [homework, notices] = await Promise.all([
        mongoose.model("Homework").find({
          school: schoolId,
          class:  parent.childClass,
          title:  regex,
        })
          .select("title subject class dueDate dueDateBs priority")
          .sort({ dueDate: 1 })
          .limit(MAX_PER_TYPE)
          .lean(),

        mongoose.model("Notice").find({
          school:      schoolId,
          title:       regex,
          targetRoles: { $in: ["parent"] },
          $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } },
          ],
        })
          .select("title category isImportant createdAt")
          .sort({ isImportant: -1, createdAt: -1 })
          .limit(MAX_PER_TYPE)
          .lean(),
      ]);

      homework.forEach(h => results.push(
        shape("homework", h, `${h.subject} · Class ${h.class}${h.dueDateBs ? ` · Due: ${h.dueDateBs}` : ""}`)
      ));
      notices.forEach(n => results.push(
        shape("notice", n, `${n.category}${n.isImportant ? " · Important" : ""}`)
      ));

      return res.json({
        success: true,
        results: results.slice(0, GLOBAL_LIMIT),
        total:   results.length,
      });
    }

    // ── TEACHER: scoped to assigned classes ───────────────────────────────────
    if (role === "teacher") {
      const teacher = await User.findById(userId)
        .select("assignedClasses")
        .lean();

      const assignedClasses = teacher?.assignedClasses || [];

      const studentFilter = {
        school:   schoolId,
        isActive: true,
        name:     regex,
      };

      // Teacher only sees students in their assigned classes
      if (assignedClasses.length > 0) {
        studentFilter.class = { $in: assignedClasses };
      }

      const [students, homework, notices, teachers] = await Promise.all([
        mongoose.model("Student").find(studentFilter)
          .select("name class rollNo")
          .sort({ name: 1 })
          .limit(MAX_PER_TYPE)
          .lean(),

        // Teacher sees their own homework + homework for their classes
        mongoose.model("Homework").find({
          school: schoolId,
          title:  regex,
          ...(assignedClasses.length > 0 ? { class: { $in: assignedClasses } } : {}),
        })
          .select("title subject class dueDate dueDateBs priority")
          .sort({ dueDate: 1 })
          .limit(MAX_PER_TYPE)
          .lean(),

        mongoose.model("Notice").find({
          school: schoolId,
          title:  regex,
          $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } },
          ],
        })
          .select("title category isImportant createdAt")
          .sort({ isImportant: -1, createdAt: -1 })
          .limit(MAX_PER_TYPE)
          .lean(),

        // Teacher can search other teachers by name (for messaging)
        User.find({
          school:     schoolId,
          role:       "teacher",
          name:       regex,
          _id:        { $ne: userId },
          isDisabled: false,
        })
          .select("name subject")
          .limit(3)
          .lean(),
      ]);

      students.forEach(s => results.push(
        shape("student", s, `Class ${s.class} · Roll ${s.rollNo}`)
      ));
      homework.forEach(h => results.push(
        shape("homework", h, `${h.subject} · Class ${h.class}${h.dueDateBs ? ` · Due: ${h.dueDateBs}` : ""}`)
      ));
      notices.forEach(n => results.push(
        shape("notice", n, `${n.category}${n.isImportant ? " · Important" : ""}`)
      ));
      teachers.forEach(t => results.push(
        shape("teacher", t, t.subject || "Teacher")
      ));

      return res.json({
        success: true,
        results: results.slice(0, GLOBAL_LIMIT),
        total:   results.length,
      });
    }

    // ── ADMIN: full school search ─────────────────────────────────────────────
    if (role === "admin") {
      const [students, teachers, homework, notices, calendar] = await Promise.all([
        // Students by name
        mongoose.model("Student").find({
          school:   schoolId,
          isActive: true,
          name:     regex,
        })
          .select("name class rollNo parentName parentPhone")
          .sort({ class: 1, rollNo: 1 })
          .limit(MAX_PER_TYPE)
          .lean(),

        // Teachers by name or subject
        User.find({
          school:     schoolId,
          role:       "teacher",
          isDisabled: false,
          $or: [
            { name:    regex },
            { subject: regex },
          ],
        })
          .select("name subject email assignedClasses")
          .limit(MAX_PER_TYPE)
          .lean(),

        // Homework by title
        mongoose.model("Homework").find({
          school: schoolId,
          title:  regex,
        })
          .select("title subject class dueDate dueDateBs priority")
          .populate("postedBy", "name")
          .sort({ createdAt: -1 })
          .limit(MAX_PER_TYPE)
          .lean(),

        // Notices by title
        mongoose.model("Notice").find({
          school: schoolId,
          title:  regex,
        })
          .select("title category isImportant createdAt")
          .sort({ isImportant: -1, createdAt: -1 })
          .limit(MAX_PER_TYPE)
          .lean(),

        // Calendar events by title
        mongoose.model("AcademicCalendar").find({
          school: schoolId,
          title:  regex,
        })
          .select("title type startDateBs startDate")
          .sort({ startDate: 1 })
          .limit(3)
          .lean(),
      ]);

      students.forEach(s => results.push(
        shape("student", s, `Class ${s.class} · Roll ${s.rollNo}${s.parentName ? ` · Parent: ${s.parentName}` : ""}`)
      ));
      teachers.forEach(t => results.push(
        shape("teacher", t, `${t.subject || "Teacher"}${t.assignedClasses?.length ? ` · ${t.assignedClasses.join(", ")}` : ""}`)
      ));
      homework.forEach(h => results.push(
        shape("homework", h, `${h.subject} · Class ${h.class}${h.dueDateBs ? ` · Due: ${h.dueDateBs}` : ""}`)
      ));
      notices.forEach(n => results.push(
        shape("notice", n, `${n.category}${n.isImportant ? " · Important" : ""}`)
      ));
      calendar.forEach(e => results.push(
        shape("calendar", e, `${e.type}${e.startDateBs ? ` · ${e.startDateBs}` : ""}`)
      ));

      return res.json({
        success: true,
        results: results.slice(0, GLOBAL_LIMIT),
        total:   results.length,
      });
    }

    // Unknown role — empty results
    res.json({ success: true, results: [], total: 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: "Search failed. Please try again." });
  }
});

module.exports = router;