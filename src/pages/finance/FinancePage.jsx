import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { getTransactions } from "../../api/admin";
import { Pagination } from "../../components/ui/index.jsx";

const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const fmtRupee = (n) => n != null ? "₹" + new Intl.NumberFormat("en-IN").format(n) : "—";

const BADGE = {
  credit:  { color:"#4ade80", bg:"rgba(34,197,94,0.12)",   border:"rgba(34,197,94,0.3)"  },
  debit:   { color:"#f87171", bg:"rgba(239,68,68,0.12)",   border:"rgba(239,68,68,0.3)"  },
  success: { color:"#4ade80", bg:"rgba(34,197,94,0.12)",   border:"rgba(34,197,94,0.3)"  },
  pending: { color:"#f59e0b", bg:"rgba(245,158,11,0.12)",  border:"rgba(245,158,11,0.3)" },
  failed:  { color:"#f87171", bg:"rgba(239,68,68,0.12)",   border:"rgba(239,68,68,0.3)"  },
  refunded:{ color:"#a78bfa", bg:"rgba(167,139,250,0.12)", border:"rgba(167,139,250,0.3)"},
};

const Badge = ({ label, bkey }) => {
  const s = BADGE[bkey] || { color:"rgba(255,255,255,0.5)", bg:"rgba(255,255,255,0.06)", border:"rgba(255,255,255,0.1)" };
  return <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:s.bg, color:s.color, border:`1px solid ${s.border}`, textTransform:"capitalize" }}>{label}</span>;
};

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
  <span style={{ flex:1 }}>{msg}</span>
  <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

export default function FinancePage() {
  const [txns, setTxns]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [type, setType]       = useState("");
  const [category, setCat]    = useState("");
  const [status, setStatus]   = useState("");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd]     = useState("");
  const [offset, setOffset]   = useState(0);
  const [toast, setToast]     = useState(null);
  const LIMIT = 10;

  const showToast = (msg, type="error") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit:LIMIT, offset };
    if (type)      params.type       = type;
    if (category)  params.category   = category;
    if (status)    params.status     = status;
    if (startDate) params.start_date = startDate;
    if (endDate)   params.end_date   = endDate;
    getTransactions(params)
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setTxns(d.transactions || d.items || d.data || []);
        setTotal(d.pagination?.total || d.total || 0);
      })
      .catch(() => showToast("Failed to load transactions."))
      .finally(() => setLoading(false));
  }, [type, category, status, startDate, endDate, offset]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const TH = ({ c }) => <th style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", borderBottom:"1px solid rgba(212,175,55,0.1)", whiteSpace:"nowrap" }}>{c}</th>;
  const TD = ({ children, style }) => <td style={{ padding:"14px 16px", fontSize:13, color:"rgba(255,255,255,0.8)", borderBottom:"1px solid rgba(255,255,255,0.04)", ...style }}>{children}</td>;

  const sel = (val, set, opts) => (
    <select value={val} onChange={(e)=>{set(e.target.value);setOffset(0);}} style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px", color:"rgba(255,255,255,0.8)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", cursor:"pointer" }}>
      {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
    </select>
  );

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Transactions</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Total: {total} transactions</p>
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        {sel(type, setType, [["","All Types"],["credit","Credit"],["debit","Debit"]])}
        {sel(category, setCat, [["","All Categories"],["ride_payment","Ride Payment"],["ride_refund","Ride Refund"],["wallet_recharge","Wallet Recharge"],["referral_bonus","Referral Bonus"],["cancellation_fee","Cancellation Fee"],["withdrawal","Withdrawal"]])}
        {sel(status, setStatus, [["","All Status"],["pending","Pending"],["success","Success"],["failed","Failed"],["refunded","Refunded"]])}
        <input type="date" value={startDate} onChange={(e)=>{setStart(e.target.value);setOffset(0);}} style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 12px", color:"rgba(255,255,255,0.7)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif" }} />
        <input type="date" value={endDate} onChange={(e)=>{setEnd(e.target.value);setOffset(0);}} style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 12px", color:"rgba(255,255,255,0.7)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif" }} />
        {(type||category||status||startDate||endDate) && (
          <button onClick={()=>{setType("");setCat("");setStatus("");setStart("");setEnd("");setOffset(0);}} style={{ height:40, padding:"0 14px", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, color:"#f87171", fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>Clear</button>
        )}
      </div>

      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>
              {["Txn Number","User","Phone","Amount","Type","Category","Status","Date"].map((c)=><TH key={c} c={c}/>)}
            </tr></thead>
            <tbody>
              {loading
                ? Array(6).fill(0).map((_,i)=>(
                    <tr key={i}><td colSpan={8}><div style={{ height:48, background:"rgba(255,255,255,0.03)", margin:"4px 0", borderRadius:8, animation:"gmPulse 1.5s ease-in-out infinite" }}/></td></tr>
                  ))
                : txns.length === 0
                  ? <tr><td colSpan={8} style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>No transactions found</td></tr>
                  : txns.map((t, idx) => (
                    <tr key={t.transaction_number || t.id || idx} onMouseEnter={(e)=>e.currentTarget.style.background="rgba(212,175,55,0.03)"} onMouseLeave={(e)=>e.currentTarget.style.background=""}>
                      <TD><span style={{ color:"rgba(212,175,55,0.7)", fontFamily:"monospace", fontSize:11 }}>{t.transaction_number || t.id || "—"}</span></TD>
                      <TD><div style={{ fontWeight:500 }}>{t.user_name || t.user?.name || "—"}</div></TD>
                      <TD style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{t.user_phone || "—"}</TD>
                      <TD><span style={{ fontWeight:700, color: t.type==="credit"?"#4ade80":"#f87171" }}>{fmtRupee(t.amount)}</span></TD>
                      <TD><Badge label={t.type || "—"} bkey={t.type} /></TD>
                      <TD><span style={{ color:"rgba(255,255,255,0.5)", fontSize:12, textTransform:"capitalize" }}>{(t.category||"—").replace(/_/g," ")}</span></TD>
                      <TD><Badge label={t.status || "—"} bkey={t.status} /></TD>
                      <TD style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>{fmtDateTime(t.created_at)}</TD>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ padding:"14px 20px", borderTop:"1px solid rgba(212,175,55,0.08)" }}>
            <Pagination page={currentPage} total={total} perPage={LIMIT} onChange={(p) => setOffset((p-1)*LIMIT)} />
          </div>
        )}
      </div>
    </div>
  );
}
