// backend/routes/dashboard.js
//
// Role-specific aggregated data for dashboard widgets.
// Each endpoint returns only what that role's dashboard needs —
// no over-fetching, no client-side filtering of sensitive data.

const express  = require("express");
const router   = express.Router();
const mongoose = require("mongoose");
const { protect, requireAdmin } = require("../middleware/auth");
const { User } = require("../models");

router.use(protect);

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/dashboard/admin — Admin dashboard stats
// ════════════════════════════════════════════════════════════════════════════════
router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const schoolId = req.school._id;
    const today    = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const [
      totalStudents,
      totalTeachers,
      todayAttendance,
      feeSummary,
    ] = await Promise.all([
      mongoose.model("Student").countDocuments({ school: schoolId, isActive: true }),
      User.countDocuments({ school: schoolId, role: "teacher", isDisabled: false }),
      mongoose.model("Attendance").aggregate([
        { $match: { school: schoolId, date: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      mongoose.model("FeeRecord").aggregate([
        { $match: { school: schoolId } },
        { $group: { _id: null, total: { $sum: "$amount" }, paid: { $sum: "$paidAmount" } } },
      ]),
    ]);

    // Attendance rate
    const attCounts  = { present: 0, absent: 0, late: 0, excused: 0 };
    todayAttendance.forEach(a => { if (attCounts[a._id] !== undefined) attCounts[a._id] = a.count; });
    const marked     = attCounts.present + attCounts.absent + attCounts.late + attCounts.excused;
    const attRate    = marked > 0
      ? Math.round(((attCounts.present + attCounts.late) / marked) * 100)
      : null;

    // Fee collection rate
    const fees       = feeSummary[0] || { total: 0, paid: 0 };
    const collRate   = fees.total > 0 ? Math.round((fees.paid / fees.total) * 100) : 0;

    res.json({
      success:           true,
      totalStudents,
      totalTeachers,
      attendanceRate:    attRate,
      attendanceSummary: marked > 0 ? `${attCounts.present + attCounts.late} / ${marked} present` : "Not yet marked",
      collectionRate:    collRate,
      pendingAmount:     Math.max(0, fees.total - fees.paid),
      currentBsYear:     req.school.academicYear || "2081-82",
      studentsTrend:     "This academic year",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load admin dashboard." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/dashboard/admin/charts — Chart data for admin dashboard
// ════════════════════════════════════════════════════════════════════════════════
router.get("/admin/charts", requireAdmin, async (req, res) => {
  try {
    const schoolId = req.school._id;

    // Monthly attendance rate for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyAtt = await mongoose.model("Attendance").aggregate([
      { $match: { school: schoolId, date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year:  { $year: "$date" },
            month: { $month: "$date" },
          },
          present: { $sum: { $cond: [{ $in: ["$status", ["present", "late"]] }, 1, 0] } },
          total:   { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const BS_MONTHS = ["Bai", "Jes", "Ash", "Shr", "Bha", "Ash", "Kti", "Man", "Pou", "Mag", "Fal", "Cha"];
    const attendance = monthlyAtt.map(m => ({
      month: BS_MONTHS[(m._id.month - 1) % 12],
      rate:  m.total > 0 ? Math.round((m.present / m.total) * 100) : 0,
    }));

    // Enrollment trend — last 4 years
    const currentYear = new Date().getFullYear();
    const enrollment = [];
    for (let y = currentYear - 3; y <= currentYear; y++) {
      const start = new Date(y, 3, 14);      // approx Baisakh 1
      const end   = new Date(y + 1, 3, 13);
      const count = await mongoose.model("Student").countDocuments({
        school:    schoolId,
        createdAt: { $gte: start, $lt: end },
      });
      enrollment.push({ year: `${y + 57}`, students: count });
    }

    res.json({ success: true, attendance, enrollment });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load chart data." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/dashboard/teacher — Teacher dashboard stats
// ════════════════════════════════════════════════════════════════════════════════
router.get("/teacher", async (req, res) => {
  try {
    const { userId } = req.user;
    const schoolId   = req.school._id;

    const teacher = await User.findById(userId).select("assignedClasses").lean();
    const assignedClasses = teacher?.assignedClasses || [];

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [homeworkCount, unreadMessages] = await Promise.all([
      mongoose.model("Homework").countDocuments({
        school:    schoolId,
        postedBy:  userId,
        createdAt: { $gte: oneWeekAgo },
      }),
      mongoose.model("Message").countDocuments({
        school:            schoolId,
        to:                userId,
        isReadByRecipient: false,
      }),
    ]);

    res.json({
      success:        true,
      assignedClasses,
      homeworkCount,
      unreadMessages,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load teacher dashboard." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/dashboard/parent — Parent dashboard stats
// Scoped to their child only
// ════════════════════════════════════════════════════════════════════════════════
router.get("/parent", async (req, res) => {
  try {
    const { userId } = req.user;
    const schoolId   = req.school._id;

    const parent = await User.findById(userId)
      .select("childId childName childClass")
      .lean();

    if (!parent?.childId) {
      return res.json({
        success:          true,
        todayAttendance:  { status: "not_marked", dateBs: null },
        pendingHomework:  0,
        outstandingFees:  0,
        unreadMessages:   0,
        childName:        null,
        childClass:       null,
      });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const [todayRec, pendingHW, feeSummary, unreadMessages] = await Promise.all([
      // Today's attendance for child
      mongoose.model("Attendance").findOne({
        school:  schoolId,
        student: parent.childId,
        date:    { $gte: today, $lt: tomorrow },
      }).select("status dateBs").lean(),

      // Upcoming homework for child's class
      mongoose.model("Homework").countDocuments({
        school:  schoolId,
        class:   parent.childClass,
        dueDate: { $gte: new Date(), $lte: nextWeek },
      }),

      // Outstanding fees for child
      mongoose.model("FeeRecord").aggregate([
        {
          $match: {
            school:  schoolId,
            student: new mongoose.Types.ObjectId(parent.childId.toString()),
            status:  { $in: ["pending", "partially_paid", "overdue"] },
          },
        },
        {
          $group: {
            _id:         null,
            outstanding: { $sum: { $subtract: ["$amount", "$paidAmount"] } },
          },
        },
      ]),

      // Unread messages for this parent
      mongoose.model("Message").countDocuments({
        school:            schoolId,
        to:                userId,
        isReadByRecipient: false,
      }),
    ]);

    res.json({
      success:          true,
      todayAttendance:  todayRec
        ? { status: todayRec.status, dateBs: todayRec.dateBs }
        : { status: "not_marked", dateBs: null },
      pendingHomework:  pendingHW,
      outstandingFees:  feeSummary[0]?.outstanding || 0,
      unreadMessages,
      childName:        parent.childName,
      childClass:       parent.childClass,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load parent dashboard." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/dashboard/search — Global role-scoped search
// ════════════════════════════════════════════════════════════════════════════════
router.get("/search", async (req, res) => {
  try {
    const { userId, role } = req.user;
    const schoolId = req.school._id;
    const q = req.query.q?.trim();

    if (!q || q.length < 2) {
      return res.json({ success: true, results: [] });
    }

    const regex   = { $regex: q, $options: "i" };
    const results = [];
    const LIMIT   = 8;

    if (role === "parent") {
      // Parent: only search their child's class homework + notices
      const parent = await User.findById(userId).select("childClass childId").lean();
      const [hw, notices] = await Promise.all([
        mongoose.model("Homework").find({ school: schoolId, class: parent?.childClass, title: regex })
          .select("title subject class").limit(4).lean(),
        mongoose.model("Notice").find({ school: schoolId, title: regex })
          .select("title category").limit(4).lean(),
      ]);
      hw.forEach(h => results.push({ type: "homework", _id: h._id, title: h.title, subtitle: `${h.subject} · Class ${h.class}` }));
      notices.forEach(n => results.push({ type: "notice", _id: n._id, title: n.title, subtitle: n.category }));
    } else {
      // Admin / Teacher: search students, teachers, homework, notices
      const [students, teachers, hw, notices] = await Promise.all([
        mongoose.model("Student").find({ school: schoolId, isActive: true, name: regex })
          .select("name class rollNo").limit(4).lean(),
        role === "admin"
          ? User.find({ school: schoolId, role: "teacher", name: regex })
              .select("name subject").limit(3).lean()
          : Promise.resolve([]),
        mongoose.model("Homework").find({ school: schoolId, title: regex })
          .select("title subject class").limit(3).lean(),
        mongoose.model("Notice").find({ school: schoolId, title: regex })
          .select("title category").limit(3).lean(),
      ]);

      students.forEach(s => results.push({ type: "student", _id: s._id, name: s.name, subtitle: `Class ${s.class} · Roll ${s.rollNo}` }));
      teachers.forEach(t => results.push({ type: "teacher", _id: t._id, name: t.name, subtitle: t.subject || "Teacher" }));
      hw.forEach(h => results.push({ type: "homework", _id: h._id, title: h.title, subtitle: `${h.subject} · Class ${h.class}` }));
      notices.forEach(n => results.push({ type: "notice", _id: n._id, title: n.title, subtitle: n.category }));
    }

    res.json({ success: true, results: results.slice(0, LIMIT) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Search failed." });
  }
});

module.exports = router;