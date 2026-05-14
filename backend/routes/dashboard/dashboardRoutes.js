const router = require("express").Router();

const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");

const { getAdminDashboardCharts, getAdminDashboardStats, getTeacherDashboardStats, getParentDashboardStats, searchDashboard } = require("../../controllers/dashboard/dashboardController");

//dashboard routes

router.route("/dashboard/admin/charts").get(authMiddleware, requireTeacherOrAdmin, getAdminDashboardCharts);
router.route("/dashboard/admin/stats").get(authMiddleware, requireTeacherOrAdmin, getAdminDashboardStats);
router.route("/dashboard/teacher").get(authMiddleware, getTeacherDashboardStats);
router.route("/dashboard/parent").get(authMiddleware, getParentDashboardStats);
router.route("/dashboard/search").get(authMiddleware, searchDashboard);

module.exports = router;