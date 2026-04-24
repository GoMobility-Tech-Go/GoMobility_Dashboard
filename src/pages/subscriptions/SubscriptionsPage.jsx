import { useState } from "react";
import { useToast, ToastProvider, PageWrapper, TableCard, Badge, AvatarCell, MiniStatRow, Modal, FormGroup, AlertBox, GlobalStyles, Card } from "../../components/ui/index.jsx";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { GoldTooltip } from "../../components/ui/index.jsx";

const PLANS=[{name:"GO Daily",price:49,days:1,rides:3,color:"#60A5FA",emoji:"🚗",subs:420,rev:20580,active:true},{name:"GO Monthly",price:299,days:30,rides:25,color:"#D4AF37",emoji:"🌟",subs:1840,rev:550160,active:true},{name:"GO Premium",price:599,days:30,rides:60,color:"#A78BFA",emoji:"👑",subs:580,rev:347420,active:true},{name:"GO Annual",price:2499,days:365,rides:300,color:"#34D399",emoji:"♾️",subs:180,rev:449820,active:false}];
const SUBS=[{name:"Rahul Sharma",plan:"GO Monthly",start:"Apr 1, 2026",expiry:"May 1, 2026",rides:12,status:"Active"},{name:"Priya Singh",plan:"GO Premium",start:"Apr 5, 2026",expiry:"May 5, 2026",rides:48,status:"Active"},{name:"Amit Kumar",plan:"GO Daily",start:"Apr 23, 2026",expiry:"Apr 24, 2026",rides:2,status:"Active"},{name:"Neha Gupta",plan:"GO Monthly",start:"Mar 15, 2026",expiry:"Apr 15, 2026",rides:25,status:"Active"}];
const EXPIRED=[{name:"Vikram Yadav",plan:"GO Monthly",expiredOn:"Apr 10, 2026",lastRide:"Apr 9, 2026",rides:24},{name:"Kavita Mishra",plan:"GO Daily",expiredOn:"Apr 20, 2026",lastRide:"Apr 20, 2026",rides:3},{name:"Deepak Soni",plan:"GO Monthly",expiredOn:"Apr 5, 2026",lastRide:"Apr 4, 2026",rides:21},{name:"Manish Dubey",plan:"GO Premium",expiredOn:"Mar 30, 2026",lastRide:"Mar 28, 2026",rides:52}];

function Content() {
  const toast=useToast(),[plans,setPlans]=useState(PLANS),[tab,setTab]=useState("plans"),[cm,setCm]=useState(false);
  const [np,setNp]=useState({name:"",price:"",days:"",rides:""});
  const togglePlan=(i)=>{setPlans(p=>p.map((x,j)=>j===i?{...x,active:!x.active}:x));toast(`Plan ${plans[i].active?"deactivated":"activated"}`,plans[i].active?"error":"success");};
  const createPlan=()=>{if(!np.name||!np.price){toast("Fill required fields","error");return;}setPlans(p=>[...p,{...np,price:+np.price,days:+np.days||30,rides:+np.rides||10,color:"#22D3EE",emoji:"🎫",subs:0,rev:0,active:true}]);toast("Plan created!","success");setCm(false);setNp({name:"",price:"",days:"",rides:""});};
  const revData=plans.filter(p=>p.active).map(p=>({name:p.name.replace("GO ",""),revenue:p.rev,color:p.color}));
  const totalRev=plans.reduce((a,b)=>a+b.rev,0);
  return (
    <PageWrapper title="Subscription Plans" subtitle="GO Mobility Pass — manage plans, revenue and subscribers" actions={<button className="btn-gold btn-sm" onClick={()=>setCm(true)}>+ New Plan</button>}>
      <GlobalStyles/>
      <MiniStatRow items={[{label:"Active Plans",value:String(plans.filter(p=>p.active).length),icon:"🎫",color:"#D4AF37"},{label:"Total Subscribers",value:plans.filter(p=>p.active).reduce((a,b)=>a+b.subs,0).toLocaleString(),icon:"👥"},{label:"Revenue (Month)",value:`Rs${(totalRev/1000).toFixed(0)}K`,icon:"💰",color:"#34D399"},{label:"Renewals Due",value:"142",icon:"🔄",color:"#F59E0B"}]}/>
      <div className="tab-nav">{[{id:"plans",l:"Plans"},{id:"revenue",l:"Revenue Breakdown"},{id:"subs",l:"Active Subscribers"},{id:"expired",l:"Expired Subscribers"}].map(t=><button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>)}</div>
      {tab==="plans"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
        {plans.map((p,i)=><Card key={i} style={{padding:20,textAlign:"center",borderColor:`${p.color}22`,opacity:p.active?1:0.6}}>
          <div style={{fontSize:32,marginBottom:8}}>{p.emoji}</div>
          <div style={{fontSize:15,fontWeight:800,fontFamily:"Cinzel,serif",color:"rgba(255,255,255,0.88)",marginBottom:4}}>{p.name}</div>
          <div style={{fontSize:26,fontWeight:900,color:p.color,marginBottom:6,fontFamily:"monospace"}}>Rs{p.price}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:4}}>{p.days} day{p.days>1?"s":""} · {p.rides} rides</div>
          <div style={{fontSize:12,color:"#34D399",fontWeight:700,marginBottom:10}}>Rev: Rs{p.rev.toLocaleString()}</div>
          <Badge status={p.active?"Active":"Disabled"}/>
          <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:14}}><button className="btn-outline btn-xs" onClick={()=>toast("Editing...","success")}>Edit</button><button className={`${p.active?"btn-danger":"btn-success"} btn-xs`} onClick={()=>togglePlan(i)}>{p.active?"Deactivate":"Activate"}</button></div>
        </Card>)}
      </div>}
      {tab==="revenue"&&<Card style={{padding:22}}>
        <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:4}}>Revenue by Plan — This Month</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:18}}>Total: Rs{totalRev.toLocaleString()}</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={revData} margin={{top:4,right:4,left:0,bottom:0}}>
            <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false}/>
            <XAxis dataKey="name" tick={{fill:"rgba(255,255,255,0.45)",fontSize:12}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:"rgba(255,255,255,0.3)",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`Rs${(v/1000).toFixed(0)}K`}/>
            <Tooltip content={<GoldTooltip/>}/>
            <Bar dataKey="revenue" name="Revenue (Rs)" radius={[8,8,0,0]}>{revData.map((e,i)=><Cell key={i} fill={e.color} fillOpacity={0.85}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>}
      {tab==="subs"&&<TableCard title="Active Subscribers" icon="👥" actions={<span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:100,fontSize:10.5,fontWeight:600,background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.25)",color:"#34D399"}}><span style={{width:6,height:6,borderRadius:"50%",background:"#34D399"}}/>{plans.filter(p=>p.active).reduce((a,b)=>a+b.subs,0)} active</span>}>
        <table className="gm-table"><thead><tr><th>User</th><th>Plan</th><th>Subscribed</th><th>Expires</th><th>Rides Used</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{SUBS.map((s,i)=>{const plan=PLANS.find(p=>p.name===s.plan)||PLANS[0];return <tr key={i}><td><AvatarCell name={s.name}/></td><td><span style={{display:"inline-flex",padding:"3px 8px",borderRadius:100,fontSize:10.5,fontWeight:600,background:`${plan.color}15`,border:`1px solid ${plan.color}30`,color:plan.color}}>{s.plan}</span></td><td style={{fontSize:12}}>{s.start}</td><td style={{fontSize:12}}>{s.expiry}</td><td>{s.rides}</td><td><Badge status={s.status}/></td><td><button className="btn-outline btn-xs" onClick={()=>toast("Renewal reminder sent!","success")}>Remind</button></td></tr>;})}</tbody>
        </table>
      </TableCard>}
      {tab==="expired"&&<>
        <AlertBox type="warning">Re-engagement opportunity — {EXPIRED.length} subscribers expired this month!</AlertBox>
        <TableCard title="Expired Subscribers" icon="⏰" actions={<button className="btn-gold btn-sm" onClick={()=>toast("Bulk renewal offer sent!","success")}>Send Renewal Offer to All</button>}>
          <table className="gm-table"><thead><tr><th>User</th><th>Plan</th><th>Expired On</th><th>Last Ride</th><th>Total Rides</th><th>Actions</th></tr></thead>
          <tbody>{EXPIRED.map((s,i)=>{const plan=PLANS.find(p=>p.name===s.plan)||PLANS[0];return <tr key={i}><td><AvatarCell name={s.name}/></td><td><span style={{display:"inline-flex",padding:"3px 8px",borderRadius:100,fontSize:10.5,fontWeight:600,background:`${plan.color}15`,border:`1px solid ${plan.color}30`,color:plan.color}}>{s.plan}</span></td><td style={{fontSize:12,color:"#F87171"}}>{s.expiredOn}</td><td style={{fontSize:12}}>{s.lastRide}</td><td>{s.rides}</td><td><div style={{display:"flex",gap:5}}><button className="btn-gold btn-xs" onClick={()=>toast("Renewal offer sent!","success")}>Send Offer</button></div></td></tr>;})}</tbody>
        </table>
      </TableCard></>}
      <Modal open={cm} onClose={()=>setCm(false)} title="Create New Plan">
        <FormGroup label="Plan Name"><input className="gm-input" placeholder="e.g. GO Monthly Pass" value={np.name} onChange={e=>setNp({...np,name:e.target.value})}/></FormGroup>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><FormGroup label="Price (Rs)"><input type="number" className="gm-input" placeholder="299" value={np.price} onChange={e=>setNp({...np,price:e.target.value})}/></FormGroup><FormGroup label="Duration (Days)"><input type="number" className="gm-input" placeholder="30" value={np.days} onChange={e=>setNp({...np,days:e.target.value})}/></FormGroup></div>
        <FormGroup label="Free Rides"><input type="number" className="gm-input" placeholder="20" value={np.rides} onChange={e=>setNp({...np,rides:e.target.value})}/></FormGroup>
        <div style={{display:"flex",gap:8}}><button className="btn-outline" onClick={()=>setCm(false)}>Cancel</button><button className="btn-gold" onClick={createPlan}>Create Plan</button></div>
      </Modal>
    </PageWrapper>
  );
}
export default function SubscriptionsPage() { return <ToastProvider><Content/></ToastProvider>; }
