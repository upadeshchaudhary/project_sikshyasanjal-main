const express = require("express");
const { getHomework, getHomeworkById, createHomework, updateHomework, deleteHomework } = require("../../controllers/homework/homeworkController");
const { authMiddleware, requireTeacherOrAdmin } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/homework",        authMiddleware, getHomework);
router.get("/homework/:id",    authMiddleware, getHomeworkById);
router.post("/homework",       authMiddleware, requireTeacherOrAdmin, createHomework);
router.put("/homework/:id",    authMiddleware, requireTeacherOrAdmin, updateHomework);
router.delete("/homework/:id", authMiddleware, requireTeacherOrAdmin, deleteHomework);

module.exports = router;
