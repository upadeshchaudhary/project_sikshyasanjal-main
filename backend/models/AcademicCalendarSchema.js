// backend/models/AcademicCalendarSchema.js
const mongoose = require("mongoose");

const calendarEventSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    type: {
      type:    String,
      enum:    ["holiday", "exam", "event", "meeting", "deadline", "other"],
      default: "event",
      index:   true,
    },
    startDate:    { type: Date, required: true, index: true },
    endDate:      { type: Date, default: null },
    startDateBs:  { type: String, required: true },
    endDateBs:    { type: String, default: null },
    academicYear: { type: String, required: true },
    isHoliday:    { type: Boolean, default: false, index: true },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

calendarEventSchema.index({ academicYear: 1, type: 1 });

module.exports = mongoose.model("AcademicCalendar", calendarEventSchema);
