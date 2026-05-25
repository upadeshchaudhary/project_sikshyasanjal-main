// backend/models/UserSchema.js
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, "Name is required"],
      trim:      true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
     role: {
       type:     String,
       required: true,
       enum:     { values: ["admin", "teacher", "parent"], message: "Role must be admin, teacher, or parent" },
     },

    // ── Contact ───────────────────────────────────────────────────────────────
    email: {
      type:      String,
      lowercase: true,
      trim:      true,
      unique:    true,
      index:     { sparse: true },
      match:     [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"],
    },
    phone: {
      type:   String,
      trim:   true,
      unique: true,
      index:  { sparse: true },
      match:  [/^(98|97|96)\d{8}$/, "Enter a valid Nepali mobile number"],
    },

    // ── Auth ──────────────────────────────────────────────────────────────────
    passwordHash: { type: String, select: false },
    otpHash:      { type: String, select: false },
    otpExpiry:    { type: Date },

    // ── Teacher-specific ──────────────────────────────────────────────────────
    subject:         { type: String, trim: true, default: null },
    assignedClasses: { type: [String], default: [] },
    qualification:   { type: String, trim: true, default: null },

    // ── Parent-specific ───────────────────────────────────────────────────────
    childId:    { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
    childName:  { type: String, default: null },
    childClass: { type: String, default: null },

    // ── Profile ───────────────────────────────────────────────────────────────
    avatar:     { type: String, default: null },
    isDisabled: { type: Boolean, default: false, index: true },
    lastLogin:  { type: Date },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
userSchema.index({ role: 1 });
userSchema.index({ role: 1, isDisabled: 1 });

// ── Pre-save: hash password if modified ───────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (this.isModified("passwordHash") && this.passwordHash && !this.passwordHash.startsWith("$2")) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  next();
});

// ── Instance methods ──────────────────────────────────────────────────────────
userSchema.methods.verifyPassword = async function (plainPassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.methods.generateOtp = async function () {
  const otpPlain = Math.floor(100000 + Math.random() * 900000).toString();
  this.otpHash   = await bcrypt.hash(otpPlain, 10);
  this.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
  await this.save();
  return otpPlain;
};

userSchema.methods.verifyOtp = async function (otpPlain) {
  if (!this.otpHash || !this.otpExpiry) return false;
  if (new Date() > this.otpExpiry) return false;
  const valid = await bcrypt.compare(otpPlain, this.otpHash);
  if (valid) {
    this.otpHash   = undefined;
    this.otpExpiry = undefined;
  }
  return valid;
};

// ── toJSON: strip sensitive fields ────────────────────────────────────────────
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.otpHash;
    delete ret.otpExpiry;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
