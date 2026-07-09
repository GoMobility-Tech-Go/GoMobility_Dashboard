import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ToastProvider, useToast, PageWrapper, GlobalStyles, Card, TableCard,
  MiniStatRow, StatCard, AlertBox, Modal, GoldTooltip,
} from "../../components/ui/index.jsx";
import {
  BarChart, Bar, LineChart, Line, PieChart as RcPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import {
  ArrowLeft, PieChart, Loader, RefreshCw, TrendingUp, TrendingDown, Coins,
  Car, Route, Bike, AlertTriangle, ChevronRight, Hexagon,
} from "lucide-react";
import {
  getZonesSummary, getZoneDetail, getDeadMileageBurn, getCategoryRollup,
} from "../../api/zones";

const DAYS_OPTIONS = [7, 30, 90, 365];

const CATEGORY_COLORS = {
  transport:      "#D4AF37",
  commercial:     "#60A5FA",
  healthcare:     "#F87171",
  tourism:        "#34D399",
  education:      "#A78BFA",
  infrastructure: "#F59E0B",
  other:          "#6B7280",
};

const VEHICLE_COLORS = {
  bike:    "#60A5FA",
  auto:    "#F59E0B",
  car:     "#34D399",
  xl:      "#A78BFA",
  premium: "#D4AF37",
  luxury:  "#EC4899",
};

const fmt = (v) => {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};
const fmtCurrency = (v) => `₹${fmt(v)}`;
const fmtShort = (v) => {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return "0";
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

// ── Days selector ────────────────────────────────────────────────────────────
function DaysSelector({ value, onChange }) {
  return (
    <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 10, padding: 3 }}>
      {DAYS_OPTIONS.map(d => (
        <button
          key={d}
          onClick={() => onChange(d)}
          style={{
            padding: "6px 12px", borderRadius: 8,
            background: value === d ? "rgba(212,175,55,0.15)" : "transparent",
            border: "none", cursor: "pointer",
            color: value === d ? "#D4AF37" : "rgba(255,255,255,0.55)",
            fontSize: 11.5, fontWeight: 700, fontFamily: "Outfit,sans-serif",
            transition: "all .15s",
          }}
        >
          {d}D
        </button>
      ))}
    </div>
  );
}

// ── Zone detail modal ────────────────────────────────────────────────────────
function ZoneDetailModal({ zoneId, days, onClose }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!zoneId) return;
    setLoading(true);
    getZoneDetail(zoneId, days)
      .then(res => setData(res.data?.data || null))
      .catch(e => toast?.(e.response?.data?.message || "Failed to load detail", "error"))
      .finally(() => setLoading(false));
  }, [zoneId, days, toast]);

  const pieData = useMemo(() => {
    const bv = data?.byVehicle || [];
    return bv.map(v => ({ name: v.vehicle_type, value: parseFloat(v.revenue) || 0, rides: v.rides }));
  }, [data]);

  return (
    <Modal open={!!zoneId} onClose={onClose} title={`Zone Detail · Last ${days} days`} maxWidth={720}>
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
          <Loader size={20} style={{ animation: "gmSpin 1s linear infinite" }}/>
          <div style={{ marginTop: 10, fontSize: 12 }}>Loading detail…</div>
        </div>
      ) : !data ? (
        <AlertBox type="error"><span>No data</span></AlertBox>
      ) : (
        <>
          {/* Rollup grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8, marginBottom: 16 }}>
            {[
              { l: "Total Rides",  v: fmt(data.rollup?.total_rides) },
              { l: "Revenue",      v: fmtCurrency(data.rollup?.revenue) },
              { l: "Entry Fees",   v: fmtCurrency(data.rollup?.entry_fees_collected) },
              { l: "Toll",         v: fmtCurrency(data.rollup?.toll_collected) },
              { l: "Dead Burn",    v: fmtCurrency(data.rollup?.dead_mileage_burn), red: true },
              { l: "Corridor Rides", v: fmt(data.rollup?.fixed_corridor_rides) },
            ].map(x => (
              <div key={x.l} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 10 }}>
                <div style={{ fontSize: 9.5, color: "rgba(212,175,55,0.55)", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", fontFamily: "Cinzel,serif", marginBottom: 4 }}>{x.l}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: x.red ? "#F87171" : "#fff", fontFamily: "Outfit,sans-serif" }}>{x.v}</div>
              </div>
            ))}
          </div>

          {/* Vehicle breakdown */}
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(212,175,55,0.7)", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 8, fontFamily: "Cinzel,serif" }}>
            Vehicle Breakdown
          </div>
          {pieData.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>No rides in this period</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RcPieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={70} innerRadius={40} paddingAngle={2}>
                      {pieData.map((d, i) => <Cell key={i} fill={VEHICLE_COLORS[d.name] || "#888"}/>)}
                    </Pie>
                    <Tooltip content={<GoldTooltip/>}/>
                  </RcPieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontFamily: "Outfit,sans-serif" }}>
                {pieData.map(v => (
                  <div key={v.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.75)", textTransform: "capitalize" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: VEHICLE_COLORS[v.name] || "#888" }}/>
                      {v.name}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                      <b style={{ color: "rgba(255,255,255,0.85)" }}>{v.rides}</b> rides · {fmtCurrency(v.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meet & Greet */}
          {data.meetGreet && (
            <>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(212,175,55,0.7)", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 8, fontFamily: "Cinzel,serif" }}>
                Meet & Greet
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1, padding: "10px 14px", background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.22)", borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: "rgba(212,175,55,0.6)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>MG Rides</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#D4AF37", marginTop: 2 }}>{fmt(data.meetGreet.mg_rides)}</div>
                </div>
                <div style={{ flex: 1, padding: "10px 14px", background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.22)", borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: "rgba(52,211,153,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>MG Revenue</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#34D399", marginTop: 2 }}>{fmtCurrency(data.meetGreet.mg_revenue)}</div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}

// ── Main content ─────────────────────────────────────────────────────────────
function AnalyticsContent() {
  const nav = useNavigate();
  const toast = useToast();

  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState({ zones: [] });
  const [burn, setBurn]       = useState({ daily: [], total_burn: 0 });
  const [rollup, setRollup]   = useState({ categories: [] });
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState("total_revenue");
  const [sortDesc, setSortDesc] = useState(true);
  const [detailZone, setDetailZone] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, b, r] = await Promise.all([
        getZonesSummary(days),
        getDeadMileageBurn(days),
        getCategoryRollup(days),
      ]);
      setSummary(s.data?.data || { zones: [] });
      setBurn(b.data?.data || { daily: [], total_burn: 0 });
      setRollup(r.data?.data || { categories: [] });
    } catch (e) {
      toast?.(e.response?.data?.message || "Failed to load analytics", "error");
    } finally { setLoading(false); }
  }, [days, toast]);

  useEffect(() => { load(); }, [load]);

  // ── KPI aggregates from summary.zones ──────────────────────────────────────
  const kpis = useMemo(() => {
    const zones = summary.zones || [];
    const totalRides   = zones.reduce((s, z) => s + (parseInt(z.total_rides, 10) || 0), 0);
    const totalRevenue = zones.reduce((s, z) => s + (parseFloat(z.total_revenue) || 0), 0);
    const totalEntry   = zones.reduce((s, z) => s + (parseFloat(z.total_entry_fees) || 0), 0);
    const totalToll    = zones.reduce((s, z) => s + (parseFloat(z.total_toll_fees) || 0), 0);
    const totalBurn    = parseFloat(burn.total_burn) || zones.reduce((s, z) => s + (parseFloat(z.total_dead_mileage_burn) || 0), 0);
    const completedRides = zones.reduce((s, z) => s + (parseInt(z.completed_rides, 10) || 0), 0);
    const cancelledRides = zones.reduce((s, z) => s + (parseInt(z.cancelled_rides, 10) || 0), 0);
    const compRate = totalRides ? (completedRides / totalRides * 100).toFixed(1) : "0";
    return {
      totalRides, totalRevenue, totalEntry, totalToll, totalBurn,
      completedRides, cancelledRides, compRate,
      zonesCount: zones.length,
    };
  }, [summary, burn]);

  // ── Sorted zones for table ─────────────────────────────────────────────────
  const sortedZones = useMemo(() => {
    const zones = [...(summary.zones || [])];
    zones.sort((a, b) => {
      const av = parseFloat(a[sortKey]) || 0;
      const bv = parseFloat(b[sortKey]) || 0;
      return sortDesc ? bv - av : av - bv;
    });
    return zones;
  }, [summary, sortKey, sortDesc]);

  // ── Daily burn chart data ──────────────────────────────────────────────────
  const burnChartData = useMemo(() => {
    const daily = burn.daily || [];
    return [...daily].reverse().map(d => ({
      day: d.day ? new Date(d.day).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "",
      burn: parseFloat(d.burn_amount) || 0,
      rides: parseInt(d.rides_with_burn, 10) || 0,
    }));
  }, [burn]);

  // ── Category chart data ────────────────────────────────────────────────────
  const catChartData = useMemo(() => {
    return (rollup.categories || []).map(c => ({
      category: c.zone_category,
      rides: parseInt(c.rides, 10) || 0,
      revenue: parseFloat(c.revenue) || 0,
      zones: parseInt(c.zones_count, 10) || 0,
      burn: parseFloat(c.dead_mileage_burn) || 0,
    }));
  }, [rollup]);

  const toggleSort = (k) => {
    if (sortKey === k) setSortDesc(!sortDesc);
    else { setSortKey(k); setSortDesc(true); }
  };
  const sortIndicator = (k) => sortKey === k ? (sortDesc ? " ↓" : " ↑") : "";

  return (
    <PageWrapper
      title="Zone Analytics"
      subtitle="Revenue · rides · dead mileage burn · category rollup"
      actions={
        <>
          <DaysSelector value={days} onChange={setDays}/>
          <button className="btn-outline" onClick={() => nav("/zones")}>
            <ArrowLeft size={13}/> Back to Zones
          </button>
          <button className="btn-outline" onClick={load} disabled={loading}>
            <RefreshCw size={13} style={loading ? { animation: "gmSpin 1s linear infinite" } : {}}/> Refresh
          </button>
        </>
      }
    >
      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard label={`Total Rides · ${days}D`}   value={fmt(kpis.totalRides)}      icon={Car}          iconColor="#34D399" iconBg="rgba(52,211,153,0.1)"/>
        <StatCard label="Revenue"                    value={fmtCurrency(kpis.totalRevenue)} icon={Coins}   iconColor="#D4AF37" iconBg="rgba(212,175,55,0.1)"/>
        <StatCard label="Entry Fees Collected"       value={fmtCurrency(kpis.totalEntry)}   icon={Route}   iconColor="#60A5FA" iconBg="rgba(96,165,250,0.1)"/>
        <StatCard label="Toll Collected"             value={fmtCurrency(kpis.totalToll)}    icon={Route}   iconColor="#A78BFA" iconBg="rgba(167,139,250,0.1)"/>
        <StatCard label="Dead Mileage Burn"          value={fmtCurrency(kpis.totalBurn)}    icon={TrendingDown} iconColor="#F87171" iconBg="rgba(248,113,113,0.1)"/>
        <StatCard label="Completion Rate"            value={`${kpis.compRate}%`}            icon={TrendingUp}    iconColor="#34D399" iconBg="rgba(52,211,153,0.1)"/>
      </div>

      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
          <Loader size={20} style={{ animation: "gmSpin 1s linear infinite" }}/>
          <div style={{ marginTop: 10, fontSize: 12 }}>Loading analytics…</div>
        </div>
      )}

      {!loading && (
        <>
          {/* Charts row */}
          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14, marginBottom: 18 }}>
            {/* Daily burn line chart */}
            <Card>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(212,175,55,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Cinzel,serif", fontSize: 12.5, fontWeight: 700, color: "#D4AF37" }}>
                  <TrendingDown size={13}/> Dead Mileage Burn (Daily)
                </div>
                <span style={{ fontSize: 11, color: "#F87171", fontFamily: "Outfit,sans-serif", fontWeight: 600 }}>
                  Total: {fmtCurrency(burn.total_burn)}
                </span>
              </div>
              <div style={{ padding: "12px 8px 4px", height: 240 }}>
                {burnChartData.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 12 }}>No burn recorded</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={burnChartData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                      <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }}/>
                      <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickFormatter={fmtShort}/>
                      <Tooltip content={<GoldTooltip/>} formatter={(v) => fmtCurrency(v)}/>
                      <Line type="monotone" dataKey="burn" stroke="#F87171" strokeWidth={2} dot={{ fill: "#F87171", r: 3 }} activeDot={{ r: 5 }}/>
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* Category rollup bar */}
            <Card>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(212,175,55,0.1)", display: "flex", alignItems: "center", gap: 8, fontFamily: "Cinzel,serif", fontSize: 12.5, fontWeight: 700, color: "#D4AF37" }}>
                <Hexagon size={13}/> Category Rollup
              </div>
              <div style={{ padding: "12px 8px 4px", height: 240 }}>
                {catChartData.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 12 }}>No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catChartData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                      <XAxis dataKey="category" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} interval={0} angle={-15} textAnchor="end" height={45}/>
                      <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickFormatter={fmtShort}/>
                      <Tooltip content={<GoldTooltip/>}/>
                      <Bar dataKey="rides" radius={[6, 6, 0, 0]}>
                        {catChartData.map((d, i) => <Cell key={i} fill={CATEGORY_COLORS[d.category] || "#888"}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          {/* Per-zone table */}
          <TableCard
            title="Per-Zone Performance"
            icon={<PieChart size={15} color="#D4AF37"/>}
            actions={
              <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", fontFamily: "Outfit,sans-serif" }}>
                {sortedZones.length} zone{sortedZones.length === 1 ? "" : "s"}
              </span>
            }
          >
            {sortedZones.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                No zone activity in the last {days} days
              </div>
            ) : (
              <table className="gm-table">
                <thead>
                  <tr>
                    <th>Zone</th>
                    <th style={{ cursor: "pointer" }} onClick={() => toggleSort("total_rides")}>Rides{sortIndicator("total_rides")}</th>
                    <th style={{ cursor: "pointer" }} onClick={() => toggleSort("completed_rides")}>Completed{sortIndicator("completed_rides")}</th>
                    <th style={{ cursor: "pointer" }} onClick={() => toggleSort("cancelled_rides")}>Cancelled{sortIndicator("cancelled_rides")}</th>
                    <th style={{ cursor: "pointer" }} onClick={() => toggleSort("total_revenue")}>Revenue{sortIndicator("total_revenue")}</th>
                    <th style={{ cursor: "pointer" }} onClick={() => toggleSort("total_entry_fees")}>Entry{sortIndicator("total_entry_fees")}</th>
                    <th style={{ cursor: "pointer" }} onClick={() => toggleSort("total_toll_fees")}>Toll{sortIndicator("total_toll_fees")}</th>
                    <th style={{ cursor: "pointer" }} onClick={() => toggleSort("total_dead_mileage_burn")}>Burn{sortIndicator("total_dead_mileage_burn")}</th>
                    <th style={{ cursor: "pointer" }} onClick={() => toggleSort("avg_ride_fare")}>Avg Fare{sortIndicator("avg_ride_fare")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedZones.map(z => (
                    <tr key={z.id} style={{ cursor: "pointer" }} onClick={() => setDetailZone(z)}>
                      <td>
                        <div>
                          <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#D4AF37", fontSize: 12 }}>{z.zone_code}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{z.name}</div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{fmt(z.total_rides)}</td>
                      <td style={{ color: "#34D399" }}>{fmt(z.completed_rides)}</td>
                      <td style={{ color: "#F87171" }}>{fmt(z.cancelled_rides)}</td>
                      <td style={{ color: "#D4AF37", fontWeight: 700 }}>{fmtCurrency(z.total_revenue)}</td>
                      <td>{fmtCurrency(z.total_entry_fees)}</td>
                      <td>{fmtCurrency(z.total_toll_fees)}</td>
                      <td style={{ color: "#F87171" }}>{fmtCurrency(z.total_dead_mileage_burn)}</td>
                      <td>{fmtCurrency(z.avg_ride_fare)}</td>
                      <td style={{ textAlign: "right" }}>
                        <ChevronRight size={13} color="rgba(212,175,55,0.5)"/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TableCard>
        </>
      )}

      {detailZone && (
        <ZoneDetailModal
          zoneId={detailZone.id}
          days={days}
          onClose={() => setDetailZone(null)}
        />
      )}

      <GlobalStyles/>
      <style>{`@keyframes gmSpin{to{transform:rotate(360deg)}}`}</style>
    </PageWrapper>
  );
}

export default function ZoneAnalyticsPage() {
  return (
    <ToastProvider>
      <AnalyticsContent/>
    </ToastProvider>
  );
}
