import { useState } from "react";
import Topbar from "../../components/Topbar";
import { mockNotices } from "../../data/mockData";
import { Plus, X, AlertCircle, Pin, Lock } from "lucide-react";
import { useApp } from "../../context/AppContext";
import toast from "react-hot-toast";

const CATEGORIES = ["exam","holiday","event","urgent","general"];
const catColors  = { exam:"tag-blue", holiday:"tag-green", event:"tag-purple", urgent:"tag-red", general:"tag-gray" };

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

  const [notices,    setNotices]    = useState(mockNotices);
  const [catFilter,  setCatFilter]  = useState("all");
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState({ title:"", category:"general", content:"", important:false });

  const filtered = catFilter === "all" ? notices : notices.filter(n => n.category === catFilter);

  // ── Delete permission logic ──────────────────────────────────────────────────
  // Admin can delete any notice.
  // Teacher can only delete their own notices.
  // Parents cannot delete any notice.
  const canDelete = (notice) => {
    if (isParent) return false;
    if (isAdmin)  return true;
    // Teacher: only their own
    return notice.postedBy === currentUser?.name;
  };

  const handleDelete = (id) => {
    setNotices(p => p.filter(n => n.id !== id));
    toast.success("Notice removed");
  };

  const handlePost = (e) => {
    e.preventDefault();
    setNotices(prev => [{
      ...form,
      id:       "n" + Date.now(),
      postedBy: currentUser?.name || "Staff",
      postedAt: "2082-11-26",
      // Tag admin-posted notices clearly so delete logic is unambiguous
      postedByRole: role,
    }, ...prev]);
    toast.success("Notice posted!");
    setShowModal(false);
    setForm({ title:"", category:"general", content:"", important:false });
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
          {filtered.map(n => (
            <div key={n.id} className="card" style={{ padding:20,
              borderLeft: n.important ? "4px solid var(--red)" : "4px solid transparent" }}>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <AlertCircle size={18} color={n.important?"var(--red)":"var(--text-3)"}
                  style={{ marginTop:2, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                    <div style={{ fontWeight:600, fontSize:15 }}>{n.title}</div>
                    {n.important && <span className="tag tag-red"><Pin size={10}/> Important</span>}
                    <span className={`tag ${catColors[n.category]}`}>{n.category}</span>
                    {/* Show lock icon for admin-posted notices */}
                    {(n.postedByRole === "admin" || (!n.postedByRole && n.postedBy === "Admin")) && (
                      <span className="tag tag-gray" style={{ fontSize:10 }}>
                        <Lock size={9}/> Admin only
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.6 }}>{n.content}</p>
                  <div style={{ marginTop:8, fontSize:11, color:"var(--text-3)" }}>
                    Posted by {n.postedBy} · {n.postedAt}
                  </div>
                </div>
                {canDelete(n) ? (
                  <button className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(n.id)} title="Remove notice">
                    <X size={12}/>
                  </button>
                ) : !isParent && (
                  // Teacher seeing someone else's notice — show locked icon
                  <div style={{ padding:"6px 8px", opacity:0.3 }} title="Only the admin or original poster can remove this">
                    <Lock size={13}/>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="empty-state"><p>No notices found</p></div>}
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
                    {CATEGORIES.map(c => <option key={c} style={{textTransform:"capitalize"}}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Content *">
                  <textarea className="form-input" rows={4} required value={form.content}
                    onChange={e => setForm(p=>({...p,content:e.target.value}))}/>
                </Field>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
                  <input type="checkbox" checked={form.important}
                    onChange={e => setForm(p=>({...p,important:e.target.checked}))}
                    style={{ accentColor:"var(--red)", width:16, height:16 }}/>
                  Mark as Important
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Post Notice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
