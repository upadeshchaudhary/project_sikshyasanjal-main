// MessagesPage.jsx - A full-featured messaging interface with inbox, threads, and compose modal.
import { useState, useEffect, useRef, useCallback } from "react";
import Topbar from "../components/Topbar";
import { useApp } from "../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Plus, X, Send, MessageSquare,
  ShieldCheck, Lock, RefreshCw,
  CheckCheck, ChevronRight,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function Skeleton({ height = 16, width = "100%", radius = 6 }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} />;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const diff = (Date.now() - d) / 1000;
  if (diff < 60)           return "just now";
  if (diff < 3600)         return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)        return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-NP");
}

function initials(name = "") {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

const ROLE_COLOR = {
  admin:   "linear-gradient(135deg,#1E3FF2,#3D5AFF)",
  teacher: "linear-gradient(135deg,#0F6E56,#10B981)",
  parent:  "linear-gradient(135deg,#6D28D9,#8B5CF6)",
};

// ── Compose modal ─────────────────────────────────────────────────────────────
function ComposeModal({ onClose, onSent }) {
  const { currentUser } = useApp();
  const [contacts, setContacts] = useState([]);
  const [form,     setForm]     = useState({ to: "", subject: "", body: "" });
  const [errors,   setErrors]   = useState({});
  const [sending,  setSending]  = useState(false);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // Fetch real contacts from API
  useEffect(() => {
    axios.get("/messages/contacts")
      .then(res => setContacts(res.data.contacts || []))
      .catch(() => setContacts([]));
  }, []);

  const ROLE_LABELS = { admin: "Admin", teacher: "Teacher", parent: "Parent" };

  const validate = () => {
    const e = {};
    if (!form.to)             e.to   = "Select a recipient.";
    if (!form.body?.trim())   e.body = "Message cannot be empty.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setSending(true);
    try {
      await axios.post("/messages", {
        to:      form.to,
        subject: form.subject.trim(),
        body:    form.body.trim(),
      });
      toast.success("Message sent.");
      onSent();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">New Message</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#15803D", marginTop: 2 }}>
              <ShieldCheck size={10} /> School-only messaging
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">To *</label>
            <select
              className={`form-select ${errors.to ? "error" : ""}`}
              value={form.to}
              onChange={e => { setForm(p => ({ ...p, to: e.target.value })); setErrors(p => ({ ...p, to: "" })); }}
            >
              <option value="">Select recipient…</option>
              {contacts.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name} ({ROLE_LABELS[c.role] || c.role})
                </option>
              ))}
            </select>
            {errors.to && <p className="form-error">{errors.to}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Subject</label>
            <input className="form-input" placeholder="e.g. Regarding attendance"
              value={form.subject}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Message *</label>
            <textarea className="form-input" rows={5}
              placeholder="Write your message…"
              style={{ resize: "vertical" }}
              value={form.body}
              onChange={e => { setForm(p => ({ ...p, body: e.target.value })); setErrors(p => ({ ...p, body: "" })); }}
            />
            {errors.body && <p className="form-error">{errors.body}</p>}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={sending}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
            {sending
              ? <><RefreshCw size={13} style={{ animation: "spin 0.7s linear infinite" }} /> Sending…</>
              : <><Send size={13} /> Send Message</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, isMe }) {
  return (
    <div style={{
      maxWidth: 500, alignSelf: isMe ? "flex-end" : "flex-start",
      display: "flex", gap: 8,
      flexDirection: isMe ? "row-reverse" : "row",
      alignItems: "flex-end",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: ROLE_COLOR[msg.from?.role] || "var(--blue)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 700, color: "#fff",
      }}>
        {initials(msg.from?.name)}
      </div>
      <div style={{
        background:   isMe ? "var(--blue)" : "var(--canvas)",
        border:       isMe ? "none" : "1px solid var(--border)",
        borderRadius: isMe ? "12px 0 12px 12px" : "0 12px 12px 12px",
        padding: "10px 14px", maxWidth: 380,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4,
          color: isMe ? "rgba(255,255,255,0.65)" : "var(--text-2)" }}>
          {msg.from?.name || "Unknown"}
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.65,
          color: isMe ? "rgba(255,255,255,0.9)" : "var(--text)",
          margin: 0 }}>
          {msg.body}
        </p>
        <div style={{ fontSize: 10, marginTop: 5,
          color: isMe ? "rgba(255,255,255,0.4)" : "var(--text-3)",
          fontFamily: "'JetBrains Mono',monospace" }}>
          {timeAgo(msg.createdAt)}
          {isMe && msg.isReadByRecipient && (
            <CheckCheck size={10} style={{ marginLeft: 4, color: "rgba(255,255,255,0.5)", display: "inline" }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
export default function MessagesPage() {
  const { currentUser, markNotifRead } = useApp();

  const [inbox,        setInbox]        = useState([]);
  const [thread,       setThread]       = useState(null);   // { root, replies }
  const [selected,     setSelected]     = useState(null);   // root message
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingThread,setLoadingThread]= useState(false);
  const [showCompose,  setShowCompose]  = useState(false);
  const [reply,        setReply]        = useState("");
  const [sending,      setSending]      = useState(false);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const LIMIT = 20;

  const threadEndRef = useRef(null);

  // ── Fetch inbox ────────────────────────────────────────────────────────────
  const fetchInbox = useCallback(async (p = 1) => {
    setLoadingInbox(true);
    try {
      const res = await axios.get("/messages", { params: { page: p, limit: LIMIT } });
      setInbox(res.data.messages || []);
      setTotalPages(res.data.totalPages || 1);
      setPage(p);
    } catch {
      toast.error("Failed to load messages.");
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  // ── Open thread ────────────────────────────────────────────────────────────
  const openThread = async (msg) => {
    setSelected(msg);
    setLoadingThread(true);
    setThread(null);
    try {
      // Fetch full thread (marks as read automatically on backend)
      const res = await axios.get(`/messages/${msg._id}`);
      setThread(res.data);

      // Update inbox unread state locally
      setInbox(prev => prev.map(m =>
        m._id === msg._id ? { ...m, isReadByRecipient: true } : m
      ));
    } catch {
      toast.error("Failed to load conversation.");
    } finally {
      setLoadingThread(false);
    }
  };

  // Scroll to bottom when thread loads
  useEffect(() => {
    if (thread) threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  // ── Send reply ─────────────────────────────────────────────────────────────
  const handleReply = async () => {
    if (!reply.trim() || !selected) return;
    if (!thread?.message?.from?._id) return;

    // Determine recipient — the other participant in the thread
    const recipientId = thread.message.from._id === currentUser?.id
      ? thread.message.to?._id
      : thread.message.from?._id;

    setSending(true);
    try {
      const res = await axios.post("/messages", {
        to:        recipientId,
        body:      reply.trim(),
        parentMsg: selected._id,
      });
      // Append reply to thread locally
      setThread(prev => ({
        ...prev,
        replies: [...(prev.replies || []), res.data.message],
      }));
      setReply("");
      // Refresh inbox to update preview/unread
      fetchInbox(page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  // ── Unread count in inbox item ─────────────────────────────────────────────
  const unreadInInbox = inbox.filter(m =>
    m.to?._id === currentUser?.id && !m.isReadByRecipient
  ).length;

  return (
    <>
      <Topbar title="Messaging" />
      <div className="page-content" style={{
        padding: 0, display: "flex",
        overflow: "hidden", height: "calc(100vh - 60px)",
      }}>

        {/* ── Inbox sidebar ── */}
        <div style={{
          width: 300, flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          overflow: "hidden", background: "var(--card)",
        }}>
          {/* Sidebar header */}
          <div style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 14 }}>
                Inbox
                {unreadInInbox > 0 && (
                  <span style={{
                    background: "var(--red)", color: "#fff",
                    fontSize: 10, fontWeight: 700, borderRadius: 100,
                    padding: "1px 6px",
                  }}>
                    {unreadInInbox}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#15803D", marginTop: 2 }}>
                <ShieldCheck size={10} /> School-only messaging
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCompose(true)}>
              <Plus size={13} /> Compose
            </button>
          </div>

          {/* Message list */}
          <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
            {loadingInbox ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                  <Skeleton height={12} width="60%" style={{ marginBottom: 6 }} />
                  <Skeleton height={11} width="80%" style={{ marginBottom: 4 }} />
                  <Skeleton height={10} width="35%" />
                </div>
              ))
            ) : inbox.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
                <MessageSquare size={28} style={{ opacity: 0.3, display: "block", margin: "0 auto 8px" }} />
                No messages yet
              </div>
            ) : (
              inbox.map(m => {
                const isUnread = m.to?._id === currentUser?.id && !m.isReadByRecipient;
                const isActive = selected?._id === m._id;
                const preview  = m.body?.slice(0, 60) + (m.body?.length > 60 ? "…" : "");
                const other    = m.from?._id === currentUser?.id ? m.to : m.from;

                return (
                  <div
                    key={m._id}
                    onClick={() => openThread(m)}
                    style={{
                      padding: "10px 12px", cursor: "pointer",
                      borderRadius: 8, marginBottom: 2,
                      background: isActive
                        ? "var(--blue-pale)"
                        : isUnread
                          ? "rgba(30,63,242,0.04)"
                          : "transparent",
                      border: `1px solid ${isActive ? "rgba(30,63,242,0.2)" : "transparent"}`,
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--canvas)"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isUnread ? "rgba(30,63,242,0.04)" : "transparent"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                          background: ROLE_COLOR[other?.role] || "var(--blue)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 700, color: "#fff",
                        }}>
                          {initials(other?.name)}
                        </div>
                        <span style={{
                          fontSize: 12, fontWeight: isUnread ? 700 : 500,
                          color: "var(--text)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {other?.name || "Unknown"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 6 }}>
                        {isUnread && (
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--blue)" }} />
                        )}
                        {m.replyCount > 0 && (
                          <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "'JetBrains Mono',monospace" }}>
                            +{m.replyCount}
                          </span>
                        )}
                      </div>
                    </div>
                    {m.subject && (
                      <div style={{ fontSize: 12, fontWeight: isUnread ? 600 : 500, color: "var(--text)", marginBottom: 2 }}>
                        {m.subject}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "var(--text-2)" }}>{preview}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                      {timeAgo(m.createdAt)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "center", gap: 6 }}>
              <button className="page-btn" disabled={page === 1} onClick={() => fetchInbox(page - 1)}>←</button>
              <span style={{ fontSize: 11, color: "var(--text-3)", alignSelf: "center" }}>{page}/{totalPages}</span>
              <button className="page-btn" disabled={page === totalPages} onClick={() => fetchInbox(page + 1)}>→</button>
            </div>
          )}
        </div>

        {/* ── Thread view ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!selected ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: 12, color: "var(--text-3)" }}>
              <MessageSquare size={36} style={{ opacity: 0.25 }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-2)" }}>
                Select a conversation
              </div>
              <div style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, color: "#15803D" }}>
                <Lock size={10} /> Messages stay within your school
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 3 }}>
                  {selected.subject || "Conversation"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--text-2)" }}>
                  <span>{selected.from?.name} → {selected.to?.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px",
                    background: "#DCFCE7", borderRadius: 100, color: "#15803D", fontSize: 10, fontWeight: 600 }}>
                    <Lock size={9} /> School-only
                  </div>
                  {(thread?.replies?.length > 0) && (
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                      {thread.replies.length} repl{thread.replies.length === 1 ? "y" : "ies"}
                    </span>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px",
                display: "flex", flexDirection: "column", gap: 16 }}>
                {loadingThread ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} style={{ maxWidth: 400, alignSelf: i % 2 ? "flex-end" : "flex-start" }}>
                        <Skeleton height={70} width={300} radius={12} />
                      </div>
                    ))}
                  </div>
                ) : thread ? (
                  <>
                    {/* Root message */}
                    <Bubble
                      msg={thread.message}
                      isMe={thread.message.from?._id === currentUser?.id}
                    />
                    {/* Replies */}
                    {(thread.replies || []).map(r => (
                      <Bubble key={r._id} msg={r} isMe={r.from?._id === currentUser?.id} />
                    ))}
                  </>
                ) : null}
                <div ref={threadEndRef} />
              </div>

              {/* Reply box */}
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)",
                background: "var(--card)", display: "flex", gap: 10, alignItems: "center" }}>
                <Lock size={13} style={{ color: "#15803D", flexShrink: 0 }} />
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="Write a reply…"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                  disabled={sending}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleReply}
                  disabled={!reply.trim() || sending}
                >
                  {sending
                    ? <RefreshCw size={13} style={{ animation: "spin 0.7s linear infinite" }} />
                    : <Send size={13} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compose modal */}
      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onSent={() => { setShowCompose(false); fetchInbox(1); }}
        />
      )}
    </>
  );
}