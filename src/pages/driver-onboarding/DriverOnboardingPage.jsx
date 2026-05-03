import { useState, useEffect } from "react";
import {
  Check,
  Eye,
  FileText,
  CreditCard,
  X,
  ArrowUpRight,
  ShieldCheck,
  FileBadge2,
  UserCheck,
  Clock3,
  CircleDot,
  Phone,
  CarFront,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  Tooltip,
  Cell,
} from "recharts";
import { api } from "../../services/api.js";

function normalizeApplication(d) {
  const statusMap = {
    'manual_review': 'pending approval',
    'approved': 'ready to approve',
    'rejected': 'rejected',
  };
  return {
    id: d.id || d.user_id || '',
    name: d.full_name || 'Unknown',
    phone: d.phone_number || '—',
    vehicleType: d.document_type || '—',
    status: statusMap[d.status] || 'documents pending',
    rowHighlight: false,
    actions: ['approve', 'reject', 'view'],
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
    }

    @media(min-width:1200px){
      .mainGrid{
        grid-template-columns:minmax(0,1.45fr) minmax(340px,.9fr);
      }
    }

    .desktopTable{
      display:none;
    }

    @media(min-width:1024px){
      .desktopTable{display:block}
      .mobileCards{display:none}
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

function getStatusStyle(status) {
  switch (status) {
    case "pending approval":
      return {
        bg: "rgba(212,175,55,0.14)",
        border: "rgba(212,175,55,0.22)",
        color: "#D4AF37",
      };
    case "ready to approve":
      return {
        bg: "rgba(96,165,250,0.14)",
        border: "rgba(96,165,250,0.22)",
        color: "#60A5FA",
      };
    case "documents pending":
      return {
        bg: "rgba(245,158,11,0.14)",
        border: "rgba(245,158,11,0.22)",
        color: "#F59E0B",
      };
    case "verified":
      return {
        bg: "rgba(52,211,153,0.14)",
        border: "rgba(52,211,153,0.22)",
        color: "#34D399",
      };
    case "pending":
      return {
        bg: "rgba(245,158,11,0.14)",
        border: "rgba(245,158,11,0.22)",
        color: "#F59E0B",
      };
    default:
      return {
        bg: "rgba(255,255,255,0.1)",
        border: "rgba(255,255,255,0.14)",
        color: "#fff",
      };
  }
}

function ActionButtons({ actions, onApprove, onReject }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14 }}>
      {actions.includes("approve") && (
        <button
          type="button"
          aria-label="Approve application"
          onClick={onApprove}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: "1px solid rgba(52,211,153,0.18)",
            background: "rgba(52,211,153,0.08)",
            color: "#34D399",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Check size={17} strokeWidth={2.3} />
        </button>
      )}

      {actions.includes("reject") && (
        <button
          type="button"
          aria-label="Reject application"
          onClick={onReject}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: "1px solid rgba(248,113,113,0.18)",
            background: "rgba(248,113,113,0.08)",
            color: "#F87171",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={17} strokeWidth={2.3} />
        </button>
      )}

      {actions.includes("view") && (
        <button
          type="button"
          aria-label="View application"
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: "1px solid rgba(96,165,250,0.18)",
            background: "rgba(96,165,250,0.08)",
            color: "#60A5FA",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Eye size={17} strokeWidth={2.3} />
        </button>
      )}
    </div>
  );
}

function DocumentCard({ item }) {
  const Icon = item.type === "bank" ? CreditCard : FileText;
  const statusStyle = getStatusStyle(item.status);

  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(212,175,55,0.1)",
        background: "rgba(255,255,255,0.03)",
        padding: "14px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              background: "rgba(212,175,55,0.12)",
              border: "1px solid rgba(212,175,55,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={14} strokeWidth={2} color="#D4AF37" />
          </div>

          <h4
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              fontFamily: "'Outfit',sans-serif",
            }}
          >
            {item.title}
          </h4>
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

      {item.large && (
        <div
          style={{
            marginTop: 12,
            height: 88,
            borderRadius: 12,
            background: "rgba(255,255,255,0.04)",
            border: "1px dashed rgba(212,175,55,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.34)",
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          {item.preview}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════ */
export default function DriverOnboardingPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getKycQueue()
      .then(res => {
        const raw = res?.data?.items || res?.items || res?.data || [];
        setApplications(Array.isArray(raw) ? raw.map(normalizeApplication) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const approve = (id) => {
    api.approveDocument(id, 'kyc').catch(() => {});
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'ready to approve' } : a));
  };
  const reject = (id) => {
    api.rejectDocument(id, 'kyc', 'Rejected by admin').catch(() => {});
    setApplications(prev => prev.filter(a => a.id !== id));
  };

  const pendingCount = applications.length;
  const readyCount = applications.filter((a) => a.status === "ready to approve").length;
  const docsPendingCount = applications.filter((a) => a.status === "documents pending").length;
  const verifiedDocs = 0;

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
                GO Mobility · Driver Operations
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
              <span style={{ color: "#fff" }}>Driver Onboarding </span>
              <span className="shim">Management</span>
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
              Review applications, verify documents, and approve new drivers through a premium onboarding command desk.
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
              <ST sub="Review Status" main="Verification Queue Active" />
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.34)",
                }}
              >
                Applications and document checks are visible in one place with approval readiness tracking.
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span className="bup">
                <ArrowUpRight size={10} />
                Review Live
              </span>
              <span className="bup">
                <ArrowUpRight size={10} />
                Verification Active
              </span>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="statGrid fup" style={{ animationDelay: "80ms" }}>
          <StatCard icon={UserCheck} label="Pending Applications" value={loading ? "—" : pendingCount} color="#D4AF37" />
          <StatCard icon={ShieldCheck} label="Ready To Approve" value={loading ? "—" : readyCount} color="#60A5FA" />
          <StatCard icon={Clock3} label="Documents Pending" value={loading ? "—" : docsPendingCount} color="#F59E0B" />
          <StatCard icon={FileBadge2} label="Verified Docs" value="—" color="#34D399" />
        </div>

        {/* MAIN */}
        <section className="mainGrid fup" style={{ animationDelay: "180ms" }}>
          {/* LEFT */}
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
              <ST sub="Application Queue" main="Pending Applications" />
              <span className="bup">{pendingCount} In Review</span>
            </div>

            {/* Desktop Table */}
            <div className="desktopTable">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1.55fr 1.15fr 1.45fr .9fr",
                  padding: "12px 20px",
                  borderBottom: "1px solid rgba(212,175,55,0.08)",
                  background: "rgba(255,255,255,0.02)",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                  color: "rgba(255,255,255,0.34)",
                }}
              >
                <div>Driver Name</div>
                <div>Phone</div>
                <div>Vehicle</div>
                <div>Status</div>
                <div style={{ textAlign: "right" }}>Actions</div>
              </div>

              {loading ? (
                <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'Outfit',sans-serif" }}>Loading applications...</div>
              ) : applications.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'Outfit',sans-serif" }}>No pending applications</div>
              ) : null}
              {applications.map((item) => {
                const statusStyle = getStatusStyle(item.status);

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1.55fr 1.15fr 1.45fr .9fr",
                      alignItems: "center",
                      padding: "16px 20px",
                      borderBottom: "1px solid rgba(212,175,55,0.08)",
                      background: "transparent",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <h3
                        style={{
                          margin: 0,
                          fontFamily: "'Cinzel',serif",
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#fff",
                        }}
                      >
                        {item.name}
                      </h3>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 12,
                          color: "rgba(255,255,255,0.34)",
                        }}
                      >
                        ID: {item.id}
                      </p>
                    </div>

                    <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)" }}>
                      {item.phone}
                    </div>

                    <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)" }}>
                      {item.vehicleType}
                    </div>

                    <div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "6px 12px",
                          borderRadius: 999,
                          background: statusStyle.bg,
                          border: `1px solid ${statusStyle.border}`,
                          color: statusStyle.color,
                          fontSize: 11,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <CircleDot size={10} />
                        {item.status}
                      </span>
                    </div>

                    <ActionButtons actions={item.actions} onApprove={() => approve(item.id)} onReject={() => reject(item.id)} />
                  </div>
                );
              })}
            </div>

            {/* Mobile Cards */}
            <div className="mobileCards" style={{ display: "grid", gap: 14, padding: 14 }}>
              {loading && <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'Outfit',sans-serif" }}>Loading applications...</div>}
              {!loading && applications.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'Outfit',sans-serif" }}>No pending applications</div>}
              {applications.map((item) => {
                const statusStyle = getStatusStyle(item.status);

                return (
                  <div
                    key={item.id}
                    className="dbm"
                    style={{
                      padding: "14px 14px",
                      background: item.rowHighlight
                        ? "linear-gradient(145deg,rgba(212,175,55,0.08),rgba(255,255,255,0.02))"
                        : undefined,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            margin: 0,
                            fontFamily: "'Cinzel',serif",
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#fff",
                          }}
                        >
                          {item.name}
                        </h3>
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: 12,
                            color: "rgba(255,255,255,0.34)",
                          }}
                        >
                          ID: {item.id}
                        </p>
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
                        display: "grid",
                        gridTemplateColumns: "1fr",
                        gap: 10,
                        marginBottom: 12,
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
                        <p style={{ margin: 0, fontSize: 10.5, color: "rgba(255,255,255,0.34)" }}>Phone</p>
                        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#fff" }}>{item.phone}</p>
                      </div>

                      <div
                        style={{
                          borderRadius: 14,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(212,175,55,0.1)",
                          padding: "12px 13px",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 10.5, color: "rgba(255,255,255,0.34)" }}>Vehicle Type</p>
                        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#fff" }}>{item.vehicleType}</p>
                      </div>
                    </div>

                    <ActionButtons actions={item.actions} onApprove={() => approve(item.id)} onReject={() => reject(item.id)} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ display: "grid", gap: 18 }}>
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
                <ST sub="Document Review" main="Verification Panel" />
              </div>

              <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'Outfit',sans-serif", fontSize: 13 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
                Select a driver from the list to view their documents
              </div>
            </div>

            <div className="dbc" style={{ padding: "20px 22px" }}>
              <div style={{ marginBottom: 14 }}>
                <ST sub="Queue Analytics" main="Application Distribution" />
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { label: "In Review Queue", value: loading ? "—" : `${pendingCount} applications`, icon: UserCheck, color: "#D4AF37" },
                  { label: "Ready To Approve", value: loading ? "—" : `${readyCount}`, icon: ShieldCheck, color: "#34D399" },
                  { label: "Documents Pending", value: loading ? "—" : `${docsPendingCount}`, icon: Clock3, color: "#F59E0B" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.1)", padding: "12px 13px" }}>
                      <div style={{ width: 30, height: 30, borderRadius: 10, background: `${item.color}18`, border: `1px solid ${item.color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={14} color={item.color} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 10.5, color: "rgba(255,255,255,0.34)" }}>{item.label}</p>
                        <p style={{ margin: "5px 0 0", fontFamily: "'Cinzel',serif", fontSize: 14, fontWeight: 700, color: item.color }}>{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}