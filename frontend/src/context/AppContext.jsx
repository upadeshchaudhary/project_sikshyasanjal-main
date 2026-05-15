// // AppContext.jsx - Centralized state management for auth, notifications, and settings with session persistence and Axios integration.
// import { createContext, useContext, useState, useEffect, useCallback } from "react";
// import axios from "axios";
// import toast from "react-hot-toast";

// const AppContext = createContext();

// // ─── Axios base config ────────────────────────────────────────────────────────
// // Set your backend URL in .env as REACT_APP_API_URL
// axios.defaults.baseURL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// // ─── Default settings (no hardcoded school-specific data) ────────────────────
// export const DEFAULT_SETTINGS = {
//   notifyHomework:     true,
//   notifyNotices:      true,
//   notifyMessages:     true,
//   notifyFees:         true,
//   notifyResults:      true,
//   notifyExamReminder: true,
//   language:           "English",
//   dateFormat:         "BS",
//   theme:              "light",
//   showPhone:          false,
//   twoFactorOTP:       true,
//   sessionTimeout:     "30",
//   schoolName:         "SikshyaSanjal Academy",
//   schoolPhone:        "+977-1-4567890",
//   schoolAddress:      "Kathmandu, Nepal",
//   feeReminderDays:    "7",
//   maxOTPAttempts:     "5",
// };

// // ─── Provider ─────────────────────────────────────────────────────────────────
// export const AppProvider = ({ children }) => {
//   const [currentUser,   setCurrentUser]   = useState(null);
//   const [school,        setSchool]        = useState(null);
//   const [notifications, setNotifications] = useState([]);
//   const [settings,      setSettings]      = useState(DEFAULT_SETTINGS);
//   const [authLoading,   setAuthLoading]   = useState(true); // ← FIX: prevents flicker

//   // ── Restore session from localStorage on mount ──────────────────────────────
//   useEffect(() => {
//     const restore = async () => {
//       const token      = localStorage.getItem("ss_token");
//       const schoolSlug = localStorage.getItem("ss_school");

//       if (!token || !schoolSlug) {
//         setAuthLoading(false);
//         return;
//       }

//       // Attach headers for the validation call
//       axios.defaults.headers.common["Authorization"]    = `Bearer ${token}`;
//       axios.defaults.headers.common["x-school-domain"]  = schoolSlug;

//       try {
//         // Validate token against backend — /api/auth/me returns current user
//         const { data } = await axios.get("/auth/me");
//         setCurrentUser(data.user);
//         setSchool(data.school);

//         // Restore saved settings if any
//         const savedSettings = localStorage.getItem("ss_settings");
//         if (savedSettings) {
//           setSettings(s => ({ ...s, ...JSON.parse(savedSettings) }));
//         }
//       } catch (err) {
//         // Token invalid or expired — clean up silently
//         localStorage.removeItem("ss_token");
//         localStorage.removeItem("ss_school");
//         delete axios.defaults.headers.common["Authorization"];
//         delete axios.defaults.headers.common["x-school-domain"];
//       } finally {
//         setAuthLoading(false);
//       }
//     };

//     restore();
//   }, []);

//   // ── Axios 401 interceptor — auto-logout on expired token ───────────────────
//   useEffect(() => {
//     const interceptor = axios.interceptors.response.use(
//       (response) => response,
//       (error) => {
//         if (error.response?.status === 401) {
//           // Token expired mid-session
//           handleLogout();
//           toast.error("Your session has expired. Please log in again.");
//         }
//         return Promise.reject(error);
//       }
//     );
//     return () => axios.interceptors.response.eject(interceptor);
//   }, []); // eslint-disable-line react-hooks/exhaustive-deps

//   // ── Login ──────────────────────────────────────────────────────────────────
//   const login = useCallback((token, user, schoolData) => {
//     // Persist to localStorage
//     localStorage.setItem("ss_token",  token);
//     localStorage.setItem("ss_school", schoolData.slug);

//     // Set Axios defaults so every subsequent request is scoped
//     axios.defaults.headers.common["Authorization"]   = `Bearer ${token}`;
//     axios.defaults.headers.common["x-school-domain"] = schoolData.slug;

//     setCurrentUser(user);
//     setSchool(schoolData);
//     setNotifications([]); // real notifications fetched from API, not seeded
//   }, []);

//   // ── Logout ─────────────────────────────────────────────────────────────────
//   const handleLogout = useCallback(() => {
//     localStorage.removeItem("ss_token");
//     localStorage.removeItem("ss_school");
//     delete axios.defaults.headers.common["Authorization"];
//     delete axios.defaults.headers.common["x-school-domain"];
//     setCurrentUser(null);
//     setSchool(null);
//     setNotifications([]);
//     setSettings(DEFAULT_SETTINGS);
//   }, []);

//   // ── Notifications ──────────────────────────────────────────────────────────
//   const markNotifRead = useCallback((id) =>
//     setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n)), []);

//   const markAllRead = useCallback(() =>
//     setNotifications(p => p.map(n => ({ ...n, read: true }))), []);

//   const clearNotif = useCallback((id) =>
//     setNotifications(p => p.filter(n => n.id !== id)), []);

//   const addNotification = useCallback((notif) =>
//     setNotifications(p => [notif, ...p]), []);

//   const unreadCount = notifications.filter(n => !n.read).length;

//   // ── Settings ───────────────────────────────────────────────────────────────
//   const updateSetting = useCallback((key, value) => {
//     setSettings(prev => {
//       const next = { ...prev, [key]: value };
//       localStorage.setItem("ss_settings", JSON.stringify(next));
//       return next;
//     });
//   }, []);

//   // ── Dark mode sync ─────────────────────────────────────────────────────────
//   useEffect(() => {
//     document.body.classList.toggle("dark", settings.theme === "dark");
//   }, [settings.theme]);

//   return (
//     <AppContext.Provider value={{
//       // Auth
//       currentUser,
//       school,
//       authLoading,
//       login,
//       logout: handleLogout,

//       // Notifications
//       notifications,
//       markNotifRead,
//       markAllRead,
//       clearNotif,
//       addNotification,
//       unreadCount,

//       // Settings
//       settings,
//       updateSetting,
//     }}>
//       {children}
//     </AppContext.Provider>
//   );
// };

// export const useApp = () => useContext(AppContext);




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
}

export const AppProvider = ({ children }) => {
  const [currentUser,   setCurrentUser]   = useState(null);
  const [school,        setSchool]        = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [settings,      setSettings]      = useState(DEFAULT_SETTINGS);
  const [authLoading,   setAuthLoading]   = useState(true);
  const [offline,       setOffline]       = useState(false);

  // Track whether session restore is in progress.
  // The interceptor must NOT clear the session during this window,
  // because /auth/me itself could 401 (expired token) and we handle
  // that case explicitly in the restore logic below.
  const restoringRef   = useRef(true);
  // Keep a ref to currentUser so the interceptor always sees the latest
  // value without needing to re-register on every render.
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

        if (data.success && data.user && data.school) {
          setCurrentUser(data.user);
          currentUserRef.current = data.user;
          setSchool(data.school);

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
        
        // Only clear session if the server explicitly rejects the token (401)
        // or the account is disabled (403). For other errors (network issues, 500s),
        // we keep the token so the user can try again on next refresh.
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
          // Use functional logout to avoid stale closure
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
  const login = useCallback((token, user, schoolData) => {
    const slug = schoolData.slug || schoolData.domain;
    localStorage.setItem("ss_token",  token);
    localStorage.setItem("ss_school", slug);
    applyAxiosAuth(token, slug);
    setCurrentUser(user);
    currentUserRef.current = user;
    setSchool(schoolData);
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