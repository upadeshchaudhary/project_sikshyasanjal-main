// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

// ── FIXED: never fall back to a hardcoded secret ──────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET is not set. Cannot start auth middleware.");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// ════════════════════════════════════════════════════════════════════════════════
// protect — verifies JWT and attaches decoded payload to req.user
//
// What it does:
//   1. Extracts Bearer token from Authorization header
//   2. Verifies signature + expiry
//   3. Attaches { userId, role, schoolId } to req.user
//   4. Does NOT hit the database — uses the JWT payload directly
//      (JWT payload includes role + schoolId from the fixed signToken)
//
// Why no DB lookup here:
//   - The JWT is cryptographically signed — if it's valid, the payload is trusted
//   - schoolId in the JWT was set at login time from the real School document
//   - DB lookup happens in individual route handlers when full user data is needed
//   - school.js middleware separately resolves req.school for scoped queries
// ════════════════════════════════════════════════════════════════════════════════
const authMiddleware = (req, res, next) => {
  try {
    // Extract token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing.",
      });
    }

    // Verify signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      // Distinguish expired from invalid for better UX
      if (jwtErr.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Your session has expired. Please log in again.",
          code:    "TOKEN_EXPIRED",
        });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
        code:    "TOKEN_INVALID",
      });
    }

    // Validate payload shape — ensure token was signed by our signToken function
    if (!decoded.userId || !decoded.role || !decoded.schoolId) {
      return res.status(401).json({
        success: false,
        message: "Malformed token. Please log in again.",
        code:    "TOKEN_MALFORMED",
      });
    }

    // Attach decoded payload — routes use req.user.userId, req.user.role, req.user.schoolId
    req.user = {
      userId:   decoded.userId,
      role:     decoded.role,
      schoolId: decoded.schoolId,
    };

    next();
  } catch (err) {
    // Catch-all for unexpected errors
    return res.status(500).json({
      success: false,
      message: "Authentication check failed.",
    });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// requireRole — role-based access control gate
//
// Usage: router.delete("/notices/:id", protect, requireRole("admin", "teacher"), handler)
//
// Must always be chained AFTER protect — never used alone.
// Crashes safely if req.user is missing (returns 401 not 500).
// ════════════════════════════════════════════════════════════════════════════════
const requireRole = (...roles) => (req, res, next) => {
  // Guard: protect must run before requireRole
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. This action requires: ${roles.join(" or ")} role.`,
    });
  }

  next();
};

// ════════════════════════════════════════════════════════════════════════════════
// requireAdmin — shorthand for requireRole("admin")
// requireTeacherOrAdmin — shorthand for requireRole("admin", "teacher")
// ════════════════════════════════════════════════════════════════════════════════
const requireAdmin          = requireRole("admin");
const requireTeacherOrAdmin = requireRole("admin", "teacher");

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// Named exports — all route files should destructure:
//   const { authMiddleware, requireRole, requireAdmin, requireTeacherOrAdmin } = require("../middleware/authMiddleware");
// ════════════════════════════════════════════════════════════════════════════════
module.exports = {
  authMiddleware,
  requireRole,
  requireAdmin,
  requireTeacherOrAdmin,
};