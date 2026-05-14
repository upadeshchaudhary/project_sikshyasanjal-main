// models/ClassRoutine.js
const mongoose = require("mongoose");

// Helper: Validate daily schedule
function validateDayPeriods(periods) {
  if (!Array.isArray(periods)) return false;
  if (periods.length !== 8) return false;

  let breakCount = 0;
  let currentTime = 9 * 60; // 9:00 AM

  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];

    if (!p) return false;

    // Must follow correct order
    if (p.periodNo !== i + 1) return false;

    // Time must exist
    if (!p.startTime || !p.endTime) return false;

    const [sh, sm] = p.startTime.split(":").map(Number);
    const [eh, em] = p.endTime.split(":").map(Number);

    if (
      isNaN(sh) || isNaN(sm) ||
      isNaN(eh) || isNaN(em)
    ) return false;

    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    const expectedStart = currentTime;
    const duration = p.isBreak ? 30 : 45;
    const expectedEnd = currentTime + duration;

    // Validate exact timing
    if (startMinutes !== expectedStart || endMinutes !== expectedEnd) {
      return false;
    }

    currentTime = expectedEnd;

    if (p.isBreak) {
      breakCount++;
      if (p.periodNo !== 5) return false; // Lunch after 4th period
    } else {
      if (!p.subject || !p.teacher || !p.teacherId) return false;
    }
  }

  return breakCount === 1;
}

// Period Schema
const periodSchema = new mongoose.Schema(
  {
    periodNo: { type: Number, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    subject: { type: String, trim: true, default: "" },
    teacher: { type: String, trim: true, default: "" },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    room: { type: String, trim: true, default: "" },
    isBreak: { type: Boolean, default: false },
  },
  { _id: false }
);

// Main Schema
const classRoutineSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    // Class teacher
    classTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // subject -> teacherId
    subjectTeacherMap: {
      type: Map,
      of: mongoose.Schema.Types.ObjectId,
      default: {},
    },

    class: {
      type: String,
      required: true,
      trim: true,
    },

    academicYear: {
      type: String,
      required: true,
    },

    // Weekdays
    monday: {
      type: [periodSchema],
      validate: [validateDayPeriods, "Invalid Monday schedule"],
    },
    tuesday: {
      type: [periodSchema],
      validate: [validateDayPeriods, "Invalid Tuesday schedule"],
    },
    wednesday: {
      type: [periodSchema],
      validate: [validateDayPeriods, "Invalid Wednesday schedule"],
    },
    thursday: {
      type: [periodSchema],
      validate: [validateDayPeriods, "Invalid Thursday schedule"],
    },
    friday: {
      type: [periodSchema],
      validate: [validateDayPeriods, "Invalid Friday schedule"],
    },

    // Weekends
    sunday: {
      type: [periodSchema],
      default: [],
    },
    saturday: {
      type: [periodSchema],
      default: [],
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Unique per class per year
classRoutineSchema.index(
  { school: 1, class: 1, academicYear: 1 },
  { unique: true }
);

// Pre-save validation (ALL rules)
classRoutineSchema.pre("save", async function (next) {
  try {
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];

    let firstSubject = null;

    // 1. Validate weekdays + first period rules
    for (const day of days) {
      const periods = this[day];

      if (!periods || periods.length !== 8) {
        return next(new Error(`${day} must have 8 periods`));
      }

      const firstPeriod = periods[0];

      if (firstPeriod.isBreak) {
        return next(new Error(`First period cannot be break on ${day}`));
      }

      // First subject consistency
      if (!firstSubject) {
        firstSubject = firstPeriod.subject;
      }

      if (firstPeriod.subject !== firstSubject) {
        return next(
          new Error("First period subject must be same for all weekdays")
        );
      }

      // Must be taught by class teacher
      if (
        !firstPeriod.teacherId ||
        firstPeriod.teacherId.toString() !== this.classTeacher.toString()
      ) {
        return next(
          new Error("First period must be taught by class teacher")
        );
      }

      // 2. Validate subject-teacher mapping
      for (const p of periods) {
        if (!p.isBreak) {
          const assignedTeacher = this.subjectTeacherMap?.get(p.subject);

          if (
            assignedTeacher &&
            assignedTeacher.toString() !== p.teacherId.toString()
          ) {
            return next(
              new Error(
                `Teacher mismatch for subject "${p.subject}" on ${day}`
              )
            );
          }
        }
      }
    }

    // 3. Ensure class teacher is unique across classes
    const existing = await mongoose.model("ClassRoutine").findOne({
      school: this.school,
      academicYear: this.academicYear,
      classTeacher: this.classTeacher,
      _id: { $ne: this._id },
    });

    if (existing) {
      return next(
        new Error(
          "This teacher is already assigned as a class teacher to another class"
        )
      );
    }

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("ClassRoutine", classRoutineSchema);