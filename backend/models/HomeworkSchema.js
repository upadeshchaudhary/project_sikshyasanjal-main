// backend/models/Homework.js
const mongoose = require("mongoose");

const homeworkSchema = new mongoose.Schema(
  {
    school:    { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    title:     { type: String, required: true, trim: true, maxlength: 200 },
    subject:   { type: String, required: true, trim: true },
    class:     { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true, default: "" },
    dueDate:   { type: Date, required: true, index: true },
    dueDateBs: { type: String }, // BS string e.g. "2081-05-20"
    priority:  { type: String, enum: ["high", "medium", "low"], default: "medium" },
    postedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    attachmentUrl: { type: String, default: null },
  },
  { timestamps: true }
);

homeworkSchema.index({ school: 1, class: 1, dueDate: 1 });
homeworkSchema.index({ school: 1, postedBy: 1 });

module.exports = mongoose.model("Homework", homeworkSchema);