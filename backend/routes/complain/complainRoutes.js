const router = require("express").Router();

const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");

const { getComplains, createComplain, updateComplainStatus, listComplains } = require("../../controllers/complain/complainController");

//complain routes

router.route("/complains").get(authMiddleware, getComplains).post(authMiddleware, createComplain);
router.route("/complains/:id/status").put(authMiddleware, requireTeacherOrAdmin, updateComplainStatus);
router.route("/complains/school/:id").get(authMiddleware, listComplains);

module.exports = router;