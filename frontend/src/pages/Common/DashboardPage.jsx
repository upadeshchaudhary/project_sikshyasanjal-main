import { useApp } from "../../context/AppContext";
import AdminDashboard from "../admin/AdminDashboard";
import TeacherDashboard from "../teacher/TeacherDashboard";
import ParentDashboard from "../parent/ParentDashboard";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Skeleton({ height = 20, width = "100%", radius = 6, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ height, width, borderRadius: radius, ...style }}
    />
  );
}

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

function EmptyState({ icon: Icon, message }) {
  return (
    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-3)" }}>
      <Icon size={32} style={{ marginBottom: 8, opacity: 0.35 }} />
      <p style={{ fontSize: 13 }}>{message}</p>
    </div>
  );
}

const CATEGORY_TAG = {
  exam:    "tag-purple",
  holiday: "tag-green",
  event:   "tag-blue",
  urgent:  "tag-red",
  general: "tag-gray",
  meeting: "tag-amber",
};

const PRIORITY_CLASS = { high: "tag-red", medium: "tag-amber", low: "tag-green" };

export {
  getGreeting,
  Skeleton,
  StatCard,
  EmptyState,
  CATEGORY_TAG,
  PRIORITY_CLASS,
};

export default function DashboardPage() {
  const { currentUser } = useApp();

  if (!currentUser) return null;
  if (currentUser.role === "teacher") return <TeacherDashboard user={currentUser} />;
  if (currentUser.role === "parent")  return <ParentDashboard user={currentUser} />;
  return <AdminDashboard user={currentUser} />;
}
