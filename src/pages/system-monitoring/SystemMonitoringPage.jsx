import { Fragment, useCallback, useEffect, useState } from "react";
import {
  AlertCircle, RefreshCw, MessageCircle, CheckCircle2,
  XCircle, Clock, TrendingUp, Wifi, WifiOff, ChevronDown, ChevronUp,
} from "lucide-react";
import { api } from "../../services/api.js";

// ─── Shared tokens ────────────────────────────────────────────────────────────
const GOLD    = "#D4AF37";
const SURFACE = "rgba(255,255,255,0.02)";
const BORDER  = "rgba(212,175,55,0.12)";
const TEXT_DIM = "rgba(255,255,255,0.45)";

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { timeZone:"Asia/Kolkata", day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });
};

const StatTile = ({ label, value, color, sub }) => (
  <div style={{ background: SURFACE, border: `1px solid ${color}30`, borderRadius:14, padding:"16px 20px", textAlign:"center" }}>
    <div style={{ fontSize:28, fontWeight:800, color, fontVariantNumeric:"tabular-nums" }}>{value ?? "—"}</div>
    <div style={{ fontSize:11, color: TEXT_DIM, marginTop:4 }}>{label}</div>
    {sub && <div style={{ fontSize:10, color, marginTop:2, opacity:0.7 }}>{sub}</div>}
  </div>
);

const SectionHeader = ({ title, onRefresh, loading }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
    padding:"14px 20px", borderBottom:`1px solid ${BORDER}` }}>
    <span style={{ fontFamily:"Cinzel,serif", fontSize:14, color:"#fff", fontWeight:600 }}>{title}</span>
    <button onClick={onRefresh} disabled={loading}
      style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:`${GOLD}b0`,
        background:`${GOLD}14`, border:`1px solid ${GOLD}25`, borderRadius:8,
        padding:"6px 12px", cursor:"pointer", opacity: loading ? 0.5 : 1 }}>
      <RefreshCw size={11} className={loading ? "spin" : ""}/> Refresh
    </button>
  </div>
);

// ─── PAYMENT ALERTS PANEL ──────────────────────────────────────────────────────
function PaymentAlertsPanel() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.getPaymentAlerts({ limit: 50 });
      setData(res.data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const alerts = data?.alerts ?? [];
  const total     = data?.total ?? 0;
  const suppressed = data?.suppressed ?? 0;

  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius:16, overflow:"hidden", marginBottom:28 }}>
      <SectionHeader title="Payment Alerts Log" onRefresh={load} loading={loading} />

      {/* Stats — only show when data is available, not during error */}
      {!error && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, padding:16 }}>
          <StatTile label="Total Alerts"   value={loading ? "—" : total}              color="#f59e0b" />
          <StatTile label="Emails Sent"    value={loading ? "—" : total - suppressed} color="#4ade80" />
          <StatTile label="Suppressed"     value={loading ? "—" : suppressed}         color="#f87171"
                    sub="(5-min dedupe)" />
        </div>
      )}

      {/* List */}
      {error ? (
        <div style={{ padding:24, textAlign:"center", color:"#f87171", fontSize:13 }}>
          {error}
        </div>
      ) : loading ? (
        <div style={{ padding:16, display:"flex", flexDirection:"column", gap:10 }}>
          {Array(3).fill(0).map((_,i) => (
            <div key={i} style={{ height:64, background:"rgba(255,255,255,0.03)", borderRadius:10,
              animation:"gmPulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div style={{ padding:48, textAlign:"center", color: TEXT_DIM, fontSize:13 }}>
          <CheckCircle2 size={28} color="rgba(34,197,94,0.25)" style={{ display:"block", margin:"0 auto 10px" }}/>
          No payment errors recorded
        </div>
      ) : (
        <div style={{ padding:12, display:"flex", flexDirection:"column", gap:8 }}>
          {alerts.map((a) => {
            const isEmailSent = a.email_sent;
            const isOpen = expanded[a.id];
            return (
              <div key={a.id}
                style={{ background:`rgba(255,255,255,0.015)`,
                  border:`1px solid ${isEmailSent ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius:12, overflow:"hidden" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", cursor:"pointer" }}
                  onClick={() => toggle(a.id)}>
                  {/* Status dot */}
                  <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0,
                    background: isEmailSent ? "#f59e0b" : "#6b7280" }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#fff", whiteSpace:"nowrap",
                      overflow:"hidden", textOverflow:"ellipsis" }}>
                      {a.gateway} — {a.operation}
                    </div>
                    <div style={{ fontSize:11, color: TEXT_DIM, marginTop:2, whiteSpace:"nowrap",
                      overflow:"hidden", textOverflow:"ellipsis" }}>
                      {a.reason}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                    {!isEmailSent && (
                      <span style={{ fontSize:10, background:"rgba(107,114,128,0.15)",
                        border:"1px solid rgba(107,114,128,0.25)", borderRadius:6,
                        padding:"2px 8px", color:"#9ca3af" }}>suppressed</span>
                    )}
                    <span style={{ fontSize:11, color: TEXT_DIM }}>{fmtDate(a.created_at)}</span>
                    {isOpen ? <ChevronUp size={14} color={TEXT_DIM}/> : <ChevronDown size={14} color={TEXT_DIM}/>}
                  </div>
                </div>
                {isOpen && (
                  <div style={{ borderTop:`1px solid ${BORDER}`, padding:"10px 14px",
                    display:"grid", gridTemplateColumns:"auto 1fr", gap:"4px 16px" }}>
                    {[
                      ["Gateway",    a.gateway],
                      ["Operation",  a.operation],
                      ["Reason",     a.reason],
                      ...(a.error_code ? [["Error Code", a.error_code]] : []),
                      ["Suppressed prior", `+${a.suppressed_count}`],
                      ["Email sent", a.email_sent ? "Yes" : "No (dedupe)"],
                      ["Time (IST)", fmtDate(a.created_at)],
                    ].map(([k, v]) => (
                      <Fragment key={k}>
                        <span style={{ fontSize:11, color: TEXT_DIM }}>{k}</span>
                        <span style={{ fontSize:11, color:"rgba(255,255,255,0.75)",
                          fontFamily:"monospace", wordBreak:"break-all" }}>{v}</span>
                      </Fragment>
                    ))}
                    {Object.keys(a.meta || {}).length > 0 && (
                      <>
                        <span style={{ fontSize:11, color: TEXT_DIM }}>Meta</span>
                        <pre style={{ fontSize:10, color:"rgba(255,255,255,0.6)", margin:0,
                          fontFamily:"monospace", whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
                          {JSON.stringify(a.meta, null, 2)}
                        </pre>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── WHATSAPP ACTIVITY PANEL ──────────────────────────────────────────────────
const WA_STATE_LABELS = {
  IDLE: "Idle", GREETING: "Greeting", BOOKING: "Booking",
  SEARCHING: "Searching", TRACKING: "Tracking", COMPLETED: "Completed",
  RATING: "Rating", CANCELLED: "Cancelled",
};

function WhatsappActivityPanel() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [days, setDays]       = useState(7);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.getWhatsappStats(days);
      setData(res.data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const totals  = data?.totals    ?? {};
  const states  = data?.session_states ?? [];
  const recent  = data?.recent_messages ?? [];
  const costRs  = ((data?.cost_paise ?? 0) / 100).toFixed(2);

  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius:16, overflow:"hidden" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"14px 20px", borderBottom:`1px solid ${BORDER}` }}>
        <span style={{ fontFamily:"Cinzel,serif", fontSize:14, color:"#fff", fontWeight:600 }}>
          WhatsApp Bot Activity
        </span>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}
            style={{ height:32, background:"rgba(255,255,255,0.06)", border:`1px solid ${BORDER}`,
              borderRadius:8, padding:"0 10px", color:"rgba(255,255,255,0.8)", fontSize:12,
              outline:"none", cursor:"pointer" }}>
            <option value={1}>Last 24h</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <button onClick={load} disabled={loading}
            style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:`${GOLD}b0`,
              background:`${GOLD}14`, border:`1px solid ${GOLD}25`, borderRadius:8,
              padding:"6px 12px", cursor:"pointer", opacity: loading ? 0.5 : 1 }}>
            <RefreshCw size={11}/> Refresh
          </button>
        </div>
      </div>

      {/* Volume tiles */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, padding:16 }}>
        <StatTile label="Messages In"  value={totals.in}      color="#60a5fa" />
        <StatTile label="Messages Out" value={totals.out}     color="#4ade80" />
        <StatTile label="Failed"       value={totals.failed}  color="#f87171" />
        <StatTile label="Cost"         value={`₹${costRs}`}  color={GOLD}
                  sub={`${data?.period_days ?? days}d`} />
      </div>

      {error ? (
        <div style={{ padding:24, textAlign:"center", color:"#f87171", fontSize:13 }}>{error}</div>
      ) : loading ? (
        <div style={{ padding:16, display:"flex", flexDirection:"column", gap:10 }}>
          {Array(4).fill(0).map((_,i) => (
            <div key={i} style={{ height:48, background:"rgba(255,255,255,0.03)",
              borderRadius:10, animation:"gmPulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0,
          borderTop:`1px solid ${BORDER}` }}>

          {/* Session States */}
          <div style={{ borderRight:`1px solid ${BORDER}`, padding:16 }}>
            <div style={{ fontSize:12, color: TEXT_DIM, fontWeight:600, marginBottom:12,
              textTransform:"uppercase", letterSpacing:1 }}>Active Sessions</div>
            {states.length === 0 ? (
              <div style={{ fontSize:12, color: TEXT_DIM, textAlign:"center", padding:"20px 0" }}>No sessions</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {(() => {
                  const maxCnt = Math.max(...states.map(x => x.cnt));
                  return states.map((s) => {
                    const pct = maxCnt > 0 ? Math.round((s.cnt / maxCnt) * 100) : 0;
                    return (
                      <div key={s.state}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:12, color:"rgba(255,255,255,0.7)" }}>
                            {WA_STATE_LABELS[s.state] || s.state}
                          </span>
                          <span style={{ fontSize:12, color: GOLD, fontVariantNumeric:"tabular-nums" }}>
                            {s.cnt}
                          </span>
                        </div>
                        <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:4 }}>
                          <div style={{ height:"100%", width:`${pct}%`, background: GOLD,
                            borderRadius:4, opacity:0.6 }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Recent inbound messages */}
          <div style={{ padding:16 }}>
            <div style={{ fontSize:12, color: TEXT_DIM, fontWeight:600, marginBottom:12,
              textTransform:"uppercase", letterSpacing:1 }}>Recent Inbound</div>
            {recent.length === 0 ? (
              <div style={{ fontSize:12, color: TEXT_DIM, textAlign:"center", padding:"20px 0" }}>No messages</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:280, overflowY:"auto" }}>
                {recent.map((m) => (
                  <div key={m.id} style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start", gap:8, padding:"6px 0",
                    borderBottom:`1px solid rgba(255,255,255,0.04)` }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,0.8)", fontWeight:500,
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {m.user_name || m.wa_id}
                      </div>
                      <div style={{ fontSize:10, color: TEXT_DIM, marginTop:1 }}>
                        {m.msg_type}
                        {m.state_before && ` · ${m.state_before}`}
                        {m.state_after  && ` → ${m.state_after}`}
                      </div>
                    </div>
                    <span style={{ fontSize:10, color: TEXT_DIM, flexShrink:0 }}>
                      {fmtDate(m.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAGE ──────────────────────────────────────────────────────────────────────
export default function SystemMonitoringPage() {
  return (
    <div style={{ padding:"28px 24px", maxWidth:1100, margin:"0 auto" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:800,
          color:"#fff", margin:0, lineHeight:1.2 }}>System Monitoring</h1>
        <p style={{ fontSize:13, color: TEXT_DIM, marginTop:6 }}>
          Payment gateway errors · WhatsApp bot activity
        </p>
      </div>
      <PaymentAlertsPanel />
      <WhatsappActivityPanel />
    </div>
  );
}
