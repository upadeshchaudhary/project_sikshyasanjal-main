const express = require("express");
const { getNotices, getImportantNotices, getNoticeById, createNotice, updateNotice, deleteNotice } = require("../../controllers/notices/noticesController");
const { authMiddleware, requireTeacherOrAdmin } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/notices",           authMiddleware, getNotices);
router.get("/notices/important", authMiddleware, getImportantNotices);
router.get("/notices/:id",       authMiddleware, getNoticeById);
router.post("/notices",          authMiddleware, requireTeacherOrAdmin, createNotice);
router.put("/notices/:id",       authMiddleware, requireTeacherOrAdmin, updateNotice);
router.delete("/notices/:id",    authMiddleware, requireTeacherOrAdmin, deleteNotice);

module.exports = router;
