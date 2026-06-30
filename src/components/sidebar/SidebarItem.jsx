import { useState, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";

const SidebarItem = ({ to, icon: Icon, label, onClick, collapsed }) => {
  if (!Icon) return null;

  const [tipPos, setTipPos] = useState(null);

  const showTip = useCallback((e) => {
    if (!collapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTipPos({ top: rect.top + rect.height / 2, left: rect.right + 10 });
  }, [collapsed]);

  const hideTip = useCallback(() => setTipPos(null), []);

  return (
    <>
      <NavLink
        to={to}
        onClick={onClick}
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        style={({ isActive }) => ({
          display: "flex",
          alignItems: "center",
          gap: collapsed ? 0 : 11,
          justifyContent: collapsed ? "center" : "flex-start",
          borderRadius: 11,
          padding: collapsed ? "7px 0" : "9px 12px",
          width: "100%",
          background: isActive
            ? collapsed
              ? "rgba(212,175,55,0.14)"
              : "linear-gradient(90deg,rgba(212,175,55,0.17) 0%,rgba(212,175,55,0.04) 100%)"
            : "transparent",
          border: isActive
            ? "1px solid rgba(212,175,55,0.32)"
            : "1px solid transparent",
          color: isActive ? "#D4AF37" : "rgba(255,255,255,0.75)",
          textDecoration: "none",
          position: "relative",
          transition: "all 0.2s",
          boxShadow: isActive && collapsed ? "0 0 16px rgba(212,175,55,0.10)" : undefined,
        })}
        onMouseEnter={(e) => {
          showTip(e);
          const isActive = e.currentTarget.getAttribute("aria-current") === "page" ||
            e.currentTarget.style.borderColor?.includes("212");
          if (!isActive) {
            e.currentTarget.style.background = "rgba(255,255,255,0.07)";
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
          }
        }}
        onMouseLeave={(e) => {
          hideTip();
          const isActive = e.currentTarget.getAttribute("aria-current") === "page";
          if (!isActive) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.75)";
            e.currentTarget.style.borderColor = "transparent";
          }
        }}
      >
        {({ isActive }) => (
          <>
            {/* Left gold bar — expanded active */}
            {isActive && !collapsed && (
              <span style={{
                position: "absolute", left: 0, top: "50%",
                transform: "translateY(-50%)",
                width: 3, height: "58%", borderRadius: "0 3px 3px 0",
                background: "linear-gradient(180deg,#D4AF37,rgba(212,175,55,0.3))",
                boxShadow: "0 0 8px rgba(212,175,55,0.55)",
              }}/>
            )}

            {/* Icon box */}
            <span style={{
              width: collapsed ? 40 : 32,
              height: collapsed ? 40 : 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              flexShrink: 0,
              background: isActive
                ? "rgba(212,175,55,0.20)"
                : collapsed
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(255,255,255,0.05)",
              border: isActive
                ? "1px solid rgba(212,175,55,0.40)"
                : collapsed
                  ? "1px solid rgba(255,255,255,0.10)"
                  : "1px solid transparent",
              transition: "all 0.2s",
              boxShadow: isActive && collapsed
                ? "0 0 12px rgba(212,175,55,0.25)"
                : undefined,
            }}>
              <Icon
                size={collapsed ? 19 : 16}
                strokeWidth={isActive ? 2.5 : 2}
                color={isActive ? "#D4AF37" : collapsed ? "rgba(255,255,255,0.88)" : "currentColor"}
              />
            </span>

            {/* Label — expanded */}
            {!collapsed && (
              <span style={{
                fontFamily: "'Outfit',sans-serif",
                fontSize: 12.5,
                fontWeight: isActive ? 600 : 500,
                letterSpacing: 0.15,
                lineHeight: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {label}
              </span>
            )}

            {/* Active dot — collapsed */}
            {isActive && collapsed && (
              <span style={{
                position: "absolute",
                bottom: 4,
                left: "50%",
                transform: "translateX(-50%)",
                width: 4, height: 4,
                borderRadius: "50%",
                background: "#D4AF37",
                boxShadow: "0 0 6px #D4AF37",
              }}/>
            )}
          </>
        )}
      </NavLink>

      {/* Portal tooltip — renders outside sidebar overflow */}
      {collapsed && tipPos && createPortal(
        <div style={{
          position: "fixed",
          top: tipPos.top,
          left: tipPos.left,
          transform: "translateY(-50%)",
          background: "linear-gradient(135deg,#0d1f3c,#162240)",
          border: "1px solid rgba(212,175,55,0.40)",
          borderRadius: 8,
          padding: "7px 13px",
          fontSize: 12.5,
          fontWeight: 600,
          fontFamily: "'Outfit',sans-serif",
          color: "#fff",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 9999,
          boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
          letterSpacing: 0.2,
        }}>
          {label}
          {/* Arrow */}
          <span style={{
            position: "absolute",
            left: -5,
            top: "50%",
            transform: "translateY(-50%) rotate(45deg)",
            width: 8, height: 8,
            background: "#0d1f3c",
            border: "1px solid rgba(212,175,55,0.40)",
            borderRight: "none",
            borderTop: "none",
          }}/>
        </div>,
        document.body
      )}
    </>
  );
};

export default SidebarItem;
