// backend/models/HomeworkSchema.js
const mongoose = require("mongoose");

const homeworkSchema = new mongoose.Schema(
  {
    title:         { type: String, required: true, trim: true, maxlength: 200 },
    subject:       { type: String, required: true, trim: true },
    class:         { type: String, required: true, trim: true, index: true },
    description:   { type: String, trim: true, default: "" },
    dueDate:       { type: Date, required: true, index: true },
    dueDateBs:     { type: String },
    priority:      { type: String, enum: ["high", "medium", "low"], default: "medium" },
    postedBy:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    attachmentUrl: { type: String, default: null },
  },
  { timestamps: true }
);

homeworkSchema.index({ class: 1, dueDate: 1 });
homeworkSchema.index({ postedBy: 1 });

module.exports = mongoose.model("Homework", homeworkSchema);
