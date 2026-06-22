import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Activity, RefreshCw, CheckCircle, XCircle, Clock, Server, Database, List, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getRedisStats, getQueueStats } from "../../api/admin";
import { getApiCallLog } from "../../api/axios";

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
  d ? new Date(d).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "—";
const fmtBytes = (bytes) => {
  if (!bytes) return "—";
  if (bytes >= 1073741824) return `${(bytes/1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576)    return `${(bytes/1048576).toFixed(2)} MB`;
  if (bytes >= 1024)       return `${(bytes/1024).toFixed(2)} KB`;
  return `${bytes} B`;
};

const TABS = [
  { id:"server",  label:"Server Health",  icon:Server   },
  { id:"api",     label:"API Monitor",    icon:Activity  },
  { id:"redis",   label:"Redis",          icon:Database  },
  { id:"queues",  label:"Job Queues",     icon:List      },
];

const Skeleton = ({ rows=4 }) => (
  <>{Array(rows).fill(0).map((_,i)=>(
    <div key={i} style={{ height:38,background:"rgba(255,255,255,0.04)",borderRadius:8,marginBottom:10,animation:"gmPulse 1.5s ease-in-out infinite" }} />
  ))}</>
);

const KV = ({ label, value, color }) => (
  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
    <span style={{ fontSize:12,color:"rgba(255,255,255,0.4)",textTransform:"capitalize" }}>{label}</span>
    <span style={{ fontSize:13,fontWeight:600,color:color||"rgba(255,255,255,0.85)" }}>{String(value??'—')}</span>
  </div>
);

// Latency color helper
const msColor = (ms) => ms < 300 ? "#34D399" : ms < 800 ? "#F59E0B" : "#F87171";
const statusColor = (s) => s >= 500 ? "#F87171" : s >= 400 ? "#F59E0B" : s >= 200 ? "#34D399" : "#60A5FA";

export default function SystemHealthPage() {
  const [tab, setTab]             = useState("server");
  const [health, setHealth]       = useState(null);
  const [redis, setRedis]         = useState(null);
  const [queues, setQueues]       = useState(null);
  const [apiLog, setApiLog]       = useState([]);
  const [apiFilter, setApiFilter] = useState("all"); // all | ok | error
  const [loading, setLoading]     = useState({server:true, redis:false, queues:false});
  const [errors, setErrors]       = useState({});
  const [lastChecked, setLast]    = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const timerRef = useRef(null);
  const countRef = useRef(null);
  const logTimerRef = useRef(null);

  // ── Server health ──
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

  // ── Redis ──
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

  // ── Queues ──
  const fetchQueues = async () => {
    setLoading(p => ({...p, queues:true}));
    setErrors(p => ({...p, queues:null}));
    try {
      const res = await getQueueStats();
      const d = res.data?.data || res.data;
      setQueues(d);
    } catch (err) {
      setErrors(p => ({...p, queues:err.response?.data?.message || "Could not load queue stats."}));
    } finally {
      setLoading(p => ({...p, queues:false}));
    }
  };

  // ── Refresh API log every 2s when on API tab ──
  const refreshApiLog = useCallback(() => {
    setApiLog([...getApiCallLog()]);
  }, []);

  const handleTabChange = (id) => {
    setTab(id);
    if (id === "redis"  && !redis  && !loading.redis)  fetchRedis();
    if (id === "queues" && !queues && !loading.queues) fetchQueues();
    if (id === "api") refreshApiLog();
  };

  const handleRefresh = () => {
    if (tab === "server") fetchHealth();
    if (tab === "redis")  fetchRedis();
    if (tab === "queues") fetchQueues();
    if (tab === "api")    refreshApiLog();
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

  // Refresh log when on API tab
  useEffect(() => {
    if (tab === "api") {
      refreshApiLog();
      logTimerRef.current = setInterval(refreshApiLog, 2000);
    }
    return () => clearInterval(logTimerRef.current);
  }, [tab, refreshApiLog]);

  const isOk        = health?.status === "ok" || health?.status === "OK";
  const sColor      = isOk ? "#4ade80" : "#f87171";
  const sBg         = isOk ? "rgba(34,197,94,0.12)"  : "rgba(239,68,68,0.12)";
  const sBorder     = isOk ? "rgba(34,197,94,0.3)"   : "rgba(239,68,68,0.3)";
  const isLoading   = loading[tab];
  const tabError    = errors[tab];

  const infoRows = health ? [
    ["Status",      health.status || "—"],
    ["Uptime",      fmtUptime(health.uptime)],
    ["Timestamp",   fmtDateTime(health.timestamp)],
    ["Version",     health.version || "—"],
    ["Environment", health.environment || health.env || "—"],
    ["DB",          health.database?.status || health.db || "—"],
  ].filter(([,v]) => v && v !== "—") : [];

  // Redis data
  const rStats       = redis?.stats   || redis;
  const rPatterns    = redis?.patternCounts || [];
  const redisRows    = rStats ? [
    ["Status",            rStats.status || (rStats.connected ? "connected" : "—")],
    ["Version",           rStats.version || rStats.redis_version || "—"],
    ["Provider",          rStats.provider || "—"],
    ["Used Memory",       fmtBytes(rStats.used_memory || rStats.usedMemory)],
    ["Peak Memory",       fmtBytes(rStats.used_memory_peak || rStats.peakMemory)],
    ["RSS Memory",        fmtBytes(rStats.used_memory_rss  || rStats.rssMemory)],
    ["Connected Clients", rStats.connected_clients ?? rStats.connectedClients ?? "—"],
    ["Total Keys",        rStats.keyspace_keys ?? rStats.totalKeys ?? "—"],
    ["Uptime",            rStats.uptime_in_seconds ? fmtUptime(Number(rStats.uptime_in_seconds)) : "—"],
    ["Hit Rate",          rStats.keyspace_hits && rStats.keyspace_misses
                            ? `${((rStats.keyspace_hits/(rStats.keyspace_hits+rStats.keyspace_misses))*100).toFixed(1)}%`
                            : "—"],
  ].filter(([,v]) => String(v) !== "—") : [];

  // Queues data
  const queueList   = queues
    ? (Array.isArray(queues.queues) ? queues.queues : Array.isArray(queues) ? queues : Object.entries(queues?.queues||queues||{}).map(([name,stats])=>({name,...stats})))
    : [];
  const recentFailed = queues?.recentFailed || [];

  // API log stats
  const logFiltered = apiLog.filter(l => apiFilter === "all" ? true : apiFilter === "ok" ? l.ok : !l.ok);
  const totalCalls  = apiLog.length;
  const errorCalls  = apiLog.filter(l => !l.ok).length;
  const avgMs       = apiLog.length > 0 ? Math.round(apiLog.reduce((s,l) => s + l.ms, 0) / apiLog.length) : 0;

  // Latency distribution histogram
  const latencyDist = useMemo(() => [
    { range:"< 100ms",  count: apiLog.filter(l=>l.ms<100).length,              fill:"#34D399" },
    { range:"100-300ms",count: apiLog.filter(l=>l.ms>=100&&l.ms<300).length,   fill:"#60a5fa" },
    { range:"300-800ms",count: apiLog.filter(l=>l.ms>=300&&l.ms<800).length,   fill:"#f59e0b" },
    { range:"> 800ms",  count: apiLog.filter(l=>l.ms>=800).length,             fill:"#f87171" },
  ], [apiLog]);

  // Endpoint hit counts
  const endpointCounts = apiLog.reduce((acc, l) => {
    const key = `${l.method} ${l.url}`;
    if (!acc[key]) acc[key] = { key, count:0, errors:0, totalMs:0 };
    acc[key].count++;
    if (!l.ok) acc[key].errors++;
    acc[key].totalMs += l.ms;
    return acc;
  }, {});
  const endpointList = Object.values(endpointCounts)
    .sort((a,b) => b.count - a.count)
    .slice(0, 15);

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`
        @keyframes gmSpin{to{transform:rotate(360deg)}}
        @keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}
        @keyframes gmBlink{0%,100%{opacity:1}50%{opacity:0.3}}
      `}</style>

      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>System Health Monitor</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>
          Infrastructure + API monitoring · Server auto-refreshes every 30s
          {lastChecked && <span style={{ marginLeft:8, color:"rgba(255,255,255,0.25)" }}>· Next in {countdown}s</span>}
        </p>
      </div>

      {/* Status Banner */}
      <div style={{ background:loading.server?"rgba(255,255,255,0.03)":sBg, border:`1px solid ${loading.server?"rgba(212,175,55,0.15)":sBorder}`, borderRadius:16, padding:"16px 22px", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          {loading.server
            ? <RefreshCw size={24} color="rgba(212,175,55,0.5)" style={{ animation:"gmSpin 1s linear infinite" }} />
            : errors.server
              ? <XCircle size={24} color="#f87171" />
              : isOk ? <CheckCircle size={24} color="#4ade80" /> : <XCircle size={24} color="#f87171" />
          }
          <div>
            <div style={{ fontFamily:"Cinzel,serif", fontSize:15, fontWeight:700, color:loading.server?"rgba(255,255,255,0.6)":errors.server?"#f87171":sColor }}>
              {loading.server ? "Checking server…" : errors.server ? "Unreachable" : isOk ? "All Systems Operational" : `Status: ${health?.status}`}
            </div>
            {lastChecked && !loading.server && (
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>Last checked: {fmtDateTime(lastChecked)}</div>
            )}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          {/* Quick API stats pill */}
          {totalCalls > 0 && (
            <div style={{ display:"flex", gap:10 }}>
              <span style={{ padding:"5px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.25)", color:"#34D399" }}>{totalCalls - errorCalls} OK</span>
              {errorCalls > 0 && <span style={{ padding:"5px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.25)", color:"#F87171" }}>{errorCalls} Errors</span>}
              <span style={{ padding:"5px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.25)", color:"#D4AF37" }}>avg {avgMs}ms</span>
            </div>
          )}
          <button onClick={handleRefresh} disabled={isLoading} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:10, color:"#D4AF37", fontSize:13, cursor:"pointer", fontWeight:600, opacity:isLoading?0.5:1 }}>
            <RefreshCw size={13} style={{ animation:isLoading?"gmSpin 1s linear infinite":undefined }} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:22, flexWrap:"wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>handleTabChange(t.id)} style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 18px", borderRadius:10, border:"1px solid", fontSize:13, cursor:"pointer", fontWeight:600, transition:"all .2s", borderColor:tab===t.id?"#D4AF37":"rgba(212,175,55,0.2)", background:tab===t.id?"rgba(212,175,55,0.12)":"rgba(255,255,255,0.02)", color:tab===t.id?"#D4AF37":"rgba(255,255,255,0.5)" }}>
            <t.icon size={13}/> {t.label}
            {t.id === "api" && totalCalls > 0 && (
              <span style={{ marginLeft:4, padding:"1px 6px", borderRadius:20, fontSize:10, background:tab==="api"?"rgba(212,175,55,0.25)":"rgba(255,255,255,0.08)", color:tab==="api"?"#D4AF37":"rgba(255,255,255,0.5)" }}>{totalCalls}</span>
            )}
            {t.id === "queues" && recentFailed.length > 0 && (
              <span style={{ marginLeft:4, padding:"1px 6px", borderRadius:20, fontSize:10, background:"rgba(248,113,113,0.2)", color:"#F87171" }}>{recentFailed.length}</span>
            )}
          </button>
        ))}
      </div>

      {tabError && (
        <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:12, padding:"13px 18px", marginBottom:18, color:"#fca5a5", fontSize:13 }}>{tabError}</div>
      )}

      {/* ─── SERVER TAB ─── */}
      {tab === "server" && (
        <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:20 }}>
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
              <Server size={14} color="rgba(212,175,55,0.7)" />
              <span style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:600, color:"#fff" }}>Health Response</span>
            </div>
            {loading.server ? <Skeleton /> : infoRows.length > 0
              ? infoRows.map(([label, value]) => (
                  <KV key={label} label={label} value={value} color={label==="Status"?sColor:undefined} />
                ))
              : <div style={{ textAlign:"center", padding:32, color:"rgba(255,255,255,0.3)", fontSize:13 }}>No data</div>
            }
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:24 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <Clock size={14} color="rgba(212,175,55,0.7)" />
                <span style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:600, color:"#fff" }}>Server Uptime</span>
              </div>
              <div style={{ fontSize:36, fontWeight:800, color:"#D4AF37", marginBottom:4 }}>{loading.server?"—":fmtUptime(health?.uptime)}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>Since last server restart</div>
            </div>
            <div style={{ background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:14, padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <Activity size={13} color="#60a5fa" />
                <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#60a5fa" }}>Auto Monitoring</span>
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)", lineHeight:1.7 }}>Polls <code style={{ background:"rgba(255,255,255,0.08)", padding:"1px 5px", borderRadius:4 }}>GET /health</code> every 30s automatically.</div>
              <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8, fontSize:12, color:"rgba(255,255,255,0.5)" }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:loading.server?"#D4AF37":isOk?"#4ade80":"#f87171", animation:"gmPulse 2s infinite", flexShrink:0 }} />
                {loading.server ? "Polling…" : `Next in ${countdown}s`}
              </div>
            </div>
            {health && !loading.server && (
              <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.08)", borderRadius:14, padding:16 }}>
                <div style={{ fontSize:10, color:"rgba(212,175,55,0.5)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>Raw Response</div>
                <pre style={{ margin:0, fontSize:11, color:"rgba(255,255,255,0.55)", fontFamily:"monospace", overflow:"auto", maxHeight:160 }}>{JSON.stringify(health, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── API MONITOR TAB ─── */}
      {tab === "api" && (
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

          {/* Summary row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
            {[
              { label:"Total Calls",   value: totalCalls,             color:"#D4AF37" },
              { label:"Successful",    value: totalCalls - errorCalls, color:"#34D399" },
              { label:"Errors",        value: errorCalls,             color:"#F87171" },
              { label:"Avg Latency",   value: avgMs > 0 ? `${avgMs}ms` : "—", color: avgMs > 0 ? msColor(avgMs) : "rgba(255,255,255,0.4)" },
            ].map(s => (
              <div key={s.label} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:14, padding:"16px 18px", textAlign:"center" }}>
                <div style={{ fontSize:28, fontWeight:800, color:s.color, fontFamily:"Cinzel,serif" }}>{s.value}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Latency Distribution Histogram */}
          {apiLog.length > 0 && (
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:20 }}>
              <div style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#fff", marginBottom:4 }}>⏱ Latency Distribution</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:14 }}>Response time breakdown across {apiLog.length} calls</div>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={latencyDist} margin={{ top:4, right:4, left:0, bottom:0 }} barSize={48}>
                  <XAxis dataKey="range" tick={{ fill:"rgba(255,255,255,0.45)", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:"rgba(255,255,255,0.3)", fontSize:10 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background:"#020d26", border:"1px solid rgba(212,175,55,0.2)", borderRadius:10, color:"#fff", fontSize:12 }}
                    formatter={(v) => [`${v} calls`, "Count"]}
                  />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {latencyDist.map((d,i) => <Cell key={i} fill={d.fill} opacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Endpoint hit frequency */}
          {endpointList.length > 0 && (
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
              <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(212,175,55,0.08)", fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#fff" }}>
                📊 Endpoint Hit Frequency (this session)
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid rgba(212,175,55,0.1)" }}>
                      {["Endpoint","Hits","Errors","Avg Latency","Error Rate"].map(h => (
                        <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:10, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.6)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {endpointList.map((e) => {
                      const avg = Math.round(e.totalMs / e.count);
                      const errRate = ((e.errors / e.count) * 100).toFixed(0);
                      const maxCount = endpointList[0]?.count || 1;
                      return (
                        <tr key={e.key} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                          <td style={{ padding:"10px 14px" }}>
                            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                              <span style={{ fontSize:12, color:"rgba(255,255,255,0.8)", fontFamily:"monospace" }}>{e.key}</span>
                              <div style={{ height:3, background:"rgba(255,255,255,0.05)", borderRadius:3, width:"100%", maxWidth:200 }}>
                                <div style={{ height:"100%", background:e.errors > 0 ? "#F59E0B" : "#34D399", borderRadius:3, width:`${(e.count/maxCount)*100}%` }}/>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding:"10px 14px", fontSize:13, fontWeight:700, color:"#D4AF37" }}>{e.count}</td>
                          <td style={{ padding:"10px 14px", fontSize:13, color: e.errors > 0 ? "#F87171" : "rgba(255,255,255,0.3)", fontWeight:e.errors > 0 ? 700 : 400 }}>{e.errors}</td>
                          <td style={{ padding:"10px 14px", fontSize:12, color:msColor(avg), fontFamily:"monospace", fontWeight:600 }}>{avg}ms</td>
                          <td style={{ padding:"10px 14px" }}>
                            <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10.5, fontWeight:600,
                              background: Number(errRate) > 50 ? "rgba(248,113,113,0.12)" : Number(errRate) > 0 ? "rgba(245,158,11,0.1)" : "rgba(52,211,153,0.08)",
                              color: Number(errRate) > 50 ? "#F87171" : Number(errRate) > 0 ? "#F59E0B" : "#34D399",
                              border: `1px solid ${Number(errRate) > 50 ? "rgba(248,113,113,0.3)" : Number(errRate) > 0 ? "rgba(245,158,11,0.25)" : "rgba(52,211,153,0.2)"}`
                            }}>{errRate}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Live API call log */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
            <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:"#34D399", animation:"gmBlink 1.5s ease-in-out infinite" }} />
                <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#fff" }}>Live API Call Log</span>
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>· refreshes every 2s</span>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {["all","ok","error"].map(f => (
                  <button key={f} onClick={() => setApiFilter(f)} style={{ padding:"4px 10px", borderRadius:8, border:`1px solid ${apiFilter===f?"rgba(212,175,55,0.5)":"rgba(212,175,55,0.15)"}`, background:apiFilter===f?"rgba(212,175,55,0.12)":"transparent", color:apiFilter===f?"#D4AF37":"rgba(255,255,255,0.4)", fontSize:11, fontWeight:600, cursor:"pointer", textTransform:"capitalize" }}>{f}</button>
                ))}
              </div>
            </div>
            {logFiltered.length === 0 ? (
              <div style={{ padding:"40px 20px", textAlign:"center" }}>
                <Zap size={28} color="rgba(255,255,255,0.1)" style={{ marginBottom:10, display:"block", margin:"0 auto 10px" }} />
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)", marginBottom:4 }}>
                  {totalCalls === 0 ? "No API calls recorded yet" : "No calls match the filter"}
                </div>
                {totalCalls === 0 && (
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.2)", marginTop:4 }}>Navigate to any page to start seeing API calls here</div>
                )}
              </div>
            ) : (
              <div style={{ maxHeight:440, overflowY:"auto" }}>
                {logFiltered.slice(0, 80).map((l) => (
                  <div key={l.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 16px", borderBottom:"1px solid rgba(255,255,255,0.03)", background:!l.ok?"rgba(248,113,113,0.04)":"transparent" }}>
                    {/* Method */}
                    <span style={{ fontSize:10, fontWeight:700, fontFamily:"monospace", color:"#60A5FA", minWidth:36 }}>{l.method}</span>
                    {/* Status */}
                    <span style={{ fontSize:11, fontWeight:700, color:statusColor(l.status), minWidth:28, textAlign:"center" }}>{l.status||"ERR"}</span>
                    {/* URL */}
                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.65)", fontFamily:"monospace", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.url}</span>
                    {/* Latency */}
                    <span style={{ fontSize:11, fontWeight:600, color:msColor(l.ms), fontFamily:"monospace", minWidth:50, textAlign:"right" }}>{l.ms}ms</span>
                    {/* Time */}
                    <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)", minWidth:60, textAlign:"right" }}>{new Date(l.ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</span>
                    {/* Error */}
                    {!l.ok && l.error && (
                      <span style={{ fontSize:10, color:"#F87171", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={l.error}>{l.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── REDIS TAB ─── */}
      {tab === "redis" && (
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
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
              {rStats && (
                <div style={{ background:"rgba(212,175,55,0.04)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:14, padding:20 }}>
                  <div style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#D4AF37", marginBottom:12 }}>Memory Usage</div>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    {[
                      ["Used",  fmtBytes(rStats.used_memory     || rStats.usedMemory)],
                      ["Peak",  fmtBytes(rStats.used_memory_peak || rStats.peakMemory)],
                      ["RSS",   fmtBytes(rStats.used_memory_rss  || rStats.rssMemory)],
                    ].map(([l,v]) => (
                      <div key={l} style={{ flex:1, minWidth:70, background:"rgba(0,0,0,0.3)", borderRadius:10, padding:"12px 10px", textAlign:"center" }}>
                        <div style={{ fontSize:15, fontWeight:700, color:"#D4AF37" }}>{v}</div>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:4 }}>{l}</div>
                      </div>
                    ))}
                  </div>
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

          {/* Redis Key Pattern Counts */}
          {rPatterns && rPatterns.length > 0 && (
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
              <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(212,175,55,0.08)", fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#fff" }}>
                🔑 Redis Key Distribution by Pattern
              </div>
              <div style={{ padding:16, display:"flex", flexDirection:"column", gap:8 }}>
                {rPatterns.map((p, i) => {
                  const maxCount = rPatterns[0]?.count || 1;
                  const pct = Math.round((p.count / maxCount) * 100);
                  const colors = ["#60A5FA","#34D399","#F59E0B","#A78BFA","#F87171","#D4AF37"];
                  const col = colors[i % colors.length];
                  return (
                    <div key={p.pattern||i} style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <span style={{ fontSize:11, fontFamily:"monospace", color:"rgba(255,255,255,0.65)", minWidth:140, flexShrink:0 }}>{p.pattern || `pattern_${i}`}</span>
                      <div style={{ flex:1, height:6, background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ width:`${pct}%`, height:"100%", background:col, borderRadius:3, transition:"width .3s" }} />
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:col, minWidth:36, textAlign:"right" }}>{p.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── QUEUES TAB ─── */}
      {tab === "queues" && (
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
          {loading.queues && <Skeleton rows={5} />}
          {!loading.queues && !tabError && queueList.length === 0 && (
            <div style={{ textAlign:"center", padding:60, color:"rgba(255,255,255,0.25)" }}>
              <List size={32} color="rgba(255,255,255,0.08)" style={{ marginBottom:12, display:"block", margin:"0 auto 12px" }} />
              No queue data available
            </div>
          )}
          {!loading.queues && queueList.length > 0 && (
            <>
              {/* Summary */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
                {[
                  ["Total Queues", queueList.length,                                                          "#D4AF37"],
                  ["Active Jobs",  queueList.reduce((s,q)=>s+(q.active||q.activeCount||0),0),                "#4ade80"],
                  ["Waiting",      queueList.reduce((s,q)=>s+(q.waiting||q.waitingCount||0),0),              "#fb923c"],
                  ["Failed",       queueList.reduce((s,q)=>s+(q.failed||q.failedCount||0),0),               "#f87171"],
                ].map(([l,v,c]) => (
                  <div key={l} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:14, padding:18, textAlign:"center" }}>
                    <div style={{ fontSize:26, fontWeight:800, color:c }}>{v}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:4 }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Queue table */}
              <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
                <div style={{ padding:"13px 18px", borderBottom:"1px solid rgba(212,175,55,0.08)", fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#fff" }}>Job Queue Status</div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid rgba(212,175,55,0.1)" }}>
                        {["Queue Name","Active","Waiting","Completed","Failed","Delayed"].map(h=>(
                          <th key={h} style={{ padding:"11px 14px", textAlign:h==="Queue Name"?"left":"center", fontSize:10, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.6)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", whiteSpace:"nowrap" }}>{h}</th>
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
                            <td style={{ padding:"11px 14px", fontSize:13, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>{name}</td>
                            <td style={{ padding:"11px 14px", textAlign:"center", fontSize:13, color:active>0?"#4ade80":"rgba(255,255,255,0.35)", fontWeight:active>0?700:400 }}>{active}</td>
                            <td style={{ padding:"11px 14px", textAlign:"center", fontSize:13, color:waiting>0?"#fb923c":"rgba(255,255,255,0.35)", fontWeight:waiting>0?700:400 }}>{waiting}</td>
                            <td style={{ padding:"11px 14px", textAlign:"center", fontSize:13, color:"rgba(255,255,255,0.5)" }}>{completed}</td>
                            <td style={{ padding:"11px 14px", textAlign:"center", fontSize:13, color:failed>0?"#f87171":"rgba(255,255,255,0.35)", fontWeight:failed>0?700:400 }}>{failed}</td>
                            <td style={{ padding:"11px 14px", textAlign:"center", fontSize:13, color:delayed>0?"#a78bfa":"rgba(255,255,255,0.35)" }}>{delayed}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Failed Jobs */}
              {recentFailed.length > 0 && (
                <div style={{ background:"rgba(248,113,113,0.04)", border:"1px solid rgba(248,113,113,0.2)", borderRadius:16, overflow:"hidden" }}>
                  <div style={{ padding:"13px 18px", borderBottom:"1px solid rgba(248,113,113,0.12)", display:"flex", alignItems:"center", gap:8 }}>
                    <XCircle size={14} color="#F87171" />
                    <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#F87171" }}>Recent Failed Jobs ({recentFailed.length})</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                    {recentFailed.map((j, i) => (
                      <div key={i} style={{ padding:"12px 18px", borderBottom:"1px solid rgba(255,255,255,0.03)", display:"flex", flexDirection:"column", gap:5 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                          <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10.5, fontWeight:600, background:"rgba(248,113,113,0.12)", border:"1px solid rgba(248,113,113,0.25)", color:"#F87171" }}>{j.queue || "—"}</span>
                          <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.75)" }}>{j.name || `Job #${j.jobId}`}</span>
                          {j.jobId && <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"monospace" }}>#{j.jobId}</span>}
                          {j.finishedOn && <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)", marginLeft:"auto" }}>{fmtDateTime(j.finishedOn)}</span>}
                        </div>
                        {j.failedReason && (
                          <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", fontFamily:"monospace", background:"rgba(0,0,0,0.2)", borderRadius:6, padding:"6px 10px", lineHeight:1.5, wordBreak:"break-all" }}>
                            {j.failedReason}
                          </div>
                        )}
                        {j.error && (
                          <div style={{ fontSize:11, color:"#F87171" }}>{j.error}</div>
                        )}
                        {j.attemptsMade > 0 && (
                          <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>{j.attemptsMade} attempt{j.attemptsMade > 1 ? "s" : ""} made</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recentFailed.length === 0 && (
                <div style={{ padding:"16px 20px", background:"rgba(52,211,153,0.05)", border:"1px solid rgba(52,211,153,0.15)", borderRadius:12, display:"flex", alignItems:"center", gap:10 }}>
                  <CheckCircle size={15} color="#34D399" />
                  <span style={{ fontSize:13, color:"#34D399", fontWeight:600 }}>No recent failed jobs — all queues healthy</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
