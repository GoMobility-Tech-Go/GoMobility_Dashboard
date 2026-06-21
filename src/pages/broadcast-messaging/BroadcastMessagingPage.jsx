import { useState } from "react";
import {
  useToast, ToastProvider, PageWrapper, Card, TableCard,
  GlobalStyles, FormGroup,
} from "../../components/ui/index.jsx";
import { triggerEngagement } from "../../api/admin";

function Content() {
  const toast = useToast();

  const [tab, setTab]               = useState("compose");
  const [composeType, setComposeType] = useState("broadcast-drivers");
  const [composeMsg, setComposeMsg]  = useState("");
  const [composeSubject, setSubject] = useState("");
  const [sending, setSending]        = useState(false);

  // History — starts empty, grows as you send broadcasts
  const [history, setHistory] = useState([]);

  const sentCount   = history.length;
  const unreadCount = history.filter(m => !m.read).length;

  const sendBroadcast = async () => {
    if (!composeMsg.trim()) { toast("Enter a message", "error"); return; }
    setSending(true);
    try {
      const audienceMap = {
        "broadcast-drivers": "drivers",
        "broadcast-users":   "users",
        "broadcast-gold":    "gold_drivers",
      };
      await triggerEngagement({
        type:    audienceMap[composeType] || "users",
        message: composeMsg,
        title:   composeSubject.trim() || "Admin Broadcast",
      });
      const targetLabel = {
        "broadcast-drivers": "All Drivers",
        "broadcast-users":   "All Users",
        "broadcast-gold":    "Gold Tier Drivers",
      }[composeType] || "All Users";

      setHistory(prev => [{
        id:        prev.length + 1,
        audience:  targetLabel,
        type:      composeType.includes("driver") ? "driver" : "user",
        title:     composeSubject.trim() || "Admin Broadcast",
        message:   composeMsg,
        sentAt:    new Date().toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }),
        read:      false,
      }, ...prev]);

      toast(`Broadcast sent to ${targetLabel}!`, "success");
      setComposeMsg("");
      setSubject("");
    } catch {
      toast("Failed to send broadcast. Please try again.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <PageWrapper
      title="Broadcast Messaging"
      subtitle="Send bulk push notifications to drivers and users via FCM">
      <GlobalStyles/>

      {/* Live stats — computed from session history */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
        {[
          { label:"Broadcasts Sent",    value: sentCount,   color:"#D4AF37", icon:"📤" },
          { label:"Unread Responses",   value: unreadCount, color:"#F59E0B", icon:"🔔" },
          { label:"Sent to Drivers",    value: history.filter(m=>m.type==="driver").length, color:"#60A5FA", icon:"🚗" },
          { label:"Sent to Users",      value: history.filter(m=>m.type==="user").length,   color:"#34D399", icon:"👤" },
        ].map(s => (
          <div key={s.label} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:14, padding:"16px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <span style={{ fontSize:16 }}>{s.icon}</span>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.8px" }}>{s.label}</span>
            </div>
            <div style={{ fontSize:26, fontWeight:800, color:s.color, fontFamily:"Cinzel,serif" }}>{s.value}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.25)", marginTop:4 }}>this session</div>
          </div>
        ))}
      </div>

      <div className="tab-nav">
        {[
          { id:"compose", l:"📤 Compose & Send" },
          { id:"history", l:`📋 Sent History${sentCount > 0 ? ` (${sentCount})` : ""}` },
        ].map(t => (
          <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>
        ))}
      </div>

      {/* ── Compose Tab ── */}
      {tab==="compose" && (
        <Card style={{ padding:26, maxWidth:600 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,0.85)", marginBottom:22 }}>
            📢 Send Bulk Broadcast via FCM Push Notification
          </div>

          <FormGroup label="Target Audience">
            <select className="gm-input" value={composeType} onChange={e=>setComposeType(e.target.value)}>
              <option value="broadcast-drivers">All Drivers</option>
              <option value="broadcast-users">All Users</option>
              <option value="broadcast-gold">Gold Tier Drivers</option>
            </select>
          </FormGroup>

          <FormGroup label="Notification Title">
            <input
              className="gm-input"
              placeholder="e.g. Important Policy Update"
              value={composeSubject}
              onChange={e=>setSubject(e.target.value)}
            />
          </FormGroup>

          <FormGroup label="Message">
            <textarea
              className="gm-input"
              rows="5"
              placeholder="Type your broadcast message here…"
              style={{ resize:"vertical" }}
              value={composeMsg}
              onChange={e=>setComposeMsg(e.target.value)}
            />
            <div style={{ textAlign:"right", fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:4 }}>
              {composeMsg.length} characters
            </div>
          </FormGroup>

          <div style={{ padding:"12px 16px", background:"rgba(96,165,250,0.06)", border:"1px solid rgba(96,165,250,0.15)", borderRadius:10, fontSize:12, color:"rgba(255,255,255,0.4)", marginBottom:18, lineHeight:1.6 }}>
            This sends a real FCM push notification to all <strong style={{ color:"#60A5FA" }}>{composeType === "broadcast-drivers" ? "drivers" : composeType === "broadcast-gold" ? "Gold tier drivers" : "users"}</strong> via <code style={{ color:"#D4AF37" }}>POST /notifications/admin/trigger-engagement</code>. Cannot be undone.
          </div>

          <button
            className="btn-gold"
            style={{ width:"100%", justifyContent:"center", opacity:sending?0.6:1, cursor:sending?"not-allowed":"pointer" }}
            onClick={sendBroadcast}
            disabled={sending}>
            {sending ? "⏳ Sending…" : "📤 Send Broadcast"}
          </button>
        </Card>
      )}

      {/* ── History Tab ── */}
      {tab==="history" && (
        <TableCard title="Sent Broadcast History (This Session)" icon="📋">
          {history.length === 0 ? (
            <div style={{ padding:"60px 40px", textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📭</div>
              <div style={{ color:"rgba(255,255,255,0.35)", fontSize:13 }}>No broadcasts sent yet this session.</div>
              <div style={{ color:"rgba(255,255,255,0.2)", fontSize:11, marginTop:6 }}>Use the Compose tab to send a broadcast.</div>
            </div>
          ) : (
            <table className="gm-table">
              <thead>
                <tr><th>#</th><th>Audience</th><th>Title</th><th>Message</th><th>Sent At</th><th>Status</th></tr>
              </thead>
              <tbody>
                {history.map((m,i) => (
                  <tr key={i}>
                    <td style={{ color:"rgba(255,255,255,0.35)", fontSize:11 }}>{m.id}</td>
                    <td>
                      <span style={{ display:"inline-flex", padding:"3px 9px", borderRadius:100, fontSize:10.5, fontWeight:600,
                        background: m.type==="driver"?"rgba(96,165,250,0.1)":"rgba(212,175,55,0.1)",
                        border:`1px solid ${m.type==="driver"?"rgba(96,165,250,0.28)":"rgba(212,175,55,0.28)"}`,
                        color: m.type==="driver"?"#60A5FA":"#D4AF37"
                      }}>{m.audience}</span>
                    </td>
                    <td style={{ fontWeight:600 }}>{m.title}</td>
                    <td style={{ fontSize:12, maxWidth:260, color:"rgba(255,255,255,0.6)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.message}</td>
                    <td style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontFamily:"monospace" }}>{m.sentAt}</td>
                    <td><span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:100, fontSize:10.5, fontWeight:600, background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.25)", color:"#34D399" }}>✓ Sent</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TableCard>
      )}
    </PageWrapper>
  );
}

export default function BroadcastMessagingPage() {
  return <ToastProvider><Content/></ToastProvider>;
}
