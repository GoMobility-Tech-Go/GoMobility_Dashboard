import { useState, useEffect, useRef } from "react";
import { Activity, RefreshCw, CheckCircle, XCircle, Clock, Server } from "lucide-react";

const BASE = "https://api.gomobility.co.in";
const REFRESH_INTERVAL = 30000;

const fmtUptime = (sec) => {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "—";

export default function SystemHealthPage() {
  const [health, setHealth]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [lastChecked, setLast]    = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const timerRef = useRef(null);
  const countRef = useRef(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/health`);
      const data = await res.json();
      setHealth(data);
      setLast(new Date());
      setCountdown(REFRESH_INTERVAL / 1000);
    } catch (err) {
      setError("Could not reach health endpoint.");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    timerRef.current = setInterval(fetchHealth, REFRESH_INTERVAL);
    countRef.current = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => {
      clearInterval(timerRef.current);
      clearInterval(countRef.current);
    };
  }, []);

  const isOk = health?.status === "ok" || health?.status === "OK";

  const statusColor  = isOk ? "#4ade80" : "#f87171";
  const statusBg     = isOk ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";
  const statusBorder = isOk ? "rgba(34,197,94,0.3)"  : "rgba(239,68,68,0.3)";

  const infoRows = health ? [
    ["Status",     health.status || "—"],
    ["Uptime",     fmtUptime(health.uptime)],
    ["Timestamp",  fmtDateTime(health.timestamp)],
    ["Version",    health.version || "—"],
    ["Environment",health.environment || health.env || "—"],
    ["DB",         health.database?.status || health.db || "—"],
  ].filter(([,v]) => v && v !== "—") : [];

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>System Health</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>
          Live health check · Auto-refreshes every 30s
          {lastChecked && <span style={{ marginLeft:8, color:"rgba(255,255,255,0.25)" }}>· Next in {countdown}s</span>}
        </p>
      </div>

      {/* Status Banner */}
      <div style={{ background:loading?"rgba(255,255,255,0.03)":statusBg, border:`1px solid ${loading?"rgba(212,175,55,0.15)":statusBorder}`, borderRadius:16, padding:"20px 24px", marginBottom:24, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          {loading
            ? <RefreshCw size={28} color="rgba(212,175,55,0.5)" style={{ animation:"spin 1s linear infinite" }} />
            : error
              ? <XCircle size={28} color="#f87171" />
              : isOk
                ? <CheckCircle size={28} color="#4ade80" />
                : <XCircle size={28} color="#f87171" />
          }
          <div>
            <div style={{ fontFamily:"Cinzel,serif", fontSize:17, fontWeight:700, color: loading ? "rgba(255,255,255,0.6)" : (error ? "#f87171" : statusColor) }}>
              {loading ? "Checking…" : error ? "Unreachable" : isOk ? "All Systems Operational" : `Status: ${health?.status}`}
            </div>
            {lastChecked && !loading && (
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:3 }}>Last checked: {fmtDateTime(lastChecked)}</div>
            )}
          </div>
        </div>
        <button onClick={fetchHealth} disabled={loading} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 18px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:10, color:"#D4AF37", fontSize:13, fontFamily:"Outfit,sans-serif", cursor:"pointer", fontWeight:600, opacity:loading?0.5:1 }}>
          <RefreshCw size={13} style={{ animation:loading?"spin 1s linear infinite":undefined }} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:12, padding:"14px 18px", marginBottom:20, color:"#fca5a5", fontSize:13 }}>
          {error}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:20 }}>

        {/* Health Details */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <Server size={15} color="rgba(212,175,55,0.7)" />
            <span style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:600, color:"#fff" }}>Health Response</span>
          </div>
          {loading
            ? Array(4).fill(0).map((_,i) => <div key={i} style={{ height:38, background:"rgba(255,255,255,0.04)", borderRadius:8, marginBottom:10, animation:"pulse 1.5s ease-in-out infinite" }} />)
            : infoRows.length > 0
              ? infoRows.map(([label, value]) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)", textTransform:"capitalize" }}>{label}</span>
                    <span style={{ fontSize:13, fontWeight:600, color: label==="Status" ? statusColor : "rgba(255,255,255,0.85)" }}>{String(value)}</span>
                  </div>
                ))
              : <div style={{ textAlign:"center", padding:32, color:"rgba(255,255,255,0.3)", fontSize:13 }}>No data</div>
          }
        </div>

        {/* Uptime + Info */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Uptime Card */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <Clock size={15} color="rgba(212,175,55,0.7)" />
              <span style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:600, color:"#fff" }}>Server Uptime</span>
            </div>
            <div style={{ fontSize:36, fontWeight:800, color:"#D4AF37", marginBottom:4 }}>
              {loading ? "—" : fmtUptime(health?.uptime)}
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>Since last server restart</div>
          </div>

          {/* Auto Refresh Info */}
          <div style={{ background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:14, padding:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <Activity size={14} color="#60a5fa" />
              <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#60a5fa" }}>Auto Monitoring</span>
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)", lineHeight:1.7 }}>
              This page polls <code style={{ background:"rgba(255,255,255,0.08)", padding:"1px 6px", borderRadius:4, fontSize:11 }}>GET /health</code> every 30 seconds automatically. The status indicator updates in real time without a page reload.
            </div>
            <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:8, fontSize:12, color:"rgba(255,255,255,0.5)" }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background: loading?"#D4AF37":isOk?"#4ade80":"#f87171", animation:"pulse 2s infinite", flexShrink:0 }} />
              {loading ? "Polling…" : `Next check in ${countdown}s`}
            </div>
          </div>

          {/* Raw JSON */}
          {health && !loading && (
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.08)", borderRadius:14, padding:16 }}>
              <div style={{ fontSize:11, color:"rgba(212,175,55,0.5)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:10 }}>Raw Response</div>
              <pre style={{ margin:0, fontSize:11, color:"rgba(255,255,255,0.55)", fontFamily:"monospace", overflow:"auto", maxHeight:160 }}>
                {JSON.stringify(health, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
