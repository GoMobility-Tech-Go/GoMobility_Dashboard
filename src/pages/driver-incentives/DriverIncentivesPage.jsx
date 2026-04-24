import {
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  ArrowUpRight,
  CircleDot,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  Tooltip,
  Cell,
} from "recharts";

/* DATA */
const incentives = [
  {
    id: 1,
    title: "Peak Hour Bonus",
    rides: 20,
    bonus: "₹300",
    timeWindow: "6 PM - 10 PM",
    zone: "Mumbai - All Zones",
    active: true,
  },
  {
    id: 2,
    title: "Weekend Warrior",
    rides: 50,
    bonus: "₹800",
    timeWindow: "Saturday - Sunday",
    zone: "Mumbai - Western Suburbs",
    active: true,
  },
  {
    id: 3,
    title: "Morning Rush",
    rides: 15,
    bonus: "₹250",
    timeWindow: "7 AM - 11 AM",
    zone: "Delhi - Central",
    active: false,
  },
];

/* CHART DATA */
const chartData = [
  { name: "Peak", value: 20, color: "#D4AF37" },
  { name: "Weekend", value: 50, color: "#60A5FA" },
  { name: "Morning", value: 15, color: "#34D399" },
];

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

        {/* CARDS */}
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
          }}
        >
          {incentives.map((item) => (
            <div key={item.id} className="dbc" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <TrendingUp color="#D4AF37" />
                  <h3 style={{ color: "#fff" }}>{item.title}</h3>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <Pencil size={14} color="#60A5FA" />
                  <Trash2 size={14} color="#F87171" />
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                  textAlign: "center",
                }}
              >
                <p style={{ color: "#aaa", fontSize: 12 }}>Complete</p>
                <h2 style={{ color: "#fff" }}>{item.rides} rides</h2>
                <p style={{ color: "#34D399" }}>{item.bonus}</p>
              </div>

              <div style={{ marginTop: 12, fontSize: 12 }}>
                <p style={{ color: "#aaa" }}>
                  Time: <span style={{ color: "#fff" }}>{item.timeWindow}</span>
                </p>
                <p style={{ color: "#aaa" }}>
                  Zone: <span style={{ color: "#fff" }}>{item.zone}</span>
                </p>
              </div>

              <div style={{ marginTop: 12 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: item.active ? "#34D399" : "#F87171",
                  }}
                >
                  ● {item.active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ANALYTICS */}
        <div className="dbc" style={{ marginTop: 24, padding: 20 }}>
          <h3 style={{ color: "#fff", marginBottom: 12 }}>
            Incentive Performance
          </h3>

          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#aaa" />
                <Tooltip />
                <Bar dataKey="value">
                  {chartData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}