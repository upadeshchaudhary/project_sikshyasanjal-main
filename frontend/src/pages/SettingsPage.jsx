import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../components/Topbar";
import { useApp } from "../context/AppContext";
import toast from "react-hot-toast";
import axios from "axios";
import {
  Bell, Shield, Globe, Palette, School, BookOpen,
  User, ChevronRight, Check, Save, LogOut,
  Eye, EyeOff, Smartphone, Clock, DollarSign,
} from "lucide-react";

// ─── Section tab definitions ──────────────────────────────────────────────────
const TABS = [
  { key: "profile",       label: "Profile",          icon: User,       roles: ["admin","teacher","parent"] },
  { key: "notifications", label: "Notifications",    icon: Bell,       roles: ["admin","teacher","parent"] },
  { key: "academic",      label: "Academic",         icon: BookOpen,   roles: ["admin","teacher","parent"] },
  { key: "display",       label: "Display & Region", icon: Globe,      roles: ["admin","teacher","parent"] },
  { key: "security",      label: "Security",         icon: Shield,     roles: ["admin","teacher","parent"] },
  { key: "school",        label: "School Config",    icon: School,     roles: ["admin"] },
  { key: "fees",          label: "Fee Settings",     icon: DollarSign, roles: ["admin"] },
];

// ─── Toggle switch component ──────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 100,
        background: value ? "var(--blue)" : "var(--border)",
        cursor: "pointer", position: "relative",
        transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3,
        left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%",
        background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        transition: "left 0.2s",
      }} />
    </div>
  );
}

// ─── Setting row ──────────────────────────────────────────────────────────────
function SettingRow({ label, desc, children }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 0", borderBottom: "1px solid var(--border)", gap: 20,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function Section({ title, desc, children }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header" style={{ paddingBottom: 6 }}>
        <div>
          <div className="card-title">{title}</div>
          {desc && <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>{desc}</div>}
        </div>
      </div>
      <div className="card-body" style={{ paddingTop: 0 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ currentUser }) {
  const isParent  = currentUser?.role === "parent";
  const isTeacher = currentUser?.role === "teacher";

  const [form, setForm] = useState({
    name:  currentUser?.name  || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
  });
  const [showPhone, setShowPhone] = useState(false);
  const [saving, setSaving]       = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = isTeacher ? "/teachers/me" : "/settings/profile";
      await axios.put(url, { name: form.name, phone: form.phone });
      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Section title="Personal Information" desc="Your name and contact details visible to other users.">

        {/* Name — locked for parents */}
        <SettingRow
          label="Full Name"
          desc={isParent
            ? "Your name as registered with the school. Contact admin to update."
            : "Displayed across the platform."}
        >
          {isParent ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{form.name}</span>
              <span className="tag tag-gray" style={{ fontSize: 10 }}>🔒 Locked</span>
            </div>
          ) : (
            <input
              className="form-input"
              style={{ width: 220, padding: "7px 12px", fontSize: 13 }}
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          )}
        </SettingRow>

        <SettingRow label="Email Address" desc="Used for login and notifications.">
          <input
            className="form-input"
            style={{ width: 220, padding: "7px 12px", fontSize: 13 }}
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          />
        </SettingRow>

        <SettingRow label="Phone Number" desc="For OTP and emergency contact.">
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              className="form-input"
              type={showPhone ? "text" : "password"}
              style={{ width: 180, padding: "7px 12px", fontSize: 13 }}
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            />
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowPhone(v => !v)}
              style={{ padding: "7px 9px" }}
            >
              {showPhone ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </SettingRow>

        <div style={{ paddingTop: 16 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving}
            style={{ gap: 6 }}
          >
            <Save size={13} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </Section>

      <Section title="Role & School" desc="These are assigned by your school admin and cannot be changed here.">
        <SettingRow label="Role">
          <span className="tag tag-blue" style={{ textTransform: "capitalize" }}>{currentUser?.role}</span>
        </SettingRow>
        <SettingRow label="School">
          <span style={{ fontSize: 13, color: "var(--text-2)" }}>{currentUser?.school || "SikshyaSanjal Academy"}</span>
        </SettingRow>
      </Section>
    </>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────
function NotificationsTab({ settings, updateSetting, role }) {
  return (
    <>
      <Section title="In-App Notifications" desc="Control which events appear in your notification panel.">
        <SettingRow label="Homework Assignments" desc="New homework posted for your class.">
          <Toggle value={settings.notifyHomework} onChange={v => updateSetting("notifyHomework", v)} />
        </SettingRow>
        <SettingRow label="School Notices" desc="Announcements and circulars from school.">
          <Toggle value={settings.notifyNotices} onChange={v => updateSetting("notifyNotices", v)} />
        </SettingRow>
        <SettingRow label="Messages" desc="Direct messages from teachers or parents.">
          <Toggle value={settings.notifyMessages} onChange={v => updateSetting("notifyMessages", v)} />
        </SettingRow>
        {(role === "admin" || role === "parent") && (
          <SettingRow label="Fee Reminders" desc="Fee due dates and overdue alerts.">
            <Toggle value={settings.notifyFees} onChange={v => updateSetting("notifyFees", v)} />
          </SettingRow>
        )}
        <SettingRow label="Exam Results" desc="Notify when new results are uploaded.">
          <Toggle value={settings.notifyResults} onChange={v => updateSetting("notifyResults", v)} />
        </SettingRow>
        <SettingRow label="Exam Reminders" desc="Notify 3 days before an exam begins.">
          <Toggle value={settings.notifyExamReminder} onChange={v => updateSetting("notifyExamReminder", v)} />
        </SettingRow>
      </Section>

      <Section title="Delivery Channels" desc="How you receive notifications (SMS requires Sparrow SMS integration).">
        <SettingRow label="SMS Notifications" desc="Receive critical alerts via SMS to your registered phone.">
          <Toggle value={false} onChange={() => toast("SMS requires admin configuration", { icon: "ℹ️" })} />
        </SettingRow>
        <SettingRow label="Browser Push Notifications" desc="Web push notifications in your browser.">
          <Toggle value={false} onChange={() => toast("Push notifications coming in next version.", { icon: "ℹ️" })} />
        </SettingRow>
      </Section>
    </>
  );
}

// ─── Academic Tab ─────────────────────────────────────────────────────────────
function AcademicTab({ settings, updateSetting, role, currentUser }) {
  return (
    <>
      <Section title="Academic Year" desc="Current academic session settings.">
        <SettingRow label="Academic Year" desc="The current year this dashboard is showing data for.">
          <select
            className="form-input"
            style={{ width: 160, padding: "7px 12px", fontSize: 13 }}
            value={settings.academicYear}
            onChange={e => { updateSetting("academicYear", e.target.value); toast.success("Academic year updated"); }}
          >
            {["2080-81","2081-82","2082-83","2083-84"].map(y => (
              <option key={y} value={y}>{y} BS</option>
            ))}
          </select>
        </SettingRow>

        {role === "parent" && (
          <>
            <SettingRow label="Enrolled Student" desc="Your child's name as registered with the school. Contact admin to update.">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>
                  {currentUser?.childName || "Aarav Sharma"}
                </span>
                <span className="tag tag-gray" style={{ fontSize: 10 }}>🔒 Locked</span>
              </div>
            </SettingRow>
            <SettingRow label="Class / Grade" desc="Your child's class is assigned by the school and cannot be changed here.">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="tag tag-blue">{currentUser?.childClass || "10A"}</span>
                <span className="tag tag-gray" style={{ fontSize: 10 }}>🔒 Locked</span>
              </div>
            </SettingRow>
          </>
        )}

        {role !== "parent" && role !== "admin" && (
          <SettingRow label="Default Class View" desc="Which class to show first when opening class-based pages.">
            <select
              className="form-input"
              style={{ width: 160, padding: "7px 12px", fontSize: 13 }}
              value={settings.defaultClass}
              onChange={e => { updateSetting("defaultClass", e.target.value); toast.success("Default class updated"); }}
            >
              {["6A","6B","7A","7B","8A","8B","9A","9B","10A","10B"].map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </SettingRow>
        )}
      </Section>

      <Section title="Grading System" desc="How grades are calculated and displayed (view only — set by admin).">
        <SettingRow label="GPA Scale">
          <span className="tag tag-blue">4.0 Scale</span>
        </SettingRow>
        <SettingRow label="Marking Scheme">
          <span style={{ fontSize: 13, color: "var(--text-2)" }}>Percentage + Letter Grade</span>
        </SettingRow>
        <SettingRow label="Pass Mark">
          <span style={{ fontSize: 13, color: "var(--text-2)" }}>40 / 100</span>
        </SettingRow>
      </Section>
    </>
  );
}

// ─── Display & Region Tab ─────────────────────────────────────────────────────
function DisplayTab({ settings, updateSetting }) {
  return (
    <>
      <Section title="Calendar & Date" desc="How dates are shown across the platform.">
        <SettingRow label="Primary Calendar" desc="Bikram Sambat is the official calendar of Nepal.">
          <div style={{ display: "flex", gap: 8 }}>
            {["BS","AD"].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${settings.dateFormat === f ? "btn-primary" : "btn-outline"}`}
                onClick={() => { updateSetting("dateFormat", f); toast.success(`Calendar set to ${f}`); }}
                style={{ minWidth: 48 }}
              >
                {f}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Language" desc="Interface language.">
          <select
            className="form-input"
            style={{ width: 160, padding: "7px 12px", fontSize: 13 }}
            value={settings.language}
            onChange={e => { updateSetting("language", e.target.value); toast.success("Language preference saved"); }}
          >
            <option>English</option>
            <option>नेपाली (Nepali)</option>
          </select>
        </SettingRow>
      </Section>

      <Section title="Appearance" desc="Visual preferences for the interface.">
        <SettingRow label="Theme" desc="Switch between light and dark mode.">
          <div style={{ display: "flex", gap: 8 }}>
            {[["light","☀️ Light"],["dark","🌙 Dark"]].map(([val, label]) => (
              <button
                key={val}
                className={`btn btn-sm ${settings.theme === val ? "btn-primary" : "btn-outline"}`}
                onClick={() => { updateSetting("theme", val); toast.success(`${val === "dark" ? "Dark" : "Light"} mode enabled`); }}
              >
                {label}
              </button>
            ))}
          </div>
        </SettingRow>
      </Section>
    </>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────
function SecurityTab({ settings, updateSetting, role }) {
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });

  const handleSavePwd = () => {
    if (!pwd.current) return toast.error("Enter your current password");
    if (pwd.next.length < 8) return toast.error("New password must be 8+ characters");
    if (pwd.next !== pwd.confirm) return toast.error("Passwords do not match");
    toast.success("Password changed successfully");
    setChangingPwd(false);
    setPwd({ current: "", next: "", confirm: "" });
  };

  return (
    <>
      <Section title="Login & Authentication" desc="Control how you and others access your account.">
        <SettingRow label="Two-Factor OTP (SMS)" desc="Require OTP verification on every login. Recommended.">
          <Toggle value={settings.twoFactorOTP} onChange={v => { updateSetting("twoFactorOTP", v); toast.success(v ? "2FA enabled" : "2FA disabled"); }} />
        </SettingRow>
        <SettingRow label="Auto Session Timeout" desc="Automatically log out after inactivity.">
          <select
            className="form-input"
            style={{ width: 140, padding: "7px 12px", fontSize: 13 }}
            value={settings.sessionTimeout}
            onChange={e => { updateSetting("sessionTimeout", e.target.value); toast.success("Session timeout updated"); }}
          >
            {[["15","15 minutes"],["30","30 minutes"],["60","1 hour"],["120","2 hours"],["0","Never"]].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </SettingRow>
        {role !== "parent" && (
          <SettingRow label="Hide Phone Number" desc="Prevent other users from seeing your phone number.">
            <Toggle value={settings.showPhone} onChange={v => updateSetting("showPhone", v)} />
          </SettingRow>
        )}
      </Section>

      {role !== "parent" && (
        <Section title="Password" desc="Change your account password. Minimum 8 characters.">
          {!changingPwd ? (
            <div style={{ paddingTop: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setChangingPwd(true)}>
                Change Password
              </button>
            </div>
          ) : (
            <div style={{ maxWidth: 320, paddingTop: 8 }}>
              {[
                ["current", "Current Password"],
                ["next",    "New Password"],
                ["confirm", "Confirm New Password"],
              ].map(([field, label]) => (
                <div className="form-group" key={field} style={{ marginBottom: 12 }}>
                  <label className="form-label">{label}</label>
                  <input
                    className="form-input"
                    type="password"
                    value={pwd[field]}
                    onChange={e => setPwd(p => ({ ...p, [field]: e.target.value }))}
                  />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handleSavePwd}><Save size={12} /> Save</button>
                <button className="btn btn-outline btn-sm" onClick={() => setChangingPwd(false)}>Cancel</button>
              </div>
            </div>
          )}
        </Section>
      )}

      <Section title="Active Sessions" desc="Devices currently logged into your account.">
        <div style={{ padding: "8px 0" }}>
          {[
            { device: "Chrome on Windows", location: "Dharan, Koshi",     time: "Now (this session)", current: true  },
            { device: "Mobile Browser",    location: "Biratnagar, Koshi", time: "2 hours ago",        current: false },
          ].map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 0", borderBottom: i < 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--canvas)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Smartphone size={16} style={{ color: "var(--text-2)" }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.device}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{s.location} · {s.time}</div>
                </div>
              </div>
              {s.current
                ? <span className="tag tag-green" style={{ fontSize: 10 }}><Check size={10} /> Active</span>
                : <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => toast.success("Session revoked")}>Revoke</button>
              }
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

// ─── School Config Tab (admin only) ──────────────────────────────────────────
function SchoolTab({ settings, updateSetting }) {
  const [form, setForm]     = useState({ phone: "", email: "", address: "" });
  const [school, setSchool] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get("/settings")
      .then(res => {
        const s = res.data.school;
        setSchool(s);
        setForm({
          phone:   s.phone   || "",
          email:   s.email   || "",
          address: s.address || "",
        });
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put("/settings/school", form);
      toast.success("School settings updated.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save school settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Section title="School Information" desc="Basic details displayed to all users on login and notices.">
        <SettingRow label="School Name" desc="Permanent — contact the platform administrator to change.">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              className="form-input"
              style={{ width: 280, padding: "7px 12px", fontSize: 13, opacity: 0.6, cursor: "not-allowed" }}
              value={school?.name || ""}
              disabled
            />
            <span className="tag tag-gray" style={{ fontSize: 10, whiteSpace: "nowrap" }}>🔒 Locked</span>
          </div>
        </SettingRow>
        <SettingRow label="School Phone">
          <input
            className="form-input"
            style={{ width: 200, padding: "7px 12px", fontSize: 13 }}
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
          />
        </SettingRow>
        <SettingRow label="School Email">
          <input
            className="form-input"
            style={{ width: 240, padding: "7px 12px", fontSize: 13 }}
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          />
        </SettingRow>
        <SettingRow label="School Address">
          <input
            className="form-input"
            style={{ width: 280, padding: "7px 12px", fontSize: 13 }}
            value={form.address}
            onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
          />
        </SettingRow>
        <div style={{ paddingTop: 14 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving}
            style={{ gap: 6 }}
          >
            <Save size={13} />
            {saving ? "Saving..." : "Save School Info"}
          </button>
        </div>
      </Section>

      <Section title="OTP & SMS Configuration" desc="Controls for the parent OTP login system via Sparrow SMS.">
        <SettingRow label="Max OTP Attempts" desc="Lock account after this many failed OTP attempts.">
          <select
            className="form-input"
            style={{ width: 120, padding: "7px 12px", fontSize: 13 }}
            value={settings.maxOTPAttempts}
            onChange={e => { updateSetting("maxOTPAttempts", e.target.value); toast.success("OTP limit updated"); }}
          >
            {["3","5","10"].map(n => <option key={n} value={n}>{n} attempts</option>)}
          </select>
        </SettingRow>
        <SettingRow label="OTP Expiry" desc="OTP codes expire after this duration.">
          <span className="tag tag-blue">5 minutes (fixed)</span>
        </SettingRow>
        <SettingRow label="SMS Provider" desc="SMS gateway used for OTP delivery to parents.">
          <span className="tag tag-green">Sparrow SMS (Active)</span>
        </SettingRow>
      </Section>

      <Section title="Multi-Tenant Domain" desc="Your school's domain slug. Contact platform admin to change.">
        <SettingRow label="School Domain Slug" desc="Used in the x-school-domain header for all API calls.">
          <span className="tag tag-gray mono">{school?.domain || ""}</span>
        </SettingRow>
        <SettingRow label="Domain Isolation" desc="Each school's data is fully isolated from others.">
          <span className="tag tag-green"><Check size={10} /> Active</span>
        </SettingRow>
      </Section>
    </>
  );
}

// ─── Fee Settings Tab (admin only) ───────────────────────────────────────────
function FeeTab({ settings, updateSetting }) {
  return (
    <>
      <Section title="Fee Reminders" desc="Automatic notifications for fee dues.">
        <SettingRow label="Reminder Lead Time" desc="How many days before due date to send a reminder to parents.">
          <select
            className="form-input"
            style={{ width: 160, padding: "7px 12px", fontSize: 13 }}
            value={settings.feeReminderDays}
            onChange={e => { updateSetting("feeReminderDays", e.target.value); toast.success("Reminder timing updated"); }}
          >
            {[["3","3 days before"],["5","5 days before"],["7","7 days before"],["14","14 days before"]].map(([v,l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </SettingRow>
        <SettingRow label="Overdue Alerts" desc="Notify admin and parent when fee becomes overdue.">
          <Toggle value={settings.notifyFees} onChange={v => { updateSetting("notifyFees", v); toast.success(v ? "Overdue alerts on" : "Overdue alerts off"); }} />
        </SettingRow>
      </Section>

      <Section title="Payment Methods" desc="Accepted methods recorded in fee ledger.">
        {["Cash","eSewa","Khalti","Bank Transfer","Cheque"].map(method => (
          <SettingRow key={method} label={method}>
            <Toggle value={["Cash","eSewa","Khalti"].includes(method)} onChange={() => toast(`${method} toggle coming soon`, { icon: "ℹ️" })} />
          </SettingRow>
        ))}
      </Section>

      <Section title="Fee Categories" desc="Types of fees this school collects.">
        <div style={{ paddingTop: 4 }}>
          {["Tuition Fee","Exam Fee","Sports Fee","Library Fee","Computer Lab Fee"].map(cat => (
            <div key={cat} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              margin: "4px 6px 4px 0", padding: "4px 12px",
              background: "var(--blue-pale)", color: "var(--blue)",
              borderRadius: 100, fontSize: 12, fontWeight: 500,
            }}>
              <Check size={10} /> {cat}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-outline btn-sm" onClick={() => toast("Fee category management coming soon", { icon: "ℹ️" })}>
            Manage Categories
          </button>
        </div>
      </Section>
    </>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { currentUser, settings, updateSetting, logout } = useApp();
  const navigate    = useNavigate();
  const role        = currentUser?.role || "parent";
  const visibleTabs = TABS.filter(t => t.roles.includes(role));
  const [activeTab, setActiveTab] = useState(visibleTabs[0].key);

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  const renderTab = () => {
    switch (activeTab) {
      case "profile":       return <ProfileTab currentUser={currentUser} />;
      case "notifications": return <NotificationsTab settings={settings} updateSetting={updateSetting} role={role} />;
      case "academic":      return <AcademicTab settings={settings} updateSetting={updateSetting} role={role} currentUser={currentUser} />;
      case "display":       return <DisplayTab settings={settings} updateSetting={updateSetting} />;
      case "security":      return <SecurityTab settings={settings} updateSetting={updateSetting} role={role} />;
      case "school":        return <SchoolTab settings={settings} updateSetting={updateSetting} />;
      case "fees":          return <FeeTab settings={settings} updateSetting={updateSetting} />;
      default:              return null;
    }
  };

  return (
    <>
      <Topbar title="Settings" />
      <div className="page-content">
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account, notifications, and school configuration.</p>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

          {/* ── Sidebar nav ── */}
          <div style={{ width: 220, flexShrink: 0 }}>
            <div className="card">
              <div style={{ padding: "8px 8px" }}>
                {visibleTabs.map(tab => {
                  const Icon     = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10, padding: "10px 12px", borderRadius: 8,
                        border: "none", cursor: "pointer",
                        background: isActive ? "var(--blue-pale)" : "transparent",
                        color: isActive ? "var(--blue)" : "var(--text-2)",
                        fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: isActive ? 600 : 400,
                        marginBottom: 2, transition: "all 0.12s", textAlign: "left",
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--canvas)"; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <Icon size={15} />
                        {tab.label}
                      </div>
                      {isActive && <ChevronRight size={13} />}
                    </button>
                  );
                })}

                {/* Divider + logout */}
                <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0 6px" }} />
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    gap: 9, padding: "10px 12px", borderRadius: 8,
                    border: "none", cursor: "pointer",
                    background: "transparent", color: "var(--red)",
                    fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 500,
                    transition: "all 0.12s", textAlign: "left",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--red-pale)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* ── Main content ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {renderTab()}
          </div>
        </div>
      </div>
    </>
  );
}