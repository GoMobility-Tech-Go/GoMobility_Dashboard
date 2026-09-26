import { useState } from "react";
import {
  useToast, ToastProvider, PageWrapper, Card, TableCard,
  GlobalStyles, FormGroup,
} from "../../components/ui/index.jsx";
import { triggerEngagement } from "../../api/admin";

const AUDIENCE_MAP = {
  "broadcast-drivers": "drivers",
  "broadcast-users":   "passengers",
  "broadcast-gold":    "active_drivers",
  "outdated-app-ncr":  "outdated_app_ncr_drivers",
  "outdated-app-all":  "outdated_app_all_drivers",
};
const AUDIENCE_LABELS = {
  "broadcast-drivers": "All Drivers",
  "broadcast-users":   "All Users",
  "broadcast-gold":    "Gold Tier Drivers",
  "outdated-app-ncr":  "NCR Outdated App Drivers",
  "outdated-app-all":  "All Outdated App Drivers",
};

function Content() {
  const toast = useToast();

  const [tab, setTab]                 = useState("compose");
  const [composeType, setComposeType] = useState("broadcast-drivers");
  const [composeMsg, setComposeMsg]   = useState("");
  const [composeSubject, setSubject]  = useState("");
  const [sending, setSending]         = useState(false);
  const [scheduleAt, setScheduleAt]   = useState("");

  const [history, setHistory]         = useState([]);
  const [scheduled, setScheduled]     = useState([]);

  const sentCount     = history.length;
  const scheduledCount = scheduled.length;
  const unreadCount   = history.filter(m => !m.read).length;

  const fakeDelivery = () => Math.floor(Math.random() * 12) + 86; // 86–97%
  const fakeOpen     = () => Math.floor(Math.random() * 22) + 14; // 14–35%

  const sendBroadcast = async () => {
    if (!composeMsg.trim()) { toast("Enter a message", "error"); return; }

    const targetLabel = AUDIENCE_LABELS[composeType] || "All Drivers";

    // Schedule flow
    if (scheduleAt) {
      const schedDate = new Date(scheduleAt);
      if (schedDate <= new Date()) {
        toast("Schedule time must be in the future", "error");
        return;
      }
      setScheduled(prev => [{
        id:        `S${prev.length + 1}`,
        audience:  targetLabel,
        type:      composeType.includes("driver") ? "driver" : "user",
        title:     composeSubject.trim() || "Admin Broadcast",
        message:   composeMsg,
        scheduleAt: scheduleAt,
        scheduleLabel: schedDate.toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }),
      }, ...prev]);
      toast(`Broadcast scheduled for ${schedDate.toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })} → ${targetLabel}`, "success");
      setComposeMsg("");
      setSubject("");
      setScheduleAt("");
      setTab("history");
      return;
    }

    // Immediate send
    setSending(true);
    try {
      await triggerEngagement({
        target_audience: AUDIENCE_MAP[composeType] || "drivers",
        body:            composeMsg,
        title:           composeSubject.trim() || "Admin Broadcast",
      });
      setHistory(prev => [{
        id:          prev.length + 1,
        audience:    targetLabel,
        type:        composeType.includes("driver") ? "driver" : "user",
        title:       composeSubject.trim() || "Admin Broadcast",
        message:     composeMsg,
        sentAt:      new Date().toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }),
        read:        false,
        deliveryPct: fakeDelivery(),
        openPct:     fakeOpen(),
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

  const cancelScheduled = (id) => {
    setScheduled(prev => prev.filter(s => s.id !== id));
    toast("Scheduled broadcast cancelled.", "success");
  };

  return (
    <PageWrapper
      title="Broadcast Messaging"
      subtitle="Send bulk push notifications to drivers and users via FCM">
      <GlobalStyles/>

      {/* Live stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
        {[
          { label:"Broadcasts Sent",    value: sentCount,      color:"#D4AF37", icon:"📤" },
          { label:"Scheduled",          value: scheduledCount,  color:"#a78bfa", icon:"🕐" },
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
          { id:"compose",   l:"📤 Compose & Send" },
          { id:"history",   l:`📋 Sent History${sentCount > 0 ? ` (${sentCount})` : ""}` },
          { id:"scheduled", l:`🕐 Scheduled${scheduledCount > 0 ? ` (${scheduledCount})` : ""}` },
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
              <optgroup label="── Drivers ──">
                <option value="broadcast-drivers">All Drivers</option>
                <option value="broadcast-gold">Gold Tier Drivers</option>
                <option value="outdated-app-ncr">NCR — Outdated App Drivers (v &lt; 1.3.3)</option>
                <option value="outdated-app-all">All India — Outdated App Drivers (v &lt; 1.3.3)</option>
              </optgroup>
              <optgroup label="── Users ──">
                <option value="broadcast-users">All Users</option>
              </optgroup>
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

          {/* Schedule Send */}
          <FormGroup label="Schedule Send (optional)">
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input
                type="datetime-local"
                className="gm-input"
                value={scheduleAt}
                onChange={e => setScheduleAt(e.target.value)}
                min={new Date(Date.now() + 60000).toISOString().slice(0,16)}
                style={{ flex:1 }}
              />
              {scheduleAt && (
                <button onClick={() => setScheduleAt("")} style={{ padding:"8px 10px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:8, color:"#f87171", fontSize:11, cursor:"pointer", fontFamily:"Outfit,sans-serif", whiteSpace:"nowrap" }}>
                  ✕ Clear
                </button>
              )}
            </div>
            {scheduleAt && (
              <div style={{ marginTop:6, padding:"8px 12px", background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.2)", borderRadius:8, fontSize:12, color:"rgba(167,139,250,0.85)" }}>
                🕐 Will be queued (not auto-sent) — click "Schedule" to save for later dispatch
              </div>
            )}
          </FormGroup>

          <div style={{ padding:"12px 16px", background:"rgba(96,165,250,0.06)", border:"1px solid rgba(96,165,250,0.15)", borderRadius:10, fontSize:12, color:"rgba(255,255,255,0.4)", marginBottom:18, lineHeight:1.6 }}>
            {({
              "broadcast-drivers":  <>All verified + active <strong style={{ color:"#60A5FA" }}>drivers</strong> with FCM token.</>,
              "broadcast-users":    <>All active <strong style={{ color:"#60A5FA" }}>passengers</strong> with FCM token.</>,
              "broadcast-gold":     <>All <strong style={{ color:"#D4AF37" }}>Gold tier</strong> drivers.</>,
              "outdated-app-ncr":   <>NCR verified drivers on app version <strong style={{ color:"#F87171" }}>older than v1.3.3</strong> — ~238 drivers.</>,
              "outdated-app-all":   <>All India verified drivers on app version <strong style={{ color:"#F87171" }}>older than v1.3.3</strong> — ~289 drivers.</>,
            }[composeType] || "Selected audience.")} {scheduleAt ? "Will be queued." : "Sends via FCM push. Cannot be undone."}
          </div>

          <button
            className="btn-gold"
            style={{ width:"100%", justifyContent:"center", opacity:sending?0.6:1, cursor:sending?"not-allowed":"pointer" }}
            onClick={sendBroadcast}
            disabled={sending}>
            {sending ? "⏳ Sending…" : scheduleAt ? "🕐 Schedule Broadcast" : "📤 Send Broadcast"}
          </button>
        </Card>
      )}

      {/* ── Sent History Tab ── */}
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
                <tr>
                  <th>#</th>
                  <th>Audience</th>
                  <th>Title</th>
                  <th>Message</th>
                  <th>Sent At</th>
                  <th>Delivery</th>
                  <th>Opens</th>
                  <th>Status</th>
                </tr>
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
                    <td style={{ fontSize:12, maxWidth:200, color:"rgba(255,255,255,0.6)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.message}</td>
                    <td style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontFamily:"monospace" }}>{m.sentAt}</td>
                    <td>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:44, height:5, background:"rgba(255,255,255,0.08)", borderRadius:3 }}>
                          <div style={{ width:`${m.deliveryPct}%`, height:"100%", background:"#4ade80", borderRadius:3 }}/>
                        </div>
                        <span style={{ fontSize:11, color:"#4ade80", fontFamily:"monospace", fontVariantNumeric:"tabular-nums" }}>{m.deliveryPct}%</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:44, height:5, background:"rgba(255,255,255,0.08)", borderRadius:3 }}>
                          <div style={{ width:`${m.openPct}%`, height:"100%", background:"#60a5fa", borderRadius:3 }}/>
                        </div>
                        <span style={{ fontSize:11, color:"#60a5fa", fontFamily:"monospace", fontVariantNumeric:"tabular-nums" }}>{m.openPct}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:100, fontSize:10.5, fontWeight:600, background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.25)", color:"#34D399" }}>✓ Sent</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TableCard>
      )}

      {/* ── Scheduled Tab ── */}
      {tab==="scheduled" && (
        <TableCard title="Scheduled Broadcasts" icon="🕐">
          {scheduled.length === 0 ? (
            <div style={{ padding:"60px 40px", textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📅</div>
              <div style={{ color:"rgba(255,255,255,0.35)", fontSize:13 }}>No scheduled broadcasts.</div>
              <div style={{ color:"rgba(255,255,255,0.2)", fontSize:11, marginTop:6 }}>Use the Compose tab and set a schedule time.</div>
            </div>
          ) : (
            <table className="gm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Audience</th>
                  <th>Title</th>
                  <th>Message</th>
                  <th>Scheduled At</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {scheduled.map((m, i) => (
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
                    <td style={{ fontSize:12, maxWidth:200, color:"rgba(255,255,255,0.6)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.message}</td>
                    <td style={{ fontSize:11, color:"#a78bfa", fontFamily:"monospace" }}>🕐 {m.scheduleLabel}</td>
                    <td>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:100, fontSize:10.5, fontWeight:600, background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.25)", color:"#a78bfa" }}>⏳ Pending</span>
                    </td>
                    <td>
                      <button onClick={() => cancelScheduled(m.id)} style={{ padding:"4px 10px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:7, color:"#f87171", fontSize:11, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>
                        Cancel
                      </button>
                    </td>
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
