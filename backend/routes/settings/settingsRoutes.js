const express = require("express");
const { getSchoolSettings, updateSchoolSettings, updateUserProfile, getSettingStats } = require("../../controllers/settings/settingsController");
const { authMiddleware, requireAdmin } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/settings",              authMiddleware, requireAdmin, getSchoolSettings);
router.put("/settings/school",       authMiddleware, requireAdmin, updateSchoolSettings);
router.put("/settings/profile",      authMiddleware, updateUserProfile);
router.get("/settings/stats",        authMiddleware, requireAdmin, getSettingStats);

module.exports = router;
