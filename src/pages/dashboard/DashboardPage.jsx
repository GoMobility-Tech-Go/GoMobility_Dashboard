import { useEffect, useState } from "react";
import { Users, Car, MapPin, IndianRupee, TrendingUp, UserCheck, AlertCircle, Activity } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getDashboard, getRevenueAnalytics } from "../../api/admin";

const fmtNum = (n) => new Intl.NumberFormat("en-IN").format(n ?? 0);
const fmtRupee = (n) => "₹" + fmtNum(n);
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
const fmtK   = (v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`;

const STAT_CARDS = [
  { key:"totalUsers",    label:"Total Users",     icon:Users,       color:"#3b82f6" },
  { key:"totalDrivers",  label:"Total Drivers",   icon:Car,         color:"#8b5cf6" },
  { key:"activeDrivers", label:"Online Drivers",  icon:UserCheck,   color:"#10b981" },
  { key:"todayRides",    label:"Today's Rides",   icon:MapPin,      color:"#f59e0b" },
  { key:"totalRides",    label:"Total Rides",     icon:TrendingUp,  color:"#06b6d4" },
  { key:"todayRevenue",  label:"Today Revenue",   icon:IndianRupee, color:"#D4AF37", rupee:true },
  { key:"totalRevenue",  label:"Month Revenue",   icon:Activity,    color:"#22c55e", rupee:true },
  { key:"pendingKyc",    label:"Unverified Drivers", icon:AlertCircle, color:"#ef4444" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"rgba(2,13,38,0.95)", border:"1px solid rgba(212,175,55,0.25)", borderRadius:10, padding:"10px 14px" }}>
      <div style={{ color:"rgba(212,175,55,0.8)", fontSize:11, marginBottom:4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color:"#fff", fontSize:13, fontWeight:600 }}>
          {p.name}: {p.dataKey.toLowerCase().includes("revenue") ? fmtRupee(p.value) : fmtNum(p.value)}
        </div>
      ))}
    </div>
  );
};

const Skeleton = ({ h = 110 }) => (
  <div style={{ height:h, borderRadius:16, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(212,175,55,0.08)", animation:"gmPulse 1.5s ease-in-out infinite" }} />
);

export default function DashboardPage() {
  const [stats, setStats]         = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [days, setDays]           = useState(7);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    setLoadingStats(true);
    getDashboard()
      .then((res) => {
        const d = res.data?.data || res.data || {};
        // Map nested API shape → flat stat keys
        setStats({
          totalUsers:    d.users?.total    ?? 0,
          totalDrivers:  d.drivers?.total  ?? 0,
          activeDrivers: d.drivers?.online ?? 0,
          todayRides:    d.rides?.today    ?? 0,
          totalRides:    d.rides?.total    ?? 0,
          todayRevenue:  d.revenue?.today  ?? 0,
          totalRevenue:  d.revenue?.month  ?? 0,
          pendingKyc:    (d.drivers?.total ?? 0) - (d.drivers?.verified ?? 0),
        });
      })
      .catch(() => setError("Failed to load dashboard stats."))
      .finally(() => setLoadingStats(false));
  }, []);

  useEffect(() => {
    setLoadingChart(true);
    getRevenueAnalytics(days)
      .then((res) => setAnalytics(res.data?.data || res.data || {}))
      .catch(() => {})
      .finally(() => setLoadingChart(false));
  }, [days]);

  // Derive totals from arrays (API doesn't provide top-level aggregates)
  const totalRev = (analytics?.byDay || []).reduce((s, d) => s + (d.totalRevenue || 0), 0);
  const totalRid = (analytics?.byVehicle || []).reduce((s, v) => s + (v.totalRides || 0), 0);

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>

      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:24, fontWeight:700, color:"#fff", margin:0 }}>Dashboard</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Live overview of GO Mobility platform</p>
      </div>

      {error && (
        <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:10, padding:"10px 16px", color:"#fca5a5", marginBottom:20, fontSize:13 }}>
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16, marginBottom:32 }}>
        {loadingStats
          ? Array(8).fill(0).map((_,i) => <Skeleton key={i} />)
          : STAT_CARDS.map(({ key, label, icon:Icon, color, rupee }) => (
            <div key={key} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:"20px 20px 16px", backdropFilter:"blur(8px)", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color},transparent)` }} />
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <span style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>{label}</span>
                <div style={{ width:34, height:34, borderRadius:10, background:`${color}20`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon size={16} color={color} />
                </div>
              </div>
              <div style={{ fontSize:26, fontWeight:700, color:"#fff" }}>
                {rupee ? fmtRupee(stats?.[key]) : fmtNum(stats?.[key])}
              </div>
            </div>
          ))
        }
      </div>

      {/* Charts */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

        {/* Revenue Area Chart */}
        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:24 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <div>
              <div style={{ fontFamily:"Cinzel,serif", fontSize:14, color:"#fff", fontWeight:600 }}>Revenue Trend</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>
                Total: {fmtRupee(totalRev)}
              </div>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {[7,30,90].map((d) => (
                <button key={d} onClick={() => setDays(d)} style={{ padding:"4px 12px", borderRadius:8, border:"1px solid", fontSize:11, cursor:"pointer", fontFamily:"Cinzel,serif", fontWeight:600, transition:"all .2s", borderColor:days===d?"#D4AF37":"rgba(212,175,55,0.2)", background:days===d?"rgba(212,175,55,0.15)":"transparent", color:days===d?"#D4AF37":"rgba(255,255,255,0.4)" }}>
                  {d}D
                </button>
              ))}
            </div>
          </div>
          {loadingChart
            ? <Skeleton h={220} />
            : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={analytics?.byDay || []}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill:"rgba(255,255,255,0.35)", fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtK} tick={{ fill:"rgba(255,255,255,0.35)", fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="totalRevenue" name="Revenue" stroke="#D4AF37" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Vehicle Bar Chart */}
        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:24 }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontFamily:"Cinzel,serif", fontSize:14, color:"#fff", fontWeight:600 }}>Revenue by Vehicle</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>Total rides: {fmtNum(totalRid)}</div>
          </div>
          {loadingChart
            ? <Skeleton h={220} />
            : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={analytics?.byVehicle || []} barSize={44}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="vehicleType" tick={{ fill:"rgba(255,255,255,0.4)", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtK} tick={{ fill:"rgba(255,255,255,0.35)", fontSize:10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="totalRevenue" name="Revenue" fill="#D4AF37" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display:"flex", gap:10, marginTop:14 }}>
                  {(analytics?.byVehicle || []).map((v, i) => {
                    const colors = ["#f59e0b","#8b5cf6","#3b82f6"];
                    return (
                      <div key={v.vehicleType} style={{ flex:1, background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"10px 12px", borderTop:`2px solid ${colors[i]||"#D4AF37"}` }}>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", textTransform:"capitalize" }}>{v.vehicleType}</div>
                        <div style={{ fontSize:15, fontWeight:700, color:"#fff", marginTop:2 }}>{fmtNum(v.totalRides)}</div>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>rides</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          }
        </div>
      </div>
    </div>
  );
}
