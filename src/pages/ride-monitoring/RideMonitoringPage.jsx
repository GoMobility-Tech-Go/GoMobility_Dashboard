import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, MapPin, RefreshCw } from "lucide-react";
import { getRides } from "../../api/admin";
import { Pagination } from "../../components/ui/index.jsx";

const GMAPS_KEY = "AIzaSyB7WjbHRXaKMVYdZBAQCw_JobM6mcXSZss";

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
  { featureType:"administrative.land_parcel", elementType:"labels.text.fill", stylers:[{color:"#64779e"}] },
];

// Module-level Google Maps loader (avoids duplicate script injection)
let _gmState = "idle"; // "idle" | "loading" | "ready"
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
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&callback=__gmapsReady`;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  });
}

const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const fmtRupee = (n) => n != null ? "₹" + new Intl.NumberFormat("en-IN").format(n) : "—";

const STATUS_COLORS = {
  requested: { color:"#60a5fa", bg:"rgba(59,130,246,0.12)",  border:"rgba(59,130,246,0.3)"  },
  accepted:  { color:"#a78bfa", bg:"rgba(139,92,246,0.12)",  border:"rgba(139,92,246,0.3)"  },
  ongoing:   { color:"#fbbf24", bg:"rgba(245,158,11,0.12)",  border:"rgba(245,158,11,0.3)"  },
  completed: { color:"#4ade80", bg:"rgba(34,197,94,0.12)",   border:"rgba(34,197,94,0.3)"   },
  cancelled: { color:"#f87171", bg:"rgba(239,68,68,0.12)",   border:"rgba(239,68,68,0.3)"   },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_COLORS[status] || { color:"rgba(255,255,255,0.5)", bg:"rgba(255,255,255,0.06)", border:"rgba(255,255,255,0.1)" };
  return <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:s.bg, color:s.color, border:`1px solid ${s.border}`, textTransform:"capitalize" }}>{status || "—"}</span>;
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
            ["Passenger", ride.passenger_name || "—"],
            ["Driver",    ride.driver_name || "—"],
            ["Vehicle",   ride.vehicle_type || "—"],
            ["Status",    ride.status || "—"],
            ["Pickup",    ride.pickup_address || "—"],
            ["Drop",      ride.drop_address || "—"],
            ["Distance",  ride.distance_km ? `${ride.distance_km} km` : "—"],
            ["Duration",  ride.duration_minutes ? `${ride.duration_minutes} min` : "—"],
            ["Fare",      fmtRupee(ride.final_fare)],
            ["Payment",   ride.payment_method || "—"],
            ["Started",   fmtDateTime(ride.created_at)],
            ["Completed", fmtDateTime(ride.completed_at)],
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

const MapPanel = ({ rides, selectedId, onRideClick }) => {
  const containerRef  = useRef(null);
  const gMapRef       = useRef(null);
  const markersRef    = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        if (!containerRef.current || gMapRef.current) return;
        gMapRef.current = new window.google.maps.Map(containerRef.current, {
          center: { lat: 20.5937, lng: 78.9629 },
          zoom: 5,
          styles: DARK_MAP_STYLES,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        setMapReady(true);
      })
      .catch(() => setMapError(true));
  }, []);

  useEffect(() => {
    if (!mapReady || !gMapRef.current || !window.google?.maps) return;

    // Clear old markers + polylines
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const ridesWithCoords = rides.filter((r) => r.pickup_lat && r.pickup_lng);
    if (ridesWithCoords.length === 0) return;

    ridesWithCoords.forEach((ride) => {
      const hasPickup = !!(ride.pickup_lat && ride.pickup_lng);
      const hasDrop   = !!(ride.drop_lat   && ride.drop_lng);

      const infoContent = `
        <div style="font-family:'Outfit',sans-serif;padding:10px 12px;min-width:200px;color:#0c1f5e">
          <div style="font-weight:700;font-size:13px;margin-bottom:6px">Ride #${ride.id}</div>
          <div style="font-size:12px;margin-bottom:3px">🧑 ${ride.passenger_name || "—"}</div>
          <div style="font-size:12px;margin-bottom:3px">🚗 ${ride.driver_name || "—"} · <span style="text-transform:capitalize">${ride.vehicle_type || ""}</span></div>
          <div style="font-size:12px;margin-bottom:3px">💰 ${fmtRupee(ride.final_fare)}</div>
          ${ride.vehicle_number ? `<div style="font-size:11px;color:#666">🚘 ${ride.vehicle_number}</div>` : ""}
        </div>`;

      const infoWindow = new window.google.maps.InfoWindow({ content: infoContent });

      if (hasPickup) {
        const pickupMarker = new window.google.maps.Marker({
          position: { lat: parseFloat(ride.pickup_lat), lng: parseFloat(ride.pickup_lng) },
          map: gMapRef.current,
          title: `Pickup: ${ride.pickup_address || ""}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: "#4ade80", fillOpacity: 1,
            strokeColor: "#fff", strokeWeight: 2, scale: 9,
          },
        });
        pickupMarker.addListener("click", () => {
          infoWindow.open(gMapRef.current, pickupMarker);
          onRideClick && onRideClick(ride.id);
        });
        markersRef.current.push(pickupMarker);
      }

      if (hasDrop) {
        const dropMarker = new window.google.maps.Marker({
          position: { lat: parseFloat(ride.drop_lat), lng: parseFloat(ride.drop_lng) },
          map: gMapRef.current,
          title: `Drop: ${ride.drop_address || ""}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: "#f87171", fillOpacity: 1,
            strokeColor: "#fff", strokeWeight: 2, scale: 9,
          },
        });
        markersRef.current.push(dropMarker);
      }

      if (hasPickup && hasDrop) {
        const line = new window.google.maps.Polyline({
          path: [
            { lat: parseFloat(ride.pickup_lat), lng: parseFloat(ride.pickup_lng) },
            { lat: parseFloat(ride.drop_lat),   lng: parseFloat(ride.drop_lng)   },
          ],
          geodesic: true,
          strokeColor: "#D4AF37",
          strokeOpacity: 0.65,
          strokeWeight: 2,
          map: gMapRef.current,
        });
        markersRef.current.push(line);
      }
    });
  }, [rides, mapReady]);

  // Pan to selected ride
  useEffect(() => {
    if (!mapReady || !gMapRef.current || !selectedId) return;
    const ride = rides.find((r) => r.id === selectedId);
    if (!ride?.pickup_lat) return;
    gMapRef.current.panTo({ lat: parseFloat(ride.pickup_lat), lng: parseFloat(ride.pickup_lng) });
    gMapRef.current.setZoom(14);
  }, [selectedId, rides, mapReady]);

  if (mapError) {
    return (
      <div style={{ height:480, borderRadius:16, border:"1px solid rgba(212,175,55,0.1)", display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(255,255,255,0.02)", color:"#f87171", fontFamily:"Outfit,sans-serif", fontSize:13 }}>
        Failed to load Google Maps. Check your API key or network.
      </div>
    );
  }

  return (
    <div style={{ position:"relative" }}>
      <div ref={containerRef} style={{ width:"100%", height:480, borderRadius:16, overflow:"hidden", border:"1px solid rgba(212,175,55,0.15)" }} />
      {!mapReady && (
        <div style={{ position:"absolute", inset:0, background:"rgba(2,13,38,0.8)", borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.4)", fontFamily:"Outfit,sans-serif", fontSize:13 }}>
          Loading map…
        </div>
      )}
      <div style={{ position:"absolute", top:12, left:12, display:"flex", flexDirection:"column", gap:6, pointerEvents:"none" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(2,13,38,0.85)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:8, padding:"5px 10px" }}>
          <span style={{ width:10, height:10, borderRadius:"50%", background:"#4ade80", display:"inline-block", border:"1.5px solid #fff" }}/>
          <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)", fontFamily:"Outfit,sans-serif" }}>Pickup</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(2,13,38,0.85)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:8, padding:"5px 10px" }}>
          <span style={{ width:10, height:10, borderRadius:"50%", background:"#f87171", display:"inline-block", border:"1.5px solid #fff" }}/>
          <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)", fontFamily:"Outfit,sans-serif" }}>Drop</span>
        </div>
      </div>
    </div>
  );
};

export default function RideMonitoringPage() {
  const [rides, setRides]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [status, setStatus]       = useState("");
  const [vehicle, setVehicle]     = useState("");
  const [startDate, setStart]     = useState("");
  const [endDate, setEnd]         = useState("");
  const [offset, setOffset]       = useState(0);
  const [toast, setToast]         = useState(null);
  const [modal, setModal]         = useState(null);
  const [viewMode, setViewMode]   = useState("table"); // "table" | "map"
  const [ongoingRides, setOngoingRides]   = useState([]);
  const [ongoingLoading, setOngoingLoading] = useState(false);
  const [selectedMapRide, setSelectedMapRide] = useState(null);
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
    getRides({ status:"ongoing", limit:100 })
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setOngoingRides(d.rides || d.items || d.data || []);
      })
      .catch(() => showToast("Failed to load ongoing rides."))
      .finally(() => setOngoingLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (viewMode === "map") loadOngoing(); }, [viewMode, loadOngoing]);

  const totalPages = Math.ceil(total / LIMIT);
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
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
      <RideDetailModal ride={modal} onClose={()=>setModal(null)} />

      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Ride Monitoring</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Total: {total} rides</p>
      </div>

      {/* View Mode Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[["table","📋 Table View"],["map","🗺 Live Map"]].map(([v,l]) => (
          <button key={v} onClick={()=>setViewMode(v)} style={{ padding:"8px 18px", borderRadius:10, border:"1px solid", fontSize:13, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600, transition:"all .2s", borderColor:viewMode===v?"#D4AF37":"rgba(212,175,55,0.2)", background:viewMode===v?"rgba(212,175,55,0.12)":"transparent", color:viewMode===v?"#D4AF37":"rgba(255,255,255,0.5)" }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── MAP VIEW ── */}
      {viewMode === "map" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", fontFamily:"Outfit,sans-serif" }}>
              {ongoingLoading ? "Loading ongoing rides…" : `${ongoingRides.length} ongoing rides · click a marker for details`}
            </div>
            <button onClick={loadOngoing} disabled={ongoingLoading} style={{ display:"flex", alignItems:"center", gap:6, height:36, padding:"0 14px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:10, color:"#D4AF37", fontSize:12, cursor:"pointer", opacity:ongoingLoading?0.5:1 }}>
              <RefreshCw size={12}/> Refresh
            </button>
          </div>

          <MapPanel rides={ongoingRides} selectedId={selectedMapRide} onRideClick={(id) => setSelectedMapRide(id)} />

          {/* Ride list beside map for click-to-zoom */}
          {ongoingRides.length > 0 && (
            <div style={{ marginTop:14, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:14, overflow:"hidden" }}>
              <div style={{ padding:"12px 18px", borderBottom:"1px solid rgba(212,175,55,0.08)", fontFamily:"Cinzel,serif", color:"rgba(255,255,255,0.6)", fontSize:12, letterSpacing:"1px" }}>ONGOING RIDES — CLICK TO ZOOM</div>
              <div style={{ maxHeight:220, overflowY:"auto" }}>
                {ongoingRides.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedMapRide(r.id)}
                    style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 18px", cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,0.03)", background:selectedMapRide===r.id?"rgba(212,175,55,0.07)":"transparent", transition:"background .15s" }}
                    onMouseEnter={(e)=>{ if(selectedMapRide!==r.id) e.currentTarget.style.background="rgba(212,175,55,0.03)"; }}
                    onMouseLeave={(e)=>{ if(selectedMapRide!==r.id) e.currentTarget.style.background="transparent"; }}>
                    <MapPin size={14} color="#D4AF37" style={{ flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, color:"#fff", fontWeight:500 }}>#{r.id} · {r.passenger_name || "—"} → {r.driver_name || "—"}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>
                        {r.vehicle_type} · {fmtRupee(r.final_fare)} · {r.pickup_address || "No address"}
                      </div>
                    </div>
                    {selectedMapRide===r.id && <span style={{ fontSize:10, color:"#D4AF37", fontFamily:"Cinzel,serif" }}>VIEWING</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {viewMode === "table" && (
        <>
          <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
            {sel(status, setStatus, [["","All Status"],["requested","Requested"],["accepted","Accepted"],["ongoing","Ongoing"],["completed","Completed"],["cancelled","Cancelled"]])}
            {sel(vehicle, setVehicle, [["","All Vehicles"],["bike","Bike"],["auto","Auto"],["car","Car"]])}
            <input type="date" value={startDate} onChange={(e)=>{setStart(e.target.value);setOffset(0);}} style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 12px", color:"rgba(255,255,255,0.7)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif" }} />
            <input type="date" value={endDate} onChange={(e)=>{setEnd(e.target.value);setOffset(0);}} style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 12px", color:"rgba(255,255,255,0.7)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif" }} />
            {(status||vehicle||startDate||endDate) && (
              <button onClick={()=>{setStatus("");setVehicle("");setStart("");setEnd("");setOffset(0);}} style={{ height:40, padding:"0 14px", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, color:"#f87171", fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>
                Clear
              </button>
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
                          <TD><div style={{ fontWeight:500 }}>{r.passenger_name || "—"}</div><div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{r.passenger_phone || ""}</div></TD>
                          <TD>{r.driver_name || "—"}</TD>
                          <TD><span style={{ textTransform:"capitalize", color:"rgba(255,255,255,0.6)" }}>{r.vehicle_type || "—"}</span></TD>
                          <TD style={{ maxWidth:160 }}><div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.pickup_address || "—"}</div></TD>
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
