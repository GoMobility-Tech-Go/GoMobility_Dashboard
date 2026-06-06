import { useState, useEffect } from "react";
import { RefreshCw, Save, X } from "lucide-react";
import { getPricingVehicles, updateVehiclePricing, reloadPricingCache, getPricingGst, updatePricingGst } from "../../api/admin";

const VEHICLES = ["bike", "auto", "car"];
const VEHICLE_ICONS = { bike:"🛵", auto:"🛺", car:"🚗" };
const VEHICLE_FIELDS = [
  { key:"base_fare",            label:"Base Fare (₹)",          type:"number" },
  { key:"per_km_fare",          label:"Per KM Fare (₹)",        type:"number" },
  { key:"minimum_fare",         label:"Minimum Fare (₹)",       type:"number" },
  { key:"platform_fee",         label:"Platform Fee (%)",       type:"number" },
  { key:"waiting_rate_per_min", label:"Waiting Rate/min (₹)",   type:"number" },
];
const GST_FIELDS = [
  { key:"gst_percentage", label:"GST Percentage (%)",  type:"number", step:"0.1" },
  { key:"is_inclusive",   label:"GST Inclusive",       type:"checkbox" },
];
const TABS_TOP = ["Vehicles", "GST"];

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
  <span style={{ flex:1 }}>{msg}</span>
  <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

export default function PricingEnginePage() {
  const [mainTab, setMainTab] = useState("Vehicles");
  const [activeVehicle, setActiveVehicle] = useState("bike");
  const [data, setData]           = useState({});
  const [edits, setEdits]         = useState({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [caching, setCaching]     = useState(false);
  const [toast, setToast]         = useState(null);

  // GST state
  const [gst, setGst]             = useState({ gst_percentage: "", is_inclusive: false });
  const [gstEdits, setGstEdits]   = useState({ gst_percentage: "", is_inclusive: false });
  const [gstLoading, setGstLoading] = useState(false);
  const [gstSaving, setGstSaving] = useState(false);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  useEffect(() => {
    setLoading(true);
    getPricingVehicles()
      .then((res) => {
        const arr = res.data?.data || res.data || [];
        const map = {};
        (Array.isArray(arr) ? arr : Object.values(arr)).forEach((v) => {
          const key = v.vehicle_type || v.vehicleType || v.type;
          if (key) map[key] = v;
        });
        setData(map);
        setEdits(JSON.parse(JSON.stringify(map)));
      })
      .catch(() => showToast("Failed to load vehicle pricing.", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (mainTab !== "GST") return;
    setGstLoading(true);
    getPricingGst()
      .then((res) => {
        const d = res.data?.data || res.data || {};
        const val = { gst_percentage: d.gst_percentage ?? "", is_inclusive: d.is_inclusive ?? false };
        setGst(val);
        setGstEdits({ ...val });
      })
      .catch(() => showToast("Failed to load GST settings.", "error"))
      .finally(() => setGstLoading(false));
  }, [mainTab]);

  const handleVehicleChange = (field, val) => {
    setEdits((prev) => ({ ...prev, [activeVehicle]: { ...prev[activeVehicle], [field]: val } }));
  };

  const handleSaveVehicle = async () => {
    setSaving(true);
    const payload = {};
    VEHICLE_FIELDS.forEach(({ key }) => {
      if (edits[activeVehicle]?.[key] !== undefined) payload[key] = Number(edits[activeVehicle][key]);
    });
    try {
      await updateVehiclePricing(activeVehicle, payload);
      setData((prev) => ({ ...prev, [activeVehicle]: { ...prev[activeVehicle], ...payload } }));
      showToast(`${activeVehicle} pricing saved successfully.`);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save pricing.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCacheReload = async () => {
    setCaching(true);
    try { await reloadPricingCache(); showToast("Pricing cache reloaded successfully."); }
    catch { showToast("Cache reload failed.", "error"); }
    finally { setCaching(false); }
  };

  const handleSaveGst = async () => {
    setGstSaving(true);
    try {
      await updatePricingGst({ gst_percentage: Number(gstEdits.gst_percentage), is_inclusive: gstEdits.is_inclusive });
      setGst({ ...gstEdits });
      showToast("GST settings saved successfully.");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save GST.", "error");
    } finally {
      setGstSaving(false);
    }
  };

  const current = edits[activeVehicle] || {};

  const inputStyle = { width:"100%", height:44, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px", color:"#fff", fontSize:14, outline:"none", fontFamily:"Outfit,sans-serif", boxSizing:"border-box" };

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Pricing Engine</h1>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Manage fare structure and GST settings</p>
        </div>
        <button onClick={handleCacheReload} disabled={caching} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 18px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:10, color:"#D4AF37", fontSize:13, fontFamily:"Outfit,sans-serif", cursor:"pointer", fontWeight:600 }}>
          <RefreshCw size={14} style={{ animation:caching?"spin 1s linear infinite":undefined }} />
          Reload Cache
        </button>
      </div>

      {/* Main Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24 }}>
        {TABS_TOP.map((t) => (
          <button key={t} onClick={() => setMainTab(t)} style={{ padding:"9px 20px", borderRadius:10, border:"1px solid", fontSize:13, fontFamily:"Cinzel,serif", fontWeight:600, cursor:"pointer", transition:"all .2s", borderColor:mainTab===t?"#D4AF37":"rgba(212,175,55,0.2)", background:mainTab===t?"rgba(212,175,55,0.15)":"rgba(255,255,255,0.03)", color:mainTab===t?"#D4AF37":"rgba(255,255,255,0.5)" }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── VEHICLES TAB ── */}
      {mainTab === "Vehicles" && (
        <>
          <div style={{ display:"flex", gap:8, marginBottom:24 }}>
            {VEHICLES.map((v) => (
              <button key={v} onClick={() => setActiveVehicle(v)} style={{ padding:"10px 24px", borderRadius:12, border:"1px solid", fontSize:13, fontFamily:"Cinzel,serif", fontWeight:600, cursor:"pointer", transition:"all .2s", textTransform:"capitalize", borderColor:activeVehicle===v?"#D4AF37":"rgba(212,175,55,0.2)", background:activeVehicle===v?"rgba(212,175,55,0.15)":"rgba(255,255,255,0.03)", color:activeVehicle===v?"#D4AF37":"rgba(255,255,255,0.5)" }}>
                {VEHICLE_ICONS[v]} {v}
              </button>
            ))}
          </div>

          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:28, maxWidth:600 }}>
            {loading
              ? Array(5).fill(0).map((_,i)=>(
                  <div key={i} style={{ height:60, background:"rgba(255,255,255,0.04)", borderRadius:10, marginBottom:16, animation:"gmPulse 1.5s ease-in-out infinite" }}/>
                ))
              : (
                <>
                  <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:28 }}>
                    {VEHICLE_FIELDS.map(({ key, label, type }) => (
                      <div key={key}>
                        <label style={{ display:"block", fontSize:11, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>{label}</label>
                        <input type={type} value={current[key] ?? ""} onChange={(e) => handleVehicleChange(key, e.target.value)} style={inputStyle}
                          onFocus={(e)=>e.target.style.borderColor="#D4AF37"}
                          onBlur={(e)=>e.target.style.borderColor="rgba(212,175,55,0.15)"}
                        />
                      </div>
                    ))}
                  </div>
                  <button onClick={handleSaveVehicle} disabled={saving} style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 24px", background:"linear-gradient(135deg,#f0d060,#D4AF37,#b8922a)", border:"none", borderRadius:12, color:"#0a1840", fontSize:13, fontFamily:"Cinzel,serif", fontWeight:700, letterSpacing:"1px", cursor:"pointer", opacity:saving?0.7:1 }}>
                    <Save size={14} />
                    {saving ? "Saving…" : `Save ${activeVehicle.charAt(0).toUpperCase()+activeVehicle.slice(1)} Pricing`}
                  </button>
                </>
              )
            }
          </div>
        </>
      )}

      {/* ── GST TAB ── */}
      {mainTab === "GST" && (
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:28, maxWidth:480 }}>
          {gstLoading
            ? Array(2).fill(0).map((_,i) => <div key={i} style={{ height:60, background:"rgba(255,255,255,0.04)", borderRadius:10, marginBottom:16, animation:"gmPulse 1.5s ease-in-out infinite" }} />)
            : (
              <>
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontFamily:"Cinzel,serif", fontSize:14, color:"#fff", fontWeight:600, marginBottom:4 }}>GST Configuration</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>Applied to all ride fares on the platform</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:24 }}>
                  <div>
                    <label style={{ display:"block", fontSize:11, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>GST Percentage (%)</label>
                    <input type="number" step="0.1" min="0" max="100" value={gstEdits.gst_percentage} onChange={(e)=>setGstEdits(p=>({...p,gst_percentage:e.target.value}))} style={inputStyle}
                      onFocus={(e)=>e.target.style.borderColor="#D4AF37"}
                      onBlur={(e)=>e.target.style.borderColor="rgba(212,175,55,0.15)"}
                    />
                  </div>
                  <label style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer", padding:"14px 16px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:10 }}>
                    <input type="checkbox" checked={gstEdits.is_inclusive} onChange={(e)=>setGstEdits(p=>({...p,is_inclusive:e.target.checked}))} style={{ width:18, height:18, accentColor:"#D4AF37" }} />
                    <div>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,0.8)", fontWeight:500 }}>GST Inclusive</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>If enabled, GST is included in displayed fare</div>
                    </div>
                  </label>
                </div>
                <button onClick={handleSaveGst} disabled={gstSaving} style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 24px", background:"linear-gradient(135deg,#f0d060,#D4AF37,#b8922a)", border:"none", borderRadius:12, color:"#0a1840", fontSize:13, fontFamily:"Cinzel,serif", fontWeight:700, letterSpacing:"1px", cursor:"pointer", opacity:gstSaving?0.7:1 }}>
                  <Save size={14} />
                  {gstSaving ? "Saving…" : "Save GST Settings"}
                </button>
              </>
            )
          }
        </div>
      )}
    </div>
  );
}
