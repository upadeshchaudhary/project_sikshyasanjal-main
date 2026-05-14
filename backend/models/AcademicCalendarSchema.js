// backend/models/AcademicCalendar.js
const mongoose = require("mongoose");

const calendarEventSchema = new mongoose.Schema(
  {
    school:       { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    title:        { type: String, required: true, trim: true },
    description:  { type: String, trim: true, default: "" },
    type: {
      type: String,
      enum: ["holiday", "exam", "event", "meeting", "deadline", "other"],
      default: "event",
      index: true,
    },
    // Dates stored both AD (for sorting) and BS (for display)
    startDate:    { type: Date, required: true, index: true },
    endDate:      { type: Date, default: null },    // null = single-day event
    startDateBs:  { type: String, required: true }, // "2081-04-15"
    endDateBs:    { type: String, default: null },
    academicYear: { type: String, required: true }, // BS "2081-82"
    isHoliday:    { type: Boolean, default: false, index: true },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

calendarEventSchema.index({ school: 1, startDate: 1 });
calendarEventSchema.index({ school: 1, academicYear: 1, type: 1 });

module.exports = mongoose.model("AcademicCalendar", calendarEventSchema);