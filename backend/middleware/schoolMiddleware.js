// backend/middleware/schoolMiddleware.js
//
// PURPOSE:
// Resolves the school ObjectId from the x-school-domain request header
// and attaches it to req.school. Applied globally to all /api/* routes
// except auth and health (see server.js exemption list).
//
// MULTI-TENANCY CONTRACT:
// Every MongoDB query in every controller MUST include { school: req.school._id }
// as a filter condition. This is what prevents School A from ever reading
// School B's data. The middleware enforces the header is present;
// controllers enforce it is used in queries.
//
// PERFORMANCE:
// Uses a simple in-process LRU cache (Map with max size) so repeated requests
// for the same school don't hit MongoDB on every call. Cache is invalidated
// when the school document is updated (controllers call clearSchoolCache).

const { School } = require("../models");

// ── Simple in-process cache: slug → school document ──────────────────────────
// Max 200 entries — enough for any realistic multi-tenant deployment at this scale.
// TTL: 5 minutes — school config rarely changes during a session.
const MAX_CACHE_SIZE = 200;
const CACHE_TTL_MS   = 5 * 60 * 1000; // 5 minutes

const schoolCache = new Map(); // key: slug, value: { school, cachedAt }

// ── Cache helpers ─────────────────────────────────────────────────────────────
function getCached(slug) {
  const entry = schoolCache.get(slug);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    schoolCache.delete(slug); // expired
    return null;
  }
  return entry.school;
}

function setCache(slug, school) {
  // Evict oldest entry if at capacity (simple LRU approximation)
  if (schoolCache.size >= MAX_CACHE_SIZE) {
    const firstKey = schoolCache.keys().next().value;
    schoolCache.delete(firstKey);
  }
  schoolCache.set(slug, { school, cachedAt: Date.now() });
}

// Called by settings controller when school data changes
function clearSchoolCache(slug) {
  if (slug) {
    schoolCache.delete(slug.toLowerCase());
  } else {
    schoolCache.clear(); // clear all (admin operation)
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// schoolMiddleware — main exported middleware function
//
// Flow:
//   1. Read x-school-domain header
//   2. Validate format
//   3. Check cache
//   4. Query DB if not cached
//   5. Attach school to req.school
//   6. next()
// ════════════════════════════════════════════════════════════════════════════════
const schoolMiddleware = async (req, res, next) => {
  try {
    const rawDomain = req.headers["x-school-domain"];

    // Header is required for all scoped routes
    if (!rawDomain) {
      return res.status(400).json({
        success: false,
        message: "x-school-domain header is required.",
        code:    "MISSING_SCHOOL_DOMAIN",
      });
    }

    const slug = rawDomain.toLowerCase().trim();

    // Basic format validation — prevents DB query on obviously invalid input
    if (!/^[a-z0-9-]{2,50}$/.test(slug)) {
      return res.status(400).json({
        success: false,
        message: "Invalid school domain format.",
        code:    "INVALID_SCHOOL_DOMAIN",
      });
    }

    // Try cache first
    let school = getCached(slug);

    // Cache miss — query database
    if (!school) {
      school = await School.findOne({ domain: slug })
        .select("_id name domain address phone isActive")
        .lean(); // lean() returns plain JS object — faster, less memory

      if (!school) {
        return res.status(404).json({
          success: false,
          message: "School not found. Check your school domain.",
          code:    "SCHOOL_NOT_FOUND",
        });
      }

      // Check if school account is active
      if (school.isActive === false) {
        return res.status(403).json({
          success: false,
          message: "This school account is currently inactive. Contact support.",
          code:    "SCHOOL_INACTIVE",
        });
      }

      setCache(slug, school);
    }

    // Attach to request — controllers use req.school._id for all queries
    req.school = school;

    // Cross-check with JWT if user is already authenticated
    // This prevents a logged-in user from accessing a different school
    // by changing the x-school-domain header manually
    if (req.user && req.user.schoolId) {
      if (req.user.schoolId.toString() !== school._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this school.",
          code:    "SCHOOL_MISMATCH",
        });
      }
    }

    next();
  } catch (err) {
    // Log server-side but never leak details to client
    console.error("[school middleware]", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve school. Please try again.",
    });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// requireSameSchool — route-level guard for user-specific operations
//
// Use on routes where a user is modifying their own data or accessing
// data tied to a specific schoolId in the request body/params.
//
// Usage:
//   router.put("/teachers/:id", protect, requireSameSchool, handler)
// ════════════════════════════════════════════════════════════════════════════════
const requireSameSchool = (req, res, next) => {
  if (!req.school || !req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication and school context required.",
    });
  }

  if (req.user.schoolId.toString() !== req.school._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Cross-school access is not permitted.",
      code:    "CROSS_SCHOOL_ACCESS",
    });
  }

  next();
};

module.exports = {
  schoolMiddleware,
  requireSameSchool,
  clearSchoolCache,

  // Default export for server.js which does: require("./middleware/school")
  default: schoolMiddleware,
};

// Make the module callable directly:
// const schoolMiddleware = require("./middleware/school")
// app.use("/api", schoolMiddleware) — works because module.exports is also the fn
Object.assign(module.exports, schoolMiddleware);
module.exports = schoolMiddleware;
module.exports.schoolMiddleware  = schoolMiddleware;
module.exports.requireSameSchool = requireSameSchool;
module.exports.clearSchoolCache  = clearSchoolCache;