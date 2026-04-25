import { useState, useEffect, useCallback } from "react";
import Topbar from "../components/Topbar";
import { useApp } from "../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import {
  CheckCircle, X, Plus, CreditCard,
  ChevronLeft, ChevronRight, AlertCircle,
  TrendingDown, TrendingUp, RefreshCw,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
// FIXED: correct status values matching the model
const STATUSES = ["all", "paid", "partially_paid", "pending", "overdue"];
const STATUS_LABEL = {
  paid:           "Paid",
  partially_paid: "Partial",
  pending:        "Pending",
  overdue:        "Overdue",
};
const STATUS_TAG = {
  paid:           "tag-green",
  partially_paid: "tag-amber",
  pending:        "tag-blue",
  overdue:        "tag-red",
};

const FEE_TYPES = ["tuition","exam","sports","library","transport","hostel","misc"];
const PAY_METHODS = [
  { value: "cash",          label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "esewa",         label: "eSewa" },
  { value: "khalti",        label: "Khalti" },
  { value: "cheque",        label: "Cheque" },
  { value: "other",         label: "Other" },
];

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ height = 16, width = "100%", radius = 6 }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} />;
}

// ── Escape key hook ───────────────────────────────────────────────────────────
function useEscapeKey(handler) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") handler(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [handler]);
}

// ── Payment modal ─────────────────────────────────────────────────────────────
function PaymentModal({ fee, onClose, onSaved }) {
  useEscapeKey(onClose);

  const balance = fee.amount - (fee.paidAmount || 0);

  const [form,   setForm]   = useState({
    paidAmount:    String(balance),
    paymentMethod: "cash",
    paidDateBs:    "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    const amt = Number(form.paidAmount);
    if (!form.paidAmount)          e.paidAmount = "Amount is required.";
    else if (isNaN(amt) || amt <= 0) e.paidAmount = "Enter a valid positive amount.";
    else if (amt > balance)         e.paidAmount = `Cannot exceed balance of NPR ${balance.toLocaleString()}.`;
    if (!form.paidDateBs?.trim())  e.paidDateBs = "Payment date (BS) is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRecord = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const paid    = Number(form.paidAmount);
      const newPaid = (fee.paidAmount || 0) + paid;
      // Auto-determine status — backend will also derive it
      const status  = newPaid >= fee.amount ? "paid" : "partially_paid";
      await axios.put(`/fees/${fee._id}`, {
        paidAmount:    newPaid,
        paymentMethod: form.paymentMethod,
        paidDateBs:    form.paidDateBs.trim(),
        paidDate:      new Date().toISOString(),
        status,
      });
      toast.success(`Payment of NPR ${paid.toLocaleString()} recorded.`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Record Payment</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {/* Fee summary */}
          <div style={{
            padding: "12px 14px", background: "var(--canvas)",
            borderRadius: 8, marginBottom: 16, fontSize: 13,
          }}>
            <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
              {fee.student?.name}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-2)" }}>
              <span>Total: <span className="mono">NPR {fee.amount?.toLocaleString()}</span></span>
              <span>Paid: <span className="mono" style={{ color: "var(--green)" }}>NPR {(fee.paidAmount || 0).toLocaleString()}</span></span>
              <span>Balance: <span className="mono" style={{ color: "var(--red)" }}>NPR {balance.toLocaleString()}</span></span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount Received (NPR) *</label>
              <input
                type="number" min={1} max={balance}
                className={`form-input mono ${errors.paidAmount ? "error" : ""}`}
                placeholder={balance.toString()}
                value={form.paidAmount}
                onChange={e => setForm(p => ({ ...p, paidAmount: e.target.value }))}
              />
              {errors.paidAmount && <p className="form-error">{errors.paidAmount}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-select"
                value={form.paymentMethod}
                onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))}>
                {PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Date (BS) *</label>
            <input
              className={`form-input mono ${errors.paidDateBs ? "error" : ""}`}
              placeholder="e.g. 2081-05-20"
              value={form.paidDateBs}
              onChange={e => setForm(p => ({ ...p, paidDateBs: e.target.value }))}
            />
            {errors.paidDateBs && <p className="form-error">{errors.paidDateBs}</p>}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleRecord} disabled={saving}>
            {saving
              ? <><RefreshCw size={13} style={{ animation: "spin 0.7s linear infinite" }} /> Recording…</>
              : <><CheckCircle size={14} /> Record Payment</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add fee record modal ──────────────────────────────────────────────────────
function AddFeeModal({ classes, onClose, onSaved }) {
  useEscapeKey(onClose);

  const [students,  setStudents]  = useState([]);
  const [selClass,  setSelClass]  = useState(classes[0] || "");
  const [form,      setForm]      = useState({
    student: "", amount: "", dueDate: "", dueDateBs: "",
    feeType: "tuition", academicYear: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selClass) return;
    axios.get("/students", { params: { class: selClass, limit: 100 } })
      .then(res => {
        const list = res.data.students || [];
        setStudents(list);
        if (list.length > 0) setForm(p => ({ ...p, student: list[0]._id }));
      })
      .catch(() => setStudents([]));
  }, [selClass]);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.student)            e.student      = "Select a student.";
    if (!form.amount || Number(form.amount) <= 0) e.amount = "Enter a valid amount.";
    if (!form.dueDate)            e.dueDate      = "Due date is required.";
    if (!form.dueDateBs?.trim())  e.dueDateBs    = "BS due date is required.";
    if (!form.academicYear?.trim()) e.academicYear = "Academic year is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await axios.post("/fees", { ...form, amount: Number(form.amount) });
      toast.success("Fee record created.");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create fee record.");
    } finally {
      setSaving(false);
    }
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
          <div className="modal-title">Add Fee Record</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <Field label="Class *">
              <select className="form-select" value={selClass}
                onChange={e => setSelClass(e.target.value)}>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Student *" error={errors.student}>
              <select className={`form-select ${errors.student ? "error" : ""}`}
                value={form.student}
                onChange={e => set("student", e.target.value)}>
                <option value="">Select student…</option>
                {students.map(s => <option key={s._id} value={s._id}>{s.name} (Roll {s.rollNo})</option>)}
              </select>
            </Field>
          </div>
          <div className="form-row">
            <Field label="Fee Type">
              <select className="form-select" value={form.feeType}
                onChange={e => set("feeType", e.target.value)}>
                {FEE_TYPES.map(t => (
                  <option key={t} value={t} style={{ textTransform: "capitalize" }}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Amount (NPR) *" error={errors.amount}>
              <input type="number" min={1}
                className={`form-input mono ${errors.amount ? "error" : ""}`}
                placeholder="e.g. 5000"
                value={form.amount} onChange={e => set("amount", e.target.value)} />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Due Date (AD) *" error={errors.dueDate}>
              <input type="date" className={`form-input ${errors.dueDate ? "error" : ""}`}
                value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
            </Field>
            <Field label="Due Date (BS) *" error={errors.dueDateBs}>
              <input className={`form-input mono ${errors.dueDateBs ? "error" : ""}`}
                placeholder="e.g. 2081-05-15"
                value={form.dueDateBs} onChange={e => set("dueDateBs", e.target.value)} />
            </Field>
          </div>
          <Field label="Academic Year (BS) *" error={errors.academicYear}>
            <input className={`form-input mono ${errors.academicYear ? "error" : ""}`}
              placeholder="e.g. 2081-82"
              value={form.academicYear} onChange={e => set("academicYear", e.target.value)} />
          </Field>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
            {saving ? "Creating…" : "Add Fee Record"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
export default function FeesPage() {
  const { currentUser } = useApp();

  // Derive roles at render time — never store in useState
  const isAdmin   = currentUser?.role === "admin";
  const isParent  = currentUser?.role === "parent";
  const isTeacher = currentUser?.role === "teacher";

  // Teachers have no access to fee data
  if (isTeacher) {
    return (
      <>
        <Topbar title="Fee Tracking" />
        <div className="page-content">
          <div className="empty-state">
            <CreditCard size={40} />
            <h3>Access Restricted</h3>
            <p>Fee records are managed by the school administrator.</p>
          </div>
        </div>
      </>
    );
  }

  const [records,   setRecords]   = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [classes,   setClasses]   = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [sumLoading,setSumLoading]= useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter,  setClassFilter]  = useState("all");
  const [page,         setPage]         = useState(1);
  const LIMIT = 20;

  // Modals
  const [payModal, setPayModal] = useState(null);  // fee record being paid
  const [addModal, setAddModal] = useState(false);

  // Fetch classes
  useEffect(() => {
    if (isParent) return;
    axios.get("/students/classes")
      .then(res => setClasses(res.data.classes || []))
      .catch(() => {});
  }, [isParent]);

  // Fetch admin summary
  useEffect(() => {
    if (!isAdmin) return;
    setSumLoading(true);
    axios.get("/fees/summary")
      .then(res => setSummary(res.data))
      .catch(() => setSummary(null))
      .finally(() => setSumLoading(false));
  }, [isAdmin]);

  // Fetch records
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (!isParent) {
        // FIXED: correct status values
        if (statusFilter !== "all") params.status = statusFilter;
        if (classFilter  !== "all") params.class  = classFilter;
      }
      const res = await axios.get("/fees", { params });
      setRecords(res.data.records || []);
      setTotal(res.data.total     || 0);
    } catch {
      toast.error("Failed to load fee records.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, classFilter, isParent]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { setPage(1); }, [statusFilter, classFilter]);

  // Reload summary after payment
  const refreshSummary = () => {
    if (!isAdmin) return;
    axios.get("/fees/summary")
      .then(res => setSummary(res.data))
      .catch(() => {});
  };

  const onPaymentSaved = () => {
    setPayModal(null);
    fetchRecords();
    refreshSummary();
  };

  const onFeeAdded = () => {
    setAddModal(false);
    fetchRecords();
    refreshSummary();
  };

  const totalPages = Math.ceil(total / LIMIT);

  // Parent outstanding balance
  const outstanding = records
    .filter(r => r.status !== "paid")
    .reduce((s, r) => s + Math.max(0, (r.amount || 0) - (r.paidAmount || 0)), 0);

  return (
    <>
      <Topbar title={isParent ? "Fee Status" : "Fee Tracking"} />
      <div className="page-content">

        {/* Header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">{isParent ? "Fee Status" : "Fee Tracking"}</h1>
            <p className="page-subtitle">
              {isParent
                ? `Fee records for ${currentUser?.childName || "your child"}`
                : `${total.toLocaleString()} fee record${total !== 1 ? "s" : ""}`}
            </p>
          </div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setAddModal(true)}>
              <Plus size={15} /> Add Fee Record
            </button>
          )}
        </div>

        {/* Admin summary cards */}
        {isAdmin && (
          <div className="fee-summary" style={{ marginBottom: 20 }}>
            <div className="fee-box">
              <div className="fee-box-label">Total Collected</div>
              {sumLoading
                ? <Skeleton height={28} width={100} style={{ marginTop: 6 }} />
                : <div className="fee-box-value" style={{ color: "var(--green)" }}>
                    NPR {(summary?.totalCollected || 0).toLocaleString()}
                  </div>}
              {!sumLoading && summary && (
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <TrendingUp size={10} style={{ color: "var(--green)" }} />
                  {summary.collectionRate || 0}% collection rate
                </div>
              )}
            </div>
            <div className="fee-box">
              <div className="fee-box-label">Outstanding</div>
              {sumLoading
                ? <Skeleton height={28} width={100} style={{ marginTop: 6 }} />
                : <div className="fee-box-value" style={{ color: "var(--amber)" }}>
                    NPR {(summary?.outstanding || 0).toLocaleString()}
                  </div>}
              {!sumLoading && summary && (
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <TrendingDown size={10} style={{ color: "var(--amber)" }} />
                  {summary.breakdown?.pending?.count || 0} pending records
                </div>
              )}
            </div>
            <div className="fee-box">
              <div className="fee-box-label">Overdue Records</div>
              {sumLoading
                ? <Skeleton height={28} width={60} style={{ marginTop: 6 }} />
                : <div className="fee-box-value" style={{ color: "var(--red)" }}>
                    {summary?.breakdown?.overdue?.count || 0}
                  </div>}
              {!sumLoading && summary?.breakdown?.overdue?.count > 0 && (
                <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertCircle size={10} />
                  NPR {(summary.breakdown.overdue.amount || 0).toLocaleString()} overdue
                </div>
              )}
            </div>
          </div>
        )}

        {/* Parent outstanding banner */}
        {isParent && outstanding > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", background: "#FEF2F2",
            border: "1px solid #FCA5A5", borderRadius: 10, marginBottom: 16,
          }}>
            <AlertCircle size={16} style={{ color: "var(--red)", flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--red)" }}>
                Outstanding Fees: NPR {outstanding.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>
                Please contact the school office to make payment.
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filter-bar">
          {/* FIXED: correct status values */}
          {STATUSES.map(s => (
            <button key={s}
              className={`btn btn-sm ${statusFilter === s ? "btn-primary" : "btn-outline"}`}
              onClick={() => setStatusFilter(s)}
              style={{ textTransform: "capitalize" }}>
              {s === "all" ? "All" : STATUS_LABEL[s] || s}
            </button>
          ))}
          {!isParent && (
            <select className="form-select" style={{ width: "auto", marginLeft: "auto" }}
              value={classFilter} onChange={e => setClassFilter(e.target.value)}>
              <option value="all">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Fee Type</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Method</th>
                <th>Due Date (BS)</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(6).fill(0).map((_, i) => (
                    <tr key={i}>
                      {[100, 60, 70, 80, 80, 80, 70, 70, 80, ...(isAdmin ? [80] : [])].map((w, j) => (
                        <td key={j}><Skeleton height={13} width={w} /></td>
                      ))}
                    </tr>
                  ))
                : records.map(f => {
                    // FIXED: use paidAmount not paid
                    const paid    = f.paidAmount || 0;
                    const balance = Math.max(0, (f.amount || 0) - paid);

                    return (
                      <tr key={f._id}>
                        <td style={{ fontWeight: 500 }}>{f.student?.name || "—"}</td>
                        <td><span className="tag tag-blue">{f.class || f.student?.class}</span></td>
                        <td>
                          <span className="tag tag-gray" style={{ textTransform: "capitalize" }}>
                            {(f.feeType || "—").replace("_", " ")}
                          </span>
                        </td>
                        <td className="mono">NPR {(f.amount || 0).toLocaleString()}</td>
                        <td className="mono" style={{ color: "var(--green)" }}>
                          NPR {paid.toLocaleString()}
                        </td>
                        <td className="mono" style={{ color: balance > 0 ? "var(--red)" : "var(--green)", fontWeight: balance > 0 ? 700 : 400 }}>
                          NPR {balance.toLocaleString()}
                        </td>
                        <td>
                          {/* FIXED: correct status tag classes */}
                          <span className={`tag ${STATUS_TAG[f.status] || "tag-gray"}`}>
                            {STATUS_LABEL[f.status] || f.status || "—"}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text-2)", textTransform: "capitalize" }}>
                          {(f.paymentMethod || "—").replace("_", " ")}
                        </td>
                        <td>
                          {/* FIXED: BS date shown by default */}
                          <span className="bs-date">{f.dueDateBs || "—"}</span>
                          {f.dueDate && (
                            <span style={{ fontSize: 10, color: "var(--text-3)", display: "block" }}>
                              {new Date(f.dueDate).toLocaleDateString("en-NP")}
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => setPayModal(f)}
                              disabled={f.status === "paid"}
                              style={{ whiteSpace: "nowrap" }}
                            >
                              <CheckCircle size={12} />
                              Record
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
            </tbody>
          </table>

          {!loading && records.length === 0 && (
            <div className="empty-state">
              <CreditCard size={40} />
              <h3>No fee records</h3>
              <p>
                {isParent
                  ? "No fee records found for your child."
                  : statusFilter !== "all" || classFilter !== "all"
                    ? "No records match your filters."
                    : "No fee records have been created yet."}
              </p>
              {isAdmin && statusFilter === "all" && classFilter === "all" && (
                <button className="btn btn-primary" style={{ marginTop: 12 }}
                  onClick={() => setAddModal(true)}>
                  <Plus size={14} /> Add First Fee Record
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page === 1}
              onClick={() => setPage(p => p - 1)}>
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
                  : <button key={p} className={`page-btn ${p === page ? "active" : ""}`}
                      onClick={() => setPage(p)}>{p}</button>
              )}
            <button className="page-btn" disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={13} />
            </button>
            <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 4 }}>
              {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      {payModal && (
        <PaymentModal fee={payModal} onClose={() => setPayModal(null)} onSaved={onPaymentSaved} />
      )}
      {addModal && isAdmin && (
        <AddFeeModal classes={classes} onClose={() => setAddModal(false)} onSaved={onFeeAdded} />
      )}
    </>
  );
}