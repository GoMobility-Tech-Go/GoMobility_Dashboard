import { useState, useEffect, useCallback } from "react";
import {
  useToast, ToastProvider, PageWrapper, Modal, FormGroup,
  Toggle, GlobalStyles, Card, AlertBox,
} from "../../components/ui/index.jsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { MapPin, Plus, Edit3, RefreshCw, Loader, Search, Upload, Navigation, BarChart2, Users, Car, TrendingUp } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  getCities, getCityDetail, getCityStats,
  createCity, updateCity, toggleCityVehicle,
  setCityEnforcement, resolveCity,
} from "../../api/admin";

const VEHICLE_TYPES = ["AUTO", "BIKE", "CAR", "TEMPO", "TRUCK"];

const ChartTooltip = ({ active, payload, label, prefix = "", suffix = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(4,8,26,0.97)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: "#D4AF37", fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "rgba(255,255,255,0.8)" }}>{prefix}{p.value?.toLocaleString("en-IN")}{suffix}</div>
      ))}
    </div>
  );
};
const VEHICLE_COLORS = { AUTO: "#D4AF37", BIKE: "#60A5FA", CAR: "#34D399", TEMPO: "#A78BFA", TRUCK: "#F59E0B" };
const EMPTY_CITY = { name: "", state_id: "", center_latitude: "", center_longitude: "" };

// ─── Custom marker icon ───────────────────────────────────────────────────────
const makeIcon = (color, selected) => L.divIcon({
  className: "",
  html: `<div style="width:${selected?20:14}px;height:${selected?20:14}px;background:${color};border:2.5px solid ${selected?"#fff":"rgba(255,255,255,0.6)"};border-radius:50%;box-shadow:0 0 ${selected?18:8}px ${color};transition:all .2s;${selected?"transform:scale(1.25);":""}"></div>`,
  iconSize: [selected?20:14, selected?20:14],
  iconAnchor: [selected?10:7, selected?10:7],
  popupAnchor: [0, -12],
});

// ─── Fly to city on select ────────────────────────────────────────────────────
function MapFlyTo({ city }) {
  const map = useMap();
  useEffect(() => {
    if (city?.center_latitude && city?.center_longitude)
      map.flyTo([parseFloat(city.center_latitude), parseFloat(city.center_longitude)], 10, { duration: 1.2 });
  }, [city, map]);
  return null;
}

// ─── Leaflet Map ──────────────────────────────────────────────────────────────
function IndiaMap({ cities, selCity, onCityClick, boundaries }) {
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 14, overflow: "hidden" }}>
      <style>{`
        .leaflet-container { background:#0a0f1e !important; font-family:Outfit,sans-serif; }
        .leaflet-popup-content-wrapper { background:rgba(4,8,26,0.97)!important; border:1px solid rgba(212,175,55,0.3)!important; border-radius:12px!important; box-shadow:0 8px 32px rgba(0,0,0,0.6)!important; color:#fff!important; backdrop-filter:blur(12px); }
        .leaflet-popup-tip { background:rgba(4,8,26,0.97)!important; }
        .leaflet-popup-close-button { color:rgba(255,255,255,0.5)!important; font-size:16px!important; }
        .leaflet-control-zoom a { background:rgba(4,8,26,0.9)!important; border-color:rgba(212,175,55,0.2)!important; color:#D4AF37!important; }
        .leaflet-control-zoom a:hover { background:rgba(212,175,55,0.15)!important; }
        .leaflet-control-attribution { background:rgba(0,0,0,0.5)!important; color:rgba(255,255,255,0.3)!important; font-size:9px!important; }
        .leaflet-control-attribution a { color:rgba(255,255,255,0.4)!important; }
      `}</style>
      <MapContainer center={[22.5, 80]} zoom={5} style={{ width: "100%", height: "100%" }} scrollWheelZoom>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd" maxZoom={19}
        />
        <MapFlyTo city={selCity} />

        {/* Boundary polygons */}
        {Object.entries(boundaries).map(([cityId, geoJson]) => {
          if (!geoJson) return null;
          const isSelected = selCity?.id === parseInt(cityId);
          return (
            <GeoJSON
              key={`boundary-${cityId}-${isSelected}`}
              data={geoJson}
              style={{
                color: isSelected ? "#D4AF37" : "#34D399",
                weight: isSelected ? 2.5 : 1.5,
                opacity: isSelected ? 0.9 : 0.5,
                fillColor: isSelected ? "#D4AF37" : "#34D399",
                fillOpacity: isSelected ? 0.1 : 0.06,
              }}
            />
          );
        })}

        {/* City center markers */}
        {cities.map((c) => {
          if (!c.center_latitude || !c.center_longitude) return null;
          const isSel = selCity?.id === c.id;
          return (
            <Marker
              key={c.id}
              position={[parseFloat(c.center_latitude), parseFloat(c.center_longitude)]}
              icon={makeIcon(isSel ? "#D4AF37" : "#34D399", isSel)}
              eventHandlers={{ click: () => onCityClick(c) }}
            >
              <Popup>
                <div style={{ minWidth: 190, padding: "4px 2px" }}>
                  <div style={{ fontFamily: "Cinzel,serif", fontSize: 15, fontWeight: 700, color: "#D4AF37", marginBottom: 3 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>{c.state_name}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                    {Object.entries(c.vehicle_matrix || {}).filter(([, v]) => v).map(([vt]) => (
                      <span key={vt} style={{ padding: "2px 7px", borderRadius: 100, fontSize: 10, fontWeight: 700, background: `${VEHICLE_COLORS[vt]}20`, color: VEHICLE_COLORS[vt], border: `1px solid ${VEHICLE_COLORS[vt]}40` }}>{vt}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                    {parseFloat(c.center_latitude).toFixed(4)}°N, {parseFloat(c.center_longitude).toFixed(4)}°E
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

// ─── Vehicle Matrix ───────────────────────────────────────────────────────────
function VehicleMatrix({ city, onToggle, toggling }) {
  const matrix = city.vehicle_matrix || {};
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
      {VEHICLE_TYPES.map((vt) => {
        const enabled = matrix[vt] === true;
        const color = VEHICLE_COLORS[vt];
        const isLoading = toggling === `${city.id}-${vt}`;
        return (
          <button key={vt} disabled={isLoading} onClick={() => onToggle(city.id, vt, !enabled)}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 11px", borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: isLoading ? "wait" : "pointer", background: enabled ? `${color}18` : "rgba(255,255,255,0.04)", border: `1px solid ${enabled ? color + "40" : "rgba(255,255,255,0.12)"}`, color: enabled ? color : "rgba(255,255,255,0.3)", transition: "all .2s" }}>
            {isLoading ? <Loader size={9} style={{ animation: "spin 1s linear infinite" }} /> : <span style={{ width: 6, height: 6, borderRadius: "50%", background: enabled ? color : "rgba(255,255,255,0.2)", display: "inline-block" }} />}
            {vt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Custom Chart Tooltip ─────────────────────────────────────────────────────

// ─── Main Page ────────────────────────────────────────────────────────────────
function CityPage() {
  const toast = useToast();

  const [cities, setCities]           = useState([]);
  const [selCity, setSelCity]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [reloading, setReloading]     = useState(false);
  const [toggling, setToggling]       = useState(null);
  const [enforcement, setEnforcement] = useState(false);
  const [enfLoading, setEnfLoading]   = useState(false);

  // Boundaries: { [cityId]: GeoJSON | null }
  const [boundaries, setBoundaries]   = useState({});

  // Per-city stats (selected city)
  const [cityStats, setCityStats]     = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  // All active cities stats for analytics
  const [allStats, setAllStats]       = useState([]);
  const [allStatsLoading, setAllStatsLoading] = useState(false);

  // Search/filter
  const [search, setSearch]           = useState("");
  const [showAll, setShowAll]         = useState(false);

  // Modals
  const [addModal, setAddModal]       = useState(false);
  const [editModal, setEditModal]     = useState(false);
  const [editCity, setEditCity]       = useState(null);
  const [resolveModal, setResolveModal] = useState(false);
  const [nc, setNc]                   = useState(EMPTY_CITY);
  const [saving, setSaving]           = useState(false);

  // GeoJSON upload for edit
  const [uploadedGeoJson, setUploadedGeoJson] = useState(null);
  const [uploadError, setUploadError] = useState("");

  // Resolve debug
  const [resolveLat, setResolveLat]   = useState("");
  const [resolveLng, setResolveLng]   = useState("");
  const [resolveResult, setResolveResult] = useState(null);
  const [resolveLoading, setResolveLoading] = useState(false);

  const fetchCities = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setReloading(true);
    try {
      const res = await getCities();
      const data = res.data?.data || res.data || [];
      setCities(data);
      if (data.length > 0 && !selCity) setSelCity(data[0]);
      if (silent) toast("Cities refreshed", "success");
      // Load boundaries for active cities
      const activeCities = data.filter((c) => c.is_active && c.has_boundary);
      activeCities.forEach(async (c) => {
        try {
          const r = await getCityDetail(c.id);
          const detail = r.data?.data || r.data;
          if (detail?.boundary_geojson)
            setBoundaries((prev) => ({ ...prev, [c.id]: detail.boundary_geojson }));
        } catch {}
      });
      // Fetch stats for all active cities
      const active = data.filter((c) => c.is_active);
      if (active.length > 0) {
        setAllStatsLoading(true);
        try {
          const results = await Promise.allSettled(active.map((c) => getCityStats(c.id)));
          const statsData = results
            .map((r, i) => r.status === "fulfilled" ? { ...( r.value?.data?.data || r.value?.data), city_name: active[i].name } : null)
            .filter(Boolean);
          setAllStats(statsData);
        } catch {}
        finally { setAllStatsLoading(false); }
      }
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load cities", "error");
    } finally {
      setLoading(false);
      setReloading(false);
    }
  }, []);

  useEffect(() => { fetchCities(); }, [fetchCities]);

  // Fetch stats when city selected
  useEffect(() => {
    if (!selCity) return;
    setStatsLoading(true);
    setCityStats(null);
    getCityStats(selCity.id)
      .then((r) => setCityStats(r.data?.data || r.data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [selCity?.id]);

  const handleSelectCity = (city) => {
    setSelCity(city);
    // Load boundary if not loaded yet
    if (city.has_boundary && !boundaries[city.id]) {
      getCityDetail(city.id)
        .then((r) => {
          const detail = r.data?.data || r.data;
          if (detail?.boundary_geojson)
            setBoundaries((prev) => ({ ...prev, [city.id]: detail.boundary_geojson }));
        }).catch(() => {});
    }
  };

  const handleToggleActive = async (city) => {
    if (!city.has_boundary && !city.is_active) {
      toast("Cannot activate — no boundary polygon set", "error"); return;
    }
    try {
      const res = await updateCity(city.id, { is_active: !city.is_active });
      const updated = res.data?.data || res.data;
      setCities((prev) => prev.map((c) => c.id === city.id ? { ...c, ...updated } : c));
      if (selCity?.id === city.id) setSelCity((prev) => ({ ...prev, ...updated }));
      toast(`${city.name} ${city.is_active ? "deactivated" : "activated"}`, city.is_active ? "error" : "success");
    } catch (err) { toast(err.response?.data?.message || "Failed to update city", "error"); }
  };

  const handleVehicleToggle = async (cityId, vehicleType, isEnabled) => {
    setToggling(`${cityId}-${vehicleType}`);
    try {
      const res = await toggleCityVehicle(cityId, vehicleType, isEnabled);
      const updated = res.data?.data || res.data;
      setCities((prev) => prev.map((c) => c.id === cityId ? { ...c, ...updated } : c));
      if (selCity?.id === cityId) setSelCity((prev) => ({ ...prev, ...updated }));
      toast(`${vehicleType} ${isEnabled ? "enabled" : "disabled"}`, isEnabled ? "success" : "error");
    } catch (err) { toast(err.response?.data?.message || "Failed to update vehicle", "error"); }
    finally { setToggling(null); }
  };

  const handleEnforcementToggle = async (val) => {
    setEnfLoading(true);
    try {
      await setCityEnforcement(val);
      setEnforcement(val);
      toast(`Enforcement ${val ? "enabled" : "disabled"}`, val ? "success" : "error");
    } catch (err) { toast(err.response?.data?.message || "Failed", "error"); }
    finally { setEnfLoading(false); }
  };

  const handleAddCity = async () => {
    if (!nc.name || !nc.state_id) { toast("City name and State ID required", "error"); return; }
    setSaving(true);
    try {
      const res = await createCity({
        name: nc.name.trim(), state_id: parseInt(nc.state_id),
        center_latitude:  nc.center_latitude  ? parseFloat(nc.center_latitude)  : undefined,
        center_longitude: nc.center_longitude ? parseFloat(nc.center_longitude) : undefined,
        is_active: false,
      });
      const created = res.data?.data || res.data;
      setCities((prev) => [...prev, created]);
      toast(`${nc.name} added`, "success");
      setAddModal(false); setNc(EMPTY_CITY);
    } catch (err) { toast(err.response?.data?.message || "Failed to create city", "error"); }
    finally { setSaving(false); }
  };

  const handleEditCity = async () => {
    if (!editCity?.name) { toast("City name required", "error"); return; }
    setSaving(true);
    try {
      const patch = {
        name:             editCity.name,
        center_latitude:  editCity.center_latitude  ? parseFloat(editCity.center_latitude)  : undefined,
        center_longitude: editCity.center_longitude ? parseFloat(editCity.center_longitude) : undefined,
        fallback_radius_km: editCity.fallback_radius_km ? parseFloat(editCity.fallback_radius_km) : undefined,
        resolve_priority:   editCity.resolve_priority   ? parseInt(editCity.resolve_priority)     : undefined,
      };
      if (uploadedGeoJson) patch.boundary = uploadedGeoJson;
      const res = await updateCity(editCity.id, patch);
      const updated = res.data?.data || res.data;
      setCities((prev) => prev.map((c) => c.id === editCity.id ? { ...c, ...updated } : c));
      if (selCity?.id === editCity.id) setSelCity((prev) => ({ ...prev, ...updated }));
      if (uploadedGeoJson) setBoundaries((prev) => ({ ...prev, [editCity.id]: uploadedGeoJson }));
      toast("City updated", "success");
      setEditModal(false); setUploadedGeoJson(null); setUploadError("");
    } catch (err) { toast(err.response?.data?.message || "Failed to update", "error"); }
    finally { setSaving(false); }
  };

  const handleGeoJsonUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const geo = parsed.type === "FeatureCollection" ? parsed.features[0]?.geometry
                  : parsed.type === "Feature"           ? parsed.geometry
                  : parsed;
        if (!geo?.type || !["Polygon","MultiPolygon"].includes(geo.type)) {
          setUploadError("File must be a Polygon or MultiPolygon GeoJSON"); return;
        }
        setUploadedGeoJson(geo);
      } catch { setUploadError("Invalid JSON file"); }
    };
    reader.readAsText(file);
  };

  const handleResolve = async () => {
    const lat = parseFloat(resolveLat), lng = parseFloat(resolveLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { toast("Enter valid lat/lng", "error"); return; }
    setResolveLoading(true); setResolveResult(null);
    try {
      const res = await resolveCity(lat, lng);
      setResolveResult(res.data?.data || res.data);
    } catch (err) { toast(err.response?.data?.message || "Resolve failed", "error"); }
    finally { setResolveLoading(false); }
  };

  const activeCities   = cities.filter((c) => c.is_active);
  const inactiveCities = cities.filter((c) => !c.is_active);

  const filteredActive = search
    ? activeCities.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.state_name?.toLowerCase().includes(search.toLowerCase()))
    : activeCities;

  const displayCities = showAll
    ? (search ? cities.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.state_name?.toLowerCase().includes(search.toLowerCase())) : cities)
    : filteredActive;

  const stateOptions = [...new Map(cities.map((c) => [c.state_id, { id: c.state_id, name: c.state_name }])).values()].sort((a, b) => a.name.localeCompare(b.name));

  if (loading) {
    return (
      <PageWrapper title="City Management" subtitle="Loading...">
        <GlobalStyles />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300, color: "rgba(255,255,255,0.3)", gap: 10 }}>
          <Loader size={20} style={{ animation: "spin 1s linear infinite" }} /> Loading cities...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="City Management"
      subtitle="Manage cities, vehicle availability and geo-enforcement"
      actions={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Toggle checked={enforcement} onChange={handleEnforcementToggle} label={enfLoading ? "Saving…" : "Enforcement"} />
          <button className="btn-outline btn-sm" onClick={() => setResolveModal(true)} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Navigation size={13} /> Resolve Debug
          </button>
          <button className="btn-outline btn-sm" onClick={() => fetchCities(true)} disabled={reloading} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <RefreshCw size={13} style={reloading ? { animation: "spin 1s linear infinite" } : {}} />
            {reloading ? "Refreshing…" : "Reload"}
          </button>
          <button className="btn-gold btn-sm" onClick={() => setAddModal(true)} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Plus size={13} /> Add City
          </button>
        </div>
      }
    >
      <GlobalStyles />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Stats Strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Total Cities",  value: cities.length,                           color: "#D4AF37", icon: "🏙️" },
          { label: "Active",        value: activeCities.length,                     color: "#34D399", icon: "✅" },
          { label: "Inactive",      value: inactiveCities.length,                   color: "#60A5FA", icon: "📍" },
          { label: "With Boundary", value: cities.filter((c) => c.has_boundary).length, color: "#A78BFA", icon: "🗺️" },
          { label: "No Boundary",   value: cities.filter((c) => !c.has_boundary).length, color: "#F59E0B", icon: "⚠️" },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Search Bar ── */}
      <div style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
          <input
            className="gm-input"
            style={{ paddingLeft: 36, width: "100%", boxSizing: "border-box" }}
            placeholder="Search cities or states…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowAll((v) => !v)}
          style={{ background: showAll ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${showAll ? "rgba(212,175,55,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, color: showAll ? "#D4AF37" : "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: "8px 14px", fontFamily: "Outfit,sans-serif", whiteSpace: "nowrap" }}
        >
          {showAll ? `Active Only (${activeCities.length})` : `Show All (${cities.length})`}
        </button>
      </div>

      {/* ── Map + City List ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 16, marginBottom: 18 }}>

        {/* Map */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(212,175,55,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={15} color="#D4AF37" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
              India Map{selCity ? ` — ${selCity.name}` : ""}
            </span>
            {selCity?.has_boundary && boundaries[selCity.id] && (
              <span style={{ marginLeft: "auto", fontSize: 10, color: "#34D399", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.24)", borderRadius: 100, padding: "2px 8px" }}>✓ Boundary visible</span>
            )}
          </div>
          <div style={{ height: 520 }}>
            <IndiaMap cities={filteredActive} selCity={selCity} onCityClick={handleSelectCity} boundaries={boundaries} />
          </div>
          <div style={{ padding: "9px 18px", borderTop: "1px solid rgba(212,175,55,0.08)", display: "flex", gap: 14, flexWrap: "wrap" }}>
            {[{ c: "#34D399", l: "Active" }, { c: "#D4AF37", l: "Selected" }, { c: "rgba(52,211,153,0.3)", l: "Boundary" }].map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: it.c }} /> {it.l}
              </div>
            ))}
            <div style={{ marginLeft: "auto", fontSize: 10.5, color: "rgba(255,255,255,0.3)" }}>Click pin to select · Scroll to zoom</div>
          </div>
        </Card>

        {/* City List */}
        <Card style={{ overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: 610 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(212,175,55,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
              {showAll ? `All Cities (${displayCities.length})` : `Active (${displayCities.length})`}
            </span>
            <div style={{ display: "flex", gap: 5 }}>
              <span style={{ display: "inline-flex", padding: "2px 7px", borderRadius: 100, fontSize: 10, fontWeight: 600, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.24)", color: "#34D399" }}>{activeCities.length} Live</span>
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {displayCities.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🏙️</div>
                {search ? "No cities match search" : "No active cities"}
              </div>
            )}
            {displayCities.map((city) => (
              <div key={city.id} onClick={() => handleSelectCity(city)}
                style={{ padding: "11px 14px", borderBottom: "1px solid rgba(212,175,55,0.07)", cursor: "pointer", background: selCity?.id === city.id ? "rgba(212,175,55,0.06)" : "transparent", transition: "all .2s", display: "flex", alignItems: "center", gap: 10 }}
                onMouseEnter={(e) => { if (selCity?.id !== city.id) e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                onMouseLeave={(e) => { if (selCity?.id !== city.id) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: city.is_active ? "#34D399" : "#60A5FA", flexShrink: 0, boxShadow: city.is_active ? "0 0 5px rgba(52,211,153,0.6)" : "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: selCity?.id === city.id ? "#D4AF37" : "rgba(255,255,255,0.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{city.name}</div>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", flexShrink: 0, marginLeft: 6 }}>{city.state_name}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 2, fontSize: 10 }}>
                    {!city.has_boundary && <span style={{ color: "#F59E0B" }}>⚠ No boundary</span>}
                    {city.center_latitude && <span style={{ color: "rgba(255,255,255,0.3)" }}>{parseFloat(city.center_latitude).toFixed(2)}°N</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                  <button onClick={(e) => { e.stopPropagation(); setEditCity({ ...city }); setUploadedGeoJson(null); setUploadError(""); setEditModal(true); }}
                    style={{ background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 6, color: "#D4AF37", width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Edit3 size={10} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleToggleActive(city); }}
                    style={{ background: city.is_active ? "rgba(248,113,113,0.08)" : "rgba(52,211,153,0.08)", border: `1px solid ${city.is_active ? "rgba(248,113,113,0.28)" : "rgba(52,211,153,0.28)"}`, borderRadius: 6, color: city.is_active ? "#F87171" : "#34D399", fontSize: 10, fontWeight: 600, cursor: "pointer", padding: "3px 7px", whiteSpace: "nowrap", fontFamily: "Outfit,sans-serif" }}>
                    {city.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Selected City Detail + Stats ── */}
      {selCity && (
        <Card style={{ marginBottom: 18, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
            <div>
              <div style={{ fontFamily: "Cinzel,serif", fontSize: 18, fontWeight: 700, color: "#D4AF37" }}>{selCity.name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
                {selCity.state_name} &nbsp;·&nbsp;
                {selCity.center_latitude ? `${parseFloat(selCity.center_latitude).toFixed(4)}°N, ${parseFloat(selCity.center_longitude).toFixed(4)}°E` : "No coords"}
                &nbsp;·&nbsp; Priority: {selCity.resolve_priority} &nbsp;·&nbsp; Fallback: {selCity.fallback_radius_km}km
                &nbsp;·&nbsp; {selCity.has_boundary ? <span style={{ color: "#34D399" }}>✓ Boundary set</span> : <span style={{ color: "#F59E0B" }}>⚠ No boundary</span>}
              </div>
            </div>
            <span style={{ display: "inline-flex", padding: "5px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, background: selCity.is_active ? "rgba(52,211,153,0.1)" : "rgba(96,165,250,0.1)", border: `1px solid ${selCity.is_active ? "rgba(52,211,153,0.3)" : "rgba(96,165,250,0.3)"}`, color: selCity.is_active ? "#34D399" : "#60A5FA" }}>
              {selCity.is_active ? "● Active" : "○ Inactive"}
            </span>
          </div>

          {!selCity.has_boundary && (
            <AlertBox type="warning" style={{ marginBottom: 12 }}>
              No boundary polygon — city cannot be activated. Upload GeoJSON via Edit button.
            </AlertBox>
          )}

          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Vehicle Availability</div>
          <VehicleMatrix city={selCity} onToggle={handleVehicleToggle} toggling={toggling} />

          {/* City live stats */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(212,175,55,0.08)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Live Stats — {selCity.name}</div>
            {statsLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                <Loader size={12} style={{ animation: "spin 1s linear infinite" }} /> Loading stats…
              </div>
            ) : cityStats ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 10 }}>
                {[
                  { label: "Available Drivers", value: cityStats.active_drivers,  color: "#34D399", icon: <Users size={14} /> },
                  { label: "On Duty",           value: cityStats.on_duty_drivers, color: "#D4AF37", icon: <Car size={14} /> },
                  { label: "Ongoing Rides",     value: cityStats.ongoing_rides,   color: "#60A5FA", icon: <Navigation size={14} /> },
                  { label: "Rides Today",       value: cityStats.rides_today,     color: "#A78BFA", icon: <BarChart2 size={14} /> },
                  { label: "Revenue Today",     value: `₹${Number(cityStats.revenue_today).toLocaleString("en-IN")}`, color: "#F59E0B", icon: <TrendingUp size={14} /> },
                ].map((s, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${s.color}22`, borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: s.color, marginBottom: 6 }}>{s.icon}<span style={{ fontSize: 10, fontWeight: 600 }}>{s.label}</span></div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      )}

      {/* ── Analytics Section ── */}
      {allStats.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart2 size={15} color="#D4AF37" /> City Analytics — All Active Cities
            {allStatsLoading && <Loader size={12} style={{ animation: "spin 1s linear infinite", color: "rgba(255,255,255,0.3)" }} />}
          </div>

          {/* Total across all cities */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Total Active Drivers", value: allStats.reduce((s, c) => s + (c.active_drivers || 0), 0), color: "#34D399", icon: <Users size={16} /> },
              { label: "Total On Duty",        value: allStats.reduce((s, c) => s + (c.on_duty_drivers || 0), 0), color: "#D4AF37", icon: <Car size={16} /> },
              { label: "Ongoing Rides",        value: allStats.reduce((s, c) => s + (c.ongoing_rides || 0), 0),  color: "#60A5FA", icon: <Navigation size={16} /> },
              { label: "Total Rides Today",    value: allStats.reduce((s, c) => s + (c.rides_today || 0), 0),    color: "#A78BFA", icon: <BarChart2 size={16} /> },
              { label: "Revenue Today",        value: `₹${allStats.reduce((s, c) => s + (Number(c.revenue_today) || 0), 0).toLocaleString("en-IN")}`, color: "#F59E0B", icon: <TrendingUp size={16} /> },
            ].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${s.color}22`, borderRadius: 14, padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: s.color, marginBottom: 8 }}>{s.icon}<span style={{ fontSize: 11, fontWeight: 600 }}>{s.label}</span></div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            {/* Drivers per city */}
            <Card style={{ padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <Users size={13} color="#34D399" /> Drivers per City
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={allStats} barCategoryGap="30%">
                  <XAxis dataKey="city_name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<ChartTooltip suffix=" drivers" />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="active_drivers" name="Available" radius={[4,4,0,0]}>
                    {allStats.map((_, i) => <Cell key={i} fill="#34D399" opacity={0.8} />)}
                  </Bar>
                  <Bar dataKey="on_duty_drivers" name="On Duty" radius={[4,4,0,0]}>
                    {allStats.map((_, i) => <Cell key={i} fill="#D4AF37" opacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8 }}>
                {[{ c: "#34D399", l: "Available" }, { c: "#D4AF37", l: "On Duty" }].map((it, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: it.c }} /> {it.l}
                  </div>
                ))}
              </div>
            </Card>

            {/* Rides & Revenue per city */}
            <Card style={{ padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <TrendingUp size={13} color="#F59E0B" /> Rides & Revenue Today
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={allStats} barCategoryGap="30%">
                  <XAxis dataKey="city_name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="rides_today" name="Rides" radius={[4,4,0,0]}>
                    {allStats.map((_, i) => <Cell key={i} fill="#60A5FA" opacity={0.8} />)}
                  </Bar>
                  <Bar dataKey="ongoing_rides" name="Ongoing" radius={[4,4,0,0]}>
                    {allStats.map((_, i) => <Cell key={i} fill="#A78BFA" opacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8 }}>
                {[{ c: "#60A5FA", l: "Rides Today" }, { c: "#A78BFA", l: "Ongoing" }].map((it, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: it.c }} /> {it.l}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Cities Table ── */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(212,175,55,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
            {showAll ? `All Cities (${displayCities.length})` : `Active Cities (${displayCities.length})`}
            {search && <span style={{ marginLeft: 8, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>— filtered by "{search}"</span>}
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="gm-table">
            <thead>
              <tr><th>ID</th><th>City</th><th>State</th><th>Status</th><th>Boundary</th><th>Coordinates</th><th>Vehicles</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {displayCities.map((c) => {
                const enabledV = VEHICLE_TYPES.filter((vt) => c.vehicle_matrix?.[vt]);
                return (
                  <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => handleSelectCity(c)}>
                    <td style={{ fontFamily: "monospace", color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{c.id}</td>
                    <td style={{ fontWeight: 600, color: selCity?.id === c.id ? "#D4AF37" : "rgba(255,255,255,0.85)" }}>{c.name}</td>
                    <td style={{ color: "rgba(255,255,255,0.5)" }}>{c.state_name}</td>
                    <td>
                      <span style={{ display: "inline-flex", padding: "3px 8px", borderRadius: 100, fontSize: 10.5, fontWeight: 600, background: c.is_active ? "rgba(52,211,153,0.1)" : "rgba(96,165,250,0.1)", border: `1px solid ${c.is_active ? "rgba(52,211,153,0.28)" : "rgba(96,165,250,0.28)"}`, color: c.is_active ? "#34D399" : "#60A5FA" }}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{c.has_boundary ? <span style={{ color: "#34D399", fontSize: 11 }}>✓ Set</span> : <span style={{ color: "#F59E0B", fontSize: 11 }}>⚠ Missing</span>}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>
                      {c.center_latitude ? `${parseFloat(c.center_latitude).toFixed(3)}, ${parseFloat(c.center_longitude).toFixed(3)}` : "—"}
                    </td>
                    <td>
                      {enabledV.length === 0 ? <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>None</span>
                        : enabledV.map((vt) => (
                          <span key={vt} style={{ display: "inline-flex", padding: "2px 6px", borderRadius: 100, fontSize: 9.5, fontWeight: 700, background: `${VEHICLE_COLORS[vt]}14`, color: VEHICLE_COLORS[vt], border: `1px solid ${VEHICLE_COLORS[vt]}28`, marginRight: 3 }}>{vt}</span>
                        ))}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn-outline btn-xs" onClick={(e) => { e.stopPropagation(); setEditCity({ ...c }); setUploadedGeoJson(null); setUploadError(""); setEditModal(true); }}><Edit3 size={10} /></button>
                        <button className={c.is_active ? "btn-danger btn-xs" : "btn-outline btn-xs"} style={{ fontSize: 10 }} onClick={(e) => { e.stopPropagation(); handleToggleActive(c); }}>
                          {c.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Modal: Add City ── */}
      <Modal open={addModal} onClose={() => { setAddModal(false); setNc(EMPTY_CITY); }} title="🏙️ Add New City">
        <AlertBox type="info">New cities start as Inactive. Activate only after attaching a boundary polygon.</AlertBox>
        <FormGroup label="City Name *">
          <input className="gm-input" placeholder="e.g. Muzaffarpur" value={nc.name} onChange={(e) => setNc((p) => ({ ...p, name: e.target.value }))} />
        </FormGroup>
        <FormGroup label="State *">
          {stateOptions.length > 0
            ? <select className="gm-input" value={nc.state_id} onChange={(e) => setNc((p) => ({ ...p, state_id: e.target.value }))}>
                <option value="">Select state…</option>
                {stateOptions.map((s) => <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>)}
              </select>
            : <input className="gm-input" type="number" placeholder="State ID" value={nc.state_id} onChange={(e) => setNc((p) => ({ ...p, state_id: e.target.value }))} />}
        </FormGroup>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormGroup label="Latitude"><input className="gm-input" placeholder="26.1209" value={nc.center_latitude} onChange={(e) => setNc((p) => ({ ...p, center_latitude: e.target.value }))} /></FormGroup>
          <FormGroup label="Longitude"><input className="gm-input" placeholder="85.3647" value={nc.center_longitude} onChange={(e) => setNc((p) => ({ ...p, center_longitude: e.target.value }))} /></FormGroup>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-outline" onClick={() => { setAddModal(false); setNc(EMPTY_CITY); }}>Cancel</button>
          <button className="btn-gold" onClick={handleAddCity} disabled={saving}>{saving ? "Adding…" : "Add City"}</button>
        </div>
      </Modal>

      {/* ── Modal: Edit City ── */}
      {editCity && (
        <Modal open={editModal} onClose={() => { setEditModal(false); setUploadedGeoJson(null); setUploadError(""); }} title="✏️ Edit City">
          <FormGroup label="City Name">
            <input className="gm-input" value={editCity.name} onChange={(e) => setEditCity((p) => ({ ...p, name: e.target.value }))} />
          </FormGroup>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormGroup label="Center Latitude">
              <input className="gm-input" value={editCity.center_latitude || ""} onChange={(e) => setEditCity((p) => ({ ...p, center_latitude: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Center Longitude">
              <input className="gm-input" value={editCity.center_longitude || ""} onChange={(e) => setEditCity((p) => ({ ...p, center_longitude: e.target.value }))} />
            </FormGroup>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormGroup label="Fallback Radius (km)">
              <input type="number" className="gm-input" value={editCity.fallback_radius_km || ""} onChange={(e) => setEditCity((p) => ({ ...p, fallback_radius_km: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Resolve Priority">
              <input type="number" className="gm-input" value={editCity.resolve_priority || ""} onChange={(e) => setEditCity((p) => ({ ...p, resolve_priority: e.target.value }))} />
            </FormGroup>
          </div>

          {/* GeoJSON boundary upload */}
          <FormGroup label="Boundary GeoJSON" hint="Upload .geojson file — Polygon or MultiPolygon">
            <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: `1px dashed ${uploadedGeoJson ? "rgba(52,211,153,0.4)" : "rgba(212,175,55,0.25)"}`, borderRadius: 10, cursor: "pointer" }}>
              <Upload size={14} color={uploadedGeoJson ? "#34D399" : "#D4AF37"} />
              <span style={{ fontSize: 12, color: uploadedGeoJson ? "#34D399" : "rgba(255,255,255,0.5)" }}>
                {uploadedGeoJson ? "✓ GeoJSON loaded — will be saved" : "Click to upload .geojson file"}
              </span>
              <input type="file" accept=".geojson,.json" style={{ display: "none" }} onChange={handleGeoJsonUpload} />
            </label>
            {uploadError && <div style={{ fontSize: 11, color: "#F87171", marginTop: 5 }}>{uploadError}</div>}
            {!editCity.has_boundary && !uploadedGeoJson && (
              <div style={{ fontSize: 11, color: "#F59E0B", marginTop: 5 }}>⚠ No boundary — city cannot be activated until a GeoJSON is uploaded</div>
            )}
          </FormGroup>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-outline" onClick={() => { setEditModal(false); setUploadedGeoJson(null); setUploadError(""); }}>Cancel</button>
            <button className="btn-gold" onClick={handleEditCity} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Resolve Debug ── */}
      <Modal open={resolveModal} onClose={() => { setResolveModal(false); setResolveResult(null); setResolveLat(""); setResolveLng(""); }} title="🧭 Resolve Debug">
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>
          Enter coordinates to see which city they resolve to (polygon match → fallback → unresolved).
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <FormGroup label="Latitude">
            <input className="gm-input" placeholder="e.g. 28.6139" value={resolveLat} onChange={(e) => setResolveLat(e.target.value)} />
          </FormGroup>
          <FormGroup label="Longitude">
            <input className="gm-input" placeholder="e.g. 77.2090" value={resolveLng} onChange={(e) => setResolveLng(e.target.value)} />
          </FormGroup>
        </div>
        <button className="btn-gold" onClick={handleResolve} disabled={resolveLoading} style={{ width: "100%", marginBottom: 16 }}>
          {resolveLoading ? <><Loader size={13} style={{ animation: "spin 1s linear infinite", display: "inline", marginRight: 6 }} /> Resolving…</> : "Resolve City"}
        </button>

        {resolveResult && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 14, padding: 16 }}>
            {resolveResult.resolved ? (
              <>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Resolved City</div>
                <div style={{ fontFamily: "Cinzel,serif", fontSize: 18, fontWeight: 700, color: "#D4AF37", marginBottom: 4 }}>{resolveResult.resolved.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>{resolveResult.resolved.state_name}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.28)", color: "#60A5FA" }}>
                    Source: {resolveResult.source}
                  </span>
                  {resolveResult.distanceKm != null && (
                    <span style={{ padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.28)", color: "#D4AF37" }}>
                      Distance: {parseFloat(resolveResult.distanceKm).toFixed(2)} km
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(255,255,255,0.4)" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>❓</div>
                <div>Coordinates did not resolve to any city</div>
                <div style={{ fontSize: 11, marginTop: 4, color: "rgba(255,255,255,0.3)" }}>Outside all boundaries and fallback radius</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}

export default function CityManagementPage() {
  return <ToastProvider><CityPage /></ToastProvider>;
}
