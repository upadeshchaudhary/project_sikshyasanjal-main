// App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useApp } from "./context/AppContext";
import GoogleCallbackPage from "./pages/Common/GoogleCallbackPage";
import Sidebar from "./components/Sidebar";
import RoleSelection from "./pages/Common/RoleSelection";
import AdminLogin from "./pages/admin/AdminLogin";
import TeacherLogin from "./pages/teacher/TeacherLogin";
import ParentLogin from "./pages/parent/ParentLogin";
import DashboardPage from "./pages/Common/DashboardPage";
import StudentsPage from "./pages/teacher/StudentsPage";
import TeachersPage from "./pages/admin/TeachersPage";
import HomeworkPage from "./pages/teacher/HomeworkPage";
import AttendancePage from "./pages/Common/AttendancePage";
import ResultsPage from "./pages/Common/ResultsPage";
import NoticesPage from "./pages/Common/NoticesPage";
import FeesPage from "./pages/parent/FeesPage";
import MessagesPage from "./pages/Common/MessagesPage";
import RoutinePage from "./pages/Common/RoutinePage";
import CalendarPage from "./pages/Common/CalendarPage";
import SettingsPage from "./pages/admin/SettingsPage";
import "./index.css";

function RoleGuard({ allowedRoles, children }) {
  const { currentUser } = useApp();
  if (!allowedRoles.includes(currentUser?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppShell() {
  // ✅ FIX: removed the stray <Route> JSX that was floating outside any return()
  const { currentUser, authLoading } = useApp();

  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-spinner" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/admin"          element={<AdminLogin />} />
        <Route path="/teacher"        element={<TeacherLogin />} />
        <Route path="/parent"         element={<ParentLogin />} />
        <Route path="/"               element={<RoleSelection />} />
        <Route path="/auth/callback"  element={<GoogleCallbackPage />} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  const { settings } = useApp();

  return (
    <div className={`app-shell ${settings.sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar />
      <div className="main-area">
        <Routes>
          <Route path="/"              element={<Navigate to="/dashboard" replace />} />

          {/* ── All roles ──────────────────────────────────── */}
          <Route path="/dashboard"     element={<DashboardPage />} />
          <Route path="/auth/callback" element={<GoogleCallbackPage />} />
          <Route path="/homework"      element={<HomeworkPage />} />
          <Route path="/notices"       element={<NoticesPage />} />
          <Route path="/messages"      element={<MessagesPage />} />
          <Route path="/routine"       element={<RoutinePage />} />
          <Route path="/calendar"      element={<CalendarPage />} />
          <Route path="/results"       element={<ResultsPage />} />

          {/* ── Admin + Teacher only ───────────────────────── */}
          <Route
            path="/students"
            element={
              <RoleGuard allowedRoles={["admin", "teacher"]}>
                <StudentsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/attendance"
            element={
              <RoleGuard allowedRoles={["admin", "teacher", "parent"]}>
                <AttendancePage />
              </RoleGuard>
            }
          />

          {/* ── Admin only ─────────────────────────────────── */}
          <Route
            path="/teachers"
            element={
              <RoleGuard allowedRoles={["admin"]}>
                <TeachersPage />
              </RoleGuard>
            }
          />
          <Route
            path="/fees"
            element={
              <RoleGuard allowedRoles={["admin", "parent"]}>
                <FeesPage />
              </RoleGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <RoleGuard allowedRoles={["admin", "teacher", "parent"]}>
                <SettingsPage />
              </RoleGuard>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <AppShell />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: "'Sora', sans-serif",
            fontSize: "13px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
          },
          success: { iconTheme: { primary: "var(--green)", secondary: "#fff" } },
          error:   { iconTheme: { primary: "var(--red)",   secondary: "#fff" } },
        }}
      />
    </>
  );
}