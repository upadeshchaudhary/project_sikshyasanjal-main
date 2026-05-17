const router = require("express").Router();

const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");

const { getCalendarEvents, getUpcomingCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = require("../../controllers/calendar/calendarController");

//calender routes

router.route("/calendar").get(authMiddleware, getCalendarEvents);
router.route("/calendar/upcoming").get(authMiddleware, getUpcomingCalendarEvents);
router.route("/calendar").post(authMiddleware, requireTeacherOrAdmin, createCalendarEvent);
router.route("/calendar/:id").put(authMiddleware, requireTeacherOrAdmin, updateCalendarEvent);
router.route("/calendar/:id").delete(authMiddleware, requireTeacherOrAdmin, deleteCalendarEvent);

module.exports = router;
