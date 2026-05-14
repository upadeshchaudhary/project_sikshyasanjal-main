// backend/models/Attendance.js
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    school:    { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    student:   { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    class:     { type: String, required: true, index: true },
    date:      { type: Date, required: true, index: true }, // AD date, midnight UTC
    dateBs:    { type: String, required: true },            // BS string "2081-04-15"
    status:    {
      type: String,
      enum: ["present", "absent", "late", "excused"],
      required: true,
    },
    markedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note:      { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

// Unique: one attendance record per student per day per school
attendanceSchema.index(
  { school: 1, student: 1, date: 1 },
  { unique: true }
);
attendanceSchema.index({ school: 1, class: 1, date: 1 });
attendanceSchema.index({ school: 1, student: 1, date: -1 }); // parent history

module.exports = mongoose.model("Attendance", attendanceSchema);