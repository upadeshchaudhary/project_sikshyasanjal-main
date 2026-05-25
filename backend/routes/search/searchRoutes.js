const express = require("express");
const { searchDashboard } = require("../../controllers/search/searchController");
const { authMiddleware } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/search", authMiddleware, searchDashboard);

module.exports = router;
