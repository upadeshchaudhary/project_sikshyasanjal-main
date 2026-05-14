const router = require("express").Router();

const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");

const { listOfAllTeachers, createNewTeacher, viewAnyTeacherProfile, updateAnyTeacherProfile, removeTeacher, viewOwnProfile, updateOwnProfile, assignClassesToTeacher, toggleTeacherStatus, forceLogoutTeacher } = require("../../controllers/teachers/teachersController");

//teachers routes

router.route("/teachers").get(authMiddleware, requireAdmin, listOfAllTeachers).post(authMiddleware, requireAdmin, createNewTeacher);
router.route("/teachers/me").get(authMiddleware, viewOwnProfile).put(authMiddleware, updateOwnProfile);
router.route("/teachers/:id")
  .get(authMiddleware, requireAdmin, viewAnyTeacherProfile)
    .put(authMiddleware, requireAdmin, updateAnyTeacherProfile)
    .delete(authMiddleware, requireAdmin, removeTeacher);
router.route("/teachers/:id/assign-classes").patch(authMiddleware, requireAdmin, assignClassesToTeacher);
router.route("/teachers/:id/toggle-status").patch(authMiddleware, requireAdmin, toggleTeacherStatus);
router.route("/teachers/:id/force-logout").post(authMiddleware, requireAdmin, forceLogoutTeacher);

module.exports = router;