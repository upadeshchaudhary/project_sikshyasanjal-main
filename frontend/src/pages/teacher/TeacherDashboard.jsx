import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/Topbar";
import axios from "axios";
import toast from "react-hot-toast";
import { Users, BookOpen, MessageSquare, ArrowRight } from "lucide-react";
import { getGreeting, Skeleton, StatCard, EmptyState } from "../Common/DashboardPage";

export default function TeacherDashboard({ user }) {
  const navigate = useNavigate();

  const [stats,    setStats]    = useState(null);
  const [homework, setHomework] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, hwRes] = await Promise.all([
          axios.get("/dashboard/teacher"),
          axios.get("/homework"),
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
                        <span className={`tag ${h.priority ? `tag-${h.priority}` : "tag-gray"}`}>
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
