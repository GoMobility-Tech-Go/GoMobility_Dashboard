import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, AlertTriangle, Users, Banknote, CheckCircle2, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { getSettlements } from "../../api/admin";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt   = (n) => "₹" + new Intl.NumberFormat("en-IN", { minimumFractionDigits:2, maximumFractionDigits:2 }).format(Number(n) || 0);
const fmtDT = (d) => d ? new Date(d).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";
const q     = (s) => (s || "").toLowerCase().trim();

// ── Color maps ────────────────────────────────────────────────────────────────
const STATUS_C = {
  held:          { color:"#f59e0b", bg:"rgba(245,158,11,0.13)", border:"rgba(245,158,11,0.32)" },
  earned:        { color:"#4ade80", bg:"rgba(34,197,94,0.13)",  border:"rgba(34,197,94,0.32)"  },
  settled:       { color:"#60a5fa", bg:"rgba(96,165,250,0.13)", border:"rgba(96,165,250,0.32)" },
  cash_collected:{ color:"#f59e0b", bg:"rgba(245,158,11,0.13)", border:"rgba(245,158,11,0.32)" },
};
const PAY_C = {
  cash:  { color:"#f59e0b", bg:"rgba(245,158,11,0.13)",  border:"rgba(245,158,11,0.32)"  },
  wallet:{ color:"#60a5fa", bg:"rgba(96,165,250,0.13)",  border:"rgba(96,165,250,0.32)"  },
  upi:   { color:"#4ade80", bg:"rgba(34,197,94,0.13)",   border:"rgba(34,197,94,0.32)"   },
  card:  { color:"#a78bfa", bg:"rgba(167,139,250,0.13)", border:"rgba(167,139,250,0.32)" },
  qr:    { color:"#f87171", bg:"rgba(248,113,113,0.13)", border:"rgba(248,113,113,0.32)" },
};
const VEHICLE_C = {
  bike:   { color:"#f59e0b" }, auto:   { color:"#34D399" }, car:    { color:"#60a5fa" },
  xl:     { color:"#a78bfa" }, premium:{ color:"#D4AF37"  }, luxury: { color:"#f87171" },
};

// ── Shared UI atoms ───────────────────────────────────────────────────────────
const Badge = ({ label, map }) => {
  const c = map?.[q(label)] || { color:"rgba(255,255,255,0.45)", bg:"rgba(255,255,255,0.07)", border:"rgba(255,255,255,0.12)" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, letterSpacing:"0.2px", color:c.color, background:c.bg, border:`1px solid ${c.border}`, textTransform:"capitalize" }}>
      {label || "—"}
    </span>
  );
};

const TH = ({ c, right }) => (
  <th style={{ padding:"12px 14px", textAlign:right?"right":"left", fontSize:10.5, fontWeight:700, color:"rgba(212,175,55,0.6)", letterSpacing:"1.2px", textTransform:"uppercase", borderBottom:"1px solid rgba(212,175,55,0.1)", whiteSpace:"nowrap", background:"rgba(2,12,32,0.7)" }}>{c}</th>
);
const TD = ({ children, style, right }) => (
  <td style={{ padding:"13px 14px", fontSize:12.5, color:"rgba(255,255,255,0.78)", borderBottom:"1px solid rgba(255,255,255,0.04)", verticalAlign:"middle", textAlign:right?"right":"left", ...style }}>{children}</td>
);

// ── Search bar ────────────────────────────────────────────────────────────────
const SearchBar = ({ value, onChange, placeholder }) => (
  <div style={{ position:"relative", flex:1, minWidth:180, maxWidth:320 }}>
    <Search size={13} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.3)", pointerEvents:"none" }} />
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width:"100%", padding:"8px 32px 8px 32px", borderRadius:9, border:"1px solid rgba(212,175,55,0.18)", background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.82)", fontSize:12.5, fontFamily:"Outfit,sans-serif", outline:"none", boxSizing:"border-box" }}
    />
    {value && (
      <button onClick={() => onChange("")} style={{ position:"absolute", right:9, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.35)", display:"flex", alignItems:"center" }}>
        <X size={12} />
      </button>
    )}
  </div>
);

// ── Pagination bar ────────────────────────────────────────────────────────────
const PagerBar = ({ page, total, limit, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : page * limit + 1;
  const to   = Math.min((page + 1) * limit, total);
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderTop:"1px solid rgba(212,175,55,0.08)", background:"rgba(2,12,32,0.5)" }}>
      <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)", fontFamily:"Outfit,sans-serif" }}>
        {total === 0 ? "No results" : `${from}–${to} of ${total}`}
      </span>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <PageBtn icon={<ChevronLeft size={13}/>} disabled={page === 0} onClick={() => onChange(page - 1)} />
        {Array.from({ length: totalPages }, (_, i) => i)
          .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
          .reduce((acc, i, idx, arr) => {
            if (idx > 0 && i - arr[idx-1] > 1) acc.push("…");
            acc.push(i);
            return acc;
          }, [])
          .map((item, idx) =>
            item === "…"
              ? <span key={`e${idx}`} style={{ fontSize:12, color:"rgba(255,255,255,0.25)", padding:"0 4px" }}>…</span>
              : <PageBtn key={item} label={item + 1} active={item === page} onClick={() => onChange(item)} />
          )
        }
        <PageBtn icon={<ChevronRight size={13}/>} disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)} />
      </div>
    </div>
  );
};

const PageBtn = ({ label, icon, active, disabled, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{ minWidth:30, height:30, padding:"0 8px", borderRadius:7, border:`1px solid ${active?"rgba(212,175,55,0.5)":"rgba(255,255,255,0.1)"}`, background:active?"rgba(212,175,55,0.15)":"transparent", color:active?"#D4AF37":disabled?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.55)", fontSize:12, fontWeight:active?700:500, cursor:disabled?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Outfit,sans-serif", transition:"all .15s" }}
  >
    {icon || label}
  </button>
);

// ── Detail modal ──────────────────────────────────────────────────────────────
function DetailModal({ row, type, onClose }) {
  if (!row) return null;
  const stop = e => e.stopPropagation();

  const SecHead = ({ t, color="#D4AF37" }) => (
    <div style={{ display:"flex", alignItems:"center", gap:8, margin:"14px 0 8px" }}>
      <div style={{ width:3, height:14, borderRadius:2, background:color, flexShrink:0 }} />
      <span style={{ fontSize:10, fontWeight:700, letterSpacing:"1.8px", textTransform:"uppercase", color:"rgba(255,255,255,0.45)" }}>{t}</span>
      <div style={{ flex:1, height:"1px", background:"rgba(255,255,255,0.06)" }} />
    </div>
  );

  const Field = ({ label, value, color, bold }) => (
    <div style={{ padding:"6px 10px 7px", borderRadius:8, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:"1.2px", textTransform:"uppercase", color:"rgba(212,175,55,0.38)", marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:bold?700:500, color:color||"rgba(255,255,255,0.85)", fontVariantNumeric:"tabular-nums", lineHeight:1.2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value ?? "—"}</div>
    </div>
  );

  const MoneyCard = ({ label, value, color, accent }) => (
    <div style={{ flex:1, padding:"11px 14px", borderRadius:12, background:`linear-gradient(145deg,rgba(2,12,32,0.9) 0%,rgba(5,18,40,0.7) 100%)`, border:`1px solid ${color}28`, boxShadow:`inset 0 1px 0 rgba(255,255,255,0.04), 0 0 18px ${color}12`, textAlign:"center", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse at 50% 0%, ${color}10 0%, transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ fontSize:8.5, fontWeight:700, letterSpacing:"1.2px", textTransform:"uppercase", color:"rgba(255,255,255,0.28)", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:19, fontWeight:800, color, fontVariantNumeric:"tabular-nums", lineHeight:1 }}>{value}</div>
    </div>
  );

  const PersonCard = ({ emoji, role, name, phone, color }) => (
    <div style={{ padding:"10px 13px", borderRadius:10, background:`${color}08`, border:`1px solid ${color}20`, display:"flex", alignItems:"center", gap:12 }}>
      <div style={{ width:36, height:36, borderRadius:10, background:`${color}18`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{emoji}</div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:"1.2px", textTransform:"uppercase", color:`${color}99`, marginBottom:3 }}>{role}</div>
        <div style={{ fontSize:13.5, fontWeight:700, color:"rgba(255,255,255,0.88)", marginBottom:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name || "—"}</div>
        <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.4)" }}>{phone || "—"}</div>
      </div>
    </div>
  );

  const vColor = VEHICLE_C[row.vehicle_type]?.color || "rgba(255,255,255,0.6)";
  const statusColor = { earned:"#4ade80", held:"#f59e0b", settled:"#60a5fa" };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(1,9,23,0.9)", backdropFilter:"blur(12px)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div onClick={stop} style={{ background:"linear-gradient(160deg,#020e24 0%,#031828 100%)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:20, width:"100%", maxWidth:860, boxShadow:"0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03) inset" }}>

        {/* ── Header ── */}
        <div style={{ padding:"15px 20px", borderBottom:"1px solid rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
              {type === 0 ? "🧑‍✈️" : type === 1 ? "🚗" : "📊"}
            </div>
            <div>
              <div style={{ fontFamily:"Cinzel,serif", fontSize:14.5, fontWeight:700, color:"#D4AF37", lineHeight:1.2 }}>
                {type === 0 ? "Driver Detail" : type === 1 ? "Ride Detail" : "Earnings Detail"}
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.28)", marginTop:2 }}>
                {type === 0 ? (row.go_id ? `GO ID: ${row.go_id}` : row.driver_name) : (row.ride_number || `#${row.ride_id || row.id}`)}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:"1px solid rgba(255,255,255,0.09)", background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.45)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}>
            <X size={13}/>
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding:"4px 18px 18px" }}>

          {/* ════ TYPE 0: Driver / Cash Dues ════ */}
          {type === 0 && <>
            <SecHead t="Driver Info" />
            <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 0.8fr", gap:7 }}>
              <Field label="Full Name" value={row.driver_name} bold />
              <Field label="Phone"     value={row.driver_phone} color="rgba(255,255,255,0.65)" />
              <Field label="GO ID"     value={row.go_id} color="#D4AF37" bold />
            </div>

            <SecHead t="Cash Balance" color="#f59e0b" />
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <MoneyCard label="Owes Company (Pending)" value={fmt(row.pending_amount)}       color="#f59e0b" />
              <MoneyCard label="Total Collected"         value={fmt(row.total_cash_collected)} color="rgba(255,255,255,0.6)" />
              <MoneyCard label="Total Deposited"         value={fmt(row.total_deposited)}      color="#4ade80" />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:7 }}>
              <Field label="Platform Share (Total)" value={fmt(row.total_platform_share)} color="rgba(255,255,255,0.6)" />
              <Field label="Cash Limit"             value={fmt(row.cash_limit)} color="rgba(255,255,255,0.45)" />
              <Field label="Limit Status"
                value={row.is_limit_exceeded ? "⚠ Exceeded" : "✓ Within Limit"}
                color={row.is_limit_exceeded ? "#f87171" : "#4ade80"}
                bold={!!row.is_limit_exceeded}
              />
            </div>
            {row.deposit_due_date && (
              <div style={{ marginTop:7 }}>
                <Field label="Deposit Due Date" value={fmtDT(row.deposit_due_date)} color="rgba(255,255,255,0.5)" />
              </div>
            )}
          </>}

          {/* ════ TYPE 1: Ride Detail ════ */}
          {type === 1 && <>
            <SecHead t="Ride Info" />
            <div style={{ display:"grid", gridTemplateColumns:"1.5fr 0.9fr 0.9fr 0.9fr 1.4fr", gap:7 }}>
              <Field label="Ride Number"    value={row.ride_number || `#${row.id}`} bold color="#D4AF37" />
              <Field label="Vehicle"        value={row.vehicle_type} color={vColor} />
              <Field label="Payment Method" value={row.payment_method} color={PAY_C[row.payment_method]?.color} />
              <Field label="Status"         value={row.payment_status?.replace("_"," ")} color="#f59e0b" bold />
              <Field label="Completed At"   value={fmtDT(row.completed_at)} color="rgba(255,255,255,0.5)" />
            </div>

            <SecHead t="Passenger & Driver" color="#60a5fa" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <PersonCard emoji="👤" role="Passenger" name={row.passenger_name} phone={row.passenger_phone} color="#60a5fa" />
              <PersonCard emoji="🧑‍✈️" role="Driver"    name={row.driver_name}    phone={row.driver_phone}    color="#34D399" />
            </div>

            <SecHead t="Fare Breakdown" color="#a78bfa" />
            <div style={{ display:"flex", gap:8 }}>
              <MoneyCard label="Passenger Paid"  value={fmt(row.final_fare)}          color="#60a5fa" />
              <MoneyCard label="Driver Earned"   value={fmt(row.driver_net_earnings)} color="#4ade80" />
              <MoneyCard label="Platform Share"  value={fmt(row.platform_share)}      color="#a78bfa" />
            </div>
          </>}

          {/* ════ TYPE 2: Earnings Detail ════ */}
          {type === 2 && <>
            <SecHead t="Ride Info" />
            <div style={{ display:"grid", gridTemplateColumns:"1.5fr 0.9fr 0.9fr 0.9fr 1.4fr", gap:7 }}>
              <Field label="Ride Number"    value={row.ride_number || `#${row.ride_id}`} bold color="#D4AF37" />
              <Field label="Vehicle"        value={row.vehicle_type} color={vColor} />
              <Field label="Payment Method" value={row.payment_method} color={PAY_C[row.payment_method]?.color} />
              <Field label="Status"         value={row.status} color={statusColor[row.status]||"#60a5fa"} bold />
              <Field label="Completed At"   value={fmtDT(row.completed_at)} color="rgba(255,255,255,0.5)" />
            </div>

            <SecHead t="Driver & Passenger" color="#34D399" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <PersonCard emoji="🧑‍✈️" role="Driver"    name={row.driver_name}    phone={row.driver_phone}    color="#34D399" />
              <PersonCard emoji="👤" role="Passenger" name={row.passenger_name} phone={row.passenger_phone} color="#60a5fa" />
            </div>

            <SecHead t="Earnings Breakdown" color="#a78bfa" />
            <div style={{ display:"flex", gap:8 }}>
              <MoneyCard label="Gross Fare"    value={fmt(row.gross_fare)}   color="rgba(255,255,255,0.65)" />
              <MoneyCard label="Platform Fee"  value={fmt(row.platform_fee)} color="#a78bfa" />
              <MoneyCard label="GST on Fee"    value={fmt(row.gst_on_fee)}   color="rgba(255,255,255,0.4)" />
              <MoneyCard label="Net to Driver" value={fmt(row.net_to_driver)}color="#4ade80" />
            </div>
          </>}

        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = ({ icon, msg }) => (
  <div style={{ padding:"56px 20px", textAlign:"center" }}>
    <div style={{ fontSize:34, marginBottom:10 }}>{icon}</div>
    <div style={{ fontSize:13, color:"rgba(255,255,255,0.28)", fontFamily:"Outfit,sans-serif" }}>{msg}</div>
  </div>
);

// ── Page skeleton rows ────────────────────────────────────────────────────────
const Skeleton = ({ cols }) => (
  <tbody>
    {Array.from({ length:6 }).map((_, i) => (
      <tr key={i}>
        {Array.from({ length:cols }).map((__, j) => (
          <td key={j} style={{ padding:"14px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ height:12, borderRadius:6, background:"rgba(255,255,255,0.06)", animation:"gmPulse 1.4s ease-in-out infinite", width:`${50 + Math.random()*40}%` }} />
          </td>
        ))}
      </tr>
    ))}
  </tbody>
);

const LIMIT = 10;
const TABS  = ["Cash Dues", "Unsettled Rides", "Company Earnings"];

// ─────────────────────────────────────────────────────────────────────────────
export default function SettlementsPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [tab,     setTab]     = useState(0);
  const [selected, setSelected] = useState(null);

  // per-tab search
  const [s0, setS0] = useState("");   // cash dues
  const [s1, setS1] = useState("");   // unsettled rides
  const [s2, setS2] = useState("");   // company earnings
  const [statusF, setStatusF] = useState(""); // company earnings status filter

  // per-tab page
  const [p0, setP0] = useState(0);
  const [p1, setP1] = useState(0);
  const [p2, setP2] = useState(0);

  const load = useCallback(() => {
    setLoading(true); setError(false);
    getSettlements()
      .then(res => setData(res.data?.data || res.data || {}))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // reset page on search change
  useEffect(() => { setP0(0); }, [s0]);
  useEffect(() => { setP1(0); }, [s1]);
  useEffect(() => { setP2(0); }, [s2, statusF]);

  const summary        = data?.summary        || {};
  const cashDues       = data?.cash_dues       || [];
  const unsettledRides = data?.unsettled_rides || [];
  const companyEarnings= data?.company_earnings|| [];

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filteredDues = useMemo(() => {
    const sq = q(s0);
    if (!sq) return cashDues;
    return cashDues.filter(r =>
      q(r.driver_name).includes(sq) ||
      q(r.driver_phone).includes(sq) ||
      q(r.go_id).includes(sq)
    );
  }, [cashDues, s0]);

  const filteredRides = useMemo(() => {
    const sq = q(s1);
    if (!sq) return unsettledRides;
    return unsettledRides.filter(r =>
      q(r.ride_number).includes(sq) ||
      q(r.driver_name).includes(sq) ||
      q(r.driver_phone).includes(sq) ||
      q(r.passenger_name).includes(sq) ||
      q(r.passenger_phone).includes(sq)
    );
  }, [unsettledRides, s1]);

  const filteredEarnings = useMemo(() => {
    const sq = q(s2);
    return companyEarnings.filter(r => {
      const matchStatus = !statusF || r.status === statusF;
      const matchSearch = !sq ||
        q(r.ride_number).includes(sq) ||
        q(r.driver_name).includes(sq) ||
        q(r.driver_phone).includes(sq) ||
        q(r.passenger_name).includes(sq) ||
        q(r.passenger_phone).includes(sq);
      return matchStatus && matchSearch;
    });
  }, [companyEarnings, s2, statusF]);

  // ── Paginated slices ──────────────────────────────────────────────────────
  const pageD = filteredDues    .slice(p0 * LIMIT, (p0+1) * LIMIT);
  const pageR = filteredRides   .slice(p1 * LIMIT, (p1+1) * LIMIT);
  const pageE = filteredEarnings.slice(p2 * LIMIT, (p2+1) * LIMIT);

  const CARDS = [
    { label:"Cash Held by Drivers",    value:fmt(summary.total_held_cash),          sub:`${summary.drivers_with_dues||0} drivers`, icon:<AlertTriangle size={17}/>, color:"#f59e0b", glow:"rgba(245,158,11,0.18)" },
    { label:"Drivers with Dues",        value:summary.drivers_with_dues||0,          sub:"Pending deposit",                         icon:<Users size={17}/>,          color:"#f87171", glow:"rgba(248,113,113,0.15)" },
    { label:"Company Earnings Held",   value:fmt(summary.company_earnings_held),    sub:`${summary.unsettled_cash_rides||0} rides`, icon:<Banknote size={17}/>,       color:"#a78bfa", glow:"rgba(167,139,250,0.15)" },
    { label:"Company Earnings Settled",value:fmt(summary.company_earnings_settled), sub:"Via Razorpay / UPI",                      icon:<CheckCircle2 size={17}/>,    color:"#4ade80", glow:"rgba(34,197,94,0.15)"   },
  ];

  const tabClick = (i) => { setTab(i); setSelected(null); };

  return (
    <div style={{ fontFamily:"Outfit,sans-serif", padding:"26px 26px 70px", minHeight:"100vh" }}>
      <style>{`
        @keyframes gmPulse{0%,100%{opacity:1}50%{opacity:.45}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .stl-row:hover{background:rgba(212,175,55,0.045)!important;cursor:pointer}
        .stl-inp:focus{border-color:rgba(212,175,55,0.4)!important;background:rgba(212,175,55,0.04)!important}
        .stl-sel{background:#020c20;color:rgba(255,255,255,0.7);border:1px solid rgba(212,175,55,0.18);border-radius:9px;padding:8px 12px;font-size:12.5px;font-family:Outfit,sans-serif;outline:none;cursor:pointer}
        .stl-sel:focus{border-color:rgba(212,175,55,0.4)}
      `}</style>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:26, gap:16 }}>
        <div>
          <h1 style={{ margin:0, fontFamily:"Cinzel,serif", fontSize:21, fontWeight:700, color:"#D4AF37", letterSpacing:"0.4px" }}>Settlements</h1>
          <p style={{ margin:"4px 0 0", fontSize:12.5, color:"rgba(255,255,255,0.38)" }}>Cash dues · Unsettled rides · Company earnings</p>
        </div>
        <button onClick={load} disabled={loading} style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 16px", borderRadius:10, border:"1px solid rgba(212,175,55,0.22)", background:"rgba(212,175,55,0.07)", color:"#D4AF37", fontSize:12.5, fontWeight:600, cursor:loading?"not-allowed":"pointer", opacity:loading?0.6:1, flexShrink:0 }}>
          <RefreshCw size={13} style={{ animation:loading?"spin 1s linear infinite":"none" }} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding:"14px 18px", borderRadius:11, border:"1px solid rgba(248,113,113,0.28)", background:"rgba(248,113,113,0.07)", color:"#f87171", fontSize:13, marginBottom:22 }}>
          Failed to load. Check backend and retry.
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="settlements-cards" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
        {CARDS.map(card => (
          <div key={card.label} style={{ padding:"18px 20px", borderRadius:14, border:`1px solid ${card.color}22`, background:`linear-gradient(145deg, rgba(2,12,32,0.9), rgba(2,12,32,0.6))`, boxShadow:`0 0 24px ${card.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, right:0, width:80, height:80, borderRadius:"50%", background:card.glow, filter:"blur(28px)", transform:"translate(20px,-20px)", pointerEvents:"none" }} />
            <div style={{ padding:"7px", borderRadius:9, background:`${card.color}1a`, color:card.color, display:"inline-flex", marginBottom:12 }}>
              {card.icon}
            </div>
            <div style={{ fontSize:22, fontWeight:800, color:card.color, lineHeight:1.1, marginBottom:3, fontVariantNumeric:"tabular-nums" }}>
              {loading ? <span style={{ opacity:0.25 }}>—</span> : card.value}
            </div>
            <div style={{ fontSize:11.5, fontWeight:600, color:"rgba(255,255,255,0.68)", marginBottom:2 }}>{card.label}</div>
            <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.28)" }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:"flex", gap:2, borderBottom:"1px solid rgba(212,175,55,0.1)", marginBottom:0 }}>
        {TABS.map((t,i) => {
          const count = [filteredDues, filteredRides, filteredEarnings][i].length;
          const active = tab === i;
          return (
            <button key={t} onClick={() => tabClick(i)} style={{ padding:"10px 20px", border:"none", background:"none", cursor:"pointer", fontFamily:"Outfit,sans-serif", fontSize:13, fontWeight:600, color:active?"#D4AF37":"rgba(255,255,255,0.42)", borderBottom:`2px solid ${active?"#D4AF37":"transparent"}`, marginBottom:-1, transition:"all .18s", display:"flex", alignItems:"center", gap:7 }}>
              {t}
              <span style={{ padding:"1px 7px", borderRadius:20, fontSize:10, fontWeight:700, background:active?"rgba(212,175,55,0.18)":"rgba(255,255,255,0.07)", color:active?"#D4AF37":"rgba(255,255,255,0.35)" }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display:"flex", gap:10, alignItems:"center", padding:"14px 0 12px", flexWrap:"wrap" }}>
        {tab === 0 && (
          <SearchBar value={s0} onChange={setS0} placeholder="Search by name or phone…" />
        )}
        {tab === 1 && (
          <SearchBar value={s1} onChange={setS1} placeholder="Ride #, driver or passenger…" />
        )}
        {tab === 2 && (<>
          <SearchBar value={s2} onChange={setS2} placeholder="Ride #, driver or passenger…" />
          <select className="stl-sel" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="">All Status</option>
            <option value="held">Held (Cash)</option>
            <option value="earned">Earned (Online)</option>
            <option value="settled">Settled</option>
          </select>
        </>)}
        {(tab === 0 ? s0 : tab === 1 ? s1 : s2 || statusF) && (
          <span style={{ fontSize:11.5, color:"rgba(255,255,255,0.32)", marginLeft:4 }}>
            {[filteredDues, filteredRides, filteredEarnings][tab].length} result(s)
          </span>
        )}
      </div>

      {/* ── Table card ── */}
      <div style={{ borderRadius:14, border:"1px solid rgba(212,175,55,0.1)", background:"rgba(2,12,32,0.55)", overflow:"hidden" }}>

        {/* ── Tab 0: Cash Dues ── */}
        {tab === 0 && (
          filteredDues.length === 0 && !loading
            ? <EmptyState icon={s0 ? "🔍" : "✅"} msg={s0 ? "No drivers match your search" : "No drivers with pending cash dues"} />
            : <>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr>
                    <TH c="#" /><TH c="Driver" /><TH c="Phone" /><TH c="GO ID" />
                    <TH c="Pending Amount" right /><TH c="Total Collected" right /><TH c="Total Deposited" right />
                    <TH c="Cash Limit" right /><TH c="Limit Status" /><TH c="Due Date" />
                  </tr></thead>
                  {loading
                    ? <Skeleton cols={10} />
                    : <tbody>
                      {pageD.map((row, idx) => (
                        <tr key={row.driver_id} className="stl-row" onClick={() => setSelected({ row, type:0 })} style={{ transition:"background .15s" }}>
                          <TD style={{ color:"rgba(255,255,255,0.28)", fontSize:11, width:36 }}>{p0*LIMIT+idx+1}</TD>
                          <TD style={{ fontWeight:600, color:"rgba(255,255,255,0.9)" }}>
                            <div>{row.driver_name || "—"}</div>
                          </TD>
                          <TD style={{ color:"rgba(255,255,255,0.48)", fontSize:12 }}>{row.driver_phone || "—"}</TD>
                          <TD style={{ color:"rgba(212,175,55,0.6)", fontSize:11, fontFamily:"monospace" }}>{row.go_id || "—"}</TD>
                          <TD right><span style={{ fontWeight:700, color:"#f59e0b", fontVariantNumeric:"tabular-nums" }}>{fmt(row.pending_amount)}</span></TD>
                          <TD right style={{ fontVariantNumeric:"tabular-nums" }}>{fmt(row.total_cash_collected)}</TD>
                          <TD right style={{ color:"#4ade80", fontVariantNumeric:"tabular-nums" }}>{fmt(row.total_deposited)}</TD>
                          <TD right style={{ color:"rgba(255,255,255,0.4)", fontVariantNumeric:"tabular-nums", fontSize:12 }}>{fmt(row.cash_limit)}</TD>
                          <TD>
                            {row.is_limit_exceeded
                              ? <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:20, background:"rgba(248,113,113,0.13)", border:"1px solid rgba(248,113,113,0.3)", color:"#f87171", fontSize:11, fontWeight:700 }}>⚠ Exceeded</span>
                              : <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:20, background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", color:"#4ade80", fontSize:11, fontWeight:600 }}>OK</span>
                            }
                          </TD>
                          <TD style={{ color:"rgba(255,255,255,0.38)", fontSize:11.5 }}>{row.deposit_due_date ? fmtDT(row.deposit_due_date) : "—"}</TD>
                        </tr>
                      ))}
                    </tbody>
                  }
                </table>
              </div>
              {!loading && <PagerBar page={p0} total={filteredDues.length} limit={LIMIT} onChange={setP0} />}
            </>
        )}

        {/* ── Tab 1: Unsettled Rides ── */}
        {tab === 1 && (
          filteredRides.length === 0 && !loading
            ? <EmptyState icon={s1 ? "🔍" : "✅"} msg={s1 ? "No rides match your search" : "No unsettled cash rides"} />
            : <>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr>
                    <TH c="#" /><TH c="Ride #" /><TH c="Vehicle" /><TH c="Passenger" /><TH c="Driver" />
                    <TH c="Method" /><TH c="Status" /><TH c="Total Fare" right /><TH c="Driver Earned" right /><TH c="Platform" right /><TH c="Completed" />
                  </tr></thead>
                  {loading
                    ? <Skeleton cols={11} />
                    : <tbody>
                      {pageR.map((row, idx) => (
                        <tr key={row.id} className="stl-row" onClick={() => setSelected({ row, type:1 })} style={{ transition:"background .15s" }}>
                          <TD style={{ color:"rgba(255,255,255,0.28)", fontSize:11, width:36 }}>{p1*LIMIT+idx+1}</TD>
                          <TD style={{ fontWeight:700, color:"#D4AF37", fontSize:12, fontFamily:"monospace" }}>{row.ride_number || `#${row.id}`}</TD>
                          <TD><Badge label={row.vehicle_type} map={Object.fromEntries(Object.entries(VEHICLE_C).map(([k,v])=>[k,{...v,bg:v.color+"1a",border:v.color+"44"}]))} /></TD>
                          <TD>
                            <div style={{ fontWeight:600, fontSize:12.5, color:"rgba(255,255,255,0.85)" }}>{row.passenger_name || "—"}</div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:1 }}>{row.passenger_phone}</div>
                          </TD>
                          <TD>
                            <div style={{ fontWeight:600, fontSize:12.5, color:"rgba(255,255,255,0.85)" }}>{row.driver_name || "—"}</div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:1 }}>{row.driver_phone}</div>
                          </TD>
                          <TD><Badge label={row.payment_method} map={PAY_C} /></TD>
                          <TD><Badge label={row.payment_status} map={STATUS_C} /></TD>
                          <TD right><span style={{ fontWeight:700, fontVariantNumeric:"tabular-nums", color:"rgba(255,255,255,0.9)" }}>{fmt(row.final_fare)}</span></TD>
                          <TD right style={{ color:"#4ade80", fontVariantNumeric:"tabular-nums", fontWeight:600 }}>{fmt(row.driver_net_earnings)}</TD>
                          <TD right style={{ color:"#a78bfa", fontVariantNumeric:"tabular-nums", fontWeight:600 }}>{fmt(row.platform_share)}</TD>
                          <TD style={{ color:"rgba(255,255,255,0.35)", fontSize:11.5 }}>{fmtDT(row.completed_at)}</TD>
                        </tr>
                      ))}
                    </tbody>
                  }
                </table>
              </div>
              {!loading && <PagerBar page={p1} total={filteredRides.length} limit={LIMIT} onChange={setP1} />}
            </>
        )}

        {/* ── Tab 2: Company Earnings ── */}
        {tab === 2 && (
          filteredEarnings.length === 0 && !loading
            ? <EmptyState icon={s2 || statusF ? "🔍" : "📊"} msg={s2 || statusF ? "No records match your filter" : "No company earnings records"} />
            : <>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr>
                    <TH c="#" /><TH c="Ride #" /><TH c="Vehicle" /><TH c="Driver" /><TH c="Passenger" />
                    <TH c="Method" /><TH c="Status" /><TH c="Gross Fare" right /><TH c="Platform Fee" right /><TH c="GST" right /><TH c="Net Driver" right /><TH c="Completed" />
                  </tr></thead>
                  {loading
                    ? <Skeleton cols={12} />
                    : <tbody>
                      {pageE.map((row, idx) => (
                        <tr key={`${row.ride_id}-${idx}`} className="stl-row" onClick={() => setSelected({ row, type:2 })} style={{ transition:"background .15s" }}>
                          <TD style={{ color:"rgba(255,255,255,0.28)", fontSize:11, width:36 }}>{p2*LIMIT+idx+1}</TD>
                          <TD style={{ fontWeight:700, color:"#D4AF37", fontSize:12, fontFamily:"monospace" }}>{row.ride_number || `#${row.ride_id}`}</TD>
                          <TD><Badge label={row.vehicle_type} map={Object.fromEntries(Object.entries(VEHICLE_C).map(([k,v])=>[k,{...v,bg:v.color+"1a",border:v.color+"44"}]))} /></TD>
                          <TD>
                            <div style={{ fontWeight:600, fontSize:12.5, color:"rgba(255,255,255,0.85)" }}>{row.driver_name || "—"}</div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:1 }}>{row.driver_phone}</div>
                          </TD>
                          <TD>
                            <div style={{ fontSize:12.5, color:"rgba(255,255,255,0.72)" }}>{row.passenger_name || "—"}</div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,0.32)", marginTop:1 }}>{row.passenger_phone}</div>
                          </TD>
                          <TD><Badge label={row.payment_method} map={PAY_C} /></TD>
                          <TD><Badge label={row.status} map={STATUS_C} /></TD>
                          <TD right style={{ fontVariantNumeric:"tabular-nums" }}>{fmt(row.gross_fare)}</TD>
                          <TD right><span style={{ color:"#a78bfa", fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{fmt(row.platform_fee)}</span></TD>
                          <TD right style={{ color:"rgba(255,255,255,0.4)", fontSize:12, fontVariantNumeric:"tabular-nums" }}>{fmt(row.gst_on_fee)}</TD>
                          <TD right style={{ color:"#4ade80", fontWeight:600, fontVariantNumeric:"tabular-nums" }}>{fmt(row.net_to_driver)}</TD>
                          <TD style={{ color:"rgba(255,255,255,0.35)", fontSize:11.5 }}>{fmtDT(row.completed_at)}</TD>
                        </tr>
                      ))}
                    </tbody>
                  }
                </table>
              </div>
              {!loading && <PagerBar page={p2} total={filteredEarnings.length} limit={LIMIT} onChange={setP2} />}
            </>
        )}
      </div>

      {/* Detail modal */}
      {selected && <DetailModal row={selected.row} type={selected.type} onClose={() => setSelected(null)} />}
    </div>
  );
}
