import { useState, useEffect, useCallback } from "react";
import Topbar from "../components/Topbar";
import { useApp } from "../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Plus, Search, Pencil, Trash2, X,
  BookOpen, ChevronLeft, ChevronRight, Filter,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const PRIORITIES = ["high", "medium", "low"];
const PRIORITY_TAG = { high: "tag-red", medium: "tag-amber", low: "tag-green" };

// ── Helpers ───────────────────────────────────────────────────────────────────
function Skeleton({ height = 16, width = "100%", radius = 6 }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} />;
}

function isDueSoon(dueDateBs) {
  // Flag homework due within 3 days as "soon"
  if (!dueDateBs) return false;
  const [y, m, d] = dueDateBs.split("-").map(Number);
  const due = new Date(y - 57, m - 1, d); // rough AD conversion
  const diff = (due - new Date()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 3;
}

// ── Confirm delete modal ──────────────────────────────────────────────────────
function ConfirmModal({ hw, onConfirm, onCancel }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onCancel]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Delete Homework</div>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: "var(--body)", lineHeight: 1.6 }}>
            Delete <strong>"{hw.title}"</strong> for Class {hw.class}?
            This cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Homework modal (Add / Edit) ───────────────────────────────────────────────
function HomeworkModal({ hw, classes, onSave, onClose, saving }) {
  const isEdit = !!hw;
  const empty  = { title: "", subject: "", class: classes[0] || "", description: "", dueDate: "", dueDateBs: "", priority: "medium" };
  const [form,   setForm]   = useState(isEdit ? { ...empty, ...hw } : empty);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.title?.trim())   e.title   = "Title is required.";
    if (!form.subject?.trim()) e.subject  = "Subject is required.";
    if (!form.class?.trim())   e.class    = "Class is required.";
    if (!form.dueDate)         e.dueDate  = "Due date is required.";
    if (!form.dueDateBs?.trim()) e.dueDateBs = "BS due date is required (e.g. 2081-05-20).";
    setErrors(e);
    return Object.keys(e).length === 0;
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
          <div className="modal-title">{isEdit ? "Edit Homework" : "Post Homework"}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <Field label="Title *" error={errors.title}>
            <input className={`form-input ${errors.title ? "error" : ""}`}
              placeholder="e.g. Chapter 5 Exercise"
              value={form.title} onChange={e => set("title", e.target.value)} />
          </Field>
          <div className="form-row">
            <Field label="Subject *" error={errors.subject}>
              <input className={`form-input ${errors.subject ? "error" : ""}`}
                placeholder="e.g. Mathematics"
                value={form.subject} onChange={e => set("subject", e.target.value)} />
            </Field>
            <Field label="Class *" error={errors.class}>
              <select className={`form-select ${errors.class ? "error" : ""}`}
                value={form.class} onChange={e => set("class", e.target.value)}>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="form-row">
            <Field label="Due Date (AD) *" error={errors.dueDate}>
              <input type="date" className={`form-input ${errors.dueDate ? "error" : ""}`}
                value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
            </Field>
            <Field label="Due Date (BS) *" error={errors.dueDateBs}>
              <input className={`form-input mono ${errors.dueDateBs ? "error" : ""}`}
                placeholder="e.g. 2081-05-20"
                value={form.dueDateBs} onChange={e => set("dueDateBs", e.target.value)} />
            </Field>
          </div>
          <Field label="Priority">
            <div style={{ display: "flex", gap: 8 }}>
              {PRIORITIES.map(p => (
                <button key={p} type="button"
                  onClick={() => set("priority", p)}
                  className={`btn btn-sm ${form.priority === p ? "btn-primary" : "btn-outline"}`}
                  style={{ textTransform: "capitalize", flex: 1 }}>
                  {p}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Description">
            <textarea className="form-input" rows={3}
              placeholder="Additional instructions or notes…"
              style={{ resize: "vertical" }}
              value={form.description} onChange={e => set("description", e.target.value)} />
          </Field>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { if (validate()) onSave(form); }} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Post Homework"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Homework card ─────────────────────────────────────────────────────────────
function HwCard({ hw, canEdit, canDelete, onEdit, onDelete, onView }) {
  const soon = isDueSoon(hw.dueDateBs);

  return (
    <div className="card" style={{
      padding: "1.1rem 1.25rem",
      borderLeft: `4px solid ${hw.priority === "high" ? "var(--red)" : hw.priority === "low" ? "var(--green)" : "var(--amber)"}`,
      cursor: "pointer",
      transition: "box-shadow 0.15s",
    }}
      onClick={onView}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow-md)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "var(--shadow)"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
            <span className={`tag ${PRIORITY_TAG[hw.priority] || "tag-gray"}`}>
              {hw.priority?.toUpperCase()}
            </span>
            <span className="tag tag-blue">{hw.class}</span>
            <span className="tag tag-gray">{hw.subject}</span>
            {soon && <span className="tag tag-red">Due Soon</span>}
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 4,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {hw.title}
          </div>
          {hw.description && (
            <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {hw.description}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>
              Posted by {hw.postedBy?.name || "Teacher"}
            </span>
            <span style={{ color: "var(--border)" }}>·</span>
            <span className="bs-date" style={{ fontSize: 11 }}>
              Due: {hw.dueDateBs || "—"}
            </span>
          </div>
        </div>
        {(canEdit || canDelete) && (
          <div style={{ display: "flex", gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            {canEdit   && <button className="btn btn-ghost btn-sm" onClick={onEdit}   title="Edit"><Pencil size={13} /></button>}
            {canDelete && <button className="btn btn-danger btn-sm" onClick={onDelete} title="Delete"><Trash2 size={13} /></button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Detail view modal ─────────────────────────────────────────────────────────
function DetailModal({ hw, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div className="modal-title" style={{ fontSize: 16 }}>{hw.title}</div>
            <span className={`tag ${PRIORITY_TAG[hw.priority] || "tag-gray"}`}>{hw.priority?.toUpperCase()}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {[
            ["Class",      <span className="tag tag-blue">{hw.class}</span>],
            ["Subject",    hw.subject],
            ["Posted by",  hw.postedBy?.name || "—"],
            ["Due Date (BS)", <span className="bs-date">{hw.dueDateBs || "—"}</span>],
            ["Due Date (AD)", hw.dueDate ? new Date(hw.dueDate).toLocaleDateString("en-NP") : "—"],
            ["Priority",   <span className={`tag ${PRIORITY_TAG[hw.priority]}`}>{hw.priority?.toUpperCase()}</span>],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
              <span style={{ color: "var(--text-3)", fontWeight: 500 }}>{label}</span>
              <span style={{ color: "var(--text)" }}>{val}</span>
            </div>
          ))}
          {hw.description && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Instructions</div>
              <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.7,
                background: "var(--canvas)", borderRadius: 8, padding: "10px 12px" }}>
                {hw.description}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
export default function HomeworkPage() {
  const { currentUser } = useApp();

  // Derive role at render time
  const isAdmin   = currentUser?.role === "admin";
  const isTeacher = currentUser?.role === "teacher";
  const isParent  = currentUser?.role === "parent";
  const canPost   = isAdmin || isTeacher;

  const [homework,  setHomework]  = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  // Filters — hidden from parents
  const [search,       setSearch]       = useState("");
  const [classFilter,  setClassFilter]  = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [page,         setPage]         = useState(1);
  const LIMIT = 15;

  // Modals
  const [addModal,    setAddModal]    = useState(false);
  const [editModal,   setEditModal]   = useState(null);
  const [confirmDel,  setConfirmDel]  = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  // Fetch class list
  useEffect(() => {
    if (isParent) return;
    axios.get("/students/classes")
      .then(res => setClasses(res.data.classes || []))
      .catch(() => {});
  }, [isParent]);

  // Fetch homework
  const fetchHomework = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (!isParent) {
        if (search.trim())              params.search   = search.trim();
        if (classFilter !== "all")      params.class    = classFilter;
        if (priorityFilter !== "all")   params.priority = priorityFilter;
      }
      const res = await axios.get("/homework", { params });
      setHomework(res.data.homework || []);
      setTotal(res.data.total       || 0);
    } catch {
      toast.error("Failed to load homework.");
    } finally {
      setLoading(false);
    }
  }, [page, search, classFilter, priorityFilter, isParent]);

  useEffect(() => { fetchHomework(); }, [fetchHomework]);
  useEffect(() => { setPage(1); }, [search, classFilter, priorityFilter]);

  // Add
  const handleAdd = async (form) => {
    setSaving(true);
    try {
      await axios.post("/homework", form);
      toast.success("Homework posted.");
      setAddModal(false);
      fetchHomework();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post homework.");
    } finally {
      setSaving(false);
    }
  };

  // Edit
  const handleEdit = async (form) => {
    setSaving(true);
    try {
      await axios.put(`/homework/${editModal._id}`, form);
      toast.success("Homework updated.");
      setEditModal(null);
      fetchHomework();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update homework.");
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await axios.delete(`/homework/${confirmDel._id}`);
      toast.success("Homework deleted.");
      setConfirmDel(null);
      fetchHomework();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete homework.");
    }
  };

  // Ownership check — teacher can only edit/delete their own homework
  const canEdit = (hw) => {
    if (isAdmin) return true;
    if (isTeacher) return hw.postedBy?._id === currentUser?.id || hw.postedBy?._id === currentUser?._id;
    return false;
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <Topbar title="Homework" />
      <div className="page-content">

        {/* Header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Homework</h1>
            <p className="page-subtitle">
              {isParent
                ? `Upcoming assignments for Class ${currentUser?.childClass || "—"}`
                : `${total} assignment${total !== 1 ? "s" : ""}`}
            </p>
          </div>
          {canPost && (
            <button className="btn btn-primary" onClick={() => setAddModal(true)}>
              <Plus size={15} /> Post Homework
            </button>
          )}
        </div>

        {/* Filter bar — hidden from parents */}
        {!isParent && (
          <div className="filter-bar">
            <div className="search-box" style={{ flex: "none", width: 240 }}>
              <Search size={14} />
              <input placeholder="Search homework…"
                value={search} onChange={e => setSearch(e.target.value)} />
              {search && (
                <button onClick={() => setSearch("")}
                  style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", padding: 0 }}>
                  <X size={12} style={{ color: "var(--text-3)" }} />
                </button>
              )}
            </div>
            <select className="form-select" style={{ width: "auto" }}
              value={classFilter} onChange={e => setClassFilter(e.target.value)}>
              <option value="all">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="form-select" style={{ width: "auto" }}
              value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
              <option value="all">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p} style={{ textTransform: "capitalize" }}>{p}</option>)}
            </select>
            {!loading && <span className="tag tag-blue">{total} result{total !== 1 ? "s" : ""}</span>}
          </div>
        )}

        {/* Cards grid */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="card" style={{ padding: "1.1rem 1.25rem" }}>
                <Skeleton height={13} width="30%" style={{ marginBottom: 8 }} />
                <Skeleton height={16} width="60%" style={{ marginBottom: 6 }} />
                <Skeleton height={11} width="45%" />
              </div>
            ))}
          </div>
        ) : homework.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={40} />
            <h3>No homework found</h3>
            <p>
              {isParent
                ? "No upcoming homework for your child's class."
                : "No assignments posted yet."}
            </p>
            {canPost && (
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setAddModal(true)}>
                <Plus size={14} /> Post First Assignment
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {homework.map(hw => (
              <HwCard
                key={hw._id}
                hw={hw}
                canEdit={canEdit(hw)}
                canDelete={canEdit(hw)}
                onView={() => setDetailModal(hw)}
                onEdit={() => setEditModal(hw)}
                onDelete={() => setConfirmDel(hw)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isParent && totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
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
                  : <button key={p} className={`page-btn ${p === page ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
              )}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={13} />
            </button>
            <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 4 }}>
              {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      {addModal    && <HomeworkModal classes={classes} onSave={handleAdd}  onClose={() => setAddModal(false)}  saving={saving} />}
      {editModal   && <HomeworkModal hw={editModal} classes={classes} onSave={handleEdit} onClose={() => setEditModal(null)} saving={saving} />}
      {confirmDel  && <ConfirmModal  hw={confirmDel} onConfirm={handleDelete} onCancel={() => setConfirmDel(null)} />}
      {detailModal && <DetailModal   hw={detailModal} onClose={() => setDetailModal(null)} />}
    </>
  );
}