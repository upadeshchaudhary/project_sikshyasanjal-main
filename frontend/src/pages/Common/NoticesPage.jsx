import { useState, useEffect, useCallback, useRef  } from "react";
import Topbar from "../../components/Topbar";
import { Plus, Trash2, X, AlertCircle, Pin, Lock, RefreshCw } from "lucide-react";
import { useApp } from "../../context/AppContext";
import toast from "react-hot-toast";
import axios from "axios";

const CATEGORIES = ["exam","holiday","event","urgent","general","meeting"];
const catColors  = { exam:"tag-blue", holiday:"tag-green", event:"tag-purple", urgent:"tag-red", general:"tag-gray", meeting:"tag-amber" };

function Skeleton({ height = 20, width = "100%", radius = 6, style = {} }) {
  return (
    <div className="skeleton" style={{ height, width, borderRadius: radius, ...style }} />
  );
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

export default function NoticesPage() {
  const { currentUser } = useApp();
  const role     = currentUser?.role;
  const isParent = role === "parent";
  const isAdmin  = role === "admin";

  const [notices,    setNotices]    = useState([]);
  const [catFilter,  setCatFilter]  = useState("all");
  const [showModal,  setShowModal]  = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [form,       setForm]       = useState({ title:"", category:"general", body:"", isImportant:false });

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (catFilter !== "all") params.category = catFilter;
      const { data } = await axios.get("/notices", { params });
      setNotices(data.notices || []);
    } catch (err) {
      toast.error("Failed to load notices.");
    } finally {
      setLoading(false);
    }
  }, [catFilter]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const canDelete = (notice) => {
    if (isParent) return false;
    if (isAdmin)  return true;
    // Teacher can only delete if they posted it
    return notice.postedBy?._id === currentUser?.id || notice.postedBy?._id === currentUser?._id;
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/notices/${id}`);
      setNotices(p => p.filter(n => n._id !== id));
      toast.success("Notice removed");
    } catch (err) {
      toast.error("Failed to remove notice.");
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await axios.post("/notices", form);
      setNotices(prev => [data.notice, ...prev]);
      toast.success("Notice posted!");
      setShowModal(false);
      setForm({ title:"", category:"general", body:"", isImportant:false });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post notice.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Topbar title="Notices"/>
      <div className="page-content">
        <div className="page-header">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <h1 className="page-title">Notice Board</h1>
              <p className="page-subtitle">School-wide announcements</p>
            </div>
            {!isParent && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={15}/> Post Notice
              </button>
            )}
          </div>
        </div>

        <div className="filter-bar">
          <button className={`btn ${catFilter==="all"?"btn-primary":"btn-outline"} btn-sm`} onClick={() => setCatFilter("all")}>All</button>
          {CATEGORIES.map(c => (
            <button key={c} className={`btn ${catFilter===c?"btn-primary":"btn-outline"} btn-sm`}
              onClick={() => setCatFilter(c)} style={{ textTransform:"capitalize" }}>{c}</button>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="card" style={{ padding: 20 }}>
                <Skeleton height={20} width="60%" style={{ marginBottom: 10 }} />
                <Skeleton height={14} width="90%" style={{ marginBottom: 6 }} />
                <Skeleton height={14} width="40%" />
              </div>
            ))
          ) : notices.length === 0 ? (
            <div className="empty-state"><p>No notices found</p></div>
          ) : (
            notices.map(n => (
              <div key={n._id} className="card" style={{ padding:20,
                borderLeft: n.isImportant ? "4px solid var(--red)" : "4px solid transparent" }}>
                <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                  <AlertCircle size={18} color={n.isImportant?"var(--red)":"var(--text-3)"}
                    style={{ marginTop:2, flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                      <div style={{ fontWeight:600, fontSize:15 }}>{n.title}</div>
                      {n.isImportant && <span className="tag tag-red"><Pin size={10}/> Important</span>}
                      <span className={`tag ${catColors[n.category] || "tag-gray"}`}>{n.category}</span>
                      {n.postedBy?.role === "admin" && (
                        <span className="tag tag-gray" style={{ fontSize:10 }}>
                          <Lock size={9}/> Admin only
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.6, whiteSpace: "pre-wrap" }}>{n.body}</p>
                    <div style={{ marginTop:8, fontSize:11, color:"var(--text-3)" }}>
                      Posted by {n.postedBy?.name || "Staff"} · {new Date(n.createdAt).toLocaleDateString("en-NP")}
                    </div>
                  </div>
                  {canDelete(n) && (
                    <button className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(n._id)} title="Remove notice">
                      <Trash2 size={12}/>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Post New Notice</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={16}/></button>
            </div>
            <form onSubmit={handlePost}>
              <div className="modal-body">
                <Field label="Title *">
                  <input className="form-input" required value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))}/>
                </Field>
                <Field label="Category">
                  <select className="form-input" value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}>
                    {CATEGORIES.map(c => <option key={c} value={c} style={{textTransform:"capitalize"}}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Content *">
                  <textarea className="form-input" rows={4} required value={form.body}
                    onChange={e => setForm(p=>({...p,body:e.target.value}))}/>
                </Field>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
                  <input type="checkbox" checked={form.isImportant}
                    onChange={e => setForm(p=>({...p,isImportant:e.target.checked}))}
                    style={{ accentColor:"var(--red)", width:16, height:16 }}/>
                  Mark as Important
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><RefreshCw size={13} style={{ animation: "spin 0.7s linear infinite" }} /> Posting…</> : "Post Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
