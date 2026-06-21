import { useState, useEffect } from "react";
import {
  User, Bell, Shield, Server, LogOut, Moon, Activity,
  Phone, Mail, BadgeCheck, Clock, Globe, RefreshCw, CheckCircle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const BASE = "https://api.gomobility.co.in";

const fmtUptime = (sec) => {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
    <div style={{ width:38, height:38, borderRadius:12, background:"rgba(212,175,55,0.12)", border:"1px solid rgba(212,175,55,0.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <Icon size={17} color="#D4AF37" />
    </div>
    <div>
      <div style={{ fontFamily:"Cinzel,serif", fontSize:15, fontWeight:700, color:"#fff" }}>{title}</div>
      {subtitle && <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{subtitle}</div>}
    </div>
  </div>
);

const InfoRow = ({ label, value, mono }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
    <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{label}</span>
    <span style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.85)", fontFamily:mono?"monospace":"Outfit,sans-serif" }}>{value || "—"}</span>
  </div>
);

const ToggleRow = ({ title, desc, enabled, onChange }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:14, padding:"12px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
    <div>
      <div style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{title}</div>
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:3 }}>{desc}</div>
    </div>
    <button onClick={onChange} style={{ position:"relative", width:44, height:26, borderRadius:999, border:"none", background:enabled?"linear-gradient(90deg,#D4AF37,#f7dc6f)":"rgba(255,255,255,0.14)", cursor:"pointer", flexShrink:0, transition:"background .2s" }}>
      <span style={{ position:"absolute", top:3, left:enabled?21:3, width:20, height:20, borderRadius:"50%", background:enabled?"#081327":"#fff", transition:"left .22s ease" }} />
    </button>
  </div>
);

const Card = ({ children, style }) => (
  <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.12)", borderRadius:18, padding:"22px 24px", ...style }}>
    {children}
  </div>
);

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Notification prefs — stored in localStorage
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gm_admin_prefs") || "{}"); } catch { return {}; }
  });

  const setPref = (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    localStorage.setItem("gm_admin_prefs", JSON.stringify(next));
  };

  // Health data
  const [health, setHealth]       = useState(null);
  const [hLoading, setHLoading]   = useState(true);

  useEffect(() => {
    fetch(`${BASE}/health`)
      .then(r => r.json())
      .then(d => setHealth(d))
      .catch(() => {})
      .finally(() => setHLoading(false));
  }, []);

  const handleLogout = () => {
    if (window.confirm("Logout from GO Mobility Admin?")) {
      logout();
      navigate("/login");
    }
  };

  const loginTime = (() => {
    try {
      const t = localStorage.getItem("gm_login_time");
      return t ? new Date(t).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "This session";
    } catch { return "This session"; }
  })();

  return (
    <div style={{ fontFamily:"Outfit,sans-serif", maxWidth:900 }}>

      {/* Page Header */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Settings</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Account info, preferences and platform status</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:20 }}>

        {/* ── Left Column ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* Admin Profile */}
          <Card>
            <SectionHeader icon={User} title="Admin Profile" subtitle="Your account information" />

            {/* Avatar + Name */}
            <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:22, padding:"16px 18px", background:"rgba(212,175,55,0.05)", border:"1px solid rgba(212,175,55,0.14)", borderRadius:14 }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"linear-gradient(135deg,#D4AF37,#b8922a)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Cinzel,serif", fontSize:20, fontWeight:700, color:"#020c20", flexShrink:0 }}>
                {user?.initials || "AD"}
              </div>
              <div>
                <div style={{ fontFamily:"Cinzel,serif", fontSize:17, fontWeight:700, color:"#fff" }}>{user?.name || "Admin"}</div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:5 }}>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:"rgba(212,175,55,0.12)", color:"#D4AF37", border:"1px solid rgba(212,175,55,0.28)" }}>
                    <BadgeCheck size={10}/>{user?.role || "Admin"}
                  </span>
                  {user?.isActive && (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:"rgba(34,197,94,0.1)", color:"#4ade80", border:"1px solid rgba(34,197,94,0.25)" }}>
                      <CheckCircle size={10}/>Active
                    </span>
                  )}
                </div>
              </div>
            </div>

            <InfoRow label="Full Name"    value={user?.name}  />
            <InfoRow label="Email"        value={user?.email || "Not set"} />
            <InfoRow label="Phone"        value={user?.phone || "Not set"} mono />
            <InfoRow label="Role"         value={user?.role}  />
            <InfoRow label="User ID"      value={user?.id}    mono />
            <InfoRow label="Session Start" value={loginTime}  />

            <div style={{ marginTop:16, padding:"11px 14px", background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.18)", borderRadius:10, fontSize:12, color:"rgba(255,255,255,0.4)", lineHeight:1.6 }}>
              Profile updates (name, email) must be done directly in the database or by contacting the super admin.
            </div>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <SectionHeader icon={Bell} title="Notification Preferences" subtitle="Saved in your browser" />
            <ToggleRow
              title="New Ride Alerts"
              desc="Get notified when new rides are requested"
              enabled={prefs.rideAlerts ?? true}
              onChange={() => setPref("rideAlerts", !(prefs.rideAlerts ?? true))}
            />
            <ToggleRow
              title="KYC Queue Alerts"
              desc="Alert when new documents need review"
              enabled={prefs.kycAlerts ?? true}
              onChange={() => setPref("kycAlerts", !(prefs.kycAlerts ?? true))}
            />
            <ToggleRow
              title="Fraud Alerts"
              desc="Notify on high-risk fraud flags"
              enabled={prefs.fraudAlerts ?? true}
              onChange={() => setPref("fraudAlerts", !(prefs.fraudAlerts ?? true))}
            />
            <ToggleRow
              title="Driver Support Tickets"
              desc="Alert on new unresolved support tickets"
              enabled={prefs.supportAlerts ?? false}
              onChange={() => setPref("supportAlerts", !(prefs.supportAlerts ?? false))}
            />
            <div style={{ marginTop:14, fontSize:11, color:"rgba(255,255,255,0.25)", lineHeight:1.6 }}>
              These preferences are saved locally in your browser. They will reset if you clear browser data.
            </div>
          </Card>

        </div>

        {/* ── Right Column ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* Platform Status */}
          <Card>
            <SectionHeader icon={Server} title="Platform Status" subtitle="Live backend information" />
            {hLoading ? (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Array(5).fill(0).map((_,i)=><div key={i} style={{ height:36, background:"rgba(255,255,255,0.04)", borderRadius:8, animation:"gmPulse 1.5s ease-in-out infinite" }}/>)}
              </div>
            ) : health ? (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, padding:"10px 14px", background:health.status==="ok"?"rgba(34,197,94,0.07)":"rgba(239,68,68,0.07)", border:`1px solid ${health.status==="ok"?"rgba(34,197,94,0.25)":"rgba(239,68,68,0.25)"}`, borderRadius:10 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:health.status==="ok"?"#4ade80":"#f87171", flexShrink:0 }}/>
                  <span style={{ fontSize:13, fontWeight:600, color:health.status==="ok"?"#4ade80":"#f87171" }}>
                    {health.status==="ok" ? "All Systems Operational" : `Status: ${health.status}`}
                  </span>
                </div>
                <InfoRow label="Status"       value={health.status?.toUpperCase()} />
                <InfoRow label="Version"      value={health.version || "—"} mono />
                <InfoRow label="Environment"  value={health.environment || health.env || "—"} />
                <InfoRow label="Server Uptime" value={fmtUptime(health.uptime)} />
                <InfoRow label="Database"     value={health.database?.status || health.db || "—"} />
              </>
            ) : (
              <div style={{ padding:24, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:12 }}>
                Could not reach backend
              </div>
            )}
            <button
              onClick={() => { setHLoading(true); fetch(`${BASE}/health`).then(r=>r.json()).then(d=>setHealth(d)).catch(()=>{}).finally(()=>setHLoading(false)); }}
              style={{ marginTop:14, display:"flex", alignItems:"center", gap:6, fontSize:12, color:"rgba(212,175,55,0.6)", background:"none", border:"none", cursor:"pointer", fontFamily:"Outfit,sans-serif", padding:0 }}>
              <RefreshCw size={11}/> Refresh Status
            </button>
          </Card>

          {/* Display Preferences */}
          <Card>
            <SectionHeader icon={Moon} title="Display" subtitle="UI preferences" />
            <ToggleRow
              title="Dark Mode"
              desc="Premium dark appearance (always on for this dashboard)"
              enabled={true}
              onChange={() => {}}
            />
            <ToggleRow
              title="Compact Tables"
              desc="Show more rows with reduced row height"
              enabled={prefs.compactTables ?? false}
              onChange={() => setPref("compactTables", !(prefs.compactTables ?? false))}
            />
            <ToggleRow
              title="Show Pagination Info"
              desc="Display total count and page numbers in tables"
              enabled={prefs.showPagination ?? true}
              onChange={() => setPref("showPagination", !(prefs.showPagination ?? true))}
            />
          </Card>

          {/* Session & Security */}
          <Card>
            <SectionHeader icon={Shield} title="Session & Security" />
            <InfoRow label="Logged in as"  value={user?.name} />
            <InfoRow label="Role"          value={user?.role} />
            <InfoRow label="Session"       value="Active" />
            <InfoRow label="API"           value="gomobility.co.in" mono />

            <div style={{ marginTop:18 }}>
              <button
                onClick={handleLogout}
                style={{ width:"100%", height:44, display:"flex", alignItems:"center", justifyContent:"center", gap:8, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.28)", borderRadius:12, color:"#f87171", fontSize:13, fontFamily:"Cinzel,serif", fontWeight:700, cursor:"pointer", letterSpacing:"0.5px", transition:"all .2s" }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,0.18)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(239,68,68,0.1)";}}
              >
                <LogOut size={14}/> Logout
              </button>
            </div>
          </Card>

          {/* About */}
          <Card>
            <SectionHeader icon={Globe} title="About" />
            <InfoRow label="Platform"     value="GO Mobility Admin" />
            <InfoRow label="Dashboard"    value="v3.0" mono />
            <InfoRow label="Region"       value="India / IST" />
            <InfoRow label="Support"      value="admin@gomobility.co.in" />
          </Card>

        </div>
      </div>

      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
    </div>
  );
}
