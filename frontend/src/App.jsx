import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppProvider, useApp } from "./context/AppContext";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import StudentsPage from "./pages/StudentsPage";
import TeachersPage from "./pages/TeachersPage";
import HomeworkPage from "./pages/HomeworkPage";
import AttendancePage from "./pages/AttendancePage";
import ResultsPage from "./pages/ResultsPage";
import NoticesPage from "./pages/NoticesPage";
import FeesPage from "./pages/FeesPage";
import MessagesPage from "./pages/MessagesPage";
import RoutinePage from "./pages/RoutinePage";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import "./index.css";

// ─── Role-based route guard ───────────────────────────────────────────────────
// allowedRoles: array of roles that can access this route
// If user's role is not in allowedRoles → redirect to /dashboard
function RoleGuard({ allowedRoles, children }) {
  const { currentUser } = useApp();
  if (!allowedRoles.includes(currentUser?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// ─── Auth-aware shell ─────────────────────────────────────────────────────────
function AppShell() {
  const { currentUser, authLoading } = useApp();

  // While auth context is initialising (reading token from localStorage + validating),
  // render nothing — prevents the login-flash flicker bug.
  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-spinner" />
      </div>
    );
  }

  // Not logged in → only the login route is accessible
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Logged in → show full app shell with role-guarded routes
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Routes>
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* ── All roles ─────────────────────────────────── */}
          <Route path="/dashboard"  element={<DashboardPage />} />
          <Route path="/homework"   element={<HomeworkPage />} />
          <Route path="/notices"    element={<NoticesPage />} />
          <Route path="/messages"   element={<MessagesPage />} />
          <Route path="/routine"    element={<RoutinePage />} />
          <Route path="/calendar"   element={<CalendarPage />} />
          <Route path="/results"    element={<ResultsPage />} />

          {/* ── Admin + Teacher only ──────────────────────── */}
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
              <RoleGuard allowedRoles={["admin", "teacher"]}>
                <AttendancePage />
              </RoleGuard>
            }
          />

          {/* ── Admin only ───────────────────────────────── */}
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
              <RoleGuard allowedRoles={["admin"]}>
                <SettingsPage />
              </RoleGuard>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AppProvider>
  );
}