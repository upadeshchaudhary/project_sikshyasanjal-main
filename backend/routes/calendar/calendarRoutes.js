const express = require("express");
const { getCalendarEvents, getUpcomingCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = require("../../controllers/calendar/calendarController");
const { authMiddleware, requireAdmin } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/calendar",           authMiddleware, getCalendarEvents);
router.get("/calendar/upcoming",  authMiddleware, getUpcomingCalendarEvents);
router.post("/calendar",          authMiddleware, requireAdmin, createCalendarEvent);
router.put("/calendar/:id",       authMiddleware, requireAdmin, updateCalendarEvent);
router.delete("/calendar/:id",    authMiddleware, requireAdmin, deleteCalendarEvent);

module.exports = router;
