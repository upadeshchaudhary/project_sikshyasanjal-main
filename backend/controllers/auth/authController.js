// backend/controllers/auth/authController.js
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { User, School } = require("../../models");

if (!process.env.JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET environment variable is not set");
  process.exit(1);
}
const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

// ── Token factory — role only, no schoolId ────────────────────────────────────
const signToken = (user) =>
  jwt.sign(
    { userId: user._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

// ── Safe user shape ────────────────────────────────────────────────────────────
const userShape = (user) => {
  const hasChildData = user.childId && typeof user.childId === "object";
  return {
    id:         user._id,
    name:       user.name,
    role:       user.role,
    email:      user.email      || null,
    phone:      user.phone      || null,
    avatar:     user.avatar     || null,
    childId:    hasChildData ? user.childId._id   : (user.childId    || null),
    childName:  hasChildData ? user.childId.name  : (user.childName  || null),
    childClass: hasChildData ? user.childId.class : (user.childClass || null),
  };
};

// ── Safe school shape ─────────────────────────────────────────────────────────
const schoolShape = (school) => ({
  _id:     school._id,
  name:    school.name,
  address: school.address || "",
  phone:   school.phone   || "",
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/auth/school — Returns the single school info (used by login page)
// ════════════════════════════════════════════════════════════════════════════════
exports.getSchool = async (req, res) => {
  try {
    const school = await School.findOne().lean();
    if (!school) {
      return res.status(404).json({ success: false, message: "School not configured. Contact your administrator." });
    }
    res.json({ success: true, school: schoolShape(school) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login — Admin / Teacher email + password login
// ════════════════════════════════════════════════════════════════════════════════
exports.adminTeacherLogin = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    if (!["admin", "teacher"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role for this login method." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), role }).select("+passwordHash");

    const INVALID_CREDS = { success: false, message: "Incorrect email or password." };
    if (!user || !user.passwordHash) return res.status(401).json(INVALID_CREDS);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json(INVALID_CREDS);

    if (user.isDisabled) {
      return res.status(403).json({ success: false, message: "Your account has been disabled. Contact the school administrator." });
    }

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const school = await School.findOne().lean();

    res.json({
      success: true,
      token:   signToken(user),
      user:    userShape(user),
      school:  school ? schoolShape(school) : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/auth/parent/send-otp — Send OTP to parent's mobile number
// ════════════════════════════════════════════════════════════════════════════════
exports.parentSendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required." });
    }

    if (!/^(98|97|96)\d{8}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Enter a valid Nepali mobile number." });
    }

    const user = await User.findOne({ phone, role: "parent" }).select("+otpHash +otpExpiry");

    if (!user) {
      return res.status(400).json({ success: false, message: "No parent account found with this phone number." });
    }

    const otpPlain  = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash   = await bcrypt.hash(otpPlain, 10);
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    user.otpHash   = otpHash;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Sparrow SMS integration can be enabled here in production.
    // For now, OTP is printed to console for dev/testing.
    console.log(`DEV OTP for +977-${phone}: ${otpPlain}`);

    res.json({
      success:  true,
      message:  `OTP generated for +977-${phone}. Check the backend console.`,
      demoOtp:  process.env.NODE_ENV !== "production" ? otpPlain : undefined,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/auth/parent/verify-otp — Verify OTP and log parent in
// ════════════════════════════════════════════════════════════════════════════════
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: "Phone and OTP are required." });
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "OTP must be exactly 6 digits." });
    }

    const user = await User.findOne({ phone, role: "parent" }).select("+otpHash +otpExpiry");

    if (!user || !user.otpHash) {
      return res.status(401).json({ success: false, message: "Invalid OTP. Please request a new one." });
    }

    if (new Date() > user.otpExpiry) {
      user.otpHash   = undefined;
      user.otpExpiry = undefined;
      await user.save();
      return res.status(401).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    const valid = await bcrypt.compare(otp, user.otpHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Incorrect OTP. Please try again." });
    }

    user.otpHash   = undefined;
    user.otpExpiry = undefined;
    user.lastLogin = new Date();
    await user.save();

    const populatedUser = await User.findById(user._id).populate("childId", "name class rollNo").lean();
    const school        = await School.findOne().lean();

    res.json({
      success: true,
      token:   signToken(user),
      user:    userShape(populatedUser),
      school:  school ? schoolShape(school) : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Verification failed. Please try again." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/auth/parent/login — Parent password login
// ════════════════════════════════════════════════════════════════════════════════
exports.parentsLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: "Phone and password are required." });
    }

    const user    = await User.findOne({ phone, role: "parent" }).select("+passwordHash");
    const INVALID = { success: false, message: "Incorrect phone number or password." };

    if (!user || !user.passwordHash) return res.status(401).json(INVALID);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json(INVALID);

    if (user.isDisabled) {
      return res.status(403).json({ success: false, message: "Your account has been disabled. Contact the school administrator." });
    }

    user.lastLogin = new Date();
    await user.save();

    const populatedUser = await User.findById(user._id).populate("childId", "name class rollNo").lean();
    const school        = await School.findOne().lean();

    res.json({
      success: true,
      token:   signToken(user),
      user:    userShape(populatedUser),
      school:  school ? schoolShape(school) : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/auth/me — Restore session from JWT
// ════════════════════════════════════════════════════════════════════════════════
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate("childId", "name class rollNo").lean();

    if (!user)          return res.status(401).json({ success: false, message: "User no longer exists." });
    if (user.isDisabled) return res.status(403).json({ success: false, message: "Account disabled." });

    const school = await School.findOne().lean();

    res.json({
      success: true,
      user:    userShape(user),
      school:  school ? schoolShape(school) : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to restore session." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/auth/logout
// ════════════════════════════════════════════════════════════════════════════════
exports.logout = (_req, res) => {
  res.json({ success: true, message: "Logged out successfully." });
};
