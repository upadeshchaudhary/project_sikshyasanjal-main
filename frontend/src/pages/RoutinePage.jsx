import { useState, useEffect } from "react";
import Topbar from "../components/Topbar";
import { useApp } from "../context/AppContext";
import axios from "axios";
import { Lock } from "lucide-react";
import { BS_MONTH_NAMES } from "../utils/calendar";

const WEEKDAYS = ["monday","tuesday","wednesday","thursday","friday"];
const DAY_LABELS = { monday:"Monday", tuesday:"Tuesday", wednesday:"Wednesday", thursday:"Thursday", friday:"Friday" };

const SUBJECT_COLORS = {
  "Mathematics":       { bg:"#EEF1FE", color:"#1E3FF2" },
  "Optional Maths":    { bg:"#E0E7FF", color:"#4338CA" },
  "Science":           { bg:"#DCFCE7", color:"#15803D" },
  "Nepali":            { bg:"#FEF3C7", color:"#D97706" },
  "English":           { bg:"#EDE9FE", color:"#7C3AED" },
  "Social Studies":    { bg:"#FEE2E2", color:"#DC2626" },
  "Computer":          { bg:"#ECFDF5", color:"#059669" },
  "Health":            { bg:"#FFF7ED", color:"#EA580C" },
  "General Knowledge": { bg:"#F0FDF4", color:"#16A34A" },
  "Arts & Craft":      { bg:"#FDF4FF", color:"#A21CAF" },
  "Moral Education":   { bg:"#FFFBEB", color:"#B45309" },
  "Occupation":        { bg:"#F0F9FF", color:"#0369A1" },
  "Account":           { bg:"#FEF9C3", color:"#854D0E" },
  "Economics":         { bg:"#DCFCE7", color:"#166534" },
};

function getColor(subject) {
  return SUBJECT_COLORS[subject] || { bg: "var(--canvas)", color: "var(--text-2)" };
}

function Skeleton({ height = 16, width = "100%", radius = 6 }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} />;
}

export default function RoutinePage() {
  const { currentUser } = useApp();
  const isParent  = currentUser?.role === "parent";
  const isTeacher = currentUser?.role === "teacher";

  const defaultClass = isParent
    ? (currentUser?.childClass || "")
    : "";

  const [classes,       setClasses]       = useState([]);
  const [selectedClass, setSelectedClass] = useState(defaultClass);
  const [routine,       setRoutine]       = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [activeDay,     setActiveDay]     = useState("all");

  // Fetch class list
  useEffect(() => {
    if (isParent) return;
    axios.get("/students/classes")
      .then(res => {
        const list = res.data.classes || [];
        setClasses(list);
        if (!selectedClass && list.length > 0) setSelectedClass(list[0]);
      })
      .catch(() => {});
  }, [isParent, selectedClass]);

  // Fetch routine from API
  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    axios.get(`/routine/${selectedClass}`)
      .then(res => setRoutine(res.data.routine || null))
      .catch(() => setRoutine(null))
      .finally(() => setLoading(false));
  }, [selectedClass]);

  const displayDays = activeDay === "all" ? WEEKDAYS : [activeDay];

  // Build all periods for a day from the routine
  function getPeriodsForDay(day) {
    const dayData = routine?.[day] || [];
    return dayData;
  }

  return (
    <>
      <Topbar title="Class Routine" />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Class Routine</h1>
            <p className="page-subtitle">Weekly timetable · 9:00 AM – 3:30 PM · Monday–Friday</p>
          </div>
          {isParent ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--canvas)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
              <Lock size={12} style={{ opacity: 0.4 }} />
              Class {selectedClass || "—"}
              <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: 4 }}>(your child's class)</span>
            </div>
          ) : (
            <select className="form-select" style={{ width: "auto" }}
              value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        {/* Day filter tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {["all", ...WEEKDAYS].map(d => (
            <button key={d} className={`btn btn-sm ${activeDay === d ? "btn-primary" : "btn-outline"}`}
              onClick={() => setActiveDay(d)} style={{ textTransform: "capitalize" }}>
              {d === "all" ? "All Days" : DAY_LABELS[d]}
            </button>
          ))}
        </div>

        {/* Timetable */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} height={50} radius={8} />)}
          </div>
        ) : !routine ? (
          <div className="empty-state">
            <div style={{ fontSize: 36 }}>📅</div>
            <h3>No routine configured</h3>
            <p>The class routine for {selectedClass || "this class"} has not been set up yet.{!isParent && " Contact the school administrator to generate it."}</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="routine-table" style={{ borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow)", minWidth: displayDays.length > 1 ? 700 : 300 }}>
              <thead>
                <tr>
                  <th style={{ background: "var(--text)", minWidth: 120, textAlign: "left", padding: "10px 14px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>TIME</div>
                  </th>
                  {displayDays.map(d => (
                    <th key={d} style={{ minWidth: 130, padding: "10px 12px" }}>
                      <div>{DAY_LABELS[d]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Collect all period slots from first available day to know row count */}
                {(() => {
                  const firstDay = displayDays[0];
                  const periods  = getPeriodsForDay(firstDay);
                  return periods.map((_, rowIdx) => {
                    return (
                      <tr key={rowIdx}>
                        {/* Time column */}
                        <td className="period-label" style={{ padding: "10px 14px", textAlign: "left", background: "var(--canvas)" }}>
                          {(() => {
                            const p = getPeriodsForDay(firstDay)[rowIdx];
                            if (!p) return null;
                            return (
                              <>
                                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: p.isBreak ? "var(--amber)" : "var(--text)" }}>
                                  {p.isBreak ? "🍱 Lunch" : `Period ${p.periodNo}`}
                                </div>
                                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>
                                  {p.startTime} – {p.endTime}
                                </div>
                              </>
                            );
                          })()}
                        </td>
                        {/* Day cells */}
                        {displayDays.map(day => {
                          const p = getPeriodsForDay(day)[rowIdx];
                          if (!p) return <td key={day} style={{ background: "var(--canvas)", textAlign: "center", color: "var(--text-3)", fontSize: 11 }}>—</td>;
                          if (p.isBreak) return (
                            <td key={day} className="routine-break">☕ Lunch Break</td>
                          );
                          const { bg, color } = getColor(p.subject);
                          return (
                            <td key={day} style={{ background: "var(--card)", padding: "4px 6px" }}>
                              <div style={{ background: bg, borderRadius: 7, padding: "8px 10px", borderLeft: `3px solid ${color}` }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color, lineHeight: 1.2 }}>{p.subject || "—"}</div>
                                {p.teacher && <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{p.teacher}</div>}
                                {p.room     && <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 1, fontFamily: "'JetBrains Mono',monospace" }}>{p.room}</div>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}