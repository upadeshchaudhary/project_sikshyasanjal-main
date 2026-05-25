// LoginPage.jsx - Unified login flow for all roles (Admin, Teacher, Parent).
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";

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

const isValidEmail  = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidPhone  = (v) => /^(98|97|96)\d{8}$/.test(v.trim());

export default function LoginPage() {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const { login, school, offline } = useApp();

  const [step,          setStep]         = useState("role"); 
  const [selectedRole,  setSelectedRole] = useState(searchParams.get("role") || null);
  const [email,         setEmail]        = useState("");
  const [password,      setPassword]     = useState("");
  const [phone,         setPhone]        = useState("");
  const [otp,           setOtp]          = useState("");
  const [showPass,      setShowPass]     = useState(false);
  const [parentMode,    setParentMode]   = useState("otp");
  const [otpSent,       setOtpSent]      = useState(false);
  const [otpToken,      setOtpToken]     = useState("");
  const [loading,       setLoading]      = useState(false);
  const [errors,        setErrors]       = useState({});
  const [otpCountdown,  setOtpCountdown] = useState(0);
  const [preSchoolInfo, setPreSchoolInfo] = useState(null);

  const activeRole = ROLES.find((r) => r.key === selectedRole);

  // ── Fetch school info on mount ─────────────────────────────────────────────
  useEffect(() => {
    axios.get("/auth/school")
      .then(res => {
        if (res.data.success) setPreSchoolInfo(res.data.school);
      })
      .catch(() => { /* ignore, will show default brand */ });
  }, []);

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setTimeout(() => setOtpCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCountdown]);

  function goBackToRole() {
    setStep("role");
    setSelectedRole(null);
    setEmail(""); setPassword(""); setPhone(""); setOtp("");
    setOtpSent(false); setOtpToken(""); setErrors({});
  }

  async function handleSendOtp() {
    const errs = {};
    if (!isValidPhone(phone)) errs.phone = "Enter a valid Nepali mobile number (starts with 98/97/96)";
    if (Object.keys(errs).length) return setErrors(errs);

    setLoading(true);
    setErrors({});
    try {
      const { data } = await axios.post("/auth/parent/send-otp", { phone });
      setOtpToken(data.otpToken);
      setOtpSent(true);
      setOtpCountdown(300);
      toast.success(data.message || `OTP generated for +977-${phone}`);
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
          res = await axios.post("/auth/parent/verify-otp", { phone, otp, otpToken });
        } else {
          res = await axios.post("/auth/parent/login", { phone, password });
        }
      } else {
        res = await axios.post("/auth/login", { email, password, role: selectedRole });
      }

      const { token, user, school: schoolData } = res.data;
      login(token, user, schoolData);
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

  return (
    <div style={s.page}>
      <div style={s.bgBlob1} />
      <div style={s.bgBlob2} />

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
          Backend unavailable. Login and API actions require the backend to be running.
        </div>
      )}

      <div style={s.progressWrap}>
        {["role", "form"].map((st, i) => (
          <div key={st} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              ...s.progressDot,
              background: ["role","form"].indexOf(step) >= i ? "#1E3FF2" : "#E2E8F0",
            }} />
            {i < 1 && <div style={{ ...s.progressLine, background: ["role","form"].indexOf(step) > i ? "#1E3FF2" : "#E2E8F0" }} />}
          </div>
        ))}
        <span style={s.progressLabel}>
          {step === "role" ? "Select role" : "Sign in"}
        </span>
      </div>

      <div style={s.card}>
        {step === "role" && (
          <RoleStep
            onSelect={(key) => { setSelectedRole(key); setStep("form"); }}
          />
        )}

        {step === "form" && activeRole && (
          <FormStep
            role={activeRole}
            schoolInfo={preSchoolInfo || school}
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
          />
        )}
      </div>

      <p style={s.footer}>
        © {new Date().getFullYear()} SikshyaSanjal · Built for Nepali Schools · CCT Dharan
      </p>
    </div>
  );
}

function RoleStep({ onSelect }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div>
      <h1 style={{ ...s.heading, marginBottom: 4 }}>Welcome back</h1>
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
  onBack, onSendOtp, onResendOtp, onSubmit,
}) {
  const isParent = role.key === "parent";

  return (
    <div>
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

      {errors.general && (
        <div style={s.errorBanner}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {errors.general}
        </div>
      )}

      {isParent && (
        <div style={s.toggleRow}>
          <button onClick={() => setParentMode("otp")} style={{ ...s.toggleBtn, ...(parentMode === "otp" ? s.toggleActive(role.color) : {}) }}>📱 Phone OTP</button>
          <button onClick={() => setParentMode("password")} style={{ ...s.toggleBtn, ...(parentMode === "password" ? s.toggleActive(role.color) : {}) }}>🔑 Password</button>
        </div>
      )}

      {!isParent && (
        <Field label="Email Address" error={errors.email}>
          <div style={{ ...s.inputWrap, borderColor: errors.email ? "#EF4444" : "#E8EAED" }}>
            <span style={s.inputIconWrap}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </span>
            <input
              style={s.input} type="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            />
          </div>
        </Field>
      )}

      {isParent && (
        <Field label="Phone Number" error={errors.phone}>
          <div style={{ ...s.inputWrap, borderColor: errors.phone ? "#EF4444" : "#E8EAED" }}>
            <span style={{ ...s.inputIconWrap, fontSize: 12, color: "#374151", fontWeight: 600 }}>+977</span>
            <input
              style={s.input} type="tel" placeholder="98XXXXXXXX" maxLength={10}
              value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </Field>
      )}

      {(!isParent || parentMode === "password") && (
        <Field label="Password" error={errors.password}>
          <div style={{ ...s.inputWrap, borderColor: errors.password ? "#EF4444" : "#E8EAED" }}>
            <span style={s.inputIconWrap}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              style={s.input} type={showPass ? "text" : "password"} placeholder="Enter your password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            />
            <button onClick={() => setShowPass(!showPass)} style={s.eyeBtn} type="button">
              {showPass ? <EyeOff size={14} color="#9CA3AF" /> : <Eye size={14} color="#9CA3AF" />}
            </button>
          </div>
        </Field>
      )}

      {isParent && parentMode === "otp" && (
        <>
          {!otpSent ? (
            <ActionButton color={role.color} loading={loading} onClick={onSendOtp}>Generate OTP</ActionButton>
          ) : (
            <>
              <Field label="OTP Code" error={errors.otp}>
                <div style={{ ...s.inputWrap, borderColor: errors.otp ? "#EF4444" : "#E8EAED" }}>
                  <input
                    style={{ ...s.input, letterSpacing: 8, textAlign: "center", fontWeight: 700 }}
                    type="text" placeholder="••••••" maxLength={6}
                    value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                  />
                </div>
                <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 5 }}>
                  {otpCountdown > 0 ? `Expires in ${Math.floor(otpCountdown / 60)}:${String(otpCountdown % 60).padStart(2, "0")}` : "OTP expired"}
                </p>
              </Field>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <ActionButton color={role.color} loading={loading} onClick={onSubmit}>Verify & Sign In</ActionButton>
                <button style={s.ghostBtn} onClick={onResendOtp} disabled={otpCountdown > 270}>
                  {otpCountdown > 270 ? `Resend in ${otpCountdown - 270}s` : "Resend OTP"}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {(!isParent || parentMode === "password") && (
        <div style={{ marginTop: 16 }}>
          <ActionButton color={role.color} loading={loading} onClick={onSubmit}>Sign In</ActionButton>
        </div>
      )}
    </div>
  );
}

function Eye({ size, color }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function EyeOff({ size, color }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}

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
      {loading ? <span style={s.spinner} /> : children}
    </button>
  );
}

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
    padding: "11px 12px", fontSize: 14, color: "#1A1A2E",
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
  offlineBanner: {
    background: "#F8FAFC", border: "1px solid #BBD3F0",
    color: "#1D4ED8", borderRadius: 10,
    padding: "10px 14px", marginBottom: 16,
    fontSize: 13, fontWeight: 500,
    width: "100%", maxWidth: 420, textAlign: "center",
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
