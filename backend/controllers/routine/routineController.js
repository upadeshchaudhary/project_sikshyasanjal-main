// backend/controllers/routine/routineController.js
const mongoose = require("mongoose");
const { ClassRoutine, User } = require("../../models");

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const PERIOD_TIMES = [
  { periodNo: 1, startTime: "09:00", endTime: "09:45", isBreak: false },
  { periodNo: 2, startTime: "09:45", endTime: "10:30", isBreak: false },
  { periodNo: 3, startTime: "10:30", endTime: "11:15", isBreak: false },
  { periodNo: 4, startTime: "11:15", endTime: "12:00", isBreak: false },
  { periodNo: 0, startTime: "12:00", endTime: "12:45", isBreak: true,  subject: "Lunch Break", teacher: "", room: "" },
  { periodNo: 5, startTime: "12:45", endTime: "13:30", isBreak: false },
  { periodNo: 6, startTime: "13:30", endTime: "14:15", isBreak: false },
  { periodNo: 7, startTime: "14:15", endTime: "15:00", isBreak: false },
  { periodNo: 8, startTime: "15:00", endTime: "15:30", isBreak: false },
];

function getSubjectsForClass(className) {
  const classNum = parseInt(className.replace(/[^0-9]/g, ""), 10);
  const section  = className.replace(/[0-9]/g, "").toUpperCase();
  const core = ["English", "Nepali", "Science", "Social Studies", "Maths", "Computer", "Health"];

  if (classNum >= 1 && classNum <= 5)  return [...core, "General Knowledge", "Arts & Craft"];
  if (classNum >= 6 && classNum <= 7)  return [...core, "Moral Education", "Occupation"];
  if (classNum === 8)                  return [...core, "Moral Education", "Occupation", "Optional Maths"];
  if (classNum >= 9 && classNum <= 10) return [...core, "Optional Maths", section === "B" ? "Economics" : "Account"];
  return core;
}

function getSubjectFrequency(className) {
  const classNum = parseInt(className.replace(/[^0-9]/g, ""), 10);
  const subjects = getSubjectsForClass(className);
  const freq     = {};
  subjects.forEach(s => { freq[s] = 0; });

  if (classNum >= 1 && classNum <= 5) {
    freq["General Knowledge"] = 3;
    freq["Arts & Craft"]      = 2;
    ["English", "Nepali", "Science", "Social Studies", "Maths", "Computer", "Health"].forEach(s => { freq[s] = 5; });
    return freq;
  }

  const total      = 40;
  const perSubject = Math.floor(total / subjects.length);
  const remainder  = total % subjects.length;
  subjects.forEach((s, i) => { freq[s] = perSubject + (i < remainder ? 1 : 0); });
  return freq;
}

function validateRoutine(schedule, className, classTeacher) {
  const errors       = [];
  const validSubjects = new Set(getSubjectsForClass(className));

  WEEKDAYS.forEach(day => {
    if (!schedule[day] || !Array.isArray(schedule[day])) { errors.push(`Missing schedule for ${day}.`); return; }

    const realPeriods = schedule[day].filter(p => !p.isBreak);
    if (realPeriods.length !== 8) errors.push(`${day}: must have exactly 8 periods (got ${realPeriods.length}).`);

    const daySubjects = new Set();
    realPeriods.forEach(p => {
      if (daySubjects.has(p.subject)) errors.push(`${day}: subject "${p.subject}" appears more than once.`);
      daySubjects.add(p.subject);
      if (!validSubjects.has(p.subject)) errors.push(`${day}: subject "${p.subject}" is not valid for class ${className}.`);
      if (!p.teacher?.trim()) errors.push(`${day} period ${p.periodNo}: teacher is required.`);
    });

    const lunchIdx = schedule[day].findIndex(p => p.isBreak);
    if (lunchIdx === -1) {
      errors.push(`${day}: lunch break is missing.`);
    } else {
      const beforeLunch = schedule[day].slice(0, lunchIdx).filter(p => !p.isBreak).length;
      if (beforeLunch !== 4) errors.push(`${day}: lunch break must come after period 4 (found after period ${beforeLunch}).`);
    }
  });

  const firstPeriods = WEEKDAYS.filter(day => schedule[day]?.length > 0).map(day => schedule[day].find(p => !p.isBreak));
  const firstSubjects = new Set(firstPeriods.map(p => p?.subject).filter(Boolean));
  if (firstSubjects.size > 1) errors.push(`First period must be the same subject on all days. Found: ${[...firstSubjects].join(", ")}.`);

  firstPeriods.forEach((p, i) => {
    if (p && classTeacher && p.teacher !== classTeacher) {
      errors.push(`${WEEKDAYS[i]}: first period must be taught by the class teacher (${classTeacher}), got "${p.teacher}".`);
    }
  });

  return { valid: errors.length === 0, errors };
}

function generateRoutine(className, classTeacherName, subjectTeacherMap) {
  const allSubjects         = getSubjectsForClass(className);
  const freq                = getSubjectFrequency(className);
  const classNum            = parseInt(className.replace(/[^0-9]/g, ""), 10);
  const classTeacherSubject = Object.keys(subjectTeacherMap).find(subj => subjectTeacherMap[subj] === classTeacherName);
  if (!classTeacherSubject) throw new Error("Class teacher must be assigned to at least one subject.");

  const pool = [];
  allSubjects.forEach(s => { for (let i = 0; i < (freq[s] || 0); i++) pool.push(s); });

  for (let i = 0; i < 5; i++) {
    const index = pool.indexOf(classTeacherSubject);
    if (index !== -1) pool.splice(index, 1);
  }

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const dailySchedules = {};
  const dayUsed        = {};
  WEEKDAYS.forEach(d => { dailySchedules[d] = []; dayUsed[d] = new Set(); });

  if (classNum >= 1 && classNum <= 5) {
    const gkTeacher = subjectTeacherMap["General Knowledge"];
    if (gkTeacher) subjectTeacherMap["Arts & Craft"] = gkTeacher;
  }

  pool.forEach(subject => {
    const available = WEEKDAYS.filter(d => !dayUsed[d].has(subject) && dailySchedules[d].length < 8);
    if (available.length === 0) throw new Error(`Failed to place subject "${subject}" without duplication.`);
    available.sort((a, b) => dailySchedules[a].length - dailySchedules[b].length);
    dailySchedules[available[0]].push(subject);
    dayUsed[available[0]].add(subject);
  });

  const schedule = {};
  WEEKDAYS.forEach(day => {
    let subjects = dailySchedules[day];
    while (subjects.length < 8) { const extra = allSubjects.find(s => !subjects.includes(s)); if (!extra) break; subjects.push(extra); }
    subjects = subjects.slice(0, 8);

    const idx = subjects.indexOf(classTeacherSubject);
    if (idx > 0) subjects.splice(idx, 1);
    subjects.unshift(classTeacherSubject);

    const daySlots        = [];
    let realPeriodCount   = 0;
    PERIOD_TIMES.forEach(pt => {
      if (pt.isBreak) { daySlots.push({ ...pt }); return; }
      const subject     = subjects[realPeriodCount];
      const teacher     = subjectTeacherMap[subject] || "";
      const finalTeacher = realPeriodCount === 0 ? classTeacherName : teacher;
      daySlots.push({ periodNo: pt.periodNo, startTime: pt.startTime, endTime: pt.endTime, isBreak: false, subject: subject || "", teacher: finalTeacher, room: "" });
      realPeriodCount++;
    });
    schedule[day] = daySlots;
  });

  return schedule;
}

async function checkCrossClassConflicts(className, newSchedule, academicYear) {
  const others = await ClassRoutine.find({ academicYear, class: { $ne: className } }).lean();
  const conflicts = [];
  WEEKDAYS.forEach(day => {
    if (!newSchedule[day]) return;
    newSchedule[day].filter(p => !p.isBreak && p.teacher).forEach(newPeriod => {
      others.forEach(other => {
        const conflict = (other[day] || []).find(op => !op.isBreak && op.periodNo === newPeriod.periodNo && op.teacher === newPeriod.teacher);
        if (conflict) conflicts.push(`Teacher "${newPeriod.teacher}" is already teaching class ${other.class} on ${day} period ${newPeriod.periodNo}.`);
      });
    });
  });
  return conflicts;
}

// GET /api/routine
exports.getRoutines = async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role === "parent") {
      const parent  = await User.findById(userId).select("childClass").lean();
      if (!parent?.childClass) return res.json({ success: true, routines: [] });
      const routine = await ClassRoutine.findOne({ class: parent.childClass }).lean();
      return res.json({ success: true, routines: routine ? [routine] : [] });
    }

    const filter = {};
    if (req.query.academicYear?.trim()) filter.academicYear = req.query.academicYear.trim();
    const routines = await ClassRoutine.find(filter).sort({ class: 1 }).lean();
    res.json({ success: true, routines });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch routines." });
  }
};

// POST /api/routine/generate
exports.createRoutine = async (req, res) => {
  try {
    const { class: className, classTeacher, subjectTeacherMap, academicYear } = req.body;

    if (!className?.trim())                             return res.status(400).json({ success: false, message: "Class name is required." });
    if (!classTeacher?.trim())                          return res.status(400).json({ success: false, message: "Class teacher name is required." });
    if (!subjectTeacherMap || typeof subjectTeacherMap !== "object") return res.status(400).json({ success: false, message: "subjectTeacherMap is required." });
    if (!academicYear?.trim())                          return res.status(400).json({ success: false, message: "Academic year (BS) is required." });

    const classNum        = parseInt(className.replace(/[^0-9]/g, ""), 10);
    const requiredSubjects = getSubjectsForClass(className);
    const missingTeachers  = requiredSubjects.filter(s => !subjectTeacherMap[s]);

    if (classNum >= 1 && classNum <= 5) {
      const gkTeacher   = subjectTeacherMap["General Knowledge"];
      const artsTeacher = subjectTeacherMap["Arts & Craft"];
      if (gkTeacher && artsTeacher && gkTeacher !== artsTeacher) {
        return res.status(400).json({ success: false, message: "General Knowledge and Arts & Craft must be taught by the same teacher." });
      }
    }

    if (missingTeachers.length > 0) {
      return res.status(400).json({ success: false, message: `Teacher not assigned for: ${missingTeachers.join(", ")}.`, required: requiredSubjects });
    }

    const teacherNames = Object.values(subjectTeacherMap);
    const teachers     = await User.find({ name: { $in: teacherNames } }).select("name").lean();
    const foundNames   = new Set(teachers.map(t => t.name));
    const missing      = teacherNames.filter(t => !foundNames.has(t));
    if (missing.length > 0) {
      return res.status(400).json({ success: false, message: `These teachers are not registered: ${missing.join(", ")}` });
    }

    const existingWithSameTeacher = await ClassRoutine.findOne({ academicYear: academicYear.trim(), class: { $ne: className.trim() }, classTeacher }).lean();
    if (existingWithSameTeacher) {
      return res.status(409).json({ success: false, message: `"${classTeacher}" is already the class teacher of ${existingWithSameTeacher.class}.` });
    }

    const schedule  = generateRoutine(className.trim(), classTeacher.trim(), subjectTeacherMap);
    const conflicts = await checkCrossClassConflicts(className.trim(), schedule, academicYear.trim());
    if (conflicts.length > 0) return res.status(409).json({ success: false, message: "Teacher conflicts detected.", conflicts });

    const routine = await ClassRoutine.findOneAndUpdate(
      { class: className.trim(), academicYear: academicYear.trim() },
      { $set: { class: className.trim(), classTeacher: classTeacher.trim(), academicYear: academicYear.trim(), subjectTeacherMap, ...schedule, updatedBy: req.user.userId } },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, message: `Routine generated for class ${className}.`, routine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/routine/:class
exports.getRoutineByClass = async (req, res) => {
  try {
    const { role, userId } = req.user;
    const targetClass = req.params.class.trim();

    if (role === "parent") {
      const parent = await User.findById(userId).select("childClass").lean();
      if (parent?.childClass !== targetClass) {
        return res.status(403).json({ success: false, message: "You can only view your child's class routine." });
      }
    }

    const routine = await ClassRoutine.findOne({ class: targetClass }).lean();
    if (!routine) return res.status(404).json({ success: false, message: `No routine found for class ${targetClass}.` });

    const clean = { ...routine };
    delete clean.saturday;
    delete clean.sunday;

    res.json({ success: true, routine: clean });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch routine." });
  }
};

// PUT /api/routine/:class
exports.updateRoutine = async (req, res) => {
  try {
    const { role, userId } = req.user;
    const targetClass = req.params.class.trim();
    const { schedule, classTeacher, academicYear } = req.body;

    if (!schedule || typeof schedule !== "object") return res.status(400).json({ success: false, message: "schedule object is required." });
    if (!classTeacher?.trim()) return res.status(400).json({ success: false, message: "classTeacher is required." });
    if (!academicYear?.trim()) return res.status(400).json({ success: false, message: "academicYear is required." });

    if (role === "teacher") {
      const teacher = await User.findById(userId).select("assignedClasses").lean();
      if (teacher?.assignedClasses?.length > 0 && !teacher.assignedClasses.includes(targetClass)) {
        return res.status(403).json({ success: false, message: "You can only update the routine for your assigned classes." });
      }
    }

    const sanitizedSchedule = {};
    WEEKDAYS.forEach(day => { if (schedule[day]) sanitizedSchedule[day] = schedule[day]; });

    const { valid, errors } = validateRoutine(sanitizedSchedule, targetClass, classTeacher.trim());
    if (!valid) return res.status(400).json({ success: false, message: "Routine validation failed.", errors });

    const conflicts = await checkCrossClassConflicts(targetClass, sanitizedSchedule, academicYear.trim());
    if (conflicts.length > 0) return res.status(409).json({ success: false, message: "Teacher schedule conflicts detected:", conflicts });

    const existingWithSameTeacher = await ClassRoutine.findOne({ academicYear: academicYear.trim(), class: { $ne: targetClass }, classTeacher: classTeacher.trim() }).lean();
    if (existingWithSameTeacher) {
      return res.status(409).json({ success: false, message: `"${classTeacher}" is already the class teacher of ${existingWithSameTeacher.class}.` });
    }

    const routine = await ClassRoutine.findOneAndUpdate(
      { class: targetClass, academicYear: academicYear.trim() },
      { $set: { classTeacher: classTeacher.trim(), academicYear: academicYear.trim(), ...sanitizedSchedule, updatedBy: userId, saturday: undefined, sunday: undefined } },
      { upsert: true, new: true }
    );

    res.json({ success: true, routine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/routine/:class/subjects
exports.getSubjectsForIndividualClass = async (req, res) => {
  try {
    const className = req.params.class.trim();
    res.json({ success: true, class: className, subjects: getSubjectsForClass(className), frequency: getSubjectFrequency(className) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch subject list." });
  }
};

// DELETE /api/routine/:class
exports.deleteRoutine = async (req, res) => {
  try {
    const targetClass = req.params.class.trim();
    const filter      = { class: targetClass };
    if (req.query.academicYear?.trim()) filter.academicYear = req.query.academicYear.trim();

    const result = await ClassRoutine.findOneAndDelete(filter);
    if (!result) return res.status(404).json({ success: false, message: `No routine found for class ${targetClass}.` });
    res.json({ success: true, message: `Routine for class ${targetClass} deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete routine." });
  }
};
