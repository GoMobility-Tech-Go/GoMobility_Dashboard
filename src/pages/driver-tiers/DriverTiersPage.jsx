import { useState, useEffect } from "react";
import { Save, X, RefreshCw } from "lucide-react";
import { getPricingSubscribers, updatePricingSubscriber } from "../../api/admin";

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:400 }}>
  <span style={{ flex:1 }}>{msg}</span>
  <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

const TIER_STYLE = {
  gold:   { color:"#D4AF37", bg:"rgba(212,175,55,0.12)", border:"rgba(212,175,55,0.3)",  icon:"🥇" },
  silver: { color:"#C0C0C0", bg:"rgba(192,192,192,0.12)",border:"rgba(192,192,192,0.3)", icon:"🥈" },
  bronze: { color:"#CD7F32", bg:"rgba(205,127,50,0.12)", border:"rgba(205,127,50,0.3)",  icon:"🥉" },
};

const inputStyle = { width:"100%", height:44, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px", color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", boxSizing:"border-box" };

export default function DriverTiersPage() {
  const [tiers, setTiers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits]     = useState({});
  const [saving, setSaving]   = useState({});
  const [toast, setToast]     = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const load = () => {
    setLoading(true);
    getPricingSubscribers()
      .then((res) => {
        const d = res.data?.data || res.data || [];
        const arr = Array.isArray(d) ? d : d.tiers || d.subscribers || d.items || [];
        setTiers(arr);
        // Build edits map keyed by tier name
        const m = {};
        arr.forEach((t) => { m[t.name || t.tier_name || t.tier] = { ...t }; });
        setEdits(m);
      })
      .catch(() => showToast("Failed to load tier configuration.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleFieldChange = (tierName, field, val) => {
    setEdits((prev) => ({ ...prev, [tierName]: { ...prev[tierName], [field]: val } }));
  };

  const handleSave = async (tierName) => {
    setSaving((p) => ({ ...p, [tierName]: true }));
    const payload = { ...edits[tierName] };
    try {
      await updatePricingSubscriber(tierName, payload);
      showToast(`${tierName} tier saved.`);
    } catch (err) {
      showToast(err.response?.data?.message || `Failed to save ${tierName} tier.`, "error");
    } finally {
      setSaving((p) => ({ ...p, [tierName]: false }));
    }
  };

  // Collect all unique fields across all tiers (excluding name/id fields)
  const SKIP_KEYS = new Set(["id","name","tier","tier_name","created_at","updated_at"]);
  const allFields = tiers.length > 0
    ? Object.keys(tiers[0]).filter((k) => !SKIP_KEYS.has(k))
    : [];

  const getTierStyle = (name) => {
    const k = (name || "").toLowerCase();
    return TIER_STYLE[k] || { color:"#D4AF37", bg:"rgba(212,175,55,0.12)", border:"rgba(212,175,55,0.3)", icon:"⭐" };
  };

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Driver Tiers</h1>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Configure subscription tier rules via /admin/pricing/subscribers</p>
        </div>
        <button onClick={load} disabled={loading} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 16px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:10, color:"#D4AF37", fontSize:13, fontFamily:"Outfit,sans-serif", cursor:"pointer" }}>
          <RefreshCw size={13} style={{ animation:loading?"spin 1s linear infinite":undefined }} />
          Refresh
        </button>
      </div>

      {loading
        ? <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:20 }}>
            {Array(3).fill(0).map((_,i) => <div key={i} style={{ height:260, borderRadius:16, background:"rgba(255,255,255,0.04)", animation:"gmPulse 1.5s ease-in-out infinite" }} />)}
          </div>
        : tiers.length === 0
          ? (
            <div style={{ textAlign:"center", padding:60 }}>
              <div style={{ fontSize:32, marginBottom:12 }}>⭐</div>
              <div style={{ fontSize:14, color:"rgba(255,255,255,0.4)", fontWeight:600, marginBottom:6 }}>No tier data returned from API</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>GET /admin/pricing/subscribers returned an empty list</div>
            </div>
          )
          : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:20 }}>
              {tiers.map((tier) => {
                const name = tier.name || tier.tier_name || tier.tier || "Tier";
                const ts = getTierStyle(name);
                const editData = edits[name] || tier;
                return (
                  <div key={name} style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${ts.border}`, borderRadius:16, padding:24, position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${ts.color},transparent)` }} />

                    {/* Tier Header */}
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                      <span style={{ fontSize:28 }}>{ts.icon}</span>
                      <div>
                        <div style={{ fontFamily:"Cinzel,serif", fontSize:16, fontWeight:800, color:ts.color }}>{name}</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:1 }}>Tier configuration</div>
                      </div>
                    </div>

                    {/* Fields */}
                    <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
                      {allFields.map((field) => {
                        const val = editData[field];
                        const isNum = typeof tier[field] === "number";
                        const isBool = typeof tier[field] === "boolean";
                        return (
                          <div key={field}>
                            <label style={{ display:"block", fontSize:10, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.6)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:5 }}>
                              {field.replace(/_/g," ")}
                            </label>
                            {isBool ? (
                              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:"rgba(255,255,255,0.7)" }}>
                                <input type="checkbox" checked={!!val} onChange={(e)=>handleFieldChange(name, field, e.target.checked)} style={{ width:16, height:16, accentColor:ts.color }} />
                                {val ? "Enabled" : "Disabled"}
                              </label>
                            ) : (
                              <input type={isNum ? "number" : "text"} value={val ?? ""} onChange={(e)=>handleFieldChange(name, field, isNum ? Number(e.target.value) : e.target.value)}
                                style={inputStyle}
                                onFocus={(e)=>e.target.style.borderColor=ts.color}
                                onBlur={(e)=>e.target.style.borderColor="rgba(212,175,55,0.15)"}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <button onClick={() => handleSave(name)} disabled={saving[name]} style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 18px", background:`${ts.color}20`, border:`1px solid ${ts.color}40`, borderRadius:10, color:ts.color, fontSize:12, fontFamily:"Outfit,sans-serif", fontWeight:600, cursor:"pointer", opacity:saving[name]?0.5:1 }}>
                      <Save size={13} />
                      {saving[name] ? "Saving…" : `Save ${name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )
      }
    </div>
  );
}
