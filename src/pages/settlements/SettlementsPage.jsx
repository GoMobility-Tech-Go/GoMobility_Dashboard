import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertTriangle, Users, Banknote, CheckCircle2 } from "lucide-react";
import { getSettlements } from "../../api/admin";

const fmt   = (n) => "₹" + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
const fmtDT = (d) => d ? new Date(d).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";

// ── Payment/status badge colours ─────────────────────────────────────────────
const STATUS_COLORS = {
  held:     { color:"#f59e0b", bg:"rgba(245,158,11,0.12)", border:"rgba(245,158,11,0.3)"  },
  earned:   { color:"#4ade80", bg:"rgba(34,197,94,0.12)",  border:"rgba(34,197,94,0.3)"   },
  settled:  { color:"#60a5fa", bg:"rgba(96,165,250,0.12)", border:"rgba(96,165,250,0.3)"  },
  cash_collected: { color:"#f59e0b", bg:"rgba(245,158,11,0.12)", border:"rgba(245,158,11,0.3)"  },
};

const PAY_COLORS = {
  cash:   { color:"#f59e0b", bg:"rgba(245,158,11,0.12)",  border:"rgba(245,158,11,0.3)"  },
  wallet: { color:"#60a5fa", bg:"rgba(96,165,250,0.12)",  border:"rgba(96,165,250,0.3)"  },
  upi:    { color:"#4ade80", bg:"rgba(34,197,94,0.12)",   border:"rgba(34,197,94,0.3)"   },
  card:   { color:"#a78bfa", bg:"rgba(167,139,250,0.12)", border:"rgba(167,139,250,0.3)" },
};

const Badge = ({ label, map, fallbackColor = "#94a3b8" }) => {
  const c = map?.[label?.toLowerCase()] || { color: fallbackColor, bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:600, letterSpacing:"0.3px", color: c.color, background: c.bg, border:`1px solid ${c.border}` }}>
      {label || "—"}
    </span>
  );
};

const TH = ({ c }) => (
  <th style={{ padding:"11px 14px", textAlign:"left", fontSize:11, fontWeight:700, color:"rgba(212,175,55,0.65)", letterSpacing:"1.1px", textTransform:"uppercase", borderBottom:"1px solid rgba(212,175,55,0.1)", whiteSpace:"nowrap" }}>{c}</th>
);
const TD = ({ children, style }) => (
  <td style={{ padding:"13px 14px", fontSize:12.5, color:"rgba(255,255,255,0.78)", borderBottom:"1px solid rgba(255,255,255,0.04)", verticalAlign:"middle", ...style }}>{children}</td>
);

const TABS = ["Cash Dues", "Unsettled Rides", "Company Earnings"];

export default function SettlementsPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [tab, setTab]         = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getSettlements()
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setData(d);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary || {};
  const cashDues       = data?.cash_dues       || [];
  const unsettledRides = data?.unsettled_rides || [];
  const companyEarnings = data?.company_earnings || [];

  const CARDS = [
    {
      label: "Cash Held by Drivers",
      value: fmt(summary.total_held_cash),
      sub:   `${summary.drivers_with_dues || 0} drivers with pending dues`,
      icon:  <AlertTriangle size={18} />,
      color: "#f59e0b",
      bg:    "rgba(245,158,11,0.1)",
    },
    {
      label: "Drivers with Dues",
      value: summary.drivers_with_dues || 0,
      sub:   "Need to deposit cash to company",
      icon:  <Users size={18} />,
      color: "#f87171",
      bg:    "rgba(248,113,113,0.1)",
    },
    {
      label: "Company Earnings Held",
      value: fmt(summary.company_earnings_held),
      sub:   `${summary.unsettled_cash_rides || 0} cash rides pending`,
      icon:  <Banknote size={18} />,
      color: "#a78bfa",
      bg:    "rgba(167,139,250,0.1)",
    },
    {
      label: "Company Earnings Settled",
      value: fmt(summary.company_earnings_settled),
      sub:   "Confirmed via Razorpay/UPI/Card",
      icon:  <CheckCircle2 size={18} />,
      color: "#4ade80",
      bg:    "rgba(34,197,94,0.1)",
    },
  ];

  return (
    <div style={{ fontFamily:"Outfit,sans-serif", padding:"28px 28px 60px", minHeight:"100vh", maxWidth:1400, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
        <div>
          <h1 style={{ margin:0, fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#D4AF37", letterSpacing:"0.5px" }}>Settlements</h1>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"rgba(255,255,255,0.4)" }}>
            Cash dues, unsettled rides, and company earnings breakdown
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 16px", borderRadius:10, border:"1px solid rgba(212,175,55,0.25)", background:"rgba(212,175,55,0.06)", color:"#D4AF37", fontSize:13, fontWeight:600, cursor:loading?"not-allowed":"pointer", opacity:loading?0.6:1, transition:"all .2s" }}
        >
          <RefreshCw size={14} style={{ animation:loading?"spin 1s linear infinite":"none" }} />
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding:20, borderRadius:12, border:"1px solid rgba(248,113,113,0.3)", background:"rgba(248,113,113,0.06)", color:"#f87171", fontSize:13, marginBottom:24 }}>
          Failed to load settlements data. Check backend connection and retry.
        </div>
      )}

      {/* Summary cards */}
      <div className="settlements-cards" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:32 }}>
        {CARDS.map((card) => (
          <div key={card.label} style={{ padding:"20px 22px", borderRadius:14, border:`1px solid ${card.color}26`, background:`linear-gradient(135deg, ${card.bg}, rgba(2,12,32,0.6))`, position:"relative", overflow:"hidden" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ padding:8, borderRadius:10, background:card.bg, color:card.color }}>
                {card.icon}
              </div>
            </div>
            <div style={{ fontSize:24, fontWeight:800, color:card.color, lineHeight:1.1, marginBottom:4, fontVariantNumeric:"tabular-nums" }}>
              {loading ? <span style={{ opacity:0.3 }}>—</span> : card.value}
            </div>
            <div style={{ fontSize:11.5, fontWeight:600, color:"rgba(255,255,255,0.7)", marginBottom:3 }}>{card.label}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.32)" }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:20, borderBottom:"1px solid rgba(212,175,55,0.1)", paddingBottom:0 }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{
              padding:"9px 18px", border:"none", background:"none", cursor:"pointer", fontFamily:"Outfit,sans-serif",
              fontSize:13, fontWeight:600, color: tab === i ? "#D4AF37" : "rgba(255,255,255,0.45)",
              borderBottom: tab === i ? "2px solid #D4AF37" : "2px solid transparent",
              marginBottom:-1, transition:"all .18s",
            }}
          >
            {t}
            {i === 0 && cashDues.length > 0 && (
              <span style={{ marginLeft:6, padding:"1px 7px", borderRadius:20, background:"rgba(245,158,11,0.18)", color:"#f59e0b", fontSize:10, fontWeight:700 }}>{cashDues.length}</span>
            )}
            {i === 1 && unsettledRides.length > 0 && (
              <span style={{ marginLeft:6, padding:"1px 7px", borderRadius:20, background:"rgba(248,113,113,0.15)", color:"#f87171", fontSize:10, fontWeight:700 }}>{unsettledRides.length}</span>
            )}
            {i === 2 && companyEarnings.length > 0 && (
              <span style={{ marginLeft:6, padding:"1px 7px", borderRadius:20, background:"rgba(96,165,250,0.15)", color:"#60a5fa", fontSize:10, fontWeight:700 }}>{companyEarnings.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Table container */}
      <div style={{ borderRadius:14, border:"1px solid rgba(212,175,55,0.1)", background:"rgba(2,12,32,0.55)", overflow:"hidden" }}>
        {loading ? (
          <div style={{ padding:60, textAlign:"center", color:"rgba(255,255,255,0.25)", fontSize:13 }}>Loading…</div>
        ) : (

          /* ── Tab 0: Cash Dues ──────────────────────────────────────── */
          tab === 0 ? (
            cashDues.length === 0 ? (
              <EmptyState icon="✅" msg="No drivers with pending cash dues" />
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>
                      <TH c="Driver" />
                      <TH c="Phone" />
                      <TH c="GO ID" />
                      <TH c="Pending Amount" />
                      <TH c="Total Collected" />
                      <TH c="Total Deposited" />
                      <TH c="Cash Limit" />
                      <TH c="Limit Exceeded" />
                      <TH c="Due Date" />
                    </tr>
                  </thead>
                  <tbody>
                    {cashDues.map((row) => (
                      <tr key={row.driver_id} style={{ transition:"background .15s" }} onMouseEnter={e=>e.currentTarget.style.background="rgba(212,175,55,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <TD style={{ fontWeight:600, color:"rgba(255,255,255,0.88)" }}>{row.driver_name || "—"}</TD>
                        <TD style={{ color:"rgba(255,255,255,0.5)", fontSize:12 }}>{row.driver_phone || "—"}</TD>
                        <TD style={{ color:"rgba(255,255,255,0.45)", fontSize:11.5 }}>{row.go_id || "—"}</TD>
                        <TD>
                          <span style={{ fontWeight:700, color:"#f59e0b", fontVariantNumeric:"tabular-nums" }}>{fmt(row.pending_amount)}</span>
                        </TD>
                        <TD style={{ fontVariantNumeric:"tabular-nums" }}>{fmt(row.total_cash_collected)}</TD>
                        <TD style={{ fontVariantNumeric:"tabular-nums" }}>{fmt(row.total_deposited)}</TD>
                        <TD style={{ fontVariantNumeric:"tabular-nums", color:"rgba(255,255,255,0.5)" }}>{fmt(row.cash_limit)}</TD>
                        <TD>
                          {row.is_limit_exceeded
                            ? <span style={{ color:"#f87171", fontWeight:700, fontSize:12 }}>⚠ YES</span>
                            : <span style={{ color:"#4ade80", fontSize:12 }}>No</span>
                          }
                        </TD>
                        <TD style={{ color:"rgba(255,255,255,0.45)", fontSize:12 }}>{row.deposit_due_date ? fmtDT(row.deposit_due_date) : "—"}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )

          /* ── Tab 1: Unsettled Rides ──────────────────────────────────── */
          ) : tab === 1 ? (
            unsettledRides.length === 0 ? (
              <EmptyState icon="✅" msg="No unsettled cash rides" />
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>
                      <TH c="Ride #" />
                      <TH c="Vehicle" />
                      <TH c="Passenger" />
                      <TH c="Driver" />
                      <TH c="Payment" />
                      <TH c="Status" />
                      <TH c="Total Fare" />
                      <TH c="Driver Earned" />
                      <TH c="Platform Share" />
                      <TH c="Completed" />
                    </tr>
                  </thead>
                  <tbody>
                    {unsettledRides.map((row) => (
                      <tr key={row.id} style={{ transition:"background .15s" }} onMouseEnter={e=>e.currentTarget.style.background="rgba(212,175,55,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <TD style={{ fontWeight:600, color:"#D4AF37", fontSize:12 }}>{row.ride_number || `#${row.id}`}</TD>
                        <TD style={{ textTransform:"capitalize", fontSize:12 }}>{row.vehicle_type || "—"}</TD>
                        <TD>
                          <div style={{ fontWeight:600, fontSize:12.5, color:"rgba(255,255,255,0.85)" }}>{row.passenger_name || "—"}</div>
                          <div style={{ fontSize:11, color:"rgba(255,255,255,0.38)", marginTop:1 }}>{row.passenger_phone || ""}</div>
                        </TD>
                        <TD>
                          <div style={{ fontWeight:600, fontSize:12.5, color:"rgba(255,255,255,0.85)" }}>{row.driver_name || "—"}</div>
                          <div style={{ fontSize:11, color:"rgba(255,255,255,0.38)", marginTop:1 }}>{row.driver_phone || ""}</div>
                        </TD>
                        <TD><Badge label={row.payment_method} map={PAY_COLORS} /></TD>
                        <TD><Badge label={row.payment_status} map={STATUS_COLORS} /></TD>
                        <TD style={{ fontWeight:700, fontVariantNumeric:"tabular-nums", color:"rgba(255,255,255,0.9)" }}>{fmt(row.final_fare)}</TD>
                        <TD style={{ color:"#4ade80", fontVariantNumeric:"tabular-nums" }}>{fmt(row.driver_net_earnings)}</TD>
                        <TD style={{ color:"#a78bfa", fontVariantNumeric:"tabular-nums" }}>{fmt(row.platform_share)}</TD>
                        <TD style={{ color:"rgba(255,255,255,0.4)", fontSize:12 }}>{fmtDT(row.completed_at)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )

          /* ── Tab 2: Company Earnings ─────────────────────────────────── */
          ) : (
            companyEarnings.length === 0 ? (
              <EmptyState icon="📊" msg="No company earnings records" />
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>
                      <TH c="Ride #" />
                      <TH c="Vehicle" />
                      <TH c="Driver" />
                      <TH c="Passenger" />
                      <TH c="Payment" />
                      <TH c="Status" />
                      <TH c="Gross Fare" />
                      <TH c="Platform Fee" />
                      <TH c="GST on Fee" />
                      <TH c="Net to Driver" />
                      <TH c="Completed" />
                    </tr>
                  </thead>
                  <tbody>
                    {companyEarnings.map((row, i) => (
                      <tr key={`${row.ride_id}-${i}`} style={{ transition:"background .15s" }} onMouseEnter={e=>e.currentTarget.style.background="rgba(212,175,55,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <TD style={{ fontWeight:600, color:"#D4AF37", fontSize:12 }}>{row.ride_number || `#${row.ride_id}`}</TD>
                        <TD style={{ textTransform:"capitalize", fontSize:12 }}>{row.vehicle_type || "—"}</TD>
                        <TD>
                          <div style={{ fontWeight:600, fontSize:12.5, color:"rgba(255,255,255,0.85)" }}>{row.driver_name || "—"}</div>
                          <div style={{ fontSize:11, color:"rgba(255,255,255,0.38)", marginTop:1 }}>{row.driver_phone || ""}</div>
                        </TD>
                        <TD>
                          <div style={{ fontSize:12.5, color:"rgba(255,255,255,0.75)" }}>{row.passenger_name || "—"}</div>
                          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:1 }}>{row.passenger_phone || ""}</div>
                        </TD>
                        <TD><Badge label={row.payment_method} map={PAY_COLORS} /></TD>
                        <TD><Badge label={row.status} map={STATUS_COLORS} /></TD>
                        <TD style={{ fontVariantNumeric:"tabular-nums" }}>{fmt(row.gross_fare)}</TD>
                        <TD style={{ color:"#a78bfa", fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{fmt(row.platform_fee)}</TD>
                        <TD style={{ color:"rgba(255,255,255,0.45)", fontVariantNumeric:"tabular-nums", fontSize:12 }}>{fmt(row.gst_on_fee)}</TD>
                        <TD style={{ color:"#4ade80", fontVariantNumeric:"tabular-nums" }}>{fmt(row.net_to_driver)}</TD>
                        <TD style={{ color:"rgba(255,255,255,0.4)", fontSize:12 }}>{fmtDT(row.completed_at)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .settlements-cards { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}

function EmptyState({ icon, msg }) {
  return (
    <div style={{ padding:"60px 20px", textAlign:"center" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)", fontFamily:"Outfit,sans-serif" }}>{msg}</div>
    </div>
  );
}
