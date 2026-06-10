import { useState, useEffect } from "react";
import { RefreshCw, Save, X, Plus, Trash2 } from "lucide-react";
import {
  getPricingVehicles, updateVehiclePricing, reloadPricingCache,
  getPricingGst, updatePricingGst,
  getPricingTiers, updatePricingTier,
  getPricingPenalties, upsertPricingPenalty, deletePricingPenalty,
  getPricingSettings, updatePricingSetting,
} from "../../api/admin";

const VEHICLES = ["bike", "auto", "car", "xl", "premium", "luxury"];
const VEHICLE_ICONS = { bike:"🛵", auto:"🛺", car:"🚗", xl:"🚙", premium:"🚘", luxury:"🏎️" };
const VEHICLE_FIELDS = [
  { key:"base_fare",            label:"Base Fare (₹)",          type:"number" },
  { key:"per_km_fare",          label:"Per KM Fare (₹)",        type:"number" },
  { key:"minimum_fare",         label:"Minimum Fare (₹)",       type:"number" },
  { key:"platform_fee",         label:"Platform Fee (%)",       type:"number" },
  { key:"waiting_rate_per_min", label:"Waiting Rate/min (₹)",   type:"number" },
];
const TABS_TOP = ["Vehicles", "GST", "Distance Tiers", "Penalties", "Settings"];

const inputStyle = { width:"100%", height:44, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px", color:"#fff", fontSize:14, outline:"none", fontFamily:"Outfit,sans-serif", boxSizing:"border-box" };
const cardStyle = { background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:28 };
const labelStyle = { display:"block", fontSize:11, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 };
const saveBtn = (disabled) => ({ display:"flex", alignItems:"center", gap:8, padding:"12px 24px", background:"linear-gradient(135deg,#f0d060,#D4AF37,#b8922a)", border:"none", borderRadius:12, color:"#0a1840", fontSize:13, fontFamily:"Cinzel,serif", fontWeight:700, letterSpacing:"1px", cursor:"pointer", opacity:disabled?0.7:1 });

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
    <span style={{ flex:1 }}>{msg}</span>
    <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

const Skeleton = ({ rows = 3 }) => (
  <>{Array(rows).fill(0).map((_,i) => (
    <div key={i} style={{ height:56, background:"rgba(255,255,255,0.04)", borderRadius:10, marginBottom:12, animation:"gmPulse 1.5s ease-in-out infinite" }} />
  ))}</>
);

export default function PricingEnginePage() {
  const [mainTab, setMainTab] = useState("Vehicles");
  const [activeVehicle, setActiveVehicle] = useState("bike");
  const [data, setData]         = useState({});
  const [edits, setEdits]       = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [caching, setCaching]   = useState(false);
  const [toast, setToast]       = useState(null);

  // GST
  const [gst, setGst]               = useState({ gst_percentage:"", is_inclusive:false });
  const [gstEdits, setGstEdits]     = useState({ gst_percentage:"", is_inclusive:false });
  const [gstLoading, setGstLoading] = useState(false);
  const [gstSaving, setGstSaving]   = useState(false);

  // Tiers
  const [tiers, setTiers]               = useState([]);
  const [tierEdits, setTierEdits]       = useState({});
  const [tiersLoading, setTiersLoading] = useState(false);
  const [tierSaving, setTierSaving]     = useState(null);

  // Settings
  const [settings, setSettings]             = useState([]);
  const [settingEdits, setSettingEdits]     = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingSaving, setSettingSaving]   = useState(null);

  // Penalties
  const [penalties, setPenalties]           = useState([]);
  const [penLoading, setPenLoading]         = useState(false);
  const [penSaving, setPenSaving]           = useState(null);
  const [penDeleting, setPenDeleting]       = useState(null);
  const [newPen, setNewPen]                 = useState({ offense_type:"cancellation", offense_count:1, penalty_type:"fine", penalty_amount:0 });
  const [showAddPen, setShowAddPen]         = useState(false);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  // Load vehicles
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

  // Load GST
  useEffect(() => {
    if (mainTab !== "GST") return;
    setGstLoading(true);
    getPricingGst()
      .then((res) => {
        const d = res.data?.data || res.data || {};
        const val = { gst_percentage: d.gst_percentage ?? "", is_inclusive: d.is_inclusive ?? false };
        setGst(val); setGstEdits({ ...val });
      })
      .catch(() => showToast("Failed to load GST settings.", "error"))
      .finally(() => setGstLoading(false));
  }, [mainTab]);

  // Load Tiers
  useEffect(() => {
    if (mainTab !== "Distance Tiers") return;
    setTiersLoading(true);
    getPricingTiers()
      .then((res) => {
        const arr = res.data?.data || res.data || [];
        setTiers(arr);
        const map = {};
        arr.forEach(t => { map[t.tier_name] = { ...t }; });
        setTierEdits(map);
      })
      .catch(() => showToast("Failed to load pricing tiers.", "error"))
      .finally(() => setTiersLoading(false));
  }, [mainTab]);

  // Load Settings
  useEffect(() => {
    if (mainTab !== "Settings") return;
    setSettingsLoading(true);
    getPricingSettings()
      .then((res) => {
        const arr = res.data?.data || res.data || [];
        const list = Array.isArray(arr) ? arr : Object.entries(arr).map(([key, val]) => ({ key, value: val }));
        setSettings(list);
        const map = {};
        list.forEach(s => { map[s.key] = s.value; });
        setSettingEdits(map);
      })
      .catch(() => showToast("Failed to load pricing settings.", "error"))
      .finally(() => setSettingsLoading(false));
  }, [mainTab]);

  // Load Penalties
  useEffect(() => {
    if (mainTab !== "Penalties") return;
    setPenLoading(true);
    getPricingPenalties()
      .then((res) => {
        const arr = res.data?.data || res.data || [];
        setPenalties(Array.isArray(arr) ? arr : []);
      })
      .catch(() => showToast("Failed to load penalty config.", "error"))
      .finally(() => setPenLoading(false));
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
      showToast(`${activeVehicle} pricing saved.`);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save pricing.", "error");
    } finally { setSaving(false); }
  };

  const handleCacheReload = async () => {
    setCaching(true);
    try { await reloadPricingCache(); showToast("Pricing cache reloaded."); }
    catch { showToast("Cache reload failed.", "error"); }
    finally { setCaching(false); }
  };

  const handleSaveGst = async () => {
    setGstSaving(true);
    try {
      await updatePricingGst({ gst_percentage: Number(gstEdits.gst_percentage), is_inclusive: gstEdits.is_inclusive });
      setGst({ ...gstEdits });
      showToast("GST settings saved.");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save GST.", "error");
    } finally { setGstSaving(false); }
  };

  const handleSaveTier = async (tierName) => {
    setTierSaving(tierName);
    const t = tierEdits[tierName] || {};
    const payload = {
      per_km_multiplier: parseFloat(t.per_km_multiplier) || 1,
      min_km: parseFloat(t.min_km) || 0,
    };
    if (t.max_km !== null && t.max_km !== undefined && t.max_km !== "") payload.max_km = parseFloat(t.max_km);
    try {
      await updatePricingTier(tierName, payload);
      setTiers(prev => prev.map(x => x.tier_name === tierName ? { ...x, ...payload } : x));
      showToast(`Tier "${tierName}" saved.`);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save tier.", "error");
    } finally { setTierSaving(null); }
  };

  const handleSavePenalty = async (p) => {
    const key = `${p.offense_type}_${p.offense_count}`;
    setPenSaving(key);
    try {
      await upsertPricingPenalty(p.offense_type, p.offense_count, {
        penalty_type: p.penalty_type,
        penalty_amount: Number(p.penalty_amount),
      });
      showToast("Penalty saved.");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save penalty.", "error");
    } finally { setPenSaving(null); }
  };

  const handleDeletePenalty = async (offenseType, offenseCount) => {
    const key = `${offenseType}_${offenseCount}`;
    setPenDeleting(key);
    try {
      await deletePricingPenalty(offenseType, offenseCount);
      setPenalties(prev => prev.filter(p => !(p.offense_type===offenseType && p.offense_count===offenseCount)));
      showToast("Penalty deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete penalty.", "error");
    } finally { setPenDeleting(null); }
  };

  const handleAddPenalty = async () => {
    const key = `${newPen.offense_type}_${newPen.offense_count}`;
    setPenSaving(key);
    try {
      await upsertPricingPenalty(newPen.offense_type, newPen.offense_count, {
        penalty_type: newPen.penalty_type,
        penalty_amount: Number(newPen.penalty_amount),
      });
      setPenalties(prev => {
        const exists = prev.find(p => p.offense_type===newPen.offense_type && p.offense_count===newPen.offense_count);
        if (exists) return prev.map(p => p.offense_type===newPen.offense_type && p.offense_count===newPen.offense_count ? { ...p, ...newPen } : p);
        return [...prev, { ...newPen }];
      });
      setShowAddPen(false);
      setNewPen({ offense_type:"cancellation", offense_count:1, penalty_type:"fine", penalty_amount:0 });
      showToast("Penalty rule added.");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to add penalty.", "error");
    } finally { setPenSaving(null); }
  };

  const handleSaveSetting = async (key, value_type = "float") => {
    setSettingSaving(key);
    const val = settingEdits[key];
    try {
      await updatePricingSetting(key, val, value_type);
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: val } : s));
      showToast(`Setting "${key}" saved.`);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save setting.", "error");
    } finally { setSettingSaving(null); }
  };

  const current = edits[activeVehicle] || {};

  const TIER_LABELS = { short:"Short (0–10 km)", standard:"Standard (10–20 km)", long:"Long (20+ km)" };

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`
        @keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .gm-inp:focus{border-color:#D4AF37 !important;}
        select.gm-inp option{background:#0a1840;}
      `}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Pricing Engine</h1>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Manage fare structure, GST, distance tiers and penalties</p>
        </div>
        <button onClick={handleCacheReload} disabled={caching} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 18px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:10, color:"#D4AF37", fontSize:13, fontFamily:"Outfit,sans-serif", cursor:"pointer", fontWeight:600 }}>
          <RefreshCw size={14} style={{ animation:caching?"spin 1s linear infinite":undefined }} />
          Reload Cache
        </button>
      </div>

      {/* Main Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {TABS_TOP.map((t) => (
          <button key={t} onClick={() => setMainTab(t)} style={{ padding:"9px 20px", borderRadius:10, border:"1px solid", fontSize:13, fontFamily:"Cinzel,serif", fontWeight:600, cursor:"pointer", transition:"all .2s", borderColor:mainTab===t?"#D4AF37":"rgba(212,175,55,0.2)", background:mainTab===t?"rgba(212,175,55,0.15)":"rgba(255,255,255,0.03)", color:mainTab===t?"#D4AF37":"rgba(255,255,255,0.5)" }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── VEHICLES TAB ── */}
      {mainTab === "Vehicles" && (
        <>
          <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
            {VEHICLES.map((v) => (
              <button key={v} onClick={() => setActiveVehicle(v)} style={{ padding:"10px 20px", borderRadius:12, border:"1px solid", fontSize:13, fontFamily:"Cinzel,serif", fontWeight:600, cursor:"pointer", transition:"all .2s", textTransform:"capitalize", borderColor:activeVehicle===v?"#D4AF37":"rgba(212,175,55,0.2)", background:activeVehicle===v?"rgba(212,175,55,0.15)":"rgba(255,255,255,0.03)", color:activeVehicle===v?"#D4AF37":"rgba(255,255,255,0.5)" }}>
                {VEHICLE_ICONS[v]} {v}
              </button>
            ))}
          </div>
          <div style={{ ...cardStyle, maxWidth:600 }}>
            {loading ? <Skeleton rows={5} /> : (
              <>
                <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:28 }}>
                  {VEHICLE_FIELDS.map(({ key, label, type }) => (
                    <div key={key}>
                      <label style={labelStyle}>{label}</label>
                      <input className="gm-inp" type={type} value={current[key] ?? ""} onChange={(e) => handleVehicleChange(key, e.target.value)} style={inputStyle} />
                    </div>
                  ))}
                </div>
                <button onClick={handleSaveVehicle} disabled={saving} style={saveBtn(saving)}>
                  <Save size={14} />
                  {saving ? "Saving…" : `Save ${activeVehicle.charAt(0).toUpperCase()+activeVehicle.slice(1)} Pricing`}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* ── GST TAB ── */}
      {mainTab === "GST" && (
        <div style={{ ...cardStyle, maxWidth:480 }}>
          {gstLoading ? <Skeleton rows={2} /> : (
            <>
              <div style={{ marginBottom:24 }}>
                <div style={{ fontFamily:"Cinzel,serif", fontSize:14, color:"#fff", fontWeight:600, marginBottom:4 }}>GST Configuration</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>Applied to all ride fares on the platform</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:24 }}>
                <div>
                  <label style={labelStyle}>GST Percentage (%)</label>
                  <input className="gm-inp" type="number" step="0.1" min="0" max="100" value={gstEdits.gst_percentage} onChange={(e)=>setGstEdits(p=>({...p,gst_percentage:e.target.value}))} style={inputStyle} />
                </div>
                <label style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer", padding:"14px 16px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:10 }}>
                  <input type="checkbox" checked={gstEdits.is_inclusive} onChange={(e)=>setGstEdits(p=>({...p,is_inclusive:e.target.checked}))} style={{ width:18, height:18, accentColor:"#D4AF37" }} />
                  <div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,0.8)", fontWeight:500 }}>GST Inclusive</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>If enabled, GST is included in displayed fare</div>
                  </div>
                </label>
              </div>
              <button onClick={handleSaveGst} disabled={gstSaving} style={saveBtn(gstSaving)}>
                <Save size={14} />
                {gstSaving ? "Saving…" : "Save GST Settings"}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── DISTANCE TIERS TAB ── */}
      {mainTab === "Distance Tiers" && (
        <div style={{ maxWidth:700 }}>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:20 }}>
            Distance-based fare multipliers. Per KM charge = base per_km_fare × multiplier for the tier the ride falls into.
          </p>
          {tiersLoading ? (
            <div style={cardStyle}><Skeleton rows={3} /></div>
          ) : tiers.length === 0 ? (
            <div style={{ ...cardStyle, textAlign:"center", color:"rgba(255,255,255,0.35)", fontSize:13, padding:48 }}>No distance tiers configured yet.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {tiers.map((tier) => {
                const te = tierEdits[tier.tier_name] || tier;
                const isSaving = tierSaving === tier.tier_name;
                return (
                  <div key={tier.tier_name} style={cardStyle}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                      <div>
                        <div style={{ fontFamily:"Cinzel,serif", fontSize:15, color:"#D4AF37", fontWeight:700, textTransform:"capitalize" }}>{TIER_LABELS[tier.tier_name] || tier.tier_name}</div>
                        <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:3 }}>tier_name: <code style={{ color:"rgba(212,175,55,0.6)" }}>{tier.tier_name}</code></div>
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:20 }}>
                      <div>
                        <label style={labelStyle}>Min KM</label>
                        <input className="gm-inp" type="number" step="0.1" min="0" value={te.min_km ?? ""} onChange={(e)=>setTierEdits(prev=>({...prev,[tier.tier_name]:{...prev[tier.tier_name],min_km:e.target.value}}))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Max KM</label>
                        <input className="gm-inp" type="number" step="0.1" placeholder="∞ (no limit)" value={te.max_km ?? ""} onChange={(e)=>setTierEdits(prev=>({...prev,[tier.tier_name]:{...prev[tier.tier_name],max_km:e.target.value}}))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Per KM Multiplier</label>
                        <input className="gm-inp" type="number" step="0.01" min="0" value={te.per_km_multiplier ?? ""} onChange={(e)=>setTierEdits(prev=>({...prev,[tier.tier_name]:{...prev[tier.tier_name],per_km_multiplier:e.target.value}}))} style={inputStyle} />
                      </div>
                    </div>
                    <button onClick={()=>handleSaveTier(tier.tier_name)} disabled={isSaving} style={saveBtn(isSaving)}>
                      <Save size={13} />
                      {isSaving ? "Saving…" : "Save Tier"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PENALTIES TAB ── */}
      {mainTab === "Penalties" && (
        <div style={{ maxWidth:800 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", margin:0 }}>
              Penalty rules applied to drivers based on offense type and repeat count.
            </p>
            <button onClick={()=>setShowAddPen(true)} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 18px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:10, color:"#D4AF37", fontSize:13, fontFamily:"Outfit,sans-serif", cursor:"pointer", fontWeight:600 }}>
              <Plus size={14} /> Add Penalty
            </button>
          </div>

          {/* Add Penalty Form */}
          {showAddPen && (
            <div style={{ ...cardStyle, marginBottom:20, border:"1px solid rgba(212,175,55,0.35)" }}>
              <div style={{ fontFamily:"Cinzel,serif", fontSize:14, color:"#D4AF37", fontWeight:600, marginBottom:16 }}>New Penalty Rule</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginBottom:16 }}>
                <div>
                  <label style={labelStyle}>Offense Type</label>
                  <select className="gm-inp" value={newPen.offense_type} onChange={(e)=>setNewPen(p=>({...p,offense_type:e.target.value}))} style={{ ...inputStyle, appearance:"none" }}>
                    <option value="cancellation">Cancellation</option>
                    <option value="no_show">No Show</option>
                    <option value="low_rating">Low Rating</option>
                    <option value="complaint">Complaint</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Offense Count</label>
                  <input className="gm-inp" type="number" min="1" value={newPen.offense_count} onChange={(e)=>setNewPen(p=>({...p,offense_count:parseInt(e.target.value)||1}))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Penalty Type</label>
                  <select className="gm-inp" value={newPen.penalty_type} onChange={(e)=>setNewPen(p=>({...p,penalty_type:e.target.value}))} style={{ ...inputStyle, appearance:"none" }}>
                    <option value="warning">Warning</option>
                    <option value="fine">Fine</option>
                    <option value="suspend">Suspend</option>
                    <option value="ban">Ban</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Amount (₹)</label>
                  <input className="gm-inp" type="number" min="0" value={newPen.penalty_amount} onChange={(e)=>setNewPen(p=>({...p,penalty_amount:e.target.value}))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={handleAddPenalty} disabled={!!penSaving} style={saveBtn(!!penSaving)}>
                  <Plus size={13} /> {penSaving ? "Adding…" : "Add Rule"}
                </button>
                <button onClick={()=>setShowAddPen(false)} style={{ padding:"12px 20px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, color:"rgba(255,255,255,0.6)", fontSize:13, fontFamily:"Outfit,sans-serif", cursor:"pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {penLoading ? (
            <div style={cardStyle}><Skeleton rows={4} /></div>
          ) : penalties.length === 0 ? (
            <div style={{ ...cardStyle, textAlign:"center", color:"rgba(255,255,255,0.35)", fontSize:13, padding:48 }}>No penalty rules configured. Click "Add Penalty" to create one.</div>
          ) : (
            <div style={{ ...cardStyle, padding:0, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, fontFamily:"Outfit,sans-serif" }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid rgba(212,175,55,0.15)" }}>
                    {["Offense Type","Count","Penalty Type","Amount (₹)","Actions"].map(h => (
                      <th key={h} style={{ padding:"14px 16px", textAlign:"left", fontSize:11, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {penalties.map((p, idx) => {
                    const key = `${p.offense_type}_${p.offense_count}`;
                    const isSav = penSaving === key;
                    const isDel = penDeleting === key;
                    return (
                      <PenaltyRow key={key} p={p} idx={idx} isSav={isSav} isDel={isDel}
                        onSave={handleSavePenalty} onDelete={handleDeletePenalty}
                        setPenalties={setPenalties}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {mainTab === "Settings" && (
        <div style={{ maxWidth:700 }}>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:20 }}>
            Global pricing configuration key-value settings. Change value and click Save to update live config.
          </p>
          {settingsLoading ? (
            <div style={cardStyle}><Skeleton rows={5} /></div>
          ) : settings.length === 0 ? (
            <div style={{ ...cardStyle, textAlign:"center", color:"rgba(255,255,255,0.35)", fontSize:13, padding:48 }}>No pricing settings found.</div>
          ) : (
            <div style={{ ...cardStyle, padding:0, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid rgba(212,175,55,0.15)" }}>
                    {["Key","Value","Type","Action"].map(h => (
                      <th key={h} style={{ padding:"14px 16px", textAlign:"left", fontSize:11, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {settings.map((s, idx) => {
                    const isSav = settingSaving === s.key;
                    const valType = s.value_type || (s.value === "true" || s.value === "false" ? "boolean" : "float");
                    return (
                      <tr key={s.key} style={{ background:idx%2===0?"rgba(255,255,255,0.01)":"transparent" }}>
                        <td style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)", fontFamily:"monospace", color:"rgba(212,175,55,0.8)", fontSize:12, whiteSpace:"nowrap" }}>{s.key}</td>
                        <td style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)", minWidth:160 }}>
                          {valType === "boolean" ? (
                            <select value={settingEdits[s.key] ?? s.value} onChange={e=>setSettingEdits(p=>({...p,[s.key]:e.target.value}))} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:8, padding:"6px 10px", color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif" }}>
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </select>
                          ) : (
                            <input type="number" step="any" value={settingEdits[s.key] ?? s.value} onChange={e=>setSettingEdits(p=>({...p,[s.key]:e.target.value}))} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:8, padding:"6px 10px", color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", width:120 }} />
                          )}
                        </td>
                        <td style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:12, color:"rgba(255,255,255,0.35)" }}>{valType}</td>
                        <td style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                          <button onClick={()=>handleSaveSetting(s.key, valType)} disabled={isSav} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 14px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.25)", borderRadius:8, color:"#D4AF37", fontSize:12, fontFamily:"Outfit,sans-serif", cursor:"pointer", fontWeight:600, opacity:isSav?0.5:1 }}>
                            <Save size={12}/>{isSav?"Saving…":"Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PenaltyRow({ p, idx, isSav, isDel, onSave, onDelete, setPenalties }) {
  const [editing, setEditing] = useState({ ...p });

  const cellStyle = { padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.8)", verticalAlign:"middle" };
  const miniInput = { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:8, padding:"6px 10px", color:"#fff", fontSize:13, outline:"none", width:"100%", fontFamily:"Outfit,sans-serif", boxSizing:"border-box" };
  const miniSelect = { ...miniInput, appearance:"none", cursor:"pointer" };

  const rowBg = idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent";

  return (
    <tr style={{ background:rowBg }}>
      <td style={cellStyle}>
        <select style={miniSelect} value={editing.offense_type} onChange={e=>setEditing(x=>({...x,offense_type:e.target.value}))}>
          <option value="cancellation">Cancellation</option>
          <option value="no_show">No Show</option>
          <option value="low_rating">Low Rating</option>
          <option value="complaint">Complaint</option>
        </select>
      </td>
      <td style={cellStyle}>
        <input type="number" min="1" style={{ ...miniInput, width:60 }} value={editing.offense_count} onChange={e=>setEditing(x=>({...x,offense_count:parseInt(e.target.value)||1}))} />
      </td>
      <td style={cellStyle}>
        <select style={miniSelect} value={editing.penalty_type} onChange={e=>setEditing(x=>({...x,penalty_type:e.target.value}))}>
          <option value="warning">Warning</option>
          <option value="fine">Fine</option>
          <option value="suspend">Suspend</option>
          <option value="ban">Ban</option>
        </select>
      </td>
      <td style={cellStyle}>
        <input type="number" min="0" style={{ ...miniInput, width:80 }} value={editing.penalty_amount} onChange={e=>setEditing(x=>({...x,penalty_amount:e.target.value}))} />
      </td>
      <td style={cellStyle}>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>onSave(editing)} disabled={isSav||isDel} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 14px", background:"rgba(212,175,55,0.12)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:8, color:"#D4AF37", fontSize:12, fontFamily:"Outfit,sans-serif", cursor:"pointer", fontWeight:600, opacity:isSav||isDel?0.5:1 }}>
            <Save size={12}/>{isSav?"Saving…":"Save"}
          </button>
          <button onClick={()=>onDelete(p.offense_type, p.offense_count)} disabled={isSav||isDel} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8, color:"#ef4444", fontSize:12, fontFamily:"Outfit,sans-serif", cursor:"pointer", opacity:isSav||isDel?0.5:1 }}>
            <Trash2 size={12}/>{isDel?"…":"Del"}
          </button>
        </div>
      </td>
    </tr>
  );
}
