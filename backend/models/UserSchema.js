// backend/models/User.js
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    name: {
      type:     String,
      required: [true, "Name is required"],
      trim:     true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    // ── Role ──────────────────────────────────────────────────────────────────
    role: {
      type:     String,
      required: true,
      enum:     {
        values:  ["admin", "teacher", "parent"],
        message: "Role must be admin, teacher, or parent",
      },
      index: true,
    },

    // ── Multi-tenant school reference ─────────────────────────────────────────
    school: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "School",
      required: true,
      index:    true,
    },

    // ── Contact (role-dependent) ───────────────────────────────────────────────
    email: {
      // Used by admin + teacher for login
      type:      String,
      lowercase: true,
      trim:      true,
      sparse:    true, // allows multiple null values (parents have no email)
      match:     [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"],
    },

    phone: {
      // Used by parent for OTP login
      type:   String,
      trim:   true,
      sparse: true,
      match:  [/^(98|97|96)\d{8}$/, "Enter a valid Nepali mobile number"],
    },

    // ── Authentication ─────────────────────────────────────────────────────────
    passwordHash: {
      type:   String,
      select: false, // never returned in queries unless explicitly selected
    },

    googleId: {
      type:   String,
      sparse: true,
      select: false,
    },

    // ── OTP (parent login) ────────────────────────────────────────────────────
    // FIXED: store hash not plaintext
    otpHash: {
      type:   String,
      select: false,
    },

    otpExpiry: {
      type: Date,
    },

    // ── Teacher-specific fields ───────────────────────────────────────────────
    subject: {
      // Primary subject e.g. "Mathematics"
      type:    String,
      trim:    true,
      default: null,
    },

    assignedClasses: {
      // Classes the teacher is responsible for e.g. ["10A", "10B"]
      type:    [String],
      default: [],
    },

    qualification: {
      type:    String,
      trim:    true,
      default: null,
    },

    // ── Parent-specific fields ────────────────────────────────────────────────
    childId: {
      // Reference to the Student document
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Student",
      default: null,
    },

    childName: {
      // Denormalized for performance — avoids populate on every auth call
      type:    String,
      default: null,
    },

    childClass: {
      // Denormalized for quick parent-scoped filtering
      type:    String,
      default: null,
    },

    // ── Profile ───────────────────────────────────────────────────────────────
    avatar: {
      type:    String,
      default: null,
    },

    // ── Account status ────────────────────────────────────────────────────────
    isDisabled: {
      type:    Boolean,
      default: false,
      index:   true,
    },

    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ── Compound indexes for multi-tenant queries ─────────────────────────────────
// These are the most common query patterns in the app:
userSchema.index({ school: 1, role: 1 });            // list users by school+role
userSchema.index({ school: 1, email: 1 });           // login lookup
userSchema.index({ school: 1, phone: 1 });           // parent OTP lookup
userSchema.index({ school: 1, role: 1, isDisabled: 1 }); // active user lists

// ── Pre-save: hash password if modified ───────────────────────────────────────
userSchema.pre("save", async function (next) {
  // Only hash if passwordHash field was explicitly set to a plaintext value
  // Convention: set user.plainPassword = "raw" before save, then this hashes it
  if (this.isModified("passwordHash") && this.passwordHash &&
      !this.passwordHash.startsWith("$2")) {
    // Starts with "$2" means already bcrypt-hashed — skip
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  next();
});

// ── Instance method: verify password ─────────────────────────────────────────
userSchema.methods.verifyPassword = async function (plainPassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// ── Instance method: generate OTP ────────────────────────────────────────────
userSchema.methods.generateOtp = async function () {
  const otpPlain  = Math.floor(100000 + Math.random() * 900000).toString();
  this.otpHash    = await bcrypt.hash(otpPlain, 10);
  this.otpExpiry  = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  await this.save();
  return otpPlain; // return raw OTP to send via SMS — never store it
};

// ── Instance method: verify OTP ──────────────────────────────────────────────
userSchema.methods.verifyOtp = async function (otpPlain) {
  if (!this.otpHash || !this.otpExpiry) return false;
  if (new Date() > this.otpExpiry) return false;
  const valid = await bcrypt.compare(otpPlain, this.otpHash);
  if (valid) {
    // Consume OTP — one-time use
    this.otpHash   = undefined;
    this.otpExpiry = undefined;
  }
  return valid;
};

// ── Static: find active users by school and role ─────────────────────────────
userSchema.statics.findBySchoolAndRole = function (schoolId, role, opts = {}) {
  return this.find({ school: schoolId, role, isDisabled: false, ...opts });
};

// ── toJSON: strip sensitive fields from serialization ────────────────────────
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.otpHash;
    delete ret.otpExpiry;
    delete ret.googleId;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);