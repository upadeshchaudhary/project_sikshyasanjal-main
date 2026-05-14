const router = require("express").Router();

const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");

const { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = require("../../controllers/calender/calendarController");

//calender routes

router.route("/calendar").get(authMiddleware, requireTeacherOrAdmin, getCalendarEvents);
router.route("/calendar").post(authMiddleware, requireTeacherOrAdmin, createCalendarEvent);
router.route("/calendar/:id").put(authMiddleware, requireTeacherOrAdmin, updateCalendarEvent);
router.route("/calendar/:id").delete(authMiddleware, requireTeacherOrAdmin, deleteCalendarEvent);

module.exports = router;