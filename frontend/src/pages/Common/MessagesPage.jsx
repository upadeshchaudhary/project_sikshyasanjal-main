// MessagesPage.jsx - Clean WhatsApp-like messaging system with integrated search.
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Topbar from "../../components/Topbar";
import { useApp } from "../../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Plus, X, Send, MessageSquare,
  ShieldCheck, Lock, RefreshCw,
  CheckCheck, Search, Trash2, MoreVertical
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function Skeleton({ height = 16, width = "100%", radius = 6 }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} />;
}

function formatMessageTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatChatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    
    return d.toLocaleDateString("en-NP", { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(name = "") {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

const ROLE_COLOR = {
  admin:   "var(--blue)",
  teacher: "var(--teal)",
  parent:  "var(--purple)",
};

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

// ── Avatar Component ──────────────────────────────────────────────────────────
function Avatar({ user, size = 40 }) {
    if (!user) return <div className="avatar" style={{ width: size, height: size }}><MessageSquare size={size * 0.5} /></div>;
    const role = user.role || "admin";
    return (
        <div 
            className="avatar" 
            style={{ 
                width: size, 
                height: size, 
                fontSize: size * 0.35,
                background: user.avatar ? `url(${user.avatar}) center/cover no-repeat` : ROLE_COLOR[role] || "var(--blue)",
                borderRadius: 8
            }}
        >
            {!user.avatar && initials(user.name)}
        </div>
    );
}

// ── Compose modal ─────────────────────────────────────────────────────────────
function ComposeModal({ onClose, onSent }) {
  const [contacts, setContacts] = useState([]);
  const [form,     setForm]     = useState({ to: "" });
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    axios.get("/messages/contacts")
      .then(res => setContacts(res.data.contacts || []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, []);

  const ROLE_LABELS = { admin: "Admin", teacher: "Teacher", parent: "Parent" };

  const handleStart = () => {
    if (!form.to) {
        setErrors({ to: "Select a recipient." });
        return;
    }
    const contact = contacts.find(c => c._id === form.to);
    onSent(contact);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">New Conversation</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#15803D", marginTop: 2 }}>
              <ShieldCheck size={10} /> Secure messaging
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {loading ? <Skeleton height={40} /> : (
            <Field label="Recipient *" error={errors.to}>
                <select
                className={`form-select ${errors.to ? "error" : ""}`}
                value={form.to}
                onChange={e => { setForm({ to: e.target.value }); setErrors({}); }}
                >
                <option value="">Select someone…</option>
                {contacts.map(c => (
                    <option key={c._id} value={c._id}>
                    {c.name} ({ROLE_LABELS[c.role] || c.role})
                    </option>
                ))}
                </select>
            </Field>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleStart} disabled={loading || !form.to}>
            Start Chat
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bubble Component ──────────────────────────────────────────────────────────
function Bubble({ msg, isMe, onOpenOptions }) {
  return (
    <div 
        style={{
            maxWidth: "75%", alignSelf: isMe ? "flex-end" : "flex-start",
            display: "flex", gap: 8,
            flexDirection: isMe ? "row-reverse" : "row",
            alignItems: "flex-end",
            position: "relative"
        }}
        onContextMenu={(e) => { e.preventDefault(); onOpenOptions(msg, e); }}
    >
      <Avatar user={msg.from} size={28} />
      <div style={{
        background:   msg.deletedForEveryone ? "transparent" : (isMe ? "var(--blue)" : "var(--card)"),
        border:       isMe && !msg.deletedForEveryone ? "none" : "1px solid var(--border)",
        borderRadius: isMe ? "12px 0 12px 12px" : "0 12px 12px 12px",
        padding: "8px 12px", 
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
      }}>
        {msg.deletedForEveryone ? (
            <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--text-3)", display: "flex", alignItems: "center", gap: 4 }}>
                <Trash2 size={12} /> This message was deleted
            </div>
        ) : (
            <>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4,
                color: isMe ? "rgba(255,255,255,0.7)" : "var(--text-2)" }}>
                    {msg.from?.name || "Unknown"}
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.5,
                color: isMe ? "#fff" : "var(--text)",
                margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {msg.body}
                </p>
                <div style={{ fontSize: 10, marginTop: 4,
                color: isMe ? "rgba(255,255,255,0.5)" : "var(--text-3)",
                fontFamily: "'JetBrains Mono',monospace", textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                    {formatMessageTime(msg.createdAt)}
                    {isMe && (
                        <CheckCheck size={12} style={{ color: msg.isReadByRecipient ? "#93C5FD" : "rgba(255,255,255,0.5)" }} />
                    )}
                </div>
            </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
export default function MessagesPage() {
  const { currentUser } = useApp();

  const [conversations, setConversations] = useState([]);
  const [contacts,      setContacts]      = useState([]);
  const [messages,      setMessages]      = useState([]);
  const [selectedUser,  setSelectedUser]  = useState(null); 
  
  const [loadingConv,   setLoadingConv]   = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending,       setSending]       = useState(false);
  const [showCompose,   setShowCompose]   = useState(false);
  
  const [searchQuery,   setSearchQuery]   = useState("");
  const [reply,         setReply]         = useState("");
  const [showOptions,   setShowOptions]   = useState(null); 
  const [showChatMenu,  setShowChatMenu]  = useState(false);

  const threadEndRef = useRef(null);
  const optionsRef = useRef(null);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    setLoadingConv(true);
    try {
      const res = await axios.get("/messages/conversations");
      setConversations(res.data.conversations || []);
    } catch {
      toast.error("Failed to load conversations.");
    } finally {
      setLoadingConv(false);
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await axios.get("/messages/contacts");
      setContacts(res.data.contacts || []);
    } catch {
      // Quiet fail
    }
  }, []);

  useEffect(() => { 
    fetchConversations(); 
    fetchContacts();
  }, [fetchConversations, fetchContacts]);

  const openChat = async (user) => {
    const targetId = user.userId || user._id;
    if (!targetId) return;

    setSelectedUser(user);
    setLoadingThread(true);
    setMessages([]);
    setShowChatMenu(false);
    setShowCompose(false);
    setSearchQuery(""); // Clear search when opening chat
    
    try {
      const res = await axios.get(`/messages/conversation/${targetId}`);
      setMessages(res.data.messages || []);
      
      // Update sidebar
      setConversations(prev => prev.map(c => 
        (c.userId === targetId) ? { ...c, unread: 0 } : c
      ));
    } catch {
      toast.error("Failed to load chat.");
    } finally {
      setLoadingThread(false);
    }
  };

  const handleSend = async () => {
    if (!reply.trim() || !selectedUser) return;
    const targetId = selectedUser.userId || selectedUser._id;

    setSending(true);
    try {
      const res = await axios.post("/messages", { to: targetId, body: reply.trim() });
      setMessages(prev => [...prev, res.data.message]);
      setReply("");
      fetchConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (msgId, forEveryone) => {
    try {
      await axios.delete(`/messages/${msgId}`, { data: { forEveryone } });
      setMessages(prev => prev.map(m => {
        if (m._id === msgId) {
            if (forEveryone) return { ...m, deletedForEveryone: true };
            return null;
        }
        return m;
      }).filter(Boolean));
      setShowOptions(null);
      toast.success("Message deleted.");
    } catch {
      toast.error("Failed to delete message.");
    }
  };

  const deleteChat = async () => {
    if (!selectedUser) return;
    const targetId = selectedUser.userId || selectedUser._id;
    if (!window.confirm("Delete this entire conversation?")) return;

    try {
      await axios.delete(`/messages/chat/${targetId}`);
      setConversations(prev => prev.filter(c => c.userId !== targetId));
      setSelectedUser(null);
      setMessages([]);
      toast.success("Chat deleted.");
    } catch {
      toast.error("Failed to delete chat.");
    }
  };

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpenOptions = (msg, e) => {
    if (msg.deletedForEveryone) return;
    setShowOptions({
        id: msg._id,
        x: e.clientX,
        y: e.clientY,
        isMe: msg.from._id === currentUser?.id
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
        if (optionsRef.current && !optionsRef.current.contains(event.target)) {
            setShowOptions(null);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const groupedMessages = useMemo(() => {
    const groups = [];
    messages.forEach(m => {
        const date = formatChatDate(m.createdAt);
        if (groups.length === 0 || groups[groups.length - 1].date !== date) {
            groups.push({ date, msgs: [m] });
        } else {
            groups[groups.length - 1].msgs.push(m);
        }
    });
    return groups;
  }, [messages]);

  // Integrated search logic
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return conversations.map(c => ({ ...c, type: 'conversation' }));

    // Filter conversations
    const convMatches = conversations
        .filter(c => c.name.toLowerCase().includes(q))
        .map(c => ({ ...c, type: 'conversation' }));

    // Filter contacts that are NOT already in conversations
    const convUserIds = new Set(conversations.map(c => c.userId));
    const contactMatches = contacts
        .filter(c => c.name.toLowerCase().includes(q) && !convUserIds.has(c._id))
        .map(c => ({ 
            userId: c._id, 
            name: c.name, 
            role: c.role, 
            avatar: c.avatar, 
            type: 'contact',
            lastMessage: `Start chat with ${c.role}`
        }));

    return [...convMatches, ...contactMatches];
  }, [conversations, contacts, searchQuery]);

  return (
    <>
      <Topbar title="Messaging" />
      <div className="page-content" style={{
        padding: 0, display: "flex",
        overflow: "hidden", height: "calc(100vh - 60px)",
      }}>

        {/* ── Sidebar ── */}
        <div style={{
          width: 300, flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          overflow: "hidden", background: "var(--card)",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 14 }}>
                Inbox
                {conversations.reduce((acc, c) => acc + (c.unread || 0), 0) > 0 && (
                  <span style={{
                    background: "var(--red)", color: "#fff",
                    fontSize: 10, fontWeight: 700, borderRadius: 100,
                    padding: "1px 6px",
                  }}>
                    {conversations.reduce((acc, c) => acc + (c.unread || 0), 0)}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--green)", marginTop: 2 }}>
                <ShieldCheck size={10} /> Secure Messaging
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCompose(true)}>
              <Plus size={13} /> Compose
            </button>
          </div>

          {/* Integrated Search Bar */}
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
            <div className="search-box" style={{ maxWidth: "100%", padding: "6px 10px" }}>
                <Search size={14} />
                <input 
                    placeholder="Search people or chats…" 
                    style={{ fontSize: 12 }}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>
          </div>

          {/* Unified List */}
          <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
            {loadingConv ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} style={{ padding: "12px", borderBottom: "1px solid var(--border)", opacity: 0.5 }}>
                  <Skeleton height={14} width="50%" style={{ marginBottom: 8 }} />
                  <Skeleton height={12} width="80%" />
                </div>
              ))
            ) : filteredItems.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
                <MessageSquare size={32} style={{ opacity: 0.2, marginBottom: 8, display: "block", margin: "0 auto" }} />
                {searchQuery ? "No results found" : "No chats yet"}
              </div>
            ) : (
              filteredItems.map(item => {
                const isActive = selectedUser && (selectedUser.userId || selectedUser._id) === item.userId;
                return (
                  <div
                    key={item.userId}
                    onClick={() => openChat(item)}
                    style={{
                      padding: "10px 12px", cursor: "pointer",
                      borderRadius: 8, marginBottom: 2,
                      background: isActive
                        ? "var(--blue-pale)"
                        : (item.unread > 0)
                          ? "rgba(30,63,242,0.04)"
                          : "transparent",
                      border: `1px solid ${isActive ? "rgba(30,63,242,0.2)" : "transparent"}`,
                      transition: "background 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <Avatar user={item} size={28} />
                        <span style={{
                          fontSize: 12, fontWeight: item.unread > 0 ? 700 : 600,
                          color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {item.name}
                        </span>
                      </div>
                      {item.unread > 0 && (
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue)" }} />
                      )}
                      {item.type === 'contact' && (
                        <div style={{ fontSize: 9, background: "var(--blue-pale)", color: "var(--blue)", padding: "1px 4px", borderRadius: 4 }}>NEW</div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.lastMessage}
                    </div>
                    {item.timestamp && (
                        <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                        {formatChatDate(item.timestamp)}
                        </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Chat View ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--canvas)" }}>
          {!selectedUser ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: 16, color: "var(--text-3)" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow)" }}>
                <MessageSquare size={32} color="var(--blue)" />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Select a chat</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Find people and start messaging instantly.</div>
              </div>
              <div style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6, color: "var(--green)", fontWeight: 600 }}>
                <Lock size={12} /> School network encryption active
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--card)", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar user={selectedUser} size={36} />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{selectedUser.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "capitalize", display: "flex", alignItems: "center", gap: 4 }}>
                            {selectedUser.role} 
                            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--text-3)" }} />
                            <Lock size={10} /> Secure
                        </div>
                    </div>
                </div>
                <div style={{ position: "relative" }}>
                    <button className="icon-btn" style={{ border: "none", background: "transparent" }} onClick={() => setShowChatMenu(!showChatMenu)}>
                        <MoreVertical size={20} />
                    </button>
                    {showChatMenu && (
                        <div style={{ position: "absolute", top: "100%", right: 0, background: "var(--card)", boxShadow: "var(--shadow-lg)", borderRadius: 12, padding: 6, zIndex: 100, minWidth: 160, border: "1px solid var(--border)" }}>
                            <button className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "flex-start", padding: "8px 12px", color: "var(--red)" }} onClick={deleteChat}>
                                <Trash2 size={14} style={{ marginRight: 8 }} /> Delete Conversation
                            </button>
                        </div>
                    )}
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
                {loadingThread ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {Array(4).fill(0).map((_, i) => (
                      <div key={i} style={{ maxWidth: "60%", alignSelf: i % 2 ? "flex-end" : "flex-start" }}>
                        <Skeleton height={60} width={240} radius={12} />
                      </div>
                    ))}
                  </div>
                ) : groupedMessages.map(group => (
                    <div key={group.date} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ alignSelf: "center", background: "rgba(0,0,0,0.05)", padding: "4px 12px", borderRadius: 100, fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                            {group.date}
                        </div>
                        {group.msgs.map(m => (
                            <Bubble 
                                key={m._id} 
                                msg={m} 
                                isMe={m.from._id === currentUser?.id} 
                                onOpenOptions={handleOpenOptions}
                            />
                        ))}
                    </div>
                ))}

                {/* Context Menu */}
                {showOptions && (
                    <div 
                        ref={optionsRef}
                        style={{
                            position: "fixed", top: showOptions.y, left: showOptions.x,
                            background: "var(--card)", boxShadow: "var(--shadow-lg)", borderRadius: 12, padding: 6, zIndex: 200, minWidth: 160, border: "1px solid var(--border)"
                        }}
                    >
                        <button className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "flex-start", padding: "8px 12px" }} onClick={() => deleteMessage(showOptions.id, false)}>
                            <Trash2 size={14} style={{ marginRight: 8 }} /> Delete for me
                        </button>
                        {showOptions.isMe && (
                            <button className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "flex-start", padding: "8px 12px", color: "var(--red)" }} onClick={() => deleteMessage(showOptions.id, true)}>
                                <Trash2 size={14} style={{ marginRight: 8 }} /> Delete for everyone
                            </button>
                        )}
                        <div style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 4 }}>
                            <button className="btn btn-ghost btn-sm" style={{ width: "100%" }} onClick={() => setShowOptions(null)}>Cancel</button>
                        </div>
                    </div>
                )}
                <div ref={threadEndRef} />
              </div>

              {/* Input Bar */}
              <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", background: "var(--card)" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <input
                        className="form-input"
                        style={{ flex: 1, borderRadius: 24, padding: "10px 20px" }}
                        placeholder="Write a message…"
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        disabled={sending}
                    />
                    <button
                        className="btn btn-primary"
                        style={{ width: 42, height: 42, padding: 0, borderRadius: "50%", minWidth: 42, display: "flex", alignItems: "center", justifyContent: "center" }}
                        onClick={handleSend}
                        disabled={!reply.trim() || sending}
                    >
                        {sending
                            ? <RefreshCw size={18} style={{ animation: "spin 0.7s linear infinite" }} />
                            : <Send size={18} />}
                    </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onSent={openChat}
        />
      )}
    </>
  );
}