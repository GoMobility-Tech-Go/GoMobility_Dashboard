import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  X, MapPin, RefreshCw, Navigation, Clock, Car,
  Search, Download, AlertTriangle, Star, TrendingUp,
  CheckCircle, XCircle, Activity, DollarSign,
} from "lucide-react";
import { getRides, getSosHistory } from "../../api/admin";
import { Pagination } from "../../components/ui/index.jsx";

const GMAPS_KEY     = "AIzaSyB7WjbHRXaKMVYdZBAQCw_JobM6mcXSZss";
const TRACKING_BASE = "https://api.gomobility.co.in/api/v1/tracking/public";
const POLL_MS       = 4000;

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

let _gmState = "idle", _gmResolvers = [];
function loadGoogleMaps() {
  return new Promise((resolve) => {
    if (_gmState === "ready" && window.google?.maps) { resolve(); return; }
    _gmResolvers.push(resolve);
    if (_gmState === "loading") return;
    _gmState = "loading";
    window.__gmapsReady = () => {
      _gmState = "ready";
      _gmResolvers.forEach(r => r());
      _gmResolvers = [];
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=geometry&callback=__gmapsReady`;
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  });
}

const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const fmtTime     = (d) => d ? new Date(d).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) : null;
const fmtRupee    = (n) => n != null ? "₹" + new Intl.NumberFormat("en-IN").format(Number(n).toFixed(0)) : "—";
const fmtMin      = (sec) => sec ? `${Math.ceil(sec / 60)} min` : "—";
const fmtKm       = (m) => m ? `${(m / 1000).toFixed(1)} km` : "—";

const animateMarker = (marker, fromLat, fromLng, toLat, toLng, duration, cancelRef) => {
  if (cancelRef.current) cancelAnimationFrame(cancelRef.current);
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    marker.setPosition({ lat: fromLat + (toLat-fromLat)*e, lng: fromLng + (toLng-fromLng)*e });
    if (t < 1) cancelRef.current = requestAnimationFrame(step);
    else cancelRef.current = null;
  };
  cancelRef.current = requestAnimationFrame(step);
};

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
  return <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:s.bg, color:s.color, border:`1px solid ${s.border}`, textTransform:"capitalize" }}>{status?.replace(/_/g," ") || "—"}</span>;
};

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
  <span style={{ flex:1 }}>{msg}</span>
  <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

// ── Stats Bar ──────────────────────────────────────────────────────────────────
const StatsBar = ({ stats, loading }) => {
  const items = [
    { icon:<Activity size={16}/>, label:"Today's Rides", value: loading ? "…" : stats.total, color:"#60a5fa" },
    { icon:<CheckCircle size={16}/>, label:"Completed", value: loading ? "…" : `${stats.completed}`, sub: stats.total > 0 ? `${Math.round(stats.completed/stats.total*100)}%` : "—", color:"#4ade80" },
    { icon:<XCircle size={16}/>, label:"Cancelled", value: loading ? "…" : `${stats.cancelled}`, sub: stats.total > 0 ? `${Math.round(stats.cancelled/stats.total*100)}%` : "—", color:"#f87171" },
    { icon:<TrendingUp size={16}/>, label:"Ongoing", value: loading ? "…" : stats.ongoing, color:"#fbbf24" },
    { icon:<DollarSign size={16}/>, label:"Avg Fare", value: loading ? "…" : (stats.fareCount > 0 ? fmtRupee(stats.totalFare/stats.fareCount) : "—"), color:"#D4AF37" },
  ];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:24 }}>
      {items.map(({ icon, label, value, sub, color }) => (
        <div key={label} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center", color, flexShrink:0 }}>{icon}</div>
          <div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:3 }}>{label}</div>
            <div style={{ fontSize:18, fontWeight:700, color:"rgba(255,255,255,0.9)", fontFamily:"Outfit,sans-serif", lineHeight:1 }}>
              {value}
              {sub && <span style={{ fontSize:11, color, marginLeft:6, fontWeight:600 }}>{sub}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Ride Detail Modal (with timeline, fare breakdown, rating, cancellation) ────
const RideDetailModal = ({ ride, onClose }) => {
  if (!ride) return null;

  // Build timeline from available timestamp fields
  const timelineSteps = [
    { key:"requested",       label:"Requested",       ts: ride.created_at,           color:"#60a5fa" },
    { key:"accepted",        label:"Driver Accepted",  ts: ride.accepted_at,          color:"#a78bfa" },
    { key:"driver_assigned", label:"Driver Assigned",  ts: ride.driver_assigned_at,   color:"#a78bfa" },
    { key:"driver_arrived",  label:"Driver Arrived",   ts: ride.driver_arrived_at,    color:"#fb923c" },
    { key:"started",         label:"Trip Started",     ts: ride.started_at,           color:"#fbbf24" },
    { key:"completed",       label:"Completed",        ts: ride.completed_at,         color:"#4ade80" },
    { key:"cancelled",       label:"Cancelled",        ts: ride.cancelled_at,         color:"#f87171" },
  ].filter(s => s.ts);

  const baseFare  = ride.base_fare       ?? ride.estimated_fare ?? null;
  const surgeAmt  = ride.surge_amount    ?? ride.surge_fare     ?? null;
  const discount  = ride.discount_amount ?? null;
  const gst       = ride.gst_amount      ?? null;
  const finalFare = ride.final_fare      ?? null;

  const rating = ride.driver_rating ?? ride.passenger_rating_to_driver ?? ride.rating ?? null;
  const cancelReason = ride.cancellation_reason ?? ride.cancel_reason ?? ride.cancelled_reason ?? null;
  const cancelledBy  = ride.cancelled_by ?? null;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:999, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div style={{ background:"#020d26", border:"1px solid rgba(212,175,55,0.2)", borderRadius:20, width:560, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 24px", borderBottom:"1px solid rgba(212,175,55,0.1)", position:"sticky", top:0, background:"#020d26", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <h3 style={{ fontFamily:"Cinzel,serif", color:"#fff", fontSize:16, margin:0 }}>Ride #{ride.id}</h3>
            <StatusBadge status={ride.status}/>
            {rating && (
              <div style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:12, padding:"2px 8px" }}>
                <Star size={11} color="#fbbf24" fill="#fbbf24"/>
                <span style={{ fontSize:12, color:"#fbbf24", fontWeight:700 }}>{Number(rating).toFixed(1)}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={14}/></button>
        </div>

        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:20 }}>

          {/* Cancellation reason alert */}
          {ride.status === "cancelled" && (
            <div style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:12, padding:"12px 16px", display:"flex", gap:10 }}>
              <AlertTriangle size={16} color="#f87171" style={{ flexShrink:0, marginTop:1 }}/>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"#f87171", marginBottom:2 }}>
                  Cancelled{cancelledBy ? ` by ${cancelledBy}` : ""}
                </div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>
                  {cancelReason || "No reason provided"}
                </div>
              </div>
            </div>
          )}

          {/* Basic info grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[
              ["Passenger", ride.passenger_name||"—"],
              ["Driver",    ride.driver_name||"—"],
              ["Vehicle",   ride.vehicle_type||"—"],
              ["Payment",   ride.payment_method||"—"],
              ["Pickup",    ride.pickup_address||"—"],
              ["Drop",      ride.dropoff_address||"—"],
              ["Distance",  ride.actual_distance_km ? `${parseFloat(ride.actual_distance_km).toFixed(1)} km` : ride.distance_km ? `${ride.distance_km} km` : "—"],
              ["Duration",  ride.duration_minutes ? `${ride.duration_minutes} min` : ride.actual_duration_seconds ? `${Math.ceil(ride.actual_duration_seconds/60)} min` : "—"],
            ].map(([l,v]) => (
              <div key={l}>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:3 }}>{l}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.8)", fontWeight:500 }}>{String(v)}</div>
              </div>
            ))}
          </div>

          {/* Fare Breakdown */}
          <div style={{ background:"rgba(212,175,55,0.04)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:14, overflow:"hidden" }}>
            <div style={{ padding:"10px 16px", borderBottom:"1px solid rgba(212,175,55,0.08)", fontSize:10, color:"rgba(212,175,55,0.6)", textTransform:"uppercase", letterSpacing:"1px", fontFamily:"Cinzel,serif" }}>
              Fare Breakdown
            </div>
            <div style={{ padding:"12px 16px" }}>
              {[
                baseFare  != null ? ["Base Fare",       fmtRupee(baseFare),  false] : null,
                surgeAmt  != null ? ["Surge",           `+${fmtRupee(surgeAmt)}`, false] : null,
                discount  != null ? ["Discount",        `-${fmtRupee(discount)}`, false] : null,
                gst       != null ? ["GST",             `+${fmtRupee(gst)}`, false] : null,
                ["Final Fare", fmtRupee(finalFare), true],
              ].filter(Boolean).map(([label, val, bold]) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:bold?"1px solid rgba(212,175,55,0.1)":"none", marginBottom:bold?4:0 }}>
                  <span style={{ fontSize:13, color:bold?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.45)" }}>{label}</span>
                  <span style={{ fontSize:bold?17:13, fontWeight:bold?700:500, color:bold?"#D4AF37":"rgba(255,255,255,0.6)" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          {timelineSteps.length > 0 && (
            <div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:12, fontFamily:"Cinzel,serif" }}>Ride Timeline</div>
              <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                {timelineSteps.map((step, i) => (
                  <div key={step.key} style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:step.color, border:`2px solid ${step.color}`, flexShrink:0, marginTop:3 }}/>
                      {i < timelineSteps.length-1 && <div style={{ width:2, height:24, background:"rgba(255,255,255,0.08)", margin:"2px 0" }}/>}
                    </div>
                    <div style={{ paddingBottom: i < timelineSteps.length-1 ? 0 : 0 }}>
                      <span style={{ fontSize:13, color:"rgba(255,255,255,0.75)", fontWeight:500 }}>{step.label}</span>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginLeft:8 }}>{fmtTime(step.ts)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment status */}
          {(ride.ride_payment_status || ride.payment_status) && (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>Payment Status:</span>
              <span style={{ fontSize:12, fontWeight:600, textTransform:"capitalize", color:(ride.ride_payment_status||ride.payment_status)==="completed"||(ride.ride_payment_status||ride.payment_status)==="cash_collected"?"#4ade80":"#f87171" }}>
                {(ride.ride_payment_status||ride.payment_status||"—").replace(/_/g," ")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── MapPanel ───────────────────────────────────────────────────────────────────
const MapPanel = ({ rides, selectedId, onRideClick, trackingData, onStopTracking, onTrackRide, sosRideIds }) => {
  const containerRef     = useRef(null);
  const gMapRef          = useRef(null);
  const staticMarkersRef = useRef([]);
  const driverMarkerRef  = useRef(null);
  const trackingLinesRef = useRef([]);
  const pickupMarkerRef  = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const animFrameRef     = useRef(null);
  const remainingLineRef = useRef(null);
  const traveledLineRef  = useRef(null);
  const fullRoutePathRef = useRef(null);
  const lastPolylineRef  = useRef(null);
  const driverHistoryRef = useRef([]);
  const lastPanPosRef    = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        if (!containerRef.current || gMapRef.current) return;
        gMapRef.current = new window.google.maps.Map(containerRef.current, {
          center: { lat:28.6, lng:77.2 }, zoom:11, styles:DARK_MAP_STYLES,
          mapTypeControl:false, streetViewControl:false, fullscreenControl:true,
        });
        setMapReady(true);
      })
      .catch(() => setMapError(true));
  }, []);

  useEffect(() => {
    if (!mapReady || !gMapRef.current || !window.google?.maps) return;
    staticMarkersRef.current.forEach(m => m.setMap?.(null));
    staticMarkersRef.current = [];
    Object.keys(window).filter(k => k.startsWith('__gmTrack_')).forEach(k => delete window[k]);

    const ridesWithCoords = rides.filter(r => r.pickup_latitude && r.pickup_longitude);
    if (!ridesWithCoords.length) return;

    const bounds = new window.google.maps.LatLngBounds();
    const TRACK_STS = new Set(["driver_assigned","driver_arrived","in_progress","ongoing","accepted"]);

    ridesWithCoords.forEach((ride) => {
      const hasDrop  = !!(ride.dropoff_latitude && ride.dropoff_longitude);
      const canTrack = TRACK_STS.has(ride.status) || !!ride.tracking_token;
      const hasSOS   = sosRideIds?.has(String(ride.id));

      const infoContent = `
        <div style="font-family:'Outfit',sans-serif;padding:10px 12px;min-width:200px;color:#0c1f5e">
          <div style="font-weight:700;font-size:13px;margin-bottom:6px">
            ${hasSOS ? '<span style="color:#ef4444;margin-right:4px">🚨 SOS</span>' : ''}Ride #${ride.id}
          </div>
          <div style="font-size:12px;margin-bottom:3px">🧑 ${ride.passenger_name || "—"}</div>
          <div style="font-size:12px;margin-bottom:3px">🚗 ${ride.driver_name || "—"} · ${ride.vehicle_type || ""}</div>
          <div style="font-size:12px;color:#666;${canTrack ? "margin-bottom:8px" : ""}">💰 ${fmtRupee(ride.final_fare)}</div>
          ${canTrack ? `<button onclick="window['__gmTrack_${ride.id}']()" style="background:#D4AF37;color:#000;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;width:100%;font-family:sans-serif">🎯 Track Live</button>` : ""}
        </div>`;
      const iw = new window.google.maps.InfoWindow({ content:infoContent });
      window[`__gmTrack_${ride.id}`] = () => { iw.close(); onTrackRide?.(ride); };

      const pos = { lat:parseFloat(ride.pickup_latitude), lng:parseFloat(ride.pickup_longitude) };
      bounds.extend(pos);
      const m = new window.google.maps.Marker({
        position:pos, map:gMapRef.current, title:`Pickup: Ride #${ride.id}`,
        icon:{ path:window.google.maps.SymbolPath.CIRCLE, fillColor: hasSOS?"#ef4444":"#4ade80", fillOpacity:1, strokeColor:"#fff", strokeWeight:2, scale: hasSOS?10:8 },
      });
      m.addListener("click", () => { iw.open(gMapRef.current, m); onRideClick?.(ride.id); });
      staticMarkersRef.current.push(m);

      if (hasDrop) {
        const dp = { lat:parseFloat(ride.dropoff_latitude), lng:parseFloat(ride.dropoff_longitude) };
        bounds.extend(dp);
        const dm = new window.google.maps.Marker({
          position:dp, map:gMapRef.current, title:`Drop: Ride #${ride.id}`,
          icon:{ path:window.google.maps.SymbolPath.CIRCLE, fillColor:"#f87171", fillOpacity:1, strokeColor:"#fff", strokeWeight:2, scale:8 },
        });
        staticMarkersRef.current.push(dm);
        const line = new window.google.maps.Polyline({
          path:[pos,dp], geodesic:true, strokeColor:"#D4AF37", strokeOpacity:0.4, strokeWeight:2, map:gMapRef.current,
        });
        staticMarkersRef.current.push(line);
      }
    });

    if (ridesWithCoords.length > 0 && !trackingData)
      gMapRef.current.fitBounds(bounds, 80);
  }, [rides, mapReady, sosRideIds]);

  useEffect(() => {
    if (!mapReady || !gMapRef.current || !selectedId || trackingData) return;
    const ride = rides.find(r => r.id === selectedId);
    if (!ride?.pickup_latitude) return;
    gMapRef.current.panTo({ lat:parseFloat(ride.pickup_latitude), lng:parseFloat(ride.pickup_longitude) });
    gMapRef.current.setZoom(14);
  }, [selectedId, rides, mapReady, trackingData]);

  const clearTrackingOverlay = () => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    [driverMarkerRef,pickupMarkerRef,dropoffMarkerRef,remainingLineRef,traveledLineRef].forEach(r => { if (r.current) { r.current.setMap(null); r.current = null; } });
    trackingLinesRef.current.forEach(l => l.setMap(null));
    trackingLinesRef.current = [];
    fullRoutePathRef.current = lastPolylineRef.current = null;
    driverHistoryRef.current = [];
    lastPanPosRef.current = null;
  };

  useEffect(() => {
    if (!mapReady || !gMapRef.current || !window.google?.maps) return;
    if (!trackingData) { clearTrackingOverlay(); return; }
    const loc = trackingData.location, geom = window.google.maps.geometry;

    if (loc?.current?.latitude && loc?.current?.longitude) {
      const pos = { lat:parseFloat(loc.current.latitude), lng:parseFloat(loc.current.longitude) };
      if (driverMarkerRef.current) {
        const old = driverMarkerRef.current.getPosition();
        animateMarker(driverMarkerRef.current, old.lat(), old.lng(), pos.lat, pos.lng, POLL_MS, animFrameRef);
        if (geom && lastPanPosRef.current) {
          const moved = geom.spherical.computeDistanceBetween(
            new window.google.maps.LatLng(lastPanPosRef.current.lat, lastPanPosRef.current.lng),
            new window.google.maps.LatLng(pos.lat, pos.lng)
          );
          if (moved > 100) { gMapRef.current.panTo(pos); lastPanPosRef.current = pos; }
        }
      } else {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="#4285F4" stroke="white" stroke-width="2.5"/><text x="22" y="29" text-anchor="middle" font-size="20">🚗</text></svg>`;
        driverMarkerRef.current = new window.google.maps.Marker({
          position:pos, map:gMapRef.current, title:`Driver: ${trackingData.driver?.name||""}`,
          icon:{ url:"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(svg), scaledSize:new window.google.maps.Size(44,44), anchor:new window.google.maps.Point(22,22) },
          zIndex:20, animation:window.google.maps.Animation.DROP,
        });
        gMapRef.current.panTo(pos); gMapRef.current.setZoom(15);
        lastPanPosRef.current = pos;
      }
      driverHistoryRef.current.push(pos);
      if (driverHistoryRef.current.length > 1) {
        if (traveledLineRef.current) traveledLineRef.current.setPath(driverHistoryRef.current);
        else traveledLineRef.current = new window.google.maps.Polyline({ path:driverHistoryRef.current, geodesic:true, strokeColor:"#9CA3AF", strokeOpacity:0.55, strokeWeight:4, map:gMapRef.current, zIndex:3 });
      }
      const polylineStr = trackingData.routes?.toDropoff?.polyline;
      if (polylineStr && geom?.encoding) {
        if (polylineStr !== lastPolylineRef.current) {
          lastPolylineRef.current = polylineStr;
          try { fullRoutePathRef.current = geom.encoding.decodePath(polylineStr); } catch (_) { fullRoutePathRef.current = null; }
        }
        const fullPath = fullRoutePathRef.current;
        if (fullPath?.length) {
          const driverLatLng = new window.google.maps.LatLng(pos.lat, pos.lng);
          let minDist = Infinity, closestIdx = 0;
          fullPath.forEach((pt,i) => { const d = geom.spherical.computeDistanceBetween(pt,driverLatLng); if (d<minDist) { minDist=d; closestIdx=i; } });
          const rem = fullPath.slice(closestIdx);
          if (remainingLineRef.current) remainingLineRef.current.setPath(rem);
          else remainingLineRef.current = new window.google.maps.Polyline({ path:rem, geodesic:true, strokeColor:"#4285F4", strokeOpacity:0.9, strokeWeight:5, map:gMapRef.current, zIndex:5 });
        }
      }
    }
    if (loc?.pickup?.latitude && !pickupMarkerRef.current)
      pickupMarkerRef.current = new window.google.maps.Marker({ position:{lat:parseFloat(loc.pickup.latitude),lng:parseFloat(loc.pickup.longitude)}, map:gMapRef.current, title:`Pickup`, icon:{path:window.google.maps.SymbolPath.CIRCLE,fillColor:"#4ade80",fillOpacity:1,strokeColor:"#fff",strokeWeight:3,scale:11}, zIndex:15 });
    if (loc?.dropoff?.latitude && !dropoffMarkerRef.current)
      dropoffMarkerRef.current = new window.google.maps.Marker({ position:{lat:parseFloat(loc.dropoff.latitude),lng:parseFloat(loc.dropoff.longitude)}, map:gMapRef.current, title:`Drop`, icon:{path:window.google.maps.SymbolPath.CIRCLE,fillColor:"#f87171",fillOpacity:1,strokeColor:"#fff",strokeWeight:3,scale:11}, zIndex:15 });
    if (trackingData.routes?.toPickup?.polyline && geom?.encoding) {
      trackingLinesRef.current.forEach(l => l.setMap(null)); trackingLinesRef.current = [];
      try {
        const path = geom.encoding.decodePath(trackingData.routes.toPickup.polyline);
        trackingLinesRef.current.push(new window.google.maps.Polyline({ path, geodesic:true, strokeColor:"#60a5fa", strokeOpacity:0.9, strokeWeight:3, icons:[{icon:{path:"M 0,-1 0,1",strokeOpacity:1,scale:3},offset:"0",repeat:"12px"}], map:gMapRef.current, zIndex:4 }));
      } catch (_) {}
    }
  }, [trackingData, mapReady]);

  useEffect(() => () => {
    clearTrackingOverlay();
    Object.keys(window).filter(k=>k.startsWith('__gmTrack_')).forEach(k=>delete window[k]);
  }, []);

  if (mapError) return <div style={{ height:480, borderRadius:16, border:"1px solid rgba(212,175,55,0.1)", display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(255,255,255,0.02)", color:"#f87171", fontFamily:"Outfit,sans-serif", fontSize:13 }}>Failed to load Google Maps.</div>;

  return (
    <div style={{ position:"relative" }}>
      <div ref={containerRef} style={{ width:"100%", height:480, borderRadius:16, overflow:"hidden", border:"1px solid rgba(212,175,55,0.15)" }} />
      {!mapReady && <div style={{ position:"absolute", inset:0, background:"rgba(2,13,38,0.8)", borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.4)", fontFamily:"Outfit,sans-serif", fontSize:13 }}>Loading map…</div>}
      <div style={{ position:"absolute", top:12, left:12, display:"flex", flexDirection:"column", gap:6, pointerEvents:"none" }}>
        {[trackingData?["🚗","#4285F4","Driver (Live)"]:null, ["●","#4ade80","Pickup"], ["●","#f87171","Drop"]].filter(Boolean).map(([icon,color,label]) => (
          <div key={label} style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(2,13,38,0.85)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:8, padding:"5px 10px" }}>
            <span style={{ width:10, height:10, borderRadius:"50%", background:color, display:"inline-block", border:"1.5px solid #fff" }}/>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)", fontFamily:"Outfit,sans-serif" }}>{label}</span>
          </div>
        ))}
      </div>
      {trackingData && (
        <div style={{ position:"absolute", top:12, right:12, display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.4)", borderRadius:20, padding:"6px 12px" }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80", display:"inline-block", animation:"livePulse 1.2s ease-in-out infinite" }}/>
            <span style={{ fontSize:11, color:"#4ade80", fontFamily:"Outfit,sans-serif", fontWeight:700 }}>LIVE</span>
          </div>
          <button onClick={onStopTracking} style={{ background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:20, padding:"6px 12px", color:"#f87171", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>Stop</button>
        </div>
      )}
    </div>
  );
};

// ── TrackingPanel ──────────────────────────────────────────────────────────────
const TrackingPanel = ({ trackingData, trackedRide, error }) => {
  if (error) return <div style={{ marginTop:14, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:14, padding:"16px 20px", color:"#f87171", fontFamily:"Outfit,sans-serif", fontSize:13 }}>{error}</div>;
  if (!trackingData && !trackedRide) return null;
  const { driver, passenger, location:loc, eta, status } = trackingData || {};
  return (
    <div style={{ marginTop:14, background:"rgba(212,175,55,0.04)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:16, overflow:"hidden" }}>
      <div style={{ padding:"12px 20px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontFamily:"Cinzel,serif", color:"rgba(255,255,255,0.7)", fontSize:12, letterSpacing:"1px" }}>LIVE — RIDE #{trackingData?.rideId || trackedRide?.id}</span>
          <StatusBadge status={status || trackedRide?.status}/>
        </div>
        {!trackingData && <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)", fontFamily:"Outfit,sans-serif", animation:"gmPulse 1.5s ease-in-out infinite" }}>Connecting…</span>}
      </div>
      {trackingData && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:0 }}>
          <div style={{ padding:"16px 20px", borderRight:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6, display:"flex", alignItems:"center", gap:5 }}><Clock size={10}/> ETA</div>
            {eta ? (<><div style={{ fontSize:22, fontWeight:700, color:"#D4AF37", fontFamily:"Outfit,sans-serif" }}>{fmtMin(eta.remainingDuration)}</div><div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{fmtKm(eta.remainingDistance)} remaining</div></>) : <div style={{ fontSize:14, color:"rgba(255,255,255,0.3)" }}>Calculating…</div>}
          </div>
          <div style={{ padding:"16px 20px", borderRight:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6, display:"flex", alignItems:"center", gap:5 }}><Car size={10}/> Driver</div>
            <div style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{driver?.name||"—"}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{driver?.phone}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{driver?.vehicle?.type} · {driver?.vehicle?.number}</div>
          </div>
          <div style={{ padding:"16px 20px", borderRight:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>Passenger</div>
            <div style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{passenger?.name||"—"}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{passenger?.phone}</div>
          </div>
          <div style={{ padding:"16px 20px" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6, display:"flex", alignItems:"center", gap:5 }}><Navigation size={10}/> Route</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", marginBottom:4, display:"flex", alignItems:"flex-start", gap:5 }}><span style={{ color:"#4ade80", flexShrink:0, marginTop:1 }}>↑</span><span>{loc?.pickup?.address||loc?.pickup?.name||"Pickup"}</span></div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"flex-start", gap:5 }}><span style={{ color:"#f87171", flexShrink:0, marginTop:1 }}>↓</span><span>{loc?.dropoff?.address||loc?.dropoff?.name||"Drop"}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── RouteMapPanel ──────────────────────────────────────────────────────────────
const RouteMapPanel = ({ ride }) => {
  const containerRef = useRef(null);
  const gMapRef = useRef(null);
  const overlaysRef = useRef([]);
  const [ready, setReady] = useState(false);

  useEffect(() => { loadGoogleMaps().then(() => { if (!containerRef.current||gMapRef.current) return; gMapRef.current = new window.google.maps.Map(containerRef.current, { center:{lat:28.6,lng:77.2}, zoom:11, styles:DARK_MAP_STYLES, mapTypeControl:false, streetViewControl:false, fullscreenControl:false }); setReady(true); }); }, []);

  useEffect(() => {
    if (!ready||!gMapRef.current||!ride) return;
    overlaysRef.current.forEach(o=>o.setMap(null)); overlaysRef.current=[];
    const bounds = new window.google.maps.LatLngBounds();
    const mkr = (lat,lng,color,title) => { const pos={lat:parseFloat(lat),lng:parseFloat(lng)}; bounds.extend(pos); const m=new window.google.maps.Marker({position:pos,map:gMapRef.current,title,icon:{path:window.google.maps.SymbolPath.CIRCLE,fillColor:color,fillOpacity:1,strokeColor:"#fff",strokeWeight:3,scale:11},zIndex:10}); overlaysRef.current.push(m); };
    if (ride.pickup_latitude) mkr(ride.pickup_latitude,ride.pickup_longitude,"#4ade80","Pickup");
    if (ride.dropoff_latitude) mkr(ride.dropoff_latitude,ride.dropoff_longitude,"#f87171","Dropoff");
    const geom = window.google?.maps?.geometry?.encoding;
    if (ride.route_polyline && geom) {
      try { const path=geom.decodePath(ride.route_polyline); path.forEach(p=>bounds.extend(p)); overlaysRef.current.push(new window.google.maps.Polyline({path,geodesic:true,strokeColor:"#4A90E2",strokeOpacity:0.9,strokeWeight:5,map:gMapRef.current})); } catch (_) {}
    } else if (ride.pickup_latitude && ride.dropoff_latitude) {
      overlaysRef.current.push(new window.google.maps.Polyline({ path:[{lat:parseFloat(ride.pickup_latitude),lng:parseFloat(ride.pickup_longitude)},{lat:parseFloat(ride.dropoff_latitude),lng:parseFloat(ride.dropoff_longitude)}], geodesic:true, strokeColor:"#4A90E2", strokeOpacity:0.35, strokeWeight:3, icons:[{icon:{path:"M 0,-1 0,1",strokeOpacity:1,scale:3},offset:"0",repeat:"12px"}], map:gMapRef.current }));
    }
    if (!bounds.isEmpty()) gMapRef.current.fitBounds(bounds,60);
  }, [ride, ready]);

  useEffect(() => () => { overlaysRef.current.forEach(o=>o.setMap(null)); }, []);
  return <div ref={containerRef} style={{ width:"100%", height:380, borderRadius:14, overflow:"hidden", border:"1px solid rgba(212,175,55,0.15)" }} />;
};

// ── Export CSV ─────────────────────────────────────────────────────────────────
function exportToCSV(rides) {
  const headers = ["Ride ID","Passenger","Passenger Phone","Driver","Driver Phone","Vehicle","Pickup","Drop","Distance (km)","Fare","Payment","Status","Cancel Reason","Date"];
  const rows = rides.map(r => [
    r.id, r.passenger_name||"", r.passenger_phone||"", r.driver_name||"", r.driver_phone||"",
    r.vehicle_type||"",
    (r.pickup_address||"").replace(/"/g,"'"),
    (r.dropoff_address||"").replace(/"/g,"'"),
    r.actual_distance_km ? parseFloat(r.actual_distance_km).toFixed(1) : (r.distance_km||""),
    r.final_fare||"", r.payment_method||"", r.status||"",
    (r.cancellation_reason||r.cancel_reason||"").replace(/"/g,"'"),
    r.created_at ? new Date(r.created_at).toLocaleString("en-IN") : "",
  ]);
  const csv = [headers,...rows].map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `rides_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function RideMonitoringPage() {
  const [rides,         setRides]         = useState([]);
  const [total,         setTotal]         = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [status,        setStatus]        = useState("");
  const [vehicle,       setVehicle]       = useState("");
  const [payStatus,     setPayStatus]     = useState("");
  const [startDate,     setStart]         = useState("");
  const [endDate,       setEnd]           = useState("");
  const [search,        setSearch]        = useState("");
  const [offset,        setOffset]        = useState(0);
  const [toast,         setToast]         = useState(null);
  const [modal,         setModal]         = useState(null);
  const [viewMode,      setViewMode]      = useState("table");
  const [ongoingRides,  setOngoing]       = useState([]);
  const [ongoingLoading,setOngoingLoading]= useState(false);
  const [selectedMapRide,setSelectedMapRide]=useState(null);
  const [trackedRide,   setTrackedRide]   = useState(null);
  const [trackingData,  setTrackingData]  = useState(null);
  const [trackingErr,   setTrackingErr]   = useState(null);
  const [sosRideIds,    setSosRideIds]    = useState(new Set());
  const [todayStats,    setTodayStats]    = useState({ total:0, completed:0, cancelled:0, ongoing:0, totalFare:0, fareCount:0 });
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [historyRides,  setHistoryRides]  = useState([]);
  const [historyTotal,  setHistoryTotal]  = useState(0);
  const [historyLoading,setHistoryLoading]= useState(false);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [selectedHistory,setSelectedHistory]=useState(null);

  const pollRef      = useRef(null);
  const tableRefRef  = useRef(null);
  const LIMIT  = 10;
  const HLIMIT = 20;

  const showToast = (msg, type="error") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  // ── Today stats ─────────────────────────────────────────────────────────────
  const fetchTodayStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const today = new Date(); today.setHours(0,0,0,0);
      const res = await getRides({ limit:500, start_date:today.toISOString() });
      const d   = res.data?.data || res.data || {};
      const all = d.rides || d.items || d.data || [];
      const s   = { total:all.length, completed:0, cancelled:0, ongoing:0, totalFare:0, fareCount:0 };
      const ACTIVE = new Set(["requested","accepted","ongoing","in_progress","driver_assigned","driver_arrived"]);
      all.forEach(r => {
        if (r.status==="completed") { s.completed++; if (r.final_fare) { s.totalFare+=parseFloat(r.final_fare); s.fareCount++; } }
        if (r.status==="cancelled") s.cancelled++;
        if (ACTIVE.has(r.status))   s.ongoing++;
      });
      setTodayStats(s);
    } catch (_) {}
    finally { setStatsLoading(false); }
  }, []);

  // ── SOS alerts ──────────────────────────────────────────────────────────────
  const fetchSosAlerts = useCallback(async () => {
    try {
      const res = await getSosHistory({ limit:50 });
      const alerts = res.data?.data || res.data?.alerts || res.data || [];
      const arr = Array.isArray(alerts) ? alerts : [];
      setSosRideIds(new Set(arr.filter(a=>a.ride_id&&a.status==="active").map(a=>String(a.ride_id))));
    } catch (_) {}
  }, []);

  // ── Table load ───────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    const params = { limit:LIMIT, offset };
    if (status)    params.status          = status;
    if (vehicle)   params.vehicle_type    = vehicle;
    if (payStatus) params.payment_status  = payStatus;
    if (startDate) params.start_date      = startDate;
    if (endDate)   params.end_date        = endDate;
    getRides(params)
      .then(res => {
        const d = res.data?.data || res.data || {};
        setRides(d.rides || d.items || d.data || []);
        setTotal(d.pagination?.total || d.total || 0);
      })
      .catch(() => showToast("Failed to load rides."))
      .finally(() => setLoading(false));
  }, [status, vehicle, payStatus, startDate, endDate, offset]);

  const loadOngoing = useCallback(() => {
    setOngoingLoading(true);
    const ACTIVE = new Set(["requested","accepted","ongoing","in_progress","driver_assigned","driver_arrived"]);
    getRides({ limit:100 })
      .then(res => {
        const d = res.data?.data || res.data || {};
        setOngoing((d.rides||d.items||d.data||[]).filter(r=>ACTIVE.has(r.status)));
      })
      .catch(() => showToast("Failed to load ongoing rides."))
      .finally(() => setOngoingLoading(false));
  }, []);

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    getRides({ status:"completed", limit:HLIMIT, offset:historyOffset })
      .then(res => {
        const d = res.data?.data || res.data || {};
        const items = d.rides||d.items||d.data||[];
        setHistoryRides(items); setHistoryTotal(d.pagination?.total||d.total||0);
        if (items.length>0) setSelectedHistory(prev=>prev??items[0]);
      })
      .catch(() => showToast("Failed to load history."))
      .finally(() => setHistoryLoading(false));
  }, [historyOffset]);

  // Initial + periodic fetches
  useEffect(() => { fetchTodayStats(); fetchSosAlerts(); }, [fetchTodayStats, fetchSosAlerts]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (viewMode==="map") { loadOngoing(); fetchSosAlerts(); } }, [viewMode, loadOngoing, fetchSosAlerts]);
  useEffect(() => { if (viewMode==="history") loadHistory(); }, [viewMode, loadHistory]);

  // ── Table auto-refresh 30s ───────────────────────────────────────────────────
  useEffect(() => {
    if (viewMode !== "table") return;
    tableRefRef.current = setInterval(() => { if (!document.hidden) load(); }, 30_000);
    return () => clearInterval(tableRefRef.current);
  }, [viewMode, load]);

  // ── Live tracking ────────────────────────────────────────────────────────────
  const startLiveTracking = useCallback((ride) => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current=null; }
    setTrackedRide(ride); setTrackingData(null); setTrackingErr(null);
    if (!ride.tracking_token) { setTrackingErr("No tracking token — ride may not have started."); return; }
    const TERMINAL = new Set(["completed","cancelled","failed","rejected"]);
    const fetch = async () => {
      if (document.hidden) return;
      try {
        const res = await axios.get(`${TRACKING_BASE}/${ride.tracking_token}`);
        const d = res.data?.data||res.data;
        setTrackingData(d); setTrackingErr(null);
        if (d?.status && TERMINAL.has(d.status)) { clearInterval(pollRef.current); pollRef.current=null; }
      } catch { setTrackingErr("Tracking unavailable for this ride."); }
    };
    fetch();
    pollRef.current = setInterval(fetch, POLL_MS);
  }, []);

  const stopLiveTracking = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current=null; }
    setTrackedRide(null); setTrackingData(null); setTrackingErr(null);
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Client-side search filter ────────────────────────────────────────────────
  const q = search.toLowerCase().trim();
  const filteredRides = q
    ? rides.filter(r =>
        (r.passenger_name||"").toLowerCase().includes(q) ||
        (r.driver_name||"").toLowerCase().includes(q)    ||
        (r.passenger_phone||"").includes(q)              ||
        (r.driver_phone||"").includes(q)                 ||
        String(r.id).includes(q)
      )
    : rides;

  const LIVE_STATUSES = new Set(["driver_assigned","driver_arrived","in_progress","ongoing","accepted"]);
  const isTrackable = (ride) => LIVE_STATUSES.has(ride.status)||ride.tracking_token;
  const totalPages  = Math.ceil(total/LIMIT);
  const currentPage = Math.floor(offset/LIMIT)+1;

  const TH = ({c}) => <th style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", borderBottom:"1px solid rgba(212,175,55,0.1)", whiteSpace:"nowrap" }}>{c}</th>;
  const TD = ({children,style}) => <td style={{ padding:"14px 16px", fontSize:13, color:"rgba(255,255,255,0.8)", borderBottom:"1px solid rgba(255,255,255,0.04)", ...style }}>{children}</td>;

  const sel = (val, set, opts) => (
    <select value={val} onChange={e=>{set(e.target.value);setOffset(0);}} style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px", color:"rgba(255,255,255,0.8)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", cursor:"pointer" }}>
      {opts.map(([v,l])=><option key={v} value={v} style={{ background:"#020d26" }}>{l}</option>)}
    </select>
  );

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}@keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      <RideDetailModal ride={modal} onClose={()=>setModal(null)}/>

      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Ride Monitoring</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Total: {total} rides · Auto-refreshes every 30s</p>
      </div>

      {/* Stats Bar */}
      <StatsBar stats={todayStats} loading={statsLoading}/>

      {/* View Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[["table","📋 Table"],["map","🗺 Live Map"],["history","📍 Route History"]].map(([v,l]) => (
          <button key={v} onClick={()=>{setViewMode(v);if(v==="table")stopLiveTracking();}}
            style={{ padding:"8px 18px", borderRadius:10, border:"1px solid", fontSize:13, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600, transition:"all .2s", borderColor:viewMode===v?"#D4AF37":"rgba(212,175,55,0.2)", background:viewMode===v?"rgba(212,175,55,0.12)":"transparent", color:viewMode===v?"#D4AF37":"rgba(255,255,255,0.5)" }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── TABLE VIEW ── */}
      {viewMode==="table" && (
        <>
          {/* Filters */}
          <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
            {/* Search */}
            <div style={{ position:"relative", flex:"1 1 200px", minWidth:180 }}>
              <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.35)" }}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search passenger, driver, phone, ID…"
                style={{ width:"100%", boxSizing:"border-box", height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, paddingLeft:36, paddingRight:12, color:"rgba(255,255,255,0.8)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif" }}/>
            </div>
            {sel(status,setStatus,[["","All Status"],["requested","Requested"],["driver_assigned","Driver Assigned"],["driver_arrived","Driver Arrived"],["in_progress","In Progress"],["completed","Completed"],["cancelled","Cancelled"]])}
            {sel(vehicle,setVehicle,[["","All Vehicles"],["bike","Bike"],["auto","Auto"],["car","Car"],["xl","XL"],["premium","Premium"]])}
            {sel(payStatus,setPayStatus,[["","All Payments"],["completed","Paid"],["cash_collected","Cash Collected"],["pending","Pending"],["failed","Failed"]])}
            <input type="date" value={startDate} onChange={e=>{setStart(e.target.value);setOffset(0);}} style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 12px", color:"rgba(255,255,255,0.7)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif" }}/>
            <input type="date" value={endDate} onChange={e=>{setEnd(e.target.value);setOffset(0);}} style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 12px", color:"rgba(255,255,255,0.7)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif" }}/>
            {(status||vehicle||payStatus||startDate||endDate||search) && (
              <button onClick={()=>{setStatus("");setVehicle("");setPayStatus("");setStart("");setEnd("");setSearch("");setOffset(0);}}
                style={{ height:40, padding:"0 14px", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, color:"#f87171", fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>Clear</button>
            )}
            {/* Export */}
            <button onClick={()=>exportToCSV(filteredRides)} title="Export to CSV"
              style={{ height:40, padding:"0 14px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.25)", borderRadius:10, color:"#D4AF37", fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:6 }}>
              <Download size={14}/> Export CSV
            </button>
          </div>

          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>
                  {["Ride ID","Passenger","Driver","Vehicle","Pickup","Fare","Status","Date",""].map(c=><TH key={c} c={c}/>)}
                </tr></thead>
                <tbody>
                  {loading
                    ? Array(6).fill(0).map((_,i)=>(
                        <tr key={i}><td colSpan={9}><div style={{ height:48, background:"rgba(255,255,255,0.03)", margin:"4px 0", borderRadius:8, animation:"gmPulse 1.5s ease-in-out infinite" }}/></td></tr>
                      ))
                    : filteredRides.length===0
                      ? <tr><td colSpan={9} style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>No rides found</td></tr>
                      : filteredRides.map(r => {
                          const hasSOS = sosRideIds.has(String(r.id));
                          const cancelReason = r.cancellation_reason||r.cancel_reason||"";
                          return (
                            <tr key={r.id} onClick={()=>setModal(r)} style={{ cursor:"pointer" }}
                              onMouseEnter={e=>e.currentTarget.style.background="rgba(212,175,55,0.03)"}
                              onMouseLeave={e=>e.currentTarget.style.background=""}>
                              <TD>
                                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                  {hasSOS && <span title="Active SOS"><AlertTriangle size={12} color="#ef4444"/></span>}
                                  <span style={{ color:"rgba(212,175,55,0.7)", fontFamily:"monospace", fontSize:12 }}>#{r.id}</span>
                                </div>
                              </TD>
                              <TD>
                                <div style={{ fontWeight:500 }}>{r.passenger_name||"—"}</div>
                                <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{r.passenger_phone||""}</div>
                              </TD>
                              <TD>{r.driver_name||"—"}</TD>
                              <TD><span style={{ textTransform:"capitalize", color:"rgba(255,255,255,0.6)" }}>{r.vehicle_type||"—"}</span></TD>
                              <TD style={{ maxWidth:160 }}><div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.pickup_address||"—"}</div></TD>
                              <TD><span style={{ fontWeight:700, color:"#D4AF37" }}>{fmtRupee(r.final_fare)}</span></TD>
                              <TD>
                                <StatusBadge status={r.status}/>
                                {r.status==="cancelled" && cancelReason && (
                                  <div style={{ fontSize:10, color:"rgba(239,68,68,0.6)", marginTop:3, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={cancelReason}>{cancelReason}</div>
                                )}
                              </TD>
                              <TD style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>{fmtDateTime(r.created_at)}</TD>
                              <TD>
                                {isTrackable(r) && (
                                  <button onClick={e=>{e.stopPropagation();setViewMode("map");setTimeout(()=>startLiveTracking(r),200);}}
                                    style={{ padding:"4px 10px", borderRadius:8, border:"1px solid rgba(212,175,55,0.3)", background:"rgba(212,175,55,0.08)", color:"#D4AF37", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"Outfit,sans-serif", whiteSpace:"nowrap" }}>
                                    Track
                                  </button>
                                )}
                              </TD>
                            </tr>
                          );
                        })
                  }
                </tbody>
              </table>
            </div>
            {totalPages>1 && (
              <div style={{ padding:"14px 20px", borderTop:"1px solid rgba(212,175,55,0.08)" }}>
                <Pagination page={currentPage} total={total} perPage={LIMIT} onChange={p=>setOffset((p-1)*LIMIT)}/>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── MAP VIEW ── */}
      {viewMode==="map" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>
              {ongoingLoading ? "Loading…" : `${ongoingRides.length} ongoing rides`}
              {sosRideIds.size > 0 && <span style={{ color:"#ef4444", marginLeft:10, fontWeight:600 }}>🚨 {sosRideIds.size} SOS active</span>}
            </div>
            <button onClick={()=>{loadOngoing();fetchSosAlerts();}} disabled={ongoingLoading} style={{ display:"flex", alignItems:"center", gap:6, height:36, padding:"0 14px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:10, color:"#D4AF37", fontSize:12, cursor:"pointer", opacity:ongoingLoading?0.5:1 }}>
              <RefreshCw size={12}/> Refresh
            </button>
          </div>
          <MapPanel rides={ongoingRides} selectedId={selectedMapRide} onRideClick={id=>setSelectedMapRide(id)} trackingData={trackingData} onStopTracking={stopLiveTracking} onTrackRide={startLiveTracking} sosRideIds={sosRideIds}/>
          {(trackedRide||trackingErr) && <TrackingPanel trackingData={trackingData} trackedRide={trackedRide} error={trackingErr}/>}
          {ongoingRides.length>0 && (
            <div style={{ marginTop:14, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:14, overflow:"hidden" }}>
              <div style={{ padding:"12px 18px", borderBottom:"1px solid rgba(212,175,55,0.08)", fontFamily:"Cinzel,serif", color:"rgba(255,255,255,0.6)", fontSize:12, letterSpacing:"1px" }}>
                ONGOING RIDES
              </div>
              <div style={{ maxHeight:260, overflowY:"auto" }}>
                {ongoingRides.map(r => {
                  const isTracking = trackedRide?.id===r.id;
                  const canTrack   = isTrackable(r);
                  const hasSOS     = sosRideIds.has(String(r.id));
                  return (
                    <div key={r.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 18px", borderBottom:"1px solid rgba(255,255,255,0.03)", background:hasSOS?"rgba(239,68,68,0.05)":isTracking?"rgba(212,175,55,0.07)":"transparent", transition:"background .15s" }}>
                      {hasSOS
                        ? <AlertTriangle size={14} color="#ef4444" style={{ flexShrink:0 }}/>
                        : <MapPin size={14} color="#D4AF37" style={{ flexShrink:0 }}/>
                      }
                      <div style={{ flex:1, minWidth:0, cursor:"pointer" }} onClick={()=>setSelectedMapRide(r.id)}>
                        <div style={{ fontSize:13, color:"#fff", fontWeight:500 }}>
                          {hasSOS && <span style={{ color:"#ef4444", marginRight:6, fontSize:11, fontWeight:700 }}>🚨 SOS</span>}
                          #{r.id} · {r.passenger_name||"—"} → {r.driver_name||"—"}
                        </div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{r.vehicle_type} · {fmtRupee(r.final_fare)} · {r.pickup_address||"No address"}</div>
                      </div>
                      <StatusBadge status={r.status}/>
                      {isTracking
                        ? <button onClick={stopLiveTracking} style={{ flexShrink:0, padding:"5px 12px", borderRadius:8, border:"1px solid rgba(239,68,68,0.4)", background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>Stop</button>
                        : <button onClick={()=>canTrack&&startLiveTracking(r)} disabled={!canTrack} title={!canTrack?"No tracking":"Start tracking"} style={{ flexShrink:0, padding:"5px 12px", borderRadius:8, border:`1px solid ${canTrack?"rgba(212,175,55,0.4)":"rgba(255,255,255,0.1)"}`, background:canTrack?"rgba(212,175,55,0.1)":"rgba(255,255,255,0.03)", color:canTrack?"#D4AF37":"rgba(255,255,255,0.2)", fontSize:11, fontWeight:700, cursor:canTrack?"pointer":"not-allowed", fontFamily:"Outfit,sans-serif" }}>Track</button>
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ROUTE HISTORY ── */}
      {viewMode==="history" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <span style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>{historyLoading?"Loading…":`${historyTotal} completed rides · select to view route`}</span>
            <button onClick={loadHistory} disabled={historyLoading} style={{ display:"flex", alignItems:"center", gap:6, height:36, padding:"0 14px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:10, color:"#D4AF37", fontSize:12, cursor:"pointer", opacity:historyLoading?0.5:1, fontFamily:"Outfit,sans-serif" }}>
              <RefreshCw size={12}/> Refresh
            </button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:14, alignItems:"start" }}>
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:14, overflow:"hidden" }}>
              <div style={{ padding:"10px 14px", borderBottom:"1px solid rgba(212,175,55,0.08)", fontFamily:"Cinzel,serif", fontSize:11, color:"rgba(255,255,255,0.45)", letterSpacing:"1px" }}>COMPLETED RIDES</div>
              <div style={{ maxHeight:600, overflowY:"auto" }}>
                {historyLoading
                  ? Array(6).fill(0).map((_,i)=><div key={i} style={{ height:72, margin:"6px 10px", borderRadius:10, background:"rgba(255,255,255,0.03)", animation:"gmPulse 1.5s ease-in-out infinite" }}/>)
                  : historyRides.length===0
                    ? <div style={{ padding:32, textAlign:"center", color:"rgba(255,255,255,0.25)", fontSize:13 }}>No completed rides</div>
                    : historyRides.map(r => {
                        const isSel = selectedHistory?.id===r.id;
                        return (
                          <div key={r.id} onClick={()=>setSelectedHistory(r)} style={{ padding:"11px 14px", cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,0.03)", background:isSel?"rgba(212,175,55,0.07)":"transparent", borderLeft:isSel?"3px solid #D4AF37":"3px solid transparent", transition:"all .15s" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                              <span style={{ fontFamily:"monospace", fontSize:11, color:isSel?"#D4AF37":"rgba(212,175,55,0.5)" }}>#{r.id}</span>
                              <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)" }}>{fmtDateTime(r.completed_at||r.created_at)}</span>
                            </div>
                            <div style={{ fontSize:13, color:"rgba(255,255,255,0.85)", fontWeight:500 }}>{r.passenger_name||"—"}</div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:1 }}>Driver: {r.driver_name||"—"}</div>
                            <div style={{ display:"flex", gap:8, marginTop:5, alignItems:"center" }}>
                              <span style={{ fontSize:12, color:"#D4AF37", fontWeight:700 }}>{fmtRupee(r.final_fare)}</span>
                              {r.actual_distance_km && <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>{parseFloat(r.actual_distance_km).toFixed(1)} km</span>}
                              {(r.driver_rating||r.rating) && (
                                <span style={{ display:"flex", alignItems:"center", gap:2, fontSize:11, color:"#fbbf24" }}>
                                  <Star size={9} fill="#fbbf24"/>{Number(r.driver_rating||r.rating).toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                }
              </div>
              {historyTotal>HLIMIT && (
                <div style={{ padding:"10px 14px", borderTop:"1px solid rgba(212,175,55,0.08)" }}>
                  <Pagination page={Math.floor(historyOffset/HLIMIT)+1} total={historyTotal} perPage={HLIMIT} onChange={p=>{setHistoryOffset((p-1)*HLIMIT);setSelectedHistory(null);}}/>
                </div>
              )}
            </div>
            <div>
              {selectedHistory ? (
                <>
                  <RouteMapPanel ride={selectedHistory}/>
                  <div style={{ marginTop:12, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:14, overflow:"hidden" }}>
                    <div style={{ padding:"10px 18px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ fontFamily:"Cinzel,serif", fontSize:11, color:"rgba(255,255,255,0.5)", letterSpacing:"1px" }}>RIDE DETAILS — #{selectedHistory.id}</span>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        {(selectedHistory.driver_rating||selectedHistory.rating) && (
                          <div style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:12, padding:"3px 10px" }}>
                            <Star size={11} color="#fbbf24" fill="#fbbf24"/>
                            <span style={{ fontSize:12, color:"#fbbf24", fontWeight:700 }}>{Number(selectedHistory.driver_rating||selectedHistory.rating).toFixed(1)}</span>
                          </div>
                        )}
                        {selectedHistory.ride_number && <span style={{ fontFamily:"monospace", fontSize:11, color:"rgba(212,175,55,0.6)", background:"rgba(212,175,55,0.08)", padding:"3px 10px", borderRadius:6 }}>{selectedHistory.ride_number}</span>}
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 }}>
                      <div style={{ padding:"14px 18px", borderRight:"1px solid rgba(255,255,255,0.04)", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8, display:"flex", alignItems:"center", gap:5 }}><Navigation size={10}/> Route</div>
                        <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1, flexShrink:0, paddingTop:3 }}>
                            <span style={{ color:"#4ade80", fontSize:12, lineHeight:1 }}>●</span>
                            <span style={{ color:"rgba(255,255,255,0.12)", fontSize:9, letterSpacing:"-2px" }}>│││</span>
                            <span style={{ color:"#f87171", fontSize:12, lineHeight:1 }}>●</span>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)", marginBottom:12 }}>{selectedHistory.pickup_address||"—"}</div>
                            <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)" }}>{selectedHistory.dropoff_address||"—"}</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>Trip Info</div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                          {[
                            ["Distance", selectedHistory.actual_distance_km ? `${parseFloat(selectedHistory.actual_distance_km).toFixed(1)} km` : "—"],
                            ["Vehicle",  selectedHistory.vehicle_type||"—"],
                            ["Started",  fmtDateTime(selectedHistory.started_at)],
                            ["Completed",fmtDateTime(selectedHistory.completed_at)],
                          ].map(([l,v])=>(
                            <div key={l}><div style={{ fontSize:10, color:"rgba(255,255,255,0.28)" }}>{l}</div><div style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.85)", marginTop:2, textTransform:"capitalize" }}>{v}</div></div>
                          ))}
                        </div>
                      </div>
                      <div style={{ padding:"14px 18px", borderRight:"1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>Passenger</div>
                        <div style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{selectedHistory.passenger_name||"—"}</div>
                        {selectedHistory.passenger_phone && <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{selectedHistory.passenger_phone}</div>}
                      </div>
                      <div style={{ padding:"14px 18px" }}>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>Driver</div>
                        <div style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{selectedHistory.driver_name||"—"}</div>
                        {selectedHistory.driver_phone && <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{selectedHistory.driver_phone}</div>}
                      </div>
                    </div>
                    <div style={{ padding:"12px 18px", borderTop:"1px solid rgba(212,175,55,0.08)", display:"flex", alignItems:"center", gap:24, flexWrap:"wrap" }}>
                      <div>
                        <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginRight:8 }}>Fare</span>
                        <span style={{ fontSize:18, fontWeight:700, color:"#D4AF37" }}>{fmtRupee(selectedHistory.final_fare)}</span>
                      </div>
                      {selectedHistory.payment_method && <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)", textTransform:"capitalize" }}>Payment: {selectedHistory.payment_method.replace(/_/g," ")}</div>}
                      {(selectedHistory.ride_payment_status||selectedHistory.payment_status) && (
                        <div style={{ fontSize:12, textTransform:"capitalize", color:(selectedHistory.ride_payment_status||selectedHistory.payment_status)==="completed"||(selectedHistory.ride_payment_status||selectedHistory.payment_status)==="cash_collected"?"#4ade80":"rgba(255,255,255,0.4)" }}>
                          Status: {(selectedHistory.ride_payment_status||selectedHistory.payment_status||"—").replace(/_/g," ")}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:420, background:"rgba(255,255,255,0.01)", border:"1px solid rgba(212,175,55,0.07)", borderRadius:14, color:"rgba(255,255,255,0.2)", fontSize:14, gap:10 }}>
                  <MapPin size={32} color="rgba(212,175,55,0.2)"/>
                  <span>Select a completed ride to view its route</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
