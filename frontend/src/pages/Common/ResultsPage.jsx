import { useEffect, useState } from "react";
import Topbar from "../../components/Topbar";
import { CLASSES } from "../../data/mockData";
import { useApp } from "../../context/AppContext";
import { Lock, Plus } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

function calcGPA(pct) {
  if (pct >= 90) return { gpa: 4.0, grade: "A+" };
  if (pct >= 80) return { gpa: 3.6, grade: "A" };
  if (pct >= 70) return { gpa: 3.2, grade: "B+" };
  if (pct >= 60) return { gpa: 2.8, grade: "B" };
  if (pct >= 50) return { gpa: 2.4, grade: "C+" };
  if (pct >= 40) return { gpa: 2.0, grade: "C" };
  return { gpa: 0, grade: "NG" };
}

function gradeColor(grade) {
  if (["A+", "A"].includes(grade)) return "tag-green";
  if (["B+", "B"].includes(grade)) return "tag-blue";
  if (["C+", "C"].includes(grade)) return "tag-purple";
  return "tag-red";
}

export default function ResultsPage() {
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === "admin";
  const isTeacher = currentUser?.role === "teacher";
  const isParent = currentUser?.role === "parent";

  const [results, setResults] = useState([]);
  const [classFilter, setClassFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      setLoading(true);
      try {
        const params = {};
        if (!isParent && classFilter !== "all") params.class = classFilter;

        const { data } = await axios.get("/results", { params });
        if (!cancelled) setResults(data.results || []);
      } catch (err) {
        if (!cancelled) {
          setResults([]);
          toast.error(err.response?.data?.message || "Failed to load results.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadResults();
    return () => { cancelled = true; };
  }, [classFilter, isParent]);

  const renderResult = (r) => {
    const totalObtained = r.totalMarks ?? r.subjects.reduce((sum, sub) => sum + Number(sub.marksObtained || 0), 0);
    const totalFull = r.totalFullMarks ?? r.subjects.reduce((sum, sub) => sum + Number(sub.fullMarks || 0), 0);
    const pct = r.overallPercentage ?? Math.round((totalObtained / totalFull) * 100);
    const overall = r.overallGpa
      ? { gpa: r.overallGpa, grade: r.overallGrade }
      : calcGPA(pct);

    return (
      <div key={r._id} className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title">{r.student?.name || currentUser?.childName || "Student"}</div>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
              {r.class} - {r.examName} {r.examYear ? `- ${r.examYear}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "var(--blue)" }}>
              {overall.grade}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>
              GPA <span className="mono">{Number(overall.gpa || 0).toFixed(1)}</span> - {pct}%
            </div>
          </div>
        </div>

        <div className="card-body">
          {(r.subjects || []).map((sub) => {
            const obtained = Number(sub.marksObtained || 0);
            const full = Number(sub.fullMarks || 0);
            const subPct = full > 0 ? Math.round((obtained / full) * 100) : 0;
            const grade = sub.grade || calcGPA(subPct).grade;
            const pass = sub.isPassing ?? subPct >= 35;

            return (
              <div key={sub.subject} className="result-subject-row">
                <div style={{ width: 130, fontSize: 13, fontWeight: 500 }}>{sub.subject}</div>
                <div className="result-bar-wrap">
                  <div className={`result-bar ${pass ? "pass" : "fail"}`} style={{ width: `${subPct}%` }} />
                </div>
                <div className="mono" style={{ width: 80, textAlign: "right", fontSize: 13 }}>
                  {obtained}<span style={{ color: "var(--text-3)" }}>/{full}</span>
                </div>
                <div style={{ width: 44, textAlign: "right" }}>
                  <span className={`tag ${gradeColor(grade)}`}>{grade}</span>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "2px solid var(--border)", display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
            <span>Total</span>
            <span className="mono">{totalObtained}/{totalFull} - {pct}%</span>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 className="page-title">Exam Results</h1>
              <p className="page-subtitle">
                {isParent ? `Results for ${currentUser?.childName || "your child"}` : "Academic performance records"}
              </p>
            </div>
            {(isAdmin || isTeacher) && (
              <button className="btn btn-primary" onClick={() => toast("Result upload is handled from the backend API.")}>
                <Plus size={15} /> Upload Marks
              </button>
            )}
          </div>
        </div>

        {!isParent && (
          <div className="filter-bar">
            <select className="form-input" style={{ width: "auto" }} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
              <option value="all">All Classes</option>
              {CLASSES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        )}

        {isParent && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--canvas)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text-2)", marginBottom: 16 }}>
            <Lock size={13} />
            You can only view published results for your child.
          </div>
        )}

        {loading ? (
          <div className="empty-state"><p>Loading results...</p></div>
        ) : results.length > 0 ? (
          results.map(renderResult)
        ) : (
          <div className="empty-state"><p>No results found</p></div>
        )}
      </div>
    </>
  );
}
