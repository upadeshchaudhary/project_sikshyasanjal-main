// backend/controllers/students/studentsController.js
const mongoose = require("mongoose");
const { Student, User } = require("../../models");

const ALLOWED_FIELDS = ["name", "rollNo", "class", "section", "dob", "dobBs", "gender", "address", "photo", "parentPhone", "parentName", "admissionYear"];
const pickFields = (body) => ALLOWED_FIELDS.reduce((acc, key) => { if (body[key] !== undefined) acc[key] = body[key]; return acc; }, {});

// GET /api/students
exports.getStudents = async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role === "parent") {
      const parent = await User.findById(userId).select("childId childName childClass").lean();
      if (!parent?.childId) return res.json({ success: true, students: [], total: 0, page: 1, totalPages: 0 });
      const child = await Student.findById(parent.childId).lean();
      return res.json({ success: true, students: child ? [child] : [], total: child ? 1 : 0, page: 1, totalPages: child ? 1 : 0 });
    }

    const { class: cls, search, page = 1, limit = 20, sortBy = "class", sortDir = "asc", isActive = "true" } = req.query;
    const filter = { isActive: isActive === "true" };
    if (cls) filter.class = cls.trim();

    if (search) {
      const s = search.trim();
      filter.$or = /^\d+$/.test(s)
        ? [{ name: { $regex: s, $options: "i" } }, { rollNo: parseInt(s, 10) }]
        : [{ name: { $regex: s, $options: "i" } }];
    }

    if (role === "teacher") {
      const teacher = await User.findById(userId).select("assignedClasses").lean();
      if (teacher?.assignedClasses?.length > 0) {
        if (cls && !teacher.assignedClasses.includes(cls)) {
          return res.status(403).json({ success: false, message: "You can only view students in your assigned classes." });
        }
        if (!cls) filter.class = { $in: teacher.assignedClasses };
      }
    }

    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip     = (pageNum - 1) * limitNum;
    const ALLOWED_SORTS = ["name", "class", "rollNo", "createdAt"];
    const sortField = ALLOWED_SORTS.includes(sortBy) ? sortBy : "class";
    const sortObj   = { [sortField]: sortDir === "desc" ? -1 : 1, rollNo: 1 };

    const [students, total] = await Promise.all([
      Student.find(filter).sort(sortObj).skip(skip).limit(limitNum).lean(),
      Student.countDocuments(filter),
    ]);

    res.json({ success: true, students, total, page: pageNum, totalPages: Math.ceil(total / limitNum), limit: limitNum });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch students." });
  }
};

// GET /api/students/classes
exports.getClassesForTeacher = async (req, res) => {
  try {
    const { role, userId } = req.user;
    let classes;

    if (role === "teacher") {
      const teacher = await User.findById(userId).select("assignedClasses").lean();
      classes = teacher?.assignedClasses || [];
    } else if (role === "parent") {
      const parent = await User.findById(userId).select("childClass").lean();
      classes = parent?.childClass ? [parent.childClass] : [];
    } else {
      classes = await Student.distinct("class", { isActive: true });
    }

    classes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    res.json({ success: true, classes });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch classes." });
  }
};

// GET /api/students/:id
exports.getStudentById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid student ID." });

    const { role, userId } = req.user;
    if (role === "parent") {
      const parent = await User.findById(userId).select("childId").lean();
      if (!parent?.childId || parent.childId.toString() !== req.params.id) {
        return res.status(403).json({ success: false, message: "You can only view your own child's details." });
      }
    }

    const student = await Student.findById(req.params.id).lean();
    if (!student) return res.status(404).json({ success: false, message: "Student not found." });
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch student." });
  }
};

// POST /api/students
exports.createStudent = async (req, res) => {
  try {
    const { name, rollNo, class: cls, parentPhone, parentName } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: "Student name is required." });
    if (!cls?.trim())  return res.status(400).json({ success: false, message: "Class is required." });
    if (rollNo == null) return res.status(400).json({ success: false, message: "Roll number is required." });

    const exists = await Student.findOne({ class: cls.trim(), rollNo: parseInt(rollNo, 10) }).lean();
    if (exists) return res.status(409).json({ success: false, message: `Roll number ${rollNo} is already taken in class ${cls}.` });

    const fields  = pickFields(req.body);
    const student = await Student.create({ ...fields, rollNo: parseInt(rollNo, 10) });

    // ── Create or Link Parent User Account ────────────────────────────────────
    if (parentPhone) {
      // Validate Nepali phone format to match UserSchema
      if (/^(98|97|96)\d{8}$/.test(parentPhone)) {
        let parent = await User.findOne({ phone: parentPhone, role: "parent" });

        if (parent) {
          // Link existing parent to this new student
          parent.childId = student._id;
          parent.childName = student.name;
          parent.childClass = student.class;
          await parent.save();

          student.parentId = parent._id;
          await student.save();
        } else {
          // Create new Parent account
          const newParent = await User.create({
            name: parentName || `Parent of ${name}`,
            role: "parent",
            phone: parentPhone,
            childId: student._id,
            childName: student.name,
            childClass: student.class,
          });

          student.parentId = newParent._id;
          await student.save();
        }
      }
    }

    res.status(201).json({ success: true, student });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: "A student with this roll number already exists in this class." });
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/students/:id
exports.updateStudent = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid student ID." });

    const { role, userId } = req.user;
    if (role === "teacher") {
      const [student, teacher] = await Promise.all([
        Student.findById(req.params.id).select("class").lean(),
        User.findById(userId).select("assignedClasses").lean(),
      ]);
      if (!student) return res.status(404).json({ success: false, message: "Student not found." });
      if (!teacher?.assignedClasses?.includes(student.class)) {
        return res.status(403).json({ success: false, message: "You can only edit students in your assigned classes." });
      }
    }

    const updates = pickFields(req.body);
    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, message: "No valid fields to update." });

    const student = await Student.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ success: false, message: "Student not found." });

    // ── Handle Parent Account Sync/Linking ────────────────────────────────────
    if (updates.parentPhone && /^(98|97|96)\d{8}$/.test(updates.parentPhone)) {
      // If phone changed, find or create new parent account
      let parent = await User.findOne({ phone: updates.parentPhone, role: "parent" });

      if (parent) {
        parent.childId = student._id;
        parent.childName = student.name;
        parent.childClass = student.class;
        await parent.save();

        student.parentId = parent._id;
        await student.save();
      } else {
        const newParent = await User.create({
          name: updates.parentName || student.parentName || `Parent of ${student.name}`,
          role: "parent",
          phone: updates.parentPhone,
          childId: student._id,
          childName: student.name,
          childClass: student.class,
        });

        student.parentId = newParent._id;
        await student.save();
      }
    } else if (student.parentId && (updates.name || updates.class)) {
      // If phone didn't change but name/class did, sync with existing parent account
      await User.findByIdAndUpdate(student.parentId, {
        childName: student.name,
        childClass: student.class,
      });
    }

    res.json({ success: true, student });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/students/:id
exports.deleteStudent = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid student ID." });

    const student = await Student.findByIdAndUpdate(req.params.id, { $set: { isActive: false } }, { new: true }).lean();
    if (!student) return res.status(404).json({ success: false, message: "Student not found." });
    res.json({ success: true, message: `${student.name} has been removed from the active student list.` });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to remove student." });
  }
};
