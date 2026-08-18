import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, AlertTriangle, Clock, CheckCircle, XCircle,
  ChevronDown, Send, RefreshCw, Tag, User, Phone,
  Car, Calendar, MessageSquare, ShieldAlert, Filter,
} from "lucide-react";
import {
  getAdminSupportStats, getAdminSupportTickets,
  getAdminSupportTicket, updateAdminSupportTicket, adminReplyToTicket,
} from "../../api/admin";

// ─── Constants ────────────────────────────────────────────────────────────────
const GOLD     = "#D4AF37";
const GOLD10   = "rgba(212,175,55,0.10)";
const GOLD20   = "rgba(212,175,55,0.20)";
const GOLD35   = "rgba(212,175,55,0.35)";
const T88      = "rgba(255,255,255,0.88)";
const T60      = "rgba(255,255,255,0.60)";
const T38      = "rgba(255,255,255,0.38)";
const T12      = "rgba(255,255,255,0.12)";
const T06      = "rgba(255,255,255,0.06)";
const T03      = "rgba(255,255,255,0.03)";

const PRIORITY_CFG = {
  urgent: { color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.30)", label: "Urgent" },
  high:   { color: "#fb923c", bg: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.30)",  label: "High"   },
  medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.30)",  label: "Medium" },
  low:    { color: T60,       bg: T06,                       border: T12,                      label: "Low"    },
};
const STATUS_CFG = {
  open:            { color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.28)", label: "Open"          },
  in_progress:     { color: "#fbbf24", bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.28)",  label: "In Progress"   },
  waiting_on_user: { color: "#60a5fa", bg: "rgba(96,165,250,0.10)",  border: "rgba(96,165,250,0.28)",  label: "Waiting"       },
  resolved:        { color: "#4ade80", bg: "rgba(74,222,128,0.10)",  border: "rgba(74,222,128,0.28)",  label: "Resolved"      },
  closed:          { color: T38,       bg: T06,                       border: T12,                      label: "Closed"        },
};
const CATEGORY_LABELS = {
  ride_issue:      "Ride Issue",
  payment_issue:   "Payment Issue",
  driver_behavior: "Driver Behavior",
  safety_concern:  "Safety Concern",
  app_bug:         "App Bug",
  account:         "Account",
  other:           "Other",
};
const ALL_STATUSES   = ["open","in_progress","waiting_on_user","resolved","closed"];
const ALL_PRIORITIES = ["urgent","high","medium","low"];
const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);
const PAGE_SIZE = 20;

// ─── Small helpers ─────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) : "—";

function Badge({ label, color, bg, border, size = 11 }) {
  return (
    <span style={{ fontSize: size, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: bg, color, border: `1px solid ${border}`, whiteSpace: "nowrap", display:"inline-block" }}>
      {label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color, loading }) {
  return (
    <div style={{ flex: 1, minWidth: 120, padding: "16px 18px", borderRadius: 14, background: T03, border: `1px solid ${color}22`, position: "relative", overflow: "hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color},transparent)` }} />
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:`${color}18`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Icon size={16} color={color} />
        </div>
        <div>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:"1.2px", textTransform:"uppercase", color:T38 }}>{label}</div>
          <div style={{ fontSize:22, fontWeight:800, color:T88, lineHeight:1.1, fontVariantNumeric:"tabular-nums" }}>
            {loading ? <span style={{ opacity:0.2 }}>—</span> : (value ?? 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectFilter({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ background:"rgba(10,20,50,0.8)", border:`1px solid ${T12}`, borderRadius:8, color: value ? T88 : T38, fontSize:12, padding:"6px 10px", outline:"none", cursor:"pointer", fontFamily:"Outfit,sans-serif", appearance:"none" }}
    >
      <option value="" style={{ background:"#020c1e" }}>{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value} style={{ background:"#020c1e" }}>{o.label}</option>)}
    </select>
  );
}

// ─── Ticket list item ──────────────────────────────────────────────────────────
function TicketRow({ ticket, selected, onClick }) {
  const sc = STATUS_CFG[ticket.status]   || STATUS_CFG.open;
  const pc = PRIORITY_CFG[ticket.priority] || PRIORITY_CFG.medium;
  const isActive = selected?.id === ticket.id;
  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px 14px", borderRadius: 10, cursor: "pointer", position: "relative",
        background: isActive ? GOLD10 : "transparent",
        border: `1px solid ${isActive ? GOLD35 : "transparent"}`,
        marginBottom: 4,
        transition: "background .15s, border .15s",
      }}
    >
      {/* priority left bar */}
      <div style={{ position:"absolute", left:0, top:8, bottom:8, width:3, borderRadius:"0 2px 2px 0", background: pc.color }} />
      <div style={{ paddingLeft:8 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
          <span style={{ fontSize:10, fontWeight:700, color:GOLD, letterSpacing:"0.5px" }}>{ticket.ticket_number}</span>
          <Badge label={sc.label} color={sc.color} bg={sc.bg} border={sc.border} size={10} />
        </div>
        <div style={{ fontSize:12.5, fontWeight:600, color:T88, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {ticket.subject || "—"}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:10, color:T38 }}>{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
          <span style={{ fontSize:10, color:T38 }}>•</span>
          <span style={{ fontSize:10, color:T38 }}>{ticket.user_full_name || "—"}</span>
          <span style={{ marginLeft:"auto", fontSize:10, color:T38 }}>{fmtDate(ticket.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Chat bubble ───────────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isAdmin = msg.sender_role === "admin";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems: isAdmin ? "flex-end" : "flex-start", marginBottom:10 }}>
      <div style={{ fontSize:9.5, fontWeight:700, color:T38, marginBottom:3, letterSpacing:"0.5px" }}>
        {isAdmin ? "Admin" : (msg.sender_name || "User")} · {fmtDate(msg.created_at)}
      </div>
      <div style={{
        maxWidth:"78%", padding:"10px 14px", borderRadius: isAdmin ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
        background: isAdmin ? `linear-gradient(135deg,${GOLD10},rgba(212,175,55,0.06))` : "rgba(96,165,250,0.08)",
        border: `1px solid ${isAdmin ? GOLD20 : "rgba(96,165,250,0.20)"}`,
        fontSize: 13, color: T88, lineHeight: 1.5,
      }}>
        {msg.message}
      </div>
    </div>
  );
}

// ─── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ ticket, messages, onStatusChange, onReply, updating }) {
  const [reply, setReply]         = useState("");
  const [sending, setSending]     = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [showResolve, setShowResolve] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  const sc = STATUS_CFG[ticket.status] || STATUS_CFG.open;
  const pc = PRIORITY_CFG[ticket.priority] || PRIORITY_CFG.medium;

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    await onReply(reply.trim());
    setReply("");
    setSending(false);
  };

  const handleResolve = async () => {
    await onStatusChange("resolved", resolveNote.trim() || null);
    setShowResolve(false);
    setResolveNote("");
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", gap:0 }}>

      {/* Header */}
      <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T06}`, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:GOLD, letterSpacing:"0.6px" }}>{ticket.ticket_number}</span>
          <Badge label={sc.label} color={sc.color} bg={sc.bg} border={sc.border} />
          <Badge label={pc.label} color={pc.color} bg={pc.bg} border={pc.border} />
          <Badge label={CATEGORY_LABELS[ticket.category] || ticket.category} color={T60} bg={T06} border={T12} />
        </div>
        <div style={{ fontSize:15, fontWeight:700, color:T88, lineHeight:1.3 }}>{ticket.subject}</div>
      </div>

      {/* Meta */}
      <div style={{ padding:"12px 20px", borderBottom:`1px solid ${T06}`, flexShrink:0, display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px" }}>
        <MetaRow icon={User}     label="Submitted by"    value={ticket.user_full_name || "—"} />
        <MetaRow icon={Phone}    label="Phone"           value={ticket.user_phone || "—"} />
        <MetaRow icon={Tag}      label="Role"            value={ticket.user_role || "—"} />
        <MetaRow icon={Car}      label="Ride ID"         value={ticket.ride_id ? `#${ticket.ride_id}` : "—"} />
        <MetaRow icon={Calendar} label="Created"         value={fmtDate(ticket.created_at)} />
        {ticket.resolved_at && <MetaRow icon={CheckCircle} label="Resolved" value={fmtDate(ticket.resolved_at)} />}
      </div>

      {/* Description */}
      {ticket.description && (
        <div style={{ padding:"12px 20px", borderBottom:`1px solid ${T06}`, flexShrink:0 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:"1.2px", textTransform:"uppercase", color:T38, marginBottom:6 }}>Description</div>
          <div style={{ fontSize:13, color:T60, lineHeight:1.6 }}>{ticket.description}</div>
        </div>
      )}

      {/* Resolution notes (if resolved) */}
      {ticket.resolution_notes && (
        <div style={{ padding:"10px 20px", borderBottom:`1px solid ${T06}`, flexShrink:0, background:"rgba(74,222,128,0.04)" }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:"1.2px", textTransform:"uppercase", color:"rgba(74,222,128,0.5)", marginBottom:4 }}>Resolution Notes</div>
          <div style={{ fontSize:13, color:"rgba(74,222,128,0.8)", lineHeight:1.5 }}>{ticket.resolution_notes}</div>
        </div>
      )}

      {/* Thread */}
      <div ref={threadRef} style={{ flex:1, overflowY:"auto", padding:"14px 20px", minHeight:0 }}>
        {messages.length === 0
          ? <div style={{ textAlign:"center", color:T38, fontSize:13, paddingTop:30 }}>No messages yet</div>
          : messages.map(m => <Bubble key={m.id} msg={m} />)
        }
      </div>

      {/* Status actions */}
      {!["resolved","closed"].includes(ticket.status) && (
        <div style={{ padding:"10px 20px", borderTop:`1px solid ${T06}`, flexShrink:0, display:"flex", gap:6, flexWrap:"wrap" }}>
          {ticket.status !== "in_progress" && (
            <ActionBtn label="Mark In Progress" color="#fbbf24" disabled={updating}
              onClick={() => onStatusChange("in_progress")} />
          )}
          {ticket.status !== "waiting_on_user" && (
            <ActionBtn label="Waiting on User" color="#60a5fa" disabled={updating}
              onClick={() => onStatusChange("waiting_on_user")} />
          )}
          <ActionBtn label="Resolve" color="#4ade80" disabled={updating}
            onClick={() => setShowResolve(v => !v)} />
        </div>
      )}

      {/* Resolve notes input */}
      {showResolve && (
        <div style={{ padding:"0 20px 10px", flexShrink:0 }}>
          <textarea
            value={resolveNote}
            onChange={e => setResolveNote(e.target.value)}
            placeholder="Resolution notes (optional)..."
            rows={2}
            style={{ width:"100%", boxSizing:"border-box", background:"rgba(74,222,128,0.05)", border:"1px solid rgba(74,222,128,0.25)", borderRadius:8, color:T88, padding:"8px 10px", resize:"none", fontSize:12, fontFamily:"Outfit,sans-serif", outline:"none" }}
          />
          <button onClick={handleResolve} disabled={updating}
            style={{ marginTop:6, width:"100%", padding:"8px 0", background:"rgba(74,222,128,0.15)", border:"1px solid rgba(74,222,128,0.35)", borderRadius:8, color:"#4ade80", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>
            Confirm Resolve
          </button>
        </div>
      )}

      {/* Reply box */}
      {!["closed"].includes(ticket.status) && (
        <div style={{ padding:"10px 20px 14px", borderTop:`1px solid ${T06}`, flexShrink:0 }}>
          <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Type admin reply..."
              rows={2}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend(); }}
              style={{ flex:1, background:T03, border:`1px solid ${T12}`, borderRadius:10, color:T88, padding:"9px 12px", resize:"none", fontSize:13, fontFamily:"Outfit,sans-serif", outline:"none" }}
            />
            <button onClick={handleSend} disabled={sending || !reply.trim()}
              style={{ padding:"10px 16px", background: reply.trim() ? GOLD10 : T06, border:`1px solid ${reply.trim() ? GOLD35 : T12}`, borderRadius:10, color: reply.trim() ? GOLD : T38, cursor: reply.trim() ? "pointer" : "default", display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:700, fontFamily:"Outfit,sans-serif", flexShrink:0, transition:"all .15s" }}>
              <Send size={14} />
              {sending ? "..." : "Send"}
            </button>
          </div>
          <div style={{ fontSize:10, color:T38, marginTop:4 }}>Ctrl+Enter to send</div>
        </div>
      )}
    </div>
  );
}

function MetaRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
      <Icon size={12} color={T38} style={{ flexShrink:0 }} />
      <div>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:T38 }}>{label}</div>
        <div style={{ fontSize:12, fontWeight:600, color:T88 }}>{value}</div>
      </div>
    </div>
  );
}

function ActionBtn({ label, color, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding:"5px 14px", borderRadius:8, background:`${color}10`, border:`1px solid ${color}30`, color, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"Outfit,sans-serif", opacity: disabled ? 0.5 : 1 }}>
      {label}
    </button>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ComplaintsSupportPage() {
  const [stats,       setStats]      = useState(null);
  const [tickets,     setTickets]    = useState([]);
  const [total,       setTotal]      = useState(0);
  const [page,        setPage]       = useState(1);
  const [loading,     setLoading]    = useState(true);
  const [statsLoading,setStatsLoading] = useState(true);

  const [selected,    setSelected]   = useState(null);
  const [detail,      setDetail]     = useState(null);   // { ticket, messages }
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating,    setUpdating]   = useState(false);

  // Filters
  const [search,      setSearch]     = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Fetch stats ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(() => {
    setStatsLoading(true);
    getAdminSupportStats()
      .then(r => setStats(r.data?.data || r.data || null))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  // ── Fetch tickets ───────────────────────────────────────────────────────────
  const fetchTickets = useCallback((pg = 1) => {
    setLoading(true);
    getAdminSupportTickets({
      page: pg, limit: PAGE_SIZE,
      ...(filterStatus   && { status:   filterStatus }),
      ...(filterPriority && { priority: filterPriority }),
      ...(filterCategory && { category: filterCategory }),
      ...(search.trim()  && { search:   search.trim() }),
    })
      .then(r => {
        const d = r.data?.data || r.data || {};
        setTickets(d.items || []);
        setTotal(d.total  || 0);
        setPage(pg);
        if (d.items?.length > 0 && !selected) setSelected(d.items[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterStatus, filterPriority, filterCategory, search, selected]);

  // ── Fetch ticket detail ─────────────────────────────────────────────────────
  const fetchDetail = useCallback((ticketId) => {
    setDetailLoading(true);
    getAdminSupportTicket(ticketId)
      .then(r => {
        const d = r.data?.data || r.data || {};
        setDetail({ ticket: d.ticket || {}, messages: d.messages || [] });
      })
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, []);

  useEffect(() => { fetchStats(); fetchTickets(1); }, []);
  useEffect(() => { fetchTickets(1); }, [filterStatus, filterPriority, filterCategory]);

  useEffect(() => {
    if (selected?.id) fetchDetail(selected.id);
  }, [selected?.id]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleStatusChange = async (status, resolutionNotes) => {
    if (!detail?.ticket?.id) return;
    setUpdating(true);
    try {
      await updateAdminSupportTicket(detail.ticket.id, {
        status,
        ...(resolutionNotes && { resolution_notes: resolutionNotes }),
      });
      fetchDetail(detail.ticket.id);
      fetchStats();
      fetchTickets(page);
    } catch {}
    setUpdating(false);
  };

  const handleReply = async (message) => {
    if (!detail?.ticket?.id) return;
    await adminReplyToTicket(detail.ticket.id, message);
    fetchDetail(detail.ticket.id);
    fetchTickets(page);
  };

  const handleSearch = (e) => {
    if (e.key === "Enter") { setPage(1); fetchTickets(1); }
  };

  return (
    <div style={{ padding:24, fontFamily:"Outfit,sans-serif", color:T88, height:"100vh", boxSizing:"border-box", display:"flex", flexDirection:"column", gap:20, overflow:"hidden" }}>

      {/* Page header */}
      <div style={{ flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          <ShieldAlert size={20} color={GOLD} />
          <h1 style={{ fontSize:22, fontWeight:800, color:T88, margin:0 }}>Complaints & Support</h1>
        </div>
        <p style={{ fontSize:13, color:T38, margin:0 }}>Manage support tickets, reply to users, and track resolution progress</p>
      </div>

      {/* Stat cards */}
      <div style={{ display:"flex", gap:12, flexShrink:0, flexWrap:"wrap" }}>
        <StatCard icon={AlertTriangle} label="Open"        value={stats?.open}        color="#f87171" loading={statsLoading} />
        <StatCard icon={Clock}         label="In Progress" value={stats?.in_progress}  color="#fbbf24" loading={statsLoading} />
        <StatCard icon={MessageSquare} label="Waiting"     value={stats?.waiting}      color="#60a5fa" loading={statsLoading} />
        <StatCard icon={CheckCircle}   label="Resolved"    value={stats?.resolved}     color="#4ade80" loading={statsLoading} />
        <StatCard icon={XCircle}       label="Urgent"      value={stats?.urgent}       color="#f87171" loading={statsLoading} />
      </div>

      {/* Filter bar */}
      <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:200, background:T03, border:`1px solid ${T12}`, borderRadius:10, padding:"7px 12px" }}>
          <Search size={14} color={T38} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search by ticket #, subject, user... (Enter)"
            style={{ background:"transparent", border:"none", outline:"none", color:T88, fontSize:13, fontFamily:"Outfit,sans-serif", width:"100%" }}
          />
        </div>
        <SelectFilter value={filterStatus}   onChange={v=>{setFilterStatus(v);setPage(1);}}
          options={ALL_STATUSES.map(s=>({ value:s, label:STATUS_CFG[s]?.label||s }))} placeholder="All Status" />
        <SelectFilter value={filterPriority} onChange={v=>{setFilterPriority(v);setPage(1);}}
          options={ALL_PRIORITIES.map(p=>({ value:p, label:PRIORITY_CFG[p]?.label||p }))} placeholder="All Priority" />
        <SelectFilter value={filterCategory} onChange={v=>{setFilterCategory(v);setPage(1);}}
          options={ALL_CATEGORIES.map(c=>({ value:c, label:CATEGORY_LABELS[c]||c }))} placeholder="All Category" />
        <button onClick={() => { setSearch(""); setFilterStatus(""); setFilterPriority(""); setFilterCategory(""); setTimeout(()=>fetchTickets(1),0); }}
          style={{ padding:"7px 12px", background:T06, border:`1px solid ${T12}`, borderRadius:10, color:T38, fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:6 }}>
          <RefreshCw size={13}/> Reset
        </button>
      </div>

      {/* Main 2-col layout */}
      <div style={{ display:"grid", gridTemplateColumns:"360px 1fr", gap:14, flex:1, minHeight:0 }}>

        {/* Ticket list */}
        <div style={{ display:"flex", flexDirection:"column", background:T03, border:`1px solid ${T12}`, borderRadius:14, overflow:"hidden" }}>
          <div style={{ padding:"12px 14px 8px", borderBottom:`1px solid ${T06}`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:11, fontWeight:700, color:T38, letterSpacing:"1px", textTransform:"uppercase" }}>Tickets</span>
            <span style={{ fontSize:11, color:T38 }}>{total} total</span>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"8px 10px" }}>
            {loading
              ? <div style={{ textAlign:"center", padding:40, color:T38, fontSize:13 }}>Loading…</div>
              : tickets.length === 0
                ? <div style={{ textAlign:"center", padding:40, color:T38 }}>
                    <div style={{ fontSize:28, marginBottom:8 }}>🎫</div>
                    No tickets found
                  </div>
                : tickets.map(t => (
                    <TicketRow key={t.id} ticket={t} selected={selected} onClick={() => setSelected(t)} />
                  ))
            }
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding:"10px 14px", borderTop:`1px solid ${T06}`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <button onClick={() => fetchTickets(page-1)} disabled={page===1}
                style={{ padding:"4px 12px", background:T06, border:`1px solid ${T12}`, borderRadius:6, color: page===1?T38:T88, fontSize:12, cursor: page===1?"default":"pointer", fontFamily:"Outfit,sans-serif" }}>
                ← Prev
              </button>
              <span style={{ fontSize:12, color:T38 }}>{page} / {totalPages}</span>
              <button onClick={() => fetchTickets(page+1)} disabled={page===totalPages}
                style={{ padding:"4px 12px", background:T06, border:`1px solid ${T12}`, borderRadius:6, color: page===totalPages?T38:T88, fontSize:12, cursor: page===totalPages?"default":"pointer", fontFamily:"Outfit,sans-serif" }}>
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div style={{ background:T03, border:`1px solid ${T12}`, borderRadius:14, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          {detailLoading
            ? <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1, color:T38, fontSize:13 }}>Loading ticket…</div>
            : detail
              ? <DetailPanel
                  ticket={detail.ticket}
                  messages={detail.messages}
                  onStatusChange={handleStatusChange}
                  onReply={handleReply}
                  updating={updating}
                />
              : <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1, color:T38 }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>💬</div>
                    <div style={{ fontSize:14 }}>Select a ticket to view details</div>
                  </div>
                </div>
          }
        </div>
      </div>
    </div>
  );
}
