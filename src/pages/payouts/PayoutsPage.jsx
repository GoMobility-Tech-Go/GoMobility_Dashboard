import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, RefreshCw } from "lucide-react";
import { getPayouts } from "../../api/admin";

const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";
const fmtRupee   = (n) => n != null ? "₹" + new Intl.NumberFormat("en-IN", { minimumFractionDigits:2, maximumFractionDigits:2 }).format(n) : "—";

const STATUS_MAP = {
  pending:    { label:"Pending",    color:"#f59e0b", bg:"rgba(245,158,11,0.12)", border:"rgba(245,158,11,0.3)" },
  processing: { label:"Processing", color:"#60a5fa", bg:"rgba(59,130,246,0.12)", border:"rgba(59,130,246,0.3)" },
  success:    { label:"Paid",       color:"#4ade80", bg:"rgba(34,197,94,0.12)",  border:"rgba(34,197,94,0.3)"  },
  completed:  { label:"Paid",       color:"#4ade80", bg:"rgba(34,197,94,0.12)",  border:"rgba(34,197,94,0.3)"  },
  failed:     { label:"Failed",     color:"#f87171", bg:"rgba(239,68,68,0.12)",  border:"rgba(239,68,68,0.3)"  },
};

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
  <span style={{ flex:1 }}>{msg}</span>
  <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

export default function PayoutsPage() {
  const [payouts, setPayouts]         = useState([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate]     = useState("");
  const [endDate, setEndDate]         = useState("");
  const [offset, setOffset]           = useState(0);
  const [toast, setToast]             = useState(null);
  const LIMIT = 20;

  const showToast = (msg, type="error") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const params = { limit: LIMIT, offset };
    if (statusFilter) params.status = statusFilter;
    if (startDate)    params.start_date = startDate;
    if (endDate)      params.end_date   = endDate;
    getPayouts(params)
      .then((res) => {
        const d = res.data?.data || res.data || {};
        const items = d.transactions || d.items || d.data || (Array.isArray(d) ? d : []);
        setPayouts(items);
        setTotal(d.pagination?.total || d.total || items.length);
      })
      .catch(() => { setError(true); showToast("Failed to load payout data."); })
      .finally(() => setLoading(false));
  }, [statusFilter, startDate, endDate, offset]);

  useEffect(() => { load(); }, [load]);

  // Summary stats from loaded data
  const todayStr   = new Date().toISOString().split("T")[0];
  const paidToday  = payouts
    .filter((p) => (p.status === "success" || p.status === "completed") && (p.created_at || "").startsWith(todayStr))
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const pendingCount = payouts.filter((p) => p.status === "pending").length;
  const failedCount  = payouts.filter((p) => p.status === "failed").length;
  const totalAmount  = payouts.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const STAT_CARDS = [
    { label:"Paid Today",    value: fmtRupee(paidToday),  icon:"✅", color:"#4ade80" },
    { label:"Pending",       value: pendingCount,          icon:"⏳", color:"#f59e0b" },
    { label:"Failed",        value: failedCount,           icon:"❌", color:"#f87171" },
    { label:"Loaded Total",  value: fmtRupee(totalAmount), icon:"💰", color:"#D4AF37" },
  ];

  const TH = ({ c }) => <th style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", borderBottom:"1px solid rgba(212,175,55,0.1)", whiteSpace:"nowrap" }}>{c}</th>;
  const TD = ({ children, style }) => <td style={{ padding:"14px 16px", fontSize:13, color:"rgba(255,255,255,0.8)", borderBottom:"1px solid rgba(255,255,255,0.04)", ...style }}>{children}</td>;

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Driver Payouts</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Withdrawal transactions from driver wallets</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:14, marginBottom:26 }}>
        {STAT_CARDS.map(({ label, value, icon, color }) => (
          <div key={label} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:14, padding:"18px 20px" }}>
            <div style={{ fontSize:22, marginBottom:8 }}>{icon}</div>
            <div style={{ fontSize:22, fontWeight:700, color, fontFamily:"Cinzel,serif", lineHeight:1 }}>
              {loading ? <span style={{ opacity:0.4 }}>—</span> : value}
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:5 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:12, marginBottom:18, flexWrap:"wrap", alignItems:"center" }}>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
          style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px", color:"rgba(255,255,255,0.8)", fontSize:13, outline:"none", cursor:"pointer" }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)", whiteSpace:"nowrap" }}>From</span>
          <input type="date" value={startDate} onChange={(e)=>{ setStartDate(e.target.value); setOffset(0); }}
            style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 12px", color:"rgba(255,255,255,0.7)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif" }} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)", whiteSpace:"nowrap" }}>To</span>
          <input type="date" value={endDate} onChange={(e)=>{ setEndDate(e.target.value); setOffset(0); }}
            style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 12px", color:"rgba(255,255,255,0.7)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif" }} />
        </div>
        {(statusFilter||startDate||endDate) && (
          <button onClick={()=>{ setStatusFilter(""); setStartDate(""); setEndDate(""); setOffset(0); }}
            style={{ height:40, padding:"0 14px", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, color:"#f87171", fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>
            Clear
          </button>
        )}
        <button onClick={load} disabled={loading} style={{ display:"flex", alignItems:"center", gap:7, height:40, padding:"0 16px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:10, color:"#D4AF37", fontSize:13, cursor:"pointer", opacity:loading?0.5:1 }}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div style={{ textAlign:"center", padding:"40px 0", marginBottom:20 }}>
          <div style={{ color:"#f87171", fontSize:14, marginBottom:12 }}>Failed to load payout data.</div>
          <button onClick={load} style={{ padding:"10px 22px", background:"rgba(212,175,55,0.12)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:10, color:"#D4AF37", cursor:"pointer", fontSize:13 }}>↻ Retry</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>
              {["Driver","Phone","Amount","Status","Bank Details","Transaction ID","Date"].map((c)=><TH key={c} c={c}/>)}
            </tr></thead>
            <tbody>
              {loading
                ? Array(6).fill(0).map((_,i)=>(
                    <tr key={i}><td colSpan={7}><div style={{ height:48, background:"rgba(255,255,255,0.03)", margin:"4px 0", borderRadius:8, animation:"gmPulse 1.5s ease-in-out infinite" }}/></td></tr>
                  ))
                : payouts.length === 0 && !error
                  ? <tr><td colSpan={7} style={{ padding:52, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>
                      <div style={{ fontSize:32, marginBottom:10 }}>💸</div>
                      No withdrawal transactions found
                    </td></tr>
                  : payouts.map((p, i) => {
                      const st = STATUS_MAP[p.status] || { label: p.status || "—", color:"rgba(255,255,255,0.5)", bg:"rgba(255,255,255,0.06)", border:"rgba(255,255,255,0.1)" };
                      const driverName = p.driver_name || p.user?.full_name || p.user_name || p.name || "—";
                      const driverPhone = p.driver_phone || p.user?.phone_number || p.phone || "—";
                      const bankDetail = p.bank_account
                        || (p.bank_details?.account_number ? `****${String(p.bank_details.account_number).slice(-4)}` : null)
                        || (p.upi_id ? `UPI: ${p.upi_id}` : null)
                        || "—";
                      const txnId = p.transaction_id || p.txn_id || p.reference_id || String(p.id || "—");
                      return (
                        <tr key={p.id || i} onMouseEnter={(e)=>e.currentTarget.style.background="rgba(212,175,55,0.03)"} onMouseLeave={(e)=>e.currentTarget.style.background=""}>
                          <TD><div style={{ fontWeight:600, color:"#fff" }}>{driverName}</div></TD>
                          <TD style={{ fontSize:12, color:"rgba(255,255,255,0.6)" }}>{driverPhone}</TD>
                          <TD><span style={{ fontWeight:700, color:"#D4AF37", fontSize:14 }}>{fmtRupee(p.amount)}</span></TD>
                          <TD>
                            <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>
                              {st.label}
                            </span>
                          </TD>
                          <TD style={{ fontSize:12, color:"rgba(255,255,255,0.55)", fontFamily:"monospace" }}>{bankDetail}</TD>
                          <TD style={{ fontSize:11, color:"rgba(212,175,55,0.6)", fontFamily:"monospace" }}>{txnId}</TD>
                          <TD style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{fmtDateTime(p.created_at)}</TD>
                        </tr>
                      );
                    })
              }
            </tbody>
          </table>
        </div>

        {total > LIMIT && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderTop:"1px solid rgba(212,175,55,0.08)" }}>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>Page {Math.floor(offset/LIMIT)+1} of {Math.ceil(total/LIMIT)} · {total} total</span>
            <div style={{ display:"flex", gap:8 }}>
              {[{dis:offset===0,fn:()=>setOffset(Math.max(0,offset-LIMIT)),icon:<ChevronLeft size={14}/>},{dis:offset+LIMIT>=total,fn:()=>setOffset(offset+LIMIT),icon:<ChevronRight size={14}/>}].map((b,i)=>(
                <button key={i} onClick={b.fn} disabled={b.dis} style={{ width:32, height:32, borderRadius:8, border:"1px solid rgba(212,175,55,0.2)", background:"transparent", cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center", opacity:b.dis?0.3:1 }}>{b.icon}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
