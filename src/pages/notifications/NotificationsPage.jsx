import { useState, useEffect, useCallback } from "react";
import { Bell, Send, X, Clock, ToggleLeft, ToggleRight, Play, Edit2, Check, History, Zap, Calendar, Users, AlertCircle, PartyPopper } from "lucide-react";
import {
  triggerEngagement,
  getNotificationSchedule,
  getCampaigns,
  toggleCampaign,
  updateCampaignMessage,
  runCampaignNow,
  getNotificationHistory,
} from "../../api/admin";

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ msg, type, onClose }) => (
  <div style={{
    position:"fixed", bottom:28, right:28, zIndex:9999,
    background: type==="error" ? "#7f1d1d" : "#14532d",
    border: `1px solid ${type==="error" ? "#ef4444" : "#22c55e"}`,
    borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13,
    fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12,
    boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:420,
  }}>
    <span style={{ flex:1 }}>{msg}</span>
    <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}>
      <X size={14}/>
    </button>
  </div>
);

// ── Audience options ──────────────────────────────────────────────────────────
const AUDIENCES = [
  { value:"all_users",             label:"All Users",                    icon:"👥", group:"Mixed",      desc:"All passengers + online drivers" },
  { value:"passengers",            label:"All Passengers",               icon:"🧑", group:"Passengers", desc:"Every registered passenger" },
  { value:"active_passengers",     label:"Active Passengers (7d)",       icon:"⚡", group:"Passengers", desc:"Rode in the last 7 days" },
  { value:"inactive_passenger_30d",label:"Inactive Passengers (30d+)",   icon:"💤", group:"Passengers", desc:"No ride in 30+ days" },
  { value:"new_user_no_ride",      label:"New Users — No Ride",          icon:"🆕", group:"Passengers", desc:"Joined 1–3 days ago, 0 rides" },
  { value:"all_drivers",           label:"All Drivers",                  icon:"🚗", group:"Drivers",    desc:"Every registered driver" },
  { value:"active_drivers",        label:"Online Drivers (now)",         icon:"🟢", group:"Drivers",    desc:"Currently online" },
  { value:"driver_offline_10d",    label:"Inactive Drivers (10d+)",      icon:"🔴", group:"Drivers",    desc:"Offline for 10+ days" },
  { value:"driver_no_docs",              label:"Drivers — No Docs",              icon:"📄", group:"Drivers",    desc:"0 documents uploaded" },
  { value:"driver_partial_kyc",          label:"Drivers — Partial KYC",          icon:"⏳", group:"Drivers",    desc:"KYC started but incomplete" },
  { value:"outdated_app_ncr_drivers",    label:"NCR — Outdated App (v<1.3.3)",   icon:"📲", group:"Drivers",    desc:"NCR verified drivers on old app (~238)" },
  { value:"outdated_app_all_drivers",    label:"All India — Outdated App",        icon:"📲", group:"Drivers",    desc:"All verified drivers on old app (~289)" },
];

const QUICK_TEMPLATES = [
  { title:"Special Offer! 🎉",      body:"Get 20% off on your next ride. Limited time only!",                   audience:"active_passengers" },
  { title:"Jai Hind! 🇮🇳",          body:"Happy Independence Day! Aaj sab rides pe ₹15 off.",                  audience:"all_users" },
  { title:"Driver Bonus Week 🏆",   body:"Complete 10+ rides this week and earn an extra ₹500 bonus!",         audience:"all_drivers" },
  { title:"Pehli ride baaki hai 👀", body:"Account ready hai! Pehli ride pe ₹30 off — code FIRST30",           audience:"new_user_no_ride" },
  { title:"Documents bharo! 📄",    body:"Sirf 5 min mein complete karo aur rides lena shuru karo!",           audience:"driver_no_docs" },
  { title:"Almost verified! 🏁",    body:"Thoda aur baaki hai. Baaki documents upload karo — almost done!",    audience:"driver_partial_kyc" },
  { title:"App Update Karo! 📲",    body:"GO Driver v1.3.3 aa gaya hai. Play Store se update karo — GPS aur ride dispatch behtar hoga.",  audience:"outdated_app_ncr_drivers" },
];

const inputStyle = {
  width:"100%", height:44, background:"rgba(255,255,255,0.06)",
  border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px",
  color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", boxSizing:"border-box",
};

const LABEL_STYLE = {
  display:"block", fontSize:11, fontFamily:"Cinzel,serif",
  color:"rgba(212,175,55,0.7)", letterSpacing:"1px",
  textTransform:"uppercase", marginBottom:6,
};

const fmtTime = (iso) => iso
  ? new Date(iso).toLocaleString("en-IN",{ day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })
  : "—";

const fmtRelative = (iso) => {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const SCHEDULE_LABEL = { daily:"Daily · 9 AM", weekly:"Weekly · Mon 9 AM" };

// ── Festival Data ─────────────────────────────────────────────────────────────
const FESTIVALS = [
  {
    id: "navratri_2026", name: "Navratri", emoji: "🪔", date: "2026-10-02",
    driverTitle:    "Navratri Mubarak! 🪔",
    driverBody:     "Navratri ki shubhkamnayein! Pandal hopping ke liye rides ki demand zyada hai — duty pe raho aur zyada kamao. GO Mobility ki taraf se haardik badhai!",
    passengerTitle: "Navratri Mubarak! 🪔",
    passengerBody:  "Navratri ki shubhkamnayein! Aaj pandal darshan pe jaao — GO Mobility ke saath safe aur comfortable ride lo. Jai Mata Di! 🙏",
  },
  {
    id: "dussehra_2026", name: "Dussehra", emoji: "🏹", date: "2026-10-12",
    driverTitle:    "Dussehra Mubarak! 🏹",
    driverBody:     "Dussehra ki haardik shubhkamnayein! Burai par achhai ki jeet mubarak ho. Aaj rush hoga — duty pe raho aur extra kamao. GO Mobility Family.",
    passengerTitle: "Dussehra Mubarak! 🏹",
    passengerBody:  "Dussehra ki shubhkamnayein! Ravan Dahan dekhne jaao — GO Mobility pe safe ride book karo. Burai par achhai ki jeet ho! 🙏",
  },
  {
    id: "dhanteras_2026", name: "Dhanteras", emoji: "🪙", date: "2026-10-20",
    driverTitle:    "Dhanteras Mubarak! 🪙",
    driverBody:     "Dhanteras ki shubhkamnayein! Aaj shopping rush rahega — zyada rides milenge. GO pe duty ON rakho aur khub kamao. Dhan aur samriddhi aaye!",
    passengerTitle: "Dhanteras Mubarak! 🪙",
    passengerBody:  "Dhanteras Mubarak! 🪙 Shopping ke liye jaao — GO Mobility pe book karo. Dhan aur samriddhi ki kamna ke saath. Shubh Dhanteras!",
  },
  {
    id: "diwali_2026", name: "Diwali", emoji: "✨", date: "2026-10-21",
    driverTitle:    "Diwali Mubarak! ✨🪔",
    driverBody:     "Diwali ki haardik shubhkamnayein! Aaj Diwali Bonus milega — rush hours mein ride accept karo aur extra kamao. Roshan karo apna ghar. GO Mobility Family. 🎆",
    passengerTitle: "Diwali Mubarak! ✨🪔",
    passengerBody:  "Diwali ki dher saari shubhkamnayein! 🪔 Celebration ke liye ghar jaao ya milne jaao — GO Mobility ke saath safe ride lo. Roshan rahe aapki zindagi!",
  },
  {
    id: "bhai_dooj_2026", name: "Bhai Dooj", emoji: "🎊", date: "2026-10-24",
    driverTitle:    "Bhai Dooj Mubarak! 🎊",
    driverBody:     "Bhai Dooj ki shubhkamnayein! Parivar se milne ke liye logon ko rides milenge — duty ON rakho. GO Mobility ki taraf se badhai!",
    passengerTitle: "Bhai Dooj Mubarak! 🎊",
    passengerBody:  "Bhai Dooj ki shubhkamnayein! 🎊 Bhai ya behen se milne jaao — GO Mobility pe safe aur quick ride book karo. Parivar ke saath yeh din khaas banao!",
  },
  {
    id: "chhath_2026", name: "Chhath Puja", emoji: "🌅", date: "2026-10-28",
    driverTitle:    "Chhath Puja Mubarak! 🌅",
    driverBody:     "Chhath Puja ki shubhkamnayein! Ghats pe jaane waale logon ke liye rides ki demand hogi — duty ON rakho. GO Mobility Family ki taraf se haardik badhai!",
    passengerTitle: "Chhath Puja Mubarak! 🌅",
    passengerBody:  "Chhath Puja ki haardik shubhkamnayein! 🌅 Ghat pe puja ke liye safe aur reliable ride GO Mobility pe book karo. Chhathi Maiya ki kripa bani rahe!",
  },
  {
    id: "gurpurab_2026", name: "Gurpurab", emoji: "🙏", date: "2026-11-05",
    driverTitle:    "Gurpurab Mubarak! 🙏",
    driverBody:     "Gurpurab ki haardik shubhkamnayein! Aaj Gurdwara jaane waale logon ke liye rides ki demand hogi. Duty ON rakho. Waheguru ki kirpa ho! GO Mobility.",
    passengerTitle: "Gurpurab Mubarak! 🙏",
    passengerBody:  "Gurpurab Mubarak! 🙏 Gurdwara darshan ke liye GO Mobility pe safe ride book karo. Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh!",
  },
  {
    id: "christmas_2026", name: "Christmas", emoji: "🎄", date: "2026-12-25",
    driverTitle:    "Merry Christmas! 🎄",
    driverBody:     "Merry Christmas! 🎄 Aaj celebrations ke liye trips zyada hongi — duty ON rakho aur festive season mein extra kamao. GO Mobility Family ki taraf se Merry Christmas!",
    passengerTitle: "Merry Christmas! 🎄",
    passengerBody:  "Merry Christmas! 🎄🎁 Christmas celebration ke liye church ya party mein jaao — GO Mobility pe safe ride book karo. Wish you a very Merry Christmas!",
  },
  {
    id: "new_year_2027", name: "New Year 2027", emoji: "🎆", date: "2027-01-01",
    driverTitle:    "Happy New Year 2027! 🎆",
    driverBody:     "Naya Saal Mubarak! 🎆 New Year parties aur celebrations ke liye late night rides bahut hongi — duty ON rakho aur extra kamao. GO Mobility Family ki taraf se haardik badhai!",
    passengerTitle: "Happy New Year 2027! 🎆",
    passengerBody:  "Happy New Year 2027! 🎆🥂 Naye saal ka jashn manao — GO Mobility ke saath safe ride lo. Iss naye saal mein aapko dhero khushiyan milein! Stay safe!",
  },
  {
    id: "makar_2027", name: "Makar Sankranti", emoji: "🪁", date: "2027-01-14",
    driverTitle:    "Makar Sankranti Mubarak! 🪁",
    driverBody:     "Makar Sankranti ki shubhkamnayein! 🪁 Aaj patang mahotsav ke liye logon ki rides ki demand hogi — duty ON rakho. Tilgul ghya, god god bola! GO Mobility.",
    passengerTitle: "Makar Sankranti Mubarak! 🪁",
    passengerBody:  "Makar Sankranti ki shubhkamnayein! 🪁 Patang udaane ke liye jaao ya parivar se milne jaao — GO Mobility pe safe ride book karo. Makare Sankrant!",
  },
  {
    id: "republic_2027", name: "Republic Day", emoji: "🇮🇳", date: "2027-01-26",
    driverTitle:    "Happy Republic Day! 🇮🇳",
    driverBody:     "Gantantra Diwas ki shubhkamnayein! 🇮🇳 Parade aur events ke liye logon ki rides ki demand hogi — duty ON rakho. Jai Hind! GO Mobility.",
    passengerTitle: "Happy Republic Day! 🇮🇳",
    passengerBody:  "Happy Republic Day! 🇮🇳 Parade dekhne jaao ya parks mein ek saath celebrate karo — GO Mobility ke saath safe ride lo. Jai Hind! Jai Bharat!",
  },
  {
    id: "holi_2027", name: "Holi", emoji: "🌈", date: "2027-03-14",
    driverTitle:    "Happy Holi! 🌈",
    driverBody:     "Holi ki shubhkamnayein! 🌈 Rang aur khushiyon ka tyohar mubarak ho. Aaj rides ki demand hogi — saaf kapde pehno aur duty ON rakho. Bura na mano Holi hai!",
    passengerTitle: "Happy Holi! 🌈",
    passengerBody:  "Happy Holi! 🌈🎨 Rang aur khushiyon ka tyohar mubarak ho! Celebration ke baad safely ghar jaao — GO Mobility pe ride book karo. Bura na mano Holi hai!",
  },
  {
    id: "eid_2027", name: "Eid ul-Fitr", emoji: "🌙", date: "2027-03-20",
    driverTitle:    "Eid Mubarak! 🌙",
    driverBody:     "Eid ul-Fitr Mubarak! 🌙 Namaz aur milne-julne ke liye rides ki demand hogi — duty ON rakho aur Eid pe extra kamao. GO Mobility ki taraf se Eid Mubarak!",
    passengerTitle: "Eid Mubarak! 🌙",
    passengerBody:  "Eid ul-Fitr Mubarak! 🌙⭐ Namaaz padne aur rishtedaroon se milne jaao — GO Mobility pe safe aur comfortable ride book karo. Eid Mubarak to you & your family!",
  },
  {
    id: "baisakhi_2027", name: "Baisakhi", emoji: "🌾", date: "2027-04-13",
    driverTitle:    "Happy Baisakhi! 🌾",
    driverBody:     "Baisakhi ki shubhkamnayein! 🌾 Melas aur celebrations ke liye rides ki demand hogi — duty ON rakho. Waheguru Ji ki kirpa ho. GO Mobility Family.",
    passengerTitle: "Happy Baisakhi! 🌾",
    passengerBody:  "Happy Baisakhi! 🌾 Baisakhi mela aur celebrations enjoy karo — GO Mobility pe safe ride book karo. Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh!",
  },
  {
    id: "independence_2027", name: "Independence Day", emoji: "🇮🇳", date: "2027-08-15",
    driverTitle:    "Happy Independence Day! 🇮🇳",
    driverBody:     "Swatantrata Diwas ki shubhkamnayein! 🇮🇳 Aaj events aur celebrations ke liye rides ki demand hogi — duty ON rakho. Jai Hind! GO Mobility.",
    passengerTitle: "Happy Independence Day! 🇮🇳",
    passengerBody:  "Happy Independence Day! 🇮🇳 Aazadi ka jashn manao — GO Mobility ke saath safe ride lo. Jai Hind! Jai Bharat! Bharat Mata ki Jai!",
  },
];

const getDaysUntil = (dateStr) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const fest  = new Date(dateStr); fest.setHours(0,0,0,0);
  return Math.ceil((fest - today) / 86400000);
};

// ── Festival Tab ──────────────────────────────────────────────────────────────
function FestivalTab({ showToast }) {
  const today    = new Date(); today.setHours(0,0,0,0);
  const upcoming = FESTIVALS.filter(f => getDaysUntil(f.date) >= 0).sort((a,b) => new Date(a.date)-new Date(b.date));
  const past     = FESTIVALS.filter(f => getDaysUntil(f.date) < 0).sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,3);

  // Editing state per festival
  const [editing, setEditing]   = useState(null); // { id, type: 'driver'|'passenger'|'all', title, body, audience }
  const [sending, setSending]   = useState({});
  // Dedup: track which festival+type was sent today
  const [sentLog, setSentLog]   = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("festival_sent_log") || "{}"); } catch { return {}; }
  });

  const markSent = (festId, type) => {
    const updated = { ...sentLog, [`${festId}_${type}`]: new Date().toISOString() };
    setSentLog(updated);
    try { sessionStorage.setItem("festival_sent_log", JSON.stringify(updated)); } catch {}
  };

  const isSent = (festId, type) => !!sentLog[`${festId}_${type}`];

  const openEdit = (fest, type) => {
    let title, body, audience;
    if (type === "driver")    { title = fest.driverTitle;    body = fest.driverBody;    audience = "all_drivers"; }
    if (type === "passenger") { title = fest.passengerTitle; body = fest.passengerBody; audience = "passengers"; }
    if (type === "all")       { title = fest.driverTitle;    body = fest.driverBody;    audience = "all_users"; }
    setEditing({ id: fest.id, type, title, body, audience });
  };

  const cancelEdit = () => setEditing(null);

  const sendFestival = async (festId, type, title, body, audience) => {
    if (!title.trim() || !body.trim()) { showToast("Title aur message dono required hain.", "error"); return; }
    const key = `${festId}_${type}`;
    setSending(p => ({ ...p, [key]: true }));
    try {
      const res = await triggerEngagement({ title, body, target_audience: audience });
      const d   = res.data?.data;
      const tot = (d?.passengers?.sent || 0) + (d?.drivers?.sent || 0);
      markSent(festId, type);
      setEditing(null);
      showToast(`✅ Festival notification sent! ${tot} devices notified.`);
    } catch (err) {
      showToast(err.response?.data?.message || "Send karne mein error aaya.", "error");
    } finally {
      setSending(p => ({ ...p, [key]: false }));
    }
  };

  const inp = {
    width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.2)",
    borderRadius:9, padding:"9px 12px", color:"#fff", fontSize:12,
    outline:"none", fontFamily:"Outfit,sans-serif", boxSizing:"border-box",
  };

  const FestCard = ({ f }) => {
    const days  = getDaysUntil(f.date);
    const isToday = days === 0;
    const isTomorrow = days === 1;
    const festDate = new Date(f.date).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });

    const urgency = days === 0 ? { bg:"rgba(52,211,153,0.08)", border:"rgba(52,211,153,0.3)", badge:"🟢 Today!", badgeColor:"#34D399" }
                  : days === 1 ? { bg:"rgba(245,158,11,0.06)", border:"rgba(245,158,11,0.25)", badge:"🟡 Tomorrow", badgeColor:"#f59e0b" }
                  : days <= 7  ? { bg:"rgba(212,175,55,0.05)", border:"rgba(212,175,55,0.2)",  badge:`${days}d away`, badgeColor:"#D4AF37" }
                  :              { bg:"rgba(255,255,255,0.02)", border:"rgba(255,255,255,0.07)", badge:`${days}d`,     badgeColor:"rgba(255,255,255,0.3)" };

    const isEditingThis = editing?.id === f.id;

    return (
      <div style={{ background: urgency.bg, border:`1px solid ${urgency.border}`, borderRadius:16, padding:18, marginBottom:12, transition:"all .15s" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:24 }}>{f.emoji}</span>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,0.9)", fontFamily:"Cinzel,serif" }}>{f.name}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:1 }}>{festDate}</div>
            </div>
          </div>
          <span style={{ fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:20,
            background:"rgba(0,0,0,0.25)", color: urgency.badgeColor,
            border:`1px solid ${urgency.border}` }}>{urgency.badge}</span>
        </div>

        {/* Send buttons */}
        {!isEditingThis ? (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[
              { type:"driver",    label:"Drivers ko",    icon:"🚗", sent: isSent(f.id,"driver") },
              { type:"passenger", label:"Passengers ko", icon:"🧑", sent: isSent(f.id,"passenger") },
              { type:"all",       label:"Sabko",         icon:"👥", sent: isSent(f.id,"all") },
            ].map(({ type, label, icon, sent }) => (
              <button key={type} onClick={() => !sent && openEdit(f, type)} disabled={sent}
                title={sent ? "Aaj already bhej diya" : `${label} bhejo`}
                style={{
                  display:"flex", alignItems:"center", gap:6,
                  padding:"7px 13px", borderRadius:9, fontSize:11, fontWeight:600,
                  cursor: sent ? "not-allowed" : "pointer",
                  background: sent ? "rgba(52,211,153,0.08)" : "rgba(212,175,55,0.1)",
                  border: `1px solid ${sent ? "rgba(52,211,153,0.25)" : "rgba(212,175,55,0.25)"}`,
                  color: sent ? "#34D399" : "#D4AF37",
                  opacity: sent ? 0.75 : 1,
                }}>
                {sent ? <Check size={11}/> : <Send size={11}/>}
                {icon} {sent ? "Bhej diya" : label}
              </button>
            ))}
          </div>
        ) : (
          /* Inline edit panel */
          <div style={{ background:"rgba(0,0,0,0.2)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:12, padding:14, marginTop:4 }}>
            <div style={{ fontSize:11, color:"rgba(212,175,55,0.7)", fontFamily:"Cinzel,serif", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>
              {editing.type==="driver" ? "🚗 Drivers ko" : editing.type==="passenger" ? "🧑 Passengers ko" : "👥 Sabko"} — message edit karo
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <input value={editing.title} onChange={e=>setEditing(p=>({...p,title:e.target.value}))}
                placeholder="Notification Title" style={inp}
                onFocus={e=>e.target.style.borderColor="#D4AF37"} onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.2)"}/>
              <textarea value={editing.body} onChange={e=>setEditing(p=>({...p,body:e.target.value}))}
                rows={3} placeholder="Message body…"
                style={{ ...inp, resize:"vertical", padding:"9px 12px" }}
                onFocus={e=>e.target.style.borderColor="#D4AF37"} onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.2)"}/>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:10, color: editing.body.length>140 ? "#f59e0b" : "rgba(255,255,255,0.3)" }}>{editing.body.length}/160 chars</span>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={cancelEdit}
                    style={{ padding:"7px 14px", borderRadius:8, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer" }}>
                    Cancel
                  </button>
                  <button onClick={() => sendFestival(editing.id, editing.type, editing.title, editing.body, editing.audience)}
                    disabled={!!sending[`${editing.id}_${editing.type}`]}
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", borderRadius:8, background:"linear-gradient(135deg,#f0d060,#D4AF37,#b8922a)", border:"none", color:"#0a1840", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"Cinzel,serif", opacity: sending[`${editing.id}_${editing.type}`] ? 0.6 : 1 }}>
                    <Send size={11}/>
                    {sending[`${editing.id}_${editing.type}`] ? "Sending…" : "Send Karo"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1.6fr) minmax(0,1fr)", gap:20, alignItems:"start" }}>
      {/* Left — Upcoming */}
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
          <span style={{ fontSize:18 }}>🎊</span>
          <span style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:700, color:"#fff" }}>Upcoming Festivals</span>
          <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"rgba(212,175,55,0.1)", color:"#D4AF37", border:"1px solid rgba(212,175,55,0.2)" }}>{upcoming.length} festivals</span>
        </div>

        {upcoming.length === 0 ? (
          <div style={{ padding:"40px 20px", textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>
            Is saal ke festivals khatam ho gaye. Naye saal ka wait karo! 🎆
          </div>
        ) : (
          upcoming.map(f => <FestCard key={f.id} f={f}/>)
        )}

        {past.length > 0 && (
          <div style={{ marginTop:8 }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.2)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:10 }}>
              Haal hi mein gaye
            </div>
            {past.map(f => (
              <div key={f.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"rgba(255,255,255,0.01)", border:"1px solid rgba(255,255,255,0.04)", borderRadius:10, marginBottom:6, opacity:0.5 }}>
                <span style={{ fontSize:18 }}>{f.emoji}</span>
                <div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontWeight:600 }}>{f.name}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.2)" }}>{new Date(f.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div>
                </div>
                <span style={{ marginLeft:"auto", fontSize:10, color:"rgba(255,255,255,0.2)" }}>Guzar gaya</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right — Tips + Summary */}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {/* Festival calendar mini */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"13px 16px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", alignItems:"center", gap:8 }}>
            <Calendar size={13} color="#D4AF37"/>
            <span style={{ fontFamily:"Cinzel,serif", fontSize:12, fontWeight:600, color:"#fff" }}>Festival Calendar</span>
          </div>
          <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:4 }}>
            {FESTIVALS.slice(0,8).map(f => {
              const days = getDaysUntil(f.date);
              const isPast = days < 0;
              return (
                <div key={f.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 8px", borderRadius:7, background: days===0 ? "rgba(52,211,153,0.08)" : "transparent" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, opacity: isPast ? 0.35 : 1 }}>
                    <span style={{ fontSize:13 }}>{f.emoji}</span>
                    <span style={{ fontSize:11, color: days===0 ? "#34D399" : "rgba(255,255,255,0.6)", fontWeight: days===0 ? 700 : 400 }}>{f.name}</span>
                  </div>
                  <span style={{ fontSize:10, color: days===0 ? "#34D399" : isPast ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.35)", fontFamily:"monospace" }}>
                    {isPast ? "✓" : days===0 ? "Today" : `${days}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* How it works */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(96,165,250,0.12)", borderRadius:16, padding:"14px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12 }}>
            <AlertCircle size={13} color="rgba(96,165,250,0.7)"/>
            <span style={{ fontFamily:"Cinzel,serif", fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>Kaise use karein</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[
              ["Festival card pe click karo", "\"Drivers ko\", \"Passengers ko\" ya \"Sabko\" mein se choose karo."],
              ["Message check karo", "Pre-written message aayega — edit karo ya as-is bhejo."],
              ["Send Karo", "FCM push sab selected devices pe jayega immediately."],
              ["Dedup protection", "Ek festival, ek type — session mein sirf ek baar bhej sakte ho (accidental double-send nahi hoga)."],
            ].map(([tip, detail]) => (
              <div key={tip} style={{ padding:"8px 10px", background:"rgba(96,165,250,0.04)", border:"1px solid rgba(96,165,250,0.08)", borderRadius:8 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.65)", marginBottom:2 }}>💡 {tip}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", lineHeight:1.4 }}>{detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sent this session */}
        {Object.keys(sentLog).length > 0 && (
          <div style={{ background:"rgba(52,211,153,0.04)", border:"1px solid rgba(52,211,153,0.15)", borderRadius:16, padding:"14px 16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
              <Check size={13} color="#34D399"/>
              <span style={{ fontFamily:"Cinzel,serif", fontSize:12, fontWeight:600, color:"#34D399" }}>Is session mein bheje</span>
            </div>
            {Object.entries(sentLog).map(([key, iso]) => {
              const [festId, type] = key.split(/_(?=[^_]+$)/);
              const fest = FESTIVALS.find(f=>f.id===festId);
              if (!fest) return null;
              return (
                <div key={key} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize:14 }}>{fest.emoji}</span>
                  <span style={{ fontSize:11, color:"rgba(255,255,255,0.6)", flex:1 }}>{fest.name} — {type==="driver"?"Drivers":type==="passenger"?"Passengers":"Sabko"}</span>
                  <span style={{ fontSize:10, color:"rgba(52,211,153,0.7)" }}>✓ {new Date(iso).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Phone Mockup Preview ──────────────────────────────────────────────────────
const PhonePreview = ({ title, body }) => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
    {/* Phone frame */}
    <div style={{
      width:220, background:"#0d1117", borderRadius:28, padding:"16px 10px",
      border:"2px solid rgba(255,255,255,0.1)", position:"relative",
      boxShadow:"0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
    }}>
      {/* Status bar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0 8px", marginBottom:10 }}>
        <span style={{ fontSize:9, color:"rgba(255,255,255,0.6)", fontFamily:"monospace" }}>9:41</span>
        <div style={{ width:40, height:6, borderRadius:3, background:"rgba(255,255,255,0.15)" }}/>
        <div style={{ display:"flex", gap:3 }}>
          {[1,2,3].map(i=><div key={i} style={{ width:3, height:i*3, borderRadius:1, background:"rgba(255,255,255,0.5)" }}/>)}
        </div>
      </div>

      {/* Notification card */}
      <div style={{
        background:"rgba(30,35,48,0.95)", borderRadius:16,
        padding:"11px 13px", border:"1px solid rgba(255,255,255,0.08)",
        backdropFilter:"blur(10px)",
      }}>
        {/* App header */}
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:7 }}>
          <div style={{
            width:20, height:20, borderRadius:5,
            background:"linear-gradient(135deg,#f0d060,#D4AF37)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:10,
          }}>🚗</div>
          <span style={{ fontSize:9, color:"rgba(255,255,255,0.5)", fontWeight:600, letterSpacing:"0.5px" }}>GO MOBILITY</span>
          <span style={{ fontSize:9, color:"rgba(255,255,255,0.25)", marginLeft:"auto" }}>now</span>
        </div>

        {/* Notification content */}
        <div style={{ fontSize:11, fontWeight:700, color: title ? "#fff" : "rgba(255,255,255,0.2)", marginBottom:4, lineHeight:1.3 }}>
          {title || "Notification title appears here"}
        </div>
        <div style={{ fontSize:10, color: body ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.15)", lineHeight:1.4 }}>
          {body ? (body.length > 80 ? body.slice(0,80) + "…" : body) : "Your message body will appear here in this space…"}
        </div>
      </div>

      {/* Home indicator */}
      <div style={{ width:60, height:4, borderRadius:2, background:"rgba(255,255,255,0.2)", margin:"14px auto 0" }}/>
    </div>

    <div style={{ marginTop:10, fontSize:10, color:"rgba(255,255,255,0.2)", textAlign:"center", letterSpacing:"0.5px" }}>
      LIVE PREVIEW
    </div>
  </div>
);

// ── Tab 1 — Send Now ─────────────────────────────────────────────────────────
function SendNowTab({ showToast }) {
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [audience, setAudience] = useState("all_users");
  const [sending, setSending]   = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [history, setHistory]   = useState([]);

  useEffect(() => {
    getNotificationSchedule()
      .then(r => { const d = r.data?.data || r.data || null; setSchedule(d); })
      .catch(() => {});
    try { setHistory(JSON.parse(sessionStorage.getItem("notif_sent_log") || "[]")); } catch {}
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { showToast("Title and message are required.", "error"); return; }
    const label = AUDIENCES.find(a => a.value === audience)?.label || audience;
    if (!window.confirm(`Send "${title}" to "${label}"?`)) return;
    setSending(true);
    try {
      const res = await triggerEngagement({ title, body, target_audience: audience });
      const d   = res.data?.data;
      const pSent = d?.passengers?.sent || 0;
      const dSent = d?.drivers?.sent    || 0;
      const entry = { title, body, audience, sentAt: new Date().toISOString(), sent: pSent + dSent };
      const updated = [entry, ...history].slice(0, 10);
      setHistory(updated);
      try { sessionStorage.setItem("notif_sent_log", JSON.stringify(updated)); } catch {}
      showToast(`✅ Sent! ${pSent + dSent} devices notified.`);
      setTitle(""); setBody("");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send notification.", "error");
    } finally {
      setSending(false);
    }
  };

  const grouped = AUDIENCES.reduce((acc, a) => {
    (acc[a.group] = acc[a.group] || []).push(a);
    return acc;
  }, {});

  return (
    <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1.3fr) minmax(0,1fr)", gap:20, alignItems:"start" }}>

      {/* ── Left column ── */}
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

        {/* Quick Templates */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"13px 18px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", alignItems:"center", gap:8 }}>
            <Zap size={13} color="#D4AF37"/>
            <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#fff" }}>Quick Templates</span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>· click to fill</span>
          </div>
          <div style={{ padding:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {QUICK_TEMPLATES.map((t, i) => (
              <button key={i} onClick={() => { setTitle(t.title); setBody(t.body); setAudience(t.audience); }}
                style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:10, padding:"10px 12px", cursor:"pointer", textAlign:"left" }}
                onMouseEnter={e => { e.currentTarget.style.background="rgba(212,175,55,0.08)"; e.currentTarget.style.borderColor="rgba(212,175,55,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor="rgba(212,175,55,0.12)"; }}>
                <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.85)", marginBottom:3 }}>{t.title}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", lineHeight:1.4 }}>{t.body.slice(0,42)}…</div>
                <div style={{ marginTop:5, fontSize:10, color:"#D4AF37", opacity:0.7 }}>
                  {AUDIENCES.find(a=>a.value===t.audience)?.icon} {AUDIENCES.find(a=>a.value===t.audience)?.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Compose */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:16, padding:22 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:"rgba(212,175,55,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Bell size={15} color="#D4AF37"/>
            </div>
            <div style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:700, color:"#fff" }}>Compose Notification</div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Audience */}
            <div>
              <label style={LABEL_STYLE}>Target Audience *</label>
              {Object.entries(grouped).map(([grp, opts]) => (
                <div key={grp} style={{ marginBottom:8 }}>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:5 }}>{grp}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    {opts.map(a => (
                      <button key={a.value} onClick={() => setAudience(a.value)} style={{
                        padding:"8px 10px", borderRadius:9, cursor:"pointer", textAlign:"left",
                        border: `1px solid ${audience===a.value ? "#D4AF37" : "rgba(212,175,55,0.1)"}`,
                        background: audience===a.value ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.02)",
                      }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:1 }}>
                          <span style={{ fontSize:14 }}>{a.icon}</span>
                          <span style={{ fontSize:11, fontWeight:600, color: audience===a.value ? "#D4AF37" : "rgba(255,255,255,0.7)" }}>{a.label}</span>
                        </div>
                        <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", paddingLeft:20 }}>{a.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label style={LABEL_STYLE}>Title *</label>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Enter notification title…" style={inputStyle}
                onFocus={e=>e.target.style.borderColor="#D4AF37"}
                onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.15)"}/>
            </div>

            <div>
              <label style={LABEL_STYLE}>Message *</label>
              <textarea value={body} onChange={e=>setBody(e.target.value)} rows={3}
                placeholder="Type your message here…"
                style={{ ...inputStyle, height:"auto", padding:"10px 14px", resize:"vertical" }}
                onFocus={e=>e.target.style.borderColor="#D4AF37"}
                onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.15)"}/>
              <div style={{ textAlign:"right", marginTop:3 }}>
                <span style={{ fontSize:11, color: body.length>140?"#f59e0b":"rgba(255,255,255,0.3)" }}>{body.length}/160</span>
              </div>
            </div>

            <button onClick={handleSend} disabled={sending} style={{
              height:46, background:"linear-gradient(135deg,#f0d060,#D4AF37,#b8922a)",
              border:"none", borderRadius:11, color:"#0a1840", fontSize:13,
              fontFamily:"Cinzel,serif", fontWeight:700, cursor:"pointer",
              opacity:sending?0.7:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
              <Send size={13}/>
              {sending ? "Sending…" : "Send Now"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right column ── */}
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

        {/* Phone Preview — always visible */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:"20px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background: (title||body) ? "#34D399" : "rgba(255,255,255,0.2)" }}/>
            <span style={{ fontFamily:"Cinzel,serif", fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>
              {(title||body) ? "Live Preview" : "Notification Preview"}
            </span>
          </div>
          <div style={{ display:"flex", justifyContent:"center" }}>
            <PhonePreview title={title} body={body}/>
          </div>
        </div>

        {/* Schedule info */}
        {schedule && (
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
            <div style={{ padding:"13px 18px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", alignItems:"center", gap:8 }}>
              <Calendar size={13} color="rgba(212,175,55,0.7)"/>
              <span style={{ fontFamily:"Cinzel,serif", fontSize:12, fontWeight:600, color:"#fff" }}>Auto-send Schedule</span>
            </div>
            <div style={{ padding:12, display:"flex", flexDirection:"column", gap:6 }}>
              {Object.entries(schedule.notificationTimes||{}).map(([slot,time]) => {
                const icons = { morning:"🌅", afternoon:"☀️", evening:"🌆" };
                return (
                  <div key={slot} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 11px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:8 }}>
                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)", textTransform:"capitalize" }}>{icons[slot]||"🔔"} {slot}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:"#D4AF37", fontFamily:"monospace" }}>{time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tips */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(96,165,250,0.12)", borderRadius:16, padding:"14px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12 }}>
            <AlertCircle size={13} color="rgba(96,165,250,0.7)"/>
            <span style={{ fontFamily:"Cinzel,serif", fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>Tips</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[
              ["Keep title under 50 chars", "Longer titles get cut off on most phones."],
              ["Best time to send", "10 AM – 12 PM or 6 PM – 8 PM for highest open rates."],
              ["Be specific", "\"₹50 off today\" performs better than \"great offers\"."],
            ].map(([tip, detail]) => (
              <div key={tip} style={{ padding:"8px 10px", background:"rgba(96,165,250,0.04)", border:"1px solid rgba(96,165,250,0.08)", borderRadius:8 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.65)", marginBottom:2 }}>💡 {tip}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", lineHeight:1.4 }}>{detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sent This Session */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"13px 17px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <Clock size={12} color="rgba(212,175,55,0.6)"/>
              <span style={{ fontFamily:"Cinzel,serif", fontSize:12, fontWeight:600, color:"#fff" }}>Sent This Session</span>
            </div>
            {history.length > 0 && (
              <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"rgba(212,175,55,0.12)", color:"#D4AF37" }}>{history.length}</span>
            )}
          </div>
          {history.length === 0
            ? <div style={{ padding:"22px 20px", textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.2)" }}>No notifications sent this session</div>
            : history.map((h,i) => (
              <div key={i} style={{ padding:"11px 15px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginBottom:3 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{h.title}</div>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)", whiteSpace:"nowrap" }}>{fmtTime(h.sentAt)}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ fontSize:10, padding:"2px 7px", borderRadius:20, background:"rgba(212,175,55,0.1)", color:"rgba(212,175,55,0.8)", border:"1px solid rgba(212,175,55,0.2)" }}>
                    {AUDIENCES.find(a=>a.value===h.audience)?.icon} {AUDIENCES.find(a=>a.value===h.audience)?.label||h.audience}
                  </span>
                  {h.sent != null && <span style={{ fontSize:10, color:"rgba(52,211,153,0.7)" }}>✓ {h.sent} sent</span>}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ── Tab 2 — Automated Campaigns ───────────────────────────────────────────────
function AutomatedTab({ showToast }) {
  const [campaigns, setCampaigns]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toggling, setToggling]     = useState({});
  const [running, setRunning]       = useState({});
  const [editing, setEditing]       = useState(null);
  const [editTitle, setEditTitle]   = useState("");
  const [editBody, setEditBody]     = useState("");
  const [saving, setSaving]         = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getCampaigns()
      .then(r => setCampaigns(r.data?.data || []))
      .catch(() => showToast("Failed to load campaigns.", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (key, current) => {
    setToggling(p => ({ ...p, [key]: true }));
    try {
      await toggleCampaign(key, !current);
      setCampaigns(cs => cs.map(c => c.key===key ? { ...c, is_enabled:!current } : c));
      showToast(`Campaign ${!current ? "enabled" : "disabled"}.`);
    } catch {
      showToast("Failed to toggle campaign.", "error");
    } finally {
      setToggling(p => ({ ...p, [key]: false }));
    }
  };

  const handleRunNow = async (key) => {
    if (!window.confirm(`Run "${key}" campaign now?`)) return;
    setRunning(p => ({ ...p, [key]: true }));
    try {
      const r  = await runCampaignNow(key);
      const d  = r.data?.data;
      const s  = (d?.passengers?.sent||0) + (d?.drivers?.sent||0);
      showToast(`✅ Campaign sent! ${s} devices notified.`);
      load();
    } catch {
      showToast("Failed to run campaign.", "error");
    } finally {
      setRunning(p => ({ ...p, [key]: false }));
    }
  };

  const startEdit  = (c) => { setEditing(c.key); setEditTitle(c.title); setEditBody(c.body); };
  const cancelEdit = () => { setEditing(null); setEditTitle(""); setEditBody(""); };

  const handleSaveMessage = async () => {
    if (!editTitle.trim() || !editBody.trim()) { showToast("Title and body are required.", "error"); return; }
    setSaving(true);
    try {
      await updateCampaignMessage(editing, editTitle, editBody);
      setCampaigns(cs => cs.map(c => c.key===editing ? { ...c, title:editTitle, body:editBody } : c));
      showToast("Message updated.");
      cancelEdit();
    } catch {
      showToast("Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  };

  const daily  = campaigns.filter(c => c.schedule_type === 'daily');
  const weekly = campaigns.filter(c => c.schedule_type === 'weekly');

  const CampaignCard = ({ c }) => {
    const isEditing = editing === c.key;
    return (
      <div style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${c.is_enabled ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.06)"}`, borderRadius:14, padding:18, marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <div style={{ fontSize:13, fontWeight:600, color: c.is_enabled ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}>{c.name}</div>
              <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background: c.is_enabled ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.05)", color: c.is_enabled ? "#34D399" : "rgba(255,255,255,0.3)", border:`1px solid ${c.is_enabled ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.08)"}` }}>
                {c.is_enabled ? "Active" : "Paused"}
              </span>
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:8 }}>{c.description}</div>

            {isEditing ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:10 }}>
                <input value={editTitle} onChange={e=>setEditTitle(e.target.value)}
                  placeholder="Notification title…"
                  style={{ ...inputStyle, height:36, fontSize:12 }}
                  onFocus={e=>e.target.style.borderColor="#D4AF37"}
                  onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.15)"}/>
                <textarea value={editBody} onChange={e=>setEditBody(e.target.value)}
                  placeholder="Message body…" rows={2}
                  style={{ ...inputStyle, height:"auto", padding:"8px 12px", fontSize:12, resize:"vertical" }}
                  onFocus={e=>e.target.style.borderColor="#D4AF37"}
                  onBlur={e=>e.target.style.borderColor="rgba(212,175,55,0.15)"}/>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={handleSaveMessage} disabled={saving} style={{ flex:1, height:32, background:"rgba(212,175,55,0.15)", border:"1px solid rgba(212,175,55,0.35)", borderRadius:8, color:"#D4AF37", fontSize:12, fontFamily:"Cinzel,serif", cursor:"pointer" }}>
                    <Check size={11} style={{ marginRight:4 }}/>{saving ? "Saving…" : "Save"}
                  </button>
                  <button onClick={cancelEdit} style={{ flex:1, height:32, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:9, padding:"9px 12px", marginBottom:10 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.75)", marginBottom:3 }}>{c.title}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", lineHeight:1.4 }}>{c.body}</div>
              </div>
            )}

            <div style={{ display:"flex", alignItems:"center", gap:14, fontSize:10, color:"rgba(255,255,255,0.3)" }}>
              <span>⏱ {SCHEDULE_LABEL[c.schedule_type] || c.schedule_type}</span>
              {c.last_run_at ? (
                <>
                  <span>Last: {fmtRelative(c.last_run_at)}</span>
                  <span style={{ color:"#34D399" }}>✓ {c.last_run_sent} sent</span>
                  {c.last_run_failed > 0 && <span style={{ color:"#ef4444" }}>✗ {c.last_run_failed} failed</span>}
                </>
              ) : (
                <span>Never run</span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, flexShrink:0 }}>
            <button onClick={() => handleToggle(c.key, c.is_enabled)} disabled={!!toggling[c.key]}
              title={c.is_enabled ? "Disable" : "Enable"}
              style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}>
              {c.is_enabled
                ? <ToggleRight size={30} color="#34D399"/>
                : <ToggleLeft  size={30} color="rgba(255,255,255,0.25)"/>
              }
            </button>
            {!isEditing && (
              <button onClick={() => startEdit(c)} title="Edit message"
                style={{ width:30, height:30, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Edit2 size={13} color="rgba(255,255,255,0.5)"/>
              </button>
            )}
            <button onClick={() => handleRunNow(c.key)} disabled={!!running[c.key]} title="Run now"
              style={{ width:30, height:30, background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:7, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {running[c.key] ? <span style={{ fontSize:10 }}>…</span> : <Play size={12} color="#D4AF37"/>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {Array(6).fill(0).map((_,i) => (
        <div key={i} style={{ height:120, borderRadius:14, background:"rgba(255,255,255,0.03)", animation:"gmPulse 1.5s ease-in-out infinite" }}/>
      ))}
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>
          {campaigns.filter(c=>c.is_enabled).length} active · {campaigns.length} total — runs automatically, toggle ON/OFF
        </div>
        <button onClick={load} style={{ height:34, padding:"0 14px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"rgba(255,255,255,0.6)", fontSize:12, cursor:"pointer" }}>
          Refresh
        </button>
      </div>

      {daily.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, color:"rgba(212,175,55,0.5)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ height:1, flex:1, background:"rgba(212,175,55,0.1)" }}/>Daily Campaigns
            <div style={{ height:1, flex:1, background:"rgba(212,175,55,0.1)" }}/>
          </div>
          {daily.map(c => <CampaignCard key={c.key} c={c}/>)}
        </div>
      )}

      {weekly.length > 0 && (
        <div>
          <div style={{ fontSize:11, color:"rgba(212,175,55,0.5)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ height:1, flex:1, background:"rgba(212,175,55,0.1)" }}/>Weekly Campaigns
            <div style={{ height:1, flex:1, background:"rgba(212,175,55,0.1)" }}/>
          </div>
          {weekly.map(c => <CampaignCard key={c.key} c={c}/>)}
        </div>
      )}
    </div>
  );
}

// ── Tab 3 — History ───────────────────────────────────────────────────────────
function HistoryTab({ showToast }) {
  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [page, setPage]       = useState(0);
  const LIMIT = 20;

  const load = useCallback((f, p) => {
    setLoading(true);
    const params = { limit: LIMIT, offset: p * LIMIT };
    if (f !== "all") params.type = f;
    getNotificationHistory(params)
      .then(r => { setLogs(r.data?.data || []); setTotal(r.data?.total || 0); })
      .catch(() => showToast("Failed to load history.", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(filter, page); }, [filter, page, load]);

  const switchFilter = (f) => { setFilter(f); setPage(0); };

  const TYPE_COLORS = {
    manual:    { bg:"rgba(96,165,250,0.1)",  border:"rgba(96,165,250,0.25)",  color:"#60a5fa",  label:"Manual" },
    automated: { bg:"rgba(52,211,153,0.1)",  border:"rgba(52,211,153,0.25)",  color:"#34D399",  label:"Automated" },
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <div style={{ display:"flex", gap:6 }}>
          {[
            { key:"all",       label:"All" },
            { key:"manual",    label:"Manual" },
            { key:"automated", label:"Automated" },
          ].map(f => (
            <button key={f.key} onClick={()=>switchFilter(f.key)} style={{
              padding:"6px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
              background: filter===f.key ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${filter===f.key ? "rgba(212,175,55,0.35)" : "rgba(255,255,255,0.08)"}`,
              color: filter===f.key ? "#D4AF37" : "rgba(255,255,255,0.4)",
              fontFamily:"Cinzel,serif",
            }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>Total: {total}</div>
      </div>

      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {Array(8).fill(0).map((_,i) => (
            <div key={i} style={{ height:72, borderRadius:12, background:"rgba(255,255,255,0.03)", animation:"gmPulse 1.5s ease-in-out infinite" }}/>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div style={{ padding:"60px 20px", textAlign:"center" }}>
          <History size={36} color="rgba(255,255,255,0.1)" style={{ marginBottom:10, display:"block", margin:"0 auto 10px" }}/>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)" }}>No notification history found</div>
        </div>
      ) : (
        <>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {logs.map(log => {
              const tc = TYPE_COLORS[log.send_type] || TYPE_COLORS.manual;
              const successRate = log.total_targeted > 0
                ? Math.round((log.total_sent / log.total_targeted) * 100) : 0;
              return (
                <div key={log.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"13px 16px" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{log.title}</span>
                        <span style={{ fontSize:10, padding:"2px 7px", borderRadius:20, background:tc.bg, border:`1px solid ${tc.border}`, color:tc.color, flexShrink:0 }}>
                          {tc.label}
                        </span>
                        {log.campaign_key && (
                          <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"monospace" }}>{log.campaign_key}</span>
                        )}
                      </div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:6, lineHeight:1.4 }}>{log.body}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:12, fontSize:10 }}>
                        <span style={{ color:"rgba(212,175,55,0.7)" }}>
                          {AUDIENCES.find(a=>a.value===log.target_audience)?.icon || "📣"} {AUDIENCES.find(a=>a.value===log.target_audience)?.label || log.target_audience}
                        </span>
                        <span style={{ color:"rgba(255,255,255,0.3)" }}>→ {log.total_targeted} targeted</span>
                        <span style={{ color:"#34D399" }}>✓ {log.total_sent} sent</span>
                        {log.total_failed > 0 && <span style={{ color:"#ef4444" }}>✗ {log.total_failed} failed</span>}
                        <span style={{ color:"rgba(255,255,255,0.25)" }}>{successRate}% success</span>
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", whiteSpace:"nowrap", textAlign:"right" }}>
                      {fmtTime(log.sent_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {total > LIMIT && (
            <div style={{ display:"flex", justifyContent:"center", gap:10, marginTop:16 }}>
              <button onClick={()=>setPage(p=>p-1)} disabled={page===0} style={{ padding:"7px 16px", borderRadius:8, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer", opacity:page===0?0.4:1 }}>
                ← Prev
              </button>
              <span style={{ padding:"7px 14px", fontSize:12, color:"rgba(255,255,255,0.4)" }}>
                {page+1} / {Math.ceil(total/LIMIT)}
              </span>
              <button onClick={()=>setPage(p=>p+1)} disabled={(page+1)*LIMIT>=total} style={{ padding:"7px 16px", borderRadius:8, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer", opacity:(page+1)*LIMIT>=total?0.4:1 }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const TABS = [
    { label:"Send Now",  icon:<Send size={13}/> },
    { label:"Festival",  icon:<span style={{fontSize:13}}>🎊</span> },
    { label:"Automated", icon:<Zap  size={13}/> },
    { label:"History",   icon:<History size={13}/> },
  ];

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      {/* Page header */}
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Push Notifications</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>
          Targeted messages to users & drivers via FCM — manual or automated campaigns
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:22 }}>
        {[
          { label:"Audience Types",  value:AUDIENCES.length,       icon:"🎯", color:"#D4AF37", bg:"rgba(212,175,55,0.08)" },
          { label:"Auto Campaigns",  value:"10",                   icon:"⚡", color:"#60a5fa", bg:"rgba(96,165,250,0.08)" },
          { label:"Quick Templates", value:QUICK_TEMPLATES.length, icon:"📝", color:"#4ade80", bg:"rgba(52,211,153,0.08)" },
          { label:"Festivals",       value:FESTIVALS.length,       icon:"🎊", color:"#f472b6", bg:"rgba(244,114,182,0.08)" },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} style={{ background:bg, border:`1px solid ${color}22`, borderRadius:13, padding:"14px 18px", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:22 }}>{icon}</span>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color, fontFamily:"Cinzel,serif", lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:4, padding:4, background:"rgba(255,255,255,0.04)", borderRadius:13, marginBottom:22 }}>
        {TABS.map((tab, i) => (
          <button key={tab.label} onClick={() => setActiveTab(i)} style={{
            flex:1, padding:"10px 0", borderRadius:10, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:7,
            background: activeTab===i ? "rgba(212,175,55,0.14)" : "transparent",
            border: `1px solid ${activeTab===i ? "rgba(212,175,55,0.35)" : "transparent"}`,
            color: activeTab===i ? "#D4AF37" : "rgba(255,255,255,0.4)",
            fontFamily:"Cinzel,serif", fontSize:12, fontWeight:600, transition:"all .15s",
          }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 0 && <SendNowTab    showToast={showToast}/>}
      {activeTab === 1 && <FestivalTab   showToast={showToast}/>}
      {activeTab === 2 && <AutomatedTab  showToast={showToast}/>}
      {activeTab === 3 && <HistoryTab    showToast={showToast}/>}
    </div>
  );
}
