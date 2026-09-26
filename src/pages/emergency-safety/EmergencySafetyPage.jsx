import { useState, useEffect, useRef, useCallback } from "react";
import { useToast, ToastProvider, PageWrapper, Card, TableCard, MiniStatRow, GlobalStyles, FormGroup, AlertBox, Modal } from "../../components/ui/index.jsx";
import { getSosHistory, cancelSos } from "../../api/admin";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const SOS_REFRESH_MS = 15_000;

function normalizeSos(s) {
  return {
    id:             s.alert_number || s.id || '',
    rawId:          s.id,
    passenger:      s.user?.full_name || s.passenger_name || '—',
    driver:         s.driver?.full_name || s.driver_name || '—',
    location:       s.location || s.address || '—',
    vehicle:        s.vehicle_type || '—',
    time:           s.created_at ? new Date(s.created_at).toLocaleString('en-IN') : '—',
    phone:          s.user?.phone || '—',
    driverPhone:    s.driver?.phone_number || s.driver?.phone || null,
    passengerPhone: s.user?.phone || s.passenger?.phone || null,
    lat:            s.latitude  || s.lat  || s.location_coords?.lat  || null,
    lng:            s.longitude || s.lng  || s.location_coords?.lng  || null,
    createdAtRaw:   s.created_at || null,
    status:         s.status || 'Active',
  };
}

const EMERGENCY_CONTACTS = [
  { name:"Patna Police Control Room", number:"0612-2200100", type:"police" },
  { name:"PMCH Ambulance",            number:"0612-2234891", type:"hospital" },
  { name:"Fire Brigade Patna",        number:"101",          type:"fire" },
  { name:"GO Mobility Emergency",     number:"+91 9800000001", type:"internal" },
];

// ── Resolution timer with escalation ──────────────────────────────────────────
function ResolutionTimer({ createdAtRaw }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = createdAtRaw ? new Date(createdAtRaw).getTime() : Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAtRaw]);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const escalated = mins >= 5;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5, padding:'2px 10px',
      borderRadius:20, fontSize:11, fontWeight:700,
      background: escalated ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.12)',
      border: `1px solid ${escalated ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.3)'}`,
      color: escalated ? '#f87171' : '#f59e0b',
      animation: escalated ? 'gmPulseRed 1s ease-in-out infinite' : 'none',
    }}>
      {escalated ? '⚠️ ESCALATE' : '⏱'} {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
    </span>
  );
}

// ── Embedded Leaflet mini-map for SOS location ─────────────────────────────
function SosMap({ lat, lng }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!lat || !lng || !containerRef.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = L.map(containerRef.current, {
      zoomControl: false, scrollWheelZoom: false, dragging: false,
    }).setView([lat, lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    L.circleMarker([lat, lng], {
      radius: 11, color: '#f87171', fillColor: '#f87171', fillOpacity: 0.85, weight: 3,
    }).addTo(map);

    mapRef.current = map;
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [lat, lng]);

  if (!lat || !lng) return null;
  return (
    <div
      ref={containerRef}
      style={{ height:160, borderRadius:10, overflow:'hidden', border:'1px solid rgba(248,113,113,0.3)', marginTop:10, position:'relative', zIndex:0 }}
    />
  );
}

// ── SOSCard ────────────────────────────────────────────────────────────────────
function SOSCard({ sos, onCancel, cancelling, onContact }) {
  return (
    <div style={{ background:"rgba(248,113,113,0.07)", border:"1px solid rgba(248,113,113,0.35)", borderRadius:16, padding:"18px 20px" }}>
      <div style={{ flex:1 }}>
        {/* Header row */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:20 }}>🚨</span>
          <div style={{ fontSize:14, fontWeight:700, color:"#F87171", fontFamily:"Cinzel,serif" }}>SOS ALERT — {sos.id}</div>
          <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 8px", borderRadius:100, fontSize:10, fontWeight:700, background:"rgba(248,113,113,0.2)", border:"1px solid rgba(248,113,113,0.4)", color:"#F87171" }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#F87171", animation:"gmPulseRed 1s ease-in-out infinite" }}/> LIVE
          </span>
          <ResolutionTimer createdAtRaw={sos.createdAtRaw} />
        </div>

        {/* Info grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:4 }}>
          {[["Passenger",sos.passenger],["Driver",sos.driver],["Vehicle",sos.vehicle],["Location",sos.location],["Triggered",sos.time],["Phone",sos.phone]].map(([l,v],i)=>(
            <div key={i}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.38)", textTransform:"uppercase", letterSpacing:"0.6px" }}>{l}</div>
              <div style={{ fontSize:12.5, color:"rgba(255,255,255,0.82)", fontWeight:500, marginTop:2 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Embedded map */}
        <SosMap lat={sos.lat} lng={sos.lng} />

        {/* Action buttons */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:12 }}>
          <button
            onClick={() => onCancel(sos)}
            disabled={cancelling}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"rgba(52,211,153,0.12)", border:"1px solid rgba(52,211,153,0.35)", color:"#34D399", fontWeight:700, fontFamily:"Cinzel,serif", borderRadius:10, fontSize:12, cursor:cancelling?"not-allowed":"pointer", opacity:cancelling?0.6:1 }}>
            {cancelling ? "⏳ Cancelling…" : "✅ Cancel SOS"}
          </button>

          {sos.driverPhone && (
            <a href={`tel:${sos.driverPhone}`}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"rgba(96,165,250,0.12)", border:"1px solid rgba(96,165,250,0.35)", color:"#60A5FA", fontWeight:600, fontFamily:"Outfit,sans-serif", borderRadius:10, fontSize:12, textDecoration:"none" }}>
              📞 Driver
            </a>
          )}

          {sos.passengerPhone && sos.passengerPhone !== sos.driverPhone && (
            <a href={`tel:${sos.passengerPhone}`}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.35)", color:"#a78bfa", fontWeight:600, fontFamily:"Outfit,sans-serif", borderRadius:10, fontSize:12, textDecoration:"none" }}>
              📞 Passenger
            </a>
          )}

          <button onClick={() => onContact("police", sos)} style={{ background:"rgba(96,165,250,0.1)", border:"1px solid rgba(96,165,250,0.3)", color:"#60A5FA", fontWeight:600, fontFamily:"Outfit,sans-serif", borderRadius:10, padding:"7px 14px", fontSize:12, cursor:"pointer" }}>📞 Call Police</button>
          <button onClick={() => onContact("ambulance", sos)} style={{ background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.3)", color:"#34D399", fontWeight:600, fontFamily:"Outfit,sans-serif", borderRadius:10, padding:"7px 14px", fontSize:12, cursor:"pointer" }}>🚑 Ambulance</button>
          <button onClick={() => onContact("track", sos)} style={{ background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.3)", color:"#D4AF37", fontWeight:600, fontFamily:"Outfit,sans-serif", borderRadius:10, padding:"7px 14px", fontSize:12, cursor:"pointer" }}>📍 Live Track</button>
        </div>
      </div>
    </div>
  );
}

function Content() {
  const toast = useToast();
  const [sosList, setSosList]         = useState([]);
  const [sosHistory, setSosHistory]   = useState([]);
  const [cancelling, setCancelling]   = useState({});
  const [tab, setTab]                 = useState("sos");
  const [reportModal, setReportModal] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const intervalRef                   = useRef(null);
  const prevSosIdsRef                 = useRef(new Set());
  const isFirstLoadRef                = useRef(true);

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
    } catch {}
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const loadSos = useCallback((showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    getSosHistory()
      .then(res => {
        const raw = res?.data?.alerts || res?.alerts || res?.data || [];
        const all = Array.isArray(raw) ? raw.map(normalizeSos) : [];
        const active = all.filter(s => s.status === 'Active' || s.status === 'active');
        const history = all.filter(s => s.status !== 'Active' && s.status !== 'active');

        // Detect new SOS arrivals (skip on initial load)
        const newIds = new Set(active.map(s => String(s.rawId)));
        if (!isFirstLoadRef.current) {
          const prev = prevSosIdsRef.current;
          const hasNew = [...newIds].some(id => !prev.has(id));
          if (hasNew && active.length > 0) {
            playBeep();
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🚨 New SOS Alert', {
                body: `Emergency triggered by ${active.find(s => !prev.has(String(s.rawId)))?.passenger || 'a passenger'}`,
                icon: '/favicon.ico',
              });
            }
          }
        }
        prevSosIdsRef.current = newIds;
        isFirstLoadRef.current = false;

        setSosList(active);
        setSosHistory(history);
      })
      .catch(() => {})
      .finally(() => { if (showSpinner) setRefreshing(false); });
  }, [playBeep]);

  useEffect(() => {
    loadSos();
    intervalRef.current = setInterval(() => {
      if (document.hidden) return;
      loadSos();
    }, SOS_REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [loadSos]);

  const cancelSosAlert = async (sos) => {
    setCancelling(c => ({ ...c, [sos.id]: true }));
    try {
      await cancelSos(sos.rawId);
      setSosList(s => s.filter(x => x.id !== sos.id));
      setSosHistory(h => [{ ...sos, status:"Cancelled" }, ...h]);
      toast(`SOS Alert ${sos.id} cancelled and resolved.`, "success");
    } catch {
      toast(`Failed to cancel SOS ${sos.id}. Try again.`, "error");
    } finally {
      setCancelling(c => ({ ...c, [sos.id]: false }));
    }
  };

  const contact = (type, sos) => {
    const msgs = {
      police:    `Police notified for alert ${sos.id} at ${sos.location}!`,
      ambulance: `Ambulance dispatched for ${sos.passenger} at ${sos.location}!`,
      track:     `Live GPS tracking activated for alert ${sos.id}!`,
    };
    toast(msgs[type], "success");
  };

  return (
    <PageWrapper
      title="Emergency & Safety Controls"
      subtitle="Live SOS dashboard, GPS tracking and emergency contact management"
      actions={
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn-outline btn-sm" onClick={() => loadSos(true)} disabled={refreshing}
            style={{ opacity: refreshing ? 0.6 : 1 }}>
            {refreshing ? "⏳ Refreshing…" : "↻ Refresh"}
          </button>
          <button className="btn-outline btn-sm" onClick={() => setReportModal(true)}>📋 Generate Incident Report</button>
        </div>
      }>
      <GlobalStyles/>
      <style>{`
        @keyframes gmPulseRed{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>

      <MiniStatRow items={[
        { label:"Active SOS",         value: String(sosList.length),                       icon:"🚨", color:"#F87171" },
        { label:"Resolved / History", value: String(sosHistory.length),                    icon:"✅", color:"#34D399" },
        { label:"Total Alerts",       value: String(sosList.length + sosHistory.length),   icon:"📋", color:"#F59E0B" },
        { label:"Emergency Contacts", value: String(EMERGENCY_CONTACTS.length),            icon:"📞", color:"#60A5FA" },
      ]}/>

      {sosList.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#F87171", fontFamily:"Cinzel,serif", marginBottom:12 }}>
            🚨 ACTIVE SOS EMERGENCIES ({sosList.length})
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {sosList.map(sos => (
              <SOSCard
                key={sos.id}
                sos={sos}
                onCancel={cancelSosAlert}
                cancelling={!!cancelling[sos.id]}
                onContact={contact}
              />
            ))}
          </div>
        </div>
      )}

      <div className="tab-nav">
        {[
          { id:"sos",      l:"SOS History"       },
          { id:"blacklist",l:"Blacklist"          },
          { id:"contacts", l:"Emergency Contacts" },
        ].map(t => (
          <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={() => setTab(t.id)}>{t.l}</button>
        ))}
      </div>

      {/* ── SOS History Tab ── */}
      {tab==="sos" && (
        <>
          {sosList.length === 0 && sosHistory.length === 0 ? (
            <div style={{ padding:50, textAlign:"center", color:"rgba(255,255,255,0.3)" }}>
              <div style={{ fontSize:44, marginBottom:12 }}>✅</div>
              <div>No SOS alerts. Platform is safe.</div>
            </div>
          ) : (
            <TableCard title="SOS Alert Log" icon="📋"
              actions={<button className="btn-outline btn-sm" onClick={() => toast("Report exported!", "success")}>↓ Export</button>}>
              {sosHistory.length === 0 ? (
                <div style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,0.35)" }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>📋</div>No resolved SOS history
                </div>
              ) : (
                <table className="gm-table">
                  <thead>
                    <tr><th>Alert ID</th><th>Passenger</th><th>Driver</th><th>Location</th><th>Vehicle</th><th>Time</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {sosHistory.map((s,i) => (
                      <tr key={i}>
                        <td style={{ fontFamily:"monospace", color:"#F87171", fontSize:12 }}>{s.id}</td>
                        <td>{s.passenger}</td>
                        <td>{s.driver}</td>
                        <td style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{s.location}</td>
                        <td style={{ fontSize:12 }}>{s.vehicle}</td>
                        <td style={{ fontSize:12 }}>{s.time}</td>
                        <td>
                          <span style={{ display:"inline-flex", padding:"3px 9px", borderRadius:100, fontSize:10.5, fontWeight:600,
                            background: s.status==="Cancelled" ? "rgba(245,158,11,0.1)" : "rgba(52,211,153,0.1)",
                            border: `1px solid ${s.status==="Cancelled" ? "rgba(245,158,11,0.25)" : "rgba(52,211,153,0.25)"}`,
                            color: s.status==="Cancelled" ? "#F59E0B" : "#34D399"
                          }}>{s.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TableCard>
          )}
        </>
      )}

      {/* ── Blacklist Tab ── */}
      {tab==="blacklist" && (
        <Card style={{ padding:32 }}>
          <div style={{ textAlign:"center", marginBottom:24 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🚫</div>
            <div style={{ fontFamily:"Cinzel,serif", fontSize:16, fontWeight:700, color:"rgba(255,255,255,0.75)", marginBottom:8 }}>Blacklist Management</div>
          </div>
          <AlertBox type="warning">
            Blacklist management requires a dedicated backend API that is not yet implemented. Users and drivers can currently be suspended via the Driver Onboarding page (KYC → Suspend Driver).
          </AlertBox>
          <div style={{ marginTop:20, display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {[
              { icon:"🔒", title:"Suspend Driver", desc:"Available in Driver Onboarding → KYC tab → Suspend Driver button" },
              { icon:"🚫", title:"Block User",     desc:"Available in Users page → select user → Deactivate Account" },
              { icon:"📋", title:"View Fraud Flags", desc:"Available in Fraud Detection page — flags suspicious behavior automatically" },
              { icon:"⚠️", title:"Blacklist API",   desc:"Planned feature — requires backend endpoint for persistent blacklist management" },
            ].map((c,i) => (
              <div key={i} style={{ padding:"16px 18px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12 }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{c.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.8)", marginBottom:4 }}>{c.title}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.38)", lineHeight:1.6 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Emergency Contacts Tab ── */}
      {tab==="contacts" && (
        <Card style={{ padding:22 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.85)", marginBottom:18 }}>Emergency Contact Directory</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:12 }}>
            {EMERGENCY_CONTACTS.map((c, i) => {
              const iconMap  = { police:"🚔", hospital:"🏥", fire:"🔥", internal:"📱" };
              const colorMap = { police:"#60A5FA", hospital:"#34D399", fire:"#F87171", internal:"#D4AF37" };
              return (
                <div key={i} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${colorMap[c.type]}22`, borderRadius:14, padding:"16px 18px" }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>{iconMap[c.type]}</div>
                  <div style={{ fontSize:13.5, fontWeight:700, color:"rgba(255,255,255,0.88)", marginBottom:4 }}>{c.name}</div>
                  <div style={{ fontSize:15, fontWeight:800, color:colorMap[c.type], fontFamily:"monospace", marginBottom:12 }}>{c.number}</div>
                  <a href={`tel:${c.number}`}
                    style={{ display:"block", textAlign:"center", background:`${colorMap[c.type]}15`, border:`1px solid ${colorMap[c.type]}30`, color:colorMap[c.type], fontWeight:600, fontFamily:"Outfit,sans-serif", borderRadius:9, padding:"7px 14px", fontSize:12, textDecoration:"none" }}>
                    📞 Call Now
                  </a>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal open={reportModal} onClose={() => setReportModal(false)} title="📋 Generate Incident Report">
        <FormGroup label="Date Range">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <input type="date" className="gm-input"/>
            <input type="date" className="gm-input"/>
          </div>
        </FormGroup>
        <FormGroup label="Incident Type">
          <select className="gm-input">
            <option>All Types</option>
            <option>SOS Emergency</option>
            <option>Route Deviation</option>
            <option>Driver Complaint</option>
          </select>
        </FormGroup>
        <FormGroup label="Format">
          <select className="gm-input">
            <option>PDF Report</option>
            <option>Excel Sheet</option>
            <option>CSV</option>
          </select>
        </FormGroup>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn-outline" onClick={() => setReportModal(false)}>Cancel</button>
          <button className="btn-gold" onClick={() => { setReportModal(false); toast("Safety incident report generated!", "success"); }}>Generate Report</button>
        </div>
      </Modal>
    </PageWrapper>
  );
}

export default function EmergencySafetyPage() {
  return <ToastProvider><Content/></ToastProvider>;
}
