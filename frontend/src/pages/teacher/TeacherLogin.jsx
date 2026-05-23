// TeacherLogin.jsx - Teacher-specific login flow with domain verification
import { useState, useEffect } from "react";
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
      {offline && (
        <div style={s.offlineBanner}>
          Backend unavailable. The app can still load, but login and API actions require the backend.
        </div>
      )}

      {/* Auth card */}
      <div style={s.card}>
          <FormStep
            role={ROLE}
            schoolInfo={schoolInfo}
            email={email}             setEmail={setEmail}
            password={password}       setPassword={setPassword}
            showPass={showPass}       setShowPass={setShowPass}
            loading={loading}
            errors={errors}
            onBack={() => navigate("/")}
            onSubmit={handleSubmit}
            onGoogleLogin={handleGoogleLogin}
          />
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
        <div style={{ fontSize: 36, marginBottom: 8 }}>👨‍🏫</div>
        <h1 style={s.heading}>Teacher Portal</h1>
        <p style={s.subheading}>Enter your school's unique domain to get started</p>
      </div>

      <div style={s.fieldGroup}>
        <label style={s.label}>School Domain</label>
        <div style={{ ...s.inputWrap, borderColor: error ? "#EF4444" : "#E8EAED" }}>
          <input
            style={{ ...s.input, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 0.5, paddingLeft: 12 }}
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
      </div>

      <ActionButton color="#0F6E56" loading={loading} onClick={onSubmit}>
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
        <button onClick={onBack} style={s.backBtn} aria-label="Go back">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div style={{ ...s.roleIcon, color: role.color, background: role.bg }}>
          {role.icon}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1A2E" }}>{role.label}</div>
          {schoolInfo && <div style={{ fontSize: 11, color: "#1E3FF2", fontWeight: 600 }}>{schoolInfo.name}</div>}
        </div>
      </div>

      <h1 style={{ ...s.heading, fontSize: 22 }}>Sign in</h1>
      <p style={{ ...s.subheading, marginBottom: 18 }}>Access your teacher dashboard</p>

      {errors.general && (
        <div style={s.errorBanner}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {errors.general}
        </div>
      )}

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
          <button onClick={() => setShowPass(!showPass)} style={s.eyeBtn} type="button">
            {showPass
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
          </button>
        </div>
      </Field>

      <div style={{ marginTop: 16 }}>
        <ActionButton color={role.color} loading={loading} onClick={onSubmit}>
          Sign In
        </ActionButton>
      </div>
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div style={s.fieldGroup}>
      <label style={s.label}>{label}</label>
      {children}
      {error && <p style={s.fieldError}>{error}</p>}
    </div>
  );
}

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

// ── Styles (Ported from LoginPage.jsx) ───────────────────────────────────────
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
  brand: { display: "flex", alignItems: "center", gap: 10, marginBottom: 24 },
  brandIcon: {
    width: 38, height: 38, borderRadius: 11,
    background: "#EEF1FD", border: "1px solid rgba(30,63,242,0.15)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  brandName: { fontFamily: "'DM Serif Display', serif", fontSize: 21, color: "#1A1A2E", letterSpacing: "-0.3px" },
  card: {
    background: "#FFFFFF", borderRadius: 20,
    padding: "28px 26px", width: "100%", maxWidth: 420,
    boxShadow: "0 4px 32px rgba(30,63,242,0.08), 0 1px 0 rgba(0,0,0,0.04)",
    border: "1px solid #E8EAED",
  },
  heading: { fontFamily: "'DM Serif Display', serif", fontSize: 26, color: "#1A1A2E", margin: "0 0 8px", letterSpacing: "-0.3px" },
  subheading: { fontSize: 13, color: "#8B8FA8", margin: 0 },
  roleIcon: { width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  backBtn: {
    width: 32, height: 32, borderRadius: 9, border: "1.5px solid #E8EAED",
    background: "none", cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", color: "#6B7280", flexShrink: 0,
  },
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
  fieldError: { fontSize: 11, color: "#EF4444", marginTop: 5 },
  errorBanner: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#FEF2F2", border: "1px solid #FECACA",
    borderRadius: 8, padding: "10px 12px", marginBottom: 14,
    fontSize: 12, color: "#DC2626", fontWeight: 500,
  },
  offlineBanner: {
    background: "#F8FAFC", border: "1px solid #BBD3F0",
    color: "#1D4ED8", borderRadius: 10,
    padding: "10px 14px", marginBottom: 16,
    fontSize: 13, fontWeight: 500,
  },
  primaryBtn: {
    width: "100%", padding: "12px", borderRadius: 11, border: "none",
    color: "#FFFFFF", fontSize: 14, fontWeight: 700,
    fontFamily: "'Sora', sans-serif", letterSpacing: "0.2px",
    transition: "opacity 0.15s", display: "block",
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
