// backend/routes/auth/authRoutes.js
const express = require("express");
const { getSchool, adminTeacherLogin, parentSendOtp, verifyOtp, parentsLogin, getMe, logout } = require("../../controllers/auth/authController");
const { authMiddleware } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/auth/school",              getSchool);
router.post("/auth/login",              adminTeacherLogin);
router.post("/auth/parent/send-otp",    parentSendOtp);
router.post("/auth/parent/verify-otp",  verifyOtp);
router.post("/auth/parent/login",       parentsLogin);
router.get("/auth/me",                  authMiddleware, getMe);
router.post("/auth/logout",             authMiddleware, logout);

module.exports = router;
