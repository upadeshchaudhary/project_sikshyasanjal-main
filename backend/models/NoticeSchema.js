// backend/models/NoticeSchema.js
const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    title:    { type: String, required: true, trim: true, maxlength: 200 },
    body:     { type: String, required: true, trim: true },
    category: {
      type:    String,
      enum:    ["exam", "holiday", "event", "urgent", "general", "meeting"],
      default: "general",
      index:   true,
    },
    isImportant: { type: Boolean, default: false, index: true },
    postedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetRoles: { type: [String], enum: ["admin", "teacher", "parent"], default: ["admin", "teacher", "parent"] },
    expiresAt:   { type: Date, default: null },
  },
  { timestamps: true }
);

noticeSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notice", noticeSchema);
