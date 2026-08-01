import { useState, useEffect, useCallback } from "react";
import { X, RefreshCw, ChevronDown } from "lucide-react";
import { getInvoices } from "../../api/admin";
import { Pagination } from "../../components/ui/index.jsx";

const fmt = (n) =>
  n != null && n !== "" ? "₹" + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(Number(n)) : "—";
const fmtD = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtKm = (n) => (n != null ? Number(n).toFixed(1) + " km" : "—");

const LIMIT = 15;

const TH = ({ c }) => (
  <th style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "rgba(212,175,55,0.7)", letterSpacing: "1px", textTransform: "uppercase", borderBottom: "1px solid rgba(212,175,55,0.1)", whiteSpace: "nowrap" }}>
    {c}
  </th>
);
const TD = ({ children, style }) => (
  <td style={{ padding: "13px 14px", fontSize: 13, color: "rgba(255,255,255,0.8)", borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "middle", ...style }}>
    {children}
  </td>
);

const PayBadge = ({ method }) => {
  const m = (method || "").toLowerCase();
  const map = {
    cash:   { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)"  },
    wallet: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)"  },
    upi:    { color: "#34D399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)"  },
    card:   { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)" },
  };
  const s = map[m] || { color: "rgba(255,255,255,0.5)", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)" };
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: "capitalize" }}>
      {method || "—"}
    </span>
  );
};

function InvoiceModal({ inv, onClose }) {
  if (!inv) return null;
  const passenger = Number(inv.passenger_total || inv.actual_fare || 0);
  const driver    = Number(inv.driver_net_earnings || 0);
  const company   = Number(inv.company_total || inv.platform_share || 0);

  const Row = ({ label, value, highlight, color }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: highlight ? 700 : 500, color: color || (highlight ? "#D4AF37" : "rgba(255,255,255,0.85)"), fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );

  const Section = ({ title, color, children }) => (
    <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color}22`, borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
      <div style={{ fontFamily: "Cinzel,serif", fontSize: 12, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(1,9,23,0.85)", backdropFilter: "blur(6px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div style={{ background: "linear-gradient(170deg,#020c20,#030f28)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 18, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", padding: "26px 28px", position: "relative" }}
        onClick={(e) => e.stopPropagation()}>

        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
          <X size={14} />
        </button>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "Cinzel,serif", fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
            Invoice {inv.invoice_number || `#RIDE-${inv.ride_id}`}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
            {fmtD(inv.completed_at || inv.paid_at)} · {inv.vehicle_type || "—"} · <PayBadge method={inv.payment_method} />
          </div>
        </div>

        {/* Route */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34D399", marginTop: 4, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{inv.pickup_address || "—"}</span>
          </div>
          <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)", marginLeft: 3.5, marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f87171", marginTop: 4, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{inv.dropoff_address || "—"}</span>
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Distance: <span style={{ color: "rgba(255,255,255,0.7)" }}>{fmtKm(inv.distance_km)}</span></span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Duration: <span style={{ color: "rgba(255,255,255,0.7)" }}>{inv.duration_minutes ? `${inv.duration_minutes} min` : "—"}</span></span>
          </div>
        </div>

        {/* 3 stream breakdown */}
        <Section title="Passenger Paid" color="#60a5fa">
          <Row label="Base Fare"             value={fmt(inv.base_fare)} />
          <Row label="Distance Charge"       value={fmt(inv.distance_fare)} />
          <Row label="Time Charge"           value={fmt(inv.time_fare)} />
          {Number(inv.surge_charge) > 0   && <Row label="Surge Charge"      value={fmt(inv.surge_charge)} />}
          {Number(inv.waiting_charges) > 0 && <Row label="Waiting Charges"  value={fmt(inv.waiting_charges)} />}
          {Number(inv.convenience_fee) > 0 && <Row label="Convenience Fee"  value={fmt(inv.convenience_fee)} />}
          {Number(inv.gst_on_fare) > 0     && <Row label="GST on Ride (5%)" value={fmt(inv.gst_on_fare)} />}
          {Number(inv.gst_on_conv_fee) > 0 && <Row label="GST on Conv. Fee" value={fmt(inv.gst_on_conv_fee)} />}
          {Number(inv.coupon_discount) > 0  && <Row label="Coupon Discount" value={`- ${fmt(inv.coupon_discount)}`} color="#34D399" />}
          {inv.coupon_code && <Row label="Coupon Code"           value={inv.coupon_code} color="#34D399" />}
          <Row label="Total Paid" value={fmt(passenger)} highlight color="#60a5fa" />
        </Section>

        <Section title="Driver Earned" color="#34D399">
          <Row label="Trip Fare"             value={fmt(inv.actual_fare)} />
          {Number(inv.waiting_charges) > 0   && <Row label="Waiting Bonus"   value={fmt(inv.waiting_charges)} />}
          <Row label="Platform Fee Deducted" value={`- ${fmt(inv.platform_share)}`} color="#f87171" />
          {Number(inv.gst_on_platform_fee) > 0 && <Row label="GST on Platform Fee" value={`- ${fmt(inv.gst_on_platform_fee)}`} color="#f87171" />}
          <Row label="Net Earnings"          value={fmt(driver)} highlight color="#34D399" />
        </Section>

        <Section title="Company Earned" color="#D4AF37">
          {Number(inv.platform_share) > 0    && <Row label="Platform Share"      value={fmt(inv.platform_share)} />}
          {Number(inv.convenience_fee) > 0   && <Row label="Convenience Fee"     value={fmt(inv.convenience_fee)} />}
          {Number(inv.gst_on_platform_fee) > 0 && <Row label="GST on Platform"  value={fmt(inv.gst_on_platform_fee)} />}
          {Number(inv.gst_on_conv_fee) > 0   && <Row label="GST on Conv. Fee"   value={fmt(inv.gst_on_conv_fee)} />}
          <Row label="Total Company Revenue" value={fmt(company)} highlight color="#D4AF37" />
        </Section>

        {/* People */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
          {[
            { label: "Passenger", name: inv.passenger_name, phone: inv.passenger_phone },
            { label: "Driver",    name: inv.driver_name,    phone: inv.driver_phone },
          ].map(({ label, name, phone }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{name || "—"}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{phone || "—"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  const [toast, setToast]         = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: LIMIT, offset };
    if (vehicleType) params.vehicle_type   = vehicleType;
    if (payMethod)   params.payment_method = payMethod;
    if (startDate)   params.start_date     = startDate;
    if (endDate)     params.end_date       = endDate;
    getInvoices(params)
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setInvoices(d.invoices || d.data || []);
        setTotal(d.pagination?.total || d.total || 0);
      })
      .catch(() => showToast("Failed to load invoices."))
      .finally(() => setLoading(false));
  }, [vehicleType, payMethod, startDate, endDate, offset]);

  useEffect(() => { load(); }, [load]);

  const totalPages  = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;
  const hasFilter   = vehicleType || payMethod || startDate || endDate;

  const selStyle = { height: 40, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 10, padding: "0 14px", color: "rgba(255,255,255,0.8)", fontSize: 13, outline: "none", fontFamily: "Outfit,sans-serif", cursor: "pointer" };

  return (
    <div style={{ fontFamily: "Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#7f1d1d", border: "1px solid #ef4444", borderRadius: 12, padding: "12px 20px", color: "#fff", fontSize: 13, display: "flex", gap: 12, alignItems: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          <span style={{ flex: 1 }}>{toast}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}><X size={14} /></button>
        </div>
      )}

      {selected && <InvoiceModal inv={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "Cinzel,serif", fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Ride Invoices</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>Per-ride breakdown — passenger paid, driver earned, company earned</p>
        </div>
        <button onClick={load} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 10, color: "#D4AF37", fontSize: 13, cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
          <RefreshCw size={13} style={{ animation: loading ? "gmSpin 1s linear infinite" : undefined }} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      {!loading && invoices.length > 0 && (() => {
        const totPassenger = invoices.reduce((s, r) => s + Number(r.passenger_total || r.actual_fare || 0), 0);
        const totDriver    = invoices.reduce((s, r) => s + Number(r.driver_net_earnings || 0), 0);
        const totCompany   = invoices.reduce((s, r) => s + Number(r.company_total || r.platform_share || 0), 0);
        const cards = [
          { label: "Passenger Paid",   value: totPassenger, color: "#60a5fa", icon: "👤" },
          { label: "Driver Earned",    value: totDriver,    color: "#34D399", icon: "🚗" },
          { label: "Company Revenue",  value: totCompany,   color: "#D4AF37", icon: "🏢" },
          { label: "Total Rides",      value: null, count: invoices.length, color: "#a78bfa", icon: "📋" },
        ];
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
            {cards.map(({ label, value, count, color, icon }) => (
              <div key={label} style={{ background: `${color}10`, border: `1px solid ${color}22`, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</span>
                  <span style={{ fontSize: 15 }}>{icon}</span>
                </div>
                <div style={{ fontSize: 19, fontWeight: 800, color, fontFamily: "Cinzel,serif", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {count != null ? count + " on page" : "₹" + new Intl.NumberFormat("en-IN").format(Math.round(value))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "Cinzel,serif" }}>Filter:</span>
        <select value={vehicleType} onChange={(e) => { setVehicle(e.target.value); setOffset(0); }} style={selStyle}>
          <option value="">All Vehicles</option>
          <option value="auto">Auto</option>
          <option value="bike">Bike</option>
          <option value="cab">Cab</option>
        </select>
        <select value={payMethod} onChange={(e) => { setPayMethod(e.target.value); setOffset(0); }} style={selStyle}>
          <option value="">All Payments</option>
          <option value="cash">Cash</option>
          <option value="wallet">Wallet</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
        </select>
        <input type="date" value={startDate} onChange={(e) => { setStart(e.target.value); setOffset(0); }} style={selStyle} />
        <input type="date" value={endDate}   onChange={(e) => { setEnd(e.target.value); setOffset(0); }}   style={selStyle} />
        {hasFilter && (
          <button onClick={() => { setVehicle(""); setPayMethod(""); setStart(""); setEnd(""); setOffset(0); }} style={{ height: 40, padding: "0 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, color: "#f87171", fontSize: 12, cursor: "pointer" }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(212,175,55,0.08)" }}>
          <div style={{ fontFamily: "Cinzel,serif", fontSize: 13, fontWeight: 600, color: "#fff" }}>Completed Rides</div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{total.toLocaleString("en-IN")} total records</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                {["Invoice #", "Date", "Passenger", "Driver", "Vehicle", "Distance", "Payment", "Passenger Paid", "Driver Earned", "Company Earned", ""].map((c) => (
                  <TH key={c} c={c} />
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(8).fill(0).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={11}>
                        <div style={{ height: 46, background: "rgba(255,255,255,0.03)", margin: "3px 0", borderRadius: 6, animation: "gmPulse 1.5s ease-in-out infinite" }} />
                      </td>
                    </tr>
                  ))
                : invoices.length === 0
                  ? <tr><td colSpan={11} style={{ padding: 52, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No invoices found</td></tr>
                  : invoices.map((inv, idx) => {
                      const passenger = Number(inv.passenger_total || inv.actual_fare || 0);
                      const driver    = Number(inv.driver_net_earnings || 0);
                      const company   = Number(inv.company_total || inv.platform_share || 0);
                      return (
                        <tr key={inv.ride_id || idx}
                          onClick={() => setSelected(inv)}
                          style={{ cursor: "pointer" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(212,175,55,0.04)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                          <TD>
                            <span style={{ color: "rgba(212,175,55,0.7)", fontFamily: "monospace", fontSize: 11 }}>
                              {inv.invoice_number || `RIDE-${inv.ride_id}`}
                            </span>
                          </TD>
                          <TD style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap" }}>
                            {fmtD(inv.completed_at || inv.paid_at)}
                          </TD>
                          <TD>
                            <div style={{ fontWeight: 500 }}>{inv.passenger_name || "—"}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{inv.passenger_phone}</div>
                          </TD>
                          <TD>
                            <div style={{ fontWeight: 500 }}>{inv.driver_name || "—"}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{inv.driver_phone}</div>
                          </TD>
                          <TD style={{ textTransform: "capitalize", color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                            {inv.vehicle_type || "—"}
                          </TD>
                          <TD style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                            {fmtKm(inv.distance_km)}
                          </TD>
                          <TD><PayBadge method={inv.payment_method} /></TD>
                          <TD>
                            <span style={{ fontWeight: 700, color: "#60a5fa", fontVariantNumeric: "tabular-nums" }}>{fmt(passenger)}</span>
                          </TD>
                          <TD>
                            <span style={{ fontWeight: 700, color: "#34D399", fontVariantNumeric: "tabular-nums" }}>{fmt(driver)}</span>
                          </TD>
                          <TD>
                            <span style={{ fontWeight: 700, color: "#D4AF37", fontVariantNumeric: "tabular-nums" }}>{fmt(company)}</span>
                          </TD>
                          <TD style={{ color: "rgba(255,255,255,0.25)" }}>
                            <ChevronDown size={13} style={{ transform: "rotate(-90deg)" }} />
                          </TD>
                        </tr>
                      );
                    })
              }
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(212,175,55,0.08)" }}>
            <Pagination page={currentPage} total={total} perPage={LIMIT} onChange={(p) => setOffset((p - 1) * LIMIT)} />
          </div>
        )}
      </div>
    </div>
  );
}
