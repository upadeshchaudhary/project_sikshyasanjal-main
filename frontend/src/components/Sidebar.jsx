// ─── Sidebar.jsx ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import toast from "react-hot-toast";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  ClipboardList, BarChart2, Calendar, CalendarDays,
  Bell, CreditCard, MessageSquare, LogOut, School,
  Settings, Menu, X, ChevronLeft, ChevronRight,
  Sun, Moon,
} from "lucide-react";

// ─── Navigation config per role ───────────────────────────────────────────────
const adminNav = [
  { label: "Overview", items: [
    { path: "/dashboard",  icon: LayoutDashboard, label: "Dashboard" },
  ]},
  { label: "People", items: [
    { path: "/students",   icon: Users,         label: "Student Management" },
    { path: "/teachers",   icon: GraduationCap, label: "Teacher Management" },
  ]},
  { label: "Academics", items: [
    { path: "/homework",   icon: BookOpen,      label: "Homework" },
    { path: "/attendance", icon: ClipboardList, label: "Attendance" },
    { path: "/results",    icon: BarChart2,     label: "Exam Results" },
    { path: "/routine",    icon: CalendarDays,  label: "Class Routine" },
    { path: "/calendar",   icon: Calendar,      label: "Academic Calendar" },
  ]},
  { label: "Administration", items: [
    { path: "/notices",    icon: Bell,          label: "Notices" },
    { path: "/fees",       icon: CreditCard,    label: "Fee Tracking" },
    { path: "/messages",   icon: MessageSquare, label: "Messaging",   badge: true },
  ]},
];

const teacherNav = [
  { label: "Overview", items: [
    { path: "/dashboard",  icon: LayoutDashboard, label: "Dashboard" },
  ]},
  { label: "My Classes", items: [
    { path: "/students",   icon: Users,         label: "Students" },
    { path: "/homework",   icon: BookOpen,      label: "Homework" },
    { path: "/attendance", icon: ClipboardList, label: "Attendance" },
    { path: "/results",    icon: BarChart2,     label: "Exam Results" },
    { path: "/routine",    icon: CalendarDays,  label: "Class Routine" },
  ]},
  { label: "School", items: [
    { path: "/notices",    icon: Bell,          label: "Notices" },
    { path: "/calendar",   icon: Calendar,      label: "Academic Calendar" },
    { path: "/messages",   icon: MessageSquare, label: "Messaging",   badge: true },
  ]},
];

const parentNav = [
  { label: "My Child", items: [
    { path: "/dashboard",  icon: LayoutDashboard, label: "Dashboard" },
    { path: "/attendance", icon: ClipboardList,   label: "Attendance" },
    { path: "/homework",   icon: BookOpen,        label: "Homework" },
    { path: "/results",    icon: BarChart2,       label: "Exam Results" },
    { path: "/routine",    icon: CalendarDays,    label: "Class Routine" },
    { path: "/fees",       icon: CreditCard,      label: "Fee Status" },
  ]},
  { label: "School", items: [
    { path: "/notices",    icon: Bell,            label: "Notices" },
    { path: "/calendar",   icon: Calendar,        label: "Academic Calendar" },
    { path: "/messages",   icon: MessageSquare,   label: "Messaging", badge: true },
  ]},
];

const navByRole = { admin: adminNav, teacher: teacherNav, parent: parentNav };

const ROLE_LABELS = {
  admin:   "Administrator",
  teacher: "Teacher",
  parent:  "Parent / Guardian",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { currentUser, school, logout, unreadCount, settings, updateSetting } = useApp();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const nav        = navByRole[currentUser?.role] || [];
  const isCollapsed = settings.sidebarCollapsed;
  const isDark      = settings.theme === "dark";

  // ── Close mobile sidebar on route change ───────────────────────────────────
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // ── Close mobile sidebar on Escape ────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Logout flow ────────────────────────────────────────────────────────────
  function handleLogoutClick() {
    if (logoutConfirm) {
      logout();
      toast.success("Signed out successfully");
      navigate("/");
    } else {
      setLogoutConfirm(true);
      setTimeout(() => setLogoutConfirm(false), 3000);
    }
  }

  // ── Avatar initials ────────────────────────────────────────────────────────
  const initials = currentUser?.name
    ?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  // ── Role-specific avatar color ─────────────────────────────────────────────
  const avatarColor = {
    admin:   "linear-gradient(135deg, #1E3FF2, #3D5AFF)",
    teacher: "linear-gradient(135deg, #0F6E56, #10B981)",
    parent:  "linear-gradient(135deg, #6D28D9, #8B5CF6)",
  }[currentUser?.role] || "linear-gradient(135deg, #374151, #6B7280)";

  const schoolName = school?.name || "Your School";

  return (
    <>
      {/* ── Mobile hamburger ──────────────────────────────────────────────── */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        style={mobileMenuBtnStyle}
      >
        <Menu size={20} />
      </button>

      {/* ── Mobile backdrop ───────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          style={backdropStyle}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className="sidebar"
        style={{ transform: mobileOpen ? "translateX(0)" : undefined }}
        aria-label="Main navigation"
      >
        {/* Mobile close button */}
        <button
          className="sidebar-close-btn"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          style={closeBtnStyle}
        >
          <X size={16} />
        </button>

        {/* ── Header: school identity + collapse toggle ───────────────────── */}
        <div className="sidebar-logo">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* School icon — always visible */}
            <div style={{
              width: 36, height: 36,
              background: "rgba(255,255,255,0.15)",
              borderRadius: 9, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid rgba(255,255,255,0.2)",
            }}>
              <School size={18} color="#fff" />
            </div>

            {/* School name + domain — hidden when collapsed */}
            {!isCollapsed && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  color: "#fff", fontWeight: 700, fontSize: 14,
                  lineHeight: 1.3, letterSpacing: "-0.01em",
                  overflow: "hidden", textOverflow: "ellipsis",
                  display: "-webkit-box", WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  maxWidth: 148,
                }}>
                  {schoolName}
                </div>
                {school?.domain && (
                  <div style={{
                    fontSize: 10, color: "rgba(255,255,255,0.4)",
                    marginTop: 2, fontFamily: "'JetBrains Mono', monospace",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    maxWidth: 148,
                  }}>
                    {school.domain}
                  </div>
                )}
              </div>
            )}

            {/* ── Collapse toggle (desktop only, hidden on mobile via CSS) ── */}
            <button
              onClick={() => updateSetting("sidebarCollapsed", !isCollapsed)}
              className="sidebar-collapse-btn"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={collapseToggleBtnStyle(isCollapsed)}
            >
              {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>
          </div>
        </div>

        {/* ── Nav sections ──────────────────────────────────────────────────── */}
        <nav className="sidebar-nav" aria-label="Site navigation">
          {nav.map((section) => (
            <div key={section.label} style={{ marginBottom: 4 }}>
              {/* Section label — hidden when collapsed */}
              {!isCollapsed && (
                <div className="sidebar-section">{section.label}</div>
              )}

              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                  style={isCollapsed ? collapsedNavItemStyle : {}}
                  aria-current={location.pathname === item.path ? "page" : undefined}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon size={15} aria-hidden="true" />
                  {!isCollapsed && (
                    <>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.badge && unreadCount > 0 && (
                        <span style={badgeStyle}>
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="sidebar-footer">

          {/* ── Theme toggle ──────────────────────────────────────────────── */}
          <div style={themeToggleWrapStyle(isCollapsed)}>
            <button
              onClick={() => updateSetting("theme", "light")}
              style={themeSegBtnStyle(!isDark)}
              title="Light mode"
              aria-label="Light mode"
              aria-pressed={!isDark}
            >
              <Sun size={13} />
              {!isCollapsed && <span style={{ fontSize: 11, fontWeight: 600 }}>Light</span>}
            </button>
            <button
              onClick={() => updateSetting("theme", "dark")}
              style={themeSegBtnStyle(isDark)}
              title="Dark mode"
              aria-label="Dark mode"
              aria-pressed={isDark}
            >
              <Moon size={13} />
              {!isCollapsed && <span style={{ fontSize: 11, fontWeight: 600 }}>Dark</span>}
            </button>
          </div>

          {/* Settings — admin only */}
          {currentUser?.role === "admin" && (
            <NavLink
              to="/settings"
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              style={isCollapsed ? { ...collapsedNavItemStyle, marginBottom: 6 } : { marginBottom: 6 }}
              title={isCollapsed ? "Settings" : undefined}
            >
              <Settings size={15} aria-hidden="true" />
              {!isCollapsed && <span style={{ flex: 1 }}>Settings</span>}
            </NavLink>
          )}

          {/* User chip */}
          <div
            className="user-chip"
            style={isCollapsed ? { justifyContent: "center", gap: 0, flexDirection: "column", alignItems: "center", padding: "8px 0" } : {}}
          >
            {/* Avatar */}
            <div
              className="avatar"
              style={{ background: avatarColor, flexShrink: 0 }}
              aria-hidden="true"
            >
              {initials}
            </div>

            {/* Name + role — hidden when collapsed */}
            {!isCollapsed && (
              <div className="user-chip-info" style={{ flex: 1, minWidth: 0 }}>
                <div className="user-chip-name" style={{
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {currentUser?.name || "User"}
                </div>
                <div className="user-chip-role">
                  {ROLE_LABELS[currentUser?.role] || currentUser?.role}
                </div>
              </div>
            )}

            {/* Logout button */}
            <button
              onClick={handleLogoutClick}
              style={{
                ...logoutBtnStyle(logoutConfirm),
                ...(isCollapsed ? { marginTop: 6 } : {}),
              }}
              title={logoutConfirm ? "Click again to confirm sign out" : "Sign out"}
              aria-label={logoutConfirm ? "Confirm sign out" : "Sign out"}
            >
              {logoutConfirm ? (
                <span style={{ fontSize: 9, fontWeight: 700, color: "#EF4444", whiteSpace: "nowrap" }}>
                  {isCollapsed ? "✓?" : "Confirm?"}
                </span>
              ) : (
                <LogOut size={13} />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Inline styles ──────────────────────────────────────────────────────────────

const mobileMenuBtnStyle = {
  display: "none",
  position: "fixed",
  top: 12, left: 12,
  zIndex: 300,
  width: 40, height: 40,
  borderRadius: 10,
  background: "var(--blue, #1E3FF2)",
  border: "none",
  color: "#fff",
  cursor: "pointer",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 2px 12px rgba(30,63,242,0.35)",
};

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  zIndex: 299,
  backdropFilter: "blur(2px)",
};

const closeBtnStyle = {
  display: "none",
  position: "absolute",
  top: 14, right: 14,
  width: 28, height: 28,
  borderRadius: 7,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.1)",
  color: "#fff",
  cursor: "pointer",
  alignItems: "center",
  justifyContent: "center",
};

// Collapse toggle — desktop only (hidden on mobile via .sidebar-collapse-btn CSS rule)
const collapseToggleBtnStyle = (isCollapsed) => ({
  marginLeft: isCollapsed ? 0 : "auto",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 7,
  color: "rgba(255,255,255,0.45)",
  cursor: "pointer",
  width: 26, height: 26,
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
  transition: "background 0.15s, color 0.15s",
});

// Nav item when sidebar is collapsed: center the icon
const collapsedNavItemStyle = {
  justifyContent: "center",
  padding: "9px",
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 18, height: 18,
  padding: "0 5px",
  borderRadius: 9,
  background: "#EF4444",
  color: "#fff",
  fontSize: 10,
  fontWeight: 700,
  lineHeight: 1,
  fontFamily: "'JetBrains Mono', monospace",
  flexShrink: 0,
};

// ── Theme toggle styles ────────────────────────────────────────────────────────

const themeToggleWrapStyle = (isCollapsed) => ({
  display: "flex",
  flexDirection: isCollapsed ? "column" : "row",
  background: "rgba(255,255,255,0.07)",
  borderRadius: 10,
  padding: 3,
  marginBottom: 8,
  gap: 2,
});

const themeSegBtnStyle = (isActive) => ({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  padding: "6px 8px",
  borderRadius: 7,
  border: "none",
  cursor: "pointer",
  background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
  color: isActive ? "#fff" : "rgba(255,255,255,0.35)",
  fontWeight: isActive ? 600 : 400,
  transition: "background 0.2s, color 0.2s",
});

const logoutBtnStyle = (isConfirming) => ({
  background: isConfirming ? "rgba(239,68,68,0.15)" : "transparent",
  border: isConfirming ? "1px solid rgba(239,68,68,0.4)" : "none",
  borderRadius: 7,
  cursor: "pointer",
  padding: isConfirming ? "4px 6px" : "4px",
  color: isConfirming ? "#EF4444" : "rgba(255,255,255,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 28,
  height: 28,
  transition: "all 0.2s",
  flexShrink: 0,
});