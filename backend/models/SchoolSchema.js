// backend/models/SchoolSchema.js
// Single-tenant: only one school document exists in the database.
const mongoose = require("mongoose");
const { getCurrentAcademicYear } = require("../utils/calendar");

const schoolSchema = new mongoose.Schema(
  {
    name:         { type: String, required: [true, "School name is required"], trim: true, maxlength: 120 },
    address:      { type: String, trim: true, default: "" },
    phone:        { type: String, trim: true, match: [/^(\+977)?[0-9]{7,10}$/, "Enter a valid Nepali phone number"] },
    email:        { type: String, lowercase: true, trim: true },
    academicYear: { type: String, default: getCurrentAcademicYear },
    classes:      { type: [String], default: [] },
    subjects:     { type: [String], default: [] },
    logoUrl:      { type: String, default: null },
    estYear:      { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model("School", schoolSchema);
