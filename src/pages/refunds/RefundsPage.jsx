import { useState } from "react";
import { useToast, ToastProvider, PageWrapper, TableCard, Badge, MiniStatRow, Modal, FormGroup, AlertBox, GlobalStyles } from "../../components/ui/index.jsx";
import { genRefunds } from "../../data/mockData.js";
const INIT = genRefunds(8);
function Content() {
  const toast=useToast(), [refunds,setRefunds]=useState(INIT), [rejectModal,setRejectModal]=useState(false), [selIdx,setSelIdx]=useState(null);
  const approve=(i)=>{setRefunds(r=>r.map((x,j)=>j===i?{...x,status:"Approved"}:x));toast("Refund approved!","success");};
  const openReject=(i)=>{setSelIdx(i);setRejectModal(true);};
  const confirmReject=()=>{setRefunds(r=>r.map((x,j)=>j===selIdx?{...x,status:"Rejected"}:x));toast("Refund rejected","error");setRejectModal(false);};
  const pending=refunds.filter(r=>r.status==="Pending").length;
  return (
    <PageWrapper title="Refund Management" subtitle="Review and process passenger refund requests within SLA">
      <GlobalStyles/>
      <MiniStatRow items={[{label:"Pending",value:String(pending),icon:"⏳",color:"#D4AF37"},{label:"Approved Today",value:"12",icon:"✅",color:"#34D399"},{label:"Rejected",value:"3",icon:"❌",color:"#F87171"},{label:"Total Refunded",value:"Rs24,650",icon:"💸",color:"#D4AF37"}]}/>
      {pending>0&&<AlertBox type="warning">{pending} refund requests pending. Process within 24 hours as per SLA.</AlertBox>}
      <TableCard title="Refund Requests" icon="↩" actions={<select className="gm-input btn-sm" style={{width:130}}><option>All</option><option>Pending</option><option>Approved</option><option>Rejected</option></select>}>
        <table className="gm-table"><thead><tr><th>Refund ID</th><th>User</th><th>Ride ID</th><th>Amount</th><th>Reason</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{refunds.map((r,i)=><tr key={i}><td style={{fontFamily:"monospace",color:"#D4AF37",fontSize:12}}>{r.id}</td><td>{r.user}</td><td style={{fontFamily:"monospace",fontSize:12}}>{r.rideId}</td><td style={{color:"#D4AF37",fontFamily:"monospace"}}>Rs{r.amount}</td><td style={{fontSize:12,maxWidth:160}}>{r.reason}</td><td style={{fontSize:12}}>{r.ago}</td><td><Badge status={r.status}/></td>
          <td>{r.status==="Pending"?<div style={{display:"flex",gap:5}}><button className="btn-success btn-xs" onClick={()=>approve(i)}>Approve</button><button className="btn-danger btn-xs" onClick={()=>openReject(i)}>Reject</button></div>:<span style={{fontSize:12,color:"rgba(255,255,255,0.3)"}}>Done</span>}</td>
        </tr>)}</tbody></table>
      </TableCard>
      <Modal open={rejectModal} onClose={()=>setRejectModal(false)} title="Reject Refund">
        {selIdx!==null&&<AlertBox type="error">Rejecting refund for {refunds[selIdx]?.user} — Rs{refunds[selIdx]?.amount}</AlertBox>}
        <FormGroup label="Rejection Reason"><textarea className="gm-input" rows="4" placeholder="Enter reason..." style={{resize:"vertical"}}/></FormGroup>
        <div style={{display:"flex",gap:8}}><button className="btn-outline" onClick={()=>setRejectModal(false)}>Cancel</button><button className="btn-danger" onClick={confirmReject}>Confirm Rejection</button></div>
      </Modal>
    </PageWrapper>
  );
}
export default function RefundsPage() { return <ToastProvider><Content/></ToastProvider>; }
