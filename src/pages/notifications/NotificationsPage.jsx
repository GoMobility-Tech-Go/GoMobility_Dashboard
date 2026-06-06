import { useState, useEffect } from "react";
import { Bell, Send, Calendar, X } from "lucide-react";
import { triggerEngagement, getNotificationSchedule } from "../../api/admin";

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:400 }}>
  <span style={{ flex:1 }}>{msg}</span>
  <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

const TARGETS = [
  { value:"all_users",       label:"All Users"             },
  { value:"all_drivers",     label:"All Drivers"           },
  { value:"active_users",    label:"Active Users (7 days)" },
  { value:"inactive_users",  label:"Inactive Users"        },
];

const inputStyle = { width:"100%", height:44, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px", color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", boxSizing:"border-box" };

export default function NotificationsPage() {
  const [title, setTitle]     = useState("");
  const [body, setBody]       = useState("");
  const [target, setTarget]   = useState("all_users");
  const [sending, setSending] = useState(false);
  const [toast, setToast]     = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [schedLoading, setSchedLoading] = useState(true);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  useEffect(() => {
    setSchedLoading(true);
    getNotificationSchedule()
      .then((res) => {
        const d = res.data?.data || res.data || [];
        setSchedule(Array.isArray(d) ? d : d.schedule || d.items || []);
      })
      .catch(() => {})
      .finally(() => setSchedLoading(false));
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      showToast("Title and message are required.", "error"); return;
    }
    if (!window.confirm(`Send "${title}" to ${TARGETS.find(t=>t.value===target)?.label}?`)) return;
    setSending(true);
    try {
      await triggerEngagement({ title, body, target_audience: target });
      showToast(`Notification "${title}" sent successfully.`);
      setTitle("");
      setBody("");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send notification.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Push Notifications</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Broadcast messages to users and drivers</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:20, alignItems:"start" }}>

        {/* Compose Card */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:18, padding:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"rgba(212,175,55,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Bell size={16} color="#D4AF37" />
            </div>
            <div style={{ fontFamily:"Cinzel,serif", fontSize:15, fontWeight:700, color:"#fff" }}>Compose Notification</div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={{ display:"block", fontSize:11, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>Target Audience *</label>
              <select value={target} onChange={(e)=>setTarget(e.target.value)} style={{ ...inputStyle, cursor:"pointer" }}>
                {TARGETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
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
              <textarea value={body} onChange={(e)=>setBody(e.target.value)} rows={4} placeholder="Type your message here…" style={{ ...inputStyle, height:"auto", padding:"10px 14px", resize:"vertical" }}
                onFocus={(e)=>e.target.style.borderColor="#D4AF37"}
                onBlur={(e)=>e.target.style.borderColor="rgba(212,175,55,0.15)"}
              />
              <div style={{ textAlign:"right", fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:4 }}>{body.length}/160</div>
            </div>

            {/* Preview */}
            {(title || body) && (
              <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:12, padding:"14px 16px" }}>
                <div style={{ fontSize:10, color:"rgba(212,175,55,0.5)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>Preview</div>
                <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.88)", marginBottom:4 }}>{title || "Your title here"}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:1.5 }}>{body || "Your message here…"}</div>
              </div>
            )}

            <button onClick={handleSend} disabled={sending} style={{ height:48, background:"linear-gradient(135deg,#f0d060,#D4AF37,#b8922a)", border:"none", borderRadius:12, color:"#0a1840", fontSize:13, fontFamily:"Cinzel,serif", fontWeight:700, cursor:"pointer", opacity:sending?0.7:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:4 }}>
              <Send size={14} />
              {sending ? "Sending…" : "Send Now"}
            </button>
          </div>
        </div>

        {/* Schedule / History Card */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:18, overflow:"hidden" }}>
          <div style={{ padding:"18px 22px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", alignItems:"center", gap:10 }}>
            <Calendar size={15} color="rgba(212,175,55,0.7)" />
            <span style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:600, color:"#fff" }}>Scheduled Notifications</span>
          </div>
          {schedLoading
            ? <div style={{ padding:32, display:"flex", flexDirection:"column", gap:10 }}>
                {Array(3).fill(0).map((_,i) => <div key={i} style={{ height:44, borderRadius:8, background:"rgba(255,255,255,0.04)", animation:"gmPulse 1.5s ease-in-out infinite" }} />)}
              </div>
            : schedule.length === 0
              ? <div style={{ padding:48, textAlign:"center" }}>
                  <Bell size={32} color="rgba(255,255,255,0.1)" style={{ marginBottom:12 }} />
                  <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)", fontWeight:600, marginBottom:4 }}>No scheduled notifications</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.2)" }}>Compose and send a notification above</div>
                </div>
              : <div style={{ padding:14, display:"flex", flexDirection:"column", gap:10 }}>
                  {schedule.map((item, i) => (
                    <div key={item.id || i} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:10, padding:"12px 16px" }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#fff", marginBottom:4 }}>{item.title || "—"}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{item.scheduled_at || item.scheduledAt || "—"} · {item.target || "—"}</div>
                    </div>
                  ))}
                </div>
          }
        </div>
      </div>
    </div>
  );
}
