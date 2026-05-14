const router = require("express").Router();

const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");

const { getHomework, getHomeworkById, createHomework, updateHomework, deleteHomework } = require("../../controllers/homework/homeworkController");

// homework routes

router.route("/homework").get(authMiddleware, getHomework).post(authMiddleware, requireTeacherOrAdmin, createHomework);
router.route("/homework/:id")
  .get(authMiddleware, getHomeworkById)
  .put(authMiddleware, requireTeacherOrAdmin, updateHomework)
  .delete(authMiddleware, requireTeacherOrAdmin, deleteHomework);

module.exports = router;