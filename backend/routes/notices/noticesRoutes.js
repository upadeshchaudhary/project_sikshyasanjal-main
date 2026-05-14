const router = require("express").Router();

const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");

const { getNotices, getImportantNotices, getNoticeById, createNotice, updateNotice, deleteNotice } = require("../../controllers/notices/noticesController");

// notices routes

router.route("/notices").get(authMiddleware, getNotices).post(authMiddleware, requireTeacherOrAdmin, createNotice);
router.route("/notices/important").get(authMiddleware, getImportantNotices);
router.route("/notices/:id")
  .get(authMiddleware, getNoticeById)
  .put(authMiddleware, requireTeacherOrAdmin, updateNotice)
  .delete(authMiddleware, requireTeacherOrAdmin, deleteNotice);

module.exports = router;