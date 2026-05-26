const express   = require("express");
const mongoose  = require("mongoose");
const cors      = require("cors");
const helmet    = require("helmet");
const morgan    = require("morgan");
const rateLimit = require("express-rate-limit");
const adminseeder = require("./adminSeeder");
require("dotenv").config();

// ── Validate required environment variables ───────────────────────────────────
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:3000", "http://localhost:3001"]
    : []),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Logging & body parsing ────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ── Rate limiters ─────────────────────────────────────────────────────────────
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many OTP requests. Please wait 10 minutes." },
});
app.use("/api/auth/parent/send-otp",   otpLimiter);
app.use("/api/auth/parent/verify-otp", otpLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." },
});
app.use("/api/auth/login",        loginLimiter);
app.use("/api/auth/parent/login", loginLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api", require("./routes/auth/authRoutes"));
app.use("/api", require("./routes/dashboard/dashboardRoutes"));
app.use("/api", require("./routes/students/studentsRoutes"));
app.use("/api", require("./routes/teachers/teachersRoutes"));
app.use("/api", require("./routes/attendance/attendanceRoutes"));
app.use("/api", require("./routes/calendar/calendarRoutes"));
app.use("/api", require("./routes/complain/complainRoutes"));
app.use("/api", require("./routes/fees/feesRoutes"));
app.use("/api", require("./routes/homework/homeworkRoutes"));
app.use("/api", require("./routes/messages/messagesRoutes"));
app.use("/api", require("./routes/notices/noticesRoutes"));
app.use("/api", require("./routes/results/resultsRoutes"));
app.use("/api", require("./routes/routine/routineRoutes"));
app.use("/api", require("./routes/search/searchRoutes"));
app.use("/api", require("./routes/settings/settingsRoutes"));
app.use("/api", require("./routes/enquiry/enquiryRoutes"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString(), env: process.env.NODE_ENV || "development" })
);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found" }));

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  if (process.env.NODE_ENV !== "test") {
    console.error(JSON.stringify({
      ts: new Date().toISOString(), method: req.method, path: req.originalUrl,
      status: statusCode, error: err.message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    }));
  }
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "A server error occurred. Please try again."
      : err.message,
  });
});

// ── Database + start ──────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(async () => {
    console.info("✅ MongoDB connected"); 
    await adminseeder(); 

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
