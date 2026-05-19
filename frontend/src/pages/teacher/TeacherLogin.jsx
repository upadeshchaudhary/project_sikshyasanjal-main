// TeacherLogin.jsx - Teacher-specific login flow
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";

// ─── Role definition ─────────────────────────────────────────────────────────
const ROLE = {
  key: "teacher",
  label: "Teacher",
  sub: "Manage your classes & students",
  color: "#0F6E56",
  bg: "#E1F5EE",
  icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
      <path d="M7 8h10M7 12h6"/>
    </svg>
  ),
};

// ─── Validation helpers ───────────────────────────────────────────────────────
const isValidEmail  = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidDomain = (v) => /^[a-z0-9-]{2,50}$/.test(v.trim().toLowerCase());

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function TeacherLogin() {
  const navigate        = useNavigate();
  const { login, offline } = useApp();

  const [step,          setStep]         = useState("domain"); // "domain" | "form"
  const [schoolSlug,    setSchoolSlug]   = useState("");
  const [schoolInfo,    setSchoolInfo]   = useState(null);    // { name, slug, _id }
  const [email,         setEmail]        = useState("");
  const [password,      setPassword]     = useState("");
  const [showPass,      setShowPass]     = useState(false);
  const [loading,       setLoading]      = useState(false);
  const [errors,        setErrors]       = useState({});      // field-level errors

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

  // ── Step 2: Submit login ──────────────────────────────────────────────────
  async function handleSubmit() {
    const errs = {};
    setErrors({});

    if (!isValidEmail(email))   errs.email = "Enter a valid email address";
    if (!password)              errs.password = "Password is required";

    if (Object.keys(errs).length) return setErrors(errs);

    setLoading(true);
    try {
      const res = await axios.post(
        "/auth/login",
        { email, password, role: ROLE.key },
        { headers: { "x-school-domain": schoolInfo.slug } }
      );

      const { token, user, school } = res.data;
      login(token, user, school);
      toast.success(`Welcome back, ${user.name}!`);
      navigate("/dashboard");
    } catch (err) {
      if (!err.response) {
        setErrors({ general: "Backend unreachable. Please start the server and try again." });
      } else {
        const msg = err.response?.data?.message || "Login failed. Check your credentials.";
        if (err.response?.status === 401) {
          setErrors({ general: "Incorrect credentials. Please try again." });
        } else if (err.response?.status === 403) {
          setErrors({ general: "Your account has been disabled. Contact the administrator." });
        } else {
          setErrors({ general: msg });
        }
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  function handleGoogleLogin() {
    if (!schoolInfo) return;
    const apiBase = axios.defaults.baseURL;
    window.location.href = `${apiBase}/auth/google?school=${schoolInfo.slug}&role=${ROLE.key}`;
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
            email={email}             setEmail={setEmail}
            password={password}       setPassword={setPassword}
            showPass={showPass}       setShowPass={setShowPass}
            loading={loading}
            errors={errors}
            onBack={() => setStep("domain")}
            onSubmit={handleSubmit}
            onGoogleLogin={handleGoogleLogin}
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
        <div style={{ fontSize: 36, marginBottom: 8 }}>👨‍🏫</div>
        <h1 className="auth-heading">Teacher Portal</h1>
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
  email, setEmail,
  password, setPassword,
  showPass, setShowPass,
  loading, errors,
  onBack, onSubmit, onGoogleLogin,
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
      <p className="auth-subheading" style={{ marginBottom: 18 }}>Access your teacher dashboard</p>

      {errors.general && (
        <div className="auth-error-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {errors.general}
        </div>
      )}

      <Field label="Email Address" error={errors.email}>
        <div className="auth-input-wrap" style={{ borderColor: errors.email ? "#EF4444" : "#E8EAED" }}>
          <span className="auth-input-icon-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </span>
          <input
            className="auth-input" type="email" placeholder="you@school.edu.np"
            value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            autoComplete="email"
          />
        </div>
      </Field>

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

      <div style={{ marginTop: 16 }}>
        <ActionButton loading={loading} onClick={onSubmit}>
          Sign In
        </ActionButton>
      </div>

      <div className="auth-divider">
        <div className="auth-divider-line" />
        <span className="auth-divider-text">or</span>
        <div className="auth-divider-line" />
      </div>

      <button className="auth-google-btn" onClick={onGoogleLogin} type="button">
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>
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
