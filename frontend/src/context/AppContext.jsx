// src/context/AppContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { getCurrentAcademicYear } from "../utils/calendar";

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
  notifySMS:          false,
  notifyPush:         false,
  language:           "English",
  dateFormat:         "BS",
  theme:              "light",
  sidebarCollapsed:   false,
  hidePhone:          false,
  twoFactorOTP:       true,
  sessionTimeout:     "30",
  schoolName:         "SikshyaSanjal Academy",
  schoolPhone:        "+977-1-4567890",
  schoolAddress:      "Kathmandu, Nepal",
  feeReminderDays:    "7",
  maxOTPAttempts:     "5",
  academicYear:       getCurrentAcademicYear(),
  defaultClass:       "10A",
  paymentMethods:     ["Cash", "eSewa", "Khalti"],
  feeCategories:      ["Tuition Fee", "Exam Fee", "Sports Fee", "Library Fee", "Computer Lab Fee"],
};

function getSeedNotifications(user) {
  const role = user?.role || "parent";
  const base = [
    {
      id: "notif-1",
      type: "notice",
      title: "New notice posted",
      body: "The latest school notice is ready to review.",
      time: "Just now",
      read: false,
      link: "/notices",
    },
    {
      id: "notif-2",
      type: "message",
      title: "New message received",
      body: "A parent or teacher sent a new message.",
      time: "10 min ago",
      read: false,
      link: "/messages",
    },
  ];

  if (role === "admin") {
    return [
      ...base,
      {
        id: "notif-3",
        type: "student",
        title: "Attendance summary ready",
        body: "Review today's attendance overview for the school.",
        time: "1 hour ago",
        read: false,
        link: "/attendance",
      },
    ];
  }

  if (role === "teacher") {
    return [
      ...base,
      {
        id: "notif-3",
        type: "homework",
        title: "Homework reminder",
        body: "A new homework assignment was posted for your class.",
        time: "1 hour ago",
        read: false,
        link: "/homework",
      },
    ];
  }

  return [
    ...base,
    {
      id: "notif-3",
      type: "fee",
      title: "Fee reminder",
      body: "Your next fee installment is approaching its due date.",
      time: "2 hours ago",
      read: false,
      link: "/fees",
    },
  ];
}

function applyAxiosAuth(token) {
  axios.defaults.headers.common["Authorization"]   = `Bearer ${token}`;
}

function clearAxiosAuth() {
  delete axios.defaults.headers.common["Authorization"];
}

function clearStorage() {
  localStorage.removeItem("ss_token");
}

export const AppProvider = ({ children }) => {
  const [currentUser,   setCurrentUser]   = useState(null);
  const [school,        setSchool]        = useState(null);
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("ss_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [settings,      setSettings]      = useState(DEFAULT_SETTINGS);
  const [authLoading,   setAuthLoading]   = useState(true);
  const [offline,       setOffline]       = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);

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
      const token = localStorage.getItem("ss_token");

      if (!token) {
        restoringRef.current = false;
        if (!cancelled) setAuthLoading(false);
        return;
      }

      applyAxiosAuth(token);

      try {
        const { data } = await axios.get("/auth/me");
        if (cancelled) return;

        if (data.success && data.user && data.school) {
          setCurrentUser(data.user);
          currentUserRef.current = data.user;
          setSchool({ ...data.school, academicYear: getCurrentAcademicYear() });

          try {
            const savedSettings = localStorage.getItem("ss_settings");
            if (savedSettings) {
              const parsed = JSON.parse(savedSettings);
              parsed.academicYear = getCurrentAcademicYear();
              setSettings(s => ({ ...s, ...parsed }));
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
      } finally {
        restoringRef.current = false;
        if (!cancelled) setAuthLoading(false);
      }
    };

    restore();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    localStorage.setItem("ss_notifications", JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (!currentUser || notifications.length > 0) return;
    setNotifications(getSeedNotifications(currentUser));
  }, [currentUser, notifications.length]);

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

  // ── User Management ───────────────────────────────────────────────────────
  const login = useCallback((token, user, schoolData) => {
    localStorage.setItem("ss_token",  token);
    applyAxiosAuth(token);
    setCurrentUser(user);
    currentUserRef.current = user;
    setSchool(schoolData ? { ...schoolData, academicYear: getCurrentAcademicYear() } : null);
    setNotifications([]);
  }, []);

  const updateUser = useCallback((userData) => {
    setCurrentUser(prev => ({ ...prev, ...userData }));
    currentUserRef.current = { ...currentUserRef.current, ...userData };
  }, []);

  const updateSchool = useCallback((schoolData) => {
    setSchool(prev => ({ ...prev, ...schoolData, academicYear: getCurrentAcademicYear() }));
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
      next.academicYear = getCurrentAcademicYear();
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
      login, logout: handleLogout, updateUser, updateSchool,
      notifications, markNotifRead, markAllRead,
      clearNotif, addNotification, unreadCount,
      settings, updateSetting,
      mobileOpen, setMobileOpen,
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
