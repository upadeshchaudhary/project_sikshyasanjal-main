// backend/models/FeeRecordSchema.js
const mongoose = require("mongoose");

const feeRecordSchema = new mongoose.Schema(
  {
    student:    { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    class:      { type: String, required: true },
    feeType: {
      type:    String,
      enum:    ["tuition", "exam", "sports", "library", "transport", "hostel", "misc"],
      default: "tuition",
    },
    amount:     { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: {
      type:    String,
      enum:    ["paid", "partially_paid", "pending", "overdue"],
      default: "pending",
      index:   true,
    },
    dueDate:       { type: Date, required: true },
    dueDateBs:     { type: String },
    paidDate:      { type: Date, default: null },
    paidDateBs:    { type: String, default: null },
    paymentMethod: {
      type:    String,
      enum:    ["cash", "bank_transfer", "esewa", "khalti", "cheque", "other"],
      default: null,
    },
    academicYear: { type: String, required: true },
    remarks:      { type: String, trim: true, default: "" },
    recordedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

feeRecordSchema.index({ student: 1 });
feeRecordSchema.index({ class: 1, academicYear: 1 });
feeRecordSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model("FeeRecord", feeRecordSchema);
