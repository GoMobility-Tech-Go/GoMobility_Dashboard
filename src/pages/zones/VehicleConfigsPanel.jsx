import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card, FormGroup, Toggle, AlertBox, useToast, Modal,
} from "../../components/ui/index.jsx";
import {
  Car, Bike, Truck, ChevronDown, ChevronRight, Save, Loader,
  CheckCircle2, XCircle, Sparkles,
} from "lucide-react";
import {
  listVehicleConfigs, upsertVehicleConfigs,
  VEHICLE_TYPES, CAPABILITIES,
} from "../../api/zones";

// ── Vehicle metadata ─────────────────────────────────────────────────────────
const VEHICLE_META = {
  bike:    { label: "Bike",    icon: Bike,  color: "#60A5FA" },
  auto:    { label: "Auto",    icon: Car,   color: "#F59E0B" },
  car:     { label: "Car",     icon: Car,   color: "#34D399" },
  xl:      { label: "XL",      icon: Truck, color: "#A78BFA" },
  premium: { label: "Premium", icon: Car,   color: "#D4AF37" },
  luxury:  { label: "Luxury",  icon: Car,   color: "#EC4899" },
};

// ── Default config for a fresh row ───────────────────────────────────────────
function defaultConfig(vehicle_type) {
  return {
    vehicle_type,
    is_allowed:            true,
    disallowed_reason:     null,
    conv_multiplier:       null,
    surge_cap_multiplier:  null,
    wait_grace_minutes:    null,
    platform_fee_flat:     null,
    zone_entry_fee:        0,
    toll_fee:              0,
    dead_mile_pct:         0,
    dead_mile_cap:         0,
    meet_greet_fee:        0,
    capabilities:          [],
    extra_rules:           {},
  };
}

// ── Suggested defaults per zone type (for airport preset) ────────────────────
const ZONE_PRESETS = {
  airport: {
    car:     { conv_multiplier: 1.5, surge_cap_multiplier: 1.5, wait_grace_minutes: 25, platform_fee_flat: 5, zone_entry_fee: 50, toll_fee: 50, dead_mile_pct: 0.10, dead_mile_cap: 80, meet_greet_fee: 50,
               capabilities: ["zone_entry_fee","toll_pass_through","extended_wait","fixed_corridor","meet_greet","dead_mileage","platform_fee_override"] },
    xl:      { conv_multiplier: 1.5, surge_cap_multiplier: 1.5, wait_grace_minutes: 25, platform_fee_flat: 5, zone_entry_fee: 50, toll_fee: 50, dead_mile_pct: 0.10, dead_mile_cap: 80, meet_greet_fee: 50,
               capabilities: ["zone_entry_fee","toll_pass_through","extended_wait","fixed_corridor","meet_greet","dead_mileage","platform_fee_override"] },
    premium: { conv_multiplier: 1.6, surge_cap_multiplier: 1.5, wait_grace_minutes: 30, platform_fee_flat: 5, zone_entry_fee: 50, toll_fee: 50, dead_mile_pct: 0.10, dead_mile_cap: 100, meet_greet_fee: 100,
               capabilities: ["zone_entry_fee","toll_pass_through","extended_wait","fixed_corridor","meet_greet","dead_mileage","platform_fee_override"] },
    luxury:  { conv_multiplier: 1.8, surge_cap_multiplier: 1.5, wait_grace_minutes: 30, platform_fee_flat: 5, zone_entry_fee: 50, toll_fee: 50, dead_mile_pct: 0.10, dead_mile_cap: 150, meet_greet_fee: 150,
               capabilities: ["zone_entry_fee","toll_pass_through","extended_wait","fixed_corridor","meet_greet","dead_mileage","platform_fee_override"] },
    bike:    { is_allowed: false, disallowed_reason: "Bike not permitted at airport terminals per airport authority.", capabilities: [] },
    auto:    { is_allowed: false, disallowed_reason: "Auto not permitted at airport terminals.", capabilities: [] },
  },
  tourist_place: {
    car: { zone_entry_fee: 30, capabilities: ["zone_entry_fee"] },
  },
  hospital: {
    car: { capabilities: ["dead_mileage"] },
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function numOrNull(v) {
  if (v === "" || v == null) return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}
function intOrNull(v) {
  if (v === "" || v == null) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}
function fmtVal(v) {
  if (v == null) return "—";
  return typeof v === "number" ? v.toString() : v;
}

// ── One row ──────────────────────────────────────────────────────────────────
function ConfigRow({ config, expanded, onToggle, onChange }) {
  const meta = VEHICLE_META[config.vehicle_type] || { label: config.vehicle_type, icon: Car, color: "#888" };
  const Icon = meta.icon;
  const c = meta.color;

  const upd = (k, v) => onChange({ ...config, [k]: v });

  const toggleCap = (cap) => {
    const caps = new Set(config.capabilities || []);
    if (caps.has(cap)) caps.delete(cap); else caps.add(cap);
    onChange({ ...config, capabilities: Array.from(caps) });
  };

  return (
    <div style={{ borderBottom: "1px solid rgba(212,175,55,0.08)" }}>
      {/* Row header (always visible) */}
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", cursor: "pointer",
          background: expanded ? "rgba(212,175,55,0.04)" : "transparent",
          transition: "background .15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: `${c}22`, border: `1px solid ${c}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Icon size={16} color={c}/>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "Cinzel,serif", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
                {meta.label}
              </span>
              {config.is_allowed
                ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "#34D399", background: "rgba(52,211,153,0.1)", padding: "2px 7px", borderRadius: 100, border: "1px solid rgba(52,211,153,0.25)" }}>
                    <CheckCircle2 size={9}/> ALLOWED
                  </span>
                : <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "#F87171", background: "rgba(248,113,113,0.1)", padding: "2px 7px", borderRadius: 100, border: "1px solid rgba(248,113,113,0.25)" }}>
                    <XCircle size={9}/> DISALLOWED
                  </span>
              }
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2, fontFamily: "Outfit,sans-serif" }}>
              {config.is_allowed ? (
                <>
                  Conv: <b style={{ color: "rgba(255,255,255,0.65)" }}>{fmtVal(config.conv_multiplier)}×</b> ·
                  {" "}Entry: <b style={{ color: "rgba(255,255,255,0.65)" }}>₹{config.zone_entry_fee || 0}</b> ·
                  {" "}Caps: <b style={{ color: "rgba(255,255,255,0.65)" }}>{config.capabilities?.length || 0}</b>
                </>
              ) : (
                <span style={{ fontStyle: "italic" }}>{config.disallowed_reason || "—"}</span>
              )}
            </div>
          </div>
        </div>
        {expanded ? <ChevronDown size={16} color="rgba(212,175,55,0.6)"/> : <ChevronRight size={16} color="rgba(212,175,55,0.4)"/>}
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: "14px 18px 20px 18px", background: "rgba(0,0,0,0.15)" }}>
          {/* Allow toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)", fontFamily: "Outfit,sans-serif", fontWeight: 600 }}>
              Vehicle allowed in this zone
            </span>
            <Toggle checked={config.is_allowed} onChange={v => upd("is_allowed", v)}/>
          </div>

          {!config.is_allowed ? (
            <FormGroup label="Disallowed Reason" hint="Message shown to rider when this vehicle isn't allowed">
              <textarea
                className="gm-input"
                rows={2}
                value={config.disallowed_reason || ""}
                onChange={e => upd("disallowed_reason", e.target.value || null)}
                placeholder="e.g. Bike not permitted at airport terminals per airport authority."
              />
            </FormGroup>
          ) : (
            <>
              {/* Pricing overrides */}
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(212,175,55,0.7)", textTransform: "uppercase", letterSpacing: "0.9px", margin: "4px 0 10px", fontFamily: "Cinzel,serif" }}>
                Pricing Overrides
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6 }}>
                <FormGroup label="Convenience ×" hint="null = city default">
                  <input className="gm-input" type="number" step="0.1"
                    value={config.conv_multiplier ?? ""}
                    onChange={e => upd("conv_multiplier", numOrNull(e.target.value))}
                    placeholder="1.5"/>
                </FormGroup>
                <FormGroup label="Surge Cap ×" hint="null = city default">
                  <input className="gm-input" type="number" step="0.1"
                    value={config.surge_cap_multiplier ?? ""}
                    onChange={e => upd("surge_cap_multiplier", numOrNull(e.target.value))}
                    placeholder="1.5"/>
                </FormGroup>
                <FormGroup label="Wait Grace (min)">
                  <input className="gm-input" type="number" min={0}
                    value={config.wait_grace_minutes ?? ""}
                    onChange={e => upd("wait_grace_minutes", intOrNull(e.target.value))}
                    placeholder="25"/>
                </FormGroup>
                <FormGroup label="Platform Fee Flat (₹)" hint="Overrides % commission">
                  <input className="gm-input" type="number" step="0.01" min={0}
                    value={config.platform_fee_flat ?? ""}
                    onChange={e => upd("platform_fee_flat", numOrNull(e.target.value))}
                    placeholder="5.00"/>
                </FormGroup>
              </div>

              {/* Additive fees */}
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(212,175,55,0.7)", textTransform: "uppercase", letterSpacing: "0.9px", margin: "10px 0 10px", fontFamily: "Cinzel,serif" }}>
                Additive Fees (pass-through)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FormGroup label="Zone Entry Fee (₹)">
                  <input className="gm-input" type="number" step="0.01" min={0}
                    value={config.zone_entry_fee ?? 0}
                    onChange={e => upd("zone_entry_fee", numOrNull(e.target.value) ?? 0)}/>
                </FormGroup>
                <FormGroup label="Toll Fee (₹)">
                  <input className="gm-input" type="number" step="0.01" min={0}
                    value={config.toll_fee ?? 0}
                    onChange={e => upd("toll_fee", numOrNull(e.target.value) ?? 0)}/>
                </FormGroup>
              </div>

              {/* Driver retention */}
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(212,175,55,0.7)", textTransform: "uppercase", letterSpacing: "0.9px", margin: "10px 0 10px", fontFamily: "Cinzel,serif" }}>
                Driver Retention
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FormGroup label="Dead Mile %" hint="0.10 = 10% of fare">
                  <input className="gm-input" type="number" step="0.01" min={0} max={1}
                    value={config.dead_mile_pct ?? 0}
                    onChange={e => upd("dead_mile_pct", numOrNull(e.target.value) ?? 0)}/>
                </FormGroup>
                <FormGroup label="Dead Mile Cap (₹)">
                  <input className="gm-input" type="number" step="0.01" min={0}
                    value={config.dead_mile_cap ?? 0}
                    onChange={e => upd("dead_mile_cap", numOrNull(e.target.value) ?? 0)}/>
                </FormGroup>
              </div>

              {/* Rider add-ons */}
              <FormGroup label="Meet & Greet Fee (₹)">
                <input className="gm-input" type="number" step="0.01" min={0}
                  value={config.meet_greet_fee ?? 0}
                  onChange={e => upd("meet_greet_fee", numOrNull(e.target.value) ?? 0)}/>
              </FormGroup>

              {/* Capabilities */}
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(212,175,55,0.7)", textTransform: "uppercase", letterSpacing: "0.9px", margin: "10px 0 10px", fontFamily: "Cinzel,serif" }}>
                Capabilities ({config.capabilities?.length || 0} selected)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {CAPABILITIES.map(cap => {
                  const on = config.capabilities?.includes(cap.value);
                  return (
                    <label
                      key={cap.value}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px", borderRadius: 8,
                        background: on ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${on ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.06)"}`,
                        cursor: "pointer", transition: "all .15s",
                        fontSize: 11.5, color: on ? "#D4AF37" : "rgba(255,255,255,0.6)",
                        fontFamily: "Outfit,sans-serif",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!on}
                        onChange={() => toggleCap(cap.value)}
                        style={{ accentColor: "#D4AF37", cursor: "pointer" }}
                      />
                      {cap.label}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────
export default function VehicleConfigsPanel({ zoneId, zoneType, onSaved }) {
  const toast = useToast();
  const [configs, setConfigs]     = useState(() => VEHICLE_TYPES.map(vt => defaultConfig(vt)));
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const [presetOpen, setPresetOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listVehicleConfigs(zoneId);
      const existing = res.data?.data?.configs || [];
      // Merge existing into default 6 rows
      const merged = VEHICLE_TYPES.map(vt => {
        const found = existing.find(c => c.vehicle_type === vt);
        return found ? { ...defaultConfig(vt), ...found } : defaultConfig(vt);
      });
      setConfigs(merged);
    } catch (e) {
      toast?.(e.response?.data?.message || "Failed to load configs", "error");
    } finally { setLoading(false); }
  }, [zoneId, toast]);

  useEffect(() => { load(); }, [load]);

  const updateOne = (vt, next) => {
    setConfigs(cs => cs.map(c => c.vehicle_type === vt ? next : c));
  };

  const applyPreset = () => {
    const preset = ZONE_PRESETS[zoneType];
    if (!preset) return toast?.("No preset for this zone type", "warning");
    setConfigs(cs => cs.map(c => {
      const override = preset[c.vehicle_type];
      if (!override) return c;
      return { ...c, ...override };
    }));
    toast?.(`Preset applied: ${zoneType}`, "success");
    setPresetOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Sanitize payload — remove keys backend doesn't accept in payload
      const payload = configs.map(c => ({
        vehicle_type:         c.vehicle_type,
        is_allowed:           !!c.is_allowed,
        disallowed_reason:    c.is_allowed ? null : (c.disallowed_reason || null),
        conv_multiplier:      c.conv_multiplier,
        surge_cap_multiplier: c.surge_cap_multiplier,
        wait_grace_minutes:   c.wait_grace_minutes,
        platform_fee_flat:    c.platform_fee_flat,
        zone_entry_fee:       parseFloat(c.zone_entry_fee) || 0,
        toll_fee:             parseFloat(c.toll_fee) || 0,
        dead_mile_pct:        parseFloat(c.dead_mile_pct) || 0,
        dead_mile_cap:        parseFloat(c.dead_mile_cap) || 0,
        meet_greet_fee:       parseFloat(c.meet_greet_fee) || 0,
        capabilities:         c.capabilities || [],
        extra_rules:          c.extra_rules || {},
      }));
      await upsertVehicleConfigs(zoneId, payload);
      toast?.("All 6 vehicle configs saved", "success");
      onSaved?.();
      await load();
    } catch (e) {
      toast?.(e.response?.data?.message || "Save failed", "error");
    } finally { setSaving(false); }
  };

  const stats = useMemo(() => {
    const allowed = configs.filter(c => c.is_allowed).length;
    const totalCaps = configs.reduce((s, c) => s + (c.capabilities?.length || 0), 0);
    return { allowed, totalCaps };
  }, [configs]);

  const hasPreset = !!ZONE_PRESETS[zoneType];

  if (loading) {
    return (
      <Card>
        <div style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
          <Loader size={20} style={{ animation: "gmSpin 1s linear infinite" }}/>
          <div style={{ marginTop: 10, fontSize: 12 }}>Loading configs…</div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid rgba(212,175,55,0.1)",
        background: "rgba(0,0,0,0.15)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8,
          fontFamily: "Cinzel,serif", fontSize: 12.5, fontWeight: 700, color: "#D4AF37" }}>
          <Car size={13}/> Vehicle Configs
          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", fontFamily: "Outfit,sans-serif", fontWeight: 500, marginLeft: 4 }}>
            · {stats.allowed} allowed · {stats.totalCaps} capabilities
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {hasPreset && (
            <button className="btn-outline btn-xs" onClick={() => setPresetOpen(true)} title="Apply suggested defaults for this zone type">
              <Sparkles size={11}/> Preset
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "10px 16px 0" }}>
        <AlertBox type="info">
          <span style={{ fontSize: 12 }}>Click any row to expand. Changes save all 6 configs in one shot.</span>
        </AlertBox>
      </div>

      {/* Rows */}
      <div>
        {configs.map(c => (
          <ConfigRow
            key={c.vehicle_type}
            config={c}
            expanded={expanded === c.vehicle_type}
            onToggle={() => setExpanded(expanded === c.vehicle_type ? null : c.vehicle_type)}
            onChange={(next) => updateOne(c.vehicle_type, next)}
          />
        ))}
      </div>

      {/* Save button */}
      <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(212,175,55,0.1)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn-outline" onClick={load} disabled={saving}>Reset</button>
        <button className="btn-gold" onClick={handleSave} disabled={saving}>
          <Save size={13}/> {saving ? "Saving…" : "Save All 6 Configs"}
        </button>
      </div>

      {/* Preset modal */}
      <Modal open={presetOpen} onClose={() => setPresetOpen(false)} title={`Apply "${zoneType}" preset`}>
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "Outfit,sans-serif", lineHeight: 1.6 }}>
          <AlertBox type="warning">
            <span>This will <strong>override current values</strong> for allowed vehicles with recommended defaults for {zoneType} zones.</span>
          </AlertBox>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            Only the fields defined in the preset are changed. You can still fine-tune each row before saving.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button className="btn-outline" onClick={() => setPresetOpen(false)}>Cancel</button>
            <button className="btn-gold" onClick={applyPreset}>Apply Preset</button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
