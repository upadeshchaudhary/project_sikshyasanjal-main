const express = require("express");
const { getStudents, getClassesForTeacher, getStudentById, createStudent, updateStudent, deleteStudent, toggleStudentStatus } = require("../../controllers/students/studentsController");
const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/students/classes",  authMiddleware, getClassesForTeacher);
router.get("/students",          authMiddleware, getStudents);
router.get("/students/:id",      authMiddleware, getStudentById);
router.post("/students",         authMiddleware, requireTeacherOrAdmin, createStudent);
router.put("/students/:id",      authMiddleware, requireTeacherOrAdmin, updateStudent);
router.delete("/students/:id",   authMiddleware, requireTeacherOrAdmin, deleteStudent);
router.patch("/students/:id/toggle-status", authMiddleware, requireAdmin, toggleStudentStatus);

module.exports = router;
