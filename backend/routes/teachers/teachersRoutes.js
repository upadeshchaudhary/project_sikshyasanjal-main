const express = require("express");
const { viewOwnProfile, listOfAllTeachers, viewAnyTeacherProfile, createNewTeacher, updateOwnProfile, updateAnyTeacherProfile, assignClassesToTeacher, toggleTeacherStatus, removeTeacher, forceLogoutTeacher } = require("../../controllers/teachers/teachersController");
const { authMiddleware, requireAdmin, requireTeacherOrAdmin } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/teachers/me",               authMiddleware, viewOwnProfile);
router.get("/teachers",                  authMiddleware, listOfAllTeachers);
router.get("/teachers/:id",              authMiddleware, requireTeacherOrAdmin, viewAnyTeacherProfile);
router.post("/teachers",                 authMiddleware, requireAdmin, createNewTeacher);
router.put("/teachers/me",               authMiddleware, updateOwnProfile);
router.put("/teachers/:id",              authMiddleware, requireAdmin, updateAnyTeacherProfile);
router.patch("/teachers/:id/assign-classes", authMiddleware, requireAdmin, assignClassesToTeacher);
router.patch("/teachers/:id/toggle-status",  authMiddleware, requireAdmin, toggleTeacherStatus);
router.delete("/teachers/:id",           authMiddleware, requireAdmin, removeTeacher);
router.post("/teachers/:id/force-logout", authMiddleware, requireAdmin, forceLogoutTeacher);

module.exports = router;
