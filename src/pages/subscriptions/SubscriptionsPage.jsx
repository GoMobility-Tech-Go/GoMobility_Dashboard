import { useState, useEffect } from "react";
import { useToast, ToastProvider, PageWrapper, TableCard, Badge, AvatarCell, MiniStatRow, Modal, FormGroup, AlertBox, GlobalStyles, Card } from "../../components/ui/index.jsx";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { GoldTooltip } from "../../components/ui/index.jsx";
import { api } from "../../services/api.js";

const PLAN_COLORS = ["#60A5FA", "#D4AF37", "#A78BFA", "#34D399", "#F87171", "#F59E0B"];
const PLAN_EMOJIS = ["🚗", "🌟", "👑", "♾️", "🎫", "⭐"];

function normalizePlan(p, i) {
  return {
    id: p.id || i,
    name: p.name || p.plan_name || 'Plan',
    price: p.price || p.amount || 0,
    days: p.duration_days || p.days || 30,
    rides: p.ride_limit || p.rides || 0,
    color: PLAN_COLORS[i % PLAN_COLORS.length],
    emoji: PLAN_EMOJIS[i % PLAN_EMOJIS.length],
    subs: p.subscriber_count || 0,
    rev: p.total_revenue || 0,
    active: p.is_active !== false,
  };
}

function Content() {
  const toast=useToast();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("plans");
  const [cm, setCm] = useState(false);
  const [np, setNp] = useState({name:"",price:"",days:"",rides:""});

  useEffect(() => {
    api.getSubscriptionPlans()
      .then(res => {
        const raw = res?.data?.plans || res?.plans || res?.data || [];
        setPlans(Array.isArray(raw) ? raw.map(normalizePlan) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const togglePlan=(i)=>{
    const plan = plans[i];
    api.togglePlanStatus(plan.id, !plan.active).catch(() => {});
    setPlans(p=>p.map((x,j)=>j===i?{...x,active:!x.active}:x));
    toast(`Plan ${plan.active?"deactivated":"activated"}`, plan.active?"error":"success");
  };
  const createPlan=()=>{
    if(!np.name||!np.price){toast("Fill required fields","error");return;}
    api.createSubscriptionPlan({ name: np.name, price: +np.price, duration_days: +np.days||30, ride_limit: +np.rides||10 }).catch(() => {});
    setPlans(p=>[...p,normalizePlan({name:np.name,price:+np.price,days:+np.days||30,rides:+np.rides||10,is_active:true}, p.length)]);
    toast("Plan created!","success");
    setCm(false);
    setNp({name:"",price:"",days:"",rides:""});
  };
  const revData=plans.filter(p=>p.active).map(p=>({name:p.name.replace("GO ",""),revenue:p.rev,color:p.color}));
  const totalRev=plans.reduce((a,b)=>a+b.rev,0);
  return (
    <PageWrapper title="Subscription Plans" subtitle="GO Mobility Pass — manage plans, revenue and subscribers" actions={<button className="btn-gold btn-sm" onClick={()=>setCm(true)}>+ New Plan</button>}>
      <GlobalStyles/>
      <MiniStatRow items={[{label:"Active Plans",value:loading?"—":String(plans.filter(p=>p.active).length),icon:"🎫",color:"#D4AF37"},{label:"Total Subscribers",value:loading?"—":plans.filter(p=>p.active).reduce((a,b)=>a+b.subs,0).toLocaleString(),icon:"👥"},{label:"Revenue (Month)",value:loading?"—":`Rs${(totalRev/1000).toFixed(0)}K`,icon:"💰",color:"#34D399"},{label:"Renewals Due",value:"—",icon:"🔄",color:"#F59E0B"}]}/>
      <div className="tab-nav">{[{id:"plans",l:"Plans"},{id:"revenue",l:"Revenue Breakdown"},{id:"subs",l:"Active Subscribers"},{id:"expired",l:"Expired Subscribers"}].map(t=><button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>)}</div>
      {tab==="plans"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
        {loading&&<div style={{gridColumn:"1/-1",padding:50,textAlign:"center",color:"rgba(255,255,255,0.3)",fontFamily:"Outfit,sans-serif"}}>Loading plans...</div>}
        {!loading&&plans.length===0&&<div style={{gridColumn:"1/-1",padding:50,textAlign:"center",color:"rgba(255,255,255,0.3)",fontFamily:"Outfit,sans-serif"}}><div style={{fontSize:36,marginBottom:10}}>🎫</div>No subscription plans found</div>}
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
      {tab==="subs"&&<TableCard title="Active Subscribers" icon="👥">
        <div style={{padding:50,textAlign:"center",color:"rgba(255,255,255,0.3)",fontFamily:"Outfit,sans-serif"}}><div style={{fontSize:36,marginBottom:10}}>👥</div>Subscriber list not available via API</div>
      </TableCard>}
      {tab==="expired"&&<TableCard title="Expired Subscribers" icon="⏰">
        <div style={{padding:50,textAlign:"center",color:"rgba(255,255,255,0.3)",fontFamily:"Outfit,sans-serif"}}><div style={{fontSize:36,marginBottom:10}}>⏰</div>Expired subscriber list not available via API</div>
      </TableCard>}
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
