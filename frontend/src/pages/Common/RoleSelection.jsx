// RoleSelection.jsx - Restored to the "Standard" UI/UX role selection step.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, GraduationCap, Users, School, ChevronRight } from "lucide-react";

const ROLES = [
  {
    key: "admin",
    label: "School Administrator",
    sub: "Manage your entire school",
    path: "/admin",
    color: "#1E3FF2",
    bg: "#EEF1FD",
    icon: <ShieldCheck size={22} />,
  },
  {
    key: "teacher",
    label: "Teacher",
    sub: "Manage classes & students",
    path: "/teacher",
    color: "#0F6E56",
    bg: "#E1F5EE",
    icon: <GraduationCap size={22} />,
  },
  {
    key: "parent",
    label: "Parent / Guardian",
    sub: "Track your child's progress",
    path: "/parent",
    color: "#6D28D9",
    bg: "#EDE9FE",
    icon: <Users size={22} />,
  },
];

export default function RoleSelection() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);

  return (
    <div style={s.page}>
      <div style={s.bgBlob1} />
      <div style={s.bgBlob2} />

      {/* Brand */}
      <div style={s.brand}>
        <div style={s.brandIcon}>
          <School size={20} color="#1E3FF2" />
        </div>
        <span style={s.brandName}>SikshyaSanjal</span>
      </div>

      {/* Auth card */}
      <div style={s.card}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>👋</div>
          <h1 style={{ ...s.heading, marginBottom: 4 }}>Welcome</h1>
          <p style={{ ...s.subheading, marginBottom: 20 }}>Select your role to continue to the portal</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ROLES.map((role) => (
            <button
              key={role.key}
              onClick={() => navigate(role.path)}
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
                <ChevronRight size={16} strokeWidth={2.5} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <p style={s.footer}>
        © {new Date().getFullYear()} SikshyaSanjal · Built for Nepali Schools · CCT Dharan
      </p>
    </div>
  );
}

// ── Styles (Restored from "Standard" LoginPage.jsx) ──────────────────────────
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
    zIndex: 1,
  },
  heading: { fontFamily: "'DM Serif Display', serif", fontSize: 26, color: "#1A1A2E", margin: "0 0 8px", letterSpacing: "-0.3px" },
  subheading: { fontSize: 13, color: "#8B8FA8", margin: 0 },
  roleCard: {
    display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
    borderRadius: 13, cursor: "pointer", transition: "all 0.18s ease",
    background: "none", width: "100%", border: "1.5px solid #E8EAED",
  },
  roleIcon: { width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  footer: { marginTop: 16, fontSize: 11, color: "#B0B4C8", textAlign: "center" },
};
