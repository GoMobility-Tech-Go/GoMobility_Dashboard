import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Save, X, Check, Ban, Gift, Power } from "lucide-react";
import {
  getPricingSettings, updatePricingSetting, toSettingRow,
  getFirstRideFreeStats, getFirstRideFreeReview,
  approveFirstRideReferral, rejectFirstRideReferral,
} from "../../api/admin";

// First Ride Free + Refer & Earn (backend migration 144).
// Switch, caps aur limits = pricing settings (group 'first_ride_free'), har
// save backend ke validator se guzarta hai aur turant live hota hai.

const GROUP = "first_ride_free";
const SWITCH_KEY = "first_ride_free_enabled";

// Form me kaunsa field kis section me — baaki jo bhi group me aaye wo "Other" me
const SECTIONS = [
  { title: "Free amount (per vehicle)", keys: ["first_ride_free_cap_bike", "first_ride_free_cap_auto", "first_ride_free_cap_car"] },
  { title: "Phase & validity",          keys: ["first_ride_free_user_limit", "first_ride_free_validity_days"] },
  { title: "Abuse checks",              keys: ["first_ride_free_min_km", "first_ride_free_min_minutes", "first_ride_free_driver_daily_max"] },
  { title: "Referral rewards",          keys: ["rider_referral_reward_bike", "rider_referral_reward_auto", "rider_referral_reward_car", "rider_referral_daily_review_limit"] },
];

const BLOCK_REASONS = {
  TOO_SHORT_KM:       "Ride shorter than minimum distance",
  TOO_SHORT_MINUTES:  "Ride shorter than minimum time",
  DRIVER_DAILY_LIMIT: "Driver crossed daily free-ride limit",
  NOT_FIRST_RIDE:     "Passenger already had a completed ride",
  GRANT_INVALID:      "Offer was no longer valid",
};

const rupee = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const vehicleLabel = (v) => ({ bike: "Bike", auto: "Auto", car: "Car", xl: "XL", premium: "Premium", luxury: "Luxury" }[v] || v || "—");

const cardStyle  = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 16, padding: 24 };
const titleStyle = { fontFamily: "Cinzel,serif", fontSize: 13, color: "rgba(212,175,55,0.85)", letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 16px" };
const inputStyle = { width: 120, height: 38, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 8, padding: "0 10px", color: "#fff", fontSize: 14, outline: "none", fontFamily: "Outfit,sans-serif", boxSizing: "border-box" };
const smallBtn   = (color, bg, disabled) => ({ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", background: bg, border: `1px solid ${color}55`, borderRadius: 8, color, fontSize: 12, fontFamily: "Outfit,sans-serif", fontWeight: 600, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1 });
const th = { padding: "12px 14px", textAlign: "left", fontSize: 11, fontFamily: "Cinzel,serif", color: "rgba(212,175,55,0.7)", letterSpacing: "1px", textTransform: "uppercase", borderBottom: "1px solid rgba(212,175,55,0.15)", whiteSpace: "nowrap" };
const td = { padding: "11px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13, color: "rgba(255,255,255,0.85)", verticalAlign: "top" };

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: type === "error" ? "#7f1d1d" : "#14532d", border: `1px solid ${type === "error" ? "#ef4444" : "#22c55e"}`, borderRadius: 12, padding: "12px 20px", color: "#fff", fontSize: 13, fontFamily: "Outfit,sans-serif", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", maxWidth: 420 }}>
    <span style={{ flex: 1 }}>{msg}</span>
    <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}><X size={14} /></button>
  </div>
);

const Stat = ({ label, value, sub, accent = "#D4AF37" }) => (
  <div style={{ ...cardStyle, padding: 20, flex: "1 1 200px", minWidth: 180 }}>
    <div style={{ fontSize: 11, fontFamily: "Cinzel,serif", color: "rgba(255,255,255,0.45)", letterSpacing: "1px", textTransform: "uppercase" }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color: accent, marginTop: 8 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>{sub}</div>}
  </div>
);

const Bar = ({ value, max }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden", marginTop: 10 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: pct >= 90 ? "#ef4444" : "linear-gradient(90deg,#b8922a,#D4AF37)" }} />
    </div>
  );
};

export default function FirstRideFreePage() {
  const [stats, setStats]       = useState(null);
  const [review, setReview]     = useState({ blockedRides: [], heldReferrals: [] });
  const [fields, setFields]     = useState([]);   // settings rows of the group
  const [edits, setEdits]       = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(null);
  const [acting, setActing]     = useState(null);
  const [toast, setToast]       = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    const [s, r, cfg] = await Promise.allSettled([getFirstRideFreeStats(), getFirstRideFreeReview(), getPricingSettings()]);
    if (s.status === "fulfilled") setStats(s.value.data?.data || null);
    if (r.status === "fulfilled") setReview(r.value.data?.data || { blockedRides: [], heldReferrals: [] });
    if (cfg.status === "fulfilled") {
      const rows = (cfg.value.data?.data || []).map(toSettingRow).filter(x => x.meta?.group === GROUP);
      setFields(rows);
      setEdits(Object.fromEntries(rows.map(x => [x.key, x.value])));
    }
    const failed = [s, r, cfg].filter(x => x.status === "rejected");
    if (failed.length) showToast(failed[0].reason?.response?.data?.message || "Some First Ride Free data could not be loaded.", "error");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const fieldOf = (key) => fields.find(f => f.key === key);
  const enabled = String(fieldOf(SWITCH_KEY)?.value) === "true";

  const saveSetting = async (key, value) => {
    const f = fieldOf(key);
    setSaving(key);
    try {
      const res = await updatePricingSetting(key, value, f?.value_type);
      const saved = res.data?.data?.setting_value ?? value;
      setFields(prev => prev.map(x => x.key === key ? { ...x, value: saved } : x));
      setEdits(prev => ({ ...prev, [key]: saved }));
      showToast(res.data?.message || `${f?.meta?.label || key} saved.`);
      return true;
    } catch (err) {
      showToast(err.response?.data?.message || `Could not save ${f?.meta?.label || key}.`, "error");
      return false;
    } finally { setSaving(null); }
  };

  const toggleSwitch = async () => {
    const next = !enabled;
    const msg = next
      ? "Turn First Ride Free ON? New passengers will start getting a free first ride immediately."
      : "Pause First Ride Free? No new discounts will be given. Rides already booked with the offer stay free.";
    if (!window.confirm(msg)) return;
    if (await saveSetting(SWITCH_KEY, next ? "true" : "false")) load();
  };

  const approve = async (row) => {
    if (!window.confirm(`Credit ${rupee(row.referrer_bonus)} to ${row.referrer_name || "the referrer"}'s wallet?`)) return;
    setActing(row.referral_id);
    try {
      await approveFirstRideReferral(row.referral_id);
      showToast("Referral reward credited.");
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not approve.", "error");
    } finally { setActing(null); }
  };

  const reject = async (row) => {
    const reason = window.prompt("Reason for rejecting this referral reward?", "Rejected after manual review");
    if (reason === null) return;
    setActing(row.referral_id);
    try {
      await rejectFirstRideReferral(row.referral_id, reason);
      showToast("Referral reward rejected.");
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not reject.", "error");
    } finally { setActing(null); }
  };

  const g = stats?.grants || {};
  const sp = stats?.spend || {};
  const ref = stats?.referrals || {};
  const grouped = SECTIONS.map(sec => ({ ...sec, rows: sec.keys.map(fieldOf).filter(Boolean) }));
  const known = new Set([SWITCH_KEY, ...SECTIONS.flatMap(s => s.keys)]);
  const other = fields.filter(f => !known.has(f.key));
  if (other.length) grouped.push({ title: "Other", rows: other });

  return (
    <div style={{ fontFamily: "Outfit,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "Cinzel,serif", fontSize: 22, fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Gift size={22} color="#D4AF37" /> First Ride Free
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>
            New passenger's first ride free up to a limit. GO pays the discount; the driver always gets the full share.
          </p>
        </div>
        <button onClick={load} disabled={loading} style={smallBtn("#D4AF37", "rgba(212,175,55,0.1)", loading)}>
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : undefined }} /> Refresh
        </button>
      </div>

      {/* Switch */}
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20, borderColor: enabled ? "rgba(34,197,94,0.35)" : "rgba(212,175,55,0.15)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: enabled ? "#22c55e" : "rgba(255,255,255,0.3)" }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{loading && !fields.length ? "Loading…" : enabled ? "Offer is LIVE" : "Offer is OFF"}</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 6, maxWidth: 560 }}>
            {fieldOf(SWITCH_KEY)?.meta?.help || "Turn the campaign on or off."}
          </div>
        </div>
        <button onClick={toggleSwitch} disabled={!fieldOf(SWITCH_KEY) || saving === SWITCH_KEY}
          style={{ ...smallBtn(enabled ? "#f87171" : "#4ade80", enabled ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)", saving === SWITCH_KEY), padding: "10px 18px", fontSize: 13 }}>
          <Power size={14} /> {saving === SWITCH_KEY ? "Saving…" : enabled ? "Pause offer" : "Turn ON"}
        </button>
      </div>

      {/* Live counters */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ ...cardStyle, padding: 20, flex: "1 1 240px", minWidth: 220 }}>
          <div style={{ fontSize: 11, fontFamily: "Cinzel,serif", color: "rgba(255,255,255,0.45)", letterSpacing: "1px", textTransform: "uppercase" }}>Phase limit used</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#D4AF37", marginTop: 8 }}>
            {g.countedTowardLimit ?? 0}<span style={{ fontSize: 15, color: "rgba(255,255,255,0.4)" }}> / {stats?.userLimit ?? "—"}</span>
          </div>
          <Bar value={g.countedTowardLimit || 0} max={stats?.userLimit || 0} />
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 8 }}>{g.remaining ?? 0} slots left · {g.active ?? 0} offers waiting to be used</div>
        </div>
        <Stat label="Free rides used" value={g.used ?? 0} sub={`${g.revoked ?? 0} blocked by checks · ${g.expired ?? 0} expired`} accent="#4ade80" />
        <div style={{ ...cardStyle, padding: 20, flex: "1 1 240px", minWidth: 220 }}>
          <div style={{ fontSize: 11, fontFamily: "Cinzel,serif", color: "rgba(255,255,255,0.45)", letterSpacing: "1px", textTransform: "uppercase" }}>Total spend</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#60a5fa", marginTop: 8 }}>{rupee(sp.total)}</div>
          <Bar value={sp.total || 0} max={sp.worstCaseBudget || 0} />
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 8 }}>
            Free rides {rupee(sp.freeRides)} + referrals {rupee(sp.referrals)} · worst case {rupee(sp.worstCaseBudget)}
          </div>
        </div>
        <Stat label="Referral rewards" value={ref.paid ?? 0} sub={`${ref.onHold ?? 0} on hold for review · ${ref.pending ?? 0} waiting for friend's ride`} accent="#a78bfa" />
      </div>

      {stats && (
        <div style={{ ...cardStyle, padding: "14px 20px", marginBottom: 24, display: "flex", gap: 28, flexWrap: "wrap", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
          <span style={{ color: "rgba(255,255,255,0.45)" }}>Free-ride spend by vehicle:</span>
          <span>Bike <b style={{ color: "#fff" }}>{rupee(sp.byVehicle?.bike)}</b></span>
          <span>Auto <b style={{ color: "#fff" }}>{rupee(sp.byVehicle?.auto)}</b></span>
          <span>Car / Premium / XL <b style={{ color: "#fff" }}>{rupee(sp.byVehicle?.car)}</b></span>
          <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{stats.note}</span>
        </div>
      )}

      {/* Settings */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={titleStyle}>Offer settings</h3>
        {!fields.length && !loading && (
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>Settings not found. Has backend migration 144 been run?</div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 24 }}>
          {grouped.filter(sec => sec.rows.length).map(sec => (
            <div key={sec.title}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 600, marginBottom: 10 }}>{sec.title}</div>
              {sec.rows.map(f => {
                const m = f.meta || {};
                const dirty = String(edits[f.key]) !== String(f.value);
                return (
                  <div key={f.key} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#fff" }}>{m.label || f.key}{m.unit && <span style={{ color: "rgba(255,255,255,0.35)" }}> ({m.unit})</span>}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3, lineHeight: 1.4 }}>{m.help}</div>
                    </div>
                    <input type="number" value={edits[f.key] ?? ""} min={m.min} max={m.max} step={m.step ?? "any"}
                      onChange={e => setEdits(p => ({ ...p, [f.key]: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter" && dirty) saveSetting(f.key, edits[f.key]); }}
                      style={{ ...inputStyle, borderColor: dirty ? "rgba(212,175,55,0.7)" : "rgba(212,175,55,0.2)" }} />
                    <button onClick={() => saveSetting(f.key, edits[f.key])} disabled={!dirty || saving === f.key}
                      style={{ ...smallBtn("#D4AF37", "rgba(212,175,55,0.1)", !dirty || saving === f.key), height: 38 }}>
                      <Save size={12} />{saving === f.key ? "…" : "Save"}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Review: blocked rides */}
      <div style={{ ...cardStyle, padding: 0, marginBottom: 24, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 0" }}>
          <h3 style={titleStyle}>Free rides blocked by checks <span style={{ color: "rgba(255,255,255,0.4)" }}>({review.blockedRides?.length || 0})</span></h3>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "-8px 0 14px" }}>The ride completed normally but no discount was given. Check for fake rides.</p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Ride", "Completed", "Vehicle", "Passenger", "Driver", "Distance", "Fare", "Reason"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {(review.blockedRides || []).length === 0 ? (
                <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: "rgba(255,255,255,0.35)", padding: 28 }}>Nothing to review.</td></tr>
              ) : review.blockedRides.map(r => (
                <tr key={r.ride_id}>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{r.ride_number || r.ride_id}</td>
                  <td style={td}>{fmtDate(r.completed_at)}</td>
                  <td style={td}>{vehicleLabel(r.vehicle_type)}</td>
                  <td style={td}>{r.passenger_name || "—"}<div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{r.passenger_phone}</div></td>
                  <td style={td}>{r.driver_name || "—"}<div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{r.driver_phone}</div></td>
                  <td style={td}>{r.actual_distance_km != null ? `${Number(r.actual_distance_km).toFixed(2)} km (GPS)` : r.distance_km != null ? `${Number(r.distance_km).toFixed(2)} km (est.)` : "—"}</td>
                  <td style={td}>{rupee(r.final_fare)}</td>
                  <td style={{ ...td, color: "#fbbf24" }}>{BLOCK_REASONS[r.reason] || r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review: held referrals */}
      <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 0" }}>
          <h3 style={titleStyle}>Referral rewards on hold <span style={{ color: "rgba(255,255,255,0.4)" }}>({review.heldReferrals?.length || 0})</span></h3>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "-8px 0 14px" }}>Approve to credit the referrer's GO wallet, or reject.</p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Referrer", "Friend", "Friend's ride", "Reward", "Why held", "Action"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {(review.heldReferrals || []).length === 0 ? (
                <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: "rgba(255,255,255,0.35)", padding: 28 }}>Nothing on hold.</td></tr>
              ) : review.heldReferrals.map(r => (
                <tr key={r.referral_id}>
                  <td style={td}>{r.referrer_name || "—"}<div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{r.referrer_phone}</div></td>
                  <td style={td}>{r.friend_name || "—"}<div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{r.friend_phone}</div></td>
                  <td style={td}>{vehicleLabel(r.reward_vehicle_type)}{r.reward_ride_id ? <span style={{ color: "rgba(255,255,255,0.4)" }}> · #{r.reward_ride_id}</span> : null}</td>
                  <td style={td}>{rupee(r.referrer_bonus)}</td>
                  <td style={{ ...td, color: "#fbbf24", maxWidth: 260 }}>{r.reason}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <button onClick={() => approve(r)} disabled={acting === r.referral_id} style={{ ...smallBtn("#4ade80", "rgba(34,197,94,0.1)", acting === r.referral_id), marginRight: 8 }}><Check size={12} /> Approve</button>
                    <button onClick={() => reject(r)} disabled={acting === r.referral_id} style={smallBtn("#f87171", "rgba(239,68,68,0.1)", acting === r.referral_id)}><Ban size={12} /> Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
