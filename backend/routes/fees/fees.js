const router = require("express").Router();

const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");

const { getFees, getFeeSummary, getOverdueFees, getFeeRecord, createFeeRecord, updateFeeRecord, deleteFeeRecord } = require("../../controllers/fees/feesController");

// fees routes

router.route("/fees").get(authMiddleware, getFees).post(authMiddleware, requireAdmin, createFeeRecord);
router.route("/fees/summary").get(authMiddleware, requireAdmin, getFeeSummary);
router.route("/fees/overdue").get(authMiddleware, requireAdmin, getOverdueFees);
router.route("/fees/:id")
  .get(authMiddleware, getFeeRecord)
  .put(authMiddleware, requireAdmin, updateFeeRecord)
  .delete(authMiddleware, requireAdmin, deleteFeeRecord);

module.exports = router;