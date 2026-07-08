import { useState, useEffect, useCallback, useMemo } from "react";
import { UserCheck, UserX, Eye, X, Wallet, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { getUsers, updateUserStatus, getUserById } from "../../api/admin";
import { Pagination } from "../../components/ui/index.jsx";

const fmtDate     = (d) => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const fmtRupee    = (n) => n != null ? "₹" + new Intl.NumberFormat("en-IN").format(n) : "—";

const ISTR = {
  width:"100%", height:26, background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(212,175,55,0.12)", borderRadius:6,
  padding:"0 8px", color:"#fff", fontSize:11, outline:"none",
  fontFamily:"Outfit,sans-serif", boxSizing:"border-box",
};
const ISEL = { ...ISTR, cursor:"pointer" };

const Badge = ({ active }) => (
  <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600,
    background: active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
    color: active ? "#4ade80" : "#f87171",
    border:`1px solid ${active ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.25)"}` }}>
    {active ? "Active" : "Inactive"}
  </span>
);

const Skeleton = () => (
  <tr><td colSpan={11}><div style={{ height:48, background:"rgba(255,255,255,0.03)", margin:"4px 0", borderRadius:8, animation:"gmPulse 1.5s ease-in-out infinite" }} /></td></tr>
);

const RoleBadge = ({ role }) => {
  const colors = {
    driver:      { bg:"rgba(59,130,246,0.15)",  fg:"#60a5fa", bd:"rgba(59,130,246,0.3)" },
    passenger:   { bg:"rgba(168,85,247,0.15)",  fg:"#c084fc", bd:"rgba(168,85,247,0.3)" },
    super_admin: { bg:"rgba(212,175,55,0.18)",  fg:"#D4AF37", bd:"rgba(212,175,55,0.35)" },
    admin:       { bg:"rgba(212,175,55,0.15)",  fg:"#D4AF37", bd:"rgba(212,175,55,0.3)" },
  };
  const c = colors[role] || { bg:"rgba(255,255,255,0.08)", fg:"rgba(255,255,255,0.7)", bd:"rgba(255,255,255,0.15)" };
  return (
    <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:c.bg, color:c.fg, border:`1px solid ${c.bd}`, textTransform:"capitalize" }}>
      {role ? role.replace("_"," ") : "—"}
    </span>
  );
};

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:360 }}>
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
            ["GO ID",      user.go_id || "—"],
            ["Name",       name],
            ["Role",       user.role ? user.role.replace("_"," ") : "—"],
            ["Phone",      user.phone_number || "—"],
            ["Email",      user.email || "—"],
            ["Wallet ID",  user.wallet_id ?? "—"],
            ["Balance",    fmtRupee(user.balance ?? user.wallet_balance)],
            ["Test User",  user.is_test_user ? "Yes" : "No"],
            ["Status",     user.is_active ? "Active" : "Inactive"],
            ["Last Login", fmtDateTime(user.last_login)],
            ["Updated",    fmtDateTime(user.last_updated)],
            ["Joined",     fmtDateTime(user.created_at)],
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

// ─── Sort icon ────────────────────────────────────────────────────────────────
function SortIcon({ col, sort }) {
  if (sort.col !== col) return <ChevronsUpDown size={11} style={{ opacity:0.3, flexShrink:0 }} />;
  return sort.dir === "asc"
    ? <ChevronUp   size={11} style={{ color:"#D4AF37", flexShrink:0 }} />
    : <ChevronDown size={11} style={{ color:"#D4AF37", flexShrink:0 }} />;
}

export default function UsersPage() {
  const [users,    setUsers]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [offset,   setOffset]   = useState(0);
  const [toast,    setToast]    = useState(null);
  const [modal,    setModal]    = useState(null);
  const [toggling, setToggling] = useState({});
  const LIMIT = 10;

  // ── Server-side filters ────────────────────────────────────────────────────
  const [search, setSearch] = useState("");   // name/phone → backend search
  const [role,   setRole]   = useState("");
  const [status, setStatus] = useState("");

  // ── Client-side filters (applied to loaded page rows) ─────────────────────
  const [fPhone,  setFPhone]  = useState("");
  const [fEmail,  setFEmail]  = useState("");
  const [fWallet, setFWallet] = useState("");
  const [fBalMin, setFBalMin] = useState("");
  const [fBalMax, setFBalMax] = useState("");
  const [fTest,   setFTest]   = useState("");  // ""|"yes"|"no"

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sort, setSort] = useState({ col: null, dir: "asc" });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: LIMIT, offset };
    if (search) params.search = search;
    if (status) params.status = status;
    if (role)   params.role   = role;
    getUsers(params)
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setUsers(d.users || d.items || d.data || []);
        setTotal(d.pagination?.total || d.total || 0);
      })
      .catch(() => showToast("Failed to load users.", "error"))
      .finally(() => setLoading(false));
  }, [search, status, role, offset]);

  useEffect(() => { load(); }, [load]);

  // ── Client-side filter + sort applied to loaded rows ──────────────────────
  const displayedUsers = useMemo(() => {
    let list = [...users];
    if (fPhone)        list = list.filter(u => (u.phone_number||"").includes(fPhone));
    if (fEmail)        list = list.filter(u => (u.email||"").toLowerCase().includes(fEmail.toLowerCase()));
    if (fWallet)       list = list.filter(u => String(u.wallet_id??""  ).includes(fWallet));
    if (fBalMin !== "") list = list.filter(u => (u.balance??0) >= Number(fBalMin));
    if (fBalMax !== "") list = list.filter(u => (u.balance??0) <= Number(fBalMax));
    if (fTest === "yes") list = list.filter(u =>  u.is_test_user);
    if (fTest === "no")  list = list.filter(u => !u.is_test_user);

    if (sort.col) {
      list.sort((a, b) => {
        const vals = {
          name:    [a.full_name||"",    b.full_name||""],
          phone:   [a.phone_number||"", b.phone_number||""],
          email:   [a.email||"",        b.email||""],
          wallet:  [a.wallet_id??0,     b.wallet_id??0],
          balance: [a.balance??0,       b.balance??0],
          login:   [a.last_login||"",   b.last_login||""],
          joined:  [a.created_at||"",   b.created_at||""],
        };
        const [av, bv] = vals[sort.col] || ["",""];
        if (av < bv) return sort.dir === "asc" ? -1 : 1;
        if (av > bv) return sort.dir === "asc" ?  1 : -1;
        return 0;
      });
    }
    return list;
  }, [users, fPhone, fEmail, fWallet, fBalMin, fBalMax, fTest, sort]);

  const toggleSort = (col) =>
    setSort(s => s.col === col
      ? { col, dir: s.dir === "asc" ? "desc" : "asc" }
      : { col, dir: "asc" });

  const clearAll = () => {
    setSearch(""); setRole(""); setStatus(""); setOffset(0);
    setFPhone(""); setFEmail(""); setFWallet("");
    setFBalMin(""); setFBalMax(""); setFTest("");
    setSort({ col: null, dir: "asc" });
  };

  const anyFilter = search||role||status||fPhone||fEmail||fWallet||fBalMin||fBalMax||fTest;

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

  const totalPages  = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  // ── Styles ────────────────────────────────────────────────────────────────
  const thBase = {
    padding:"10px 12px", textAlign:"left", fontSize:11, fontWeight:700,
    color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase",
    borderBottom:"1px solid rgba(212,175,55,0.1)", whiteSpace:"nowrap",
    cursor:"pointer", userSelect:"none", background:"rgba(0,0,0,0.15)",
  };
  const thSort = (col) => ({
    ...thBase,
    color: sort.col === col ? "#D4AF37" : "rgba(212,175,55,0.7)",
  });
  const thNoSort = { ...thBase, cursor:"default" };
  const fdCell = {
    padding:"5px 8px", borderBottom:"1px solid rgba(212,175,55,0.08)",
    background:"rgba(0,0,0,0.2)", verticalAlign:"middle",
  };
  const TD = ({ children, style }) => (
    <td style={{ padding:"13px 12px", fontSize:13, color:"rgba(255,255,255,0.8)", borderBottom:"1px solid rgba(255,255,255,0.04)", ...style }}>{children}</td>
  );

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}} input::placeholder,select option{color:rgba(255,255,255,0.3)} input:focus,select:focus{border-color:rgba(212,175,55,0.4)!important}`}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <UserModal user={modal} onClose={() => setModal(null)} />

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Users</h1>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>
            Total: {total} users
            {displayedUsers.length !== users.length && (
              <span style={{ color:"#D4AF37", marginLeft:8 }}>· {displayedUsers.length} filtered</span>
            )}
          </p>
        </div>
        {anyFilter && (
          <button onClick={clearAll} style={{ display:"flex", alignItems:"center", gap:6, height:34, padding:"0 14px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:8, color:"#f87171", fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              {/* ── Row 1: Column headers with sort ───────────────────────── */}
              <tr>
                <th style={thSort("name")} onClick={() => toggleSort("name")}>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>Name <SortIcon col="name" sort={sort} /></div>
                </th>
                <th style={thNoSort}>Role</th>
                <th style={thSort("phone")} onClick={() => toggleSort("phone")}>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>Phone <SortIcon col="phone" sort={sort} /></div>
                </th>
                <th style={thSort("email")} onClick={() => toggleSort("email")}>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>Email <SortIcon col="email" sort={sort} /></div>
                </th>
                <th style={thSort("wallet")} onClick={() => toggleSort("wallet")}>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>Wallet ID <SortIcon col="wallet" sort={sort} /></div>
                </th>
                <th style={thSort("balance")} onClick={() => toggleSort("balance")}>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>Balance <SortIcon col="balance" sort={sort} /></div>
                </th>
                <th style={thNoSort}>Test</th>
                <th style={thNoSort}>Status</th>
                <th style={thSort("login")} onClick={() => toggleSort("login")}>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>Last Login <SortIcon col="login" sort={sort} /></div>
                </th>
                <th style={thSort("joined")} onClick={() => toggleSort("joined")}>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>Joined <SortIcon col="joined" sort={sort} /></div>
                </th>
                <th style={thNoSort}>Actions</th>
              </tr>

              {/* ── Row 2: Filter row ─────────────────────────────────────── */}
              <tr>
                {/* Name → server search */}
                <td style={fdCell}>
                  <input value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }}
                    placeholder="Search name…" style={ISTR} />
                </td>
                {/* Role → server role */}
                <td style={fdCell}>
                  <select value={role} onChange={e => { setRole(e.target.value); setOffset(0); }} style={ISEL}>
                    <option value="">All</option>
                    <option value="passenger">Passenger</option>
                    <option value="driver">Driver</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                {/* Phone → client-side */}
                <td style={fdCell}>
                  <input value={fPhone} onChange={e => setFPhone(e.target.value)}
                    placeholder="Filter phone…" style={ISTR} />
                </td>
                {/* Email → client-side */}
                <td style={fdCell}>
                  <input value={fEmail} onChange={e => setFEmail(e.target.value)}
                    placeholder="Filter email…" style={ISTR} />
                </td>
                {/* Wallet ID → client-side */}
                <td style={fdCell}>
                  <input value={fWallet} onChange={e => setFWallet(e.target.value)}
                    placeholder="Wallet ID…" style={ISTR} />
                </td>
                {/* Balance min–max → client-side */}
                <td style={fdCell}>
                  <div style={{ display:"flex", gap:4 }}>
                    <input value={fBalMin} onChange={e => setFBalMin(e.target.value)}
                      placeholder="Min ₹" style={{ ...ISTR, width:"50%" }} type="number" min={0} />
                    <input value={fBalMax} onChange={e => setFBalMax(e.target.value)}
                      placeholder="Max ₹" style={{ ...ISTR, width:"50%" }} type="number" min={0} />
                  </div>
                </td>
                {/* Test → client-side */}
                <td style={fdCell}>
                  <select value={fTest} onChange={e => setFTest(e.target.value)} style={ISEL}>
                    <option value="">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </td>
                {/* Status → server status */}
                <td style={fdCell}>
                  <select value={status} onChange={e => { setStatus(e.target.value); setOffset(0); }} style={ISEL}>
                    <option value="">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </td>
                {/* Last Login — sort only, no filter */}
                <td style={{ ...fdCell, textAlign:"center" }}>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.2)" }}>sort ↑↓</span>
                </td>
                {/* Joined — sort only, no filter */}
                <td style={{ ...fdCell, textAlign:"center" }}>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.2)" }}>sort ↑↓</span>
                </td>
                {/* Actions — no filter */}
                <td style={fdCell} />
              </tr>
            </thead>

            <tbody>
              {loading
                ? Array(6).fill(0).map((_,i) => <Skeleton key={i} />)
                : displayedUsers.length === 0
                  ? <tr><td colSpan={11} style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>No users found</td></tr>
                  : displayedUsers.map((u) => (
                    <tr key={u.id} style={{ transition:"background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background="rgba(212,175,55,0.03)"}
                      onMouseLeave={e => e.currentTarget.style.background=""}>
                      <TD>
                        <div style={{ fontWeight:600, color:"#fff" }}>{u.full_name || u.name || "—"}</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2, fontFamily:"monospace" }}>{u.go_id || ""}</div>
                      </TD>
                      <TD><RoleBadge role={u.role} /></TD>
                      <TD>{u.phone_number || "—"}</TD>
                      <TD style={{ fontSize:12, color:"rgba(255,255,255,0.65)" }}>{u.email || "—"}</TD>
                      <TD style={{ fontSize:12, color:"rgba(255,255,255,0.55)" }}>{u.wallet_id ?? "—"}</TD>
                      <TD>
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <Wallet size={12} color="#D4AF37" />
                          <span style={{ color:"#D4AF37", fontWeight:600 }}>{fmtRupee(u.balance ?? u.wallet_balance)}</span>
                        </div>
                      </TD>
                      <TD style={{ fontSize:12 }}>
                        {u.is_test_user
                          ? <span style={{ color:"#fbbf24", fontWeight:600 }}>Yes</span>
                          : <span style={{ color:"rgba(255,255,255,0.35)" }}>No</span>}
                      </TD>
                      <TD><Badge active={u.is_active} /></TD>
                      <TD style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{fmtDateTime(u.last_login)}</TD>
                      <TD style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{fmtDate(u.created_at)}</TD>
                      <TD>
                        <div style={{ display:"flex", gap:8 }}>
                          <button onClick={() => openModal(u.id)} title="View Details" style={{ width:32, height:32, borderRadius:8, border:"1px solid rgba(212,175,55,0.2)", background:"transparent", cursor:"pointer", color:"#D4AF37", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Eye size={14} />
                          </button>
                          <button onClick={() => toggleStatus(u)} disabled={toggling[u.id]} title={u.is_active ? "Deactivate" : "Activate"} style={{ width:32, height:32, borderRadius:8, border:"none", background:u.is_active?"rgba(239,68,68,0.15)":"rgba(34,197,94,0.15)", cursor:"pointer", color:u.is_active?"#f87171":"#4ade80", display:"flex", alignItems:"center", justifyContent:"center", opacity:toggling[u.id]?0.5:1 }}>
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

        {totalPages > 1 && (
          <div style={{ padding:"14px 20px", borderTop:"1px solid rgba(212,175,55,0.08)" }}>
            <Pagination page={currentPage} total={total} perPage={LIMIT} onChange={(p) => setOffset((p-1)*LIMIT)} />
          </div>
        )}
      </div>
    </div>
  );
}
