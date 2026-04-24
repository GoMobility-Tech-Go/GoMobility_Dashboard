


import { NavLink } from "react-router-dom";

const SidebarItem = ({ to, icon: Icon, label, onClick, collapsed }) => {
  if (!Icon) return null;

  const isMobile = window.innerWidth <= 768;

  return (
    <NavLink
      to={to}
      onClick={onClick}
      title={collapsed ? label : ""}
      style={({ isActive }) =>
        isActive
          ? {
              display: "flex",
              alignItems: "center",
              gap: collapsed ? 0 : isMobile ? 8 : 11,
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 12,
              padding: collapsed
                ? isMobile
                  ? "12px 0"
                  : "10px 0"
                : isMobile
                ? "12px 14px"
                : "9px 12px",
              width: "100%",
              background:
                "linear-gradient(90deg,rgba(212,175,55,0.17) 0%,rgba(212,175,55,0.04) 100%)",
              border: "1px solid rgba(212,175,55,0.28)",
              color: "#D4AF37",
              textDecoration: "none",
              position: "relative",
              transition: "all 0.22s",
              boxShadow:
                "0 4px 20px rgba(212,175,55,0.08),inset 0 0 12px rgba(212,175,55,0.04)",
            }
          : {
              display: "flex",
              alignItems: "center",
              gap: collapsed ? 0 : isMobile ? 8 : 11,
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 12,
              padding: collapsed
                ? isMobile
                  ? "12px 0"
                  : "10px 0"
                : isMobile
                ? "12px 14px"
                : "9px 12px",
              width: "100%",
              background: "transparent",
              border: "1px solid transparent",
              color: "rgba(255,255,255,0.52)",
              textDecoration: "none",
              position: "relative",
              transition: "all 0.22s",
            }
      }
      onMouseEnter={(e) => {
        const isActive = e.currentTarget.style.color === "rgb(212, 175, 55)";
        if (!isActive) {
          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          e.currentTarget.style.color = "rgba(255,255,255,0.88)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        }
      }}
      onMouseLeave={(e) => {
        const isActive =
          e.currentTarget.style.borderColor ===
          "rgba(212, 175, 55, 0.28)";
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "rgba(255,255,255,0.52)";
          e.currentTarget.style.borderColor = "transparent";
        }
      }}
    >
      {({ isActive }) => (
        <>
          {/* Left gold bar */}
          {isActive && !collapsed && (
            <span
              style={{
                position: "absolute",
                left: 0,
                top: "50%",
                transform: "translateY(-50%)",
                width: 3,
                height: isMobile ? "50%" : "58%",
                borderRadius: "0 3px 3px 0",
                background:
                  "linear-gradient(180deg,#D4AF37,rgba(212,175,55,0.3))",
                boxShadow: "0 0 8px rgba(212,175,55,0.55)",
              }}
            />
          )}

          {/* Icon */}
          <span
            style={{
              width: isMobile ? 36 : 32,
              height: isMobile ? 36 : 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 9,
              flexShrink: 0,
              background: isActive
                ? "rgba(212,175,55,0.14)"
                : "rgba(255,255,255,0.05)",
              transition: "background 0.2s",
            }}
          >
            <Icon
              size={isMobile ? 18 : 16}
              strokeWidth={isActive ? 2.5 : 2}
              color={isActive ? "#D4AF37" : "currentColor"}
            />
          </span>

          {/* Label */}
          {!collapsed && (
            <span
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontSize: isMobile ? 13.5 : 12.5,
                fontWeight: isActive ? 600 : 500,
                letterSpacing: 0.15,
                lineHeight: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
          )}

          {/* Active dot when collapsed */}
          {isActive && collapsed && (
            <span
              style={{
                position: "absolute",
                right: isMobile ? 8 : 6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "#D4AF37",
                boxShadow: "0 0 6px #D4AF37",
              }}
            />
          )}
        </>
      )}
    </NavLink>
  );
};

export default SidebarItem;