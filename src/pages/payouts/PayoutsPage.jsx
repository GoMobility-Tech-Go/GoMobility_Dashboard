import { useState } from "react";
import { useToast, ToastProvider, PageWrapper, TableCard, Badge, AvatarCell, MiniStatRow, AlertBox, GlobalStyles } from "../../components/ui/index.jsx";
import { genPayouts } from "../../data/mockData.js";
const INIT = genPayouts(8);
function Content() {
  const toast=useToast(), [payouts,setPayouts]=useState(INIT);
  const approve=(i)=>{setPayouts(p=>p.map((x,j)=>j===i?{...x,status:"Processed"}:x));toast(`Payout of Rs${payouts[i].amount.toLocaleString()} approved!`,"success");};
  const bulkApprove=()=>{setPayouts(p=>p.map(x=>({...x,status:"Processed"})));toast("All pending payouts approved!","success");};
  const pending=payouts.filter(p=>p.status==="Pending");
  return (
    <PageWrapper title="Driver Payouts" subtitle="Manage and process driver withdrawal requests"
      actions={pending.length>0&&<button className="btn-gold btn-sm" onClick={bulkApprove}>Bulk Approve All ({pending.length})</button>}>
      <GlobalStyles/>
      <MiniStatRow items={[{label:"Pending",value:String(pending.length),icon:"⏳",color:"#D4AF37"},{label:"Pending Amount",value:`Rs${pending.reduce((a,b)=>a+b.amount,0).toLocaleString()}`,icon:"💰",color:"#D4AF37"},{label:"Processed Today",value:"18",icon:"✅",color:"#34D399"},{label:"Total Paid (Month)",value:"Rs8,42,000",icon:"🏦",color:"#60A5FA"}]}/>
      {pending.length>0&&<AlertBox type="warning">{pending.length} driver payout requests pending — Rs{pending.reduce((a,b)=>a+b.amount,0).toLocaleString()} awaiting.</AlertBox>}
      <TableCard title="Withdrawal Requests" icon="💰" actions={<select className="gm-input btn-sm" style={{width:130}}><option>All</option><option>Pending</option><option>Processed</option></select>}>
        <table className="gm-table"><thead><tr><th>Driver</th><th>Bank Account</th><th>Amount</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{payouts.map((p,i)=><tr key={i}><td><AvatarCell name={p.name} gradient="linear-gradient(135deg,#3b82f6,#1d4ed8)"/></td><td style={{fontFamily:"monospace",fontSize:12}}>{p.bank}</td><td style={{color:"#D4AF37",fontFamily:"monospace",fontWeight:700}}>Rs{p.amount.toLocaleString()}</td><td style={{fontSize:12}}>{p.ago}</td><td><Badge status={p.status}/></td><td>{p.status==="Pending"?<button className="btn-success btn-xs" onClick={()=>approve(i)}>Approve</button>:<span style={{fontSize:14}}>✅</span>}</td></tr>)}</tbody></table>
      </TableCard>
    </PageWrapper>
  );
}
export default function PayoutsPage() { return <ToastProvider><Content/></ToastProvider>; }
