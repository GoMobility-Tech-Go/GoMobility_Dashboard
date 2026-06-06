import { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, UserCheck, UserX, Eye, X, Wallet } from "lucide-react";
import { getUsers, updateUserStatus, getUserById } from "../../api/admin";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const fmtRupee = (n) => n != null ? "₹" + new Intl.NumberFormat("en-IN").format(n) : "—";

const Badge = ({ active }) => (
  <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600,
    background: active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
    color: active ? "#4ade80" : "#f87171",
    border: `1px solid ${active ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.25)"}` }}>
    {active ? "Active" : "Inactive"}
  </span>
);

const Skeleton = () => (
  <tr><td colSpan={7}><div style={{ height:48, background:"rgba(255,255,255,0.03)", margin:"4px 0", borderRadius:8, animation:"gmPulse 1.5s ease-in-out infinite" }} /></td></tr>
);

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background: type==="error" ? "#7f1d1d" : "#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:360 }}>
    <span style={{ flex:1 }}>{msg}</span>
    <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer", padding:0 }}><X size={14}/></button>
  </div>
);

const UserModal = ({ user, onClose }) => {
  if (!user) return null;
  const name = user.full_name || user.name || "—";
  return (
    <div style={{ position:"fixed", inset:0, zIndex:999, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"#020d26", border:"1px solid rgba(212,175,55,0.2)", borderRadius:20, padding:32, width:440, maxWidth:"90vw" }} onClick={(e)=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <h3 style={{ fontFamily:"Cinzel,serif", color:"#fff", fontSize:16, margin:0 }}>User Details</h3>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={14}/></button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[
            ["ID",      user.id || "—"],
            ["Name",    name],
            ["Phone",   user.phone_number || "—"],
            ["Email",   user.email || "—"],
            ["Wallet",  fmtRupee(user.wallet_balance)],
            ["Status",  user.is_active ? "Active" : "Inactive"],
            ["Joined",  fmtDateTime(user.created_at)],
          ].map(([l,v]) => (
            <div key={l} style={{ display:"flex", gap:12 }}>
              <span style={{ width:80, fontSize:12, color:"rgba(255,255,255,0.4)", flexShrink:0 }}>{l}</span>
              <span style={{ fontSize:13, color:"rgba(255,255,255,0.85)", fontWeight:500 }}>{String(v)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function UsersPage() {
  const [users, setUsers]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState("");
  const [offset, setOffset]     = useState(0);
  const [toast, setToast]       = useState(null);
  const [modal, setModal]       = useState(null);
  const [toggling, setToggling] = useState({});
  const LIMIT = 20;

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: LIMIT, offset };
    if (search) params.search = search;
    if (status) params.status = status;
    getUsers(params)
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setUsers(d.users || d.items || d.data || []);
        setTotal(d.pagination?.total || d.total || 0);
      })
      .catch(() => showToast("Failed to load users.", "error"))
      .finally(() => setLoading(false));
  }, [search, status, offset]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => { setSearch(e.target.value); setOffset(0); };
  const handleStatus = (e) => { setStatus(e.target.value); setOffset(0); };

  const toggleStatus = async (user) => {
    if (!window.confirm(`${user.is_active ? "Deactivate" : "Activate"} ${user.full_name || "this user"}?`)) return;
    setToggling((p) => ({ ...p, [user.id]: true }));
    try {
      await updateUserStatus(user.id, !user.is_active);
      showToast(`User ${!user.is_active ? "activated" : "deactivated"} successfully.`);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update user.", "error");
    } finally {
      setToggling((p) => ({ ...p, [user.id]: false }));
    }
  };

  const openModal = async (userId) => {
    try {
      const res = await getUserById(userId);
      setModal(res.data?.data || res.data || {});
    } catch {
      showToast("Failed to load user details.", "error");
    }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const TH = ({ children }) => (
    <th style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", borderBottom:"1px solid rgba(212,175,55,0.1)", whiteSpace:"nowrap" }}>{children}</th>
  );
  const TD = ({ children, style }) => (
    <td style={{ padding:"14px 16px", fontSize:13, color:"rgba(255,255,255,0.8)", borderBottom:"1px solid rgba(255,255,255,0.04)", ...style }}>{children}</td>
  );

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <UserModal user={modal} onClose={() => setModal(null)} />

      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Users</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Total: {total} users</p>
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <Search size={14} color="rgba(255,255,255,0.3)" style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }} />
          <input value={search} onChange={handleSearch} placeholder="Search name or phone…" style={{ width:"100%", height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, paddingLeft:36, paddingRight:12, color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", boxSizing:"border-box" }} />
        </div>
        <select value={status} onChange={handleStatus} style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px", color:"rgba(255,255,255,0.8)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", cursor:"pointer" }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>
              <TH>Name</TH><TH>Phone</TH><TH>Wallet</TH>
              <TH>Status</TH><TH>Joined</TH><TH>Actions</TH>
            </tr></thead>
            <tbody>
              {loading
                ? Array(6).fill(0).map((_,i) => <Skeleton key={i} />)
                : users.length === 0
                  ? <tr><td colSpan={6} style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>No users found</td></tr>
                  : users.map((u) => (
                    <tr key={u.id} style={{ transition:"background .15s" }} onMouseEnter={(e)=>e.currentTarget.style.background="rgba(212,175,55,0.03)"} onMouseLeave={(e)=>e.currentTarget.style.background=""}>
                      <TD><div style={{ fontWeight:600, color:"#fff" }}>{u.full_name || u.name || "—"}</div></TD>
                      <TD>{u.phone_number || "—"}</TD>
                      <TD>
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <Wallet size={12} color="#D4AF37" />
                          <span style={{ color:"#D4AF37", fontWeight:600 }}>{fmtRupee(u.wallet_balance)}</span>
                        </div>
                      </TD>
                      <TD><Badge active={u.is_active} /></TD>
                      <TD style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{fmtDate(u.created_at)}</TD>
                      <TD>
                        <div style={{ display:"flex", gap:8 }}>
                          <button onClick={() => openModal(u.id)} title="View Details" style={{ width:32, height:32, borderRadius:8, border:"1px solid rgba(212,175,55,0.2)", background:"transparent", cursor:"pointer", color:"#D4AF37", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Eye size={14} />
                          </button>
                          <button onClick={() => toggleStatus(u)} disabled={toggling[u.id]} title={u.is_active ? "Deactivate" : "Activate"} style={{ width:32, height:32, borderRadius:8, border:"none", background: u.is_active ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)", cursor:"pointer", color: u.is_active ? "#f87171" : "#4ade80", display:"flex", alignItems:"center", justifyContent:"center", opacity:toggling[u.id]?0.5:1 }}>
                            {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                        </div>
                      </TD>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {total > LIMIT && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderTop:"1px solid rgba(212,175,55,0.08)" }}>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>Page {currentPage} of {totalPages} · {total} total</span>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setOffset(Math.max(0, offset - LIMIT))} disabled={offset===0} style={{ width:32, height:32, borderRadius:8, border:"1px solid rgba(212,175,55,0.2)", background:"transparent", cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center", opacity:offset===0?0.3:1 }}>
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setOffset(offset + LIMIT)} disabled={offset + LIMIT >= total} style={{ width:32, height:32, borderRadius:8, border:"1px solid rgba(212,175,55,0.2)", background:"transparent", cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center", opacity:offset+LIMIT>=total?0.3:1 }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
