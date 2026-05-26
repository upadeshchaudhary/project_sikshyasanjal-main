import { useEffect, useState, useCallback, useMemo } from "react";
import Topbar from "../../components/Topbar";
import { useApp } from "../../context/AppContext";
import { Lock, Plus, Pencil, Trash2, X, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { SUBJECTS } from "../../data/mockData";
import { adToBs } from "../../utils/calendar";

// ── Constants ─────────────────────────────────────────────────────────────────
const EXAM_TYPES = [
  "First Terminal Examination",
  "Second Terminal Examination",
  "Third Term Examination",
  "Final Examination",
  "Weekly Test",
  "Monthly Test",
  "Class Test",
];

const MARKS_OPTIONS = [20, 25, 50, 100];

// ── Components ────────────────────────────────────────────────────────────────
function Skeleton({ height = 16, width = "100%", radius = 6 }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} />;
}

function Field({ label, error, children }) {
  const parts = label.split("*");
  return (
    <div className="form-group">
      <label className="form-label">
        {parts[0]}
        {parts.length > 1 && <span style={{ color: "var(--red)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

// ── Result Upload/Edit Modal ──────────────────────────────────────────────────
function ResultModal({ result, classes, isTeacher, teacherSubject, onSave, onClose, saving }) {
  const isEdit = !!result;
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const getTodayBSYear = useCallback(() => {
    const adStr = new Date().toISOString().split("T")[0];
    const bsStr = adToBs(adStr);
    return bsStr ? bsStr.split("-")[0] : "2081";
  }, []);

  const initialSubjects = isEdit 
    ? result.subjects.map(s => ({ ...s }))
    : isTeacher 
      ? [{ subject: teacherSubject || SUBJECTS[0], marksObtained: "", fullMarks: 100 }]
      : [{ subject: SUBJECTS[0], marksObtained: "", fullMarks: 100 }];

  const [form, setForm] = useState(isEdit ? {
    studentId: result.student?._id || "",
    class:     result.class || "",
    examName:  result.examName || EXAM_TYPES[0],
    examYear:  result.examYear || getTodayBSYear(),
    subjects:  initialSubjects,
  } : {
    studentId: "",
    class:     classes[0] || "",
    examName:  EXAM_TYPES[0],
    examYear:  getTodayBSYear(),
    subjects:  initialSubjects,
  });

  const [errors, setErrors] = useState({});

  // Fetch students when class changes
  useEffect(() => {
    if (!form.class) return;
    setLoadingStudents(true);
    axios.get(`/students?class=${form.class}&isActive=true&limit=200`)
      .then(res => setStudents(res.data.students || []))
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [form.class]);

  const set = (k, v) => {
    if (k === "examYear") return;
    let updates = { [k]: v };
    
    // Logic: If Final Examination, force all full marks to 100
    if (k === "examName" && v === "Final Examination") {
      updates.subjects = form.subjects.map(s => ({ ...s, fullMarks: 100 }));
    }
    
    setForm(prev => ({ ...prev, ...updates }));
    setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
  };

  const handleSubChange = (idx, field, val) => {
    const newSubs = [...form.subjects];
    let finalVal = val;

    if (field === "marksObtained") {
      // Logic: obtained marks cannot exceed full marks
      const full = Number(newSubs[idx].fullMarks);
      if (Number(val) > full) finalVal = full;
    }

    newSubs[idx] = { ...newSubs[idx], [field]: finalVal };
    
    // If exam is Final, keep fullMarks locked at 100
    if (form.examName === "Final Examination" && field === "fullMarks") {
      newSubs[idx].fullMarks = 100;
    }

    setForm(prev => ({ ...prev, subjects: newSubs }));
  };

  const addSubject = () => {
    if (isTeacher) return;
    const full = form.examName === "Final Examination" ? 100 : 100;
    setForm(prev => ({ ...prev, subjects: [...prev.subjects, { subject: SUBJECTS[0], marksObtained: "", fullMarks: full }] }));
  };

  const removeSubject = (idx) => {
    if (isTeacher || form.subjects.length <= 1) return;
    setForm(prev => ({ ...prev, subjects: prev.subjects.filter((_, i) => i !== idx) }));
  };

  const validate = () => {
    const e = {};
    if (!form.studentId) e.studentId = "Please select a student.";
    if (!form.examName?.trim()) e.examName = "Exam name is required.";
    if (!form.examYear?.trim()) e.examYear = "Exam year is required.";
    
    form.subjects.forEach((s, i) => {
      if (!s.subject?.trim()) e[`sub_${i}_name`] = "Required";
      if (s.marksObtained === "" || s.marksObtained < 0) e[`sub_${i}_marks`] = "Invalid";
      if (!s.fullMarks || s.fullMarks <= 0 || s.fullMarks > 100) e[`sub_${i}_full`] = "Max 100";
      if (Number(s.marksObtained) > Number(s.fullMarks)) e[`sub_${i}_marks`] = "Exceeds max";
    });

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      ...form,
      student: form.studentId,
      subjects: form.subjects.map(s => ({
        ...s,
        marksObtained: Number(s.marksObtained),
        fullMarks:     Number(s.fullMarks)
      }))
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? "Edit Marks" : "Upload Marks"}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {!isEdit && (
            <div className="form-row">
              <Field label="Class *" error={errors.class}>
                <select className="form-select" value={form.class} onChange={e => set("class", e.target.value)}>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Student *" error={errors.studentId}>
                <select className="form-select" value={form.studentId} onChange={e => set("studentId", e.target.value)} disabled={loadingStudents}>
                  <option value="">{loadingStudents ? "Loading..." : "Select Student"}</option>
                  {students.map(s => <option key={s._id} value={s._id}>{s.name} (Roll: {s.rollNo})</option>)}
                </select>
              </Field>
            </div>
          )}

          {isEdit && (
            <div style={{ marginBottom: 16, padding: 10, background: "var(--canvas)", borderRadius: 8, fontSize: 13 }}>
              <strong>{result.student?.name}</strong> · Class {result.class}
            </div>
          )}

          <div className="form-row">
            <Field label="Exam Type *" error={errors.examName}>
              <select className="form-select" value={form.examName} onChange={e => set("examName", e.target.value)}>
                {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Year (BS) *" error={errors.examYear}>
              <input className="form-input mono" value={form.examYear} disabled title="Year is automatically set to current academic year" />
            </Field>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>SUBJECTS & MARKS</span>
              {!isTeacher && (
                <button className="btn btn-ghost btn-xs" onClick={addSubject} style={{ color: "var(--blue)" }}>
                  + Add Subject
                </button>
              )}
            </div>

            {form.subjects.map((s, i) => (
              <div key={i} className="form-row" style={{ alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 2 }}>
                  {isTeacher ? (
                    <input className="form-input" value={s.subject} disabled />
                  ) : (
                    <select className="form-select" value={s.subject} onChange={e => handleSubChange(i, "subject", e.target.value)}>
                      {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  )}
                  {errors[`sub_${i}_name`] && <span className="form-error">{errors[`sub_${i}_name`]}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <input className="form-input mono" type="number" placeholder="Marks" value={s.marksObtained}
                    max={s.fullMarks}
                    onChange={e => handleSubChange(i, "marksObtained", e.target.value)} />
                  {errors[`sub_${i}_marks`] && <span className="form-error">{errors[`sub_${i}_marks`]}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <select className="form-select mono" value={s.fullMarks} 
                    onChange={e => handleSubChange(i, "fullMarks", e.target.value)}
                    disabled={form.examName === "Final Examination"}
                  >
                    {MARKS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  {errors[`sub_${i}_full`] && <span className="form-error">{errors[`sub_${i}_full`]}</span>}
                </div>
                {!isTeacher && form.subjects.length > 1 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => removeSubject(i)} style={{ marginTop: 4, color: "var(--red)" }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Update Marks" : "Upload Marks"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const { currentUser } = useApp();
  const isAdmin   = currentUser?.role === "admin";
  const isTeacher = currentUser?.role === "teacher";
  const isParent  = currentUser?.role === "parent";

  const [results,     setResults]     = useState([]);
  const [classes,     setClasses]     = useState([]);
  const [classFilter, setClassFilter] = useState("all");
  const [loading,     setLoading]     = useState(true);
  
  const [showModal,   setShowModal]   = useState(false);
  const [editResult,  setEditResult]  = useState(null);
  const [saving,      setSaving]      = useState(false);

  // Fetch authorized classes
  useEffect(() => {
    if (isParent) return;
    axios.get("/students/classes")
      .then(res => setClasses(res.data.classes || []))
      .catch(() => setClasses([]));
  }, [isParent]);

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (!isParent && classFilter !== "all") params.class = classFilter;
      const { data } = await axios.get("/results", { params });
      setResults(data.results || []);
    } catch (err) {
      setResults([]);
      toast.error(err.response?.data?.message || "Failed to load results.");
    } finally {
      setLoading(false);
    }
  }, [classFilter, isParent]);

  useEffect(() => { loadResults(); }, [loadResults]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editResult) {
        await axios.put(`/results/${editResult._id}`, form);
        toast.success("Result updated successfully.");
      } else {
        await axios.post("/results", form);
        toast.success("Marks uploaded successfully.");
      }
      setShowModal(false);
      setEditResult(null);
      loadResults();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this exam record?")) return;
    try {
      await axios.delete(`/results/${id}`);
      toast.success("Result deleted.");
      loadResults();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete.");
    }
  };

  const togglePublish = async (r) => {
    try {
      const action = r.isPublished ? "unpublish" : "publish";
      await axios.patch(`/results/${r._id}/${action}`);
      toast.success(`Result ${action}ed.`);
      loadResults();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change status.");
    }
  };

  const renderResult = (r) => {
    const overallPct = r.overallPercentage ?? 0;
    const isTeacherAssigned = isTeacher && (currentUser.assignedClasses?.includes(r.class));
    
    return (
      <div key={r._id} className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="card-title">{r.student?.name || currentUser?.childName || "Student"}</div>
              {!r.isPublished && <span className="tag tag-gray">Draft</span>}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
              Class {r.class} · {r.examName} ({r.examYear})
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "var(--blue)" }}>
              {r.overallGrade || "—"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>
              GPA <span className="mono">{Number(r.overallGpa || 0).toFixed(1)}</span> · {overallPct}%
            </div>
          </div>
        </div>

        <div className="card-body">
          {(r.subjects || []).map((sub) => (
            <div key={sub.subject} className="result-subject-row">
              <div style={{ width: 130, fontSize: 13, fontWeight: 500 }}>{sub.subject}</div>
              <div className="result-bar-wrap">
                <div className={`result-bar ${sub.isPassing ? "pass" : "fail"}`} style={{ width: `${sub.percentage}%` }} />
              </div>
              <div className="mono" style={{ width: 80, textAlign: "right", fontSize: 13 }}>
                {sub.marksObtained}<span style={{ color: "var(--text-3)" }}>/{sub.fullMarks}</span>
              </div>
              <div style={{ width: 44, textAlign: "right" }}>
                <span className={`tag ${sub.isPassing ? "tag-blue" : "tag-red"}`}>{sub.grade}</span>
              </div>
            </div>
          ))}
          
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "2px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8 }}>
              {(isAdmin || (isTeacher && isTeacherAssigned && !r.isPublished)) && (
                <button className="btn btn-ghost btn-xs" onClick={() => { setEditResult(r); setShowModal(true); }}>
                  <Pencil size={12} /> Edit
                </button>
              )}
              {isAdmin && (
                <>
                  <button className="btn btn-ghost btn-xs" onClick={() => togglePublish(r)}>
                    {r.isPublished ? "Unpublish" : "Publish"}
                  </button>
                  <button className="btn btn-ghost btn-xs" style={{ color: "var(--red)" }} onClick={() => handleDelete(r._id)}>
                    <Trash2 size={12} /> Delete
                  </button>
                </>
              )}
            </div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              Total: <span className="mono">{r.totalMarks}/{r.totalFullMarks}</span> · {overallPct}%
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Topbar title="Exam Results" />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Exam Results</h1>
            <p className="page-subtitle">
              {isParent ? `Results for ${currentUser?.childName || "your child"}` : "Manage student academic performance"}
            </p>
          </div>
          {(isAdmin || isTeacher) && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={15} /> Upload Marks
            </button>
          )}
        </div>

        {!isParent && (
          <div className="filter-bar">
            <select className="form-select" style={{ width: "auto" }} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
              <option value="all">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {!loading && <span className="tag tag-blue">{results.length} record{results.length !== 1 ? "s" : ""}</span>}
          </div>
        )}

        {isParent && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--canvas)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text-2)", marginBottom: 16 }}>
            <Lock size={13} />
            You can only view published results for your child.
          </div>
        )}

        {loading ? (
          <div style={{ padding: 20 }}>
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} height={180} radius={12} style={{ marginBottom: 20 }} />)}
          </div>
        ) : results.length > 0 ? (
          results.map(renderResult)
        ) : (
          <div className="empty-state">
            <AlertCircle size={40} />
            <h3>No results found</h3>
            <p>Results have not been uploaded or published for this selection yet.</p>
          </div>
        )}
      </div>

      {(showModal || editResult) && (
        <ResultModal
          result={editResult}
          classes={classes}
          isTeacher={isTeacher}
          teacherSubject={currentUser?.subject}
          saving={saving}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditResult(null); }}
        />
      )}
    </>
  );
}
