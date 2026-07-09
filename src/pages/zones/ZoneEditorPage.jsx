import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ToastProvider, useToast, GlobalStyles, Card, Modal, FormGroup, AlertBox,
} from "../../components/ui/index.jsx";
import {
  ArrowLeft, Save, PlayCircle, PauseCircle, Trash2, MapPin, Loader,
  TestTube2, CheckCircle2, XCircle, Hexagon, Info, Car, DoorOpen, Route,
} from "lucide-react";
import ZoneMap from "./ZoneMap";
import VehicleConfigsPanel from "./VehicleConfigsPanel";
import ExitsPanel from "./ExitsPanel";
import CorridorsPanel from "./CorridorsPanel";
import { listExits, listZonesForMap } from "../../api/zones";
import { validatePolygon, formatAreaLabel } from "./polygonValidation";
import {
  getZone, createZone, updateZone, activateZone, deactivateZone,
  deleteZone, testZoneCoord,
  ZONE_TYPES, ZONE_CATEGORIES, LIFECYCLE_STATES,
} from "../../api/zones";
import { getCities } from "../../api/admin";
import { useAuth } from "../../context/AuthContext";

// ── Lifecycle badge helper ───────────────────────────────────────────────────
function LifecycleBadge({ state }) {
  const meta = LIFECYCLE_STATES.find(s => s.value === state) || { label: state, color: "#6B7280" };
  const c = meta.color;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700,
      fontFamily: "Outfit,sans-serif",
      background: `${c}22`, border: `1px solid ${c}66`, color: c,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c }}/>
      {meta.label?.toUpperCase()}
    </span>
  );
}

// ── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, right }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 16px", borderBottom: "1px solid rgba(212,175,55,0.1)",
      background: "rgba(0,0,0,0.15)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8,
        fontFamily: "Cinzel,serif", fontSize: 12.5, fontWeight: 700, color: "#D4AF37" }}>
        {Icon && <Icon size={13}/>} {title}
      </div>
      {right}
    </div>
  );
}

// ── Test coord panel ─────────────────────────────────────────────────────────
function TestCoordPanel({ zoneId, expectedCode, onResult }) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const runTest = async () => {
    const la = parseFloat(lat), ln = parseFloat(lng);
    if (Number.isNaN(la) || Number.isNaN(ln)) return toast?.("Enter valid lat/lng", "error");
    if (la < -90 || la > 90 || ln < -180 || ln > 180) return toast?.("Coord out of range", "error");
    setBusy(true);
    try {
      const res = await testZoneCoord(zoneId, la, ln);
      const d = res.data?.data || {};
      setResult(d);
      onResult?.({ lat: la, lng: ln, matched: d.matched });
    } catch (e) {
      toast?.(e.response?.data?.message || "Test failed", "error");
    } finally { setBusy(false); }
  };

  return (
    <Card style={{ marginBottom: 14 }}>
      <SectionHeader icon={TestTube2} title="Test Coordinate"/>
      <div style={{ padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <input className="gm-input" placeholder="Latitude" value={lat} onChange={e => setLat(e.target.value)}/>
          <input className="gm-input" placeholder="Longitude" value={lng} onChange={e => setLng(e.target.value)}/>
        </div>
        <button className="btn-outline" onClick={runTest} disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
          {busy ? <Loader size={13} style={{ animation: "gmSpin 1s linear infinite" }}/> : <TestTube2 size={13}/>}
          {busy ? "Testing…" : "Run Test"}
        </button>
        {result && (
          <div style={{
            marginTop: 12, padding: "10px 12px", borderRadius: 8,
            background: result.matched ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
            border: `1px solid ${result.matched ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
            fontSize: 12, color: result.matched ? "#34D399" : "#F87171",
            display: "flex", alignItems: "flex-start", gap: 8,
          }}>
            {result.matched ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
            <div>
              <div style={{ fontWeight: 700 }}>
                {result.matched ? `Matched: ${result.resolved_zone_code}` : "No match"}
              </div>
              <div style={{ fontSize: 10.5, opacity: 0.75, marginTop: 2 }}>
                Method: {result.resolution_method || "—"} · Expected: {expectedCode || "—"}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Save-first notice (shown on tabs when zone is not yet saved) ─────────────
function SaveFirstNotice({ icon: Icon, title, note }) {
  return (
    <Card>
      <SectionHeader icon={Icon} title={title}/>
      <div style={{ padding: "40px 24px", textAlign: "center", color: "rgba(255,255,255,0.55)" }}>
        <Icon size={32} color="rgba(212,175,55,0.35)" style={{ marginBottom: 12 }}/>
        <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 13, marginBottom: 6, color: "rgba(255,255,255,0.75)" }}>
          Draft not saved yet
        </div>
        <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", maxWidth: 320, margin: "0 auto" }}>
          {note}
        </div>
      </div>
    </Card>
  );
}

// ── Main editor ──────────────────────────────────────────────────────────────
function ZoneEditorContent() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "Super Admin";
  const isNew = id === "new";

  // ── State ──────────────────────────────────────────────────────────────────
  const [zone, setZone]               = useState(null);
  const [cities, setCities]           = useState([]);
  const [loading, setLoading]         = useState(!isNew);
  const [saving, setSaving]           = useState(false);
  const [activeTab, setActiveTab]     = useState("boundary");

  // Form fields
  const [form, setForm] = useState({
    zone_code: "",
    zone_type: "airport",
    zone_category: "transport",
    custom_type_label: "",   // used only when zone_type === "custom"
    name: "",
    city_id: "",
    resolve_priority: 100,
    center_lat: "",
    center_lng: "",
    staging_lat: "",
    staging_lng: "",
  });
  const [boundary, setBoundary] = useState(null);

  // Confirmation modals
  const [confirmAction, setConfirmAction] = useState(null); // "activate" | "deactivate" | "delete"
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Test coord result marker on map
  const [testPoint, setTestPoint] = useState(null);

  // Exit markers on map
  const [exits, setExits] = useState([]);
  const refreshExits = useCallback(async () => {
    if (isNew) return;
    try {
      const res = await listExits(id);
      setExits(res.data?.data?.exits || []);
    } catch { /* silent */ }
  }, [id, isNew]);
  useEffect(() => { refreshExits(); }, [refreshExits]);

  // ── Other existing zones (to show on map so user doesn't overlap) ─────────
  const [otherZones, setOtherZones] = useState([]);
  useEffect(() => {
    if (!form.city_id) { setOtherZones([]); return; }
    // Only fetch zones in the SAME city — reduces map clutter
    listZonesForMap({ city_id: form.city_id })
      .then(res => {
        const list = res.data?.data?.zones || [];
        // Exclude self when editing
        const filtered = isNew ? list : list.filter(z => String(z.id) !== String(id));
        setOtherZones(filtered);
      })
      .catch(() => setOtherZones([]));
  }, [form.city_id, id, isNew]);

  // ── Load zone (if editing) ─────────────────────────────────────────────────
  const loadZone = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res = await getZone(id);
      const d = res.data?.data || {};
      const z = d.zone || {};
      setZone(z);
      setForm({
        zone_code:        z.zone_code || "",
        zone_type:        z.zone_type || "airport",
        zone_category:    z.zone_category || "transport",
        custom_type_label: z.extra_meta?.custom_type_label || "",
        name:             z.name || "",
        city_id:          z.city_id ? String(z.city_id) : "",
        resolve_priority: z.resolve_priority ?? 100,
        center_lat:       z.center_geojson?.coordinates?.[1] ?? "",
        center_lng:       z.center_geojson?.coordinates?.[0] ?? "",
        staging_lat:      z.staging_area_geojson?.coordinates?.[1] ?? "",
        staging_lng:      z.staging_area_geojson?.coordinates?.[0] ?? "",
      });
      setBoundary(z.boundary_geojson || null);
    } catch (e) {
      toast?.(e.response?.data?.message || "Failed to load zone", "error");
      nav("/zones");
    } finally { setLoading(false); }
  }, [id, isNew, nav, toast]);

  useEffect(() => { loadZone(); }, [loadZone]);

  useEffect(() => {
    getCities()
      .then(res => {
        const d = res.data?.data || res.data || {};
        setCities(d.cities || (Array.isArray(d) ? d : []));
      })
      .catch(() => setCities([]));
  }, []);

  // ── Auto-set category when zone_type changes (only if new) ─────────────────
  useEffect(() => {
    if (!isNew) return;
    const t = ZONE_TYPES.find(t => t.value === form.zone_type);
    if (t && t.category !== form.zone_category) {
      setForm(f => ({ ...f, zone_category: t.category }));
    }
  }, [form.zone_type]); // eslint-disable-line

  // ── Selected city coordinates for map focus ────────────────────────────────
  const cityCenter = useMemo(() => {
    const c = cities.find(c => String(c.id) === String(form.city_id));
    if (!c?.center_latitude || !c?.center_longitude) return null;
    return { lat: parseFloat(c.center_latitude), lng: parseFloat(c.center_longitude) };
  }, [cities, form.city_id]);

  // ── Center / staging as markers ────────────────────────────────────────────
  const centerMarker = useMemo(() => {
    const la = parseFloat(form.center_lat), ln = parseFloat(form.center_lng);
    return !Number.isNaN(la) && !Number.isNaN(ln) ? { lat: la, lng: ln } : null;
  }, [form.center_lat, form.center_lng]);

  const stagingMarker = useMemo(() => {
    const la = parseFloat(form.staging_lat), ln = parseFloat(form.staging_lng);
    return !Number.isNaN(la) && !Number.isNaN(ln) ? { lat: la, lng: ln } : null;
  }, [form.staging_lat, form.staging_lng]);

  // ── Polygon validation live ────────────────────────────────────────────────
  const polygonCheck = useMemo(() => {
    if (!boundary) return { valid: false, error: "" };
    return validatePolygon(boundary);
  }, [boundary]);

  // ── Form validation ────────────────────────────────────────────────────────
  const formErrors = useMemo(() => {
    const errs = [];
    if (!form.zone_code || form.zone_code.trim().length < 2) errs.push("Zone code (min 2 chars)");
    if (!form.name || form.name.trim().length < 3) errs.push("Zone name (min 3 chars)");
    if (!form.city_id) errs.push("City");
    if (!form.zone_type) errs.push("Zone type");
    if (!form.zone_category) errs.push("Zone category");
    if (form.zone_type === "custom" && !form.custom_type_label.trim())
      errs.push("Custom type name (required when type is Custom)");
    return errs;
  }, [form]);

  const canSave = formErrors.length === 0;

  // ── Build payload ──────────────────────────────────────────────────────────
  const buildPayload = () => {
    const payload = {
      zone_code:     form.zone_code.trim(),
      zone_type:     form.zone_type,
      zone_category: form.zone_category,
      name:          form.name.trim(),
      city_id:       parseInt(form.city_id, 10),
      resolve_priority: parseInt(form.resolve_priority, 10) || 100,
    };
    if (boundary) payload.boundary_geojson = boundary;
    if (centerMarker)  payload.center_geojson  = { type: "Point", coordinates: [centerMarker.lng, centerMarker.lat] };
    if (stagingMarker) payload.staging_area_geojson = { type: "Point", coordinates: [stagingMarker.lng, stagingMarker.lat] };

    // Custom type label → store in extra_meta (backend zone_type enum is fixed)
    const extra = { ...(zone?.extra_meta || {}) };
    if (form.zone_type === "custom" && form.custom_type_label.trim()) {
      extra.custom_type_label = form.custom_type_label.trim();
    } else {
      delete extra.custom_type_label;
    }
    payload.extra_meta = extra;

    return payload;
  };

  // ── Save (create or update) ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canSave) {
      toast?.(`Fill required: ${formErrors.join(", ")}`, "error");
      return;
    }
    if (boundary && !polygonCheck.valid) {
      toast?.(polygonCheck.error, "error");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isNew) {
        const res = await createZone(payload);
        const newId = res.data?.data?.id;
        toast?.("Zone created", "success");
        if (newId) nav(`/zones/${newId}`);
      } else {
        await updateZone(id, payload);
        toast?.("Zone updated", "success");
        await loadZone();
      }
    } catch (e) {
      toast?.(e.response?.data?.message || "Save failed", "error");
    } finally { setSaving(false); }
  };

  // ── Lifecycle actions ──────────────────────────────────────────────────────
  const runActivate = async () => {
    setSaving(true);
    try {
      await activateZone(id);
      toast?.("Zone activated · LIVE for rider requests", "success");
      await loadZone();
    } catch (e) {
      toast?.(e.response?.data?.message || "Activation failed", "error");
    } finally { setSaving(false); setConfirmAction(null); }
  };

  const runDeactivate = async () => {
    setSaving(true);
    try {
      await deactivateZone(id);
      toast?.("Zone deactivated", "success");
      await loadZone();
    } catch (e) {
      toast?.(e.response?.data?.message || "Deactivation failed", "error");
    } finally { setSaving(false); setConfirmAction(null); }
  };

  const runDelete = async () => {
    if (deleteConfirmText !== form.zone_code) return;
    setSaving(true);
    try {
      await deleteZone(id);
      toast?.("Zone deleted", "success");
      nav("/zones");
    } catch (e) {
      toast?.(e.response?.data?.message || "Delete failed", "error");
      setSaving(false); setConfirmAction(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,0.5)", fontFamily: "Outfit,sans-serif" }}>
        <Loader size={24} style={{ animation: "gmSpin 1s linear infinite", marginBottom: 10 }}/>
        <div>Loading zone…</div>
        <style>{`@keyframes gmSpin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const canActivate   = zone && !zone.is_active && ["polygon_drawn", "configured", "deprecated"].includes(zone.lifecycle_state);
  const canDeactivate = zone && zone.is_active && zone.lifecycle_state === "active";
  const canDelete     = zone && isSuperAdmin && zone.lifecycle_state === "draft";

  return (
    <div style={{ animation: "gmFadeUp .4s both" }}>
      <style>{`
        @keyframes gmFadeUp{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}
        @keyframes gmSpin{to{transform:rotate(360deg)}}
        .tab-btn:disabled{opacity:0.4;cursor:not-allowed}
        .tab-btn:disabled:hover{color:rgba(255,255,255,0.4)!important}
        @media(max-width: 1100px){
          .zone-editor-grid{grid-template-columns: 1fr !important;}
          .zone-editor-map{position: relative !important; height: 500px !important; top: 0 !important;}
        }
      `}</style>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-outline btn-sm" onClick={() => nav("/zones")}>
            <ArrowLeft size={13}/> Back
          </button>
          <div>
            <h2 style={{ fontFamily: "Cinzel,serif", fontSize: 20, fontWeight: 800, color: "#D4AF37", margin: 0, letterSpacing: "0.3px" }}>
              {isNew ? "New Zone" : (zone?.name || form.name || "Zone Editor")}
            </h2>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2, fontFamily: "Outfit,sans-serif", display: "flex", gap: 8, alignItems: "center" }}>
              {!isNew && zone?.zone_code && (
                <span style={{ fontFamily: "monospace", color: "#D4AF37" }}>{zone.zone_code}</span>
              )}
              {!isNew && zone?.lifecycle_state && <LifecycleBadge state={zone.lifecycle_state}/>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn-gold" onClick={handleSave} disabled={saving}>
            <Save size={13}/> {saving ? "Saving…" : isNew ? "Create Draft" : "Save Changes"}
          </button>
          {canActivate && (
            <button className="btn-success" onClick={() => setConfirmAction("activate")} disabled={saving}>
              <PlayCircle size={13}/> Activate
            </button>
          )}
          {canDeactivate && (
            <button className="btn-danger" onClick={() => setConfirmAction("deactivate")} disabled={saving}>
              <PauseCircle size={13}/> Deactivate
            </button>
          )}
          {canDelete && (
            <button className="btn-danger" onClick={() => setConfirmAction("delete")} disabled={saving}>
              <Trash2 size={13}/> Delete
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="zone-editor-grid" style={{
        display: "grid",
        gridTemplateColumns: "minmax(440px, 500px) 1fr",
        gap: 16,
        alignItems: "flex-start",
      }}>
        {/* LEFT — form / tabs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          {/* Tabs */}
          <div className="tab-nav" style={{ marginBottom: 0, borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
            <button className={`tab-btn ${activeTab === "boundary" ? "active" : ""}`} onClick={() => setActiveTab("boundary")}>
              <MapPin size={12} style={{ marginRight: 5, verticalAlign: "middle" }}/> Boundary
            </button>
            <button className={`tab-btn ${activeTab === "vehicles" ? "active" : ""}`} onClick={() => setActiveTab("vehicles")}>
              <Car size={12} style={{ marginRight: 5, verticalAlign: "middle" }}/> Vehicles
            </button>
            <button className={`tab-btn ${activeTab === "exits" ? "active" : ""}`} onClick={() => setActiveTab("exits")}>
              <DoorOpen size={12} style={{ marginRight: 5, verticalAlign: "middle" }}/> Exits
            </button>
            <button className={`tab-btn ${activeTab === "corridors" ? "active" : ""}`} onClick={() => setActiveTab("corridors")}>
              <Route size={12} style={{ marginRight: 5, verticalAlign: "middle" }}/> Corridors
            </button>
          </div>

          {activeTab === "boundary" && (
            <>
              {/* Metadata card */}
              <Card>
                <SectionHeader icon={Info} title="Metadata"/>
                <div style={{ padding: 14 }}>
                  <FormGroup label="Zone Code *" hint="Unique identifier — e.g. DEL-T3">
                    <input
                      className="gm-input"
                      value={form.zone_code}
                      onChange={e => setForm(f => ({ ...f, zone_code: e.target.value.toUpperCase() }))}
                      placeholder="DEL-T3"
                      disabled={!isNew}
                    />
                  </FormGroup>
                  <FormGroup label="Name *">
                    <input
                      className="gm-input"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="IGI Terminal 3"
                    />
                  </FormGroup>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <FormGroup label="Type *">
                      <select
                        className="gm-input"
                        value={form.zone_type}
                        onChange={e => setForm(f => ({ ...f, zone_type: e.target.value }))}
                      >
                        {ZONE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </FormGroup>
                    <FormGroup label="Category *">
                      <select
                        className="gm-input"
                        value={form.zone_category}
                        onChange={e => setForm(f => ({ ...f, zone_category: e.target.value }))}
                      >
                        {ZONE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </FormGroup>
                  </div>
                  {form.zone_type === "custom" && (
                    <FormGroup label="Custom Type Name *" hint="Aap ka apna type — jaise 'Mandir', 'Cricket Stadium', 'Film City'">
                      <input
                        className="gm-input"
                        value={form.custom_type_label}
                        onChange={e => setForm(f => ({ ...f, custom_type_label: e.target.value }))}
                        placeholder="e.g. Mandir, Film City, Cricket Stadium"
                      />
                    </FormGroup>
                  )}
                  <FormGroup label="City *">
                    <select
                      className="gm-input"
                      value={form.city_id}
                      onChange={e => setForm(f => ({ ...f, city_id: e.target.value }))}
                      disabled={!isNew}
                    >
                      <option value="">— Select city —</option>
                      {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="Resolve Priority" hint="Lower = more specific (default 100)">
                    <input
                      className="gm-input"
                      type="number" min={0} max={999}
                      value={form.resolve_priority}
                      onChange={e => setForm(f => ({ ...f, resolve_priority: e.target.value }))}
                    />
                  </FormGroup>
                </div>
              </Card>

              {/* Boundary + area card */}
              <Card>
                <SectionHeader
                  icon={Hexagon}
                  title="Boundary"
                  right={
                    boundary && polygonCheck.valid && (
                      <span style={{ fontSize: 11, color: "#34D399", fontFamily: "Outfit,sans-serif", fontWeight: 600 }}>
                        ✓ {formatAreaLabel(polygonCheck.areaKm2)}
                      </span>
                    )
                  }
                />
                <div style={{ padding: 14 }}>
                  {!boundary ? (
                    <AlertBox type="info">
                      <span>Draw polygon on map using the tool at top-right</span>
                    </AlertBox>
                  ) : polygonCheck.valid ? (
                    <AlertBox type="success">
                      <span>Polygon valid — area {formatAreaLabel(polygonCheck.areaKm2)}</span>
                    </AlertBox>
                  ) : (
                    <AlertBox type="error">
                      <span>{polygonCheck.error}</span>
                    </AlertBox>
                  )}
                </div>
              </Card>

              {/* Optional points card */}
              <Card>
                <SectionHeader icon={MapPin} title="Optional Points"/>
                <div style={{ padding: 14 }}>
                  <FormGroup label="Center (lat, lng)" hint="Zone center — used for map display / distance calc">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <input className="gm-input" placeholder="Latitude" value={form.center_lat}
                        onChange={e => setForm(f => ({ ...f, center_lat: e.target.value }))}/>
                      <input className="gm-input" placeholder="Longitude" value={form.center_lng}
                        onChange={e => setForm(f => ({ ...f, center_lng: e.target.value }))}/>
                    </div>
                  </FormGroup>
                  <FormGroup label="Staging Area (lat, lng)" hint="Driver wait zone — optional">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <input className="gm-input" placeholder="Latitude" value={form.staging_lat}
                        onChange={e => setForm(f => ({ ...f, staging_lat: e.target.value }))}/>
                      <input className="gm-input" placeholder="Longitude" value={form.staging_lng}
                        onChange={e => setForm(f => ({ ...f, staging_lng: e.target.value }))}/>
                    </div>
                  </FormGroup>
                </div>
              </Card>

              {/* Test coord */}
              {!isNew && <TestCoordPanel zoneId={id} expectedCode={form.zone_code} onResult={setTestPoint}/>}
            </>
          )}

          {activeTab === "vehicles" && (
            isNew ? <SaveFirstNotice icon={Car} title="Vehicle Configs" note="Save the zone as draft first, then configure vehicles."/> :
            <VehicleConfigsPanel
              zoneId={id}
              zoneType={form.zone_type}
              onSaved={loadZone}
            />
          )}
          {activeTab === "exits" && (
            isNew ? <SaveFirstNotice icon={DoorOpen} title="Exit Gates" note="Save the zone as draft first, then add exit gates."/> :
            <ExitsPanel zoneId={id} onChange={refreshExits}/>
          )}
          {activeTab === "corridors" && (
            isNew ? <SaveFirstNotice icon={Route} title="Fixed Corridors" note="Save the zone as draft first, then add corridors."/> :
            <CorridorsPanel zoneId={id}/>
          )}
        </div>

        {/* RIGHT — map */}
        <div className="zone-editor-map" style={{
          position: "sticky", top: 16,
          height: "calc(100vh - 130px)",
          minHeight: 560,
        }}>
          <ZoneMap
            boundary={boundary}
            onBoundaryChange={setBoundary}
            center={centerMarker}
            staging={stagingMarker}
            testPoint={testPoint}
            cityCenter={cityCenter}
            exits={exits}
            otherZones={otherZones}
          />
        </div>
      </div>

      {/* ── Confirmation modals ────────────────────────────────────────────── */}
      <Modal open={confirmAction === "activate"} onClose={() => setConfirmAction(null)} title="Activate Zone">
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "Outfit,sans-serif", lineHeight: 1.6 }}>
          <p style={{ marginTop: 0 }}>
            You are about to activate zone <strong style={{ color: "#D4AF37" }}>{form.zone_code}</strong>.
          </p>
          <AlertBox type="warning">
            This zone will go <strong>LIVE</strong> and start resolving rider ride requests immediately.
          </AlertBox>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            Backend will validate: polygon exists, vehicle configs added. If validation fails, activation will be blocked.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button className="btn-outline" onClick={() => setConfirmAction(null)}>Cancel</button>
            <button className="btn-success" onClick={runActivate} disabled={saving}>
              {saving ? "Activating…" : "Yes, Activate"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={confirmAction === "deactivate"} onClose={() => setConfirmAction(null)} title="Deactivate Zone">
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "Outfit,sans-serif", lineHeight: 1.6 }}>
          <p style={{ marginTop: 0 }}>
            Deactivate zone <strong style={{ color: "#D4AF37" }}>{form.zone_code}</strong>?
          </p>
          <AlertBox type="warning">
            No new rides will resolve to this zone. Historical rides intact. Lifecycle → <strong>deprecated</strong>.
          </AlertBox>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button className="btn-outline" onClick={() => setConfirmAction(null)}>Cancel</button>
            <button className="btn-danger" onClick={runDeactivate} disabled={saving}>
              {saving ? "Deactivating…" : "Yes, Deactivate"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={confirmAction === "delete"} onClose={() => { setConfirmAction(null); setDeleteConfirmText(""); }} title="Delete Zone">
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "Outfit,sans-serif", lineHeight: 1.6 }}>
          <AlertBox type="error">
            This will permanently delete zone <strong>{form.zone_code}</strong>. Only draft zones can be deleted.
          </AlertBox>
          <FormGroup label={`Type "${form.zone_code}" to confirm`}>
            <input
              className="gm-input"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={form.zone_code}
            />
          </FormGroup>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button className="btn-outline" onClick={() => { setConfirmAction(null); setDeleteConfirmText(""); }}>Cancel</button>
            <button
              className="btn-danger"
              onClick={runDelete}
              disabled={saving || deleteConfirmText !== form.zone_code}
            >
              {saving ? "Deleting…" : "Delete Permanently"}
            </button>
          </div>
        </div>
      </Modal>

      <GlobalStyles/>
    </div>
  );
}

export default function ZoneEditorPage() {
  return (
    <ToastProvider>
      <ZoneEditorContent/>
    </ToastProvider>
  );
}
