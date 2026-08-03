import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, ChevronLeft, ChevronRight, RefreshCw, X,
  AlertTriangle, ExternalLink, Activity, Map as MapIcon,
  BarChart3, Trophy, Car, Users, Wifi, WifiOff, Clock,
  IndianRupee, Star, TrendingUp, Shield,
} from "lucide-react";
import {
  MapContainer, TileLayer, CircleMarker, Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as RTooltip, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import {
  getDMDrivers, getDMDriversSummary,
  getDMLiveMap, getDMLiveMapSummary,
  getDMLeaderboard, getDMFleetSummary, getDMBreakCompliance,
} from "../../api/driverMetrics";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtRupee  = (n) => n != null ? "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n)) : "—";
const fmtNum    = (n) => n != null ? new Intl.NumberFormat("en-IN").format(n) : "—";
const fmtRate   = (v) => v === null || v === undefined ? "—" : Number(v).toFixed(1) + "%";
const fmtMins   = (m) => m != null ? `${Math.floor(m / 60)}h ${m % 60}m` : "—";

// ── constants ─────────────────────────────────────────────────────────────────
const VT_COLORS = {
  bike:"#60a5fa", auto:"#D4AF37", car:"#4ade80",
  xl:"#a78bfa", premium:"#f59e0b", luxury:"#f87171",
};
const STATUS_CFG = {
  online:  { dot:"#22c55e", bg:"rgba(34,197,94,0.1)",   border:"rgba(34,197,94,0.28)",   label:"Online",  map:"#22c55e" },
  on_ride: { dot:"#60a5fa", bg:"rgba(96,165,250,0.1)",  border:"rgba(96,165,250,0.28)",  label:"On Ride", map:"#60a5fa" },
  offline: { dot:"#4b5563", bg:"rgba(75,85,99,0.1)",    border:"rgba(75,85,99,0.22)",    label:"Offline", map:"#4b5563" },
};
const VT_LIST = ["bike","auto","car","xl","premium","luxury"];
const PERIOD_OPTS = [
  { label:"Today",      value:"today" },
  { label:"7 days",     value:"7d"    },
  { label:"30 days",    value:"30d"   },
  { label:"This month", value:"month" },
];
const FLEET_TABS = ["Leaderboard","Fleet Summary","Break Compliance"];
const PIE_COLORS = ["#22c55e","#60a5fa","#4b5563","#F59E0B","#a78bfa","#f87171"];

// ── global styles ─────────────────────────────────────────────────────────────
const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Outfit:wght@300;400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box}
    @keyframes dmPulse{0%,100%{opacity:1}50%{opacity:.35}}
    @keyframes fup{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes ping{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.4)}}
    .fup{animation:fup .38s cubic-bezier(.22,1,.36,1) both}
    .dm-skel{display:inline-block;border-radius:6px;background:rgba(255,255,255,0.06);animation:dmPulse 1.4s ease-in-out infinite}
    .dm-tr:hover{background:rgba(212,175,55,0.04)!important;cursor:pointer}
    .dm-tr td,.dm-tr-plain td{border-bottom:1px solid rgba(255,255,255,0.04)!important}
    .dm-tab{display:inline-flex;align-items:center;gap:7px;padding:9px 20px;border-radius:12px;border:1px solid transparent;cursor:pointer;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;transition:all .2s;white-space:nowrap;background:none}
    .dm-tab.on{background:rgba(212,175,55,0.12);border-color:rgba(212,175,55,0.35);color:#D4AF37}
    .dm-tab:not(.on){border-color:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5)}
    .dm-tab:not(.on):hover{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.75)}
    .dm-card{background:linear-gradient(145deg,rgba(255,255,255,0.048),rgba(255,255,255,0.012));border:1px solid rgba(212,175,55,0.15);border-radius:18px;position:relative;overflow:hidden}
    .dm-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.35),transparent)}
    .dm-inp{background:rgba(255,255,255,0.06);border:1px solid rgba(212,175,55,0.15);border-radius:10px;padding:8px 12px;color:#fff;font-size:13px;outline:none;font-family:'Outfit',sans-serif;height:38px;transition:border-color .2s}
    .dm-inp:focus{border-color:rgba(212,175,55,0.4)}
    .dm-inp option{background:#020d26}
    .leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#020d26!important;border:1px solid rgba(212,175,55,0.25)!important;color:#fff!important;box-shadow:0 8px 32px rgba(0,0,0,0.6)!important}
    .leaflet-popup-content{margin:10px 14px!important;font-family:'Outfit',sans-serif!important}
    .recharts-cartesian-axis-tick-value{font-family:'Outfit',sans-serif;fill:rgba(255,255,255,0.45)!important}
    .recharts-tooltip-wrapper .recharts-default-tooltip{background:#020d26!important;border:1px solid rgba(212,175,55,0.22)!important;border-radius:10px!important}
  `}</style>
);

// ── shared sub-components ─────────────────────────────────────────────────────
const Skel = ({ w="80%", h=14 }) =>
  <span className="dm-skel" style={{ width:w, height:h }} />;

const StatusPill = ({ status }) => {
  const c = STATUS_CFG[status] || STATUS_CFG.offline;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:c.bg, border:`1px solid ${c.border}`, borderRadius:999, padding:"3px 9px", fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.9)", whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:c.dot, flexShrink:0 }} />
      {c.label}
    </span>
  );
};

const ConnectionBadge = ({ conn }) => {
  if (!conn?.isOnlineButAppDisconnected) return null;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.32)", color:"#F59E0B", borderRadius:999, padding:"2px 7px", fontSize:10, fontWeight:600, whiteSpace:"nowrap" }}>
      <AlertTriangle size={9}/> Ghost
    </span>
  );
};

const VtBadge = ({ types=[] }) => {
  const list = Array.isArray(types) ? types : [types].filter(Boolean);
  return (
    <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
      {list.map(t=>(
        <span key={t} style={{ background:`${VT_COLORS[t]||"#94a3b8"}22`, border:`1px solid ${VT_COLORS[t]||"#94a3b8"}55`, color:VT_COLORS[t]||"#94a3b8", borderRadius:6, padding:"1px 6px", fontSize:10, fontWeight:600, textTransform:"uppercase" }}>{t}</span>
      ))}
    </div>
  );
};

const SummChip = ({ label, value, color, loading }) => (
  <div className="dm-card" style={{ padding:"12px 16px", flex:"1 1 auto", minWidth:100 }}>
    <p style={{ margin:"0 0 3px", fontSize:9.5, color:"rgba(212,175,55,0.5)", fontFamily:"'Cinzel',serif", letterSpacing:1.5, textTransform:"uppercase" }}>{label}</p>
    <p style={{ margin:0, fontSize:20, fontWeight:700, fontFamily:"'Cinzel',serif", color:color||"#fff" }}>
      {loading ? <Skel w={48} h={20}/> : value ?? "—"}
    </p>
  </div>
);

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:360 }}>
    <span style={{ flex:1 }}>{msg}</span>
    <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", padding:0 }}><X size={14}/></button>
  </div>
);

const thStyle = { padding:"11px 14px", textAlign:"left", fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:600, color:"rgba(212,175,55,0.65)", letterSpacing:1.2, textTransform:"uppercase", whiteSpace:"nowrap" };
const tdStyle = { padding:"13px 14px", color:"rgba(255,255,255,0.82)", fontFamily:"'Outfit',sans-serif", fontSize:13 };

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 1 — Drivers List
// ─────────────────────────────────────────────────────────────────────────────
function DriversListSection() {
  const navigate = useNavigate();
  const [drivers,    setDrivers]    = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [pagination, setPag]        = useState({ total:0 });
  const [loading,    setLoading]    = useState(true);
  const [sLoading,   setSLoading]   = useState(true);
  const [toast,      setToast]      = useState(null);
  const [search,     setSearch]     = useState("");
  const [status,     setStatus]     = useState("all");
  const [vtype,      setVtype]      = useState("all");
  const [city,       setCity]       = useState("");
  const [period,     setPeriod]     = useState("today");
  const [offset,     setOffset]     = useState(0);
  const LIMIT = 20;

  const showToast = (m,t="error") => { setToast({m,t}); setTimeout(()=>setToast(null),3500); };

  const loadSumm = useCallback(async () => {
    setSLoading(true);
    try { const r = await getDMDriversSummary({ period }); setSummary(r.data?.data || r.data || null); }
    catch { setSummary(null); } finally { setSLoading(false); }
  }, [period]);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const p = { limit:LIMIT, offset, period };
      if (search)          p.search       = search;
      if (status!=="all")  p.status       = status;
      if (vtype !=="all")  p.vehicle_type = vtype;
      if (city.trim())     p.city         = city.trim();
      const r = await getDMDrivers(p);
      const d = r.data?.data || r.data || {};
      setDrivers(d.drivers || []);
      setPag(d.pagination || { total:0 });
    } catch(e) {
      showToast(e?.response?.data?.message || "Failed to load drivers");
      setDrivers([]);
    } finally { setLoading(false); }
  }, [search, status, vtype, city, period, offset]);

  useEffect(() => { loadSumm(); }, [loadSumm]);
  useEffect(() => { setOffset(0); }, [search, status, vtype, city, period]);
  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  const totalPages = Math.max(1, Math.ceil((pagination.total||0)/LIMIT));
  const curPage    = Math.floor(offset/LIMIT)+1;

  return (
    <div>
      {toast && <Toast msg={toast.m} type={toast.t} onClose={()=>setToast(null)}/>}

      {/* Summary chips */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
        <SummChip label="Total"          value={fmtNum(summary?.total)}            loading={sLoading}/>
        <SummChip label="Online"         value={fmtNum(summary?.online)}           color="#22c55e" loading={sLoading}/>
        <SummChip label="On Ride"        value={fmtNum(summary?.on_ride)}          color="#60a5fa" loading={sLoading}/>
        <SummChip label="Offline"        value={fmtNum(summary?.offline)}          color="#6b7280" loading={sLoading}/>
        <SummChip label="Ghost Drivers"  value={fmtNum(summary?.ghost_drivers)}    color="#F59E0B" loading={sLoading}/>
        <SummChip label="Avg Rating"     value={summary?.avg_rating!=null?Number(summary.avg_rating).toFixed(1)+"★":"—"} loading={sLoading}/>
        <SummChip label="Avg Acceptance" value={fmtRate(summary?.avg_acceptance_rate)} loading={sLoading}/>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
        <div style={{ position:"relative", flex:"2 1 200px", minWidth:160 }}>
          <Search size={13} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.3)", pointerEvents:"none" }}/>
          <input className="dm-inp" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name / phone / GO ID…" style={{ paddingLeft:30, width:"100%" }}/>
        </div>
        <select className="dm-inp" value={status}  onChange={e=>setStatus(e.target.value)} style={{ flex:"0 0 128px", cursor:"pointer" }}>
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="on_ride">On Ride</option>
          <option value="offline">Offline</option>
        </select>
        <select className="dm-inp" value={vtype}   onChange={e=>setVtype(e.target.value)}  style={{ flex:"0 0 128px", cursor:"pointer" }}>
          <option value="all">All Types</option>
          {VT_LIST.map(v=><option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
        </select>
        <input className="dm-inp" value={city}     onChange={e=>setCity(e.target.value)}   placeholder="City…" style={{ flex:"1 1 100px", minWidth:90 }}/>
        <select className="dm-inp" value={period}  onChange={e=>setPeriod(e.target.value)} style={{ flex:"0 0 120px", cursor:"pointer" }}>
          {PERIOD_OPTS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <button onClick={()=>{loadSumm();loadDrivers();}} style={{ height:38, padding:"0 12px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.28)", borderRadius:10, color:"#D4AF37", cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontSize:13, fontFamily:"Outfit,sans-serif" }}>
          <RefreshCw size={12}/> Refresh
        </button>
        {(search||status!=="all"||vtype!=="all"||city) && (
          <button onClick={()=>{setSearch("");setStatus("all");setVtype("all");setCity("");}} style={{ height:38, padding:"0 12px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.28)", borderRadius:10, color:"#f87171", cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontSize:13, fontFamily:"Outfit,sans-serif" }}>
            <X size={12}/> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="dm-card" style={{ overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"rgba(212,175,55,0.05)", borderBottom:"1px solid rgba(212,175,55,0.1)" }}>
                {["Driver","Status","Vehicle","Rides","Earnings","Rating","City",""].map(h=>(
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:8}).map((_,i)=>(
                <tr key={i}>
                  {[140,100,80,50,80,50,70,50].map((w,j)=>(
                    <td key={j} style={tdStyle}><Skel w={w}/></td>
                  ))}
                </tr>
              )) : drivers.length===0 ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign:"center", padding:"48px 16px", color:"rgba(255,255,255,0.25)", fontStyle:"italic" }}>No drivers match the selected filters</td></tr>
              ) : drivers.map(d=>{
                const vt = d.vehicle?.types || d.vehicle_types || (d.vehicle_type?[d.vehicle_type]:[]);
                return (
                  <tr key={d.id} className="dm-tr" onClick={()=>navigate(`/driver-metrics/${d.id}`)}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight:600, color:"#fff", marginBottom:2 }}>{d.name||d.full_name||"—"}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.38)" }}>{d.phone||d.phone_number||"—"}</div>
                      {d.go_id&&<div style={{ fontSize:10, color:"rgba(212,175,55,0.5)" }}>{d.go_id}</div>}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        <StatusPill status={d.status}/>
                        <ConnectionBadge conn={d.connection}/>
                      </div>
                    </td>
                    <td style={tdStyle}><VtBadge types={vt}/></td>
                    <td style={{ ...tdStyle, fontVariantNumeric:"tabular-nums" }}>{fmtNum(d.today_rides??d.rides_today??d.total_rides)}</td>
                    <td style={{ ...tdStyle, color:"#D4AF37", fontWeight:600, fontVariantNumeric:"tabular-nums" }}>{fmtRupee(d.today_earnings??d.earnings_today??d.total_earnings)}</td>
                    <td style={{ ...tdStyle, whiteSpace:"nowrap" }}>
                      {d.rating!=null?<span style={{ color:"#D4AF37", fontWeight:600 }}>{Number(d.rating).toFixed(1)} <span style={{ fontSize:10 }}>★</span></span>:"—"}
                    </td>
                    <td style={{ ...tdStyle, color:"rgba(255,255,255,0.45)", fontSize:12 }}>{d.city||"—"}</td>
                    <td style={tdStyle}>
                      <button onClick={e=>{e.stopPropagation();navigate(`/driver-metrics/${d.id}`);}} style={{ background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.22)", borderRadius:8, padding:"4px 10px", color:"#D4AF37", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontFamily:"Outfit,sans-serif" }}>
                        <ExternalLink size={10}/> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pagination.total>0&&(
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderTop:"1px solid rgba(212,175,55,0.08)", flexWrap:"wrap", gap:8 }}>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>
              {fmtNum(pagination.total)} drivers &nbsp;·&nbsp; Page {curPage} of {totalPages}
            </span>
            <div style={{ display:"flex", gap:7 }}>
              <button disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-LIMIT))} style={{ height:32, padding:"0 12px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:8, color:offset===0?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.65)", cursor:offset===0?"default":"pointer", display:"inline-flex", alignItems:"center", gap:4, fontSize:12, fontFamily:"Outfit,sans-serif" }}>
                <ChevronLeft size={12}/> Prev
              </button>
              <button disabled={offset+LIMIT>=pagination.total} onClick={()=>setOffset(offset+LIMIT)} style={{ height:32, padding:"0 12px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:8, color:offset+LIMIT>=pagination.total?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.65)", cursor:offset+LIMIT>=pagination.total?"default":"pointer", display:"inline-flex", alignItems:"center", gap:4, fontSize:12, fontFamily:"Outfit,sans-serif" }}>
                Next <ChevronRight size={12}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 2 — Live Map
// ─────────────────────────────────────────────────────────────────────────────
function LiveMapSection() {
  const navigate      = useNavigate();
  const [drivers,  setDrivers]  = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [sLoading, setSLoading] = useState(true);
  const [countdown,setCountdown]= useState(15);
  const [toast,    setToast]    = useState(null);
  const intervalRef = useRef(null);
  const countRef    = useRef(null);

  const showToast = (m,t="error") => { setToast({m,t}); setTimeout(()=>setToast(null),3500); };

  const fetchAll = useCallback(async () => {
    setLoading(true); setSLoading(true);
    try {
      const [mapRes, summRes] = await Promise.all([getDMLiveMap(), getDMLiveMapSummary()]);
      const md = mapRes.data?.data  || mapRes.data  || {};
      const sd = summRes.data?.data || summRes.data || null;
      setDrivers(md.drivers || []);
      setSummary(sd);
    } catch(e) {
      showToast(e?.response?.data?.message || "Failed to load live map");
    } finally { setLoading(false); setSLoading(false); setCountdown(15); }
  }, []);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 15000);
    countRef.current    = setInterval(()=>setCountdown(c=>c>0?c-1:15), 1000);
    return () => { clearInterval(intervalRef.current); clearInterval(countRef.current); };
  }, [fetchAll]);

  const getColor = (d) => {
    if (d.connection?.isOnlineButAppDisconnected) return "#F59E0B";
    return STATUS_CFG[d.status]?.map || "#4b5563";
  };

  const center = [20.5937, 78.9629]; // India center

  return (
    <div>
      {toast && <Toast msg={toast.m} type={toast.t} onClose={()=>setToast(null)}/>}

      {/* Summary chips */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
        <SummChip label="Total Online"  value={fmtNum(summary?.total_online)}  color="#22c55e" loading={sLoading}/>
        <SummChip label="On Ride"       value={fmtNum(summary?.on_ride)}        color="#60a5fa" loading={sLoading}/>
        <SummChip label="Idle Online"   value={fmtNum(summary?.idle_online)}    color="#D4AF37" loading={sLoading}/>
        <SummChip label="Ghost Drivers" value={fmtNum(summary?.ghost_drivers)}  color="#F59E0B" loading={sLoading}/>
        <SummChip label="Total Offline" value={fmtNum(summary?.total_offline)}  color="#4b5563" loading={sLoading}/>
        <div className="dm-card" style={{ padding:"12px 16px", flex:"1 1 auto", minWidth:130, display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
          <p style={{ margin:"0 0 3px", fontSize:9.5, color:"rgba(212,175,55,0.5)", fontFamily:"'Cinzel',serif", letterSpacing:1.5, textTransform:"uppercase" }}>Auto-refresh</p>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:20, fontWeight:700, fontFamily:"'Cinzel',serif", color:"#fff" }}>{countdown}s</span>
            <button onClick={fetchAll} style={{ background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.28)", borderRadius:8, padding:"4px 10px", color:"#D4AF37", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontFamily:"Outfit,sans-serif" }}>
              <RefreshCw size={11}/> Now
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:"flex", gap:14, marginBottom:12, flexWrap:"wrap" }}>
        {[{c:"#22c55e",l:"Online"},{c:"#60a5fa",l:"On Ride"},{c:"#4b5563",l:"Offline"},{c:"#F59E0B",l:"Ghost Driver"}].map(({c,l})=>(
          <span key={l} style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, color:"rgba(255,255,255,0.55)", fontFamily:"Outfit,sans-serif" }}>
            <span style={{ width:10, height:10, borderRadius:"50%", background:c, flexShrink:0 }}/>{l}
          </span>
        ))}
      </div>

      {/* Map */}
      <div className="dm-card" style={{ height:520, overflow:"hidden", borderRadius:18 }}>
        {loading && drivers.length===0 ? (
          <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
            <RefreshCw size={28} color="rgba(212,175,55,0.4)" style={{ animation:"spin 1s linear infinite" }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ color:"rgba(255,255,255,0.35)", fontSize:13, fontFamily:"Outfit,sans-serif", margin:0 }}>Loading live map…</p>
          </div>
        ) : (
          <MapContainer center={center} zoom={5} style={{ height:"100%", width:"100%", background:"#020d26" }} zoomControl>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            {drivers.map(d=>{
              const lat = d.location?.lat ?? d.lat ?? d.latitude;
              const lng = d.location?.lng ?? d.lng ?? d.longitude;
              if (!lat||!lng) return null;
              const col = getColor(d);
              const vt  = d.vehicle?.types || d.vehicle_types || [];
              return (
                <CircleMarker
                  key={d.id}
                  center={[lat,lng]}
                  radius={d.status==="on_ride"?9:7}
                  pathOptions={{ color:col, fillColor:col, fillOpacity:0.85, weight:2 }}
                >
                  <Popup>
                    <div style={{ minWidth:180 }}>
                      <p style={{ margin:"0 0 6px", fontWeight:700, fontSize:14, color:"#fff" }}>{d.name||d.full_name||"Driver #"+d.id}</p>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
                        <StatusPill status={d.status}/>
                        <ConnectionBadge conn={d.connection}/>
                      </div>
                      {vt.length>0 && <VtBadge types={vt}/>}
                      {d.city && <p style={{ margin:"6px 0 0", fontSize:11, color:"rgba(255,255,255,0.5)" }}>{d.city}</p>}
                      <button
                        onClick={()=>navigate(`/driver-metrics/${d.id}`)}
                        style={{ marginTop:10, width:"100%", background:"rgba(212,175,55,0.12)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:8, padding:"6px 0", color:"#D4AF37", cursor:"pointer", fontSize:12, fontFamily:"Outfit,sans-serif", fontWeight:600 }}
                      >
                        View Details →
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </div>

      <p style={{ marginTop:10, fontSize:11, color:"rgba(255,255,255,0.25)", fontFamily:"Outfit,sans-serif", textAlign:"right" }}>
        Showing {drivers.length} driver{drivers.length!==1?"s":""} · auto-refreshes every 15 s
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 3 — Fleet Analytics
// ─────────────────────────────────────────────────────────────────────────────
const CTooltip = ({ active, payload, label, fmt }) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:"rgba(2,13,38,0.97)", border:"1px solid rgba(212,175,55,0.22)", borderRadius:10, padding:"9px 12px" }}>
      {label&&<p style={{ margin:"0 0 4px", fontSize:10, color:"rgba(212,175,55,0.55)", fontFamily:"Outfit,sans-serif" }}>{label}</p>}
      {payload.map((p,i)=>(
        <p key={i} style={{ margin:0, fontSize:12, color:"#fff", fontWeight:600, fontFamily:"Outfit,sans-serif" }}>
          {p.name||p.dataKey}: {fmt?fmt(p.value):p.value}
        </p>
      ))}
    </div>
  );
};

function FleetAnalyticsSection() {
  const [sub,     setSub]     = useState(0);
  const [period,  setPeriod]  = useState("today");
  const [loading, setLoading] = useState(true);
  const [data,    setData]    = useState({ leaderboard:[], fleet:null, compliance:[] });
  const [toast,   setToast]   = useState(null);

  const showToast = (m,t="error") => { setToast({m,t}); setTimeout(()=>setToast(null),3500); };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = { period };
      const [lbRes, fsRes, bcRes] = await Promise.all([
        getDMLeaderboard(params),
        getDMFleetSummary(params),
        getDMBreakCompliance(params),
      ]);
      setData({
        leaderboard: lbRes.data?.data?.drivers || lbRes.data?.data || [],
        fleet:       fsRes.data?.data || fsRes.data || null,
        compliance:  bcRes.data?.data?.drivers || bcRes.data?.data || [],
      });
    } catch(e) {
      showToast(e?.response?.data?.message || "Failed to load fleet analytics");
    } finally { setLoading(false); }
  }, [period]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const subTabBtn = (label, idx) => (
    <button key={idx} onClick={()=>setSub(idx)} style={{ height:36, padding:"0 16px", borderRadius:10, border:`1px solid ${sub===idx?"rgba(212,175,55,0.35)":"rgba(255,255,255,0.08)"}`, background:sub===idx?"rgba(212,175,55,0.1)":"rgba(255,255,255,0.03)", color:sub===idx?"#D4AF37":"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:12, fontFamily:"Outfit,sans-serif", fontWeight:500 }}>
      {label}
    </button>
  );

  // Fleet vehicle type distribution for pie chart
  const vtDist = data.fleet?.vehicle_type_distribution || [];
  const vtPie  = vtDist.map((v,i)=>({ name:v.vehicle_type||v.type||"Other", value:v.count||v.drivers||0, color:PIE_COLORS[i%PIE_COLORS.length] }));

  // Daily bar chart
  const dailyData = data.fleet?.daily || [];

  return (
    <div>
      {toast && <Toast msg={toast.m} type={toast.t} onClose={()=>setToast(null)}/>}

      {/* Controls */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20, alignItems:"center" }}>
        {FLEET_TABS.map((t,i)=>subTabBtn(t,i))}
        <div style={{ flex:1 }}/>
        <select className="dm-inp" value={period} onChange={e=>setPeriod(e.target.value)} style={{ flex:"0 0 120px", cursor:"pointer" }}>
          {PERIOD_OPTS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <button onClick={loadAll} style={{ height:38, padding:"0 12px", background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.25)", borderRadius:10, color:"#D4AF37", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5, fontSize:13, fontFamily:"Outfit,sans-serif" }}>
          <RefreshCw size={12}/>
        </button>
      </div>

      {/* ── Sub-tab 0: Leaderboard ── */}
      {sub===0&&(
        <div className="dm-card" style={{ overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"rgba(212,175,55,0.05)", borderBottom:"1px solid rgba(212,175,55,0.1)" }}>
                  {["#","Driver","Rides","Acceptance","Completion","Earnings","Rating"].map(h=>(
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({length:6}).map((_,i)=>(
                  <tr key={i}>{[30,150,50,70,70,80,50].map((w,j)=><td key={j} style={tdStyle}><Skel w={w}/></td>)}</tr>
                )) : data.leaderboard.length===0 ? (
                  <tr><td colSpan={7} style={{ ...tdStyle, textAlign:"center", padding:"40px", color:"rgba(255,255,255,0.25)", fontStyle:"italic" }}>No leaderboard data</td></tr>
                ) : data.leaderboard.map((d,i)=>(
                  <tr key={d.id||i} className="dm-tr-plain">
                    <td style={{ ...tdStyle, fontWeight:700, color:i<3?"#D4AF37":"rgba(255,255,255,0.45)", width:36, textAlign:"center" }}>{i+1}</td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight:600, color:"#fff" }}>{d.name||d.full_name||"—"}</div>
                      {d.phone&&<div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>{d.phone}</div>}
                    </td>
                    <td style={{ ...tdStyle, fontVariantNumeric:"tabular-nums" }}>{fmtNum(d.rides||d.total_rides)}</td>
                    <td style={{ ...tdStyle, color:d.acceptance_rate>=80?"#22c55e":d.acceptance_rate>=60?"#D4AF37":"#f87171" }}>{fmtRate(d.acceptance_rate)}</td>
                    <td style={{ ...tdStyle, color:d.completion_rate>=90?"#22c55e":d.completion_rate>=75?"#D4AF37":"#f87171" }}>{fmtRate(d.completion_rate)}</td>
                    <td style={{ ...tdStyle, color:"#D4AF37", fontWeight:600, fontVariantNumeric:"tabular-nums" }}>{fmtRupee(d.earnings||d.total_earnings)}</td>
                    <td style={{ ...tdStyle, whiteSpace:"nowrap" }}>{d.rating!=null?<span style={{ color:"#D4AF37", fontWeight:600 }}>{Number(d.rating).toFixed(1)} ★</span>:"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Sub-tab 1: Fleet Summary ── */}
      {sub===1&&(
        <div>
          {/* Metric cards */}
          {loading ? (
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
              {Array.from({length:6}).map((_,i)=><div key={i} className="dm-card" style={{ padding:"16px 18px", flex:"1 1 140px" }}><Skel w="60%" h={12}/><br/><br/><Skel w="40%" h={22}/></div>)}
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10, marginBottom:20 }}>
              {[
                { label:"Total Drivers",     value:fmtNum(data.fleet?.total_drivers),        color:"#fff"    },
                { label:"Total Rides",        value:fmtNum(data.fleet?.total_rides),           color:"#60a5fa" },
                { label:"Total Revenue",      value:fmtRupee(data.fleet?.total_revenue),       color:"#D4AF37" },
                { label:"Avg Acceptance",     value:fmtRate(data.fleet?.avg_acceptance_rate),  color:"#22c55e" },
                { label:"Avg Completion",     value:fmtRate(data.fleet?.avg_completion_rate),  color:"#22c55e" },
                { label:"Total Online Hours", value:data.fleet?.total_online_hours!=null?Number(data.fleet.total_online_hours).toFixed(1)+"h":"—", color:"#a78bfa" },
              ].map(({label,value,color})=>(
                <SummChip key={label} label={label} value={value} color={color} loading={false}/>
              ))}
            </div>
          )}

          {/* Charts row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            {/* Vehicle type pie */}
            <div className="dm-card" style={{ padding:"20px 20px 10px" }}>
              <p style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:"rgba(212,175,55,0.6)", letterSpacing:1.2, textTransform:"uppercase", margin:"0 0 16px" }}>Vehicle Type Split</p>
              {vtPie.length>0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={vtPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {vtPie.map((e,i)=><Cell key={i} fill={e.color}/>)}
                    </Pie>
                    <RTooltip content={<CTooltip/>}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.2)", fontStyle:"italic", fontSize:12 }}>No data</div>
              )}
            </div>

            {/* Daily rides bar */}
            <div className="dm-card" style={{ padding:"20px 20px 10px" }}>
              <p style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:"rgba(212,175,55,0.6)", letterSpacing:1.2, textTransform:"uppercase", margin:"0 0 16px" }}>Daily Rides</p>
              {dailyData.length>0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyData} margin={{ top:4, right:8, left:0, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                    <XAxis dataKey="date" tick={{ fontSize:10 }} tickFormatter={d=>new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}/>
                    <YAxis tick={{ fontSize:10 }}/>
                    <RTooltip content={<CTooltip fmt={fmtNum}/>}/>
                    <Bar dataKey="rides" fill="#60a5fa" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.2)", fontStyle:"italic", fontSize:12 }}>No data</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-tab 2: Break Compliance ── */}
      {sub===2&&(
        <div className="dm-card" style={{ overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"rgba(212,175,55,0.05)", borderBottom:"1px solid rgba(212,175,55,0.1)" }}>
                  {["Driver","Scheduled Breaks","Breaks Taken","Compliance","Total Break Time","Status"].map(h=>(
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({length:6}).map((_,i)=>(
                  <tr key={i}>{[140,80,80,70,80,80].map((w,j)=><td key={j} style={tdStyle}><Skel w={w}/></td>)}</tr>
                )) : data.compliance.length===0 ? (
                  <tr><td colSpan={6} style={{ ...tdStyle, textAlign:"center", padding:"40px", color:"rgba(255,255,255,0.25)", fontStyle:"italic" }}>No break compliance data</td></tr>
                ) : data.compliance.map((d,i)=>{
                  const rate = d.compliance_rate??d.rate;
                  const rateColor = rate===null?"rgba(255,255,255,0.4)":rate>=90?"#22c55e":rate>=70?"#D4AF37":"#f87171";
                  return (
                    <tr key={d.id||i} className="dm-tr-plain">
                      <td style={tdStyle}>
                        <div style={{ fontWeight:600, color:"#fff" }}>{d.name||d.full_name||"—"}</div>
                        {d.phone&&<div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>{d.phone}</div>}
                      </td>
                      <td style={{ ...tdStyle, fontVariantNumeric:"tabular-nums" }}>{fmtNum(d.scheduled_breaks)}</td>
                      <td style={{ ...tdStyle, fontVariantNumeric:"tabular-nums" }}>{fmtNum(d.breaks_taken)}</td>
                      <td style={{ ...tdStyle, color:rateColor, fontWeight:600 }}>{fmtRate(rate)}</td>
                      <td style={tdStyle}>{fmtMins(d.total_break_minutes||d.total_break_time)}</td>
                      <td style={tdStyle}>
                        {rate===null?"—":rate>=90?(
                          <span style={{ color:"#22c55e", fontSize:11, fontWeight:600 }}>✓ Compliant</span>
                        ):rate>=70?(
                          <span style={{ color:"#D4AF37", fontSize:11, fontWeight:600 }}>⚠ Partial</span>
                        ):(
                          <span style={{ color:"#f87171", fontSize:11, fontWeight:600 }}>✗ Non-compliant</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const MAIN_TABS = [
  { id:"list",  label:"Drivers",        icon:Activity  },
  { id:"map",   label:"Live Map",       icon:MapIcon   },
  { id:"fleet", label:"Fleet Analytics",icon:BarChart3 },
];

export default function DriverMetricsPage() {
  const [tab, setTab] = useState("list");
  return (
    <div style={{ fontFamily:"'Outfit',sans-serif", color:"#fff" }}>
      <GS/>

      {/* Page header */}
      <div style={{ marginBottom:24 }}>
        <p style={{ fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:3, color:"rgba(212,175,55,0.45)", textTransform:"uppercase", margin:"0 0 5px" }}>Operations</p>
        <h1 style={{ fontFamily:"'Cinzel',serif", fontSize:"clamp(18px,2vw,26px)", fontWeight:700, color:"#fff", margin:0, letterSpacing:-0.3 }}>
          Driver Metrics
        </h1>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", margin:"5px 0 0" }}>Live fleet monitoring, driver performance &amp; ops analytics</p>
      </div>

      {/* Tab switcher */}
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {MAIN_TABS.map(t=>{
          const Icon=t.icon;
          return (
            <button key={t.id} className={`dm-tab${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}>
              <Icon size={14}/> {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div key={tab} className="fup">
        {tab==="list"  && <DriversListSection/>}
        {tab==="map"   && <LiveMapSection/>}
        {tab==="fleet" && <FleetAnalyticsSection/>}
      </div>
    </div>
  );
}
