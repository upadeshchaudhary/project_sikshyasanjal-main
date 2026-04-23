// This file implements:
//   - Full constraint validation engine
//   - Auto-generation of weekly timetables
//   - Teacher conflict detection across classes
//   - Subject rules by class level
//   - First-period enforcement (class teacher, same subject all 5 days)
//   - Lunch break after period 4
//   - Monday–Friday only, 8 periods/day, 9:00 AM – 3:30 PM

const express   = require("express");
const router    = express.Router();
const mongoose  = require("mongoose");
const { ClassRoutine, User } = require("../models");
const {
  protect,
  requireTeacherOrAdmin,
  requireAdmin,
} = require("../middleware/auth");

router.use(protect);

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

// FIX: Only weekdays — Saturday and Sunday excluded at the schema level
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

// Period time slots: 9:00 AM – 3:30 PM, 8 periods + 1 lunch
// Periods 1–4, then lunch, then periods 5–8
const PERIOD_TIMES = [
  { periodNo: 1, startTime: "09:00", endTime: "09:45", isBreak: false },
  { periodNo: 2, startTime: "09:45", endTime: "10:30", isBreak: false },
  { periodNo: 3, startTime: "10:30", endTime: "11:15", isBreak: false },
  { periodNo: 4, startTime: "11:15", endTime: "12:00", isBreak: false },
  // FIX: Lunch break inserted after period 4 (periodNo: 0 = break marker)
  { periodNo: 0, startTime: "12:00", endTime: "12:45", isBreak: true,  subject: "Lunch Break", teacher: "", room: "" },
  { periodNo: 5, startTime: "12:45", endTime: "13:30", isBreak: false },
  { periodNo: 6, startTime: "13:30", endTime: "14:15", isBreak: false },
  { periodNo: 7, startTime: "14:15", endTime: "15:00", isBreak: false },
  { periodNo: 8, startTime: "15:00", endTime: "15:30", isBreak: false },
];

// FIX: Subject rules by class level
function getSubjectsForClass(className) {
  const classNum = parseInt(className.replace(/[^0-9]/g, ""), 10);
  const section  = className.replace(/[0-9]/g, "").toUpperCase();

  // Core subjects — all classes
  const core = [
    "English", "Nepali", "Science",
    "Social Studies", "Maths", "Computer", "Health",
  ];

  // FIX: Class 1–5 extra subjects
  if (classNum >= 1 && classNum <= 5) {
    return [...core, "General Knowledge", "Arts & Craft"];
  }

  // FIX: Class 6–8 extra subjects
  if (classNum >= 6 && classNum <= 8) {
    const extras = ["Moral Education", "Occupation"];
    // Class 8 also gets Optional Mathematics
    if (classNum === 8) extras.push("Optional Maths");
    return [...core, ...extras];
  }

  // FIX: Class 9–10 — section determines Account vs Economics
  if (classNum >= 9 && classNum <= 10) {
    // FIX: Section-based subject (10A → Account, 10B → Economics)
    const optionalSubject = section === "B" ? "Economics" : "Account";
    const extras = ["Optional Maths", optionalSubject];
    return [...core, ...extras];
  }

  return core;
}

// FIX: Subject frequency per week (how many times each subject appears)
function getSubjectFrequency(className) {
  const classNum = parseInt(className.replace(/[^0-9]/g, ""), 10);
  const subjects = getSubjectsForClass(className);

  // Total slots: 5 days × 8 periods = 40 periods to fill
  const freq = {};

  subjects.forEach(s => { freq[s] = 0; });

  // FIX: Class 1–5 specific frequencies for GK and Arts & Craft
  if (classNum >= 1 && classNum <= 5) {
    freq["General Knowledge"] = 3; // 3 days/week
    freq["Arts & Craft"]      = 2; // 2 days/week
    // Distribute remaining 35 slots among core 7 subjects
    // Each core subject gets 5 periods/week
    ["English","Nepali","Science","Social Studies","Maths","Computer","Health"]
      .forEach(s => { freq[s] = 5; });
    return freq;
  }

  // Default: distribute evenly across subjects
  const totalSlots = 40;
  const perSubject = Math.floor(totalSlots / subjects.length);
  const remainder  = totalSlots % subjects.length;

  subjects.forEach((s, i) => {
    freq[s] = perSubject + (i < remainder ? 1 : 0);
  });

  return freq;
}

// ════════════════════════════════════════════════════════════════════════════════
// VALIDATION ENGINE
// Validates a manually submitted routine against all constraints
// Returns { valid: bool, errors: [] }
// ════════════════════════════════════════════════════════════════════════════════
function validateRoutine(schedule, className, classTeacher) {
  const errors = [];
  const classNum = parseInt(className.replace(/[^0-9]/g, ""), 10);
  const validSubjects = new Set(getSubjectsForClass(className));

  // Track teacher usage per period across all days for conflict detection
  // teacherSlots[day][periodNo] = teacherName
  const teacherSlots = {};

  WEEKDAYS.forEach(day => {
    if (!schedule[day] || !Array.isArray(schedule[day])) {
      errors.push(`Missing schedule for ${day}.`);
      return;
    }

    const daySlots = schedule[day];

    // FIX: Exactly 8 real periods (excluding lunch) per day
    const realPeriods = daySlots.filter(p => !p.isBreak);
    if (realPeriods.length !== 8) {
      errors.push(`${day}: must have exactly 8 periods (got ${realPeriods.length}).`);
    }

    // FIX: No subject repetition in the same day
    const daySubjects = new Set();
    realPeriods.forEach(p => {
      if (daySubjects.has(p.subject)) {
        errors.push(`${day}: subject "${p.subject}" appears more than once.`);
      }
      daySubjects.add(p.subject);

      // Validate subject belongs to this class
      if (!validSubjects.has(p.subject)) {
        errors.push(`${day}: subject "${p.subject}" is not valid for class ${className}.`);
      }

      // Validate teacher is assigned
      if (!p.teacher?.trim()) {
        errors.push(`${day} period ${p.periodNo}: teacher is required.`);
      }
    });

    // FIX: Check lunch break exists after period 4
    const lunchIdx = daySlots.findIndex(p => p.isBreak);
    if (lunchIdx === -1) {
      errors.push(`${day}: lunch break is missing.`);
    } else {
      const periodsBeforeLunch = daySlots.slice(0, lunchIdx).filter(p => !p.isBreak).length;
      if (periodsBeforeLunch !== 4) {
        errors.push(`${day}: lunch break must come after period 4 (found after period ${periodsBeforeLunch}).`);
      }
    }
  });

  // FIX: First period must be the same subject on all 5 days
  const firstPeriods = WEEKDAYS
    .filter(day => schedule[day]?.length > 0)
    .map(day => schedule[day].find(p => !p.isBreak));

  const firstSubjects = new Set(firstPeriods.map(p => p?.subject).filter(Boolean));
  if (firstSubjects.size > 1) {
    errors.push(
      `First period must be the same subject on all days. ` +
      `Found: ${[...firstSubjects].join(", ")}.`
    );
  }

  // FIX: First period must be taught by the class teacher
  firstPeriods.forEach((p, i) => {
    if (p && classTeacher && p.teacher !== classTeacher) {
      errors.push(
        `${WEEKDAYS[i]}: first period must be taught by the class teacher (${classTeacher}), ` +
        `got "${p.teacher}".`
      );
    }
  });

  // FIX: Teacher conflict detection — same teacher, same period, already used elsewhere
  // This is checked within the single routine; cross-class conflicts checked in route handler
  WEEKDAYS.forEach(day => {
    if (!schedule[day]) return;
    const periodTeachers = {};
    schedule[day].filter(p => !p.isBreak).forEach(p => {
      if (periodTeachers[p.periodNo]) {
        // Same teacher in same period twice on same day (internal conflict)
        if (p.teacher && p.teacher === periodTeachers[p.periodNo]) {
          errors.push(`${day} period ${p.periodNo}: teacher "${p.teacher}" assigned twice.`);
        }
      }
      periodTeachers[p.periodNo] = p.teacher;
    });
  });

  return { valid: errors.length === 0, errors };
}

// ════════════════════════════════════════════════════════════════════════════════
// AUTO-GENERATOR
// Generates a valid weekly routine given subjects, teachers, and class teacher
// Returns the full schedule object or throws if constraints can't be satisfied
// ════════════════════════════════════════════════════════════════════════════════
function generateRoutine(className, classTeacherName, subjectTeacherMap) {
  const classNum    = parseInt(className.replace(/[^0-9]/g, ""), 10);
  const allSubjects = getSubjectsForClass(className);
  const freq        = getSubjectFrequency(className);
  const schedule    = {};

    // FIX: Determine ONE fixed first-period subject for entire week
  const classTeacherSubject = Object.keys(subjectTeacherMap)
    .find(subj => subjectTeacherMap[subj] === classTeacherName);

  if (!classTeacherSubject) {
    throw new Error("Class teacher must be assigned to at least one subject.");
  }

  // Build a pool of subject slots to fill: e.g. ["English","English","Maths"...]
  const pool = [];
  allSubjects.forEach(s => {
    for (let i = 0; i < (freq[s] || 0); i++) pool.push(s);
  });

  // FIX: Reserve 5 slots for first-period subject
for (let i = 0; i < 5; i++) {
  const index = pool.indexOf(classTeacherSubject);
  if (index !== -1) {
    pool.splice(index, 1);
  }
}

  // Shuffle pool for randomness
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // FIX: Distribute across 5 days × 8 periods = 40 slots
  // Each day gets exactly 8 subjects (no repeats within a day)
  const dailySchedules = {};
  WEEKDAYS.forEach(day => { dailySchedules[day] = []; });

  // Greedy fill: for each subject in pool, assign to a day where it hasn't appeared
  const dayUsed = {};
  WEEKDAYS.forEach(d => { dayUsed[d] = new Set(); });

  pool.forEach(subject => {
    // Find a day that doesn't already have this subject and has < 8 periods
    const available = WEEKDAYS.filter(
      d => !dayUsed[d].has(subject) && dailySchedules[d].length < 8
    );
    if (available.length === 0) {
    throw new Error(`Failed to place subject "${subject}" without duplication.`);
  }

    // Pick day with fewest periods (balance load)
    available.sort((a, b) => dailySchedules[a].length - dailySchedules[b].length);
    const chosen = available[0];
    dailySchedules[chosen].push(subject);
    dayUsed[chosen].add(subject);
  });

  // FIX: Class 1–5 — GK and Arts & Craft must be taught by the same teacher
  const gkTeacher = subjectTeacherMap["General Knowledge"];
  if (classNum >= 1 && classNum <= 5 && gkTeacher) {
    subjectTeacherMap["Arts & Craft"] = gkTeacher;
  }

  // FIX: Build the actual period slots for each day
  WEEKDAYS.forEach(day => {
    let subjects = dailySchedules[day];

    // Pad if fewer than 8 (edge case)
    while (subjects.length < 8) {
      const extra = allSubjects.find(s => !subjects.includes(s));
      if (!extra) break;
      subjects.push(extra);
    }

   // Trim if more than 8 (shouldn't happen, but just in case)
    subjects = subjects.slice(0, 8);

      // FIX: Force same subject in first period for all days
    const idx = subjects.indexOf(classTeacherSubject);

    if (idx > 0) {
      subjects.splice(idx, 1);
    }
    subjects.unshift(classTeacherSubject);

    // Build the full day slot array including lunch break
    const daySlots = [];
    let realPeriodCount = 0;

    PERIOD_TIMES.forEach(pt => {
      if (pt.isBreak) {
        // FIX: Lunch break after period 4
        daySlots.push({ ...pt });
        return;
      }
      const subject = subjects[realPeriodCount];
      const teacher = subjectTeacherMap[subject] || "";
      // FIX: First period always taught by class teacher
      const finalTeacher = realPeriodCount === 0 ? classTeacherName : teacher;

      daySlots.push({
        periodNo:  pt.periodNo,
        startTime: pt.startTime,
        endTime:   pt.endTime,
        isBreak:   false,
        subject:   subject || "",
        teacher:   finalTeacher,
        room:      "",
      });
      realPeriodCount++;
    });

    schedule[day] = daySlots;
  });

  // FIX: Saturday and Sunday explicitly excluded — not added to schedule
  // (only WEEKDAYS array is iterated above — Sunday/Saturday never written)

  return schedule;
}

// ════════════════════════════════════════════════════════════════════════════════
// CROSS-CLASS TEACHER CONFLICT CHECKER
// Checks if any teacher in the new routine is already assigned to another
// class at the same period+day combination
// ════════════════════════════════════════════════════════════════════════════════
async function checkCrossClassConflicts(schoolId, className, newSchedule, academicYear) {
  // Load all other routines for this school + year
  const others = await ClassRoutine.find({
    school:       schoolId,
    academicYear,
    class:        { $ne: className }, // exclude the class being saved
  }).lean();

  const conflicts = [];

  WEEKDAYS.forEach(day => {
    if (!newSchedule[day]) return;

    newSchedule[day].filter(p => !p.isBreak && p.teacher).forEach(newPeriod => {
      others.forEach(other => {
        const otherDay = other[day] || [];
        const conflict = otherDay.find(
          op =>
            !op.isBreak &&
            op.periodNo === newPeriod.periodNo &&
            op.teacher  === newPeriod.teacher
        );
        if (conflict) {
          conflicts.push(
            `Teacher "${newPeriod.teacher}" is already teaching class ${other.class} ` +
            `on ${day} period ${newPeriod.periodNo}.`
          );
        }
      });
    });
  });

  return conflicts;
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/routine — List all routines for this school (teacher/admin)
// Parent gets read-only view of their child's class routine
// ════════════════════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role === "parent") {
      // Parent: get their child's class routine only
      const parent = await User.findById(userId)
        .select("childClass")
        .lean();

      if (!parent?.childClass) {
        return res.json({ success: true, routines: [] });
      }

      const routine = await ClassRoutine.findOne({
        school: req.school._id,
        class:  parent.childClass,
      }).lean();

      return res.json({ success: true, routine: routine || null });
    }

    const { academicYear } = req.query;
    const filter = { school: req.school._id };
    if (academicYear?.trim()) filter.academicYear = academicYear.trim();

    const routines = await ClassRoutine.find(filter)
      .sort({ class: 1 })
      .lean();

    res.json({ success: true, routines });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch routines." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/routine/:class — Get specific class routine
// ════════════════════════════════════════════════════════════════════════════════
router.get("/:class", async (req, res) => {
  try {
    const { role, userId } = req.user;
    const targetClass = req.params.class.trim();

    // Parent: can only view their child's class
    if (role === "parent") {
      const parent = await User.findById(userId).select("childClass").lean();
      if (parent?.childClass !== targetClass) {
        return res.status(403).json({
          success: false,
          message: "You can only view your child's class routine.",
        });
      }
    }

    const routine = await ClassRoutine.findOne({
      school: req.school._id,
      class:  targetClass,
    }).lean();

    if (!routine) {
      return res.status(404).json({
        success: false,
        message: `No routine found for class ${targetClass}.`,
      });
    }

    // FIX: Strip Saturday/Sunday from response even if old data had them
    const clean = { ...routine };
    delete clean.saturday;
    delete clean.sunday;

    res.json({ success: true, routine: clean });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch routine." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/routine/generate — Auto-generate a routine for a class
// Admin only
// Body: { class, classTeacher, subjectTeacherMap, academicYear }
// subjectTeacherMap: { "English": "Sunita Koirala", "Maths": "Ram Bahadur", ... }
// ════════════════════════════════════════════════════════════════════════════════
router.post("/generate", requireAdmin, async (req, res) => {
  try {
    const {
      class:        className,
      classTeacher,
      subjectTeacherMap,
      academicYear,
    } = req.body;

    // Validate inputs
    if (!className?.trim()) {
      return res.status(400).json({ success: false, message: "Class name is required." });
    }
    if (!classTeacher?.trim()) {
      return res.status(400).json({ success: false, message: "Class teacher name is required." });
    }
    if (!subjectTeacherMap || typeof subjectTeacherMap !== "object") {
      return res.status(400).json({
        success: false,
        message: "subjectTeacherMap is required (object mapping subject → teacher name).",
      });
    }
    if (!academicYear?.trim()) {
      return res.status(400).json({ success: false, message: "Academic year (BS) is required." });
    }

    const requiredSubjects = getSubjectsForClass(className);
    const missingTeachers  = requiredSubjects.filter(s => !subjectTeacherMap[s]);
        // FIX: GK and Arts must have same teacher (Class 1–5)
    const classNum = parseInt(className.replace(/[^0-9]/g, ""), 10);

    if (classNum >= 1 && classNum <= 5) {
      const gkTeacher = subjectTeacherMap["General Knowledge"];
      const artsTeacher = subjectTeacherMap["Arts & Craft"];

      if (gkTeacher && artsTeacher && gkTeacher !== artsTeacher) {
        return res.status(400).json({
          success: false,
          message: "General Knowledge and Arts & Craft must be taught by the same teacher.",
        });
      }
    }

    if (missingTeachers.length > 0) {
      return res.status(400).json({
        success: false,
        message:  `Teacher not assigned for: ${missingTeachers.join(", ")}.`,
        required: requiredSubjects,
      });
    }

    // FIX: Validate teachers exist in DB
    const teacherNames = Object.values(subjectTeacherMap);

    const teachers = await User.find({
      name: { $in: teacherNames },
    }).select("name").lean();

    const foundNames = new Set(teachers.map(t => t.name));
    const missing = teacherNames.filter(t => !foundNames.has(t));

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `These teachers are not registered: ${missing.join(", ")}`,
      });
    }

    // FIX: Check class teacher is assigned to exactly one class
    const existingWithSameTeacher = await ClassRoutine.findOne({
      school:       req.school._id,
      academicYear: academicYear.trim(),
      class:        { $ne: className.trim() },
      classTeacher,
    }).lean();

    if (existingWithSameTeacher) {
      return res.status(409).json({
        success: false,
        message:
          `"${classTeacher}" is already the class teacher of ${existingWithSameTeacher.class}. ` +
          `Each class must have a different class teacher.`,
      });
    }

    // Generate the schedule
    const schedule = generateRoutine(
      className.trim(),
      classTeacher.trim(),
      subjectTeacherMap
    );

    // FIX: Cross-class teacher conflict detection
    const conflicts = await checkCrossClassConflicts(
      req.school._id,
      className.trim(),
      schedule,
      academicYear.trim()
    );

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Teacher conflicts detected. Reassign the following before saving:",
        conflicts,
      });
    }

    // Save or update routine
    const routine = await ClassRoutine.findOneAndUpdate(
      {
        school:       req.school._id,
        class:        className.trim(),
        academicYear: academicYear.trim(),
      },
      {
        $set: {
          school:           req.school._id,
          class:            className.trim(),
          classTeacher:     classTeacher.trim(),
          academicYear:     academicYear.trim(),
          subjectTeacherMap,
          ...schedule, // monday, tuesday, wednesday, thursday, friday
          updatedBy:        req.user.userId,
          // FIX: Saturday and Sunday never written
        },
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success:  true,
      message:  `Routine generated for class ${className}.`,
      routine,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// PUT /api/routine/:class — Manually save/update a routine
// Admin or Teacher — with full validation
// Body: { schedule: { monday: [...], tuesday: [...], ... }, classTeacher, academicYear }
// ════════════════════════════════════════════════════════════════════════════════
router.put("/:class", requireTeacherOrAdmin, async (req, res) => {
  try {
    const { role, userId } = req.user;
    const targetClass = req.params.class.trim();
    const { schedule, classTeacher, academicYear } = req.body;

    if (!schedule || typeof schedule !== "object") {
      return res.status(400).json({
        success: false,
        message: "schedule object is required.",
      });
    }
    if (!classTeacher?.trim()) {
      return res.status(400).json({ success: false, message: "classTeacher is required." });
    }
    if (!academicYear?.trim()) {
      return res.status(400).json({ success: false, message: "academicYear is required." });
    }

    // Teacher: can only update their assigned class
    if (role === "teacher") {
      const teacher = await User.findById(userId).select("assignedClasses").lean();
      if (
        teacher?.assignedClasses?.length > 0 &&
        !teacher.assignedClasses.includes(targetClass)
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only update the routine for your assigned classes.",
        });
      }
    }

    // FIX: Strip any weekend days the client may have submitted
    const sanitizedSchedule = {};
    WEEKDAYS.forEach(day => {
      if (schedule[day]) sanitizedSchedule[day] = schedule[day];
    });

    // FIX: Validate all constraints
    const { valid, errors } = validateRoutine(
      sanitizedSchedule,
      targetClass,
      classTeacher.trim()
    );

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Routine validation failed. Fix the errors below before saving.",
        errors,
      });
    }

    // FIX: Cross-class teacher conflict detection
    const conflicts = await checkCrossClassConflicts(
      req.school._id,
      targetClass,
      sanitizedSchedule,
      academicYear.trim()
    );

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Teacher schedule conflicts detected:",
        conflicts,
      });
    }

    // FIX: Check class teacher uniqueness across classes
    const existingWithSameTeacher = await ClassRoutine.findOne({
      school:       req.school._id,
      academicYear: academicYear.trim(),
      class:        { $ne: targetClass },
      classTeacher: classTeacher.trim(),
    }).lean();

    if (existingWithSameTeacher) {
      return res.status(409).json({
        success: false,
        message:
          `"${classTeacher}" is already the class teacher of ${existingWithSameTeacher.class}. ` +
          `Each class must have a different class teacher.`,
      });
    }

    const routine = await ClassRoutine.findOneAndUpdate(
      {
        school:       req.school._id,
        class:        targetClass,
        academicYear: academicYear.trim(),
      },
      {
        $set: {
          classTeacher: classTeacher.trim(),
          academicYear: academicYear.trim(),
          ...sanitizedSchedule,
          updatedBy:    userId,
          // FIX: Explicitly unset Saturday and Sunday if they existed from old data
          saturday:     undefined,
          sunday:       undefined,
        },
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, routine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/routine/:class/subjects — What subjects this class should have
// Used by frontend to show valid options in the routine editor
// ════════════════════════════════════════════════════════════════════════════════
router.get("/:class/subjects", async (req, res) => {
  try {
    const className = req.params.class.trim();
    const subjects  = getSubjectsForClass(className);
    const freq      = getSubjectFrequency(className);

    res.json({
      success:  true,
      class:    className,
      subjects,
      frequency: freq,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch subject list." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// DELETE /api/routine/:class — Delete a class routine
// Admin only
// ════════════════════════════════════════════════════════════════════════════════
router.delete("/:class", requireAdmin, async (req, res) => {
  try {
    const targetClass = req.params.class.trim();
    const { academicYear } = req.query;

    const filter = { school: req.school._id, class: targetClass };
    if (academicYear?.trim()) filter.academicYear = academicYear.trim();

    const result = await ClassRoutine.findOneAndDelete(filter);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `No routine found for class ${targetClass}.`,
      });
    }

    res.json({
      success: true,
      message: `Routine for class ${targetClass} deleted.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete routine." });
  }
});

module.exports = router;