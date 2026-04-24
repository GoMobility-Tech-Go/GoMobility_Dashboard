import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CarFront,
  IndianRupee,
  PieChart as PieChartIcon,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  LineChart as ReLineChart,
  Line,
  PieChart,
  Pie,
} from "recharts";

const summaryCards = [
  {
    id: "rides",
    title: "Total Rides (7 Days)",
    value: "27,496",
    change: "+12.5% vs last week",
    changeType: "positive",
  },
  {
    id: "drivers",
    title: "Avg. Daily Drivers",
    value: "907",
    change: "+8.3% vs last week",
    changeType: "positive",
  },
  {
    id: "revenue",
    title: "Weekly Revenue",
    value: "₹13.7L",
    change: "+15.2% vs last week",
    changeType: "positive",
  },
  {
    id: "rideValue",
    title: "Avg. Ride Value",
    value: "₹498",
    change: "-2.1% vs last week",
    changeType: "negative",
  },
];

const weeklyPerformance = [
  { day: "Mon", value: 3400 },
  { day: "Tue", value: 3200 },
  { day: "Wed", value: 3450 },
  { day: "Thu", value: 3650 },
  { day: "Fri", value: 4200 },
  { day: "Sat", value: 5000 },
  { day: "Sun", value: 4500 },
];

const vehicleDistribution = [
  { label: "Hatchback", value: 45, color: "#60A5FA" },
  { label: "Sedan", value: 35, color: "#34D399" },
  { label: "SUV", value: 15, color: "#F59E0B" },
  { label: "Luxury", value: 5, color: "#A78BFA" },
];

const utilizationData = [
  { time: "6AM", value: 46 },
  { time: "8AM", value: 36 },
  { time: "10AM", value: 52 },
  { time: "12PM", value: 76 },
  { time: "2PM", value: 68 },
  { time: "4PM", value: 72 },
  { time: "6PM", value: 65 },
  { time: "8PM", value: 70 },
  { time: "10PM", value: 86 },
  { time: "12AM", value: 94 },
  { time: "2AM", value: 78 },
];

const revenueTrend = [
  { day: "Mon", value: 168000 },
  { day: "Tue", value: 158000 },
  { day: "Wed", value: 170000 },
  { day: "Thu", value: 178000 },
  { day: "Fri", value: 205000 },
  { day: "Sat", value: 258000 },
  { day: "Sun", value: 224000 },
];

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@1,400&family=Outfit:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
    }

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
      top:0;
      left:0;
      right:0;
      height:1px;
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
      cursor:pointer;
    }

    .dbm::before{
      content:'';
      position:absolute;
      top:0;
      left:0;
      right:0;
      height:1px;
      background:linear-gradient(90deg,transparent,rgba(212,175,55,0.34),transparent);
    }

    .dbm:hover{
      transform:translateY(-4px);
      border-color:rgba(212,175,55,0.36);
      box-shadow:0 28px 70px rgba(0,0,0,0.52);
    }

    .bup{
      display:inline-flex;
      align-items:center;
      gap:4px;
      background:rgba(212,175,55,0.12);
      border:1px solid rgba(212,175,55,0.28);
      color:#D4AF37;
      border-radius:999px;
      padding:4px 9px;
      font-size:10px;
      font-weight:600;
      font-family:'Outfit',sans-serif;
      white-space:nowrap;
    }

    .bdn{
      display:inline-flex;
      align-items:center;
      gap:4px;
      background:rgba(248,113,113,0.1);
      border:1px solid rgba(248,113,113,0.24);
      color:#F87171;
      border-radius:999px;
      padding:4px 9px;
      font-size:10px;
      font-weight:600;
      font-family:'Outfit',sans-serif;
      white-space:nowrap;
    }

    .ldot{
      display:inline-block;
      width:7px;
      height:7px;
      border-radius:50%;
      background:#D4AF37;
      flex-shrink:0;
      animation:pdot 2.4s ease-in-out infinite;
    }

    @keyframes pdot{
      0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,.5)}
      50%{box-shadow:0 0 0 7px rgba(212,175,55,0)}
    }

    @keyframes fup{
      from{opacity:0;transform:translateY(22px)}
      to{opacity:1;transform:translateY(0)}
    }

    .fup{
      animation:fup .65s cubic-bezier(.22,1,.36,1) both;
    }

    @keyframes shim{
      0%{background-position:-200% center}
      100%{background-position:200% center}
    }

    .shim{
      background:linear-gradient(90deg,#D4AF37 0%,#f7dc6f 35%,#D4AF37 55%,#b8920f 100%);
      background-size:200% auto;
      -webkit-background-clip:text;
      -webkit-text-fill-color:transparent;
      background-clip:text;
      animation:shim 5s linear infinite;
    }

    .topGrid{
      display:grid;
      grid-template-columns:1fr;
      gap:18px;
      margin-bottom:20px;
    }

    @media(min-width:1100px){
      .topGrid{
        grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);
      }
    }

    .statGrid{
      display:grid;
      grid-template-columns:repeat(1,minmax(0,1fr));
      gap:14px;
      margin-bottom:20px;
    }

    @media(min-width:640px){
      .statGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
    }

    @media(min-width:1100px){
      .statGrid{grid-template-columns:repeat(4,minmax(0,1fr))}
    }

    .chartsGrid{
      display:grid;
      grid-template-columns:1fr;
      gap:18px;
      margin-bottom:20px;
    }

    @media(min-width:1200px){
      .chartsGrid{grid-template-columns:1fr 1fr}
    }

    .recharts-cartesian-axis-tick-value{
      font-family:'Outfit',sans-serif;
    }
  `}</style>
);

function SectionTitle({ sub, main }) {
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

function StatCard({ item, active, onClick, icon: Icon }) {
  const positive = item.changeType === "positive";

  return (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      className="dbm fup"
      style={{
        padding: "18px 18px 14px",
        borderColor: active ? "rgba(212,175,55,0.42)" : undefined,
        boxShadow: active ? "0 0 0 2px rgba(212,175,55,0.12)" : undefined,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: active ? "rgba(212,175,55,0.16)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${active ? "rgba(212,175,55,0.3)" : "rgba(212,175,55,0.12)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Icon size={16} color={active ? "#D4AF37" : "rgba(255,255,255,0.65)"} />
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: "rgba(255,255,255,0.38)",
          fontFamily: "'Outfit',sans-serif",
          textAlign: "left",
        }}
      >
        {item.title}
      </p>

      <h3
        style={{
          margin: "6px 0 8px",
          fontFamily: "'Cinzel',serif",
          fontSize: "clamp(22px,2vw,30px)",
          fontWeight: 800,
          color: "#fff",
          letterSpacing: "-0.04em",
          textAlign: "left",
        }}
      >
        {item.value}
      </h3>

      <div style={{ textAlign: "left" }}>
        <span className={positive ? "bup" : "bdn"}>
          {positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {item.change}
        </span>
      </div>
    </button>
  );
}

function ChartCard({ title, subtitle, children, badge }) {
  return (
    <div className="dbc fup" style={{ padding: "20px 22px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Cinzel',serif",
              fontSize: 16,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 11,
                color: "rgba(255,255,255,0.34)",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        {badge ? <span className="bup">{badge}</span> : null}
      </div>

      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;

  const value = payload[0]?.value;
  const name = payload[0]?.name || payload[0]?.dataKey;

  return (
    <div
      style={{
        background: "rgba(4,18,46,0.96)",
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

      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: "#fff",
          fontWeight: 600,
          fontFamily: "'Outfit',sans-serif",
        }}
      >
        {name}: {formatter ? formatter(value) : value}
      </p>
    </div>
  );
}

function WeeklyBarChartCard({ data }) {
  return (
    <div
      style={{
        borderRadius: 16,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(212,175,55,0.1)",
        padding: "14px 14px",
      }}
    >
      <div style={{ width: "100%", height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip formatter={(v) => v.toLocaleString("en-IN")} />} />
            <Bar
              dataKey="value"
              name="Total Rides"
              radius={[8, 8, 0, 0]}
              isAnimationActive
              animationDuration={1500}
            >
              {data.map((item, index) => (
                <Cell
                  key={item.day}
                  fill={index === 5 ? "#60A5FA" : "rgba(59,130,246,0.86)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontSize: 12,
          fontWeight: 600,
          color: "#60A5FA",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 22,
            height: 3,
            borderRadius: 999,
            background: "#60A5FA",
          }}
        />
        <span>Total Rides</span>
      </div>
    </div>
  );
}

function VehiclePieCard({ data }) {
  return (
    <div
      style={{
        borderRadius: 16,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(212,175,55,0.1)",
        padding: "14px 14px",
      }}
    >
      <div style={{ width: "100%", height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={48}
              outerRadius={86}
              paddingAngle={3}
              stroke="transparent"
              isAnimationActive
              animationDuration={1600}
            >
              {data.map((item) => (
                <Cell key={item.label} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          gap: 10,
          marginTop: 8,
        }}
      >
        {data.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 12,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(212,175,55,0.08)",
              padding: "10px 11px",
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: item.color,
                flexShrink: 0,
              }}
            />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 10.5,
                  color: "rgba(255,255,255,0.36)",
                }}
              >
                {item.label}
              </p>
              <p
                style={{
                  margin: "3px 0 0",
                  fontFamily: "'Cinzel',serif",
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: item.color,
                }}
              >
                {item.value}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReLineChartCard({
  data,
  color,
  dataKey,
  xKey,
  legend,
  formatter,
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(212,175,55,0.1)",
        padding: "14px 14px",
      }}
    >
      <div style={{ width: "100%", height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ReLineChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip formatter={formatter} />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              name={legend}
              stroke={color}
              strokeWidth={2.6}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: color }}
              isAnimationActive
              animationDuration={1600}
            />
          </ReLineChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontSize: 12,
          fontWeight: 600,
          color,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 22,
            height: 3,
            borderRadius: 999,
            background: color,
          }}
        />
        <span>{legend}</span>
      </div>
    </div>
  );
}

export default function OperationalMetricsPage() {
  const [activeCard, setActiveCard] = useState("rides");

  const cardIcons = {
    rides: Activity,
    drivers: CarFront,
    revenue: IndianRupee,
    rideValue: TrendingUp,
  };

  const activeInsight = useMemo(() => {
    switch (activeCard) {
      case "rides":
        return {
          title: "Ride Volume Insight",
          text: "Weekend performance is strongest, with Saturday peaking at 5,000 rides and Sunday maintaining elevated demand.",
        };
      case "drivers":
        return {
          title: "Driver Activity Insight",
          text: "Average daily driver participation is up, suggesting stronger supply availability during key hours.",
        };
      case "revenue":
        return {
          title: "Revenue Insight",
          text: "Revenue growth is outpacing ride growth, indicating better pricing efficiency and stronger trip mix.",
        };
      case "rideValue":
        return {
          title: "Ride Value Insight",
          text: "Average ride value dipped slightly versus last week, which may reflect shorter trips or promotional activity.",
        };
      default:
        return {
          title: "Metric Insight",
          text: "Select a card to inspect the most relevant operational signal.",
        };
    }
  }, [activeCard]);

  return (
    <>
      <GlobalStyles />

      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          fontFamily: "'Outfit',sans-serif",
        }}
      >
        {/* HEADER */}
        <div className="fup topGrid" style={{ animationDelay: "0ms" }}>
          <div className="dbc" style={{ padding: "20px 22px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
                flexWrap: "wrap",
              }}
            >
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
                GO Mobility · Analytics Command
              </p>
            </div>

            <h1
              style={{
                fontFamily: "'Cinzel',serif",
                fontSize: "clamp(24px,4.6vw,46px)",
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                margin: "0 0 10px",
              }}
            >
              <span style={{ color: "#fff" }}>Operational </span>
              <span className="shim">Metrics</span>
            </h1>

            <p
              style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontStyle: "italic",
                fontSize: "clamp(14px,1.4vw,18px)",
                color: "rgba(212,175,55,0.5)",
                lineHeight: 1.7,
                margin: 0,
                maxWidth: 640,
              }}
            >
              Deep dive into platform performance, fleet composition, utilization rhythm, and revenue behavior across the week.
            </p>
          </div>

          <div
            className="dbc"
            style={{
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 14,
            }}
          >
            <div>
              <SectionTitle sub="Selected Signal" main={activeInsight.title} />
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.34)",
                }}
              >
                {activeInsight.text}
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span className="bup">
                <ArrowUpRight size={10} />
                Weekly Analytics
              </span>
              <span className="bup">
                <ArrowUpRight size={10} />
                Live Snapshot
              </span>
            </div>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <section className="statGrid fup" style={{ animationDelay: "80ms" }}>
          {summaryCards.map((item) => (
            <StatCard
              key={item.id}
              item={item}
              active={activeCard === item.id}
              onClick={setActiveCard}
              icon={cardIcons[item.id]}
            />
          ))}
        </section>

        {/* FIRST ROW */}
        <section className="chartsGrid fup" style={{ animationDelay: "160ms" }}>
          <ChartCard
            title="Weekly Performance"
            subtitle="Ride volume across the last seven days"
            badge="7-Day Ride Mix"
          >
            <WeeklyBarChartCard data={weeklyPerformance} />
          </ChartCard>

          <ChartCard
            title="Vehicle Type Distribution"
            subtitle="Fleet mix across the platform"
            badge="Fleet Composition"
          >
            <VehiclePieCard data={vehicleDistribution} />
          </ChartCard>
        </section>

        {/* SECOND ROW */}
        <section className="chartsGrid fup" style={{ animationDelay: "240ms" }}>
          <ChartCard
            title="Hourly Driver Utilization Rate"
            subtitle="Utilization pattern across the day"
            badge="Utilization Rate"
          >
            <ReLineChartCard
              data={utilizationData}
              color="#34D399"
              dataKey="value"
              xKey="time"
              legend="Utilization Rate"
              formatter={(v) => `${v}%`}
            />
          </ChartCard>

          <ChartCard
            title="Daily Revenue Trend"
            subtitle="Revenue behavior across the week"
            badge="Revenue Signal"
          >
            <ReLineChartCard
              data={revenueTrend}
              color="#A78BFA"
              dataKey="value"
              xKey="day"
              legend="Revenue"
              formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
            />
          </ChartCard>
        </section>
      </div>
    </>
  );
}