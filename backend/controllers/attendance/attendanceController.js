// backend/routes/attendance.js
const mongoose  = require("mongoose");
const express   = require("express");
const router    = express.Router();
const { Attendance, User, Student } = require("../../models");

// ── Helpers ───────────────────────────────────────────────────────────────────

// Convert a date to midnight UTC (normalises all dates for consistent comparison)
function toMidnightUTC(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Build start/end of a given day in UTC
function dayRange(dateInput) {
  const start = toMidnightUTC(dateInput);
  if (!start) return null;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { $gte: start, $lt: end };
}

function monthRangeFromQuery(year, month) {
  if (year > 2100) {
    const adYear = year - 57;
    const adMonth = ((month + 2) % 12) + 1;
    const adjustedYear = adMonth < 4 ? adYear + 1 : adYear;
    return {
      $gte: new Date(Date.UTC(adjustedYear, adMonth - 1, 1)),
      $lt:  new Date(Date.UTC(adjustedYear, adMonth, 1)),
    };
  }

  return {
    $gte: new Date(Date.UTC(year, month - 1, 1)),
    $lt:  new Date(Date.UTC(year, month, 1)),
  };
}

// Valid attendance statuses
const VALID_STATUSES = ["present", "absent", "late", "excused"];

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/attendance
// Admin:   full school attendance, filterable by class + date
// Teacher: only their assigned classes
// Parent:  ONLY their child's attendance history (monthly calendar)
// ════════════════════════════════════════════════════════════════════════════════
exports.getAttendance = async (req, res) => {
  try {
    const { role, userId } = req.user;

    // ── PARENT: child-only ────────────────────────────────────────────────────
    if (role === "parent") {
      const parent = await User.findById(userId)
        .select("childId childClass")
        .lean();

      if (!parent?.childId) {
        return res.json({ success: true, records: [], total: 0 });
      }

      // Build filter — hard-locked to child, no query params honoured
      const filter = {
        school:  req.school._id,
        student: parent.childId,
      };

      // Optional month/year filter for calendar view
      if (req.query.year && req.query.month) {
        const year  = parseInt(req.query.year,  10);
        const month = parseInt(req.query.month, 10) - 1; // JS months 0-indexed
        if (!isNaN(year) && !isNaN(month)) {
          filter.date = {
            $gte: new Date(Date.UTC(year, month, 1)),
            $lt:  new Date(Date.UTC(year, month + 1, 1)),
          };
        }
      }

      const records = await Attendance.find(filter)
        .sort({ date: -1 })
        .lean();

      // Summary counts for the parent dashboard widget
      const summary = {
        total:   records.length,
        present: records.filter(r => r.status === "present").length,
        absent:  records.filter(r => r.status === "absent").length,
        late:    records.filter(r => r.status === "late").length,
        excused: records.filter(r => r.status === "excused").length,
      };
      summary.rate = summary.total > 0
        ? Math.round(((summary.present + summary.late) / summary.total) * 100)
        : null;

      return res.json({ success: true, records, summary, total: records.length });
    }

    // ── ADMIN / TEACHER: class + date filtered ────────────────────────────────
    const filter = { school: req.school._id };

    // Teacher: constrain to assigned classes
    if (role === "teacher") {
      const teacher = await User.findById(userId)
        .select("assignedClasses")
        .lean();

      const assignedClasses = teacher?.assignedClasses || [];
      const requestedClass  = req.query.class?.trim();

      if (requestedClass) {
        if (assignedClasses.length > 0 && !assignedClasses.includes(requestedClass)) {
          return res.status(403).json({
            success: false,
            message: "You can only view attendance for your assigned classes.",
          });
        }
        filter.class = requestedClass;
      } else if (assignedClasses.length > 0) {
        filter.class = { $in: assignedClasses };
      }
    } else {
      // Admin: optional class filter
      if (req.query.class?.trim()) filter.class = req.query.class.trim();
    }

    // FIXED: date filter — convert string to proper Date range
    if (req.query.date) {
      const range = dayRange(req.query.date);
      if (!range) {
        return res.status(400).json({ success: false, message: "Invalid date format." });
      }
      filter.date = range;
    }

    // Date range filter
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) {
        const from = toMidnightUTC(req.query.from);
        if (!from) return res.status(400).json({ success: false, message: "Invalid 'from' date." });
        filter.date.$gte = from;
      }
      if (req.query.to) {
        const to = toMidnightUTC(req.query.to);
        if (!to) return res.status(400).json({ success: false, message: "Invalid 'to' date." });
        filter.date.$lte = to;
      }
    }

    // Specific student filter (for teacher/admin only — never for parent)
    if (req.query.student && isValidId(req.query.student)) {
      filter.student = req.query.student;
    }

    // Status filter
    if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip  = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .populate("student", "name rollNo class")
        .populate("markedBy", "name")
        .sort({ date: -1, "student.rollNo": 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(filter),
    ]);

    res.json({
      success:    true,
      records,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch attendance." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/attendance/today — Today's attendance status for dashboard widgets
// Admin: school-wide summary  |  Teacher: their classes  |  Parent: child status
// ════════════════════════════════════════════════════════════════════════════════
exports.getTodayAttendance = async (req, res) => {
  try {
    const { role, userId } = req.user;
    const todayRange = dayRange(new Date());
    const filter = { school: req.school._id, date: todayRange };

    // PARENT: return child's status for today only
    if (role === "parent") {
      const parent = await User.findById(userId).select("childId childName").lean();

      if (!parent?.childId) {
        return res.json({ success: true, status: null, childName: null });
      }

      const record = await Attendance.findOne({
        ...filter,
        student: parent.childId,
      }).lean();

      return res.json({
        success:   true,
        childName: parent.childName,
        status:    record?.status || "not_marked",
        dateBs:    record?.dateBs || null,
      });
    }

    // TEACHER: summary for their classes
    if (role === "teacher") {
      const teacher = await User.findById(userId).select("assignedClasses").lean();
      if (teacher?.assignedClasses?.length > 0) {
        filter.class = { $in: teacher.assignedClasses };
      }
    }

    // ADMIN + TEACHER: aggregate summary
    const [summary, totalStudents] = await Promise.all([
      Attendance.aggregate([
        { $match: filter },
        { $group: {
          _id:     "$status",
          count:   { $sum: 1 },
        }},
      ]),
      Student.countDocuments({
        school:   req.school._id,
        isActive: true,
        ...(role === "teacher" ? {} : {}),
      }),
    ]);

    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    summary.forEach(s => { if (counts[s._id] !== undefined) counts[s._id] = s.count; });
    const marked   = counts.present + counts.absent + counts.late + counts.excused;
    const rate     = marked > 0
      ? Math.round(((counts.present + counts.late) / marked) * 100)
      : null;

    res.json({
      success:      true,
      counts,
      rate,
      marked,
      totalStudents,
      unmarked: Math.max(0, totalStudents - marked),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch today's attendance." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/attendance/monthly — Monthly calendar data for parent view
// Returns an array of { date, dateBs, status } for the given month
// ════════════════════════════════════════════════════════════════════════════════
exports.getMonthlyAttendance = async (req, res) => {
  try {
    const { role, userId } = req.user;

    const year  = parseInt(req.query.year,  10);
    const month = parseInt(req.query.month, 10);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Provide valid year and month (1-12) query parameters.",
      });
    }

    // Parent: only their child
    if (role === "parent") {
      const parent = await User.findById(userId)
        .select("childId childName childClass")
        .lean();

      if (!parent?.childId) {
        return res.json({ success: true, records: [], childName: null });
      }

      const records = await Attendance.find({
        school:  req.school._id,
        student: parent.childId,
        date: monthRangeFromQuery(year, month),
      })
        .select("date dateBs status note")
        .sort({ date: 1 })
        .lean();

      // Format for calendar rendering
      const calendarData = records.map(r => ({
        date:   r.date,
        dateBs: r.dateBs,
        status: r.status,
        note:   r.note || "",
      }));

      return res.json({
        success:     true,
        records:     calendarData,
        childName:   parent.childName,
        childClass:  parent.childClass,
        year,
        month,
      });
    }

    // Admin/Teacher: student-level monthly calendar or class-level summary
    const studentId = req.query.student?.trim();
    if (studentId) {
      const records = await Attendance.find({
        school:  req.school._id,
        student: studentId,
        date:    monthRangeFromQuery(year, month),
      })
        .select("date dateBs status note")
        .sort({ date: 1 })
        .lean();

      return res.json({ success: true, records, student: studentId, year, month });
    }

    const cls = req.query.class?.trim();
    if (!cls) {
      return res.status(400).json({
        success: false,
        message: "Class is required for monthly attendance view.",
      });
    }

    const filter = {
      school: req.school._id,
      class:  cls,
      date:   monthRangeFromQuery(year, month),
    };

    const records = await Attendance.find(filter)
      .populate("student", "name rollNo")
      .sort({ date: 1, "student.rollNo": 1 })
      .lean();

    res.json({ success: true, records, class: cls, year, month });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch monthly attendance." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/attendance/bulk — Save bulk attendance for a class on a given date
// Admin or Teacher only
// ════════════════════════════════════════════════════════════════════════════════
exports.saveBulkAttendance = async (req, res) => {
  try {
    const { records, date, dateBs, class: cls } = req.body;
    const { role, userId } = req.user;

    // Top-level validation
    if (!date || !cls) {
      return res.status(400).json({
        success: false,
        message: "Date and class are required.",
      });
    }

    const normalDate = toMidnightUTC(date);
    if (!normalDate) {
      return res.status(400).json({ success: false, message: "Invalid date." });
    }

    // Prevent future attendance marking (max 1 day ahead)
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    if (normalDate > tomorrow) {
      return res.status(400).json({
        success: false,
        message: "Cannot mark attendance for future dates.",
      });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Records array is required and cannot be empty.",
      });
    }

    // Hard limit to prevent DoS via huge payload
    if (records.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Cannot submit more than 200 attendance records at once.",
      });
    }

    // Teacher: verify the class is in their assigned classes
    if (role === "teacher") {
      const teacher = await User.findById(userId).select("assignedClasses").lean();
      if (
        teacher?.assignedClasses?.length > 0 &&
        !teacher.assignedClasses.includes(cls.trim())
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only mark attendance for your assigned classes.",
        });
      }
    }

    // Validate each record
    const errors = [];
    const validRecords = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];

      if (!r.student || !isValidId(r.student)) {
        errors.push(`Record ${i + 1}: invalid or missing student ID.`);
        continue;
      }

      if (!r.status || !VALID_STATUSES.includes(r.status)) {
        errors.push(`Record ${i + 1}: status must be one of: ${VALID_STATUSES.join(", ")}.`);
        continue;
      }

      validRecords.push({
        student: r.student,
        status:  r.status,
        note:    r.note?.trim()?.slice(0, 200) || "", // cap note length
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some records are invalid.",
        errors,
      });
    }

    // Verify all student IDs belong to this school + class
    const studentIds  = validRecords.map(r => r.student);
    const students    = await Student.find({
      _id:    { $in: studentIds },
      school: req.school._id,
      class:  cls.trim(),
    }).select("_id").lean();

    const validStudentIds = new Set(students.map(s => s._id.toString()));
    const invalidRecords  = validRecords.filter(
      r => !validStudentIds.has(r.student.toString())
    );

    if (invalidRecords.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${invalidRecords.length} student(s) not found in class ${cls} of this school.`,
      });
    }

    // FIXED: build safe upsert operations — no req.body spread
    const ops = validRecords.map(r => ({
      updateOne: {
        filter: {
          school:  req.school._id,
          student: r.student,
          date:    normalDate,
        },
        update: {
          $set: {
            school:   req.school._id,
            student:  r.student,
            class:    cls.trim(),
            date:     normalDate,
            dateBs:   dateBs || "", // FIXED: store BS date
            status:   r.status,
            note:     r.note,
            markedBy: userId,       // FIXED: use userId from JWT
          },
        },
        upsert: true,
      },
    }));

    const result = await Attendance.bulkWrite(ops, { ordered: false });

    res.json({
      success:  true,
      message:  `Attendance saved for ${validRecords.length} student(s) in class ${cls}.`,
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save attendance." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// PUT /api/attendance/:id — Update single attendance record
// Admin only (corrections after bulk mark)
// ════════════════════════════════════════════════════════════════════════════════
exports.updateAttendance = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid attendance ID." });
    }

    const { status, note } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_STATUSES.join(", ")}.`,
      });
    }

    const updates = {};
    if (status) updates.status = status;
    if (note !== undefined) updates.note = note?.trim()?.slice(0, 200) || "";

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update." });
    }

    const record = await Attendance.findOneAndUpdate(
      { _id: req.params.id, school: req.school._id },
      { $set: updates },
      { new: true }
    )
      .populate("student", "name rollNo")
      .lean();

    if (!record) {
      return res.status(404).json({ success: false, message: "Attendance record not found." });
    }

    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update attendance." });
  }
};
