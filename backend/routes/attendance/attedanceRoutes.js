const router = require("express").Router();

const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");

const { getAttendance, getTodayAttendance, getMonthlyAttendance, saveBulkAttendance, updateAttendance } = require("../../controllers/attendance/attendanceController");


//attendance routes

router.route("/attendance").get(authMiddleware, getAttendance);
router.route("/attendance/today").get(authMiddleware, getTodayAttendance);
router.route("/attendance/monthly").get(authMiddleware, getMonthlyAttendance);
router.route("/attendance/bulk").post(authMiddleware, requireTeacherOrAdmin, saveBulkAttendance);
router.route("/attendance/:id").put(authMiddleware, requireTeacherOrAdmin, updateAttendance);

module.exports = router;