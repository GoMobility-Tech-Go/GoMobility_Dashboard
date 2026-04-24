




import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Car,
  CheckCircle2,
  Clock3,
  Gauge,
  MapPinned,
  ShieldCheck,
  Star,
  TimerReset,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
   DATA
══════════════════════════════════ */
const QS = [
  { label: "Cities Live", value: "18", icon: MapPinned, color: "#D4AF37" },
  { label: "Total Drivers", value: "12.4K", icon: Car, color: "#34D399" },
  { label: "Payout Cycle", value: "24 hrs", icon: Wallet, color: "#60A5FA" },
  { label: "Alerts Resolved", value: "96.4%", icon: TimerReset, color: "#A78BFA" },
];

const METRICS = [
  { title: "Active Drivers", value: "2,847", ch: "+12.5%", tr: "up", sub: "Online now", icon: Car, pts: [38, 42, 46, 44, 49, 52, 54, 58, 64, 71], c: "#D4AF37" },
  { title: "Active Riders", value: "8,342", ch: "+8.3%", tr: "up", sub: "Requesting", icon: Users, pts: [46, 49, 52, 55, 59, 59, 61, 61, 63, 67], c: "#34D399" },
  { title: "Ride Requests/Hr", value: "1,247", ch: "+15.2%", tr: "up", sub: "Peak hour", icon: Activity, pts: [35, 37, 39, 41, 46, 50, 52, 54, 56, 58], c: "#60A5FA" },
  { title: "Driver Utilization", value: "78.4%", ch: "+5.1%", tr: "up", sub: "Efficiency", icon: Gauge, pts: [55, 56, 57, 58, 58, 59, 59, 60, 60, 61], c: "#A78BFA" },
  { title: "Ride Acceptance", value: "92.1%", ch: "+2.3%", tr: "up", sub: "Platform avg", icon: CheckCircle2, pts: [61, 61.5, 61.7, 62, 62.1, 62.2, 62.3, 62.4, 62.5, 62.6], c: "#34D399" },
  { title: "Cancellation Rate", value: "4.2%", ch: "-1.8%", tr: "down", sub: "Improving", icon: XCircle, pts: [58, 57.2, 56.4, 55.7, 55, 54.6, 54.2, 53.6, 53.1, 52.8], c: "#F87171" },
  { title: "Platform Revenue", value: "₹24.8L", ch: "+18.7%", tr: "up", sub: "Today", icon: TrendingUp, pts: [28, 31, 34, 37, 40, 43, 47, 52, 55, 59], c: "#D4AF37" },
  { title: "Avg. Wait Time", value: "3.2 min", ch: "-0.5%", tr: "down", sub: "Faster", icon: Clock3, pts: [64, 63, 61, 58, 56, 55, 54, 53, 52.5, 52], c: "#F59E0B" },
];

const HOURLY = [
  { time: "6AM", rides: 240 },
  { time: "8AM", rides: 560 },
  { time: "10AM", rides: 430 },
  { time: "12PM", rides: 690 },
  { time: "2PM", rides: 540 },
  { time: "4PM", rides: 780 },
  { time: "6PM", rides: 920 },
  { time: "8PM", rides: 660 },
];

const CITIES = [
  { city: "Mumbai", rides: 4200, color: "#D4AF37" },
  { city: "Delhi", rides: 3850, color: "#60A5FA" },
  { city: "Bangalore", rides: 3500, color: "#34D399" },
  { city: "Chennai", rides: 2100, color: "#A78BFA" },
  { city: "Hyderabad", rides: 1850, color: "#F59E0B" },
];

const WEEKLY = [
  { day: "Mon", rides: 3200 },
  { day: "Tue", rides: 4100 },
  { day: "Wed", rides: 3700 },
  { day: "Thu", rides: 4800 },
  { day: "Fri", rides: 5200 },
  { day: "Sat", rides: 6100 },
  { day: "Sun", rides: 4900 },
];

const ALERTS = [
  { id: 1, icon: AlertTriangle, type: "warn", title: "High demand surge in Andheri West — Activate surge pricing", time: "2 min ago", tag: "Surge" },
  { id: 2, icon: Star, type: "info", title: "12 drivers completed onboarding successfully today", time: "15 min ago", tag: "Onboarding" },
  { id: 3, icon: XCircle, type: "error", title: "3 fraud cases detected — Immediate review required", time: "28 min ago", tag: "Fraud" },
  { id: 4, icon: CheckCircle2, type: "success", title: "Peak hour revenue targets exceeded by 15%", time: "1 hr ago", tag: "Revenue" },
  { id: 5, icon: Zap, type: "warn", title: "Driver shortage detected in Koramangala zone", time: "1.5 hrs ago", tag: "Dispatch" },
];

const AST = {
  warn: { bg: "rgba(212,175,55,0.07)", br: "rgba(212,175,55,0.24)", c: "#D4AF37", tbg: "rgba(212,175,55,0.14)" },
  info: { bg: "rgba(96,165,250,0.07)", br: "rgba(96,165,250,0.22)", c: "#60A5FA", tbg: "rgba(96,165,250,0.12)" },
  error: { bg: "rgba(248,113,113,0.07)", br: "rgba(248,113,113,0.2)", c: "#F87171", tbg: "rgba(248,113,113,0.12)" },
  success: { bg: "rgba(52,211,153,0.07)", br: "rgba(52,211,153,0.2)", c: "#34D399", tbg: "rgba(52,211,153,0.12)" },
};

const HEALTH = [
  { label: "Uptime SLA", value: "99.98%", sub: "Last 30 days", color: "#34D399", bar: 99.9 },
  { label: "Peak City", value: "Mumbai", sub: "4,200 rides", color: "#D4AF37", bar: 84 },
  { label: "Driver Rating", value: "4.82 ★", sub: "Platform avg", color: "#A78BFA", bar: 96.4 },
  { label: "Surge Zones", value: "7 Active", sub: "Pricing live", color: "#F59E0B", bar: 58 },
  { label: "Refund Rate", value: "1.4%", sub: "Below target", color: "#34D399", bar: 86 },
];

const DONUT = [
  { name: "Completed", value: 78, color: "#D4AF37" },
  { name: "In Progress", value: 13, color: "#60A5FA" },
  { name: "Cancelled", value: 9, color: "#F87171" },
];

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
   HOURLY CHART
══════════════════════════════════ */
function HourlyChart() {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={HOURLY} margin={{ top: 12, right: 8, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="hourlyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="rgba(212,175,55,0.08)" strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: "rgba(212,175,55,0.48)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(212,175,55,0.38)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={34}
          />
          <Tooltip content={<CustomTooltip suffix="" />} />
          <Area
            type="monotone"
            dataKey="rides"
            name="Rides"
            stroke="#D4AF37"
            strokeWidth={2.5}
            fill="url(#hourlyFill)"
            dot={{ r: 3, strokeWidth: 0, fill: "#D4AF37" }}
            activeDot={{ r: 5, fill: "#D4AF37" }}
            isAnimationActive
            animationDuration={1800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ══════════════════════════════════
   CITY BAR CHART
══════════════════════════════════ */
function CityChart() {
  return (
    <div style={{ width: "100%", height: 230 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={CITIES} margin={{ top: 12, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="city"
            tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(212,175,55,0.36)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={34}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="rides"
            name="Rides"
            radius={[8, 8, 0, 0]}
            isAnimationActive
            animationDuration={1700}
          >
            {CITIES.map((entry) => (
              <Cell key={entry.city} fill={entry.color} fillOpacity={0.9} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ══════════════════════════════════
   WEEKLY CHART
══════════════════════════════════ */
function WeeklyChart() {
  return (
    <div style={{ width: "100%", height: 170 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={WEEKLY} margin={{ top: 12, right: 0, left: 0, bottom: 4 }}>
          <XAxis
            dataKey="day"
            tick={{ fill: "rgba(255,255,255,0.34)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="rides"
            name="Rides"
            radius={[6, 6, 0, 0]}
            isAnimationActive
            animationDuration={1600}
          >
            {WEEKLY.map((item) => (
              <Cell
                key={item.day}
                fill={item.rides === Math.max(...WEEKLY.map((d) => d.rides)) ? "#D4AF37" : "rgba(255,255,255,0.18)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ══════════════════════════════════
   DONUT CHART
══════════════════════════════════ */
function DonutChart() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div style={{ width: 120, height: 120, position: "relative", flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={DONUT}
              dataKey="value"
              nameKey="name"
              innerRadius={36}
              outerRadius={54}
              paddingAngle={3}
              stroke="transparent"
              isAnimationActive
              animationDuration={1600}
            >
              {DONUT.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip suffix="%" />} />
          </PieChart>
        </ResponsiveContainer>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontFamily: "'Cinzel',serif",
              fontSize: 18,
              fontWeight: 700,
              color: "#D4AF37",
              lineHeight: 1,
            }}
          >
            78%
          </span>
          <span
            style={{
              marginTop: 4,
              fontFamily: "'Outfit',sans-serif",
              fontSize: 8,
              letterSpacing: 1,
              color: "rgba(212,175,55,0.48)",
            }}
          >
            DONE
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 90 }}>
        {DONUT.map((s) => (
          <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <div>
              <p
                style={{
                  fontFamily: "'Outfit',sans-serif",
                  fontSize: 10.5,
                  color: "rgba(255,255,255,0.46)",
                  margin: 0,
                }}
              >
                {s.name}
              </p>
              <p
                style={{
                  fontFamily: "'Cinzel',serif",
                  fontSize: 13,
                  fontWeight: 700,
                  color: s.color,
                  margin: 0,
                }}
              >
                {s.value}%
              </p>
            </div>
          </div>
        ))}
      </div>
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

  const animatedMetrics = useMemo(() => {
    return METRICS.map((m) => {
      const numeric = parseFloat(String(m.value).replace(/[^\d.]/g, ""));
      if (Number.isNaN(numeric)) return m;

      let display = numeric * anim;

      if (String(m.value).includes("%")) {
        return { ...m, displayValue: `${display.toFixed(1)}%` };
      }
      if (String(m.value).includes("₹")) {
        return { ...m, displayValue: `₹${display.toFixed(1)}L` };
      }
      if (String(m.value).includes("min")) {
        return { ...m, displayValue: `${display.toFixed(1)} min` };
      }

      return { ...m, displayValue: Math.round(display).toLocaleString("en-IN") };
    });
  }, [anim]);

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

                  <span className={isUp ? "bup" : "bdn"}>
                    {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {m.ch}
                  </span>
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

            <HourlyChart />
          </div>

          <div className="rcol">
            <div className="dbc" style={{ padding: P }}>
              <div style={{ marginBottom: 14 }}>
                <ST sub="Ride Status" main="Completion Rate" />
              </div>
              <DonutChart />
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
              <WeeklyChart />
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CITIES.map((d) => (
                <div key={d.city} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                  <span
                    style={{
                      fontFamily: "'Outfit',sans-serif",
                      fontSize: isMob ? 9.5 : 10.5,
                      color: "rgba(255,255,255,0.42)",
                    }}
                  >
                    {isMob ? d.city.slice(0, 3) : d.city}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <CityChart />
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

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ALERTS.map((a) => {
                const Icon = a.icon;
                const s = AST[a.type];

                return (
                  <div key={a.id} className="dbal" style={{ background: s.bg, borderColor: s.br }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        flexShrink: 0,
                        background: "rgba(0,0,0,0.2)",
                        border: `1px solid ${s.br}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={15} color={s.c} strokeWidth={2} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        className="wrap-anywhere"
                        style={{
                          fontFamily: "'Outfit',sans-serif",
                          fontSize: isMob ? 11.5 : 12.5,
                          color: "rgba(255,255,255,0.82)",
                          fontWeight: 500,
                          lineHeight: 1.42,
                          margin: 0,
                        }}
                      >
                        {a.title}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                        <p
                          style={{
                            fontFamily: "'Cinzel',serif",
                            fontSize: 8.5,
                            color: s.c,
                            letterSpacing: 0.8,
                            margin: 0,
                            opacity: 0.78,
                          }}
                        >
                          {a.time}
                        </p>
                        <span
                          style={{
                            fontFamily: "'Outfit',sans-serif",
                            fontSize: 9.5,
                            fontWeight: 600,
                            color: s.c,
                            background: s.tbg,
                            borderRadius: 5,
                            padding: "1px 6px",
                          }}
                        >
                          {a.tag}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: s.c,
                        flexShrink: 0,
                        marginTop: 6,
                        boxShadow: `0 0 7px ${s.c}`,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dbc" style={{ padding: P, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <ShieldCheck size={15} color="#D4AF37" strokeWidth={2} />
              <ST sub="At A Glance" main="Platform Health" />
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
              {HEALTH.map((h) => (
                <div key={h.label}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      marginBottom: 6,
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'Outfit',sans-serif",
                        fontSize: 11.5,
                        color: "rgba(255,255,255,0.44)",
                        margin: 0,
                      }}
                    >
                      {h.label}
                    </p>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p
                        style={{
                          fontFamily: "'Cinzel',serif",
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: h.color,
                          margin: 0,
                        }}
                      >
                        {h.value}
                      </p>
                      <p
                        style={{
                          fontFamily: "'Outfit',sans-serif",
                          fontSize: 9.5,
                          color: "rgba(255,255,255,0.24)",
                          margin: 0,
                        }}
                      >
                        {h.sub}
                      </p>
                    </div>
                  </div>
                  <AnimBar value={h.bar} color={h.color} />
                </div>
              ))}
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
                ₹24.8L
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <span className="bup">
                  <ArrowUpRight size={10} />
                  +18.7%
                </span>
                <span
                  style={{
                    fontFamily: "'Outfit',sans-serif",
                    fontSize: 10.5,
                    color: "rgba(255,255,255,0.28)",
                  }}
                >
                  vs yesterday
                </span>
              </div>
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