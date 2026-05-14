const router = require("express").Router();

const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");
const { getSchoolSettings, updateSchoolSettings, updateAdminProfile, getSettingStats } = require("../../controllers/settings/settingsController");

//settings routes
router.route("/settings").get(authMiddleware, requireAdmin, getSchoolSettings).put(authMiddleware, requireAdmin, updateSchoolSettings);
router.route("/settings/profile").put(authMiddleware, requireAdmin, updateAdminProfile);
router.route("/settings/stats").get(authMiddleware, requireAdmin, getSettingStats);

module.exports = router;

