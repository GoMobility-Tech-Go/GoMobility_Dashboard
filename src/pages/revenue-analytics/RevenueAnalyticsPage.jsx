import { useState, useEffect, useCallback, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { X, RefreshCw, Download, BarChart2, TrendingUp } from "lucide-react";
import { getRevenueAnalytics, runReport } from "../../api/admin";

const fmtRupee  = (n) => n != null ? "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n)) : "—";
const fmtShort  = (n) => n >= 1e5 ? `₹${(n/1e5).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(0)}K` : `₹${Math.round(n)}`;
const fmtDay    = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short" }) : "";
const fmtFull   = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—";

const VEHICLE_COLORS = { auto:"#D4AF37", bike:"#60a5fa", car:"#4ade80", cab:"#a78bfa" };
const PIE_COLORS = ["#D4AF37","#60a5fa","#4ade80","#f87171","#a78bfa","#f59e0b"];

const TOOLTIP_STYLE = {
  background:"#020d26", border:"1px solid rgba(212,175,55,0.2)",
  borderRadius:10, color:"#fff", fontFamily:"Outfit,sans-serif", fontSize:12,
  boxShadow:"0 8px 24px rgba(0,0,0,0.4)",
};

// Typical ride-hailing peak hour distribution (normalized 0–1)
const PEAK_HOUR_WEIGHTS = [
  0.08,0.04,0.03,0.03,0.05,0.10, // 0–5
  0.18,0.45,0.82,0.70,0.55,0.48, // 6–11
  0.52,0.50,0.48,0.50,0.58,0.72, // 12–17
  1.00,0.95,0.85,0.65,0.40,0.18, // 18–23
];

const HOUR_LABELS = [
  "12am","1am","2am","3am","4am","5am","6am","7am","8am","9am","10am","11am",
  "12pm","1pm","2pm","3pm","4pm","5pm","6pm","7pm","8pm","9pm","10pm","11pm",
];

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
  <span style={{ flex:1 }}>{msg}</span>
  <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

const ChartCard = ({ title, children, style, actions }) => (
  <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:24, ...style }}>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
      <div style={{ fontFamily:"Cinzel,serif", fontSize:13, color:"rgba(255,255,255,0.7)", letterSpacing:"0.5px" }}>{title}</div>
      {actions && <div style={{ display:"flex", gap:8 }}>{actions}</div>}
    </div>
    {children}
  </div>
);

const Skeleton = ({ height=280 }) => (
  <div style={{ height, borderRadius:10, background:"rgba(255,255,255,0.03)", animation:"gmPulse 1.5s ease-in-out infinite" }} />
);

export default function RevenueAnalyticsPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [days, setDays]       = useState(30);
  const [toast, setToast]     = useState(null);
  const [reportRunning, setReportRunning] = useState(null);
  const [showComparison, setShowComparison] = useState(false);

  const REPORT_TYPES = [
    { key:"operations",     label:"Operations Report",     icon:"⚙️",  desc:"Rides, drivers, cancellations"    },
    { key:"financial",      label:"Financial Report",      icon:"💰",  desc:"Earnings, GST, subscriptions"     },
    { key:"errors",         label:"Error Report",          icon:"🔴",  desc:"Failed payments, app errors"      },
    { key:"anomalies",      label:"Anomalies Report",      icon:"⚠️",  desc:"High-risk incidents, flagged"     },
    { key:"pendingDues",    label:"Pending Dues",          icon:"📋",  desc:"Riders & drivers with dues"       },
    { key:"stuckRides",     label:"Stuck Rides",           icon:"🚗",  desc:"Rides ongoing for 30+ minutes"    },
    { key:"infrastructure", label:"Infrastructure Report", icon:"🖥️",  desc:"Server health, Redis, DB metrics" },
  ];

  const handleRunReport = async (reportType) => {
    setReportRunning(reportType);
    try {
      const res = await runReport(reportType);
      const msg = res.data?.message || `Report "${reportType}" triggered successfully.`;
      showToast(msg, "success");
    } catch (err) {
      showToast(err.response?.data?.message || `Failed to run "${reportType}" report.`, "error");
    } finally {
      setReportRunning(null);
    }
  };

  const showToast = (msg, type="error") => { setToast({msg, type}); setTimeout(()=>setToast(null),3500); };

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getRevenueAnalytics(days)
      .then((res) => setData(res.data?.data || res.data || {}))
      .catch(() => { setError(true); showToast("Failed to load analytics."); })
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const byDay        = data?.byDay        || [];
  const byVehicle    = data?.byVehicle    || [];
  const totalRevenue = Number(data?.totalRevenue || 0);
  const totalRides   = Number(data?.totalRides   || 0);
  const avgFare      = totalRides > 0 ? totalRevenue / totalRides : 0;
  const bestDay      = byDay.reduce((b, d) => (!b || Number(d.totalRevenue) > Number(b.totalRevenue)) ? d : b, null);

  // Growth: compare first half vs second half of period
  const growth = (() => {
    if (byDay.length < 4) return null;
    const half   = Math.floor(byDay.length / 2);
    const first  = byDay.slice(0, half).reduce((s,d) => s + Number(d.totalRevenue||0), 0);
    const second = byDay.slice(half).reduce((s,d) => s + Number(d.totalRevenue||0), 0);
    if (!first) return null;
    return Math.round(((second - first) / first) * 100);
  })();
  const rideGrowth = (() => {
    if (byDay.length < 4) return null;
    const half   = Math.floor(byDay.length / 2);
    const first  = byDay.slice(0, half).reduce((s,d) => s + Number(d.totalRides||0), 0);
    const second = byDay.slice(half).reduce((s,d) => s + Number(d.totalRides||0), 0);
    if (!first) return null;
    return Math.round(((second - first) / first) * 100);
  })();

  // DoD / WoW comparison data — split byDay into current and previous halves
  const comparisonData = useMemo(() => {
    if (byDay.length < 2) return [];
    const half = Math.floor(byDay.length / 2);
    const current  = byDay.slice(half);
    const previous = byDay.slice(0, half);
    return current.map((d, i) => ({
      date:       d.date,
      current:    Number(d.totalRevenue || 0),
      previous:   Number(previous[i]?.totalRevenue || 0),
    }));
  }, [byDay]);

  // Peak hour data derived from total revenue + standard ride distribution
  const peakHourData = useMemo(() => {
    const totalRev = totalRevenue || 1000;
    return PEAK_HOUR_WEIGHTS.map((w, h) => ({
      hour:    HOUR_LABELS[h],
      revenue: Math.round(totalRev * w * 0.04),
      rides:   Math.round((totalRides || 100) * w * 0.04),
    }));
  }, [totalRevenue, totalRides]);

  const peakHour = peakHourData.reduce((best, d) => d.revenue > best.revenue ? d : best, peakHourData[0] || { hour:"—", revenue:0 });

  const pieData = byVehicle.map((v, i) => ({
    name:    v.vehicleType,
    value:   Number(v.totalRides)   || 0,
    revenue: Number(v.totalRevenue) || 0,
    color:   VEHICLE_COLORS[v.vehicleType] || PIE_COLORS[i % PIE_COLORS.length],
  }));

  // CSV export
  const downloadCSV = () => {
    const rows = [["Date","Revenue (₹)","Rides"]];
    byDay.forEach(d => rows.push([d.date, Number(d.totalRevenue||0).toFixed(2), d.totalRides || 0]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `gomobility-revenue-${days}d-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const GrowthBadge = ({ pct }) => {
    if (pct == null) return null;
    const up = pct >= 0;
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 7px", borderRadius:20, fontSize:11, fontWeight:700,
        background: up ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
        color: up ? "#34D399" : "#F87171",
        border: `1px solid ${up ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}`,
      }}>
        {up ? "↑" : "↓"} {Math.abs(pct)}%
      </span>
    );
  };

  const STATS = [
    { label:"Total Revenue", value:fmtRupee(totalRevenue), color:"#D4AF37", icon:"💰", badge: <GrowthBadge pct={growth} /> },
    { label:"Total Rides",   value:totalRides.toLocaleString("en-IN"), color:"#60a5fa", icon:"🚗", badge: <GrowthBadge pct={rideGrowth} /> },
    { label:"Avg Fare",      value:fmtRupee(avgFare),      color:"#4ade80", icon:"📊", badge: null },
    { label:"Best Day",      value:bestDay ? fmtRupee(bestDay.totalRevenue) : "—", color:"#f59e0b", icon:"🏆", badge: bestDay ? <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>{fmtDay(bestDay.date)}</span> : null },
    { label:"Peak Hour",     value:peakHour?.hour || "—", color:"#a78bfa", icon:"⏰", badge: <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>estimated</span> },
  ];

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Revenue Analytics</h1>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>P&amp;L reports, vehicle breakdown, and business insights</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {[{d:7,l:"1 Week"},{d:30,l:"1 Month"},{d:90,l:"3 Months"},{d:365,l:"1 Year"}].map(({d,l}) => (
            <button key={d} onClick={()=>setDays(d)} style={{ padding:"8px 16px", borderRadius:10, border:"1px solid", fontSize:13, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600, transition:"all .2s", borderColor:days===d?"#D4AF37":"rgba(212,175,55,0.2)", background:days===d?"rgba(212,175,55,0.12)":"transparent", color:days===d?"#D4AF37":"rgba(255,255,255,0.5)" }}>
              {l}
            </button>
          ))}
          {!loading && byDay.length > 0 && (
            <button onClick={downloadCSV} title="Export CSV" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:10, border:"1px solid rgba(96,165,250,0.3)", background:"rgba(96,165,250,0.08)", color:"#60a5fa", fontSize:13, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600 }}>
              <Download size={13}/> CSV
            </button>
          )}
          <button onClick={load} disabled={loading} title="Refresh" style={{ display:"flex", alignItems:"center", justifyContent:"center", width:38, height:38, borderRadius:10, border:"1px solid rgba(212,175,55,0.2)", background:"rgba(212,175,55,0.08)", color:"#D4AF37", cursor:"pointer", opacity:loading?0.5:1 }}>
            <RefreshCw size={14}/>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:14, marginBottom:24 }}>
        {STATS.map(({ label, value, color, icon, badge }) => (
          <div key={label} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:14, padding:"18px 20px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:22 }}>{icon}</span>
              {!loading && badge}
            </div>
            <div style={{ fontSize:21, fontWeight:700, color, fontFamily:"Cinzel,serif", lineHeight:1 }}>
              {loading ? <span style={{ opacity:0.35 }}>—</span> : value}
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:6 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && !loading && (
        <div style={{ textAlign:"center", padding:"52px 0" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📉</div>
          <div style={{ color:"#f87171", fontSize:14, marginBottom:16 }}>Failed to load analytics data.</div>
          <button onClick={load} style={{ padding:"10px 22px", background:"rgba(212,175,55,0.12)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:10, color:"#D4AF37", cursor:"pointer", fontSize:13, fontFamily:"Outfit,sans-serif" }}>↻ Retry</button>
        </div>
      )}

      {!error && (
        <>
          {/* Revenue Trend + Comparison Toggle */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:24, marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:8 }}>
              <div style={{ fontFamily:"Cinzel,serif", fontSize:13, color:"rgba(255,255,255,0.7)", letterSpacing:"0.5px" }}>
                Revenue Trend · Last {days===7?"1 Week":days===30?"1 Month":days===90?"3 Months":"1 Year"}
              </div>
              <button
                onClick={() => setShowComparison(v => !v)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:10, border:"1px solid", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"Outfit,sans-serif", transition:"all .15s",
                  borderColor: showComparison ? "#a78bfa" : "rgba(167,139,250,0.25)",
                  background:  showComparison ? "rgba(167,139,250,0.12)" : "transparent",
                  color:       showComparison ? "#a78bfa" : "rgba(255,255,255,0.45)",
                }}>
                <TrendingUp size={12}/> {showComparison ? "Hide" : "Show"} Period Comparison
              </button>
            </div>
            {loading ? <Skeleton height={270} /> : (
              showComparison && comparisonData.length > 1
                ? (
                  <ResponsiveContainer width="100%" height={270}>
                    <AreaChart data={comparisonData} margin={{ top:4, right:8, left:0, bottom:0 }}>
                      <defs>
                        <linearGradient id="curGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#D4AF37" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fill:"rgba(255,255,255,0.35)", fontSize:11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtShort} tick={{ fill:"rgba(255,255,255,0.35)", fontSize:11 }} axisLine={false} tickLine={false} width={56} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [fmtRupee(v), n==="current"?"Current Period":"Previous Period"]} labelFormatter={fmtDay} />
                      <Legend wrapperStyle={{ color:"rgba(255,255,255,0.4)", fontSize:12 }} formatter={(v) => v==="current"?"Current Period":"Previous Period"} />
                      <Area type="monotone" dataKey="current"  stroke="#D4AF37" strokeWidth={2}   fill="url(#curGrad)"  dot={false} activeDot={{ r:5, fill:"#D4AF37" }} />
                      <Area type="monotone" dataKey="previous" stroke="#a78bfa" strokeWidth={1.5} fill="url(#prevGrad)" dot={false} activeDot={{ r:4, fill:"#a78bfa" }} strokeDasharray="4 2" />
                    </AreaChart>
                  </ResponsiveContainer>
                )
                : byDay.length === 0
                  ? <div style={{ height:270, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.25)", fontSize:13 }}>No daily data for this period</div>
                  : (
                    <ResponsiveContainer width="100%" height={270}>
                      <AreaChart data={byDay} margin={{ top:4, right:8, left:0, bottom:0 }}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#D4AF37" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="ridesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fill:"rgba(255,255,255,0.35)", fontSize:11 }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="rev" tickFormatter={fmtShort} tick={{ fill:"rgba(255,255,255,0.35)", fontSize:11 }} axisLine={false} tickLine={false} width={56} />
                        <YAxis yAxisId="rides" orientation="right" tick={{ fill:"rgba(255,255,255,0.25)", fontSize:10 }} axisLine={false} tickLine={false} width={36} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [n==="totalRevenue" ? fmtRupee(v) : `${v} rides`, n==="totalRevenue" ? "Revenue" : "Rides"]} labelFormatter={(l) => fmtFull(l)} />
                        <Legend wrapperStyle={{ color:"rgba(255,255,255,0.4)", fontSize:12 }} formatter={(v) => v==="totalRevenue" ? "Revenue" : "Rides"} />
                        <Area yAxisId="rev"   type="monotone" dataKey="totalRevenue" stroke="#D4AF37" strokeWidth={2}   fill="url(#revGrad)"   dot={false} activeDot={{ r:5, fill:"#D4AF37" }} />
                        <Area yAxisId="rides" type="monotone" dataKey="totalRides"   stroke="#60a5fa" strokeWidth={1.5} fill="url(#ridesGrad)" dot={false} activeDot={{ r:4, fill:"#60a5fa" }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )
            )}
          </div>

          {/* Peak Hour Heatmap */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:24, marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div style={{ fontFamily:"Cinzel,serif", fontSize:13, color:"rgba(255,255,255,0.7)", letterSpacing:"0.5px" }}>Peak Hour Distribution</div>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.28)", padding:"2px 8px", borderRadius:20, border:"1px solid rgba(255,255,255,0.08)" }}>estimated pattern</span>
            </div>
            {loading ? <Skeleton height={120} /> : (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(24,1fr)", gap:3, marginBottom:8 }}>
                  {peakHourData.map((d, i) => {
                    const pct = peakHourData.length > 0 ? d.revenue / Math.max(...peakHourData.map(x => x.revenue)) : 0;
                    const isPeak = d.hour === peakHour.hour;
                    return (
                      <div key={i} title={`${d.hour}: ~${d.rides} rides`} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                        <div style={{ width:"100%", height:60, borderRadius:4, background:`rgba(212,175,55,${0.08 + pct * 0.75})`, border: isPeak ? "1px solid rgba(212,175,55,0.7)" : "1px solid transparent", transition:"background .2s", position:"relative" }}>
                          {isPeak && <div style={{ position:"absolute", top:-18, left:"50%", transform:"translateX(-50%)", fontSize:9, color:"#D4AF37", fontWeight:700, whiteSpace:"nowrap" }}>Peak</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(24,1fr)", gap:3 }}>
                  {peakHourData.map((d, i) => (
                    <div key={i} style={{ fontSize:8.5, color:"rgba(255,255,255,0.28)", textAlign:"center", overflow:"hidden" }}>
                      {i % 3 === 0 ? d.hour.replace("am","a").replace("pm","p") : ""}
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", gap:20, marginTop:12, flexWrap:"wrap" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:12, height:12, borderRadius:2, background:"rgba(212,175,55,0.12)" }}/>
                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>Low activity</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:12, height:12, borderRadius:2, background:"rgba(212,175,55,0.55)" }}/>
                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>Medium</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:12, height:12, borderRadius:2, background:"rgba(212,175,55,0.83)" }}/>
                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>Peak hours</span>
                  </div>
                  <span style={{ fontSize:11, color:"rgba(255,255,255,0.25)", marginLeft:"auto" }}>Peak: {peakHour?.hour}</span>
                </div>
              </>
            )}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            {/* Bar Chart — Vehicle Comparison */}
            <ChartCard title="Revenue by Vehicle Type">
              {loading ? <Skeleton height={250} /> : byVehicle.length === 0 ? (
                <div style={{ height:250, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.25)", fontSize:13 }}>No vehicle data</div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={byVehicle} margin={{ top:4, right:4, left:0, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="vehicleType" tick={{ fill:"rgba(255,255,255,0.4)", fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill:"rgba(255,255,255,0.35)", fontSize:11 }} axisLine={false} tickLine={false} width={52} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [fmtRupee(v), n==="totalRevenue" ? "Revenue" : "Avg Fare"]} />
                    <Legend wrapperStyle={{ color:"rgba(255,255,255,0.4)", fontSize:12 }} formatter={(v) => v==="totalRevenue" ? "Revenue" : "Avg Fare"} />
                    <Bar dataKey="totalRevenue" name="totalRevenue" radius={[5,5,0,0]}>
                      {byVehicle.map((v, i) => (
                        <Cell key={i} fill={VEHICLE_COLORS[v.vehicleType] || PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                    <Bar dataKey="avgFare" name="avgFare" fill="rgba(96,165,250,0.45)" radius={[5,5,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Pie Chart — Ride Share */}
            <ChartCard title="Ride Share by Vehicle">
              {loading ? <Skeleton height={250} /> : pieData.length === 0 ? (
                <div style={{ height:250, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.25)", fontSize:13 }}>No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={92} innerRadius={46} paddingAngle={3}
                      label={({ name, percent }) => `${name.charAt(0).toUpperCase()+name.slice(1)} ${(percent*100).toFixed(0)}%`}
                      labelLine={{ stroke:"rgba(255,255,255,0.15)", strokeWidth:1 }}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n, props) => [`${v} rides · ${fmtRupee(props.payload.revenue)}`, props.payload.name]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Vehicle Breakdown Table */}
          {!loading && byVehicle.length > 0 && (
            <ChartCard title="Vehicle Breakdown Summary">
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>
                      {["Vehicle","Rides","Revenue","Avg Fare","Ride Share","Rev Share"].map((c) => (
                        <th key={c} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", borderBottom:"1px solid rgba(212,175,55,0.08)" }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {byVehicle.map((v, i) => {
                      const vRides = Number(v.totalRides)   || 0;
                      const vRev   = Number(v.totalRevenue) || 0;
                      const ridePct = totalRides   ? ((vRides/totalRides)*100).toFixed(1)   : "0.0";
                      const revPct  = totalRevenue ? ((vRev/totalRevenue)*100).toFixed(1) : "0.0";
                      const color   = VEHICLE_COLORS[v.vehicleType] || PIE_COLORS[i % PIE_COLORS.length];
                      return (
                        <tr key={v.vehicleType}
                          onMouseEnter={(e) => e.currentTarget.style.background="rgba(212,175,55,0.03)"}
                          onMouseLeave={(e) => e.currentTarget.style.background=""}>
                          <td style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <span style={{ width:10, height:10, borderRadius:"50%", background:color, display:"inline-block", flexShrink:0 }}/>
                              <span style={{ fontWeight:600, color:"#fff", textTransform:"capitalize" }}>{v.vehicleType}</span>
                            </div>
                          </td>
                          <td style={{ padding:"12px 16px", fontSize:13, color:"rgba(255,255,255,0.7)", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{vRides.toLocaleString("en-IN")}</td>
                          <td style={{ padding:"12px 16px", fontSize:13, color:"#D4AF37", fontWeight:700, borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{fmtRupee(vRev)}</td>
                          <td style={{ padding:"12px 16px", fontSize:13, color:"rgba(255,255,255,0.7)", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{fmtRupee(Number(v.avgFare)||0)}</td>
                          <td style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <div style={{ flex:1, height:4, background:"rgba(255,255,255,0.07)", borderRadius:2 }}>
                                <div style={{ width:`${ridePct}%`, height:"100%", background:color, borderRadius:2 }}/>
                              </div>
                              <span style={{ fontSize:12, color:"rgba(255,255,255,0.45)", minWidth:34 }}>{ridePct}%</span>
                            </div>
                          </td>
                          <td style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <div style={{ flex:1, height:4, background:"rgba(255,255,255,0.07)", borderRadius:2 }}>
                                <div style={{ width:`${revPct}%`, height:"100%", background:color, borderRadius:2, opacity:0.7 }}/>
                              </div>
                              <span style={{ fontSize:12, color:"rgba(255,255,255,0.45)", minWidth:34 }}>{revPct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background:"rgba(212,175,55,0.04)" }}>
                      <td style={{ padding:"12px 16px", fontWeight:700, color:"#D4AF37", fontSize:12, fontFamily:"Cinzel,serif" }}>TOTAL</td>
                      <td style={{ padding:"12px 16px", fontWeight:700, color:"rgba(255,255,255,0.85)", fontSize:13 }}>{totalRides.toLocaleString("en-IN")}</td>
                      <td style={{ padding:"12px 16px", fontWeight:700, color:"#D4AF37", fontSize:13 }}>{fmtRupee(totalRevenue)}</td>
                      <td style={{ padding:"12px 16px", fontWeight:700, color:"rgba(255,255,255,0.7)", fontSize:13 }}>{fmtRupee(avgFare)}</td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:"rgba(255,255,255,0.4)" }}>100%</td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:"rgba(255,255,255,0.4)" }}>100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </ChartCard>
          )}
        </>
      )}

      {/* ── REPORTS SECTION ── */}
      <div style={{ marginTop:32 }}>
        <div style={{ fontFamily:"Cinzel,serif", fontSize:15, color:"#fff", fontWeight:700, marginBottom:6 }}>Run Reports</div>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:16 }}>Trigger backend report generation. Reports are processed asynchronously and will be sent to configured destinations.</p>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {REPORT_TYPES.map(({ key, label, icon, desc }) => {
            const isRunning = reportRunning === key;
            return (
              <button key={key} onClick={()=>handleRunReport(key)} disabled={!!reportRunning}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 20px", background:"rgba(255,255,255,0.03)", border:`1px solid ${isRunning?"rgba(212,175,55,0.6)":"rgba(212,175,55,0.15)"}`, borderRadius:14, cursor:reportRunning?"not-allowed":"pointer", fontFamily:"Outfit,sans-serif", transition:"all .2s", opacity:reportRunning&&!isRunning?0.45:1 }}
                onMouseEnter={(e)=>{ if(!reportRunning) e.currentTarget.style.background="rgba(212,175,55,0.08)"; }}
                onMouseLeave={(e)=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
              >
                <span style={{ fontSize:20 }}>{icon}</span>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:isRunning?"#D4AF37":"rgba(255,255,255,0.85)" }}>{isRunning?"Generating…":label}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
