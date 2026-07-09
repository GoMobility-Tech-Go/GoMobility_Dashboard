import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ToastProvider, useToast, PageWrapper, GlobalStyles, Card, AlertBox,
} from "../../components/ui/index.jsx";
import {
  Hexagon, RefreshCw, Loader, ArrowLeft, MapPin, Search as SearchIcon,
  Filter, ChevronRight, Layers, Eye, EyeOff,
} from "lucide-react";
import {
  listZonesForMap, ZONE_TYPES, ZONE_CATEGORIES, LIFECYCLE_STATES,
} from "../../api/zones";
import { getCities } from "../../api/admin";

// ── Color mapping ────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  airport:            "#D4AF37",
  railway_station:    "#60A5FA",
  metro_station:      "#38BDF8",
  bus_terminal:       "#22D3EE",
  tech_park:          "#A78BFA",
  mall:               "#EC4899",
  industrial_zone:    "#F97316",
  hospital:           "#F87171",
  tourist_place:      "#34D399",
  university:         "#8B5CF6",
  border_checkpoint:  "#F59E0B",
  event_venue:        "#FB7185",
  custom:             "#94A3B8",
};

const STATE_STYLE = {
  active:        { fillOpacity: 0.28, opacity: 1.0, weight: 2.5, dashArray: null   },
  configured:    { fillOpacity: 0.20, opacity: 0.9, weight: 2.0, dashArray: null   },
  polygon_drawn: { fillOpacity: 0.14, opacity: 0.7, weight: 1.8, dashArray: "6 4"  },
  draft:         { fillOpacity: 0.10, opacity: 0.6, weight: 1.6, dashArray: "3 4"  },
  deprecated:    { fillOpacity: 0.10, opacity: 0.5, weight: 1.4, dashArray: "3 6"  },
  archived:      { fillOpacity: 0.06, opacity: 0.4, weight: 1.2, dashArray: "3 6"  },
};

function styleForZone(z, isSelected) {
  const c = TYPE_COLORS[z.zone_type] || "#94A3B8";
  const s = STATE_STYLE[z.lifecycle_state] || STATE_STYLE.draft;
  return {
    color:       isSelected ? "#f7dc6f" : c,
    weight:      isSelected ? 4 : s.weight,
    opacity:     isSelected ? 1 : s.opacity,
    fillColor:   c,
    fillOpacity: isSelected ? 0.4 : s.fillOpacity,
    dashArray:   s.dashArray,
  };
}

// ── Fly to selected zone ────────────────────────────────────────────────────
function FlyToSelected({ zone }) {
  const map = useMap();
  useEffect(() => {
    if (!zone?.boundary_geojson) return;
    try {
      const layer = L.geoJSON(zone.boundary_geojson);
      const b = layer.getBounds();
      if (b.isValid()) map.flyToBounds(b, { padding: [60, 60], duration: 0.8, maxZoom: 15 });
    } catch {}
  }, [zone, map]);
  return null;
}

// ── Fit map to all zones on first load ───────────────────────────────────────
function FitAllZones({ zones, key: refitKey }) {
  const map = useMap();
  useEffect(() => {
    if (!zones?.length) return;
    try {
      const bounds = L.latLngBounds([]);
      zones.forEach(z => {
        if (z.boundary_geojson) {
          const b = L.geoJSON(z.boundary_geojson).getBounds();
          if (b.isValid()) bounds.extend(b);
        }
      });
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    } catch {}
  }, [refitKey]); // eslint-disable-line
  return null;
}

function ZonesMapContent() {
  const nav = useNavigate();
  const toast = useToast();

  const [zones, setZones]     = useState([]);
  const [cities, setCities]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [refitKey, setRefitKey] = useState(0);

  // Filters
  const [search, setSearch]     = useState("");
  const [zoneType, setZoneType] = useState("");
  const [cityId, setCityId]     = useState("");
  const [state, setState]       = useState("");
  const [activeOnly, setActiveOnly] = useState("");

  // Layer toggles
  const [showCenters, setShowCenters] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (zoneType)          params.zone_type       = zoneType;
      if (cityId)            params.city_id         = cityId;
      if (state)             params.lifecycle_state = state;
      if (activeOnly !== "") params.is_active       = activeOnly;
      if (search)            params.search          = search;
      const res = await listZonesForMap(params);
      const list = res.data?.data?.zones || [];
      setZones(list);
      setRefitKey(k => k + 1);
    } catch (e) {
      toast?.(e.response?.data?.message || "Failed to load zones map", "error");
    } finally { setLoading(false); }
  }, [zoneType, cityId, state, activeOnly, search, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getCities()
      .then(res => {
        const d = res.data?.data || res.data || {};
        setCities(d.cities || (Array.isArray(d) ? d : []));
      })
      .catch(() => setCities([]));
  }, []);

  // Stats
  const stats = useMemo(() => {
    const withBoundary = zones.filter(z => z.boundary_geojson).length;
    const active       = zones.filter(z => z.is_active).length;
    return { total: zones.length, withBoundary, active };
  }, [zones]);

  // Grouped by type for legend
  const typeCounts = useMemo(() => {
    const m = {};
    zones.forEach(z => { m[z.zone_type] = (m[z.zone_type] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [zones]);

  const zonesWithBoundary = zones.filter(z => z.boundary_geojson);

  return (
    <PageWrapper
      title="Zones Map"
      subtitle="All zones on a single map — click to inspect or edit"
      actions={
        <>
          <button className="btn-outline" onClick={() => nav("/zones")}>
            <ArrowLeft size={13}/> List View
          </button>
          <button className="btn-outline" onClick={load} disabled={loading}>
            <RefreshCw size={13} style={loading ? { animation: "gmSpin 1s linear infinite" } : {}}/> Refresh
          </button>
        </>
      }
    >
      <style>{`@keyframes gmSpin{to{transform:rotate(360deg)}}`}</style>

      {/* Filters */}
      <Card style={{ marginBottom: 14, padding: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 260 }}>
            <SearchIcon size={13} color="rgba(212,175,55,0.6)" style={{ position: "absolute", top: 11, left: 10 }}/>
            <input
              className="gm-input"
              style={{ paddingLeft: 30 }}
              placeholder="Search code or name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="gm-input" style={{ maxWidth: 150 }} value={zoneType} onChange={e => setZoneType(e.target.value)}>
            <option value="">All Types</option>
            {ZONE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className="gm-input" style={{ maxWidth: 150 }} value={cityId} onChange={e => setCityId(e.target.value)}>
            <option value="">All Cities</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="gm-input" style={{ maxWidth: 160 }} value={state} onChange={e => setState(e.target.value)}>
            <option value="">All States</option>
            {LIFECYCLE_STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="gm-input" style={{ maxWidth: 130 }} value={activeOnly} onChange={e => setActiveOnly(e.target.value)}>
            <option value="">All</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>

          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center", fontSize: 11.5, color: "rgba(255,255,255,0.55)", fontFamily: "Outfit,sans-serif" }}>
            <span><b style={{ color: "#D4AF37" }}>{stats.total}</b> zones</span>
            <span><b style={{ color: "#34D399" }}>{stats.active}</b> active</span>
            <span><b style={{ color: "#60A5FA" }}>{stats.withBoundary}</b> with polygon</span>
            <button
              onClick={() => setShowCenters(v => !v)}
              title="Toggle center markers"
              className="btn-outline btn-xs"
            >
              {showCenters ? <Eye size={11}/> : <EyeOff size={11}/>} Centers
            </button>
          </div>
        </div>
      </Card>

      {/* Split layout: sidebar list + map */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(260px, 320px) 1fr",
        gap: 14,
        height: "calc(100vh - 240px)",
        minHeight: 540,
      }}>
        {/* LEFT — zone list */}
        <Card style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(212,175,55,0.1)", display: "flex", alignItems: "center", gap: 6, fontFamily: "Cinzel,serif", fontSize: 12, fontWeight: 700, color: "#D4AF37" }}>
            <Layers size={12}/> {zones.length} Zone{zones.length === 1 ? "" : "s"}
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 30, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
                <Loader size={16} style={{ animation: "gmSpin 1s linear infinite" }}/>
                <div style={{ marginTop: 8, fontSize: 12 }}>Loading…</div>
              </div>
            ) : zones.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                No zones match filters
              </div>
            ) : zones.map(z => {
              const isSel = selected?.id === z.id;
              const color = TYPE_COLORS[z.zone_type] || "#94A3B8";
              return (
                <div
                  key={z.id}
                  onClick={() => setSelected(z)}
                  style={{
                    padding: "10px 14px", cursor: "pointer",
                    background: isSel ? "rgba(212,175,55,0.1)" : "transparent",
                    borderLeft: `3px solid ${isSel ? "#D4AF37" : "transparent"}`,
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    transition: "background .15s",
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0, border: "1px solid rgba(0,0,0,0.4)" }}/>
                    <span style={{ fontFamily: "monospace", fontSize: 11.5, fontWeight: 700, color: "#D4AF37" }}>{z.zone_code}</span>
                    {z.is_active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399", boxShadow: "0 0 6px rgba(52,211,153,0.6)" }}/>}
                  </div>
                  <div style={{ marginLeft: 18, fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "Outfit,sans-serif", marginTop: 2 }}>
                    {z.name}
                  </div>
                  <div style={{ marginLeft: 18, fontSize: 10.5, color: "rgba(255,255,255,0.4)", fontFamily: "Outfit,sans-serif", marginTop: 2, display: "flex", gap: 6, alignItems: "center" }}>
                    <MapPin size={9}/> {z.city_name || "—"}
                    <span style={{ marginLeft: 4, textTransform: "capitalize" }}>· {z.zone_type?.replace(/_/g, " ")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* RIGHT — big map */}
        <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(212,175,55,0.15)", position: "relative" }}>
          <style>{`
            .leaflet-container { background:#0a0f1e !important; font-family:Outfit,sans-serif; }
            .leaflet-popup-content-wrapper { background:rgba(4,8,26,0.97)!important; border:1px solid rgba(212,175,55,0.3)!important; border-radius:10px!important; color:#fff!important; }
            .leaflet-popup-tip { background:rgba(4,8,26,0.97)!important; }
            .leaflet-control-zoom a { background:rgba(4,8,26,0.9)!important; border-color:rgba(212,175,55,0.2)!important; color:#D4AF37!important; }
            .leaflet-control-attribution { background:rgba(0,0,0,0.5)!important; color:rgba(255,255,255,0.3)!important; font-size:9px!important; }
          `}</style>
          <MapContainer center={[22.5, 80]} zoom={5} style={{ width: "100%", height: "100%" }} scrollWheelZoom>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OSM &copy; CARTO'
              subdomains="abcd"
              maxZoom={19}
            />
            <FitAllZones zones={zonesWithBoundary} key={refitKey}/>
            <FlyToSelected zone={selected}/>

            {/* Polygons */}
            {zonesWithBoundary.map(z => (
              <GeoJSON
                key={`${z.id}-${selected?.id === z.id ? "sel" : "un"}`}
                data={z.boundary_geojson}
                style={() => styleForZone(z, selected?.id === z.id)}
                eventHandlers={{
                  click: () => setSelected(z),
                }}
              >
                <Popup>
                  <div style={{ fontSize: 12, fontFamily: "Outfit,sans-serif", minWidth: 180 }}>
                    <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#D4AF37", fontSize: 12.5, marginBottom: 4 }}>{z.zone_code}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 3 }}>{z.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 2, textTransform: "capitalize" }}>
                      {z.zone_type?.replace(/_/g, " ")} · {z.city_name}
                    </div>
                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
                      State: <b style={{ color: STATE_STYLE[z.lifecycle_state] ? "#D4AF37" : "#888" }}>{z.lifecycle_state}</b>
                      {z.is_active && <span style={{ color: "#34D399", marginLeft: 6 }}>● Active</span>}
                    </div>
                    <button
                      onClick={() => nav(`/zones/${z.id}`)}
                      style={{
                        background: "linear-gradient(135deg,#f0d060,#D4AF37)", color: "#0a1840",
                        border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11,
                        fontWeight: 700, cursor: "pointer", fontFamily: "Cinzel,serif",
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}
                    >
                      Open Editor <ChevronRight size={10}/>
                    </button>
                  </div>
                </Popup>
              </GeoJSON>
            ))}

            {/* Center markers */}
            {showCenters && zones.map(z => {
              const c = z.center_geojson?.coordinates;
              if (!c) return null;
              const [lng, lat] = c;
              const color = TYPE_COLORS[z.zone_type] || "#94A3B8";
              const icon = L.divIcon({
                className: "",
                html: `<div style="width:10px;height:10px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px ${color};"></div>`,
                iconSize: [10, 10],
                iconAnchor: [5, 5],
              });
              return (
                <Marker
                  key={`c-${z.id}`}
                  position={[lat, lng]}
                  icon={icon}
                  eventHandlers={{ click: () => setSelected(z) }}
                />
              );
            })}
          </MapContainer>

          {/* Legend */}
          {typeCounts.length > 0 && (
            <div style={{
              position: "absolute", bottom: 14, right: 14, zIndex: 500,
              background: "rgba(4,8,26,0.92)",
              border: "1px solid rgba(212,175,55,0.24)",
              borderRadius: 10, padding: "10px 12px",
              fontSize: 10.5, color: "rgba(255,255,255,0.7)",
              fontFamily: "Outfit,sans-serif",
              backdropFilter: "blur(10px)",
              maxWidth: 220, maxHeight: 260, overflowY: "auto",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#D4AF37", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 6, fontFamily: "Cinzel,serif" }}>
                Zone Types
              </div>
              {typeCounts.map(([type, count]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: TYPE_COLORS[type] || "#94A3B8", border: "1px solid rgba(0,0,0,0.4)" }}/>
                  <span style={{ textTransform: "capitalize", flex: 1 }}>{type?.replace(/_/g, " ")}</span>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <GlobalStyles/>
    </PageWrapper>
  );
}

export default function ZonesMapPage() {
  return (
    <ToastProvider>
      <ZonesMapContent/>
    </ToastProvider>
  );
}
