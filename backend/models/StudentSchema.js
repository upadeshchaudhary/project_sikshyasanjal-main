// backend/models/StudentSchema.js
const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name:    { type: String, required: [true, "Student name is required"], trim: true },
    rollNo:  { type: Number, required: true },
    class:   { type: String, required: [true, "Class is required"], trim: true, index: true },
    section: { type: String, trim: true, default: "" },

    dob:    { type: Date },
    dobBs:  { type: String },
    gender: { type: String, enum: ["male", "female", "other"] },
    address:{ type: String, trim: true, default: "" },
    photo:  { type: String, default: null },

    parentId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    parentPhone: { type: String, trim: true },
    parentName:  { type: String, trim: true },

    admissionYear: { type: String },
    isActive:      { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

studentSchema.index({ rollNo: 1, class: 1 }, { unique: true });
studentSchema.index({ name: "text" });

module.exports = mongoose.model("Student", studentSchema);
