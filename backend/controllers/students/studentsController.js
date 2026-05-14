// backend/routes/students.js
const express = require("express");
const router  = express.Router();
const mongoose = require("mongoose");
const { Student, User } = require("../../models");
const {
  authMiddleware,
  requireRole,
  requireAdmin,
  requireTeacherOrAdmin,
} = require("../../middleware/authMiddleware");

// All student routes require authentication
router.use(authMiddleware);

// ── Whitelist of fields accepted from client on create/update ─────────────────
const ALLOWED_FIELDS = [
  "name", "rollNo", "class", "section",
  "dob", "dobBs", "gender", "address", "photo",
  "parentPhone", "parentName", "admissionYear",
];

function pickFields(body) {
  return ALLOWED_FIELDS.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/students
// Admin/Teacher: all students (with class filter + search + pagination)
// Parent: ONLY their child — no filter UI, no pagination needed
// ════════════════════════════════════════════════════════════════════════════════
exports.getStudents = async (req, res) => {
  try {
    const { role, userId } = req.user;

    // ── PARENT: locked to their own child only ────────────────────────────────
    if (role === "parent") {
      // Fetch the parent user to get childId
      const parent = await User.findById(userId)
        .select("childId childName childClass")
        .lean();

      if (!parent?.childId) {
        return res.json({
          success: true,
          students: [],
          message:  "No child linked to this account. Contact the school administrator.",
        });
      }

      // Return only their child — scoped to this school
      const child = await Student.findOne({
        _id:    parent.childId,
        school: req.school._id,
      }).lean();

      return res.json({
        success:  true,
        students: child ? [child] : [],
        total:    child ? 1 : 0,
      });
    }

    // ── ADMIN / TEACHER: full list with filters + pagination ──────────────────
    const {
      class: cls,
      search,
      page     = 1,
      limit    = 20,
      sortBy   = "class",
      sortDir  = "asc",
      isActive = "true",
    } = req.query;

    // Build filter — always scoped to this school
    const filter = {
      school:   req.school._id,
      isActive: isActive === "true",
    };

    if (cls)    filter.class = cls.trim();

    if (search) {
      const searchTrimmed = search.trim();
      // FIXED: rollNo is a Number — can't use $regex on it
      // Instead: search by name (text) OR exact rollNo match if search is numeric
      const isNum = /^\d+$/.test(searchTrimmed);
      if (isNum) {
        filter.$or = [
          { name:   { $regex: searchTrimmed, $options: "i" } },
          { rollNo: parseInt(searchTrimmed, 10) },
        ];
      } else {
        filter.name = { $regex: searchTrimmed, $options: "i" };
      }
    }

    // Teacher scope: only see students in their assigned classes
    if (role === "teacher") {
      const teacher = await User.findById(userId)
        .select("assignedClasses")
        .lean();

      if (teacher?.assignedClasses?.length > 0) {
        // If a class filter was specified, validate it's one of their classes
        if (cls && !teacher.assignedClasses.includes(cls)) {
          return res.status(403).json({
            success: false,
            message: "You can only view students in your assigned classes.",
          });
        }
        // Otherwise scope to their assigned classes
        if (!cls) filter.class = { $in: teacher.assignedClasses };
      }
    }

    // Pagination
    const pageNum   = Math.max(1, parseInt(page,  10) || 1);
    const limitNum  = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip      = (pageNum - 1) * limitNum;

    // Sort
    const ALLOWED_SORTS = ["name", "class", "rollNo", "createdAt"];
    const sortField = ALLOWED_SORTS.includes(sortBy) ? sortBy : "class";
    const sortOrder = sortDir === "desc" ? -1 : 1;
    const sortObj   = { [sortField]: sortOrder, rollNo: 1 };

    // Execute query + count in parallel
    const [students, total] = await Promise.all([
      Student.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Student.countDocuments(filter),
    ]);

    res.json({
      success:    true,
      students,
      total,
      page:       pageNum,
      totalPages: Math.ceil(total / limitNum),
      limit:      limitNum,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch students." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/students/classes — list of distinct classes in this school
// Used by the frontend filter bar dropdown
// ════════════════════════════════════════════════════════════════════════════════
exports.getClassesForTeacher = async (req, res) => {
  try {
    const { role, userId } = req.user;

    let classes;

    if (role === "teacher") {
      // Teachers only see their assigned classes
      const teacher = await User.findById(userId).select("assignedClasses").lean();
      classes = teacher?.assignedClasses || [];
    } else if (role === "parent") {
      // Parents see only their child's class
      const parent = await User.findById(userId).select("childClass").lean();
      classes = parent?.childClass ? [parent.childClass] : [];
    } else {
      // Admin: all classes in the school
      classes = await Student.distinct("class", {
        school:   req.school._id,
        isActive: true,
      });
    }

    // Sort classes naturally: 6A, 6B, 7A, 8A, 10A, 10B
    classes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    res.json({ success: true, classes });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch classes." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/students/:id
// Parents can only fetch their own child
// ════════════════════════════════════════════════════════════════════════════════
exports.getStudentById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid student ID." });
    }

    const { role, userId } = req.user;

    // Parent guard — can only fetch their own child
    if (role === "parent") {
      const parent = await User.findById(userId).select("childId").lean();
      if (!parent?.childId || parent.childId.toString() !== req.params.id) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own child's details.",
        });
      }
    }

    const student = await Student.findOne({
      _id:    req.params.id,
      school: req.school._id,
    }).lean();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch student." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/students — Add new student
// Admin only (teachers can view, not create)
// ════════════════════════════════════════════════════════════════════════════════
exports.createStudent = async (req, res) => {
  try {
    // Validate required fields before touching the DB
    const { name, rollNo, class: cls } = req.body;
    if (!name?.trim())   return res.status(400).json({ success: false, message: "Student name is required." });
    if (!cls?.trim())    return res.status(400).json({ success: false, message: "Class is required." });
    if (rollNo == null)  return res.status(400).json({ success: false, message: "Roll number is required." });

    // Check for duplicate roll number in this class + school
    const exists = await Student.findOne({
      school: req.school._id,
      class:  cls.trim(),
      rollNo: parseInt(rollNo, 10),
    }).lean();

    if (exists) {
      return res.status(409).json({
        success: false,
        message: `Roll number ${rollNo} is already taken in class ${cls}.`,
      });
    }

    // Only accept whitelisted fields
    const fields = pickFields(req.body);

    const student = await Student.create({
      ...fields,
      school: req.school._id,
      rollNo: parseInt(rollNo, 10),
    });

    res.status(201).json({ success: true, student });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A student with this roll number already exists in this class.",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// PUT /api/students/:id — Update student
// Admin: can edit any student
// Teacher: can only edit students in their assigned classes
// Parent: cannot edit
// ════════════════════════════════════════════════════════════════════════════════
exports.updateStudent = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid student ID." });
    }

    const { role, userId } = req.user;

    // Teacher: verify the student is in their assigned class
    if (role === "teacher") {
      const [student, teacher] = await Promise.all([
        Student.findOne({ _id: req.params.id, school: req.school._id }).select("class").lean(),
        User.findById(userId).select("assignedClasses").lean(),
      ]);

      if (!student) {
        return res.status(404).json({ success: false, message: "Student not found." });
      }

      if (!teacher?.assignedClasses?.includes(student.class)) {
        return res.status(403).json({
          success: false,
          message: "You can only edit students in your assigned classes.",
        });
      }
    }

    // Only accept whitelisted fields — prevent school/isActive injection
    const updates = pickFields(req.body);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update." });
    }

    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, school: req.school._id },
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    res.json({ success: true, student });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// DELETE /api/students/:id — Admin only
// Soft delete: sets isActive = false
// Real schools almost never permanently delete student records (audit trail)
// ════════════════════════════════════════════════════════════════════════════════
exports.deleteStudent = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid student ID." });
    }

    // SOFT DELETE: preserve attendance, results, fee records
    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, school: req.school._id },
      { $set: { isActive: false } },
      { new: true }
    ).lean();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    res.json({
      success: true,
      message: `${student.name} has been removed from the active student list.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to remove student." });
  }
};
