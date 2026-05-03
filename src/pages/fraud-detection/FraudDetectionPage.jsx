import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  UserX,
  ArrowUpRight,
  CircleDot,
  Activity,
  Radar,
} from "lucide-react";
import { api } from "../../services/api.js";

function normalizeAlert(a) {
  return {
    id: a.alert_number || a.id || '',
    type: a.alert_type || a.type || 'Unknown',
    rideId: a.ride_id || a.rideId || '—',
    driver: a.driver?.full_name || a.driver_name || '—',
    riskScore: a.risk_score ?? a.riskScore ?? 0,
    status: a.status || 'flagged',
    details: a.description || a.details || '',
  };
}

function getStatusStyle(status) {
  switch (status) {
    case "flagged":
      return {
        bg: "rgba(248,113,113,0.14)",
        border: "rgba(248,113,113,0.22)",
        color: "#F87171",
      };
    case "investigating":
      return {
        bg: "rgba(245,158,11,0.14)",
        border: "rgba(245,158,11,0.22)",
        color: "#F59E0B",
      };
    case "reviewing":
      return {
        bg: "rgba(96,165,250,0.14)",
        border: "rgba(96,165,250,0.22)",
        color: "#60A5FA",
      };
    default:
      return {
        bg: "rgba(255,255,255,0.1)",
        border: "rgba(255,255,255,0.14)",
        color: "#fff",
      };
  }
}

function getRiskStyle(score) {
  if (score >= 85) {
    return {
      bg: "rgba(248,113,113,0.14)",
      border: "rgba(248,113,113,0.22)",
      color: "#F87171",
    };
  }
  if (score >= 70) {
    return {
      bg: "rgba(245,158,11,0.14)",
      border: "rgba(245,158,11,0.22)",
      color: "#F59E0B",
    };
  }
  return {
    bg: "rgba(96,165,250,0.14)",
    border: "rgba(96,165,250,0.22)",
    color: "#60A5FA",
  };
}


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

    .tableHead{
      display:none;
    }

    .desktopRows{
      display:none;
    }

    .mobileCards{
      display:grid;
      grid-template-columns:1fr;
      gap:12px;
      padding:14px;
    }

    @media(min-width:1024px){
      .tableHead{display:grid}
      .desktopRows{display:block}
      .mobileCards{display:none}
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

function SummaryCard({ card }) {
  const Icon = card.icon;

  return (
    <div className="dbm fup" style={{ padding: "18px 18px 14px" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: `${card.color}18`,
          border: `1px solid ${card.color}28`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Icon size={16} color={card.color} strokeWidth={2.2} />
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: "rgba(255,255,255,0.38)",
          fontFamily: "'Outfit',sans-serif",
        }}
      >
        {card.title}
      </p>

      <h3
        style={{
          margin: "6px 0 4px",
          fontFamily: "'Cinzel',serif",
          fontSize: "clamp(22px,2vw,30px)",
          fontWeight: 800,
          color: "#fff",
          letterSpacing: "-0.04em",
        }}
      >
        {card.value}
      </h3>

      <p
        style={{
          margin: 0,
          fontSize: 11.5,
          fontWeight: 500,
          color: card.color,
          fontFamily: "'Outfit',sans-serif",
        }}
      >
        {card.note}
      </p>
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

export default function FraudDetectionPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFraudAlerts()
      .then(res => {
        const raw = res?.data?.alerts || res?.alerts || res?.data || [];
        setAlerts(Array.isArray(raw) ? raw.map(normalizeAlert) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const flaggedCount = alerts.filter(a => a.status === 'flagged').length;
  const investigatingCount = alerts.filter(a => a.status === 'investigating').length;
  const reviewingCount = alerts.filter(a => a.status === 'reviewing').length;
  const highRiskCount = alerts.filter(a => a.riskScore >= 85).length;

  const summaryCards = [
    { id: 1, title: "Flagged Alerts", value: loading ? "—" : String(flaggedCount), note: "Pending review", color: "#F87171", icon: AlertTriangle },
    { id: 2, title: "Investigating", value: loading ? "—" : String(investigatingCount), note: "Active cases", color: "#F59E0B", icon: ShieldCheck },
    { id: 3, title: "Reviewing", value: loading ? "—" : String(reviewingCount), note: "Under assessment", color: "#60A5FA", icon: UserX },
    { id: 4, title: "High Risk (85+)", value: loading ? "—" : String(highRiskCount), note: "Critical risk score", color: "#F87171", icon: TrendingUp },
  ];

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
                GO Mobility · Risk Intelligence
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
              <span style={{ color: "#fff" }}>Fraud Detection </span>
              <span className="shim">Dashboard</span>
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
              Monitor and investigate suspicious activity on the platform with real-time fraud insights and risk tracking.
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
              <SectionTitle sub="Security Status" main="Detection Engine Active" />
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.34)",
                }}
              >
                Alerts, investigations, and suspicious ride patterns are being monitored continuously across the network.
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span className="bup">
                <ArrowUpRight size={10} />
                Risk Live
              </span>
              <span className="bup">
                <ArrowUpRight size={10} />
                Alert Feed Active
              </span>
            </div>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <section className="statGrid fup" style={{ animationDelay: "80ms" }}>
          {summaryCards.map((card) => (
            <SummaryCard key={card.id} card={card} />
          ))}
        </section>

        {/* WEEKLY FRAUD INCIDENTS */}
        <section className="dbc fup" style={{ padding: "20px 22px", marginBottom: 20, animationDelay: "160ms" }}>
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
            <SectionTitle sub="Threat Overview" main="Weekly Fraud Incidents" />
            <span className="bup">
              <Activity size={10} />
              7-Day Trend
            </span>
          </div>

          <div
            style={{
              borderRadius: 16,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(212,175,55,0.1)",
              padding: "40px 14px",
              textAlign: "center",
              color: "rgba(255,255,255,0.3)",
              fontFamily: "'Outfit',sans-serif",
              fontSize: 13,
            }}
          >
            Weekly time-series data not available via API
          </div>
        </section>

        {/* RECENT FRAUD ALERTS */}
        <section className="dbc fup" style={{ padding: 0, animationDelay: "240ms" }}>
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid rgba(212,175,55,0.08)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <SectionTitle sub="Investigation Feed" main="Recent Fraud Alerts" />
            <span className="bup">
              <Radar size={10} />
              Live Queue
            </span>
          </div>

          {/* Desktop Table */}
          <div
            className="tableHead"
            style={{
              gridTemplateColumns: "0.9fr 1.8fr 0.8fr 1.5fr 1fr 1.3fr 2.9fr",
              padding: "12px 20px",
              borderBottom: "1px solid rgba(212,175,55,0.08)",
              background: "rgba(255,255,255,0.02)",
              fontSize: 10.5,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: ".05em",
              color: "rgba(255,255,255,0.34)",
            }}
          >
            <div>Alert ID</div>
            <div>Type</div>
            <div>Ride ID</div>
            <div>Driver</div>
            <div>Risk Score</div>
            <div>Status</div>
            <div>Details</div>
          </div>

          <div className="desktopRows">
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'Outfit',sans-serif" }}>Loading alerts...</div>
            ) : alerts.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'Outfit',sans-serif" }}>No fraud alerts found</div>
            ) : null}
            {alerts.map((item) => {
              const riskStyle = getRiskStyle(item.riskScore);
              const statusStyle = getStatusStyle(item.status);

              return (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "0.9fr 1.8fr 0.8fr 1.5fr 1fr 1.3fr 2.9fr",
                    alignItems: "center",
                    padding: "16px 20px",
                    borderBottom: "1px solid rgba(212,175,55,0.08)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: "#fff",
                      fontFamily: "'Cinzel',serif",
                    }}
                  >
                    {item.id}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12.5,
                      color: "rgba(255,255,255,0.62)",
                    }}
                  >
                    <AlertTriangle size={12} color="#F87171" />
                    <span>{item.type}</span>
                  </div>

                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.42)" }}>
                    {item.rideId}
                  </div>

                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.42)" }}>
                    {item.driver}
                  </div>

                  <div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 10px",
                        borderRadius: 999,
                        background: riskStyle.bg,
                        border: `1px solid ${riskStyle.border}`,
                        color: riskStyle.color,
                        fontSize: 10.5,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.riskScore}
                    </span>
                  </div>

                  <div>
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
                      {item.status}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 12.5,
                      color: "rgba(255,255,255,0.38)",
                      lineHeight: 1.5,
                    }}
                  >
                    {item.details}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Cards */}
          <div className="mobileCards">
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'Outfit',sans-serif" }}>Loading alerts...</div>
            ) : alerts.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'Outfit',sans-serif" }}>No fraud alerts found</div>
            ) : null}
            {alerts.map((item) => {
              const riskStyle = getRiskStyle(item.riskScore);
              const statusStyle = getStatusStyle(item.status);

              return (
                <div
                  key={item.id}
                  className="dbm"
                  style={{ padding: "14px 14px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontFamily: "'Cinzel',serif",
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#fff",
                        }}
                      >
                        {item.id}
                      </h3>

                      <div
                        style={{
                          marginTop: 6,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 12.5,
                          color: "rgba(255,255,255,0.62)",
                        }}
                      >
                        <AlertTriangle size={12} color="#F87171" />
                        <span>{item.type}</span>
                      </div>
                    </div>

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
                      {item.status}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
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
                          color: "rgba(255,255,255,0.34)",
                        }}
                      >
                        Ride ID
                      </p>
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontSize: 13.5,
                          color: "#fff",
                        }}
                      >
                        {item.rideId}
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
                          color: "rgba(255,255,255,0.34)",
                        }}
                      >
                        Driver
                      </p>
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontSize: 13.5,
                          color: "#fff",
                        }}
                      >
                        {item.driver}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 10px",
                        borderRadius: 999,
                        background: riskStyle.bg,
                        border: `1px solid ${riskStyle.border}`,
                        color: riskStyle.color,
                        fontSize: 10.5,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Risk {item.riskScore}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: "12px 0 0",
                      fontSize: 12,
                      lineHeight: 1.65,
                      color: "rgba(255,255,255,0.38)",
                    }}
                  >
                    {item.details}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* EXTRA ANALYTICS BLOCK WITH ORIGINAL CONTENT KE ACCORD */}
        <section className="fup" style={{ marginTop: 20, animationDelay: "320ms" }}>
          <div className="dbc" style={{ padding: "20px 22px" }}>
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
              <SectionTitle sub="Risk Distribution" main="Incident Volume Snapshot" />
              <span className="bup">
                <TrendingUp size={10} />
                Fraud Mix
              </span>
            </div>

            <div
              style={{
                borderRadius: 16,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(212,175,55,0.1)",
                padding: "40px 14px",
                textAlign: "center",
                color: "rgba(255,255,255,0.3)",
                fontFamily: "'Outfit',sans-serif",
                fontSize: 13,
              }}
            >
              Incident volume time-series not available via API
            </div>
          </div>
        </section>
      </div>
    </>
  );
}