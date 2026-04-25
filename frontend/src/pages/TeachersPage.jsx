import { useState, useEffect, useCallback } from "react";
import Topbar from "../components/Topbar";
import { useApp } from "../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X, Eye, Users } from "lucide-react";

function Skeleton({ height = 16, width = "100%", radius = 6 }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} />;
}

function useEscKey(fn) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") fn(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [fn]);
}

function ViewModal({ teacher, onClose }) {
  useEscKey(onClose);
  const init = teacher.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Teacher Profile</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
            <div className="avatar" style={{ width: 52, height: 52, fontSize: 18, background: "linear-gradient(135deg,#0F6E56,#10B981)", flexShrink: 0 }}>{init}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{teacher.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-2)" }}>{teacher.subject || "—"} Teacher</div>
            </div>
          </div>
          {[
            ["Qualification",    teacher.qualification || "—"],
            ["Phone",            teacher.phone         || "—"],
            ["Email",            teacher.email         || "—"],
            ["Assigned Classes", teacher.assignedClasses?.join(", ") || "—"],
            ["Last Login",       teacher.lastLogin ? new Date(teacher.lastLogin).toLocaleDateString("en-NP") : "—"],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
              <span style={{ color: "var(--text-3)", fontWeight: 500 }}>{label}</span>
              <span style={{ color: "var(--text)", wordBreak: "break-all", textAlign: "right" }}>{val}</span>
            </div>
          ))}
        </div>
        <div className="modal-footer"><button className="btn btn-primary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

function TeacherModal({ teacher, classes, onSave, onClose, saving }) {
  useEscKey(onClose);
  const isEdit = !!teacher;
  const empty  = { name: "", subject: "", qualification: "", phone: "", email: "", assignedClasses: [] };
  const [form,   setForm]   = useState(isEdit ? { ...empty, ...teacher } : empty);
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); if (errors[k]) setErrors(p => ({ ...p, [k]: "" })); };

  const toggleClass = (cls) => {
    const cur = form.assignedClasses || [];
    set("assignedClasses", cur.includes(cls) ? cur.filter(c => c !== cls) : [...cur, cls]);
  };

  const validate = () => {
    const e = {};
    if (!form.name?.trim())  e.name  = "Name is required.";
    if (!form.email?.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const Field = ({ label, error, children }) => (
    <div className="form-group"><label className="form-label">{label}</label>{children}{error && <p className="form-error">{error}</p>}</div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? "Edit Teacher" : "Add Teacher"}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <Field label="Full Name *" error={errors.name}>
              <input className={`form-input ${errors.name ? "error" : ""}`} placeholder="e.g. Sunita Koirala"
                value={form.name} onChange={e => set("name", e.target.value)} disabled={isEdit && !false /* admin can edit */} />
            </Field>
            <Field label="Subject">
              <input className="form-input" placeholder="e.g. Mathematics" value={form.subject} onChange={e => set("subject", e.target.value)} />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Email *" error={errors.email}>
              <input type="email" className={`form-input ${errors.email ? "error" : ""}`} placeholder="teacher@school.edu.np"
                value={form.email} onChange={e => set("email", e.target.value)} />
            </Field>
            <Field label="Phone">
              <input className="form-input mono" placeholder="98XXXXXXXX" maxLength={10}
                value={form.phone} onChange={e => set("phone", e.target.value.replace(/\D/g, ""))} />
            </Field>
          </div>
          <Field label="Qualification">
            <input className="form-input" placeholder="e.g. B.Ed, M.Sc." value={form.qualification} onChange={e => set("qualification", e.target.value)} />
          </Field>
          {!isEdit && (
            <Field label="Password (optional — auto-generated if blank)">
              <input type="password" className="form-input" placeholder="Set initial password"
                value={form.password || ""} onChange={e => set("password", e.target.value)} />
            </Field>
          )}
          {/* Assign classes */}
          <div className="form-group">
            <label className="form-label">Assigned Classes</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {classes.map(cls => (
                <button key={cls} type="button"
                  className={`btn btn-sm ${form.assignedClasses?.includes(cls) ? "btn-primary" : "btn-outline"}`}
                  onClick={() => toggleClass(cls)}>
                  {cls}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { if (validate()) onSave(form); }} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Teacher"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ teacher, onConfirm, onCancel }) {
  useEscKey(onCancel);
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Remove Teacher</div>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>
            Remove <strong>{teacher.name}</strong> from the school? Their homework, attendance records, and results will be preserved.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Remove Teacher</button>
        </div>
      </div>
    </div>
  );
}

export default function TeachersPage() {
  const { currentUser } = useApp();
  const isAdmin   = currentUser?.role === "admin";
  const isTeacher = currentUser?.role === "teacher";
  const isParent  = currentUser?.role === "parent";

  const [teachers, setTeachers] = useState([]);
  const [classes,  setClasses]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState("");
  const [viewModal,    setViewModal]    = useState(null);
  const [editModal,    setEditModal]    = useState(null);
  const [addModal,     setAddModal]     = useState(false);
  const [confirmDel,   setConfirmDel]   = useState(null);

  // Parents blocked
  if (isParent) return (
    <>
      <Topbar title="Teachers" />
      <div className="page-content">
        <div className="empty-state"><Users size={40} /><h3>Access Restricted</h3><p>Teacher directory is not available to parents.</p></div>
      </div>
    </>
  );

  useEffect(() => {
    axios.get("/students/classes").then(res => setClasses(res.data.classes || [])).catch(() => {});
  }, []);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      const res = await axios.get("/teachers", { params });
      setTeachers(res.data.teachers || []);
    } catch { toast.error("Failed to load teachers."); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async (form) => {
    setSaving(true);
    try {
      await axios.post("/teachers", form);
      toast.success(`${form.name} added.`);
      setAddModal(false); fetch();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to add teacher."); }
    finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      const url = isTeacher ? "/teachers/me" : `/teachers/${editModal._id}`;
      await axios.put(url, form);
      toast.success("Profile updated.");
      setEditModal(null); fetch();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to update."); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/teachers/${confirmDel._id}`);
      toast.success(`${confirmDel.name} removed.`);
      setConfirmDel(null); fetch();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to remove."); }
  };

  return (
    <>
      <Topbar title="Teachers" />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Teachers</h1>
            <p className="page-subtitle">{teachers.length} teaching staff</p>
          </div>
          {isAdmin && <button className="btn btn-primary" onClick={() => setAddModal(true)}><Plus size={15} /> Add Teacher</button>}
        </div>

        <div className="filter-bar">
          <div className="search-box" style={{ flex: "none", width: 260 }}>
            <input placeholder="Search by name or subject…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch("")} style={{ border: "none", background: "transparent", cursor: "pointer" }}><X size={12} /></button>}
          </div>
        </div>

        <div className="grid-2">
          {loading ? Array(4).fill(0).map((_, i) => (
            <div key={i} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", gap: 14 }}>
                <Skeleton height={44} width={44} radius={10} />
                <div style={{ flex: 1 }}>
                  <Skeleton height={14} width="60%" style={{ marginBottom: 6 }} />
                  <Skeleton height={11} width="40%" style={{ marginBottom: 8 }} />
                  <Skeleton height={22} width="70%" />
                </div>
              </div>
            </div>
          )) : teachers.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
              <Users size={40} /><h3>No teachers found</h3>
              <p>{search ? "Try adjusting your search." : "No teachers added yet."}</p>
              {isAdmin && !search && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setAddModal(true)}><Plus size={14} /> Add First Teacher</button>}
            </div>
          ) : teachers.map(t => {
            const init      = t.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
            const isOwn     = isTeacher && (t._id === currentUser?.id || t._id === currentUser?._id);
            const canEdit   = isAdmin || isOwn;
            const canDelete = isAdmin;
            return (
              <div key={t._id} className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div className="avatar" style={{ width: 44, height: 44, fontSize: 16, flexShrink: 0, background: isOwn ? "linear-gradient(135deg,#0F6E56,#10B981)" : "linear-gradient(135deg,#1E3FF2,#3D5AFF)" }}>{init}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>{t.name}</div>
                      {isOwn && <span className="tag tag-green" style={{ fontSize: 9 }}>You</span>}
                      {t.isDisabled && <span className="tag tag-red" style={{ fontSize: 9 }}>Disabled</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-2)" }}>{t.subject || "—"} Teacher</div>
                    {t.qualification && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{t.qualification}</div>}
                    <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {(t.assignedClasses || []).map(c => <span key={c} className="tag tag-blue">{c}</span>)}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-2)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {t.phone && <span>📞 {t.phone}</span>}
                      {t.email && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>✉️ {t.email}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexDirection: "column", flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" title="View" onClick={() => setViewModal(t)}><Eye size={13} /></button>
                    {canEdit   && <button className="btn btn-ghost btn-sm" title="Edit"   onClick={() => setEditModal(t)}><Pencil size={13} /></button>}
                    {canDelete && <button className="btn btn-danger btn-sm" title="Remove" onClick={() => setConfirmDel(t)}><Trash2 size={13} /></button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {viewModal   && <ViewModal teacher={viewModal} onClose={() => setViewModal(null)} />}
      {addModal    && <TeacherModal classes={classes} onSave={handleAdd}  onClose={() => setAddModal(false)}  saving={saving} />}
      {editModal   && <TeacherModal teacher={editModal} classes={classes} onSave={handleEdit} onClose={() => setEditModal(null)} saving={saving} />}
      {confirmDel  && <ConfirmModal teacher={confirmDel} onConfirm={handleDelete} onCancel={() => setConfirmDel(null)} />}
    </>
  );
}