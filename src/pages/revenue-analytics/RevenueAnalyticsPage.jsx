import { useState } from "react";
import { useToast, ToastProvider, PageWrapper, Card, TableCard, MiniStatRow, GlobalStyles, GoldTooltip, AlertBox } from "../../components/ui/index.jsx";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const MONTHLY_PL = [
  { month:"Oct", revenue:610000, payout:420000, fee:95000, tax:28000, profit:67000 },
  { month:"Nov", revenue:680000, payout:468000, fee:108000, tax:31200, profit:72800 },
  { month:"Dec", revenue:820000, payout:562000, fee:131200, tax:37200, profit:89600 },
  { month:"Jan", revenue:740000, payout:508000, fee:118400, tax:33000, profit:80600 },
  { month:"Feb", revenue:795000, payout:546000, fee:127200, tax:35000, profit:86800 },
  { month:"Mar", revenue:890000, payout:614000, fee:142400, tax:40200, profit:93400 },
  { month:"Apr", revenue:842000, payout:580000, fee:134720, tax:38000, profit:89280 },
];

const CITY_COMMISSION = [
  { city:"Mumbai",    revenue:1420000, commission:213000, pct:15 },
  { city:"Bangalore", revenue:1180000, commission:177000, pct:15 },
  { city:"Delhi",     revenue:890000,  commission:133500, pct:15 },
  { city:"Hyderabad", revenue:850000,  commission:127500, pct:15 },
  { city:"Kolkata",   revenue:720000,  commission:108000, pct:15 },
  { city:"Chennai",   revenue:640000,  commission:96000,  pct:15 },
  { city:"Patna",     revenue:284750,  commission:42712,  pct:15 },
];

const VEHICLE_COMMISSION = [
  { vehicle:"Cab",  revenue:4200000, commission:630000, color:"#D4AF37" },
  { vehicle:"Auto", revenue:2800000, commission:420000, color:"#60A5FA" },
  { vehicle:"Bike", revenue:1950000, commission:292500, color:"#34D399" },
];

const DRIVER_EARNINGS = [
  { range:"Rs0–5K",    count:42  },
  { range:"Rs5–10K",   count:98  },
  { range:"Rs10–20K",  count:145 },
  { range:"Rs20–30K",  count:72  },
  { range:"Rs30–50K",  count:24  },
  { range:"Rs50K+",    count:6   },
];

const RETENTION = [
  { month:"Oct", new:820, returning:640, churned:120 },
  { month:"Nov", new:940, returning:720, churned:98  },
  { month:"Dec", new:1200,returning:880, churned:145 },
  { month:"Jan", new:860, returning:760, churned:88  },
  { month:"Feb", new:920, returning:810, churned:76  },
  { month:"Mar", new:1050,returning:890, churned:92  },
  { month:"Apr", new:980, returning:920, churned:68  },
];

const CANCELLATION = [
  { month:"Oct", byDriver:180, byUser:240, systemCancel:32 },
  { month:"Nov", byDriver:160, byUser:210, systemCancel:28 },
  { month:"Dec", byDriver:220, byUser:280, systemCancel:38 },
  { month:"Jan", byDriver:145, byUser:190, systemCancel:22 },
  { month:"Feb", byDriver:168, byUser:205, systemCancel:25 },
  { month:"Mar", byDriver:190, byUser:235, systemCancel:30 },
  { month:"Apr", byDriver:155, byUser:198, systemCancel:24 },
];

const PEAK_SPLIT = [
  { name:"Morning Peak\n6AM–10AM", value:28, color:"#D4AF37" },
  { name:"Afternoon\n10AM–4PM",    value:22, color:"#60A5FA" },
  { name:"Evening Peak\n4PM–9PM",  value:38, color:"#F87171" },
  { name:"Night\n9PM–6AM",         value:12, color:"#A78BFA" },
];

function Content() {
  const toast = useToast();
  const [period, setPeriod] = useState("monthly");
  const [tab, setTab] = useState("pl");

  const TABS = [
    { id:"pl",           l:"P&L Report"          },
    { id:"commission",   l:"Commission Breakdown" },
    { id:"earnings",     l:"Driver Earnings"      },
    { id:"retention",    l:"User Retention"       },
    { id:"cancellation", l:"Cancellation Analytics" },
    { id:"peak",         l:"Peak vs Off-Peak"     },
  ];

  const totalRevenue = MONTHLY_PL.reduce((a,b)=>a+b.revenue,0);
  const totalProfit  = MONTHLY_PL.reduce((a,b)=>a+b.profit,0);
  const totalPayout  = MONTHLY_PL.reduce((a,b)=>a+b.payout,0);
  const totalFee     = MONTHLY_PL.reduce((a,b)=>a+b.fee,0);

  return (
    <PageWrapper title="Advanced Revenue & Business Analytics"
      subtitle="P&L reports, commission breakdown, driver earnings, retention and cancellation analytics"
      actions={
        <div style={{display:"flex",gap:8}}>
          <select className="gm-input btn-sm" style={{width:140}} value={period} onChange={e=>setPeriod(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button className="btn-outline btn-sm" onClick={()=>toast("Exporting analytics report...","success")}>↓ Export PDF</button>
        </div>
      }>
      <GlobalStyles/>

      <MiniStatRow items={[
        { label:"Total Revenue (7M)",  value:`Rs${(totalRevenue/100000).toFixed(1)}L`, icon:"💰", color:"#D4AF37"  },
        { label:"Total Profit (7M)",   value:`Rs${(totalProfit/100000).toFixed(1)}L`,  icon:"📈", color:"#34D399"  },
        { label:"Total Payouts (7M)",  value:`Rs${(totalPayout/100000).toFixed(1)}L`,  icon:"💸", color:"#F87171"  },
        { label:"Platform Fee (7M)",   value:`Rs${(totalFee/100000).toFixed(1)}L`,     icon:"🏦", color:"#60A5FA"  },
        { label:"Profit Margin",       value:`${((totalProfit/totalRevenue)*100).toFixed(1)}%`, icon:"📊", color:"#A78BFA" },
        { label:"Avg Monthly Revenue", value:`Rs${(totalRevenue/7/100000).toFixed(1)}L`, icon:"📅", color:"#F59E0B" },
      ]}/>

      <div className="tab-nav">
        {TABS.map(t=>(
          <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>
        ))}
      </div>

      {/* P&L Report */}
      {tab==="pl" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Card style={{padding:22}}>
            <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:4}}>Monthly P&L Report</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:18}}>Revenue · Payout · Platform Fee · Tax · Net Profit</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={MONTHLY_PL} margin={{top:4,right:4,left:0,bottom:0}}>
                <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false}/>
                <XAxis dataKey="month" tick={{fill:"rgba(255,255,255,0.45)",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"rgba(255,255,255,0.3)",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`Rs${(v/1000).toFixed(0)}K`}/>
                <Tooltip content={<GoldTooltip/>}/>
                <Legend wrapperStyle={{fontFamily:"Outfit,sans-serif",fontSize:11}}/>
                <Bar dataKey="revenue"  name="Revenue"     fill="#D4AF37" radius={[4,4,0,0]} fillOpacity={0.85}/>
                <Bar dataKey="payout"   name="Driver Payout" fill="#F87171" radius={[4,4,0,0]} fillOpacity={0.85}/>
                <Bar dataKey="fee"      name="Platform Fee"  fill="#60A5FA" radius={[4,4,0,0]} fillOpacity={0.85}/>
                <Bar dataKey="profit"   name="Net Profit"    fill="#34D399" radius={[4,4,0,0]} fillOpacity={0.85}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <TableCard title="Monthly P&L Detailed Breakdown" icon="📊"
            actions={<button className="btn-outline btn-sm" onClick={()=>toast("P&L exported!","success")}>↓ Export Excel</button>}>
            <table className="gm-table">
              <thead><tr><th>Month</th><th>Gross Revenue</th><th>Driver Payout</th><th>Platform Fee</th><th>Tax (GST)</th><th>Net Profit</th><th>Margin</th></tr></thead>
              <tbody>
                {MONTHLY_PL.map((r,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:700}}>{r.month} 2025</td>
                    <td style={{color:"#D4AF37",fontFamily:"monospace"}}>Rs{r.revenue.toLocaleString()}</td>
                    <td style={{color:"#F87171",fontFamily:"monospace"}}>Rs{r.payout.toLocaleString()}</td>
                    <td style={{color:"#60A5FA",fontFamily:"monospace"}}>Rs{r.fee.toLocaleString()}</td>
                    <td style={{color:"#F59E0B",fontFamily:"monospace"}}>Rs{r.tax.toLocaleString()}</td>
                    <td style={{color:"#34D399",fontFamily:"monospace",fontWeight:700}}>Rs{r.profit.toLocaleString()}</td>
                    <td style={{color:"#A78BFA",fontWeight:700}}>{((r.profit/r.revenue)*100).toFixed(1)}%</td>
                  </tr>
                ))}
                <tr style={{background:"rgba(212,175,55,0.06)",borderTop:"1px solid rgba(212,175,55,0.2)"}}>
                  <td style={{fontWeight:800,color:"#D4AF37"}}>TOTAL</td>
                  <td style={{color:"#D4AF37",fontFamily:"monospace",fontWeight:800}}>Rs{totalRevenue.toLocaleString()}</td>
                  <td style={{color:"#F87171",fontFamily:"monospace",fontWeight:800}}>Rs{totalPayout.toLocaleString()}</td>
                  <td style={{color:"#60A5FA",fontFamily:"monospace",fontWeight:800}}>Rs{totalFee.toLocaleString()}</td>
                  <td style={{color:"#F59E0B",fontFamily:"monospace",fontWeight:800}}>Rs{MONTHLY_PL.reduce((a,b)=>a+b.tax,0).toLocaleString()}</td>
                  <td style={{color:"#34D399",fontFamily:"monospace",fontWeight:800}}>Rs{totalProfit.toLocaleString()}</td>
                  <td style={{color:"#A78BFA",fontWeight:800}}>{((totalProfit/totalRevenue)*100).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </TableCard>
        </div>
      )}

      {/* Commission Breakdown */}
      {tab==="commission" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <Card style={{padding:22}}>
            <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:4}}>Commission by City</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:16}}>Platform commission per city (15% flat)</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={CITY_COMMISSION} layout="vertical" margin={{top:4,right:16,left:0,bottom:0}}>
                <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" horizontal={false}/>
                <XAxis type="number" tick={{fill:"rgba(255,255,255,0.3)",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`Rs${(v/1000).toFixed(0)}K`}/>
                <YAxis type="category" dataKey="city" tick={{fill:"rgba(255,255,255,0.55)",fontSize:11}} axisLine={false} tickLine={false} width={72}/>
                <Tooltip content={<GoldTooltip/>}/>
                <Bar dataKey="commission" name="Commission (Rs)" fill="#D4AF37" radius={[0,4,4,0]} fillOpacity={0.85}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card style={{padding:22}}>
            <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:4}}>Commission by Vehicle Type</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:16}}>Revenue vs commission split per vehicle</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={VEHICLE_COMMISSION} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="commission">
                  {VEHICLE_COMMISSION.map((e,i)=><Cell key={i} fill={e.color} fillOpacity={0.85}/>)}
                </Pie>
                <Tooltip content={<GoldTooltip/>}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
              {VEHICLE_COMMISSION.map((v,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:10,height:10,borderRadius:3,background:v.color}}/>
                    <span style={{color:"rgba(255,255,255,0.65)"}}>{v.vehicle}</span>
                  </div>
                  <div style={{display:"flex",gap:16}}>
                    <span style={{color:"rgba(255,255,255,0.45)"}}>Rev: <strong style={{color:v.color}}>Rs{(v.revenue/100000).toFixed(1)}L</strong></span>
                    <span style={{color:"rgba(255,255,255,0.45)"}}>Fee: <strong style={{color:"#34D399"}}>Rs{(v.commission/1000).toFixed(0)}K</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Driver Earnings Distribution */}
      {tab==="earnings" && (
        <Card style={{padding:22}}>
          <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:4}}>Driver Earnings Distribution</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:20}}>How many drivers fall in each monthly earnings bracket</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={DRIVER_EARNINGS} margin={{top:4,right:4,left:0,bottom:0}}>
              <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false}/>
              <XAxis dataKey="range" tick={{fill:"rgba(255,255,255,0.5)",fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"rgba(255,255,255,0.3)",fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<GoldTooltip/>}/>
              <Bar dataKey="count" name="Drivers" radius={[6,6,0,0]}>
                {DRIVER_EARNINGS.map((_,i)=><Cell key={i} fill={["#F87171","#F59E0B","#D4AF37","#34D399","#60A5FA","#A78BFA"][i]} fillOpacity={0.85}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginTop:16}}>
            {DRIVER_EARNINGS.map((e,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(212,175,55,0.1)",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:20,fontWeight:800,color:["#F87171","#F59E0B","#D4AF37","#34D399","#60A5FA","#A78BFA"][i],fontFamily:"monospace"}}>{e.count}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:3}}>{e.range}/month</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* User Retention */}
      {tab==="retention" && (
        <Card style={{padding:22}}>
          <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:4}}>User Retention Rate</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:18}}>New users vs returning users vs churned users per month</div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={RETENTION} margin={{top:4,right:4,left:0,bottom:0}}>
              <defs>
                <linearGradient id="retNew" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34D399" stopOpacity={0.3}/><stop offset="100%" stopColor="#34D399" stopOpacity={0}/></linearGradient>
                <linearGradient id="retRet" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4AF37" stopOpacity={0.3}/><stop offset="100%" stopColor="#D4AF37" stopOpacity={0}/></linearGradient>
                <linearGradient id="retChu" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F87171" stopOpacity={0.25}/><stop offset="100%" stopColor="#F87171" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false}/>
              <XAxis dataKey="month" tick={{fill:"rgba(255,255,255,0.45)",fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"rgba(255,255,255,0.3)",fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<GoldTooltip/>}/>
              <Legend wrapperStyle={{fontFamily:"Outfit,sans-serif",fontSize:11}}/>
              <Area type="monotone" dataKey="new" name="New Users" stroke="#34D399" strokeWidth={2.5} fill="url(#retNew)" dot={{r:3,fill:"#34D399"}}/>
              <Area type="monotone" dataKey="returning" name="Returning Users" stroke="#D4AF37" strokeWidth={2.5} fill="url(#retRet)" dot={{r:3,fill:"#D4AF37"}}/>
              <Area type="monotone" dataKey="churned" name="Churned Users" stroke="#F87171" strokeWidth={2} fill="url(#retChu)" dot={{r:3,fill:"#F87171"}}/>
            </AreaChart>
          </ResponsiveContainer>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginTop:16}}>
            {[{l:"Avg New/Month",v:Math.round(RETENTION.reduce((a,b)=>a+b.new,0)/7),c:"#34D399"},{l:"Avg Returning/Month",v:Math.round(RETENTION.reduce((a,b)=>a+b.returning,0)/7),c:"#D4AF37"},{l:"Avg Churned/Month",v:Math.round(RETENTION.reduce((a,b)=>a+b.churned,0)/7),c:"#F87171"}].map((s,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${s.c}20`,borderRadius:12,padding:"14px",textAlign:"center"}}>
                <div style={{fontSize:26,fontWeight:800,color:s.c,fontFamily:"monospace"}}>{s.v}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:4}}>{s.l}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Cancellation Analytics */}
      {tab==="cancellation" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Card style={{padding:22}}>
            <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:4}}>Ride Cancellation Analytics</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:18}}>Who cancels more — driver, user, or system?</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={CANCELLATION} margin={{top:4,right:4,left:0,bottom:0}}>
                <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false}/>
                <XAxis dataKey="month" tick={{fill:"rgba(255,255,255,0.45)",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"rgba(255,255,255,0.3)",fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<GoldTooltip/>}/>
                <Legend wrapperStyle={{fontFamily:"Outfit,sans-serif",fontSize:11}}/>
                <Bar dataKey="byUser"      name="By User"         fill="#F87171" radius={[4,4,0,0]} fillOpacity={0.85}/>
                <Bar dataKey="byDriver"    name="By Driver"       fill="#F59E0B" radius={[4,4,0,0]} fillOpacity={0.85}/>
                <Bar dataKey="systemCancel" name="System/Auto"   fill="#60A5FA" radius={[4,4,0,0]} fillOpacity={0.85}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            {[{l:"Total By User",v:CANCELLATION.reduce((a,b)=>a+b.byUser,0),c:"#F87171",icon:"👥",pct:55},{l:"Total By Driver",v:CANCELLATION.reduce((a,b)=>a+b.byDriver,0),c:"#F59E0B",icon:"🧑‍✈️",pct:37},{l:"System Auto-cancel",v:CANCELLATION.reduce((a,b)=>a+b.systemCancel,0),c:"#60A5FA",icon:"⚙️",pct:8}].map((s,i)=>(
              <Card key={i} style={{padding:"18px 20px"}}>
                <div style={{fontSize:28,marginBottom:8}}>{s.icon}</div>
                <div style={{fontSize:28,fontWeight:800,color:s.c,fontFamily:"monospace"}}>{s.v}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:4}}>{s.l}</div>
                <div style={{fontSize:12,color:s.c,fontWeight:700,marginTop:6}}>{s.pct}% of cancellations</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Peak vs Off-Peak */}
      {tab==="peak" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <Card style={{padding:22}}>
            <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:4}}>Peak vs Off-Peak Revenue Split</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:16}}>Revenue distribution by time of day</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={PEAK_SPLIT} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {PEAK_SPLIT.map((e,i)=><Cell key={i} fill={e.color} fillOpacity={0.85}/>)}
                </Pie>
                <Tooltip content={<GoldTooltip/>}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
              {PEAK_SPLIT.map((p,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:10,height:10,borderRadius:3,background:p.color}}/><span style={{color:"rgba(255,255,255,0.65)"}}>{p.name.split("\n")[0]}</span><span style={{fontSize:10,color:"rgba(255,255,255,0.38)"}}>{p.name.split("\n")[1]}</span></div>
                  <strong style={{color:p.color}}>{p.value}%</strong>
                </div>
              ))}
            </div>
          </Card>
          <Card style={{padding:22}}>
            <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:16}}>Key Insights</div>
            {[
              { icon:"🔥", title:"Evening Peak (4PM–9PM)", desc:"38% of daily revenue — highest demand period", color:"#F87171" },
              { icon:"🌅", title:"Morning Rush (6AM–10AM)", desc:"28% revenue — commuter heavy, bike dominant", color:"#D4AF37" },
              { icon:"🌙", title:"Night Hours (9PM–6AM)", desc:"Only 12% revenue but 2.1x surge pricing active", color:"#A78BFA" },
              { icon:"☀️", title:"Off-Peak (10AM–4PM)", desc:"22% revenue, highest ride completion rate (94%)", color:"#60A5FA" },
            ].map((ins,i)=>(
              <div key={i} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:i<3?"1px solid rgba(212,175,55,0.08)":"none"}}>
                <span style={{fontSize:20,flexShrink:0}}>{ins.icon}</span>
                <div>
                  <div style={{fontSize:12.5,fontWeight:700,color:ins.color,marginBottom:3}}>{ins.title}</div>
                  <div style={{fontSize:11.5,color:"rgba(255,255,255,0.5)"}}>{ins.desc}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </PageWrapper>
  );
}

export default function RevenueAnalyticsPage() {
  return <ToastProvider><Content/></ToastProvider>;
}
