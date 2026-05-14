// backend/models/FeeRecord.js
const mongoose = require("mongoose");

const feeRecordSchema = new mongoose.Schema(
  {
    school:    { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    student:   { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    class:     { type: String, required: true },

    feeType:   {
      type: String,
      enum: ["tuition", "exam", "sports", "library", "transport", "hostel", "misc"],
      default: "tuition",
    },
    amount:    { type: Number, required: true, min: 0 },
    paidAmount:{ type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ["paid", "partially_paid", "pending", "overdue"],
      default: "pending",
      index: true,
    },

    dueDate:   { type: Date, required: true },
    dueDateBs: { type: String },
    paidDate:  { type: Date, default: null },
    paidDateBs:{ type: String, default: null },

    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "esewa", "khalti", "cheque", "other"],
      default: null,
    },

    academicYear: { type: String, required: true }, // BS "2081-82"
    remarks:      { type: String, trim: true, default: "" },
    recordedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

feeRecordSchema.index({ school: 1, student: 1 });
feeRecordSchema.index({ school: 1, status: 1 });
feeRecordSchema.index({ school: 1, class: 1, academicYear: 1 });
feeRecordSchema.index({ school: 1, dueDate: 1, status: 1 }); // overdue detection

module.exports = mongoose.model("FeeRecord", feeRecordSchema);