




import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../../services/api.js";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Car,
  CheckCircle2,
  Gauge,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

/* ══════════════════════════════════
   WINDOW SIZE HOOK
══════════════════════════════════ */
function useWinW() {
  const [w, setW] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return w;
}

/* ══════════════════════════════════
   ANIMATION HOOK
══════════════════════════════════ */
function useAnim(dur = 1400) {
  const [p, setP] = useState(0);

  useEffect(() => {
    let start = null;
    let raf;

    const ease = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (ts) => {
      if (!start) start = ts;
      const value = ease(Math.min((ts - start) / dur, 1));
      setP(value);
      if (value < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dur]);

  return p;
}

/* ══════════════════════════════════
   GLOBAL CSS
══════════════════════════════════ */
const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@1,400&family=Outfit:wght@300;400;500;600;700&display=swap');

    * , *::before, *::after { box-sizing: border-box; }

    .dbc{
      background:linear-gradient(145deg,rgba(255,255,255,0.048) 0%,rgba(255,255,255,0.012) 100%);
      border:1px solid rgba(212,175,55,0.17);
      border-radius:20px;
      backdrop-filter:blur(14px);
      position:relative;
      overflow:hidden;
      transition:transform .32s cubic-bezier(.22,1,.36,1),box-shadow .32s,border-color .32s;
      min-width:0;
    }

    .dbc::before{
      content:'';
      position:absolute;
      top:0;left:0;right:0;height:1px;
      background:linear-gradient(90deg,transparent,rgba(212,175,55,0.38),transparent);
    }

    .dbc:hover{
      transform:translateY(-3px);
      border-color:rgba(212,175,55,0.34);
      box-shadow:0 24px 64px rgba(0,0,0,0.48);
    }

    .dbm{
      background:linear-gradient(145deg,rgba(255,255,255,0.05) 0%,rgba(255,255,255,0.012) 100%);
      border:1px solid rgba(212,175,55,0.16);
      border-radius:20px;
      backdrop-filter:blur(12px);
      position:relative;
      overflow:hidden;
      transition:transform .32s cubic-bezier(.22,1,.36,1),box-shadow .32s,border-color .32s;
      min-width:0;
    }

    .dbm::before{
      content:'';
      position:absolute;
      top:0;left:0;right:0;height:1px;
      background:linear-gradient(90deg,transparent,rgba(212,175,55,0.34),transparent);
    }

    .dbm:hover{
      transform:translateY(-4px);
      border-color:rgba(212,175,55,0.36);
      box-shadow:0 28px 70px rgba(0,0,0,0.52);
    }

    .dbal{
      display:flex;
      align-items:flex-start;
      gap:12px;
      border-radius:14px;
      padding:12px 14px;
      border:1px solid transparent;
      transition:background .2s,border-color .2s,transform .25s;
      min-width:0;
    }

    .dbal:hover{ transform:translateX(5px); }

    .bup{
      display:inline-flex;align-items:center;gap:3px;
      background:rgba(212,175,55,0.12);
      border:1px solid rgba(212,175,55,0.28);
      color:#D4AF37;border-radius:100px;padding:3px 8px;
      font-size:10px;font-weight:600;font-family:'Outfit',sans-serif;
      white-space:nowrap;flex-shrink:0;
    }

    .bdn{
      display:inline-flex;align-items:center;gap:3px;
      background:rgba(248,113,113,0.1);
      border:1px solid rgba(248,113,113,0.26);
      color:#F87171;border-radius:100px;padding:3px 8px;
      font-size:10px;font-weight:600;font-family:'Outfit',sans-serif;
      white-space:nowrap;flex-shrink:0;
    }

    .ldot{
      display:inline-block;width:7px;height:7px;border-radius:50%;
      background:#D4AF37;flex-shrink:0;
      animation:pdot 2.4s ease-in-out infinite;
    }

    @keyframes pdot{
      0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,.5);}
      50%{box-shadow:0 0 0 7px rgba(212,175,55,0);}
    }

    @keyframes fup{
      from{opacity:0;transform:translateY(22px);}
      to{opacity:1;transform:translateY(0);}
    }

    .fup{ animation:fup .65s cubic-bezier(.22,1,.36,1) both; }

    @keyframes shim{
      0%{background-position:-200% center;}
      100%{background-position:200% center;}
    }

    .shim{
      background:linear-gradient(90deg,#D4AF37 0%,#f7dc6f 35%,#D4AF37 55%,#b8920f 100%);
      background-size:200% auto;
      -webkit-background-clip:text;
      -webkit-text-fill-color:transparent;
      background-clip:text;
      animation:shim 5s linear infinite;
    }

    .hrow{
      display:grid;
      grid-template-columns:1fr;
      gap:18px;
      align-items:stretch;
    }

    @media(min-width:1180px){
      .hrow{
        grid-template-columns:minmax(420px,1.12fr) minmax(520px,0.88fr);
        gap:22px;
      }
    }

    .mg{
      display:grid;
      gap:14px;
      grid-template-columns:repeat(1,minmax(0,1fr));
    }

    @media(min-width:640px){
      .mg{ grid-template-columns:repeat(2,minmax(0,1fr)); }
    }

    @media(min-width:1100px){
      .mg{ grid-template-columns:repeat(4,minmax(0,1fr)); }
    }

    .cr1{
      display:grid;
      gap:18px;
      grid-template-columns:1fr;
    }

    @media(min-width:1100px){
      .cr1{
        grid-template-columns:minmax(0,3fr) minmax(320px,2fr);
      }
    }

    .rcol{
      display:grid;
      gap:18px;
      grid-template-columns:1fr;
      min-width:0;
    }

    @media(min-width:600px) and (max-width:1099px){
      .rcol{ grid-template-columns:1fr 1fr; }
    }

    .qsg{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
    }

    @media(min-width:760px){
      .qsg{ grid-template-columns:repeat(4,minmax(0,1fr)); }
    }

    @media(min-width:1180px){
      .qsg{ grid-template-columns:repeat(2,minmax(0,1fr)); }
    }

    @media(min-width:1450px){
      .qsg{ grid-template-columns:repeat(4,minmax(0,1fr)); }
    }

    .brow{
      display:grid;
      gap:18px;
      grid-template-columns:1fr;
    }

    @media(min-width:1000px){
      .brow{ grid-template-columns:minmax(0,3fr) minmax(300px,2fr); }
    }

    .truncate-1{
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }

    .wrap-anywhere{
      overflow-wrap:anywhere;
      word-break:break-word;
    }

    .recharts-cartesian-axis-tick-value{
      font-family:'Outfit',sans-serif;
    }
  `}</style>
);

/* ══════════════════════════════════
   METRIC DEFINITIONS (icons/colors only — values from API)
══════════════════════════════════ */
const METRIC_DEFS = [
  { title: "Online Drivers",     sub: "Right now",    icon: Car,          c: "#D4AF37", getValue: d => d?.drivers?.online },
  { title: "Active Users",       sub: "Total active", icon: Users,        c: "#34D399", getValue: d => d?.users?.active },
  { title: "Rides Today",        sub: "New trips",    icon: Activity,     c: "#60A5FA", getValue: d => d?.rides?.today },
  { title: "Ongoing Rides",      sub: "In progress",  icon: Gauge,        c: "#A78BFA", getValue: d => d?.rides?.ongoing },
  { title: "Completed Rides",    sub: "All time",     icon: CheckCircle2, c: "#34D399", getValue: d => d?.rides?.completed },
  { title: "Cancelled Rides",    sub: "Total",        icon: XCircle,      c: "#F87171", getValue: d => d?.rides?.cancelled },
  { title: "Revenue Today",      sub: "Platform",     icon: TrendingUp,   c: "#D4AF37", getValue: d => d?.revenue?.today != null ? `Rs${d.revenue.today}` : null },
  { title: "Revenue This Month", sub: "Platform",     icon: Wallet,       c: "#F59E0B", getValue: d => d?.revenue?.month != null ? `Rs${d.revenue.month}` : null },
];

const FLAT_PTS = [50, 50, 50, 50, 50, 50, 50, 50, 50, 50];

/* ══════════════════════════════════
   HELPERS
══════════════════════════════════ */
function toSparkData(points) {
  return points.map((value, i) => ({ x: i + 1, value }));
}

function CustomTooltip({ active, payload, label, suffix = "" }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: "rgba(4,18,46,0.95)",
        border: "1px solid rgba(212,175,55,0.22)",
        borderRadius: 12,
        padding: "10px 12px",
        backdropFilter: "blur(12px)",
        boxShadow: "0 14px 28px rgba(0,0,0,0.35)",
      }}
    >
      {label ? (
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 10,
            color: "rgba(212,175,55,0.62)",
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          {label}
        </p>
      ) : null}

      {payload.map((item, idx) => (
        <p
          key={idx}
          style={{
            margin: 0,
            fontSize: 11,
            color: item.color || "#fff",
            fontWeight: 600,
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          {item.name}: {item.value}
          {suffix}
        </p>
      ))}
    </div>
  );
}

/* ══════════════════════════════════
   MINI SPARKLINE
══════════════════════════════════ */
function Sparkline({ pts, color }) {
  const data = useMemo(() => toSparkData(pts), [pts]);

  return (
    <div style={{ width: "100%", height: 56 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`sparkFill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.2}
            fill={`url(#sparkFill-${color.replace("#", "")})`}
            dot={{ r: 2.5, strokeWidth: 0, fill: color }}
            activeDot={{ r: 4, fill: color }}
            isAnimationActive
            animationDuration={1300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ══════════════════════════════════
   CHART EMPTY STATE
══════════════════════════════════ */
function ChartEmpty({ label = "No data available" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "rgba(255,255,255,0.25)", fontFamily: "'Outfit',sans-serif", fontSize: 12 }}>
      {label}
    </div>
  );
}

/* ══════════════════════════════════
   ANIM PROGRESS BAR
══════════════════════════════════ */
function AnimBar({ value, color }) {
  const [w, setW] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setW(value), 250);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div
      style={{
        height: 4,
        background: "rgba(255,255,255,0.07)",
        borderRadius: 100,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${w}%`,
          background: `linear-gradient(90deg,${color}70,${color})`,
          borderRadius: 100,
          transition: "width 1.6s cubic-bezier(.22,1,.36,1)",
        }}
      />
    </div>
  );
}

/* ══════════════════════════════════
   SECTION TITLE
══════════════════════════════════ */
function ST({ sub, main }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p
        style={{
          fontFamily: "'Cinzel',serif",
          fontSize: 8.5,
          letterSpacing: 2.5,
          color: "rgba(212,175,55,0.4)",
          textTransform: "uppercase",
          margin: "0 0 4px",
        }}
      >
        {sub}
      </p>
      <h2
        style={{
          fontFamily: "'Cinzel',serif",
          fontSize: "clamp(14px,1.8vw,18px)",
          fontWeight: 700,
          color: "#fff",
          letterSpacing: -0.3,
          margin: 0,
        }}
      >
        {main}
      </h2>
    </div>
  );
}

/* ══════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════ */
export default function DashboardPage() {
  const winW = useWinW();
  const isMob = winW < 600;
  const isDesktopWide = winW >= 1180;
  const now = new Date();
  const P = isMob ? "12px 14px" : "20px 22px";
  const anim = useAnim(1500);

  const [dashboard, setDashboard] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    api.getDashboard()
      .then(res => setDashboard(res?.data || res || null))
      .catch(() => {})
      .finally(() => setDashLoading(false));
  }, []);

  const QS = [
    { label: "Total Users",       value: dashLoading ? "—" : String(dashboard?.users?.total    ?? "—"), icon: Users,      color: "#34D399" },
    { label: "Total Drivers",     value: dashLoading ? "—" : String(dashboard?.drivers?.total  ?? "—"), icon: Car,        color: "#D4AF37" },
    { label: "Total Rides",       value: dashLoading ? "—" : String(dashboard?.rides?.total    ?? "—"), icon: Activity,   color: "#60A5FA" },
    { label: "Verified Drivers",  value: dashLoading ? "—" : String(dashboard?.drivers?.verified ?? "—"), icon: ShieldCheck, color: "#A78BFA" },
  ];

  const METRICS = useMemo(() => METRIC_DEFS.map(def => {
    const raw = def.getValue(dashboard);
    return {
      ...def,
      value: dashLoading ? "—" : (raw != null ? String(raw) : "—"),
      ch: "",
      tr: "up",
      pts: FLAT_PTS,
    };
  }), [dashboard, dashLoading]);

  const animatedMetrics = useMemo(() => {
    return METRICS.map((m) => ({ ...m, displayValue: m.value }));
  }, [METRICS]);

  return (
    <>
      <GS />

      <div
        style={{
          fontFamily: "'Outfit',sans-serif",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
        }}
      >
        {/* HEADER */}
        <div className="fup hrow" style={{ marginBottom: 22, animationDelay: "0ms" }}>
          <div style={{ minWidth: 0, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span className="ldot" />
              <p
                style={{
                  fontFamily: "'Cinzel',serif",
                  fontSize: 9,
                  letterSpacing: 3,
                  color: "rgba(212,175,55,0.44)",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                GO Mobility · Live Operations
              </p>
            </div>

            <h1
              style={{
                fontFamily: "'Cinzel',serif",
                fontSize: "clamp(24px,4.6vw,56px)",
                fontWeight: 900,
                lineHeight: 1.03,
                letterSpacing: "-0.03em",
                margin: "0 0 12px",
                maxWidth: isDesktopWide ? 620 : "100%",
                wordBreak: "break-word",
              }}
            >
              <span style={{ color: "#fff" }}>Operations </span>
              <span className="shim">Dashboard</span>
            </h1>

            <p
              style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontStyle: "italic",
                fontSize: "clamp(14px,1.4vw,18px)",
                color: "rgba(212,175,55,0.5)",
                lineHeight: 1.72,
                margin: "0 0 8px",
                maxWidth: 560,
              }}
            >
              Real-time platform intelligence — clean visibility across 18 cities.
            </p>

            <p
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontSize: 11,
                color: "rgba(255,255,255,0.28)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {now.toLocaleDateString("en-IN", {
                weekday: isMob ? "short" : "long",
                day: "numeric",
                month: isMob ? "short" : "long",
                year: "numeric",
              })}{" "}
              ·{" "}
              {now.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              IST
            </p>
          </div>

          <div
            className="dbc"
            style={{
              padding: 0,
              overflow: "hidden",
              borderRadius: 18,
              width: "100%",
              minWidth: 0,
              alignSelf: "stretch",
            }}
          >
            <div className="qsg">
              {QS.map((s, i) => {
                const Icon = s.icon;
                const isTwoCol = winW < 760 || (winW >= 1180 && winW < 1450);
                const isRight = i % 2 !== 0;
                const isTop = i < 2;

                return (
                  <div
                    key={s.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                      padding: isMob ? "13px 13px" : "16px 18px",
                      borderRight: isTwoCol
                        ? !isRight
                          ? "1px solid rgba(212,175,55,0.1)"
                          : "none"
                        : i < QS.length - 1
                        ? "1px solid rgba(212,175,55,0.1)"
                        : "none",
                      borderBottom: isTwoCol && isTop ? "1px solid rgba(212,175,55,0.1)" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: isMob ? 33 : 38,
                        height: isMob ? 33 : 38,
                        borderRadius: 10,
                        flexShrink: 0,
                        background: `${s.color}18`,
                        border: `1px solid ${s.color}2e`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={isMob ? 14 : 16} color={s.color} strokeWidth={2} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: "'Cinzel',serif",
                          fontSize: isMob ? 13 : 15,
                          fontWeight: 700,
                          color: "#fff",
                          margin: 0,
                          letterSpacing: -0.3,
                        }}
                      >
                        {s.value}
                      </p>
                      <p
                        className="truncate-1"
                        style={{
                          fontFamily: "'Outfit',sans-serif",
                          fontSize: isMob ? 9 : 10,
                          color: "rgba(255,255,255,0.35)",
                          margin: "1px 0 0",
                        }}
                      >
                        {s.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* METRIC CARDS */}
        <div className="mg fup" style={{ marginBottom: 20, animationDelay: "70ms" }}>
          {animatedMetrics.map((m, i) => {
            const Icon = m.icon;
            const isUp = m.tr === "up";

            return (
              <div
                key={m.title}
                className="dbm fup"
                style={{
                  padding: isMob ? "14px 13px 11px" : "18px 18px 13px",
                  animationDelay: `${90 + i * 42}ms`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      flexShrink: 0,
                      background: `${m.c}16`,
                      border: `1px solid ${m.c}28`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={15} color={m.c} strokeWidth={2} />
                  </div>

                  {m.ch && (
                    <span className={isUp ? "bup" : "bdn"}>
                      {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {m.ch}
                    </span>
                  )}
                </div>

                <p
                  style={{
                    fontFamily: "'Cinzel',serif",
                    fontSize: isMob ? "clamp(17px,4.5vw,21px)" : "clamp(19px,2vw,26px)",
                    fontWeight: 900,
                    color: "#fff",
                    letterSpacing: "-0.04em",
                    lineHeight: 1.1,
                    margin: "0 0 4px",
                  }}
                >
                  {m.displayValue || m.value}
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 6,
                    minWidth: 0,
                  }}
                >
                  <p
                    className="truncate-1"
                    style={{
                      fontFamily: "'Outfit',sans-serif",
                      fontSize: isMob ? 10 : 11,
                      color: "rgba(212,175,55,0.5)",
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    {m.title}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Outfit',sans-serif",
                      fontSize: 9,
                      color: "rgba(255,255,255,0.24)",
                      margin: 0,
                      flexShrink: 0,
                    }}
                  >
                    {m.sub}
                  </p>
                </div>

                <Sparkline pts={m.pts} color={m.c} />
              </div>
            );
          })}
        </div>

        {/* CHARTS */}
        <div className="cr1 fup" style={{ marginBottom: 20, animationDelay: "480ms" }}>
          <div className="dbc" style={{ padding: P }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <ST sub="Live Analytics" main="Hourly Ride Volume" />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(212,175,55,0.09)",
                  border: "1px solid rgba(212,175,55,0.2)",
                  borderRadius: 100,
                  padding: "4px 12px",
                  flexShrink: 0,
                }}
              >
                <span className="ldot" style={{ width: 6, height: 6 }} />
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: "#D4AF37" }}>
                  Rides/Hr
                </span>
              </div>
            </div>

            <ChartEmpty label="Hourly ride data not available via API" />
          </div>

          <div className="rcol">
            <div className="dbc" style={{ padding: P }}>
              <div style={{ marginBottom: 14 }}>
                <ST sub="Ride Status" main="Completion Rate" />
              </div>
              <ChartEmpty label="Ride status breakdown not available via API" />
            </div>

            <div className="dbc" style={{ padding: P }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 14,
                  flexWrap: "wrap",
                }}
              >
                <ST sub="7-Day Trend" main="Weekly Rides" />
                <span className="bup">
                  <ArrowUpRight size={10} />
                  +22%
                </span>
              </div>
              <ChartEmpty label="Weekly trend data not available via API" />
            </div>
          </div>
        </div>

        {/* CITY CHART */}
        <div className="dbc fup" style={{ padding: P, marginBottom: 20, animationDelay: "600ms" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <ST sub="Regional Data" main="City Performance Overview" />
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'Outfit',sans-serif" }}>City data not available via API</div>
          </div>

          <ChartEmpty label="City performance data not available via API" />
        </div>

        {/* BOTTOM ROW */}
        <div className="brow fup" style={{ marginBottom: 24, animationDelay: "700ms" }}>
          <div className="dbc" style={{ padding: P }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 3,
                  height: 22,
                  background: "linear-gradient(180deg,#D4AF37,rgba(212,175,55,0.1))",
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
              <ST sub="System Notifications" main="Recent Alerts" />
            </div>

            <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.25)", fontFamily: "'Outfit',sans-serif", fontSize: 12 }}>
              System notifications not available via API
            </div>
          </div>

          <div className="dbc" style={{ padding: P, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <ShieldCheck size={15} color="#D4AF37" strokeWidth={2} />
              <ST sub="At A Glance" main="Platform Health" />
            </div>

            <div style={{ padding: 30, textAlign: "center", color: "rgba(255,255,255,0.25)", fontFamily: "'Outfit',sans-serif", fontSize: 12 }}>
              Platform health metrics not available via API
            </div>

            <div
              style={{
                height: 1,
                background: "linear-gradient(90deg,transparent,rgba(212,175,55,0.15),transparent)",
                margin: "18px 0",
              }}
            />

            <div
              style={{
                background: "rgba(212,175,55,0.07)",
                border: "1px solid rgba(212,175,55,0.17)",
                borderRadius: 14,
                padding: "14px 16px",
              }}
            >
              <p
                style={{
                  fontFamily: "'Cinzel',serif",
                  fontSize: 8.5,
                  letterSpacing: 2,
                  color: "rgba(212,175,55,0.44)",
                  textTransform: "uppercase",
                  margin: "0 0 5px",
                }}
              >
                Revenue Today
              </p>

              <p
                style={{
                  fontFamily: "'Cinzel',serif",
                  fontSize: "clamp(22px,4vw,28px)",
                  fontWeight: 900,
                  color: "#D4AF37",
                  margin: 0,
                  letterSpacing: -1,
                }}
              >
                {dashLoading ? "—" : (dashboard?.revenue_today ? `₹${dashboard.revenue_today}` : "—")}
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 8, opacity: 0.26 }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(212,175,55,0.6),transparent)" }} />
          <span
            style={{
              fontFamily: "'Cinzel',serif",
              fontSize: 8,
              color: "#D4AF37",
              letterSpacing: 3,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            GO Mobility · {now.getFullYear()}
          </span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(270deg,rgba(212,175,55,0.6),transparent)" }} />
        </div>
      </div>
    </>
  );
}