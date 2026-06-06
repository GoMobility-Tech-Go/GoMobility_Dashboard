import { useState, useEffect } from "react";
import { useToast, ToastProvider, PageWrapper, Card, TableCard, MiniStatRow, GlobalStyles, FormGroup, AlertBox, Modal, Toggle } from "../../components/ui/index.jsx";
import { getSosHistory } from "../../api/admin";

function normalizeSos(s) {
  return {
    id: s.alert_number || s.id || '',
    passenger: s.user?.full_name || s.passenger_name || '—',
    driver: s.driver?.full_name || s.driver_name || '—',
    location: s.location || s.address || '—',
    vehicle: s.vehicle_type || '—',
    time: s.created_at ? new Date(s.created_at).toLocaleString('en-IN') : '—',
    phone: s.user?.phone || '—',
    status: s.status || 'Active',
  };
}

const BLACKLIST = [];

const EMERGENCY_CONTACTS = [
  { name:"Patna Police Control Room", number:"0612-2200100", type:"police" },
  { name:"PMCH Ambulance", number:"0612-2234891", type:"hospital" },
  { name:"Fire Brigade Patna", number:"101", type:"fire" },
  { name:"GO Mobility Emergency", number:"+91 9800000001", type:"internal" },
];

function SOSCard({ sos, onForceStop, onContact }) {
  return (
    <div style={{ background:"rgba(248,113,113,0.07)", border:"1px solid rgba(248,113,113,0.35)", borderRadius:16, padding:"18px 20px", animation:"gmPulseAlert 2s ease-in-out infinite" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ fontSize:20 }}>🚨</span>
            <div style={{ fontSize:14, fontWeight:700, color:"#F87171", fontFamily:"Cinzel,serif" }}>SOS ALERT — {sos.id}</div>
            <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 8px", borderRadius:100, fontSize:10, fontWeight:700, background:"rgba(248,113,113,0.2)", border:"1px solid rgba(248,113,113,0.4)", color:"#F87171" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#F87171", animation:"gmPulseAlert 1s ease-in-out infinite" }}/> LIVE
            </span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
            {[["Passenger",sos.passenger],["Driver",sos.driver],["Vehicle",sos.vehicle],["Location",sos.location],["Triggered",sos.time],["Phone",sos.phone]].map(([l,v],i)=>(
              <div key={i}>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.38)", textTransform:"uppercase", letterSpacing:"0.6px" }}>{l}</div>
                <div style={{ fontSize:12.5, color:"rgba(255,255,255,0.82)", fontWeight:500, marginTop:2 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button className="btn-danger" onClick={()=>onForceStop(sos.id)} style={{ fontSize:12 }}>🛑 Force Stop Ride</button>
            <button onClick={()=>onContact("police", sos)} style={{ background:"rgba(96,165,250,0.1)", border:"1px solid rgba(96,165,250,0.3)", color:"#60A5FA", fontWeight:600, fontFamily:"Outfit,sans-serif", borderRadius:10, padding:"7px 14px", fontSize:12, cursor:"pointer" }}>📞 Call Police</button>
            <button onClick={()=>onContact("ambulance", sos)} style={{ background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.3)", color:"#34D399", fontWeight:600, fontFamily:"Outfit,sans-serif", borderRadius:10, padding:"7px 14px", fontSize:12, cursor:"pointer" }}>🚑 Ambulance</button>
            <button onClick={()=>onContact("track", sos)} style={{ background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.3)", color:"#D4AF37", fontWeight:600, fontFamily:"Outfit,sans-serif", borderRadius:10, padding:"7px 14px", fontSize:12, cursor:"pointer" }}>📍 Live Track</button>
          </div>
        </div>
      </div>
      <style>{`@keyframes gmPulseAlert{0%,100%{box-shadow:0 0 0 0 rgba(248,113,113,0.3)}50%{box-shadow:0 0 0 10px rgba(248,113,113,0)}}`}</style>
    </div>
  );
}

function Content() {
  const toast = useToast();
  const [sosList, setSosList] = useState([]);
  const [sosHistory, setSosHistory] = useState([]);
  const [blacklist, setBlacklist] = useState(BLACKLIST);

  useEffect(() => {
    getSosHistory()
      .then(res => {
        const raw = res?.data?.alerts || res?.alerts || res?.data || [];
        const all = Array.isArray(raw) ? raw.map(normalizeSos) : [];
        setSosList(all.filter(s => s.status === 'Active' || s.status === 'active'));
        setSosHistory(all.filter(s => s.status !== 'Active' && s.status !== 'active'));
      })
      .catch(() => {});
  }, []);
  const [tab, setTab] = useState("sos");
  const [reportModal, setReportModal] = useState(false);
  const [blModal, setBlModal] = useState(false);
  const [nb, setNb] = useState({ name:"", type:"Driver", reason:"", permanent:false });

  const forceStop = (id) => {
    setSosList(s => s.filter(x => x.id !== id));
    toast(`Ride ${id} force stopped! Emergency team notified.`, "success");
  };

  const contact = (type, sos) => {
    const msgs = { police:`Police notified for ride ${sos.id} at ${sos.location}!`, ambulance:`Ambulance dispatched for ${sos.passenger} at ${sos.location}!`, track:`Live GPS tracking activated for ride ${sos.id}!` };
    toast(msgs[type], "success");
  };

  const addBlacklist = () => {
    if (!nb.name || !nb.reason) { toast("Fill required fields", "error"); return; }
    setBlacklist(b => [...b, { ...nb, date:"Apr 24, 2026" }]);
    toast(`${nb.name} blacklisted permanently!`, "error");
    setBlModal(false);
    setNb({ name:"", type:"Driver", reason:"", permanent:false });
  };

  return (
    <PageWrapper title="Emergency & Safety Controls"
      subtitle="Global SOS dashboard, force-stop rides, GPS tracking and blacklist management"
      actions={
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn-outline btn-sm" onClick={()=>setReportModal(true)}>📋 Generate Incident Report</button>
          <button className="btn-danger btn-sm" onClick={()=>setBlModal(true)}>🚫 Add to Blacklist</button>
        </div>
      }>
      <GlobalStyles/>

      <MiniStatRow items={[
        { label:"Active SOS",        value:String(sosList.length),          icon:"🚨", color:"#F87171" },
        { label:"Resolved",          value:String(sosHistory.length),       icon:"✅", color:"#34D399" },
        { label:"Total Alerts",      value:String(sosList.length + sosHistory.length), icon:"📋", color:"#F59E0B" },
        { label:"Blacklisted",       value:String(blacklist.length),        icon:"🚫", color:"#F87171" },
        { label:"Emergency Contacts",value:String(EMERGENCY_CONTACTS.length),icon:"📞",color:"#60A5FA" },
        { label:"Avg Response Time", value:"—",                            icon:"⏱️", color:"#D4AF37" },
      ]}/>

      {sosList.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#F87171", fontFamily:"Cinzel,serif", marginBottom:12 }}>🚨 ACTIVE SOS EMERGENCIES ({sosList.length})</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {sosList.map(sos => <SOSCard key={sos.id} sos={sos} onForceStop={forceStop} onContact={contact}/>)}
          </div>
        </div>
      )}

      <div className="tab-nav">
        {[{id:"sos",l:"SOS History"},{id:"incidents",l:"Incident Log"},{id:"blacklist",l:"Blacklist"},{id:"contacts",l:"Emergency Contacts"}].map(t=>(
          <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>
        ))}
      </div>

      {tab==="incidents" && (
        <TableCard title="SOS History Log" icon="📋"
          actions={<button className="btn-outline btn-sm" onClick={()=>toast("Report exported!","success")}>↓ Export</button>}>
          {sosHistory.length === 0 ? (
            <div style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.35)",fontFamily:"Outfit,sans-serif"}}>
              <div style={{fontSize:36,marginBottom:10}}>📋</div>No resolved SOS history
            </div>
          ) : (
            <table className="gm-table">
              <thead><tr><th>Alert ID</th><th>Passenger</th><th>Driver</th><th>Location</th><th>Vehicle</th><th>Time</th><th>Status</th></tr></thead>
              <tbody>{sosHistory.map((s,i)=>(
                <tr key={i}>
                  <td style={{fontFamily:"monospace",color:"#F87171",fontSize:12}}>{s.id}</td>
                  <td>{s.passenger}</td>
                  <td>{s.driver}</td>
                  <td style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>{s.location}</td>
                  <td style={{fontSize:12}}>{s.vehicle}</td>
                  <td style={{fontSize:12}}>{s.time}</td>
                  <td><span style={{display:"inline-flex",padding:"3px 9px",borderRadius:100,fontSize:10.5,fontWeight:600,background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.25)",color:"#34D399"}}>{s.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </TableCard>
      )}

      {tab==="blacklist" && (
        <TableCard title="Blacklisted Users & Drivers" icon="🚫"
          actions={<button className="btn-danger btn-sm" onClick={()=>setBlModal(true)}>+ Add to Blacklist</button>}>
          <table className="gm-table">
            <thead><tr><th>Name</th><th>Type</th><th>Reason</th><th>Date Added</th><th>Permanent</th><th>Actions</th></tr></thead>
            <tbody>{blacklist.map((b,i)=>(
              <tr key={i}>
                <td style={{fontWeight:600}}>{b.name}</td>
                <td><span style={{display:"inline-flex",padding:"3px 8px",borderRadius:100,fontSize:10.5,fontWeight:600,background:b.type==="Driver"?"rgba(96,165,250,0.1)":"rgba(212,175,55,0.1)",border:`1px solid ${b.type==="Driver"?"rgba(96,165,250,0.25)":"rgba(212,175,55,0.25)"}`,color:b.type==="Driver"?"#60A5FA":"#D4AF37"}}>{b.type}</span></td>
                <td style={{fontSize:12,color:"rgba(255,255,255,0.6)"}}>{b.reason}</td>
                <td style={{fontSize:12}}>{b.date}</td>
                <td>{b.permanent?<span style={{color:"#F87171",fontWeight:700}}>Permanent</span>:<span style={{color:"#F59E0B"}}>Temporary</span>}</td>
                <td><button className="btn-success btn-xs" onClick={()=>{setBlacklist(x=>x.filter((_,j)=>j!==i));toast(`${b.name} removed from blacklist`,"success");}}>Remove</button></td>
              </tr>
            ))}</tbody>
          </table>
        </TableCard>
      )}

      {tab==="contacts" && (
        <Card style={{padding:22}}>
          <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:18}}>Emergency Contact Directory</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
            {EMERGENCY_CONTACTS.map((c,i)=>{
              const iconMap={police:"🚔",hospital:"🏥",fire:"🔥",internal:"📱"};
              const colorMap={police:"#60A5FA",hospital:"#34D399",fire:"#F87171",internal:"#D4AF37"};
              return(
                <div key={i} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${colorMap[c.type]}22`,borderRadius:14,padding:"16px 18px"}}>
                  <div style={{fontSize:28,marginBottom:8}}>{iconMap[c.type]}</div>
                  <div style={{fontSize:13.5,fontWeight:700,color:"rgba(255,255,255,0.88)",marginBottom:4}}>{c.name}</div>
                  <div style={{fontSize:15,fontWeight:800,color:colorMap[c.type],fontFamily:"monospace",marginBottom:12}}>{c.number}</div>
                  <button onClick={()=>toast(`Calling ${c.name}...`,"success")} style={{background:`${colorMap[c.type]}15`,border:`1px solid ${colorMap[c.type]}30`,color:colorMap[c.type],fontWeight:600,fontFamily:"Outfit,sans-serif",borderRadius:9,padding:"7px 14px",fontSize:12,cursor:"pointer",width:"100%"}}>📞 Call Now</button>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:20,padding:"14px 18px",background:"rgba(212,175,55,0.05)",border:"1px solid rgba(212,175,55,0.15)",borderRadius:12}}>
            <div style={{fontSize:12,fontWeight:700,color:"#D4AF37",marginBottom:8}}>Add Emergency Contact</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10,alignItems:"flex-end"}}>
              <div><FormGroup label="Contact Name"><input className="gm-input" placeholder="e.g. PMCH Emergency"/></FormGroup></div>
              <div><FormGroup label="Phone Number"><input className="gm-input" placeholder="+91 xxxx xxxxxx"/></FormGroup></div>
              <button className="btn-gold" style={{marginBottom:14}} onClick={()=>toast("Emergency contact added!","success")}>Add</button>
            </div>
          </div>
        </Card>
      )}

      {tab==="sos" && sosHistory.length===0 && sosList.length===0 && (
        <div style={{padding:50,textAlign:"center",color:"rgba(255,255,255,0.3)"}}>
          <div style={{fontSize:44,marginBottom:12}}>✅</div>
          <div>No active SOS alerts. Platform is safe.</div>
        </div>
      )}

      <Modal open={reportModal} onClose={()=>setReportModal(false)} title="📋 Generate Incident Report">
        <FormGroup label="Date Range"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><input type="date" className="gm-input" defaultValue="2026-04-01"/><input type="date" className="gm-input" defaultValue="2026-04-24"/></div></FormGroup>
        <FormGroup label="Incident Type"><select className="gm-input"><option>All Types</option><option>SOS Emergency</option><option>Route Deviation</option><option>Driver Complaint</option></select></FormGroup>
        <FormGroup label="Format"><select className="gm-input"><option>PDF Report</option><option>Excel Sheet</option><option>CSV</option></select></FormGroup>
        <div style={{display:"flex",gap:8}}><button className="btn-outline" onClick={()=>setReportModal(false)}>Cancel</button><button className="btn-gold" onClick={()=>{setReportModal(false);toast("Safety incident report generated!","success");}}>Generate Report</button></div>
      </Modal>

      <Modal open={blModal} onClose={()=>setBlModal(false)} title="🚫 Add to Blacklist">
        <AlertBox type="error">Blacklisted users/drivers cannot use or login to the GO Mobility platform.</AlertBox>
        <FormGroup label="Full Name"><input className="gm-input" placeholder="Enter full name" value={nb.name} onChange={e=>setNb({...nb,name:e.target.value})}/></FormGroup>
        <FormGroup label="Type"><select className="gm-input" value={nb.type} onChange={e=>setNb({...nb,type:e.target.value})}><option>Driver</option><option>User</option></select></FormGroup>
        <FormGroup label="Reason for Blacklisting"><textarea className="gm-input" rows="3" placeholder="Enter reason..." value={nb.reason} onChange={e=>setNb({...nb,reason:e.target.value})} style={{resize:"vertical"}}/></FormGroup>
        <FormGroup label="Blacklist Duration"><div style={{paddingTop:6}}><Toggle checked={nb.permanent} onChange={v=>setNb({...nb,permanent:v})} label="Permanent blacklist (no appeal)"/></div></FormGroup>
        <div style={{display:"flex",gap:8}}><button className="btn-outline" onClick={()=>setBlModal(false)}>Cancel</button><button className="btn-danger" onClick={addBlacklist}>Blacklist Permanently</button></div>
      </Modal>
    </PageWrapper>
  );
}
export default function EmergencySafetyPage() { return <ToastProvider><Content/></ToastProvider>; }
