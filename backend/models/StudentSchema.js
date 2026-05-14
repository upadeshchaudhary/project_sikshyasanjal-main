// backend/models/Student.js
const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    // ── Multi-tenant ──────────────────────────────────────────────────────────
    school: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "School",
      required: true,
      index:    true,
    },

    // ── Identity ──────────────────────────────────────────────────────────────
    name: {
      type:     String,
      required: [true, "Student name is required"],
      trim:     true,
    },

    rollNo: {
      type:     Number,
      required: true,
    },

    class: {
      type:     String,
      required: [true, "Class is required"],
      trim:     true,
      index:    true,
    },

    section: {
      type:    String,
      trim:    true,
      default: "",
    },

    // ── Personal ──────────────────────────────────────────────────────────────
    dob: {
      // Stored as AD Date — displayed as BS in UI
      type: Date,
    },

    dobBs: {
      // BS date string e.g. "2065-04-15" — stored for display
      type: String,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    address: {
      type:    String,
      trim:    true,
      default: "",
    },

    photo: {
      type:    String,
      default: null,
    },

    // ── Parent link ───────────────────────────────────────────────────────────
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },

    parentPhone: {
      // Denormalized — shown in student table without populate
      type:  String,
      trim:  true,
    },

    parentName: {
      type:  String,
      trim:  true,
    },

    // ── Academic ──────────────────────────────────────────────────────────────
    admissionYear: {
      type: String, // BS year string e.g. "2079"
    },

    isActive: {
      type:    Boolean,
      default: true,
      index:   true,
    },
  },
  {
    timestamps: true,
  }
);

// ── Compound indexes ──────────────────────────────────────────────────────────
studentSchema.index({ school: 1, class: 1 });              // filter by class
studentSchema.index({ school: 1, rollNo: 1, class: 1 }, { unique: true }); // unique roll per class per school
studentSchema.index({ school: 1, name: "text" });           // text search

module.exports = mongoose.model("Student", studentSchema);