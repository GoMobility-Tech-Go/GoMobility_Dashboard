import {
  LayoutDashboard, Users, Car, MapPin, CircleDollarSign, RotateCcw, Wallet,
  TrendingUp, Ticket, Gift, Star, MessageSquare, Bell, Settings, BarChart3,
  UserPlus, SlidersHorizontal, ShieldCheck, ScrollText, ShieldAlert, LogOut,
  ChevronLeft, ChevronRight, Menu, X, Crown, Megaphone, AlertTriangle,
  Smartphone, Trophy, MessageCircle, Activity, Target, UserCog, Lock,
  BarChart2, Receipt, Map, CheckCheck
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getAdminNotifications, getUnreadNotifCount, markNotifRead, markAllNotifRead } from "../../api/admin";
import SidebarHeader from "./SidebarHeader";
import SidebarItem from "./SidebarItem";

const ADMIN_MENU = [
  { label:"Overview", items:[
    { label:"Dashboard",          to:"/",                     icon:LayoutDashboard },
  ]},
  { label:"Management", items:[
    { label:"Users",              to:"/users",                icon:Users       },
    { label:"Driver Onboarding",  to:"/driver-onboarding",   icon:UserPlus    },
    { label:"Ride Monitoring",    to:"/ride-monitoring",      icon:MapPin      },
  ]},
  { label:"Finance", items:[
    { label:"Transactions",       to:"/finance",              icon:CircleDollarSign },
    { label:"Refunds",            to:"/refunds",              icon:RotateCcw   },
    { label:"Driver Payouts",     to:"/payouts",              icon:Wallet      },
  ]},
  { label:"Configuration", items:[
    { label:"Pricing Engine",     to:"/pricing-engine",       icon:TrendingUp  },
    { label:"Subscriptions",      to:"/subscriptions",        icon:Ticket      },
    { label:"City Management",    to:"/city-management",      icon:Map         },
  ]},
  { label:"Operations", items:[
    { label:"Driver Incentives",  to:"/driver-incentives",    icon:Star        },
    { label:"Reviews & Ratings",  to:"/reviews",              icon:Star        },
    { label:"Complaints & Support",to:"/complaints-support",  icon:MessageSquare},
    { label:"Operational Metrics",to:"/operational-metrics",  icon:BarChart3   },
    { label:"Push Notifications", to:"/notifications",        icon:Bell        },
  ]},
  { label:"System", items:[
    { label:"Settings",           to:"/settings",             icon:Settings    },
  ]},
];

const SA_EXTRA = [
  { label:"Super Admin", crown:true, items:[
    { label:"Zone & City Mgmt",   to:"/city-management",      icon:Map         },
    { label:"Revenue Analytics",  to:"/revenue-analytics",    icon:BarChart2   },
    { label:"Tax & Compliance",   to:"/tax-reports",          icon:Receipt     },
    { label:"In-App Banners",     to:"/banners",              icon:Megaphone   },
    { label:"Emergency & Safety", to:"/emergency-safety",     icon:AlertTriangle},
    { label:"App Config",         to:"/app-config",           icon:Smartphone  },
    { label:"Driver Tiers",       to:"/driver-tiers",         icon:Trophy      },
    { label:"Broadcast Messages", to:"/broadcast-messaging",  icon:MessageCircle},
    { label:"Fraud Detection",    to:"/fraud-detection",      icon:ShieldAlert },
    { label:"Promo Codes",        to:"/promo-codes",          icon:Gift        },
    { label:"Roles & Access",     to:"/roles-access",         icon:ShieldCheck },
    { label:"Activity Logs",      to:"/activity-logs",        icon:ScrollText  },
  ]},
];

export default function Sidebar({ mobileOpen, setMobileOpen, desktopCollapsed, setDesktopCollapsed, sidebarWidth }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const ref = useRef(null);
  const bellRef = useRef(null);
  const isSA = user?.role === "Super Admin";
  const groups = isSA ? [...ADMIN_MENU, ...SA_EXTRA] : ADMIN_MENU;

  const fetchUnread = useCallback(() => {
    getUnreadNotifCount()
      .then((res) => setUnread(res.data?.data?.count ?? res.data?.count ?? 0))
      .catch(() => {});
  }, []);

  const openBell = () => {
    setBellOpen(p => !p);
    if (!bellOpen) {
      setNotifsLoading(true);
      getAdminNotifications()
        .then((res) => {
          const d = res.data?.data || res.data || {};
          const list = d.notifications || d.items || (Array.isArray(d) ? d : []);
          setNotifs(list);
        })
        .catch(() => setNotifs([]))
        .finally(() => setNotifsLoading(false));
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotifRead();
      setUnread(0);
      setNotifs(p => p.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const handleMarkOne = async (id) => {
    try {
      await markNotifRead(id);
      setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(p => Math.max(0, p - 1));
    } catch {}
  };

  useEffect(() => {
    fetchUnread();
    const t = setInterval(fetchUnread, 60000);
    return () => clearInterval(t);
  }, [fetchUnread]);

  useEffect(() => {
    const h = e => {
      if (ref.current && !ref.current.contains(e.target)) setProfileOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };

  const handleToggle = () => {
    if (window.innerWidth < 1024) {
      setMobileOpen(false);
    } else {
      setDesktopCollapsed(p => !p);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position:"fixed",inset:0,background:"rgba(1,9,23,0.78)",backdropFilter:"blur(4px)",zIndex:39 }}
        />
      )}

      {/* Hamburger — mobile */}
      <button
        id="gm-ham"
        onClick={() => setMobileOpen(true)}
        style={{ display:"none",position:"fixed",top:14,left:14,zIndex:50,background:"rgba(212,175,55,0.1)",border:"1px solid rgba(212,175,55,0.28)",borderRadius:10,width:42,height:42,alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0 }}
      >
        <Menu size={19} color="#D4AF37"/>
      </button>

      {/* Sidebar */}
      <aside
        id="gm-sidebar"
        style={{
          position:"fixed", left:0, top:0, bottom:0, zIndex:40,
          width: sidebarWidth,
          background:"linear-gradient(170deg,#020c20 0%,#030f28 40%,#040e24 100%)",
          borderRight:"1px solid rgba(212,175,55,0.12)",
          display:"flex", flexDirection:"column",
          transition:"width 0.32s cubic-bezier(0.4,0,0.2,1), transform 0.32s cubic-bezier(0.4,0,0.2,1)",
          overflowX:"hidden",
        }}
      >
        <SidebarHeader collapsed={desktopCollapsed} />

        {/* Nav */}
        <nav className="gm-nav" style={{ flex:1, overflowY:"auto", overflowX:"hidden", padding: desktopCollapsed ? "10px 8px 10px" : "12px 10px 10px" }}>
          {groups.map((g, gi) => (
            <div key={g.label} style={{ marginBottom: desktopCollapsed ? 2 : 6 }}>
              {/* Expanded: section labels */}
              {g.crown && !desktopCollapsed && (
                <>
                  <div style={{ height:1, background:"linear-gradient(90deg,rgba(212,175,55,0.28),transparent)", margin:"8px 8px 6px" }}/>
                  <div style={{ padding:"4px 8px 3px", fontSize:9, fontWeight:700, letterSpacing:"1.8px", textTransform:"uppercase", color:"rgba(212,175,55,0.58)", display:"flex", alignItems:"center", gap:5 }}>
                    <Crown size={9} color="#D4AF37"/> SUPER ADMIN
                  </div>
                </>
              )}
              {!g.crown && !desktopCollapsed && (
                <div style={{ padding:"5px 8px 2px", fontSize:9.5, fontWeight:700, color:"rgba(212,175,55,0.28)", textTransform:"uppercase", letterSpacing:"1.3px", whiteSpace:"nowrap" }}>
                  {g.label}
                </div>
              )}
              {/* Collapsed: divider between groups */}
              {desktopCollapsed && gi > 0 && (
                <div style={{ height:1, background:"rgba(212,175,55,0.12)", margin:"4px 10px 6px" }}/>
              )}
              <div style={{ display:"flex", flexDirection:"column", gap: desktopCollapsed ? 3 : 1.5 }}>
                {g.items.map(item => (
                  <SidebarItem
                    key={item.to + item.label}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    collapsed={desktopCollapsed}
                    onClick={() => { if (window.innerWidth < 1024) setMobileOpen(false); }}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Notification Bell */}
        <div ref={bellRef} style={{ padding:"6px 10px", position:"relative" }}>
          <button
            onClick={openBell}
            title="Notifications"
            style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:desktopCollapsed?"8px 0":"9px 10px", borderRadius:10, border:"1px solid transparent", background:"none", cursor:"pointer", transition:"all .2s", justifyContent:desktopCollapsed?"center":"flex-start", position:"relative" }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.borderColor="rgba(212,175,55,0.15)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.borderColor="transparent";}}
          >
            <div style={{ position:"relative", flexShrink:0 }}>
              <Bell size={17} color={bellOpen?"#D4AF37":"rgba(255,255,255,0.55)"} />
              {unread > 0 && (
                <span style={{ position:"absolute", top:-5, right:-5, minWidth:16, height:16, borderRadius:8, background:"#ef4444", border:"1.5px solid #020c20", fontSize:9, fontWeight:700, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px", lineHeight:1 }}>
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </div>
            {!desktopCollapsed && (
              <span style={{ fontSize:13, color:bellOpen?"#D4AF37":"rgba(255,255,255,0.6)", fontFamily:"Outfit,sans-serif", fontWeight:500 }}>Notifications</span>
            )}
          </button>

          {/* Bell Dropdown */}
          {bellOpen && (
            <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:desktopCollapsed?60:10, right:desktopCollapsed?"auto":10, width:desktopCollapsed?300:undefined, background:"linear-gradient(135deg,#020c20,#030f28)", border:"1px solid rgba(212,175,55,0.22)", borderRadius:14, boxShadow:"0 20px 60px rgba(0,0,0,0.6)", zIndex:200, overflow:"hidden" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", borderBottom:"1px solid rgba(212,175,55,0.1)" }}>
                <span style={{ fontFamily:"Cinzel,serif", fontSize:12, fontWeight:700, color:"#D4AF37" }}>Notifications</span>
                {unread > 0 && (
                  <button onClick={handleMarkAll} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10.5, color:"rgba(255,255,255,0.5)", background:"none", border:"none", cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>
                    <CheckCheck size={11}/> Mark all read
                  </button>
                )}
              </div>
              <div style={{ maxHeight:300, overflowY:"auto" }}>
                {notifsLoading ? (
                  <div style={{ padding:24, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:12 }}>Loading…</div>
                ) : notifs.length === 0 ? (
                  <div style={{ padding:28, textAlign:"center", color:"rgba(255,255,255,0.25)", fontSize:12, fontFamily:"Outfit,sans-serif" }}>
                    <Bell size={24} color="rgba(255,255,255,0.1)" style={{ marginBottom:8, display:"block", margin:"0 auto 8px" }} />
                    No notifications
                  </div>
                ) : notifs.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && handleMarkOne(n.id)}
                    style={{ padding:"11px 14px", borderBottom:"1px solid rgba(255,255,255,0.04)", background:n.is_read?"transparent":"rgba(212,175,55,0.04)", cursor:n.is_read?"default":"pointer", transition:"background .15s" }}
                    onMouseEnter={e=>{if(!n.is_read)e.currentTarget.style.background="rgba(212,175,55,0.08)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background=n.is_read?"transparent":"rgba(212,175,55,0.04)";}}
                  >
                    <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                      {!n.is_read && <span style={{ width:6, height:6, borderRadius:"50%", background:"#D4AF37", flexShrink:0, marginTop:4 }}/>}
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12.5, color:"rgba(255,255,255,0.82)", fontFamily:"Outfit,sans-serif", lineHeight:1.4, marginLeft:n.is_read?14:0 }}>{n.title || n.message || n.body || "System notification"}</div>
                        {(n.body && n.title) && <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:3, lineHeight:1.4, marginLeft:n.is_read?14:0 }}>{n.body}</div>}
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:4, marginLeft:n.is_read?14:0 }}>
                          {n.created_at ? new Date(n.created_at).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Profile */}
        <div style={{ borderTop:"1px solid rgba(212,175,55,0.1)", padding:"10px 10px" }} ref={ref}>
          {profileOpen && (
            <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:12, padding:"5px 4px", marginBottom:8, boxShadow:"0 12px 40px rgba(0,0,0,0.45)" }}>
              <button
                onClick={handleLogout}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:10, border:"none", background:"none", color:"#F87171", cursor:"pointer", fontFamily:"Outfit,sans-serif", fontSize:13, fontWeight:600 }}
              >
                <LogOut size={14}/> Logout
              </button>
            </div>
          )}
          <div
            onClick={() => setProfileOpen(p => !p)}
            style={{ display:"flex", alignItems:"center", gap:10, padding:desktopCollapsed?"8px 0":"9px 10px", borderRadius:12, cursor:"pointer", border:"1px solid transparent", transition:"all .2s", justifyContent:desktopCollapsed?"center":"flex-start" }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor="rgba(212,175,55,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="transparent"; }}
          >
            <div style={{ width:34, height:34, borderRadius:"50%", background:isSA?"linear-gradient(135deg,#D4AF37,#b8920f)":"linear-gradient(135deg,#3b82f6,#1d4ed8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"#04081A", flexShrink:0, position:"relative", boxShadow:isSA?"0 0 12px rgba(212,175,55,0.25)":"none" }}>
              {user?.initials || "AD"}
              {isSA && <span style={{ position:"absolute", top:-5, right:-5, fontSize:10 }}>👑</span>}
            </div>
            {!desktopCollapsed && (
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:600, color:"rgba(255,255,255,0.82)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user?.name || "Admin"}</div>
                <div style={{ fontSize:10.5, color:isSA?"#D4AF37":"#60A5FA" }}>{user?.role}</div>
              </div>
            )}
          </div>
        </div>

      </aside>

      {/* Collapse button — OUTSIDE aside so CSS transform doesn't affect fixed positioning */}
      <button
        id="gm-collapse-btn"
        onClick={() => setDesktopCollapsed(p => !p)}
        style={{
          display:"none",
          position:"fixed", top:20, left: sidebarWidth - 14,
          width:28, height:28, borderRadius:"50%",
          background:"linear-gradient(135deg,#D4AF37,#b8920f)",
          border:"2.5px solid #020c20",
          color:"#04081A", cursor:"pointer",
          alignItems:"center", justifyContent:"center",
          boxShadow:"0 2px 14px rgba(212,175,55,0.4)",
          zIndex:50,
          transition:"left 0.32s cubic-bezier(0.4,0,0.2,1)",
        }}
        title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {desktopCollapsed ? <ChevronRight size={13}/> : <ChevronLeft size={13}/>}
      </button>

      <style>{`
        @media(max-width:1023px){
          #gm-ham { display:flex !important; }
          #gm-sidebar { transform: ${mobileOpen ? "translateX(0)" : "translateX(-100%)"} !important; }
          #gm-collapse-btn { display:none !important; }
        }
        @media(min-width:1024px){
          #gm-ham { display:none !important; }
          #gm-sidebar { transform: translateX(0) !important; }
          #gm-collapse-btn { display:flex !important; }
        }
        .gm-nav::-webkit-scrollbar { width:3px; }
        .gm-nav::-webkit-scrollbar-track { background:transparent; }
        .gm-nav::-webkit-scrollbar-thumb { background:rgba(212,175,55,0.2); border-radius:3px; }
        .gm-nav::-webkit-scrollbar-thumb:hover { background:rgba(212,175,55,0.4); }
      `}</style>
    </>
  );
}
