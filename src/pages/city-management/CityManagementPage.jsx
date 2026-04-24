import { useState, useRef } from "react";
import {
  useToast, ToastProvider, PageWrapper, Modal, FormGroup,
  Toggle, Badge, MiniStatRow, GlobalStyles, Card, TableCard,
  AlertBox, GoldTooltip
} from "../../components/ui/index.jsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";
import { MapPin, Plus, Edit3, Trash2, Shield, TrendingUp, Layers, Activity } from "lucide-react";

// ── DATA ─────────────────────────────────────────────────────────────────────
const INIT_CITIES = [
  { id:1, name:"Patna",     state:"Bihar",          x:520, y:210, active:true,  zones:8,  drivers:387, rides:1248, revenue:284750, status:"live"    },
  { id:2, name:"Delhi",     state:"Delhi",          x:390, y:158, active:true,  zones:15, drivers:820, rides:4200, revenue:890000, status:"live"    },
  { id:3, name:"Mumbai",    state:"Maharashtra",    x:280, y:295, active:true,  zones:18, drivers:1240,rides:6800, revenue:1420000,status:"live"    },
  { id:4, name:"Bangalore", state:"Karnataka",      x:330, y:380, active:true,  zones:14, drivers:960, rides:5100, revenue:1180000,status:"live"    },
  { id:5, name:"Kolkata",   state:"West Bengal",    x:572, y:245, active:true,  zones:12, drivers:680, rides:3200, revenue:720000, status:"live"    },
  { id:6, name:"Chennai",   state:"Tamil Nadu",     x:380, y:400, active:true,  zones:11, drivers:540, rides:2900, revenue:640000, status:"live"    },
  { id:7, name:"Hyderabad", state:"Telangana",      x:370, y:335, active:true,  zones:13, drivers:720, rides:3800, revenue:850000, status:"live"    },
  { id:8, name:"Lucknow",   state:"Uttar Pradesh",  x:462, y:186, active:true,  zones:9,  drivers:420, rides:1800, revenue:380000, status:"live"    },
  { id:9, name:"Guwahati",  state:"Assam",          x:620, y:185, active:true,  zones:6,  drivers:180, rides:680,  revenue:142000, status:"live"    },
  { id:10,name:"Jaipur",    state:"Rajasthan",      x:330, y:196, active:true,  zones:8,  drivers:310, rides:1200, revenue:260000, status:"live"    },
  { id:11,name:"Ahmedabad", state:"Gujarat",        x:270, y:246, active:false, zones:0,  drivers:0,   rides:0,    revenue:0,      status:"planned" },
  { id:12,name:"Pune",      state:"Maharashtra",    x:296, y:310, active:false, zones:0,  drivers:0,   rides:0,    revenue:0,      status:"planned" },
  { id:13,name:"Chandigarh",state:"Punjab",         x:366, y:140, active:false, zones:0,  drivers:0,   rides:0,    revenue:0,      status:"upcoming"},
  { id:14,name:"Bhopal",    state:"Madhya Pradesh", x:385, y:242, active:false, zones:0,  drivers:0,   rides:0,    revenue:0,      status:"upcoming"},
];

const PATNA_ZONES = [
  { id:1, name:"Patna Junction Area",   type:"pickup",  lat:25.6122, lng:85.0511, radius:2.5, drivers:42, rides:180, revenue:38000, demand:"High",   geoFence:true  },
  { id:2, name:"Gandhi Maidan Zone",    type:"hotspot", lat:25.6020, lng:85.1228, radius:2.0, drivers:28, rides:124, revenue:26000, demand:"High",   geoFence:true  },
  { id:3, name:"Bailey Road Corridor",  type:"pickup",  lat:25.6290, lng:85.0960, radius:3.0, drivers:35, rides:156, revenue:32000, demand:"Medium", geoFence:true  },
  { id:4, name:"Boring Road Zone",      type:"drop",    lat:25.6069, lng:85.0944, radius:1.5, drivers:18, rides:88,  revenue:18500, demand:"Medium", geoFence:false },
  { id:5, name:"AIIMS Patna Zone",      type:"medical", lat:25.5700, lng:85.0890, radius:1.8, drivers:22, rides:102, revenue:21000, demand:"High",   geoFence:true  },
  { id:6, name:"Kankarbagh Zone",       type:"drop",    lat:25.5960, lng:85.1220, radius:2.2, drivers:15, rides:74,  revenue:15600, demand:"Low",    geoFence:false },
  { id:7, name:"Rajendra Nagar",        type:"pickup",  lat:25.6100, lng:85.1050, radius:1.8, drivers:20, rides:94,  revenue:19800, demand:"Medium", geoFence:true  },
  { id:8, name:"Ashiana Nagar Zone",    type:"drop",    lat:25.6380, lng:85.0780, radius:2.0, drivers:16, rides:82,  revenue:17200, demand:"Low",    geoFence:false },
];

const ZONE_TYPES = {
  pickup:     { color:"#D4AF37", label:"Pickup Zone",    icon:"📍" },
  drop:       { color:"#60A5FA", label:"Drop Zone",      icon:"🎯" },
  hotspot:    { color:"#F87171", label:"Hotspot Zone",   icon:"🔥" },
  medical:    { color:"#34D399", label:"Medical Zone",   icon:"🏥" },
  airport:    { color:"#A78BFA", label:"Airport Zone",   icon:"✈️" },
  restricted: { color:"#F59E0B", label:"Restricted",     icon:"🚫" },
};

const DEMAND_COLOR = { High:"#F87171", Medium:"#F59E0B", Low:"#34D399" };

// ── INDIA SVG ─────────────────────────────────────────────────────────────────
const INDIA_PATH = "M340 60 L355 55 L375 58 L395 52 L415 55 L435 50 L460 58 L480 52 L500 58 L520 55 L540 62 L555 70 L565 82 L575 95 L585 108 L590 122 L595 138 L598 152 L592 165 L588 178 L600 188 L612 195 L625 205 L632 218 L628 232 L618 240 L622 252 L618 265 L608 272 L598 278 L590 270 L578 268 L568 275 L558 285 L548 298 L540 310 L530 320 L518 325 L505 330 L492 338 L480 348 L468 358 L458 370 L450 382 L442 395 L432 408 L418 418 L405 425 L392 428 L380 432 L368 428 L358 420 L350 410 L342 400 L335 388 L330 375 L325 362 L322 348 L320 335 L318 322 L315 308 L312 295 L308 282 L302 270 L295 258 L290 245 L285 232 L280 220 L275 208 L272 195 L268 182 L265 170 L262 158 L258 145 L255 132 L252 118 L250 105 L255 92 L262 80 L272 70 L285 62 L300 58 L315 55 L330 58 Z";

// ── INTERACTIVE MAP ───────────────────────────────────────────────────────────
function IndiaMap({ cities, selCity, onCityClick, viewMode, zones }) {
  const [tip, setTip] = useState(null);

  const pinColor = (c) => {
    if (selCity?.id === c.id) return "#D4AF37";
    if (c.status === "live") return "#34D399";
    if (c.status === "planned") return "#60A5FA";
    return "#F59E0B";
  };

  return (
    <div style={{ position:"relative", width:"100%", height:"100%", background:"rgba(0,0,0,0.25)", borderRadius:14, overflow:"hidden" }}>
      <svg viewBox="230 45 400 420" style={{ width:"100%", height:"100%" }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="gmGlow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <radialGradient id="gmRevGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.55"/>
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="gmDrvGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="gmHotGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F87171" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#F87171" stopOpacity="0"/>
          </radialGradient>
        </defs>

        {/* Grid */}
        {[...Array(8)].map((_,i)=><line key={`h${i}`} x1="230" y1={90+i*50} x2="630" y2={90+i*50} stroke="rgba(212,175,55,0.04)" strokeWidth="0.5"/>)}
        {[...Array(9)].map((_,i)=><line key={`v${i}`} x1={230+i*50} y1="45" x2={230+i*50} y2="465" stroke="rgba(212,175,55,0.04)" strokeWidth="0.5"/>)}

        {/* India outline */}
        <path d={INDIA_PATH} fill="rgba(212,175,55,0.04)" stroke="rgba(212,175,55,0.28)" strokeWidth="1.5" strokeLinejoin="round"/>

        {/* Revenue bubbles */}
        {viewMode === "revenue" && cities.filter(c=>c.active).map(c=>{
          const max = Math.max(...cities.map(x=>x.revenue));
          const pct = c.revenue/max;
          return <circle key={`rv${c.id}`} cx={c.x} cy={c.y} r={8+pct*28} fill={`rgba(212,175,55,${0.08+pct*0.25})`} stroke={`rgba(212,175,55,${0.15+pct*0.4})`} strokeWidth="1"/>;
        })}

        {/* Driver availability */}
        {viewMode === "drivers" && cities.filter(c=>c.active).map(c=>(
          <circle key={`dv${c.id}`} cx={c.x} cy={c.y} r={Math.sqrt(c.drivers/4)*3} fill="url(#gmDrvGrad)"/>
        ))}

        {/* Heatmap */}
        {viewMode === "heatmap" && cities.filter(c=>c.active).map(c=>
          [[-4,0],[0,-4],[4,0],[0,4],[-2,-2],[2,-2],[-2,2],[2,2],[-4,-2],[4,-2],[-3,3],[3,3],[0,0]].map((d,j)=>(
            <circle key={`ht${c.id}${j}`} cx={c.x+d[0]*6} cy={c.y+d[1]*6} r={8} fill="url(#gmHotGrad)" opacity={0.3+Math.random()*0.4}/>
          ))
        )}

        {/* Zone circles for selected city */}
        {selCity && viewMode === "zones" && zones.map((z,i)=>{
          const angle = (i/zones.length)*Math.PI*2;
          const dist = 20+i*3;
          const zx = selCity.x + Math.cos(angle)*dist;
          const zy = selCity.y + Math.sin(angle)*dist;
          const conf = ZONE_TYPES[z.type] || ZONE_TYPES.pickup;
          const r = z.radius*5;
          return (
            <g key={z.id}>
              <circle cx={zx} cy={zy} r={r} fill={`${conf.color}18`} stroke={conf.color} strokeWidth="1.5" strokeDasharray={z.geoFence?"none":"4 3"} opacity="0.9"/>
              <circle cx={zx} cy={zy} r={r+4} fill="none" stroke={conf.color} strokeWidth="0.4" opacity="0.25"/>
              <text x={zx} y={zy+1} textAnchor="middle" dominantBaseline="middle" style={{ fontSize:8, fill:conf.color, fontFamily:"Outfit,sans-serif", fontWeight:700, pointerEvents:"none" }}>{z.drivers}</text>
              <text x={zx} y={zy+r+7} textAnchor="middle" style={{ fontSize:5.5, fill:"rgba(255,255,255,0.45)", fontFamily:"Outfit,sans-serif", pointerEvents:"none" }}>{z.name.split(" ")[0]}</text>
            </g>
          );
        })}

        {/* Geo-fence for selected */}
        {selCity && viewMode === "geofence" && (
          <>
            <circle cx={selCity.x} cy={selCity.y} r="48" fill="rgba(212,175,55,0.05)" stroke="rgba(212,175,55,0.5)" strokeWidth="2" strokeDasharray="6 4"/>
            <circle cx={selCity.x} cy={selCity.y} r="62" fill="none" stroke="rgba(248,113,113,0.35)" strokeWidth="1.5" strokeDasharray="3 6"/>
            <text x={selCity.x+50} y={selCity.y-42} style={{ fontSize:7, fill:"rgba(212,175,55,0.65)", fontFamily:"Outfit,sans-serif" }}>Service Zone</text>
            <text x={selCity.x+64} y={selCity.y-56} style={{ fontSize:7, fill:"rgba(248,113,113,0.65)", fontFamily:"Outfit,sans-serif" }}>Geo-fence Limit</text>
          </>
        )}

        {/* City pins */}
        {cities.map(c=>{
          const isSel = selCity?.id === c.id;
          const pc = pinColor(c);
          const ps = isSel ? 9 : c.active ? 7 : 5;
          return (
            <g key={c.id} style={{ cursor:"pointer" }} onClick={()=>onCityClick(c)}
              onMouseEnter={e=>setTip({x:e.clientX,y:e.clientY,c})}
              onMouseLeave={()=>setTip(null)}>
              {c.active && <circle cx={c.x} cy={c.y} r={ps+9} fill="none" stroke={pc} strokeWidth="1" opacity="0.25" style={{ animation:`gmPing 2s ease-in-out ${c.id*0.35}s infinite` }}/>}
              <circle cx={c.x} cy={c.y} r={ps} fill={isSel?"#D4AF37":c.active?pc:"rgba(255,255,255,0.14)"} stroke={pc} strokeWidth={isSel?2.5:1.5} filter={isSel?"url(#gmGlow)":undefined}/>
              <circle cx={c.x} cy={c.y} r={isSel?3:2} fill={isSel?"#04081A":"rgba(255,255,255,0.8)"}/>
              <text x={c.x} y={c.y-ps-4} textAnchor="middle" style={{ fontSize:isSel?9:7.5, fill:isSel?"#D4AF37":"rgba(255,255,255,0.7)", fontFamily:"Outfit,sans-serif", fontWeight:isSel?700:400, pointerEvents:"none" }}>{c.name}</text>
            </g>
          );
        })}

        {/* Compass */}
        <g transform="translate(612,70)">
          <circle cx="0" cy="0" r="14" fill="rgba(0,0,0,0.55)" stroke="rgba(212,175,55,0.28)" strokeWidth="1"/>
          <text x="0" y="-5" textAnchor="middle" style={{ fontSize:7, fill:"rgba(212,175,55,0.75)", fontWeight:700, fontFamily:"Outfit,sans-serif" }}>N</text>
          <text x="0" y="10" textAnchor="middle" style={{ fontSize:6, fill:"rgba(255,255,255,0.35)", fontFamily:"Outfit,sans-serif" }}>S</text>
          <text x="9" y="3" textAnchor="middle" style={{ fontSize:6, fill:"rgba(255,255,255,0.35)", fontFamily:"Outfit,sans-serif" }}>E</text>
          <text x="-9" y="3" textAnchor="middle" style={{ fontSize:6, fill:"rgba(255,255,255,0.35)", fontFamily:"Outfit,sans-serif" }}>W</text>
          <line x1="0" y1="-10" x2="0" y2="-4" stroke="rgba(212,175,55,0.75)" strokeWidth="1.5"/>
        </g>
      </svg>

      <style>{`@keyframes gmPing{0%,100%{opacity:0.3;transform-origin:center}50%{opacity:0.7}}`}</style>

      {/* Tooltip */}
      {tip && (
        <div style={{ position:"fixed", left:tip.x+14, top:tip.y-10, background:"rgba(4,8,26,0.97)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:10, padding:"10px 14px", zIndex:1000, minWidth:160, backdropFilter:"blur(8px)", pointerEvents:"none" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.9)", fontFamily:"Cinzel,serif", marginBottom:4 }}>{tip.c.name}</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:6 }}>{tip.c.state}</div>
          {tip.c.active ? (
            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
              {[["Drivers",tip.c.drivers,"#60A5FA"],["Rides",tip.c.rides.toLocaleString(),"#D4AF37"],["Revenue","Rs"+(tip.c.revenue/1000).toFixed(0)+"K","#34D399"],["Zones",tip.c.zones,"#A78BFA"]].map(([l,v,c],i)=>(
                <span key={i} style={{ fontSize:11, color:"rgba(255,255,255,0.55)" }}>{l}: <strong style={{ color:c }}>{v}</strong></span>
              ))}
            </div>
          ) : <span style={{ display:"inline-flex", padding:"3px 8px", borderRadius:100, fontSize:10.5, fontWeight:600, background:"rgba(96,165,250,0.1)", border:"1px solid rgba(96,165,250,0.24)", color:"#60A5FA" }}>{tip.c.status}</span>}
        </div>
      )}
    </div>
  );
}

// ── ZONE CARD ─────────────────────────────────────────────────────────────────
function ZoneCard({ zone, onEdit, onDelete, onToggleFence }) {
  const conf = ZONE_TYPES[zone.type] || ZONE_TYPES.pickup;
  return (
    <div style={{ background:"rgba(255,255,255,0.028)", border:`1px solid ${conf.color}22`, borderRadius:14, padding:"14px 16px", transition:"all .2s" }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=`${conf.color}45`;e.currentTarget.style.background="rgba(255,255,255,0.045)";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=`${conf.color}22`;e.currentTarget.style.background="rgba(255,255,255,0.028)";}}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
            <span style={{ fontSize:15 }}>{conf.icon}</span>
            <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.88)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{zone.name}</div>
          </div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            <span style={{ display:"inline-flex", padding:"2px 7px", borderRadius:100, fontSize:10, fontWeight:600, background:`${conf.color}14`, border:`1px solid ${conf.color}28`, color:conf.color }}>{conf.label}</span>
            <span style={{ display:"inline-flex", padding:"2px 7px", borderRadius:100, fontSize:10, fontWeight:600, background:`${DEMAND_COLOR[zone.demand]}14`, border:`1px solid ${DEMAND_COLOR[zone.demand]}28`, color:DEMAND_COLOR[zone.demand] }}>{zone.demand} Demand</span>
            {zone.geoFence && <span style={{ display:"inline-flex", padding:"2px 7px", borderRadius:100, fontSize:10, fontWeight:600, background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.24)", color:"#34D399" }}>Geo-Fenced</span>}
          </div>
        </div>
        <div style={{ display:"flex", gap:5, flexShrink:0 }}>
          <button onClick={()=>onEdit(zone)} style={{ background:"rgba(212,175,55,0.07)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:7, color:"#D4AF37", width:28, height:28, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Edit3 size={12}/></button>
          <button onClick={()=>onDelete(zone.id)} style={{ background:"rgba(248,113,113,0.07)", border:"1px solid rgba(248,113,113,0.2)", borderRadius:7, color:"#F87171", width:28, height:28, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Trash2 size={12}/></button>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7, marginBottom:10 }}>
        {[{l:"Drivers",v:zone.drivers,c:"#60A5FA"},{l:"Rides",v:zone.rides,c:"#D4AF37"},{l:"Revenue",v:`Rs${(zone.revenue/1000).toFixed(0)}K`,c:"#34D399"}].map((s,i)=>(
          <div key={i} style={{ background:"rgba(0,0,0,0.2)", borderRadius:8, padding:"6px 8px", textAlign:"center" }}>
            <div style={{ fontSize:13, fontWeight:800, color:s.c, fontFamily:"monospace" }}>{s.v}</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.32)", marginTop:1 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:10, borderTop:"1px solid rgba(212,175,55,0.07)" }}>
        <span style={{ fontSize:10.5, color:"rgba(255,255,255,0.32)" }}>R:{zone.radius}km · {zone.lat.toFixed(3)},{zone.lng.toFixed(3)}</span>
        <Toggle checked={zone.geoFence} onChange={()=>onToggleFence(zone.id)} label="Geo-fence"/>
      </div>
    </div>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────────
function ZoneCityPage() {
  const toast = useToast();
  const [cities, setCities] = useState(INIT_CITIES);
  const [selCity, setSelCity] = useState(INIT_CITIES[0]);
  const [zones, setZones] = useState(PATNA_ZONES);
  const [viewMode, setViewMode] = useState("zones");
  const [addCityM, setAddCityM] = useState(false);
  const [addZoneM, setAddZoneM] = useState(false);
  const [editZoneM, setEditZoneM] = useState(false);
  const [geoFenceM, setGeoFenceM] = useState(false);
  const [editZone, setEditZone] = useState(null);
  const [nc, setNc] = useState({ name:"", state:"", lat:"", lng:"" });
  const [nz, setNz] = useState({ name:"", type:"pickup", radius:"2.0", lat:"", lng:"", geoFence:false, demand:"Medium" });

  const handleCityClick = (city) => {
    setSelCity(city);
    if (city.id === 1) setZones(PATNA_ZONES);
    else setZones(Array.from({length:city.zones||3},(_,i)=>({
      id:i+1, name:`${city.name} Zone ${i+1}`, type:["pickup","drop","hotspot","medical"][i%4],
      lat:25.5+i*0.04, lng:85.0+i*0.05, radius:1.5+i*0.4,
      drivers:8+i*7, rides:35+i*18, revenue:7000+i*4000,
      demand:["High","Medium","Low"][i%3], geoFence:i%2===0,
    })));
  };

  const addCity = () => {
    if(!nc.name||!nc.state){toast("Fill required fields","error");return;}
    setCities(c=>[...c,{id:c.length+1,name:nc.name,state:nc.state,x:390+Math.random()*80-40,y:250+Math.random()*80-40,active:false,zones:0,drivers:0,rides:0,revenue:0,status:"planned"}]);
    toast(`${nc.name} added as planned city!`,"success"); setAddCityM(false); setNc({name:"",state:"",lat:"",lng:""});
  };

  const addZone = () => {
    if(!nz.name){toast("Zone name required","error");return;}
    setZones(z=>[...z,{id:z.length+1,...nz,radius:parseFloat(nz.radius)||2,lat:parseFloat(nz.lat)||25.61,lng:parseFloat(nz.lng)||85.09,drivers:0,rides:0,revenue:0}]);
    toast(`Zone "${nz.name}" added to ${selCity?.name}!`,"success"); setAddZoneM(false); setNz({name:"",type:"pickup",radius:"2.0",lat:"",lng:"",geoFence:false,demand:"Medium"});
  };

  const saveEdit = () => { setZones(z=>z.map(x=>x.id===editZone.id?editZone:x)); toast("Zone updated!","success"); setEditZoneM(false); };
  const delZone = (id) => { setZones(z=>z.filter(x=>x.id!==id)); toast("Zone removed","error"); };
  const toggleFence = (id) => {
    const z = zones.find(x=>x.id===id);
    setZones(z2=>z2.map(x=>x.id===id?{...x,geoFence:!x.geoFence}:x));
    toast(`Geo-fence ${z?.geoFence?"disabled":"enabled"} for "${z?.name}"`,z?.geoFence?"error":"success");
  };
  const toggleCity = (id) => {
    const city = cities.find(c=>c.id===id);
    setCities(c=>c.map(x=>x.id===id?{...x,active:!x.active,status:x.active?"planned":"live"}:x));
    toast(`${city?.name} ${city?.active?"deactivated":"activated"}!`,city?.active?"error":"success");
  };

  const actCities = cities.filter(c=>c.active);
  const chartData = zones.slice(0,6).map(z=>({name:z.name.split(" ")[0],rev:z.revenue,drivers:z.drivers}));

  const VIEW_MODES = [
    {id:"zones",l:"Zones",Icon:Layers},{id:"heatmap",l:"Heatmap",Icon:Activity},
    {id:"drivers",l:"Drivers",Icon:()=><span style={{fontSize:11}}>🧑‍✈️</span>},
    {id:"revenue",l:"Revenue",Icon:TrendingUp},{id:"geofence",l:"Geo-fence",Icon:Shield},
  ];

  return (
    <PageWrapper title="Zone & City Management"
      subtitle="Live map · zone configuration · geo-fencing · driver heatmap"
      actions={
        <div style={{display:"flex",gap:8}}>
          <button className="btn-outline btn-sm" onClick={()=>setGeoFenceM(true)}><Shield size={13}/> Geo-Fence Rules</button>
          <button className="btn-outline btn-sm" onClick={()=>setAddZoneM(true)}><Plus size={13}/> Add Zone</button>
          <button className="btn-gold btn-sm" onClick={()=>setAddCityM(true)}><Plus size={13}/> Add City</button>
        </div>
      }>
      <GlobalStyles/>

      {/* Stats */}
      <MiniStatRow items={[
        {label:"Active Cities",  value:String(actCities.length),                            icon:"🏙️",color:"#D4AF37"},
        {label:"Total Zones",    value:String(actCities.reduce((a,b)=>a+b.zones,0)),        icon:"🗺️",color:"#60A5FA"},
        {label:"Active Drivers", value:actCities.reduce((a,b)=>a+b.drivers,0).toLocaleString(), icon:"🧑‍✈️",color:"#34D399"},
        {label:"Rides Today",    value:actCities.reduce((a,b)=>a+b.rides,0).toLocaleString(), icon:"🚗",color:"#A78BFA"},
        {label:"Total Revenue",  value:`Rs${(actCities.reduce((a,b)=>a+b.revenue,0)/100000).toFixed(1)}L`, icon:"💰",color:"#D4AF37"},
        {label:"Planned Cities", value:String(cities.filter(c=>!c.active).length),          icon:"📍",color:"#F59E0B"},
      ]}/>

      {/* Map + City List */}
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,2fr) minmax(0,1fr)",gap:16,marginBottom:18}}>
        {/* Map */}
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid rgba(212,175,55,0.1)",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <MapPin size={15} color="#D4AF37"/>
              <span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)"}}>India Map{selCity?` — ${selCity.name}`:""}</span>
            </div>
            <div style={{display:"flex",gap:3,background:"rgba(0,0,0,0.3)",padding:3,borderRadius:10}}>
              {VIEW_MODES.map(v=>(
                <button key={v.id} onClick={()=>setViewMode(v.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:7,border:"none",background:viewMode===v.id?"rgba(212,175,55,0.15)":"transparent",color:viewMode===v.id?"#D4AF37":"rgba(255,255,255,0.4)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"Outfit,sans-serif",transition:"all .2s",whiteSpace:"nowrap"}}>
                  <v.Icon size={12}/> {v.l}
                </button>
              ))}
            </div>
          </div>
          <div style={{height:380,padding:4}}>
            <IndiaMap cities={cities} selCity={selCity} onCityClick={handleCityClick} viewMode={viewMode} zones={zones}/>
          </div>
          {/* Legend */}
          <div style={{padding:"9px 18px",borderTop:"1px solid rgba(212,175,55,0.08)",display:"flex",gap:14,flexWrap:"wrap"}}>
            {[{c:"#34D399",l:"Live"},{c:"#60A5FA",l:"Planned"},{c:"#F59E0B",l:"Upcoming"},{c:"#D4AF37",l:"Selected"}].map((it,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:10.5,color:"rgba(255,255,255,0.4)"}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:it.c}}/>{it.l}
              </div>
            ))}
            {viewMode==="zones" && Object.entries(ZONE_TYPES).slice(0,4).map(([k,v])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:4,fontSize:10.5,color:"rgba(255,255,255,0.4)"}}>
                <div style={{width:12,height:3,borderRadius:2,background:v.color}}/>{v.label}
              </div>
            ))}
          </div>
        </Card>

        {/* City List */}
        <Card style={{overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:474}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(212,175,55,0.1)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)"}}>All Cities ({cities.length})</span>
            <div style={{display:"flex",gap:5}}>
              <span style={{display:"inline-flex",padding:"2px 7px",borderRadius:100,fontSize:10,fontWeight:600,background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.24)",color:"#34D399"}}>{actCities.length} Live</span>
              <span style={{display:"inline-flex",padding:"2px 7px",borderRadius:100,fontSize:10,fontWeight:600,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.24)",color:"#F59E0B"}}>{cities.filter(c=>!c.active).length} Planned</span>
            </div>
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            {cities.map(city=>(
              <div key={city.id} onClick={()=>handleCityClick(city)}
                style={{padding:"11px 14px",borderBottom:"1px solid rgba(212,175,55,0.07)",cursor:"pointer",background:selCity?.id===city.id?"rgba(212,175,55,0.06)":"transparent",transition:"all .2s",display:"flex",alignItems:"center",gap:10}}
                onMouseEnter={e=>{if(selCity?.id!==city.id)e.currentTarget.style.background="rgba(255,255,255,0.025)";}}
                onMouseLeave={e=>{if(selCity?.id!==city.id)e.currentTarget.style.background="transparent";}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:city.status==="live"?"#34D399":city.status==="planned"?"#60A5FA":"#F59E0B",flexShrink:0,boxShadow:city.status==="live"?"0 0 5px rgba(52,211,153,0.6)":"none"}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{fontSize:13,fontWeight:600,color:selCity?.id===city.id?"#D4AF37":"rgba(255,255,255,0.8)"}}>{city.name}</div>
                    <span style={{fontSize:10,color:"rgba(255,255,255,0.28)"}}>{city.state}</span>
                  </div>
                  {city.active&&<div style={{display:"flex",gap:9,marginTop:2,fontSize:10.5}}>
                    <span style={{color:"rgba(255,255,255,0.38)"}}>{city.drivers} drv</span>
                    <span style={{color:"rgba(255,255,255,0.38)"}}>{city.zones} zones</span>
                    <span style={{color:"#34D399"}}>Rs{(city.revenue/1000).toFixed(0)}K</span>
                  </div>}
                </div>
                <button onClick={e=>{e.stopPropagation();toggleCity(city.id);}}
                  style={{background:city.active?"rgba(248,113,113,0.08)":"rgba(52,211,153,0.08)",border:`1px solid ${city.active?"rgba(248,113,113,0.28)":"rgba(52,211,153,0.28)"}`,borderRadius:7,color:city.active?"#F87171":"#34D399",fontSize:10,fontWeight:600,cursor:"pointer",padding:"3px 8px",whiteSpace:"nowrap",fontFamily:"Outfit,sans-serif"}}>
                  {city.active?"Deact.":"Activate"}
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Zone Section */}
      {selCity && (
        <>
          {/* Charts Row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:18}}>
            {/* Zone Revenue Chart */}
            <Card style={{padding:20}}>
              <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:3}}>Zone-wise Revenue — {selCity.name}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:14}}>Revenue per zone (top 6)</div>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={chartData} margin={{top:4,right:4,left:0,bottom:0}}>
                  <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false}/>
                  <XAxis dataKey="name" tick={{fill:"rgba(255,255,255,0.4)",fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:"rgba(255,255,255,0.3)",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`Rs${(v/1000).toFixed(0)}K`}/>
                  <Tooltip content={<GoldTooltip/>}/>
                  <Bar dataKey="rev" name="Revenue" radius={[5,5,0,0]}>
                    {chartData.map((_,i)=><Cell key={i} fill={["#D4AF37","#60A5FA","#F87171","#34D399","#A78BFA","#F59E0B"][i%6]} fillOpacity={0.85}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Driver Heatmap */}
            <Card style={{padding:20}}>
              <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:3}}>Driver Availability Heatmap</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:14}}>Driver count per zone — {selCity.name}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(88px,1fr))",gap:8}}>
                {zones.slice(0,8).map((zone,i)=>{
                  const maxD = Math.max(...zones.map(z=>z.drivers));
                  const pct = maxD>0?zone.drivers/maxD:0;
                  const col = pct>0.7?"#F87171":pct>0.4?"#F59E0B":"#34D399";
                  return (
                    <div key={i} style={{background:`rgba(${pct>0.7?"248,113,113":pct>0.4?"245,158,11":"52,211,153"},${0.07+pct*0.18})`,border:`1px solid rgba(${pct>0.7?"248,113,113":pct>0.4?"245,158,11":"52,211,153"},${0.12+pct*0.3})`,borderRadius:10,padding:"9px 7px",textAlign:"center"}}>
                      <div style={{fontSize:17,fontWeight:800,color:col,fontFamily:"monospace",marginBottom:3}}>{zone.drivers}</div>
                      <div style={{height:4,borderRadius:100,background:"rgba(255,255,255,0.07)",marginBottom:4,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct*100}%`,background:col,borderRadius:100}}/>
                      </div>
                      <div style={{fontSize:9,color:"rgba(255,255,255,0.38)",lineHeight:1.3}}>{zone.name.split(" ")[0]}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Zone Cards Grid */}
          <div style={{marginBottom:18}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:10}}>
              <div>
                <div style={{fontFamily:"Cinzel,serif",fontSize:16,fontWeight:700,color:"#D4AF37"}}>{selCity.name} — Zones ({zones.length})</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginTop:2}}>Toggle geo-fence per zone · Dashed border = no geo-fence</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn-outline btn-sm" onClick={()=>setGeoFenceM(true)}><Shield size={13}/> Geo-Fence Rules</button>
                <button className="btn-gold btn-sm" onClick={()=>setAddZoneM(true)}><Plus size={13}/> Add Zone</button>
              </div>
            </div>
            {/* Zone type chips */}
            <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
              {Object.entries(ZONE_TYPES).map(([k,v])=>(
                <span key={k} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:100,fontSize:10.5,fontWeight:600,background:`${v.color}10`,border:`1px solid ${v.color}22`,color:v.color}}>
                  {v.icon} {v.label} <span style={{color:"rgba(255,255,255,0.35)"}}>({zones.filter(z=>z.type===k).length})</span>
                </span>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:12}}>
              {zones.map(zone=>(
                <ZoneCard key={zone.id} zone={zone} onEdit={z=>{setEditZone({...z});setEditZoneM(true);}} onDelete={delZone} onToggleFence={toggleFence}/>
              ))}
              {zones.length===0&&<div style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.3)",gridColumn:"1/-1"}}><div style={{fontSize:36,marginBottom:10}}>🗺️</div>No zones for {selCity.name}<div style={{marginTop:12}}><button className="btn-gold btn-sm" onClick={()=>setAddZoneM(true)}>Add First Zone</button></div></div>}
            </div>
          </div>

          {/* Zone Stats Table */}
          <TableCard title={`Zone Performance — ${selCity.name}`} icon="📊"
            actions={<button className="btn-outline btn-sm" onClick={()=>toast("Zone report exported!","success")}>Export</button>}>
            <table className="gm-table">
              <thead><tr><th>Zone Name</th><th>Type</th><th>Drivers</th><th>Rides</th><th>Revenue</th><th>Demand</th><th>Geo-fence</th><th>Radius</th><th>Actions</th></tr></thead>
              <tbody>{zones.map((z,i)=>{
                const conf=ZONE_TYPES[z.type]||ZONE_TYPES.pickup;
                return(<tr key={i}>
                  <td style={{fontWeight:600}}>{z.name}</td>
                  <td><span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:100,fontSize:10.5,fontWeight:600,background:`${conf.color}14`,border:`1px solid ${conf.color}28`,color:conf.color}}>{conf.icon} {conf.label}</span></td>
                  <td style={{color:"#60A5FA",fontFamily:"monospace",fontWeight:700}}>{z.drivers}</td>
                  <td style={{color:"#D4AF37",fontFamily:"monospace"}}>{z.rides}</td>
                  <td style={{color:"#34D399",fontFamily:"monospace"}}>Rs{z.revenue.toLocaleString()}</td>
                  <td><span style={{display:"inline-flex",padding:"3px 8px",borderRadius:100,fontSize:10.5,fontWeight:600,background:`${DEMAND_COLOR[z.demand]}14`,border:`1px solid ${DEMAND_COLOR[z.demand]}28`,color:DEMAND_COLOR[z.demand]}}>{z.demand}</span></td>
                  <td>{z.geoFence?<span style={{color:"#34D399"}}>✅</span>:<span style={{color:"rgba(255,255,255,0.25)"}}>—</span>}</td>
                  <td style={{fontFamily:"monospace",color:"rgba(255,255,255,0.5)"}}>{z.radius} km</td>
                  <td><div style={{display:"flex",gap:4}}>
                    <button className="btn-outline btn-xs" onClick={()=>{setEditZone({...z});setEditZoneM(true);}}><Edit3 size={10}/></button>
                    <button className="btn-danger btn-xs" onClick={()=>delZone(z.id)}><Trash2 size={10}/></button>
                  </div></td>
                </tr>);
              })}</tbody>
            </table>
          </TableCard>
        </>
      )}

      {/* ── MODALS ── */}
      <Modal open={addCityM} onClose={()=>setAddCityM(false)} title="🏙️ Add New City">
        <AlertBox type="info">City added as "Planned". Activate it once drivers are onboarded.</AlertBox>
        <FormGroup label="City Name"><input className="gm-input" placeholder="e.g. Muzaffarpur" value={nc.name} onChange={e=>setNc({...nc,name:e.target.value})}/></FormGroup>
        <FormGroup label="State"><input className="gm-input" placeholder="e.g. Bihar" value={nc.state} onChange={e=>setNc({...nc,state:e.target.value})}/></FormGroup>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <FormGroup label="Latitude" hint="e.g. 26.1209"><input className="gm-input" placeholder="26.1209" value={nc.lat} onChange={e=>setNc({...nc,lat:e.target.value})}/></FormGroup>
          <FormGroup label="Longitude" hint="e.g. 85.3647"><input className="gm-input" placeholder="85.3647" value={nc.lng} onChange={e=>setNc({...nc,lng:e.target.value})}/></FormGroup>
        </div>
        <FormGroup label="Target Launch Date"><input type="date" className="gm-input"/></FormGroup>
        <FormGroup label="Target Drivers at Launch"><input type="number" className="gm-input" placeholder="50"/></FormGroup>
        <div style={{display:"flex",gap:8}}><button className="btn-outline" onClick={()=>setAddCityM(false)}>Cancel</button><button className="btn-gold" onClick={addCity}>Add City</button></div>
      </Modal>

      <Modal open={addZoneM} onClose={()=>setAddZoneM(false)} title="📍 Add Zone">
        <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:12,padding:"7px 11px",background:"rgba(212,175,55,0.05)",borderRadius:8}}>Adding zone to: <strong style={{color:"#D4AF37"}}>{selCity?.name}</strong></div>
        <FormGroup label="Zone Name"><input className="gm-input" placeholder="e.g. Railway Station Zone" value={nz.name} onChange={e=>setNz({...nz,name:e.target.value})}/></FormGroup>
        <FormGroup label="Zone Type"><select className="gm-input" value={nz.type} onChange={e=>setNz({...nz,type:e.target.value})}>{Object.entries(ZONE_TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></FormGroup>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <FormGroup label="Latitude"><input className="gm-input" placeholder="25.6122" value={nz.lat} onChange={e=>setNz({...nz,lat:e.target.value})}/></FormGroup>
          <FormGroup label="Longitude"><input className="gm-input" placeholder="85.0511" value={nz.lng} onChange={e=>setNz({...nz,lng:e.target.value})}/></FormGroup>
          <FormGroup label="Radius (km)"><input type="number" className="gm-input" placeholder="2.0" step="0.5" value={nz.radius} onChange={e=>setNz({...nz,radius:e.target.value})}/></FormGroup>
          <FormGroup label="Demand Level"><select className="gm-input" value={nz.demand} onChange={e=>setNz({...nz,demand:e.target.value})}><option>High</option><option>Medium</option><option>Low</option></select></FormGroup>
        </div>
        <FormGroup label="Enable Geo-Fence"><div style={{paddingTop:6}}><Toggle checked={nz.geoFence} onChange={v=>setNz({...nz,geoFence:v})} label="Enable geo-fence for this zone"/></div></FormGroup>
        <div style={{display:"flex",gap:8}}><button className="btn-outline" onClick={()=>setAddZoneM(false)}>Cancel</button><button className="btn-gold" onClick={addZone}>Add Zone</button></div>
      </Modal>

      {editZone&&<Modal open={editZoneM} onClose={()=>setEditZoneM(false)} title="✏️ Edit Zone">
        <FormGroup label="Zone Name"><input className="gm-input" value={editZone.name} onChange={e=>setEditZone({...editZone,name:e.target.value})}/></FormGroup>
        <FormGroup label="Zone Type"><select className="gm-input" value={editZone.type} onChange={e=>setEditZone({...editZone,type:e.target.value})}>{Object.entries(ZONE_TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></FormGroup>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <FormGroup label="Radius (km)"><input type="number" className="gm-input" value={editZone.radius} step="0.5" onChange={e=>setEditZone({...editZone,radius:parseFloat(e.target.value)})}/></FormGroup>
          <FormGroup label="Demand Level"><select className="gm-input" value={editZone.demand} onChange={e=>setEditZone({...editZone,demand:e.target.value})}><option>High</option><option>Medium</option><option>Low</option></select></FormGroup>
          <FormGroup label="Latitude"><input className="gm-input" value={editZone.lat} onChange={e=>setEditZone({...editZone,lat:parseFloat(e.target.value)})}/></FormGroup>
          <FormGroup label="Longitude"><input className="gm-input" value={editZone.lng} onChange={e=>setEditZone({...editZone,lng:parseFloat(e.target.value)})}/></FormGroup>
        </div>
        <FormGroup label="Geo-fence"><div style={{paddingTop:6}}><Toggle checked={editZone.geoFence} onChange={v=>setEditZone({...editZone,geoFence:v})} label="Geo-fence enabled"/></div></FormGroup>
        <div style={{display:"flex",gap:8}}><button className="btn-outline" onClick={()=>setEditZoneM(false)}>Cancel</button><button className="btn-gold" onClick={saveEdit}>Save Changes</button></div>
      </Modal>}

      <Modal open={geoFenceM} onClose={()=>setGeoFenceM(false)} title="🛡️ Geo-Fence Rules" maxWidth={560}>
        <AlertBox type="info">Rules apply city-wide. Drivers outside boundary are auto-marked offline.</AlertBox>
        {selCity&&<div style={{marginBottom:14,padding:"10px 14px",background:"rgba(212,175,55,0.05)",border:"1px solid rgba(212,175,55,0.15)",borderRadius:10}}><div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Configuring for</div><div style={{fontSize:15,fontWeight:700,color:"#D4AF37",fontFamily:"Cinzel,serif"}}>{selCity.name}, {selCity.state}</div></div>}
        <FormGroup label="Outer Geo-fence Radius (km)" hint="Drivers outside this go offline automatically"><input type="number" className="gm-input" defaultValue="25"/></FormGroup>
        <FormGroup label="Warning Zone Radius (km)" hint="Alert shown to driver when approaching boundary"><input type="number" className="gm-input" defaultValue="20"/></FormGroup>
        <FormGroup label="Auto-offline Outside Boundary"><div style={{paddingTop:6}}><Toggle checked={true} onChange={()=>{}} label="Auto-mark driver offline when outside zone"/></div></FormGroup>
        <FormGroup label="Block Ride Booking Outside Zone"><div style={{paddingTop:6}}><Toggle checked={true} onChange={()=>{}} label="Block booking outside service area"/></div></FormGroup>
        <FormGroup label="Driver Grace Period (minutes)" hint="Time before offline triggers after leaving zone"><input type="number" className="gm-input" defaultValue="5"/></FormGroup>
        <FormGroup label="Driver Alert Message"><textarea className="gm-input" rows="2" defaultValue="You are approaching the service zone boundary. Please return to service area." style={{resize:"vertical"}}/></FormGroup>
        <div style={{display:"flex",gap:8}}><button className="btn-outline" onClick={()=>setGeoFenceM(false)}>Cancel</button><button className="btn-gold" onClick={()=>{setGeoFenceM(false);toast("Geo-fence rules saved!","success");}}>Save Rules</button></div>
      </Modal>
    </PageWrapper>
  );
}

export default function CityManagementPage() {
  return <ToastProvider><ZoneCityPage/></ToastProvider>;
}
