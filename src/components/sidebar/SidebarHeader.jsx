


import logo from "../../assets/Logo.jpeg";

const SidebarHeader = ({ collapsed, onClose }) => {
  return (
    <div
      style={{
        minHeight: 68,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: collapsed ? "0 10px" : "0 16px",
        borderBottom: "1px solid rgba(212,175,55,0.13)",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Gold top shimmer */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: collapsed ? "18%" : "8%",
          right: collapsed ? "18%" : "8%",
          height: 1.5,
          background:
            "linear-gradient(90deg,transparent,rgba(212,175,55,0.55),transparent)",
          borderRadius: 2,
        }}
      />

      {/* Logo + brand */}
      <div style={{ display: "flex", alignItems: "center", gap: collapsed ? 0 : 10, flex: 1, minWidth: 0 }}>
        {/* Logo ring */}
        <div
          style={{
            flexShrink: 0,
            width: collapsed ? 38 : 42,
            height: collapsed ? 38 : 42,
            borderRadius: 12,
            padding: 2.5,
            background:
              "linear-gradient(135deg,rgba(212,175,55,0.55),rgba(212,175,55,0.12))",
            transition: "all 0.3s",
          }}
        >
          <img
            src={logo}
            alt="GO Mobility"
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 9,
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>

        {!collapsed && (
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
              <span
                style={{
                  fontFamily: "'Cinzel',serif",
                  fontSize: 17,
                  fontWeight: 900,
                  color: "#ffffff",
                  letterSpacing: -0.5,
                }}
              >
                GO
              </span>
              <span
                style={{
                  fontFamily: "'Cinzel',serif",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#D4AF37",
                  letterSpacing: 2,
                }}
              >
                MOBILITY
              </span>
            </div>
            <p
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontSize: 9,
                letterSpacing: 2.2,
                color: "rgba(212,175,55,0.42)",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Command Centre
            </p>
          </div>
        )}
      </div>

      {/* ── CLOSE / TOGGLE BUTTON — visible on ALL screen sizes ── */}
      <button
        type="button"
        onClick={onClose}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: 8,
          background: "rgba(212,175,55,0.08)",
          border: "1px solid rgba(212,175,55,0.2)",
          color: "rgba(212,175,55,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "background 0.2s, color 0.2s, transform 0.2s",
          marginLeft: collapsed ? 0 : 8,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(212,175,55,0.16)";
          e.currentTarget.style.color = "#D4AF37";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(212,175,55,0.08)";
          e.currentTarget.style.color = "rgba(212,175,55,0.7)";
        }}
      >
        {/* Hamburger / X icon in pure SVG */}
        {collapsed ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 4h10M2 7h10M2 10h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default SidebarHeader;