import { useState, useEffect } from "react";
import { Settings, Edit2, Save, X, RefreshCw, RotateCcw } from "lucide-react";
import { getPricingSettings, updatePricingSetting, reloadPricingCache } from "../../api/admin";

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:400 }}>
  <span style={{ flex:1 }}>{msg}</span>
  <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

const PREFIX_LABELS = {
  surge:    "Surge Pricing",
  peak:     "Peak Hours",
  base:     "Base Fare",
  per:      "Per Unit Rates",
  min:      "Minimum Fare",
  max:      "Maximum / Limits",
  cancel:   "Cancellation",
  wait:     "Waiting Charges",
  gst:      "GST / Tax",
  driver:   "Driver Settings",
  booking:  "Booking Config",
  other:    "Other Settings",
};

const getPrefix = (key) => {
  const part = (key || "").split("_")[0].toLowerCase();
  return PREFIX_LABELS[part] || "Other Settings";
};

const groupSettings = (list) => {
  const groups = {};
  list.forEach((s) => {
    const grp = getPrefix(s.key);
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(s);
  });
  return groups;
};

const TYPE_BADGE = {
  float:   { color:"#60a5fa", bg:"rgba(59,130,246,0.12)"  },
  integer: { color:"#a78bfa", bg:"rgba(167,139,250,0.12)" },
  boolean: { color:"#4ade80", bg:"rgba(34,197,94,0.12)"   },
  string:  { color:"#f59e0b", bg:"rgba(245,158,11,0.12)"  },
};

const typeBadge = (t) => TYPE_BADGE[t] || { color:"rgba(255,255,255,0.5)", bg:"rgba(255,255,255,0.06)" };

const inputStyle = { height:38, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:8, padding:"0 12px", color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", boxSizing:"border-box", minWidth:120 };

export default function AppConfigPage() {
  const [settings, setSettings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [editKey, setEditKey]       = useState(null);
  const [editVal, setEditVal]       = useState("");
  const [saving, setSaving]         = useState(false);
  const [reloading, setReloading]   = useState(false);
  const [toast, setToast]           = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const load = () => {
    setLoading(true);
    getPricingSettings()
      .then((res) => {
        const d = res.data?.data || res.data || [];
        setSettings(Array.isArray(d) ? d : []);
      })
      .catch(() => showToast("Failed to load pricing settings.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const startEdit = (s) => {
    setEditKey(s.key);
    setEditVal(String(s.value));
  };

  const cancelEdit = () => { setEditKey(null); setEditVal(""); };

  const handleSave = async (s) => {
    setSaving(true);
    try {
      await updatePricingSetting(s.key, editVal, s.value_type || "float");
      setSettings((prev) => prev.map((x) => x.key === s.key ? { ...x, value: editVal } : x));
      showToast(`"${s.key}" updated successfully.`);
      cancelEdit();
    } catch (err) {
      showToast(err.response?.data?.message || `Failed to update "${s.key}".`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReloadCache = async () => {
    setReloading(true);
    try {
      await reloadPricingCache();
      showToast("Pricing cache reloaded successfully.");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to reload cache.", "error");
    } finally {
      setReloading(false);
    }
  };

  const groups = groupSettings(settings);

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>App Configuration</h1>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Live pricing settings via /admin/pricing/settings</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={handleReloadCache} disabled={reloading} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 16px", background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.3)", borderRadius:10, color:"#a78bfa", fontSize:13, fontFamily:"Outfit,sans-serif", cursor:"pointer", opacity:reloading?0.6:1 }}>
            <RotateCcw size={13} style={{ animation:reloading?"spin 1s linear infinite":undefined }} />
            {reloading ? "Reloading…" : "Reload Cache"}
          </button>
          <button onClick={load} disabled={loading} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 16px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:10, color:"#D4AF37", fontSize:13, fontFamily:"Outfit,sans-serif", cursor:"pointer", opacity:loading?0.6:1 }}>
            <RefreshCw size={13} style={{ animation:loading?"spin 1s linear infinite":undefined }} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
          {Array(3).fill(0).map((_,i) => (
            <div key={i} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
              <div style={{ height:48, background:"rgba(212,175,55,0.05)", borderBottom:"1px solid rgba(212,175,55,0.08)" }} />
              {Array(3).fill(0).map((_,j) => (
                <div key={j} style={{ height:52, background:"rgba(255,255,255,0.02)", margin:"6px 16px", borderRadius:8, animation:"gmPulse 1.5s ease-in-out infinite" }} />
              ))}
            </div>
          ))}
        </div>
      ) : settings.length === 0 ? (
        <div style={{ textAlign:"center", padding:60 }}>
          <div style={{ fontSize:32, marginBottom:12 }}>⚙️</div>
          <div style={{ fontSize:14, color:"rgba(255,255,255,0.4)", fontWeight:600, marginBottom:6 }}>No settings returned from API</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>GET /admin/pricing/settings returned an empty list</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>

              {/* Group header */}
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 20px", background:"rgba(212,175,55,0.05)", borderBottom:"1px solid rgba(212,175,55,0.08)" }}>
                <Settings size={14} color="rgba(212,175,55,0.7)" />
                <span style={{ fontFamily:"Cinzel,serif", fontSize:14, fontWeight:600, color:"#fff" }}>{groupName}</span>
                <span style={{ marginLeft:"auto", fontSize:11, color:"rgba(255,255,255,0.3)" }}>{items.length} setting{items.length!==1?"s":""}</span>
              </div>

              {/* Settings table */}
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>
                      {["Key", "Value", "Type", "Description", "Action"].map((h) => (
                        <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", borderBottom:"1px solid rgba(212,175,55,0.08)", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((s) => {
                      const isEditing = editKey === s.key;
                      const tb = typeBadge(s.value_type);
                      return (
                        <tr key={s.key} onMouseEnter={(e)=>e.currentTarget.style.background="rgba(212,175,55,0.03)"} onMouseLeave={(e)=>e.currentTarget.style.background=""}>

                          {/* Key */}
                          <td style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                            <span style={{ fontFamily:"monospace", fontSize:12, color:"rgba(212,175,55,0.8)", background:"rgba(212,175,55,0.08)", padding:"3px 8px", borderRadius:6 }}>{s.key}</span>
                          </td>

                          {/* Value */}
                          <td style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                            {isEditing ? (
                              <input
                                type={s.value_type === "integer" || s.value_type === "float" ? "number" : "text"}
                                value={editVal}
                                onChange={(e) => setEditVal(e.target.value)}
                                step={s.value_type === "float" ? "0.01" : "1"}
                                style={{ ...inputStyle }}
                                autoFocus
                                onFocus={(e) => e.target.style.borderColor="#D4AF37"}
                                onBlur={(e) => e.target.style.borderColor="rgba(212,175,55,0.3)"}
                              />
                            ) : (
                              <span style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.88)" }}>{s.value}</span>
                            )}
                          </td>

                          {/* Type */}
                          <td style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                            <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:tb.bg, color:tb.color }}>{s.value_type || "—"}</span>
                          </td>

                          {/* Description */}
                          <td style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,0.03)", fontSize:12, color:"rgba(255,255,255,0.45)", maxWidth:300 }}>
                            {s.description || "—"}
                          </td>

                          {/* Action */}
                          <td style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,0.03)", whiteSpace:"nowrap" }}>
                            {isEditing ? (
                              <div style={{ display:"flex", gap:8 }}>
                                <button onClick={() => handleSave(s)} disabled={saving} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:8, color:"#4ade80", fontSize:12, cursor:"pointer", opacity:saving?0.5:1 }}>
                                  <Save size={12} />{saving?"Saving…":"Save"}
                                </button>
                                <button onClick={cancelEdit} disabled={saving} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer" }}>
                                  <X size={12} />Cancel
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => startEdit(s)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:8, color:"#D4AF37", fontSize:12, cursor:"pointer" }}>
                                <Edit2 size={12} />Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
