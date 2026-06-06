import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, ShieldCheck, ShieldX, CircleDot, X, TrendingUp } from "lucide-react";
import { getFraudAlerts, suspendDriver } from "../../api/admin";

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:400 }}>
  <span style={{ flex:1 }}>{msg}</span>
  <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

const SEV_COLORS = {
  HIGH:   { color:"#f87171", bg:"rgba(239,68,68,0.12)",   border:"rgba(239,68,68,0.3)"   },
  MEDIUM: { color:"#f59e0b", bg:"rgba(245,158,11,0.12)",  border:"rgba(245,158,11,0.3)"  },
  LOW:    { color:"#60a5fa", bg:"rgba(59,130,246,0.12)",  border:"rgba(59,130,246,0.3)"  },
};

const riskStyle = (score) => {
  if (score >= 85) return { color:"#f87171", bg:"rgba(239,68,68,0.12)",   border:"rgba(239,68,68,0.3)"   };
  if (score >= 70) return { color:"#f59e0b", bg:"rgba(245,158,11,0.12)",  border:"rgba(245,158,11,0.3)"  };
  return               { color:"#60a5fa", bg:"rgba(59,130,246,0.12)",  border:"rgba(59,130,246,0.3)"  };
};

const StatusBadge = ({ status }) => {
  const m = { flagged:{color:"#f87171",bg:"rgba(239,68,68,0.1)"}, investigating:{color:"#f59e0b",bg:"rgba(245,158,11,0.1)"}, reviewing:{color:"#60a5fa",bg:"rgba(59,130,246,0.1)"} };
  const s = m[status] || { color:"rgba(255,255,255,0.5)", bg:"rgba(255,255,255,0.06)" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:s.bg, color:s.color, textTransform:"capitalize" }}>
      <CircleDot size={9} />{status || "flagged"}
    </span>
  );
};

const TH = ({ c }) => <th style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", borderBottom:"1px solid rgba(212,175,55,0.1)", whiteSpace:"nowrap" }}>{c}</th>;
const TD = ({ children, style }) => <td style={{ padding:"14px 16px", fontSize:13, color:"rgba(255,255,255,0.8)", borderBottom:"1px solid rgba(255,255,255,0.04)", ...style }}>{children}</td>;

export default function FraudDetectionPage() {
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [severity, setSeverity] = useState("HIGH");
  const [acting, setActing]     = useState({});
  const [toast, setToast]       = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const load = useCallback(() => {
    setLoading(true);
    getFraudAlerts({ severity })
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setAlerts(d.alerts || d.items || (Array.isArray(d) ? d : []));
      })
      .catch(() => showToast("Failed to load fraud alerts.", "error"))
      .finally(() => setLoading(false));
  }, [severity]);

  useEffect(() => { load(); }, [load]);

  const handleSuspend = async (userId, name) => {
    const reason = window.prompt(`Reason for suspending ${name || "this driver"}:`);
    if (!reason) return;
    setActing((p) => ({ ...p, [userId]: true }));
    try {
      await suspendDriver(userId, reason);
      showToast(`${name || "Driver"} suspended.`);
      setAlerts((prev) => prev.map((a) => {
        const uid = a.driver?.id || a.driver_id || a.user_id;
        return uid === userId ? { ...a, status:"investigating" } : a;
      }));
    } catch (err) {
      showToast(err.response?.data?.message || "Suspend failed.", "error");
    } finally {
      setActing((p) => ({ ...p, [userId]: false }));
    }
  };

  const flagged       = alerts.filter(a => (a.status || "flagged") === "flagged").length;
  const investigating = alerts.filter(a => a.status === "investigating").length;
  const highRisk      = alerts.filter(a => (a.risk_score ?? a.riskScore ?? 0) >= 85).length;

  const summaryCards = [
    { label:"Total Alerts",  value:loading?"—":String(alerts.length),  color:"#f87171", icon:AlertTriangle },
    { label:"Flagged",        value:loading?"—":String(flagged),         color:"#f87171", icon:AlertTriangle },
    { label:"Investigating",  value:loading?"—":String(investigating),   color:"#f59e0b", icon:ShieldCheck   },
    { label:"High Risk (85+)",value:loading?"—":String(highRisk),        color:"#f87171", icon:TrendingUp    },
  ];

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Fraud Detection</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Monitor suspicious activity and risk alerts</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:14, marginBottom:24 }}>
        {summaryCards.map(({ label, value, color, icon:Icon }) => (
          <div key={label} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${color}20`, borderRadius:14, padding:"18px 20px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color},transparent)` }} />
            <div style={{ width:32, height:32, borderRadius:10, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
              <Icon size={15} color={color} />
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:24, fontWeight:700, color:"#fff" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Severity Filter */}
      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        {["HIGH","MEDIUM","LOW"].map((s) => {
          const sc = SEV_COLORS[s];
          return (
            <button key={s} onClick={() => setSeverity(s)} style={{ padding:"7px 18px", borderRadius:10, border:`1px solid ${severity===s?sc.border:"rgba(212,175,55,0.2)"}`, fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:700, background:severity===s?sc.bg:"transparent", color:severity===s?sc.color:"rgba(255,255,255,0.5)" }}>
              {s}
            </button>
          );
        })}
      </div>

      {/* Alerts Table */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>
              {["Alert ID","Type","Ride ID","Driver","Risk Score","Status","Details","Actions"].map((c)=><TH key={c} c={c}/>)}
            </tr></thead>
            <tbody>
              {loading
                ? Array(5).fill(0).map((_,i)=>(
                    <tr key={i}><td colSpan={8}><div style={{ height:48, background:"rgba(255,255,255,0.03)", margin:"4px 0", borderRadius:8, animation:"gmPulse 1.5s ease-in-out infinite" }}/></td></tr>
                  ))
                : alerts.length === 0
                  ? <tr><td colSpan={8} style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>No {severity} severity alerts</td></tr>
                  : alerts.map((a) => {
                    const score = a.risk_score ?? a.riskScore ?? 0;
                    const rs = riskStyle(score);
                    const driverName = a.driver?.full_name || a.driver_name || "—";
                    const driverUserId = a.driver?.id || a.driver_id || a.user_id;
                    return (
                      <tr key={a.id || a.alert_number} onMouseEnter={(e)=>e.currentTarget.style.background="rgba(212,175,55,0.03)"} onMouseLeave={(e)=>e.currentTarget.style.background=""}>
                        <TD><span style={{ fontFamily:"monospace", color:"rgba(212,175,55,0.7)", fontSize:12 }}>{a.alert_number || a.id}</span></TD>
                        <TD>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <AlertTriangle size={12} color="#f87171" />
                            <span style={{ fontSize:12 }}>{a.alert_type || a.type || "—"}</span>
                          </div>
                        </TD>
                        <TD style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{a.ride_id || a.rideId || "—"}</TD>
                        <TD>{driverName}</TD>
                        <TD>
                          <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:rs.bg, border:`1px solid ${rs.border}`, color:rs.color }}>{score}</span>
                        </TD>
                        <TD><StatusBadge status={a.status} /></TD>
                        <TD style={{ maxWidth:200, fontSize:12, color:"rgba(255,255,255,0.4)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.description || a.details || "—"}</TD>
                        <TD>
                          {driverUserId && (
                            <button onClick={() => handleSuspend(driverUserId, driverName)} disabled={acting[driverUserId]} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:8, color:"#f87171", fontSize:12, cursor:"pointer", opacity:acting[driverUserId]?0.5:1 }}>
                              <ShieldX size={13}/> Suspend
                            </button>
                          )}
                        </TD>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
