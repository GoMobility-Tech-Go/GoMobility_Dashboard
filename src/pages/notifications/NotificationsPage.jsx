import { useState } from "react";
import { useToast, ToastProvider, PageWrapper, Card, FormGroup, Toggle, MiniStatRow, GlobalStyles } from "../../components/ui/index.jsx";

function Content() {
  const toast=useToast(), [title,setTitle]=useState(""), [body,setBody]=useState(""), [target,setTarget]=useState("All Users"), [banner,setBanner]=useState(false), [schedule,setSchedule]=useState(""), [sending,setSending]=useState(false);
  const send=()=>{if(!title||!body){toast("Title and message required","error");return;}setSending(true);setTimeout(()=>{setSending(false);toast(`Notification "${title}" sent to ${target}!`,"success");setTitle("");setBody("");},1200);};
  const scheduleNotif=()=>{if(!title||!body||!schedule){toast("Fill all fields + schedule time","error");return;}toast(`Notification scheduled for ${schedule}`,"success");setTitle("");setBody("");setSchedule("");};
  return (
    <PageWrapper title="Push Notifications" subtitle="Broadcast, segment and schedule messages to users and drivers">
      <GlobalStyles/>
      <MiniStatRow items={[{label:"Sent Today",value:"—",icon:"📤",color:"#D4AF37"},{label:"Total Reach",value:"—",icon:"👥"},{label:"Avg Open Rate",value:"—",icon:"📊",color:"#34D399"},{label:"Scheduled",value:"—",icon:"⏰",color:"#60A5FA"}]}/>
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:16}}>
        <Card style={{padding:22}}>
          <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:18}}>Compose Notification</div>
          <FormGroup label="Target Audience"><select className="gm-input" value={target} onChange={e=>setTarget(e.target.value)}><option>All Users</option><option>All Drivers</option><option>Active Users (Last 7 days)</option><option>By City</option><option>By Vehicle Type</option><option>Specific User ID</option></select></FormGroup>
          <FormGroup label="Notification Title"><input className="gm-input" placeholder="Enter a catchy title..." value={title} onChange={e=>setTitle(e.target.value)}/></FormGroup>
          <FormGroup label="Message Body"><textarea className="gm-input" rows="4" placeholder="Type your message here..." style={{resize:"vertical"}} value={body} onChange={e=>setBody(e.target.value)}/><div style={{textAlign:"right",fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:4}}>{body.length}/140</div></FormGroup>
          <FormGroup label="Schedule (Leave blank to send now)"><input type="datetime-local" className="gm-input" value={schedule} onChange={e=>setSchedule(e.target.value)}/></FormGroup>
          <div style={{marginBottom:16}}><Toggle checked={banner} onChange={setBanner} label="Show as in-app announcement banner"/></div>
          {(title||body)&&<div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(212,175,55,0.15)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
            <div style={{fontSize:10,color:"rgba(212,175,55,0.5)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.8px"}}>Preview</div>
            <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.88)",marginBottom:3}}>{title||"Your title here"}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>{body||"Your message here..."}</div>
          </div>}
          <div style={{display:"flex",gap:8}}><button className="btn-gold" onClick={send} disabled={sending} style={{flex:1,justifyContent:"center",opacity:sending?0.7:1}}>{sending?"Sending...":"Send Now"}</button><button className="btn-outline" onClick={scheduleNotif}>Schedule</button></div>
        </Card>
        <Card style={{overflow:"hidden"}}>
          <div style={{padding:"15px 20px",borderBottom:"1px solid rgba(212,175,55,0.1)",fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)"}}>Notification History</div>
          <div style={{padding:50,textAlign:"center",color:"rgba(255,255,255,0.3)",fontFamily:"Outfit,sans-serif"}}>
            <div style={{fontSize:32,marginBottom:10}}>📭</div>
            Notification history not available via API
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
export default function NotificationsPage() { return <ToastProvider><Content/></ToastProvider>; }
