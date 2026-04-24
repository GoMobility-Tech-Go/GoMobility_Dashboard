import { useState } from "react";
import { useToast, ToastProvider, PageWrapper, TableCard, FilterBar, SearchBox, Pagination, Badge, AvatarCell, Modal, FormGroup, MiniStatRow, AlertBox, Card, GlobalStyles } from "../../components/ui/index.jsx";
import { genUsers, genRides, genTransactions } from "../../data/mockData.js";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { GoldTooltip } from "../../components/ui/index.jsx";

const USERS = genUsers(15);
const ACT = [{m:"Nov",r:8},{m:"Dec",r:14},{m:"Jan",r:11},{m:"Feb",r:19},{m:"Mar",r:22},{m:"Apr",r:17}];

function ProfileModal({ user, onClose }) {
  const [tab, setTab] = useState("info");
  const rides = genRides(5), txns = genTransactions(5);
  if (!user) return null;
  const init = user.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2);
  return (
    <Modal open={!!user} onClose={onClose} title="User Profile" maxWidth={600}>
      <div style={{display:"flex",alignItems:"center",gap:14,padding:"0 0 18px",borderBottom:"1px solid rgba(212,175,55,0.12)",marginBottom:16}}>
        <div style={{width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#D4AF37,#b8920f)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"#04081A",flexShrink:0}}>{init}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:700,color:"rgba(255,255,255,0.9)",fontFamily:"Cinzel,serif"}}>{user.name}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.38)",marginTop:2}}>{user.email}</div>
          <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}><Badge status={user.status}/><span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:100,fontSize:10.5,fontWeight:600,background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.24)",color:"#60A5FA"}}>+91 {user.phone}</span></div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>Wallet</div><div style={{fontSize:22,fontWeight:800,color:"#D4AF37",fontFamily:"monospace"}}>Rs{user.wallet.toLocaleString()}</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[{l:"Rides",v:user.rides,c:"#D4AF37"},{l:"Referrals",v:user.referrals,c:"#60A5FA"},{l:"Rating",v:user.rating+"★",c:"#34D399"},{l:"Wallet",v:"Rs"+user.wallet,c:"#A78BFA"}].map((s,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(212,175,55,0.1)",borderRadius:10,padding:"10px",textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:800,color:s.c,fontFamily:"monospace"}}>{s.v}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:3,fontFamily:"Outfit,sans-serif"}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:10,color:"rgba(212,175,55,0.5)",marginBottom:6,fontFamily:"Outfit,sans-serif",textTransform:"uppercase",letterSpacing:"0.8px"}}>Ride Activity (6 Months)</div>
        <ResponsiveContainer width="100%" height={70}>
          <AreaChart data={ACT} margin={{top:4,right:4,left:0,bottom:0}}>
            <defs><linearGradient id="uAF" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4AF37" stopOpacity={0.3}/><stop offset="100%" stopColor="#D4AF37" stopOpacity={0}/></linearGradient></defs>
            <XAxis dataKey="m" tick={{fill:"rgba(255,255,255,0.3)",fontSize:9}} axisLine={false} tickLine={false}/>
            <Tooltip content={<GoldTooltip/>}/>
            <Area type="monotone" dataKey="r" name="Rides" stroke="#D4AF37" strokeWidth={2} fill="url(#uAF)" dot={{r:2,fill:"#D4AF37",strokeWidth:0}}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="tab-nav" style={{marginBottom:12}}>
        {[{id:"info",l:"Info"},{id:"rides",l:"Ride History"},{id:"txns",l:"Transactions"}].map(t=>(
          <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>
        ))}
      </div>
      {tab==="info" && [["Phone","+91 "+user.phone],["Email",user.email],["Status",user.status],["Total Rides",user.rides],["Wallet","Rs"+user.wallet.toLocaleString()],["Rating",user.rating+" ★"],["Referrals",user.referrals],["Joined",user.joined]].map(([l,v],i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid rgba(212,175,55,0.07)",fontSize:13,fontFamily:"Outfit,sans-serif"}}>
          <span style={{color:"rgba(255,255,255,0.4)"}}>{l}</span><span style={{color:"rgba(255,255,255,0.85)",fontWeight:500}}>{String(v)}</span>
        </div>
      ))}
      {tab==="rides" && <div style={{overflowX:"auto"}}><table className="gm-table"><thead><tr><th>Ride ID</th><th>Route</th><th>Fare</th><th>Status</th><th>Date</th></tr></thead><tbody>{rides.map((r,i)=><tr key={i}><td style={{fontFamily:"monospace",color:"#D4AF37",fontSize:11}}>{r.id}</td><td style={{fontSize:11}}>{r.from} to {r.to}</td><td style={{color:"#D4AF37",fontFamily:"monospace"}}>Rs{r.fare}</td><td><Badge status={r.status}/></td><td style={{fontSize:11}}>{r.date}</td></tr>)}</tbody></table></div>}
      {tab==="txns" && <div style={{overflowX:"auto"}}><table className="gm-table"><thead><tr><th>Txn ID</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead><tbody>{txns.map((t,i)=><tr key={i}><td style={{fontFamily:"monospace",color:"#D4AF37",fontSize:11}}>{t.id}</td><td><span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:100,fontSize:10.5,fontWeight:600,background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.24)",color:"#60A5FA"}}>{t.type}</span></td><td style={{color:"#D4AF37",fontFamily:"monospace"}}>Rs{t.amount}</td><td><Badge status={t.status}/></td></tr>)}</tbody></table></div>}
    </Modal>
  );
}

function Content() {
  const toast = useToast();
  const [users, setUsers] = useState(USERS);
  const [search, setSearch] = useState(""), [sf, setSf] = useState(""), [sort, setSort] = useState("newest");
  const [walletModal, setWalletModal] = useState(false), [profileUser, setProfileUser] = useState(null);
  const [selUser, setSelUser] = useState(null), [wAmt, setWAmt] = useState(""), [wAction, setWAction] = useState("Add Balance");

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (u.name.toLowerCase().includes(q)||u.email.includes(q)||u.phone.includes(q)) && (!sf||u.status===sf);
  }).sort((a,b) => sort==="rides"?b.rides-a.rides:sort==="rating"?parseFloat(b.rating)-parseFloat(a.rating):sort==="wallet"?b.wallet-a.wallet:0);

  const toggle = (i) => {
    const ns = users[i].status==="Blocked"?"Active":"Blocked";
    setUsers(users.map((u,j) => j===i?{...u,status:ns}:u));
    toast(`User ${ns==="Blocked"?"blocked":"unblocked"} successfully`, ns==="Blocked"?"error":"success");
  };

  return (
    <PageWrapper title="User Management" subtitle="14,820 registered passengers — click any row to view full profile"
      actions={<button className="btn-outline btn-sm" onClick={()=>toast("Exporting users CSV...","success")}>Export CSV</button>}>
      <GlobalStyles/>
      <MiniStatRow items={[{label:"Total Users",value:"14,820",icon:"👥"},{label:"Active",value:"13,240",icon:"✅",color:"#34D399"},{label:"Blocked",value:"180",icon:"🚫",color:"#F87171"},{label:"New This Month",value:"324",icon:"🆕",color:"#D4AF37"}]}/>
      <TableCard title="All Users" icon="👥"
        actions={<>
          <select className="gm-input btn-sm" style={{width:130}} value={sf} onChange={e=>setSf(e.target.value)}><option value="">All Status</option><option>Active</option><option>Blocked</option><option>New</option></select>
          <select className="gm-input btn-sm" style={{width:150}} value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Sort: Newest</option><option value="rides">Sort: Most Rides</option><option value="rating">Sort: Rating</option><option value="wallet">Sort: Wallet</option></select>
        </>}
        footer={<Pagination total="14,820" showing="Showing 1-15 of 14,820"/>}>
        <FilterBar><SearchBox placeholder="Search by name, email, phone..." value={search} onChange={setSearch}/></FilterBar>
        <table className="gm-table">
          <thead><tr><th>User</th><th>Phone</th><th>Rides</th><th>Wallet</th><th>Rating</th><th>Referrals</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>{filtered.map((u,i)=>(
            <tr key={i} style={{cursor:"pointer"}} onClick={()=>setProfileUser(u)}>
              <td><AvatarCell name={u.name} sub={u.email}/></td>
              <td style={{fontFamily:"monospace",fontSize:12}}>+91 {u.phone}</td>
              <td>{u.rides}</td>
              <td style={{color:"#D4AF37",fontFamily:"monospace"}}>Rs{u.wallet.toLocaleString()}</td>
              <td>★ {u.rating}</td>
              <td style={{color:"#60A5FA"}}>{u.referrals}</td>
              <td><Badge status={u.status}/></td>
              <td style={{fontSize:12}}>{u.joined}</td>
              <td onClick={e=>e.stopPropagation()}>
                <div style={{display:"flex",gap:5}}>
                  <button className="btn-outline btn-xs" onClick={()=>{setSelUser(u);setWalletModal(true);}}>Wallet</button>
                  <button className={`${u.status==="Blocked"?"btn-success":"btn-danger"} btn-xs`} onClick={()=>toggle(i)}>{u.status==="Blocked"?"Unblock":"Block"}</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </TableCard>
      <ProfileModal user={profileUser} onClose={()=>setProfileUser(null)}/>
      <Modal open={walletModal} onClose={()=>setWalletModal(false)} title="Wallet Credit / Debit">
        {selUser&&<>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,padding:"12px",background:"rgba(212,175,55,0.05)",border:"1px solid rgba(212,175,55,0.15)",borderRadius:12}}>
            <AvatarCell name={selUser.name} sub={selUser.email}/>
            <div style={{marginLeft:"auto",textAlign:"right"}}><div style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>Current Balance</div><div style={{fontSize:20,fontWeight:800,color:"#D4AF37",fontFamily:"monospace"}}>Rs{selUser.wallet.toLocaleString()}</div></div>
          </div>
          <FormGroup label="Action"><select className="gm-input" value={wAction} onChange={e=>setWAction(e.target.value)}><option>Add Balance</option><option>Deduct Balance</option></select></FormGroup>
          <FormGroup label="Amount (Rs)"><input type="number" className="gm-input" placeholder="Enter amount" value={wAmt} onChange={e=>setWAmt(e.target.value)}/></FormGroup>
          <FormGroup label="Reason"><textarea className="gm-input" rows="3" placeholder="Reason for this transaction..." style={{resize:"vertical"}}/></FormGroup>
          <div style={{display:"flex",gap:8}}>
            <button className="btn-outline" onClick={()=>setWalletModal(false)}>Cancel</button>
            <button className="btn-gold" onClick={()=>{setWalletModal(false);toast("Wallet updated successfully!","success");setWAmt("");}}>Confirm</button>
          </div>
        </>}
      </Modal>
    </PageWrapper>
  );
}
export default function UsersPage() { return <ToastProvider><Content/></ToastProvider>; }