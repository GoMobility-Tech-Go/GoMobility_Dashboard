import { useState, useEffect } from "react";
import { useToast, ToastProvider, PageWrapper, TableCard, FilterBar, SearchBox, Pagination, Badge, AvatarCell, MiniStatRow, Card, GlobalStyles, GoldTooltip } from "../../components/ui/index.jsx";
import { api } from "../../services/api.js";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, CartesianGrid } from "recharts";

function normalizeTxn(t) {
  return {
    id: t.transaction_number || t.id || t.txn_id || '',
    user: t.user_name || t.user?.full_name || t.user || 'Unknown',
    type: t.type || t.transaction_type || 'Payment',
    amount: parseFloat(t.amount) || 0,
    method: t.payment_method || t.method || 'N/A',
    status: t.status ? (t.status.charAt(0).toUpperCase() + t.status.slice(1)) : 'Completed',
    date: t.created_at ? new Date(t.created_at).toLocaleString('en-IN') : '',
  };
}

function Content() {
  const toast=useToast(), [tab,setTab]=useState("txns"), [search,setSearch]=useState(""), [tf,setTf]=useState("");
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTransactions({ limit: 50 })
      .then(res => {
        const raw = res?.data?.transactions || res?.transactions || res?.data || [];
        setTxns(Array.isArray(raw) ? raw.map(normalizeTxn) : []);
      })
      .catch(() => toast("Failed to load transactions", "error"))
      .finally(() => setLoading(false));
  }, []);

  const filtered=txns.filter(t=>{const q=search.toLowerCase();return(t.user.toLowerCase().includes(q)||t.id.includes(q))&&(!tf||t.type===tf);});

  if (loading) return (
    <PageWrapper title="Finance & Payments" subtitle="Loading...">
      <GlobalStyles/>
      <div style={{textAlign:'center',padding:60,color:'rgba(255,255,255,0.35)',fontFamily:'Outfit,sans-serif'}}>Loading transactions...</div>
    </PageWrapper>
  );

  return (
    <PageWrapper title="Finance & Payments" subtitle="All transactions, failed payments, revenue and platform fee log"
      actions={<><button className="btn-outline btn-sm" onClick={()=>toast("Exporting CSV...","success")}>Export CSV</button><button className="btn-gold btn-sm" onClick={()=>toast("Tax report generated!","success")}>Tax Report</button></>}>
      <GlobalStyles/>
      <MiniStatRow items={[{label:"Today",value:"Rs18,450",icon:"📈",color:"#34D399"},{label:"This Week",value:"Rs1,98,750",icon:"💳",color:"#D4AF37"},{label:"This Month",value:"Rs8,42,200",icon:"💰",color:"#D4AF37"},{label:"Platform Fee",value:"Rs1,26,330",icon:"🏦",color:"#60A5FA"},{label:"Failed Today",value:"10",icon:"❌",color:"#F87171"},{label:"Pending Refunds",value:"5",icon:"↩",color:"#F59E0B"}]}/>
      <div className="tab-nav">{[{id:"txns",l:"All Transactions"},{id:"failed",l:"Failed Payments"},{id:"platform",l:"Platform Fee Log"}].map(t=><button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>)}</div>
      {tab==="txns"&&<TableCard title="All Transactions" icon="💳" footer={<Pagination showing="Showing 1-15 of 8,420"/>}>
        <FilterBar><SearchBox placeholder="Search..." value={search} onChange={setSearch}/><select className="gm-input" style={{width:160}} value={tf} onChange={e=>setTf(e.target.value)}><option value="">All Types</option><option>Ride Payment</option><option>Wallet Top-up</option><option>Refund</option><option>Platform Fee</option></select><input type="date" className="gm-input" style={{width:140}}/></FilterBar>
        <table className="gm-table"><thead><tr><th>Txn ID</th><th>User</th><th>Type</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>{filtered.map((t,i)=><tr key={i}><td style={{fontFamily:"monospace",color:"#D4AF37",fontSize:12}}>{t.id}</td><td>{t.user}</td><td><span style={{display:"inline-flex",padding:"3px 8px",borderRadius:100,fontSize:10.5,fontWeight:600,background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.24)",color:"#60A5FA"}}>{t.type}</span></td><td style={{color:"#D4AF37",fontFamily:"monospace"}}>Rs{t.amount.toLocaleString()}</td><td>{t.method}</td><td><Badge status={t.status}/></td><td style={{fontSize:12}}>{t.date}</td></tr>)}</tbody></table>
      </TableCard>}
      {tab==="failed"&&<TableCard title="Failed Gateway Payments" icon="❌">
        <div style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.3)",fontFamily:"Outfit,sans-serif"}}>
          <div style={{fontSize:32,marginBottom:10}}>❌</div>
          Failed payments data not available via API
        </div>
      </TableCard>}
      {tab==="platform"&&<TableCard title="Platform Fee Log" icon="🏦">
        <div style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.3)",fontFamily:"Outfit,sans-serif"}}>
          <div style={{fontSize:32,marginBottom:10}}>🏦</div>
          Platform fee log not available via API
        </div>
      </TableCard>}
    </PageWrapper>
  );
}
export default function FinancePage() { return <ToastProvider><Content/></ToastProvider>; }
