import { useMemo, useState, useEffect } from "react";
import { api } from "../../services/api.js";
import {
  IndianRupee,
  Gauge,
  MoonStar,
  Clock3,
  Save,
  ArrowUpRight,
  Activity,
  Wallet,
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
        grid-template-columns:minmax(0,1.45fr) minmax(340px,.9fr);
      }
    }

    .configStack{
      display:grid;
      grid-template-columns:1fr;
      gap:18px;
    }

    .inputDark{
      width:100%;
      height:44px;
      border-radius:12px;
      border:1px solid rgba(212,175,55,0.14);
      background:rgba(255,255,255,0.04);
      color:#fff;
      padding:0 14px;
      outline:none;
      transition:border-color .2s, box-shadow .2s, background .2s;
      font-size:14px;
      font-family:'Outfit',sans-serif;
    }

    .inputDark:focus{
      border-color:rgba(212,175,55,0.34);
      box-shadow:0 0 0 4px rgba(212,175,55,0.08);
      background:rgba(255,255,255,0.055);
    }

    .inputDark::placeholder{
      color:rgba(255,255,255,0.24);
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
          {item.name}: ₹{Number(item.value).toFixed(2)}
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
  prefix = "₹",
  suffix = "",
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
          {prefix}
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
          {prefix}
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
          {prefix}
          {max}
          {suffix}
        </span>
      </div>
    </div>
  );
}

function PreviewRow({ label, value, strong = false, gold = false }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 12.5,
          color: strong ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.42)",
          fontWeight: strong ? 600 : 400,
          fontFamily: "'Outfit',sans-serif",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: strong ? 700 : 600,
          color: gold ? "#D4AF37" : "#fff",
          fontFamily: strong ? "'Cinzel',serif" : "'Outfit',sans-serif",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </p>
    </div>
  );
}

/* ══════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════ */
export default function PricingEnginePage() {
  const [baseFare, setBaseFare] = useState(40);
  const [pricePerKm, setPricePerKm] = useState(12);
  const [pricePerMinute, setPricePerMinute] = useState(2);
  const [convenienceFee, setConvenienceFee] = useState(15);

  const [surgeCap, setSurgeCap] = useState(3.0);
  const [nightSurge, setNightSurge] = useState(1.5);
  const [peakHourSurge, setPeakHourSurge] = useState(2.0);

  useEffect(() => {
    api.getPricingSettings()
      .then(res => {
        const s = res?.data?.settings || res?.settings || res?.data || res || null;
        if (!s) return;
        if (s.base_fare != null) setBaseFare(Number(s.base_fare));
        if (s.price_per_km != null) setPricePerKm(Number(s.price_per_km));
        if (s.price_per_minute != null) setPricePerMinute(Number(s.price_per_minute));
        if (s.convenience_fee != null) setConvenienceFee(Number(s.convenience_fee));
        if (s.surge_cap != null) setSurgeCap(Number(s.surge_cap));
        if (s.night_surge != null) setNightSurge(Number(s.night_surge));
        if (s.peak_surge != null) setPeakHourSurge(Number(s.peak_surge));
      })
      .catch(() => {});
  }, []);

  const [distance, setDistance] = useState(10);
  const [time, setTime] = useState(25);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1);

  const fareBreakdown = useMemo(() => {
    const distanceFare = distance * pricePerKm;
    const timeFare = time * pricePerMinute;
    const subtotal = baseFare + distanceFare + timeFare + convenienceFee;
    const totalFare = subtotal * surgeMultiplier;

    return {
      distanceFare,
      timeFare,
      subtotal,
      totalFare,
    };
  }, [
    baseFare,
    pricePerKm,
    pricePerMinute,
    convenienceFee,
    distance,
    time,
    surgeMultiplier,
  ]);

  const farePreviewChart = useMemo(
    () => [
      { name: "Base", value: baseFare },
      { name: "Distance", value: fareBreakdown.distanceFare },
      { name: "Time", value: fareBreakdown.timeFare },
      { name: "Fee", value: convenienceFee },
    ],
    [baseFare, fareBreakdown.distanceFare, fareBreakdown.timeFare, convenienceFee]
  );

  const surgeGauge = [{ name: "Surge", value: (surgeMultiplier / surgeCap) * 100 }];

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
                GO Mobility · Pricing Control
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
              <span style={{ color: "#fff" }}>Pricing </span>
              <span className="shim">Engine</span>
            </h1>

            <p
              style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontStyle: "italic",
                fontSize: "clamp(14px,1.4vw,18px)",
                color: "rgba(212,175,55,0.5)",
                lineHeight: 1.7,
                margin: 0,
                maxWidth: 620,
              }}
            >
              Configure base fare logic, surge thresholds, and live trip pricing from one premium command panel.
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
              <ST sub="Engine Status" main="Pricing Controls Live" />
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.34)",
                }}
              >
                Dynamic fare rules are active and preview-ready for distance, time, and surge calculations.
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span className="bup">
                <ArrowUpRight size={10} />
                Dynamic Pricing
              </span>
              <span className="bup">
                <ArrowUpRight size={10} />
                Surge Enabled
              </span>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="statGrid fup" style={{ animationDelay: "80ms" }}>
          <StatCard
            icon={IndianRupee}
            label="Base Fare"
            value={`₹${baseFare}`}
            color="#D4AF37"
          />
          <StatCard
            icon={Activity}
            label="Price / Kilometer"
            value={`₹${pricePerKm}`}
            color="#60A5FA"
          />
          <StatCard
            icon={Clock3}
            label="Price / Minute"
            value={`₹${pricePerMinute}`}
            color="#34D399"
          />
          <StatCard
            icon={Gauge}
            label="Surge Cap"
            value={`${surgeCap.toFixed(1)}x`}
            color="#A78BFA"
          />
        </div>

        {/* MAIN */}
        <div className="mainGrid fup" style={{ animationDelay: "180ms" }}>
          {/* LEFT */}
          <div className="configStack">
            <div className="dbc" style={{ padding: "20px 22px" }}>
              <div style={{ marginBottom: 16 }}>
                <ST sub="Fare Structure" main="Base Fare Configuration" />
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                <SliderField
                  icon={IndianRupee}
                  label="Base Fare"
                  value={baseFare}
                  min={20}
                  max={100}
                  step={1}
                  onChange={setBaseFare}
                  prefix="₹"
                  color="#D4AF37"
                />

                <SliderField
                  icon={Activity}
                  label="Price per Kilometer"
                  value={pricePerKm}
                  min={8}
                  max={25}
                  step={1}
                  onChange={setPricePerKm}
                  prefix="₹"
                  color="#60A5FA"
                />

                <SliderField
                  icon={Clock3}
                  label="Price per Minute"
                  value={pricePerMinute}
                  min={1}
                  max={5}
                  step={1}
                  onChange={setPricePerMinute}
                  prefix="₹"
                  color="#34D399"
                />

                <SliderField
                  icon={Wallet}
                  label="Convenience Fee"
                  value={convenienceFee}
                  min={0}
                  max={50}
                  step={1}
                  onChange={setConvenienceFee}
                  prefix="₹"
                  color="#F59E0B"
                />
              </div>
            </div>

            <div className="dbc" style={{ padding: "20px 22px" }}>
              <div style={{ marginBottom: 16 }}>
                <ST sub="Dynamic Logic" main="Surge Pricing Rules" />
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                <SliderField
                  icon={Gauge}
                  label="Surge Multiplier Cap"
                  value={surgeCap}
                  min={1.0}
                  max={5.0}
                  step={0.1}
                  onChange={(val) => {
                    setSurgeCap(val);
                    if (surgeMultiplier > val) setSurgeMultiplier(val);
                  }}
                  prefix=""
                  suffix="x"
                  color="#A78BFA"
                />

                <SliderField
                  icon={MoonStar}
                  label="Night Surge (11 PM - 6 AM)"
                  value={nightSurge}
                  min={1.0}
                  max={3.0}
                  step={0.1}
                  onChange={setNightSurge}
                  prefix=""
                  suffix="x"
                  color="#60A5FA"
                />

                <SliderField
                  icon={Clock3}
                  label="Peak Hour Surge (6 PM - 10 PM)"
                  value={peakHourSurge}
                  min={1.0}
                  max={3.0}
                  step={0.1}
                  onChange={setPeakHourSurge}
                  prefix=""
                  suffix="x"
                  color="#D4AF37"
                />
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="dbc" style={{ padding: "20px 22px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
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
                  }}
                >
                  <IndianRupee size={15} color="#D4AF37" />
                </div>
                <ST sub="Live Simulation" main="Fare Preview" />
              </div>

              <span className="bup">
                <ArrowUpRight size={10} />
                Live Estimate
              </span>
            </div>

            <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: 11.5,
                    color: "rgba(255,255,255,0.44)",
                  }}
                >
                  Distance (km)
                </label>
                <input
                  type="number"
                  value={distance}
                  onChange={(e) => setDistance(Math.max(0, Number(e.target.value)))}
                  className="inputDark"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: 11.5,
                    color: "rgba(255,255,255,0.44)",
                  }}
                >
                  Time (minutes)
                </label>
                <input
                  type="number"
                  value={time}
                  onChange={(e) => setTime(Math.max(0, Number(e.target.value)))}
                  className="inputDark"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: 11.5,
                    color: "rgba(255,255,255,0.44)",
                  }}
                >
                  Surge Multiplier
                </label>
                <input
                  type="number"
                  min="1"
                  max={surgeCap}
                  step="0.1"
                  value={surgeMultiplier}
                  onChange={(e) => {
                    const nextValue = Number(e.target.value);
                    if (Number.isNaN(nextValue)) return;
                    if (nextValue < 1) {
                      setSurgeMultiplier(1);
                    } else if (nextValue > surgeCap) {
                      setSurgeMultiplier(surgeCap);
                    } else {
                      setSurgeMultiplier(nextValue);
                    }
                  }}
                  className="inputDark"
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 14,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(212,175,55,0.1)",
                  padding: "14px 14px",
                }}
              >
                <div style={{ marginBottom: 10 }}>
                  <ST sub="Fare Mix" main="Component Breakdown" />
                </div>

                <div style={{ width: "100%", height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={farePreviewChart} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fareAreaFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        name="Amount"
                        stroke="#D4AF37"
                        strokeWidth={2.4}
                        fill="url(#fareAreaFill)"
                        dot={{ r: 3, fill: "#D4AF37", strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "#D4AF37" }}
                        isAnimationActive
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(212,175,55,0.1)",
                    padding: "14px 14px",
                  }}
                >
                  <div style={{ marginBottom: 10 }}>
                    <ST sub="Surge View" main="Multiplier Position" />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ width: 120, height: 120, position: "relative", flexShrink: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                          innerRadius="68%"
                          outerRadius="100%"
                          data={surgeGauge}
                          startAngle={210}
                          endAngle={-30}
                          barSize={12}
                        >
                          <RadialBar
                            background={{ fill: "rgba(255,255,255,0.08)" }}
                            dataKey="value"
                            cornerRadius={12}
                            fill="#A78BFA"
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
                            color: "#A78BFA",
                            lineHeight: 1,
                          }}
                        >
                          {surgeMultiplier.toFixed(1)}x
                        </p>
                        <p
                          style={{
                            margin: "5px 0 0",
                            fontSize: 10,
                            color: "rgba(255,255,255,0.34)",
                          }}
                        >
                          Active Surge
                        </p>
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 140 }}>
                      <PreviewRow label="Night Surge" value={`${nightSurge.toFixed(1)}x`} />
                      <div style={{ height: 8 }} />
                      <PreviewRow label="Peak Hour Surge" value={`${peakHourSurge.toFixed(1)}x`} />
                      <div style={{ height: 8 }} />
                      <PreviewRow label="Cap Limit" value={`${surgeCap.toFixed(1)}x`} strong />
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 16,
                    background: "rgba(212,175,55,0.07)",
                    border: "1px solid rgba(212,175,55,0.17)",
                    padding: "16px 16px",
                  }}
                >
                  <div style={{ display: "grid", gap: 10 }}>
                    <PreviewRow label="Base Fare" value={`₹${baseFare.toFixed(2)}`} />
                    <PreviewRow
                      label={`Distance (${distance} km)`}
                      value={`₹${fareBreakdown.distanceFare.toFixed(2)}`}
                    />
                    <PreviewRow
                      label={`Time (${time} min)`}
                      value={`₹${fareBreakdown.timeFare.toFixed(2)}`}
                    />
                    <PreviewRow
                      label="Convenience Fee"
                      value={`₹${convenienceFee.toFixed(2)}`}
                    />

                    <div
                      style={{
                        height: 1,
                        background: "linear-gradient(90deg,transparent,rgba(212,175,55,0.2),transparent)",
                        margin: "2px 0",
                      }}
                    />

                    <PreviewRow
                      label={`Subtotal × ${surgeMultiplier.toFixed(1)}x`}
                      value={`₹${fareBreakdown.subtotal.toFixed(2)}`}
                      strong
                    />

                    <PreviewRow
                      label="Total Fare"
                      value={`₹${fareBreakdown.totalFare.toFixed(2)}`}
                      strong
                      gold
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => api.getPricingSettings && api.updateVehiclePricing('default', { base_fare: baseFare, price_per_km: pricePerKm, price_per_minute: pricePerMinute, convenience_fee: convenienceFee, surge_cap: surgeCap, night_surge: nightSurge, peak_surge: peakHourSurge }).catch(() => {})}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(212,175,55,0.24)",
                background: "linear-gradient(135deg,rgba(212,175,55,0.18),rgba(212,175,55,0.08))",
                color: "#D4AF37",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Outfit',sans-serif",
                cursor: "pointer",
              }}
            >
              <Save size={16} strokeWidth={2.2} />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}