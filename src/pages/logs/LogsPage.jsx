import { useState, useCallback, useEffect } from "react";
import {
  Activity, RefreshCw, Search, ChevronRight,
  Download, ShieldOff, Database, ChevronDown, ChevronUp,
  Zap, AlertCircle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getApiLogs } from "../../api/admin";
import { ToastProvider, useToast } from "../../components/ui/index.jsx";

// ── Access control ────────────────────────────────────────────────────────────
const ALLOWED_PHONES = new Set(["6205356010", "9540594976"]);
const normalizePhone = (p) => (p || "").replace(/\D/g, "").slice(-10);

// ── Predefined tabs ───────────────────────────────────────────────────────────
const TABS = [
  { key: "all",           label: "All"           },
  { key: "auth",          label: "Auth"          },
  { key: "admin",         label: "Admin"         },
  { key: "rides",         label: "Rides"         },
  { key: "payments",      label: "Payments"      },
  { key: "kyc",           label: "KYC"           },
  { key: "wallet",        label: "Wallet"        },
  { key: "drivers",       label: "Drivers"       },
  { key: "users",         label: "Users"         },
  { key: "notifications", label: "Notifications" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "support",       label: "Support"       },
  { key: "reviews",       label: "Reviews"       },
  { key: "sos",           label: "SOS"           },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusColor = (code) => {
  if (!code || code === 0) return { bg: "rgba(255,255,255,0.05)", br: "rgba(255,255,255,0.1)", tx: "rgba(255,255,255,0.3)" };
  if (code < 300)          return { bg: "rgba(52,211,153,0.12)",  br: "rgba(52,211,153,0.3)", tx: "#34D399" };
  if (code < 400)          return { bg: "rgba(96,165,250,0.12)",  br: "rgba(96,165,250,0.3)", tx: "#60A5FA" };
  if (code < 500)          return { bg: "rgba(245,158,11,0.12)",  br: "rgba(245,158,11,0.3)", tx: "#F59E0B" };
  return                          { bg: "rgba(248,113,113,0.12)", br: "rgba(248,113,113,0.3)", tx: "#F87171" };
};

const methodColor = (m = "") => ({
  GET: "#60A5FA", POST: "#34D399", PATCH: "#F59E0B",
  PUT: "#A78BFA", DELETE: "#F87171"
})[m?.toUpperCase()] || "rgba(255,255,255,0.4)";

const fmtTs = (ts) => {
  try {
    return new Date(ts).toLocaleString("en-IN", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  } catch { return ts || "—"; }
};

const prettyJson = (val) => {
  if (!val) return null;
  try {
    const obj = typeof val === "string" ? JSON.parse(val) : val;
    if (!obj || (typeof obj === "object" && Object.keys(obj).length === 0)) return null;
    return JSON.stringify(obj, null, 2);
  } catch { return String(val); }
};

// ── JSON block renderer ────────────────────────────────────────────────────────
function JsonBlock({ label, data }) {
  const text = prettyJson(data);
  if (!text) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(212,175,55,0.6)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 5 }}>
        {label}
      </div>
      <pre style={{
        margin: 0, padding: "10px 14px",
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(212,175,55,0.1)",
        borderRadius: 8,
        fontSize: 11.5, lineHeight: 1.6,
        color: "#34D399",
        overflowX: "auto",
        fontFamily: "monospace",
        maxHeight: 200,
        overflowY: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}>
        {text}
      </pre>
    </div>
  );
}

// ── Expanded JSON row ─────────────────────────────────────────────────────────
function ExpandedRow({ log, colSpan }) {
  const hasBody   = prettyJson(log.request_body);
  const hasQuery  = prettyJson(log.request_query);
  const hasParams = prettyJson(log.request_params);
  const hasError  = log.error_message;

  if (!hasBody && !hasQuery && !hasParams && !hasError) {
    return (
      <tr>
        <td colSpan={colSpan} style={{ padding: "12px 24px 16px", background: "rgba(212,175,55,0.02)" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>No JSON data for this request</span>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: "14px 24px 18px", background: "rgba(212,175,55,0.025)", borderBottom: "1px solid rgba(212,175,55,0.1)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {hasError && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(248,113,113,0.7)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 5 }}>Error Message</div>
              <div style={{ fontSize: 12.5, color: "#F87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "8px 12px", fontFamily: "monospace" }}>{log.error_message}</div>
            </div>
          )}
          <JsonBlock label="Request Body"   data={log.request_body}   />
          <JsonBlock label="Query Params"   data={log.request_query}  />
          <JsonBlock label="Path Params"    data={log.request_params} />
        </div>
      </td>
    </tr>
  );
}

// ── Access Denied ─────────────────────────────────────────────────────────────
function AccessDenied() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 18, textAlign: "center", padding: 40 }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ShieldOff size={32} color="#F87171" />
      </div>
      <div>
        <h2 style={{ fontFamily: "Cinzel,serif", fontSize: 20, color: "#F87171", margin: "0 0 8px" }}>Access Denied</h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0 }}>API Logs sirf authorized developers ke liye hai.</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function LogsContent() {
  const toast    = useToast();
  const { user } = useAuth();
  const allowed  = ALLOWED_PHONES.has(normalizePhone(user?.phone));
  if (!allowed) return <AccessDenied />;

  const [logs,       setLogs]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [lastFetch,  setLastFetch]  = useState(null);
  const [activeTab,  setActiveTab]  = useState("all");
  const [moduleInput, setModuleInput] = useState("");
  const [pathInput,   setPathInput]   = useState("");
  const [appliedModule, setAppliedModule] = useState("");
  const [appliedPath,   setAppliedPath]   = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setExpandedId(null);
    try {
      const res  = await getApiLogs({ limit: 300 });
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

  // fetch on mount
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Filter on Enter ──────────────────────────────────────────────────────────
  const onKey = (field) => (e) => {
    if (e.key !== "Enter") return;
    if (field === "module") setAppliedModule(moduleInput.trim().toLowerCase());
    if (field === "path")   setAppliedPath(pathInput.trim().toLowerCase());
    setExpandedId(null);
  };

  const clearFilters = () => {
    setModuleInput(""); setPathInput("");
    setAppliedModule(""); setAppliedPath("");
    setExpandedId(null);
  };

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `gomobility-logs-${Date.now()}.json`;
    a.click();
    toast("Exported as JSON", "success");
  };

  // ── Tab counts ───────────────────────────────────────────────────────────────
  const tabCounts = { all: logs.length };
  for (const l of logs) {
    const m = (l.module || "other").toLowerCase();
    tabCounts[m] = (tabCounts[m] || 0) + 1;
  }

  // ── Filter ───────────────────────────────────────────────────────────────────
  const filtered = logs.filter(l => {
    const mod = (l.module || "").toLowerCase();
    if (activeTab !== "all" && mod !== activeTab) return false;
    if (appliedModule && !mod.includes(appliedModule)) return false;
    if (appliedPath && !(l.path || "").toLowerCase().includes(appliedPath)) return false;
    return true;
  });

  const errors  = filtered.filter(l => l.is_error).length;
  const avgMs   = filtered.length
    ? Math.round(filtered.reduce((a, l) => a + (l.duration_ms || 0), 0) / filtered.length)
    : 0;

  const hasFilter = appliedModule || appliedPath;

  return (
    <div style={{ fontFamily: "Outfit,sans-serif", color: "rgba(255,255,255,0.88)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,rgba(212,175,55,0.18),rgba(212,175,55,0.06))", border: "1px solid rgba(212,175,55,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={19} color="#D4AF37" />
          </div>
          <div>
            <h1 style={{ fontFamily: "Cinzel,serif", fontSize: 21, fontWeight: 700, color: "#D4AF37", margin: 0, lineHeight: 1.2 }}>API Logs</h1>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", margin: 0 }}>
              Total in DB: {total.toLocaleString()}
              {lastFetch && <span style={{ marginLeft: 8 }}>· {lastFetch.toLocaleTimeString("en-IN")}</span>}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchLogs} disabled={loading}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:9, border:"1px solid rgba(212,175,55,0.25)", background:"rgba(212,175,55,0.07)", color:"#D4AF37", fontSize:12.5, fontWeight:600, cursor:loading?"not-allowed":"pointer", opacity:loading?0.6:1 }}>
            <RefreshCw size={13} style={{ animation:loading?"gmSpin .8s linear infinite":"none" }} />
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button onClick={exportLogs}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1px solid rgba(96,165,250,0.22)", background:"rgba(96,165,250,0.06)", color:"#60A5FA", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:22 }}>
        {[
          { label:"Total in DB",     value:total.toLocaleString(), color:"#D4AF37", icon:<Database size={15} color="#D4AF37"/> },
          { label:"Showing",         value:filtered.length,        color:"#A78BFA", icon:<Activity size={15} color="#A78BFA"/> },
          { label:"Errors",          value:errors,                 color:"#F87171", icon:<AlertCircle size={15} color="#F87171"/> },
          { label:"Avg Response",    value:filtered.length?`${avgMs}ms`:"—", color:"#34D399", icon:<Zap size={15} color="#34D399"/> },
        ].map(s => (
          <div key={s.label} style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.042),rgba(255,255,255,0.01))", border:"1px solid rgba(212,175,55,0.1)", borderRadius:13, padding:"13px 16px", display:"flex", alignItems:"center", gap:11 }}>
            <div style={{ width:34,height:34,borderRadius:9,background:`${s.color}12`,border:`1px solid ${s.color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize:18,fontWeight:700,color:s.color,lineHeight:1.1 }}>{s.value}</div>
              <div style={{ fontSize:10.5,color:"rgba(255,255,255,0.3)",marginTop:1 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.042),rgba(255,255,255,0.01))", border:"1px solid rgba(212,175,55,0.12)", borderRadius:18, overflow:"hidden" }}>

        {/* ── TABS ─────────────────────────────────────────────────────────── */}
        <div style={{ borderBottom:"1px solid rgba(212,175,55,0.1)", overflowX:"auto", background:"rgba(0,0,0,0.15)" }}>
          <div style={{ display:"flex", minWidth:"max-content", padding:"0 4px" }}>
            {TABS.map(tab => {
              const active = activeTab === tab.key;
              const count  = tabCounts[tab.key] || 0;
              const show   = tab.key === "all" || count > 0;
              if (!show) return null;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setExpandedId(null); }}
                  style={{
                    position: "relative",
                    padding: "13px 18px 11px",
                    fontSize: 12.5,
                    fontWeight: active ? 700 : 500,
                    color: active ? "#D4AF37" : "rgba(255,255,255,0.38)",
                    background: "none",
                    border: "none",
                    borderBottom: `2.5px solid ${active ? "#D4AF37" : "transparent"}`,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    whiteSpace: "nowrap",
                    transition: "all .18s",
                    outline: "none",
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.color="rgba(255,255,255,0.72)"; e.currentTarget.style.background="rgba(212,175,55,0.04)"; }}}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.color="rgba(255,255,255,0.38)"; e.currentTarget.style.background="none"; }}}
                >
                  {tab.label}
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, lineHeight: 1,
                    padding: "2px 6px", borderRadius: 100,
                    background: active ? "rgba(212,175,55,0.22)" : "rgba(255,255,255,0.07)",
                    color: active ? "#D4AF37" : "rgba(255,255,255,0.3)",
                    minWidth: 20, textAlign: "center",
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── FILTER BAR ───────────────────────────────────────────────────── */}
        <div style={{ padding:"12px 18px", borderBottom:"1px solid rgba(255,255,255,0.04)", display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", background:"rgba(0,0,0,0.08)" }}>
          <div style={{ position:"relative", flex:"1 1 180px", maxWidth:220 }}>
            <Search size={12} style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.25)",pointerEvents:"none" }}/>
            <input type="text" placeholder="Module filter… ↵ Enter"
              value={moduleInput} onChange={e => setModuleInput(e.target.value)} onKeyDown={onKey("module")}
              style={{ width:"100%",paddingLeft:30,paddingRight:10,paddingTop:7,paddingBottom:7,background:"rgba(255,255,255,0.05)",border:`1px solid ${appliedModule?"rgba(212,175,55,0.45)":"rgba(255,255,255,0.09)"}`,borderRadius:8,fontSize:12,color:"rgba(255,255,255,0.82)",outline:"none",boxSizing:"border-box" }}/>
          </div>
          <div style={{ position:"relative", flex:"2 1 240px", maxWidth:360 }}>
            <ChevronRight size={12} style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.25)",pointerEvents:"none" }}/>
            <input type="text" placeholder="Path filter… ↵ Enter"
              value={pathInput} onChange={e => setPathInput(e.target.value)} onKeyDown={onKey("path")}
              style={{ width:"100%",paddingLeft:30,paddingRight:10,paddingTop:7,paddingBottom:7,background:"rgba(255,255,255,0.05)",border:`1px solid ${appliedPath?"rgba(212,175,55,0.45)":"rgba(255,255,255,0.09)"}`,borderRadius:8,fontSize:12,color:"rgba(255,255,255,0.82)",outline:"none",boxSizing:"border-box" }}/>
          </div>
          {hasFilter && (
            <button onClick={clearFilters}
              style={{ display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:8,border:"1px solid rgba(248,113,113,0.22)",background:"rgba(248,113,113,0.06)",color:"#F87171",fontSize:11.5,fontWeight:600,cursor:"pointer" }}>
              × Clear
            </button>
          )}
          <span style={{ marginLeft:"auto",fontSize:11,color:"rgba(255,255,255,0.2)" }}>
            {filtered.length} of {total.toLocaleString()} · Click row = JSON
          </span>
        </div>

        {/* ── TABLE ────────────────────────────────────────────────────────── */}
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
            <thead>
              <tr style={{ borderBottom:"1px solid rgba(212,175,55,0.1)" }}>
                {["","Timestamp","Method","Module","Path","Status","Duration"].map((h,i) => (
                  <th key={i} style={{ padding:"10px 14px", textAlign:"left", fontSize:10, fontWeight:700, color:"rgba(212,175,55,0.5)", textTransform:"uppercase", letterSpacing:"0.8px", whiteSpace:"nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding:"52px 20px", textAlign:"center", color:"rgba(255,255,255,0.22)", fontSize:13 }}>
                  <RefreshCw size={24} style={{ animation:"gmSpin .8s linear infinite", display:"block", margin:"0 auto 10px" }} color="rgba(212,175,55,0.35)" />
                  Loading from database…
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:"52px 20px", textAlign:"center" }}>
                  <Activity size={28} color="rgba(255,255,255,0.08)" style={{ display:"block",margin:"0 auto 10px" }}/>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,0.2)" }}>
                    {logs.length === 0 ? "No logs yet — click Refresh" : "No entries match filter"}
                  </div>
                </td></tr>
              ) : (
                filtered.map((log, i) => {
                  const sc       = statusColor(log.status_code);
                  const mc       = methodColor(log.method);
                  const isOpen   = expandedId === log.id;
                  const hasJson  = prettyJson(log.request_body) || prettyJson(log.request_query) || prettyJson(log.request_params) || log.error_message;

                  return [
                    <tr
                      key={log.id || i}
                      onClick={() => setExpandedId(isOpen ? null : log.id)}
                      style={{ borderBottom: isOpen ? "none" : "1px solid rgba(255,255,255,0.04)", cursor:hasJson?"pointer":"default", transition:"background .1s", background: isOpen ? "rgba(212,175,55,0.04)" : "transparent" }}
                      onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background="rgba(212,175,55,0.025)"; }}
                      onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background="transparent"; }}
                    >
                      {/* Expand icon */}
                      <td style={{ padding:"9px 8px 9px 14px", width:24 }}>
                        {hasJson
                          ? (isOpen
                              ? <ChevronUp   size={13} color="#D4AF37"/>
                              : <ChevronDown size={13} color="rgba(255,255,255,0.22)"/>)
                          : <span style={{ display:"inline-block",width:13 }}/>}
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding:"9px 14px", whiteSpace:"nowrap" }}>
                        <span style={{ fontFamily:"monospace", fontSize:11, color:"rgba(255,255,255,0.48)" }}>{fmtTs(log.created_at)}</span>
                      </td>

                      {/* Method */}
                      <td style={{ padding:"9px 14px" }}>
                        <span style={{ display:"inline-flex",padding:"2px 8px",borderRadius:5,fontSize:10.5,fontWeight:700,background:`${mc}14`,border:`1px solid ${mc}28`,color:mc,fontFamily:"monospace" }}>
                          {(log.method||"—").toUpperCase()}
                        </span>
                      </td>

                      {/* Module */}
                      <td style={{ padding:"9px 14px" }}>
                        <span style={{ display:"inline-flex",padding:"2px 9px",borderRadius:100,fontSize:10.5,fontWeight:600,background:"rgba(212,175,55,0.09)",border:"1px solid rgba(212,175,55,0.18)",color:"#D4AF37" }}>
                          {log.module || "—"}
                        </span>
                      </td>

                      {/* Path */}
                      <td style={{ padding:"9px 14px", maxWidth:320 }}>
                        <span style={{ fontFamily:"monospace", fontSize:11.5, color:"rgba(255,255,255,0.65)", wordBreak:"break-all" }} title={log.path}>
                          {(log.path||"—").length > 52 ? (log.path||"").slice(0,52)+"…" : (log.path||"—")}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding:"9px 14px" }}>
                        <span style={{ display:"inline-flex",padding:"2px 9px",borderRadius:100,fontSize:11,fontWeight:700,fontFamily:"monospace",background:sc.bg,border:`1px solid ${sc.br}`,color:sc.tx }}>
                          {log.status_code || "ERR"}
                        </span>
                      </td>

                      {/* Duration */}
                      <td style={{ padding:"9px 14px", whiteSpace:"nowrap" }}>
                        <span style={{ fontFamily:"monospace", fontSize:12, color:log.duration_ms>1000?"#F59E0B":log.duration_ms>500?"#A78BFA":"rgba(255,255,255,0.42)" }}>
                          {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
                        </span>
                      </td>
                    </tr>,

                    // Expanded JSON row
                    isOpen && <ExpandedRow key={`${log.id}-exp`} log={log} colSpan={7} />
                  ];
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div style={{ padding:"10px 18px", borderTop:"1px solid rgba(255,255,255,0.04)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.22)" }}>
              Loaded {logs.length} · Showing {filtered.length} · Socket excluded · Max 300/fetch
            </span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.18)" }}>↓ Click any row to see JSON</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes gmSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        input:focus { border-color:rgba(212,175,55,0.5)!important; outline:none!important; }
      `}</style>
    </div>
  );
}

export default function LogsPage() {
  return <ToastProvider><LogsContent /></ToastProvider>;
}
