const router = require("express").Router();

const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");

const { getStudents, createStudent, getStudentById, updateStudent, deleteStudent, getClassesForTeacher } = require("../../controllers/students/studentsController");


//students routes

router.route("/students").get(authMiddleware, getStudents).post(authMiddleware, requireAdmin, createStudent);
router.route("/students/classes").get(authMiddleware, requireTeacherOrAdmin, getClassesForTeacher);
router.route("/students/:id")
  .get(authMiddleware, getStudentById)
  .put(authMiddleware, requireTeacherOrAdmin, updateStudent)
  .delete(authMiddleware, requireAdmin, deleteStudent);

module.exports = router;