const router = require("express").Router();

const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");

const { getRoutines, createRoutine, getRoutineByClass, updateRoutine, deleteRoutine, getSubjectsForIndividualClass } = require("../../controllers/routine/routineController");

// routine routes
router.route("/routine").get(authMiddleware, getRoutines).post(authMiddleware, requireAdmin, createRoutine);
router.route("/routine/:id")
  .get(authMiddleware, getRoutineByClass)
  .put(authMiddleware, requireAdmin, updateRoutine)
  .delete(authMiddleware, requireAdmin, deleteRoutine);
router.route("/routine/:id/subjects").get(authMiddleware, requireAdmin, getSubjectsForIndividualClass);

module.exports = router;