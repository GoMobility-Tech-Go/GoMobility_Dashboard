import { useEffect, useRef, useMemo, useState } from "react";
import { MapContainer, TileLayer, FeatureGroup, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw"; // side-effect: registers L.Draw

// ── Fix default marker icon (Vite bundling issue) ────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Custom icons ─────────────────────────────────────────────────────────────
const makeDotIcon = (color, label) => L.divIcon({
  className: "",
  html: `
    <div style="
      width:18px;height:18px;background:${color};
      border:2.5px solid #fff;border-radius:50%;
      box-shadow:0 0 10px ${color};
      display:flex;align-items:center;justify-content:center;
      color:#04081A;font-size:9px;font-weight:800;font-family:sans-serif;
    ">${label || ""}</div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const CENTER_ICON  = makeDotIcon("#D4AF37", "C");
const STAGING_ICON = makeDotIcon("#60A5FA", "S");
const SEARCH_ICON  = makeDotIcon("#F59E0B", "★");

// ── Approximate geodesic circle → polygon (for POIs without polygon geom) ──
function circlePolygon(lat, lng, radiusMeters = 500, sides = 48) {
  const coords = [];
  const latRad = (lat * Math.PI) / 180;
  const dLat = radiusMeters / 111320;
  const dLng = radiusMeters / (111320 * Math.cos(latRad));
  for (let i = 0; i < sides; i++) {
    const t = (i * 2 * Math.PI) / sides;
    coords.push([lng + dLng * Math.sin(t), lat + dLat * Math.cos(t)]);
  }
  coords.push(coords[0]); // close ring
  return { type: "Polygon", coordinates: [coords] };
}

// Normalize Nominatim geojson → our editor's Polygon geometry
function toPolygon(geojson, fallbackLat, fallbackLng, radiusMeters) {
  if (!geojson) return circlePolygon(fallbackLat, fallbackLng, radiusMeters);
  if (geojson.type === "Polygon") return geojson;
  if (geojson.type === "MultiPolygon") {
    // pick largest ring by point count
    let best = geojson.coordinates[0];
    for (const p of geojson.coordinates) {
      if ((p[0]?.length || 0) > (best[0]?.length || 0)) best = p;
    }
    return { type: "Polygon", coordinates: best };
  }
  // Point / LineString / other → buffer
  return circlePolygon(fallbackLat, fallbackLng, radiusMeters);
}

// ── Search control (Nominatim / OpenStreetMap geocoder) ─────────────────────
function SearchControl({ onBoundaryChange }) {
  const map = useMap();
  const [radius, setRadius] = useState(500);
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [pin, setPin]           = useState(null); // {lat,lng,label}
  const pinLayerRef             = useRef(null);
  const abortRef                = useRef(null);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        setLoading(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=in&addressdetails=1&polygon_geojson=1&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          headers: { "Accept-Language": "en" },
          signal: ctrl.signal,
        });
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch (e) {
        if (e.name !== "AbortError") console.warn("Nominatim error:", e);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  // Draw / update pin
  useEffect(() => {
    if (pinLayerRef.current) {
      map.removeLayer(pinLayerRef.current);
      pinLayerRef.current = null;
    }
    if (!pin) return;
    const marker = L.marker([pin.lat, pin.lng], { icon: SEARCH_ICON })
      .bindPopup(`<div style="font-family:Outfit,sans-serif;font-size:12px;max-width:220px;color:#0a1840;font-weight:600">${pin.label}</div>`)
      .addTo(map);
    pinLayerRef.current = marker;
    return () => {
      if (pinLayerRef.current) {
        map.removeLayer(pinLayerRef.current);
        pinLayerRef.current = null;
      }
    };
  }, [pin, map]);

  const pick = (r) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    setPin({ lat, lng, label: r.display_name });
    setQuery(r.display_name.split(",")[0]);
    setOpen(false);
    if (r.boundingbox) {
      const [s, n, w, e] = r.boundingbox.map(parseFloat);
      map.flyToBounds([[s, w], [n, e]], { padding: [50, 50], duration: 0.8 });
    } else {
      map.flyTo([lat, lng], 15, { duration: 0.8 });
    }
    // Auto-set boundary: use OSM polygon if available, else buffer around point
    if (onBoundaryChange) {
      const poly = toPolygon(r.geojson, lat, lng, radius);
      onBoundaryChange(poly);
    }
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setPin(null);
    setOpen(false);
  };

  return (
    <div style={{
      position: "absolute", top: 14, right: 14, zIndex: 600,
      width: 300, fontFamily: "Outfit,sans-serif",
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        background: "rgba(4,8,26,0.95)",
        border: "1px solid rgba(212,175,55,0.4)",
        borderRadius: open && results.length ? "10px 10px 0 0" : 10,
        padding: "6px 10px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
        backdropFilter: "blur(10px)",
      }}>
        <span style={{ fontSize: 13, marginRight: 6, opacity: 0.7 }}>🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search place, airport, landmark…"
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: "#fff", fontSize: 12.5, fontFamily: "inherit",
          }}
        />
        {loading && <span style={{ fontSize: 10, color: "#D4AF37", marginLeft: 6 }}>…</span>}
        {(query || pin) && !loading && (
          <button
            onClick={clear}
            title="Clear"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.5)", fontSize: 14, marginLeft: 4, padding: 0,
            }}
          >✕</button>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          background: "rgba(4,8,26,0.97)",
          border: "1px solid rgba(212,175,55,0.4)",
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          maxHeight: 280, overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
        }}>
          {results.map((r) => (
            <div
              key={r.place_id}
              onClick={() => pick(r)}
              style={{
                padding: "8px 12px",
                borderTop: "1px solid rgba(212,175,55,0.12)",
                cursor: "pointer",
                fontSize: 11.5,
                color: "rgba(255,255,255,0.85)",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(212,175,55,0.1)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontWeight: 600, color: "#D4AF37", marginBottom: 2 }}>
                {r.display_name.split(",")[0]}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.35 }}>
                {r.display_name.split(",").slice(1).join(",").trim()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Radius selector — used when OSM has no polygon for the picked place */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginTop: 6, padding: "5px 10px",
        background: "rgba(4,8,26,0.85)",
        border: "1px solid rgba(212,175,55,0.25)",
        borderRadius: 8,
        fontSize: 10.5, color: "rgba(255,255,255,0.6)",
      }}>
        <span title="If OSM has no boundary for the picked place, a circle of this radius is drawn instead">
          Fallback radius
        </span>
        <select
          value={radius}
          onChange={(e) => setRadius(parseInt(e.target.value, 10))}
          style={{
            background: "rgba(4,8,26,0.9)", color: "#D4AF37",
            border: "1px solid rgba(212,175,55,0.35)", borderRadius: 6,
            padding: "2px 6px", fontSize: 10.5, fontFamily: "inherit",
            marginLeft: "auto", cursor: "pointer", outline: "none",
          }}
        >
          <option value={250}>250 m</option>
          <option value={500}>500 m</option>
          <option value={1000}>1 km</option>
          <option value={2000}>2 km</option>
          <option value={5000}>5 km</option>
        </select>
      </div>
    </div>
  );
}

// ── Fly-to when boundary or city changes ─────────────────────────────────────
function MapFocus({ boundary, cityCenter }) {
  const map = useMap();
  useEffect(() => {
    if (boundary) {
      try {
        const layer = L.geoJSON(boundary);
        const bounds = layer.getBounds();
        if (bounds.isValid()) map.flyToBounds(bounds, { padding: [40, 40], duration: 0.8 });
      } catch {}
    } else if (cityCenter?.lat && cityCenter?.lng) {
      map.flyTo([cityCenter.lat, cityCenter.lng], 12, { duration: 0.6 });
    }
  }, [boundary, cityCenter, map]);
  return null;
}

// ── Render boundary as static layer (not editable — Redraw to change) ───────
function BoundaryLayer({ boundary }) {
  const map = useMap();
  const layerRef = useRef(null);
  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (!boundary) return;
    try {
      const layer = L.geoJSON(boundary, {
        style: { color: "#D4AF37", weight: 2.5, fillColor: "#D4AF37", fillOpacity: 0.12 },
      });
      layer.addTo(map);
      layerRef.current = layer;
    } catch (e) {
      console.warn("Failed to render boundary:", e);
    }
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [boundary, map]);
  return null;
}

// ── DRAW CONTROLS — direct L.Draw.Polygon (no EditControl, StrictMode-safe) ──
function DrawControls({ hasBoundary, onBoundaryChange }) {
  const map = useMap();
  const [drawing, setDrawing]     = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const drawerRef = useRef(null);
  const pointsRef = useRef(0);   // canonical count (not affected by React batching)

  // Register listeners ONCE per map — use ref for callback to avoid re-attach
  const onBoundaryChangeRef = useRef(onBoundaryChange);
  useEffect(() => { onBoundaryChangeRef.current = onBoundaryChange; }, [onBoundaryChange]);

  useEffect(() => {
    if (!L.Draw?.Event) return;

    const onCreated = (e) => {
      if (e.layerType !== "polygon") return;
      const geometry = e.layer.toGeoJSON().geometry;
      onBoundaryChangeRef.current?.(geometry);
      setDrawing(false);
      setPointCount(0);
      pointsRef.current = 0;
      drawerRef.current = null;
    };

    const onDrawStop = () => {
      setDrawing(false);
      setPointCount(0);
      pointsRef.current = 0;
      drawerRef.current = null;
    };

    // Increment counter — no internal poking
    const onVertex = () => {
      pointsRef.current += 1;
      setPointCount(pointsRef.current);
    };

    map.on(L.Draw.Event.CREATED,    onCreated);
    map.on(L.Draw.Event.DRAWSTOP,   onDrawStop);
    map.on(L.Draw.Event.DRAWVERTEX, onVertex);
    return () => {
      map.off(L.Draw.Event.CREATED,    onCreated);
      map.off(L.Draw.Event.DRAWSTOP,   onDrawStop);
      map.off(L.Draw.Event.DRAWVERTEX, onVertex);
    };
  }, [map]);

  const startDraw = () => {
    if (drawing) return;
    if (!L.Draw?.Polygon) {
      alert("Draw library not loaded");
      return;
    }
    if (drawerRef.current) {
      try { drawerRef.current.disable(); } catch {}
      drawerRef.current = null;
    }
    // Minimal, safe options — no showArea (needs GeometryUtil), no custom icon
    const drawer = new L.Draw.Polygon(map, {
      allowIntersection: true,          // let user draw freely, we validate on submit
      showArea: false,
      showLength: false,
      shapeOptions: {
        color: "#D4AF37",
        weight: 2.5,
        fillColor: "#D4AF37",
        fillOpacity: 0.12,
      },
    });
    pointsRef.current = 0;
    setPointCount(0);
    drawer.enable();
    drawerRef.current = drawer;
    setDrawing(true);
  };

  const cancelDraw = () => {
    if (drawerRef.current) {
      try { drawerRef.current.disable(); } catch {}
      drawerRef.current = null;
    }
    setDrawing(false);
    setPointCount(0);
  };

  // Finish current polygon manually (backup for when user can't reach first point)
  const finishDraw = () => {
    if (drawerRef.current && pointCount >= 3) {
      try { drawerRef.current.completeShape(); } catch {}
    }
  };

  const clearBoundary = () => {
    if (drawing) cancelDraw();
    onBoundaryChange?.(null);
  };

  const btn = {
    border: "none", borderRadius: 8, padding: "7px 14px",
    fontSize: 11.5, cursor: "pointer", letterSpacing: "0.5px",
    display: "inline-flex", alignItems: "center", gap: 6,
    fontFamily: "Cinzel,serif", fontWeight: 700,
  };

  // Outer wrapper is click-through; only pill + buttons capture clicks
  const pillBase = { pointerEvents: "auto" };

  return (
    <div style={{
      position: "absolute", top: 14, left: 14,
      zIndex: 500,
      display: "flex",
      pointerEvents: "none",       // ← let map receive clicks
    }}>
      {drawing ? (
        <div style={{
          ...pillBase,
          display: "flex", gap: 8, alignItems: "center",
          background: "rgba(4,8,26,0.95)",
          border: "1px solid rgba(212,175,55,0.4)",
          borderRadius: 999, padding: "6px 6px 6px 14px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
          backdropFilter: "blur(10px)",
          fontFamily: "Outfit,sans-serif",
        }}>
          <span style={{ fontSize: 12, color: "#D4AF37", fontWeight: 600 }}>
            <b style={{ color: "#f7dc6f" }}>{pointCount}</b> point{pointCount === 1 ? "" : "s"}
          </span>
          {pointCount >= 3 && (
            <button
              onClick={finishDraw}
              title="Complete the polygon"
              style={{ ...btn, background: "rgba(52,211,153,0.15)", color: "#34D399",
                border: "1px solid rgba(52,211,153,0.45)", padding: "5px 12px", fontSize: 11 }}
            >
              ✓ Finish
            </button>
          )}
          <button
            onClick={cancelDraw}
            title="Cancel drawing"
            style={{ ...btn, background: "rgba(248,113,113,0.1)", color: "#F87171",
              border: "1px solid rgba(248,113,113,0.4)", padding: "5px 12px", fontSize: 11 }}
          >
            ✕ Cancel
          </button>
        </div>
      ) : (
        <div style={{
          ...pillBase,
          display: "flex", gap: 8, alignItems: "center",
          background: "rgba(4,8,26,0.95)",
          border: "1px solid rgba(212,175,55,0.4)",
          borderRadius: 999, padding: "6px 6px 6px 14px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
          backdropFilter: "blur(10px)",
          fontFamily: "Outfit,sans-serif",
        }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
            {hasBoundary ? "Boundary set" : "Zone boundary"}
          </span>
          <button
            onClick={startDraw}
            title="Click multiple points on the map to draw any shape"
            style={{ ...btn,
              background: "linear-gradient(135deg,#f0d060 0%,#D4AF37 45%,#b8922a 100%)",
              color: "#0a1840", padding: "5px 12px", fontSize: 11,
            }}
          >
            ✏ {hasBoundary ? "Redraw" : "Start Drawing"}
          </button>
          {hasBoundary && (
            <button
              onClick={clearBoundary}
              title="Remove the current polygon"
              style={{ ...btn,
                background: "rgba(248,113,113,0.12)", color: "#F87171",
                border: "1px solid rgba(248,113,113,0.4)", padding: "5px 12px", fontSize: 11 }}
            >
              🗑 Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ZoneMap ─────────────────────────────────────────────────────────────
export default function ZoneMap({
  boundary,
  onBoundaryChange,
  center,
  staging,
  testPoint,
  cityCenter,
  exits = [],
  otherZones = [],   // other existing zones in same city (read-only faded polygons)
  readOnly = false,
}) {
  const defaultCenter = useMemo(() => {
    if (cityCenter?.lat && cityCenter?.lng) return [cityCenter.lat, cityCenter.lng];
    return [22.5, 80];
  }, [cityCenter]);

  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 14, overflow: "hidden", position: "relative" }}>
      <style>{`
        .leaflet-container { background:#0a0f1e !important; font-family:Outfit,sans-serif; }
        .leaflet-popup-content-wrapper { background:rgba(4,8,26,0.97)!important; border:1px solid rgba(212,175,55,0.3)!important; border-radius:10px!important; color:#fff!important; }
        .leaflet-popup-tip { background:rgba(4,8,26,0.97)!important; }
        .leaflet-control-zoom a { background:rgba(4,8,26,0.9)!important; border-color:rgba(212,175,55,0.2)!important; color:#D4AF37!important; }
        .leaflet-control-zoom a:hover { background:rgba(212,175,55,0.15)!important; }
        .leaflet-control-attribution { background:rgba(0,0,0,0.5)!important; color:rgba(255,255,255,0.3)!important; font-size:9px!important; }
        .leaflet-draw-tooltip { background:rgba(4,8,26,0.95)!important; color:#D4AF37 !important; border:1px solid rgba(212,175,55,0.3)!important; font-family:Outfit,sans-serif !important; font-size:12px !important; padding:6px 10px !important; }
        .leaflet-draw-tooltip:before { border-right-color: rgba(4,8,26,0.95) !important; }
        .leaflet-draw-guide-dash { background:#D4AF37 !important; }
        .leaflet-editing-icon { border-radius:50% !important; background:#D4AF37 !important; border:2px solid #fff !important; }
      `}</style>

      <MapContainer
        center={defaultCenter}
        zoom={cityCenter ? 11 : 5}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OSM &copy; CARTO'
          subdomains="abcd"
          maxZoom={19}
        />
        <MapFocus boundary={boundary} cityCenter={cityCenter}/>

        {/* Other existing zones — read-only faded overlay so user avoids overlap */}
        {otherZones.map(z => (
          z.boundary_geojson ? (
            <GeoJSON
              key={`other-${z.id}`}
              data={z.boundary_geojson}
              style={{
                color:       "#60A5FA",
                weight:      1.5,
                opacity:     0.65,
                fillColor:   "#60A5FA",
                fillOpacity: 0.08,
                dashArray:   "5 4",
              }}
            >
              <Popup>
                <div style={{ fontSize: 12, fontFamily: "Outfit,sans-serif", minWidth: 160 }}>
                  <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#60A5FA", fontSize: 12, marginBottom: 3 }}>
                    ⚠ Existing zone: {z.zone_code}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 3 }}>{z.name}</div>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", textTransform: "capitalize" }}>
                    {z.zone_type?.replace(/_/g, " ")} · {z.lifecycle_state}
                  </div>
                  <div style={{ fontSize: 10.5, color: "#F59E0B", marginTop: 6, fontStyle: "italic" }}>
                    Avoid overlapping this area
                  </div>
                </div>
              </Popup>
            </GeoJSON>
          ) : null
        ))}

        <BoundaryLayer boundary={boundary}/>
        {!readOnly && <DrawControls hasBoundary={!!boundary} onBoundaryChange={onBoundaryChange}/>}
        {!readOnly && <SearchControl onBoundaryChange={onBoundaryChange}/>}

        {/* Center marker */}
        {center?.lat && center?.lng && (
          <Marker position={[center.lat, center.lng]} icon={CENTER_ICON}/>
        )}
        {/* Staging area marker */}
        {staging?.lat && staging?.lng && (
          <Marker position={[staging.lat, staging.lng]} icon={STAGING_ICON}/>
        )}
        {/* Test coord marker */}
        {testPoint?.lat && testPoint?.lng && (
          <Marker
            position={[testPoint.lat, testPoint.lng]}
            icon={makeDotIcon(testPoint.matched ? "#34D399" : "#F87171", testPoint.matched ? "✓" : "✕")}
          />
        )}
        {/* Exit gates */}
        {exits.map((ex) => {
          const coords = ex.exit_coords_geojson?.coordinates;
          if (!coords) return null;
          const [ln, la] = coords;
          const color = ex.is_arrivals ? "#34D399" : "#60A5FA";
          const label = ex.is_arrivals ? "A" : "D";
          return (
            <Marker key={`ex-${ex.id}`} position={[la, ln]} icon={makeDotIcon(color, label)}>
              <Popup>
                <div style={{ fontSize: 12, fontFamily: "Outfit,sans-serif" }}>
                  <div style={{ fontWeight: 700, color: "#D4AF37", marginBottom: 4 }}>{ex.exit_name}</div>
                  <div style={{ color: "rgba(255,255,255,0.65)" }}>
                    {ex.is_arrivals ? "Arrivals" : "Departures"} · Sort {ex.sort_order}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 14, left: 14, zIndex: 500,
        background: "rgba(4,8,26,0.9)", border: "1px solid rgba(212,175,55,0.24)",
        borderRadius: 10, padding: "8px 12px",
        fontSize: 10.5, color: "rgba(255,255,255,0.7)",
        fontFamily: "Outfit,sans-serif",
        display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
        backdropFilter: "blur(8px)",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 12, background: "#D4AF3722", border: "1.5px solid #D4AF37", borderRadius: 3 }}/>
          Boundary
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, background: "#D4AF37", borderRadius: "50%" }}/>
          Center
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, background: "#60A5FA", borderRadius: "50%" }}/>
          Staging
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, background: "#34D399", borderRadius: "50%" }}/>
          Arrival exit
        </span>
        {otherZones.length > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 12, background: "#60A5FA22", border: "1.5px dashed #60A5FA", borderRadius: 3 }}/>
            Other zones ({otherZones.length})
          </span>
        )}
      </div>
    </div>
  );
}
