import { useState } from "react";
import { useToast, ToastProvider, PageWrapper, Card, TableCard, MiniStatRow, GlobalStyles, FormGroup, Toggle, AlertBox, AvatarCell, Badge } from "../../components/ui/index.jsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { GoldTooltip } from "../../components/ui/index.jsx";

const TIER_CONFIG = { Gold:{ color:"#D4AF37", bg:"rgba(212,175,55,0.12)", icon:"🥇", minRating:4.5, minRides:300, bonus:"25%", perks:["Priority dispatch","Dedicated support","Gold badge in app","Monthly bonus Rs2000"] }, Silver:{ color:"#C0C0C0", bg:"rgba(192,192,192,0.12)", icon:"🥈", minRating:4.0, minRides:150, bonus:"15%", perks:["Priority dispatch","Silver badge in app","Monthly bonus Rs1000"] }, Bronze:{ color:"#CD7F32", bg:"rgba(205,127,50,0.12)", icon:"🥉", minRating:3.5, minRides:50, bonus:"8%", perks:["Bronze badge in app","Monthly bonus Rs500"] } };

const DRIVERS = [
  { name:"Vikram Yadav",  rides:842, rating:4.8, earnings:68000, cancel:2,  tier:"Gold",   vehicle:"🚖 Cab",  joinedMonths:18 },
  { name:"Suresh Reddy",  rides:621, rating:4.7, earnings:52000, cancel:3,  tier:"Gold",   vehicle:"🏍️ Bike", joinedMonths:14 },
  { name:"Arjun Nair",    rides:487, rating:4.6, earnings:44000, cancel:4,  tier:"Gold",   vehicle:"🛺 Auto", joinedMonths:11 },
  { name:"Rahul Sharma",  rides:312, rating:4.4, earnings:32000, cancel:6,  tier:"Silver", vehicle:"🚖 Cab",  joinedMonths:9  },
  { name:"Manish Dubey",  rides:218, rating:4.2, earnings:22000, cancel:8,  tier:"Silver", vehicle:"🏍️ Bike", joinedMonths:6  },
  { name:"Deepak Soni",   rides:142, rating:4.0, earnings:16000, cancel:10, tier:"Silver", vehicle:"🛺 Auto", joinedMonths:5  },
  { name:"Pankaj Kumar",  rides:87,  rating:3.8, earnings:10000, cancel:12, tier:"Bronze", vehicle:"🏍️ Bike", joinedMonths:3  },
  { name:"Mohit Yadav",   rides:62,  rating:3.6, earnings:7000,  cancel:14, tier:"Bronze", vehicle:"🛺 Auto", joinedMonths:2  },
];

const LEADERBOARD = DRIVERS.slice(0,5).map((d,i) => ({ ...d, rank:i+1 }));

const MONTHLY_TOP = [
  { month:"Jan", gold:24, silver:98, bronze:142 },
  { month:"Feb", gold:26, silver:102, bronze:148 },
  { month:"Mar", gold:28, silver:108, bronze:152 },
  { month:"Apr", gold:31, silver:112, bronze:158 },
];

function Content() {
  const toast = useToast();
  const [tab, setTab] = useState("leaderboard");
  const [autoDeact, setAutoDeact] = useState(true);
  const [maxCancel, setMaxCancel] = useState("15");
  const [drivers, setDrivers] = useState(DRIVERS);

  const tierCount = (t) => drivers.filter(d=>d.tier===t).length;

  const recalcTiers = () => {
    setDrivers(d => d.map(dr => {
      let tier = "Bronze";
      if (dr.rating >= 4.5 && dr.rides >= 300) tier = "Gold";
      else if (dr.rating >= 4.0 && dr.rides >= 150) tier = "Silver";
      return { ...dr, tier };
    }));
    toast("Tiers recalculated for all drivers!", "success");
  };

  return (
    <PageWrapper title="Driver Performance & Tier System"
      subtitle="Driver tiers, leaderboard, incentives and auto-deactivation rules"
      actions={
        <div style={{display:"flex",gap:8}}>
          <button className="btn-outline btn-sm" onClick={recalcTiers}>🔄 Recalculate Tiers</button>
          <button className="btn-gold btn-sm" onClick={()=>toast("Reward emails sent to top drivers!","success")}>🏆 Send Monthly Rewards</button>
        </div>
      }>
      <GlobalStyles/>

      <MiniStatRow items={[
        { label:"Gold Drivers",   value:String(tierCount("Gold")),   icon:"🥇", color:"#D4AF37" },
        { label:"Silver Drivers", value:String(tierCount("Silver")), icon:"🥈", color:"#C0C0C0" },
        { label:"Bronze Drivers", value:String(tierCount("Bronze")), icon:"🥉", color:"#CD7F32" },
        { label:"Total Drivers",  value:String(drivers.length),      icon:"🧑‍✈️",color:"#60A5FA" },
        { label:"Avg Rating",     value:(drivers.reduce((a,b)=>a+parseFloat(b.rating),0)/drivers.length).toFixed(2)+"★", icon:"⭐", color:"#D4AF37" },
        { label:"Auto-Deact Rule",value:autoDeact?"Active":"Off",   icon:"⚙️", color:autoDeact?"#34D399":"#F87171" },
      ]}/>

      {/* Tier Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:18}}>
        {Object.entries(TIER_CONFIG).map(([tier,conf])=>(
          <Card key={tier} style={{padding:22,borderColor:`${conf.color}25`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <span style={{fontSize:32}}>{conf.icon}</span>
              <div>
                <div style={{fontSize:16,fontWeight:800,fontFamily:"Cinzel,serif",color:conf.color}}>{tier} Tier</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:1}}>{tierCount(tier)} drivers</div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
              {[["Min Rating",conf.minRating+"★"],["Min Rides",conf.minRides+"/month"],["Incentive Bonus",conf.bonus+" extra"]].map(([l,v],i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                  <span style={{color:"rgba(255,255,255,0.45)"}}>{l}</span>
                  <span style={{color:conf.color,fontWeight:700}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:10}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.38)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.6px"}}>Perks</div>
              {conf.perks.map((p,i)=><div key={i} style={{fontSize:11,color:conf.color,marginBottom:3}}>✓ {p}</div>)}
            </div>
          </Card>
        ))}
      </div>

      <div className="tab-nav">
        {[{id:"leaderboard",l:"🏆 Leaderboard"},{id:"all",l:"📋 All Drivers"},{id:"chart",l:"📊 Tier Analytics"},{id:"rules",l:"⚙️ Auto Rules"}].map(t=>(
          <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>
        ))}
      </div>

      {tab==="leaderboard" && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {LEADERBOARD.map((d,i)=>{
            const conf = TIER_CONFIG[d.tier];
            const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
            return(
              <Card key={i} style={{padding:"16px 20px",borderColor:i<3?`${conf.color}30`:"rgba(212,175,55,0.12)"}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{fontSize:28,flexShrink:0,width:36,textAlign:"center"}}>{medals[i]}</div>
                  <AvatarCell name={d.name} gradient={`linear-gradient(135deg,${conf.color},${conf.color}80)`}/>
                  <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))",gap:8}}>
                    {[{l:"Rides",v:d.rides,c:"#D4AF37"},{l:"Rating",v:d.rating+"★",c:"#34D399"},{l:"Earnings",v:`Rs${(d.earnings/1000).toFixed(0)}K`,c:"#60A5FA"},{l:"Vehicle",v:d.vehicle,c:"rgba(255,255,255,0.6)"}].map((s,j)=>(
                      <div key={j} style={{textAlign:"center"}}>
                        <div style={{fontSize:14,fontWeight:700,color:s.c}}>{s.v}</div>
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:2}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{flexShrink:0}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:100,fontSize:11,fontWeight:700,background:conf.bg,border:`1px solid ${conf.color}35`,color:conf.color}}>{conf.icon} {d.tier}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab==="all" && (
        <TableCard title="All Drivers — Tier Breakdown" icon="📋">
          <table className="gm-table">
            <thead><tr><th>Driver</th><th>Tier</th><th>Rides</th><th>Rating</th><th>Earnings</th><th>Cancellations</th><th>Vehicle</th><th>Actions</th></tr></thead>
            <tbody>{drivers.map((d,i)=>{
              const conf=TIER_CONFIG[d.tier];
              return(<tr key={i}>
                <td><AvatarCell name={d.name} gradient={`linear-gradient(135deg,${conf.color},${conf.color}70)`}/></td>
                <td><span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:100,fontSize:10.5,fontWeight:700,background:conf.bg,border:`1px solid ${conf.color}30`,color:conf.color}}>{conf.icon} {d.tier}</span></td>
                <td style={{color:"#D4AF37",fontFamily:"monospace",fontWeight:700}}>{d.rides}</td>
                <td style={{color:"#34D399",fontFamily:"monospace",fontWeight:700}}>{d.rating}★</td>
                <td style={{color:"#60A5FA",fontFamily:"monospace"}}>Rs{d.earnings.toLocaleString()}</td>
                <td style={{color:d.cancel>10?"#F87171":d.cancel>6?"#F59E0B":"#34D399",fontWeight:700}}>{d.cancel}</td>
                <td>{d.vehicle}</td>
                <td><button className="btn-outline btn-xs" onClick={()=>toast(`Reward sent to ${d.name}!`,"success")}>Send Reward</button></td>
              </tr>);
            })}</tbody>
          </table>
        </TableCard>
      )}

      {tab==="chart" && (
        <Card style={{padding:22}}>
          <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:4}}>Tier Distribution Over Months</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:18}}>Growth of each tier month over month</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={MONTHLY_TOP} margin={{top:4,right:4,left:0,bottom:0}}>
              <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false}/>
              <XAxis dataKey="month" tick={{fill:"rgba(255,255,255,0.45)",fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"rgba(255,255,255,0.3)",fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<GoldTooltip/>}/>
              <Bar dataKey="gold" name="Gold" fill="#D4AF37" radius={[4,4,0,0]} fillOpacity={0.85}/>
              <Bar dataKey="silver" name="Silver" fill="#C0C0C0" radius={[4,4,0,0]} fillOpacity={0.85}/>
              <Bar dataKey="bronze" name="Bronze" fill="#CD7F32" radius={[4,4,0,0]} fillOpacity={0.85}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {tab==="rules" && (
        <Card style={{padding:24}}>
          <div style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:18}}>Auto Deactivation & Tier Rules</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <FormGroup label="Max Cancellations Before Auto-Deactivation" hint="Driver auto-deactivated if cancellations exceed this limit/month">
              <input type="number" className="gm-input" value={maxCancel} onChange={e=>setMaxCancel(e.target.value)}/>
            </FormGroup>
            <FormGroup label="Auto Deactivation" hint="Automatically deactivate drivers who exceed cancellation limit">
              <div style={{paddingTop:6}}><Toggle checked={autoDeact} onChange={v=>{setAutoDeact(v);toast(`Auto-deactivation ${v?"enabled":"disabled"}`,v?"success":"error");}} label={autoDeact?"Auto-deactivation Active":"Auto-deactivation Disabled"}/></div>
            </FormGroup>
            <FormGroup label="Minimum Rides for Gold Tier"><input type="number" className="gm-input" defaultValue="300"/></FormGroup>
            <FormGroup label="Minimum Rating for Gold Tier"><input type="number" className="gm-input" defaultValue="4.5" step="0.1"/></FormGroup>
            <FormGroup label="Minimum Rides for Silver Tier"><input type="number" className="gm-input" defaultValue="150"/></FormGroup>
            <FormGroup label="Minimum Rating for Silver Tier"><input type="number" className="gm-input" defaultValue="4.0" step="0.1"/></FormGroup>
            <FormGroup label="Gold Bonus Incentive %"><input type="number" className="gm-input" defaultValue="25"/></FormGroup>
            <FormGroup label="Silver Bonus Incentive %"><input type="number" className="gm-input" defaultValue="15"/></FormGroup>
          </div>
          <button className="btn-gold" style={{marginTop:8}} onClick={()=>toast("Tier rules saved!","success")}>Save Rules</button>
        </Card>
      )}
    </PageWrapper>
  );
}
export default function DriverTiersPage() { return <ToastProvider><Content/></ToastProvider>; }
