import { useMemo, useState } from "react";
import {
  Clock3,
  LocateFixed,
  Settings2,
  Users,
  ArrowUpRight,
  Radar,
  Route,
  TimerReset,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  Tooltip,
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  Cell,
} from "recharts";

/* ══════════════════════════════════
   GLOBAL STYLES
══════════════════════════════════ */
const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@1,400&family=Outfit:wght@300;400;500;600;700&display=swap');

    *,*::before,*::after{box-sizing:border-box}

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

    .bup{
      display:inline-flex;align-items:center;gap:4px;
      background:rgba(212,175,55,0.12);
      border:1px solid rgba(212,175,55,0.28);
      color:#D4AF37;border-radius:999px;padding:4px 9px;
      font-size:10px;font-weight:600;font-family:'Outfit',sans-serif;
      white-space:nowrap;
    }

    .ldot{
      display:inline-block;width:7px;height:7px;border-radius:50%;
      background:#D4AF37;flex-shrink:0;
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

    .fup{animation:fup .65s cubic-bezier(.22,1,.36,1) both}

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

    .mainGrid{
      display:grid;
      grid-template-columns:1fr;
      gap:18px;
    }

    @media(min-width:1200px){
      .mainGrid{
        grid-template-columns:minmax(0,1.35fr) minmax(340px,.95fr);
      }
    }

    .panelGrid{
      display:grid;
      grid-template-columns:1fr;
      gap:18px;
    }

    .slider{
      -webkit-appearance:none;
      appearance:none;
      width:100%;
      height:8px;
      border-radius:999px;
      background:rgba(255,255,255,0.1);
      outline:none;
      cursor:pointer;
    }

    .slider::-webkit-slider-thumb{
      -webkit-appearance:none;
      appearance:none;
      width:18px;
      height:18px;
      border-radius:999px;
      background:#D4AF37;
      border:2px solid #081327;
      box-shadow:0 2px 10px rgba(212,175,55,0.35);
    }

    .slider::-moz-range-thumb{
      width:18px;
      height:18px;
      border-radius:999px;
      background:#D4AF37;
      border:2px solid #081327;
      box-shadow:0 2px 10px rgba(212,175,55,0.35);
    }

    .recharts-cartesian-axis-tick-value{
      font-family:'Outfit',sans-serif;
    }
  `}</style>
);

/* ══════════════════════════════════
   HELPERS
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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

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
        </p>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="dbm fup" style={{ padding: "18px 18px 14px" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: `${color}18`,
          border: `1px solid ${color}28`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Icon size={16} color={color} />
      </div>

      <p
        style={{
          margin: "0 0 4px",
          fontFamily: "'Cinzel',serif",
          fontSize: "clamp(20px,2vw,28px)",
          fontWeight: 800,
          color: "#fff",
        }}
      >
        {value}
      </p>

      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: "rgba(255,255,255,0.38)",
          fontFamily: "'Outfit',sans-serif",
        }}
      >
        {label}
      </p>
    </div>
  );
}

function SliderField({
  icon: Icon,
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = "",
  note,
  color = "#D4AF37",
}) {
  const percentage = ((value - min) / (max - min || 1)) * 100;

  return (
    <div
      style={{
        borderRadius: 16,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(212,175,55,0.1)",
        padding: "14px 14px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              background: `${color}18`,
              border: `1px solid ${color}28`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={13} color={color} />
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 12.5,
              color: "rgba(255,255,255,0.72)",
              fontWeight: 500,
              fontFamily: "'Outfit',sans-serif",
            }}
          >
            {label}
          </p>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            fontFamily: "'Cinzel',serif",
            whiteSpace: "nowrap",
          }}
        >
          {Number(value).toFixed(step < 1 ? 1 : 0)}
          {suffix}
        </p>
      </div>

      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${color}33 ${percentage}%, rgba(255,255,255,0.08) ${percentage}%)`,
          display: "flex",
          alignItems: "center",
        }}
      >
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slider"
          style={{ background: "transparent" }}
        />
      </div>

      <div
        style={{
          marginTop: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.3)",
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          {min}
          {suffix}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.3)",
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          {max}
          {suffix}
        </span>
      </div>

      {note ? (
        <p
          style={{
            margin: "7px 0 0",
            fontSize: 10.5,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.3)",
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}

function ToggleRow({ title, description, enabled, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(212,175,55,0.1)",
        padding: "13px 14px",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            fontWeight: 600,
            color: "#fff",
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          {title}
        </p>
        <p
          style={{
            margin: "3px 0 0",
            fontSize: 10.5,
            color: "rgba(255,255,255,0.34)",
            lineHeight: 1.5,
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onChange}
        aria-label={`Toggle ${title}`}
        style={{
          position: "relative",
          width: 44,
          height: 26,
          borderRadius: 999,
          border: "none",
          background: enabled
            ? "linear-gradient(90deg,#D4AF37,#f7dc6f)"
            : "rgba(255,255,255,0.16)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: enabled ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: enabled ? "#081327" : "#fff",
            transition: "left .22s ease",
          }}
        />
      </button>
    </div>
  );
}

function PerformanceCard({ title, value, color, barColor }) {
  return (
    <div
      style={{
        borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(212,175,55,0.1)",
        padding: "13px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "rgba(255,255,255,0.42)",
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          {title}
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: "'Cinzel',serif",
            fontSize: 15,
            fontWeight: 700,
            color,
          }}
        >
          {value}
        </p>
      </div>

      <div
        style={{
          height: 6,
          width: "100%",
          overflow: "hidden",
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 999,
            background: barColor,
            width: value,
          }}
        />
      </div>
    </div>
  );
}

function Panel({ icon: Icon, title, children }) {
  return (
    <div className="dbc" style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "rgba(212,175,55,0.12)",
            border: "1px solid rgba(212,175,55,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={15} color="#D4AF37" />
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: "'Cinzel',serif",
            fontSize: 16,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: -0.2,
          }}
        >
          {title}
        </h2>
      </div>

      <div style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}

/* ══════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════ */
export default function DispatchSettingsPage() {
  const [initialSearchRadius, setInitialSearchRadius] = useState(2.5);
  const [expandToNoDriver, setExpandToNoDriver] = useState(4);
  const [finalExpandTo, setFinalExpandTo] = useState(6);

  const [maxWaitTime, setMaxWaitTime] = useState(120);
  const [driverRequestTimeout, setDriverRequestTimeout] = useState(30);
  const [maxDriverDistance, setMaxDriverDistance] = useState(8);

  const [autoAssignRides, setAutoAssignRides] = useState(true);
  const [prioritizeNearestDriver, setPrioritizeNearestDriver] = useState(true);
  const [balanceDemandSupply, setBalanceDemandSupply] = useState(false);

  const searchStages = useMemo(
    () => [
      { stage: "Initial", radius: initialSearchRadius },
      { stage: "Expand 1", radius: expandToNoDriver },
      { stage: "Expand 2", radius: finalExpandTo },
    ],
    [initialSearchRadius, expandToNoDriver, finalExpandTo]
  );

  const algoPerf = useMemo(
    () => [
      { name: "Match", value: 12.3 },
      { name: "Assign", value: 9.1 },
      { name: "Accept", value: 8.4 },
    ],
    []
  );

  const coverageGauge = useMemo(() => {
    const ratio = (initialSearchRadius / (finalExpandTo || 1)) * 100;
    return [{ name: "Coverage", value: Math.min(100, Math.max(0, ratio)) }];
  }, [initialSearchRadius, finalExpandTo]);

  return (
    <>
      <GS />

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
                GO Mobility · Dispatch Intelligence
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
              <span style={{ color: "#fff" }}>Dispatch Algorithm </span>
              <span className="shim">Control</span>
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
              Fine-tune driver discovery, request timing, and assignment behavior with live dispatch intelligence.
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
              <ST sub="Control Status" main="Matching Engine Active" />
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.34)",
                }}
              >
                Search radius, timeouts, and assignment strategy are configurable in real time from the control surface.
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span className="bup">
                <ArrowUpRight size={10} />
                Auto Dispatch
              </span>
              <span className="bup">
                <ArrowUpRight size={10} />
                Matching Live
              </span>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="statGrid fup" style={{ animationDelay: "80ms" }}>
          <StatCard
            icon={LocateFixed}
            label="Initial Radius"
            value={`${initialSearchRadius.toFixed(1)} km`}
            color="#D4AF37"
          />
          <StatCard
            icon={Clock3}
            label="Wait Time"
            value={`${maxWaitTime}s`}
            color="#60A5FA"
          />
          <StatCard
            icon={TimerReset}
            label="Request Timeout"
            value={`${driverRequestTimeout}s`}
            color="#34D399"
          />
          <StatCard
            icon={Route}
            label="Driver Distance"
            value={`${maxDriverDistance.toFixed(1)} km`}
            color="#A78BFA"
          />
        </div>

        {/* MAIN */}
        <div className="mainGrid fup" style={{ animationDelay: "180ms" }}>
          {/* LEFT PANELS */}
          <div className="panelGrid">
            <Panel icon={LocateFixed} title="Driver Search Radius">
              <div style={{ display: "grid", gap: 14 }}>
                <SliderField
                  icon={LocateFixed}
                  label="Initial Search Radius"
                  value={initialSearchRadius}
                  min={0.5}
                  max={5.0}
                  step={0.5}
                  onChange={setInitialSearchRadius}
                  suffix=" km"
                  note="First search for available drivers within this radius."
                  color="#D4AF37"
                />

                <SliderField
                  icon={Radar}
                  label="Expand to (if no driver)"
                  value={expandToNoDriver}
                  min={2.0}
                  max={8.0}
                  step={0.5}
                  onChange={setExpandToNoDriver}
                  suffix=" km"
                  note="Second search radius if no driver is found initially."
                  color="#60A5FA"
                />

                <SliderField
                  icon={Route}
                  label="Final Expand to"
                  value={finalExpandTo}
                  min={4.0}
                  max={12.0}
                  step={0.5}
                  onChange={setFinalExpandTo}
                  suffix=" km"
                  note="Final discovery radius before dispatch is dropped."
                  color="#F87171"
                />

                <div
                  style={{
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(212,175,55,0.1)",
                    padding: "14px 14px",
                  }}
                >
                  <div style={{ marginBottom: 10 }}>
                    <ST sub="Search Mapping" main="Expansion Strategy" />
                  </div>

                  <div style={{ width: "100%", height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={searchStages} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="dispatchSearchFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false} />
                        <XAxis
                          dataKey="stage"
                          tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="radius"
                          name="Radius"
                          stroke="#D4AF37"
                          strokeWidth={2.4}
                          fill="url(#dispatchSearchFill)"
                          dot={{ r: 3, fill: "#D4AF37", strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: "#D4AF37" }}
                          isAnimationActive
                          animationDuration={1500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel icon={Clock3} title="Timing & Behavior">
              <div style={{ display: "grid", gap: 14 }}>
                <SliderField
                  icon={Clock3}
                  label="Max Wait Time"
                  value={maxWaitTime}
                  min={30}
                  max={300}
                  step={10}
                  onChange={setMaxWaitTime}
                  suffix="s"
                  color="#60A5FA"
                />

                <SliderField
                  icon={TimerReset}
                  label="Driver Request Timeout"
                  value={driverRequestTimeout}
                  min={10}
                  max={60}
                  step={5}
                  onChange={setDriverRequestTimeout}
                  suffix="s"
                  color="#34D399"
                />

                <SliderField
                  icon={Route}
                  label="Max Driver Distance"
                  value={maxDriverDistance}
                  min={5.0}
                  max={15.0}
                  step={0.5}
                  onChange={setMaxDriverDistance}
                  suffix=" km"
                  color="#A78BFA"
                />
              </div>
            </Panel>

            <Panel icon={Settings2} title="Assignment Rules">
              <div style={{ display: "grid", gap: 10 }}>
                <ToggleRow
                  title="Auto-Assign Rides"
                  description="Automatically assign rides to the best available driver."
                  enabled={autoAssignRides}
                  onChange={() => setAutoAssignRides((prev) => !prev)}
                />

                <ToggleRow
                  title="Prioritize Nearest Driver"
                  description="Prefer the closest driver first to reduce ETA."
                  enabled={prioritizeNearestDriver}
                  onChange={() => setPrioritizeNearestDriver((prev) => !prev)}
                />

                <ToggleRow
                  title="Balance Demand & Supply"
                  description="Distribute ride requests intelligently across fleet availability."
                  enabled={balanceDemandSupply}
                  onChange={() => setBalanceDemandSupply((prev) => !prev)}
                />
              </div>
            </Panel>
          </div>

          {/* RIGHT SIDE */}
          <div className="panelGrid">
            <Panel icon={Users} title="Algorithm Performance">
              <div style={{ display: "grid", gap: 12 }}>
                <PerformanceCard
                  title="Avg. Match Time"
                  value="12.3%"
                  color="#34D399"
                  barColor="linear-gradient(90deg,#34D399,#86EFAC)"
                />
                <PerformanceCard
                  title="Assignment Success Rate"
                  value="91%"
                  color="#60A5FA"
                  barColor="linear-gradient(90deg,#60A5FA,#93C5FD)"
                />
                <PerformanceCard
                  title="Driver Acceptance Rate"
                  value="84%"
                  color="#F59E0B"
                  barColor="linear-gradient(90deg,#F59E0B,#FCD34D)"
                />
              </div>

              <div
                style={{
                  marginTop: 14,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(212,175,55,0.1)",
                  padding: "14px 14px",
                }}
              >
                <div style={{ marginBottom: 10 }}>
                  <ST sub="Core Metrics" main="Performance Pattern" />
                </div>

                <div style={{ width: "100%", height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={algoPerf} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="value"
                        name="Value"
                        radius={[8, 8, 0, 0]}
                        isAnimationActive
                        animationDuration={1500}
                      >
                        <Cell fill="#34D399" />
                        <Cell fill="#60A5FA" />
                        <Cell fill="#F59E0B" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Panel>

            <Panel icon={ShieldCheck} title="Coverage Snapshot">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                <div style={{ width: 130, height: 130, position: "relative", flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius="68%"
                      outerRadius="100%"
                      data={coverageGauge}
                      startAngle={210}
                      endAngle={-30}
                      barSize={12}
                    >
                      <RadialBar
                        background={{ fill: "rgba(255,255,255,0.08)" }}
                        dataKey="value"
                        cornerRadius={12}
                        fill="#D4AF37"
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>

                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "'Cinzel',serif",
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#D4AF37",
                        lineHeight: 1,
                      }}
                    >
                      {Math.round((initialSearchRadius / finalExpandTo) * 100)}%
                    </p>
                    <p
                      style={{
                        margin: "5px 0 0",
                        fontSize: 10,
                        color: "rgba(255,255,255,0.34)",
                      }}
                    >
                      Initial Coverage
                    </p>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div
                      style={{
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(212,175,55,0.1)",
                        padding: "12px 13px",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 10.5,
                          color: "rgba(255,255,255,0.36)",
                        }}
                      >
                        Search Strategy
                      </p>
                      <p
                        style={{
                          margin: "6px 0 2px",
                          fontFamily: "'Cinzel',serif",
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#D4AF37",
                        }}
                      >
                        {initialSearchRadius} → {expandToNoDriver} → {finalExpandTo} km
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 10.5,
                          color: "rgba(255,255,255,0.28)",
                        }}
                      >
                        Progressive driver discovery flow
                      </p>
                    </div>

                    <div
                      style={{
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(212,175,55,0.1)",
                        padding: "12px 13px",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 10.5,
                          color: "rgba(255,255,255,0.36)",
                        }}
                      >
                        Dispatch Logic
                      </p>
                      <p
                        style={{
                          margin: "6px 0 2px",
                          fontFamily: "'Cinzel',serif",
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#60A5FA",
                        }}
                      >
                        {autoAssignRides ? "Auto Assign On" : "Manual Assign Mode"}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 10.5,
                          color: "rgba(255,255,255,0.28)",
                        }}
                      >
                        {prioritizeNearestDriver
                          ? "Nearest driver priority enabled"
                          : "Distance priority disabled"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  borderRadius: 16,
                  background: "rgba(212,175,55,0.07)",
                  border: "1px solid rgba(212,175,55,0.17)",
                  padding: "14px 15px",
                }}
              >
                <div style={{ display: "grid", gap: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: "rgba(255,255,255,0.45)",
                      }}
                    >
                      Active Flags
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "'Cinzel',serif",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#D4AF37",
                      }}
                    >
                      {[autoAssignRides, prioritizeNearestDriver, balanceDemandSupply].filter(Boolean).length}/3
                    </p>
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {[
                      { label: "Auto Assign", enabled: autoAssignRides },
                      { label: "Nearest Priority", enabled: prioritizeNearestDriver },
                      { label: "Demand Balance", enabled: balanceDemandSupply },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.42)",
                          }}
                        >
                          {item.label}
                        </span>

                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            color: item.enabled ? "#34D399" : "rgba(255,255,255,0.35)",
                            fontSize: 10.5,
                            fontWeight: 600,
                          }}
                        >
                          <CheckCircle2 size={12} />
                          {item.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}