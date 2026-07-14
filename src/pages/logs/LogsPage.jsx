import { useState, useEffect, useRef, useCallback } from "react";
import {
  Activity, RefreshCw, Search, Filter, ChevronRight, Clock,
  AlertCircle, CheckCircle2, Zap, ArrowUpDown, Download, ShieldOff,
  Database
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getApiLogs } from "../../api/admin";
import { ToastProvider, useToast } from "../../components/ui/index.jsx";

// ── Access control — only these two phones can see logs ───────────────────────
const ALLOWED_PHONES = new Set(["6205356010", "9540594976"]);
const normalizePhone = (p) => (p || "").replace(/\D/g, "").slice(-10);

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusColor = (code) => {
  if (!code || code === 0)   return { bg:"rgba(255,255,255,0.06)", br:"rgba(255,255,255,0.12)", tx:"rgba(255,255,255,0.35)" };
  if (code < 300)            return { bg:"rgba(52,211,153,0.1)",   br:"rgba(52,211,153,0.3)",   tx:"#34D399" };
  if (code < 400)            return { bg:"rgba(96,165,250,0.1)",   br:"rgba(96,165,250,0.3)",   tx:"#60A5FA" };
  if (code < 500)            return { bg:"rgba(245,158,11,0.1)",   br:"rgba(245,158,11,0.3)",   tx:"#F59E0B" };
  return                            { bg:"rgba(248,113,113,0.1)",  br:"rgba(248,113,113,0.3)",  tx:"#F87171" };
};

const methodColor = (m = "") => {
  const M = { GET:"#60A5FA", POST:"#34D399", PATCH:"#F59E0B", PUT:"#A78BFA", DELETE:"#F87171" };
  return M[m?.toUpperCase()] || "rgba(255,255,255,0.45)";
};

const fmtTs = (ts) => {
  try {
    const d = new Date(ts);
    return d.toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", second:"2-digit" });
  } catch { return ts || "—"; }
};

const clampPath = (url = "") => url.length > 55 ? url.slice(0, 55) + "…" : url;

// ── Access Denied Screen ─────────────────────────────────────────────────────
function AccessDenied() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:400, gap:18, textAlign:"center", padding:40 }}>
      <div style={{ width:72, height:72, borderRadius:"50%", background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <ShieldOff size={32} color="#F87171" />
      </div>
      <div>
        <h2 style={{ fontFamily:"Cinzel,serif", fontSize:20, color:"#F87171", margin:"0 0 8px" }}>Access Denied</h2>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.35)", margin:0 }}>
          API Logs sirf authorized developers ke liye accessible hai.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function LogsContent() {
  const toast   = useToast();
  const { user } = useAuth();

  // ── Phone gate ──────────────────────────────────────────────────────────────
  const allowed = ALLOWED_PHONES.has(normalizePhone(user?.phone));
  if (!allowed) return <AccessDenied />;

  // ── State ────────────────────────────────────────────────────────────────────
  const [logs,       setLogs]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [lastFetch,  setLastFetch]  = useState(null);

  const [activeTab,  setActiveTab]  = useState("All");
  const [moduleInput, setModuleInput] = useState("");
  const [pathInput,   setPathInput]   = useState("");
  const [appliedModule, setAppliedModule] = useState("");
  const [appliedPath,   setAppliedPath]   = useState("");
  const [sortDesc,   setSortDesc]   = useState(true);

  // ── Fetch from backend ──────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApiLogs({ limit: 300 });
      const data = res.data?.data || res.data || {};
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setLastFetch(new Date());
    } catch (err) {
      toast(err?.response?.data?.message || "Failed to fetch logs", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Apply filter on Enter ───────────────────────────────────────────────────
  const handleKeyDown = (field) => (e) => {
    if (e.key !== "Enter") return;
    if (field === "module") setAppliedModule(moduleInput.trim().toLowerCase());
    if (field === "path")   setAppliedPath(pathInput.trim().toLowerCase());
  };

  const clearFilters = () => {
    setModuleInput(""); setPathInput("");
    setAppliedModule(""); setAppliedPath("");
  };

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type:"application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gomobility-api-logs-${Date.now()}.json`;
    a.click();
    toast("Logs exported as JSON", "success");
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const successes = logs.filter(l => !l.is_error).length;
  const errors    = logs.filter(l => l.is_error).length;
  const avgMs     = logs.length
    ? Math.round(logs.reduce((a, l) => a + (l.duration_ms || 0), 0) / logs.length)
    : 0;

  // ── Dynamic tabs from actual module values ──────────────────────────────────
  const modulesInData = [...new Set(logs.map(l => l.module || "unknown"))].sort();
  const visibleTabs   = ["All", ...modulesInData];

  // Tab counts
  const tabCounts = { All: logs.length };
  for (const l of logs) {
    const m = l.module || "unknown";
    tabCounts[m] = (tabCounts[m] || 0) + 1;
  }

  // ── Client-side filtering ───────────────────────────────────────────────────
  const filtered = logs
    .filter(l => {
      const mod = (l.module || "").toLowerCase();
      if (activeTab !== "All" && mod !== activeTab.toLowerCase()) return false;
      if (appliedModule && !mod.includes(appliedModule)) return false;
      if (appliedPath && !(l.path || "").toLowerCase().includes(appliedPath)) return false;
      return true;
    })
    .sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortDesc ? tb - ta : ta - tb;
    });

  const hasFilter = appliedModule || appliedPath;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"Outfit,sans-serif", color:"rgba(255,255,255,0.88)" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:"linear-gradient(135deg,rgba(212,175,55,0.18),rgba(212,175,55,0.06))", border:"1px solid rgba(212,175,55,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Activity size={18} color="#D4AF37" />
            </div>
            <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#D4AF37", margin:0 }}>API Logs</h1>
          </div>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.38)", margin:0 }}>
            Live backend database logs · Total DB entries: {total.toLocaleString()}
            {lastFetch && (
              <span style={{ marginLeft:10, color:"rgba(255,255,255,0.22)" }}>
                · Last fetched {lastFetch.toLocaleTimeString("en-IN")}
              </span>
            )}
          </p>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button
            onClick={fetchLogs}
            disabled={loading}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:9, border:"1px solid rgba(212,175,55,0.25)", background:"rgba(212,175,55,0.07)", color:"#D4AF37", fontSize:12.5, fontWeight:600, cursor:loading?"not-allowed":"pointer", opacity:loading?0.6:1 }}
          >
            <RefreshCw size={13} style={{ animation:loading?"gmSpin .8s linear infinite":"none" }} />
            {loading ? "Loading…" : "Refresh"}
          </button>

          <button
            onClick={exportLogs}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1px solid rgba(96,165,250,0.22)", background:"rgba(96,165,250,0.06)", color:"#60A5FA", fontSize:12.5, fontWeight:600, cursor:"pointer" }}
          >
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
        {[
          { label:"Total in DB",    value:total.toLocaleString(), icon:<Database size={16} color="#D4AF37"/>,      color:"#D4AF37" },
          { label:"Loaded (this page)", value:logs.length,        icon:<Activity size={16} color="#A78BFA"/>,      color:"#A78BFA" },
          { label:"Errors (4xx/5xx)",   value:errors,             icon:<AlertCircle size={16} color="#F87171"/>,   color:"#F87171" },
          { label:"Avg Response",       value:logs.length?`${avgMs}ms`:"—", icon:<Zap size={16} color="#34D399"/>, color:"#34D399" },
        ].map(s => (
          <div key={s.label} style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))", border:"1px solid rgba(212,175,55,0.1)", borderRadius:14, padding:"15px 18px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`${s.color}12`, border:`1px solid ${s.color}25`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize:19, fontWeight:700, color:s.color, lineHeight:1.1 }}>{s.value}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.32)", marginTop:2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))", border:"1px solid rgba(212,175,55,0.12)", borderRadius:18, overflow:"hidden" }}>

        {/* Card header */}
        <div style={{ padding:"17px 22px", borderBottom:"1px solid rgba(212,175,55,0.1)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:700, color:"#D4AF37", display:"flex", alignItems:"center", gap:7 }}>
            <Filter size={12} /> Request Log — Backend DB
          </span>
          <span style={{ fontSize:11.5, color:"rgba(255,255,255,0.28)" }}>
            Showing {filtered.length} of {logs.length} loaded
            {hasFilter && <span style={{ color:"#F59E0B", marginLeft:6 }}>· Filtered</span>}
          </span>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom:"1px solid rgba(212,175,55,0.07)", overflowX:"auto" }}>
          <div style={{ display:"flex", padding:"0 14px", minWidth:"max-content" }}>
            {visibleTabs.map(tab => {
              const active = activeTab === tab;
              const count  = tabCounts[tab] || 0;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{ padding:"10px 15px 9px", fontSize:12.5, fontWeight:active?700:500, color:active?"#D4AF37":"rgba(255,255,255,0.4)", background:"none", border:"none", borderBottom:`2px solid ${active?"#D4AF37":"transparent"}`, cursor:"pointer", display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap", transition:"all .15s" }}
                  onMouseEnter={e=>{ if(!active) e.currentTarget.style.color="rgba(255,255,255,0.7)"; }}
                  onMouseLeave={e=>{ if(!active) e.currentTarget.style.color="rgba(255,255,255,0.4)"; }}
                >
                  {tab}
                  <span style={{ fontSize:9.5, fontWeight:700, padding:"1px 5px", borderRadius:100, background:active?"rgba(212,175,55,0.2)":"rgba(255,255,255,0.07)", color:active?"#D4AF37":"rgba(255,255,255,0.3)", minWidth:18, textAlign:"center" }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ padding:"13px 20px", borderBottom:"1px solid rgba(255,255,255,0.04)", display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          {/* Module */}
          <div style={{ position:"relative", flex:"1 1 180px", maxWidth:230 }}>
            <Search size={12} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.28)", pointerEvents:"none" }}/>
            <input
              type="text"
              placeholder="Module filter… press Enter"
              value={moduleInput}
              onChange={e => setModuleInput(e.target.value)}
              onKeyDown={handleKeyDown("module")}
              style={{ width:"100%", paddingLeft:30, paddingRight:10, paddingTop:8, paddingBottom:8, background:"rgba(255,255,255,0.05)", border:`1px solid ${appliedModule?"rgba(212,175,55,0.45)":"rgba(255,255,255,0.1)"}`, borderRadius:9, fontSize:12.5, color:"rgba(255,255,255,0.82)", outline:"none", boxSizing:"border-box" }}
            />
          </div>

          {/* Path */}
          <div style={{ position:"relative", flex:"2 1 260px", maxWidth:380 }}>
            <ChevronRight size={12} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.28)", pointerEvents:"none" }}/>
            <input
              type="text"
              placeholder="Path filter… press Enter"
              value={pathInput}
              onChange={e => setPathInput(e.target.value)}
              onKeyDown={handleKeyDown("path")}
              style={{ width:"100%", paddingLeft:30, paddingRight:10, paddingTop:8, paddingBottom:8, background:"rgba(255,255,255,0.05)", border:`1px solid ${appliedPath?"rgba(212,175,55,0.45)":"rgba(255,255,255,0.1)"}`, borderRadius:9, fontSize:12.5, color:"rgba(255,255,255,0.82)", outline:"none", boxSizing:"border-box" }}
            />
          </div>

          <span style={{ fontSize:11, color:"rgba(255,255,255,0.2)", whiteSpace:"nowrap" }}>↵ Enter to filter</span>

          {hasFilter && (
            <button
              onClick={clearFilters}
              style={{ display:"flex", alignItems:"center", gap:4, padding:"7px 12px", borderRadius:8, border:"1px solid rgba(248,113,113,0.22)", background:"rgba(248,113,113,0.06)", color:"#F87171", fontSize:11.5, fontWeight:600, cursor:"pointer" }}
            >
              × Clear
            </button>
          )}

          <button
            onClick={() => setSortDesc(p => !p)}
            style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.09)", background:"rgba(255,255,255,0.03)", color:"rgba(255,255,255,0.45)", fontSize:11.5, cursor:"pointer" }}
          >
            <ArrowUpDown size={11}/> {sortDesc ? "Newest" : "Oldest"} First
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
            <thead>
              <tr style={{ borderBottom:"1px solid rgba(212,175,55,0.09)" }}>
                {["Timestamp","Method","Module","Path","Status","Duration","Error / IP"].map(h => (
                  <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:"rgba(212,175,55,0.5)", textTransform:"uppercase", letterSpacing:"0.9px", whiteSpace:"nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding:"52px 20px", textAlign:"center", color:"rgba(255,255,255,0.25)", fontSize:13 }}>
                  <RefreshCw size={24} style={{ animation:"gmSpin .8s linear infinite", display:"block", margin:"0 auto 10px" }} color="rgba(212,175,55,0.4)" />
                  Loading logs from database…
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:"52px 20px", textAlign:"center" }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                    <Activity size={30} color="rgba(255,255,255,0.08)" />
                    <div style={{ fontSize:13, color:"rgba(255,255,255,0.22)" }}>
                      {logs.length === 0 ? "No logs found in database" : "No entries match your filter"}
                    </div>
                  </div>
                </td></tr>
              ) : (
                filtered.map((log, i) => {
                  const sc  = statusColor(log.status_code);
                  const mc  = methodColor(log.method);
                  return (
                    <tr
                      key={log.id || i}
                      style={{ borderBottom:"1px solid rgba(255,255,255,0.035)", transition:"background .1s" }}
                      onMouseEnter={e => e.currentTarget.style.background="rgba(212,175,55,0.022)"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}
                    >
                      {/* Timestamp */}
                      <td style={{ padding:"9px 16px", whiteSpace:"nowrap" }}>
                        <span style={{ fontFamily:"monospace", fontSize:11.5, color:"rgba(255,255,255,0.5)" }}>
                          {fmtTs(log.created_at)}
                        </span>
                      </td>

                      {/* Method */}
                      <td style={{ padding:"9px 16px" }}>
                        <span style={{ display:"inline-flex", padding:"2px 8px", borderRadius:5, fontSize:10.5, fontWeight:700, background:`${mc}14`, border:`1px solid ${mc}28`, color:mc, fontFamily:"monospace" }}>
                          {(log.method || "—").toUpperCase()}
                        </span>
                      </td>

                      {/* Module */}
                      <td style={{ padding:"9px 16px" }}>
                        <span style={{ display:"inline-flex", padding:"2px 9px", borderRadius:100, fontSize:10.5, fontWeight:600, background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.16)", color:"#D4AF37" }}>
                          {log.module || "—"}
                        </span>
                      </td>

                      {/* Path */}
                      <td style={{ padding:"9px 16px", maxWidth:340 }}>
                        <span style={{ fontFamily:"monospace", fontSize:11.5, color:"rgba(255,255,255,0.68)", wordBreak:"break-all" }} title={log.path}>
                          {clampPath(log.path || "—")}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding:"9px 16px" }}>
                        <span style={{ display:"inline-flex", padding:"3px 9px", borderRadius:100, fontSize:11, fontWeight:700, fontFamily:"monospace", background:sc.bg, border:`1px solid ${sc.br}`, color:sc.tx }}>
                          {log.status_code || "ERR"}
                        </span>
                      </td>

                      {/* Duration */}
                      <td style={{ padding:"9px 16px", whiteSpace:"nowrap" }}>
                        <span style={{ fontFamily:"monospace", fontSize:12, color:log.duration_ms>1000?"#F59E0B":log.duration_ms>500?"#A78BFA":"rgba(255,255,255,0.45)" }}>
                          {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
                        </span>
                      </td>

                      {/* Error / IP */}
                      <td style={{ padding:"9px 16px", maxWidth:240 }}>
                        {log.error_message ? (
                          <span style={{ fontSize:11.5, color:"#F87171", fontStyle:"italic" }} title={log.error_message}>
                            {log.error_message.length > 45 ? log.error_message.slice(0, 45) + "…" : log.error_message}
                          </span>
                        ) : (
                          <span style={{ fontSize:11, color:"rgba(255,255,255,0.22)", fontFamily:"monospace" }}>
                            {log.ip_address || "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div style={{ padding:"11px 20px", borderTop:"1px solid rgba(255,255,255,0.04)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:11.5, color:"rgba(255,255,255,0.25)" }}>
              Loaded last 300 entries · Total in DB: {total.toLocaleString()} · Socket excluded
            </span>
            {lastFetch && (
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", gap:5 }}>
                <Clock size={10}/> {lastFetch.toLocaleTimeString("en-IN")}
              </span>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes gmSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} input:focus{border-color:rgba(212,175,55,0.5)!important;}`}</style>
    </div>
  );
}

export default function LogsPage() {
  return (
    <ToastProvider>
      <LogsContent />
    </ToastProvider>
  );
}
