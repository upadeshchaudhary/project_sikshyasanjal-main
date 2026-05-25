// backend/models/ExamResultSchema.js
const mongoose = require("mongoose");

const subjectMarkSchema = new mongoose.Schema(
  {
    subject:       { type: String, required: true, trim: true },
    marksObtained: { type: Number, required: true, min: 0 },
    fullMarks:     { type: Number, required: true, min: 1 },
    percentage:    { type: Number },
    grade:         { type: String },
    gpa:           { type: Number },
    isPassing:     { type: Boolean },
  },
  { _id: false }
);

function calcGrade(pct) {
  if (pct >= 90) return { grade: "A+", gpa: 4.0 };
  if (pct >= 80) return { grade: "A",  gpa: 3.6 };
  if (pct >= 70) return { grade: "B+", gpa: 3.2 };
  if (pct >= 60) return { grade: "B",  gpa: 2.8 };
  if (pct >= 50) return { grade: "C+", gpa: 2.4 };
  if (pct >= 40) return { grade: "C",  gpa: 2.0 };
  if (pct >= 35) return { grade: "D",  gpa: 1.6 };
  return           { grade: "NG", gpa: 0.0 };
}

const examResultSchema = new mongoose.Schema(
  {
    student:           { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    class:             { type: String, required: true, index: true },
    examName:          { type: String, required: true, trim: true },
    examYear:          { type: String, required: true },
    subjects:          [subjectMarkSchema],
    totalMarks:        { type: Number },
    totalFullMarks:    { type: Number },
    overallPercentage: { type: Number },
    overallGrade:      { type: String },
    overallGpa:        { type: Number },
    rank:              { type: Number, default: null },
    uploadedBy:        { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    publishedAt:       { type: Date, default: null },
    isPublished:       { type: Boolean, default: false },
  },
  { timestamps: true }
);

examResultSchema.pre("save", function (next) {
  if (this.subjects && this.subjects.length > 0) {
    let totalObtained = 0;
    let totalFull     = 0;
    this.subjects = this.subjects.map((s) => {
      const pct = (s.marksObtained / s.fullMarks) * 100;
      const { grade, gpa } = calcGrade(pct);
      totalObtained += s.marksObtained;
      totalFull     += s.fullMarks;
      return { ...s.toObject ? s.toObject() : s, percentage: Math.round(pct * 10) / 10, grade, gpa, isPassing: pct >= 35 };
    });
    const overallPct = (totalObtained / totalFull) * 100;
    const overall    = calcGrade(overallPct);
    this.totalMarks        = totalObtained;
    this.totalFullMarks    = totalFull;
    this.overallPercentage = Math.round(overallPct * 10) / 10;
    this.overallGrade      = overall.grade;
    this.overallGpa        = overall.gpa;
  }
  next();
});

examResultSchema.index({ student: 1, examName: 1, examYear: 1 }, { unique: true });
examResultSchema.index({ class: 1, examName: 1 });
examResultSchema.index({ student: 1 });

module.exports = mongoose.model("ExamResult", examResultSchema);
