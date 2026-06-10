import { useMemo, useState, useEffect } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, CarFront, IndianRupee, TrendingUp, RefreshCw } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell, CartesianGrid, LineChart as ReLineChart, Line, PieChart, Pie } from "recharts";
import { getDashboard, getRevenueAnalytics } from "../../api/admin";

const fmtRupee = (n) => n != null ? "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n)) : "—";
const fmtShort = (n) => n >= 1e5 ? `₹${(n/1e5).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(0)}K` : `₹${Math.round(n||0)}`;
const fmtDay   = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short" }) : "";

const VEHICLE_COLORS = { bike:"#60a5fa", auto:"#D4AF37", car:"#4ade80", xl:"#a78bfa", premium:"#f59e0b", luxury:"#f87171" };
const PIE_COLORS = ["#D4AF37","#60a5fa","#4ade80","#f87171","#a78bfa","#f59e0b"];

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@1,400&family=Outfit:wght@300;400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box}
    .dbc{background:linear-gradient(145deg,rgba(255,255,255,0.048) 0%,rgba(255,255,255,0.012) 100%);border:1px solid rgba(212,175,55,0.17);border-radius:20px;backdrop-filter:blur(14px);position:relative;overflow:hidden;transition:transform .32s cubic-bezier(.22,1,.36,1),box-shadow .32s,border-color .32s;min-width:0}
    .dbc::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.38),transparent)}
    .dbc:hover{transform:translateY(-3px);border-color:rgba(212,175,55,0.34);box-shadow:0 24px 64px rgba(0,0,0,0.48)}
    .dbm{background:linear-gradient(145deg,rgba(255,255,255,0.05) 0%,rgba(255,255,255,0.012) 100%);border:1px solid rgba(212,175,55,0.16);border-radius:20px;backdrop-filter:blur(12px);position:relative;overflow:hidden;transition:transform .32s cubic-bezier(.22,1,.36,1),box-shadow .32s,border-color .32s;min-width:0;cursor:pointer}
    .dbm::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.34),transparent)}
    .dbm:hover{transform:translateY(-4px);border-color:rgba(212,175,55,0.36);box-shadow:0 28px 70px rgba(0,0,0,0.52)}
    .bup{display:inline-flex;align-items:center;gap:4px;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.28);color:#D4AF37;border-radius:999px;padding:4px 9px;font-size:10px;font-weight:600;font-family:'Outfit',sans-serif;white-space:nowrap}
    .bdn{display:inline-flex;align-items:center;gap:4px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.24);color:#F87171;border-radius:999px;padding:4px 9px;font-size:10px;font-weight:600;font-family:'Outfit',sans-serif;white-space:nowrap}
    .ldot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#D4AF37;flex-shrink:0;animation:pdot 2.4s ease-in-out infinite}
    @keyframes pdot{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,.5)}50%{box-shadow:0 0 0 7px rgba(212,175,55,0)}}
    @keyframes fup{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
    .fup{animation:fup .65s cubic-bezier(.22,1,.36,1) both}
    @keyframes shim{0%{background-position:-200% center}100%{background-position:200% center}}
    .shim{background:linear-gradient(90deg,#D4AF37 0%,#f7dc6f 35%,#D4AF37 55%,#b8920f 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shim 5s linear infinite}
    @keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.35}}
    .gm-skel{background:rgba(255,255,255,0.05);border-radius:10px;animation:gmPulse 1.5s ease-in-out infinite}
    .topGrid{display:grid;grid-template-columns:1fr;gap:18px;margin-bottom:20px}
    @media(min-width:1100px){.topGrid{grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr)}}
    .statGrid{display:grid;grid-template-columns:repeat(1,minmax(0,1fr));gap:14px;margin-bottom:20px}
    @media(min-width:640px){.statGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(min-width:1100px){.statGrid{grid-template-columns:repeat(4,minmax(0,1fr))}}
    .chartsGrid{display:grid;grid-template-columns:1fr;gap:18px;margin-bottom:20px}
    @media(min-width:1200px){.chartsGrid{grid-template-columns:1fr 1fr}}
    .recharts-cartesian-axis-tick-value{font-family:'Outfit',sans-serif}
  `}</style>
);

function SectionTitle({ sub, main }) {
  return (
    <div style={{ minWidth:0 }}>
      <p style={{ fontFamily:"'Cinzel',serif", fontSize:8.5, letterSpacing:2.5, color:"rgba(212,175,55,0.4)", textTransform:"uppercase", margin:"0 0 4px" }}>{sub}</p>
      <h2 style={{ fontFamily:"'Cinzel',serif", fontSize:"clamp(14px,1.8vw,18px)", fontWeight:700, color:"#fff", letterSpacing:-0.3, margin:0 }}>{main}</h2>
    </div>
  );
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  const name = payload[0]?.name || payload[0]?.dataKey;
  return (
    <div style={{ background:"rgba(4,18,46,0.96)", border:"1px solid rgba(212,175,55,0.22)", borderRadius:12, padding:"10px 12px", backdropFilter:"blur(12px)", boxShadow:"0 14px 28px rgba(0,0,0,0.35)" }}>
      {label ? <p style={{ margin:"0 0 6px", fontSize:10, color:"rgba(212,175,55,0.62)", fontFamily:"'Outfit',sans-serif" }}>{label}</p> : null}
      <p style={{ margin:0, fontSize:11, color:"#fff", fontWeight:600, fontFamily:"'Outfit',sans-serif" }}>{name}: {formatter ? formatter(value) : value}</p>
    </div>
  );
}

function StatCard({ item, active, onClick, icon: Icon, loading }) {
  const positive = item.changeType !== "negative";
  return (
    <button type="button" onClick={() => onClick(item.id)} className="dbm fup"
      style={{ padding:"18px 18px 14px", borderColor:active?"rgba(212,175,55,0.42)":undefined, boxShadow:active?"0 0 0 2px rgba(212,175,55,0.12)":undefined }}>
      <div style={{ width:36, height:36, borderRadius:12, background:active?"rgba(212,175,55,0.16)":"rgba(255,255,255,0.05)", border:`1px solid ${active?"rgba(212,175,55,0.3)":"rgba(212,175,55,0.12)"}`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
        <Icon size={16} color={active?"#D4AF37":"rgba(255,255,255,0.65)"} />
      </div>
      <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,0.38)", fontFamily:"'Outfit',sans-serif", textAlign:"left" }}>{item.title}</p>
      <h3 style={{ margin:"6px 0 8px", fontFamily:"'Cinzel',serif", fontSize:"clamp(22px,2vw,30px)", fontWeight:800, color:"#fff", letterSpacing:"-0.04em", textAlign:"left" }}>
        {loading ? <span className="gm-skel" style={{ display:"inline-block", width:80, height:28 }} /> : item.value}
      </h3>
      <div style={{ textAlign:"left" }}>
        <span className={positive?"bup":"bdn"}>
          {positive ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
          {item.change}
        </span>
      </div>
    </button>
  );
}

function ChartCard({ title, subtitle, children, badge }) {
  return (
    <div className="dbc fup" style={{ padding:"20px 22px" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap", marginBottom:14 }}>
        <div>
          <h2 style={{ margin:0, fontFamily:"'Cinzel',serif", fontSize:16, fontWeight:700, color:"#fff" }}>{title}</h2>
          {subtitle ? <p style={{ margin:"6px 0 0", fontSize:11, color:"rgba(255,255,255,0.34)" }}>{subtitle}</p> : null}
        </div>
        {badge ? <span className="bup">{badge}</span> : null}
      </div>
      {children}
    </div>
  );
}

function ChartSkeleton({ height=250 }) {
  return <div className="gm-skel" style={{ height, borderRadius:12 }} />;
}

export default function OperationalMetricsPage() {
  const [activeCard, setActiveCard] = useState("rides");
  const [dash, setDash]             = useState(null);
  const [analytics, setAnalytics]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      getDashboard().then(r => r.data?.data || r.data || {}),
      getRevenueAnalytics(7).then(r => r.data?.data || r.data || {}),
    ])
      .then(([d, a]) => { setDash(d); setAnalytics(a); setLastRefresh(new Date()); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Real stats from backend
  const totalRides   = Number(analytics?.totalRides   || dash?.rides?.total   || 0);
  const totalRevenue = Number(analytics?.totalRevenue || dash?.revenue?.month || 0);
  const avgFare      = totalRides > 0 ? totalRevenue / totalRides : 0;
  const onlineDrivers = Number(dash?.drivers?.online  || 0);
  const totalDrivers  = Number(dash?.drivers?.total   || 0);

  const summaryCards = [
    { id:"rides",   title:"Total Rides (7 Days)",    value: totalRides.toLocaleString("en-IN"),  change:"Last 7 days",     changeType:"positive" },
    { id:"drivers", title:"Drivers Online Now",      value: onlineDrivers.toLocaleString("en-IN"), change:`of ${totalDrivers} total`, changeType:"positive" },
    { id:"revenue", title:"Weekly Revenue",          value: fmtShort(totalRevenue),               change:"Last 7 days",     changeType:"positive" },
    { id:"rideValue",title:"Avg. Ride Value",        value: fmtRupee(avgFare),                    change:"Per completed ride", changeType:"positive" },
  ];
  const cardIcons = { rides:Activity, drivers:CarFront, revenue:IndianRupee, rideValue:TrendingUp };

  // Chart data from real API
  const byDay = analytics?.byDay || [];
  const byVehicle = analytics?.byVehicle || [];

  const weeklyPerformance = byDay.map(d => ({
    day: fmtDay(d.date),
    value: Number(d.totalRides) || 0,
  }));

  const vehicleDistribution = byVehicle.map((v, i) => ({
    label: v.vehicleType?.charAt(0).toUpperCase() + v.vehicleType?.slice(1),
    value: Number(v.totalRides) || 0,
    color: VEHICLE_COLORS[v.vehicleType] || PIE_COLORS[i % PIE_COLORS.length],
  }));

  const revenueTrend = byDay.map(d => ({
    day: fmtDay(d.date),
    value: Number(d.totalRevenue) || 0,
  }));

  const activeInsight = useMemo(() => {
    switch (activeCard) {
      case "rides":   return { title:"Ride Volume",   text:`${totalRides.toLocaleString("en-IN")} rides completed in the last 7 days. ${byDay.length > 0 ? `Peak day: ${fmtDay(byDay.reduce((b,d)=>Number(d.totalRides)>Number(b.totalRides)?d:b, byDay[0])?.date)}.` : ""}` };
      case "drivers": return { title:"Driver Activity", text:`${onlineDrivers} drivers are online right now out of ${totalDrivers} total registered drivers (${totalDrivers>0?((onlineDrivers/totalDrivers)*100).toFixed(0):0}% active).` };
      case "revenue": return { title:"Revenue Signal",  text:`₹${new Intl.NumberFormat("en-IN").format(Math.round(totalRevenue))} earned in the last 7 days. Average fare per ride is ${fmtRupee(avgFare)}.` };
      case "rideValue": return { title:"Ride Value",  text:`Average ride value is ${fmtRupee(avgFare)}. Based on ${totalRides.toLocaleString()} rides generating ${fmtShort(totalRevenue)} total revenue.` };
      default: return { title:"Metric Insight", text:"Select a card to inspect the most relevant operational signal." };
    }
  }, [activeCard, totalRides, onlineDrivers, totalDrivers, totalRevenue, avgFare, byDay]);

  return (
    <>
      <GlobalStyles />
      <div style={{ width:"100%", maxWidth:"100%", minWidth:0, fontFamily:"'Outfit',sans-serif" }}>

        {/* HEADER */}
        <div className="fup topGrid" style={{ animationDelay:"0ms" }}>
          <div className="dbc" style={{ padding:"20px 22px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
              <span className="ldot"/>
              <p style={{ fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:3, color:"rgba(212,175,55,0.44)", textTransform:"uppercase", margin:0 }}>
                GO Mobility · Analytics Command
              </p>
            </div>
            <h1 style={{ fontFamily:"'Cinzel',serif", fontSize:"clamp(24px,4.6vw,46px)", fontWeight:900, lineHeight:1.05, letterSpacing:"-0.03em", margin:"0 0 10px" }}>
              <span style={{ color:"#fff" }}>Operational </span>
              <span className="shim">Metrics</span>
            </h1>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontStyle:"italic", fontSize:"clamp(14px,1.4vw,18px)", color:"rgba(212,175,55,0.5)", lineHeight:1.7, margin:0, maxWidth:640 }}>
              Live platform performance — fleet activity, utilization, and revenue pulled directly from your backend.
            </p>
          </div>

          <div className="dbc" style={{ padding:"20px 22px", display:"flex", flexDirection:"column", justifyContent:"space-between", gap:14 }}>
            <div>
              <SectionTitle sub="Selected Signal" main={activeInsight.title} />
              <p style={{ margin:"8px 0 0", fontSize:12, lineHeight:1.6, color:"rgba(255,255,255,0.34)" }}>
                {loading ? "Loading live data…" : activeInsight.text}
              </p>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
              <span className="bup"><ArrowUpRight size={10}/> Live Data</span>
              <span className="bup"><ArrowUpRight size={10}/> 7-Day Window</span>
              <button onClick={load} disabled={loading} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.25)", borderRadius:999, color:"#D4AF37", fontSize:10, fontWeight:600, cursor:"pointer", opacity:loading?0.5:1, fontFamily:"Outfit,sans-serif" }}>
                <RefreshCw size={9}/> Refresh
              </button>
              {lastRefresh && <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)" }}>Updated {lastRefresh.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span>}
            </div>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <section className="statGrid fup" style={{ animationDelay:"80ms" }}>
          {summaryCards.map(item => (
            <StatCard key={item.id} item={item} active={activeCard===item.id} onClick={setActiveCard} icon={cardIcons[item.id]} loading={loading} />
          ))}
        </section>

        {/* FIRST ROW */}
        <section className="chartsGrid fup" style={{ animationDelay:"160ms" }}>
          <ChartCard title="Weekly Ride Performance" subtitle="Rides per day — last 7 days" badge="7-Day Ride Mix">
            {loading ? <ChartSkeleton /> : weeklyPerformance.length === 0 ? (
              <div style={{ height:250, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.25)", fontSize:13 }}>No ride data</div>
            ) : (
              <div style={{ borderRadius:16, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", padding:"14px" }}>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={weeklyPerformance} margin={{ top:8, right:4, left:0, bottom:0 }}>
                    <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false}/>
                    <XAxis dataKey="day" tick={{ fill:"rgba(255,255,255,0.42)", fontSize:10 }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomTooltip formatter={v=>v.toLocaleString("en-IN")}/>}/>
                    <Bar dataKey="value" name="Total Rides" radius={[8,8,0,0]}>
                      {weeklyPerformance.map((item,i)=>(
                        <Cell key={i} fill={i===weeklyPerformance.length-1?"#60A5FA":"rgba(59,130,246,0.86)"}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Vehicle Type Distribution" subtitle="Ride share by vehicle — last 7 days" badge="Fleet Composition">
            {loading ? <ChartSkeleton /> : vehicleDistribution.length === 0 ? (
              <div style={{ height:250, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.25)", fontSize:13 }}>No vehicle data</div>
            ) : (
              <div style={{ borderRadius:16, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", padding:"14px" }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Tooltip content={<CustomTooltip formatter={v=>`${v} rides`}/>}/>
                    <Pie data={vehicleDistribution} dataKey="value" nameKey="label" innerRadius={46} outerRadius={82} paddingAngle={3} stroke="transparent">
                      {vehicleDistribution.map((item,i)=><Cell key={i} fill={item.color}/>)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:8, marginTop:8 }}>
                  {vehicleDistribution.map(item=>(
                    <div key={item.label} style={{ display:"flex", alignItems:"center", gap:8, borderRadius:10, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.08)", padding:"8px 10px" }}>
                      <span style={{ width:8, height:8, borderRadius:999, background:item.color, flexShrink:0 }}/>
                      <div>
                        <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,0.36)" }}>{item.label}</p>
                        <p style={{ margin:"2px 0 0", fontFamily:"'Cinzel',serif", fontSize:12, fontWeight:700, color:item.color }}>{item.value.toLocaleString("en-IN")} rides</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>
        </section>

        {/* SECOND ROW */}
        <section className="chartsGrid fup" style={{ animationDelay:"240ms" }}>
          <ChartCard title="Daily Revenue Trend" subtitle="Revenue per day — last 7 days" badge="Revenue Signal">
            {loading ? <ChartSkeleton /> : revenueTrend.length === 0 ? (
              <div style={{ height:250, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.25)", fontSize:13 }}>No revenue data</div>
            ) : (
              <div style={{ borderRadius:16, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", padding:"14px" }}>
                <ResponsiveContainer width="100%" height={250}>
                  <ReLineChart data={revenueTrend} margin={{ top:8, right:4, left:0, bottom:0 }}>
                    <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false}/>
                    <XAxis dataKey="day" tick={{ fill:"rgba(255,255,255,0.42)", fontSize:10 }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomTooltip formatter={v=>fmtRupee(v)}/>}/>
                    <Line type="monotone" dataKey="value" name="Revenue" stroke="#A78BFA" strokeWidth={2.6} dot={{ r:3, fill:"#A78BFA", strokeWidth:0 }} activeDot={{ r:5 }}/>
                  </ReLineChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          {/* Live Stats Summary */}
          <ChartCard title="Platform Snapshot" subtitle="Live counts from database" badge="Real-Time">
            {loading ? <ChartSkeleton height={250}/> : (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[
                  { label:"Total Users",       value: (dash?.users?.total||0).toLocaleString("en-IN"),    color:"#60a5fa", icon:"👤" },
                  { label:"New Users Today",   value: (dash?.users?.newToday||0).toLocaleString("en-IN"), color:"#4ade80", icon:"✨" },
                  { label:"Total Drivers",     value: (dash?.drivers?.total||0).toLocaleString("en-IN"),  color:"#D4AF37", icon:"🚗" },
                  { label:"Verified Drivers",  value: (dash?.drivers?.verified||0).toLocaleString("en-IN"),color:"#f59e0b",icon:"✅" },
                  { label:"Rides Today",       value: (dash?.rides?.today||0).toLocaleString("en-IN"),    color:"#a78bfa", icon:"📍" },
                  { label:"Ongoing Rides",     value: (dash?.rides?.ongoing||0).toLocaleString("en-IN"),  color:"#fbbf24", icon:"🔄" },
                  { label:"Revenue Today",     value: fmtShort(dash?.revenue?.today||0),                  color:"#34d399", icon:"💰" },
                  { label:"Revenue This Month",value: fmtShort(dash?.revenue?.month||0),                  color:"#D4AF37", icon:"📈" },
                ].map(({ label, value, color, icon }) => (
                  <div key={label} style={{ padding:"12px 14px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.08)", borderRadius:12 }}>
                    <div style={{ fontSize:16, marginBottom:5 }}>{icon}</div>
                    <div style={{ fontSize:15, fontWeight:700, color, fontFamily:"Cinzel,serif" }}>{value}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:3 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </section>
      </div>
    </>
  );
}
