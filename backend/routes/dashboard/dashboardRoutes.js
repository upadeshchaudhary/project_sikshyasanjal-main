const express = require("express");
const { getAdminDashboardStats, getAdminDashboardCharts, getTeacherDashboardStats, getParentDashboardStats, searchDashboard } = require("../../controllers/dashboard/dashboardController");
const { authMiddleware, requireRole } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/dashboard/admin",         authMiddleware, requireRole("admin"), getAdminDashboardStats);
router.get("/dashboard/admin/stats",   authMiddleware, requireRole("admin"), getAdminDashboardStats);
router.get("/dashboard/admin/charts",  authMiddleware, requireRole("admin"), getAdminDashboardCharts);
router.get("/dashboard/teacher",       authMiddleware, requireRole("teacher"), getTeacherDashboardStats);
router.get("/dashboard/parent",        authMiddleware, requireRole("parent"), getParentDashboardStats);
router.get("/dashboard/search",        authMiddleware, searchDashboard);

module.exports = router;
