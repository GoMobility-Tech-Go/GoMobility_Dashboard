import { useState, useEffect, useCallback } from "react";
import { Bell, Send, X, Clock, ToggleLeft, ToggleRight, Play, Edit2, Check, History, Zap, Calendar, Users, AlertCircle } from "lucide-react";
import {
  triggerEngagement,
  getNotificationSchedule,
  getCampaigns,
  toggleCampaign,
  updateCampaignMessage,
  runCampaignNow,
  getNotificationHistory,
} from "../../api/admin";

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ msg, type, onClose }) => (
  <div style={{
    position:"fixed", bottom:28, right:28, zIndex:9999,
    background: type==="error" ? "#7f1d1d" : "#14532d",
    border: `1px solid ${type==="error" ? "#ef4444" : "#22c55e"}`,
    borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13,
    fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12,
    boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:420,
  }}>
    <span style={{ flex:1 }}>{msg}</span>
    <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}>
      <X size={14}/>
    </button>
  </div>
);

// ── Audience options ──────────────────────────────────────────────────────────
const AUDIENCES = [
  { value:"all_users",             label:"All Users",                    icon:"👥", group:"Mixed",      desc:"All passengers + online drivers" },
  { value:"passengers",            label:"All Passengers",               icon:"🧑", group:"Passengers", desc:"Every registered passenger" },
  { value:"active_passengers",     label:"Active Passengers (7d)",       icon:"⚡", group:"Passengers", desc:"Rode in the last 7 days" },
  { value:"inactive_passenger_30d",label:"Inactive Passengers (30d+)",   icon:"💤", group:"Passengers", desc:"No ride in 30+ days" },
  { value:"new_user_no_ride",      label:"New Users — No Ride",          icon:"🆕", group:"Passengers", desc:"Joined 1–3 days ago, 0 rides" },
  { value:"all_drivers",           label:"All Drivers",                  icon:"🚗", group:"Drivers",    desc:"Every registered driver" },
  { value:"active_drivers",        label:"Online Drivers (now)",         icon:"🟢", group:"Drivers",    desc:"Currently online" },
  { value:"driver_offline_10d",    label:"Inactive Drivers (10d+)",      icon:"🔴", group:"Drivers",    desc:"Offline for 10+ days" },
  { value:"driver_no_docs",        label:"Drivers — No Docs",            icon:"📄", group:"Drivers",    desc:"0 documents uploaded" },
  { value:"driver_partial_kyc",    label:"Drivers — Partial KYC",        icon:"⏳", group:"Drivers",    desc:"KYC started but incomplete" },
];

const QUICK_TEMPLATES = [
  { title:"Special Offer! 🎉",      body:"Get 20% off on your next ride. Limited time only!",                   audience:"active_passengers" },
  { title:"Jai Hind! 🇮🇳",          body:"Happy Independence Day! Aaj sab rides pe ₹15 off.",                  audience:"all_users" },
  { title:"Driver Bonus Week 🏆",   body:"Complete 10+ rides this week and earn an extra ₹500 bonus!",         audience:"all_drivers" },
  { title:"Pehli ride baaki hai 👀", body:"Account ready hai! Pehli ride pe ₹30 off — code FIRST30",           audience:"new_user_no_ride" },
  { title:"Documents bharo! 📄",    body:"Sirf 5 min mein complete karo aur rides lena shuru karo!",           audience:"driver_no_docs" },
  { title:"Almost verified! 🏁",    body:"Thoda aur baaki hai. Baaki documents upload karo — almost done!",    audience:"driver_partial_kyc" },
];

const inputStyle = {
  width:"100%", height:44, background:"rgba(255,255,255,0.06)",
  border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px",
  color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", boxSizing:"border-box",
};

const LABEL_STYLE = {
  display:"block", fontSize:11, fontFamily:"Cinzel,serif",
  color:"rgba(212,175,55,0.7)", letterSpacing:"1px",
  textTransform:"uppercase", marginBottom:6,
};

const fmtTime = (iso) => iso
  ? new Date(iso).toLocaleString("en-IN",{ day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })
  : "—";

const fmtRelative = (iso) => {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const SCHEDULE_LABEL = { daily:"Daily · 9 AM", weekly:"Weekly · Mon 9 AM" };

// ── Phone Mockup Preview ──────────────────────────────────────────────────────
const PhonePreview = ({ title, body }) => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
    {/* Phone frame */}
    <div style={{
      width:220, background:"#0d1117", borderRadius:28, padding:"16px 10px",
      border:"2px solid rgba(255,255,255,0.1)", position:"relative",
      boxShadow:"0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
    }}>
      {/* Status bar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0 8px", marginBottom:10 }}>
        <span style={{ fontSize:9, color:"rgba(255,255,255,0.6)", fontFamily:"monospace" }}>9:41</span>
        <div style={{ width:40, height:6, borderRadius:3, background:"rgba(255,255,255,0.15)" }}/>
        <div style={{ display:"flex", gap:3 }}>
          {[1,2,3].map(i=><div key={i} style={{ width:3, height:i*3, borderRadius:1, background:"rgba(255,255,255,0.5)" }}/>)}
        </div>
      </div>

      {/* Notification card */}
      <div style={{
        background:"rgba(30,35,48,0.95)", borderRadius:16,
        padding:"11px 13px", border:"1px solid rgba(255,255,255,0.08)",
        backdropFilter:"blur(10px)",
      }}>
        {/* App header */}
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:7 }}>
          <div style={{
            width:20, height:20, borderRadius:5,
            background:"linear-gradient(135deg,#f0d060,#D4AF37)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:10,
          }}>🚗</div>
          <span style={{ fontSize:9, color:"rgba(255,255,255,0.5)", fontWeight:600, letterSpacing:"0.5px" }}>GO MOBILITY</span>
          <span style={{ fontSize:9, color:"rgba(255,255,255,0.25)", marginLeft:"auto" }}>now</span>
        </div>

        {/* Notification content */}
        <div style={{ fontSize:11, fontWeight:700, color: title ? "#fff" : "rgba(255,255,255,0.2)", marginBottom:4, lineHeight:1.3 }}>
          {title || "Notification title appears here"}
        </div>
        <div style={{ fontSize:10, color: body ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.15)", lineHeight:1.4 }}>
          {body ? (body.length > 80 ? body.slice(0,80) + "…" : body) : "Your message body will appear here in this space…"}
        </div>
      </div>

      {/* Home indicator */}
      <div style={{ width:60, height:4, borderRadius:2, background:"rgba(255,255,255,0.2)", margin:"14px auto 0" }}/>
    </div>

    <div style={{ marginTop:10, fontSize:10, color:"rgba(255,255,255,0.2)", textAlign:"center", letterSpacing:"0.5px" }}>
      LIVE PREVIEW
    </div>
  </div>
);

// ── Tab 1 — Send Now ─────────────────────────────────────────────────────────
function SendNowTab({ showToast }) {
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [audience, setAudience] = useState("all_users");
  const [sending, setSending]   = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [history, setHistory]   = useState([]);

  useEffect(() => {
    getNotificationSchedule()
      .then(r => { const d = r.data?.data || r.data || null; setSchedule(d); })
      .catch(() => {});
    try { setHistory(JSON.parse(sessionStorage.getItem("notif_sent_log") || "[]")); } catch {}
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { showToast("Title and message are required.", "error"); return; }
    const label = AUDIENCES.find(a => a.value === audience)?.label || audience;
    if (!window.confirm(`Send "${title}" to "${label}"?`)) return;
    setSending(true);
    try {
      const res = await triggerEngagement({ title, body, target_audience: audience });
      const d   = res.data?.data;
      const pSent = d?.passengers?.sent || 0;
      const dSent = d?.drivers?.sent    || 0;
      const entry = { title, body, audience, sentAt: new Date().toISOString(), sent: pSent + dSent };
      const updated = [entry, ...history].slice(0, 10);
      setHistory(updated);
      try { sessionStorage.setItem("notif_sent_log", JSON.stringify(updated)); } catch {}
      showToast(`✅ Sent! ${pSent + dSent} devices notified.`);
      setTitle(""); setBody("");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send notification.", "error");
    } finally {
      setSending(false);
    }
  };

  const grouped = AUDIENCES.reduce((acc, a) => {
    (acc[a.group] = acc[a.group] || []).push(a);
    return acc;
  }, {});

  return (
    <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1.3fr) minmax(0,1fr)", gap:20, alignItems:"start" }}>

      {/* ── Left column ── */}
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

        {/* Quick Templates */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"13px 18px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", alignItems:"center", gap:8 }}>
            <Zap size={13} color="#D4AF37"/>
            <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#fff" }}>Quick Templates</span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>· click to fill</span>
          </div>
          <div style={{ padding:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {QUICK_TEMPLATES.map((t, i) => (
              <button key={i} onClick={() => { setTitle(t.title); setBody(t.body); setAudience(t.audience); }}
                style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:10, padding:"10px 12px", cursor:"pointer", textAlign:"left" }}
                onMouseEnter={e => { e.currentTarget.style.background="rgba(212,175,55,0.08)"; e.currentTarget.style.borderColor="rgba(212,175,55,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor="rgba(212,175,55,0.12)"; }}>
                <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.85)", marginBottom:3 }}>{t.title}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", lineHeight:1.4 }}>{t.body.slice(0,42)}…</div>
                <div style={{ marginTop:5, fontSize:10, color:"#D4AF37", opacity:0.7 }}>
                  {AUDIENCES.find(a=>a.value===t.audience)?.icon} {AUDIENCES.find(a=>a.value===t.audience)?.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Compose */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:16, padding:22 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:"rgba(212,175,55,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Bell size={15} color="#D4AF37"/>
            </div>
            <div style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:700, color:"#fff" }}>Compose Notification</div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Audience */}
            <div>
              <label style={LABEL_STYLE}>Target Audience *</label>
              {Object.entries(grouped).map(([grp, opts]) => (
                <div key={grp} style={{ marginBottom:8 }}>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:5 }}>{grp}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    {opts.map(a => (
                      <button key={a.value} onClick={() => setAudience(a.value)} style={{
                        padding:"8px 10px", borderRadius:9, cursor:"pointer", textAlign:"left",
                        border: `1px solid ${audience===a.value ? "#D4AF37" : "rgba(212,175,55,0.1)"}`,
                        background: audience===a.value ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.02)",
                      }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:1 }}>
                          <span style={{ fontSize:14 }}>{a.icon}</span>
                          <span style={{ fontSize:11, fontWeight:600, color: audience===a.value ? "#D4AF37" : "rgba(255,255,255,0.7)" }}>{a.label}</span>
                        </div>
                        <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", paddingLeft:20 }}>{a.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label style={LABEL_STYLE}>Title *</label>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Enter notification title…" style={inputStyle}
                onFocus={e=>e.target.style.borderColor="#D4AF37"}
                onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.15)"}/>
            </div>

            <div>
              <label style={LABEL_STYLE}>Message *</label>
              <textarea value={body} onChange={e=>setBody(e.target.value)} rows={3}
                placeholder="Type your message here…"
                style={{ ...inputStyle, height:"auto", padding:"10px 14px", resize:"vertical" }}
                onFocus={e=>e.target.style.borderColor="#D4AF37"}
                onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.15)"}/>
              <div style={{ textAlign:"right", marginTop:3 }}>
                <span style={{ fontSize:11, color: body.length>140?"#f59e0b":"rgba(255,255,255,0.3)" }}>{body.length}/160</span>
              </div>
            </div>

            <button onClick={handleSend} disabled={sending} style={{
              height:46, background:"linear-gradient(135deg,#f0d060,#D4AF37,#b8922a)",
              border:"none", borderRadius:11, color:"#0a1840", fontSize:13,
              fontFamily:"Cinzel,serif", fontWeight:700, cursor:"pointer",
              opacity:sending?0.7:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
              <Send size={13}/>
              {sending ? "Sending…" : "Send Now"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right column ── */}
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

        {/* Phone Preview — always visible */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:"20px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background: (title||body) ? "#34D399" : "rgba(255,255,255,0.2)" }}/>
            <span style={{ fontFamily:"Cinzel,serif", fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>
              {(title||body) ? "Live Preview" : "Notification Preview"}
            </span>
          </div>
          <div style={{ display:"flex", justifyContent:"center" }}>
            <PhonePreview title={title} body={body}/>
          </div>
        </div>

        {/* Schedule info */}
        {schedule && (
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
            <div style={{ padding:"13px 18px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", alignItems:"center", gap:8 }}>
              <Calendar size={13} color="rgba(212,175,55,0.7)"/>
              <span style={{ fontFamily:"Cinzel,serif", fontSize:12, fontWeight:600, color:"#fff" }}>Auto-send Schedule</span>
            </div>
            <div style={{ padding:12, display:"flex", flexDirection:"column", gap:6 }}>
              {Object.entries(schedule.notificationTimes||{}).map(([slot,time]) => {
                const icons = { morning:"🌅", afternoon:"☀️", evening:"🌆" };
                return (
                  <div key={slot} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 11px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:8 }}>
                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)", textTransform:"capitalize" }}>{icons[slot]||"🔔"} {slot}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:"#D4AF37", fontFamily:"monospace" }}>{time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tips */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(96,165,250,0.12)", borderRadius:16, padding:"14px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12 }}>
            <AlertCircle size={13} color="rgba(96,165,250,0.7)"/>
            <span style={{ fontFamily:"Cinzel,serif", fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>Tips</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[
              ["Keep title under 50 chars", "Longer titles get cut off on most phones."],
              ["Best time to send", "10 AM – 12 PM or 6 PM – 8 PM for highest open rates."],
              ["Be specific", "\"₹50 off today\" performs better than \"great offers\"."],
            ].map(([tip, detail]) => (
              <div key={tip} style={{ padding:"8px 10px", background:"rgba(96,165,250,0.04)", border:"1px solid rgba(96,165,250,0.08)", borderRadius:8 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.65)", marginBottom:2 }}>💡 {tip}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", lineHeight:1.4 }}>{detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sent This Session */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"13px 17px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <Clock size={12} color="rgba(212,175,55,0.6)"/>
              <span style={{ fontFamily:"Cinzel,serif", fontSize:12, fontWeight:600, color:"#fff" }}>Sent This Session</span>
            </div>
            {history.length > 0 && (
              <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"rgba(212,175,55,0.12)", color:"#D4AF37" }}>{history.length}</span>
            )}
          </div>
          {history.length === 0
            ? <div style={{ padding:"22px 20px", textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.2)" }}>No notifications sent this session</div>
            : history.map((h,i) => (
              <div key={i} style={{ padding:"11px 15px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginBottom:3 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{h.title}</div>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)", whiteSpace:"nowrap" }}>{fmtTime(h.sentAt)}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ fontSize:10, padding:"2px 7px", borderRadius:20, background:"rgba(212,175,55,0.1)", color:"rgba(212,175,55,0.8)", border:"1px solid rgba(212,175,55,0.2)" }}>
                    {AUDIENCES.find(a=>a.value===h.audience)?.icon} {AUDIENCES.find(a=>a.value===h.audience)?.label||h.audience}
                  </span>
                  {h.sent != null && <span style={{ fontSize:10, color:"rgba(52,211,153,0.7)" }}>✓ {h.sent} sent</span>}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ── Tab 2 — Automated Campaigns ───────────────────────────────────────────────
function AutomatedTab({ showToast }) {
  const [campaigns, setCampaigns]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toggling, setToggling]     = useState({});
  const [running, setRunning]       = useState({});
  const [editing, setEditing]       = useState(null);
  const [editTitle, setEditTitle]   = useState("");
  const [editBody, setEditBody]     = useState("");
  const [saving, setSaving]         = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getCampaigns()
      .then(r => setCampaigns(r.data?.data || []))
      .catch(() => showToast("Failed to load campaigns.", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (key, current) => {
    setToggling(p => ({ ...p, [key]: true }));
    try {
      await toggleCampaign(key, !current);
      setCampaigns(cs => cs.map(c => c.key===key ? { ...c, is_enabled:!current } : c));
      showToast(`Campaign ${!current ? "enabled" : "disabled"}.`);
    } catch {
      showToast("Failed to toggle campaign.", "error");
    } finally {
      setToggling(p => ({ ...p, [key]: false }));
    }
  };

  const handleRunNow = async (key) => {
    if (!window.confirm(`Run "${key}" campaign now?`)) return;
    setRunning(p => ({ ...p, [key]: true }));
    try {
      const r  = await runCampaignNow(key);
      const d  = r.data?.data;
      const s  = (d?.passengers?.sent||0) + (d?.drivers?.sent||0);
      showToast(`✅ Campaign sent! ${s} devices notified.`);
      load();
    } catch {
      showToast("Failed to run campaign.", "error");
    } finally {
      setRunning(p => ({ ...p, [key]: false }));
    }
  };

  const startEdit  = (c) => { setEditing(c.key); setEditTitle(c.title); setEditBody(c.body); };
  const cancelEdit = () => { setEditing(null); setEditTitle(""); setEditBody(""); };

  const handleSaveMessage = async () => {
    if (!editTitle.trim() || !editBody.trim()) { showToast("Title and body are required.", "error"); return; }
    setSaving(true);
    try {
      await updateCampaignMessage(editing, editTitle, editBody);
      setCampaigns(cs => cs.map(c => c.key===editing ? { ...c, title:editTitle, body:editBody } : c));
      showToast("Message updated.");
      cancelEdit();
    } catch {
      showToast("Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  };

  const daily  = campaigns.filter(c => c.schedule_type === 'daily');
  const weekly = campaigns.filter(c => c.schedule_type === 'weekly');

  const CampaignCard = ({ c }) => {
    const isEditing = editing === c.key;
    return (
      <div style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${c.is_enabled ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.06)"}`, borderRadius:14, padding:18, marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <div style={{ fontSize:13, fontWeight:600, color: c.is_enabled ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}>{c.name}</div>
              <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background: c.is_enabled ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.05)", color: c.is_enabled ? "#34D399" : "rgba(255,255,255,0.3)", border:`1px solid ${c.is_enabled ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.08)"}` }}>
                {c.is_enabled ? "Active" : "Paused"}
              </span>
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:8 }}>{c.description}</div>

            {isEditing ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:10 }}>
                <input value={editTitle} onChange={e=>setEditTitle(e.target.value)}
                  placeholder="Notification title…"
                  style={{ ...inputStyle, height:36, fontSize:12 }}
                  onFocus={e=>e.target.style.borderColor="#D4AF37"}
                  onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.15)"}/>
                <textarea value={editBody} onChange={e=>setEditBody(e.target.value)}
                  placeholder="Message body…" rows={2}
                  style={{ ...inputStyle, height:"auto", padding:"8px 12px", fontSize:12, resize:"vertical" }}
                  onFocus={e=>e.target.style.borderColor="#D4AF37"}
                  onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.15)"}/>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={handleSaveMessage} disabled={saving} style={{ flex:1, height:32, background:"rgba(212,175,55,0.15)", border:"1px solid rgba(212,175,55,0.35)", borderRadius:8, color:"#D4AF37", fontSize:12, fontFamily:"Cinzel,serif", cursor:"pointer" }}>
                    <Check size={11} style={{ marginRight:4 }}/>{saving ? "Saving…" : "Save"}
                  </button>
                  <button onClick={cancelEdit} style={{ flex:1, height:32, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:9, padding:"9px 12px", marginBottom:10 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.75)", marginBottom:3 }}>{c.title}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", lineHeight:1.4 }}>{c.body}</div>
              </div>
            )}

            <div style={{ display:"flex", alignItems:"center", gap:14, fontSize:10, color:"rgba(255,255,255,0.3)" }}>
              <span>⏱ {SCHEDULE_LABEL[c.schedule_type] || c.schedule_type}</span>
              {c.last_run_at ? (
                <>
                  <span>Last: {fmtRelative(c.last_run_at)}</span>
                  <span style={{ color:"#34D399" }}>✓ {c.last_run_sent} sent</span>
                  {c.last_run_failed > 0 && <span style={{ color:"#ef4444" }}>✗ {c.last_run_failed} failed</span>}
                </>
              ) : (
                <span>Never run</span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, flexShrink:0 }}>
            <button onClick={() => handleToggle(c.key, c.is_enabled)} disabled={!!toggling[c.key]}
              title={c.is_enabled ? "Disable" : "Enable"}
              style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}>
              {c.is_enabled
                ? <ToggleRight size={30} color="#34D399"/>
                : <ToggleLeft  size={30} color="rgba(255,255,255,0.25)"/>
              }
            </button>
            {!isEditing && (
              <button onClick={() => startEdit(c)} title="Edit message"
                style={{ width:30, height:30, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Edit2 size={13} color="rgba(255,255,255,0.5)"/>
              </button>
            )}
            <button onClick={() => handleRunNow(c.key)} disabled={!!running[c.key]} title="Run now"
              style={{ width:30, height:30, background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:7, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {running[c.key] ? <span style={{ fontSize:10 }}>…</span> : <Play size={12} color="#D4AF37"/>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {Array(6).fill(0).map((_,i) => (
        <div key={i} style={{ height:120, borderRadius:14, background:"rgba(255,255,255,0.03)", animation:"gmPulse 1.5s ease-in-out infinite" }}/>
      ))}
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>
          {campaigns.filter(c=>c.is_enabled).length} active · {campaigns.length} total — runs automatically, toggle ON/OFF
        </div>
        <button onClick={load} style={{ height:34, padding:"0 14px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"rgba(255,255,255,0.6)", fontSize:12, cursor:"pointer" }}>
          Refresh
        </button>
      </div>

      {daily.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, color:"rgba(212,175,55,0.5)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ height:1, flex:1, background:"rgba(212,175,55,0.1)" }}/>Daily Campaigns
            <div style={{ height:1, flex:1, background:"rgba(212,175,55,0.1)" }}/>
          </div>
          {daily.map(c => <CampaignCard key={c.key} c={c}/>)}
        </div>
      )}

      {weekly.length > 0 && (
        <div>
          <div style={{ fontSize:11, color:"rgba(212,175,55,0.5)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ height:1, flex:1, background:"rgba(212,175,55,0.1)" }}/>Weekly Campaigns
            <div style={{ height:1, flex:1, background:"rgba(212,175,55,0.1)" }}/>
          </div>
          {weekly.map(c => <CampaignCard key={c.key} c={c}/>)}
        </div>
      )}
    </div>
  );
}

// ── Tab 3 — History ───────────────────────────────────────────────────────────
function HistoryTab({ showToast }) {
  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [page, setPage]       = useState(0);
  const LIMIT = 20;

  const load = useCallback((f, p) => {
    setLoading(true);
    const params = { limit: LIMIT, offset: p * LIMIT };
    if (f !== "all") params.type = f;
    getNotificationHistory(params)
      .then(r => { setLogs(r.data?.data || []); setTotal(r.data?.total || 0); })
      .catch(() => showToast("Failed to load history.", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(filter, page); }, [filter, page, load]);

  const switchFilter = (f) => { setFilter(f); setPage(0); };

  const TYPE_COLORS = {
    manual:    { bg:"rgba(96,165,250,0.1)",  border:"rgba(96,165,250,0.25)",  color:"#60a5fa",  label:"Manual" },
    automated: { bg:"rgba(52,211,153,0.1)",  border:"rgba(52,211,153,0.25)",  color:"#34D399",  label:"Automated" },
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <div style={{ display:"flex", gap:6 }}>
          {[
            { key:"all",       label:"All" },
            { key:"manual",    label:"Manual" },
            { key:"automated", label:"Automated" },
          ].map(f => (
            <button key={f.key} onClick={()=>switchFilter(f.key)} style={{
              padding:"6px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
              background: filter===f.key ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${filter===f.key ? "rgba(212,175,55,0.35)" : "rgba(255,255,255,0.08)"}`,
              color: filter===f.key ? "#D4AF37" : "rgba(255,255,255,0.4)",
              fontFamily:"Cinzel,serif",
            }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>Total: {total}</div>
      </div>

      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {Array(8).fill(0).map((_,i) => (
            <div key={i} style={{ height:72, borderRadius:12, background:"rgba(255,255,255,0.03)", animation:"gmPulse 1.5s ease-in-out infinite" }}/>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div style={{ padding:"60px 20px", textAlign:"center" }}>
          <History size={36} color="rgba(255,255,255,0.1)" style={{ marginBottom:10, display:"block", margin:"0 auto 10px" }}/>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)" }}>No notification history found</div>
        </div>
      ) : (
        <>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {logs.map(log => {
              const tc = TYPE_COLORS[log.send_type] || TYPE_COLORS.manual;
              const successRate = log.total_targeted > 0
                ? Math.round((log.total_sent / log.total_targeted) * 100) : 0;
              return (
                <div key={log.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"13px 16px" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{log.title}</span>
                        <span style={{ fontSize:10, padding:"2px 7px", borderRadius:20, background:tc.bg, border:`1px solid ${tc.border}`, color:tc.color, flexShrink:0 }}>
                          {tc.label}
                        </span>
                        {log.campaign_key && (
                          <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"monospace" }}>{log.campaign_key}</span>
                        )}
                      </div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:6, lineHeight:1.4 }}>{log.body}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:12, fontSize:10 }}>
                        <span style={{ color:"rgba(212,175,55,0.7)" }}>
                          {AUDIENCES.find(a=>a.value===log.target_audience)?.icon || "📣"} {AUDIENCES.find(a=>a.value===log.target_audience)?.label || log.target_audience}
                        </span>
                        <span style={{ color:"rgba(255,255,255,0.3)" }}>→ {log.total_targeted} targeted</span>
                        <span style={{ color:"#34D399" }}>✓ {log.total_sent} sent</span>
                        {log.total_failed > 0 && <span style={{ color:"#ef4444" }}>✗ {log.total_failed} failed</span>}
                        <span style={{ color:"rgba(255,255,255,0.25)" }}>{successRate}% success</span>
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", whiteSpace:"nowrap", textAlign:"right" }}>
                      {fmtTime(log.sent_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {total > LIMIT && (
            <div style={{ display:"flex", justifyContent:"center", gap:10, marginTop:16 }}>
              <button onClick={()=>setPage(p=>p-1)} disabled={page===0} style={{ padding:"7px 16px", borderRadius:8, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer", opacity:page===0?0.4:1 }}>
                ← Prev
              </button>
              <span style={{ padding:"7px 14px", fontSize:12, color:"rgba(255,255,255,0.4)" }}>
                {page+1} / {Math.ceil(total/LIMIT)}
              </span>
              <button onClick={()=>setPage(p=>p+1)} disabled={(page+1)*LIMIT>=total} style={{ padding:"7px 16px", borderRadius:8, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer", opacity:(page+1)*LIMIT>=total?0.4:1 }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const TABS = [
    { label:"Send Now",  icon:<Send size={13}/> },
    { label:"Automated", icon:<Zap  size={13}/> },
    { label:"History",   icon:<History size={13}/> },
  ];

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      {/* Page header */}
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Push Notifications</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>
          Targeted messages to users & drivers via FCM — manual or automated campaigns
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:22 }}>
        {[
          { label:"Audience Types",  value:AUDIENCES.length,       icon:"🎯", color:"#D4AF37", bg:"rgba(212,175,55,0.08)" },
          { label:"Auto Campaigns",  value:"10",                   icon:"⚡", color:"#60a5fa", bg:"rgba(96,165,250,0.08)" },
          { label:"Quick Templates", value:QUICK_TEMPLATES.length, icon:"📝", color:"#4ade80", bg:"rgba(52,211,153,0.08)" },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} style={{ background:bg, border:`1px solid ${color}22`, borderRadius:13, padding:"14px 18px", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:22 }}>{icon}</span>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color, fontFamily:"Cinzel,serif", lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:4, padding:4, background:"rgba(255,255,255,0.04)", borderRadius:13, marginBottom:22 }}>
        {TABS.map((tab, i) => (
          <button key={tab.label} onClick={() => setActiveTab(i)} style={{
            flex:1, padding:"10px 0", borderRadius:10, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:7,
            background: activeTab===i ? "rgba(212,175,55,0.14)" : "transparent",
            border: `1px solid ${activeTab===i ? "rgba(212,175,55,0.35)" : "transparent"}`,
            color: activeTab===i ? "#D4AF37" : "rgba(255,255,255,0.4)",
            fontFamily:"Cinzel,serif", fontSize:12, fontWeight:600, transition:"all .15s",
          }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 0 && <SendNowTab  showToast={showToast}/>}
      {activeTab === 1 && <AutomatedTab showToast={showToast}/>}
      {activeTab === 2 && <HistoryTab  showToast={showToast}/>}
    </div>
  );
}
