import {
  Search,
  Filter,
  CircleDot,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  CarFront,
  IndianRupee,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell,
} from "recharts";

/* ================= DATA ================= */
const tickets = [
  { ticketId: "T1023", rideId: "R2745", type: "Driver Behavior", raisedBy: "Rider", status: "open", priority: "high", active: true },
  { ticketId: "T1024", rideId: "R2746", type: "Payment Issue", raisedBy: "Driver", status: "open", priority: "medium", active: false },
  { ticketId: "T1025", rideId: "R2747", type: "Cancellation Dispute", raisedBy: "Rider", status: "in progress", priority: "low", active: false },
  { ticketId: "T1026", rideId: "R2748", type: "Vehicle Condition", raisedBy: "Rider", status: "open", priority: "high", active: false },
  { ticketId: "T1027", rideId: "R2749", type: "Route Issue", raisedBy: "Driver", status: "resolved", priority: "low", active: false },
];

const selectedTicket = {
  ticketId: "T1023",
  rideId: "R2745",
  type: "Driver Behavior",
  raisedBy: "Rider",
  time: "2026-03-17 10:30 AM",
  description: "Driver was rude and took a longer route",
  driver: "Rajesh Kumar",
  rider: "Priya Singh",
  fare: "₹245",
};

const stats = [
  { label: "Open", value: 3, color: "#F87171", icon: AlertTriangle },
  { label: "In Progress", value: 1, color: "#F59E0B", icon: Clock },
  { label: "Resolved", value: 1, color: "#34D399", icon: CheckCircle },
];

const chartData = [
  { name: "Open", value: 3, color: "#F87171" },
  { name: "Progress", value: 1, color: "#F59E0B" },
  { name: "Resolved", value: 1, color: "#34D399" },
];

/* ================= HELPERS ================= */
const getStatusColor = (status) => {
  if (status === "open") return "#F87171";
  if (status === "in progress") return "#F59E0B";
  return "#34D399";
};

/* ================= STYLE ================= */
const GS = () => (
  <style>{`
    body{background:#020617}
    .card{
      background:linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01));
      border:1px solid rgba(212,175,55,0.18);
      border-radius:18px;
      backdrop-filter:blur(12px);
      padding:16px;
      transition:.3s;
    }
    .card:hover{
      transform:translateY(-4px);
      box-shadow:0 20px 60px rgba(0,0,0,0.5);
    }
  `}</style>
);

/* ================= MAIN ================= */
export default function ComplaintsSupportPage() {
  return (
    <>
      <GS />

      <div style={{ padding: 20, fontFamily: "Outfit", color: "#fff" }}>
        
        {/* HEADER */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 32 }}>Complaints & Support</h1>
          <p style={{ color: "#aaa" }}>
            Manage tickets, resolve issues & track analytics
          </p>
        </div>

        {/* STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 20 }}>
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card">
                <Icon color={s.color} />
                <h2>{s.value}</h2>
                <p style={{ color: "#aaa" }}>{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* SEARCH */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <div className="card" style={{ flex: 1, display: "flex", gap: 8 }}>
            <Search size={16} />
            <input
              placeholder="Search tickets..."
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                width: "100%",
              }}
            />
          </div>

          <button className="card">
            <Filter size={16} /> Filter
          </button>
        </div>

        {/* MAIN GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
          
          {/* LEFT: TICKET LIST */}
          <div className="card">
            {tickets.map((t) => (
              <div
                key={t.ticketId}
                style={{
                  padding: 12,
                  marginBottom: 10,
                  borderRadius: 10,
                  background: t.active ? "rgba(212,175,55,0.1)" : "transparent",
                }}
              >
                <h4>{t.ticketId}</h4>
                <p style={{ color: "#aaa", fontSize: 12 }}>
                  {t.type} • {t.rideId}
                </p>

                <span style={{ color: getStatusColor(t.status) }}>
                  ● {t.status}
                </span>
              </div>
            ))}
          </div>

          {/* RIGHT: FULL DETAILS */}
          <div className="card">
            <h2>Ticket Details</h2>

            <div style={{ marginTop: 10 }}>
              <p><b>ID:</b> {selectedTicket.ticketId}</p>
              <p><b>Ride:</b> {selectedTicket.rideId}</p>
              <p><b>Type:</b> {selectedTicket.type}</p>
              <p><b>Raised By:</b> {selectedTicket.raisedBy}</p>
              <p><b>Time:</b> {selectedTicket.time}</p>
            </div>

            <hr style={{ borderColor: "#333" }} />

            <div>
              <p><b>Driver:</b> {selectedTicket.driver}</p>
              <p><b>Rider:</b> {selectedTicket.rider}</p>
              <p><b>Fare:</b> {selectedTicket.fare}</p>
            </div>

            <hr style={{ borderColor: "#333" }} />

            <div>
              <p><b>Description:</b></p>
              <p style={{ color: "#aaa" }}>
                {selectedTicket.description}
              </p>
            </div>

            {/* ACTIONS */}
            <div style={{ marginTop: 16 }}>
              <button style={{ width: "100%", marginBottom: 8, background: "#2563EB", color: "#fff", padding: 10 }}>
                Issue Refund
              </button>

              <button style={{ width: "100%", marginBottom: 8, background: "#F97316", color: "#fff", padding: 10 }}>
                Apply Penalty
              </button>

              <button style={{ width: "100%", background: "#22C55E", color: "#fff", padding: 10 }}>
                Close Ticket
              </button>
            </div>
          </div>
        </div>

        {/* ANALYTICS */}
        <div className="card" style={{ marginTop: 20 }}>
          <h3>Ticket Analytics</h3>

          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
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