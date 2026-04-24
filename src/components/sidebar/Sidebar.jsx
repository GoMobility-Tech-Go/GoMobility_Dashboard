import {
  LayoutDashboard, Users, Car, MapPin, CircleDollarSign, RotateCcw, Wallet,
  TrendingUp, Ticket, Gift, Star, MessageSquare, Bell, Settings, BarChart3,
  UserPlus, SlidersHorizontal, ShieldCheck, ScrollText, ShieldAlert, LogOut,
  ChevronLeft, ChevronRight, Menu, X, Crown, Megaphone, AlertTriangle,
  Smartphone, Trophy, MessageCircle, Activity, Target, UserCog, Lock,
  BarChart2, Receipt, Map
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
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
    { label:"Dispatch Settings",  to:"/dispatch-settings",    icon:SlidersHorizontal },
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
    { label:"System Health",      to:"/system-health",        icon:Activity    },
    { label:"Campaigns",          to:"/campaigns",            icon:Target      },
    { label:"User Segments",      to:"/user-segments",        icon:UserCog     },
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
  const ref = useRef(null);
  const isSA = user?.role === "Super Admin";
  const groups = isSA ? [...ADMIN_MENU, ...SA_EXTRA] : ADMIN_MENU;

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setProfileOpen(false); };
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
        <SidebarHeader
          collapsed={desktopCollapsed}
          onToggle={handleToggle}
          mobileOpen={mobileOpen}
          user={user}
          isSuperAdmin={isSA}
        />

        {/* Nav */}
        <nav className="gm-nav" style={{ flex:1, overflowY:"auto", overflowX:"hidden", padding:"12px 10px 10px" }}>
          {groups.map(g => (
            <div key={g.label} style={{ marginBottom:6 }}>
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
              <div style={{ display:"flex", flexDirection:"column", gap:1.5 }}>
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

        {/* Desktop collapse toggle button */}
        <button
          onClick={() => setDesktopCollapsed(p => !p)}
          style={{
            display:"none",
            position:"absolute", top:"50%", right:-14,
            transform:"translateY(-50%)",
            width:28, height:28, borderRadius:"50%",
            background:"linear-gradient(135deg,#D4AF37,#b8920f)",
            border:"2.5px solid #020c20",
            color:"#04081A", cursor:"pointer",
            alignItems:"center", justifyContent:"center",
            boxShadow:"0 2px 12px rgba(212,175,55,0.3)",
            zIndex:5, transition:"all .2s",
          }}
          id="gm-collapse-btn"
          title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {desktopCollapsed ? <ChevronRight size={13}/> : <ChevronLeft size={13}/>}
        </button>
      </aside>

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
