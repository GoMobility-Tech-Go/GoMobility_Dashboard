import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Car, MapPin, IndianRupee, TrendingUp, UserCheck, AlertCircle, Activity,
  ShieldAlert, BarChart2, Receipt, Megaphone, Zap, MessageCircle, Bell, Settings,
  FileText, Star, RotateCcw, Wallet, CheckCircle, Server, Database, List,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  getDashboard, getRevenueAnalytics, getFraudAlerts,
  getSosHistory, getRides, getQueueStats, getRedisStats,
} from "../../api/admin";
import { useAuth } from "../../context/AuthContext";

const fmtNum   = (n) => new Intl.NumberFormat("en-IN").format(n ?? 0);
const fmtRupee = (n) => "₹" + fmtNum(n);
const fmtDate  = (d) => new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short" });
const fmtK     = (v) => v >= 1e5 ? `₹${(v/1e5).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}K` : `₹${Math.round(v||0)}`;

const TOOLTIP_STYLE = {
  background:"rgba(2,13,38,0.95)", border:"1px solid rgba(212,175,55,0.25)",
  borderRadius:10, padding:"10px 14px", color:"#fff", fontFamily:"Outfit,sans-serif",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ color:"rgba(212,175,55,0.8)", fontSize:11, marginBottom:4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color:"#fff", fontSize:13, fontWeight:600 }}>
          {p.name}: {p.dataKey?.toLowerCase().includes("revenue") ? fmtRupee(p.value) : fmtNum(p.value)}
        </div>
      ))}
    </div>
  );
};

const Skeleton = ({ h=110 }) => (
  <div style={{ height:h, borderRadius:16, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(212,175,55,0.08)", animation:"gmPulse 1.5s ease-in-out infinite" }} />
);

const StatCard = ({ label, value, icon:Icon, color, loading, sub }) => (
  <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:"20px 20px 16px", position:"relative", overflow:"hidden" }}>
    <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color},transparent)` }} />
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
      <span style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>{label}</span>
      <div style={{ width:32, height:32, borderRadius:10, background:`${color}20`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Icon size={15} color={color} />
      </div>
    </div>
    <div style={{ fontSize:24, fontWeight:700, color:"#fff", lineHeight:1 }}>
      {loading
        ? <div style={{ height:26, width:80, borderRadius:6, background:"rgba(255,255,255,0.06)", animation:"gmPulse 1.5s ease-in-out infinite" }} />
        : value}
    </div>
    {sub && !loading && <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:5 }}>{sub}</div>}
  </div>
);

const QuickLink = ({ icon:Icon, label, sub, to, color="#D4AF37", badge, onClick }) => (
  <div onClick={onClick} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:"rgba(255,255,255,0.02)", border:`1px solid ${color}20`, borderRadius:14, cursor:"pointer", transition:"all .2s", position:"relative" }}
    onMouseEnter={e=>e.currentTarget.style.background=`${color}0d`}
    onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}>
    <div style={{ width:38, height:38, borderRadius:11, background:`${color}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, position:"relative" }}>
      <Icon size={18} color={color} />
      {badge > 0 && (
        <span style={{ position:"absolute", top:-5, right:-5, minWidth:16, height:16, borderRadius:8, background:"#ef4444", color:"#fff", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px", border:"2px solid rgba(2,13,38,0.9)" }}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </div>
    <div>
      <div style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{sub}</div>}
    </div>
    <div style={{ marginLeft:"auto", fontSize:16, color:`${color}60` }}>›</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  PLATFORM HEALTH STRIP
// ─────────────────────────────────────────────────────────────────────────────
function HealthStrip({ infra }) {
  const { queues, redis, loading } = infra;

  const queueList   = queues ? (Array.isArray(queues.queues) ? queues.queues : []) : [];
  const totalFailed = queueList.reduce((s,q) => s + (q.failed ?? q.failedCount ?? 0), 0);
  const totalActive = queueList.reduce((s,q) => s + (q.active ?? q.activeCount ?? 0), 0);
  const redisStatus = redis?.stats?.status || redis?.stats?.connected ? "connected" : redis ? "connected" : null;

  const items = [
    {
      label: "Server",
      icon: <Server size={13}/>,
      color: "#34D399",
      value: "Online",
      ok: true,
    },
    {
      label: "Redis",
      icon: <Database size={13}/>,
      color: redisStatus === "connected" ? "#34D399" : loading ? "#D4AF37" : "#f87171",
      value: loading ? "Checking…" : redisStatus === "connected" ? "Connected" : redis ? "Issue" : "Unknown",
      ok: redisStatus === "connected",
    },
    {
      label: "Job Queues",
      icon: <List size={13}/>,
      color: totalFailed > 0 ? "#f87171" : totalActive > 0 ? "#f59e0b" : "#34D399",
      value: loading ? "Checking…" : `${queueList.length} queues${totalFailed > 0 ? ` · ${totalFailed} failed` : ""}`,
      ok: totalFailed === 0,
    },
    {
      label: "Memory",
      icon: <Activity size={13}/>,
      color: "#60a5fa",
      value: redis?.stats?.used_memory
        ? `${((redis.stats.used_memory || 0) / 1048576).toFixed(1)} MB`
        : "—",
      ok: true,
    },
  ];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:22 }}>
      {items.map((item) => (
        <div key={item.label} style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${item.color}25`, borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:`${item.color}15`, display:"flex", alignItems:"center", justifyContent:"center", color:item.color, flexShrink:0 }}>
            {item.icon}
          </div>
          <div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:2 }}>{item.label}</div>
            <div style={{ fontSize:12, fontWeight:600, color:item.color }}>{item.value}</div>
          </div>
          <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:item.color, animation:!item.ok?"gmPulse 1.5s ease-in-out infinite":undefined }} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SUPER ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function SuperAdminDashboard({ stats, analytics, fraudAlerts, sosAlerts, rideBreakdown, infra, loadingStats, loadingChart, loadingAlerts, days, setDays, error }) {
  const nav = useNavigate();
  const totalRev = (analytics?.byDay || []).reduce((s,d) => s + Number(d.totalRevenue||0), 0);
  const totalRid = (analytics?.byVehicle || []).reduce((s,v) => s + Number(v.totalRides||0), 0);

  // Computed KPIs
  const kpis = useMemo(() => {
    const total  = stats?.totalDrivers  || 1;
    const online = stats?.activeDrivers || 0;
    const kyc    = stats?.pendingKyc    || 0;
    const rides  = stats?.totalRides    || 1;
    const rev    = stats?.totalRevenue  || 0;
    return {
      utilization:   Math.round((online / total) * 100),
      kycRate:       Math.round(((total - kyc) / total) * 100),
      revPerRide:    rides > 0 ? Math.round(rev / rides) : 0,
      todayVsMonth:  stats?.totalRides > 0 && stats?.todayRides > 0
        ? Math.round((stats.todayRides / (stats.totalRides / 30)) * 100)
        : null,
    };
  }, [stats]);

  // Ride pie data
  const ridePie = useMemo(() => {
    const completed  = rideBreakdown.completed || 0;
    const cancelled  = rideBreakdown.cancelled || 0;
    const total      = stats?.totalRides || 0;
    const other      = Math.max(0, total - completed - cancelled);
    return [
      { name:"Completed", value:completed, color:"#34D399" },
      { name:"Cancelled", value:cancelled, color:"#f87171" },
      { name:"Other",     value:other,     color:"#f59e0b" },
    ].filter(d => d.value > 0);
  }, [rideBreakdown, stats]);

  const SA_CARDS = [
    { key:"totalUsers",    label:"Total Users",        icon:Users,       color:"#3b82f6", sub:`Platform registrations` },
    { key:"totalDrivers",  label:"Total Drivers",      icon:Car,         color:"#8b5cf6", sub:`${stats?.pendingKyc||0} pending KYC` },
    { key:"activeDrivers", label:"Online Now",         icon:UserCheck,   color:"#10b981", sub:`${kpis.utilization}% utilization` },
    { key:"todayRides",    label:"Today's Rides",      icon:MapPin,      color:"#f59e0b", sub:`${stats?.totalRides||0} total rides` },
    { key:"todayRevenue",  label:"Today Revenue",      icon:IndianRupee, color:"#D4AF37", rupee:true, sub:`₹${kpis.revPerRide}/ride avg` },
    { key:"totalRevenue",  label:"Month Revenue",      icon:Activity,    color:"#22c55e", rupee:true },
  ];

  const fraudCount = fraudAlerts.length;
  const sosCount   = sosAlerts.filter(s => s.status === "active" || !s.cancelled_at).length;
  const kycPending = stats?.pendingKyc || 0;

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom:22, display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <h1 style={{ fontFamily:"Cinzel,serif", fontSize:24, fontWeight:700, color:"#fff", margin:0 }}>Super Admin Dashboard</h1>
            <span style={{ fontSize:18 }}>👑</span>
          </div>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, margin:0 }}>Full platform overview — revenue, operations & infrastructure</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>nav("/system-health")} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"rgba(52,211,153,0.08)", border:"1px solid rgba(52,211,153,0.2)", borderRadius:10, color:"#34D399", fontSize:12, cursor:"pointer", fontWeight:600 }}>
            <Activity size={13}/> System Health
          </button>
          <button onClick={()=>nav("/revenue-analytics")} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:10, color:"#D4AF37", fontSize:12, cursor:"pointer", fontWeight:600 }}>
            <BarChart2 size={13}/> Revenue Analytics
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:10, padding:"10px 16px", color:"#fca5a5", marginBottom:20, fontSize:13 }}>{error}</div>
      )}

      {/* Platform Health Strip */}
      <HealthStrip infra={infra} />

      {/* KPI Row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:14, marginBottom:22 }}>
        {[
          { label:"Driver Utilization", value:`${kpis.utilization}%`, color:"#10b981", icon:UserCheck, desc:`${stats?.activeDrivers||0} / ${stats?.totalDrivers||0} online` },
          { label:"KYC Clearance Rate", value:`${kpis.kycRate}%`,    color:"#60a5fa", icon:CheckCircle, desc:`${kpis.kycRate < 80 ? "Needs attention" : "Healthy"}` },
          { label:"Avg Revenue / Ride", value:`₹${fmtNum(kpis.revPerRide)}`, color:"#D4AF37", icon:IndianRupee, desc:"This month" },
          { label:"Fraud Alerts",       value:loadingAlerts ? "—" : fraudCount, color:fraudCount > 0 ? "#f87171" : "#34D399", icon:ShieldAlert, desc:fraudCount > 0 ? "Needs review" : "All clear" },
        ].map(({ label, value, color, icon:Icon, desc }) => (
          <div key={label} style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${color}25`, borderRadius:14, padding:"16px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.8px", fontFamily:"Cinzel,serif" }}>{label}</span>
              <Icon size={13} color={`${color}90`} />
            </div>
            <div style={{ fontSize:22, fontWeight:800, color, fontFamily:"Cinzel,serif", lineHeight:1, marginBottom:5 }}>
              {loadingStats ? <span style={{ opacity:0.3 }}>—</span> : value}
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Main Stat Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:14, marginBottom:24 }}>
        {loadingStats
          ? Array(6).fill(0).map((_,i) => <Skeleton key={i} />)
          : SA_CARDS.map(({ key, label, icon, color, rupee, sub }) => (
            <StatCard key={key} label={label} icon={icon} color={color} loading={false}
              value={rupee ? fmtRupee(stats?.[key]) : fmtNum(stats?.[key])} sub={sub} />
          ))
        }
      </div>

      {/* Charts Row */}
      <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:20, marginBottom:22 }}>

        {/* Revenue Trend */}
        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:24 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
            <div>
              <div style={{ fontFamily:"Cinzel,serif", fontSize:14, color:"#fff", fontWeight:600 }}>Revenue Trend</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>Total: {fmtRupee(totalRev)} · {fmtNum(totalRid)} rides</div>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {[7,30,90].map((d) => (
                <button key={d} onClick={() => setDays(d)} style={{ padding:"4px 12px", borderRadius:8, border:"1px solid", fontSize:11, cursor:"pointer", fontWeight:600, transition:"all .2s", borderColor:days===d?"#D4AF37":"rgba(212,175,55,0.2)", background:days===d?"rgba(212,175,55,0.15)":"transparent", color:days===d?"#D4AF37":"rgba(255,255,255,0.4)" }}>{d}D</button>
              ))}
            </div>
          </div>
          {loadingChart ? <Skeleton h={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics?.byDay || []}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="rideGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill:"rgba(255,255,255,0.35)", fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="rev" tickFormatter={fmtK} tick={{ fill:"rgba(255,255,255,0.35)", fontSize:10 }} axisLine={false} tickLine={false} width={52} />
                <YAxis yAxisId="rides" orientation="right" tick={{ fill:"rgba(255,255,255,0.25)", fontSize:9 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip content={<CustomTooltip />} />
                <Area yAxisId="rev"   type="monotone" dataKey="totalRevenue" name="Revenue" stroke="#D4AF37" strokeWidth={2} fill="url(#revGrad)" dot={false} />
                <Area yAxisId="rides" type="monotone" dataKey="totalRides"   name="Rides"   stroke="#60a5fa" strokeWidth={1.5} fill="url(#rideGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ride Breakdown Donut */}
        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:24 }}>
          <div style={{ fontFamily:"Cinzel,serif", fontSize:14, color:"#fff", fontWeight:600, marginBottom:4 }}>Ride Status Breakdown</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:16 }}>Completion vs cancellation rate</div>
          {loadingStats || rideBreakdown.loading ? <Skeleton h={180} /> : ridePie.length === 0 ? (
            <div style={{ height:180, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.25)", fontSize:13 }}>No ride data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={ridePie} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={68} innerRadius={32} paddingAngle={3}
                    label={({ percent }) => `${(percent*100).toFixed(0)}%`}
                    labelLine={{ stroke:"rgba(255,255,255,0.1)", strokeWidth:1 }}>
                    {ridePie.map((d,i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:"#020d26", border:"1px solid rgba(212,175,55,0.2)", borderRadius:8, color:"#fff", fontSize:12 }}
                    formatter={(v, n) => [`${fmtNum(v)} rides`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap", marginTop:4 }}>
                {ridePie.map(d => (
                  <div key={d.name} style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:d.color, display:"inline-block" }}/>
                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>{d.name}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:d.color }}>{fmtNum(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Vehicle Chart + Fraud Snapshot Row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:22 }}>

        {/* Vehicle Breakdown */}
        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:24 }}>
          <div style={{ fontFamily:"Cinzel,serif", fontSize:14, color:"#fff", fontWeight:600, marginBottom:4 }}>Revenue by Vehicle</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:16 }}>Total: {fmtNum(totalRid)} rides</div>
          {loadingChart ? <Skeleton h={160} /> : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={analytics?.byVehicle || []} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="vehicleType" tick={{ fill:"rgba(255,255,255,0.4)", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtK} tick={{ fill:"rgba(255,255,255,0.35)", fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="totalRevenue" name="Revenue" radius={[5,5,0,0]}>
                    {(analytics?.byVehicle||[]).map((v,i) => {
                      const colors = ["#D4AF37","#8b5cf6","#3b82f6","#10b981"];
                      return <Cell key={i} fill={colors[i % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", gap:8, marginTop:12 }}>
                {(analytics?.byVehicle || []).map((v, i) => {
                  const colors = ["#D4AF37","#8b5cf6","#3b82f6","#10b981"];
                  return (
                    <div key={v.vehicleType} style={{ flex:1, background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"8px 10px", borderTop:`2px solid ${colors[i]||"#D4AF37"}` }}>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", textTransform:"capitalize" }}>{v.vehicleType}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#fff", marginTop:2 }}>{fmtNum(v.totalRides)}</div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>rides</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Fraud Alert Snapshot */}
        <div style={{ background:"rgba(248,113,113,0.04)", border:"1px solid rgba(248,113,113,0.15)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(248,113,113,0.1)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <ShieldAlert size={15} color="#f87171" />
              <span style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:600, color:"#fff" }}>Fraud Alerts</span>
              {fraudCount > 0 && (
                <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:700, background:"rgba(248,113,113,0.15)", color:"#f87171", border:"1px solid rgba(248,113,113,0.3)" }}>{fraudCount}</span>
              )}
            </div>
            <button onClick={()=>nav("/fraud-detection")} style={{ fontSize:11, color:"rgba(248,113,113,0.7)", background:"none", border:"none", cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>View all →</button>
          </div>
          {loadingAlerts
            ? <div style={{ padding:16, display:"flex", flexDirection:"column", gap:8 }}>{Array(3).fill(0).map((_,i)=><div key={i} style={{ height:44, borderRadius:8, background:"rgba(255,255,255,0.04)", animation:"gmPulse 1.5s ease-in-out infinite" }}/>)}</div>
            : fraudAlerts.length === 0
              ? <div style={{ padding:"36px 20px", textAlign:"center" }}>
                  <CheckCircle size={28} color="rgba(52,211,153,0.5)" style={{ marginBottom:8, display:"block", margin:"0 auto 8px" }} />
                  <div style={{ fontSize:13, color:"#34D399", fontWeight:600 }}>No active fraud alerts</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:4 }}>Platform looks clean</div>
                </div>
              : <div style={{ display:"flex", flexDirection:"column" }}>
                  {fraudAlerts.slice(0,4).map((a, i) => (
                    <div key={i} style={{ padding:"12px 18px", borderBottom:"1px solid rgba(255,255,255,0.04)", display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background: a.severity==="high"||a.risk_level==="high"?"#f87171":"#f59e0b", flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{a.driver_name || a.user_name || `Alert #${a.id}`}</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{a.alert_type || a.type || a.reason || "Suspicious activity"}</div>
                      </div>
                      <span style={{ fontSize:10, padding:"2px 7px", borderRadius:20, background:"rgba(248,113,113,0.12)", color:"#f87171", border:"1px solid rgba(248,113,113,0.25)", fontWeight:600 }}>
                        {a.severity || a.risk_level || "medium"}
                      </span>
                    </div>
                  ))}
                </div>
          }
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ background:"rgba(255,255,255,0.015)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:18, padding:22 }}>
        <div style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"rgba(212,175,55,0.8)", marginBottom:16, textTransform:"uppercase", letterSpacing:"1px" }}>👑 Super Admin Quick Access</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
          {[
            { icon:Activity,      label:"System Health",      sub:"Server, Redis, queues",    to:"/system-health",       color:"#34D399", badge:0 },
            { icon:ShieldAlert,   label:"Fraud Detection",    sub:"Alerts & risk management", to:"/fraud-detection",     color:"#F87171", badge:fraudCount },
            { icon:BarChart2,     label:"Revenue Analytics",  sub:"Deep financial reports",   to:"/revenue-analytics",   color:"#D4AF37", badge:0 },
            { icon:Receipt,       label:"Tax & Compliance",   sub:"GST, TDS reports",         to:"/tax-reports",         color:"#60A5FA", badge:0 },
            { icon:Zap,           label:"Emergency & Safety", sub:"Live SOS monitoring",      to:"/emergency-safety",    color:"#F87171", badge:sosCount },
            { icon:MessageCircle, label:"Broadcast Messages", sub:"FCM push to all users",    to:"/broadcast-messaging", color:"#A78BFA", badge:0 },
            { icon:Car,           label:"Driver Onboarding",  sub:"KYC review & approval",    to:"/driver-onboarding",   color:"#8b5cf6", badge:kycPending },
            { icon:Wallet,        label:"Finance",            sub:"Transactions & payouts",    to:"/finance",             color:"#22c55e", badge:0 },
          ].map(({ icon, label, sub, to, color, badge }) => (
            <QuickLink key={to} icon={icon} label={label} sub={sub} color={color} badge={badge} onClick={() => nav(to)} />
          ))}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function AdminDashboard({ stats, loadingStats, error }) {
  const nav = useNavigate();

  const ADMIN_CARDS = [
    { key:"todayRides",    label:"Today's Rides",      icon:MapPin,      color:"#f59e0b" },
    { key:"activeDrivers", label:"Online Drivers",     icon:UserCheck,   color:"#10b981" },
    { key:"pendingKyc",    label:"Pending KYC Review", icon:AlertCircle, color:"#ef4444" },
    { key:"totalDrivers",  label:"Total Drivers",      icon:Car,         color:"#8b5cf6" },
  ];

  const pendingKyc = stats?.pendingKyc || 0;

  return (
    <>
      <div style={{ marginBottom:28 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          <h1 style={{ fontFamily:"Cinzel,serif", fontSize:24, fontWeight:700, color:"#fff", margin:0 }}>Admin Dashboard</h1>
          <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:"rgba(96,165,250,0.12)", border:"1px solid rgba(96,165,250,0.3)", color:"#60A5FA" }}>Admin</span>
        </div>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, margin:0 }}>Operational overview — drivers, rides & support</p>
      </div>

      {error && (
        <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:10, padding:"10px 16px", color:"#fca5a5", marginBottom:20, fontSize:13 }}>{error}</div>
      )}

      {!loadingStats && pendingKyc > 0 && (
        <div onClick={() => nav("/driver-onboarding")} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 20px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:14, marginBottom:22, cursor:"pointer" }}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.12)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,0.08)"}>
          <AlertCircle size={20} color="#F87171" />
          <div style={{ flex:1 }}>
            <span style={{ fontSize:14, fontWeight:700, color:"#F87171" }}>{pendingKyc} driver{pendingKyc > 1 ? "s" : ""} pending KYC verification</span>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginLeft:8 }}>— Review and approve in Driver Onboarding</span>
          </div>
          <span style={{ fontSize:13, color:"#F87171", fontWeight:600 }}>Review →</span>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16, marginBottom:28 }}>
        {loadingStats
          ? Array(4).fill(0).map((_,i) => <Skeleton key={i} />)
          : ADMIN_CARDS.map(({ key, label, icon, color }) => (
            <StatCard key={key} label={label} icon={icon} color={color} value={fmtNum(stats?.[key])} />
          ))
        }
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:28 }}>
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:22 }}>
          <div style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:600, color:"#fff", marginBottom:16 }}>📋 Today's Checklist</div>
          {loadingStats ? <Skeleton h={180} /> : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { done: pendingKyc === 0, label: pendingKyc === 0 ? "All KYC verifications up to date" : `${pendingKyc} drivers need KYC review`, action: () => nav("/driver-onboarding"), actionLabel:"Review", color: pendingKyc===0?"#34D399":"#F87171" },
                { done: (stats?.activeDrivers||0) > 0, label:`${stats?.activeDrivers||0} drivers currently online`, action:()=>nav("/ride-monitoring"), actionLabel:"Monitor", color:"#60A5FA" },
                { done: true, label:`${stats?.todayRides||0} rides completed today`, action:()=>nav("/ride-monitoring"), actionLabel:"View", color:"#F59E0B" },
                { done: true, label:"Check for open support tickets", action:()=>nav("/complaints-support"), actionLabel:"Open", color:"#A78BFA" },
              ].map((item, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:"rgba(255,255,255,0.02)", borderRadius:10, border:`1px solid ${item.color}18` }}>
                  {item.done ? <CheckCircle size={16} color="#34D399" /> : <AlertCircle size={16} color={item.color} />}
                  <span style={{ flex:1, fontSize:12.5, color:"rgba(255,255,255,0.7)" }}>{item.label}</span>
                  <button onClick={item.action} style={{ padding:"3px 10px", borderRadius:7, border:`1px solid ${item.color}40`, background:`${item.color}10`, color:item.color, fontSize:11, fontWeight:600, cursor:"pointer" }}>{item.actionLabel}</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:22 }}>
          <div style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:600, color:"#fff", marginBottom:16 }}>🚗 Driver Overview</div>
          {loadingStats ? <Skeleton h={180} /> : (
            <>
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:18 }}>
                {[
                  { label:"Total Registered",  value: stats?.totalDrivers||0,  color:"#8b5cf6" },
                  { label:"Verified & Active", value: (stats?.totalDrivers||0)-(stats?.pendingKyc||0), color:"#34D399" },
                  { label:"Pending KYC",       value: stats?.pendingKyc||0,    color:"#ef4444" },
                  { label:"Currently Online",  value: stats?.activeDrivers||0, color:"#f59e0b" },
                ].map(row => {
                  const pct = stats?.totalDrivers > 0 ? Math.round((row.value/stats.totalDrivers)*100) : 0;
                  return (
                    <div key={row.label}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>{row.label}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:row.color }}>{fmtNum(row.value)}</span>
                      </div>
                      <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:3 }}>
                        <div style={{ width:`${pct}%`, height:"100%", background:row.color, borderRadius:3, transition:"width .4s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={()=>nav("/driver-onboarding")} style={{ width:"100%", padding:"10px 0", background:"rgba(139,92,246,0.1)", border:"1px solid rgba(139,92,246,0.25)", borderRadius:10, color:"#8b5cf6", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>
                Manage Drivers →
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ background:"rgba(255,255,255,0.015)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:18, padding:22 }}>
        <div style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.5)", marginBottom:16, textTransform:"uppercase", letterSpacing:"1px" }}>Quick Actions</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:10 }}>
          {[
            { icon:Car,        label:"Driver Onboarding",   sub:"KYC review & approval",   to:"/driver-onboarding",  color:"#8b5cf6" },
            { icon:MapPin,     label:"Ride Monitoring",     sub:"Live ride tracking",       to:"/ride-monitoring",    color:"#f59e0b" },
            { icon:FileText,   label:"Complaints & Support",sub:"Manage user tickets",      to:"/complaints-support", color:"#F87171" },
            { icon:TrendingUp, label:"Pricing Engine",      sub:"Fares & surge pricing",   to:"/pricing-engine",     color:"#D4AF37" },
            { icon:Users,      label:"Users",               sub:"Manage passenger accounts",to:"/users",              color:"#3b82f6" },
            { icon:Star,       label:"Reviews & Ratings",   sub:"Monitor driver ratings",  to:"/reviews",            color:"#f59e0b" },
            { icon:Bell,       label:"Notifications",       sub:"Send push notifications", to:"/notifications",      color:"#A78BFA" },
            { icon:Settings,   label:"Settings",            sub:"Platform configuration",  to:"/settings",           color:"rgba(255,255,255,0.4)" },
          ].map(({ icon, label, sub, to, color }) => (
            <QuickLink key={to} icon={icon} label={label} sub={sub} color={color} onClick={() => nav(to)} />
          ))}
        </div>
      </div>

      <div style={{ marginTop:16, padding:"12px 18px", background:"rgba(96,165,250,0.04)", border:"1px solid rgba(96,165,250,0.12)", borderRadius:12, display:"flex", alignItems:"center", gap:10 }}>
        <ShieldAlert size={14} color="rgba(96,165,250,0.5)" />
        <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>Revenue analytics, tax reports, system health, emergency controls and fraud detection are accessible to Super Admins only.</span>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user }                        = useAuth();
  const actualIsSA                      = user?.role === "Super Admin";
  const [previewSA, setPreviewSA]       = useState(false);
  const isSA                            = actualIsSA || previewSA;

  const [stats, setStats]               = useState(null);
  const [analytics, setAnalytics]       = useState(null);
  const [days, setDays]                 = useState(7);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [error, setError]               = useState("");

  // Super Admin extra data
  const [fraudAlerts, setFraudAlerts]       = useState([]);
  const [sosAlerts, setSosAlerts]           = useState([]);
  const [rideBreakdown, setRideBreakdown]   = useState({ completed:0, cancelled:0, loading:true });
  const [infra, setInfra]                   = useState({ queues:null, redis:null, loading:true });
  const [loadingAlerts, setLoadingAlerts]   = useState(true);

  useEffect(() => {
    setLoadingStats(true);
    getDashboard()
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setStats({
          totalUsers:    d.users?.total     ?? 0,
          totalDrivers:  d.drivers?.total   ?? 0,
          activeDrivers: d.drivers?.online  ?? 0,
          todayRides:    d.rides?.today     ?? 0,
          totalRides:    d.rides?.total     ?? 0,
          todayRevenue:  d.revenue?.today   ?? 0,
          totalRevenue:  d.revenue?.month   ?? 0,
          pendingKyc:    (d.drivers?.total ?? 0) - (d.drivers?.verified ?? 0),
        });
      })
      .catch(() => setError("Failed to load dashboard stats."))
      .finally(() => setLoadingStats(false));
  }, []);

  useEffect(() => {
    if (!isSA) return;
    setLoadingChart(true);
    getRevenueAnalytics(days)
      .then((res) => setAnalytics(res.data?.data || res.data || {}))
      .catch(() => {})
      .finally(() => setLoadingChart(false));
  }, [days, isSA]);

  // Load SA-only extra data
  useEffect(() => {
    if (!isSA) return;

    // Fraud alerts
    setLoadingAlerts(true);
    getFraudAlerts({ limit: 5 })
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setFraudAlerts(d.alerts || d.items || d.data || []);
      })
      .catch(() => setFraudAlerts([]))
      .finally(() => setLoadingAlerts(false));

    // SOS alerts
    getSosHistory({ limit: 20 })
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setSosAlerts(d.alerts || d.items || d.data || []);
      })
      .catch(() => setSosAlerts([]));

    // Ride breakdown — parallel calls using pagination total
    Promise.allSettled([
      getRides({ status: "completed", limit: 1 }),
      getRides({ status: "cancelled", limit: 1 }),
    ]).then(([comp, canc]) => {
      const getTotal = (res) => {
        if (res.status !== "fulfilled") return 0;
        const d = res.value.data?.data || res.value.data || {};
        return d.pagination?.total || d.total || 0;
      };
      setRideBreakdown({ completed: getTotal(comp), cancelled: getTotal(canc), loading: false });
    });

    // Infra health
    setInfra(p => ({ ...p, loading:true }));
    Promise.allSettled([getQueueStats(), getRedisStats()]).then(([q, r]) => {
      setInfra({
        queues:  q.status === "fulfilled" ? (q.value.data?.data || q.value.data) : null,
        redis:   r.status === "fulfilled" ? (r.value.data?.data || r.value.data) : null,
        loading: false,
      });
    });
  }, [isSA]);

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>

      {!actualIsSA && (
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", background:"rgba(212,175,55,0.06)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:20 }}>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)", fontWeight:500 }}>Preview:</span>
            <button onClick={() => setPreviewSA(false)} style={{ padding:"3px 10px", borderRadius:12, border:"1px solid", fontSize:11, cursor:"pointer", fontWeight:600, transition:"all .15s", borderColor:!previewSA?"#60A5FA":"rgba(255,255,255,0.1)", background:!previewSA?"rgba(96,165,250,0.12)":"transparent", color:!previewSA?"#60A5FA":"rgba(255,255,255,0.3)" }}>Admin</button>
            <button onClick={() => setPreviewSA(true)} style={{ padding:"3px 10px", borderRadius:12, border:"1px solid", fontSize:11, cursor:"pointer", fontWeight:600, transition:"all .15s", borderColor:previewSA?"#D4AF37":"rgba(255,255,255,0.1)", background:previewSA?"rgba(212,175,55,0.12)":"transparent", color:previewSA?"#D4AF37":"rgba(255,255,255,0.3)" }}>👑 Super Admin</button>
          </div>
        </div>
      )}

      {isSA
        ? <SuperAdminDashboard
            stats={stats} analytics={analytics}
            fraudAlerts={fraudAlerts} sosAlerts={sosAlerts}
            rideBreakdown={rideBreakdown} infra={infra}
            loadingStats={loadingStats} loadingChart={loadingChart}
            loadingAlerts={loadingAlerts}
            days={days} setDays={setDays} error={error}
          />
        : <AdminDashboard stats={stats} loadingStats={loadingStats} error={error} />
      }
    </div>
  );
}
