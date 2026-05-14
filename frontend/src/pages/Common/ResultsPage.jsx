import { useState } from "react";
import Topbar from "../../components/Topbar";
import { mockExamResults, mockStudents, CLASSES, SUBJECTS } from "../../data/mockData";
import { useApp } from "../../context/AppContext";
import { Plus, X, Lock } from "lucide-react";
import toast from "react-hot-toast";

function calcGPA(pct) {
  if (pct >= 90) return { gpa:4.0, grade:"A+" };
  if (pct >= 80) return { gpa:3.6, grade:"A"  };
  if (pct >= 70) return { gpa:3.2, grade:"B+" };
  if (pct >= 60) return { gpa:2.8, grade:"B"  };
  if (pct >= 50) return { gpa:2.4, grade:"C+" };
  if (pct >= 40) return { gpa:2.0, grade:"C"  };
  return { gpa:0, grade:"NG" };
}

function gradeColor(grade) {
  if (["A+","A"].includes(grade)) return "tag-green";
  if (["B+","B"].includes(grade)) return "tag-blue";
  if (["C+","C"].includes(grade)) return "tag-purple";
  return "tag-red";
}

export default function ResultsPage() {
  const { currentUser } = useApp();
  const isAdmin   = currentUser?.role === "admin";
  const isTeacher = currentUser?.role === "teacher";
  const isParent  = currentUser?.role === "parent";

  // ── DATA ISOLATION ─────────────────────────────────────────────────────────
  // Parents see ONLY their own child's result — no other student's data
  const visibleResults = isParent
    ? mockExamResults.filter(r => r.studentId === currentUser?.childId)
    : mockExamResults;

  const [results,      setResults]      = useState(visibleResults);
  const [classFilter,  setClassFilter]  = useState("all");
  const [showUpload,   setShowUpload]   = useState(false);

  const filtered = isParent
    ? results  // parent already scoped
    : classFilter === "all" ? results : results.filter(r => r.class === classFilter);

  const renderResult = (r) => {
    const totalObtained = r.subjects.reduce((s,sub) => s + sub.obtained, 0);
    const totalFull     = r.subjects.reduce((s,sub) => s + sub.fullMarks, 0);
    const pct           = Math.round((totalObtained / totalFull) * 100);
    const { gpa, grade } = calcGPA(pct);

    return (
      <div key={r.id} className="card" style={{ marginBottom:20 }}>
        <div className="card-header">
          <div>
            <div className="card-title">{r.studentName}</div>
            <div style={{ fontSize:12, color:"var(--text-2)", marginTop:2 }}>{r.class} · {r.exam}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:28, fontFamily:"'JetBrains Mono',monospace",
              fontWeight:700, color:"var(--blue)" }}>{grade}</div>
            <div style={{ fontSize:12, color:"var(--text-2)" }}>
              GPA <span className="mono">{gpa.toFixed(1)}</span> · {pct}%
            </div>
          </div>
        </div>
        <div className="card-body">
          {r.subjects.map(sub => {
            const subPct  = Math.round((sub.obtained / sub.fullMarks) * 100);
            const pass    = sub.obtained >= sub.passMarks;
            const { grade: sg } = calcGPA(subPct);
            return (
              <div key={sub.name} className="result-subject-row">
                <div style={{ width:130, fontSize:13, fontWeight:500 }}>{sub.name}</div>
                <div className="result-bar-wrap">
                  <div className={`result-bar ${pass?"pass":"fail"}`} style={{ width:`${subPct}%` }}/>
                </div>
                <div className="mono" style={{ width:80, textAlign:"right", fontSize:13 }}>
                  {sub.obtained}<span style={{ color:"var(--text-3)" }}>/{sub.fullMarks}</span>
                </div>
                <div style={{ width:44, textAlign:"right" }}>
                  <span className={`tag ${gradeColor(sg)}`}>{sg}</span>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop:16, paddingTop:12, borderTop:"2px solid var(--border)",
            display:"flex", justifyContent:"space-between", fontWeight:600 }}>
            <span>Total</span>
            <span className="mono">{totalObtained}/{totalFull} — {pct}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Topbar title="Exam Results"/>
      <div className="page-content">
        <div className="page-header">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <h1 className="page-title">Exam Results</h1>
              <p className="page-subtitle">
                {isParent
                  ? `Results for ${currentUser?.childName}`
                  : "Academic performance records"}
              </p>
            </div>
            {/* Upload marks: admin and teacher only */}
            {(isAdmin || isTeacher) && (
              <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                <Plus size={15}/> Upload Marks
              </button>
            )}
          </div>
        </div>

        {/* Class filter — not shown to parents */}
        {!isParent && (
          <div className="filter-bar">
            <select className="form-input" style={{ width:"auto" }} value={classFilter}
              onChange={e => setClassFilter(e.target.value)}>
              <option value="all">All Classes</option>
              {CLASSES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* Parent isolation notice */}
        {isParent && (
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px",
            background:"var(--canvas)", border:"1px solid var(--border)", borderRadius:8,
            fontSize:12, color:"var(--text-2)", marginBottom:16 }}>
            <Lock size={13}/>
            You can only view results for your child — {currentUser?.childName}
          </div>
        )}

        {filtered.map(renderResult)}
        {filtered.length === 0 && (
          <div className="empty-state"><p>No results found</p></div>
        )}
      </div>

      {/* ── Upload modal — admin/teacher only ── */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Upload Exam Marks</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowUpload(false)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Exam Name</label>
                  <input className="form-input" placeholder="e.g. Second Term 2082"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Class</label>
                  <select className="form-input">{CLASSES.map(c=><option key={c}>{c}</option>)}</select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Student</label>
                <select className="form-input">
                  {mockStudents.map(s=><option key={s.id}>{s.name} ({s.rollNo})</option>)}
                </select>
              </div>
              <p style={{ fontSize:12, color:"var(--text-2)", marginBottom:12 }}>Enter marks for each subject:</p>
              {SUBJECTS.slice(0,5).map(sub => (
                <div key={sub} className="form-row" style={{ gridTemplateColumns:"2fr 1fr 1fr" }}>
                  <div className="form-group">
                    <input className="form-input" value={sub} readOnly style={{ background:"var(--canvas)" }}/>
                  </div>
                  <div className="form-group">
                    <input type="number" className="form-input mono" placeholder="Obtained" min={0} max={100}/>
                  </div>
                  <div className="form-group">
                    <input type="number" className="form-input mono" placeholder="Full" defaultValue={100}/>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowUpload(false)}>Cancel</button>
              <button className="btn btn-primary"
                onClick={() => { setShowUpload(false); toast.success("Marks uploaded!"); }}>
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
