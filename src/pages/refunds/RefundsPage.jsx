import { useState } from "react";
import { RotateCcw, CheckCircle, X, AlertCircle } from "lucide-react";
import { issueRefund } from "../../api/admin";

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:400 }}>
  <span style={{ flex:1 }}>{msg}</span>
  <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

const EMPTY = { user_id:"", ride_id:"", amount:"", reason:"" };

const inp = (label, key, value, onChange, opts = {}) => (
  <div>
    <label style={{ display:"block", fontSize:11, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>{label}{opts.required ? " *" : ""}</label>
    <input
      type={opts.type || "text"}
      step={opts.step}
      placeholder={opts.placeholder || ""}
      value={value}
      onChange={(e) => onChange(key, e.target.value)}
      style={{ width:"100%", height:44, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px", color:"#fff", fontSize:14, outline:"none", fontFamily:"Outfit,sans-serif", boxSizing:"border-box" }}
      onFocus={(e)=>e.target.style.borderColor="#D4AF37"}
      onBlur={(e)=>e.target.style.borderColor="rgba(212,175,55,0.15)"}
    />
  </div>
);

export default function RefundsPage() {
  const [form, setForm]       = useState(EMPTY);
  const [submitting, setSub]  = useState(false);
  const [toast, setToast]     = useState(null);
  const [lastResult, setResult] = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  const setField = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.user_id || !form.amount || !form.reason) {
      showToast("User ID, Amount and Reason are required.", "error");
      return;
    }
    if (!window.confirm(`Issue refund of ₹${form.amount} for ride #${form.ride_id || "N/A"}?`)) return;
    setSub(true);
    try {
      const res = await issueRefund({
        user_id: form.user_id,
        ride_id: form.ride_id ? Number(form.ride_id) : undefined,
        amount:  parseFloat(form.amount),
        reason:  form.reason,
      });
      const data = res.data?.data || res.data || {};
      setResult(data);
      showToast(`Refund of ₹${data.amount ?? form.amount} processed successfully.`);
      setForm(EMPTY);
    } catch (err) {
      showToast(err.response?.data?.message || "Refund failed.", "error");
    } finally {
      setSub(false);
    }
  };

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Refund Management</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Issue manual refunds to users via wallet credit</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:20, alignItems:"start" }}>

        {/* Refund Form */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:18, padding:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"rgba(212,175,55,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <RotateCcw size={16} color="#D4AF37" />
            </div>
            <div>
              <div style={{ fontFamily:"Cinzel,serif", fontSize:15, fontWeight:700, color:"#fff" }}>Issue Refund</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>POST /wallet/refund</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {inp("User ID", "user_id", form.user_id, setField, { required:true, placeholder:"e.g. a1b2c3d4-..." })}
            {inp("Ride ID", "ride_id", form.ride_id, setField, { type:"number", placeholder:"e.g. 101 (optional)" })}
            {inp("Amount (₹)", "amount", form.amount, setField, { type:"number", step:"0.01", required:true, placeholder:"e.g. 196.50" })}
            <div>
              <label style={{ display:"block", fontSize:11, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>Reason *</label>
              <textarea
                value={form.reason}
                onChange={(e) => setField("reason", e.target.value)}
                rows={3}
                placeholder="e.g. Driver cancelled, Overcharged, Service issue…"
                style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"10px 14px", color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", resize:"vertical", boxSizing:"border-box" }}
                onFocus={(e)=>e.target.style.borderColor="#D4AF37"}
                onBlur={(e)=>e.target.style.borderColor="rgba(212,175,55,0.15)"}
              />
            </div>
            <button type="submit" disabled={submitting} style={{ height:48, background:"linear-gradient(135deg,#f0d060,#D4AF37,#b8922a)", border:"none", borderRadius:12, color:"#0a1840", fontSize:13, fontFamily:"Cinzel,serif", fontWeight:700, cursor:"pointer", opacity:submitting?0.7:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:4 }}>
              <RotateCcw size={14} />
              {submitting ? "Processing…" : "Issue Refund"}
            </button>
          </form>
        </div>

        {/* Right panel */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Last result */}
          {lastResult && (
            <div style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:14, padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                <CheckCircle size={16} color="#4ade80" />
                <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:700, color:"#4ade80" }}>Last Refund Processed</span>
              </div>
              {[
                ["Transaction", lastResult.transactionNumber || lastResult.transaction_number || "—"],
                ["Amount", lastResult.amount ? `₹${new Intl.NumberFormat("en-IN").format(lastResult.amount)}` : "—"],
                ["Status", lastResult.status || "success"],
              ].map(([l,v]) => (
                <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}>
                  <span style={{ color:"rgba(255,255,255,0.45)" }}>{l}</span>
                  <span style={{ color:"rgba(255,255,255,0.85)", fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Info card */}
          <div style={{ background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:14, padding:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <AlertCircle size={15} color="#60a5fa" />
              <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:700, color:"#60a5fa" }}>How Refunds Work</span>
            </div>
            {[
              "Refunds are credited to the user's GO Mobility wallet.",
              "The Ride ID is optional — leave blank for non-ride refunds.",
              "Reason is required for audit trail compliance.",
              "Refund list API is not yet available — use Transactions page to verify.",
            ].map((item, i) => (
              <div key={i} style={{ display:"flex", gap:8, marginBottom:8, fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:1.6 }}>
                <span style={{ color:"#60a5fa", flexShrink:0 }}>•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Refund list placeholder */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.08)", borderRadius:14, padding:32, textAlign:"center" }}>
            <RotateCcw size={32} color="rgba(255,255,255,0.15)" style={{ marginBottom:12 }} />
            <div style={{ fontSize:14, color:"rgba(255,255,255,0.3)", fontWeight:600, marginBottom:6 }}>Refund History</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>API coming soon — view issued refunds in Transactions page (category: ride_refund)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
