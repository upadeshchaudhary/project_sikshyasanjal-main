const express = require("express");
const { getFees, getFeeSummary, getOverdueFees, getFeeRecord, createFeeRecord, updateFeeRecord, deleteFeeRecord } = require("../../controllers/fees/feesController");
const { authMiddleware, requireTeacherOrAdmin } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/fees",             authMiddleware, getFees);
router.get("/fees/summary",     authMiddleware, requireTeacherOrAdmin, getFeeSummary);
router.get("/fees/overdue",     authMiddleware, requireTeacherOrAdmin, getOverdueFees);
router.get("/fees/:id",         authMiddleware, getFeeRecord);
router.post("/fees",            authMiddleware, requireTeacherOrAdmin, createFeeRecord);
router.put("/fees/:id",         authMiddleware, requireTeacherOrAdmin, updateFeeRecord);
router.delete("/fees/:id",      authMiddleware, requireTeacherOrAdmin, deleteFeeRecord);

module.exports = router;
