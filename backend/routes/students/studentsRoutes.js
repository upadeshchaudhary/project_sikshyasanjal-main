const express = require("express");
const { getStudents, getClassesForTeacher, getStudentById, createStudent, updateStudent, deleteStudent } = require("../../controllers/students/studentsController");
const { authMiddleware, requireTeacherOrAdmin } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/students/classes",  authMiddleware, getClassesForTeacher);
router.get("/students",          authMiddleware, getStudents);
router.get("/students/:id",      authMiddleware, getStudentById);
router.post("/students",         authMiddleware, requireTeacherOrAdmin, createStudent);
router.put("/students/:id",      authMiddleware, requireTeacherOrAdmin, updateStudent);
router.delete("/students/:id",   authMiddleware, requireTeacherOrAdmin, deleteStudent);

module.exports = router;
