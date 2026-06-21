import { useState, useEffect, useRef } from "react";
import { Activity, RefreshCw, CheckCircle, XCircle, Clock, Server, Database, List } from "lucide-react";
import { getRedisStats, getQueueStats } from "../../api/admin";

const BASE = "https://api.gomobility.co.in";
const REFRESH_INTERVAL = 30000;

const fmtUptime = (sec) => {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "—";

const fmtBytes = (bytes) => {
  if (!bytes) return "—";
  if (bytes >= 1073741824) return `${(bytes/1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576)    return `${(bytes/1048576).toFixed(2)} MB`;
  if (bytes >= 1024)       return `${(bytes/1024).toFixed(2)} KB`;
  return `${bytes} B`;
};

const TABS = [
  { id:"server", label:"Server Health", icon:Server },
  { id:"redis",  label:"Redis",         icon:Database },
  { id:"queues", label:"Job Queues",    icon:List },
];

const Skeleton = ({ rows=4 }) => (
  <>
    {Array(rows).fill(0).map((_,i)=>(
      <div key={i} style={{ height:38, background:"rgba(255,255,255,0.04)", borderRadius:8, marginBottom:10, animation:"pulse 1.5s ease-in-out infinite" }} />
    ))}
  </>
);

const KV = ({ label, value, color }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
    <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)", textTransform:"capitalize" }}>{label}</span>
    <span style={{ fontSize:13, fontWeight:600, color:color||"rgba(255,255,255,0.85)" }}>{String(value??'—')}</span>
  </div>
);

export default function SystemHealthPage() {
  const [tab, setTab]             = useState("server");
  const [health, setHealth]       = useState(null);
  const [redis, setRedis]         = useState(null);
  const [queues, setQueues]       = useState(null);
  const [loading, setLoading]     = useState({server:true, redis:false, queues:false});
  const [errors, setErrors]       = useState({});
  const [lastChecked, setLast]    = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const timerRef = useRef(null);
  const countRef = useRef(null);

  const fetchHealth = async () => {
    setLoading(p => ({...p, server:true}));
    setErrors(p => ({...p, server:null}));
    try {
      const res = await fetch(`${BASE}/health`);
      const data = await res.json();
      setHealth(data);
      setLast(new Date());
      setCountdown(REFRESH_INTERVAL / 1000);
    } catch {
      setErrors(p => ({...p, server:"Could not reach health endpoint."}));
      setHealth(null);
    } finally {
      setLoading(p => ({...p, server:false}));
    }
  };

  const fetchRedis = async () => {
    setLoading(p => ({...p, redis:true}));
    setErrors(p => ({...p, redis:null}));
    try {
      const res = await getRedisStats();
      setRedis(res.data?.data || res.data);
    } catch (err) {
      setErrors(p => ({...p, redis:err.response?.data?.message || "Could not load Redis stats."}));
    } finally {
      setLoading(p => ({...p, redis:false}));
    }
  };

  const fetchQueues = async () => {
    setLoading(p => ({...p, queues:true}));
    setErrors(p => ({...p, queues:null}));
    try {
      const res = await getQueueStats();
      setQueues(res.data?.data || res.data);
    } catch (err) {
      setErrors(p => ({...p, queues:err.response?.data?.message || "Could not load queue stats."}));
    } finally {
      setLoading(p => ({...p, queues:false}));
    }
  };

  const handleTabChange = (id) => {
    setTab(id);
    if (id === "redis" && !redis && !loading.redis) fetchRedis();
    if (id === "queues" && !queues && !loading.queues) fetchQueues();
  };

  const handleRefresh = () => {
    if (tab === "server") fetchHealth();
    if (tab === "redis")  fetchRedis();
    if (tab === "queues") fetchQueues();
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
  const isLoading    = loading[tab];
  const tabError     = errors[tab];

  const infoRows = health ? [
    ["Status",      health.status || "—"],
    ["Uptime",      fmtUptime(health.uptime)],
    ["Timestamp",   fmtDateTime(health.timestamp)],
    ["Version",     health.version || "—"],
    ["Environment", health.environment || health.env || "—"],
    ["DB",          health.database?.status || health.db || "—"],
  ].filter(([,v]) => v && v !== "—") : [];

  const redisRows = redis ? [
    ["Status",            redis.status || redis.connected ? "connected" : "—"],
    ["Version",           redis.version || redis.redis_version || "—"],
    ["Used Memory",       fmtBytes(redis.used_memory || redis.usedMemory)],
    ["Peak Memory",       fmtBytes(redis.used_memory_peak || redis.peakMemory)],
    ["Connected Clients", redis.connected_clients ?? redis.connectedClients ?? "—"],
    ["Total Keys",        redis.keyspace_keys ?? redis.totalKeys ?? "—"],
    ["Uptime (s)",        redis.uptime_in_seconds ?? redis.uptimeSeconds ?? "—"],
    ["Role",              redis.role || "—"],
    ["Hit Rate",          redis.keyspace_hits && redis.keyspace_misses
                            ? `${((redis.keyspace_hits/(redis.keyspace_hits+redis.keyspace_misses))*100).toFixed(1)}%`
                            : "—"],
  ].filter(([,v]) => String(v) !== "—") : [];

  const queueList = queues
    ? (Array.isArray(queues) ? queues : Object.entries(queues).map(([name, stats]) => ({ name, ...stats })))
    : [];

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>System Health</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>
          Infrastructure monitoring · Server auto-refreshes every 30s
          {lastChecked && <span style={{ marginLeft:8, color:"rgba(255,255,255,0.25)" }}>· Next in {countdown}s</span>}
        </p>
      </div>

      {/* Status Banner */}
      <div style={{ background:loading.server?"rgba(255,255,255,0.03)":statusBg, border:`1px solid ${loading.server?"rgba(212,175,55,0.15)":statusBorder}`, borderRadius:16, padding:"18px 22px", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          {loading.server
            ? <RefreshCw size={26} color="rgba(212,175,55,0.5)" style={{ animation:"spin 1s linear infinite" }} />
            : errors.server
              ? <XCircle size={26} color="#f87171" />
              : isOk
                ? <CheckCircle size={26} color="#4ade80" />
                : <XCircle size={26} color="#f87171" />
          }
          <div>
            <div style={{ fontFamily:"Cinzel,serif", fontSize:16, fontWeight:700, color:loading.server?"rgba(255,255,255,0.6)":errors.server?"#f87171":statusColor }}>
              {loading.server ? "Checking…" : errors.server ? "Unreachable" : isOk ? "All Systems Operational" : `Status: ${health?.status}`}
            </div>
            {lastChecked && !loading.server && (
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>Last checked: {fmtDateTime(lastChecked)}</div>
            )}
          </div>
        </div>
        <button onClick={handleRefresh} disabled={isLoading} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 18px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:10, color:"#D4AF37", fontSize:13, fontFamily:"Outfit,sans-serif", cursor:"pointer", fontWeight:600, opacity:isLoading?0.5:1 }}>
          <RefreshCw size={13} style={{ animation:isLoading?"spin 1s linear infinite":undefined }} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:22, flexWrap:"wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>handleTabChange(t.id)} style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 18px", borderRadius:10, border:"1px solid", fontSize:13, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600, transition:"all .2s", borderColor:tab===t.id?"#D4AF37":"rgba(212,175,55,0.2)", background:tab===t.id?"rgba(212,175,55,0.12)":"rgba(255,255,255,0.02)", color:tab===t.id?"#D4AF37":"rgba(255,255,255,0.5)" }}>
            <t.icon size={13}/> {t.label}
          </button>
        ))}
      </div>

      {tabError && (
        <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:12, padding:"13px 18px", marginBottom:18, color:"#fca5a5", fontSize:13 }}>{tabError}</div>
      )}

      {/* Server Health Tab */}
      {tab === "server" && (
        <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:20 }}>
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
              <Server size={14} color="rgba(212,175,55,0.7)" />
              <span style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:600, color:"#fff" }}>Health Response</span>
            </div>
            {loading.server ? <Skeleton /> : infoRows.length > 0
              ? infoRows.map(([label, value]) => (
                  <KV key={label} label={label} value={value} color={label==="Status"?statusColor:undefined} />
                ))
              : <div style={{ textAlign:"center", padding:32, color:"rgba(255,255,255,0.3)", fontSize:13 }}>No data</div>
            }
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:24 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <Clock size={14} color="rgba(212,175,55,0.7)" />
                <span style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:600, color:"#fff" }}>Server Uptime</span>
              </div>
              <div style={{ fontSize:36, fontWeight:800, color:"#D4AF37", marginBottom:4 }}>{loading.server?"—":fmtUptime(health?.uptime)}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>Since last server restart</div>
            </div>
            <div style={{ background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:14, padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <Activity size={13} color="#60a5fa" />
                <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#60a5fa" }}>Auto Monitoring</span>
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)", lineHeight:1.7 }}>Polls <code style={{ background:"rgba(255,255,255,0.08)", padding:"1px 5px", borderRadius:4, fontSize:11 }}>GET /health</code> every 30s automatically.</div>
              <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8, fontSize:12, color:"rgba(255,255,255,0.5)" }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:loading.server?"#D4AF37":isOk?"#4ade80":"#f87171", animation:"pulse 2s infinite", flexShrink:0 }} />
                {loading.server ? "Polling…" : `Next in ${countdown}s`}
              </div>
            </div>
            {health && !loading.server && (
              <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.08)", borderRadius:14, padding:16 }}>
                <div style={{ fontSize:11, color:"rgba(212,175,55,0.5)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>Raw Response</div>
                <pre style={{ margin:0, fontSize:11, color:"rgba(255,255,255,0.55)", fontFamily:"monospace", overflow:"auto", maxHeight:160 }}>{JSON.stringify(health, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Redis Tab */}
      {tab === "redis" && (
        <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:20 }}>
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
              <Database size={14} color="rgba(212,175,55,0.7)" />
              <span style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:600, color:"#fff" }}>Redis Metrics</span>
            </div>
            {loading.redis ? <Skeleton rows={8} /> : redisRows.length > 0
              ? redisRows.map(([label, value]) => (
                  <KV key={label} label={label} value={value} color={label==="Status"?"#4ade80":undefined} />
                ))
              : <div style={{ textAlign:"center", padding:32, color:"rgba(255,255,255,0.3)", fontSize:13 }}>No Redis stats available</div>
            }
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {redis && (
              <div style={{ background:"rgba(212,175,55,0.04)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:14, padding:20 }}>
                <div style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#D4AF37", marginBottom:12 }}>Memory Usage</div>
                <div style={{ display:"flex", gap:12 }}>
                  {[
                    ["Used", fmtBytes(redis.used_memory || redis.usedMemory)],
                    ["Peak", fmtBytes(redis.used_memory_peak || redis.peakMemory)],
                    ["RSS",  fmtBytes(redis.used_memory_rss || redis.rssMemory)],
                  ].map(([l,v]) => (
                    <div key={l} style={{ flex:1, background:"rgba(0,0,0,0.3)", borderRadius:10, padding:"12px 14px", textAlign:"center" }}>
                      <div style={{ fontSize:16, fontWeight:700, color:"#D4AF37" }}>{v}</div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:4 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {redis && (
              <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.08)", borderRadius:14, padding:16 }}>
                <div style={{ fontSize:11, color:"rgba(212,175,55,0.5)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>Raw Response</div>
                <pre style={{ margin:0, fontSize:10.5, color:"rgba(255,255,255,0.5)", fontFamily:"monospace", overflow:"auto", maxHeight:200 }}>{JSON.stringify(redis, null, 2)}</pre>
              </div>
            )}
            {!redis && !loading.redis && !errors.redis && (
              <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.08)", borderRadius:14, padding:32, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>
                <Database size={28} color="rgba(255,255,255,0.08)" style={{ marginBottom:10, display:"block", margin:"0 auto 10px" }} />
                Click Refresh to load Redis stats
              </div>
            )}
          </div>
        </div>
      )}

      {/* Queues Tab */}
      {tab === "queues" && (
        <div>
          {loading.queues && <Skeleton rows={5} />}
          {!loading.queues && !tabError && queueList.length === 0 && (
            <div style={{ textAlign:"center", padding:60, color:"rgba(255,255,255,0.25)", fontFamily:"Outfit,sans-serif" }}>
              <List size={32} color="rgba(255,255,255,0.08)" style={{ marginBottom:12, display:"block", margin:"0 auto 12px" }} />
              No queue data available
            </div>
          )}
          {!loading.queues && queueList.length > 0 && (
            <>
              {/* Summary Bar */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
                {[
                  ["Total Queues", queueList.length, "#D4AF37"],
                  ["Active Jobs",  queueList.reduce((s,q)=>s+(q.active||q.activeCount||0),0), "#4ade80"],
                  ["Waiting",      queueList.reduce((s,q)=>s+(q.waiting||q.waitingCount||0),0), "#fb923c"],
                  ["Failed",       queueList.reduce((s,q)=>s+(q.failed||q.failedCount||0),0), "#f87171"],
                ].map(([l,v,c]) => (
                  <div key={l} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:14, padding:18, textAlign:"center" }}>
                    <div style={{ fontSize:26, fontWeight:800, color:c }}>{v}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:4 }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Queue Table */}
              <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid rgba(212,175,55,0.15)" }}>
                        {["Queue Name","Active","Waiting","Completed","Failed","Delayed"].map(h=>(
                          <th key={h} style={{ padding:"12px 16px", textAlign:h==="Queue Name"?"left":"center", fontSize:10.5, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.6)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queueList.map((q, i) => {
                        const name      = q.name || q.queueName || `Queue ${i+1}`;
                        const active    = q.active    ?? q.activeCount    ?? 0;
                        const waiting   = q.waiting   ?? q.waitingCount   ?? 0;
                        const completed = q.completed ?? q.completedCount ?? 0;
                        const failed    = q.failed    ?? q.failedCount    ?? 0;
                        const delayed   = q.delayed   ?? q.delayedCount   ?? 0;
                        return (
                          <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                            <td style={{ padding:"12px 16px", fontFamily:"Outfit,sans-serif", fontSize:13, color:"rgba(255,255,255,0.82)", fontWeight:600 }}>{name}</td>
                            <td style={{ padding:"12px 16px", textAlign:"center", fontSize:13, color:active>0?"#4ade80":"rgba(255,255,255,0.4)", fontWeight:active>0?700:400 }}>{active}</td>
                            <td style={{ padding:"12px 16px", textAlign:"center", fontSize:13, color:waiting>0?"#fb923c":"rgba(255,255,255,0.4)", fontWeight:waiting>0?700:400 }}>{waiting}</td>
                            <td style={{ padding:"12px 16px", textAlign:"center", fontSize:13, color:"rgba(255,255,255,0.55)" }}>{completed}</td>
                            <td style={{ padding:"12px 16px", textAlign:"center", fontSize:13, color:failed>0?"#f87171":"rgba(255,255,255,0.4)", fontWeight:failed>0?700:400 }}>{failed}</td>
                            <td style={{ padding:"12px 16px", textAlign:"center", fontSize:13, color:delayed>0?"#a78bfa":"rgba(255,255,255,0.4)" }}>{delayed}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
