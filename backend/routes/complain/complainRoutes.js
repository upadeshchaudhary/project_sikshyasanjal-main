const express = require("express");
const { getComplains, createComplain, listComplains } = require("../../controllers/complain/complainController");
const { authMiddleware, requireAdmin } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/complains",       authMiddleware, requireAdmin, getComplains);
router.post("/complains",      authMiddleware, createComplain);
router.get("/complains/list",  authMiddleware, requireAdmin, listComplains);

module.exports = router;
