import { useState, useEffect, useCallback } from "react";
import Topbar from "../components/Topbar";
import { useApp } from "../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { BS_MONTH_NAMES, getDaysInBSMonth, getTodayBS } from "../utils/calendar";

const TYPE_COLORS = {
  holiday:  { tag: "tag-red",    bg: "#fee2e2", text: "#dc2626" },
  exam:     { tag: "tag-blue",   bg: "#eef1fe", text: "#1e3ff2" },
  event:    { tag: "tag-purple", bg: "#ede9fe", text: "#7c3aed" },
  meeting:  { tag: "tag-amber",  bg: "#fef3c7", text: "#d97706" },
  deadline: { tag: "tag-red",    bg: "#fee2e2", text: "#dc2626" },
  other:    { tag: "tag-gray",   bg: "#f1f3f9", text: "#5a6080" },
};

const TYPE_ICONS = { holiday:"🌿", exam:"📝", event:"🎉", meeting:"🤝", deadline:"⏰", other:"📌" };

const ANCHOR_DOW = 6; // 1 Baisakh 2082 = Saturday (index 6)

function getDaysBefore(year, month) {
  let total = 0;
  for (let y = 2082; y < year; y++) for (let m = 1; m <= 12; m++) total += getDaysInBSMonth(y, m);
  for (let m = 1; m < month; m++) total += getDaysInBSMonth(year, m);
  return total;
}

function getFirstDow(year, month) {
  return (ANCHOR_DOW + getDaysBefore(year, month)) % 7;
}

function Skeleton({ height = 16, width = "100%", radius = 6 }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} />;
}

function AddModal({ year, month, onClose, onSaved }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const [form, setForm]     = useState({ title: "", startDateBs: `${year}-${String(month).padStart(2,"0")}-01`, startDate: "", type: "event", description: "", academicYear: `${year}-${String(year - 2056).padStart(2,"0")}`, isHoliday: false });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.title?.trim())       e.title       = "Title is required.";
    if (!form.startDate)           e.startDate   = "AD date is required.";
    if (!form.startDateBs?.trim()) e.startDateBs = "BS date is required.";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await axios.post("/calendar", { ...form, isHoliday: form.type === "holiday" || form.isHoliday });
      toast.success("Event added to calendar.");
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to add event."); }
    finally { setSaving(false); }
  };

  const Field = ({ label, error, children }) => (
    <div className="form-group"><label className="form-label">{label}</label>{children}{error && <p className="form-error">{error}</p>}</div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add Calendar Event</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <Field label="Event Title *" error={errors.title}>
            <input className={`form-input ${errors.title ? "error" : ""}`} placeholder="e.g. Dashain Holiday"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </Field>
          <div className="form-row">
            <Field label="Date (AD) *" error={errors.startDate}>
              <input type="date" className={`form-input ${errors.startDate ? "error" : ""}`}
                value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </Field>
            <Field label="Date (BS) *" error={errors.startDateBs}>
              <input className={`form-input mono ${errors.startDateBs ? "error" : ""}`} placeholder="YYYY-MM-DD"
                value={form.startDateBs} onChange={e => setForm(p => ({ ...p, startDateBs: e.target.value }))} />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Type">
              <select className="form-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                {Object.keys(TYPE_COLORS).map(t => <option key={t} value={t} style={{ textTransform: "capitalize" }}>{t}</option>)}
              </select>
            </Field>
            <Field label="Academic Year (BS)">
              <input className="form-input mono" placeholder="e.g. 2081-82"
                value={form.academicYear} onChange={e => setForm(p => ({ ...p, academicYear: e.target.value }))} />
            </Field>
          </div>
          <Field label="Description">
            <textarea className="form-input" rows={3} value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </Field>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Adding…" : "Add Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { currentUser } = useApp();
  const isAdmin   = currentUser?.role === "admin";
  const today     = getTodayBS();

  const [selectedYear,  setSelectedYear]  = useState(today.year);
  const [selectedMonth, setSelectedMonth] = useState(today.month);
  const [events,        setEvents]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showModal,     setShowModal]     = useState(false);
  const [selectedDay,   setSelectedDay]   = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/calendar", { params: { year: selectedYear, month: selectedMonth } });
      setEvents(res.data.events || []);
    } catch { toast.error("Failed to load calendar."); }
    finally { setLoading(false); }
  }, [selectedYear, selectedMonth]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/calendar/${id}`);
      toast.success("Event removed.");
      fetchEvents();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to remove event."); }
  };

  // Upcoming from API
  const [upcoming, setUpcoming] = useState([]);
  useEffect(() => {
    axios.get("/calendar/upcoming", { params: { limit: 8 } })
      .then(res => setUpcoming(res.data.events || []))
      .catch(() => {});
  }, [events]);

  const daysInMonth = getDaysInBSMonth(selectedYear, selectedMonth);
  const firstDow    = getFirstDow(selectedYear, selectedMonth);
  const YEARS       = Array.from({ length: 13 }, (_, i) => 2079 + i);

  // Events keyed by startDateBs
  const eventMap = {};
  events.forEach(e => {
    const key = e.startDateBs;
    if (!eventMap[key]) eventMap[key] = [];
    eventMap[key].push(e);
  });

  const prevMonth = () => { if (selectedMonth === 1) { setSelectedYear(y => y - 1); setSelectedMonth(12); } else setSelectedMonth(m => m - 1); };
  const nextMonth = () => { if (selectedMonth === 12) { setSelectedYear(y => y + 1); setSelectedMonth(1); } else setSelectedMonth(m => m + 1); };

  return (
    <>
      <Topbar title="Academic Calendar" />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Academic Calendar</h1>
            <p className="page-subtitle">Bikram Sambat {selectedYear} · {BS_MONTH_NAMES[selectedMonth - 1]}</p>
          </div>
          {isAdmin && <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Add Event</button>}
        </div>

        {/* Year tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
          {YEARS.map(y => (
            <button key={y} className={`btn btn-sm ${selectedYear === y ? "btn-primary" : "btn-outline"}`}
              onClick={() => setSelectedYear(y)} style={{ fontFamily: "'JetBrains Mono',monospace", minWidth: 52, flexShrink: 0 }}>
              {y}
            </button>
          ))}
        </div>

        {/* Month tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          {BS_MONTH_NAMES.map((m, i) => (
            <button key={m} className={`btn btn-sm ${selectedMonth === i + 1 ? "btn-primary" : "btn-outline"}`}
              onClick={() => setSelectedMonth(i + 1)} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
              {m}
            </button>
          ))}
        </div>

        <div className="grid-2">
          {/* Calendar grid */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px", borderBottom: "1px solid var(--border)" }}>
                <button className="btn btn-ghost btn-sm" onClick={prevMonth}><ChevronLeft size={16} /></button>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{BS_MONTH_NAMES[selectedMonth - 1]} {selectedYear}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={nextMonth}><ChevronRight size={16} /></button>
              </div>
              <div style={{ padding: "16px 12px 12px" }}>
                {loading ? <Skeleton height={200} radius={8} /> : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
                    {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                      <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, paddingBottom: 6, color: d === "Sa" ? "#ef4444" : "var(--text-3)" }}>{d}</div>
                    ))}
                    {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day  = i + 1;
                      const mm   = String(selectedMonth).padStart(2,"0");
                      const dd   = String(day).padStart(2,"0");
                      const key  = `${selectedYear}-${mm}-${dd}`;
                      const dow  = (firstDow + i) % 7;
                      const isSat= dow === 6;
                      const dayEvs = eventMap[key] || [];
                      const isHol  = dayEvs.some(e => e.isHoliday || e.type === "holiday");
                      const hasExam= dayEvs.some(e => e.type === "exam");
                      const hasEv  = dayEvs.some(e => ["event","meeting","deadline"].includes(e.type));
                      const isTod  = selectedYear === today.year && selectedMonth === today.month && day === today.day;

                      let bg   = "transparent"; let textColor = "var(--text)";
                      if (isTod)       { bg = "var(--blue)";  textColor = "#fff"; }
                      else if (isHol)  { bg = "#fee2e2";      textColor = "#dc2626"; }
                      else if (isSat)  { textColor = "#ef4444"; }

                      return (
                        <div key={key}
                          onClick={() => dayEvs.length && setSelectedDay({ key, events: dayEvs })}
                          style={{ aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 7, background: bg, color: textColor, cursor: dayEvs.length ? "pointer" : "default", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: isTod ? 700 : 400, position: "relative", transition: "transform 0.1s", border: selectedDay?.key === key ? "2px solid var(--blue)" : "2px solid transparent" }}
                          onMouseEnter={e => { if (!isTod && dayEvs.length) e.currentTarget.style.transform = "scale(1.08)"; }}
                          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                        >
                          {day}
                          {!isTod && (isHol || hasExam || hasEv) && (
                            <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                              {isHol   && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#dc2626" }} />}
                              {hasExam && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--blue)" }} />}
                              {hasEv   && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--amber)" }} />}
                            </div>
                          )}
                          {isSat && !isHol && !isTod && <div style={{ fontSize: 8, color: "#ef4444", marginTop: 1 }}>OFF</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Day detail */}
            {selectedDay && (
              <div className="card" style={{ marginBottom: 12, borderLeft: "3px solid var(--blue)" }}>
                <div className="card-header" style={{ paddingBottom: 6 }}>
                  <div className="card-title" style={{ fontSize: 13 }}>{selectedDay.key} BS</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDay(null)}><X size={14} /></button>
                </div>
                <div className="card-body" style={{ paddingTop: 4 }}>
                  {selectedDay.events.map(ev => {
                    const tc = TYPE_COLORS[ev.type] || TYPE_COLORS.other;
                    return (
                      <div key={ev._id} style={{ display: "flex", gap: 10, padding: "8px 10px", borderRadius: 8, background: tc.bg, marginBottom: 6 }}>
                        <span style={{ fontSize: 18 }}>{TYPE_ICONS[ev.type] || "📌"}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: tc.text }}>{ev.title}</div>
                          {ev.description && <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>{ev.description}</div>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
                          <span className={`tag ${tc.tag}`}>{ev.type}</span>
                          {isAdmin && (
                            <button className="btn btn-ghost btn-sm" style={{ padding: "2px 4px", color: "var(--text-3)" }} onClick={() => handleDelete(ev._id)}><X size={11} /></button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right panels */}
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-header">
                <div className="card-title">Events this month</div>
                <span className="tag tag-blue">{events.length}</span>
              </div>
              <div className="card-body" style={{ padding: "8px 20px 16px", maxHeight: 300, overflowY: "auto" }}>
                {loading ? <Skeleton height={120} radius={8} /> :
                 events.length === 0 ? (
                  <div style={{ color: "var(--text-2)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No events this month</div>
                ) : events.map(ev => {
                  const tc = TYPE_COLORS[ev.type] || TYPE_COLORS.other;
                  return (
                    <div key={ev._id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)", alignItems: "flex-start" }}>
                      <span style={{ fontSize: 18, width: 32, height: 32, borderRadius: 8, background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{TYPE_ICONS[ev.type] || "📌"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: tc.text }}>{ev.title}</div>
                        <div className="bs-date" style={{ fontSize: 11, marginTop: 2 }}>{ev.startDateBs}</div>
                        {ev.description && <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.description}</div>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                        <span className={`tag ${tc.tag}`}>{ev.type}</span>
                        {isAdmin && <button className="btn btn-ghost btn-sm" style={{ padding: "2px 4px" }} onClick={() => handleDelete(ev._id)}><X size={11} /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Upcoming Events</div>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>from today</span>
              </div>
              <div className="card-body" style={{ padding: "8px 20px 16px", maxHeight: 280, overflowY: "auto" }}>
                {upcoming.length === 0 ? (
                  <div style={{ color: "var(--text-2)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No upcoming events</div>
                ) : upcoming.map(ev => {
                  const tc = TYPE_COLORS[ev.type] || TYPE_COLORS.other;
                  return (
                    <div key={ev._id} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)", alignItems: "center", cursor: "pointer" }}
                      onClick={() => { const [y, m] = ev.startDateBs.split("-").map(Number); setSelectedYear(y); setSelectedMonth(m); }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{TYPE_ICONS[ev.type] || "📌"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 13, color: "var(--text)" }}>{ev.title}</div>
                        <div className="bs-date" style={{ fontSize: 11, marginTop: 1 }}>{ev.startDateBs}</div>
                      </div>
                      <span className={`tag ${tc.tag}`} style={{ flexShrink: 0 }}>{ev.type}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showModal && <AddModal year={selectedYear} month={selectedMonth} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchEvents(); }} />}
    </>
  );
}