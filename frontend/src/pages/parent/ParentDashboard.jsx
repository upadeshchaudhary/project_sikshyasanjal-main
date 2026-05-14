import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/Topbar";
import axios from "axios";
import toast from "react-hot-toast";
import { CheckSquare, BookOpen, CreditCard, MessageSquare, Calendar, TrendingUp, ArrowRight } from "lucide-react";
import { getGreeting, Skeleton, StatCard, EmptyState, PRIORITY_CLASS } from "../Common/DashboardPage";

export default function ParentDashboard({ user }) {
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

  const todayStatus = stats?.todayAttendance?.status || "not_marked";
  const statusMap   = {
    present:    { label: "Present ✓",    color: "var(--green)", bg: "#DCFCE7" },
    absent:     { label: "Absent ✗",     color: "var(--red)",   bg: "#FEE2E2" },
    late:       { label: "Late",         color: "var(--amber)", bg: "#FEF3C7" },
    excused:    { label: "Excused",      color: "var(--purple)", bg: "#EDE9FE" },
    not_marked: { label: "Not Yet Marked", color: "var(--text-3)", bg: "#F1F3F9" },
  };
  const attStatus = statusMap[todayStatus] || statusMap.not_marked;
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

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">Upcoming Homework — Class {childClass}</div>
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
