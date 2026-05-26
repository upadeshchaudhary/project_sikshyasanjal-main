const express = require("express");
const { getResults, getResultById, uploadResult, updateResult, publishResult, unpublishResult, deleteResult } = require("../../controllers/results/resultsController");
const { authMiddleware, requireAdmin, requireTeacherOrAdmin } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/results",              authMiddleware, getResults);
router.get("/results/:id",          authMiddleware, getResultById);
router.post("/results",             authMiddleware, requireTeacherOrAdmin, uploadResult);
router.put("/results/:id",          authMiddleware, requireTeacherOrAdmin, updateResult);
router.patch("/results/:id/publish", authMiddleware, requireAdmin, publishResult);
router.patch("/results/:id/unpublish", authMiddleware, requireAdmin, unpublishResult);
router.delete("/results/:id",       authMiddleware, requireAdmin, deleteResult);

module.exports = router;
