import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { X, MapPin, RefreshCw, Navigation, Clock, Car } from "lucide-react";
import { getRides } from "../../api/admin";
import { Pagination } from "../../components/ui/index.jsx";

const GMAPS_KEY      = "AIzaSyB7WjbHRXaKMVYdZBAQCw_JobM6mcXSZss";
const TRACKING_BASE  = "https://api.gomobility.co.in/api/v1/tracking/public";
const POLL_MS        = 4000;

const DARK_MAP_STYLES = [
  { elementType:"geometry", stylers:[{color:"#1d2c4d"}] },
  { elementType:"labels.text.fill", stylers:[{color:"#8ec3b9"}] },
  { elementType:"labels.text.stroke", stylers:[{color:"#1a3646"}] },
  { featureType:"water", elementType:"geometry", stylers:[{color:"#0e1626"}] },
  { featureType:"road", elementType:"geometry", stylers:[{color:"#304a7d"}] },
  { featureType:"road", elementType:"labels.text.fill", stylers:[{color:"#98a5be"}] },
  { featureType:"transit", stylers:[{visibility:"simplified"}] },
  { featureType:"poi", stylers:[{visibility:"off"}] },
  { featureType:"administrative", elementType:"geometry", stylers:[{color:"#4b6878"}] },
];

// Google Maps loader — singleton, includes geometry library
let _gmState = "idle";
let _gmResolvers = [];
function loadGoogleMaps() {
  return new Promise((resolve) => {
    if (_gmState === "ready" && window.google?.maps) { resolve(); return; }
    _gmResolvers.push(resolve);
    if (_gmState === "loading") return;
    _gmState = "loading";
    window.__gmapsReady = () => {
      _gmState = "ready";
      _gmResolvers.forEach((r) => r());
      _gmResolvers = [];
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=geometry&callback=__gmapsReady`;
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  });
}

const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const fmtRupee    = (n) => n != null ? "₹" + new Intl.NumberFormat("en-IN").format(n) : "—";
const fmtMin      = (sec) => sec ? `${Math.ceil(sec / 60)} min` : "—";
const fmtKm       = (m) => m ? `${(m / 1000).toFixed(1)} km` : "—";

const STATUS_COLORS = {
  requested:       { color:"#60a5fa", bg:"rgba(59,130,246,0.12)",  border:"rgba(59,130,246,0.3)"  },
  accepted:        { color:"#a78bfa", bg:"rgba(139,92,246,0.12)",  border:"rgba(139,92,246,0.3)"  },
  driver_assigned: { color:"#a78bfa", bg:"rgba(139,92,246,0.12)",  border:"rgba(139,92,246,0.3)"  },
  driver_arrived:  { color:"#fb923c", bg:"rgba(251,146,60,0.12)",  border:"rgba(251,146,60,0.3)"  },
  in_progress:     { color:"#fbbf24", bg:"rgba(245,158,11,0.12)",  border:"rgba(245,158,11,0.3)"  },
  ongoing:         { color:"#fbbf24", bg:"rgba(245,158,11,0.12)",  border:"rgba(245,158,11,0.3)"  },
  completed:       { color:"#4ade80", bg:"rgba(34,197,94,0.12)",   border:"rgba(34,197,94,0.3)"   },
  cancelled:       { color:"#f87171", bg:"rgba(239,68,68,0.12)",   border:"rgba(239,68,68,0.3)"   },
  expired:         { color:"#94a3b8", bg:"rgba(148,163,184,0.12)", border:"rgba(148,163,184,0.3)" },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_COLORS[status] || { color:"rgba(255,255,255,0.5)", bg:"rgba(255,255,255,0.06)", border:"rgba(255,255,255,0.1)" };
  return <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:s.bg, color:s.color, border:`1px solid ${s.border}`, textTransform:"capitalize" }}>{status?.replace("_"," ") || "—"}</span>;
};

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
    <span style={{ flex:1 }}>{msg}</span>
    <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

const RideDetailModal = ({ ride, onClose }) => {
  if (!ride) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:999, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"#020d26", border:"1px solid rgba(212,175,55,0.2)", borderRadius:20, padding:32, width:480, maxWidth:"90vw" }} onClick={(e)=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <h3 style={{ fontFamily:"Cinzel,serif", color:"#fff", fontSize:16, margin:0 }}>Ride #{ride.id}</h3>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={14}/></button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[
            ["Passenger", ride.passenger_name||"—"],["Driver", ride.driver_name||"—"],
            ["Vehicle", ride.vehicle_type||"—"],["Status", ride.status||"—"],
            ["Pickup", ride.pickup_address||"—"],["Drop", ride.dropoff_address||"—"],
            ["Distance", ride.distance_km ? `${ride.distance_km} km` : "—"],
            ["Duration", ride.duration_minutes ? `${ride.duration_minutes} min` : "—"],
            ["Fare", fmtRupee(ride.final_fare)],["Payment", ride.payment_method||"—"],
            ["Started", fmtDateTime(ride.created_at)],["Completed", fmtDateTime(ride.completed_at)],
          ].map(([l,v]) => (
            <div key={l}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:3 }}>{l}</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.85)", fontWeight:500 }}>{String(v)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── MapPanel — shows all rides + live tracking overlay ────────────────────────
const MapPanel = ({ rides, selectedId, onRideClick, trackingData, onStopTracking }) => {
  const containerRef      = useRef(null);
  const gMapRef           = useRef(null);
  const staticMarkersRef  = useRef([]);   // pickup/dropoff for all rides
  const driverMarkerRef   = useRef(null); // live driver
  const trackingLinesRef  = useRef([]);   // live route polylines
  const pickupMarkerRef   = useRef(null); // live pickup
  const dropoffMarkerRef  = useRef(null); // live dropoff
  const [mapReady, setMapReady]   = useState(false);
  const [mapError, setMapError]   = useState(false);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        if (!containerRef.current || gMapRef.current) return;
        gMapRef.current = new window.google.maps.Map(containerRef.current, {
          center: { lat: 28.6, lng: 77.2 },
          zoom: 11,
          styles: DARK_MAP_STYLES,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        setMapReady(true);
      })
      .catch(() => setMapError(true));
  }, []);

  // Static markers — all ongoing rides (pickup + dropoff dots)
  useEffect(() => {
    if (!mapReady || !gMapRef.current || !window.google?.maps) return;
    staticMarkersRef.current.forEach((m) => m.setMap(null));
    staticMarkersRef.current = [];

    const ridesWithCoords = rides.filter((r) => r.pickup_latitude && r.pickup_longitude);
    if (!ridesWithCoords.length) return;

    const bounds = new window.google.maps.LatLngBounds();

    ridesWithCoords.forEach((ride) => {
      const hasPickup = !!(ride.pickup_latitude && ride.pickup_longitude);
      const hasDrop   = !!(ride.dropoff_latitude && ride.dropoff_longitude);

      const infoContent = `
        <div style="font-family:'Outfit',sans-serif;padding:10px 12px;min-width:200px;color:#0c1f5e">
          <div style="font-weight:700;font-size:13px;margin-bottom:6px">Ride #${ride.id}</div>
          <div style="font-size:12px;margin-bottom:3px">🧑 ${ride.passenger_name || "—"}</div>
          <div style="font-size:12px;margin-bottom:3px">🚗 ${ride.driver_name || "—"} · ${ride.vehicle_type || ""}</div>
          <div style="font-size:12px;color:#666">💰 ${fmtRupee(ride.final_fare)}</div>
        </div>`;
      const infoWindow = new window.google.maps.InfoWindow({ content: infoContent });

      if (hasPickup) {
        const pos = { lat: parseFloat(ride.pickup_latitude), lng: parseFloat(ride.pickup_longitude) };
        bounds.extend(pos);
        const m = new window.google.maps.Marker({
          position: pos, map: gMapRef.current,
          title: `Pickup: Ride #${ride.id}`,
          icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor:"#4ade80", fillOpacity:1, strokeColor:"#fff", strokeWeight:2, scale:8 },
        });
        m.addListener("click", () => { infoWindow.open(gMapRef.current, m); onRideClick?.(ride.id); });
        staticMarkersRef.current.push(m);
      }
      if (hasDrop) {
        const pos = { lat: parseFloat(ride.dropoff_latitude), lng: parseFloat(ride.dropoff_longitude) };
        bounds.extend(pos);
        const m = new window.google.maps.Marker({
          position: pos, map: gMapRef.current,
          title: `Drop: Ride #${ride.id}`,
          icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor:"#f87171", fillOpacity:1, strokeColor:"#fff", strokeWeight:2, scale:8 },
        });
        staticMarkersRef.current.push(m);
      }
      if (hasPickup && hasDrop) {
        const line = new window.google.maps.Polyline({
          path: [
            { lat: parseFloat(ride.pickup_latitude), lng: parseFloat(ride.pickup_longitude) },
            { lat: parseFloat(ride.dropoff_latitude), lng: parseFloat(ride.dropoff_longitude) },
          ],
          geodesic: true, strokeColor:"#D4AF37", strokeOpacity:0.4, strokeWeight:2, map: gMapRef.current,
        });
        staticMarkersRef.current.push(line);
      }
    });

    if (ridesWithCoords.length > 0 && !trackingData) {
      gMapRef.current.fitBounds(bounds, 80);
    }
  }, [rides, mapReady]);

  // Pan to selected ride when clicked from list
  useEffect(() => {
    if (!mapReady || !gMapRef.current || !selectedId || trackingData) return;
    const ride = rides.find((r) => r.id === selectedId);
    if (!ride?.pickup_latitude) return;
    gMapRef.current.panTo({ lat: parseFloat(ride.pickup_latitude), lng: parseFloat(ride.pickup_longitude) });
    gMapRef.current.setZoom(14);
  }, [selectedId, rides, mapReady, trackingData]);

  // ── Live tracking overlay ──────────────────────────────────────────────────
  const clearTrackingOverlay = () => {
    if (driverMarkerRef.current)  { driverMarkerRef.current.setMap(null);  driverMarkerRef.current  = null; }
    if (pickupMarkerRef.current)  { pickupMarkerRef.current.setMap(null);  pickupMarkerRef.current  = null; }
    if (dropoffMarkerRef.current) { dropoffMarkerRef.current.setMap(null); dropoffMarkerRef.current = null; }
    trackingLinesRef.current.forEach((l) => l.setMap(null));
    trackingLinesRef.current = [];
  };

  useEffect(() => {
    if (!mapReady || !gMapRef.current || !window.google?.maps) return;

    if (!trackingData) {
      clearTrackingOverlay();
      return;
    }

    const loc = trackingData.location;

    // Driver current position
    if (loc?.current?.latitude && loc?.current?.longitude) {
      const pos = { lat: parseFloat(loc.current.latitude), lng: parseFloat(loc.current.longitude) };

      if (driverMarkerRef.current) {
        // Smooth update — just move the marker
        driverMarkerRef.current.setPosition(pos);
      } else {
        // Create driver marker (car emoji on gold circle)
        const driverSVG = `
          <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="20" fill="#D4AF37" stroke="white" stroke-width="2.5"/>
            <text x="22" y="29" text-anchor="middle" font-size="20">🚗</text>
          </svg>`;
        driverMarkerRef.current = new window.google.maps.Marker({
          position: pos,
          map: gMapRef.current,
          title: `Driver: ${trackingData.driver?.name || ""}`,
          icon: {
            url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(driverSVG),
            scaledSize: new window.google.maps.Size(44, 44),
            anchor:     new window.google.maps.Point(22, 22),
          },
          zIndex: 20,
          animation: window.google.maps.Animation.DROP,
        });
      }
      gMapRef.current.panTo(pos);
    }

    // Pickup marker for tracked ride
    if (loc?.pickup?.latitude && loc?.pickup?.longitude && !pickupMarkerRef.current) {
      pickupMarkerRef.current = new window.google.maps.Marker({
        position: { lat: parseFloat(loc.pickup.latitude), lng: parseFloat(loc.pickup.longitude) },
        map: gMapRef.current,
        title: `Pickup: ${loc.pickup.address || ""}`,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor:"#4ade80", fillOpacity:1, strokeColor:"#fff", strokeWeight:3, scale:11 },
        zIndex: 15,
      });
    }

    // Dropoff marker for tracked ride
    if (loc?.dropoff?.latitude && loc?.dropoff?.longitude && !dropoffMarkerRef.current) {
      dropoffMarkerRef.current = new window.google.maps.Marker({
        position: { lat: parseFloat(loc.dropoff.latitude), lng: parseFloat(loc.dropoff.longitude) },
        map: gMapRef.current,
        title: `Drop: ${loc.dropoff.address || ""}`,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor:"#f87171", fillOpacity:1, strokeColor:"#fff", strokeWeight:3, scale:11 },
        zIndex: 15,
      });
    }

    // Route polylines — clear old ones then redraw
    trackingLinesRef.current.forEach((l) => l.setMap(null));
    trackingLinesRef.current = [];

    const geom = window.google.maps.geometry?.encoding;

    // toDropoff — planned route pickup→dropoff (gold solid)
    if (trackingData.routes?.toDropoff?.polyline && geom) {
      try {
        const path = geom.decodePath(trackingData.routes.toDropoff.polyline);
        const pl = new window.google.maps.Polyline({
          path, geodesic:true, strokeColor:"#D4AF37", strokeOpacity:0.85, strokeWeight:4, map: gMapRef.current,
        });
        trackingLinesRef.current.push(pl);
      } catch (_) { /* invalid polyline — skip */ }
    }

    // toPickup — driver→pickup (blue dashed, only during driver_assigned/driver_arrived)
    if (trackingData.routes?.toPickup?.polyline && geom) {
      try {
        const path = geom.decodePath(trackingData.routes.toPickup.polyline);
        const pl = new window.google.maps.Polyline({
          path, geodesic:true, strokeColor:"#60a5fa", strokeOpacity:0.9, strokeWeight:3,
          icons: [{ icon: { path:"M 0,-1 0,1", strokeOpacity:1, scale:3 }, offset:"0", repeat:"12px" }],
          map: gMapRef.current,
        });
        trackingLinesRef.current.push(pl);
      } catch (_) { /* skip */ }
    }

  }, [trackingData, mapReady]);

  // Cleanup on unmount
  useEffect(() => () => clearTrackingOverlay(), []);

  if (mapError) return (
    <div style={{ height:480, borderRadius:16, border:"1px solid rgba(212,175,55,0.1)", display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(255,255,255,0.02)", color:"#f87171", fontFamily:"Outfit,sans-serif", fontSize:13 }}>
      Failed to load Google Maps. Check API key or network.
    </div>
  );

  return (
    <div style={{ position:"relative" }}>
      <div ref={containerRef} style={{ width:"100%", height:480, borderRadius:16, overflow:"hidden", border:"1px solid rgba(212,175,55,0.15)" }} />
      {!mapReady && (
        <div style={{ position:"absolute", inset:0, background:"rgba(2,13,38,0.8)", borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.4)", fontFamily:"Outfit,sans-serif", fontSize:13 }}>
          Loading map…
        </div>
      )}

      {/* Legend */}
      <div style={{ position:"absolute", top:12, left:12, display:"flex", flexDirection:"column", gap:6, pointerEvents:"none" }}>
        {trackingData ? (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(2,13,38,0.85)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:8, padding:"5px 10px" }}>
              <span style={{ fontSize:14 }}>🚗</span>
              <span style={{ fontSize:11, color:"#D4AF37", fontFamily:"Outfit,sans-serif", fontWeight:600 }}>Driver (Live)</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(2,13,38,0.85)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:8, padding:"5px 10px" }}>
              <span style={{ width:10, height:10, borderRadius:"50%", background:"#4ade80", display:"inline-block", border:"1.5px solid #fff" }}/>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)", fontFamily:"Outfit,sans-serif" }}>Pickup</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(2,13,38,0.85)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:8, padding:"5px 10px" }}>
              <span style={{ width:10, height:10, borderRadius:"50%", background:"#f87171", display:"inline-block", border:"1.5px solid #fff" }}/>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)", fontFamily:"Outfit,sans-serif" }}>Drop</span>
            </div>
          </>
        ) : (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(2,13,38,0.85)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:8, padding:"5px 10px" }}>
              <span style={{ width:10, height:10, borderRadius:"50%", background:"#4ade80", display:"inline-block", border:"1.5px solid #fff" }}/>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)", fontFamily:"Outfit,sans-serif" }}>Pickup</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(2,13,38,0.85)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:8, padding:"5px 10px" }}>
              <span style={{ width:10, height:10, borderRadius:"50%", background:"#f87171", display:"inline-block", border:"1.5px solid #fff" }}/>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)", fontFamily:"Outfit,sans-serif" }}>Drop</span>
            </div>
          </>
        )}
      </div>

      {/* Live tracking badge */}
      {trackingData && (
        <div style={{ position:"absolute", top:12, right:12, display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.4)", borderRadius:20, padding:"6px 12px" }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80", display:"inline-block", animation:"livePulse 1.2s ease-in-out infinite" }}/>
            <span style={{ fontSize:11, color:"#4ade80", fontFamily:"Outfit,sans-serif", fontWeight:700 }}>LIVE</span>
          </div>
          <button onClick={onStopTracking} style={{ background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:20, padding:"6px 12px", color:"#f87171", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>
            Stop
          </button>
        </div>
      )}
    </div>
  );
};

// ── Live Tracking Info Panel ───────────────────────────────────────────────────
const TrackingPanel = ({ trackingData, trackedRide, error }) => {
  if (error) return (
    <div style={{ marginTop:14, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:14, padding:"16px 20px", color:"#f87171", fontFamily:"Outfit,sans-serif", fontSize:13 }}>
      {error}
    </div>
  );

  if (!trackingData && !trackedRide) return null;

  const driver    = trackingData?.driver;
  const passenger = trackingData?.passenger;
  const loc       = trackingData?.location;
  const eta       = trackingData?.eta;
  const status    = trackingData?.status || trackedRide?.status;

  return (
    <div style={{ marginTop:14, background:"rgba(212,175,55,0.04)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:16, overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"12px 20px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontFamily:"Cinzel,serif", color:"rgba(255,255,255,0.7)", fontSize:12, letterSpacing:"1px" }}>
            LIVE TRACKING — RIDE #{trackingData?.rideId || trackedRide?.id}
          </span>
          <StatusBadge status={status} />
        </div>
        {!trackingData && (
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)", fontFamily:"Outfit,sans-serif", animation:"gmPulse 1.5s ease-in-out infinite" }}>Connecting…</span>
        )}
      </div>

      {trackingData && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:0 }}>
          {/* ETA */}
          <div style={{ padding:"16px 20px", borderRight:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6, display:"flex", alignItems:"center", gap:5 }}>
              <Clock size={10}/> ETA
            </div>
            {eta ? (
              <>
                <div style={{ fontSize:22, fontWeight:700, color:"#D4AF37", fontFamily:"Outfit,sans-serif" }}>{fmtMin(eta.remainingDuration)}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{fmtKm(eta.remainingDistance)} remaining</div>
              </>
            ) : (
              <div style={{ fontSize:14, color:"rgba(255,255,255,0.3)", fontFamily:"Outfit,sans-serif" }}>Calculating…</div>
            )}
          </div>

          {/* Driver */}
          <div style={{ padding:"16px 20px", borderRight:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6, display:"flex", alignItems:"center", gap:5 }}>
              <Car size={10}/> Driver
            </div>
            <div style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{driver?.name || "—"}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{driver?.phone}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>
              {driver?.vehicle?.type} · {driver?.vehicle?.number}
            </div>
          </div>

          {/* Passenger */}
          <div style={{ padding:"16px 20px", borderRight:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>Passenger</div>
            <div style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{passenger?.name || "—"}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{passenger?.phone}</div>
          </div>

          {/* Route */}
          <div style={{ padding:"16px 20px" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6, display:"flex", alignItems:"center", gap:5 }}>
              <Navigation size={10}/> Route
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", marginBottom:4, display:"flex", alignItems:"flex-start", gap:5 }}>
              <span style={{ color:"#4ade80", flexShrink:0, marginTop:1 }}>↑</span>
              <span>{loc?.pickup?.address || loc?.pickup?.name || "Pickup"}</span>
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"flex-start", gap:5 }}>
              <span style={{ color:"#f87171", flexShrink:0, marginTop:1 }}>↓</span>
              <span>{loc?.dropoff?.address || loc?.dropoff?.name || "Drop"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RideMonitoringPage() {
  const [rides, setRides]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [status, setStatus]         = useState("");
  const [vehicle, setVehicle]       = useState("");
  const [startDate, setStart]       = useState("");
  const [endDate, setEnd]           = useState("");
  const [offset, setOffset]         = useState(0);
  const [toast, setToast]           = useState(null);
  const [modal, setModal]           = useState(null);
  const [viewMode, setViewMode]     = useState("table");
  const [ongoingRides, setOngoing]  = useState([]);
  const [ongoingLoading, setOngoingLoading] = useState(false);
  const [selectedMapRide, setSelectedMapRide] = useState(null);

  // Live tracking state
  const [trackedRide, setTrackedRide]   = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingErr, setTrackingErr]   = useState(null);
  const pollRef = useRef(null);
  const LIMIT = 10;

  const showToast = (msg, type="error") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit:LIMIT, offset };
    if (status)    params.status       = status;
    if (vehicle)   params.vehicle_type = vehicle;
    if (startDate) params.start_date   = startDate;
    if (endDate)   params.end_date     = endDate;
    getRides(params)
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setRides(d.rides || d.items || d.data || []);
        setTotal(d.pagination?.total || d.total || 0);
      })
      .catch(() => showToast("Failed to load rides."))
      .finally(() => setLoading(false));
  }, [status, vehicle, startDate, endDate, offset]);

  const loadOngoing = useCallback(() => {
    setOngoingLoading(true);
    // Validator only allows: requested|accepted|ongoing|completed|cancelled
    // But DB stores: requested|driver_assigned|driver_arrived|in_progress|completed|cancelled
    // So fetch recent rides without status filter, then filter client-side
    const ACTIVE = new Set(["requested","accepted","ongoing","in_progress","driver_assigned","driver_arrived"]);
    getRides({ limit: 100 })
      .then((res) => {
        const d = res.data?.data || res.data || {};
        const all = d.rides || d.items || d.data || [];
        setOngoing(all.filter((r) => ACTIVE.has(r.status)));
      })
      .catch(() => showToast("Failed to load ongoing rides."))
      .finally(() => setOngoingLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (viewMode === "map") loadOngoing(); }, [viewMode, loadOngoing]);

  // ── Live tracking polling ─────────────────────────────────────────────────
  const startLiveTracking = useCallback((ride) => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setTrackedRide(ride);
    setTrackingData(null);
    setTrackingErr(null);

    if (!ride.tracking_token) {
      setTrackingErr("No tracking token — ride may not have started.");
      return;
    }

    const fetchTracking = async () => {
      try {
        const res = await axios.get(`${TRACKING_BASE}/${ride.tracking_token}`);
        const d = res.data?.data || res.data;
        setTrackingData(d);
        setTrackingErr(null);
      } catch {
        setTrackingErr("Tracking unavailable for this ride.");
      }
    };

    fetchTracking();
    pollRef.current = setInterval(fetchTracking, POLL_MS);
  }, []);

  const stopLiveTracking = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setTrackedRide(null);
    setTrackingData(null);
    setTrackingErr(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const LIVE_STATUSES = new Set(["driver_assigned","driver_arrived","in_progress","ongoing","accepted"]);
  const isTrackable   = (ride) => LIVE_STATUSES.has(ride.status) || ride.tracking_token;

  const totalPages  = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const TH = ({ c }) => <th style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", borderBottom:"1px solid rgba(212,175,55,0.1)", whiteSpace:"nowrap" }}>{c}</th>;
  const TD = ({ children, style }) => <td style={{ padding:"14px 16px", fontSize:13, color:"rgba(255,255,255,0.8)", borderBottom:"1px solid rgba(255,255,255,0.04)", ...style }}>{children}</td>;

  const sel = (val, set, opts) => (
    <select value={val} onChange={(e)=>{set(e.target.value);setOffset(0);}} style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px", color:"rgba(255,255,255,0.8)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", cursor:"pointer" }}>
      {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
    </select>
  );

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`
        @keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}
        @keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}
      `}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
      <RideDetailModal ride={modal} onClose={()=>setModal(null)} />

      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Ride Monitoring</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Total: {total} rides</p>
      </div>

      {/* View Mode Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[["table","📋 Table View"],["map","🗺 Live Map"]].map(([v,l]) => (
          <button key={v} onClick={()=>{ setViewMode(v); if(v==="table") stopLiveTracking(); }} style={{ padding:"8px 18px", borderRadius:10, border:"1px solid", fontSize:13, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600, transition:"all .2s", borderColor:viewMode===v?"#D4AF37":"rgba(212,175,55,0.2)", background:viewMode===v?"rgba(212,175,55,0.12)":"transparent", color:viewMode===v?"#D4AF37":"rgba(255,255,255,0.5)" }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── MAP VIEW ── */}
      {viewMode === "map" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>
              {ongoingLoading ? "Loading ongoing rides…" : `${ongoingRides.length} ongoing rides · click Track to monitor live`}
            </div>
            <button onClick={loadOngoing} disabled={ongoingLoading} style={{ display:"flex", alignItems:"center", gap:6, height:36, padding:"0 14px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:10, color:"#D4AF37", fontSize:12, cursor:"pointer", opacity:ongoingLoading?0.5:1 }}>
              <RefreshCw size={12}/> Refresh
            </button>
          </div>

          <MapPanel
            rides={ongoingRides}
            selectedId={selectedMapRide}
            onRideClick={(id) => setSelectedMapRide(id)}
            trackingData={trackingData}
            onStopTracking={stopLiveTracking}
          />

          {/* Live Tracking Info Panel */}
          {(trackedRide || trackingErr) && (
            <TrackingPanel
              trackingData={trackingData}
              trackedRide={trackedRide}
              error={trackingErr}
            />
          )}

          {/* Ongoing Rides List */}
          {ongoingRides.length > 0 && (
            <div style={{ marginTop:14, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:14, overflow:"hidden" }}>
              <div style={{ padding:"12px 18px", borderBottom:"1px solid rgba(212,175,55,0.08)", fontFamily:"Cinzel,serif", color:"rgba(255,255,255,0.6)", fontSize:12, letterSpacing:"1px" }}>
                ONGOING RIDES — CLICK TRACK TO MONITOR LIVE
              </div>
              <div style={{ maxHeight:260, overflowY:"auto" }}>
                {ongoingRides.map((r) => {
                  const isTracking = trackedRide?.id === r.id;
                  const canTrack   = isTrackable(r);
                  return (
                    <div
                      key={r.id}
                      style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 18px", borderBottom:"1px solid rgba(255,255,255,0.03)", background:isTracking?"rgba(212,175,55,0.07)":selectedMapRide===r.id?"rgba(212,175,55,0.03)":"transparent", transition:"background .15s" }}
                    >
                      <MapPin size={14} color="#D4AF37" style={{ flexShrink:0 }} />
                      <div
                        style={{ flex:1, minWidth:0, cursor:"pointer" }}
                        onClick={() => setSelectedMapRide(r.id)}
                      >
                        <div style={{ fontSize:13, color:"#fff", fontWeight:500 }}>
                          #{r.id} · {r.passenger_name || "—"} → {r.driver_name || "—"}
                        </div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>
                          {r.vehicle_type} · {fmtRupee(r.final_fare)} · {r.pickup_address || "No address"}
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                      {isTracking ? (
                        <button onClick={stopLiveTracking} style={{ flexShrink:0, padding:"5px 12px", borderRadius:8, border:"1px solid rgba(239,68,68,0.4)", background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>
                          Stop
                        </button>
                      ) : (
                        <button
                          onClick={() => canTrack && startLiveTracking(r)}
                          disabled={!canTrack}
                          title={!canTrack ? "No tracking available" : "Start live tracking"}
                          style={{ flexShrink:0, padding:"5px 12px", borderRadius:8, border:`1px solid ${canTrack?"rgba(212,175,55,0.4)":"rgba(255,255,255,0.1)"}`, background:canTrack?"rgba(212,175,55,0.1)":"rgba(255,255,255,0.03)", color:canTrack?"#D4AF37":"rgba(255,255,255,0.2)", fontSize:11, fontWeight:700, cursor:canTrack?"pointer":"not-allowed", fontFamily:"Outfit,sans-serif" }}>
                          Track
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {viewMode === "table" && (
        <>
          <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
            {sel(status, setStatus, [["","All Status"],["requested","Requested"],["driver_assigned","Driver Assigned"],["driver_arrived","Driver Arrived"],["in_progress","In Progress"],["completed","Completed"],["cancelled","Cancelled"]])}
            {sel(vehicle, setVehicle, [["","All Vehicles"],["bike","Bike"],["auto","Auto"],["car","Car"],["xl","XL"],["premium","Premium"]])}
            <input type="date" value={startDate} onChange={(e)=>{setStart(e.target.value);setOffset(0);}} style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 12px", color:"rgba(255,255,255,0.7)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif" }} />
            <input type="date" value={endDate} onChange={(e)=>{setEnd(e.target.value);setOffset(0);}} style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 12px", color:"rgba(255,255,255,0.7)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif" }} />
            {(status||vehicle||startDate||endDate) && (
              <button onClick={()=>{setStatus("");setVehicle("");setStart("");setEnd("");setOffset(0);}} style={{ height:40, padding:"0 14px", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, color:"#f87171", fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>Clear</button>
            )}
          </div>

          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>
                  {["Ride ID","Passenger","Driver","Vehicle","Pickup","Fare","Status","Date"].map((c)=><TH key={c} c={c}/>)}
                </tr></thead>
                <tbody>
                  {loading
                    ? Array(6).fill(0).map((_,i)=>(
                        <tr key={i}><td colSpan={8}><div style={{ height:48, background:"rgba(255,255,255,0.03)", margin:"4px 0", borderRadius:8, animation:"gmPulse 1.5s ease-in-out infinite" }}/></td></tr>
                      ))
                    : rides.length === 0
                      ? <tr><td colSpan={8} style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>No rides found</td></tr>
                      : rides.map((r) => (
                        <tr key={r.id} onClick={() => setModal(r)} style={{ cursor:"pointer" }} onMouseEnter={(e)=>e.currentTarget.style.background="rgba(212,175,55,0.03)"} onMouseLeave={(e)=>e.currentTarget.style.background=""}>
                          <TD><span style={{ color:"rgba(212,175,55,0.7)", fontFamily:"monospace", fontSize:12 }}>#{r.id}</span></TD>
                          <TD><div style={{ fontWeight:500 }}>{r.passenger_name||"—"}</div><div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{r.passenger_phone||""}</div></TD>
                          <TD>{r.driver_name||"—"}</TD>
                          <TD><span style={{ textTransform:"capitalize", color:"rgba(255,255,255,0.6)" }}>{r.vehicle_type||"—"}</span></TD>
                          <TD style={{ maxWidth:160 }}><div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.pickup_address||"—"}</div></TD>
                          <TD><span style={{ fontWeight:700, color:"#D4AF37" }}>{fmtRupee(r.final_fare)}</span></TD>
                          <TD><StatusBadge status={r.status} /></TD>
                          <TD style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>{fmtDateTime(r.created_at)}</TD>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ padding:"14px 20px", borderTop:"1px solid rgba(212,175,55,0.08)" }}>
                <Pagination page={currentPage} total={total} perPage={LIMIT} onChange={(p) => setOffset((p-1)*LIMIT)} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
