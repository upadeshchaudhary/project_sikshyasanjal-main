// backend/models/index.js
// Central barrel — all routes do: const { User, School, Student, ... } = require("../models")

const School            = require("./SchoolSchema");
const User              = require("./UserSchema");
const Student           = require("./StudentSchema");
const Homework          = require("./HomeworkSchema");
const Notice            = require("./NoticeSchema");
const Attendance        = require("./AttendanceSchema");
const ExamResult        = require("./ExamResultSchema");
const FeeRecord         = require("./FeeRecordSchema");
const Message           = require("./MessageSchema");
const ClassRoutine      = require("./ClassRoutineSchema");
const AcademicCalendar  = require("./AcademicCalendarSchema");
const Complain          = require("./ComplainSchema");

module.exports = {
  School,
  User,
  Student,
  Homework,
  Notice,
  Attendance,
  ExamResult,
  FeeRecord,
  Message,
  ClassRoutine,
  AcademicCalendar,
  Complain,
};