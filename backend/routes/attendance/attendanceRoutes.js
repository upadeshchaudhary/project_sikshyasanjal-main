const express = require("express");
const { getAttendance, getTodayAttendance, getMonthlyAttendance, saveBulkAttendance, updateAttendance } = require("../../controllers/attendance/attendanceController");
const { authMiddleware, requireTeacherOrAdmin } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/attendance",              authMiddleware, getAttendance);
router.get("/attendance/today",        authMiddleware, getTodayAttendance);
router.get("/attendance/monthly",      authMiddleware, getMonthlyAttendance);
router.post("/attendance/bulk",        authMiddleware, requireTeacherOrAdmin, saveBulkAttendance);
router.put("/attendance/:id",          authMiddleware, requireTeacherOrAdmin, updateAttendance);

module.exports = router;
