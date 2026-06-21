import { useState } from "react";
import { RotateCcw, CreditCard, Gift, CheckCircle, X, AlertCircle } from "lucide-react";
import { issueRefund, initiatePaymentRefund, grantReferralBonus } from "../../api/admin";

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:400 }}>
  <span style={{ flex:1 }}>{msg}</span>
  <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

const inputStyle = { width:"100%", height:44, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px", color:"#fff", fontSize:14, outline:"none", fontFamily:"Outfit,sans-serif", boxSizing:"border-box" };
const labelStyle = { display:"block", fontSize:11, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 };

const Inp = ({ label, value, onChange, type="text", placeholder="", required=false, step }) => (
  <div>
    <label style={labelStyle}>{label}{required?" *":""}</label>
    <input type={type} step={step} placeholder={placeholder} value={value} onChange={onChange}
      style={inputStyle}
      onFocus={e=>e.target.style.borderColor="#D4AF37"}
      onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.15)"}
    />
  </div>
);

const WALLET_EMPTY  = { user_id:"", ride_id:"", amount:"", reason:"" };
const GATEWAY_EMPTY = { user_id:"", ride_id:"", amount:"", method:"wallet", reason:"" };
const BONUS_EMPTY   = { user_id:"", amount:"", description:"" };

const TABS = [
  { id:"wallet",  label:"Wallet Refund",   icon:RotateCcw,  desc:"Credit refund directly to user's GO Mobility wallet" },
  { id:"gateway", label:"Gateway Refund",  icon:CreditCard, desc:"Refund to original payment source (card/UPI)" },
  { id:"bonus",   label:"Referral Bonus",  icon:Gift,       desc:"Manually grant referral bonus to a user's wallet" },
];

export default function RefundsPage() {
  const [tab, setTab]             = useState("wallet");
  const [wForm, setWForm]         = useState(WALLET_EMPTY);
  const [gForm, setGForm]         = useState(GATEWAY_EMPTY);
  const [bForm, setBForm]         = useState(BONUS_EMPTY);
  const [submitting, setSub]      = useState(false);
  const [toast, setToast]         = useState(null);
  const [lastResult, setResult]   = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  const handleWallet = async (e) => {
    e.preventDefault();
    if (!wForm.user_id || !wForm.amount || !wForm.reason) { showToast("User ID, Amount and Reason are required.", "error"); return; }
    if (!window.confirm(`Issue wallet refund of ₹${wForm.amount}?`)) return;
    setSub(true);
    try {
      const res = await issueRefund({ user_id:wForm.user_id, ride_id:wForm.ride_id?Number(wForm.ride_id):undefined, amount:parseFloat(wForm.amount), reason:wForm.reason });
      const d = res.data?.data || res.data || {};
      setResult({ type:"Wallet Refund", ...d });
      showToast(`Wallet refund of ₹${d.amount ?? wForm.amount} processed.`);
      setWForm(WALLET_EMPTY);
    } catch (err) { showToast(err.response?.data?.message || "Wallet refund failed.", "error"); }
    finally { setSub(false); }
  };

  const handleGateway = async (e) => {
    e.preventDefault();
    if (!gForm.user_id || !gForm.ride_id || !gForm.amount || !gForm.reason) { showToast("User ID, Ride ID, Amount and Reason are required.", "error"); return; }
    if (!window.confirm(`Issue gateway refund of ₹${gForm.amount} to original payment source?`)) return;
    setSub(true);
    try {
      const res = await initiatePaymentRefund({ user_id:gForm.user_id, ride_id:Number(gForm.ride_id), amount:parseFloat(gForm.amount), method:gForm.method, reason:gForm.reason });
      const d = res.data?.data || res.data || {};
      setResult({ type:"Gateway Refund", ...d });
      showToast(`Gateway refund of ₹${d.amount ?? gForm.amount} initiated.`);
      setGForm(GATEWAY_EMPTY);
    } catch (err) { showToast(err.response?.data?.message || "Gateway refund failed.", "error"); }
    finally { setSub(false); }
  };

  const handleBonus = async (e) => {
    e.preventDefault();
    if (!bForm.user_id || !bForm.amount) { showToast("User ID and Amount are required.", "error"); return; }
    if (!window.confirm(`Grant referral bonus of ₹${bForm.amount} to user ${bForm.user_id}?`)) return;
    setSub(true);
    try {
      const res = await grantReferralBonus({ user_id:bForm.user_id, amount:parseFloat(bForm.amount), description:bForm.description||"Manual referral bonus by admin" });
      const d = res.data?.data || res.data || {};
      setResult({ type:"Referral Bonus", ...d });
      showToast(`Referral bonus of ₹${bForm.amount} granted successfully.`);
      setBForm(BONUS_EMPTY);
    } catch (err) { showToast(err.response?.data?.message || "Failed to grant bonus.", "error"); }
    finally { setSub(false); }
  };

  const activeTab = TABS.find(t => t.id === tab);
  const ActiveIcon = activeTab.icon;

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Refund Management</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Issue refunds and grant bonuses to users</p>
      </div>

      {/* Tab Nav */}
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 18px", borderRadius:10, border:"1px solid", fontSize:13, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600, transition:"all .2s", borderColor:tab===t.id?"#D4AF37":"rgba(212,175,55,0.2)", background:tab===t.id?"rgba(212,175,55,0.12)":"rgba(255,255,255,0.02)", color:tab===t.id?"#D4AF37":"rgba(255,255,255,0.5)" }}>
            <t.icon size={14}/> {t.label}
          </button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:20, alignItems:"start" }}>

        {/* Form Panel */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:18, padding:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"rgba(212,175,55,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <ActiveIcon size={16} color="#D4AF37" />
            </div>
            <div>
              <div style={{ fontFamily:"Cinzel,serif", fontSize:15, fontWeight:700, color:"#fff" }}>{activeTab.label}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{activeTab.desc}</div>
            </div>
          </div>

          {/* Wallet Refund Form */}
          {tab === "wallet" && (
            <form onSubmit={handleWallet} style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <Inp label="User ID" value={wForm.user_id} onChange={e=>setWForm(p=>({...p,user_id:e.target.value}))} required placeholder="e.g. a1b2c3d4-..." />
              <Inp label="Ride ID" value={wForm.ride_id} onChange={e=>setWForm(p=>({...p,ride_id:e.target.value}))} type="number" placeholder="e.g. 101 (optional)" />
              <Inp label="Amount (₹)" value={wForm.amount} onChange={e=>setWForm(p=>({...p,amount:e.target.value}))} type="number" step="0.01" required placeholder="e.g. 196.50" />
              <div>
                <label style={labelStyle}>Reason *</label>
                <textarea value={wForm.reason} onChange={e=>setWForm(p=>({...p,reason:e.target.value}))} rows={3} placeholder="e.g. Driver cancelled, Overcharged…" style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"10px 14px", color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", resize:"vertical", boxSizing:"border-box" }} onFocus={e=>e.target.style.borderColor="#D4AF37"} onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.15)"} />
              </div>
              <button type="submit" disabled={submitting} style={{ height:48, background:"linear-gradient(135deg,#f0d060,#D4AF37,#b8922a)", border:"none", borderRadius:12, color:"#0a1840", fontSize:13, fontFamily:"Cinzel,serif", fontWeight:700, cursor:"pointer", opacity:submitting?0.7:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <RotateCcw size={14}/>{submitting?"Processing…":"Issue Wallet Refund"}
              </button>
            </form>
          )}

          {/* Gateway Refund Form */}
          {tab === "gateway" && (
            <form onSubmit={handleGateway} style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <Inp label="User ID" value={gForm.user_id} onChange={e=>setGForm(p=>({...p,user_id:e.target.value}))} required placeholder="e.g. a1b2c3d4-..." />
              <Inp label="Ride ID" value={gForm.ride_id} onChange={e=>setGForm(p=>({...p,ride_id:e.target.value}))} type="number" required placeholder="e.g. 101" />
              <Inp label="Amount (₹)" value={gForm.amount} onChange={e=>setGForm(p=>({...p,amount:e.target.value}))} type="number" step="0.01" required placeholder="e.g. 196.50" />
              <div>
                <label style={labelStyle}>Refund Method</label>
                <select value={gForm.method} onChange={e=>setGForm(p=>({...p,method:e.target.value}))} style={{ ...inputStyle, appearance:"none", cursor:"pointer" }}>
                  <option value="wallet">Wallet (instant)</option>
                  <option value="source">Original Source — card/UPI (3-5 business days)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Reason *</label>
                <textarea value={gForm.reason} onChange={e=>setGForm(p=>({...p,reason:e.target.value}))} rows={3} placeholder="e.g. Service not provided, Double charge…" style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"10px 14px", color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", resize:"vertical", boxSizing:"border-box" }} onFocus={e=>e.target.style.borderColor="#D4AF37"} onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.15)"} />
              </div>
              <button type="submit" disabled={submitting} style={{ height:48, background:"linear-gradient(135deg,#f0d060,#D4AF37,#b8922a)", border:"none", borderRadius:12, color:"#0a1840", fontSize:13, fontFamily:"Cinzel,serif", fontWeight:700, cursor:"pointer", opacity:submitting?0.7:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <CreditCard size={14}/>{submitting?"Processing…":"Initiate Gateway Refund"}
              </button>
            </form>
          )}

          {/* Referral Bonus Form */}
          {tab === "bonus" && (
            <form onSubmit={handleBonus} style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <Inp label="User ID" value={bForm.user_id} onChange={e=>setBForm(p=>({...p,user_id:e.target.value}))} required placeholder="e.g. a1b2c3d4-..." />
              <Inp label="Bonus Amount (₹)" value={bForm.amount} onChange={e=>setBForm(p=>({...p,amount:e.target.value}))} type="number" step="0.01" required placeholder="e.g. 100" />
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={bForm.description} onChange={e=>setBForm(p=>({...p,description:e.target.value}))} rows={2} placeholder="e.g. Referral bonus for inviting 3 friends" style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"10px 14px", color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", resize:"vertical", boxSizing:"border-box" }} onFocus={e=>e.target.style.borderColor="#D4AF37"} onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.15)"} />
              </div>
              <button type="submit" disabled={submitting} style={{ height:48, background:"linear-gradient(135deg,#f0d060,#D4AF37,#b8922a)", border:"none", borderRadius:12, color:"#0a1840", fontSize:13, fontFamily:"Cinzel,serif", fontWeight:700, cursor:"pointer", opacity:submitting?0.7:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <Gift size={14}/>{submitting?"Granting…":"Grant Referral Bonus"}
              </button>
            </form>
          )}
        </div>

        {/* Right Panel */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {lastResult && (
            <div style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:14, padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                <CheckCircle size={16} color="#4ade80" />
                <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:700, color:"#4ade80" }}>Last Action — {lastResult.type}</span>
              </div>
              {[
                ["Transaction", lastResult.transactionNumber || lastResult.transaction_number || lastResult.txnNumber || "—"],
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

          {/* Info Card */}
          <div style={{ background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:14, padding:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <AlertCircle size={15} color="#60a5fa" />
              <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:700, color:"#60a5fa" }}>
                {tab==="wallet" && "Wallet Refund Info"}
                {tab==="gateway" && "Gateway Refund Info"}
                {tab==="bonus" && "Referral Bonus Info"}
              </span>
            </div>
            {tab==="wallet" && [
              "Credited instantly to user's GO Mobility wallet.",
              "Ride ID is optional — leave blank for non-ride refunds.",
              "Reason is required for audit trail.",
            ].map((item,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginBottom:8, fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:1.6 }}>
                <span style={{ color:"#60a5fa", flexShrink:0 }}>•</span><span>{item}</span>
              </div>
            ))}
            {tab==="gateway" && [
              "Method 'wallet' → instant credit to GO Mobility wallet.",
              "Method 'source' → money back to original card/UPI (3-5 days via Razorpay).",
              "Ride ID is required for gateway refunds.",
              "Amount cannot exceed the original payment amount.",
            ].map((item,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginBottom:8, fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:1.6 }}>
                <span style={{ color:"#60a5fa", flexShrink:0 }}>•</span><span>{item}</span>
              </div>
            ))}
            {tab==="bonus" && [
              "Referral bonus is credited to user's wallet instantly.",
              "Use this for manually rewarding referrals or correcting missed bonuses.",
              "Description is optional but recommended for audit trail.",
            ].map((item,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginBottom:8, fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:1.6 }}>
                <span style={{ color:"#60a5fa", flexShrink:0 }}>•</span><span>{item}</span>
              </div>
            ))}
          </div>

          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.08)", borderRadius:14, padding:24, textAlign:"center" }}>
            <RotateCcw size={28} color="rgba(255,255,255,0.1)" style={{ marginBottom:10 }} />
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)", fontWeight:600, marginBottom:4 }}>Refund History</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.2)" }}>View issued refunds in Transactions page → filter category: ride_refund</div>
          </div>
        </div>
      </div>
    </div>
  );
}
