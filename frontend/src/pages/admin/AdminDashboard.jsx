import { useState, useEffect, useCallback, useRef  } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/Topbar";
import axios from "axios";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import {
  Users, GraduationCap, CheckSquare, TrendingUp,
  AlertCircle, BookOpen, MessageSquare, CreditCard,
  Calendar, ArrowRight, RefreshCw,
} from "lucide-react";
import {
  getGreeting,
  Skeleton,
  StatCard,
  EmptyState,
  CATEGORY_TAG,
} from "../Common/DashboardPage";

export default function AdminDashboard({ user }) {
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
        axios.get("/dashboard/admin/stats"),
        axios.get("/notices/important"),
        axios.get("/homework"),
      ]);

      setStats(statsRes.data);
      setNotices(noticesRes.data.notices  || []);
      setHomework(homeworkRes.data.homework || []);
    } catch (err) {
      if (!isRefresh) toast.error("Failed to load dashboard data.");
      // Set default fallback values to prevent undefined errors
      setStats(null);
      setNotices([]);
      setHomework([]);
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
