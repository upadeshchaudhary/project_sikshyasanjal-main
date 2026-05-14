// backend/routes/results.js
const express  = require("express");
const router   = express.Router();
const mongoose = require("mongoose");
const { ExamResult, User, Student } = require("../../models");
const {
  authMiddleware,
  requireTeacherOrAdmin,
  requireAdmin,
} = require("../../middleware/authMiddleware");

router.use(authMiddleware);

// ── Helpers ───────────────────────────────────────────────────────────────────
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Single source of truth for grade calc — matches ExamResult model pre-save hook
// Using Nepal's SEE/NEB grading system
function calcGrade(pct) {
  if (pct >= 90) return { grade: "A+", gpa: 4.0 };
  if (pct >= 80) return { grade: "A",  gpa: 3.6 };
  if (pct >= 70) return { grade: "B+", gpa: 3.2 };
  if (pct >= 60) return { grade: "B",  gpa: 2.8 };
  if (pct >= 50) return { grade: "C+", gpa: 2.4 };
  if (pct >= 40) return { grade: "C",  gpa: 2.0 };
  if (pct >= 35) return { grade: "D",  gpa: 1.6 };
  return           { grade: "NG", gpa: 0.0 };
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/results
// Admin:   all results, filterable by class/exam/year
// Teacher: results for their assigned classes
// Parent:  ONLY their child's PUBLISHED results
// ════════════════════════════════════════════════════════════════════════════════
exports.getResults = async (req, res) => {
  try {
    const { role, userId } = req.user;

    // ── PARENT: child-only published results ──────────────────────────────────
    if (role === "parent") {
      const parent = await User.findById(userId)
        .select("childId childName childClass")
        .lean();

      if (!parent?.childId) {
        return res.json({ success: true, results: [], total: 0 });
      }

      // Hard-locked to child — query params ignored
      // Only published results visible to parents
      const results = await ExamResult.find({
        school:      req.school._id,
        student:     parent.childId,
        isPublished: true,
      })
        .populate("student", "name rollNo class")
        .populate("uploadedBy", "name")
        .sort({ publishedAt: -1 })
        .lean();

      return res.json({
        success:   true,
        results,
        total:     results.length,
        childName: parent.childName,
      });
    }

    // ── ADMIN / TEACHER: full access with filters ──────────────────────────────
    const filter = { school: req.school._id };

    // Teacher: restrict to assigned classes
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
            message: "You can only view results for your assigned classes.",
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

    // Optional filters
    if (req.query.examName?.trim())  filter.examName  = req.query.examName.trim();
    if (req.query.examYear?.trim())  filter.examYear  = req.query.examYear.trim();

    // Student filter (admin/teacher can filter by specific student)
    if (req.query.student && isValidId(req.query.student)) {
      filter.student = req.query.student;
    }

    // Published filter
    if (req.query.published === "true")  filter.isPublished = true;
    if (req.query.published === "false") filter.isPublished = false;

    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const [results, total] = await Promise.all([
      ExamResult.find(filter)
        .populate("student", "name rollNo class")
        .populate("uploadedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ExamResult.countDocuments(filter),
    ]);

    res.json({
      success:    true,
      results,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch results." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/results/:id — Single result detail
// Parent: only their child's published result
// ════════════════════════════════════════════════════════════════════════════════
exports.getResultById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid result ID." });
    }

    const { role, userId } = req.user;

    const result = await ExamResult.findOne({
      _id:    req.params.id,
      school: req.school._id,
    })
      .populate("student", "name rollNo class")
      .populate("uploadedBy", "name")
      .lean();

    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found." });
    }

    // Parent: can only see their child's published results
    if (role === "parent") {
      const parent = await User.findById(userId).select("childId").lean();
      if (!parent?.childId || result.student._id.toString() !== parent.childId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only view your child's results.",
        });
      }
      if (!result.isPublished) {
        return res.status(403).json({
          success: false,
          message: "This result has not been published yet.",
        });
      }
    }

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch result." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/results — Upload exam result for a student
// Admin or Teacher only
// ════════════════════════════════════════════════════════════════════════════════
exports.uploadResult = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { student, examName, examYear, class: cls, subjects } = req.body;

    // ── Input validation ──────────────────────────────────────────────────────
    if (!student || !isValidId(student)) {
      return res.status(400).json({ success: false, message: "Valid student ID is required." });
    }
    if (!examName?.trim()) {
      return res.status(400).json({ success: false, message: "Exam name is required." });
    }
    if (!examYear?.trim()) {
      return res.status(400).json({ success: false, message: "Exam year (BS) is required." });
    }
    if (!cls?.trim()) {
      return res.status(400).json({ success: false, message: "Class is required." });
    }
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ success: false, message: "At least one subject is required." });
    }

    // Validate each subject
    const subjectErrors = [];
    for (let i = 0; i < subjects.length; i++) {
      const s = subjects[i];
      if (!s.subject?.trim())           subjectErrors.push(`Subject ${i + 1}: name is required.`);
      if (s.marksObtained == null)      subjectErrors.push(`Subject ${i + 1}: marks obtained is required.`);
      if (s.fullMarks == null)          subjectErrors.push(`Subject ${i + 1}: full marks is required.`);
      if (s.fullMarks <= 0)             subjectErrors.push(`Subject ${i + 1}: full marks must be greater than 0.`);
      if (s.marksObtained < 0)          subjectErrors.push(`Subject ${i + 1}: marks cannot be negative.`);
      if (s.marksObtained > s.fullMarks) subjectErrors.push(`Subject ${i + 1}: marks obtained cannot exceed full marks.`);
    }

    if (subjectErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Subject validation failed.",
        errors:  subjectErrors,
      });
    }

    // Teacher: verify student is in their assigned class
    if (role === "teacher") {
      const teacher = await User.findById(userId).select("assignedClasses").lean();
      if (
        teacher?.assignedClasses?.length > 0 &&
        !teacher.assignedClasses.includes(cls.trim())
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only upload results for your assigned classes.",
        });
      }
    }

    // Verify student belongs to this school + class
    const studentDoc = await Student.findOne({
      _id:    student,
      school: req.school._id,
      class:  cls.trim(),
    }).lean();

    if (!studentDoc) {
      return res.status(404).json({
        success: false,
        message: "Student not found in this class. Verify the student and class.",
      });
    }

    // Check for duplicate result (same student + exam + year)
    const existing = await ExamResult.findOne({
      school:   req.school._id,
      student,
      examName: examName.trim(),
      examYear: examYear.trim(),
    }).lean();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A result for "${examName}" (${examYear}) already exists for this student. Use PUT to update it.`,
        existingId: existing._id,
      });
    }

    // ── Calculate grades per subject ──────────────────────────────────────────
    // Note: ExamResult model pre-save hook also does this as a safety net
    let totalObtained = 0;
    let totalFull     = 0;

    const enrichedSubjects = subjects.map((s) => {
      const obtained = Number(s.marksObtained);
      const full     = Number(s.fullMarks);
      const pct      = Math.round((obtained / full) * 100 * 10) / 10; // 1 decimal
      const { grade, gpa } = calcGrade(pct);
      totalObtained += obtained;
      totalFull     += full;
      return {
        subject:        s.subject.trim(),
        marksObtained:  obtained,
        fullMarks:      full,
        percentage:     pct,
        grade,
        gpa,
        isPassing:      pct >= 35,
      };
    });

    const overallPct = Math.round((totalObtained / totalFull) * 100 * 10) / 10;
    const { grade: overallGrade, gpa: overallGpa } = calcGrade(overallPct);

    const result = await ExamResult.create({
      school:            req.school._id,
      student,
      class:             cls.trim(),
      examName:          examName.trim(),
      examYear:          examYear.trim(),
      subjects:          enrichedSubjects,
      totalMarks:        totalObtained,
      totalFullMarks:    totalFull,
      overallPercentage: overallPct,
      overallGrade,
      overallGpa,
      uploadedBy:        userId,    // FIXED: use userId from JWT
      isPublished:       false,     // Draft by default — must be published separately
    });

    await result.populate([
      { path: "student",    select: "name rollNo class" },
      { path: "uploadedBy", select: "name" },
    ]);

    res.status(201).json({ success: true, result });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A result for this student and exam already exists.",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// PUT /api/results/:id — Update result (marks correction)
// Admin: any result
// Teacher: only results they uploaded
// ════════════════════════════════════════════════════════════════════════════════
exports.updateResult = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid result ID." });
    }

    const { role, userId } = req.user;

    const existing = await ExamResult.findOne({
      _id:    req.params.id,
      school: req.school._id,
    }).lean();

    if (!existing) {
      return res.status(404).json({ success: false, message: "Result not found." });
    }

    // Teacher: can only edit results they uploaded
    if (role === "teacher") {
      if (existing.uploadedBy?.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only update results that you uploaded.",
        });
      }
    }

    // Cannot edit a published result without admin
    if (existing.isPublished && role === "teacher") {
      return res.status(403).json({
        success: false,
        message: "Published results can only be edited by an administrator.",
      });
    }

    const { subjects } = req.body;
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Subjects array is required for update.",
      });
    }

    // Recalculate all grades
    let totalObtained = 0;
    let totalFull     = 0;

    const enrichedSubjects = subjects.map((s) => {
      const obtained = Number(s.marksObtained);
      const full     = Number(s.fullMarks);
      const pct      = Math.round((obtained / full) * 100 * 10) / 10;
      const { grade, gpa } = calcGrade(pct);
      totalObtained += obtained;
      totalFull     += full;
      return {
        subject:       s.subject?.trim() || "",
        marksObtained: obtained,
        fullMarks:     full,
        percentage:    pct,
        grade,
        gpa,
        isPassing:     pct >= 35,
      };
    });

    const overallPct = Math.round((totalObtained / totalFull) * 100 * 10) / 10;
    const { grade: overallGrade, gpa: overallGpa } = calcGrade(overallPct);

    const result = await ExamResult.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          subjects:          enrichedSubjects,
          totalMarks:        totalObtained,
          totalFullMarks:    totalFull,
          overallPercentage: overallPct,
          overallGrade,
          overallGpa,
        },
      },
      { new: true, runValidators: true }
    )
      .populate("student", "name rollNo class")
      .populate("uploadedBy", "name")
      .lean();

    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// PATCH /api/results/:id/publish — Publish result (make visible to parents)
// Admin only
// ════════════════════════════════════════════════════════════════════════════════
exports.publishResult = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid result ID." });
    }

    const result = await ExamResult.findOneAndUpdate(
      { _id: req.params.id, school: req.school._id },
      {
        $set: {
          isPublished: true,
          publishedAt: new Date(),
        },
      },
      { new: true }
    )
      .populate("student", "name rollNo class")
      .lean();

    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found." });
    }

    res.json({
      success: true,
      message: `Result for ${result.student?.name} has been published. Parents can now view it.`,
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to publish result." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// PATCH /api/results/:id/unpublish — Unpublish (hide from parents)
// Admin only
// ════════════════════════════════════════════════════════════════════════════════
exports.unpublishResult = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid result ID." });
    }

    const result = await ExamResult.findOneAndUpdate(
      { _id: req.params.id, school: req.school._id },
      { $set: { isPublished: false, publishedAt: null } },
      { new: true }
    )
      .populate("student", "name rollNo class")
      .lean();

    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found." });
    }

    res.json({
      success: true,
      message: `Result for ${result.student?.name} has been unpublished.`,
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to unpublish result." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// DELETE /api/results/:id — Delete result
// Admin only
// ════════════════════════════════════════════════════════════════════════════════
exports.deleteResult = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid result ID." });
    }

    const result = await ExamResult.findOneAndDelete({
      _id:    req.params.id,
      school: req.school._id,
    }).lean();

    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found." });
    }

    res.json({
      success: true,
      message: "Exam result deleted successfully.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete result." });
  }
};
