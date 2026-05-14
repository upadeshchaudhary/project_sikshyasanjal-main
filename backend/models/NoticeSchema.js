// backend/models/Notice.js
const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    school:    { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    title:     { type: String, required: true, trim: true, maxlength: 200 },
    body:      { type: String, required: true, trim: true },
    category:  {
      type: String,
      enum: ["exam", "holiday", "event", "urgent", "general", "meeting"],
      default: "general",
      index: true,
    },
    isImportant: { type: Boolean, default: false, index: true },
    postedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetRoles: {
      type:    [String],
      enum:    ["admin", "teacher", "parent"],
      default: ["admin", "teacher", "parent"], // visible to all by default
    },
    expiresAt: { type: Date, default: null }, // auto-hide after this date
  },
  { timestamps: true }
);

noticeSchema.index({ school: 1, createdAt: -1 });
noticeSchema.index({ school: 1, isImportant: 1 });

module.exports = mongoose.model("Notice", noticeSchema);