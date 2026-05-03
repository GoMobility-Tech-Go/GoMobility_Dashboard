import { Plus } from "lucide-react";

/* GLOBAL STYLE */
const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Outfit:wght@300;400;600&display=swap');

    .dbc{
      background:linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01));
      border:1px solid rgba(212,175,55,0.18);
      border-radius:20px;
      backdrop-filter:blur(12px);
      transition:.3s;
    }

    .dbc:hover{
      transform:translateY(-4px);
      box-shadow:0 20px 60px rgba(0,0,0,0.5);
    }

    .bup{
      background:rgba(212,175,55,0.12);
      border:1px solid rgba(212,175,55,0.28);
      color:#D4AF37;
      padding:4px 10px;
      border-radius:999px;
      font-size:10px;
    }
  `}</style>
);

/* COMPONENT */
export default function DriverIncentivesPage() {
  return (
    <>
      <GS />

      <div style={{ fontFamily: "Outfit, sans-serif" }}>
        {/* HEADER */}
        <div className="dbc" style={{ padding: 22, marginBottom: 20 }}>
          <p className="bup">GO Mobility · Incentive Engine</p>

          <h1
            style={{
              fontFamily: "Cinzel",
              fontSize: 36,
              color: "#fff",
              margin: "10px 0",
            }}
          >
            Driver Incentives
          </h1>

          <p style={{ color: "rgba(255,255,255,0.4)" }}>
            Create & manage bonus structures for driver performance
          </p>
        </div>

        {/* ACTION */}
        <div style={{ marginBottom: 20 }}>
          <button
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              background: "linear-gradient(90deg,#D4AF37,#f7dc6f)",
              border: "none",
              padding: "10px 16px",
              borderRadius: 10,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={16} /> New Incentive
          </button>
        </div>

        {/* EMPTY STATE */}
        <div className="dbc" style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "Outfit,sans-serif" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 14 }}>Driver incentives API not available</div>
          <div style={{ fontSize: 12, marginTop: 6, color: "rgba(255,255,255,0.2)" }}>Incentive plans cannot be loaded or managed via API</div>
        </div>
      </div>
    </>
  );
}