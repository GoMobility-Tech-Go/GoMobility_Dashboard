import { useState } from "react";
import { useToast, ToastProvider, PageWrapper, Card, TableCard, MiniStatRow, GlobalStyles, FormGroup, Toggle, Modal, AlertBox, AvatarCell } from "../../components/ui/index.jsx";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { GoldTooltip } from "../../components/ui/index.jsx";

const SEGMENTS = [
  { id:1, name:"Power Users",     desc:"Users with 20+ rides in last 30 days",    count:842,  color:"#D4AF37", icon:"⚡", criteria:"rides>=20", avgRides:38, avgSpend:4200, retention:94 },
  { id:2, name:"New Users",       desc:"Joined in last 30 days, 0–3 rides",        count:1240, color:"#34D399", icon:"🆕", criteria:"days<=30",  avgRides:2,  avgSpend:180,  retention:42 },
  { id:3, name:"Churned Users",   desc:"No ride in last 60 days",                 count:2180, color:"#F87171", icon:"😴", criteria:"lastRide>60d",avgRides:0,  avgSpend:0,    retention:0  },
  { id:4, name:"Regular Riders",  desc:"1–10 rides per month",                    count:6420, color:"#60A5FA", icon:"🚗", criteria:"rides<=10",  avgRides:5,  avgSpend:650,  retention:68 },
  { id:5, name:"Weekend Riders",  desc:"Only ride on Sat/Sun",                    count:1840, color:"#A78BFA", icon:"📅", criteria:"weekend=true",avgRides:4, avgSpend:480,  retention:55 },
  { id:6, name:"Subscription Holders", desc:"Active GO Pass subscribers",          count:3020, color:"#F59E0B", icon:"🎫", criteria:"hasPass=true",avgRides:22, avgSpend:299,  retention:88 },
];

const PIE_DATA = SEGMENTS.map(s => ({ name:s.name, value:s.count, color:s.color }));

const USERS_SAMPLE = [
  { name:"Rahul Sharma", rides:48, lastRide:"Today", wallet:840, status:"Active" },
  { name:"Priya Singh",  rides:32, lastRide:"2 days", wallet:320, status:"Active" },
  { name:"Amit Kumar",   rides:28, lastRide:"Today", wallet:180, status:"Active" },
  { name:"Neha Gupta",   rides:24, lastRide:"1 day",  wallet:640, status:"Active" },
  { name:"Raj Patel",    rides:22, lastRide:"3 days", wallet:120, status:"Active" },
];

function Content() {
  const toast = useToast();
  const [segments, setSegments] = useState(SEGMENTS);
  const [selSegment, setSelSegment] = useState(SEGMENTS[0]);
  const [createModal, setCreateModal] = useState(false);
  const [campaignModal, setCampaignModal] = useState(false);
  const [ns, setNs] = useState({ name:"", desc:"", color:"#D4AF37", icon:"👥", criteria:"" });

  const createSegment = () => {
    if (!ns.name || !ns.desc) { toast("Fill required fields","error"); return; }
    setSegments(s => [...s, { id:s.length+1, ...ns, count:Math.floor(Math.random()*1000+100), avgRides:0, avgSpend:0, retention:0 }]);
    toast(`Segment "${ns.name}" created!`, "success");
    setCreateModal(false);
    setNs({ name:"", desc:"", color:"#D4AF37", icon:"👥", criteria:"" });
  };

  return (
    <PageWrapper
      title="User Segment Manager"
      subtitle="Group users by behavior, send targeted campaigns and re-engage churned users"
      actions={
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn-outline btn-sm" onClick={()=>toast("Segment data exported!","success")}>↓ Export Data</button>
          <button className="btn-gold btn-sm" onClick={()=>setCreateModal(true)}>+ Create Segment</button>
        </div>
      }>
      <GlobalStyles/>

      <MiniStatRow items={[
        { label:"Total Segments",   value:String(segments.length),                                   icon:"📊", color:"#D4AF37"  },
        { label:"Total Users",      value:segments.reduce((a,b)=>a+b.count,0).toLocaleString(),      icon:"👥", color:"#60A5FA"  },
        { label:"Power Users",      value:String(segments.find(s=>s.name==="Power Users")?.count||0), icon:"⚡", color:"#D4AF37"  },
        { label:"Churned Users",    value:String(segments.find(s=>s.name==="Churned Users")?.count||0), icon:"😴", color:"#F87171" },
        { label:"Subscription Users",value:String(segments.find(s=>s.name==="Subscription Holders")?.count||0), icon:"🎫",color:"#F59E0B"},
        { label:"New This Month",   value:String(segments.find(s=>s.name==="New Users")?.count||0),  icon:"🆕", color:"#34D399"  },
      ]}/>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,2fr) minmax(0,1fr)", gap:16, marginBottom:18 }}>
        {/* Segment Cards */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, alignContent:"start" }}>
          {segments.map((s,i) => (
            <Card key={i} onClick={()=>setSelSegment(s)} style={{ padding:"16px 18px", cursor:"pointer", borderColor:selSegment?.id===s.id?`${s.color}45`:`${s.color}18`, background:selSegment?.id===s.id?`${s.color}08`:"rgba(255,255,255,0.025)", transition:"all .2s" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:12 }}>
                <span style={{ fontSize:22, flexShrink:0 }}>{s.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:selSegment?.id===s.id?s.color:"rgba(255,255,255,0.85)", marginBottom:2, fontFamily:"Cinzel,serif" }}>{s.name}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.42)", lineHeight:1.4 }}>{s.desc}</div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                {[{l:"Users",v:s.count.toLocaleString(),c:s.color},{l:"Avg Rides",v:s.avgRides,c:"#60A5FA"},{l:"Retention",v:s.retention+"%",c:s.retention>70?"#34D399":s.retention>40?"#F59E0B":"#F87171"}].map((m,j)=>(
                  <div key={j} style={{ background:"rgba(0,0,0,0.18)", borderRadius:8, padding:"6px 8px", textAlign:"center" }}>
                    <div style={{ fontSize:14, fontWeight:800, color:m.c, fontFamily:"monospace" }}>{m.v}</div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.32)", marginTop:2 }}>{m.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:6, marginTop:12 }}>
                <button className="btn-outline btn-xs" style={{ flex:1, justifyContent:"center" }} onClick={e=>{e.stopPropagation();setSelSegment(s);setCampaignModal(true);}}>Send Campaign</button>
                <button className="btn-outline btn-xs" onClick={e=>{e.stopPropagation();toast(`${s.name} data exported!`,"success");}}>↓ Export</button>
              </div>
            </Card>
          ))}
        </div>

        {/* Segment Pie + Details */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Card style={{ padding:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.85)", marginBottom:14 }}>User Distribution</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {PIE_DATA.map((e,i)=><Cell key={i} fill={e.color} fillOpacity={0.85}/>)}
              </Pie><Tooltip content={<GoldTooltip/>}/></PieChart>
            </ResponsiveContainer>
            {PIE_DATA.map((p,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:11.5, marginTop:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:8,height:8,borderRadius:2,background:p.color }}/><span style={{ color:"rgba(255,255,255,0.6)" }}>{p.name}</span></div>
                <span style={{ color:p.color, fontWeight:700 }}>{((p.value/PIE_DATA.reduce((a,b)=>a+b.value,0))*100).toFixed(0)}%</span>
              </div>
            ))}
          </Card>

          {selSegment && (
            <Card style={{ padding:16, borderColor:`${selSegment.color}28` }}>
              <div style={{ fontSize:12, fontWeight:700, color:selSegment.color, marginBottom:10 }}>{selSegment.icon} {selSegment.name}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {[["Total Users",selSegment.count.toLocaleString()],["Avg Rides/Month",selSegment.avgRides],["Avg Spend",`Rs${selSegment.avgSpend}`],["Retention Rate",selSegment.retention+"%"]].map(([l,v],i)=>(
                  <div key={i} style={{ display:"flex",justifyContent:"space-between",fontSize:12,padding:"6px 0",borderBottom:"1px solid rgba(212,175,55,0.07)" }}>
                    <span style={{ color:"rgba(255,255,255,0.42)" }}>{l}</span>
                    <span style={{ color:"rgba(255,255,255,0.85)", fontWeight:600 }}>{v}</span>
                  </div>
                ))}
              </div>
              <button className="btn-gold" style={{ width:"100%",justifyContent:"center",marginTop:12 }} onClick={()=>setCampaignModal(true)}>Send Campaign to Segment</button>
            </Card>
          )}
        </div>
      </div>

      {/* Users in Segment Table */}
      {selSegment && (
        <TableCard title={`${selSegment.icon} ${selSegment.name} — Sample Users`} icon="👥"
          actions={<button className="btn-outline btn-sm" onClick={()=>toast(`${selSegment.name} data exported!`,"success")}>↓ Export All {selSegment.count} Users</button>}>
          <table className="gm-table">
            <thead><tr><th>User</th><th>Rides (Month)</th><th>Last Ride</th><th>Wallet</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{USERS_SAMPLE.map((u,i)=>(
              <tr key={i}>
                <td><AvatarCell name={u.name}/></td>
                <td style={{ color:"#D4AF37", fontFamily:"monospace", fontWeight:700 }}>{u.rides}</td>
                <td style={{ fontSize:12 }}>{u.lastRide} ago</td>
                <td style={{ color:"#34D399", fontFamily:"monospace" }}>Rs{u.wallet}</td>
                <td><span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:100,fontSize:10.5,fontWeight:600,background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.25)",color:"#34D399" }}><span style={{ width:5,height:5,borderRadius:"50%",background:"#34D399" }}/>Active</span></td>
                <td><div style={{ display:"flex", gap:5 }}>
                  <button className="btn-outline btn-xs" onClick={()=>toast(`Profile opened for ${u.name}`,"success")}>View</button>
                  <button className="btn-outline btn-xs" onClick={()=>toast(`Promo sent to ${u.name}!`,"success")}>Send Promo</button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{ padding:"10px 16px", borderTop:"1px solid rgba(212,175,55,0.08)", fontSize:12, color:"rgba(255,255,255,0.35)" }}>
            Showing 5 of {selSegment.count.toLocaleString()} users in {selSegment.name}
          </div>
        </TableCard>
      )}

      {/* Churned Re-engagement */}
      {selSegment?.name === "Churned Users" && (
        <Card style={{ padding:22, marginTop:18, borderColor:"rgba(248,113,113,0.25)" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#F87171", marginBottom:4, fontFamily:"Cinzel,serif" }}>😴 Re-Engagement Strategy — Churned Users</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:18 }}>2,180 users have not ridden in 60+ days. Send them a comeback offer!</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {[{icon:"💸",title:"50% Off Comeback",desc:"Send 50% discount on first re-ride",action:"Send Offer"},{icon:"📱",title:"Push Notification",desc:"Remind them GO Mobility is available",action:"Send Push"},{icon:"📧",title:"Email Campaign",desc:"Send personalized email with offer code",action:"Send Email"}].map((s,i)=>(
              <div key={i} style={{ background:"rgba(248,113,113,0.05)", border:"1px solid rgba(248,113,113,0.15)", borderRadius:12, padding:"14px 16px", textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>{s.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.82)", marginBottom:4 }}>{s.title}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", marginBottom:12, lineHeight:1.5 }}>{s.desc}</div>
                <button className="btn-danger btn-sm" style={{ width:"100%", justifyContent:"center" }} onClick={()=>toast(`${s.action} sent to 2,180 churned users!`,"success")}>{s.action}</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create Segment Modal */}
      <Modal open={createModal} onClose={()=>setCreateModal(false)} title="📊 Create User Segment">
        <FormGroup label="Segment Name"><input className="gm-input" placeholder="e.g. High Value Users" value={ns.name} onChange={e=>setNs({...ns,name:e.target.value})}/></FormGroup>
        <FormGroup label="Description"><input className="gm-input" placeholder="e.g. Users with 20+ rides and Rs5000+ spend" value={ns.desc} onChange={e=>setNs({...ns,desc:e.target.value})}/></FormGroup>
        <FormGroup label="Filter Criteria (Rule-based)">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <select className="gm-input"><option>Rides per month</option><option>Last ride date</option><option>Total spend</option><option>City</option><option>Registration date</option></select>
            <select className="gm-input"><option>Greater than</option><option>Less than</option><option>Equal to</option><option>Between</option></select>
          </div>
          <input className="gm-input" placeholder="Value (e.g. 20)" style={{ marginTop:8 }}/>
        </FormGroup>
        <FormGroup label="Segment Color">
          <div style={{ display:"flex", gap:8, paddingTop:4 }}>
            {["#D4AF37","#34D399","#F87171","#60A5FA","#A78BFA","#F59E0B"].map(c=>(
              <div key={c} onClick={()=>setNs({...ns,color:c})} style={{ width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:ns.color===c?"3px solid white":"3px solid transparent",transition:"border .2s" }}/>
            ))}
          </div>
        </FormGroup>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn-outline" onClick={()=>setCreateModal(false)}>Cancel</button>
          <button className="btn-gold" onClick={createSegment}>Create Segment</button>
        </div>
      </Modal>

      {/* Send Campaign to Segment Modal */}
      <Modal open={campaignModal} onClose={()=>setCampaignModal(false)} title={`📣 Send Campaign — ${selSegment?.name}`}>
        {selSegment && <div style={{ marginBottom:14, padding:"10px 14px", background:`${selSegment.color}10`, border:`1px solid ${selSegment.color}25`, borderRadius:10, fontSize:12, color:selSegment.color }}>{selSegment.icon} Sending to <strong>{selSegment.count.toLocaleString()} users</strong> in {selSegment.name}</div>}
        <FormGroup label="Campaign Type"><select className="gm-input"><option>Promo Code</option><option>Cashback Offer</option><option>Push Notification</option><option>In-App Banner</option></select></FormGroup>
        <FormGroup label="Offer"><input className="gm-input" placeholder="e.g. Use COMEBACK50 for 50% off"/></FormGroup>
        <FormGroup label="Message"><textarea className="gm-input" rows="3" placeholder="Message to send..." style={{ resize:"vertical" }}/></FormGroup>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn-outline" onClick={()=>setCampaignModal(false)}>Cancel</button>
          <button className="btn-gold" onClick={()=>{setCampaignModal(false);toast(`Campaign sent to ${selSegment?.count.toLocaleString()} users!`,"success");}}>Send Campaign</button>
        </div>
      </Modal>
    </PageWrapper>
  );
}
export default function UserSegmentsPage() { return <ToastProvider><Content/></ToastProvider>; }
