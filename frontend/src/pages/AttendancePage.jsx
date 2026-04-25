import { useState, useEffect, useCallback, useMemo } from "react";
import Topbar from "../components/Topbar";
import { useApp } from "../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Save, ChevronLeft, ChevronRight, Clock,
  Info, CheckCheck, RefreshCw, Users,
} from "lucide-react";
import { getDaysInBSMonth, BS_MONTH_NAMES } from "../utils/calendar";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["present", "absent", "late", "excused"];
const STATUS_LABEL   = { present: "P", absent: "A", late: "L", excused: "E" };
const STATUS_FULL    = { present: "Present", absent: "Absent", late: "Late", excused: "Excused" };
const STATUS_COLOR   = { present: "#15803D", absent: "#DC2626", late: "#D97706", excused: "#7C3AED" };
const STATUS_BG      = { present: "#DCFCE7", absent: "#FEE2E2", late: "#FEF3C7", excused: "#EDE9FE" };

// Day names for calendar header
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Helpers ───────────────────────────────────────────────────────────────────

// Anchor: 1 Baisakh 2082 = Saturday (April 14, 2025 AD) → DOW index 6
const ANCHOR = { year: 2082, month: 1, dow: 6 };

function getDaysBefore(year, month) {
  let total = 0;
  for (let y = ANCHOR.year; y < year; y++)
    for (let m = 1; m <= 12; m++) total += getDaysInBSMonth(y, m);
  for (let m = ANCHOR.month; m < month; m++) total += getDaysInBSMonth(year, m);
  return total;
}

function getFirstDayOfMonth(year, month) {
  return (ANCHOR.dow + getDaysBefore(year, month)) % 7;
}

// Convert AD Date to a "YYYY-MM-DD" BS string using today's date from the system
// For a production app, use a proper nepali-date library or backend BS conversion
function getTodayBS() {
  // Use the app's BS utility if available, otherwise approximate
  // This is a simplified mapping — production should use a proper BS converter
  const now = new Date();
  // Approximate: if today is between April 13 – April 13 (next year) = Baisakh 1 of that BS year
  // For now we store the year difference: AD year + 56/57 ≈ BS year
  // Real implementation should use a lookup table
  const adYear  = now.getFullYear();
  const adMonth = now.getMonth() + 1; // 1-indexed
  const adDay   = now.getDate();

  // Approximate BS year (accurate enough for UI purposes)
  const bsYear = adMonth > 4 || (adMonth === 4 && adDay >= 14)
    ? adYear + 57
    : adYear + 56;

  // Approximate BS month from AD month (very rough — use nepali-date in production)
  // Baisakh = mid April to mid May, Jestha = mid May to mid June, etc.
  const monthOffset = ((adMonth - 4 + 12) % 12);
  const bsMonth     = (monthOffset + 1 > 12) ? monthOffset - 11 : monthOffset + 1;
  const bsDay       = adDay; // rough approximation

  return { year: bsYear, month: bsMonth, day: bsDay };
}

function isSaturday(dow) { return dow === 6; }
function isFriday(dow)   { return dow === 5; }

function formatBsDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isPastOrToday(year, month, day, today) {
  if (year  < today.year)  return true;
  if (year  > today.year)  return false;
  if (month < today.month) return true;
  if (month > today.month) return false;
  return day <= today.day;
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton({ height = 20, width = "100%", radius = 6, style = {} }) {
  return (
    <div className="skeleton" style={{ height, width, borderRadius: radius, ...style }} />
  );
}

// ── Nepal live clock ──────────────────────────────────────────────────────────
function NepalClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const nepalMs = now.getTime() + now.getTimezoneOffset() * 60000 + (5 * 60 + 45) * 60000;
  const n       = new Date(nepalMs);
  const h       = (n.getHours() % 12 || 12).toString().padStart(2, "0");
  const m       = n.getMinutes().toString().padStart(2, "0");
  const s       = n.getSeconds().toString().padStart(2, "0");
  const ampm    = n.getHours() >= 12 ? "PM" : "AM";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "8px 14px", boxShadow: "var(--shadow)",
    }}>
      <Clock size={14} style={{ color: "var(--blue)" }} />
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
        {h}:{m}:{s}
      </span>
      <span style={{ fontSize: 11, color: "var(--text-3)" }}>{ampm} · NST</span>
    </div>
  );
}

// ── Month navigator ───────────────────────────────────────────────────────────
function MonthNav({ year, month, today, onChange }) {
  const canNext = !(year === today.year && month >= today.month);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button className="btn btn-outline btn-sm"
        onClick={() => onChange(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1)}>
        <ChevronLeft size={14} />
      </button>
      <span style={{
        fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700,
        color: "var(--text)", minWidth: 160, textAlign: "center",
      }}>
        {BS_MONTH_NAMES[month - 1]} {year} BS
      </span>
      <button className="btn btn-outline btn-sm" disabled={!canNext}
        onClick={() => onChange(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1)}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {[
        ["P", "Present",  "#15803D", "#DCFCE7"],
        ["A", "Absent",   "#DC2626", "#FEE2E2"],
        ["L", "Late",     "#D97706", "#FEF3C7"],
        ["E", "Excused",  "#7C3AED", "#EDE9FE"],
        ["H", "Holiday",  "#DC2626", "#FEF2F2"],
        ["—", "No school / Future", "var(--border)", "transparent"],
      ].map(([badge, label, color, bg]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-2)" }}>
          <div style={{
            width: 20, height: 20, borderRadius: 5, background: bg, color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 800, border: "1px solid var(--border)",
          }}>
            {badge}
          </div>
          {label}
        </div>
      ))}
    </div>
  );
}

// ── Student Calendar — real data from API ─────────────────────────────────────
function StudentCalendar({ studentId, studentName, studentRollNo, studentClass, year, month, today, onMonthChange, holidays }) {
  const [records,  setRecords]  = useState({});
  const [loading,  setLoading]  = useState(true);
  const [hovered,  setHovered]  = useState(null);

  const days     = getDaysInBSMonth(year, month);
  const firstDow = getFirstDayOfMonth(year, month);

  // FIXED: fetch real attendance from API
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/attendance/monthly", {
          params: { year, month, student: studentId },
        });
        if (cancelled) return;
        // Build map of dateBs → status
        const map = {};
        (res.data.records || []).forEach(r => {
          if (r.dateBs) map[r.dateBs] = r.status;
        });
        setRecords(map);
      } catch {
        if (!cancelled) setRecords({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [studentId, year, month]);

  // FIXED: holiday set from API data (not hardcoded)
  const holidaySet = useMemo(() => {
    const set = new Set();
    holidays.forEach(h => {
      if (h.startDateBs) set.add(h.startDateBs.slice(0, 7) === `${year}-${String(month).padStart(2, "0")}` ? h.startDateBs : null);
    });
    return set;
  }, [holidays, year, month]);

  // Summary counts from real data
  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0, holiday: 0 };
    for (let d = 1; d <= days; d++) {
      const dow = (firstDow + d - 1) % 7;
      const key = formatBsDate(year, month, d);
      if (!isPastOrToday(year, month, d, today)) continue;
      if (isSaturday(dow) || holidaySet.has(key)) { c.holiday++; continue; }
      const st = records[key];
      if (st && c[st] !== undefined) c[st]++;
    }
    return c;
  }, [records, days, firstDow, year, month, today, holidaySet]);

  const schoolDays = counts.present + counts.absent + counts.late + counts.excused;
  const rate = schoolDays > 0
    ? Math.round(((counts.present + counts.late) / schoolDays) * 100)
    : null;

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="card-header" style={{ paddingBottom: 10 }}>
        <div>
          <div className="card-title" style={{ fontSize: 14 }}>{studentName}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
            Class {studentClass} · Roll {studentRollNo}
          </div>
        </div>
        <MonthNav year={year} month={month} today={today} onChange={onMonthChange} />
      </div>

      <div className="card-body" style={{ paddingTop: 0 }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton height={24} />
            <Skeleton height={160} radius={8} />
            <Skeleton height={48} radius={8} />
          </div>
        ) : (
          <>
            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 4 }}>
              {DAY_NAMES.map((d, i) => (
                <div key={d} style={{
                  textAlign: "center", fontSize: 10, fontWeight: 700, paddingBottom: 4,
                  color: i === 6 ? "#DC2626" : i === 5 ? "#D97706" : "var(--text-3)",
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
              {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: days }, (_, i) => {
                const day    = i + 1;
                const dow    = (firstDow + i) % 7;
                const key    = formatBsDate(year, month, day);
                const future = !isPastOrToday(year, month, day, today);
                const isSat  = isSaturday(dow);
                const isFri  = isFriday(dow);
                const isToday = year === today.year && month === today.month && day === today.day;
                const isHol  = isSat || holidaySet.has(key);
                const status = isHol ? "holiday" : (records[key] || null);

                let bg    = future ? "transparent" : "var(--canvas)";
                let color = "var(--border)";
                let badge = "";

                if (!future) {
                  if (isHol) { bg = "#FEF2F2"; color = "#DC2626"; badge = "H"; }
                  else if (status === "present") { bg = STATUS_BG.present; color = STATUS_COLOR.present; badge = "P"; }
                  else if (status === "absent")  { bg = STATUS_BG.absent;  color = STATUS_COLOR.absent;  badge = "A"; }
                  else if (status === "late")    { bg = STATUS_BG.late;    color = STATUS_COLOR.late;    badge = "L"; }
                  else if (status === "excused") { bg = STATUS_BG.excused; color = STATUS_COLOR.excused; badge = "E"; }
                  else { bg = "var(--canvas)"; color = "var(--text-3)"; badge = ""; } // not yet marked
                }

                return (
                  <div
                    key={day}
                    onMouseEnter={() => setHovered(day)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      borderRadius: 6, padding: "6px 2px", textAlign: "center",
                      background: bg, opacity: future ? 0.35 : 1,
                      border: isToday
                        ? "2px solid var(--blue)"
                        : hovered === day && !future
                          ? "2px solid var(--border-mid)"
                          : "2px solid transparent",
                      transition: "border 0.1s",
                      position: "relative",
                      cursor: future ? "default" : "default",
                    }}
                  >
                    <div style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 11, fontWeight: 600, color, lineHeight: 1.2,
                    }}>
                      {day}
                    </div>
                    {badge && (
                      <div style={{ fontSize: 8, fontWeight: 800, color, marginTop: 1 }}>{badge}</div>
                    )}
                    {isFri && !future && !isHol && (
                      <div style={{ position: "absolute", bottom: 1, right: 2, fontSize: 6, color: "#D97706", fontWeight: 700 }}>½</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hover tooltip */}
            {hovered && !isPastOrToday(year, month, hovered, today) === false && (() => {
              const dow    = (firstDow + hovered - 1) % 7;
              const key    = formatBsDate(year, month, hovered);
              const future = !isPastOrToday(year, month, hovered, today);
              if (future) return null;
              const isHol  = isSaturday(dow) || holidaySet.has(key);
              const status = isHol ? "holiday" : (records[key] || "not_marked");
              const label  = isHol ? "School Holiday"
                : status === "not_marked" ? "Not yet marked"
                : STATUS_FULL[status];
              const col    = isHol ? "#DC2626" : (STATUS_COLOR[status] || "var(--text-3)");
              const bg2    = isHol ? "#FEF2F2" : (STATUS_BG[status] || "var(--canvas)");
              return (
                <div style={{
                  marginTop: 10, padding: "8px 12px",
                  background: bg2, borderRadius: 8,
                  display: "flex", alignItems: "center", gap: 8, fontSize: 12,
                }}>
                  <span className="bs-date">{hovered} {BS_MONTH_NAMES[month - 1]} {year} BS</span>
                  <span style={{ color: col, fontWeight: 700 }}>{label}</span>
                  {isFriday(dow) && !isHol && (
                    <span style={{ fontSize: 10, color: "#D97706" }}>· Half day (Friday)</span>
                  )}
                </div>
              );
            })()}

            {/* Summary row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6, marginTop: 14 }}>
              {[
                { label: "Present",  val: counts.present, color: "#15803D", bg: "#DCFCE7" },
                { label: "Absent",   val: counts.absent,  color: "#DC2626", bg: "#FEE2E2" },
                { label: "Late",     val: counts.late,    color: "#D97706", bg: "#FEF3C7" },
                { label: "Excused",  val: counts.excused, color: "#7C3AED", bg: "#EDE9FE" },
                { label: "Holiday",  val: counts.holiday, color: "#DC2626", bg: "#FEF2F2" },
                {
                  label: "Rate",
                  val: rate !== null ? `${rate}%` : "—",
                  color: rate === null ? "var(--text-3)" : rate >= 75 ? "#15803D" : "#DC2626",
                  bg: "var(--canvas)",
                },
              ].map(item => (
                <div key={item.label} style={{
                  background: item.bg, borderRadius: 8,
                  padding: "8px 4px", textAlign: "center",
                }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 16, fontWeight: 700, color: item.color,
                  }}>
                    {item.val}
                  </div>
                  <div style={{
                    fontSize: 9, color: "var(--text-3)", fontWeight: 600,
                    marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
export default function AttendancePage() {
  const { currentUser } = useApp();

  // Compute role at render time — never store in useState
  const isParent  = currentUser?.role === "parent";
  const isTeacher = currentUser?.role === "teacher";
  const isAdmin   = currentUser?.role === "admin";

  // FIXED: derive today dynamically — not hardcoded
  const today = useMemo(() => getTodayBS(), []);

  // Navigation state
  const [year,  setYear]  = useState(today.year);
  const [month, setMonth] = useState(today.month);

  // Teacher/admin data
  const [classes,       setClasses]       = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students,      setStudents]      = useState([]);
  const [attendance,    setAttendance]    = useState({});   // { studentId: status }
  const [existingRecs,  setExistingRecs]  = useState({});   // already saved for today
  const [holidays,      setHolidays]      = useState([]);   // from API
  const [view,          setView]          = useState("calendar");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving,        setSaving]        = useState(false);

  // FIXED: today's BS key for marking
  const todayKey = formatBsDate(today.year, today.month, today.day);

  // FIXED: day-of-week for today (to check if school is open)
  const todayFirstDow = getFirstDayOfMonth(today.year, today.month);
  const todayDow      = (todayFirstDow + today.day - 1) % 7;
  const todayIsHoliday = holidays.some(h => h.startDateBs === todayKey || h.startDateBs?.startsWith(todayKey));
  const schoolClosedToday = isSaturday(todayDow) || todayIsHoliday;

  // FIXED: fetch holidays from API (not hardcoded)
  useEffect(() => {
    axios.get("/calendar/holidays", { params: { academicYear: `${today.year}-${String(today.year - 2056).padStart(2, "0")}` } })
      .then(res => setHolidays(res.data.holidays || []))
      .catch(() => setHolidays([]));
  }, [today.year]);

  // FIXED: fetch available classes from API (not from mockData)
  useEffect(() => {
    if (!isParent) {
      axios.get("/students/classes")
        .then(res => {
          const classList = res.data.classes || [];
          setClasses(classList);
          if (classList.length > 0 && !selectedClass) {
            setSelectedClass(classList[0]);
          }
        })
        .catch(() => setClasses([]));
    }
  }, [isParent, selectedClass]);

  // FIXED: fetch students for selected class from API
  useEffect(() => {
    if (!selectedClass || isParent) return;
    setLoadingStudents(true);
    axios.get("/students", { params: { class: selectedClass, limit: 100 } })
      .then(res => {
        const list = res.data.students || [];
        setStudents(list);
        // Pre-fill attendance state — default all to "present"
        const defaultAtt = {};
        list.forEach(s => { defaultAtt[s._id] = "present"; });
        setAttendance(defaultAtt);
      })
      .catch(() => { setStudents([]); toast.error("Failed to load students."); })
      .finally(() => setLoadingStudents(false));
  }, [selectedClass, isParent]);

  // FIXED: load today's existing attendance records so teacher sees what was already marked
  useEffect(() => {
    if (!selectedClass || isParent || view !== "daily") return;
    axios.get("/attendance", {
      params: { class: selectedClass, date: todayKey },
    })
      .then(res => {
        const existing = {};
        (res.data.records || []).forEach(r => {
          existing[r.student?._id || r.student] = r.status;
        });
        setExistingRecs(existing);
        // Merge existing into attendance state
        setAttendance(prev => ({ ...prev, ...existing }));
      })
      .catch(() => {});
  }, [selectedClass, view, todayKey, isParent]);

  const handleMonthChange = useCallback((y, m) => {
    setYear(y); setMonth(m);
  }, []);

  // FIXED: real bulk attendance save
  const handleSave = async () => {
    if (!selectedClass || students.length === 0) return;

    const records = students.map(s => ({
      student: s._id,
      status:  attendance[s._id] || "present",
      note:    "",
    }));

    setSaving(true);
    try {
      await axios.post("/attendance/bulk", {
        records,
        date:    todayKey,
        dateBs:  todayKey,
        class:   selectedClass,
      });
      toast.success(
        `Attendance saved for Class ${selectedClass} — ${today.day} ${BS_MONTH_NAMES[today.month - 1]} ${today.year} BS`
      );
      // Reload existing records
      setExistingRecs({ ...attendance });
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save attendance.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Mark all present shortcut
  const markAllPresent = () => {
    const all = {};
    students.forEach(s => { all[s._id] = "present"; });
    setAttendance(all);
  };

  // ── Parent view ──────────────────────────────────────────────────────────────
  if (isParent) {
    const childId    = currentUser?.childId;
    const childName  = currentUser?.childName  || "Your Child";
    const childClass = currentUser?.childClass || "—";
    const childRoll  = currentUser?.childRollNo || "—";

    if (!childId) {
      return (
        <>
          <Topbar title="Attendance" />
          <div className="page-content">
            <div className="empty-state">
              <Users size={48} />
              <h3>No child linked</h3>
              <p>Contact your school administrator to link your child's account.</p>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <Topbar title="Attendance" />
        <div className="page-content">
          <div className="page-header">
            <div className="page-header-left">
              <h1 className="page-title">Attendance</h1>
              <p className="page-subtitle">
                {childName} · Class {childClass} · Academic Year {today.year} BS
              </p>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}><Legend /></div>
          {/* FIXED: real student data from API via currentUser */}
          <StudentCalendar
            studentId={childId}
            studentName={childName}
            studentClass={childClass}
            studentRollNo={childRoll}
            year={year}
            month={month}
            today={today}
            onMonthChange={handleMonthChange}
            holidays={holidays}
          />
        </div>
      </>
    );
  }

  // ── Teacher / Admin view ──────────────────────────────────────────────────────
  return (
    <>
      <Topbar title="Attendance" />
      <div className="page-content">

        {/* Header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Attendance</h1>
            <p className="page-subtitle">
              Academic Year {today.year} BS (Baisakh–Chaitra)
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <NepalClock />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className={`btn btn-sm ${view === "calendar" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setView("calendar")}
              >
                Calendar
              </button>
              <button
                className={`btn btn-sm ${view === "daily" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setView("daily")}
              >
                Mark Today
              </button>
            </div>
          </div>
        </div>

        {/* School closed alert */}
        {view === "daily" && schoolClosedToday && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", background: "#FEF2F2",
            border: "1px solid #FCA5A5", borderRadius: 10, marginBottom: 16, fontSize: 13,
          }}>
            <Info size={16} style={{ color: "#DC2626", flexShrink: 0 }} />
            <span style={{ color: "#DC2626", fontWeight: 500 }}>
              Today is a {isSaturday(todayDow) ? "Saturday holiday" : "public holiday"} — school is closed.
              No attendance marking required.
            </span>
          </div>
        )}

        {/* Class selector — FIXED: role-scoped from API */}
        <div className="filter-bar" style={{ marginBottom: 16 }}>
          <select
            className="form-select"
            style={{ width: "auto" }}
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
          >
            {classes.length === 0
              ? <option value="">No classes assigned</option>
              : classes.map(c => <option key={c} value={c}>{c}</option>)
            }
          </select>

          {view === "daily" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>Date:</span>
              <span className="bs-date" style={{
                background: "var(--canvas)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "6px 12px", fontSize: 13,
              }}>
                {today.day} {BS_MONTH_NAMES[today.month - 1]} {today.year} BS
              </span>
            </div>
          )}
        </div>

        {/* ── CALENDAR VIEW ── */}
        {view === "calendar" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <Legend />
              <MonthNav year={year} month={month} today={today} onChange={handleMonthChange} />
            </div>

            {loadingStudents ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Array(3).fill(0).map((_, i) => <Skeleton key={i} height={300} radius={12} />)}
              </div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <h3>No students found</h3>
                <p>No students in class {selectedClass}.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {students.map(s => (
                  <StudentCalendar
                    key={s._id}
                    studentId={s._id}
                    studentName={s.name}
                    studentClass={s.class}
                    studentRollNo={s.rollNo}
                    year={year}
                    month={month}
                    today={today}
                    onMonthChange={handleMonthChange}
                    holidays={holidays}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── DAILY MARK VIEW ── */}
        {view === "daily" && (
          <>
            {schoolClosedToday ? (
              <div style={{
                padding: "40px 24px", textAlign: "center",
                color: "var(--text-3)", background: "var(--canvas)", borderRadius: 12,
              }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🏖️</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                  School is closed today
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  {isSaturday(todayDow) ? "Saturday is a public holiday in Nepal" : "Public holiday — no attendance required"}
                </div>
              </div>
            ) : loadingStudents ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "1rem" }}>
                {Array(6).fill(0).map((_, i) => <Skeleton key={i} height={40} radius={6} />)}
              </div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <h3>No students found</h3>
                <p>No students enrolled in class {selectedClass}.</p>
              </div>
            ) : (
              <>
                {/* Bulk actions */}
                <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                  <button className="btn btn-outline btn-sm" onClick={markAllPresent}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCheck size={13} /> Mark All Present
                  </button>
                  <div style={{ fontSize: 12, color: "var(--text-3)", alignSelf: "center" }}>
                    {students.length} students · Class {selectedClass}
                  </div>
                  {Object.keys(existingRecs).length > 0 && (
                    <span className="tag tag-green" style={{ alignSelf: "center" }}>
                      ✓ Already saved today
                    </span>
                  )}
                </div>

                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Roll No</th>
                        <th>Name</th>
                        {STATUS_OPTIONS.map(s => (
                          <th key={s} style={{ textAlign: "center" }}>
                            <span style={{ color: STATUS_COLOR[s], fontWeight: 700 }}>
                              {STATUS_FULL[s]}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(s => {
                        const current  = attendance[s._id] || "present";
                        const existing = existingRecs[s._id];
                        return (
                          <tr key={s._id} style={{
                            background: current === "absent" ? "rgba(239,68,68,0.03)" : undefined,
                          }}>
                            <td>
                              <span className="mono tag tag-gray">{s.rollNo}</span>
                            </td>
                            <td style={{ fontWeight: 500 }}>
                              {s.name}
                              {existing && existing !== current && (
                                <span style={{ fontSize: 10, color: "var(--amber)", marginLeft: 6 }}>
                                  (was: {existing})
                                </span>
                              )}
                            </td>
                            {STATUS_OPTIONS.map(opt => (
                              <td key={opt} style={{ textAlign: "center" }}>
                                <input
                                  type="radio"
                                  name={`att-${s._id}`}
                                  checked={current === opt}
                                  onChange={() => setAttendance(p => ({ ...p, [s._id]: opt }))}
                                  style={{
                                    accentColor: STATUS_COLOR[opt],
                                    cursor: "pointer",
                                    width: 16, height: 16,
                                  }}
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Save button */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving || students.length === 0}
                    style={{ minWidth: 160 }}
                  >
                    {saving
                      ? <><RefreshCw size={13} style={{ animation: "spin 0.7s linear infinite" }} /> Saving…</>
                      : <><Save size={13} /> Save Attendance</>
                    }
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}