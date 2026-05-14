const router = require("express").Router();

const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");

const { getResults, uploadResult, getResultById, updateResult, deleteResult, publishResult, unpublishResult } = require("../../controllers/results/resultsController");

//results routes
router.route("/results").get(authMiddleware, getResults).post(authMiddleware, requireTeacherOrAdmin, uploadResult);
router.route("/results/:id")
  .get(authMiddleware, getResultById)
    .put(authMiddleware, requireTeacherOrAdmin, updateResult)
    .delete(authMiddleware, requireAdmin, deleteResult);
router.route("/results/:id/publish").patch(authMiddleware, requireAdmin, publishResult);
router.route("/results/:id/unpublish").patch(authMiddleware, requireAdmin, unpublishResult);

module.exports = router;