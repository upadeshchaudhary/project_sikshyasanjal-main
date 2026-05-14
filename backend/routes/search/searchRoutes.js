const router = require("express").Router();

const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");

const { searchDashboard } = require("../../controllers/search/searchController");

// search routes
router.route("/search").get(authMiddleware, searchDashboard);

module.exports = router;
