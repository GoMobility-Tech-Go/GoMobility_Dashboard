import { useState } from "react";
import { useToast, ToastProvider, PageWrapper, TableCard, Badge, AvatarCell, Modal, FormGroup, AlertBox, MiniStatRow, GlobalStyles, Card } from "../../components/ui/index.jsx";
import { genAdminAccounts, PERMISSIONS } from "../../data/mockData.js";
import { useAuth } from "../../context/AuthContext";
const ADMINS = genAdminAccounts();
const LOGIN_HIST=[{admin:"Rahul Sharma",role:"Admin",ip:"103.28.14.22",device:"Chrome / Windows",loc:"Patna, Bihar",status:"Success",time:"2 hrs ago"},{admin:"Priya Singh",role:"Support",ip:"103.28.14.31",device:"Safari / iPhone",loc:"Delhi",status:"Success",time:"5 hrs ago"},{admin:"Unknown",role:"—",ip:"185.220.101.45",device:"Firefox / Linux",loc:"Moscow, Russia",status:"Rejected",time:"12 hrs ago"},{admin:"Amit Kumar",role:"Finance",ip:"103.28.14.45",device:"Chrome / macOS",loc:"Mumbai",status:"Success",time:"1 day ago"}];
const ALERTS=[{type:"critical",title:"Multiple failed logins — Admin account",detail:"5 failed attempts from IP 185.220.101.45 (Moscow, Russia)",time:"8 min ago",action:"Block IP"},{type:"warning",title:"Login from unusual location — Amit Kumar",detail:"First login from Bangalore — usual location is Mumbai",time:"2 hrs ago",action:"Verify Identity"},{type:"warning",title:"Bulk data export — Priya Singh (Support)",detail:"Support role exported 500+ user records — unusual activity",time:"3 hrs ago",action:"Review Action"},{type:"info",title:"Off-hours access — Rahul Sharma (Admin)",detail:"Login at 3:42 AM from known IP",time:"Yesterday 3:42 AM",action:"Acknowledge"}];
const RC={Admin:"gold",Support:"purple",Finance:"blue"};
function Content() {
  const toast=useToast(), {user}=useAuth(), [tab,setTab]=useState("admins"), [cm,setCm]=useState(false), [admins,setAdmins]=useState(ADMINS);
  const [na,setNa]=useState({name:"",email:"",role:"Admin",password:""});
  if(user?.role!=="Super Admin") return <PageWrapper title="Roles & Access" subtitle=""><GlobalStyles/><AlertBox type="error">This section is accessible to Super Admins only.</AlertBox></PageWrapper>;
  const toggleAdmin=(i)=>{setAdmins(a=>a.map((x,j)=>j===i?{...x,status:x.status==="Active"?"Disabled":"Active"}:x));toast(`Account ${admins[i].status==="Active"?"disabled":"enabled"}`,admins[i].status==="Active"?"error":"success");};
  const createAdmin=()=>{if(!na.name||!na.email){toast("Fill required fields","error");return;}setAdmins(a=>[...a,{...na,last:"Just now",ip:"New login",status:"Active"}]);toast(`Sub-admin ${na.name} created!`,"success");setCm(false);setNa({name:"",email:"",role:"Admin",password:""});};
  return (
    <PageWrapper title="Roles & Access Control" subtitle="Create sub-admins, manage permissions and monitor login activity — Super Admin exclusive"
      actions={<button className="btn-gold btn-sm" onClick={()=>setCm(true)}>+ Create Sub-Admin</button>}>
      <GlobalStyles/>
      <MiniStatRow items={[{label:"Total Admins",value:String(admins.length+1),icon:"👤"},{label:"Active Accounts",value:String(admins.filter(a=>a.status==="Active").length+1),icon:"✅",color:"#34D399"},{label:"Disabled",value:String(admins.filter(a=>a.status==="Disabled").length),icon:"🚫",color:"#F87171"},{label:"Login Attempts (24h)",value:"47",icon:"🔐",color:"#D4AF37"}]}/>
      <div className="tab-nav">{[{id:"admins",l:"Admin Accounts"},{id:"perms",l:"Permissions Matrix"},{id:"logins",l:"Login History"}].map(t=><button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>)}</div>
      {tab==="admins"&&<TableCard title="Admin Accounts" icon="👥">
        <table className="gm-table"><thead><tr><th>Admin</th><th>Role</th><th>Email</th><th>Last Login</th><th>IP</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          <tr style={{background:"rgba(212,175,55,0.04)"}}><td><AvatarCell name="Super Admin" sub="superadmin@gomobility.com"/></td><td><span style={{display:"inline-flex",padding:"3px 8px",borderRadius:100,fontSize:10.5,fontWeight:600,background:"rgba(212,175,55,0.1)",border:"1px solid rgba(212,175,55,0.28)",color:"#D4AF37"}}>Super Admin</span></td><td style={{fontSize:12}}>superadmin@gomobility.com</td><td style={{fontSize:12}}>Now</td><td style={{fontFamily:"monospace",fontSize:11}}>Current session</td><td><Badge status="Active"/></td><td><span style={{fontSize:12,color:"rgba(255,255,255,0.3)"}}>You</span></td></tr>
          {admins.map((a,i)=><tr key={i}><td><AvatarCell name={a.name} gradient="linear-gradient(135deg,#3b82f6,#1d4ed8)"/></td><td><span style={{display:"inline-flex",padding:"3px 8px",borderRadius:100,fontSize:10.5,fontWeight:600,background:`rgba(212,175,55,0.1)`,border:`1px solid rgba(212,175,55,0.28)`,color:"#D4AF37"}}>{a.role}</span></td><td style={{fontSize:12}}>{a.email}</td><td style={{fontSize:12}}>{a.last}</td><td style={{fontFamily:"monospace",fontSize:11}}>{a.ip}</td><td><Badge status={a.status}/></td><td><div style={{display:"flex",gap:5}}><button className="btn-outline btn-xs" onClick={()=>toast("Editing...","success")}>Edit</button><button className={`${a.status==="Active"?"btn-danger":"btn-success"} btn-xs`} onClick={()=>toggleAdmin(i)}>{a.status==="Active"?"Disable":"Enable"}</button></div></td></tr>)}
        </tbody></table>
      </TableCard>}
      {tab==="perms"&&<Card style={{overflow:"hidden"}}>
        <div style={{padding:"15px 20px",borderBottom:"1px solid rgba(212,175,55,0.1)",fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)"}}>Permission Matrix — Role Comparison</div>
        <div style={{overflowX:"auto"}}><table className="gm-table"><thead><tr><th>Permission</th><th style={{textAlign:"center"}}>Super Admin</th><th style={{textAlign:"center"}}>Admin</th><th style={{textAlign:"center"}}>Support</th><th style={{textAlign:"center"}}>Finance</th></tr></thead><tbody>{PERMISSIONS.map((p,i)=><tr key={i}><td style={{fontWeight:600,color:"rgba(255,255,255,0.8)"}}>{p.label}</td>{[p.sa,p.admin,p.support,p.finance].map((v,j)=><td key={j} style={{textAlign:"center",fontSize:16}}>{v?"✅":"❌"}</td>)}</tr>)}</tbody></table></div>
      </Card>}
      {tab==="logins"&&<TableCard title="Login History" icon="📍">
        <table className="gm-table"><thead><tr><th>Admin</th><th>Role</th><th>IP Address</th><th>Device</th><th>Location</th><th>Status</th><th>Time</th></tr></thead>
        <tbody>{LOGIN_HIST.map((l,i)=><tr key={i} style={{background:l.status==="Rejected"?"rgba(248,113,113,0.04)":undefined}}><td>{l.admin}</td><td><span style={{display:"inline-flex",padding:"3px 8px",borderRadius:100,fontSize:10.5,fontWeight:600,background:"rgba(212,175,55,0.1)",border:"1px solid rgba(212,175,55,0.28)",color:"#D4AF37"}}>{l.role}</span></td><td style={{fontFamily:"monospace",fontSize:11,color:l.status==="Rejected"?"#F87171":undefined}}>{l.ip}</td><td style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{l.device}</td><td style={{fontSize:12}}>{l.loc}</td><td><Badge status={l.status==="Rejected"?"Blocked":"Active"}/></td><td style={{fontSize:12}}>{l.time}</td></tr>)}</tbody>
        </table>
      </TableCard>}
      {/* Suspicious Activity Alerts */}
      <div style={{marginTop:22}}>
        <div style={{fontFamily:"Cinzel,serif",fontSize:14,fontWeight:700,color:"#D4AF37",marginBottom:4}}>Suspicious Activity Alerts</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:14}}>Auto-detected suspicious login and admin activity patterns</div>
        {ALERTS.map((a,i)=>{const s={critical:{bg:"rgba(248,113,113,0.07)",br:"rgba(248,113,113,0.3)",c:"#F87171"},warning:{bg:"rgba(245,158,11,0.07)",br:"rgba(245,158,11,0.25)",c:"#F59E0B"},info:{bg:"rgba(96,165,250,0.07)",br:"rgba(96,165,250,0.22)",c:"#60A5FA"}}[a.type];return(
          <div key={i} style={{background:s.bg,border:`1px solid ${s.br}`,borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"flex-start",gap:12,flexWrap:"wrap",marginBottom:8}}>
            <span style={{fontSize:20,flexShrink:0}}>{a.type==="critical"?"🚨":a.type==="warning"?"⚠️":"ℹ️"}</span>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontSize:13,fontWeight:600,color:s.c,marginBottom:3}}>{a.title}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginBottom:3}}>{a.detail}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>{a.time}</div>
            </div>
            <button style={{background:`${s.c}18`,border:`1px solid ${s.br}`,color:s.c,fontWeight:600,fontFamily:"Outfit,sans-serif",borderRadius:9,padding:"7px 14px",fontSize:12,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}} onClick={()=>toast(`Action: ${a.action}`,"success")}>{a.action}</button>
          </div>
        );})}
      </div>
      <Modal open={cm} onClose={()=>setCm(false)} title="Create Sub-Admin">
        <FormGroup label="Full Name"><input className="gm-input" placeholder="Enter full name" value={na.name} onChange={e=>setNa({...na,name:e.target.value})}/></FormGroup>
        <FormGroup label="Email Address"><input type="email" className="gm-input" placeholder="admin@gomobility.in" value={na.email} onChange={e=>setNa({...na,email:e.target.value})}/></FormGroup>
        <FormGroup label="Role"><select className="gm-input" value={na.role} onChange={e=>setNa({...na,role:e.target.value})}><option>Admin</option><option>Support</option><option>Finance</option></select></FormGroup>
        <FormGroup label="Temporary Password"><input type="password" className="gm-input" placeholder="Set password" value={na.password} onChange={e=>setNa({...na,password:e.target.value})}/></FormGroup>
        <AlertBox type="info">Admin will be prompted to change password on first login.</AlertBox>
        <div style={{display:"flex",gap:8}}><button className="btn-outline" onClick={()=>setCm(false)}>Cancel</button><button className="btn-gold" onClick={createAdmin}>Create Account</button></div>
      </Modal>
    </PageWrapper>
  );
}
export default function RolesAccessPage() { return <ToastProvider><Content/></ToastProvider>; }
