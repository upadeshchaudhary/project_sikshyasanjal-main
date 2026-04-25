// AppContext.jsx - Centralized state management for auth, notifications, and settings with session persistence and Axios integration.
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const AppContext = createContext();

// ─── Axios base config ────────────────────────────────────────────────────────
// Set your backend URL in .env as REACT_APP_API_URL
axios.defaults.baseURL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// ─── Default settings (no hardcoded school-specific data) ────────────────────
export const DEFAULT_SETTINGS = {
  notifyHomework:     true,
  notifyNotices:      true,
  notifyMessages:     true,
  notifyFees:         true,
  notifyResults:      true,
  notifyExamReminder: true,
  language:           "English",
  dateFormat:         "BS",
  theme:              "light",
  showPhone:          false,
  twoFactorOTP:       true,
  sessionTimeout:     "30",
  schoolName:         "SikshyaSanjal Academy",
  schoolPhone:        "+977-1-4567890",
  schoolAddress:      "Kathmandu, Nepal",
  feeReminderDays:    "7",
  maxOTPAttempts:     "5",
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AppProvider = ({ children }) => {
  const [currentUser,   setCurrentUser]   = useState(null);
  const [school,        setSchool]        = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [settings,      setSettings]      = useState(DEFAULT_SETTINGS);
  const [authLoading,   setAuthLoading]   = useState(true); // ← FIX: prevents flicker

  // ── Restore session from localStorage on mount ──────────────────────────────
  useEffect(() => {
    const restore = async () => {
      const token      = localStorage.getItem("ss_token");
      const schoolSlug = localStorage.getItem("ss_school");

      if (!token || !schoolSlug) {
        setAuthLoading(false);
        return;
      }

      // Attach headers for the validation call
      axios.defaults.headers.common["Authorization"]    = `Bearer ${token}`;
      axios.defaults.headers.common["x-school-domain"]  = schoolSlug;

      try {
        // Validate token against backend — /api/auth/me returns current user
        const { data } = await axios.get("/auth/me");
        setCurrentUser(data.user);
        setSchool(data.school);

        // Restore saved settings if any
        const savedSettings = localStorage.getItem("ss_settings");
        if (savedSettings) {
          setSettings(s => ({ ...s, ...JSON.parse(savedSettings) }));
        }
      } catch (err) {
        // Token invalid or expired — clean up silently
        localStorage.removeItem("ss_token");
        localStorage.removeItem("ss_school");
        delete axios.defaults.headers.common["Authorization"];
        delete axios.defaults.headers.common["x-school-domain"];
      } finally {
        setAuthLoading(false);
      }
    };

    restore();
  }, []);

  // ── Axios 401 interceptor — auto-logout on expired token ───────────────────
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired mid-session
          handleLogout();
          toast.error("Your session has expired. Please log in again.");
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback((token, user, schoolData) => {
    // Persist to localStorage
    localStorage.setItem("ss_token",  token);
    localStorage.setItem("ss_school", schoolData.slug);

    // Set Axios defaults so every subsequent request is scoped
    axios.defaults.headers.common["Authorization"]   = `Bearer ${token}`;
    axios.defaults.headers.common["x-school-domain"] = schoolData.slug;

    setCurrentUser(user);
    setSchool(schoolData);
    setNotifications([]); // real notifications fetched from API, not seeded
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    localStorage.removeItem("ss_token");
    localStorage.removeItem("ss_school");
    delete axios.defaults.headers.common["Authorization"];
    delete axios.defaults.headers.common["x-school-domain"];
    setCurrentUser(null);
    setSchool(null);
    setNotifications([]);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // ── Notifications ──────────────────────────────────────────────────────────
  const markNotifRead = useCallback((id) =>
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n)), []);

  const markAllRead = useCallback(() =>
    setNotifications(p => p.map(n => ({ ...n, read: true }))), []);

  const clearNotif = useCallback((id) =>
    setNotifications(p => p.filter(n => n.id !== id)), []);

  const addNotification = useCallback((notif) =>
    setNotifications(p => [notif, ...p]), []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Settings ───────────────────────────────────────────────────────────────
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem("ss_settings", JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Dark mode sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  return (
    <AppContext.Provider value={{
      // Auth
      currentUser,
      school,
      authLoading,
      login,
      logout: handleLogout,

      // Notifications
      notifications,
      markNotifRead,
      markAllRead,
      clearNotif,
      addNotification,
      unreadCount,

      // Settings
      settings,
      updateSetting,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);