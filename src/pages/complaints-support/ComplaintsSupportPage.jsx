import { useState, useEffect } from "react";
import { Search, Filter, CircleDot, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from "recharts";
import { getSupportTickets, replyToTicket, getSupportCategories } from "../../api/admin";

function normalizeTicket(t) {
  return {
    ticketId: t.ticket_number || t.id || t.ticketId || '',
    rideId: t.ride_id || t.rideId || '—',
    type: t.category || t.type || 'General',
    raisedBy: t.user?.role === 'driver' ? 'Driver' : 'Rider',
    status: t.status || 'open',
    priority: t.priority || 'medium',
    description: t.issue || t.description || '',
    driver: t.driver_name || '—',
    rider: t.user_name || t.user?.full_name || '—',
    fare: t.fare ? `₹${t.fare}` : '—',
    time: t.created_at ? new Date(t.created_at).toLocaleString('en-IN') : '',
    active: false,
  };
}

const getStatusColor = (status) => {
  if (status === "open") return "#F87171";
  if (status === "in_progress" || status === "in progress") return "#F59E0B";
  return "#34D399";
};

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
    .card:hover{transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,0.5);}
  `}</style>
);

export default function ComplaintsSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    getSupportTickets()
      .then(res => {
        const raw = res?.data?.tickets || res?.tickets || res?.data || [];
        const normalized = Array.isArray(raw) ? raw.map(normalizeTicket) : [];
        if (normalized.length > 0) normalized[0].active = true;
        setTickets(normalized);
        setSelected(normalized[0] || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    getSupportCategories()
      .then(res => {
        const raw = res.data?.data || res.data || [];
        const list = Array.isArray(raw) ? raw : [];
        setCategories(list.map(c => typeof c === "string" ? c : c.name || c.category || c));
      })
      .catch(() => {});
  }, []);

  const filtered = tickets.filter(t => {
    const matchSearch = t.ticketId.toLowerCase().includes(search.toLowerCase()) || t.type.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "all" || t.type.toLowerCase() === activeCategory.toLowerCase();
    return matchSearch && matchCat;
  });

  const openCount = tickets.filter(t => t.status === "open").length;
  const inProgressCount = tickets.filter(t => t.status === "in_progress" || t.status === "in progress").length;
  const resolvedCount = tickets.filter(t => t.status === "resolved" || t.status === "closed").length;

  const stats = [
    { label: "Open", value: openCount, color: "#F87171", icon: AlertTriangle },
    { label: "In Progress", value: inProgressCount, color: "#F59E0B", icon: Clock },
    { label: "Resolved", value: resolvedCount, color: "#34D399", icon: CheckCircle },
  ];

  const chartData = [
    { name: "Open", value: openCount, color: "#F87171" },
    { name: "Progress", value: inProgressCount, color: "#F59E0B" },
    { name: "Resolved", value: resolvedCount, color: "#34D399" },
  ];

  const sendReply = () => {
    if (!selected || !reply.trim()) return;
    replyToTicket(selected.ticketId, reply).catch(() => {});
    setReply("");
  };

  return (
    <>
      <GS />
      <div style={{ padding: 20, fontFamily: "Outfit", color: "#fff" }}>
        <div className="card" style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 32 }}>Complaints & Support</h1>
          <p style={{ color: "#aaa" }}>Manage tickets, resolve issues & track analytics</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 20 }}>
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card">
                <Icon color={s.color} />
                <h2>{loading ? "—" : s.value}</h2>
                <p style={{ color: "#aaa" }}>{s.label}</p>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap:"wrap" }}>
          <div className="card" style={{ flex: 1, minWidth:180, display: "flex", gap: 8 }}>
            <Search size={16} />
            <input
              placeholder="Search tickets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", color: "#fff", width: "100%" }}
            />
          </div>
          {categories.length > 0 && (
            <div className="card" style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px" }}>
              <Filter size={14} color="rgba(212,175,55,0.6)" />
              <select value={activeCategory} onChange={e=>setActiveCategory(e.target.value)}
                style={{ background:"transparent", border:"none", outline:"none", color:"rgba(255,255,255,0.8)", fontSize:13, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>
                <option value="all" style={{ background:"#020617" }}>All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat} style={{ background:"#020617" }}>{cat}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="card" style={{ padding: 50, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Loading tickets...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
            <div className="card">
              {filtered.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🎫</div>
                  No tickets found
                </div>
              ) : filtered.map((t) => (
                <div
                  key={t.ticketId}
                  onClick={() => setSelected(t)}
                  style={{ padding: 12, marginBottom: 10, borderRadius: 10, background: selected?.ticketId === t.ticketId ? "rgba(212,175,55,0.1)" : "transparent", cursor: "pointer" }}
                >
                  <h4>{t.ticketId}</h4>
                  <p style={{ color: "#aaa", fontSize: 12 }}>{t.type} • {t.rideId}</p>
                  <span style={{ color: getStatusColor(t.status) }}>● {t.status}</span>
                </div>
              ))}
            </div>

            <div className="card">
              {selected ? (
                <>
                  <h2>Ticket Details</h2>
                  <div style={{ marginTop: 10 }}>
                    <p><b>ID:</b> {selected.ticketId}</p>
                    <p><b>Ride:</b> {selected.rideId}</p>
                    <p><b>Type:</b> {selected.type}</p>
                    <p><b>Raised By:</b> {selected.raisedBy}</p>
                    <p><b>Time:</b> {selected.time}</p>
                  </div>
                  <hr style={{ borderColor: "#333" }} />
                  <div>
                    <p><b>Driver:</b> {selected.driver}</p>
                    <p><b>Rider:</b> {selected.rider}</p>
                    <p><b>Fare:</b> {selected.fare}</p>
                  </div>
                  <hr style={{ borderColor: "#333" }} />
                  <div>
                    <p><b>Description:</b></p>
                    <p style={{ color: "#aaa" }}>{selected.description || "—"}</p>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder="Type reply..."
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.2)", color: "#fff", borderRadius: 8, padding: 8, resize: "vertical", fontSize: 12 }}
                      rows={3}
                    />
                    <button onClick={sendReply} style={{ width: "100%", marginTop: 8, background: "#22C55E", color: "#fff", padding: 10, border: "none", borderRadius: 8, cursor: "pointer" }}>
                      Send Reply
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Select a ticket</div>
              )}
            </div>
          </div>
        )}

        <div className="card" style={{ marginTop: 20 }}>
          <h3>Ticket Analytics</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#aaa" />
                <Tooltip />
                <Bar dataKey="value">
                  {chartData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
