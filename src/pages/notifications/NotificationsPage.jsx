import { useState, useEffect } from "react";
import { Bell, Send, Calendar, X, Clock, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { triggerEngagement, getNotificationSchedule } from "../../api/admin";

const TOOLTIP_STYLE = {
  background:"#020d26", border:"1px solid rgba(212,175,55,0.2)",
  borderRadius:10, color:"#fff", fontFamily:"Outfit,sans-serif", fontSize:12,
};

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:400 }}>
  <span style={{ flex:1 }}>{msg}</span>
  <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

const TARGETS = [
  { value:"all_users",       label:"All Users",             icon:"👥", desc:"Every registered passenger" },
  { value:"all_drivers",     label:"All Drivers",           icon:"🚗", desc:"All verified drivers" },
  { value:"active_users",    label:"Active Users (7 days)", icon:"⚡", desc:"Users active this week" },
  { value:"inactive_users",  label:"Inactive Users",        icon:"💤", desc:"Users not active in 30 days" },
];

const QUICK_TEMPLATES = [
  { title:"Special Offer! 🎉", body:"Get 20% off on your next ride. Use code SAVE20. Limited time only!", target:"all_users" },
  { title:"New Area Available 🗺️", body:"We've expanded to new areas near you. Book your ride now!", target:"all_users" },
  { title:"Driver Bonus Week 🏆", body:"Complete 10+ rides this week and earn an extra ₹500 bonus!", target:"all_drivers" },
  { title:"Rate Your Last Ride ⭐", body:"How was your recent trip? Your feedback helps us improve.", target:"active_users" },
];

const inputStyle = {
  width:"100%", height:44, background:"rgba(255,255,255,0.06)",
  border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px",
  color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", boxSizing:"border-box",
};

export default function NotificationsPage() {
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [target, setTarget]     = useState("all_users");
  const [sending, setSending]   = useState(false);
  const [toast, setToast]       = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [schedLoading, setSchedLoading] = useState(true);
  const [sentHistory, setSentHistory]   = useState([]);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  useEffect(() => {
    setSchedLoading(true);
    getNotificationSchedule()
      .then((res) => {
        const d = res.data?.data || res.data || null;
        setSchedule(d && typeof d === "object" ? d : null);
      })
      .catch(() => {})
      .finally(() => setSchedLoading(false));
    // Load session history from sessionStorage
    try {
      const stored = JSON.parse(sessionStorage.getItem("notif_sent_log") || "[]");
      setSentHistory(stored);
    } catch {}
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { showToast("Title and message are required.", "error"); return; }
    if (!window.confirm(`Send "${title}" to ${TARGETS.find(t=>t.value===target)?.label}?`)) return;
    setSending(true);
    try {
      await triggerEngagement({ title, body, target_audience: target });
      const entry = { title, body, target, sentAt: new Date().toISOString() };
      const updated = [entry, ...sentHistory].slice(0, 10);
      setSentHistory(updated);
      try { sessionStorage.setItem("notif_sent_log", JSON.stringify(updated)); } catch {}
      showToast(`Notification "${title}" sent successfully.`);
      setTitle(""); setBody("");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send notification.", "error");
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (tpl) => { setTitle(tpl.title); setBody(tpl.body); setTarget(tpl.target); };

  // Target audience bar chart
  const targetChartData = [
    { name:"All Users",     value:4, color:"#D4AF37" },
    { name:"All Drivers",   value:3, color:"#60a5fa" },
    { name:"Active Users",  value:5, color:"#4ade80" },
    { name:"Inactive",      value:2, color:"#a78bfa" },
  ];

  const fmtTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN",{ day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });
  };

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Push Notifications</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Broadcast targeted messages to users and drivers via FCM</p>
      </div>

      {/* Stats Banner */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:24 }}>
        {[
          { label:"Sent This Session", value: sentHistory.length, icon:"📤", color:"#D4AF37", bg:"rgba(212,175,55,0.08)" },
          { label:"Target Groups",     value: TARGETS.length,     icon:"🎯", color:"#60a5fa", bg:"rgba(96,165,250,0.08)" },
          { label:"Quick Templates",   value: QUICK_TEMPLATES.length, icon:"⚡", color:"#4ade80", bg:"rgba(52,211,153,0.08)" },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} style={{ background:bg, border:`1px solid ${color}22`, borderRadius:14, padding:"16px 20px", display:"flex", alignItems:"center", gap:14 }}>
            <span style={{ fontSize:24 }}>{icon}</span>
            <div>
              <div style={{ fontSize:24, fontWeight:800, color, fontFamily:"Cinzel,serif", lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:4 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1.2fr) minmax(0,1fr)", gap:20, alignItems:"start" }}>

        {/* Left column */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Quick Templates */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
            <div style={{ padding:"14px 20px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:14 }}>⚡</span>
              <span style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:600, color:"#fff" }}>Quick Templates</span>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>· click to fill form</span>
            </div>
            <div style={{ padding:14, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {QUICK_TEMPLATES.map((tpl, i) => (
                <button key={i} onClick={() => applyTemplate(tpl)} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:10, padding:"10px 14px", cursor:"pointer", textAlign:"left", transition:"all .2s" }}
                  onMouseEnter={(e)=>{ e.currentTarget.style.background="rgba(212,175,55,0.08)"; e.currentTarget.style.borderColor="rgba(212,175,55,0.3)"; }}
                  onMouseLeave={(e)=>{ e.currentTarget.style.background="rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor="rgba(212,175,55,0.12)"; }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.85)", marginBottom:4, lineHeight:1.3 }}>{tpl.title}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", lineHeight:1.4 }}>{tpl.body.slice(0,45)}…</div>
                  <div style={{ marginTop:6, fontSize:10, color:"#D4AF37", opacity:0.7 }}>{TARGETS.find(t=>t.value===tpl.target)?.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Compose Card */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:16, padding:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"rgba(212,175,55,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Bell size={16} color="#D4AF37" />
              </div>
              <div style={{ fontFamily:"Cinzel,serif", fontSize:15, fontWeight:700, color:"#fff" }}>Compose Notification</div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {/* Target selector — visual cards */}
              <div>
                <label style={{ display:"block", fontSize:11, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 }}>Target Audience *</label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {TARGETS.map((t) => (
                    <button key={t.value} type="button" onClick={() => setTarget(t.value)} style={{
                      padding:"10px 12px", borderRadius:10, cursor:"pointer", textAlign:"left", transition:"all .15s",
                      border: `1px solid ${target===t.value?"#D4AF37":"rgba(212,175,55,0.12)"}`,
                      background: target===t.value ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.02)",
                    }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                        <span style={{ fontSize:16 }}>{t.icon}</span>
                        <span style={{ fontSize:12, fontWeight:600, color: target===t.value?"#D4AF37":"rgba(255,255,255,0.75)" }}>{t.label}</span>
                      </div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", paddingLeft:24 }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display:"block", fontSize:11, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>Notification Title *</label>
                <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Enter a catchy title…" style={inputStyle}
                  onFocus={(e)=>e.target.style.borderColor="#D4AF37"}
                  onBlur={(e)=>e.target.style.borderColor="rgba(212,175,55,0.15)"}
                />
              </div>

              <div>
                <label style={{ display:"block", fontSize:11, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>Message Body *</label>
                <textarea value={body} onChange={(e)=>setBody(e.target.value)} rows={3} placeholder="Type your message here…" style={{ ...inputStyle, height:"auto", padding:"10px 14px", resize:"vertical" }}
                  onFocus={(e)=>e.target.style.borderColor="#D4AF37"}
                  onBlur={(e)=>e.target.style.borderColor="rgba(212,175,55,0.15)"}
                />
                <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginTop:4 }}>
                  <span style={{ fontSize:11, color: body.length > 140 ? "#f59e0b" : "rgba(255,255,255,0.3)" }}>{body.length}/160</span>
                </div>
              </div>

              {/* Preview */}
              {(title || body) && (
                <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:12, padding:"14px 16px" }}>
                  <div style={{ fontSize:10, color:"rgba(212,175,55,0.5)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>📱 Notification Preview</div>
                  <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <div style={{ width:20, height:20, borderRadius:5, background:"rgba(212,175,55,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10 }}>🚗</div>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>GO Mobility</span>
                      <span style={{ fontSize:10, color:"rgba(255,255,255,0.2)", marginLeft:"auto" }}>now</span>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.88)", marginBottom:3 }}>{title || "Your title here"}</div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:1.4 }}>{body || "Your message here…"}</div>
                  </div>
                </div>
              )}

              <button onClick={handleSend} disabled={sending} style={{ height:48, background:"linear-gradient(135deg,#f0d060,#D4AF37,#b8922a)", border:"none", borderRadius:12, color:"#0a1840", fontSize:13, fontFamily:"Cinzel,serif", fontWeight:700, cursor:"pointer", opacity:sending?0.7:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <Send size={14} />
                {sending ? "Sending…" : "Send Now"}
              </button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Schedule Card */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:16, overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", alignItems:"center", gap:10 }}>
              <Calendar size={15} color="rgba(212,175,55,0.7)" />
              <span style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:600, color:"#fff" }}>Notification Schedule</span>
            </div>
            {schedLoading
              ? <div style={{ padding:32, display:"flex", flexDirection:"column", gap:10 }}>
                  {Array(3).fill(0).map((_,i) => <div key={i} style={{ height:44, borderRadius:8, background:"rgba(255,255,255,0.04)", animation:"gmPulse 1.5s ease-in-out infinite" }} />)}
                </div>
              : !schedule
                ? <div style={{ padding:40, textAlign:"center" }}>
                    <Bell size={28} color="rgba(255,255,255,0.1)" style={{ marginBottom:10 }} />
                    <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)" }}>Schedule unavailable</div>
                  </div>
                : <div style={{ padding:16, display:"flex", flexDirection:"column", gap:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"rgba(212,175,55,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10 }}>
                      <div>
                        <div style={{ fontSize:10, color:"rgba(212,175,55,0.55)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:3 }}>Server Time</div>
                        <div style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.85)", fontFamily:"monospace" }}>
                          {schedule.currentTime ? new Date(schedule.currentTime).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", second:"2-digit" }) : "—"}
                        </div>
                      </div>
                      <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600,
                        background: schedule.isWeekend ? "rgba(245,158,11,0.1)" : "rgba(52,211,153,0.1)",
                        border: `1px solid ${schedule.isWeekend ? "rgba(245,158,11,0.25)" : "rgba(52,211,153,0.25)"}`,
                        color: schedule.isWeekend ? "#F59E0B" : "#34D399"
                      }}>{schedule.day || "—"}</span>
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>Daily Notification Windows</div>
                      {Object.entries(schedule.notificationTimes || {}).map(([slot, time]) => {
                        const icons = { morning:"🌅", afternoon:"☀️", evening:"🌆" };
                        return (
                          <div key={slot} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:9, marginBottom:6 }}>
                            <span style={{ fontSize:12, color:"rgba(255,255,255,0.65)", textTransform:"capitalize" }}>{icons[slot] || "🔔"} {slot}</span>
                            <span style={{ fontSize:12, fontWeight:600, color:"#D4AF37", fontFamily:"monospace" }}>{time}</span>
                          </div>
                        );
                      })}
                    </div>
                    {schedule.nextScheduledNotification && (
                      <div style={{ padding:"11px 14px", background:"rgba(96,165,250,0.06)", border:"1px solid rgba(96,165,250,0.15)", borderRadius:10 }}>
                        <div style={{ fontSize:10, color:"rgba(96,165,250,0.6)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:4 }}>Next Scheduled Send</div>
                        <div style={{ fontSize:13, fontWeight:600, color:"#60A5FA", fontFamily:"monospace" }}>
                          {new Date(schedule.nextScheduledNotification).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
                        </div>
                      </div>
                    )}
                  </div>
            }
          </div>

          {/* Sent History */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
            <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Clock size={13} color="rgba(212,175,55,0.6)" />
                <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#fff" }}>Sent This Session</span>
              </div>
              {sentHistory.length > 0 && (
                <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"rgba(212,175,55,0.12)", color:"#D4AF37" }}>{sentHistory.length}</span>
              )}
            </div>
            {sentHistory.length === 0
              ? <div style={{ padding:"32px 20px", textAlign:"center" }}>
                  <Bell size={28} color="rgba(255,255,255,0.08)" style={{ marginBottom:8, display:"block", margin:"0 auto 8px" }} />
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.25)" }}>No notifications sent yet this session</div>
                </div>
              : <div style={{ display:"flex", flexDirection:"column" }}>
                  {sentHistory.map((h, i) => (
                    <div key={i} style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, marginBottom:4 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{h.title}</div>
                        <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)", whiteSpace:"nowrap", marginTop:1 }}>{fmtTime(h.sentAt)}</span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:10, padding:"2px 7px", borderRadius:20, background:"rgba(212,175,55,0.1)", color:"rgba(212,175,55,0.8)", border:"1px solid rgba(212,175,55,0.2)" }}>
                          {TARGETS.find(t=>t.value===h.target)?.icon} {TARGETS.find(t=>t.value===h.target)?.label || h.target}
                        </span>
                        <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>{h.body.slice(0,40)}{h.body.length>40?"…":""}</span>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
