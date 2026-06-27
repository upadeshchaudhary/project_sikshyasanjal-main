import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { BS_MONTH_NAMES, getDaysInBSMonth, bsToAd, getTodayBS } from "../utils/calendar";

export default function BsDatePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Initialize view to the year/month of the value, or today if empty
  const today = getTodayBS();
  const [viewYear, setViewYear] = useState(today.year);
  const [viewMonth, setViewMonth] = useState(today.month);

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split("-").map(Number);
      if (y >= 2078 && y <= 2088 && m >= 1 && m <= 12) {
        setViewYear(y);
        setViewMonth(m);
      }
    }
  }, [value]);

  // Click outside listener to close popup
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      if (viewYear > 2078) {
        setViewYear(viewYear - 1);
        setViewMonth(12);
      }
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      if (viewYear < 2088) {
        setViewYear(viewYear + 1);
        setViewMonth(1);
      }
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDaySelect = (day) => {
    const formatted = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(formatted);
    setIsOpen(false);
  };

  // Generate calendar grid
  const daysInMonth = getDaysInBSMonth(viewYear, viewMonth);
  // Get weekday of the 1st of this month
  const firstDayAd = bsToAd(`${viewYear}-${String(viewMonth).padStart(2, "0")}-01`);
  const startDayOfWeek = firstDayAd ? new Date(firstDayAd).getDay() : 0; // 0 = Sunday, 6 = Saturday

  const gridCells = [];
  // Empty cells for weekday offset
  for (let i = 0; i < startDayOfWeek; i++) {
    gridCells.push(null);
  }
  // Day numbers
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push(d);
  }

  const YEARS = Array.from({ length: 2088 - 2078 + 1 }, (_, i) => 2078 + i);
  const MONTHS = BS_MONTH_NAMES;

  // Selected date parts to highlight
  let selYear = null, selMonth = null, selDay = null;
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    [selYear, selMonth, selDay] = value.split("-").map(Number);
  }

  // Today parts to highlight
  const todayYear = today.year;
  const todayMonth = today.month;
  const todayDay = today.day;

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "42px",
          height: "42px",
          padding: 0,
          borderColor: "var(--border)",
          color: "var(--text-2)",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
        }}
      >
        <Calendar size={16} />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            zIndex: 9999,
            right: 0,
            top: "46px",
            width: "290px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-md)",
            padding: "16px",
            fontFamily: "var(--font-body, system-ui, sans-serif)",
            color: "var(--text)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", gap: "4px" }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={viewYear === 2078 && viewMonth === 1}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-2)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                opacity: (viewYear === 2078 && viewMonth === 1) ? 0.3 : 1,
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  padding: "2px 4px",
                  fontSize: "12px",
                  fontWeight: "600",
                  background: "var(--card)",
                  color: "var(--text)",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  padding: "2px 4px",
                  fontSize: "12px",
                  fontWeight: "600",
                  background: "var(--card)",
                  color: "var(--text)",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={viewYear === 2088 && viewMonth === 12}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-2)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                opacity: (viewYear === 2088 && viewMonth === 12) ? 0.3 : 1,
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", marginBottom: "8px", gap: "2px" }}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, idx) => (
              <div key={idx} style={{ fontSize: "10px", fontWeight: "700", color: idx === 0 || idx === 6 ? "var(--red)" : "var(--text-3)", padding: "4px 0" }}>
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {gridCells.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} />;
              }

              const isSelected = selYear === viewYear && selMonth === viewMonth && selDay === day;
              const isTodayDate = todayYear === viewYear && todayMonth === viewMonth && todayDay === day;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleDaySelect(day)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "28px",
                    width: "28px",
                    borderRadius: "50%",
                    border: isTodayDate ? "1px solid var(--blue)" : "none",
                    background: isSelected ? "var(--blue)" : "transparent",
                    color: isSelected ? "#ffffff" : isTodayDate ? "var(--blue)" : "var(--text)",
                    fontSize: "11px",
                    fontWeight: isSelected || isTodayDate ? "700" : "500",
                    cursor: "pointer",
                    margin: "0 auto",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "var(--blue-pale)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
