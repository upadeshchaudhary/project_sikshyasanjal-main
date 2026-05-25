// backend/models/AttendanceSchema.js
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    student:  { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    class:    { type: String, required: true, index: true },
    date:     { type: Date, required: true, index: true },
    dateBs:   { type: String, required: true },
    status:   { type: String, enum: ["present", "absent", "late", "excused"], required: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note:     { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ class: 1, date: 1 });
attendanceSchema.index({ student: 1, date: -1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
