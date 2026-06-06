import { useState, useEffect } from "react";
import { Plus, ToggleLeft, ToggleRight, X, Pencil } from "lucide-react";
import { getSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, togglePlanStatus } from "../../api/admin";

const fmtRupee = (n) => n != null ? "₹" + new Intl.NumberFormat("en-IN").format(n) : "—";

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
    <span style={{ flex:1 }}>{msg}</span>
    <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

const EMPTY_FORM = {
  name:"", slug:"", description:"", price:"", durationDays:"",
  rideDiscountPercent:0, freeRidesPerMonth:0,
  priorityBooking:false, cancellationWaiver:false, surgeProtection:false,
};

export default function SubscriptionsPage() {
  const [plans, setPlans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const [modal, setModal]     = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [submitting, setSub]  = useState(false);
  const [toggling, setTog]    = useState({});

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const load = () => {
    setLoading(true);
    getSubscriptionPlans()
      .then((res) => {
        const d = res.data?.data || res.data || [];
        setPlans(Array.isArray(d) ? d : (d.plans || d.items || []));
      })
      .catch(() => showToast("Failed to load plans.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const norm = (p) => ({
    id:           p.planId    ?? p.id,
    name:         p.name,
    slug:         p.slug,
    description:  p.description,
    price:        p.price,
    durationDays: p.durationDays ?? p.duration_days,
    is_active:    p.isActive  ?? p.is_active ?? true,
    benefits:     p.benefits  || {},
  });

  const openCreate = () => {
    setEditPlan(null);
    setForm(EMPTY_FORM);
    setModal(true);
  };

  const openEdit = (rawPlan) => {
    const p = norm(rawPlan);
    setEditPlan(p);
    setForm({
      name:               p.name || "",
      slug:               p.slug || "",
      description:        p.description || "",
      price:              String(p.price ?? ""),
      durationDays:       String(p.durationDays ?? ""),
      rideDiscountPercent: p.benefits?.rideDiscountPercent ?? 0,
      freeRidesPerMonth:  p.benefits?.freeRidesPerMonth   ?? 0,
      priorityBooking:    p.benefits?.priorityBooking      ?? false,
      cancellationWaiver: p.benefits?.cancellationWaiver   ?? false,
      surgeProtection:    p.benefits?.surgeProtection      ?? false,
    });
    setModal(true);
  };

  const buildPayload = () => ({
    name:               form.name,
    slug:               form.slug || form.name.toLowerCase().replace(/\s+/g, "-"),
    description:        form.description,
    price:              Number(form.price),
    durationDays:       Number(form.durationDays),
    rideDiscountPercent:Number(form.rideDiscountPercent) || 0,
    freeRidesPerMonth:  Number(form.freeRidesPerMonth)   || 0,
    priorityBooking:    form.priorityBooking,
    cancellationWaiver: form.cancellationWaiver,
    surgeProtection:    form.surgeProtection,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.durationDays) {
      showToast("Plan name, price and duration are required.", "error"); return;
    }
    setSub(true);
    try {
      const payload = buildPayload();
      if (editPlan) {
        await updateSubscriptionPlan(editPlan.id, payload);
        showToast("Plan updated successfully.");
      } else {
        await createSubscriptionPlan(payload);
        showToast("Plan created successfully.");
      }
      setModal(false);
      setEditPlan(null);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save plan.", "error");
    } finally {
      setSub(false);
    }
  };

  const handleToggle = async (rawPlan) => {
    const p = norm(rawPlan);
    setTog((prev) => ({ ...prev, [p.id]: true }));
    try {
      await togglePlanStatus(p.id, !p.is_active);
      setPlans((prev) => prev.map((pl) => {
        const pid = pl.planId ?? pl.id;
        return pid === p.id ? { ...pl, isActive: !p.is_active, is_active: !p.is_active } : pl;
      }));
      showToast(`Plan ${!p.is_active ? "activated" : "deactivated"}.`);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update plan.", "error");
    } finally {
      setTog((prev) => ({ ...prev, [p.id]: false }));
    }
  };

  const inp = { width:"100%", height:44, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px", color:"#fff", fontSize:14, outline:"none", fontFamily:"Outfit,sans-serif", boxSizing:"border-box" };
  const lbl = { display:"block", fontSize:11, fontFamily:"Cinzel,serif", color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 };

  const fld = (key, label, type="text", required=false) => (
    <div key={key}>
      <label style={lbl}>{label}{required ? " *" : ""}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        style={inp}
        onFocus={(e) => e.target.style.borderColor = "#D4AF37"}
        onBlur={(e) => e.target.style.borderColor = "rgba(212,175,55,0.15)"}
      />
    </div>
  );

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`
        @keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}
        input[type=range]{-webkit-appearance:none;height:4px;background:rgba(255,255,255,0.12);border-radius:4px;outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#D4AF37;cursor:pointer;border:2px solid #020d26}
      `}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Plan Modal */}
      {modal && (
        <div style={{ position:"fixed", inset:0, zIndex:999, background:"rgba(0,0,0,0.78)", backdropFilter:"blur(5px)", display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setModal(false)}>
          <div style={{ background:"#020d26", border:"1px solid rgba(212,175,55,0.2)", borderRadius:20, padding:32, width:500, maxWidth:"92vw", maxHeight:"90vh", overflow:"auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <h3 style={{ fontFamily:"Cinzel,serif", color:"#fff", fontSize:16, margin:0 }}>
                {editPlan ? "Edit Plan" : "Create Subscription Plan"}
              </h3>
              <button onClick={() => setModal(false)} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={14}/></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {fld("name", "Plan Name", "text", true)}
              {fld("slug", "Slug (auto-generated if empty)")}
              {fld("description", "Description")}

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {fld("price", "Price (₹)", "number", true)}
                {fld("durationDays", "Duration (days)", "number", true)}
              </div>

              {/* Ride Discount Slider */}
              <div>
                <label style={{ ...lbl, marginBottom:8 }}>Ride Discount: {form.rideDiscountPercent}%</label>
                <input
                  type="range" min="0" max="100"
                  value={form.rideDiscountPercent}
                  onChange={(e) => setForm((p) => ({ ...p, rideDiscountPercent: Number(e.target.value) }))}
                  style={{ width:"100%", accentColor:"#D4AF37" }}
                />
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:4 }}>
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>

              {/* Free Rides */}
              <div>
                <label style={lbl}>Free Rides / Month</label>
                <input
                  type="number" min="0" max="50"
                  value={form.freeRidesPerMonth}
                  onChange={(e) => setForm((p) => ({ ...p, freeRidesPerMonth: e.target.value }))}
                  style={inp}
                  onFocus={(e) => e.target.style.borderColor = "#D4AF37"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(212,175,55,0.15)"}
                />
              </div>

              {/* Benefit Checkboxes */}
              <div>
                <label style={{ ...lbl, marginBottom:12 }}>Benefits</label>
                {[
                  { key:"priorityBooking",    label:"⚡ Priority Booking",       desc:"Driver assigned faster" },
                  { key:"cancellationWaiver", label:"✔ Cancellation Waiver",    desc:"No fee on first cancellation" },
                  { key:"surgeProtection",    label:"🛡 Surge Protection",       desc:"Capped pricing during peak hours" },
                ].map(({ key, label, desc }) => (
                  <label key={key} style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:10, cursor:"pointer", padding:"10px 12px", background:"rgba(255,255,255,0.03)", borderRadius:10, border:`1px solid ${form[key]?"rgba(212,175,55,0.3)":"rgba(255,255,255,0.06)"}` }}>
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))}
                      style={{ width:16, height:16, accentColor:"#D4AF37", flexShrink:0, marginTop:2 }}
                    />
                    <div>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,0.85)", fontFamily:"Outfit,sans-serif" }}>{label}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <button type="submit" disabled={submitting} style={{ height:50, background:"linear-gradient(135deg,#f0d060,#D4AF37,#b8922a)", border:"none", borderRadius:12, color:"#0a1840", fontSize:13, fontFamily:"Cinzel,serif", fontWeight:700, cursor:submitting?"not-allowed":"pointer", opacity:submitting?0.75:1, letterSpacing:"1px", marginTop:4 }}>
                {submitting ? "Saving…" : (editPlan ? "Update Plan" : "Create Plan")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Subscriptions</h1>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>{plans.length} plans configured</p>
        </div>
        <button onClick={openCreate} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 18px", background:"rgba(212,175,55,0.12)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:10, color:"#D4AF37", fontSize:13, fontFamily:"Outfit,sans-serif", cursor:"pointer", fontWeight:600 }}>
          <Plus size={14} /> Create Plan
        </button>
      </div>

      {/* Plans Grid */}
      {loading
        ? <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:16 }}>
            {Array(3).fill(0).map((_,i)=>(
              <div key={i} style={{ height:240, borderRadius:16, background:"rgba(255,255,255,0.04)", animation:"gmPulse 1.5s ease-in-out infinite" }}/>
            ))}
          </div>
        : plans.length === 0
          ? <div style={{ textAlign:"center", padding:60, color:"rgba(255,255,255,0.3)", fontSize:14 }}>No subscription plans found. Create your first plan.</div>
          : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:16 }}>
              {plans.map((rawPlan) => {
                const p = norm(rawPlan);
                const b = p.benefits || {};
                return (
                  <div key={p.id} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${p.is_active?"rgba(212,175,55,0.25)":"rgba(255,255,255,0.08)"}`, borderRadius:16, padding:24, position:"relative", overflow:"hidden" }}>
                    {p.is_active && <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#D4AF37,transparent)" }}/>}

                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                      <div>
                        <div style={{ fontFamily:"Cinzel,serif", fontSize:16, fontWeight:700, color:"#fff" }}>{p.name}</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>/{p.slug}</div>
                      </div>
                      <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:p.is_active?"rgba(34,197,94,0.12)":"rgba(255,255,255,0.06)", color:p.is_active?"#4ade80":"rgba(255,255,255,0.4)", border:`1px solid ${p.is_active?"rgba(34,197,94,0.3)":"rgba(255,255,255,0.1)"}` }}>
                        {p.is_active?"Active":"Inactive"}
                      </span>
                    </div>

                    {p.description && <p style={{ fontSize:12, color:"rgba(255,255,255,0.4)", margin:"0 0 10px", lineHeight:1.5 }}>{p.description}</p>}

                    <div style={{ fontSize:28, fontWeight:800, color:"#D4AF37", marginBottom:2, fontFamily:"Cinzel,serif" }}>{fmtRupee(p.price)}</div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginBottom:14 }}>{p.durationDays} days validity</div>

                    <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:18 }}>
                      {(b.rideDiscountPercent > 0) && <div style={{ fontSize:12, color:"rgba(255,255,255,0.55)" }}>🎁 {b.rideDiscountPercent}% ride discount</div>}
                      {(b.freeRidesPerMonth > 0)   && <div style={{ fontSize:12, color:"rgba(255,255,255,0.55)" }}>🚗 {b.freeRidesPerMonth} free rides/month</div>}
                      {b.priorityBooking            && <div style={{ fontSize:12, color:"rgba(255,255,255,0.55)" }}>⚡ Priority booking</div>}
                      {b.cancellationWaiver         && <div style={{ fontSize:12, color:"rgba(255,255,255,0.55)" }}>✔ Cancellation waiver</div>}
                      {b.surgeProtection            && <div style={{ fontSize:12, color:"rgba(255,255,255,0.55)" }}>🛡 Surge protection</div>}
                    </div>

                    <div style={{ display:"flex", gap:8 }}>
                      <button
                        onClick={() => openEdit(rawPlan)}
                        style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.25)", borderRadius:8, color:"#D4AF37", fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>
                        <Pencil size={12}/> Edit
                      </button>
                      <button
                        onClick={() => handleToggle(rawPlan)}
                        disabled={toggling[p.id]}
                        style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"8px 14px", background:p.is_active?"rgba(239,68,68,0.1)":"rgba(34,197,94,0.1)", border:`1px solid ${p.is_active?"rgba(239,68,68,0.25)":"rgba(34,197,94,0.25)"}`, borderRadius:8, color:p.is_active?"#f87171":"#4ade80", fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif", opacity:toggling[p.id]?0.5:1 }}>
                        {p.is_active ? <ToggleLeft size={14}/> : <ToggleRight size={14}/>}
                        {p.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
      }
    </div>
  );
}
