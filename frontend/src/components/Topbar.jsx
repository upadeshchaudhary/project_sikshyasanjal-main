// Topbar.jsx — includes page title, search, notifications, user info, and settings shortcut
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import axios from "axios";
import {
  Search, Bell, Settings, X, CheckCheck,
  BookOpen, MessageSquare, FileText, CreditCard,
  BarChart2, Calendar, Users, AlertCircle, GraduationCap,
  Moon, Sun, Loader2,
} from "lucide-react";

// ─── Route → page title map (auto breadcrumb fallback) ────────────────────────
const ROUTE_TITLES = {
  "/dashboard":  "Dashboard",
  "/students":   "Student Management",
  "/teachers":   "Teacher Management",
  "/homework":   "Homework",
  "/attendance": "Attendance",
  "/results":    "Exam Results",
  "/routine":    "Class Routine",
  "/calendar":   "Academic Calendar",
  "/notices":    "Notices",
  "/fees":       "Fee Tracking",
  "/messages":   "Messaging",
  "/settings":   "Settings",
};

const ROLE_LABELS = {
  admin:   "Administrator",
  teacher: "Teacher",
  parent:  "Parent / Guardian",
};

// ─── Avatar color per role ─────────────────────────────────────────────────────
const AVATAR_BG = {
  admin:   "linear-gradient(135deg,#1E3FF2,#3D5AFF)",
  teacher: "linear-gradient(135deg,#0F6E56,#10B981)",
  parent:  "linear-gradient(135deg,#6D28D9,#8B5CF6)",
};

// ─── Notification type metadata ────────────────────────────────────────────────
const NOTIF_META = {
  homework: { icon: BookOpen,      bg: "#EEF1FE", color: "#1E3FF2" },
  message:  { icon: MessageSquare, bg: "#DCFCE7", color: "#16A34A" },
  notice:   { icon: FileText,      bg: "#FEF3C7", color: "#D97706" },
  fee:      { icon: CreditCard,    bg: "#FEE2E2", color: "#DC2626" },
  result:   { icon: BarChart2,     bg: "#EDE9FE", color: "#7C3AED" },
  calendar: { icon: Calendar,      bg: "#FEF3C7", color: "#D97706" },
  student:  { icon: Users,         bg: "#DCFCE7", color: "#16A34A" },
  default:  { icon: AlertCircle,   bg: "#F1F3F9", color: "#5A6080" },
};

// ─── Search result type metadata ──────────────────────────────────────────────
const SEARCH_TYPE_META = {
  student: { icon: Users,         color: "#1E3FF2", bg: "#EEF1FE", path: "/students" },
  teacher: { icon: GraduationCap, color: "#16A34A", bg: "#DCFCE7", path: "/teachers" },
  homework:{ icon: BookOpen,      color: "#D97706", bg: "#FEF3C7", path: "/homework" },
  notice:  { icon: FileText,      color: "#7C3AED", bg: "#EDE9FE", path: "/notices"  },
};

// ─── Search results dropdown ───────────────────────────────────────────────────
function SearchDropdown({ results, query, loading, onSelect }) {
  if (loading) {
    return (
      <div style={dropdownWrap}>
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
          <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite", display: "block", margin: "0 auto 8px" }} />
          Searching…
        </div>
      </div>
    );
  }

  if (query.length >= 2 && results.length === 0) {
    return (
      <div style={dropdownWrap}>
        <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
          No results for <strong style={{ color: "var(--text)" }}>"{query}"</strong>
        </div>
      </div>
    );
  }

  if (results.length === 0) return null;

  // Group results by type
  const grouped = results.reduce((acc, r) => {
    acc[r.type] = acc[r.type] || [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <div style={dropdownWrap}>
      <div style={{ padding: "6px 12px", fontSize: 10, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {results.length} result{results.length !== 1 ? "s" : ""}
      </div>
      {Object.entries(grouped).map(([type, items]) => {
        const meta = SEARCH_TYPE_META[type] || SEARCH_TYPE_META.notice;
        const Icon = meta.icon;
        return (
          <div key={type}>
            <div style={{ padding: "4px 12px", fontSize: 9, fontWeight: 700, color: "var(--text-3)", letterSpacing: "1px", textTransform: "uppercase", borderTop: "1px solid var(--border)" }}>
              {type}s
            </div>
            {items.map((item) => (
              <div
                key={item._id || item.id}
                onClick={() => onSelect(meta.path)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--canvas)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ width: 30, height: 30, borderRadius: 8, background: meta.bg, color: meta.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={13} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.name || item.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                    {item.subtitle}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
      <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
        <span style={{ fontSize: 10, color: "var(--text-3)" }}>Press Enter to search all results</span>
      </div>
    </div>
  );
}

// ─── Single notification row ───────────────────────────────────────────────────
function NotifRow({ notif, onRead, onClear, onNavigate }) {
  const meta = NOTIF_META[notif.type] || NOTIF_META.default;
  const Icon = meta.icon;
  return (
    <div
      onClick={() => { onRead(notif.id); onNavigate(notif.link); }}
      style={{
        display: "flex", gap: 11, padding: "11px 14px",
        background: notif.read ? "transparent" : "#F6F8FF",
        borderBottom: "1px solid var(--border)",
        cursor: "pointer", transition: "background 0.12s", alignItems: "flex-start",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "#F0F4FF"}
      onMouseLeave={e => e.currentTarget.style.background = notif.read ? "transparent" : "#F6F8FF"}
    >
      <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, color: meta.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <Icon size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: notif.read ? 500 : 700, color: "var(--text)", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {notif.title}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {notif.body}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{notif.time}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0 }}>
        {!notif.read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue)" }} />}
        <button
          onClick={e => { e.stopPropagation(); onClear(notif.id); }}
          style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-3)", padding: 2, borderRadius: 4, display: "flex" }}
          title="Dismiss"
          aria-label="Dismiss notification"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
}

// ─── Notification Dropdown ─────────────────────────────────────────────────────
function NotifDropdown({ onClose }) {
  const { notifications, markNotifRead, markAllRead, clearNotif, unreadCount } = useApp();
  const navigate = useNavigate();
  const handleNav = (link) => { navigate(link); onClose(); };

  return (
    <div style={{
      position: "absolute", top: "calc(100% + 10px)", right: 0,
      width: 340, background: "var(--card)",
      borderRadius: 14, boxShadow: "0 8px 40px rgba(0,0,0,0.13)",
      border: "1px solid var(--border)", zIndex: 9999, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{ background: "var(--blue)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 100, padding: "2px 7px" }}>
              {unreadCount} new
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead} title="Mark all read"
              style={{ border: "none", background: "var(--canvas)", cursor: "pointer", color: "var(--text-2)", borderRadius: 7, padding: "4px 8px", fontSize: 11, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCheck size={12} /> All read
            </button>
          )}
          <button onClick={onClose}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-3)", borderRadius: 7, padding: 4, display: "flex" }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        {notifications.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            <Bell size={26} style={{ display: "block", margin: "0 auto 10px", color: "var(--text-3)" }} />
            You're all caught up
          </div>
        ) : notifications.map(n => (
          <NotifRow key={n.id} notif={n} onRead={markNotifRead} onClear={clearNotif} onNavigate={handleNav} />
        ))}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div style={{ padding: "9px 14px", borderTop: "1px solid var(--border)", background: "var(--canvas)", textAlign: "center" }}>
          <button onClick={() => handleNav("/messages")}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--blue)", fontSize: 12, fontWeight: 600 }}>
            Go to Messages →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Topbar ───────────────────────────────────────────────────────────────
export default function Topbar({ title }) {
  const { currentUser, school, unreadCount, settings, updateSetting } = useApp();
  const navigate  = useNavigate();
  const location  = useLocation();

  // Auto-derive title from route if not passed as prop
  const pageTitle = title || ROUTE_TITLES[location.pathname] || "SikshyaSanjal";

  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState([]);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searching,   setSearching]   = useState(false);
  const [showNotif,   setShowNotif]   = useState(false);

  const notifRef  = useRef(null);
  const searchRef = useRef(null);
  const inputRef  = useRef(null);
  const debounceRef = useRef(null);

  const isAdmin   = currentUser?.role === "admin";
  const isDark    = settings.theme === "dark";
  const initials  = currentUser?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const avatarBg  = AVATAR_BG[currentUser?.role] || AVATAR_BG.admin;

  // ── Cmd+K / Ctrl+K to focus search ────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuery("");
        setShowNotif(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Close dropdowns on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current  && !notifRef.current.contains(e.target))  setShowNotif(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) { setSearchOpen(false); setQuery(""); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Debounced real API search ──────────────────────────────────────────────
  const doSearch = useCallback(async (q) => {
    if (q.trim().length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    try {
      // Role-scoped search — API returns only data the current user can see
      // x-school-domain header is set globally by AppContext login()
      const { data } = await axios.get("/search", { params: { q: q.trim() } });
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    setSearchOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 280);
  };

  const handleSearchSelect = (path) => {
    navigate(path);
    setQuery("");
    setSearchOpen(false);
  };

  return (
    <div className="topbar">

      {/* ── Page title + breadcrumb ─────────────────────────────────────── */}
      <div style={{ marginRight: "auto", minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {pageTitle}
        </div>
        {school?.name && (
          <div style={{ fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {school.name}
          </div>
        )}
      </div>

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <div ref={searchRef} style={{ position: "relative", flex: 1, maxWidth: 320 }}>
        <div className="search-box">
          <Search size={13} style={{ color: "var(--text-3)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            placeholder="Search… (⌘K)"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => setSearchOpen(true)}
            style={{ width: "100%", fontSize: 13 }}
            aria-label="Search"
            aria-expanded={searchOpen}
            role="combobox"
          />
          {searching && <Loader2 size={12} style={{ animation: "spin 0.7s linear infinite", color: "var(--text-3)", flexShrink: 0 }} />}
          {query && !searching && (
            <button
              onClick={() => { setQuery(""); setResults([]); setSearchOpen(false); }}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-3)", display: "flex", padding: 0 }}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {searchOpen && (
          <SearchDropdown
            results={results}
            query={query}
            loading={searching}
            onSelect={handleSearchSelect}
          />
        )}
      </div>

      {/* ── Dark mode toggle ────────────────────────────────────────────── */}
      <button
        className="icon-btn"
        onClick={() => updateSetting("theme", isDark ? "light" : "dark")}
        title={isDark ? "Light mode" : "Dark mode"}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      {/* ── Notification bell ───────────────────────────────────────────── */}
      <div ref={notifRef} style={{ position: "relative" }}>
        <button
          className="icon-btn"
          onClick={() => setShowNotif(v => !v)}
          style={{
            background: showNotif ? "var(--blue-pale)" : undefined,
            borderColor: showNotif ? "var(--blue)" : undefined,
            color: showNotif ? "var(--blue)" : undefined,
          }}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          aria-expanded={showNotif}
        >
          <Bell size={15} />
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -4,
              background: "#EF4444", color: "#fff",
              fontSize: 9, fontWeight: 800, borderRadius: 100,
              minWidth: 16, height: 16, padding: "0 3px",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid var(--card)", lineHeight: 1,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        {showNotif && <NotifDropdown onClose={() => setShowNotif(false)} />}
      </div>

      {/* ── Settings — admin only ───────────────────────────────────────── */}
      {isAdmin && (
        <button
          className="icon-btn"
          onClick={() => navigate("/settings")}
          title="Settings"
          aria-label="Settings"
          style={{
            background: location.pathname === "/settings" ? "var(--blue-pale)" : undefined,
            color: location.pathname === "/settings" ? "var(--blue)" : undefined,
          }}
        >
          <Settings size={15} />
        </button>
      )}

      {/* ── User chip ──────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        paddingLeft: 10, borderLeft: "1px solid var(--border)",
        cursor: "default",
      }}>
        <div
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: avatarBg, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#fff",
            letterSpacing: "0.3px",
          }}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
            {currentUser?.name}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-3)" }}>
            {ROLE_LABELS[currentUser?.role] || currentUser?.role}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────
const dropdownWrap = {
  position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
  background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
  zIndex: 9999, overflow: "hidden",
};