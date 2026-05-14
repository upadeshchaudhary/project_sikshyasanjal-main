// backend/models/School.js
const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    name: {
      type:     String,
      required: [true, "School name is required"],
      trim:     true,
      maxlength: [120, "School name cannot exceed 120 characters"],
      // NOTE: school name is LOCKED from editing per PRD — enforced in controller
    },

    domain: {
      type:      String,
      required:  [true, "School domain is required"],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^[a-z0-9-]{2,50}$/, "Domain must be 2-50 lowercase letters, numbers, or hyphens"],
      index:     true, // queried on every request via school middleware
    },

    // ── Contact info ──────────────────────────────────────────────────────────
    address: {
      type:    String,
      trim:    true,
      default: "",
    },

    phone: {
      type:  String,
      trim:  true,
      match: [/^(\+977)?[0-9]{7,10}$/, "Enter a valid Nepali phone number"],
    },

    email: {
      type:      String,
      lowercase: true,
      trim:      true,
    },

    // ── Academic config ───────────────────────────────────────────────────────
    academicYear: {
      type:    String,
      default: "2081-82", // BS academic year
    },

    classes: {
      // List of class names active in this school e.g. ["6A","6B","7A","10A","10B"]
      type:    [String],
      default: [],
    },

    subjects: {
      // List of subject names e.g. ["Maths","Nepali","English","Science"]
      type:    [String],
      default: [],
    },

    // ── Status ────────────────────────────────────────────────────────────────
    isActive: {
      type:    Boolean,
      default: true,
    },

    // ── Branding ──────────────────────────────────────────────────────────────
    logoUrl: {
      type:    String,
      default: null,
    },

    estYear: {
      type: Number, // BS year e.g. 2041
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
schoolSchema.index({ domain: 1 }, { unique: true });

// ── Static: find by slug (used everywhere) ────────────────────────────────────
schoolSchema.statics.findBySlug = function (slug) {
  return this.findOne({ domain: slug.toLowerCase().trim() });
};

module.exports = mongoose.model("School", schoolSchema);