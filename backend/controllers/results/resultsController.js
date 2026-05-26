// backend/controllers/results/resultsController.js
const mongoose = require("mongoose");
const { ExamResult, User, Student } = require("../../models");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

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

// GET /api/results
exports.getResults = async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role === "parent") {
      const parent = await User.findById(userId).select("childId childName childClass").lean();
      if (!parent?.childId) return res.json({ success: true, results: [], total: 0 });

      const results = await ExamResult.find({ student: parent.childId, isPublished: true })
        .populate("student", "name rollNo class").populate("uploadedBy", "name").sort({ publishedAt: -1 }).lean();

      return res.json({ success: true, results, total: results.length, childName: parent.childName });
    }

    const filter = {};

    if (role === "teacher") {
      const teacher         = await User.findById(userId).select("assignedClasses").lean();
      const assignedClasses = teacher?.assignedClasses || [];
      const requestedClass  = req.query.class?.trim();

      if (requestedClass) {
        if (assignedClasses.length > 0 && !assignedClasses.includes(requestedClass)) {
          return res.status(403).json({ success: false, message: "You can only view results for your assigned classes." });
        }
        filter.class = requestedClass;
      } else if (assignedClasses.length > 0) {
        filter.class = { $in: assignedClasses };
      }
    } else {
      if (req.query.class?.trim()) filter.class = req.query.class.trim();
    }

    if (req.query.examName?.trim())   filter.examName  = req.query.examName.trim();
    if (req.query.examYear?.trim())   filter.examYear  = req.query.examYear.trim();
    if (req.query.student && isValidId(req.query.student)) filter.student = req.query.student;
    if (req.query.published === "true")  filter.isPublished = true;
    if (req.query.published === "false") filter.isPublished = false;

    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const [results, total] = await Promise.all([
      ExamResult.find(filter).populate("student", "name rollNo class").populate("uploadedBy", "name").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ExamResult.countDocuments(filter),
    ]);

    res.json({ success: true, results, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch results." });
  }
};

// GET /api/results/:id
exports.getResultById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid result ID." });

    const { role, userId } = req.user;
    const result = await ExamResult.findById(req.params.id).populate("student", "name rollNo class").populate("uploadedBy", "name").lean();
    if (!result) return res.status(404).json({ success: false, message: "Result not found." });

    if (role === "parent") {
      const parent = await User.findById(userId).select("childId").lean();
      if (!parent?.childId || result.student._id.toString() !== parent.childId.toString()) {
        return res.status(403).json({ success: false, message: "You can only view your child's results." });
      }
      if (!result.isPublished) {
        return res.status(403).json({ success: false, message: "This result has not been published yet." });
      }
    }

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch result." });
  }
};

// POST /api/results
exports.uploadResult = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { student, examName, examYear, class: cls, subjects } = req.body;

    if (!student || !isValidId(student)) return res.status(400).json({ success: false, message: "Valid student ID is required." });
    if (!examName?.trim()) return res.status(400).json({ success: false, message: "Exam name is required." });
    if (!examYear?.trim()) return res.status(400).json({ success: false, message: "Exam year (BS) is required." });
    if (!cls?.trim())      return res.status(400).json({ success: false, message: "Class is required." });
    if (!Array.isArray(subjects) || subjects.length === 0) return res.status(400).json({ success: false, message: "At least one subject is required." });

    const user = await User.findById(userId).lean();

    if (role === "teacher") {
      if (user?.assignedClasses?.length > 0 && !user.assignedClasses.includes(cls.trim())) {
        return res.status(403).json({ success: false, message: "You can only upload results for your assigned classes." });
      }
      // Ensure teacher only uploads their assigned subject
      const unauthorizedSubjects = subjects.filter(s => s.subject?.trim().toLowerCase() !== user.subject?.toLowerCase());
      if (unauthorizedSubjects.length > 0) {
        return res.status(403).json({ success: false, message: `You are only authorized to upload marks for your subject: ${user.subject}.` });
      }
    }

    const subjectErrors = [];
    for (let i = 0; i < subjects.length; i++) {
      const s = subjects[i];
      if (!s.subject?.trim())            subjectErrors.push(`Subject ${i + 1}: name is required.`);
      if (s.marksObtained == null)       subjectErrors.push(`Subject ${i + 1}: marks obtained is required.`);
      if (s.fullMarks == null)           subjectErrors.push(`Subject ${i + 1}: full marks is required.`);
      if (s.fullMarks <= 0)              subjectErrors.push(`Subject ${i + 1}: full marks must be greater than 0.`);
      if (s.marksObtained < 0)           subjectErrors.push(`Subject ${i + 1}: marks cannot be negative.`);
      if (s.marksObtained > s.fullMarks) subjectErrors.push(`Subject ${i + 1}: marks obtained cannot exceed full marks.`);
    }
    if (subjectErrors.length > 0) return res.status(400).json({ success: false, message: "Subject validation failed.", errors: subjectErrors });

    const studentDoc = await Student.findOne({ _id: student, class: cls.trim() }).lean();
    if (!studentDoc) return res.status(404).json({ success: false, message: "Student not found in this class." });

    let result = await ExamResult.findOne({ student, examName: examName.trim(), examYear: examYear.trim() });

    if (result) {
      if (role === "teacher" && result.isPublished) {
        return res.status(403).json({ success: false, message: "Cannot modify a published result. Contact administrator." });
      }

      // Update or Add subjects
      subjects.forEach(newSub => {
        const idx = result.subjects.findIndex(s => s.subject.toLowerCase() === newSub.subject.trim().toLowerCase());
        if (idx !== -1) {
          result.subjects[idx].marksObtained = Number(newSub.marksObtained);
          result.subjects[idx].fullMarks     = Number(newSub.fullMarks);
        } else {
          result.subjects.push({
            subject:       newSub.subject.trim(),
            marksObtained: Number(newSub.marksObtained),
            fullMarks:     Number(newSub.fullMarks)
          });
        }
      });
      await result.save();
    } else {
      // Create new record
      const enrichedSubjects = subjects.map(s => ({
        subject:       s.subject.trim(),
        marksObtained: Number(s.marksObtained),
        fullMarks:     Number(s.fullMarks)
      }));

      result = await ExamResult.create({
        student, class: cls.trim(), examName: examName.trim(), examYear: examYear.trim(),
        subjects: enrichedSubjects, uploadedBy: userId, isPublished: false,
      });
    }

    await result.populate([{ path: "student", select: "name rollNo class" }, { path: "uploadedBy", select: "name" }]);
    res.status(result.isNew ? 201 : 200).json({ success: true, result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/results/:id
exports.updateResult = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid result ID." });

    const { role, userId } = req.user;
    const existing = await ExamResult.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Result not found." });

    const user = await User.findById(userId).lean();

    if (role === "teacher") {
      if (user?.assignedClasses?.length > 0 && !user.assignedClasses.includes(existing.class)) {
        return res.status(403).json({ success: false, message: "You can only edit results for your assigned classes." });
      }
      if (existing.isPublished) {
        return res.status(403).json({ success: false, message: "Published results can only be edited by an administrator." });
      }
    }

    const { subjects } = req.body;
    if (!Array.isArray(subjects) || subjects.length === 0) return res.status(400).json({ success: false, message: "Subjects array is required for update." });

    if (role === "teacher") {
      // Teachers can ONLY update their own subject
      const teacherSubject = user.subject?.toLowerCase();
      
      // 1. Ensure the request doesn't try to add/modify other subjects
      const unauthorizedChanges = subjects.filter(s => s.subject?.trim().toLowerCase() !== teacherSubject);
      if (unauthorizedChanges.length > 0) {
        return res.status(403).json({ success: false, message: `You are only authorized to modify your subject: ${user.subject}.` });
      }

      // 2. Merge teacher's changes into the existing subjects array
      subjects.forEach(newSub => {
        const idx = existing.subjects.findIndex(s => s.subject.toLowerCase() === teacherSubject);
        if (idx !== -1) {
          existing.subjects[idx].marksObtained = Number(newSub.marksObtained);
          existing.subjects[idx].fullMarks     = Number(newSub.fullMarks);
        } else {
          existing.subjects.push({
            subject:       newSub.subject.trim(),
            marksObtained: Number(newSub.marksObtained),
            fullMarks:     Number(newSub.fullMarks)
          });
        }
      });
      await existing.save();
    } else {
      // Admin: Overwrite whole array
      existing.subjects = subjects.map(s => ({
        subject:       s.subject.trim(),
        marksObtained: Number(s.marksObtained),
        fullMarks:     Number(s.fullMarks)
      }));
      await existing.save();
    }

    const result = await ExamResult.findById(req.params.id)
      .populate("student", "name rollNo class")
      .populate("uploadedBy", "name")
      .lean();

    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/results/:id/publish
exports.publishResult = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid result ID." });
    const result = await ExamResult.findByIdAndUpdate(req.params.id, { $set: { isPublished: true, publishedAt: new Date() } }, { new: true })
      .populate("student", "name rollNo class").lean();
    if (!result) return res.status(404).json({ success: false, message: "Result not found." });
    res.json({ success: true, message: `Result for ${result.student?.name} has been published.`, result });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to publish result." });
  }
};

// PATCH /api/results/:id/unpublish
exports.unpublishResult = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid result ID." });
    const result = await ExamResult.findByIdAndUpdate(req.params.id, { $set: { isPublished: false, publishedAt: null } }, { new: true })
      .populate("student", "name rollNo class").lean();
    if (!result) return res.status(404).json({ success: false, message: "Result not found." });
    res.json({ success: true, message: `Result for ${result.student?.name} has been unpublished.`, result });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to unpublish result." });
  }
};

// DELETE /api/results/:id
exports.deleteResult = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid result ID." });
    const result = await ExamResult.findByIdAndDelete(req.params.id).lean();
    if (!result) return res.status(404).json({ success: false, message: "Result not found." });
    res.json({ success: true, message: "Exam result deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete result." });
  }
};
