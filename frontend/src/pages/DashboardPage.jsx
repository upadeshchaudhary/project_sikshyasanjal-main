import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Topbar from "../components/Topbar";
import axios from "axios";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import {
  Users, GraduationCap, CheckSquare, TrendingUp,
  AlertCircle, BookOpen, MessageSquare, CreditCard,
  Calendar, Clock, ArrowRight, RefreshCw,
} from "lucide-react";

// ── Time-aware greeting ───────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Skeleton loader component ────────────────────────────────────────────────
function Skeleton({ height = 20, width = "100%", radius = 6, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ height, width, borderRadius: radius, ...style }}
    />
  );
}

// ── Stat card with loading state ──────────────────────────────────────────────
function StatCard({ icon, iconBg, iconColor, label, value, trend, trendDown, loading }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: iconBg }}>
        {icon && !loading
          ? <span style={{ color: iconColor }}>{icon}</span>
          : <Skeleton height={20} width={20} radius={4} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="stat-label">{label}</div>
        {loading
          ? <Skeleton height={28} width={80} style={{ margin: "6px 0 4px" }} />
          : <div className="stat-value mono">{value}</div>}
        {loading
          ? <Skeleton height={12} width={100} />
          : <div className={`stat-trend ${trendDown ? "down" : ""}`}>{trend}</div>}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, message }) {
  return (
    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-3)" }}>
      <Icon size={32} style={{ marginBottom: 8, opacity: 0.35 }} />
      <p style={{ fontSize: 13 }}>{message}</p>
    </div>
  );
}

// ── Category tag colour map ───────────────────────────────────────────────────
const CATEGORY_TAG = {
  exam:    "tag-purple",
  holiday: "tag-green",
  event:   "tag-blue",
  urgent:  "tag-red",
  general: "tag-gray",
  meeting: "tag-amber",
};

const PRIORITY_CLASS = { high: "tag-red", medium: "tag-amber", low: "tag-green" };

// ════════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ════════════════════════════════════════════════════════════════════════════════
function AdminDashboard({ user }) {
  const navigate = useNavigate();

  const [stats,        setStats]       = useState(null);
  const [chartData,    setChartData]   = useState([]);
  const [notices,      setNotices]     = useState([]);
  const [homework,     setHomework]    = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [chartsLoading,setChartsLoading] = useState(true);
  const [refreshing,   setRefreshing]  = useState(false);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [statsRes, noticesRes, homeworkRes] = await Promise.all([
        axios.get("/dashboard/admin"),
        axios.get("/notices?limit=5&important=true"),
        axios.get("/homework?limit=5&upcoming=true"),
      ]);

      setStats(statsRes.data);
      setNotices(noticesRes.data.notices  || []);
      setHomework(homeworkRes.data.homework || []);
    } catch {
      if (!isRefresh) toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadCharts = useCallback(async () => {
    setChartsLoading(true);
    try {
      const res = await axios.get("/dashboard/admin/charts");
      setChartData(res.data || []);
    } catch {
      // Charts are non-critical — fail silently
    } finally {
      setChartsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadCharts();
  }, [loadDashboard, loadCharts]);

  const firstName = user?.name?.split(" ")[0] || "Admin";

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="page-content">
        {/* Page header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">
              {getGreeting()}, {firstName} 👋
            </h1>
            <p className="page-subtitle">
              Here's what's happening at your school today.
            </p>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? "spin 0.7s linear infinite" : "none" }} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Stat cards */}
        <div className="stat-grid">
          <StatCard
            icon={<Users size={20} />} iconBg="#EEF1FE" iconColor="#1E3FF2"
            label="Total Students"
            value={stats?.totalStudents?.toLocaleString() ?? "—"}
            trend={stats?.studentsTrend ?? "This academic year"}
            loading={loading}
          />
          <StatCard
            icon={<GraduationCap size={20} />} iconBg="#DCFCE7" iconColor="#15803D"
            label="Total Teachers"
            value={stats?.totalTeachers ?? "—"}
            trend="Active this term"
            loading={loading}
          />
          <StatCard
            icon={<CheckSquare size={20} />} iconBg="#FEF3C7" iconColor="#D97706"
            label="Today's Attendance"
            value={stats?.attendanceRate != null ? `${stats.attendanceRate}%` : "—"}
            trend={stats?.attendanceSummary ?? "Loading…"}
            trendDown={stats?.attendanceRate < 80}
            loading={loading}
          />
          <StatCard
            icon={<CreditCard size={20} />} iconBg="#EDE9FE" iconColor="#8B5CF6"
            label="Fee Collection"
            value={stats?.collectionRate != null ? `${stats.collectionRate}%` : "—"}
            trend={stats?.pendingAmount
              ? `NPR ${(stats.pendingAmount / 1000).toFixed(0)}k pending`
              : "Up to date"}
            trendDown={(stats?.collectionRate ?? 100) < 70}
            loading={loading}
          />
        </div>

        {/* Charts row */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Monthly Attendance Rate</div>
              <span className="bs-date">{stats?.currentBsYear ?? ""}</span>
            </div>
            <div className="card-body">
              {chartsLoading ? (
                <Skeleton height={200} radius={8} />
              ) : chartData?.attendance?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData.attendance}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "var(--text-2)" }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--text-2)" }}
                      axisLine={false} tickLine={false}
                      domain={[60, 100]}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
                      formatter={(v) => [`${v}%`, "Attendance"]}
                    />
                    <Bar dataKey="rate" fill="#1E3FF2" radius={[4, 4, 0, 0]} name="Attendance %" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={Calendar} message="No attendance data available yet." />
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Enrollment Trend</div>
            </div>
            <div className="card-body">
              {chartsLoading ? (
                <Skeleton height={200} radius={8} />
              ) : chartData?.enrollment?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData.enrollment}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 11, fill: "var(--text-2)" }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--text-2)" }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone" dataKey="students"
                      stroke="#1E3FF2" strokeWidth={2}
                      dot={{ fill: "#1E3FF2", r: 4 }}
                      name="Students"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={TrendingUp} message="No enrollment data available yet." />
              )}
            </div>
          </div>
        </div>

        {/* Bottom row: notices + homework */}
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Notices</div>
              <button
                onClick={() => navigate("/notices")}
                className="btn btn-ghost btn-sm"
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                View all <ArrowRight size={13} />
              </button>
            </div>
            <div className="card-body" style={{ padding: "8px 24px" }}>
              {loading
                ? Array(4).fill(0).map((_, i) => (
                    <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <Skeleton height={14} width="70%" style={{ marginBottom: 6 }} />
                      <Skeleton height={11} width="45%" />
                    </div>
                  ))
                : notices.length === 0
                  ? <EmptyState icon={AlertCircle} message="No notices posted yet." />
                  : notices.map(n => (
                      <div
                        key={n._id}
                        style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                        onClick={() => navigate("/notices")}
                      >
                        <AlertCircle
                          size={15}
                          color={n.isImportant ? "var(--red)" : "var(--text-3)"}
                          style={{ marginTop: 2, flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontSize: 13, fontWeight: n.isImportant ? 600 : 500,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {n.title}
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center" }}>
                            <span className={`tag ${CATEGORY_TAG[n.category] || "tag-gray"}`} style={{ padding: "1px 6px", fontSize: 10 }}>
                              {n.category}
                            </span>
                            <span style={{ fontSize: 10, color: "var(--text-3)" }}>
                              {new Date(n.createdAt).toLocaleDateString("en-NP")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Homework</div>
              <button
                onClick={() => navigate("/homework")}
                className="btn btn-ghost btn-sm"
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                View all <ArrowRight size={13} />
              </button>
            </div>
            <div className="card-body" style={{ padding: "8px 24px" }}>
              {loading
                ? Array(4).fill(0).map((_, i) => (
                    <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <Skeleton height={14} width="65%" style={{ marginBottom: 6 }} />
                      <Skeleton height={11} width="50%" />
                    </div>
                  ))
                : homework.length === 0
                  ? <EmptyState icon={BookOpen} message="No homework posted this week." />
                  : homework.map(h => (
                      <div
                        key={h._id}
                        style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                        onClick={() => navigate("/homework")}
                      >
                        <BookOpen size={15} color="var(--blue)" style={{ marginTop: 2, flexShrink: 0 }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 500,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {h.title}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 3 }}>
                            {h.class} · {h.subject} ·{" "}
                            <span className={`priority-${h.priority}`} style={{ fontWeight: 600 }}>
                              {h.priority?.toUpperCase()}
                            </span>
                            {h.dueDateBs && (
                              <span className="bs-date" style={{ marginLeft: 4 }}>
                                · Due: {h.dueDateBs}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TEACHER DASHBOARD
// ════════════════════════════════════════════════════════════════════════════════
function TeacherDashboard({ user }) {
  const navigate = useNavigate();

  const [stats,    setStats]    = useState(null);
  const [homework, setHomework] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, hwRes] = await Promise.all([
          axios.get("/dashboard/teacher"),
          axios.get("/homework?limit=5"),
        ]);
        setStats(statsRes.data);
        setHomework(hwRes.data.homework || []);
      } catch {
        toast.error("Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const firstName = user?.name?.split(" ")[0] || "Teacher";

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">{getGreeting()}, {firstName} 👋</h1>
            <p className="page-subtitle">Your classes and tasks for today.</p>
          </div>
        </div>

        <div className="stat-grid">
          <StatCard
            icon={<Users size={20} />} iconBg="#EEF1FE" iconColor="#1E3FF2"
            label="My Classes"
            value={loading ? "—" : (stats?.assignedClasses?.length ?? 0)}
            trend={loading ? "Loading…" : (stats?.assignedClasses?.join(", ") || "No classes assigned")}
            loading={loading}
          />
          <StatCard
            icon={<BookOpen size={20} />} iconBg="#DCFCE7" iconColor="#15803D"
            label="Homework Posted"
            value={loading ? "—" : (stats?.homeworkCount ?? 0)}
            trend="This week"
            loading={loading}
          />
          <StatCard
            icon={<MessageSquare size={20} />} iconBg="#FEF3C7" iconColor="#D97706"
            label="Unread Messages"
            value={loading ? "—" : (stats?.unreadMessages ?? 0)}
            trend={stats?.unreadMessages > 0 ? "Needs response" : "All caught up"}
            trendDown={stats?.unreadMessages > 0}
            loading={loading}
          />
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">My Recent Homework</div>
            <button
              onClick={() => navigate("/homework")}
              className="btn btn-ghost btn-sm"
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              View all <ArrowRight size={13} />
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            {loading ? (
              <div style={{ padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: 10 }}>
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} height={36} radius={6} />)}
              </div>
            ) : homework.length === 0 ? (
              <EmptyState icon={BookOpen} message="No homework posted yet. Post your first assignment!" />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Class</th>
                    <th>Subject</th>
                    <th>Due Date (BS)</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {homework.map(h => (
                    <tr key={h._id} onClick={() => navigate("/homework")} style={{ cursor: "pointer" }}>
                      <td style={{ fontWeight: 500 }}>{h.title}</td>
                      <td><span className="tag tag-blue">{h.class}</span></td>
                      <td>{h.subject}</td>
                      <td>
                        <span className="bs-date">{h.dueDateBs || "—"}</span>
                        {h.dueDate && (
                          <span style={{ fontSize: 10, color: "var(--text-3)", display: "block" }}>
                            {new Date(h.dueDate).toLocaleDateString("en-NP")}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`tag ${PRIORITY_CLASS[h.priority] || "tag-gray"}`}>
                          {h.priority?.toUpperCase() || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PARENT DASHBOARD
// ════════════════════════════════════════════════════════════════════════════════
function ParentDashboard({ user }) {
  const navigate = useNavigate();

  const [stats,    setStats]    = useState(null);
  const [homework, setHomework] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, hwRes] = await Promise.all([
          axios.get("/dashboard/parent"),
          axios.get("/homework?limit=5"),
        ]);
        setStats(statsRes.data);
        // FIXED: API already scopes homework to child's class — no client-side filter needed
        setHomework(hwRes.data.homework || []);
      } catch {
        toast.error("Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const firstName   = user?.name?.split(" ")[0] || "Parent";
  const childName   = user?.childName   || stats?.childName   || "Your Child";
  const childClass  = user?.childClass  || stats?.childClass  || "—";

  // FIXED: attendance status from real API data
  const todayStatus = stats?.todayAttendance?.status || "not_marked";
  const statusMap   = {
    present:    { label: "Present ✓",    color: "var(--green)", bg: "#DCFCE7" },
    absent:     { label: "Absent ✗",     color: "var(--red)",   bg: "#FEE2E2" },
    late:       { label: "Late",         color: "var(--amber)", bg: "#FEF3C7" },
    excused:    { label: "Excused",      color: "var(--purple)", bg: "#EDE9FE" },
    not_marked: { label: "Not Yet Marked", color: "var(--text-3)", bg: "#F1F3F9" },
  };
  const attStatus = statusMap[todayStatus] || statusMap.not_marked;

  // FIXED: fee status from real API
  const hasOutstanding = stats?.outstandingFees > 0;

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">{getGreeting()}, {firstName} 👋</h1>
            <p className="page-subtitle">
              Viewing: <strong>{childName}</strong>
              {childClass && childClass !== "—" && (
                <span className="tag tag-blue" style={{ marginLeft: 8, fontSize: 11 }}>
                  Class {childClass}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="stat-grid">
          {/* FIXED: real attendance status */}
          <div className="stat-card">
            <div className="stat-icon" style={{ background: attStatus.bg }}>
              <CheckSquare size={20} style={{ color: attStatus.color }} />
            </div>
            <div>
              <div className="stat-label">Today's Attendance</div>
              {loading
                ? <Skeleton height={24} width={80} style={{ margin: "6px 0 4px" }} />
                : <div className="stat-value" style={{ color: attStatus.color, fontSize: 18 }}>
                    {attStatus.label}
                  </div>}
              {!loading && stats?.todayAttendance?.dateBs && (
                <div className="bs-date" style={{ fontSize: 11, marginTop: 3 }}>
                  {stats.todayAttendance.dateBs}
                </div>
              )}
            </div>
          </div>

          <StatCard
            icon={<BookOpen size={20} />} iconBg="#EEF1FE" iconColor="#1E3FF2"
            label="Pending Homework"
            value={loading ? "—" : (stats?.pendingHomework ?? 0)}
            trend={`Due this week for Class ${childClass}`}
            loading={loading}
          />

          {/* FIXED: real fee status */}
          <div className="stat-card">
            <div className="stat-icon" style={{ background: hasOutstanding ? "#FEE2E2" : "#DCFCE7" }}>
              <CreditCard size={20} style={{ color: hasOutstanding ? "var(--red)" : "var(--green)" }} />
            </div>
            <div>
              <div className="stat-label">Fee Status</div>
              {loading
                ? <Skeleton height={24} width={80} style={{ margin: "6px 0 4px" }} />
                : <div className="stat-value" style={{ color: hasOutstanding ? "var(--red)" : "var(--green)", fontSize: 18 }}>
                    {hasOutstanding
                      ? `NPR ${stats.outstandingFees.toLocaleString()} due`
                      : "Paid ✓"}
                  </div>}
              {!loading && (
                <div className={`stat-trend ${hasOutstanding ? "down" : ""}`}>
                  {hasOutstanding ? "Tap to view details" : "All fees cleared"}
                </div>
              )}
            </div>
          </div>

          <StatCard
            icon={<MessageSquare size={20} />} iconBg="#FEF3C7" iconColor="#D97706"
            label="Unread Messages"
            value={loading ? "—" : (stats?.unreadMessages ?? 0)}
            trend={stats?.unreadMessages > 0 ? "From teacher" : "No new messages"}
            trendDown={stats?.unreadMessages > 0}
            loading={loading}
          />
        </div>

        {/* Homework table */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">
              Upcoming Homework — Class {childClass}
            </div>
            <button
              onClick={() => navigate("/homework")}
              className="btn btn-ghost btn-sm"
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              View all <ArrowRight size={13} />
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            {loading ? (
              <div style={{ padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: 10 }}>
                {Array(3).fill(0).map((_, i) => <Skeleton key={i} height={36} radius={6} />)}
              </div>
            ) : homework.length === 0 ? (
              <EmptyState icon={BookOpen} message="No upcoming homework for your child's class." />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Subject</th>
                    <th>Due Date (BS)</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {homework.map(h => (
                    <tr key={h._id} onClick={() => navigate("/homework")} style={{ cursor: "pointer" }}>
                      <td style={{ fontWeight: 500 }}>{h.title}</td>
                      <td>{h.subject}</td>
                      <td>
                        <span className="bs-date">{h.dueDateBs || "—"}</span>
                        {h.dueDate && (
                          <span style={{ fontSize: 10, color: "var(--text-3)", display: "block" }}>
                            {new Date(h.dueDate).toLocaleDateString("en-NP")}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`tag ${PRIORITY_CLASS[h.priority] || "tag-gray"}`}>
                          {h.priority?.toUpperCase() || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid-2">
          <div
            className="card"
            style={{ padding: "1.25rem 1.5rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
            onClick={() => navigate("/attendance")}
          >
            <div className="stat-icon" style={{ background: "#EEF1FE", flexShrink: 0 }}>
              <Calendar size={18} color="#1E3FF2" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>
                View Attendance Calendar
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                Monthly attendance history for {childName}
              </div>
            </div>
            <ArrowRight size={16} color="var(--text-3)" style={{ marginLeft: "auto" }} />
          </div>
          <div
            className="card"
            style={{ padding: "1.25rem 1.5rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
            onClick={() => navigate("/results")}
          >
            <div className="stat-icon" style={{ background: "#DCFCE7", flexShrink: 0 }}>
              <TrendingUp size={18} color="#15803D" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>
                View Exam Results
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                Published results for {childName}
              </div>
            </div>
            <ArrowRight size={16} color="var(--text-3)" style={{ marginLeft: "auto" }} />
          </div>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// ROOT — role router
// ════════════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { currentUser } = useApp();

  if (!currentUser) return null;

  if (currentUser.role === "teacher") return <TeacherDashboard user={currentUser} />;
  if (currentUser.role === "parent")  return <ParentDashboard  user={currentUser} />;
  return <AdminDashboard user={currentUser} />;
}