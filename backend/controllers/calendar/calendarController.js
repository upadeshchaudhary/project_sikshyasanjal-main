// backend/controllers/calendar/calendarController.js
const { AcademicCalendar } = require("../../models");

function buildCalendarFilter(req) {
  const filter = {};

  if (req.query.year && req.query.month) {
    const month = String(req.query.month).padStart(2, "0");
    filter.startDateBs = { $regex: `^${req.query.year}-${month}-` };
  } else if (req.query.year) {
    filter.startDateBs = { $regex: `^${req.query.year}-` };
  } else if (req.query.month) {
    const month = String(req.query.month).padStart(2, "0");
    filter.startDateBs = { $regex: `^[0-9]{4}-${month}-` };
  }

  return filter;
}

exports.getCalendarEvents = async (req, res) => {
  try {
    const events = await AcademicCalendar.find(buildCalendarFilter(req))
      .sort({ startDate: 1, startDateBs: 1 }).lean();
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load calendar events." });
  }
};

exports.getUpcomingCalendarEvents = async (req, res) => {
  try {
    const limit  = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 8));
    const events = await AcademicCalendar.find({ startDate: { $gte: new Date() } })
      .sort({ startDate: 1, startDateBs: 1 }).limit(limit).lean();
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load upcoming events." });
  }
};

const { getCurrentAcademicYear } = require("../../utils/calendar");

exports.createCalendarEvent = async (req, res) => {
  try {
    const academicYear = getCurrentAcademicYear();
    const event = await AcademicCalendar.create({ ...req.body, academicYear, createdBy: req.user.userId });
    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateCalendarEvent = async (req, res) => {
  try {
    const event = await AcademicCalendar.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }).lean();
    if (!event) return res.status(404).json({ success: false, message: "Calendar event not found." });
    res.json({ success: true, event });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteCalendarEvent = async (req, res) => {
  try {
    const event = await AcademicCalendar.findByIdAndDelete(req.params.id).lean();
    if (!event) return res.status(404).json({ success: false, message: "Calendar event not found." });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete calendar event." });
  }
};
