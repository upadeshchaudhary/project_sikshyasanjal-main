import { useState, useEffect, useCallback } from "react";
import Topbar from "../components/Topbar";
import { useApp } from "../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Plus, Search, Pencil, Trash2, X,
  Eye, Users, ChevronLeft, ChevronRight,
} from "lucide-react";

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ height = 16, width = "100%", radius = 6 }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} />;
}

// ── Confirm delete modal ──────────────────────────────────────────────────────
function ConfirmModal({ student, onConfirm, onCancel }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Remove Student</div>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: "var(--body)", lineHeight: 1.6 }}>
            Are you sure you want to remove <strong>{student.name}</strong> (Class {student.class},
            Roll {student.rollNo})? Their attendance, results, and fee records will be preserved.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Remove Student</button>
        </div>
      </div>
    </div>
  );
}

// ── View modal ────────────────────────────────────────────────────────────────
function ViewModal({ student, isParent, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const initials = student.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  const rows = [
    ["Class",          <span className="tag tag-blue">{student.class}</span>],
    ["Roll Number",    <span className="mono">{student.rollNo}</span>],
    ["Gender",         student.gender || "—"],
    ["Date of Birth (BS)", student.dobBs || student.dob || "—"],
    ["Address",        student.address || "—"],
    ["Admission Year", student.admissionYear ? `${student.admissionYear} BS` : "—"],
    ...(!isParent ? [
      ["Parent / Guardian", student.parentName  || "—"],
      ["Parent Phone",      <span className="mono">{student.parentPhone || "—"}</span>],
    ] : []),
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Student Profile</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{
            display: "flex", gap: 14, alignItems: "center",
            marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid var(--border)",
          }}>
            <div className="avatar" style={{ width: 48, height: 48, fontSize: 17, background: "var(--blue)", flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{student.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
                Class {student.class} · Roll {student.rollNo}
              </div>
            </div>
          </div>
          {rows.map(([label, val]) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13,
            }}>
              <span style={{ color: "var(--text-3)", fontWeight: 500 }}>{label}</span>
              <span style={{ color: "var(--text)", textAlign: "right" }}>{val}</span>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────
function StudentModal({ student, classes, onSave, onClose, saving }) {
  const isEdit = !!student;

  const empty = { name: "", rollNo: "", class: classes[0] || "", gender: "Male", parentName: "", parentPhone: "", address: "", dobBs: "", admissionYear: "" };
  const [form, setForm]     = useState(isEdit ? { ...empty, ...student } : empty);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.name?.trim())    e.name   = "Full name is required.";
    if (!form.rollNo)          e.rollNo = "Roll number is required.";
    if (isNaN(Number(form.rollNo)) || Number(form.rollNo) < 1)
                               e.rollNo = "Roll number must be a positive number.";
    if (!form.class?.trim())   e.class  = "Class is required.";
    if (form.parentPhone && !/^(98|97|96)\d{8}$/.test(form.parentPhone.trim()))
                               e.parentPhone = "Enter a valid Nepali mobile number (98/97/96XXXXXXXX).";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form, rollNo: Number(form.rollNo) });
  };

  const Field = ({ label, error, children }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
      {error && <p className="form-error">{error}</p>}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? "Edit Student" : "Add Student"}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <Field label="Full Name *" error={errors.name}>
              <input className={`form-input ${errors.name ? "error" : ""}`}
                placeholder="e.g. Aarav Sharma"
                value={form.name}
                onChange={e => set("name", e.target.value)} />
            </Field>
            <Field label="Roll Number *" error={errors.rollNo}>
              <input className={`form-input mono ${errors.rollNo ? "error" : ""}`}
                type="number" min="1" placeholder="e.g. 5"
                value={form.rollNo}
                onChange={e => set("rollNo", e.target.value)} />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Class *" error={errors.class}>
              <select className={`form-select ${errors.class ? "error" : ""}`}
                value={form.class}
                onChange={e => set("class", e.target.value)}>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Gender">
              <select className="form-select" value={form.gender} onChange={e => set("gender", e.target.value)}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </Field>
          </div>
          <div className="form-row">
            <Field label="Parent / Guardian Name">
              <input className="form-input" placeholder="e.g. Rajesh Sharma"
                value={form.parentName} onChange={e => set("parentName", e.target.value)} />
            </Field>
            <Field label="Parent Phone" error={errors.parentPhone}>
              <input className={`form-input mono ${errors.parentPhone ? "error" : ""}`}
                placeholder="98XXXXXXXX" maxLength={10}
                value={form.parentPhone}
                onChange={e => set("parentPhone", e.target.value.replace(/\D/g, ""))} />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Date of Birth (BS)">
              <input className="form-input mono" placeholder="e.g. 2065-04-15"
                value={form.dobBs} onChange={e => set("dobBs", e.target.value)} />
            </Field>
            <Field label="Admission Year (BS)">
              <input className="form-input mono" placeholder="e.g. 2079"
                value={form.admissionYear} onChange={e => set("admissionYear", e.target.value)} />
            </Field>
          </div>
          <Field label="Address">
            <input className="form-input" placeholder="e.g. Dharan-5, Sunsari"
              value={form.address} onChange={e => set("address", e.target.value)} />
          </Field>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Student"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
export default function StudentsPage() {
  const { currentUser } = useApp();

  // Derive roles at render time — never in useState
  const isAdmin   = currentUser?.role === "admin";
  const isTeacher = currentUser?.role === "teacher";
  const isParent  = currentUser?.role === "parent";

  // Data state
  const [students,     setStudents]     = useState([]);
  const [classes,      setClasses]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [total,        setTotal]        = useState(0);

  // Filters — hidden entirely from parents
  const [search,       setSearch]       = useState("");
  const [classFilter,  setClassFilter]  = useState("all");
  const [page,         setPage]         = useState(1);
  const LIMIT = 20;

  // Modals
  const [viewModal,    setViewModal]    = useState(null);
  const [editModal,    setEditModal]    = useState(null);
  const [addModal,     setAddModal]     = useState(false);
  const [confirmDel,   setConfirmDel]   = useState(null);
  const [saving,       setSaving]       = useState(false);

  // ── Fetch class list (role-scoped by backend) ─────────────────────────────
  useEffect(() => {
    if (isParent) return; // parents see no filters
    axios.get("/students/classes")
      .then(res => setClasses(res.data.classes || []))
      .catch(() => setClasses([]));
  }, [isParent]);

  // ── Fetch students ────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (!isParent) {
        if (search.trim())          params.search = search.trim();
        if (classFilter !== "all")  params.class  = classFilter;
      }
      const res = await axios.get("/students", { params });
      setStudents(res.data.students || []);
      setTotal(res.data.total       || 0);
    } catch {
      toast.error("Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, [page, search, classFilter, isParent]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, classFilter]);

  // ── Add student ───────────────────────────────────────────────────────────
  const handleAdd = async (form) => {
    setSaving(true);
    try {
      await axios.post("/students", form);
      toast.success(`${form.name} added successfully.`);
      setAddModal(false);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add student.");
    } finally {
      setSaving(false);
    }
  };

  // ── Edit student ──────────────────────────────────────────────────────────
  const handleEdit = async (form) => {
    setSaving(true);
    try {
      await axios.put(`/students/${editModal._id}`, form);
      toast.success(`${form.name} updated.`);
      setEditModal(null);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update student.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete student ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await axios.delete(`/students/${confirmDel._id}`);
      toast.success(`${confirmDel.name} removed.`);
      setConfirmDel(null);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove student.");
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <Topbar title={isParent ? "My Child" : "Students"} />
      <div className="page-content">

        {/* Page header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">{isParent ? "My Child" : "Students"}</h1>
            <p className="page-subtitle">
              {isParent
                ? "Your child's profile and academic information"
                : `${total.toLocaleString()} students enrolled`}
            </p>
          </div>
          {/* Add button — admin only */}
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setAddModal(true)}>
              <Plus size={15} /> Add Student
            </button>
          )}
        </div>

        {/* Filter bar — hidden from parents */}
        {!isParent && (
          <div className="filter-bar">
            <div className="search-box" style={{ flex: "none", width: 260 }}>
              <Search size={14} />
              <input
                placeholder="Search by name or roll number…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", padding: 0 }}
                  aria-label="Clear search"
                >
                  <X size={12} style={{ color: "var(--text-3)" }} />
                </button>
              )}
            </div>
            <select
              className="form-select" style={{ width: "auto" }}
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
            >
              <option value="all">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {!loading && (
              <span className="tag tag-blue">{total} result{total !== 1 ? "s" : ""}</span>
            )}
          </div>
        )}

        {/* Table */}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                <th>Class</th>
                <th>Gender</th>
                {!isParent && <th>Parent / Guardian</th>}
                {!isParent && <th>Phone</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(6).fill(0).map((_, i) => (
                    <tr key={i}>
                      {[40, 130, 60, 60, ...(!isParent ? [100, 100] : []), 80].map((w, j) => (
                        <td key={j}><Skeleton height={14} width={w} /></td>
                      ))}
                    </tr>
                  ))
                : students.map(s => (
                    <tr key={s._id}>
                      <td><span className="mono tag tag-gray">{s.rollNo}</span></td>
                      <td style={{ fontWeight: 500, color: "var(--text)" }}>{s.name}</td>
                      <td><span className="tag tag-blue">{s.class}</span></td>
                      <td>
                        <span className={`tag ${s.gender === "Female" ? "tag-purple" : s.gender === "Other" ? "tag-teal" : "tag-blue"}`}>
                          {s.gender || "—"}
                        </span>
                      </td>
                      {!isParent && (
                        <td style={{ color: "var(--text-2)", fontSize: 13 }}>{s.parentName || "—"}</td>
                      )}
                      {!isParent && (
                        <td className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
                          {s.parentPhone ? `+977-${s.parentPhone}` : "—"}
                        </td>
                      )}
                      <td>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <button
                            className="btn btn-ghost btn-sm" title="View profile"
                            onClick={() => setViewModal(s)}
                          >
                            <Eye size={13} />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                className="btn btn-ghost btn-sm" title="Edit student"
                                onClick={() => setEditModal(s)}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                className="btn btn-danger btn-sm" title="Remove student"
                                onClick={() => setConfirmDel(s)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {/* Empty state */}
          {!loading && students.length === 0 && (
            <div className="empty-state">
              <Users size={40} />
              <h3>No students found</h3>
              <p>
                {isParent
                  ? "Contact your school administrator to link your child's account."
                  : search || classFilter !== "all"
                    ? "Try adjusting your search or class filter."
                    : "No students have been added yet."}
              </p>
              {isAdmin && students.length === 0 && !search && classFilter === "all" && (
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setAddModal(true)}>
                  <Plus size={14} /> Add First Student
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination — hidden for parents */}
        {!isParent && totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn" disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…"
                  ? <span key={`e${i}`} style={{ padding: "0 4px", color: "var(--text-3)", fontSize: 12 }}>…</span>
                  : <button
                      key={p}
                      className={`page-btn ${p === page ? "active" : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
              )}
            <button
              className="page-btn" disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight size={13} />
            </button>
            <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 4 }}>
              {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      {viewModal    && <ViewModal    student={viewModal} isParent={isParent} onClose={() => setViewModal(null)} />}
      {addModal     && <StudentModal classes={classes} onSave={handleAdd}  onClose={() => setAddModal(false)}  saving={saving} />}
      {editModal    && <StudentModal student={editModal} classes={classes} onSave={handleEdit} onClose={() => setEditModal(null)} saving={saving} />}
      {confirmDel   && <ConfirmModal student={confirmDel} onConfirm={handleDelete} onCancel={() => setConfirmDel(null)} />}
    </>
  );
}