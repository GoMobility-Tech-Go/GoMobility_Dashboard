import { useState, useEffect } from "react";
import { useToast, ToastProvider, PageWrapper, Card, TableCard, MiniStatRow, GlobalStyles, AlertBox } from "../../components/ui/index.jsx";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { GoldTooltip } from "../../components/ui/index.jsx";

const genUptime = () => Array.from({length:24},(_,i)=>({ hour:`${i}:00`, api:95+Math.random()*5, db:96+Math.random()*4, pg:93+Math.random()*7 }));

const SERVICES = [
  { name:"API Server",        status:"Operational", uptime:"99.98%", latency:"42ms",  icon:"⚡", color:"#34D399" },
  { name:"Database (MySQL)",  status:"Operational", uptime:"99.99%", latency:"8ms",   icon:"🗄️", color:"#34D399" },
  { name:"Razorpay Gateway",  status:"Operational", uptime:"99.95%", latency:"124ms", icon:"💳", color:"#34D399" },
  { name:"Paytm Gateway",     status:"Degraded",    uptime:"98.2%",  latency:"380ms", icon:"💳", color:"#F59E0B" },
  { name:"UPI Gateway",       status:"Operational", uptime:"99.87%", latency:"156ms", icon:"📱", color:"#34D399" },
  { name:"Push Notification", status:"Operational", uptime:"99.91%", latency:"215ms", icon:"🔔", color:"#34D399" },
  { name:"Maps / GPS Service",status:"Operational", uptime:"99.78%", latency:"89ms",  icon:"🗺️", color:"#34D399" },
  { name:"SMS OTP Service",   status:"Operational", uptime:"99.65%", latency:"340ms", icon:"📲", color:"#34D399" },
];

const CRASHES = [
  { time:"Apr 23, 10:42 AM", version:"2.8.0", os:"Android 13", device:"Samsung Galaxy S22", issue:"Null pointer on booking screen", count:3 },
  { time:"Apr 23, 09:15 AM", version:"2.7.8", os:"iOS 17",     device:"iPhone 14",          issue:"Payment sheet crash on UPI timeout", count:7 },
  { time:"Apr 22, 03:28 PM", version:"2.8.0", os:"Android 12", device:"OnePlus Nord",        issue:"Map not loading in low network", count:12 },
  { time:"Apr 21, 11:00 AM", version:"2.7.9", os:"iOS 16",     device:"iPhone 12",           issue:"App freeze on ride acceptance", count:2 },
];

const MATCHING_ALERTS = [
  { time:"11:42 AM", city:"Patna", zone:"Gandhi Maidan", avgTime:"4.8 min", driversAvail:3, status:"Slow" },
  { time:"10:15 AM", city:"Patna", zone:"Patna Jn.",     avgTime:"2.1 min", driversAvail:8, status:"Normal" },
  { time:"09:30 AM", city:"Delhi", zone:"Connaught Place",avgTime:"1.8 min", driversAvail:14,status:"Fast" },
];

function StatusBadge({ status }) {
  const S={Operational:{c:"#34D399",bg:"rgba(52,211,153,0.1)",br:"rgba(52,211,153,0.25)"},Degraded:{c:"#F59E0B",bg:"rgba(245,158,11,0.1)",br:"rgba(245,158,11,0.25)"},Down:{c:"#F87171",bg:"rgba(248,113,113,0.1)",br:"rgba(248,113,113,0.25)"}}[status]||{c:"#34D399",bg:"rgba(52,211,153,0.1)",br:"rgba(52,211,153,0.25)"};
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:100,fontSize:10.5,fontWeight:600,background:S.bg,border:`1px solid ${S.br}`,color:S.c}}><span style={{width:6,height:6,borderRadius:"50%",background:S.c}}/>{status}</span>;
}

function Content() {
  const toast=useToast();
  const [uptime]=useState(genUptime());
  const [live,setLive]=useState({apiReq:1247,errorRate:0.24,activeRides:43,matching:2.3});
  const [tick,setTick]=useState(0);

  useEffect(()=>{const t=setInterval(()=>{setLive(l=>({apiReq:l.apiReq+Math.floor(Math.random()*10-3),errorRate:+(l.errorRate+(Math.random()*0.1-0.05)).toFixed(2),activeRides:Math.max(30,l.activeRides+Math.floor(Math.random()*5-2)),matching:+(l.matching+(Math.random()*0.4-0.2)).toFixed(1)}));setTick(t=>t+1);},[2000]);return()=>clearInterval(t);},[]);

  const degraded=SERVICES.filter(s=>s.status!=="Operational");
  return (
    <PageWrapper title="System Health Dashboard" subtitle="Real-time server status, error rates, payment gateway and app crash monitoring">
      <GlobalStyles/>
      {degraded.length>0&&<AlertBox type="warning">⚠️ {degraded.length} service(s) degraded: {degraded.map(s=>s.name).join(", ")}. Investigate immediately.</AlertBox>}

      {/* Live metrics */}
      <MiniStatRow items={[
        {label:"API Requests/min", value:String(live.apiReq),                 icon:"⚡", color:"#D4AF37"},
        {label:"Error Rate",       value:`${live.errorRate}%`,                 icon:"❌", color:live.errorRate>1?"#F87171":"#34D399"},
        {label:"Active Rides",     value:String(live.activeRides),             icon:"🚗", color:"#60A5FA"},
        {label:"Avg Match Time",   value:`${live.matching} min`,              icon:"⏱️", color:live.matching>4?"#F59E0B":"#34D399"},
        {label:"Services Up",      value:`${SERVICES.filter(s=>s.status==="Operational").length}/${SERVICES.length}`, icon:"✅", color:"#34D399"},
        {label:"Crash Reports",    value:String(CRASHES.length),               icon:"💥", color:"#F87171"},
      ]}/>

      {/* Service Status Grid */}
      <Card style={{padding:22,marginBottom:18}}>
        <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:4}}>Service Status — Real Time</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:18}}>All platform services and third-party integrations</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
          {SERVICES.map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,background:"rgba(255,255,255,0.03)",border:`1px solid ${s.color}20`,borderRadius:12,padding:"12px 16px"}}>
              <span style={{fontSize:22,flexShrink:0}}>{s.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:600,color:"rgba(255,255,255,0.82)",marginBottom:3}}>{s.name}</div>
                <div style={{display:"flex",gap:10,fontSize:11,color:"rgba(255,255,255,0.45)"}}>
                  <span>Uptime: <strong style={{color:s.color}}>{s.uptime}</strong></span>
                  <span>Latency: <strong style={{color:parseInt(s.latency)>300?"#F59E0B":s.color}}>{s.latency}</strong></span>
                </div>
              </div>
              <StatusBadge status={s.status}/>
            </div>
          ))}
        </div>
      </Card>

      {/* Uptime Chart */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:18}}>
        <Card style={{padding:20}}>
          <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:4}}>Service Uptime (Last 24h)</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:14}}>API · Database · Payment Gateway</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={uptime} margin={{top:4,right:4,left:0,bottom:0}}>
              <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false}/>
              <XAxis dataKey="hour" tick={{fill:"rgba(255,255,255,0.3)",fontSize:8}} axisLine={false} tickLine={false} interval={3}/>
              <YAxis domain={[90,100]} tick={{fill:"rgba(255,255,255,0.3)",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
              <Tooltip content={<GoldTooltip/>}/>
              <Line type="monotone" dataKey="api" name="API" stroke="#D4AF37" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="db"  name="Database" stroke="#34D399" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="pg"  name="Payment Gateway" stroke="#60A5FA" strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{padding:20}}>
          <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:14}}>Payment Success Rates</div>
          {[{name:"Razorpay",rate:98.4,color:"#34D399"},{name:"Paytm",rate:94.1,color:"#F59E0B"},{name:"UPI",rate:97.8,color:"#60A5FA"},{name:"Debit Card",rate:96.2,color:"#A78BFA"}].map((p,i)=>(
            <div key={i} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:12}}>
                <span style={{color:"rgba(255,255,255,0.6)"}}>{p.name}</span>
                <span style={{fontWeight:700,color:p.color}}>{p.rate}%</span>
              </div>
              <div className="prog-bar"><div style={{height:"100%",borderRadius:100,width:`${p.rate}%`,background:`linear-gradient(90deg,${p.color},${p.color}90)`,transition:"width .8s ease"}}/></div>
            </div>
          ))}
        </Card>
      </div>

      {/* Crash Reports */}
      <TableCard title="App Crash Reports" icon="💥"
        actions={<button className="btn-outline btn-sm" onClick={()=>toast("Crash report downloaded!","success")}>↓ Download</button>}
        style={{marginBottom:18}}>
        <table className="gm-table">
          <thead><tr><th>Time</th><th>App Version</th><th>OS</th><th>Device</th><th>Issue</th><th>Count</th><th>Priority</th></tr></thead>
          <tbody>{CRASHES.map((c,i)=>(
            <tr key={i}>
              <td style={{fontSize:12}}>{c.time}</td>
              <td style={{fontFamily:"monospace",color:"#D4AF37"}}>{c.version}</td>
              <td style={{fontSize:12}}>{c.os}</td>
              <td style={{fontSize:12}}>{c.device}</td>
              <td style={{fontSize:12,color:"rgba(255,255,255,0.6)",maxWidth:200}}>{c.issue}</td>
              <td style={{color:c.count>10?"#F87171":c.count>5?"#F59E0B":"#34D399",fontWeight:700,fontFamily:"monospace"}}>{c.count}x</td>
              <td><span style={{display:"inline-flex",padding:"3px 8px",borderRadius:100,fontSize:10.5,fontWeight:600,background:c.count>10?"rgba(248,113,113,0.1)":c.count>5?"rgba(245,158,11,0.1)":"rgba(52,211,153,0.1)",border:`1px solid ${c.count>10?"rgba(248,113,113,0.28)":c.count>5?"rgba(245,158,11,0.28)":"rgba(52,211,153,0.25)"}`,color:c.count>10?"#F87171":c.count>5?"#F59E0B":"#34D399"}}>{c.count>10?"Critical":c.count>5?"High":"Low"}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </TableCard>

      {/* Matching Alerts */}
      <TableCard title="Slow Ride Matching Alerts" icon="⏱️">
        <table className="gm-table">
          <thead><tr><th>Time</th><th>City</th><th>Zone</th><th>Avg Match Time</th><th>Drivers Available</th><th>Status</th></tr></thead>
          <tbody>{MATCHING_ALERTS.map((a,i)=>(
            <tr key={i}>
              <td style={{fontSize:12}}>{a.time}</td><td>{a.city}</td><td>{a.zone}</td>
              <td style={{color:a.status==="Slow"?"#F87171":a.status==="Normal"?"#D4AF37":"#34D399",fontWeight:700,fontFamily:"monospace"}}>{a.avgTime}</td>
              <td style={{color:"#60A5FA",fontWeight:700}}>{a.driversAvail}</td>
              <td><span style={{display:"inline-flex",padding:"3px 9px",borderRadius:100,fontSize:10.5,fontWeight:600,background:a.status==="Slow"?"rgba(248,113,113,0.1)":a.status==="Normal"?"rgba(212,175,55,0.1)":"rgba(52,211,153,0.1)",border:`1px solid ${a.status==="Slow"?"rgba(248,113,113,0.28)":a.status==="Normal"?"rgba(212,175,55,0.28)":"rgba(52,211,153,0.25)"}`,color:a.status==="Slow"?"#F87171":a.status==="Normal"?"#D4AF37":"#34D399"}}>{a.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </TableCard>
    </PageWrapper>
  );
}
export default function SystemHealthPage() { return <ToastProvider><Content/></ToastProvider>; }
