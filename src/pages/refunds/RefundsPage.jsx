import { useState, useMemo } from "react";
import {
  RotateCcw, CreditCard, Gift, Repeat, Sparkles,
  CheckCircle, X, AlertCircle, AlertTriangle, Info,
} from "lucide-react";
import { createRefund } from "../../api/admin";

/* ─── UI atoms ────────────────────────────────────────────────────────────── */
const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:420 }}>
    <span style={{ flex:1 }}>{msg}</span>
    <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

const inputStyle = { width:"100%", height:44, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px", color:"#fff", fontSize:14, outline:"none", fontFamily:"Outfit,sans-serif", boxSizing:"border-box" };
const labelStyle = { display:"block", fontSize:11, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 };
const textareaStyle = { width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"10px 14px", color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", resize:"vertical", boxSizing:"border-box" };

const Inp = ({ label, value, onChange, type="text", placeholder="", required=false, step, hint }) => (
  <div>
    <label style={labelStyle}>{label}{required?" *":""}</label>
    <input type={type} step={step} placeholder={placeholder} value={value} onChange={onChange}
      style={inputStyle}
      onFocus={e=>e.target.style.borderColor="#D4AF37"}
      onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.15)"}
    />
    {hint && <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:5 }}>{hint}</div>}
  </div>
);

/* ─── Refund type registry (spec §4) ──────────────────────────────────────── */
const TYPES = {
  ride_refund: {
    id:"ride_refund",
    label:"Ride Refund",
    icon: RotateCcw,
    desc:"Wallet credit for a ride issue (overcharge, cancellation, etc.)",
    needsRide: true,
    needsSubscription: false,
    needsMethod: false,
  },
  gateway_refund: {
    id:"gateway_refund",
    label:"Gateway Refund",
    icon: CreditCard,
    desc:"Razorpay refund — to wallet (instant) or original source (3-5 days)",
    needsRide: true,
    needsSubscription: false,
    needsMethod: true,
  },
  referral_bonus: {
    id:"referral_bonus",
    label:"Referral Bonus",
    icon: Gift,
    desc:"Manually grant a referral bonus (auto-credits still fire internally)",
    needsRide: false,
    needsSubscription: false,
    needsMethod: false,
  },
  subscription_refund: {
    id:"subscription_refund",
    label:"Subscription Refund",
    icon: Repeat,
    desc:"Cancel a subscription and refund the payment",
    needsRide: false,
    needsSubscription: true,
    needsMethod: false,
  },
  manual_credit: {
    id:"manual_credit",
    label:"Manual Credit",
    icon: Sparkles,
    desc:"Goodwill / promotional / compensation credit (no ride linkage)",
    needsRide: false,
    needsSubscription: false,
    needsMethod: false,
  },
};

const TYPE_ORDER = ["ride_refund","gateway_refund","referral_bonus","subscription_refund","manual_credit"];

const EMPTY = {
  user_ref:"", amount:"", reason:"",
  ride_id:"", subscription_id:"", refund_method:"wallet",
  notes:"", notify_user:true,
};

/* ─── Regex helpers ───────────────────────────────────────────────────────── */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GOID_RE = /^GO-[A-Z]-\d+$/i;

/* ─── Client-side validation (spec §8) ────────────────────────────────────── */
function validateForm(form, type) {
  const errors = [];
  const T = TYPES[type];

  if (!form.user_ref) errors.push("User ref is required");
  else if (!UUID_RE.test(form.user_ref) && !GOID_RE.test(form.user_ref)) {
    errors.push("User ref must be UUID or GO-ID (e.g. GO-P-000123)");
  }

  if (T.needsRide && !form.ride_id) errors.push("Ride ID is required for this refund type");
  if (T.needsSubscription && !form.subscription_id) errors.push("Subscription ID is required");
  if (T.needsMethod && !["wallet","source"].includes(form.refund_method)) {
    errors.push("Refund method must be wallet or source");
  }

  const amt = parseFloat(form.amount);
  if (!form.amount || !(amt > 0)) errors.push("Amount must be positive");
  else if (amt > 100000) errors.push("Amount exceeds max ₹1,00,000");

  if (!form.reason || form.reason.trim().length < 3) errors.push("Reason must be at least 3 characters");

  return errors;
}

/* ─── Confirm dialog copy (spec §9) ───────────────────────────────────────── */
function buildConfirmMessage(form, type) {
  const T = TYPES[type];
  const isSourceGateway = type === "gateway_refund" && form.refund_method === "source";
  const lines = [
    `Refund ₹${form.amount} to ${form.user_ref}?`,
    "",
    `Type:   ${T.label}`,
    `Reason: ${form.reason}`,
  ];
  if (T.needsRide)         lines.push(`Ride:   #${form.ride_id}`);
  if (T.needsSubscription) lines.push(`Subscription: #${form.subscription_id}`);
  if (T.needsMethod)       lines.push(`Method: ${form.refund_method}`);
  lines.push("");
  if (isSourceGateway) {
    lines.push("⚠ Source refund: money returns to card/UPI in 3-5 business days.");
  } else {
    lines.push("This will credit the wallet instantly.");
  }
  lines.push("This action cannot be undone.");
  return lines.join("\n");
}

/* ─── Build payload from form + type ──────────────────────────────────────── */
function buildPayload(form, type) {
  const T = TYPES[type];
  const body = {
    user_ref: form.user_ref.trim(),
    type,
    amount:   parseFloat(form.amount),
    reason:   form.reason.trim(),
  };
  if (T.needsRide)         body.ride_id         = Number(form.ride_id);
  if (T.needsSubscription) body.subscription_id = Number(form.subscription_id);
  if (T.needsMethod)       body.refund_method   = form.refund_method;
  if (form.notes && form.notes.trim()) body.notes = form.notes.trim();
  if (form.notify_user === false) body.notify_user = false;
  return body;
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function RefundsPage() {
  const [type, setType]       = useState("ride_refund");
  const [form, setForm]       = useState(EMPTY);
  const [submitting, setSub]  = useState(false);
  const [toast, setToast]     = useState(null);
  const [result, setResult]   = useState(null);

  const T = TYPES[type];
  const ActiveIcon = T.icon;

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const showToast = (msg, kind="success") => { setToast({ msg, type:kind }); setTimeout(()=>setToast(null), 4200); };

  const clientErrors = useMemo(() => validateForm(form, type), [form, type]);
  const canSubmit = clientErrors.length === 0;

  const switchType = (newType) => {
    setType(newType);
    // Preserve user_ref + reason across type switches (common intent); reset type-specific fields
    setForm(p => ({
      ...EMPTY,
      user_ref: p.user_ref,
      reason:   p.reason,
      notes:    p.notes,
      notify_user: p.notify_user,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) { showToast(clientErrors[0], "error"); return; }
    if (!window.confirm(buildConfirmMessage(form, type))) return;

    setSub(true);
    try {
      const res = await createRefund(buildPayload(form, type));
      const d = res.data?.data || {};
      const wasIdempotent = res.data?.alreadyRefunded === true;
      setResult({
        ...d,
        typeLabel: T.label,
        wasIdempotent,
        message: res.data?.message,
        isSource: d.type === "gateway_source" || d.method === "source",
      });
      if (wasIdempotent) {
        showToast("Already refunded earlier — no double credit.", "success");
      } else if (d.method === "source" || d.type === "gateway_source") {
        showToast(res.data?.message || "Source refund initiated. Funds return in 3-5 days.");
      } else {
        showToast(res.data?.message || `Refund of ₹${d.amount ?? form.amount} processed.`);
      }
      // Reset form but keep the same type selected
      setForm(EMPTY);
    } catch (err) {
      const r = err.response;
      const body = r?.data;
      let msg = body?.message || "Refund failed.";
      // 422 validation — show first field-specific error
      if (r?.status === 422 && Array.isArray(body?.errors) && body.errors.length) {
        msg = `${body.errors[0].field}: ${body.errors[0].message}`;
      } else if (r?.status === 502) {
        msg = `Gateway failure: ${body?.message || "Razorpay rejected the refund"}`;
      }
      showToast(msg, "error");
    } finally {
      setSub(false);
    }
  };

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Refund Management</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>
          Unified refund endpoint · Accepts UUID or GO-ID
        </p>
      </div>

      {/* Type Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {TYPE_ORDER.map(k => {
          const t = TYPES[k];
          const Ic = t.icon;
          const active = type === k;
          return (
            <button key={k} onClick={() => switchType(k)} style={{
              display:"flex", alignItems:"center", gap:8,
              padding:"9px 16px", borderRadius:10, border:"1px solid",
              fontSize:12.5, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600, transition:"all .2s",
              borderColor: active ? "#D4AF37" : "rgba(212,175,55,0.2)",
              background:  active ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.02)",
              color:       active ? "#D4AF37" : "rgba(255,255,255,0.5)",
            }}>
              <Ic size={14}/> {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:20, alignItems:"start" }}>

        {/* Form Panel */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:18, padding:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"rgba(212,175,55,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <ActiveIcon size={16} color="#D4AF37" />
            </div>
            <div>
              <div style={{ fontFamily:"Cinzel,serif", fontSize:15, fontWeight:700, color:"#fff" }}>{T.label}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{T.desc}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>

            <Inp
              label="User (UUID or GO-ID)"
              value={form.user_ref}
              onChange={e => setField("user_ref", e.target.value)}
              required
              placeholder="e.g. GO-P-000123 or 3dcd1ded-7ada-…"
              hint="Paste from the GO ID column — accepts both formats."
            />

            {T.needsRide && (
              <Inp
                label="Ride ID"
                value={form.ride_id}
                onChange={e => setField("ride_id", e.target.value)}
                type="number"
                required
                placeholder="e.g. 246"
              />
            )}

            {T.needsSubscription && (
              <Inp
                label="Subscription ID"
                value={form.subscription_id}
                onChange={e => setField("subscription_id", e.target.value)}
                type="number"
                required
                placeholder="e.g. 12"
              />
            )}

            {T.needsMethod && (
              <div>
                <label style={labelStyle}>Refund Method *</label>
                <select
                  value={form.refund_method}
                  onChange={e => setField("refund_method", e.target.value)}
                  style={{ ...inputStyle, appearance:"none", cursor:"pointer" }}
                >
                  <option value="wallet">Wallet (instant credit)</option>
                  <option value="source">Original Source — card/UPI (3-5 business days)</option>
                </select>
                {form.refund_method === "source" && (
                  <div style={{ display:"flex", gap:8, marginTop:8, padding:"8px 12px", background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:8, fontSize:11.5, color:"#f59e0b", lineHeight:1.5 }}>
                    <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }} />
                    Money returns to card/UPI in 3-5 business days via Razorpay. Requires original payment order to exist.
                  </div>
                )}
              </div>
            )}

            <Inp
              label="Amount (₹)"
              value={form.amount}
              onChange={e => setField("amount", e.target.value)}
              type="number" step="0.01"
              required
              placeholder="e.g. 196.50"
              hint="Positive number, max ₹1,00,000"
            />

            <div>
              <label style={labelStyle}>Reason *</label>
              <textarea
                value={form.reason}
                onChange={e => setField("reason", e.target.value)}
                rows={3}
                placeholder="e.g. Driver cancelled, Overcharged, Service not provided…"
                style={textareaStyle}
                onFocus={e=>e.target.style.borderColor="#D4AF37"}
                onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.15)"}
              />
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:5 }}>
                Min 3 characters · Used for audit trail
              </div>
            </div>

            <div>
              <label style={labelStyle}>Internal Note (optional)</label>
              <textarea
                value={form.notes}
                onChange={e => setField("notes", e.target.value)}
                rows={2}
                placeholder="e.g. Approved by regional manager · Ticket #12345"
                style={textareaStyle}
                onFocus={e=>e.target.style.borderColor="#D4AF37"}
                onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.15)"}
              />
            </div>

            <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"10px 14px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:10 }}>
              <input
                type="checkbox"
                checked={form.notify_user}
                onChange={e => setField("notify_user", e.target.checked)}
                style={{ width:16, height:16, accentColor:"#D4AF37" }}
              />
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.75)" }}>
                Notify user via FCM push
                <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.4)", marginTop:1 }}>User will see "💰 Refund Credited"</div>
              </div>
            </label>

            {/* Client-side error banner */}
            {!canSubmit && (form.user_ref || form.amount || form.reason) && (
              <div style={{ display:"flex", gap:8, padding:"10px 14px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, fontSize:12, color:"#f87171" }}>
                <AlertCircle size={14} style={{ flexShrink:0, marginTop:1 }} />
                <div>
                  {clientErrors.slice(0, 2).map((err, i) => <div key={i}>{err}</div>)}
                  {clientErrors.length > 2 && <div style={{ opacity:0.6 }}>+ {clientErrors.length - 2} more</div>}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !canSubmit}
              style={{
                height:48,
                background: canSubmit ? "linear-gradient(135deg,#f0d060,#D4AF37,#b8922a)" : "rgba(255,255,255,0.06)",
                border:"none", borderRadius:12,
                color: canSubmit ? "#0a1840" : "rgba(255,255,255,0.35)",
                fontSize:13, fontFamily:"Cinzel,serif", fontWeight:700,
                cursor: (submitting || !canSubmit) ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                transition:"all .2s",
              }}
            >
              <ActiveIcon size={14}/>
              {submitting ? "Processing…" : `Process ${T.label}`}
            </button>
          </form>
        </div>

        {/* Right Panel */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Last result */}
          {result && (
            <div style={{
              background: result.wasIdempotent ? "rgba(59,130,246,0.06)" : "rgba(34,197,94,0.06)",
              border: `1px solid ${result.wasIdempotent ? "rgba(59,130,246,0.28)" : "rgba(34,197,94,0.25)"}`,
              borderRadius:14, padding:20,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                {result.wasIdempotent
                  ? <Info size={16} color="#60a5fa" />
                  : <CheckCircle size={16} color="#4ade80" />}
                <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:700, color: result.wasIdempotent ? "#60a5fa" : "#4ade80" }}>
                  {result.wasIdempotent ? "Already Refunded — " : "Success — "}{result.typeLabel}
                </span>
              </div>

              {result.message && (
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", marginBottom:12, lineHeight:1.5 }}>
                  {result.message}
                </div>
              )}

              {[
                ["Refund ID",     result.refundId ?? result.refundNumber ?? "—"],
                ["Transaction",   result.transactionNumber || "—"],
                ["User",          result.targetUserName ? `${result.targetUserName}${result.targetGoId ? ` (${result.targetGoId})` : ""}` : "—"],
                ["Amount",        result.amount != null ? `₹${new Intl.NumberFormat("en-IN").format(result.amount)}` : "—"],
                ["New Balance",   result.newBalance != null ? `₹${new Intl.NumberFormat("en-IN").format(result.newBalance)}` : null],
                ["Method",        result.method || null],
              ].filter(([, v]) => v !== null).map(([l, v]) => (
                <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:12.5, gap:12 }}>
                  <span style={{ color:"rgba(255,255,255,0.45)", flexShrink:0 }}>{l}</span>
                  <span style={{ color:"rgba(255,255,255,0.85)", fontWeight:600, fontFamily: l==="Refund ID"||l==="Transaction" ? "monospace" : "inherit", fontSize: l==="Refund ID"||l==="Transaction" ? 11 : 12.5, textAlign:"right", wordBreak:"break-all" }}>{String(v)}</span>
                </div>
              ))}

              {result.isSource && (
                <div style={{ marginTop:12, padding:"10px 12px", background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:8, fontSize:11.5, color:"#f59e0b", display:"flex", gap:8 }}>
                  <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }} />
                  Funds returning to card/UPI · Track via {result.refundNumber || "refund number"} on Razorpay
                </div>
              )}

              {Array.isArray(result.affectedTables) && result.affectedTables.length > 0 && (
                <div style={{ marginTop:12, paddingTop:10, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>Affected Tables</div>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {result.affectedTables.map(t => (
                      <span key={t} style={{ fontSize:10, padding:"2px 7px", borderRadius:20, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.6)", fontFamily:"monospace" }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info card per type */}
          <div style={{ background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:14, padding:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <AlertCircle size={15} color="#60a5fa" />
              <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:700, color:"#60a5fa" }}>
                {T.label} Info
              </span>
            </div>
            {getInfoLines(type).map((line, i) => (
              <div key={i} style={{ display:"flex", gap:8, marginBottom:8, fontSize:12, color:"rgba(255,255,255,0.55)", lineHeight:1.6 }}>
                <span style={{ color:"#60a5fa", flexShrink:0 }}>•</span><span>{line}</span>
              </div>
            ))}
          </div>

          {/* Global caveats */}
          <div style={{ background:"rgba(212,175,55,0.04)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:14, padding:18 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <AlertTriangle size={14} color="#D4AF37" />
              <span style={{ fontFamily:"Cinzel,serif", fontSize:12, fontWeight:700, color:"#D4AF37", letterSpacing:"0.5px" }}>Global Rules</span>
            </div>
            {[
              "Duplicate within 24h returns the existing refund (no double credit).",
              "Amount cap: ₹1,00,000 per refund.",
              "Refunds are irreversible — confirm before submitting.",
              "History: Transactions page → filter category `ride_refund` or `referral_bonus`.",
            ].map((line, i) => (
              <div key={i} style={{ display:"flex", gap:8, marginBottom:6, fontSize:11.5, color:"rgba(255,255,255,0.5)", lineHeight:1.55 }}>
                <span style={{ color:"#D4AF37", flexShrink:0 }}>·</span><span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Per-type explanatory bullet points ──────────────────────────────────── */
function getInfoLines(type) {
  switch (type) {
    case "ride_refund": return [
      "Wallet credit — instant. Ride ID is required.",
      "Writes to: wallets, transactions, payment_refunds, payment_orders, ride_invoices.",
      "Works even for cash-paid rides (no wallet debit lookup).",
    ];
    case "gateway_refund": return [
      "Method 'wallet' → instant credit to GO Mobility wallet.",
      "Method 'source' → money returns to card/UPI via Razorpay (3-5 days).",
      "Source method requires the original payment_orders row to exist.",
      "Amount cannot exceed the original payment amount.",
    ];
    case "referral_bonus": return [
      "Instant wallet credit — for MANUAL admin action only.",
      "Auto-referral bonuses (on referred user's first ride) still fire separately.",
      "Reason is used as the audit trail note.",
    ];
    case "subscription_refund": return [
      "Cancels the subscription + refunds to wallet.",
      "Writes to: wallets, transactions, user_subscriptions, subscription_payments.",
      "Subscription ID is required.",
    ];
    case "manual_credit": return [
      "Goodwill / promotional / compensation credits.",
      "No ride or subscription linkage — pure discretionary credit.",
      "Distinguished from referral bonuses via transaction metadata.",
    ];
    default: return [];
  }
}
