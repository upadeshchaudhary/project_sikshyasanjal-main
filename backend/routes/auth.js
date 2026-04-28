// backend/routes/auth.js
const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const axios    = require("axios");
const { User, School } = require("../models");
const { protect } = require("../middleware/auth");

// ── FIXED: crash if JWT_SECRET missing — never fall back ──────────────────────
if (!process.env.JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET environment variable is not set");
  process.exit(1);
}
const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

// ── Token factory — includes role + schoolId for fast auth checks ─────────────
const signToken = (user, schoolId) =>
  jwt.sign(
    {
      userId:   user._id.toString(),
      role:     user.role,
      schoolId: schoolId.toString(),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

// ── Safe school shape for frontend ────────────────────────────────────────────
const schoolShape = (school) => ({
  _id:     school._id,
  name:    school.name,
  slug:    school.domain,
  domain:  school.domain,
  address: school.address || "",
  phone:   school.phone   || "",
});

// ── Safe user shape — never send passwordHash or raw OTP to client ────────────
const userShape = (user) => ({
  id:         user._id,
  name:       user.name,
  role:       user.role,
  email:      user.email      || null,
  phone:      user.phone      || null,
  class:      user.class      || null,
  childId:    user.childId    || null,
  childName:  user.childName  || null,
  childClass: user.childClass || null,
  avatar:     user.avatar     || null,
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/auth/school/:slug — Step 1 of login: verify school domain exists
// Called by LoginPage before showing the role selector
// ════════════════════════════════════════════════════════════════════════════════
router.get("/school/:slug", async (req, res) => {
  try {
    const slug   = req.params.slug.toLowerCase().trim();
    const school = await School.findOne({ domain: slug }).lean();

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "No school found with this domain. Check the domain and try again.",
      });
    }

    res.json({
      success: true,
      school:  schoolShape(school),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login — Admin / Teacher email + password login
// ════════════════════════════════════════════════════════════════════════════════
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const schoolDomain = (req.headers["x-school-domain"] || "").toLowerCase().trim();

    // Input validation
    if (!email || !password || !schoolDomain) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and school domain are required.",
      });
    }

    if (!["admin", "teacher"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role for this login method.",
      });
    }

    // Resolve school
    const school = await School.findOne({ domain: schoolDomain });
    if (!school) {
      return res.status(404).json({ success: false, message: "School not found." });
    }

    // Find user — scoped to this school and the correct role
    const user = await User.findOne({
      email:  email.toLowerCase().trim(),
      school: school._id,
      role,
    }).select("+passwordHash"); // Explicitly include passwordHash for verification

    // Use the same error message for "user not found" and "wrong password"
    // to prevent user enumeration attacks
    const INVALID_CREDS = { success: false, message: "Incorrect email or password." };

    if (!user || !user.passwordHash) return res.status(401).json(INVALID_CREDS);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json(INVALID_CREDS);

    // Check if account is active
    if (user.isDisabled) {
      return res.status(403).json({
        success: false,
        message: "Your account has been disabled. Contact the school administrator.",
      });
    }

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    res.json({
      success: true,
      token:   signToken(user, school._id),
      user:    userShape(user),
      school:  schoolShape(school),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/auth/parent/send-otp — Send OTP to parent's Nepali mobile number
// Rate limited in server.js: max 3 per 10 minutes
// ════════════════════════════════════════════════════════════════════════════════
router.post("/parent/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    const schoolDomain = (req.headers["x-school-domain"] || "").toLowerCase().trim();

    if (!phone || !schoolDomain) {
      return res.status(400).json({ success: false, message: "Phone number and school domain are required." });
    }

    // Validate Nepali number format
    if (!/^(98|97|96)\d{8}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Enter a valid Nepali mobile number." });
    }

    const school = await School.findOne({ domain: schoolDomain });
    if (!school) return res.status(404).json({ success: false, message: "School not found." });

    const user = await User.findOne({ phone, school: school._id, role: "parent" }).select("+otpHash +otpExpiry"); // Include OTP fields for potential cleanup
    if (!user) {
      // Don't reveal whether the number is registered — prevents enumeration
      return res.status(200).json({
        success: true,
        message: "If this number is registered, an OTP has been sent.",
      });
    }

    // Generate 6-digit OTP
    const otpPlain  = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash   = await bcrypt.hash(otpPlain, 10); // FIXED: hash before storing
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.otpHash   = otpHash;
    user.otpExpiry = otpExpiry;
    await user.save();

    // ── Send via Sparrow SMS (Nepali SMS gateway) ───────────────────────────
    const smsText = `Your SikshyaSanjal OTP is: ${otpPlain}. Valid for 5 minutes. Do not share this code.`;

    if (process.env.NODE_ENV === "production" || process.env.SPARROW_SMS_TOKEN) {
      await axios.post(
        "https://api.sparrowsms.com/v2/sms/",
        {
          token:   process.env.SPARROW_SMS_TOKEN,
          from:    process.env.SPARROW_SMS_FROM || "SikshyaSanjal",
          to:      `+977${phone}`,
          text:    smsText,
        },
        { timeout: 8000 }
      );
    }

    // In development without SMS token: return OTP in response for testing
    const devPayload = process.env.NODE_ENV === "development" && !process.env.SPARROW_SMS_TOKEN
      ? { devOtp: otpPlain }
      : {};

    res.json({
      success: true,
      message: `OTP sent to +977-${phone}`,
      // otpToken removed: we verify against the stored hash, no separate token needed
      ...devPayload,
    });
  } catch (err) {
    // Handle Sparrow SMS API errors gracefully
    if (err.response?.data) {
      console.error("Sparrow SMS error:", err.response.data);
      return res.status(502).json({
        success: false,
        message: "SMS service unavailable. Please try again or use password login.",
      });
    }
    res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/auth/parent/verify-otp — Verify OTP and log parent in
// ════════════════════════════════════════════════════════════════════════════════
router.post("/parent/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const schoolDomain = (req.headers["x-school-domain"] || "").toLowerCase().trim();

    if (!phone || !otp || !schoolDomain) {
      return res.status(400).json({ success: false, message: "Phone, OTP, and school domain are required." });
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "OTP must be exactly 6 digits." });
    }

    const school = await School.findOne({ domain: schoolDomain });
    if (!school) return res.status(404).json({ success: false, message: "School not found." });

    const user = await User.findOne({ phone, school: school._id, role: "parent" }).select("+otpHash +otpExpiry"); // Include OTP fields for verification  
    if (!user || !user.otpHash) {
      return res.status(401).json({ success: false, message: "Invalid OTP. Please request a new one." });
    }

    // Check expiry first (fast check before bcrypt)
    if (new Date() > user.otpExpiry) {
      user.otpHash   = undefined;
      user.otpExpiry = undefined;
      await user.save();
      return res.status(401).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    // FIXED: compare against hashed OTP
    const valid = await bcrypt.compare(otp, user.otpHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Incorrect OTP. Please try again." });
    }

    // Clear OTP after successful use — one-time use enforced
    user.otpHash   = undefined;
    user.otpExpiry = undefined;
    user.lastLogin = new Date();
    await user.save();

    // Populate child details for parent dashboard
    const populatedUser = await User.findById(user._id)
      .populate("childId", "name class rollNo")
      .lean();

    res.json({
      success: true,
      token:   signToken(user, school._id),
      user:    userShape(populatedUser),
      school:  schoolShape(school),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Verification failed. Please try again." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/auth/parent/login — Parent password login (returning users)
// ════════════════════════════════════════════════════════════════════════════════
router.post("/parent/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    const schoolDomain = (req.headers["x-school-domain"] || "").toLowerCase().trim();

    if (!phone || !password || !schoolDomain) {
      return res.status(400).json({ success: false, message: "Phone, password, and school domain are required." });
    }

    const school = await School.findOne({ domain: schoolDomain });
    if (!school) return res.status(404).json({ success: false, message: "School not found." });

    const user = await User.findOne({ phone, school: school._id, role: "parent" }).select("+passwordHash"); // Include passwordHash for verification  
    const INVALID = { success: false, message: "Incorrect phone number or password." };

    if (!user || !user.passwordHash) return res.status(401).json(INVALID);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json(INVALID);

    if (user.isDisabled) {
      return res.status(403).json({
        success: false,
        message: "Your account has been disabled. Contact the school administrator.",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const populatedUser = await User.findById(user._id)
      .populate("childId", "name class rollNo")
      .lean();

    res.json({
      success: true,
      token:   signToken(user, school._id),
      user:    userShape(populatedUser),
      school:  schoolShape(school),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/auth/google — Initiate Google OAuth redirect
// Called by LoginPage: window.location.href = /api/auth/google?school=slug&role=role
// ════════════════════════════════════════════════════════════════════════════════
router.get("/google", (req, res) => {
  const { school, role } = req.query;

  if (!school || !["admin", "teacher"].includes(role)) {
    return res.status(400).json({ success: false, message: "School domain and valid role are required." });
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ success: false, message: "Google login is not configured for this server." });
  }

  const state     = Buffer.from(JSON.stringify({ school, role })).toString("base64");
  const redirectUri = `${process.env.SERVER_URL || `http://localhost:5000`}/api/auth/google/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id",     process.env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri",  redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope",         "openid email profile");
  authUrl.searchParams.set("state",         state);
  authUrl.searchParams.set("prompt",        "select_account");

  res.redirect(authUrl.toString());
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/auth/google/callback — Google OAuth callback
// ════════════════════════════════════════════════════════════════════════════════
router.get("/google/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;
    const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

    if (error) {
      return res.redirect(`${CLIENT_URL}/?error=google_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${CLIENT_URL}/?error=google_failed`);
    }

    // Decode state to get school + role
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return res.redirect(`${CLIENT_URL}/?error=invalid_state`);
    }

    const { school: schoolSlug, role } = stateData;

    // Exchange code for tokens
    const redirectUri = `${process.env.SERVER_URL || "http://localhost:5000"}/api/auth/google/callback`;
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
    });

    // Get user info from Google
    const { data: googleUser } = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
    });

    // Find school
    const school = await School.findOne({ domain: schoolSlug.toLowerCase() });
    if (!school) {
      return res.redirect(`${CLIENT_URL}/?error=school_not_found`);
    }

    // Find matching user in this school
    const user = await User.findOne({
      email:  googleUser.email.toLowerCase(),
      school: school._id,
      role,
    });

    if (!user) {
      return res.redirect(`${CLIENT_URL}/?error=user_not_found&email=${encodeURIComponent(googleUser.email)}`);
    }

    if (user.isDisabled) {
      return res.redirect(`${CLIENT_URL}/?error=account_disabled`);
    }

    // Update Google profile info
    await User.findByIdAndUpdate(user._id, {
      googleId:  googleUser.sub,
      avatar:    googleUser.picture,
      lastLogin: new Date(),
    });

    // Issue JWT and redirect to frontend with token in URL fragment
    const token = signToken(user, school._id);

    // Encode user + school as base64 to pass back to frontend
    const payload = Buffer.from(JSON.stringify({
      token,
      user:   userShape(user),
      school: schoolShape(school),
    })).toString("base64");

    // Redirect to frontend — React picks up the payload from the URL
    res.redirect(`${CLIENT_URL}/auth/callback?payload=${payload}`);
  } catch (err) {
    console.error("Google OAuth callback error:", err.message);
    const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
    res.redirect(`${CLIENT_URL}/?error=google_failed`);
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/auth/me — Restore session from JWT (called on every page refresh)
// Protected — requires valid JWT in Authorization header
// ════════════════════════════════════════════════════════════════════════════════
router.get("/me", protect, async (req, res) => {
  try {
    // req.user is attached by the protect middleware
    const user = await User.findById(req.user.userId)
      .populate("childId", "name class rollNo")
      .lean();

    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists." });
    }

    if (user.isDisabled) {
      return res.status(403).json({ success: false, message: "Account disabled." });
    }

    const school = await School.findById(req.user.schoolId).lean();
    if (!school) {
      return res.status(404).json({ success: false, message: "School not found." });
    }

    res.json({
      success: true,
      user:    userShape(user),
      school:  schoolShape(school),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to restore session." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/auth/logout — Invalidate session (client should also clear localStorage)
// ════════════════════════════════════════════════════════════════════════════════
router.post("/logout", protect, async (req, res) => {
  // For JWT-based auth, logout is primarily a client-side operation.
  // If you implement a token blacklist (Redis), add it here.
  // For now, acknowledge the logout and let the client clear its token.
  res.json({ success: true, message: "Logged out successfully." });
});

module.exports = router;