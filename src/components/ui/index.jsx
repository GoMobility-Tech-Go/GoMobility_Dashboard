import { useState, useCallback, createContext, useContext, useEffect } from "react";

// ── TOAST ─────────────────────────────────────────────────────────────────────
const ToastCtx = createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const icons = { success: "✓", error: "✕", warning: "⚠" };
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div style={{ position:"fixed",top:20,right:20,zIndex:9999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none" }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))",border:"1px solid rgba(212,175,55,0.22)",borderLeft:`3px solid ${t.type==="error"?"#F87171":t.type==="warning"?"#F59E0B":"#34D399"}`,borderRadius:12,padding:"12px 16px",fontSize:13,color:"rgba(255,255,255,0.9)",fontFamily:"Outfit,sans-serif",display:"flex",alignItems:"center",gap:9,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",maxWidth:300,animation:"gmSlideIn .3s ease",backdropFilter:"blur(12px)" }}>
            <span style={{ fontSize:15, fontWeight:700, color:t.type==="error"?"#F87171":t.type==="warning"?"#F59E0B":"#34D399" }}>{icons[t.type]||icons.success}</span>
            {t.msg}
          </div>
        ))}
      </div>
      <style>{`@keyframes gmSlideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ── MODAL ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, maxWidth = 520 }) {
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  if (!open) return null;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position:"fixed",inset:0,background:"rgba(1,9,23,0.88)",backdropFilter:"blur(8px)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"gmFadeIn .2s ease" }}>
      <div style={{ background:"linear-gradient(145deg,rgba(255,255,255,0.065),rgba(255,255,255,0.018))",border:"1px solid rgba(212,175,55,0.25)",borderRadius:22,width:"100%",maxWidth,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 32px 80px rgba(0,0,0,0.6)",animation:"gmSlideUp .25s ease",position:"relative" }}>
        <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.4),transparent)",borderRadius:"22px 22px 0 0" }}/>
        <div style={{ padding:"20px 24px",borderBottom:"1px solid rgba(212,175,55,0.12)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <span style={{ fontSize:15,fontWeight:700,fontFamily:"Cinzel,serif",color:"#D4AF37" }}>{title}</span>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(212,175,55,0.2)",borderRadius:8,color:"rgba(255,255,255,0.5)",width:30,height:30,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif",transition:"all .2s" }}>×</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
      <style>{`@keyframes gmFadeIn{from{opacity:0}to{opacity:1}}@keyframes gmSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ── BADGE ─────────────────────────────────────────────────────────────────────
export function Badge({ status }) {
  const M = { Active:"green",Verified:"green",Online:"green",Completed:"green",Approved:"green",Processed:"green",Resolved:"green",Valid:"green",Blocked:"red",Rejected:"red",Cancelled:"red",Expired:"red",Failed:"red",Disabled:"red",Pending:"gold","In Progress":"gold","Expiring Soon":"orange",New:"blue",Open:"blue",Ongoing:"cyan",Offline:"gray",High:"red",Medium:"orange",Low:"gray" };
  const c = M[status] || "gray";
  const S = { green:{bg:"rgba(52,211,153,0.1)",br:"rgba(52,211,153,0.25)",tx:"#34D399"}, gold:{bg:"rgba(212,175,55,0.1)",br:"rgba(212,175,55,0.28)",tx:"#D4AF37"}, red:{bg:"rgba(248,113,113,0.1)",br:"rgba(248,113,113,0.26)",tx:"#F87171"}, blue:{bg:"rgba(96,165,250,0.1)",br:"rgba(96,165,250,0.24)",tx:"#60A5FA"}, orange:{bg:"rgba(245,158,11,0.1)",br:"rgba(245,158,11,0.25)",tx:"#F59E0B"}, cyan:{bg:"rgba(34,211,238,0.08)",br:"rgba(34,211,238,0.22)",tx:"#22D3EE"}, gray:{bg:"rgba(255,255,255,0.06)",br:"rgba(255,255,255,0.12)",tx:"rgba(255,255,255,0.45)"} };
  const s = S[c];
  const hasDot = ["green","gold","red"].includes(c);
  const dotAnim = c==="green"?"gmPulseG":c==="gold"?"gmPulseD":"gmPulseR";
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:100,fontSize:10.5,fontWeight:600,fontFamily:"Outfit,sans-serif",whiteSpace:"nowrap",background:s.bg,border:`1px solid ${s.br}`,color:s.tx }}>
      {hasDot && <span style={{ width:6,height:6,borderRadius:"50%",background:s.tx,flexShrink:0,animation:`${dotAnim} 2s ease-in-out infinite` }}/>}
      {status}
      <style>{`@keyframes gmPulseG{0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}50%{box-shadow:0 0 0 6px rgba(52,211,153,0)}}@keyframes gmPulseD{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,.5)}50%{box-shadow:0 0 0 6px rgba(212,175,55,0)}}@keyframes gmPulseR{0%,100%{box-shadow:0 0 0 0 rgba(248,113,113,.5)}50%{box-shadow:0 0 0 6px rgba(248,113,113,0)}}`}</style>
    </span>
  );
}

// ── AVATAR CELL ───────────────────────────────────────────────────────────────
export function AvatarCell({ name, sub, gradient = "linear-gradient(135deg,#D4AF37,#b8920f)" }) {
  const init = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
      <div style={{ width:32,height:32,borderRadius:"50%",background:gradient,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#04081A",flexShrink:0 }}>{init}</div>
      <div>
        <div style={{ fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.88)" }}>{name}</div>
        {sub && <div style={{ fontSize:11,color:"rgba(255,255,255,0.38)" }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── CARD ──────────────────────────────────────────────────────────────────────
export function Card({ children, style = {} }) {
  return (
    <div style={{ background:"linear-gradient(145deg,rgba(255,255,255,0.048) 0%,rgba(255,255,255,0.012) 100%)",border:"1px solid rgba(212,175,55,0.17)",borderRadius:20,backdropFilter:"blur(14px)",position:"relative",overflow:"hidden",...style }}>
      <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.38),transparent)" }}/>
      {children}
    </div>
  );
}

// ── TABLE CARD ────────────────────────────────────────────────────────────────
export function TableCard({ title, icon, actions, children, footer }) {
  return (
    <Card style={{ overflow:"hidden",marginBottom:0 }}>
      <div style={{ padding:"15px 20px",borderBottom:"1px solid rgba(212,175,55,0.1)",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10 }}>
        <div style={{ fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",fontFamily:"Outfit,sans-serif",display:"flex",alignItems:"center",gap:7 }}>{icon && <span>{icon}</span>} {title}</div>
        {actions && <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>{actions}</div>}
      </div>
      <div style={{ overflowX:"auto" }}>{children}</div>
      {footer && <div style={{ padding:"11px 20px",borderTop:"1px solid rgba(212,175,55,0.08)",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8 }}>{footer}</div>}
    </Card>
  );
}

// ── FILTER BAR ────────────────────────────────────────────────────────────────
export function FilterBar({ children }) {
  return <div style={{ display:"flex",gap:10,flexWrap:"wrap",padding:"12px 16px",borderBottom:"1px solid rgba(212,175,55,0.08)" }}>{children}</div>;
}

// ── SEARCH BOX ────────────────────────────────────────────────────────────────
export function SearchBox({ placeholder, value, onChange }) {
  return (
    <div style={{ position:"relative",flex:1,minWidth:180,maxWidth:300 }}>
      <span style={{ position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"rgba(212,175,55,0.45)",fontSize:13,pointerEvents:"none" }}>🔍</span>
      <input className="gm-input" placeholder={placeholder||"Search..."} value={value||""} onChange={e=>onChange&&onChange(e.target.value)} style={{ paddingLeft:32 }}/>
    </div>
  );
}

// ── PAGINATION ────────────────────────────────────────────────────────────────
export function Pagination({ total, showing }) {
  return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,width:"100%" }}>
      <span style={{ fontSize:12,color:"rgba(255,255,255,0.35)",fontFamily:"Outfit,sans-serif" }}>{showing||total}</span>
      <div style={{ display:"flex",gap:4 }}>
        {["‹","1","2","3","›"].map((p,i) => (
          <button key={i} style={{ width:28,height:28,borderRadius:7,border:"1px solid rgba(212,175,55,0.15)",background:p==="1"?"rgba(212,175,55,0.12)":"rgba(255,255,255,0.03)",color:p==="1"?"#D4AF37":"rgba(255,255,255,0.4)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"Outfit,sans-serif",display:"flex",alignItems:"center",justifyContent:"center" }}>{p}</button>
        ))}
      </div>
    </div>
  );
}

// ── FORM GROUP ────────────────────────────────────────────────────────────────
export function FormGroup({ label, children, hint }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block",fontSize:10,fontWeight:700,color:"rgba(212,175,55,0.6)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6,fontFamily:"Cinzel,serif" }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:4,fontFamily:"Outfit,sans-serif" }}>{hint}</div>}
    </div>
  );
}

// ── TOGGLE ────────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange, label }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
      <label style={{ position:"relative",width:40,height:22,cursor:"pointer",display:"inline-block" }}>
        <input type="checkbox" checked={checked} onChange={e=>onChange&&onChange(e.target.checked)} style={{ opacity:0,width:0,height:0 }}/>
        <span style={{ position:"absolute",inset:0,background:checked?"rgba(212,175,55,0.2)":"rgba(255,255,255,0.08)",border:`1px solid ${checked?"rgba(212,175,55,0.5)":"rgba(212,175,55,0.2)"}`,borderRadius:100,transition:".25s" }}>
          <span style={{ position:"absolute",left:checked?"calc(100% - 19px)":3,top:"50%",transform:"translateY(-50%)",width:16,height:16,borderRadius:"50%",background:checked?"#D4AF37":"rgba(255,255,255,0.35)",transition:".25s",boxShadow:checked?"0 0 8px rgba(212,175,55,0.5)":"none" }}/>
        </span>
      </label>
      {label && <span style={{ fontSize:13,color:"rgba(255,255,255,0.6)",fontFamily:"Outfit,sans-serif" }}>{label}</span>}
    </div>
  );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, change, trend, icon: Icon, iconColor="#D4AF37", iconBg="rgba(212,175,55,0.1)" }) {
  return (
    <Card style={{ padding:"18px 20px" }}>
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12 }}>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:10.5,fontWeight:600,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8,fontFamily:"Outfit,sans-serif" }}>{label}</div>
          <div style={{ fontSize:26,fontWeight:800,color:"#fff",fontFamily:"Outfit,sans-serif",letterSpacing:"-0.5px",lineHeight:1.1 }}>{value}</div>
          {change && <div style={{ marginTop:6 }}><span style={{ display:"inline-flex",alignItems:"center",gap:3,background:trend==="up"?"rgba(52,211,153,0.1)":"rgba(248,113,113,0.1)",border:`1px solid ${trend==="up"?"rgba(52,211,153,0.25)":"rgba(248,113,113,0.25)"}`,color:trend==="up"?"#34D399":"#F87171",borderRadius:100,padding:"3px 8px",fontSize:10,fontWeight:600,fontFamily:"Outfit,sans-serif" }}>{trend==="up"?"↑":"↓"} {change}</span></div>}
        </div>
        {Icon && <div style={{ width:44,height:44,borderRadius:12,background:iconBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Icon size={20} color={iconColor}/></div>}
      </div>
    </Card>
  );
}

// ── MINI STAT ROW ─────────────────────────────────────────────────────────────
export function MiniStatRow({ items }) {
  return (
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:12,marginBottom:18 }}>
      {items.map((s,i) => (
        <Card key={i} style={{ padding:"13px 15px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:10,color:"rgba(255,255,255,0.38)",textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:5,fontFamily:"Outfit,sans-serif" }}>{s.label}</div>
            <div style={{ fontSize:21,fontWeight:800,color:s.color||"rgba(255,255,255,0.88)",fontFamily:"Outfit,sans-serif" }}>{s.value}</div>
          </div>
          <span style={{ fontSize:22 }}>{s.icon}</span>
        </Card>
      ))}
    </div>
  );
}

// ── ALERT BOX ─────────────────────────────────────────────────────────────────
export function AlertBox({ type = "warning", children }) {
  const s = { warning:{bg:"rgba(212,175,55,0.07)",br:"rgba(212,175,55,0.24)",c:"#D4AF37"}, error:{bg:"rgba(248,113,113,0.07)",br:"rgba(248,113,113,0.22)",c:"#F87171"}, success:{bg:"rgba(52,211,153,0.07)",br:"rgba(52,211,153,0.2)",c:"#34D399"}, info:{bg:"rgba(96,165,250,0.07)",br:"rgba(96,165,250,0.22)",c:"#60A5FA"} }[type]||{};
  return <div style={{ background:s.bg,border:`1px solid ${s.br}`,borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:13,color:s.c,fontFamily:"Outfit,sans-serif",display:"flex",alignItems:"center",gap:10 }}>{children}</div>;
}

// ── PAGE WRAPPER ──────────────────────────────────────────────────────────────
export function PageWrapper({ title, subtitle, actions, children }) {
  return (
    <div style={{ animation:"gmFadeUp .4s cubic-bezier(.22,1,.36,1) both" }}>
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:22,flexWrap:"wrap",gap:12 }}>
        <div>
          <h2 style={{ fontFamily:"Cinzel,serif",fontSize:20,fontWeight:800,color:"#D4AF37",margin:"0 0 3px",letterSpacing:"0.3px" }}>{title}</h2>
          {subtitle && <p style={{ fontSize:12.5,color:"rgba(255,255,255,0.38)",margin:0,fontFamily:"Outfit,sans-serif" }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>{actions}</div>}
      </div>
      {children}
      <style>{`@keyframes gmFadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ── TOOLTIP ───────────────────────────────────────────────────────────────────
export function GoldTooltip({ active, payload, label }) {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:"rgba(4,8,26,0.95)",border:"1px solid rgba(212,175,55,0.22)",borderRadius:12,padding:"10px 14px",backdropFilter:"blur(12px)",boxShadow:"0 14px 28px rgba(0,0,0,0.4)" }}>
      {label && <p style={{ margin:"0 0 6px",fontSize:10,color:"rgba(212,175,55,0.55)",fontFamily:"Outfit,sans-serif" }}>{label}</p>}
      {payload.map((item,i) => <p key={i} style={{ margin:0,fontSize:11,color:item.color||"#fff",fontWeight:600,fontFamily:"Outfit,sans-serif" }}>{item.name}: {item.value?.toLocaleString()}</p>)}
    </div>
  );
}

// ── SHARED CSS CLASSES (injected once) ────────────────────────────────────────
export function GlobalStyles() {
  return (
    <style>{`
      .gm-table{width:100%;border-collapse:collapse;font-family:'Outfit',sans-serif}
      .gm-table thead th{padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:rgba(212,175,55,.5);border-bottom:1px solid rgba(212,175,55,.1);background:rgba(0,0,0,.18);white-space:nowrap}
      .gm-table tbody tr{border-bottom:1px solid rgba(212,175,55,.07);transition:background .18s}
      .gm-table tbody tr:hover{background:rgba(212,175,55,.04)}
      .gm-table tbody td{padding:11px 14px;color:rgba(255,255,255,.65);vertical-align:middle}
      .gm-table tbody td:first-child{color:rgba(255,255,255,.88);font-weight:500}
      .gm-input{background:rgba(255,255,255,.05);border:1px solid rgba(212,175,55,.2);border-radius:10px;padding:9px 13px;color:rgba(255,255,255,.88);font-size:13px;font-family:'Outfit',sans-serif;outline:none;transition:border-color .2s,box-shadow .2s;width:100%}
      .gm-input:focus{border-color:#D4AF37;box-shadow:0 0 0 3px rgba(212,175,55,.1)}
      .gm-input::placeholder{color:rgba(255,255,255,.28)}
      select.gm-input{appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23D4AF37' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 11px center;padding-right:30px}
      .btn-gold{background:linear-gradient(135deg,#f0d060 0%,#D4AF37 45%,#b8922a 100%);color:#0a1840;font-weight:700;font-family:'Cinzel',serif;border:none;border-radius:10px;padding:9px 18px;font-size:12px;cursor:pointer;letter-spacing:.8px;display:inline-flex;align-items:center;gap:6px;transition:transform .2s,box-shadow .2s;white-space:nowrap}
      .btn-gold:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(212,175,55,.35)}
      .btn-outline{background:rgba(212,175,55,.06);border:1px solid rgba(212,175,55,.28);color:#D4AF37;font-weight:600;font-family:'Outfit',sans-serif;border-radius:10px;padding:8px 16px;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all .2s;white-space:nowrap}
      .btn-outline:hover{background:rgba(212,175,55,.12);border-color:rgba(212,175,55,.5)}
      .btn-danger{background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.28);color:#F87171;font-weight:600;font-family:'Outfit',sans-serif;border-radius:10px;padding:7px 14px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:all .2s}
      .btn-danger:hover{background:#F87171;color:white}
      .btn-success{background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.28);color:#34D399;font-weight:600;font-family:'Outfit',sans-serif;border-radius:10px;padding:7px 14px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:all .2s}
      .btn-success:hover{background:#34D399;color:#04081A}
      .btn-sm{padding:6px 12px !important;font-size:11.5px !important}
      .btn-xs{padding:4px 9px !important;font-size:11px !important;border-radius:7px !important}
      .prog-bar{height:5px;background:rgba(255,255,255,.07);border-radius:100px;overflow:hidden}
      .prog-fill{height:100%;border-radius:100px;background:linear-gradient(90deg,#D4AF37,#f7dc6f);transition:width .8s ease}
      .prog-fill-green{background:linear-gradient(90deg,#34D399,#6ee7b7)}
      .prog-fill-red{background:linear-gradient(90deg,#F87171,#fca5a5)}
      .prog-fill-orange{background:linear-gradient(90deg,#F59E0B,#fcd34d)}
      .tab-nav{display:flex;gap:0;border-bottom:1px solid rgba(212,175,55,.1);margin-bottom:20px;overflow-x:auto}
      .tab-btn{padding:11px 20px;font-size:13px;font-weight:600;cursor:pointer;border:none;background:none;font-family:'Outfit',sans-serif;color:rgba(255,255,255,.4);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .2s;white-space:nowrap}
      .tab-btn.active{color:#D4AF37;border-bottom-color:#D4AF37}
      .tab-btn:hover:not(.active){color:rgba(255,255,255,.7)}
    `}</style>
  );
}
