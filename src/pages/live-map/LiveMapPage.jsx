import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getLiveMapDrivers, sendGroupNotification } from '../../api/admin';
import { RefreshCw, Bell, X, Send, Car, MapPin, MapPinOff } from 'lucide-react';

// Fix default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const VEHICLE_COLORS = { auto: '#f59e0b', cab: '#3b82f6', premium: '#8b5cf6', bike: '#10b981' };

const vehicleIcon = (type) => {
  const color = VEHICLE_COLORS[type?.toLowerCase()] || '#6b7280';
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-5h14v5z"/>
        <circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/>
      </svg>
    </div>`,
    iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16],
  });
};

function GroupNotifyModal({ onClose }) {
  const [group, setGroup] = useState('online');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

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
            <Bell size={18} className="text-indigo-500" /> Group Notification
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Recipients</label>
            <div className="flex gap-2">
              {[['online','Online Drivers'],['ncr','NCR Drivers'],['all','All Drivers']].map(([key,label]) => (
                <button key={key} onClick={() => setGroup(key)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${group===key?'bg-indigo-600 text-white shadow-sm':'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
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
              {result.failed > 0 && <span className="text-orange-600 dark:text-orange-400"> ({result.failed} failed)</span>}
            </div>
          )}
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={handleSend} disabled={sending}
            className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
            {sending ? <RefreshCw size={14} className="animate-spin"/> : <Send size={14}/>}
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LiveMapPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const intervalRef = useRef(null);

  const fetchDrivers = async () => {
    try {
      const res = await getLiveMapDrivers();
      setDrivers(res.data?.data || []);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Live map fetch error:', e);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDrivers();
    intervalRef.current = setInterval(fetchDrivers, 30_000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const withLocation = drivers.filter(d => d.lat && d.lng);
  const noLocation   = drivers.filter(d => !d.lat || !d.lng);
  const center = withLocation.length > 0
    ? [parseFloat(withLocation[0].lat), parseFloat(withLocation[0].lng)]
    : [28.6139, 77.2090];

  return (
    <div className="flex flex-col" style={{ minHeight:'100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b dark:border-gray-800 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Live Map</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {loading ? 'Loading...' : (
              <>
                <span className="text-green-500 font-medium">{drivers.length}</span> online ·{' '}
                <span className="text-blue-500 font-medium">{withLocation.length}</span> on map ·{' '}
                <span className="text-gray-400">{noLocation.length} location pending</span>
              </>
            )}
            {lastRefresh && (
              <span className="ml-2 text-xs text-gray-400">
                · {lastRefresh.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setLoading(true); fetchDrivers(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={14}/> Refresh
          </button>
          <button onClick={() => setNotifyOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
            <Bell size={14}/> Group Notify
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-2 bg-white dark:bg-gray-900 border-b dark:border-gray-800 flex items-center gap-4 flex-shrink-0 flex-wrap">
        {Object.entries(VEHICLE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span className="w-3 h-3 rounded-full" style={{ background: color }}/>
            {type.charAt(0).toUpperCase()+type.slice(1)}
          </span>
        ))}
        <span className="ml-auto text-xs text-gray-400">Auto-refreshes every 30s</span>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight:400 }}>
        {loading && drivers.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <RefreshCw size={32} className="animate-spin"/>
              <p className="text-sm">Loading...</p>
            </div>
          </div>
        ) : withLocation.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center text-gray-500">
              <MapPinOff size={48} className="mx-auto mb-3 opacity-30"/>
              <p className="font-medium">
                {drivers.length > 0
                  ? `${drivers.length} drivers online — location update pending`
                  : 'No drivers online right now'}
              </p>
              <p className="text-sm mt-1 text-gray-400">
                {drivers.length > 0
                  ? 'Driver app sends location every 30s — map will update automatically'
                  : 'Map will auto-refresh every 30 seconds'}
              </p>
            </div>
          </div>
        ) : (
          <MapContainer center={center} zoom={11} style={{ height:'100%', width:'100%', minHeight:400 }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />
            {withLocation.map(d => (
              <Marker key={d.id} position={[parseFloat(d.lat), parseFloat(d.lng)]} icon={vehicleIcon(d.vehicle_type)}>
                <Popup>
                  <div className="min-w-[160px]">
                    <p className="font-semibold text-gray-900 text-sm">{d.full_name}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{d.phone_number}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {d.vehicle_type && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium capitalize">{d.vehicle_type}</span>
                      )}
                      {d.city && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{d.city}</span>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Online drivers list — location pending section */}
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
                {d.vehicle_type && (
                  <span className="text-xs text-gray-400 capitalize">{d.vehicle_type}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {notifyOpen && <GroupNotifyModal onClose={() => setNotifyOpen(false)}/>}
    </div>
  );
}
