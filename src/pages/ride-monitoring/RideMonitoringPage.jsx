import { useState, useEffect } from "react";
import {
  CarFront,
  CircleDot,
  Clock3,
  MapPin,
  Navigation,
  User,
  ArrowUpRight,
  Activity,
  Route,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { api } from "../../services/api.js";

const mapPins = [
  { id: 1, x: "9%", y: "18%", type: "driver" },
  { id: 2, x: "24%", y: "31%", type: "car" },
  { id: 3, x: "84%", y: "43%", type: "pickup" },
  { id: 4, x: "16%", y: "83%", type: "pickup" },
  { id: 5, x: "87%", y: "74%", type: "driver" },
];

function normalizeRide(r) {
  const pickup = r.pickup_location?.address || r.pickup_address || r.pickup || '';
  const dropoff = r.dropoff_location?.address || r.dropoff_address || r.dropoff || '';

  let status = r.status || 'requested';
  if (status === 'ongoing') status = 'in progress';
  if (status === 'driver_assigned') status = 'picking up';

  return {
    rideId: r.ride_number || r.id || String(r.id) || '',
    driver: r.driver?.full_name || r.driver_name || r.driver || '—',
    rider: r.user?.full_name || r.passenger_name || r.rider || '—',
    route: pickup && dropoff ? `${pickup} → ${dropoff}` : pickup || dropoff || '—',
    eta: r.eta_minutes ? `${r.eta_minutes} min` : '—',
    duration: r.duration_minutes ? `${r.duration_minutes} min` : '—',
    fare: r.final_fare ? `₹${r.final_fare}` : r.estimated_fare ? `₹${r.estimated_fare}` : '—',
    status: status,
    pickup,
    dropoff,
    vehicleType: r.vehicle_type || r.vehicleType || '—',
  };
}

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
      margin-bottom:18px;
    }

    @media(min-width:1200px){
      .mainGrid{
        grid-template-columns:minmax(0,1.45fr) minmax(340px,.9fr);
      }
    }

    .detailsGrid{
      display:grid;
      grid-template-columns:repeat(1,minmax(0,1fr));
      gap:14px;
    }

    @media(min-width:700px){
      .detailsGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
    }

    @media(min-width:1200px){
      .detailsGrid{grid-template-columns:repeat(4,minmax(0,1fr))}
    }

    .rideRow{
      border-bottom:1px solid rgba(212,175,55,0.08);
      transition:background .2s ease,transform .2s ease;
    }

    .rideRow:hover{
      background:rgba(255,255,255,0.03);
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

function getStatusPill(status = '') {
  const statusStr = String(status).toLowerCase().trim();

  if (statusStr === 'in progress' || statusStr === 'ongoing') {
    return {
      bg: "rgba(96,165,250,0.14)",
      border: "rgba(96,165,250,0.22)",
      color: "#60A5FA",
    };
  }
  if (statusStr === 'picking up') {
    return {
      bg: "rgba(245,158,11,0.14)",
      border: "rgba(245,158,11,0.22)",
      color: "#F59E0B",
    };
  }
  if (statusStr === 'completed') {
    return {
      bg: "rgba(52,211,153,0.14)",
      border: "rgba(52,211,153,0.22)",
      color: "#34D399",
    };
  }
  if (statusStr === 'cancelled') {
    return {
      bg: "rgba(248,113,113,0.14)",
      border: "rgba(248,113,113,0.22)",
      color: "#F87171",
    };
  }
  if (statusStr === 'accepted') {
    return {
      bg: "rgba(168,85,247,0.14)",
      border: "rgba(168,85,247,0.22)",
      color: "#A855F7",
    };
  }
  if (statusStr === 'requested') {
    return {
      bg: "rgba(59,130,246,0.14)",
      border: "rgba(59,130,246,0.22)",
      color: "#3B82F6",
    };
  }
  return {
    bg: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.7)",
  };
}

function DetailCard({ label, value, accent = "#D4AF37" }) {
  return (
    <div
      style={{
        borderRadius: 16,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(212,175,55,0.1)",
        padding: "14px 14px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 10.5,
          color: "rgba(255,255,255,0.34)",
          fontFamily: "'Outfit',sans-serif",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "7px 0 0",
          fontFamily: "'Cinzel',serif",
          fontSize: 16,
          fontWeight: 700,
          color: accent,
          lineHeight: 1.35,
        }}
      >
        {value}
      </p>
    </div>
  );
}

/* ══════════════════════════════════
   CHART DATA
══════════════════════════════════ */
const routeChartData = [
  { time: '00:00', distance: 0 },
  { time: '04:00', distance: 12 },
  { time: '08:00', distance: 28 },
  { time: '12:00', distance: 35 },
  { time: '16:00', distance: 42 },
  { time: '20:00', distance: 38 },
  { time: '24:00', distance: 45 },
];

const statusChartData = [
  { stage: 'Requested', total: 18, completed: 10, cancelled: 2 },
  { stage: 'Assigned', total: 15, completed: 12, cancelled: 1 },
  { stage: 'Arrived', total: 12, completed: 11, cancelled: 0 },
  { stage: 'Started', total: 8, completed: 7, cancelled: 0 },
];

/* ══════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════ */
export default function RideMonitoringPage() {
  const [liveRides, setLiveRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ongoing');

  useEffect(() => {
    setLoading(true);
    api.getRides({ status: statusFilter, limit: 20 })
      .then(res => {
        const raw = res?.data?.rides || res?.rides || [];
        const normalized = Array.isArray(raw) ? raw.map(normalizeRide) : [];
        setLiveRides(normalized);
        if (normalized.length > 0) setSelectedRide(normalized[0]);
      })
      .catch(err => console.error('Failed to load rides:', err))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const activeRideCount = liveRides.length;
  const onlineDrivers = 0;
  const selectedStatusStyle = getStatusPill(selectedRide?.status || 'in progress');

  if (loading) {
    return (
      <>
        <GS />
        <div style={{ padding: 60, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit,sans-serif' }}>
          Loading live rides...
        </div>
      </>
    );
  }

  if (liveRides.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#010917 0%,#020D26 25%,#04122E 55%,#030C22 80%,#010917 100%)', padding: '20px' }}>
        <GS />
        <div style={{ maxWidth: '100%', minWidth: 0, fontFamily: "'Outfit',sans-serif" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontFamily: "'Cinzel',serif", fontSize: 8.5, letterSpacing: 2.5, color: 'rgba(212,175,55,0.4)', textTransform: 'uppercase', margin: '0 0 4px' }}>Status Filter</p>
                <h2 style={{ fontFamily: "'Cinzel',serif", fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Ride Status</h2>
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(212,175,55,0.1)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  borderRadius: '8px',
                  color: '#D4AF37',
                  fontFamily: "'Outfit',sans-serif",
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <option value="requested">Requested</option>
                <option value="accepted">Accepted</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>🚕</div>
              <h2 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, marginBottom: 8, color: 'rgba(255,255,255,0.7)' }}>No Rides Found</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', maxWidth: 400, margin: '0 auto' }}>
                There are currently no {statusFilter} rides. Try selecting a different status to view rides.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#010917 0%,#020D26 25%,#04122E 55%,#030C22 80%,#010917 100%)', padding: '20px' }}>
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
                GO Mobility · Real-Time Operations
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
              <span style={{ color: "#fff" }}>Live Ride </span>
              <span className="shim">Monitoring</span>
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
              Real-time visibility into active trips, driver movement, ETA flow, and ride progress across the platform.
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
              <ST sub="Monitoring Status" main="Fleet View Active" />
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.34)",
                }}
              >
                Active routes, pickup points, and ride state transitions are being tracked in the command layer.
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span className="bup">
                <ArrowUpRight size={10} />
                Live Routes
              </span>
              <span className="bup">
                <ArrowUpRight size={10} />
                ETA Visible
              </span>
            </div>
          </div>
        </div>

        {/* STATUS FILTER */}
        <div className="fup" style={{ animationDelay: "40ms", marginBottom: 18 }}>
          <div className="dbc" style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: "rgba(212,175,55,0.5)", fontFamily: "'Outfit',sans-serif", textTransform: "uppercase", letterSpacing: "0.8px" }}>Filter by Status</span>
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.24)',
                borderRadius: '8px',
                color: '#D4AF37',
                fontFamily: "'Outfit',sans-serif",
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <option value="requested">Requested</option>
              <option value="accepted">Accepted</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* STATS */}
        <div className="statGrid fup" style={{ animationDelay: "80ms" }}>
          <StatCard
            icon={CarFront}
            label="Active Rides"
            value={activeRideCount}
            color="#D4AF37"
          />
          <StatCard
            icon={Activity}
            label="Drivers Online"
            value={onlineDrivers.toLocaleString("en-IN")}
            color="#34D399"
          />
          <StatCard
            icon={TimerReset}
            label="Avg ETA"
            value="8 min"
            color="#60A5FA"
          />
          <StatCard
            icon={ShieldCheck}
            label="Trips Stable"
            value="96.4%"
            color="#A78BFA"
          />
        </div>

        {/* MAIN */}
        <section className="mainGrid fup" style={{ animationDelay: "180ms" }}>
          {/* MAP */}
          <div className="dbc" style={{ padding: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                padding: "18px 20px",
                borderBottom: "1px solid rgba(212,175,55,0.08)",
              }}
            >
              <ST sub="Spatial Intelligence" main="Live Map" />

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <span className="bup">{activeRideCount} Active Rides</span>
                <span className="bup">{onlineDrivers.toLocaleString("en-IN")} Drivers Online</span>
              </div>
            </div>

            <div
              style={{
                position: "relative",
                height: 440,
                overflow: "hidden",
                background:
                  "radial-gradient(circle at center, rgba(212,175,55,0.05), transparent 58%), linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "linear-gradient(rgba(212,175,55,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.03) 1px, transparent 1px)",
                  backgroundSize: "42px 42px",
                }}
              />

              {mapPins.map((pin) => (
                <div
                  key={pin.id}
                  style={{
                    position: "absolute",
                    left: pin.x,
                    top: pin.y,
                    transform: "translate(-50%, -50%)",
                    zIndex: 2,
                  }}
                >
                  {pin.type === "driver" && (
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.9)",
                        background: "#34D399",
                        color: "#081327",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 8px 18px rgba(52,211,153,0.28)",
                      }}
                    >
                      <CarFront size={15} strokeWidth={2.3} />
                    </div>
                  )}

                  {pin.type === "car" && (
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.9)",
                        background: "#60A5FA",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 8px 18px rgba(96,165,250,0.28)",
                      }}
                    >
                      <Navigation size={15} strokeWidth={2.3} />
                    </div>
                  )}

                  {pin.type === "pickup" && (
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: "3px solid rgba(255,255,255,0.95)",
                        background: "#F87171",
                        boxShadow: "0 8px 18px rgba(248,113,113,0.28)",
                      }}
                    />
                  )}
                </div>
              ))}

              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  zIndex: 1,
                  opacity: 0.8,
                }}
              >
                <path
                  d="M 24 31 C 32 28, 42 25, 52 32 S 72 46, 84 43"
                  fill="none"
                  stroke="rgba(212,175,55,0.45)"
                  strokeWidth="0.6"
                  strokeDasharray="2 1.6"
                />
                <path
                  d="M 9 18 C 18 26, 20 38, 16 83"
                  fill="none"
                  stroke="rgba(96,165,250,0.28)"
                  strokeWidth="0.5"
                  strokeDasharray="2 1.5"
                />
              </svg>

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "0 24px",
                  zIndex: 0,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(212,175,55,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(212,175,55,0.6)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <MapPin size={30} strokeWidth={1.8} />
                </div>

                <h3
                  style={{
                    margin: "14px 0 0",
                    fontFamily: "'Cinzel',serif",
                    fontSize: 16,
                    color: "#fff",
                  }}
                >
                  Interactive Map View
                </h3>

                <p
                  style={{
                    margin: "8px 0 0",
                    maxWidth: 400,
                    fontSize: 12,
                    lineHeight: 1.7,
                    color: "rgba(255,255,255,0.34)",
                  }}
                >
                  Showing driver locations, pickup points, route flow, and the currently selected trip in motion.
                </p>
              </div>
            </div>
          </div>

          {/* ACTIVE RIDES */}
          <div className="dbc" style={{ padding: 0 }}>
            <div
              style={{
                padding: "18px 20px",
                borderBottom: "1px solid rgba(212,175,55,0.08)",
              }}
            >
              <ST sub="Fleet Feed" main="Active Rides" />
            </div>

            <div style={{ maxHeight: 500, overflowY: "auto" }}>
              {liveRides.length === 0 ? (
                <div style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.3)",fontFamily:"Outfit,sans-serif"}}><div style={{fontSize:32,marginBottom:10}}>🚕</div>No active rides available</div>
              ) : liveRides.map((ride) => {
                const statusStyle = getStatusPill(ride.status);

                return (
                  <div
                    key={ride.rideId}
                    className="rideRow"
                    style={{
                      padding: "16px 18px",
                      background: ride.active ? "rgba(212,175,55,0.06)" : "transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontFamily: "'Cinzel',serif",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#fff",
                        }}
                      >
                        {ride.rideId}
                      </h3>

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "5px 10px",
                          borderRadius: 999,
                          background: statusStyle.bg,
                          border: `1px solid ${statusStyle.border}`,
                          color: statusStyle.color,
                          fontSize: 10.5,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <CircleDot size={10} />
                        {ride.status}
                      </span>
                    </div>

                    <div style={{ display: "grid", gap: 7 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                        <User size={12} color="rgba(255,255,255,0.35)" />
                        <span>
                          Driver:{" "}
                          <span style={{ color: "#fff", fontWeight: 500 }}>{ride.driver}</span>
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                        <User size={12} color="rgba(255,255,255,0.35)" />
                        <span>
                          Rider:{" "}
                          <span style={{ color: "#fff", fontWeight: 500 }}>{ride.rider}</span>
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.42)", fontSize: 11.5 }}>
                        <MapPin size={12} color="rgba(212,175,55,0.5)" />
                        <span>{ride.route}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", color: "rgba(255,255,255,0.38)", fontSize: 11 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Clock3 size={11} />
                          ETA: {ride.eta}
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Navigation size={11} />
                          {ride.duration}
                        </span>
                      </div>

                      <div
                        style={{
                          fontFamily: "'Cinzel',serif",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#D4AF37",
                        }}
                      >
                        {ride.fare}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* LOWER SECTION */}
        <section className="mainGrid fup" style={{ animationDelay: "260ms" }}>
          <div className="dbc" style={{ padding: "20px 22px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              <ST sub="Selected Trip" main={`Ride Details · ${selectedRide?.rideId || '—'}`} />
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  borderRadius: 999,
                  background: selectedStatusStyle.bg,
                  border: `1px solid ${selectedStatusStyle.border}`,
                  color: selectedStatusStyle.color,
                  fontSize: 10.5,
                  fontWeight: 600,
                }}
              >
                <CircleDot size={10} />
                {selectedRide?.status || '—'}
              </span>
            </div>

            <div className="detailsGrid">
              <DetailCard label="Driver" value={selectedRide?.driver || '—'} accent="#fff" />
              <DetailCard label="Rider" value={selectedRide?.rider || '—'} accent="#fff" />
              <DetailCard label="Vehicle Type" value={selectedRide?.vehicleType || '—'} accent="#60A5FA" />
              <DetailCard label="ETA" value={selectedRide?.eta || '—'} accent="#34D399" />
              <DetailCard label="Pickup Location" value={selectedRide?.pickup || '—'} accent="#D4AF37" />
              <DetailCard label="Drop-off Location" value={selectedRide?.dropoff || '—'} accent="#F59E0B" />
              <DetailCard label="Fare" value={selectedRide?.fare || '—'} accent="#A78BFA" />
              <DetailCard label="Trip State" value={selectedRide?.status || '—'} accent={selectedStatusStyle.color} />
            </div>
          </div>

          <div className="dbc" style={{ padding: "20px 22px" }}>
            <div style={{ marginBottom: 14 }}>
              <ST sub="Trip Analytics" main="Monitoring Signals" />
            </div>

            <div
              style={{
                borderRadius: 16,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(212,175,55,0.1)",
                padding: "14px 14px",
                marginBottom: 14,
              }}
            >
              <div style={{ marginBottom: 10 }}>
                <ST sub="Route Pattern" main="Ride Flow" />
              </div>

              <div style={{ width: "100%", height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={routeChartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rideAreaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="rides"
                      name="Load"
                      stroke="#D4AF37"
                      strokeWidth={2.3}
                      fill="url(#rideAreaFill)"
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
                borderRadius: 16,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(212,175,55,0.1)",
                padding: "14px 14px",
              }}
            >
              <div style={{ marginBottom: 10 }}>
                <ST sub="Ride Status" main="ETA Distribution" />
              </div>

              <div style={{ width: "100%", height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false} />
                    <XAxis
                      dataKey="stage"
                      tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="value"
                      name="ETA"
                      radius={[8, 8, 0, 0]}
                      isAnimationActive
                      animationDuration={1400}
                    >
                      <Cell fill="#60A5FA" />
                      <Cell fill="#34D399" />
                      <Cell fill="#D4AF37" />
                      <Cell fill="#A78BFA" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}