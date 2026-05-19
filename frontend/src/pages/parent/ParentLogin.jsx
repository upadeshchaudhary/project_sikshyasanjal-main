// ParentLogin.jsx - Parent-specific login flow with OTP and Password support
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";

// ─── Role definition ─────────────────────────────────────────────────────────
const ROLE = {
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
};

// ─── Validation helpers ───────────────────────────────────────────────────────
const isValidPhone  = (v) => /^(98|97|96)\d{8}$/.test(v.trim());
const isValidDomain = (v) => /^[a-z0-9-]{2,50}$/.test(v.trim().toLowerCase());

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function ParentLogin() {
  const navigate        = useNavigate();
  const { login, offline } = useApp();

  const [step,          setStep]         = useState("domain"); // "domain" | "form"
  const [schoolSlug,    setSchoolSlug]   = useState("");
  const [schoolInfo,    setSchoolInfo]   = useState(null);    // { name, slug, _id }
  const [phone,         setPhone]        = useState("");
  const [password,      setPassword]     = useState("");
  const [otp,           setOtp]          = useState("");
  const [showPass,      setShowPass]     = useState(false);
  const [parentMode,    setParentMode]   = useState("otp");   // OTP or Password
  const [otpSent,       setOtpSent]      = useState(false);
  const [otpToken,      setOtpToken]     = useState("");
  const [loading,       setLoading]      = useState(false);
  const [errors,        setErrors]       = useState({});
  const [otpCountdown,  setOtpCountdown] = useState(0);

  // ── OTP countdown timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setTimeout(() => setOtpCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCountdown]);

  // ── Step 1: Verify school domain ──────────────────────────────────────────
  async function handleVerifyDomain() {
    const slug = schoolSlug.trim().toLowerCase();
    if (!slug) return setErrors({ slug: "Enter your school's domain" });
    if (!isValidDomain(slug)) return setErrors({ slug: "Domain can only contain letters, numbers, and hyphens" });

    setLoading(true);
    setErrors({});
    try {
      const { data } = await axios.get(`/auth/school/${slug}`);
      setSchoolInfo(data.school);
      setStep("form");
    } catch (err) {
      const msg = err.response?.data?.message || "School not found. Check your domain.";
      if (!err.response) {
        setErrors({ slug: "Backend unreachable. Start the server and try again." });
      } else {
        setErrors({ slug: msg });
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2a: Send OTP ─────────────────────────────────────────────────────
  async function handleSendOtp() {
    const errs = {};
    if (!isValidPhone(phone)) errs.phone = "Enter a valid Nepali mobile number (starts with 98/97/96)";
    if (Object.keys(errs).length) return setErrors(errs);

    setLoading(true);
    setErrors({});
    try {
      const { data } = await axios.post(
        "/auth/parent/send-otp",
        { phone, domain: schoolInfo.slug },
        { headers: { "x-school-domain": schoolInfo.slug } }
      );
      setOtpToken(data.otpToken);
      setOtpSent(true);
      setOtpCountdown(300); // 5 minutes
      toast.success(data.message || `OTP generated for +977-${phone}`);
    } catch (err) {
      if (!err.response) {
        setErrors({ phone: "Backend unreachable. Please try again." });
      } else {
        const msg = err.response?.data?.message || "Failed to send OTP. Try again.";
        setErrors({ phone: msg });
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2c: Submit login ─────────────────────────────────────────────────
  async function handleSubmit() {
    const errs = {};
    setErrors({});

    if (!isValidPhone(phone)) errs.phone = "Enter a valid Nepali mobile number";
    if (parentMode === "otp") {
      if (!otpSent)             errs.otp = "Send OTP first";
      else if (otp.length < 6)  errs.otp = "Enter the 6-digit OTP";
    } else {
      if (!password)            errs.password = "Password is required";
    }

    if (Object.keys(errs).length) return setErrors(errs);

    setLoading(true);
    try {
      let res;
      if (parentMode === "otp") {
        res = await axios.post(
          "/auth/parent/verify-otp",
          { phone, otp, otpToken },
          { headers: { "x-school-domain": schoolInfo.slug } }
        );
      } else {
        res = await axios.post(
          "/auth/parent/login",
          { phone, password },
          { headers: { "x-school-domain": schoolInfo.slug } }
        );
      }

      const { token, user, school } = res.data;
      login(token, user, school);
      toast.success(`Welcome back, ${user.name}!`);
      navigate("/dashboard");
    } catch (err) {
      if (!err.response) {
        setErrors({ general: "Backend unreachable. Please try again." });
      } else {
        const msg = err.response?.data?.message || "Login failed. Check your credentials.";
        setErrors({ general: msg });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page" style={{ "--role-primary": ROLE.color, "--role-bg": ROLE.bg }}>
      <div className="auth-bg-blob-1" />
      <div className="auth-bg-blob-2" />

      {/* Brand */}
      <div className="auth-brand">
        <div className="auth-brand-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E3FF2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
        <span className="auth-brand-name">SikshyaSanjal</span>
      </div>
      {offline && (
        <div className="auth-offline-banner">
          Backend unavailable. The app can still load, but login and API actions require the backend.
        </div>
      )}

      {/* Progress indicator */}
      <div className="auth-progress-wrap">
        {["domain", "form"].map((st, i) => (
          <div key={st} className="auth-progress-step">
            <div className={`auth-progress-dot ${["domain","form"].indexOf(step) >= i ? 'active' : ''}`} />
            {i < 1 && <div className={`auth-progress-line ${["domain","form"].indexOf(step) > i ? 'active' : ''}`} />}
          </div>
        ))}
        <span className="auth-progress-label">
          {step === "domain" ? "Find your school" : "Sign in"}
        </span>
      </div>

      {/* Auth card */}
      <div className="auth-card">
        {step === "domain" ? (
          <DomainStep
            slug={schoolSlug}
            setSlug={setSchoolSlug}
            error={errors.slug}
            loading={loading}
            onSubmit={handleVerifyDomain}
          />
        ) : (
          <FormStep
            role={ROLE}
            schoolInfo={schoolInfo}
            parentMode={parentMode}   setParentMode={setParentMode}
            otpSent={otpSent}         otpCountdown={otpCountdown}
            password={password}       setPassword={setPassword}
            showPass={showPass}       setShowPass={setShowPass}
            phone={phone}             setPhone={setPhone}
            otp={otp}                 setOtp={setOtp}
            loading={loading}
            errors={errors}
            onBack={() => { setStep("domain"); setOtpSent(false); }}
            onSendOtp={handleSendOtp}
            onResendOtp={() => { setOtpSent(false); setOtp(""); setErrors({}); }}
            onSubmit={handleSubmit}
          />
        )}
      </div>

      <p className="auth-footer">
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
        <div style={{ fontSize: 36, marginBottom: 8 }}>🏡</div>
        <h1 className="auth-heading">Parent Portal</h1>
        <p className="auth-subheading">Enter your school's unique domain to get started</p>
      </div>

      <div className="auth-field-group">
        <label className="auth-label">School Domain</label>
        <div className="auth-input-wrap" style={{ borderColor: error ? "#EF4444" : "#E8EAED" }}>
          <input
            className="auth-input"
            style={{ fontFamily: "'JetBrains Mono',monospace", letterSpacing: 0.5, paddingLeft: 12 }}
            type="text"
            placeholder="your-school-name"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            autoFocus
          />
          <span className="auth-input-icon-wrap" style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "'JetBrains Mono',monospace", borderLeft: "1px solid #E8EAED", paddingLeft: 10 }}>
            .sikshyasanjal
          </span>
        </div>
        {error && <p className="auth-field-error">{error}</p>}
      </div>

      <ActionButton loading={loading} onClick={onSubmit}>
        Find School →
      </ActionButton>
    </div>
  );
}

// ── Step 2: Login Form ────────────────────────────────────────────────────────
function FormStep({
  role, schoolInfo,
  parentMode, setParentMode,
  otpSent, otpCountdown,
  password, setPassword,
  showPass, setShowPass,
  phone, setPhone,
  otp, setOtp,
  loading, errors,
  onBack, onSendOtp, onResendOtp, onSubmit,
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button onClick={onBack} className="auth-back-btn" aria-label="Go back">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div className="auth-role-icon">
          {role.icon}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1A2E" }}>{role.label}</div>
          {schoolInfo && <div style={{ fontSize: 11, color: "#1E3FF2", fontWeight: 600 }}>{schoolInfo.name}</div>}
        </div>
      </div>

      <h1 className="auth-heading" style={{ fontSize: 22 }}>Sign in</h1>
      <p className="auth-subheading" style={{ marginBottom: 18 }}>Track your child's academic journey</p>

      {errors.general && (
        <div className="auth-error-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {errors.general}
        </div>
      )}

      <div className="auth-toggle-row">
        <button
          onClick={() => setParentMode("otp")}
          className={`auth-toggle-btn ${parentMode === "otp" ? 'active' : ''}`}
        >
          📱 Phone OTP
        </button>
        <button
          onClick={() => setParentMode("password")}
          className={`auth-toggle-btn ${parentMode === "password" ? 'active' : ''}`}
        >
          🔑 Password
        </button>
      </div>

      <Field label="Phone Number" error={errors.phone}>
        <div className="auth-input-wrap" style={{ borderColor: errors.phone ? "#EF4444" : "#E8EAED" }}>
          <span className="auth-input-icon-wrap" style={{ fontSize: 12, color: "#374151", fontFamily: "'JetBrains Mono',monospace", borderRight: "1px solid #E8EAED", paddingRight: 10, marginRight: 4, fontWeight: 600 }}>
            +977
          </span>
          <input
            className="auth-input"
            style={{ fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}
            type="tel" placeholder="98XXXXXXXX" maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            autoComplete="tel"
          />
        </div>
      </Field>

      {parentMode === "password" && (
        <Field label="Password" error={errors.password}>
          <div className="auth-input-wrap" style={{ borderColor: errors.password ? "#EF4444" : "#E8EAED" }}>
            <span className="auth-input-icon-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              className="auth-input"
              type={showPass ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              autoComplete="current-password"
            />
            <button onClick={() => setShowPass(!showPass)} className="auth-eye-btn" type="button">
              {showPass
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
        </Field>
      )}

      {parentMode === "otp" && (
        <>
          {!otpSent ? (
            <ActionButton loading={loading} onClick={onSendOtp}>
              Generate OTP
            </ActionButton>
          ) : (
            <>
              <Field label="OTP Code" error={errors.otp}>
                <div className="auth-input-wrap" style={{ borderColor: errors.otp ? "#EF4444" : "#E8EAED" }}>
                  <input
                    className="auth-input"
                    style={{ letterSpacing: 10, fontFamily: "'JetBrains Mono',monospace", fontSize: 16, textAlign: "center" }}
                    type="text" inputMode="numeric" placeholder="••••••" maxLength={6}
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
                  }
                </p>
              </Field>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                <ActionButton loading={loading} onClick={onSubmit}>
                  Verify & Sign In
                </ActionButton>
                <button
                  className="auth-ghost-btn"
                  onClick={onResendOtp}
                  disabled={otpCountdown > 270}
                >
                  {otpCountdown > 270 ? `Resend in ${otpCountdown - 270}s` : "Resend OTP"}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {parentMode === "password" && (
        <div style={{ marginTop: 16 }}>
          <ActionButton loading={loading} onClick={onSubmit}>
            Sign In
          </ActionButton>
        </div>
      )}
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div className="auth-field-group">
      <label className="auth-label">{label}</label>
      {children}
      {error && <p className="auth-field-error">{error}</p>}
    </div>
  );
}

function ActionButton({ loading, onClick, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      type="button"
      className="auth-primary-btn"
    >
      {loading ? (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span className="auth-spinner" />
          Processing…
        </span>
      ) : children}
    </button>
  );
}
