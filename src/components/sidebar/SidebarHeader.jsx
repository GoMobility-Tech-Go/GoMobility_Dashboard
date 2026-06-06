import logo from "../../assets/Logo.jpeg";

const SidebarHeader = ({ collapsed }) => {
  return (
    <div
      style={{
        height: 68,
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        padding: collapsed ? "0" : "0 16px",
        borderBottom: "1px solid rgba(212,175,55,0.13)",
        position: "relative",
        flexShrink: 0,
        transition: "padding 0.32s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* Gold shimmer line at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "10%",
          right: "10%",
          height: 1.5,
          background: "linear-gradient(90deg,transparent,rgba(212,175,55,0.55),transparent)",
          borderRadius: 2,
        }}
      />

      {/* Logo ring */}
      <div
        style={{
          flexShrink: 0,
          width: collapsed ? 36 : 40,
          height: collapsed ? 36 : 40,
          borderRadius: 11,
          padding: 2,
          background: "linear-gradient(135deg,rgba(212,175,55,0.6),rgba(212,175,55,0.15))",
          boxShadow: collapsed ? "0 0 14px rgba(212,175,55,0.18)" : "0 0 10px rgba(212,175,55,0.12)",
          transition: "all 0.32s cubic-bezier(0.4,0,0.2,1)",
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

      {/* Brand text — only when expanded */}
      <div
        style={{
          overflow: "hidden",
          maxWidth: collapsed ? 0 : 180,
          opacity: collapsed ? 0 : 1,
          transition: "max-width 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease",
          marginLeft: collapsed ? 0 : 10,
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
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
              fontSize: 13.5,
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
            fontSize: 8.5,
            letterSpacing: 2.2,
            color: "rgba(212,175,55,0.42)",
            textTransform: "uppercase",
            margin: 0,
            marginTop: 1,
          }}
        >
          Command Centre
        </p>
      </div>
    </div>
  );
};

export default SidebarHeader;
