import { useState } from "react";
import { useToast, ToastProvider, PageWrapper, TableCard, Badge, AvatarCell, Modal, FormGroup, AlertBox, MiniStatRow, GlobalStyles, Card } from "../../components/ui/index.jsx";
import { useAuth } from "../../context/AuthContext";
const PERMISSIONS=[{label:"View Dashboard",sa:true,admin:true,support:true,finance:true},{label:"User Block / Unblock",sa:true,admin:true,support:true,finance:false},{label:"Driver KYC Verify",sa:true,admin:true,support:false,finance:false},{label:"Refund Initiate",sa:true,admin:true,support:false,finance:true},{label:"Wallet Credit / Debit",sa:true,admin:true,support:false,finance:false},{label:"Fare / Pricing Update",sa:true,admin:true,support:false,finance:false},{label:"Subscription Plan Edit",sa:true,admin:true,support:false,finance:false},{label:"Support Ticket Reply",sa:true,admin:true,support:true,finance:false},{label:"Export Reports",sa:true,admin:true,support:false,finance:true},{label:"Driver Payout Approve",sa:true,admin:true,support:false,finance:true},{label:"Push Notification Send",sa:true,admin:true,support:false,finance:false},{label:"Promo Code Manage",sa:true,admin:false,support:false,finance:false},{label:"Create Sub-Admin",sa:true,admin:false,support:false,finance:false},{label:"Activity Logs View",sa:true,admin:false,support:false,finance:false},{label:"Admin Role Manage",sa:true,admin:false,support:false,finance:false}];
function Content() {
  const toast=useToast(), {user}=useAuth(), [tab,setTab]=useState("admins"), [cm,setCm]=useState(false), [admins,setAdmins]=useState([]);
  const [na,setNa]=useState({name:"",email:"",role:"Admin",password:""});
  if(user?.role!=="Super Admin") return <PageWrapper title="Roles & Access" subtitle=""><GlobalStyles/><AlertBox type="error">This section is accessible to Super Admins only.</AlertBox></PageWrapper>;
  const toggleAdmin=(i)=>{setAdmins(a=>a.map((x,j)=>j===i?{...x,status:x.status==="Active"?"Disabled":"Active"}:x));toast(`Account ${admins[i].status==="Active"?"disabled":"enabled"}`,admins[i].status==="Active"?"error":"success");};
  const createAdmin=()=>{if(!na.name||!na.email){toast("Fill required fields","error");return;}setAdmins(a=>[...a,{...na,last:"Just now",ip:"New login",status:"Active"}]);toast(`Sub-admin ${na.name} created!`,"success");setCm(false);setNa({name:"",email:"",role:"Admin",password:""});};
  return (
    <PageWrapper title="Roles & Access Control" subtitle="Create sub-admins, manage permissions and monitor login activity — Super Admin exclusive"
      actions={<button className="btn-gold btn-sm" onClick={()=>setCm(true)}>+ Create Sub-Admin</button>}>
      <GlobalStyles/>
      <MiniStatRow items={[{label:"Total Admins",value:String(admins.length+1),icon:"👤"},{label:"Active Accounts",value:String(admins.filter(a=>a.status==="Active").length+1),icon:"✅",color:"#34D399"},{label:"Disabled",value:String(admins.filter(a=>a.status==="Disabled").length),icon:"🚫",color:"#F87171"},{label:"Login Attempts (24h)",value:"—",icon:"🔐",color:"#D4AF37"}]}/>
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
        <div style={{padding:50,textAlign:"center",color:"rgba(255,255,255,0.3)",fontFamily:"Outfit,sans-serif"}}><div style={{fontSize:36,marginBottom:10}}>📍</div>Login history not available via API</div>
      </TableCard>}
      {/* Suspicious Activity Alerts */}
      <div style={{marginTop:22}}>
        <div style={{fontFamily:"Cinzel,serif",fontSize:14,fontWeight:700,color:"#D4AF37",marginBottom:4}}>Suspicious Activity Alerts</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:14}}>Auto-detected suspicious login and admin activity patterns</div>
        <div style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.3)",fontFamily:"Outfit,sans-serif",background:"rgba(248,113,113,0.04)",border:"1px solid rgba(248,113,113,0.12)",borderRadius:14}}><div style={{fontSize:32,marginBottom:10}}>🚨</div>Suspicious activity data not available via API</div>
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
