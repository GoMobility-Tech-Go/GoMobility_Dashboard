import { useState, useEffect, useCallback, useMemo } from "react";
import { X, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getTransactions } from "../../api/admin";
import { Pagination } from "../../components/ui/index.jsx";

const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const fmtRupee   = (n) => n != null ? "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n)) : "—";
const fmtShort   = (n) => n >= 1e5 ? `₹${(n/1e5).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(0)}K` : `₹${Math.round(n)}`;

const BADGE = {
  credit:  { color:"#4ade80", bg:"rgba(34,197,94,0.12)",   border:"rgba(34,197,94,0.3)"  },
  debit:   { color:"#f87171", bg:"rgba(239,68,68,0.12)",   border:"rgba(239,68,68,0.3)"  },
  success: { color:"#4ade80", bg:"rgba(34,197,94,0.12)",   border:"rgba(34,197,94,0.3)"  },
  pending: { color:"#f59e0b", bg:"rgba(245,158,11,0.12)",  border:"rgba(245,158,11,0.3)" },
  failed:  { color:"#f87171", bg:"rgba(239,68,68,0.12)",   border:"rgba(239,68,68,0.3)"  },
  refunded:{ color:"#a78bfa", bg:"rgba(167,139,250,0.12)", border:"rgba(167,139,250,0.3)"},
};

const PIE_PALETTE = ["#D4AF37","#60a5fa","#4ade80","#a78bfa","#f87171","#f59e0b","#34D399"];

const TOOLTIP_STYLE = {
  background:"#020d26", border:"1px solid rgba(212,175,55,0.2)",
  borderRadius:10, color:"#fff", fontFamily:"Outfit,sans-serif", fontSize:12,
  boxShadow:"0 8px 24px rgba(0,0,0,0.4)",
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

const Skeleton = () => (
  <div style={{ height:200, borderRadius:12, background:"rgba(255,255,255,0.03)", animation:"gmPulse 1.5s ease-in-out infinite" }}/>
);

export default function FinancePage() {
  const [txns, setTxns]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [chartTxns, setChartTxns] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [type, setType]           = useState("");
  const [category, setCat]        = useState("");
  const [status, setStatus]       = useState("");
  const [startDate, setStart]     = useState("");
  const [endDate, setEnd]         = useState("");
  const [offset, setOffset]       = useState(0);
  const [toast, setToast]         = useState(null);
  const LIMIT = 10;

  const showToast = (msg, t="error") => { setToast({msg,type:t}); setTimeout(()=>setToast(null),3500); };

  useEffect(() => {
    setChartLoading(true);
    getTransactions({ limit: 200, offset: 0 })
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setChartTxns(d.transactions || d.items || d.data || []);
      })
      .catch(() => {})
      .finally(() => setChartLoading(false));
  }, []);

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

  const summary = useMemo(() => {
    const credits = chartTxns.filter(t => t.type === "credit");
    const debits  = chartTxns.filter(t => t.type === "debit");
    const success = chartTxns.filter(t => t.status === "success");
    return {
      totalVolume:  chartTxns.reduce((s,t) => s + Number(t.amount||0), 0),
      totalCredits: credits.reduce((s,t) => s + Number(t.amount||0), 0),
      totalDebits:  debits.reduce((s,t) => s + Number(t.amount||0), 0),
      successRate:  chartTxns.length > 0 ? Math.round((success.length/chartTxns.length)*100) : 0,
      creditCount:  credits.length,
      debitCount:   debits.length,
    };
  }, [chartTxns]);

  const categoryData = useMemo(() => {
    const acc = {};
    chartTxns.forEach((t) => {
      const cat = (t.category||"other").replace(/_/g," ");
      if (!acc[cat]) acc[cat] = { name: cat, count: 0, amount: 0 };
      acc[cat].count++;
      acc[cat].amount += Number(t.amount||0);
    });
    return Object.values(acc).sort((a,b) => b.amount - a.amount);
  }, [chartTxns]);

  const typeData = useMemo(() => {
    const acc = {};
    chartTxns.forEach((t) => {
      const cat = (t.category||"other").replace(/_/g," ");
      if (!acc[cat]) acc[cat] = { name: cat, credit: 0, debit: 0 };
      if (t.type === "credit") acc[cat].credit += Number(t.amount||0);
      else acc[cat].debit += Number(t.amount||0);
    });
    return Object.values(acc).sort((a,b) => (b.credit+b.debit)-(a.credit+a.debit)).slice(0,6);
  }, [chartTxns]);

  const totalPages  = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const TH = ({ c }) => <th style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", borderBottom:"1px solid rgba(212,175,55,0.1)", whiteSpace:"nowrap" }}>{c}</th>;
  const TD = ({ children, style }) => <td style={{ padding:"14px 16px", fontSize:13, color:"rgba(255,255,255,0.8)", borderBottom:"1px solid rgba(255,255,255,0.04)", ...style }}>{children}</td>;

  const sel = (val, set, opts) => (
    <select value={val} onChange={(e)=>{set(e.target.value);setOffset(0);}} style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px", color:"rgba(255,255,255,0.8)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", cursor:"pointer" }}>
      {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
    </select>
  );

  const STAT_CARDS = [
    { label:"Total Volume",  value:fmtRupee(summary.totalVolume),  color:"#D4AF37", bg:"rgba(212,175,55,0.08)", icon:"💰", sub:`${chartTxns.length} transactions loaded` },
    { label:"Credits In",    value:fmtRupee(summary.totalCredits), color:"#4ade80", bg:"rgba(34,197,94,0.08)",  icon:"↑",  sub:`${summary.creditCount} credit transactions` },
    { label:"Debits Out",    value:fmtRupee(summary.totalDebits),  color:"#f87171", bg:"rgba(239,68,68,0.08)",  icon:"↓",  sub:`${summary.debitCount} debit transactions` },
    { label:"Success Rate",  value:`${summary.successRate}%`,       color:"#34D399", bg:"rgba(52,211,153,0.08)", icon:"✓",  sub:`of recent ${chartTxns.length} txns` },
  ];

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Transactions</h1>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Wallet movements, payments, and financial activity</p>
        </div>
        <button onClick={load} disabled={loading} style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 16px", background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:10, color:"#D4AF37", fontSize:13, cursor:"pointer", opacity:loading?0.5:1 }}>
          <RefreshCw size={13} style={{ animation:loading?"gmSpin 1s linear infinite":undefined }}/> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14, marginBottom:22 }}>
        {STAT_CARDS.map(({ label, value, color, bg, icon, sub }) => (
          <div key={label} style={{ background:bg, border:`1px solid ${color}22`, borderRadius:14, padding:"18px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.45)", textTransform:"uppercase", letterSpacing:"1px", fontFamily:"Cinzel,serif" }}>{label}</span>
              <span style={{ fontSize:16, width:30, height:30, background:`${color}18`, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color, fontWeight:700 }}>{icon}</span>
            </div>
            <div style={{ fontSize:21, fontWeight:800, color, fontFamily:"Cinzel,serif", lineHeight:1 }}>
              {chartLoading ? <span style={{ opacity:0.3 }}>—</span> : value}
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:6 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {chartLoading ? (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:22 }}>
          <Skeleton /><Skeleton />
        </div>
      ) : chartTxns.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:22 }}>

          {/* Category Donut */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:22 }}>
            <div style={{ fontFamily:"Cinzel,serif", fontSize:13, color:"rgba(255,255,255,0.7)", letterSpacing:"0.5px", marginBottom:4 }}>Breakdown by Category</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:14 }}>Transaction count distribution</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} dataKey="count" nameKey="name" cx="50%" cy="50%"
                  outerRadius={82} innerRadius={36} paddingAngle={2}
                  label={({ name, percent }) => percent > 0.05 ? `${(percent*100).toFixed(0)}%` : ""}
                  labelLine={{ stroke:"rgba(255,255,255,0.1)", strokeWidth:1 }}>
                  {categoryData.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v, n, p) => [`${v} txns · ${fmtRupee(p.payload.amount)}`, p.payload.name]} />
                <Legend wrapperStyle={{ color:"rgba(255,255,255,0.4)", fontSize:11 }}
                  formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Credit vs Debit Bar */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:22 }}>
            <div style={{ fontFamily:"Cinzel,serif", fontSize:13, color:"rgba(255,255,255,0.7)", letterSpacing:"0.5px", marginBottom:4 }}>Credits vs Debits</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:14 }}>Amount breakdown by category</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeData} margin={{ top:4, right:4, left:0, bottom:0 }}>
                <XAxis dataKey="name" tick={{ fill:"rgba(255,255,255,0.3)", fontSize:9 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v.split(" ").map(w=>w[0]?.toUpperCase()||"").join("")} />
                <YAxis tickFormatter={fmtShort} tick={{ fill:"rgba(255,255,255,0.3)", fontSize:10 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [fmtRupee(v), n === "credit" ? "Credits" : "Debits"]} />
                <Legend wrapperStyle={{ color:"rgba(255,255,255,0.4)", fontSize:12 }} formatter={(v) => v === "credit" ? "Credits ↑" : "Debits ↓"} />
                <Bar dataKey="credit" fill="#4ade80" radius={[4,4,0,0]} opacity={0.85} />
                <Bar dataKey="debit"  fill="#f87171" radius={[4,4,0,0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)", fontFamily:"Cinzel,serif" }}>Filter:</span>
        {sel(type, setType, [["","All Types"],["credit","Credit"],["debit","Debit"]])}
        {sel(category, setCat, [["","All Categories"],["ride_payment","Ride Payment"],["ride_refund","Ride Refund"],["wallet_recharge","Wallet Recharge"],["referral_bonus","Referral Bonus"],["cancellation_fee","Cancellation Fee"],["withdrawal","Withdrawal"]])}
        {sel(status, setStatus, [["","All Status"],["pending","Pending"],["success","Success"],["failed","Failed"],["refunded","Refunded"]])}
        <input type="date" value={startDate} onChange={(e)=>{setStart(e.target.value);setOffset(0);}} style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 12px", color:"rgba(255,255,255,0.7)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif" }} />
        <input type="date" value={endDate} onChange={(e)=>{setEnd(e.target.value);setOffset(0);}} style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 12px", color:"rgba(255,255,255,0.7)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif" }} />
        {(type||category||status||startDate||endDate) && (
          <button onClick={()=>{setType("");setCat("");setStatus("");setStart("");setEnd("");setOffset(0);}} style={{ height:40, padding:"0 14px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, color:"#f87171", fontSize:12, cursor:"pointer" }}>✕ Clear</button>
        )}
      </div>

      {/* Table */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:"1px solid rgba(212,175,55,0.08)" }}>
          <div style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#fff" }}>Transaction Ledger</div>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>{total.toLocaleString("en-IN")} total records</span>
        </div>
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
                    <tr key={t.transaction_number || t.id || idx}
                      onMouseEnter={(e)=>e.currentTarget.style.background="rgba(212,175,55,0.03)"}
                      onMouseLeave={(e)=>e.currentTarget.style.background=""}>
                      <TD><span style={{ color:"rgba(212,175,55,0.7)", fontFamily:"monospace", fontSize:11 }}>{t.transaction_number || t.id || "—"}</span></TD>
                      <TD><div style={{ fontWeight:500 }}>{t.user_name || t.user?.name || "—"}</div></TD>
                      <TD style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{t.user_phone || "—"}</TD>
                      <TD>
                        <span style={{ fontWeight:700, color: t.type==="credit"?"#4ade80":"#f87171" }}>
                          {t.type==="credit"?"↑ ":"↓ "}{fmtRupee(t.amount)}
                        </span>
                      </TD>
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
