// backend/controllers/dashboard/dashboardController.js
const mongoose = require("mongoose");
const { User }  = require("../../models");

// GET /api/dashboard/admin
exports.getAdminDashboardStats = async (req, res) => {
  try {
    const today    = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const [totalStudents, totalTeachers, totalNotices, todayAttendance, feeSummary] = await Promise.all([
      mongoose.model("Student").countDocuments({ isActive: true }),
      User.countDocuments({ role: "teacher", isDisabled: false }),
      mongoose.model("Notice").countDocuments({ expiresAt: { $gt: new Date() } }),
      mongoose.model("Attendance").aggregate([
        { $match: { date: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      mongoose.model("FeeRecord").aggregate([
        { $group: { _id: null, totalAmount: { $sum: "$amount" }, totalPaid: { $sum: "$paidAmount" } } }
      ])
    ]);

    const attCounts = { present: 0, absent: 0, late: 0, excused: 0 };
    todayAttendance.forEach(a => { if (attCounts[a._id] !== undefined) attCounts[a._id] = a.count; });
    const marked  = attCounts.present + attCounts.absent + attCounts.late + attCounts.excused;
    const attRate = marked > 0 ? Math.round(((attCounts.present + attCounts.late) / marked) * 100) : 0;

    const collectionRate = feeSummary[0] && feeSummary[0].totalAmount > 0 
      ? Math.round((feeSummary[0].totalPaid / feeSummary[0].totalAmount) * 100) 
      : 0;
    const pendingAmount = feeSummary[0] ? feeSummary[0].totalAmount - feeSummary[0].totalPaid : 0;

    const currentYear = new Date().getFullYear() + 57; // Approximate BS year

    res.json({
      success: true,
      totalStudents,
      totalTeachers,
      attendanceRate: attRate,
      collectionRate,
      pendingAmount,
      totalNotices,
      studentsTrend: "This academic year",
      attendanceSummary: marked > 0 ? `${marked} students marked` : "Not yet marked",
      currentBsYear: `${currentYear} BS`,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ success: false, message: "Failed to load admin dashboard." });
  }
};

// GET /api/dashboard/admin/charts
exports.getAdminDashboardCharts = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyAtt = await mongoose.model("Attendance").aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" } }, present: { $sum: { $cond: [{ $in: ["$status", ["present", "late"]] }, 1, 0] } }, total: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const BS_MONTHS = ["Bai", "Jes", "Ash", "Shr", "Bha", "Ash", "Kti", "Man", "Pou", "Mag", "Fal", "Cha"];
    const attendance = monthlyAtt.map(m => ({
      month: BS_MONTHS[(m._id.month - 1) % 12],
      rate:  m.total > 0 ? Math.round((m.present / m.total) * 100) : 0,
    }));

    const currentYear = new Date().getFullYear();
    const enrollment  = [];
    for (let y = currentYear - 3; y <= currentYear; y++) {
      const count = await mongoose.model("Student").countDocuments({
        createdAt: { $gte: new Date(y, 3, 14), $lt: new Date(y + 1, 3, 13) },
      });
      enrollment.push({ year: `${y + 57}`, students: count });
    }

    res.json({ success: true, attendance, enrollment });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load chart data." });
  }
};

// GET /api/dashboard/teacher
exports.getTeacherDashboardStats = async (req, res) => {
  try {
    const { userId }      = req.user;
    const teacher         = await User.findById(userId).select("assignedClasses").lean();
    const assignedClasses = teacher?.assignedClasses || [];

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [homeworkCount, unreadMessages] = await Promise.all([
      mongoose.model("Homework").countDocuments({ postedBy: userId, createdAt: { $gte: oneWeekAgo } }),
      mongoose.model("Message").countDocuments({ to: userId, isReadByRecipient: false }),
    ]);

    res.json({ success: true, assignedClasses, homeworkCount, unreadMessages });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load teacher dashboard." });
  }
};

// GET /api/dashboard/parent
exports.getParentDashboardStats = async (req, res) => {
  try {
    const { userId } = req.user;
    const parent     = await User.findById(userId).select("childId childName childClass").lean();

    if (!parent?.childId) {
      return res.json({ success: true, todayAttendance: { status: "not_marked", dateBs: null }, pendingHomework: 0, outstandingFees: 0, unreadMessages: 0, childName: null, childClass: null });
    }

    const today    = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const [todayRec, pendingHW, feeSummary, unreadMessages] = await Promise.all([
      mongoose.model("Attendance").findOne({ student: parent.childId, date: { $gte: today, $lt: tomorrow } }).select("status dateBs").lean(),
      mongoose.model("Homework").countDocuments({ class: parent.childClass }),
      mongoose.model("FeeRecord").aggregate([
        { $match: { student: new mongoose.Types.ObjectId(parent.childId.toString()), status: { $in: ["pending", "partially_paid", "overdue"] } } },
        { $group: { _id: null, outstanding: { $sum: { $subtract: ["$amount", "$paidAmount"] } } } },
      ]),
      mongoose.model("Message").countDocuments({ to: userId, isReadByRecipient: false }),
    ]);

    res.json({
      success:         true,
      todayAttendance: todayRec ? { status: todayRec.status, dateBs: todayRec.dateBs } : { status: "not_marked", dateBs: null },
      pendingHomework: pendingHW,
      outstandingFees: feeSummary[0]?.outstanding || 0,
      unreadMessages,
      childName:       parent.childName,
      childClass:      parent.childClass,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load parent dashboard." });
  }
};

// GET /api/dashboard/search
exports.searchDashboard = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const q = req.query.q?.trim();
    if (!q || q.length < 2) return res.json({ success: true, results: [] });

    const regex   = { $regex: q, $options: "i" };
    const results = [];
    const LIMIT   = 8;

    if (role === "parent") {
      const parent = await User.findById(userId).select("childClass childId").lean();
      const [hw, notices] = await Promise.all([
        mongoose.model("Homework").find({ class: parent?.childClass, title: regex }).select("title subject class").limit(4).lean(),
        mongoose.model("Notice").find({ title: regex }).select("title category").limit(4).lean(),
      ]);
      hw.forEach(h => results.push({ type: "homework", _id: h._id, title: h.title, subtitle: `${h.subject} · Class ${h.class}` }));
      notices.forEach(n => results.push({ type: "notice", _id: n._id, title: n.title, subtitle: n.category }));
    } else {
      const [students, teachers, hw, notices] = await Promise.all([
        mongoose.model("Student").find({ isActive: true, name: regex }).select("name class rollNo").limit(4).lean(),
        role === "admin" ? User.find({ role: "teacher", name: regex }).select("name subject").limit(3).lean() : Promise.resolve([]),
        mongoose.model("Homework").find({ title: regex }).select("title subject class").limit(3).lean(),
        mongoose.model("Notice").find({ title: regex }).select("title category").limit(3).lean(),
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
};
