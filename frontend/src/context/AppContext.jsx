// src/context/AppContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const AppContext = createContext();

axios.defaults.baseURL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
axios.defaults.timeout = 10000;

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
  sidebarCollapsed:   false,
  showPhone:          false,
  twoFactorOTP:       true,
  sessionTimeout:     "30",
  schoolName:         "SikshyaSanjal Academy",
  schoolPhone:        "+977-1-4567890",
  schoolAddress:      "Kathmandu, Nepal",
  feeReminderDays:    "7",
  maxOTPAttempts:     "5",
};

function applyAxiosAuth(token, schoolSlug) {
  axios.defaults.headers.common["Authorization"]   = `Bearer ${token}`;
  axios.defaults.headers.common["x-school-domain"] = schoolSlug;
}

function clearAxiosAuth() {
  delete axios.defaults.headers.common["Authorization"];
  delete axios.defaults.headers.common["x-school-domain"];
}

function clearStorage() {
  localStorage.removeItem("ss_token");
  localStorage.removeItem("ss_school");
  localStorage.removeItem("user");
}

export const AppProvider = ({ children }) => {
  const [currentUser,   setCurrentUser]   = useState(null);
  const [school,        setSchool]        = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [settings,      setSettings]      = useState(DEFAULT_SETTINGS);
  const [authLoading,   setAuthLoading]   = useState(true);
  const [offline,       setOffline]       = useState(false);

  const restoringRef   = useRef(true);
  const currentUserRef = useRef(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // ── Session restore ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    restoringRef.current = true;

    const restore = async () => {
      const token      = localStorage.getItem("ss_token");
      const schoolSlug = localStorage.getItem("ss_school");

      if (!token || !schoolSlug) {
        restoringRef.current = false;
        if (!cancelled) setAuthLoading(false);
        return;
      }

      applyAxiosAuth(token, schoolSlug);

      try {
        const { data } = await axios.get("/auth/me");

        if (cancelled) return;

        // ✅ FIX: backend may not return `school` — only require `data.user`
        if (data.success && data.user) {
          setCurrentUser(data.user);
          currentUserRef.current = data.user;
          // Save user to localStorage so DashboardPage can read it as fallback
          localStorage.setItem("user", JSON.stringify(data.user));
          if (data.school) setSchool(data.school);

          try {
            const savedSettings = localStorage.getItem("ss_settings");
            if (savedSettings) {
              setSettings(s => ({ ...s, ...JSON.parse(savedSettings) }));
            }
          } catch { /* ignore corrupt settings */ }
        } else {
          clearStorage();
          clearAxiosAuth();
        }
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 401 || err.response?.status === 403) {
          clearStorage();
          clearAxiosAuth();
          if (err.response?.status === 403) {
            toast.error("Your account has been disabled. Contact the school administrator.");
          }
        }
        // Network / 5xx errors: keep token, user will retry on next refresh
      } finally {
        restoringRef.current = false;
        if (!cancelled) setAuthLoading(false);
      }
    };

    restore();
    return () => { cancelled = true; };
  }, []);

  // ── Axios response interceptor ─────────────────────────────────────────────
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => {
        if (offline) setOffline(false);
        return response;
      },
      (error) => {
        if (!error.response) {
          setOffline(true);
        }

        if (
          error.response?.status === 401 &&
          !restoringRef.current &&
          currentUserRef.current !== null
        ) {
          clearStorage();
          clearAxiosAuth();
          setCurrentUser(null);
          currentUserRef.current = null;
          setSchool(null);
          setNotifications([]);
          setSettings(DEFAULT_SETTINGS);
          toast.error("Your session has expired. Please log in again.");
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [offline]);

  // ── Login ─────────────────────────────────────────────────────────────────
  // ✅ FIX: all 3 params declared; slug derived safely; user saved to localStorage
  const login = useCallback((token, user, schoolData) => {
    const slug = schoolData?.slug || schoolData?.domain || user?.schoolId || "default";
    localStorage.setItem("ss_token",  token);
    localStorage.setItem("ss_school", slug);
    localStorage.setItem("user",      JSON.stringify(user)); // fallback for DashboardPage
    applyAxiosAuth(token, slug);
    setCurrentUser(user);
    currentUserRef.current = user;
    setSchool(schoolData || null);
    setNotifications([]);
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    clearStorage();
    clearAxiosAuth();
    setCurrentUser(null);
    currentUserRef.current = null;
    setSchool(null);
    setNotifications([]);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // ── Notifications ─────────────────────────────────────────────────────────
  const markNotifRead   = useCallback((id) =>
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n)), []);
  const markAllRead     = useCallback(() =>
    setNotifications(p => p.map(n => ({ ...n, read: true }))), []);
  const clearNotif      = useCallback((id) =>
    setNotifications(p => p.filter(n => n.id !== id)), []);
  const addNotification = useCallback((notif) =>
    setNotifications(p => [notif, ...p]), []);
  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Settings ──────────────────────────────────────────────────────────────
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem("ss_settings", JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Dark mode sync ────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  return (
    <AppContext.Provider value={{
      currentUser, school, authLoading, offline,
      login, logout: handleLogout,
      notifications, markNotifRead, markAllRead,
      clearNotif, addNotification, unreadCount,
      settings, updateSetting,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
};