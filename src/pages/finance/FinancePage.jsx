import { useState } from "react";
import { useToast, ToastProvider, PageWrapper, TableCard, FilterBar, SearchBox, Pagination, Badge, AvatarCell, MiniStatRow, Card, GlobalStyles, GoldTooltip } from "../../components/ui/index.jsx";
import { genTransactions, rnd, pick, randID, randTime } from "../../data/mockData.js";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, CartesianGrid } from "recharts";

const TXNS = genTransactions(15);
const DN = ["Rahul Sharma","Priya Singh","Amit Kumar","Neha Gupta","Raj Patel","Vikram Yadav"];
const FAILED = Array.from({length:10},()=>({id:randID("TXN"),user:pick(DN),amount:rnd(80,800),method:pick(["UPI","Debit Card","Net Banking"]),reason:pick(["Insufficient funds","Bank timeout","Card declined","UPI limit exceeded","Network error"]),attempts:rnd(1,3),date:`Today ${randTime()}`}));
const FEELOG = Array.from({length:10},(_,i)=>({driver:DN[i%6],rides:rnd(5,40),gross:rnd(800,4000),fee:rnd(150,720),date:`Apr ${23-i}, 2026`}));
const wkly=[{day:"Mon",amount:18450},{day:"Tue",amount:24200},{day:"Wed",amount:19800},{day:"Thu",amount:31400},{day:"Fri",amount:28600},{day:"Sat",amount:41200},{day:"Sun",amount:35100}];

function Content() {
  const toast=useToast(), [tab,setTab]=useState("txns"), [search,setSearch]=useState(""), [tf,setTf]=useState("");
  const filtered=TXNS.filter(t=>{const q=search.toLowerCase();return(t.user.toLowerCase().includes(q)||t.id.includes(q))&&(!tf||t.type===tf);});
  return (
    <PageWrapper title="Finance & Payments" subtitle="All transactions, failed payments, revenue and platform fee log"
      actions={<><button className="btn-outline btn-sm" onClick={()=>toast("Exporting CSV...","success")}>Export CSV</button><button className="btn-gold btn-sm" onClick={()=>toast("Tax report generated!","success")}>Tax Report</button></>}>
      <GlobalStyles/>
      <MiniStatRow items={[{label:"Today",value:"Rs18,450",icon:"📈",color:"#34D399"},{label:"This Week",value:"Rs1,98,750",icon:"💳",color:"#D4AF37"},{label:"This Month",value:"Rs8,42,200",icon:"💰",color:"#D4AF37"},{label:"Platform Fee",value:"Rs1,26,330",icon:"🏦",color:"#60A5FA"},{label:"Failed Today",value:"10",icon:"❌",color:"#F87171"},{label:"Pending Refunds",value:"5",icon:"↩",color:"#F59E0B"}]}/>
      <Card style={{padding:20,marginBottom:18}}>
        <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:14}}>Weekly Revenue Trend</div>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={wkly} margin={{top:4,right:4,left:0,bottom:0}}>
            <defs><linearGradient id="rfin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4AF37" stopOpacity={0.28}/><stop offset="100%" stopColor="#D4AF37" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false}/>
            <XAxis dataKey="day" tick={{fill:"rgba(212,175,55,0.45)",fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip content={<GoldTooltip/>}/>
            <Area type="monotone" dataKey="amount" name="Revenue (Rs)" stroke="#D4AF37" strokeWidth={2.5} fill="url(#rfin)" dot={{r:3,fill:"#D4AF37"}} activeDot={{r:5}} isAnimationActive animationDuration={1400}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <div className="tab-nav">{[{id:"txns",l:"All Transactions"},{id:"failed",l:"Failed Payments"},{id:"platform",l:"Platform Fee Log"}].map(t=><button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>)}</div>
      {tab==="txns"&&<TableCard title="All Transactions" icon="💳" footer={<Pagination showing="Showing 1-15 of 8,420"/>}>
        <FilterBar><SearchBox placeholder="Search..." value={search} onChange={setSearch}/><select className="gm-input" style={{width:160}} value={tf} onChange={e=>setTf(e.target.value)}><option value="">All Types</option><option>Ride Payment</option><option>Wallet Top-up</option><option>Refund</option><option>Platform Fee</option></select><input type="date" className="gm-input" style={{width:140}}/></FilterBar>
        <table className="gm-table"><thead><tr><th>Txn ID</th><th>User</th><th>Type</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>{filtered.map((t,i)=><tr key={i}><td style={{fontFamily:"monospace",color:"#D4AF37",fontSize:12}}>{t.id}</td><td>{t.user}</td><td><span style={{display:"inline-flex",padding:"3px 8px",borderRadius:100,fontSize:10.5,fontWeight:600,background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.24)",color:"#60A5FA"}}>{t.type}</span></td><td style={{color:"#D4AF37",fontFamily:"monospace"}}>Rs{t.amount.toLocaleString()}</td><td>{t.method}</td><td><Badge status={t.status}/></td><td style={{fontSize:12}}>{t.date}</td></tr>)}</tbody></table>
      </TableCard>}
      {tab==="failed"&&<TableCard title="Failed Gateway Payments" icon="❌" actions={<button className="btn-outline btn-sm" onClick={()=>toast("Exported!","success")}>Export</button>}>
        <div style={{padding:"10px 16px",borderBottom:"1px solid rgba(212,175,55,0.08)",background:"rgba(248,113,113,0.04)",fontSize:12,color:"#F87171"}}>{FAILED.length} failed payment attempts today</div>
        <table className="gm-table"><thead><tr><th>Txn ID</th><th>User</th><th>Amount</th><th>Method</th><th>Failure Reason</th><th>Attempts</th><th>Actions</th></tr></thead>
        <tbody>{FAILED.map((p,i)=><tr key={i}><td style={{fontFamily:"monospace",color:"#F87171",fontSize:12}}>{p.id}</td><td>{p.user}</td><td style={{color:"#D4AF37",fontFamily:"monospace"}}>Rs{p.amount}</td><td>{p.method}</td>
          <td><span style={{display:"inline-flex",padding:"3px 8px",borderRadius:100,fontSize:10.5,fontWeight:600,background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.25)",color:"#F87171"}}>{p.reason}</span></td>
          <td style={{color:"#F59E0B",fontWeight:700}}>{p.attempts}x</td>
          <td><div style={{display:"flex",gap:4}}><button className="btn-success btn-xs" onClick={()=>toast("Retrying...","success")}>Retry</button><button className="btn-outline btn-xs">View</button></div></td>
        </tr>)}</tbody></table>
      </TableCard>}
      {tab==="platform"&&<TableCard title="Platform Fee Log" icon="🏦" actions={<button className="btn-outline btn-sm" onClick={()=>toast("Exported!","success")}>Export</button>}>
        <table className="gm-table"><thead><tr><th>Driver</th><th>Date</th><th>Rides</th><th>Gross</th><th>Fee Rate</th><th>Fee Collected</th><th>Net Payout</th></tr></thead>
        <tbody>{FEELOG.map((p,i)=><tr key={i}><td><AvatarCell name={p.driver} gradient="linear-gradient(135deg,#3b82f6,#1d4ed8)"/></td><td style={{fontSize:12}}>{p.date}</td><td>{p.rides}</td><td style={{color:"#D4AF37",fontFamily:"monospace"}}>Rs{p.gross.toLocaleString()}</td><td style={{color:"#F59E0B",fontWeight:700}}>18%</td><td style={{color:"#F87171",fontFamily:"monospace",fontWeight:700}}>-Rs{p.fee.toLocaleString()}</td><td style={{color:"#34D399",fontFamily:"monospace",fontWeight:700}}>Rs{(p.gross-p.fee).toLocaleString()}</td></tr>)}</tbody></table>
        <div style={{padding:"12px 18px",background:"rgba(212,175,55,0.04)",borderTop:"1px solid rgba(212,175,55,0.08)",display:"flex",gap:24,fontSize:12,flexWrap:"wrap"}}>
          <span style={{color:"rgba(255,255,255,0.5)"}}>Total Gross: <strong style={{color:"#D4AF37"}}>Rs{FEELOG.reduce((a,b)=>a+b.gross,0).toLocaleString()}</strong></span>
          <span style={{color:"rgba(255,255,255,0.5)"}}>Total Fee: <strong style={{color:"#F87171"}}>Rs{FEELOG.reduce((a,b)=>a+b.fee,0).toLocaleString()}</strong></span>
          <span style={{color:"rgba(255,255,255,0.5)"}}>Net Paid: <strong style={{color:"#34D399"}}>Rs{FEELOG.reduce((a,b)=>a+(b.gross-b.fee),0).toLocaleString()}</strong></span>
        </div>
      </TableCard>}
    </PageWrapper>
  );
}
export default function FinancePage() { return <ToastProvider><Content/></ToastProvider>; }
