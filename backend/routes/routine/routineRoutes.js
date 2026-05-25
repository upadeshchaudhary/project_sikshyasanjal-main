const express = require("express");
const { getRoutines, createRoutine, getRoutineByClass, updateRoutine, getSubjectsForIndividualClass, deleteRoutine } = require("../../controllers/routine/routineController");
const { authMiddleware, requireTeacherOrAdmin } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/routine",                       authMiddleware, getRoutines);
router.post("/routine/generate",             authMiddleware, requireTeacherOrAdmin, createRoutine);
router.get("/routine/:class/subjects",       authMiddleware, getSubjectsForIndividualClass);
router.get("/routine/:class",                authMiddleware, getRoutineByClass);
router.put("/routine/:class",                authMiddleware, requireTeacherOrAdmin, updateRoutine);
router.delete("/routine/:class",             authMiddleware, requireTeacherOrAdmin, deleteRoutine);

module.exports = router;
