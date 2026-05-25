// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET is not set.");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// ── protect — verifies JWT and attaches decoded payload to req.user ───────────
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required. Please log in." });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication token is missing." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === "TokenExpiredError") {
        return res.status(401).json({ success: false, message: "Your session has expired. Please log in again.", code: "TOKEN_EXPIRED" });
      }
      return res.status(401).json({ success: false, message: "Invalid authentication token.", code: "TOKEN_INVALID" });
    }

    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({ success: false, message: "Malformed token. Please log in again.", code: "TOKEN_MALFORMED" });
    }

    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: "Authentication check failed." });
  }
};

// ── requireRole — role-based access control gate ─────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. This action requires: ${roles.join(" or ")} role.`,
    });
  }
  next();
};

const requireAdmin          = requireRole("admin");
const requireTeacherOrAdmin = requireRole("admin", "teacher");

module.exports = { authMiddleware, requireRole, requireAdmin, requireTeacherOrAdmin };
