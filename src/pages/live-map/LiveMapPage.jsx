import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import {
  getLiveMapDrivers, getLiveMapRides, getTodayRides,
  sendGroupNotification, sendDriverNotification,
} from '../../api/admin';
import {
  RefreshCw, Bell, X, Send, MapPin, MapPinOff,
  Layers, Flame, Car, Bike, TrendingUp, Clock, PenTool,
} from 'lucide-react';

// ── icons fix ────────────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const VEHICLE_COLORS = { car: '#3b82f6', premium: '#8b5cf6', auto: '#f59e0b', bike: '#10b981' };
const VEHICLE_LABELS = { car: 'Cab', premium: 'Premium', auto: 'Auto', bike: 'Bike' };
const ALL_TYPES = Object.keys(VEHICLE_COLORS);
const NCR_CENTER = [28.6139, 77.2090];
const NCR_ZOOM   = 11;

const CAR_SVG  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-5h14v5z"/><circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg>`;
const BIKE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17" r="3"/><circle cx="18.5" cy="17" r="3"/><path d="M9 17l3-7h4l2.5 7"/><path d="M12 10l-1.5-3"/><path d="M16 10l2-2.5 3.5 1"/></svg>`;
const AUTO_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="13" height="7" rx="1"/><path d="M3 11h13"/><path d="M16 9h4l1 6h-5V9z"/><circle cx="8" cy="18.5" r="2"/><circle cx="18" cy="18.5" r="2"/></svg>`;

const vehicleIcon = (type) => {
  const t = (type?.toLowerCase() === 'cab') ? 'car' : (type?.toLowerCase() || '');
  const color = VEHICLE_COLORS[t] || '#6b7280';
  const svg   = t === 'bike' ? BIKE_SVG : t === 'auto' ? AUTO_SVG : CAR_SVG;
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">${svg}</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16],
  });
};

const demandIcon = () => L.divIcon({
  className: '',
  html: `<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);opacity:0.85;"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7],
});

// ── Heatmap layer ─────────────────────────────────────────────────────────────
function HeatmapLayer({ points, gradient, radius = 40, blur = 30 }) {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    const heat = L.heatLayer(points, {
      radius, blur, maxZoom: 14, max: 1.0,
      gradient: gradient || {
        0.0: '#3b82f6', 0.3: '#06b6d4', 0.5: '#22c55e',
        0.7: '#f59e0b', 0.85: '#ef4444', 1.0: '#7c3aed',
      },
    });
    heat.addTo(map);
    return () => { map.removeLayer(heat); };
  }, [map, points, gradient, radius, blur]);
  return null;
}

// ── Draw zone tool ────────────────────────────────────────────────────────────
function DrawZoneLayer({ active, onZoneDrawn }) {
  const map = useMap();
  const drawRef = useRef(null);

  useEffect(() => {
    if (!active) {
      if (drawRef.current) { drawRef.current.disable(); drawRef.current = null; }
      return;
    }
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    const draw = new L.Draw.Polygon(map, {
      shapeOptions: { color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.15, weight: 2 },
    });
    draw.enable();
    drawRef.current = draw;

    const onCreated = (e) => {
      const latlngs = e.layer.getLatLngs()[0];
      drawnItems.addLayer(e.layer);
      onZoneDrawn(latlngs, () => { map.removeLayer(drawnItems); });
    };
    map.on(L.Draw.Event.CREATED, onCreated);
    return () => {
      map.off(L.Draw.Event.CREATED, onCreated);
      map.removeLayer(drawnItems);
      if (drawRef.current) { drawRef.current.disable(); drawRef.current = null; }
    };
  }, [map, active, onZoneDrawn]);
  return null;
}

// ── Point-in-polygon helper ───────────────────────────────────────────────────
function pointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    if (((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi))
      inside = !inside;
  }
  return inside;
}

// ── Group notify modal ────────────────────────────────────────────────────────
function GroupNotifyModal({ onClose }) {
  const [group, setGroup]   = useState('online');
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr]       = useState('');

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { setErr('Title aur message dono required hain'); return; }
    setSending(true); setErr(''); setResult(null);
    try {
      const res = await sendGroupNotification(group, title.trim(), body.trim());
      setResult(res.data?.data || res.data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Error sending notification');
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell size={18} className="text-indigo-500"/> Group Notification
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Recipients</label>
            <div className="flex gap-2">
              {[['online','Online'],['ncr','NCR'],['all','All']].map(([key,label]) => (
                <button key={key} onClick={() => setGroup(key)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${group===key?'bg-indigo-600 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Title</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Notification title"
              className="w-full border dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Message</label>
            <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Message body" rows={3}
              className="w-full border dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"/>
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
          {result && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-300">
              ✓ Sent to <strong>{result.sent}</strong> drivers
              {result.failed > 0 && <span className="text-orange-500"> ({result.failed} failed)</span>}
            </div>
          )}
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
          <button onClick={handleSend} disabled={sending}
            className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
            {sending ? <RefreshCw size={14} className="animate-spin"/> : <Send size={14}/>}
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Zone notify modal ─────────────────────────────────────────────────────────
function ZoneNotifyModal({ drivers, onClose, onSent }) {
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]     = useState(false);
  const [err, setErr]       = useState('');

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { setErr('Title aur message required'); return; }
    setSending(true); setErr('');
    try {
      await Promise.all(drivers.map(d =>
        sendDriverNotification(d.driver_id || d.id, title.trim(), body.trim())
      ));
      setSent(true);
      setTimeout(() => { onSent(); onClose(); }, 1500);
    } catch (e) {
      setErr(e.response?.data?.message || 'Error sending');
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <PenTool size={18} className="text-amber-500"/> Zone Notification
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
            📍 <strong>{drivers.length} drivers</strong> is zone mein hain
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Title</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Demand high hai! Sector 39 jao"
              className="w-full border dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Message</label>
            <textarea value={body} onChange={e=>setBody(e.target.value)} rows={2}
              placeholder="e.g. Is area mein zyada rides aa rahi hain, shift ho jao"
              className="w-full border dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"/>
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
          {sent && <p className="text-sm text-green-600 font-medium">✓ Sent to {drivers.length} drivers!</p>}
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
          <button onClick={handleSend} disabled={sending || sent}
            className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
            {sending ? <RefreshCw size={14} className="animate-spin"/> : <Send size={14}/>}
            {sending ? 'Sending...' : `Send to ${drivers.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
// view modes: 'markers' | 'heatmap' | 'both'
// layer modes (can combine): 'supply' | 'demand' | 'rides' | 'idle'
export default function LiveMapPage() {
  const [drivers,      setDrivers]      = useState([]);
  const [demandRides,  setDemandRides]  = useState([]);
  const [historyRides, setHistoryRides] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [lastRefresh,  setLastRefresh]  = useState(null);
  const [notifyOpen,   setNotifyOpen]   = useState(false);
  const [view,         setView]         = useState('both');       // markers|heatmap|both
  const [activeLayer,  setActiveLayer]  = useState('supply');     // supply|demand|rides|idle
  const [vehicleFilter, setVehicleFilter] = useState(null);       // null = all
  const [drawMode,     setDrawMode]     = useState(false);
  const [zonedDrivers, setZonedDrivers] = useState(null);
  const [zoneClear,    setZoneClear]    = useState(null);
  const intervalRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const [drRes, demRes, histRes] = await Promise.all([
        getLiveMapDrivers(),
        getLiveMapRides(),
        getTodayRides(),
      ]);
      setDrivers(drRes.data?.data || []);
      setDemandRides(demRes.data?.data || demRes.data?.rides || []);
      setHistoryRides(histRes.data?.data || histRes.data?.rides || []);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Live map fetch error:', e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(() => {
      if (!document.hidden) fetchAll();
    }, 30_000);
    return () => clearInterval(intervalRef.current);
  }, [fetchAll]);

  // ── filtered driver sets ──────────────────────────────────────────────────
  const withLocation = drivers.filter(d => {
    if (!d.lat && !d.latitude) return false;
    if (!vehicleFilter) return true;
    const t = (d.vehicle_type || '').toLowerCase();
    return t === vehicleFilter || (vehicleFilter === 'car' && t === 'cab');
  }).map(d => ({ ...d, lat: d.lat || d.latitude, lng: d.lng || d.longitude }));

  const noLocation = drivers.filter(d => !d.lat && !d.latitude && !d.lng && !d.longitude);

  // idle = available, not on duty, no active ride
  const idleDrivers = withLocation.filter(d =>
    d.is_available && !d.is_on_duty && !d.active_ride_id
  );

  // ── heatmap point arrays ──────────────────────────────────────────────────
  const supplyPoints  = withLocation.map(d => [parseFloat(d.lat), parseFloat(d.lng), 1]);
  const idlePoints    = idleDrivers.map(d  => [parseFloat(d.lat), parseFloat(d.lng), 1]);
  const demandPoints  = demandRides
    .filter(r => r.pickup_latitude && r.pickup_longitude)
    .map(r => [parseFloat(r.pickup_latitude), parseFloat(r.pickup_longitude), 1]);
  const pickupPoints  = historyRides
    .filter(r => r.pickup_latitude && r.pickup_longitude)
    .map(r => [parseFloat(r.pickup_latitude), parseFloat(r.pickup_longitude), 0.8]);
  const dropoffPoints = historyRides
    .filter(r => r.dropoff_latitude && r.dropoff_longitude)
    .map(r => [parseFloat(r.dropoff_latitude), parseFloat(r.dropoff_longitude), 0.6]);

  const heatPoints = {
    supply: supplyPoints,
    demand: demandPoints,
    rides:  [...pickupPoints, ...dropoffPoints],
    idle:   idlePoints,
  };

  const heatGradients = {
    supply: { 0.0:'#3b82f6', 0.4:'#06b6d4', 0.65:'#22c55e', 0.85:'#f59e0b', 1.0:'#ef4444' },
    demand: { 0.0:'#fde68a', 0.5:'#f59e0b', 0.8:'#ef4444', 1.0:'#7f1d1d' },
    rides:  { 0.0:'#e0e7ff', 0.4:'#818cf8', 0.75:'#6366f1', 1.0:'#3730a3' },
    idle:   { 0.0:'#d1fae5', 0.5:'#6ee7b7', 0.8:'#10b981', 1.0:'#064e3b' },
  };

  // ── draw zone handler ─────────────────────────────────────────────────────
  const handleZoneDrawn = useCallback((polygon, clearFn) => {
    const inside = withLocation.filter(d =>
      pointInPolygon(parseFloat(d.lat), parseFloat(d.lng), polygon)
    );
    setZonedDrivers(inside);
    setZoneClear(() => clearFn);
    setDrawMode(false);
  }, [withLocation]);

  const layerTabs = [
    { key: 'supply', label: 'Supply',  icon: <Car size={12}/>,       desc: `${withLocation.length} drivers` },
    { key: 'demand', label: 'Demand',  icon: <TrendingUp size={12}/>, desc: `${demandPoints.length} searching` },
    { key: 'rides',  label: 'Rides',   icon: <MapPin size={12}/>,     desc: `${historyRides.length} today` },
    { key: 'idle',   label: 'Idle',    icon: <Clock size={12}/>,      desc: `${idleDrivers.length} idle` },
  ];

  return (
    <div className="flex flex-col" style={{ minHeight: '100vh' }}>

      {/* ── Top header ── */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b dark:border-gray-800 flex-shrink-0 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Live Map</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {loading ? 'Loading...' : (
              <>
                <span className="text-green-500 font-medium">{drivers.length}</span> online ·{' '}
                <span className="text-blue-500 font-medium">{withLocation.length}</span> on map ·{' '}
                <span className="text-red-500 font-medium">{demandPoints.length}</span> searching ·{' '}
                <span className="text-amber-500 font-medium">{idleDrivers.length}</span> idle
              </>
            )}
            {lastRefresh && (
              <span className="ml-2 text-xs text-gray-400">
                · {lastRefresh.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Markers / Both / Heatmap */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-0.5">
            {[
              { key:'markers', label:'Markers', icon:<MapPin size={12}/> },
              { key:'both',    label:'Both',    icon:<Layers size={12}/> },
              { key:'heatmap', label:'Heatmap', icon:<Flame size={12}/> },
            ].map(({ key, label, icon }) => (
              <button key={key} onClick={() => setView(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  view===key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                             : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}>
                {icon}{label}
              </button>
            ))}
          </div>

          {/* Draw zone */}
          <button onClick={() => setDrawMode(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
              drawMode
                ? 'bg-amber-500 text-white border-amber-500'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            <PenTool size={12}/>{drawMode ? 'Drawing... (click map)' : 'Draw Zone'}
          </button>

          <button onClick={() => { setLoading(true); fetchAll(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={14}/> Refresh
          </button>
          <button onClick={() => setNotifyOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
            <Bell size={14}/> Group Notify
          </button>
        </div>
      </div>

      {/* ── Layer tabs + vehicle filter + legend ── */}
      <div className="px-6 py-2 bg-white dark:bg-gray-900 border-b dark:border-gray-800 flex items-center gap-3 flex-shrink-0 flex-wrap">
        {/* Layer selector */}
        <div className="flex items-center gap-1">
          {layerTabs.map(({ key, label, icon, desc }) => (
            <button key={key} onClick={() => setActiveLayer(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeLayer===key
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}>
              {icon}{label}
              <span className={`text-xs opacity-70 ${activeLayer===key?'text-gray-300 dark:text-gray-600':'text-gray-400'}`}>
                {desc}
              </span>
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700"/>

        {/* Vehicle filter */}
        {activeLayer === 'supply' && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 mr-1">Type:</span>
            <button onClick={() => setVehicleFilter(null)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${!vehicleFilter?'bg-gray-800 dark:bg-white text-white dark:text-gray-900':'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
              All
            </button>
            {ALL_TYPES.map(t => (
              <button key={t} onClick={() => setVehicleFilter(vehicleFilter===t ? null : t)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                  vehicleFilter===t?'text-white':'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
                style={vehicleFilter===t ? { background: VEHICLE_COLORS[t] } : {}}>
                <span className="w-2 h-2 rounded-full" style={{ background: VEHICLE_COLORS[t] }}/>
                {VEHICLE_LABELS[t]}
              </button>
            ))}
          </div>
        )}

        {/* Heatmap density legend */}
        {view !== 'markers' && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ml-auto">
            <span>Low</span>
            <span className="w-16 h-2 rounded-full" style={{ background: `linear-gradient(to right, ${
              Object.values(heatGradients[activeLayer]).join(',')
            })` }}/>
            <span>High</span>
          </div>
        )}
        {view === 'markers' && activeLayer === 'supply' && (
          <div className="flex items-center gap-3 ml-auto">
            {Object.entries(VEHICLE_COLORS).map(([type, color]) => (
              <span key={type} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className="w-3 h-3 rounded-full" style={{ background: color }}/>
                {VEHICLE_LABELS[type]}
              </span>
            ))}
          </div>
        )}
        <span className="text-xs text-gray-400 ml-auto">Auto-refreshes every 30s</span>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative" style={{ minHeight: 400 }}>
        {loading && drivers.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <RefreshCw size={32} className="animate-spin"/>
              <p className="text-sm">Loading...</p>
            </div>
          </div>
        ) : (
          <MapContainer center={NCR_CENTER} zoom={NCR_ZOOM} style={{ height:'100%', width:'100%', minHeight:400 }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />

            {/* Heatmap layer */}
            {view !== 'markers' && heatPoints[activeLayer]?.length > 0 && (
              <HeatmapLayer
                points={heatPoints[activeLayer]}
                gradient={heatGradients[activeLayer]}
                radius={activeLayer === 'demand' ? 35 : 40}
              />
            )}

            {/* Supply markers */}
            {view !== 'heatmap' && activeLayer === 'supply' && withLocation.map(d => (
              <Marker key={d.id || d.driver_id} position={[parseFloat(d.lat), parseFloat(d.lng)]} icon={vehicleIcon(d.vehicle_type)}>
                <Popup>
                  <div className="min-w-[160px]">
                    <p className="font-semibold text-gray-900 text-sm">{d.full_name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{d.phone_number}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {d.vehicle_type && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium capitalize">{d.vehicle_type}</span>}
                      {d.city || d.city_name ? <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{d.city || d.city_name}</span> : null}
                      {d.is_on_duty ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">On ride</span>
                        : <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">Available</span>}
                    </div>
                    {d.online_seconds != null && (
                      <p className="text-gray-400 text-xs mt-1.5">
                        Online: {Math.round(d.online_seconds/60)}m · Rides: {d.session_rides_completed ?? '—'}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Demand markers (searching rides) */}
            {view !== 'heatmap' && activeLayer === 'demand' && demandRides
              .filter(r => r.pickup_latitude && r.pickup_longitude)
              .map(r => (
                <Marker key={r.id} position={[parseFloat(r.pickup_latitude), parseFloat(r.pickup_longitude)]} icon={demandIcon()}>
                  <Popup>
                    <div className="min-w-[140px]">
                      <p className="font-semibold text-xs text-red-600">🔴 Searching for driver</p>
                      <p className="text-gray-700 text-xs mt-1">{r.pickup_address || 'Pickup location'}</p>
                      {r.vehicle_type && <p className="text-gray-500 text-xs mt-0.5 capitalize">{r.vehicle_type}</p>}
                    </div>
                  </Popup>
                </Marker>
              ))
            }

            {/* Draw zone tool */}
            <DrawZoneLayer active={drawMode} onZoneDrawn={handleZoneDrawn}/>
          </MapContainer>
        )}

        {/* Draw mode hint */}
        {drawMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg">
            Map pe click karke zone draw karo — finish karne ke liye pehle point pe wapas click karo
          </div>
        )}
      </div>

      {/* ── Location pending strip ── */}
      {noLocation.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border-t dark:border-gray-800 px-6 py-4 flex-shrink-0">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <MapPinOff size={13}/> {noLocation.length} Online — Location Pending
          </p>
          <div className="flex flex-wrap gap-2">
            {noLocation.map(d => (
              <div key={d.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"/>
                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{d.full_name}</span>
                {d.vehicle_type && <span className="text-xs text-gray-400 capitalize">{d.vehicle_type}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {notifyOpen   && <GroupNotifyModal onClose={() => setNotifyOpen(false)}/>}
      {zonedDrivers && (
        <ZoneNotifyModal
          drivers={zonedDrivers}
          onClose={() => { setZonedDrivers(null); zoneClear?.(); }}
          onSent={() => { setZonedDrivers(null); zoneClear?.(); }}
        />
      )}
    </div>
  );
}
