import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";

// ─── Role definitions ─────────────────────────────────────────────────────────
const ROLES = [
  {
    key: "admin",
    label: "School Administrator",
    sub: "Manage your entire school",
    color: "#1E3FF2",
    bg: "#EEF1FD",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    key: "teacher",
    label: "Teacher",
    sub: "Manage classes & students",
    color: "#0F6E56",
    bg: "#E1F5EE",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
        <path d="M7 8h10M7 12h6"/>
      </svg>
    ),
  },
  {
    key: "parent",
    label: "Parent / Guardian",
    sub: "Track your child's progress",
    color: "#6D28D9",
    bg: "#EDE9FE",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="3"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <circle cx="19" cy="11" r="2"/>
        <path d="M21 21v-1a2 2 0 0 0-2-2h-1"/>
      </svg>
    ),
  },
];

// ─── Validation helpers ───────────────────────────────────────────────────────
const isValidEmail  = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidPhone  = (v) => /^(98|97|96)\d{8}$/.test(v.trim());
const isValidDomain = (v) => /^[a-z0-9-]{2,50}$/.test(v.trim().toLowerCase());

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate        = useNavigate();
  const { login }       = useApp();

  const [step,          setStep]         = useState("domain"); // "domain" | "role" | "form"
  const [schoolSlug,    setSchoolSlug]   = useState("");
  const [schoolInfo,    setSchoolInfo]   = useState(null);    // { name, slug, _id }
  const [selectedRole,  setSelectedRole] = useState(null);
  const [email,         setEmail]        = useState("");
  const [password,      setPassword]     = useState("");
  const [phone,         setPhone]        = useState("");
  const [otp,           setOtp]          = useState("");
  const [showPass,      setShowPass]     = useState(false);
  const [parentMode,    setParentMode]   = useState("otp");   // PRD: OTP first
  const [otpSent,       setOtpSent]      = useState(false);
  const [otpToken,      setOtpToken]     = useState("");      // server token to verify OTP
  const [loading,       setLoading]      = useState(false);
  const [errors,        setErrors]       = useState({});      // field-level errors
  const [otpCountdown,  setOtpCountdown] = useState(0);       // resend timer

  const activeRole = ROLES.find((r) => r.key === selectedRole);

  // ── OTP countdown timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setTimeout(() => setOtpCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCountdown]);

  // ── Reset form when going back ─────────────────────────────────────────────
  function goBackToRole() {
    setStep("role");
    setSelectedRole(null);
    setEmail(""); setPassword(""); setPhone(""); setOtp("");
    setOtpSent(false); setOtpToken(""); setErrors({});
  }

  function goBackToDomain() {
    setStep("domain");
    setSchoolSlug(""); setSchoolInfo(null);
    goBackToRole();
  }

  // ── Step 1: Verify school domain ──────────────────────────────────────────
  async function handleVerifyDomain() {
    const slug = schoolSlug.trim().toLowerCase();
    if (!slug) return setErrors({ slug: "Enter your school's domain" });
    if (!isValidDomain(slug)) return setErrors({ slug: "Domain can only contain letters, numbers, and hyphens" });

    setLoading(true);
    setErrors({});
    try {
      const { data } = await axios.get(`/api/auth/school/${slug}`);
      setSchoolInfo(data.school);
      setStep("role");
    } catch (err) {
      const msg = err.response?.data?.message || "School not found. Check your domain.";
      setErrors({ slug: msg });
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3a: Send OTP ─────────────────────────────────────────────────────
  async function handleSendOtp() {
    const errs = {};
    if (!isValidPhone(phone)) errs.phone = "Enter a valid Nepali mobile number (starts with 98/97/96)";
    if (Object.keys(errs).length) return setErrors(errs);

    setLoading(true);
    setErrors({});
    try {
      const { data } = await axios.post(
        "/api/auth/parent/send-otp",
        { phone },
        { headers: { "x-school-domain": schoolInfo.slug } }
      );
      setOtpToken(data.otpToken); // server returns a token to verify against
      setOtpSent(true);
      setOtpCountdown(300); // 5 minutes
      toast.success(`OTP sent to +977-${phone}`);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send OTP. Try again.";
      if (err.response?.status === 429) {
        toast.error("Too many OTP requests. Wait 10 minutes before trying again.");
      } else {
        setErrors({ phone: msg });
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3b: Submit login ─────────────────────────────────────────────────
  async function handleSubmit() {
    const errs = {};
    setErrors({});

    if (selectedRole === "parent") {
      if (!isValidPhone(phone)) errs.phone = "Enter a valid Nepali mobile number";
      if (parentMode === "otp") {
        if (!otpSent)             errs.otp = "Send OTP first";
        else if (otp.length < 6)  errs.otp = "Enter the 6-digit OTP";
      } else {
        if (!password)            errs.password = "Password is required";
      }
    } else {
      if (!isValidEmail(email))   errs.email = "Enter a valid email address";
      if (!password)              errs.password = "Password is required";
    }

    if (Object.keys(errs).length) return setErrors(errs);

    setLoading(true);
    try {
      let res;

      if (selectedRole === "parent") {
        if (parentMode === "otp") {
          res = await axios.post(
            "/api/auth/parent/verify-otp",
            { phone, otp, otpToken },
            { headers: { "x-school-domain": schoolInfo.slug } }
          );
        } else {
          res = await axios.post(
            "/api/auth/parent/login",
            { phone, password },
            { headers: { "x-school-domain": schoolInfo.slug } }
          );
        }
      } else {
        // Admin & Teacher use email + password (Google OAuth handled separately)
        res = await axios.post(
          "/api/auth/login",
          { email, password, role: selectedRole },
          { headers: { "x-school-domain": schoolInfo.slug } }
        );
      }

      const { token, user, school } = res.data;
      login(token, user, school);        // ← correct 3-arg signature
      toast.success(`Welcome back, ${user.name}!`);
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed. Check your credentials.";
      if (err.response?.status === 401) {
        setErrors({ general: "Incorrect credentials. Please try again." });
      } else if (err.response?.status === 403) {
        setErrors({ general: "Your account has been disabled. Contact the administrator." });
      } else {
        setErrors({ general: msg });
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  function handleGoogleLogin() {
    if (!schoolInfo) return;
    // Redirect to backend Google OAuth with school slug as state
    window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/google?school=${schoolInfo.slug}&role=${selectedRole}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.bgBlob1} />
      <div style={s.bgBlob2} />

      {/* Brand */}
      <div style={s.brand}>
        <div style={s.brandIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E3FF2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
        <span style={s.brandName}>SikshyaSanjal</span>
      </div>

      {/* Progress indicator */}
      <div style={s.progressWrap}>
        {["domain", "role", "form"].map((st, i) => (
          <div key={st} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              ...s.progressDot,
              background: ["domain","role","form"].indexOf(step) >= i ? "#1E3FF2" : "#E2E8F0",
            }} />
            {i < 2 && <div style={{ ...s.progressLine, background: ["domain","role","form"].indexOf(step) > i ? "#1E3FF2" : "#E2E8F0" }} />}
          </div>
        ))}
        <span style={s.progressLabel}>
          {step === "domain" ? "Find your school" : step === "role" ? "Select role" : "Sign in"}
        </span>
      </div>

      {/* Auth card */}
      <div style={s.card}>

        {/* ── STEP 1: School domain ── */}
        {step === "domain" && (
          <DomainStep
            slug={schoolSlug}
            setSlug={setSchoolSlug}
            error={errors.slug}
            loading={loading}
            onSubmit={handleVerifyDomain}
          />
        )}

        {/* ── STEP 2: Role selection ── */}
        {step === "role" && (
          <RoleStep
            school={schoolInfo}
            onSelect={(key) => { setSelectedRole(key); setStep("form"); }}
            onBack={goBackToDomain}
          />
        )}

        {/* ── STEP 3: Login form ── */}
        {step === "form" && activeRole && (
          <FormStep
            role={activeRole}
            schoolInfo={schoolInfo}
            parentMode={parentMode}   setParentMode={setParentMode}
            otpSent={otpSent}         otpCountdown={otpCountdown}
            email={email}             setEmail={setEmail}
            password={password}       setPassword={setPassword}
            showPass={showPass}       setShowPass={setShowPass}
            phone={phone}             setPhone={setPhone}
            otp={otp}                 setOtp={setOtp}
            loading={loading}
            errors={errors}
            onBack={goBackToRole}
            onSendOtp={handleSendOtp}
            onResendOtp={() => { setOtpSent(false); setOtp(""); setOtpToken(""); setErrors({}); }}
            onSubmit={handleSubmit}
            onGoogleLogin={handleGoogleLogin}
          />
        )}
      </div>

      <p style={s.footer}>
        © {new Date().getFullYear()} SikshyaSanjal · Built for Nepali Schools · CCT Dharan
      </p>
    </div>
  );
}

// ── Step 1: Domain Input ───────────────────────────────────────────────────────
function DomainStep({ slug, setSlug, error, loading, onSubmit }) {
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🏫</div>
        <h1 style={s.heading}>Find your school</h1>
        <p style={s.subheading}>Enter your school's unique domain to get started</p>
      </div>

      <div style={s.fieldGroup}>
        <label style={s.label}>School Domain</label>
        <div style={{ ...s.inputWrap, borderColor: error ? "#EF4444" : "#E8EAED" }}>
          <span style={{ ...s.inputIconWrap, fontSize: 12, color: "#9CA3AF", fontFamily: "'JetBrains Mono',monospace" }}>
            app/
          </span>
          <input
            style={{ ...s.input, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 0.5 }}
            type="text"
            placeholder="your-school-name"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            autoFocus
          />
          <span style={{ ...s.inputIconWrap, fontSize: 12, color: "#9CA3AF", fontFamily: "'JetBrains Mono',monospace", borderLeft: "1px solid #E8EAED", paddingLeft: 10 }}>
            .sikshyasanjal
          </span>
        </div>
        {error && <p style={s.fieldError}>{error}</p>}
        <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>
          Contact your school administrator if you don't know your school's domain.
        </p>
      </div>

      <ActionButton color="#1E3FF2" loading={loading} onClick={onSubmit}>
        Find School →
      </ActionButton>
    </div>
  );
}

// ── Step 2: Role Selector ─────────────────────────────────────────────────────
function RoleStep({ school, onSelect, onBack }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div>
      <button onClick={onBack} style={s.backBtn} aria-label="Go back">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>

      {school && (
        <div style={s.schoolBadge}>
          <span style={{ fontSize: 16 }}>🏫</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1E3FF2" }}>{school.name}</span>
        </div>
      )}

      <h1 style={{ ...s.heading, marginBottom: 4, marginTop: 12 }}>Welcome back</h1>
      <p style={{ ...s.subheading, marginBottom: 20 }}>Select your role to continue</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ROLES.map((role) => (
          <button
            key={role.key}
            onClick={() => onSelect(role.key)}
            onMouseEnter={() => setHovered(role.key)}
            onMouseLeave={() => setHovered(null)}
            style={{
              ...s.roleCard,
              border: hovered === role.key ? `1.5px solid ${role.color}` : "1.5px solid #E8EAED",
              background: hovered === role.key ? role.bg : "#FAFAFA",
              transform: hovered === role.key ? "translateX(4px)" : "translateX(0)",
            }}
          >
            <div style={{ ...s.roleIcon, color: role.color, background: role.bg }}>{role.icon}</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: hovered === role.key ? role.color : "#1A1A2E" }}>
                {role.label}
              </div>
              <div style={{ fontSize: 12, color: "#8B8FA8" }}>{role.sub}</div>
            </div>
            <div style={{ marginLeft: "auto", color: hovered === role.key ? role.color : "#C0C4CC" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 3: Login Form ────────────────────────────────────────────────────────
function FormStep({
  role, schoolInfo,
  parentMode, setParentMode,
  otpSent, otpCountdown,
  email, setEmail,
  password, setPassword,
  showPass, setShowPass,
  phone, setPhone,
  otp, setOtp,
  loading, errors,
  onBack, onSendOtp, onResendOtp, onSubmit, onGoogleLogin,
}) {
  const isParent = role.key === "parent";

  return (
    <div>
      {/* Back + role badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button onClick={onBack} style={s.backBtn} aria-label="Go back">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div style={{ ...s.roleIcon, color: role.color, background: role.bg, width: 36, height: 36, borderRadius: 10 }}>
          {role.icon}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1A2E" }}>{role.label}</div>
          {schoolInfo && <div style={{ fontSize: 11, color: "#1E3FF2", fontWeight: 600 }}>{schoolInfo.name}</div>}
        </div>
      </div>

      <h1 style={{ ...s.heading, fontSize: 22, marginBottom: 4 }}>Sign in</h1>
      <p style={{ ...s.subheading, marginBottom: 18 }}>
        {isParent ? "Track your child's academic journey" : "Access your school dashboard"}
      </p>

      {/* General error */}
      {errors.general && (
        <div style={s.errorBanner}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {errors.general}
        </div>
      )}

      {/* Parent mode toggle */}
      {isParent && (
        <div style={s.toggleRow}>
          <button
            onClick={() => setParentMode("otp")}
            style={{ ...s.toggleBtn, ...(parentMode === "otp" ? s.toggleActive(role.color) : {}) }}
          >
            📱 Phone OTP
          </button>
          <button
            onClick={() => setParentMode("password")}
            style={{ ...s.toggleBtn, ...(parentMode === "password" ? s.toggleActive(role.color) : {}) }}
          >
            🔑 Password
          </button>
        </div>
      )}

      {/* Email */}
      {!isParent && (
        <Field label="Email Address" error={errors.email}>
          <div style={{ ...s.inputWrap, borderColor: errors.email ? "#EF4444" : "#E8EAED" }}>
            <span style={s.inputIconWrap}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </span>
            <input
              style={s.input} type="email" placeholder="you@school.edu.np"
              value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              autoComplete="email"
            />
          </div>
        </Field>
      )}

      {/* Phone */}
      {isParent && (
        <Field label="Phone Number" error={errors.phone}>
          <div style={{ ...s.inputWrap, borderColor: errors.phone ? "#EF4444" : "#E8EAED" }}>
            <span style={{ ...s.inputIconWrap, fontSize: 12, color: "#374151", fontFamily: "'JetBrains Mono',monospace", borderRight: "1px solid #E8EAED", paddingRight: 10, marginRight: 4, fontWeight: 600 }}>
              +977
            </span>
            <input
              style={{ ...s.input, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}
              type="tel" placeholder="98XXXXXXXX" maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              autoComplete="tel"
            />
          </div>
        </Field>
      )}

      {/* Password */}
      {(!isParent || parentMode === "password") && (
        <Field label="Password" error={errors.password}>
          <div style={{ ...s.inputWrap, borderColor: errors.password ? "#EF4444" : "#E8EAED" }}>
            <span style={s.inputIconWrap}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              style={s.input}
              type={showPass ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              autoComplete="current-password"
            />
            <button onClick={() => setShowPass(!showPass)} style={s.eyeBtn} type="button" aria-label={showPass ? "Hide password" : "Show password"}>
              {showPass
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
        </Field>
      )}

      {/* OTP flow */}
      {isParent && parentMode === "otp" && (
        <>
          {!otpSent ? (
            <ActionButton color={role.color} loading={loading} onClick={onSendOtp}>
              Send OTP via SMS
            </ActionButton>
          ) : (
            <>
              <Field label="OTP Code" error={errors.otp}>
                <div style={{ ...s.inputWrap, borderColor: errors.otp ? "#EF4444" : "#E8EAED" }}>
                  <span style={s.inputIconWrap}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    style={{ ...s.input, letterSpacing: 10, fontFamily: "'JetBrains Mono',monospace", fontSize: 16 }}
                    type="text" inputMode="numeric" placeholder="• • • • • •" maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                    autoFocus
                  />
                </div>
                <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 5 }}>
                  {otpCountdown > 0
                    ? `OTP expires in ${Math.floor(otpCountdown / 60)}:${String(otpCountdown % 60).padStart(2, "0")}`
                    : "OTP expired"
                  } · Check your SMS
                </p>
              </Field>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                <ActionButton color={role.color} loading={loading} onClick={onSubmit}>
                  Verify & Sign In
                </ActionButton>
                <button
                  style={s.ghostBtn}
                  onClick={onResendOtp}
                  disabled={otpCountdown > 270} // allow resend after 30 seconds
                >
                  {otpCountdown > 270 ? `Resend in ${otpCountdown - 270}s` : "Resend OTP"}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Password submit */}
      {(!isParent || parentMode === "password") && (
        <div style={{ marginTop: 16 }}>
          <ActionButton color={role.color} loading={loading} onClick={onSubmit}>
            Sign In
          </ActionButton>
        </div>
      )}

      {/* Google OAuth */}
      {!isParent && (
        <>
          <div style={s.divider}>
            <div style={s.dividerLine} />
            <span style={s.dividerText}>or</span>
            <div style={s.dividerLine} />
          </div>
          <button style={s.googleBtn} onClick={onGoogleLogin} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </>
      )}
    </div>
  );
}

// ── Shared field wrapper ──────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div style={s.fieldGroup}>
      <label style={s.label}>{label}</label>
      {children}
      {error && <p style={s.fieldError}>{error}</p>}
    </div>
  );
}

// ── Shared action button ──────────────────────────────────────────────────────
function ActionButton({ color, loading, onClick, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      type="button"
      style={{
        ...s.primaryBtn,
        background: (loading || disabled) ? "#9CA3AF" : color,
        cursor: (loading || disabled) ? "not-allowed" : "pointer",
        opacity: disabled && !loading ? 0.6 : 1,
      }}
    >
      {loading ? (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={s.spinner} />
          Processing…
        </span>
      ) : children}
    </button>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #F0F4FF 0%, #F7F5FF 50%, #EEF9F7 100%)",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "24px 16px 32px",
    position: "relative", overflow: "hidden",
    fontFamily: "'Sora', sans-serif",
  },
  bgBlob1: {
    position: "absolute", width: 500, height: 500, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(30,63,242,0.07) 0%, transparent 70%)",
    top: -160, right: -160, pointerEvents: "none",
  },
  bgBlob2: {
    position: "absolute", width: 360, height: 360, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(109,40,217,0.05) 0%, transparent 70%)",
    bottom: -100, left: -100, pointerEvents: "none",
  },
  brand: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  brandIcon: {
    width: 38, height: 38, borderRadius: 11,
    background: "#EEF1FD", border: "1px solid rgba(30,63,242,0.15)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  brandName: { fontFamily: "'DM Serif Display', serif", fontSize: 21, color: "#1A1A2E", letterSpacing: "-0.3px" },

  progressWrap: { display: "flex", alignItems: "center", gap: 4, marginBottom: 14 },
  progressDot: { width: 8, height: 8, borderRadius: "50%", transition: "background 0.3s" },
  progressLine: { width: 24, height: 2, borderRadius: 2, transition: "background 0.3s" },
  progressLabel: { fontSize: 11, color: "#9CA3AF", marginLeft: 8, fontWeight: 500 },

  card: {
    background: "#FFFFFF", borderRadius: 20,
    padding: "28px 26px", width: "100%", maxWidth: 420,
    boxShadow: "0 4px 32px rgba(30,63,242,0.08), 0 1px 0 rgba(0,0,0,0.04)",
    border: "1px solid #E8EAED",
  },
  schoolBadge: {
    display: "inline-flex", alignItems: "center", gap: 8,
    background: "#EEF1FD", border: "1px solid rgba(30,63,242,0.2)",
    borderRadius: 8, padding: "6px 12px", marginBottom: 4,
  },
  heading: { fontFamily: "'DM Serif Display', serif", fontSize: 26, color: "#1A1A2E", margin: "0 0 8px", letterSpacing: "-0.3px" },
  subheading: { fontSize: 13, color: "#8B8FA8", margin: 0 },
  roleCard: {
    display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
    borderRadius: 13, cursor: "pointer", transition: "all 0.18s ease",
    background: "none", width: "100%", border: "1.5px solid #E8EAED",
  },
  roleIcon: { width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  backBtn: {
    width: 32, height: 32, borderRadius: 9, border: "1.5px solid #E8EAED",
    background: "none", cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", color: "#6B7280", flexShrink: 0,
  },
  toggleRow: { display: "flex", background: "#F4F4F8", borderRadius: 10, padding: 3, marginBottom: 16, gap: 3 },
  toggleBtn: {
    flex: 1, padding: "8px 0", border: "none", borderRadius: 8,
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    background: "transparent", color: "#8B8FA8", transition: "all 0.18s",
    fontFamily: "'Sora', sans-serif",
  },
  toggleActive: (color) => ({ background: "#FFFFFF", color, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }),
  fieldGroup: { marginBottom: 14 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 },
  inputWrap: {
    display: "flex", alignItems: "center",
    border: "1.5px solid #E8EAED", borderRadius: 10,
    background: "#FAFAFA", overflow: "hidden", transition: "border-color 0.15s",
  },
  inputIconWrap: { display: "flex", alignItems: "center", padding: "0 10px 0 12px", flexShrink: 0 },
  input: {
    flex: 1, border: "none", background: "transparent",
    padding: "11px 12px 11px 0", fontSize: 14, color: "#1A1A2E",
    outline: "none", fontFamily: "'Sora', sans-serif", minWidth: 0,
  },
  eyeBtn: { background: "none", border: "none", cursor: "pointer", padding: "0 12px", display: "flex", alignItems: "center" },
  fieldError: { fontSize: 11, color: "#EF4444", marginTop: 5, display: "flex", alignItems: "center", gap: 4 },
  errorBanner: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#FEF2F2", border: "1px solid #FECACA",
    borderRadius: 8, padding: "10px 12px", marginBottom: 14,
    fontSize: 12, color: "#DC2626", fontWeight: 500,
  },
  primaryBtn: {
    width: "100%", padding: "12px", borderRadius: 11, border: "none",
    color: "#FFFFFF", fontSize: 14, fontWeight: 700,
    fontFamily: "'Sora', sans-serif", letterSpacing: "0.2px",
    transition: "opacity 0.15s", display: "block",
  },
  ghostBtn: {
    width: "100%", padding: "10px", borderRadius: 11,
    border: "1.5px solid #E8EAED", background: "transparent",
    color: "#6B7280", fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'Sora', sans-serif",
  },
  divider: { display: "flex", alignItems: "center", gap: 10, margin: "16px 0 12px" },
  dividerLine: { flex: 1, height: 1, background: "#E8EAED" },
  dividerText: { fontSize: 12, color: "#B0B4C8" },
  googleBtn: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
    gap: 10, padding: "11px", borderRadius: 11, border: "1.5px solid #E8EAED",
    background: "#FAFAFA", fontSize: 13, fontWeight: 600,
    color: "#374151", cursor: "pointer", fontFamily: "'Sora', sans-serif",
  },
  spinner: {
    display: "inline-block", width: 14, height: 14,
    border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff",
    borderRadius: "50%", animation: "spin 0.7s linear infinite",
  },
  footer: { marginTop: 16, fontSize: 11, color: "#B0B4C8", textAlign: "center" },
};

if (typeof document !== "undefined" && !document.getElementById("ss-spin")) {
  const st = document.createElement("style");
  st.id = "ss-spin";
  st.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(st);
}