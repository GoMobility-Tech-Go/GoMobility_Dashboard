import { useState } from "react";
import { useToast, ToastProvider, PageWrapper, TableCard, Badge, AvatarCell, MiniStatRow, AlertBox, GlobalStyles, Card } from "../../components/ui/index.jsx";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { GoldTooltip } from "../../components/ui/index.jsx";

const FLAGS=[{text:"Very rude driver",rating:1},{text:"Took wrong route to increase fare",rating:2},{text:"Driver using phone while driving",rating:1},{text:"Overcharged Rs200 extra, fake surge",rating:2},{text:"Driver smelled of alcohol",rating:1},{text:"Abusive language when asked for AC",rating:2},{text:"Driver never arrived but marked completed",rating:1},{text:"Fake 5-star rating by bot",rating:2}];
const UN=["Rahul","Priya","Amit","Neha","Raj","Anjali","Karan","Divya"],DN=["Vikram","Suresh","Manish","Sanjay","Arjun","Deepak","Mohit","Pankaj"];
const LOW=[{name:"Ramesh Kumar",rating:"2.9",rides:120,since:"8 days ago"},{name:"Sunil Verma",rating:"3.1",rides:88,since:"5 days ago"},{name:"Pankaj Singh",rating:"3.0",rides:210,since:"12 days ago"},{name:"Mohit Yadav",rating:"2.7",rides:56,since:"3 days ago"},{name:"Deepak Jha",rating:"3.2",rides:175,since:"15 days ago"}];
const TRENDS=LOW.map(d=>({driver:d.name,data:[{m:"Nov",r:4.2},{m:"Dec",r:3.9},{m:"Jan",r:3.6},{m:"Feb",r:3.4},{m:"Mar",r:3.1},{m:"Apr",r:parseFloat(d.rating)}]}));

function Content() {
  const toast=useToast(),[tab,setTab]=useState("flagged"),[selDriver,setSelDriver]=useState(null);
  const [flagged,setFlagged]=useState(FLAGS.map((r,i)=>({...r,user:UN[i],driver:DN[i],time:`${i+1} hrs ago`})));
  const hide=(i)=>{setFlagged(f=>f.filter((_,j)=>j!==i));toast("Review hidden","error");};
  const unflag=(i)=>{setFlagged(f=>f.filter((_,j)=>j!==i));toast("Review unflagged","success");};
  return (
    <PageWrapper title="Review & Rating Moderation" subtitle="Monitor reviews, moderate content and track driver rating trends">
      <GlobalStyles/>
      <MiniStatRow items={[{label:"Flagged Reviews",value:String(flagged.length),icon:"🚩",color:"#F87171"},{label:"Avg Platform Rating",value:"4.62★",icon:"⭐",color:"#D4AF37"},{label:"Low Rating Drivers",value:String(LOW.length),icon:"⚠️",color:"#F59E0B"},{label:"Reviews Today",value:"284",icon:"📝"}]}/>
      {flagged.length>0&&<AlertBox type="error">{flagged.length} reviews flagged and pending moderation action.</AlertBox>}
      <div className="tab-nav">{[{id:"flagged",l:`Flagged Reviews (${flagged.length})`},{id:"low",l:"Low Rating Alerts"},{id:"analytics",l:"Rating Analytics"}].map(t=><button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>)}</div>
      {tab==="flagged"&&<TableCard title="Flagged Reviews" icon="🚩">
        {flagged.length===0?<div style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.35)"}}><div style={{fontSize:40,marginBottom:10}}>✅</div>No flagged reviews!</div>:
        <table className="gm-table"><thead><tr><th>Review</th><th>By User</th><th>For Driver</th><th>Rating</th><th>Flagged</th><th>Actions</th></tr></thead>
        <tbody>{flagged.map((r,i)=><tr key={i}><td style={{maxWidth:200,fontSize:12,color:"rgba(255,255,255,0.55)",fontStyle:"italic"}}>"{r.text}"</td><td>{r.user}</td><td>{r.driver}</td><td style={{color:"#F87171",fontWeight:700}}>{"★".repeat(r.rating)} {r.rating}.0</td><td style={{fontSize:12}}>{r.time}</td><td><div style={{display:"flex",gap:5}}><button className="btn-danger btn-xs" onClick={()=>hide(i)}>Hide</button><button className="btn-outline btn-xs" onClick={()=>unflag(i)}>Unflag</button></div></td></tr>)}</tbody></table>}
      </TableCard>}
      {tab==="low"&&<TableCard title="Low Rating Drivers (Below 3.5★)" icon="⚠️">
        <table className="gm-table"><thead><tr><th>Driver</th><th>Rating</th><th>Total Rides</th><th>Drop Since</th><th>Actions</th></tr></thead>
        <tbody>{LOW.map((d,i)=><tr key={i}><td style={{cursor:"pointer"}} onClick={()=>{setSelDriver(d);setTab("analytics");}}><AvatarCell name={d.name} gradient="linear-gradient(135deg,#F87171,#991b1b)"/></td><td style={{color:"#F87171",fontWeight:700,fontFamily:"monospace"}}>★ {d.rating}</td><td>{d.rides}</td><td style={{fontSize:12}}>{d.since}</td><td><div style={{display:"flex",gap:5}}><button className="btn-outline btn-xs" onClick={()=>toast("Warning sent!","success")}>Warn</button><button className="btn-danger btn-xs" onClick={()=>toast("Driver suspended","error")}>Suspend</button></div></td></tr>)}</tbody>
        </table>
      </TableCard>}
      {tab==="analytics"&&<div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
          {LOW.map((d,i)=><button key={i} onClick={()=>setSelDriver(d)} style={{padding:"8px 14px",borderRadius:10,border:`1px solid ${selDriver?.name===d.name?"rgba(212,175,55,0.5)":"rgba(212,175,55,0.15)"}`,background:selDriver?.name===d.name?"rgba(212,175,55,0.1)":"rgba(255,255,255,0.03)",color:selDriver?.name===d.name?"#D4AF37":"rgba(255,255,255,0.5)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"Outfit,sans-serif",transition:"all .2s"}}>{d.name} ({d.rating}★)</button>)}
        </div>
        {selDriver?(()=>{const trend=TRENDS.find(t=>t.driver===selDriver.name);return(
          <Card style={{padding:20}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div><div style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.85)"}}>{selDriver.name} — Rating Trend</div><div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginTop:2}}>6-month rating history</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:22,fontWeight:900,color:"#F87171",fontFamily:"monospace"}}>★ {selDriver.rating}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Current rating</div></div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trend.data} margin={{top:4,right:4,left:0,bottom:0}}>
                <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false}/>
                <XAxis dataKey="m" tick={{fill:"rgba(255,255,255,0.4)",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis domain={[2,5]} tick={{fill:"rgba(255,255,255,0.3)",fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<GoldTooltip/>}/>
                <Line type="monotone" dataKey="r" name="Rating" stroke="#F87171" strokeWidth={2.5} dot={{r:4,fill:"#F87171"}} activeDot={{r:6}}/>
                <Line type="monotone" dataKey={()=>3.5} name="Min Threshold" stroke="rgba(212,175,55,0.4)" strokeWidth={1.5} strokeDasharray="4 4" dot={false}/>
              </LineChart>
            </ResponsiveContainer>
            <div style={{display:"flex",gap:8,marginTop:14}}><button className="btn-outline btn-sm" onClick={()=>toast("Warning sent!","success")}>Send Warning</button><button className="btn-gold btn-sm" onClick={()=>toast("Training resources sent!","success")}>Send Training</button><button className="btn-danger btn-sm" onClick={()=>toast("Driver suspended","error")}>Suspend</button></div>
          </Card>
        );})():<div style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.3)"}}><div style={{fontSize:36,marginBottom:10}}>📊</div>Select a driver above to view rating trend</div>}
      </div>}
    </PageWrapper>
  );
}
export default function ReviewsPage() { return <ToastProvider><Content/></ToastProvider>; }
