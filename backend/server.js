// backend/server.js
const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const rateLimit  = require("express-rate-limit");
require("dotenv").config();
console.log("MONGO_URI:", process.env.MONGO_URI);

// ── Validate required environment variables on startup ──────────────────────
const REQUIRED_ENV = [
  "MONGO_URI",
  "JWT_SECRET",
  "CLIENT_URL",
  "SPARROW_SMS_TOKEN",    // OTP delivery — app cannot function without this
  "SPARROW_SMS_FROM",     // Sender ID registered with Sparrow SMS
];

// Warn about optional-but-recommended vars
const OPTIONAL_ENV = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "PORT"];
const missingOptional = OPTIONAL_ENV.filter((k) => !process.env[k]);
if (missingOptional.length > 0) {
  console.warn(`⚠️  Optional env vars not set: ${missingOptional.join(", ")} — some features may not work`);
}

const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const app = express();

// ── Security middleware ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'"],
        styleSrc:    ["'self'", "'unsafe-inline'"],
        imgSrc:      ["'self'", "data:", "https:"],
        connectSrc:  ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // needed if embedding Google fonts etc.
  })
);

// ── CORS ─────────────────────────────────────────────────────────────────────
// In production only the known frontend origin is allowed.
// In development, allow localhost on any port.
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:3000", "http://localhost:3001"]
    : []),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow non-browser requests
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-school-domain"],
  })
);

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ── Rate limiters ─────────────────────────────────────────────────────────────

// General API limiter — prevents brute force on login endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});
app.use("/api/", generalLimiter);

// OTP-specific limiter — PRD spec: max 3 per 10 minutes per IP
// FIXED: correct paths matching the auth router structure
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: { success: false, message: "Too many OTP requests. Please wait 10 minutes before trying again." },
});
// FIXED: use correct paths that match the auth router
app.use("/api/auth/parent/send-otp",   otpLimiter);
app.use("/api/auth/parent/verify-otp", otpLimiter);

// Login brute-force limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many failed login attempts. Please try again in 15 minutes." },
});
app.use("/api/auth/login",          loginLimiter);
app.use("/api/auth/parent/login",   loginLimiter);

// ── School resolution middleware ───────────────────────────────────────────────
// Applied to all /api/* routes EXCEPT auth routes (which bootstrap the session)
const schoolMiddleware = require("./middleware/school");

// FIXED: explicit path list instead of fragile string replacement
const UNSCOPED_PREFIXES = ["/auth", "/health", "/search"];

app.use("/api", (req, res, next) => {
  const isUnscoped = UNSCOPED_PREFIXES.some((prefix) =>
    req.path === prefix || req.path.startsWith(prefix + "/")
  );
  if (isUnscoped) return next();
  return schoolMiddleware(req, res, next);
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",       require("./routes/auth"));
app.use("/api/students",   require("./routes/students"));
app.use("/api/teachers",   require("./routes/teachers"));
app.use("/api/homework",   require("./routes/homework"));
app.use("/api/notices",    require("./routes/notices"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/results",    require("./routes/results"));
app.use("/api/fees",       require("./routes/fees"));
app.use("/api/messages",   require("./routes/messages"));
app.use("/api/routine",    require("./routes/routine"));
app.use("/api/calendar",   require("./routes/calendar"));
// app.use("/api/settings",   require("./routes/settings"));   // ADDED
// app.use("/api/dashboard",  require("./routes/dashboard"));  // ADDED
// app.use("/api/search",     require("./routes/search"));     // ADDED

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({
    status:    "ok",
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV || "development",
  })
);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
// Must have exactly 4 parameters to be recognised as error middleware by Express
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;

  // Structured server-side logging (swap for winston/pino in production)
  if (process.env.NODE_ENV !== "test") {
    console.error(JSON.stringify({
      ts:     new Date().toISOString(),
      method: req.method,
      path:   req.originalUrl,
      status: statusCode,
      error:  err.message,
      // Stack only in development
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    }));
  }

  // Never expose stack traces or internal messages to the client in production
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "A server error occurred. Please try again."
      : err.message,
  });
});

// ── Database connection + server start ───────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.info("✅ MongoDB connected");
    const PORT = parseInt(process.env.PORT, 10) || 5000;
    app.listen(PORT, () =>
      console.info(`🚀 SikshyaSanjal backend running on port ${PORT} [${process.env.NODE_ENV || "development"}]`)
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = app;