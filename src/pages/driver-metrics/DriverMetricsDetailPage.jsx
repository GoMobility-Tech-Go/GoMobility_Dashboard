import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, AlertTriangle, WifiOff, PowerOff, Clock,
  Star, IndianRupee, Car, Activity, BarChart2, MapPin,
  Calendar, Coffee, TrendingUp, CheckCircle, XCircle, X,
} from "lucide-react";
import {
  MapContainer, TileLayer, Polyline, CircleMarker, Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as RTooltip, CartesianGrid, LineChart, Line,
} from "recharts";
import {
  getDMDriverOverview,
  getDMDriverSessions,
  getDMDriverDaily,
  getDMDriverStats,
  getDMDriverTimeline,
  getDMDriverLocationHistory,
  getDMDriverBreaks,
  forceOffline,
} from "../../api/driverMetrics";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtRupee  = (n) => n!=null ? "₹"+new Intl.NumberFormat("en-IN").format(Math.round(n)) : "—";
const fmtNum    = (n) => n!=null ? new Intl.NumberFormat("en-IN").format(n) : "—";
const fmtRate   = (v) => v===null||v===undefined ? "—" : Number(v).toFixed(1)+"%";
const fmtDate   = (d) => d ? new Date(d).toLocaleString("en-IN",{ day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit" }) : "—";
const fmtDateOnly = (d) => d ? new Date(d).toLocaleDateString("en-IN",{ day:"2-digit",month:"short",year:"numeric" }) : "—";
const fmtTime   = (d) => d ? new Date(d).toLocaleTimeString("en-IN",{ hour:"2-digit",minute:"2-digit" }) : "—";
const fmtMins   = (m) => m!=null ? `${Math.floor(m/60)}h ${m%60}m` : "—";
const todayIso  = () => new Date().toISOString().split("T")[0];

const VT_COLORS = { bike:"#60a5fa",auto:"#D4AF37",car:"#4ade80",xl:"#a78bfa",premium:"#f59e0b",luxury:"#f87171" };
const STATUS_CFG = {
  online:  { dot:"#22c55e", bg:"rgba(34,197,94,0.1)",  border:"rgba(34,197,94,0.28)",  label:"Online"  },
  on_ride: { dot:"#60a5fa", bg:"rgba(96,165,250,0.1)", border:"rgba(96,165,250,0.28)", label:"On Ride" },
  offline: { dot:"#4b5563", bg:"rgba(75,85,99,0.1)",   border:"rgba(75,85,99,0.22)",   label:"Offline" },
};
const TIMELINE_ICONS = {
  went_online:     { icon:"🟢", color:"#22c55e" },
  went_offline:    { icon:"⚫", color:"#4b5563" },
  ride_accepted:   { icon:"✅", color:"#60a5fa" },
  ride_started:    { icon:"🚗", color:"#60a5fa" },
  ride_completed:  { icon:"🏁", color:"#4ade80" },
  ride_cancelled:  { icon:"❌", color:"#f87171" },
  break_started:   { icon:"☕", color:"#D4AF37" },
  break_ended:     { icon:"▶️", color:"#D4AF37" },
  forced_offline:  { icon:"⚡", color:"#f87171" },
};

const PERIOD_OPTS = [
  { label:"7 days",     value:"7d"    },
  { label:"14 days",    value:"14d"   },
  { label:"30 days",    value:"30d"   },
  { label:"This month", value:"month" },
];
const TABS = [
  { id:"overview",   label:"Overview",        icon:Activity  },
  { id:"sessions",   label:"Sessions",        icon:Clock     },
  { id:"daily",      label:"Daily / Chart",   icon:BarChart2 },
  { id:"stats",      label:"Stats",           icon:TrendingUp},
  { id:"timeline",   label:"Timeline",        icon:Calendar  },
  { id:"trail",      label:"Location Trail",  icon:MapPin    },
  { id:"breaks",     label:"Breaks",          icon:Coffee    },
];

// ── styles ────────────────────────────────────────────────────────────────────
const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Outfit:wght@300;400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box}
    @keyframes dmPulse{0%,100%{opacity:1}50%{opacity:.35}}
    @keyframes fup{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fup{animation:fup .38s cubic-bezier(.22,1,.36,1) both}
    .dm-skel{display:inline-block;border-radius:6px;background:rgba(255,255,255,0.06);animation:dmPulse 1.4s ease-in-out infinite}
    .dm-card{background:linear-gradient(145deg,rgba(255,255,255,0.048),rgba(255,255,255,0.012));border:1px solid rgba(212,175,55,0.15);border-radius:18px;position:relative;overflow:hidden}
    .dm-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.35),transparent)}
    .dm-tab{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1px solid transparent;cursor:pointer;font-family:'Outfit',sans-serif;font-size:12.5px;font-weight:500;transition:all .18s;white-space:nowrap;background:none}
    .dm-tab.on{background:rgba(212,175,55,0.12);border-color:rgba(212,175,55,0.35);color:#D4AF37}
    .dm-tab:not(.on){border-color:rgba(255,255,255,0.07);color:rgba(255,255,255,0.45)}
    .dm-tab:not(.on):hover{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.7)}
    .dm-inp{background:rgba(255,255,255,0.06);border:1px solid rgba(212,175,55,0.15);border-radius:10px;padding:8px 12px;color:#fff;font-size:13px;outline:none;font-family:'Outfit',sans-serif;height:36px;transition:border-color .2s}
    .dm-inp:focus{border-color:rgba(212,175,55,0.4)}
    .dm-inp option{background:#020d26}
    .dm-tr td{border-bottom:1px solid rgba(255,255,255,0.04)!important}
    .leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#020d26!important;border:1px solid rgba(212,175,55,0.25)!important;color:#fff!important}
    .leaflet-popup-content{margin:10px 14px!important;font-family:'Outfit',sans-serif!important}
    .recharts-cartesian-axis-tick-value{font-family:'Outfit',sans-serif;fill:rgba(255,255,255,0.4)!important}
  `}</style>
);

// ── shared atoms ──────────────────────────────────────────────────────────────
const Skel = ({ w="80%", h=14 }) => <span className="dm-skel" style={{ width:w,height:h }}/>;

const StatusPill = ({ status }) => {
  const c = STATUS_CFG[status]||STATUS_CFG.offline;
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:5,background:c.bg,border:`1px solid ${c.border}`,borderRadius:999,padding:"4px 10px",fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.9)" }}>
      <span style={{ width:7,height:7,borderRadius:"50%",background:c.dot,flexShrink:0 }}/>{c.label}
    </span>
  );
};

const ConnBadge = ({ conn }) => {
  if (!conn?.isOnlineButAppDisconnected) return null;
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:4,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.32)",color:"#F59E0B",borderRadius:999,padding:"3px 8px",fontSize:11,fontWeight:600 }}>
      <AlertTriangle size={10}/> Ghost Driver — app disconnected
    </span>
  );
};

const VtBadge = ({ types=[] }) => {
  const list = Array.isArray(types)?types:[types].filter(Boolean);
  return (
    <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
      {list.map(t=>(
        <span key={t} style={{ background:`${VT_COLORS[t]||"#94a3b8"}22`,border:`1px solid ${VT_COLORS[t]||"#94a3b8"}55`,color:VT_COLORS[t]||"#94a3b8",borderRadius:6,padding:"2px 7px",fontSize:11,fontWeight:600,textTransform:"uppercase" }}>{t}</span>
      ))}
    </div>
  );
};

const StatCard = ({ label, value, color, sub, loading }) => (
  <div className="dm-card" style={{ padding:"16px 18px" }}>
    <p style={{ margin:"0 0 4px",fontSize:10,color:"rgba(212,175,55,0.5)",fontFamily:"'Cinzel',serif",letterSpacing:1.5,textTransform:"uppercase" }}>{label}</p>
    <p style={{ margin:0,fontSize:22,fontWeight:700,fontFamily:"'Cinzel',serif",color:color||"#fff",lineHeight:1.1 }}>
      {loading ? <Skel w={60} h={20}/> : value??"—"}
    </p>
    {sub&&<p style={{ margin:"4px 0 0",fontSize:11,color:"rgba(255,255,255,0.35)" }}>{sub}</p>}
  </div>
);

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed",bottom:28,right:28,zIndex:9999,background:type==="error"?"#7f1d1d":"#14532d",border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`,borderRadius:12,padding:"12px 20px",color:"#fff",fontSize:13,fontFamily:"Outfit,sans-serif",display:"flex",alignItems:"center",gap:12,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",maxWidth:360 }}>
  <span style={{ flex:1 }}>{msg}</span>
  <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.5)",cursor:"pointer",padding:0 }}><X size={14}/></button>
  </div>
);

const CTooltip = ({ active, payload, label, fmt }) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:"rgba(2,13,38,0.97)",border:"1px solid rgba(212,175,55,0.22)",borderRadius:10,padding:"9px 12px" }}>
      {label&&<p style={{ margin:"0 0 4px",fontSize:10,color:"rgba(212,175,55,0.55)",fontFamily:"Outfit,sans-serif" }}>{label}</p>}
      {payload.map((p,i)=>(
        <p key={i} style={{ margin:0,fontSize:12,color:"#fff",fontWeight:600,fontFamily:"Outfit,sans-serif" }}>
          {p.name||p.dataKey}: {fmt?fmt(p.value):p.value}
        </p>
      ))}
    </div>
  );
};

const thS = { padding:"10px 14px",textAlign:"left",fontFamily:"'Cinzel',serif",fontSize:10,fontWeight:600,color:"rgba(212,175,55,0.6)",letterSpacing:1.2,textTransform:"uppercase",whiteSpace:"nowrap" };
const tdS = { padding:"12px 14px",color:"rgba(255,255,255,0.8)",fontFamily:"'Outfit',sans-serif",fontSize:13 };

// ── Force Offline confirm modal ───────────────────────────────────────────────
const ForceOfflineModal = ({ name, onConfirm, onCancel, loading }) => (
  <div style={{ position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
    <div style={{ background:"#020d26",border:"1px solid rgba(239,68,68,0.3)",borderRadius:20,padding:28,width:380,maxWidth:"95vw" }}>
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
        <div style={{ width:40,height:40,borderRadius:12,background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <PowerOff size={18} color="#f87171"/>
        </div>
        <h3 style={{ fontFamily:"'Cinzel',serif",color:"#fff",fontSize:15,margin:0 }}>Force Offline</h3>
      </div>
      <p style={{ fontSize:13,color:"rgba(255,255,255,0.6)",fontFamily:"Outfit,sans-serif",margin:"0 0 20px",lineHeight:1.5 }}>
        Are you sure you want to force <strong style={{ color:"#fff" }}>{name||"this driver"}</strong> offline? Their duty toggle will be turned off remotely.
      </p>
      <div style={{ display:"flex",gap:10 }}>
        <button onClick={onCancel} disabled={loading} style={{ flex:1,height:40,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:13,fontFamily:"Outfit,sans-serif" }}>Cancel</button>
        <button onClick={onConfirm} disabled={loading} style={{ flex:1,height:40,background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:10,color:"#f87171",cursor:"pointer",fontSize:13,fontFamily:"Outfit,sans-serif",fontWeight:600,opacity:loading?.6:1 }}>
          {loading?"Forcing…":"Force Offline"}
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  TAB 1 — Overview
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({ driverId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setLoading(true); setErr(null);
    getDMDriverOverview(driverId)
      .then(r => setData(r.data?.data||r.data||null))
      .catch(e => setErr(e?.response?.data?.message||"Failed to load overview"))
      .finally(() => setLoading(false));
  }, [driverId]);

  if (err) return <p style={{ color:"#f87171",fontFamily:"Outfit,sans-serif",fontSize:13 }}>{err}</p>;

  const d = data||{};

  return (
    <div>
      {/* Stats grid */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12,marginBottom:20 }}>
        <StatCard label="Today Rides"      value={fmtNum(d.today_rides??d.rides_today)}                 loading={loading}/>
        <StatCard label="Today Earnings"   value={fmtRupee(d.today_earnings??d.earnings_today)}  color="#D4AF37"  loading={loading}/>
        <StatCard label="Acceptance Rate"  value={fmtRate(d.acceptance_rate)}  color={d.acceptance_rate>=80?"#22c55e":d.acceptance_rate>=60?"#D4AF37":"#f87171"} loading={loading}/>
        <StatCard label="Completion Rate"  value={fmtRate(d.completion_rate)}  color={d.completion_rate>=90?"#22c55e":d.completion_rate>=75?"#D4AF37":"#f87171"} loading={loading}/>
        <StatCard label="Online Hours"     value={d.online_hours_today!=null?Number(d.online_hours_today).toFixed(1)+"h":"—"} color="#a78bfa" loading={loading}/>
        <StatCard label="Rating"           value={d.rating!=null?Number(d.rating).toFixed(1)+" ★":"—"}   color="#D4AF37"  loading={loading}/>
        <StatCard label="Total Rides"      value={fmtNum(d.total_rides)}                                  loading={loading}/>
        <StatCard label="Total Earnings"   value={fmtRupee(d.total_earnings)}  color="#D4AF37"  loading={loading}/>
      </div>

      {/* Current session (if online) */}
      {!loading && (d.status==="online"||d.status==="on_ride") && d.current_session && (
        <div className="dm-card" style={{ padding:"16px 20px",marginBottom:16 }}>
          <p style={{ fontFamily:"'Cinzel',serif",fontSize:11,color:"rgba(212,175,55,0.55)",letterSpacing:1.2,textTransform:"uppercase",margin:"0 0 12px" }}>Current Session</p>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12 }}>
            {[
              { label:"Session Start",   value:fmtTime(d.current_session.started_at) },
              { label:"Rides So Far",    value:fmtNum(d.current_session.rides) },
              { label:"Earnings",        value:fmtRupee(d.current_session.earnings), color:"#D4AF37" },
              { label:"Duration",        value:fmtMins(d.current_session.duration_minutes) },
            ].map(({ label,value,color })=>(
              <div key={label}>
                <p style={{ margin:"0 0 2px",fontSize:10,color:"rgba(255,255,255,0.35)",fontFamily:"Outfit,sans-serif" }}>{label}</p>
                <p style={{ margin:0,fontSize:16,fontWeight:600,fontFamily:"'Cinzel',serif",color:color||"#fff" }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last location */}
      {!loading && d.last_location && (
        <div className="dm-card" style={{ padding:"14px 20px" }}>
          <p style={{ fontFamily:"'Cinzel',serif",fontSize:11,color:"rgba(212,175,55,0.55)",letterSpacing:1.2,textTransform:"uppercase",margin:"0 0 6px" }}>Last Known Location</p>
          <p style={{ margin:0,fontSize:13,color:"rgba(255,255,255,0.55)",fontFamily:"Outfit,sans-serif" }}>
            {d.last_location.lat?.toFixed(5)}, {d.last_location.lng?.toFixed(5)}
            {d.last_location.timestamp&&<span style={{ marginLeft:12,fontSize:11,color:"rgba(255,255,255,0.3)" }}>· {fmtDate(d.last_location.timestamp)}</span>}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB 2 — Sessions
// ─────────────────────────────────────────────────────────────────────────────
function SessionsTab({ driverId }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getDMDriverSessions(driverId,{ period,limit:LIMIT,offset });
      const d = r.data?.data||r.data||{};
      setSessions(d.sessions||[]);
      setTotal(d.pagination?.total||d.total||0);
    } catch { setSessions([]); } finally { setLoading(false); }
  }, [driverId,period,offset]);

  useEffect(()=>{ setOffset(0); },[period]);
  useEffect(()=>{ load(); },[load]);

  return (
    <div>
      <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:16,flexWrap:"wrap" }}>
        <select className="dm-inp" value={period} onChange={e=>setPeriod(e.target.value)} style={{ cursor:"pointer" }}>
          {PERIOD_OPTS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {total>0&&<span style={{ fontSize:12,color:"rgba(255,255,255,0.35)",marginLeft:6 }}>{fmtNum(total)} sessions</span>}
      </div>
      <div className="dm-card" style={{ overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"rgba(212,175,55,0.05)",borderBottom:"1px solid rgba(212,175,55,0.1)" }}>
                {["Date","Start","End","Duration","Rides","Earnings","Status"].map(h=><th key={h} style={thS}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:8}).map((_,i)=>(
                <tr key={i} className="dm-tr">{[80,60,60,60,50,80,70].map((w,j)=><td key={j} style={tdS}><Skel w={w}/></td>)}</tr>
              )) : sessions.length===0 ? (
                <tr><td colSpan={7} style={{ ...tdS,textAlign:"center",padding:"40px",color:"rgba(255,255,255,0.25)",fontStyle:"italic" }}>No sessions found</td></tr>
              ) : sessions.map((s,i)=>(
                <tr key={s.id||i} className="dm-tr">
                  <td style={tdS}>{fmtDateOnly(s.started_at||s.start_time)}</td>
                  <td style={tdS}>{fmtTime(s.started_at||s.start_time)}</td>
                  <td style={tdS}>{s.ended_at||s.end_time ? fmtTime(s.ended_at||s.end_time) : <span style={{ color:"#22c55e",fontSize:11 }}>Active</span>}</td>
                  <td style={tdS}>{fmtMins(s.duration_minutes||s.duration)}</td>
                  <td style={{ ...tdS,fontVariantNumeric:"tabular-nums" }}>{fmtNum(s.rides||s.total_rides)}</td>
                  <td style={{ ...tdS,color:"#D4AF37",fontWeight:600,fontVariantNumeric:"tabular-nums" }}>{fmtRupee(s.earnings||s.total_earnings)}</td>
                  <td style={tdS}>
                    {s.status==="active"
                      ? <span style={{ color:"#22c55e",fontSize:11,fontWeight:600 }}>● Active</span>
                      : <span style={{ color:"rgba(255,255,255,0.35)",fontSize:11 }}>Ended</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total>LIMIT&&(
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderTop:"1px solid rgba(212,175,55,0.08)" }}>
            <span style={{ fontSize:11,color:"rgba(255,255,255,0.3)" }}>Page {Math.floor(offset/LIMIT)+1} / {Math.ceil(total/LIMIT)}</span>
            <div style={{ display:"flex",gap:6 }}>
              <button disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-LIMIT))} style={{ height:30,padding:"0 12px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,color:offset===0?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.6)",cursor:offset===0?"default":"pointer",fontSize:12,fontFamily:"Outfit,sans-serif" }}>Prev</button>
              <button disabled={offset+LIMIT>=total} onClick={()=>setOffset(offset+LIMIT)} style={{ height:30,padding:"0 12px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,color:offset+LIMIT>=total?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.6)",cursor:offset+LIMIT>=total?"default":"pointer",fontSize:12,fontFamily:"Outfit,sans-serif" }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB 3 — Daily / Chart
// ─────────────────────────────────────────────────────────────────────────────
function DailyTab({ driverId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getDMDriverDaily(driverId,{ period });
      const d = r.data?.data||r.data||{};
      setData(d.daily||d.rows||[]);
    } catch { setData([]); } finally { setLoading(false); }
  }, [driverId,period]);

  useEffect(()=>{ load(); },[load]);

  const fmtDay = (d) => d ? new Date(d).toLocaleDateString("en-IN",{ day:"2-digit",month:"short" }) : "";

  return (
    <div>
      <div style={{ display:"flex",gap:8,marginBottom:16 }}>
        <select className="dm-inp" value={period} onChange={e=>setPeriod(e.target.value)} style={{ cursor:"pointer" }}>
          {PERIOD_OPTS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display:"grid",gap:16 }}>
          {[1,2].map(i=><div key={i} className="dm-card" style={{ height:220,padding:20 }}><Skel w="40%" h={12}/></div>)}
        </div>
      ) : data.length===0 ? (
        <div className="dm-card" style={{ padding:"48px 16px",textAlign:"center",color:"rgba(255,255,255,0.25)",fontStyle:"italic",fontSize:13,fontFamily:"Outfit,sans-serif" }}>No daily data for this period</div>
      ) : (
        <div style={{ display:"grid",gap:16 }}>
          {/* Rides chart */}
          <div className="dm-card" style={{ padding:"20px 20px 12px" }}>
            <p style={{ fontFamily:"'Cinzel',serif",fontSize:11,color:"rgba(212,175,55,0.55)",letterSpacing:1.2,textTransform:"uppercase",margin:"0 0 16px" }}>Daily Rides</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data} margin={{ top:4,right:12,left:0,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="date" tick={{ fontSize:10 }} tickFormatter={fmtDay}/>
                <YAxis tick={{ fontSize:10 }}/>
                <RTooltip content={<CTooltip fmt={fmtNum}/>} labelFormatter={fmtDay}/>
                <Bar dataKey="rides" name="Rides" fill="#60a5fa" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Earnings chart */}
          <div className="dm-card" style={{ padding:"20px 20px 12px" }}>
            <p style={{ fontFamily:"'Cinzel',serif",fontSize:11,color:"rgba(212,175,55,0.55)",letterSpacing:1.2,textTransform:"uppercase",margin:"0 0 16px" }}>Daily Earnings</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={{ top:4,right:12,left:0,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="date" tick={{ fontSize:10 }} tickFormatter={fmtDay}/>
                <YAxis tick={{ fontSize:10 }} tickFormatter={v=>"₹"+(v>=1000?(v/1000).toFixed(0)+"K":v)}/>
                <RTooltip content={<CTooltip fmt={fmtRupee}/>} labelFormatter={fmtDay}/>
                <Line type="monotone" dataKey="earnings" name="Earnings" stroke="#D4AF37" strokeWidth={2} dot={{ fill:"#D4AF37",r:3 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Summary table */}
          <div className="dm-card" style={{ overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"rgba(212,175,55,0.05)",borderBottom:"1px solid rgba(212,175,55,0.1)" }}>
                    {["Date","Rides","Earnings","Online Hours","Acceptance %","Completion %"].map(h=><th key={h} style={thS}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.map((r,i)=>(
                    <tr key={i} className="dm-tr">
                      <td style={tdS}>{fmtDay(r.date)}</td>
                      <td style={{ ...tdS,fontVariantNumeric:"tabular-nums" }}>{fmtNum(r.rides)}</td>
                      <td style={{ ...tdS,color:"#D4AF37",fontWeight:600,fontVariantNumeric:"tabular-nums" }}>{fmtRupee(r.earnings)}</td>
                      <td style={tdS}>{r.online_hours!=null?Number(r.online_hours).toFixed(1)+"h":"—"}</td>
                      <td style={{ ...tdS,color:fmtRate(r.acceptance_rate)==="—"?"rgba(255,255,255,0.35)":r.acceptance_rate>=80?"#22c55e":r.acceptance_rate>=60?"#D4AF37":"#f87171" }}>{fmtRate(r.acceptance_rate)}</td>
                      <td style={{ ...tdS,color:fmtRate(r.completion_rate)==="—"?"rgba(255,255,255,0.35)":r.completion_rate>=90?"#22c55e":r.completion_rate>=75?"#D4AF37":"#f87171" }}>{fmtRate(r.completion_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB 4 — Stats
// ─────────────────────────────────────────────────────────────────────────────
function StatsTab({ driverId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getDMDriverStats(driverId,{ period });
      setData(r.data?.data||r.data||null);
    } catch { setData(null); } finally { setLoading(false); }
  }, [driverId,period]);

  useEffect(()=>{ load(); },[load]);
  const d = data||{};

  return (
    <div>
      <div style={{ display:"flex",gap:8,marginBottom:16 }}>
        <select className="dm-inp" value={period} onChange={e=>setPeriod(e.target.value)} style={{ cursor:"pointer" }}>
          {PERIOD_OPTS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12 }}>
        {[
          { label:"Total Rides",         value:fmtNum(d.total_rides),                                                                     color:"#fff"    },
          { label:"Total Earnings",      value:fmtRupee(d.total_earnings),                                                                color:"#D4AF37" },
          { label:"Acceptance Rate",     value:fmtRate(d.acceptance_rate),  color:d.acceptance_rate>=80?"#22c55e":d.acceptance_rate>=60?"#D4AF37":"#f87171" },
          { label:"Completion Rate",     value:fmtRate(d.completion_rate),  color:d.completion_rate>=90?"#22c55e":d.completion_rate>=75?"#D4AF37":"#f87171" },
          { label:"Total Online Hours",  value:d.total_online_hours!=null?Number(d.total_online_hours).toFixed(1)+"h":"—",                color:"#a78bfa" },
          { label:"Avg Ride Duration",   value:fmtMins(d.avg_ride_duration_minutes),                                                      color:"#fff"    },
          { label:"Total Break Time",    value:fmtMins(d.total_break_minutes),                                                            color:"#D4AF37" },
          { label:"Avg Response Time",   value:d.avg_response_seconds!=null?d.avg_response_seconds+"s":"—",                              color:"#fff"    },
          { label:"Cancellation Rate",   value:fmtRate(d.cancellation_rate), color:d.cancellation_rate<10?"#22c55e":d.cancellation_rate<25?"#D4AF37":"#f87171" },
          { label:"Rating",              value:d.rating!=null?Number(d.rating).toFixed(2)+" ★":"—",                                      color:"#D4AF37" },
        ].map(({ label,value,color })=>(
          <StatCard key={label} label={label} value={value} color={color} loading={loading}/>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB 5 — Timeline
// ─────────────────────────────────────────────────────────────────────────────
function TimelineTab({ driverId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayIso());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getDMDriverTimeline(driverId,{ date });
      const d = r.data?.data||r.data||{};
      setEvents(d.events||d.timeline||[]);
    } catch { setEvents([]); } finally { setLoading(false); }
  }, [driverId,date]);

  useEffect(()=>{ load(); },[load]);

  return (
    <div>
      <div style={{ display:"flex",gap:8,marginBottom:20,alignItems:"center" }}>
        <input type="date" className="dm-inp" value={date} onChange={e=>setDate(e.target.value)} max={todayIso()}/>
        <span style={{ fontSize:12,color:"rgba(255,255,255,0.35)",fontFamily:"Outfit,sans-serif" }}>IST</span>
      </div>

      {loading ? (
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {Array.from({length:6}).map((_,i)=>(
            <div key={i} style={{ display:"flex",gap:12,alignItems:"flex-start" }}>
              <Skel w={28} h={28}/>
              <div style={{ flex:1 }}><Skel w="40%" h={12}/><br/><br/><Skel w="25%" h={10}/></div>
            </div>
          ))}
        </div>
      ) : events.length===0 ? (
        <div className="dm-card" style={{ padding:"48px 16px",textAlign:"center",color:"rgba(255,255,255,0.25)",fontStyle:"italic",fontSize:13,fontFamily:"Outfit,sans-serif" }}>No events for {new Date(date+"T00:00:00").toLocaleDateString("en-IN",{ day:"2-digit",month:"long",year:"numeric" })}</div>
      ) : (
        <div style={{ position:"relative",paddingLeft:20 }}>
          {/* vertical line */}
          <div style={{ position:"absolute",left:9,top:12,bottom:12,width:2,background:"rgba(212,175,55,0.15)",borderRadius:2 }}/>
          <div style={{ display:"flex",flexDirection:"column",gap:0 }}>
            {events.map((ev,i)=>{
              const cfg = TIMELINE_ICONS[ev.type]||{ icon:"•",color:"rgba(255,255,255,0.4)" };
              return (
                <div key={i} style={{ display:"flex",gap:16,alignItems:"flex-start",paddingBottom:20,position:"relative" }}>
                  <div style={{ width:20,height:20,borderRadius:"50%",background:"#020d26",border:`2px solid ${cfg.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0,zIndex:1 }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex:1,paddingTop:1 }}>
                    <p style={{ margin:"0 0 2px",fontSize:13,fontWeight:600,color:"#fff",fontFamily:"Outfit,sans-serif",textTransform:"capitalize" }}>
                      {(ev.type||"event").replace(/_/g," ")}
                    </p>
                    {ev.description&&<p style={{ margin:"0 0 3px",fontSize:12,color:"rgba(255,255,255,0.5)",fontFamily:"Outfit,sans-serif" }}>{ev.description}</p>}
                    <p style={{ margin:0,fontSize:11,color:"rgba(255,255,255,0.28)",fontFamily:"Outfit,sans-serif" }}>{fmtTime(ev.timestamp||ev.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB 6 — Location Trail
// ─────────────────────────────────────────────────────────────────────────────
function LocationTrailTab({ driverId }) {
  const [trail,   setTrail]   = useState([]);
  const [meta,    setMeta]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [date,    setDate]    = useState(todayIso());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getDMDriverLocationHistory(driverId,{ date });
      const d = r.data?.data||r.data||{};
      setTrail(d.pings||d.points||d.trail||[]);
      setMeta(d.meta||null);
    } catch { setTrail([]); } finally { setLoading(false); }
  }, [driverId,date]);

  useEffect(()=>{ load(); },[load]);

  const positions = trail
    .map(p=>[(p.lat??p.latitude),(p.lng??p.longitude)])
    .filter(([lat,lng])=>lat&&lng);

  const center = positions.length>0 ? positions[Math.floor(positions.length/2)] : [20.5937,78.9629];

  return (
    <div>
      <div style={{ display:"flex",gap:8,marginBottom:16,alignItems:"center",flexWrap:"wrap" }}>
        <input type="date" className="dm-inp" value={date} onChange={e=>setDate(e.target.value)} max={todayIso()}/>
        {meta&&(
          <div style={{ display:"flex",gap:16,marginLeft:8 }}>
            {[
              { label:"Total Pings",   value:fmtNum(meta.total_pings||trail.length) },
              { label:"Distance",      value:meta.distance_km!=null?Number(meta.distance_km).toFixed(1)+" km":"—" },
              { label:"Span",          value:meta.duration ? fmtMins(Math.round(meta.duration/60)) : "—" },
            ].map(({ label,value })=>(
              <span key={label} style={{ fontSize:12,color:"rgba(255,255,255,0.45)",fontFamily:"Outfit,sans-serif" }}>
                <span style={{ color:"rgba(212,175,55,0.55)" }}>{label}: </span>{value}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="dm-card" style={{ height:460,overflow:"hidden" }}>
        {loading ? (
          <div style={{ height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12 }}>
            <div style={{ width:28,height:28,border:"3px solid rgba(212,175,55,0.3)",borderTopColor:"#D4AF37",borderRadius:"50%",animation:"spin 0.9s linear infinite" }}/>
            <p style={{ color:"rgba(255,255,255,0.3)",fontSize:13,fontFamily:"Outfit,sans-serif",margin:0 }}>Loading trail…</p>
          </div>
        ) : positions.length===0 ? (
          <div style={{ height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8 }}>
            <MapPin size={32} color="rgba(212,175,55,0.25)"/>
            <p style={{ color:"rgba(255,255,255,0.25)",fontSize:13,fontFamily:"Outfit,sans-serif",margin:0 }}>No location pings for {date}</p>
          </div>
        ) : (
          <MapContainer center={center} zoom={13} style={{ height:"100%",width:"100%",background:"#020d26" }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />
            {/* Route polyline */}
            <Polyline positions={positions} pathOptions={{ color:"#D4AF37",weight:3,opacity:0.75 }}/>
            {/* Start marker */}
            {positions.length>0&&(
              <CircleMarker center={positions[0]} radius={8} pathOptions={{ color:"#22c55e",fillColor:"#22c55e",fillOpacity:0.9,weight:2 }}>
                <Popup><span style={{ color:"#22c55e",fontWeight:600 }}>Start</span></Popup>
              </CircleMarker>
            )}
            {/* End marker */}
            {positions.length>1&&(
              <CircleMarker center={positions[positions.length-1]} radius={8} pathOptions={{ color:"#f87171",fillColor:"#f87171",fillOpacity:0.9,weight:2 }}>
                <Popup><span style={{ color:"#f87171",fontWeight:600 }}>End / Last Ping</span></Popup>
              </CircleMarker>
            )}
            {/* Sample intermediate pings (every 10th to avoid clutter) */}
            {positions.filter((_,i)=>i%10===0&&i!==0&&i!==positions.length-1).map((p,i)=>(
              <CircleMarker key={i} center={p} radius={3} pathOptions={{ color:"#D4AF37",fillColor:"#D4AF37",fillOpacity:0.6,weight:1 }}/>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB 7 — Breaks
// ─────────────────────────────────────────────────────────────────────────────
function BreaksTab({ driverId }) {
  const [breaks,  setBreaks]  = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState("7d");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getDMDriverBreaks(driverId,{ period });
      const d = r.data?.data||r.data||{};
      setBreaks(d.breaks||d.rows||[]);
      setSummary(d.summary||null);
    } catch { setBreaks([]); } finally { setLoading(false); }
  }, [driverId,period]);

  useEffect(()=>{ load(); },[load]);

  return (
    <div>
      <div style={{ display:"flex",gap:8,marginBottom:16 }}>
        <select className="dm-inp" value={period} onChange={e=>setPeriod(e.target.value)} style={{ cursor:"pointer" }}>
          {PERIOD_OPTS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {/* Break summary */}
      {!loading&&summary&&(
        <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginBottom:16 }}>
          <StatCard label="Total Breaks"    value={fmtNum(summary.total_breaks)}                       loading={false}/>
          <StatCard label="Total Break Time" value={fmtMins(summary.total_break_minutes)}  color="#D4AF37" loading={false}/>
          <StatCard label="Compliance Rate" value={fmtRate(summary.compliance_rate)} color={summary.compliance_rate>=90?"#22c55e":summary.compliance_rate>=70?"#D4AF37":"#f87171"} loading={false}/>
          <StatCard label="Scheduled"       value={fmtNum(summary.scheduled_breaks)}                   loading={false}/>
          <StatCard label="Emergency"       value={fmtNum(summary.emergency_breaks)} color="#f87171"   loading={false}/>
        </div>
      )}

      <div className="dm-card" style={{ overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"rgba(212,175,55,0.05)",borderBottom:"1px solid rgba(212,175,55,0.1)" }}>
                {["Date","Start","End","Duration","Type","Status"].map(h=><th key={h} style={thS}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:6}).map((_,i)=>(
                <tr key={i} className="dm-tr">{[80,60,60,60,80,70].map((w,j)=><td key={j} style={tdS}><Skel w={w}/></td>)}</tr>
              )) : breaks.length===0 ? (
                <tr><td colSpan={6} style={{ ...tdS,textAlign:"center",padding:"40px",color:"rgba(255,255,255,0.25)",fontStyle:"italic" }}>No breaks found</td></tr>
              ) : breaks.map((b,i)=>(
                <tr key={b.id||i} className="dm-tr">
                  <td style={tdS}>{fmtDateOnly(b.started_at||b.start_time)}</td>
                  <td style={tdS}>{fmtTime(b.started_at||b.start_time)}</td>
                  <td style={tdS}>{b.ended_at||b.end_time ? fmtTime(b.ended_at||b.end_time) : <span style={{ color:"#D4AF37",fontSize:11 }}>Active</span>}</td>
                  <td style={tdS}>{fmtMins(b.duration_minutes||b.duration)}</td>
                  <td style={tdS}>
                    <span style={{ fontSize:11,fontWeight:600,color:b.type==="emergency"?"#f87171":"#60a5fa" }}>
                      {(b.type||"scheduled").charAt(0).toUpperCase()+(b.type||"scheduled").slice(1)}
                    </span>
                  </td>
                  <td style={tdS}>
                    {b.status==="active"
                      ? <span style={{ color:"#D4AF37",fontSize:11,fontWeight:600 }}>● Active</span>
                      : <span style={{ color:"rgba(255,255,255,0.35)",fontSize:11 }}>Ended</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN PAGE — Driver Detail
// ─────────────────────────────────────────────────────────────────────────────
export default function DriverMetricsDetailPage() {
  const { driverId }  = useParams();
  const navigate      = useNavigate();
  const [tab,  setTab]   = useState("overview");
  const [driver, setDriver] = useState(null);
  const [dLoading, setDLoading] = useState(true);
  const [showForce, setShowForce] = useState(false);
  const [forcing,  setForcing]  = useState(false);
  const [toast,    setToast]    = useState(null);

  const showToast = (m,t="success") => { setToast({m,t}); setTimeout(()=>setToast(null),3500); };

  // Load driver header info (from overview)
  useEffect(() => {
    setDLoading(true);
    getDMDriverOverview(driverId)
      .then(r => setDriver(r.data?.data||r.data||null))
      .catch(()=>setDriver(null))
      .finally(()=>setDLoading(false));
  }, [driverId]);

  const handleForceOffline = async () => {
    setForcing(true);
    try {
      await forceOffline(driverId);
      showToast("Driver forced offline successfully");
      setShowForce(false);
      // Refresh header
      getDMDriverOverview(driverId).then(r=>setDriver(r.data?.data||r.data||null)).catch(()=>{});
    } catch(e) {
      showToast(e?.response?.data?.message||"Failed to force offline","error");
    } finally { setForcing(false); }
  };

  const vt = driver?.vehicle?.types || driver?.vehicle_types || [];

  return (
    <div style={{ fontFamily:"'Outfit',sans-serif",color:"#fff" }}>
      <GS/>
      {toast&&<Toast msg={toast.m} type={toast.t} onClose={()=>setToast(null)}/>}
      {showForce&&<ForceOfflineModal name={driver?.name||driver?.full_name} onConfirm={handleForceOffline} onCancel={()=>setShowForce(false)} loading={forcing}/>}

      {/* Back button */}
      <button
        onClick={()=>navigate("/driver-metrics")}
        style={{ display:"inline-flex",alignItems:"center",gap:7,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"7px 14px",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:13,fontFamily:"Outfit,sans-serif",marginBottom:20 }}
      >
        <ArrowLeft size={13}/> Back to Driver Metrics
      </button>

      {/* ── Driver header card ── */}
      <div className="dm-card" style={{ padding:"20px 24px",marginBottom:24 }}>
        <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap" }}>
          <div style={{ flex:1,minWidth:200 }}>
            {/* Name */}
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:8,flexWrap:"wrap" }}>
              <h2 style={{ fontFamily:"'Cinzel',serif",fontSize:"clamp(16px,2vw,22px)",fontWeight:700,color:"#fff",margin:0 }}>
                {dLoading ? <Skel w={180} h={20}/> : driver?.name||driver?.full_name||`Driver #${driverId}`}
              </h2>
              {!dLoading&&driver&&<StatusPill status={driver.status}/>}
              {!dLoading&&driver&&<ConnBadge conn={driver.connection}/>}
            </div>

            {/* Phone + GO ID */}
            {!dLoading&&driver&&(
              <div style={{ display:"flex",gap:20,flexWrap:"wrap",marginBottom:10 }}>
                {driver.phone&&<span style={{ fontSize:13,color:"rgba(255,255,255,0.5)" }}>{driver.phone||driver.phone_number}</span>}
                {driver.go_id&&<span style={{ fontSize:12,color:"rgba(212,175,55,0.5)" }}>{driver.go_id}</span>}
                {driver.city&&<span style={{ fontSize:12,color:"rgba(255,255,255,0.35)" }}>📍 {driver.city}</span>}
              </div>
            )}

            {/* Vehicle types */}
            {!dLoading&&vt.length>0&&<VtBadge types={vt}/>}
          </div>

          {/* Force offline button */}
          <button
            onClick={()=>setShowForce(true)}
            style={{ height:38,padding:"0 16px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,color:"#f87171",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:7,fontSize:13,fontFamily:"Outfit,sans-serif",fontWeight:500,whiteSpace:"nowrap" }}
          >
            <PowerOff size={13}/> Force Offline
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display:"flex",gap:7,flexWrap:"wrap",marginBottom:20 }}>
        {TABS.map(t=>{
          const Icon=t.icon;
          return (
            <button key={t.id} className={`dm-tab${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}>
              <Icon size={13}/> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div key={tab} className="fup">
        {tab==="overview" && <OverviewTab      driverId={driverId}/>}
        {tab==="sessions" && <SessionsTab      driverId={driverId}/>}
        {tab==="daily"    && <DailyTab         driverId={driverId}/>}
        {tab==="stats"    && <StatsTab         driverId={driverId}/>}
        {tab==="timeline" && <TimelineTab      driverId={driverId}/>}
        {tab==="trail"    && <LocationTrailTab driverId={driverId}/>}
        {tab==="breaks"   && <BreaksTab        driverId={driverId}/>}
      </div>
    </div>
  );
}
