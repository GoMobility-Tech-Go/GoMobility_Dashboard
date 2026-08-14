import { useState, useEffect, useCallback, useRef } from "react";
import { X, RefreshCw, Search, ChevronRight } from "lucide-react";
import { getInvoices } from "../../api/admin";
import { Pagination } from "../../components/ui/index.jsx";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt   = (n) => (n != null && n !== "" && !isNaN(Number(n))) ? "₹" + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(Number(n)) : "—";
const fmtD  = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtKm = (n) => (n != null && Number(n) > 0) ? `${Number(n).toFixed(1)} km` : "—";
const fmtMin = (n) => (n != null && Number(n) > 0) ? `${n} min` : "—";
const pos   = (n) => Number(n || 0) > 0;

const LIMIT = 20;

// vehicle types — migration 062 expanded to 6
const VEHICLE_TYPES = [
  { value: "",        label: "All Vehicles" },
  { value: "bike",    label: "Bike" },
  { value: "auto",    label: "Auto" },
  { value: "car",     label: "Car" },
  { value: "xl",      label: "XL" },
  { value: "premium", label: "Premium" },
  { value: "luxury",  label: "Luxury" },
];

// payment methods — from rides CHECK constraint
const PAY_METHODS = [
  { value: "",       label: "All Payments" },
  { value: "cash",   label: "Cash" },
  { value: "wallet", label: "Wallet" },
  { value: "upi",    label: "UPI" },
  { value: "card",   label: "Card" },
  { value: "qr",     label: "QR" },
];

const VEHICLE_COLORS = {
  bike:    { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)"  },
  auto:    { color: "#34D399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)"  },
  car:     { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)"  },
  xl:      { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)" },
  premium: { color: "#D4AF37", bg: "rgba(212,175,55,0.12)",  border: "rgba(212,175,55,0.3)"  },
  luxury:  { color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)" },
};
const PAY_COLORS = {
  cash:   { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)"  },
  wallet: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)"  },
  upi:    { color: "#34D399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)"  },
  card:   { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)" },
  qr:     { color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)" },
};

const Chip = ({ label, map, fallback }) => {
  const k = (label || "").toLowerCase();
  const s = map[k] || fallback || { color: "rgba(255,255,255,0.5)", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)" };
  return (
    <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: "capitalize", whiteSpace: "nowrap" }}>
      {label || "—"}
    </span>
  );
};

// ── Modal ─────────────────────────────────────────────────────────────────────
function InvoiceModal({ inv, onClose }) {
  if (!inv) return null;

  const passengerPaid = Number(inv.passenger_total || inv.passenger_total_rides || inv.final_fare || inv.actual_fare || 0);
  const driverEarned  = Number(inv.driver_net_earnings || 0);
  const companyEarned = Number(inv.company_total || inv.platform_share || 0);

  // Use settled rides-table values for accurate fare components (same fix as rideInvoiceService)
  const corrBaseFare  = parseFloat(inv.ride_base_fare  || inv.ri_base_fare  || 0);
  const corrTimeFare  = parseFloat(inv.ride_time_fare  || inv.ri_time_fare  || 0);
  const fareBeforeGst = parseFloat(inv.fare_before_gst || 0);
  const corrDistFare  = fareBeforeGst > 0
    ? Math.max(0, parseFloat((fareBeforeGst - corrBaseFare - corrTimeFare).toFixed(2)))
    : parseFloat(inv.ri_distance_fare || 0);

  const BRow = ({ label, value, color, minus, sub, dim }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
        <div style={{ fontSize: 12, color: dim ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 1 }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: color || (dim ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.82)"), fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        {minus ? "− " : ""}{value}
      </span>
    </div>
  );

  const ColTotal = ({ label, value, color, border }) => (
    <div style={{ marginTop: 8, paddingTop: 7, borderTop: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "Cinzel,serif", fontVariantNumeric: "tabular-nums" }}>{fmt(value)}</span>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(1,9,23,0.88)", backdropFilter: "blur(10px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={onClose}>
      <div style={{ background: "linear-gradient(160deg,#020e24 0%,#031525 100%)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 22, width: "100%", maxWidth: 940, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                <span style={{ fontFamily: "Cinzel,serif", fontSize: 16, fontWeight: 700, color: "#fff" }}>
                  {inv.invoice_number || `INV-${inv.ride_id}`}
                </span>
                {inv.ride_number && (
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(212,175,55,0.65)", background: "rgba(212,175,55,0.08)", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(212,175,55,0.15)" }}>
                    {inv.ride_number}
                  </span>
                )}
                {inv.is_free_ride && <span style={{ fontSize: 9.5, background: "rgba(52,211,153,0.15)", color: "#34D399", border: "1px solid rgba(52,211,153,0.28)", borderRadius: 10, padding: "2px 8px", fontWeight: 700 }}>FREE</span>}
                {inv.is_peak      && <span style={{ fontSize: 9.5, background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.28)", borderRadius: 10, padding: "2px 8px", fontWeight: 700 }}>PEAK</span>}
                {inv.is_scheduled && <span style={{ fontSize: 9.5, background: "rgba(96,165,250,0.15)",  color: "#60a5fa", border: "1px solid rgba(96,165,250,0.28)",  borderRadius: 10, padding: "2px 8px", fontWeight: 700 }}>SCHEDULED</span>}
                {Number(inv.surge_multiplier) > 1 && <span style={{ fontSize: 9.5, color: "#f59e0b", fontWeight: 700 }}>×{Number(inv.surge_multiplier).toFixed(1)} surge</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.32)" }}>{fmtD(inv.completed_at)}</span>
                <Chip label={inv.vehicle_type} map={VEHICLE_COLORS} />
                <Chip label={inv.payment_method} map={PAY_COLORS} />
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)", flexShrink: 0 }}>
              <X size={13} />
            </button>
          </div>

          {/* Route */}
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.12)", borderRadius: 8, padding: "7px 12px", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#34D399", flexShrink: 0, marginTop: 3 }} />
              <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{inv.pickup_address || "—"}</span>
            </div>
            <div style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.12)", borderRadius: 8, padding: "7px 12px", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#f87171", flexShrink: 0, marginTop: 3 }} />
              <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{inv.dropoff_address || "—"}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>📏 <span style={{ color: "rgba(255,255,255,0.6)" }}>{fmtKm(inv.distance_km)}</span></span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>⏱ <span style={{ color: "rgba(255,255,255,0.6)" }}>{fmtMin(inv.duration_minutes)}</span></span>
            {inv.locked_is_subscribed && <span style={{ fontSize: 11, color: "#D4AF37" }}>⭐ {inv.locked_subscriber_tier || "Subscriber"}</span>}
          </div>
        </div>

        {/* ── 3 stream totals ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", flexShrink: 0 }}>
          {[
            { label: "Passenger Paid", value: passengerPaid, color: "#60a5fa", bg: "rgba(96,165,250,0.07)",  icon: "👤" },
            { label: "Driver Earned",  value: driverEarned,  color: "#34D399", bg: "rgba(52,211,153,0.07)",  icon: "🚗" },
            { label: "Company",        value: companyEarned, color: "#D4AF37", bg: "rgba(212,175,55,0.07)",  icon: "🏢" },
          ].map(({ label, value, color, bg, icon }, i) => (
            <div key={label} style={{ padding: "12px 18px", background: bg, borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 3 }}>{icon} {label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "Cinzel,serif", fontVariantNumeric: "tabular-nums" }}>{fmt(value)}</div>
            </div>
          ))}
        </div>

        {/* ── 3 column breakdown ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", flex: 1, minHeight: 0 }}>

          {/* Passenger */}
          <div style={{ borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "10px 16px 6px", borderBottom: "1px solid rgba(96,165,250,0.1)", flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "1px" }}>Fare Breakdown</span>
            </div>
            <div style={{ padding: "4px 16px 12px", overflowY: "auto", flex: 1 }}>
              {pos(corrBaseFare)                 && <BRow label="Base Fare"             value={fmt(corrBaseFare)} />}
              {pos(corrDistFare)                 && <BRow label="Distance Charge"       value={fmt(corrDistFare)} />}
              {pos(corrTimeFare)                 && <BRow label="Time Charge"           value={fmt(corrTimeFare)} />}
              {pos(inv.ri_surge_charge)          && <BRow label="Surge Charge"          value={fmt(inv.ri_surge_charge)} sub={`×${Number(inv.surge_multiplier||1).toFixed(1)} surge`} />}
              {pos(inv.ri_waiting_charges)       && <BRow label="Waiting Charges"       value={fmt(inv.ri_waiting_charges)} />}
              {pos(inv.ri_toll_charges)          && <BRow label="Toll Charges"          value={fmt(inv.ri_toll_charges)} />}
              {pos(inv.ri_convenience_fee)       && <BRow label="Convenience Fee"       value={fmt(inv.ri_convenience_fee)} />}
              {pos(inv.ri_tip_amount)            && <BRow label="Tip"                   value={fmt(inv.ri_tip_amount)} />}
              {pos(inv.ri_tax_amount)            && <BRow label={`GST (${inv.ri_tax_percent || 5}%)`} value={fmt(inv.ri_tax_amount)} />}
              {pos(inv.ri_coupon_discount)       && <BRow label="Coupon Discount"       value={fmt(inv.ri_coupon_discount)}       color="#34D399" minus />}
              {inv.coupon_code                   && <BRow label="Coupon Code"           value={inv.coupon_code}                   color="#34D399" />}
              {pos(inv.ri_subscription_discount) && <BRow label="Subscription Discount" value={fmt(inv.ri_subscription_discount)} color="#34D399" minus />}
              {pos(inv.ri_discount_amount)       && <BRow label="Other Discount"        value={fmt(inv.ri_discount_amount)}       color="#34D399" minus />}
              <ColTotal label="Total Paid" value={passengerPaid} color="#60a5fa" border="rgba(96,165,250,0.2)" />
            </div>
          </div>

          {/* Driver */}
          <div style={{ borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "10px 16px 6px", borderBottom: "1px solid rgba(52,211,153,0.1)", flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#34D399", textTransform: "uppercase", letterSpacing: "1px" }}>Driver Earnings</span>
            </div>
            <div style={{ padding: "4px 16px 12px", overflowY: "auto", flex: 1 }}>
              <BRow label="Trip Fare"               value={fmt(inv.actual_fare)} />
              {pos(inv.ri_waiting_charges)     && <BRow label="Waiting Bonus"          value={fmt(inv.ri_waiting_charges)} />}
              {pos(inv.ri_tip_amount)          && <BRow label="Tip Received"           value={fmt(inv.ri_tip_amount)} />}
              {pos(inv.ce_gst_on_ride_fare)    && <BRow label="Ride GST (5%)"          value={fmt(inv.ce_gst_on_ride_fare)}    color="#f87171" minus sub="collected → govt" />}
              {pos(inv.ce_gst_on_conv_fee)     && <BRow label="Conv GST (18%)"         value={fmt(inv.ce_gst_on_conv_fee)}     color="#f87171" minus sub="collected → govt" />}
              <BRow label="Platform Fee Deducted"  value={fmt(inv.platform_share)}                                             color="#f87171" minus />
              {pos(inv.ce_gst_on_platform_fee) && <BRow label="Platform GST (18%)"     value={fmt(inv.ce_gst_on_platform_fee)} color="#f87171" minus sub="on platform fee → govt" />}
              {pos(inv.pickup_compensation)    && <BRow label="Pickup Compensation"    value={fmt(inv.pickup_compensation)}    color="#34D399" />}
              <ColTotal label="Net Earnings" value={driverEarned} color="#34D399" border="rgba(52,211,153,0.2)" />
            </div>
          </div>

          {/* Company */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "10px 16px 6px", borderBottom: "1px solid rgba(212,175,55,0.1)", flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#D4AF37", textTransform: "uppercase", letterSpacing: "1px" }}>Company Revenue</span>
            </div>
            <div style={{ padding: "4px 16px 12px", overflowY: "auto", flex: 1 }}>
              <BRow label="Platform Share" value={fmt(inv.company_total)} color="#D4AF37" />
              {(pos(inv.ce_gst_on_ride_fare) || pos(inv.ce_gst_on_conv_fee) || pos(inv.ce_gst_on_platform_fee)) && (
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.22)", textTransform: "uppercase", letterSpacing: "0.7px", margin: "8px 0 2px" }}>GST collected → Govt</div>
              )}
              {pos(inv.ce_gst_on_ride_fare)    && <BRow label="Ride GST (5%)"      value={fmt(inv.ce_gst_on_ride_fare)}    dim sub="from passenger" />}
              {pos(inv.ce_gst_on_conv_fee)     && <BRow label="Conv GST (18%)"     value={fmt(inv.ce_gst_on_conv_fee)}     dim sub="from passenger" />}
              {pos(inv.ce_gst_on_platform_fee) && <BRow label="Platform GST (18%)" value={fmt(inv.ce_gst_on_platform_fee)} dim sub="from driver" />}
              <ColTotal label="Revenue" value={companyEarned} color="#D4AF37" border="rgba(212,175,55,0.2)" />
            </div>
          </div>
        </div>

        {/* ── Footer: People + Payment ── */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, flexShrink: 0, background: "rgba(0,0,0,0.2)" }}>
          {[
            { title: "Passenger", name: inv.passenger_name, phone: inv.passenger_phone, extra: inv.locked_is_subscribed ? `⭐ ${inv.locked_subscriber_tier || "Subscriber"}` : null },
            { title: "Driver",    name: inv.driver_name,    phone: inv.driver_phone },
          ].map(({ title, name, phone, extra }) => (
            <div key={title} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 12px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.82)" }}>{name || "—"}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", marginTop: 1 }}>{phone || "—"}</div>
              {extra && <div style={{ fontSize: 10, color: "#D4AF37", marginTop: 3 }}>{extra}</div>}
            </div>
          ))}
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 12px", border: "1px solid rgba(255,255,255,0.06)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px" }}>
            {[
              ["Status",    (inv.ride_payment_status || inv.payment_status || "—").replace(/_/g, " ")],
              ["Paid At",   fmtD(inv.paid_at)],
              ["Invoice",   inv.invoice_number || "—"],
              ["Started",   fmtD(inv.started_at)],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)" }}>{l}</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)", fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InvoicePage() {
  const [invoices, setInvoices]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [offset, setOffset]       = useState(0);
  const [vehicleType, setVehicle] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [startDate, setStart]     = useState("");
  const [endDate, setEnd]         = useState("");
  const [search, setSearch]       = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [toast, setToast]         = useState(null);
  const searchTimer = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: LIMIT, offset };
    if (vehicleType) params.vehicle_type   = vehicleType;
    if (payMethod)   params.payment_method = payMethod;
    if (startDate)   params.start_date     = startDate;
    if (endDate)     params.end_date       = endDate;
    if (search)      params.search         = search;
    getInvoices(params)
      .then(res => {
        const d = res.data?.data || res.data || {};
        setInvoices(d.invoices || d.data || []);
        setTotal(d.pagination?.total || d.total || 0);
      })
      .catch(() => showToast("Failed to load invoices."))
      .finally(() => setLoading(false));
  }, [vehicleType, payMethod, startDate, endDate, search, offset]);

  useEffect(() => { load(); }, [load]);

  const handleSearchChange = (v) => {
    setSearchInput(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(v); setOffset(0); }, 450);
  };

  const clearAll = () => { setVehicle(""); setPayMethod(""); setStart(""); setEnd(""); setSearch(""); setSearchInput(""); setOffset(0); };
  const hasFilter = vehicleType || payMethod || startDate || endDate || search;

  const totalPages  = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const selStyle = { height: 38, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 9, padding: "0 12px", color: "rgba(255,255,255,0.8)", fontSize: 13, outline: "none", fontFamily: "Outfit,sans-serif", cursor: "pointer" };
  const TH = ({ c }) => <th style={{ padding: "11px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "rgba(212,175,55,0.7)", letterSpacing: "1px", textTransform: "uppercase", borderBottom: "1px solid rgba(212,175,55,0.1)", whiteSpace: "nowrap" }}>{c}</th>;
  const TD = ({ children, style }) => <td style={{ padding: "12px 14px", fontSize: 13, color: "rgba(255,255,255,0.8)", borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "middle", ...style }}>{children}</td>;

  // Page-level aggregates for summary cards
  const agg = invoices.reduce((acc, r) => {
    acc.passenger += Number(r.passenger_total || r.passenger_total_rides || r.final_fare || 0);
    acc.driver    += Number(r.driver_net_earnings || 0);
    acc.company   += Number(r.company_total || r.platform_share || 0);
    return acc;
  }, { passenger: 0, driver: 0, company: 0 });

  return (
    <div style={{ fontFamily: "Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:.42}}`}</style>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#7f1d1d", border: "1px solid #ef4444", borderRadius: 12, padding: "12px 20px", color: "#fff", fontSize: 13, display: "flex", gap: 12, alignItems: "center", boxShadow: "0 8px 32px rgba(0,0,0,.4)" }}>
          <span style={{ flex: 1 }}>{toast}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.6)", cursor: "pointer" }}><X size={14} /></button>
        </div>
      )}

      {selected && <InvoiceModal inv={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "Cinzel,serif", fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Ride Invoices</h1>
          <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13, marginTop: 4 }}>Per-ride breakdown — passenger paid · driver earned · company earned</p>
        </div>
        <button onClick={load} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", background: "rgba(212,175,55,.08)", border: "1px solid rgba(212,175,55,.2)", borderRadius: 10, color: "#D4AF37", fontSize: 13, cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      {!loading && invoices.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 12, marginBottom: 18 }}>
          {[
            { label: "Passenger Paid",   value: agg.passenger, color: "#60a5fa", icon: "👤", sub: "this page total" },
            { label: "Driver Earned",    value: agg.driver,    color: "#34D399", icon: "🚗", sub: "net after deductions" },
            { label: "Company Revenue",  value: agg.company,   color: "#D4AF37", icon: "🏢", sub: "platform + GST" },
            { label: "Rides on Page",    value: null, count: invoices.length, color: "#a78bfa", icon: "📋", sub: `${total.toLocaleString("en-IN")} total` },
          ].map(({ label, value, count, color, icon, sub }) => (
            <div key={label} style={{ background: `${color}10`, border: `1px solid ${color}22`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,.38)", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</span>
                <span style={{ fontSize: 14 }}>{icon}</span>
              </div>
              <div style={{ fontSize: count != null ? 22 : 18, fontWeight: 800, color, fontFamily: "Cinzel,serif", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                {count != null ? count : ("₹" + new Intl.NumberFormat("en-IN").format(Math.round(value)))}
              </div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.3)", marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", minWidth: 220 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,.35)" }} />
          <input
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Passenger, driver, ride #, invoice #…"
            style={{ ...selStyle, paddingLeft: 30, width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <select value={vehicleType} onChange={e => { setVehicle(e.target.value); setOffset(0); }} style={selStyle}>
          {VEHICLE_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>

        <select value={payMethod} onChange={e => { setPayMethod(e.target.value); setOffset(0); }} style={selStyle}>
          {PAY_METHODS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>

        <input type="date" value={startDate} onChange={e => { setStart(e.target.value); setOffset(0); }} style={selStyle} />
        <input type="date" value={endDate}   onChange={e => { setEnd(e.target.value);   setOffset(0); }} style={selStyle} />

        {hasFilter && (
          <button onClick={clearAll} style={{ height: 38, padding: "0 14px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 9, color: "#f87171", fontSize: 12, cursor: "pointer" }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(212,175,55,.1)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", borderBottom: "1px solid rgba(212,175,55,.08)" }}>
          <div style={{ fontFamily: "Cinzel,serif", fontSize: 13, fontWeight: 600, color: "#fff" }}>Completed Rides</div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>{total.toLocaleString("en-IN")} total</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
            <thead>
              <tr>
                {["Invoice #", "Ride #", "Date", "Passenger", "Driver", "Vehicle", "Type", "Distance", "Payment", "Passenger Paid", "Driver Earned", "Company", ""].map(c => <TH key={c} c={c} />)}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(8).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={13}><div style={{ height: 44, background: "rgba(255,255,255,.03)", margin: "3px 0", borderRadius: 6, animation: "gmPulse 1.5s ease-in-out infinite" }} /></td></tr>
                  ))
                : invoices.length === 0
                  ? <tr><td colSpan={13} style={{ padding: 52, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13 }}>No invoices found</td></tr>
                  : invoices.map((inv, idx) => {
                      const passenger = Number(inv.passenger_total || inv.passenger_total_rides || inv.final_fare || 0);
                      const driver    = Number(inv.driver_net_earnings || 0);
                      const company   = Number(inv.company_total || inv.platform_share || 0);
                      return (
                        <tr key={inv.ride_id || idx}
                          onClick={() => setSelected(inv)}
                          style={{ cursor: "pointer" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(212,175,55,.04)"}
                          onMouseLeave={e => e.currentTarget.style.background = ""}>
                          <TD>
                            <span style={{ color: "rgba(212,175,55,.7)", fontFamily: "monospace", fontSize: 11 }}>{inv.invoice_number || `INV-${inv.ride_id}`}</span>
                          </TD>
                          <TD>
                            <span style={{ color: "rgba(255,255,255,.4)", fontFamily: "monospace", fontSize: 11 }}>{inv.ride_number || "—"}</span>
                          </TD>
                          <TD style={{ fontSize: 11.5, color: "rgba(255,255,255,.42)", whiteSpace: "nowrap" }}>
                            {fmtD(inv.completed_at)}
                          </TD>
                          <TD>
                            <div style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{inv.passenger_name || "—"}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 1 }}>{inv.passenger_phone}</div>
                          </TD>
                          <TD>
                            <div style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{inv.driver_name || "—"}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 1 }}>{inv.driver_phone}</div>
                          </TD>
                          <TD>
                            <Chip label={inv.vehicle_type} map={VEHICLE_COLORS} />
                          </TD>
                          <TD>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              {inv.is_peak      && <span style={{ fontSize: 9.5, color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.28)", borderRadius: 10, padding: "2px 8px", fontWeight: 700, whiteSpace: "nowrap", display: "inline-block" }}>PEAK</span>}
                              {inv.is_scheduled && <span style={{ fontSize: 9.5, color: "#60a5fa", background: "rgba(96,165,250,0.12)",  border: "1px solid rgba(96,165,250,0.28)",  borderRadius: 10, padding: "2px 8px", fontWeight: 700, whiteSpace: "nowrap", display: "inline-block" }}>SCHED</span>}
                              {inv.is_free_ride && <span style={{ fontSize: 9.5, color: "#34D399", background: "rgba(52,211,153,0.12)",  border: "1px solid rgba(52,211,153,0.28)",  borderRadius: 10, padding: "2px 8px", fontWeight: 700, whiteSpace: "nowrap", display: "inline-block" }}>FREE</span>}
                              {!inv.is_peak && !inv.is_scheduled && !inv.is_free_ride && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>—</span>}
                            </div>
                          </TD>
                          <TD style={{ fontSize: 12, color: "rgba(255,255,255,.5)", whiteSpace: "nowrap" }}>
                            {fmtKm(inv.distance_km)} · {fmtMin(inv.duration_minutes)}
                          </TD>
                          <TD><Chip label={inv.payment_method} map={PAY_COLORS} /></TD>
                          <TD>
                            <span style={{ fontWeight: 700, color: "#60a5fa", fontVariantNumeric: "tabular-nums" }}>{fmt(passenger)}</span>
                          </TD>
                          <TD>
                            <span style={{ fontWeight: 700, color: "#34D399", fontVariantNumeric: "tabular-nums" }}>{fmt(driver)}</span>
                          </TD>
                          <TD>
                            <span style={{ fontWeight: 700, color: "#D4AF37", fontVariantNumeric: "tabular-nums" }}>{fmt(company)}</span>
                          </TD>
                          <TD style={{ color: "rgba(255,255,255,.2)" }}>
                            <ChevronRight size={13} />
                          </TD>
                        </tr>
                      );
                    })
              }
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ padding: "12px 18px", borderTop: "1px solid rgba(212,175,55,.08)" }}>
            <Pagination page={currentPage} total={total} perPage={LIMIT} onChange={p => setOffset((p - 1) * LIMIT)} />
          </div>
        )}
      </div>
    </div>
  );
}
