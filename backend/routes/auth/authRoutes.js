// backend/routes/auth/authRoutes.js
const { parentSendOtp, verifyOtp, adminTeacherLogin, parentsLogin, googleAuth, googleCallback, getMe, logout } = require("../../controllers/auth/authController");

const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");

const router = require("express").Router();


// Auth routes

router.route("/auth/parent/send-otp").post(parentSendOtp);
router.route("/auth/login").post(adminTeacherLogin);
// router.route("/auth/school/:slug").get(verifySchoolDomain);
router.route("/auth/parent/verify-otp").post(verifyOtp);
router.route("/auth/parent/login").post(parentsLogin);
router.route("/auth/google").get(googleAuth);
router.route("/auth/google/callback").get(googleCallback);
router.route("/auth/me").get(authMiddleware, getMe);
router.route("/auth/logout").post(authMiddleware, logout);

module.exports = router;