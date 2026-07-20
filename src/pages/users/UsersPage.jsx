import { useState, useEffect, useCallback, useMemo } from "react";
import { UserCheck, UserX, Eye, X, ChevronUp, ChevronDown, ChevronsUpDown, RefreshCw, Filter as FilterIcon, EyeOff, MapPin } from "lucide-react";
import { getUsers, updateUserStatus, getUserById } from "../../api/admin";
import { Pagination } from "../../components/ui/index.jsx";
import {
  FilterHead, FilterChip, buildFilterParams, isFilterActive, OP_LABELS, formatChipValue,
} from "../../components/filters/index.jsx";

/* ─── Fmt helpers ─────────────────────────────────────────────────────────── */
const fmtDate     = (d) => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const fmtRupee    = (n) => n != null ? "₹" + new Intl.NumberFormat("en-IN").format(n) : "—";

/* ─── Field metadata (spec §4.1) ──────────────────────────────────────────── */
const FIELDS = [
  { key:"name",        label:"Name",        type:"text" },
  { key:"email",       label:"Email",       type:"text" },
  { key:"phone",       label:"Phone",       type:"text" },
  { key:"go_id",       label:"GO ID",       type:"text" },
  { key:"role",        label:"Role",        type:"enum",
    options:[
      { value:"passenger",   label:"Passenger" },
      { value:"driver",      label:"Driver" },
      { value:"admin",       label:"Admin" },
      { value:"super_admin", label:"Super Admin" },
      { value:"ops_team",    label:"Ops Team" },
    ] },
  { key:"is_test_user",label:"Test User",   type:"bool" },
  { key:"wallet",      label:"Wallet",      type:"number", minValue:0 },
  { key:"joined",      label:"Joined",      type:"date" },
  { key:"last_login",  label:"Last Login",  type:"date" },
];

const SORT_COLS = {
  name:"full_name", email:"email", phone:"phone_number",
  wallet:"wallet_balance", joined:"created_at", last_login:"last_login",
};

/* ─── Badges ──────────────────────────────────────────────────────────────── */
const Badge = ({ active }) => (
  <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600,
    background: active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
    color: active ? "#4ade80" : "#f87171",
    border:`1px solid ${active ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.25)"}` }}>
    {active ? "Active" : "Inactive"}
  </span>
);
const RoleBadge = ({ role }) => {
  const colors = {
    driver:      { bg:"rgba(59,130,246,0.15)",  fg:"#60a5fa", bd:"rgba(59,130,246,0.3)" },
    passenger:   { bg:"rgba(168,85,247,0.15)",  fg:"#c084fc", bd:"rgba(168,85,247,0.3)" },
    super_admin: { bg:"rgba(212,175,55,0.18)",  fg:"#D4AF37", bd:"rgba(212,175,55,0.35)" },
    admin:       { bg:"rgba(212,175,55,0.15)",  fg:"#D4AF37", bd:"rgba(212,175,55,0.3)" },
    ops_team:    { bg:"rgba(20,184,166,0.15)",  fg:"#5eead4", bd:"rgba(20,184,166,0.3)" },
  };
  const c = colors[role] || { bg:"rgba(255,255,255,0.08)", fg:"rgba(255,255,255,0.7)", bd:"rgba(255,255,255,0.15)" };
  return (
    <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:c.bg, color:c.fg, border:`1px solid ${c.bd}`, textTransform:"capitalize" }}>
      {role ? role.replace("_"," ") : "—"}
    </span>
  );
};

/* ─── Skeleton / Toast / Modal ────────────────────────────────────────────── */
const Skeleton = () => (
  <tr><td colSpan={10}><div style={{ height:48, background:"rgba(255,255,255,0.03)", margin:"4px 0", borderRadius:8, animation:"gmPulse 1.5s ease-in-out infinite" }} /></td></tr>
);
const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:360 }}>
    <span style={{ flex:1 }}>{msg}</span>
    <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer", padding:0 }}><X size={14}/></button>
  </div>
);
const UserModal = ({ user, onClose }) => {
  if (!user) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:999, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"#020d26", border:"1px solid rgba(212,175,55,0.2)", borderRadius:20, padding:32, width:440, maxWidth:"90vw" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <h3 style={{ fontFamily:"Cinzel,serif", color:"#fff", fontSize:16, margin:0 }}>User Details</h3>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={14}/></button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[
            ["GO ID",      user.go_id || "—"],
            ["Name",       user.full_name || user.name || "—"],
            ["Role",       user.role ? user.role.replace("_"," ") : "—"],
            ["Phone",      user.phone_number || "—"],
            ["Email",      user.email || "—"],
            ["Wallet ID",  user.wallet_id ?? "—"],
            ["Balance",    fmtRupee(user.balance ?? user.wallet_balance)],
            ["Test User",  user.is_test_user ? "Yes" : "No"],
            ["Status",     user.is_active ? "Active" : "Inactive"],
            ["Verified",   user.is_verified ? "Yes" : "No"],
            ["Last Login", fmtDateTime(user.last_login)],
            ["Joined",     fmtDateTime(user.created_at)],
            ...(user.last_login_city_name ? [["Login City", user.last_login_city_name]] : []),
          ].map(([l,v]) => (
            <div key={l} style={{ display:"flex", gap:12 }}>
              <span style={{ width:80, fontSize:12, color:"rgba(255,255,255,0.4)", flexShrink:0 }}>{l}</span>
              <span style={{ fontSize:13, color:"rgba(255,255,255,0.85)", fontWeight:500 }}>{String(v)}</span>
            </div>
          ))}
          {/* Signup Location — city name ya coordinates + map link */}
          {(user.signup_city_name || user.signup_latitude != null) && (
            <div style={{ display:"flex", gap:12 }}>
              <span style={{ width:80, fontSize:12, color:"rgba(255,255,255,0.4)", flexShrink:0 }}>Signup From</span>
              <span style={{ fontSize:13, color:"rgba(255,255,255,0.85)", fontWeight:500, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                {user.signup_city_name
                  ? <><MapPin size={12} color="#D4AF37"/> {user.signup_city_name}</>
                  : <>{parseFloat(user.signup_latitude).toFixed(5)}, {parseFloat(user.signup_longitude).toFixed(5)}</>
                }
                {user.signup_latitude != null && (
                  <a href={`https://www.google.com/maps?q=${user.signup_latitude},${user.signup_longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:11, color:"#D4AF37", textDecoration:"none", border:"1px solid rgba(212,175,55,0.3)", borderRadius:4, padding:"1px 6px" }}>
                    Map ↗
                  </a>
                )}
              </span>
            </div>
          )}
          {/* Last Login Location — city name ya coordinates + map link */}
          {(user.last_login_city_name || user.last_login_latitude != null) && (
            <div style={{ display:"flex", gap:12 }}>
              <span style={{ width:80, fontSize:12, color:"rgba(255,255,255,0.4)", flexShrink:0 }}>Login From</span>
              <span style={{ fontSize:13, color:"rgba(255,255,255,0.85)", fontWeight:500, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                {user.last_login_city_name
                  ? <><MapPin size={12} color="#D4AF37"/> {user.last_login_city_name}</>
                  : <>{parseFloat(user.last_login_latitude).toFixed(5)}, {parseFloat(user.last_login_longitude).toFixed(5)}</>
                }
                {user.last_login_latitude != null && (
                  <a href={`https://www.google.com/maps?q=${user.last_login_latitude},${user.last_login_longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:11, color:"#D4AF37", textDecoration:"none", border:"1px solid rgba(212,175,55,0.3)", borderRadius:4, padding:"1px 6px" }}>
                    Map ↗
                  </a>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function SortIcon({ col, sort }) {
  if (sort.col !== col) return <ChevronsUpDown size={11} style={{ opacity:0.3, flexShrink:0 }} />;
  return sort.dir === "asc"
    ? <ChevronUp   size={11} style={{ color:"#D4AF37", flexShrink:0 }} />
    : <ChevronDown size={11} style={{ color:"#D4AF37", flexShrink:0 }} />;
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
const LIMIT = 10;

export default function UsersPage() {
  const [users,      setUsers]      = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [offset,     setOffset]     = useState(0);
  const [toast,    setToast]    = useState(null);
  const [modal,    setModal]    = useState(null);
  const [toggling, setToggling] = useState({});
  const [sort,     setSort]     = useState({ col:null, dir:"desc" });
  const [filters,  setFilters]  = useState({});
  const [includeInactive,   setIncludeInactive]   = useState(false);
  const [includeUnverified, setIncludeUnverified] = useState(false);

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const setFilter = (key, next) => { setFilters(p => ({ ...p, [key]: next })); setOffset(0); };
  const clearFilter = (key) => { setFilters(p => { const n = { ...p }; delete n[key]; return n; }); setOffset(0); };
  const clearAll = () => { setFilters({}); setOffset(0); setSort({ col:null, dir:"desc" }); };

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: LIMIT, offset, ...buildFilterParams(filters, FIELDS) };
    if (includeInactive)   params.include_inactive   = "true";
    if (includeUnverified) params.include_unverified = "true";
    if (sort.col && SORT_COLS[sort.col]) {
      params.sort_by  = SORT_COLS[sort.col];
      params.sort_dir = sort.dir;
    }

    getUsers(params)
      .then(res => {
        const d = res.data?.data || res.data || {};
        setUsers(d.users || d.items || d.data || []);
        setPagination(d.pagination || null);
      })
      .catch(() => showToast("Failed to load users.", "error"))
      .finally(() => setLoading(false));
  }, [filters, offset, sort, includeInactive, includeUnverified]);

  useEffect(() => { load(); }, [load]);

  const toggleSort = (col) => {
    if (!SORT_COLS[col]) return;
    setSort(s => s.col === col ? (s.dir === "asc" ? { col, dir:"desc" } : { col:null, dir:"desc" }) : { col, dir:"asc" });
  };

  const toggleStatus = async (user) => {
    if (!window.confirm(`${user.is_active?"Deactivate":"Activate"} ${user.full_name||"this user"}?`)) return;
    setToggling(p => ({ ...p, [user.id]:true }));
    try {
      await updateUserStatus(user.id, !user.is_active);
      showToast(`User ${!user.is_active?"activated":"deactivated"} successfully.`);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update user.", "error");
    } finally {
      setToggling(p => ({ ...p, [user.id]:false }));
    }
  };

  const openModal = async (userId) => {
    try { const res = await getUserById(userId); setModal(res.data?.data || res.data || {}); }
    catch { showToast("Failed to load user details.", "error"); }
  };

  const total       = pagination?.total       ?? 0;
  const totalPages  = pagination?.totalPages  ?? 1;

  const activeFilters = useMemo(() => Object.entries(filters)
    .filter(([k, f]) => {
      const meta = FIELDS.find(m => m.key === k);
      return meta && isFilterActive(f, meta.type);
    })
    .map(([k, f]) => ({ key:k, filter:f, meta: FIELDS.find(m => m.key === k) })),
    [filters]);

  const thBase = { padding:"11px 12px", textAlign:"left", fontSize:11, fontWeight:700, color:"rgba(212,175,55,0.75)", letterSpacing:"1px", textTransform:"uppercase", borderBottom:"1px solid rgba(212,175,55,0.1)", whiteSpace:"nowrap", userSelect:"none", background:"rgba(0,0,0,0.15)" };
  const thSort  = (col) => ({ ...thBase, cursor:"pointer", color: sort.col===col ? "#D4AF37" : "rgba(212,175,55,0.75)" });
  const thNS    = { ...thBase, cursor:"default" };
  const TD = ({ children, style }) => (
    <td style={{ padding:"13px 12px", fontSize:13, color:"rgba(255,255,255,0.8)", borderBottom:"1px solid rgba(255,255,255,0.04)", ...style }}>{children}</td>
  );

  const fMeta = (k) => FIELDS.find(m => m.key === k);

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`
        @keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}
        input::placeholder,select option{color:rgba(255,255,255,0.3)}
        input:focus,select:focus{border-color:rgba(212,175,55,0.4)!important}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.6)}
      `}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <UserModal user={modal} onClose={() => setModal(null)} />

      {/* ─── Header ─── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18, gap:16, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Users</h1>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>
            {loading ? "Loading…" : `${total.toLocaleString("en-IN")} users`}
            {activeFilters.length > 0 && <span style={{ color:"#D4AF37" }}> · {activeFilters.length} filter{activeFilters.length>1?"s":""} active</span>}
          </p>
        </div>

        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <VisibilityToggle
            active={includeInactive}
            onToggle={() => { setIncludeInactive(v => !v); setOffset(0); }}
            label="Deactivated"
          />
          <VisibilityToggle
            active={includeUnverified}
            onToggle={() => { setIncludeUnverified(v => !v); setOffset(0); }}
            label="Unverified"
          />
          <button onClick={load} title="Refresh" style={iconBtn()}>
            <RefreshCw size={13} />
          </button>
          {(activeFilters.length > 0 || sort.col) && (
            <button onClick={clearAll} style={{
              display:"flex", alignItems:"center", gap:6, height:32, padding:"0 14px",
              background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)",
              borderRadius:8, color:"#f87171", fontSize:12, cursor:"pointer",
              fontFamily:"Outfit,sans-serif",
            }}>
              <X size={12}/> Clear all
            </button>
          )}
        </div>
      </div>

      {/* ─── Active filter chips ─── */}
      {activeFilters.length > 0 && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14, alignItems:"center" }}>
          <FilterIcon size={13} color="#D4AF37" style={{ marginRight:2 }} />
          {activeFilters.map(({ key, filter, meta }) => (
            <FilterChip
              key={key}
              label={meta.label}
              opLabel={OP_LABELS[filter.op] || filter.op}
              valueLabel={formatChipValue(filter, meta)}
              onRemove={() => clearFilter(key)}
            />
          ))}
        </div>
      )}

      {/* ─── Table ─── */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"visible" }}>
        <div style={{ overflowX:"auto", overflowY:"visible" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={thSort("name")}   onClick={() => toggleSort("name")}>
                  <div style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                    <FilterHead label={<span style={{ display:"inline-flex", gap:4, alignItems:"center" }}>Name <SortIcon col="name" sort={sort}/></span>}
                      meta={fMeta("name")} filter={filters.name}
                      onChange={v => setFilter("name", v)} onClear={() => clearFilter("name")} />
                  </div>
                </th>
                <th style={thNS}>
                  <FilterHead label="Role" meta={fMeta("role")} filter={filters.role}
                    onChange={v => setFilter("role", v)} onClear={() => clearFilter("role")} />
                </th>
                <th style={thSort("phone")} onClick={() => toggleSort("phone")}>
                  <FilterHead label={<span style={{ display:"inline-flex", gap:4, alignItems:"center" }}>Phone <SortIcon col="phone" sort={sort}/></span>}
                    meta={fMeta("phone")} filter={filters.phone}
                    onChange={v => setFilter("phone", v)} onClear={() => clearFilter("phone")} />
                </th>
                <th style={thSort("email")} onClick={() => toggleSort("email")}>
                  <FilterHead label={<span style={{ display:"inline-flex", gap:4, alignItems:"center" }}>Email <SortIcon col="email" sort={sort}/></span>}
                    meta={fMeta("email")} filter={filters.email}
                    onChange={v => setFilter("email", v)} onClear={() => clearFilter("email")} />
                </th>
                <th style={thNS}>
                  <FilterHead label="GO ID" meta={fMeta("go_id")} filter={filters.go_id}
                    onChange={v => setFilter("go_id", v)} onClear={() => clearFilter("go_id")} />
                </th>
                <th style={thNS}>
                  <FilterHead label="Test" meta={fMeta("is_test_user")} filter={filters.is_test_user}
                    onChange={v => setFilter("is_test_user", v)} onClear={() => clearFilter("is_test_user")} />
                </th>
                <th style={thSort("wallet")} onClick={() => toggleSort("wallet")}>
                  <FilterHead label={<span style={{ display:"inline-flex", gap:4, alignItems:"center" }}>Wallet <SortIcon col="wallet" sort={sort}/></span>}
                    meta={fMeta("wallet")} filter={filters.wallet}
                    onChange={v => setFilter("wallet", v)} onClear={() => clearFilter("wallet")} />
                </th>
                <th style={thSort("last_login")} onClick={() => toggleSort("last_login")}>
                  <FilterHead label={<span style={{ display:"inline-flex", gap:4, alignItems:"center" }}>Last Login <SortIcon col="last_login" sort={sort}/></span>}
                    meta={fMeta("last_login")} filter={filters.last_login}
                    onChange={v => setFilter("last_login", v)} onClear={() => clearFilter("last_login")} align="right" />
                </th>
                <th style={thSort("joined")} onClick={() => toggleSort("joined")}>
                  <FilterHead label={<span style={{ display:"inline-flex", gap:4, alignItems:"center" }}>Joined <SortIcon col="joined" sort={sort}/></span>}
                    meta={fMeta("joined")} filter={filters.joined}
                    onChange={v => setFilter("joined", v)} onClear={() => clearFilter("joined")} align="right" />
                </th>
                <th style={thNS}>Signup City</th>
                <th style={thNS}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading
                ? Array(6).fill(0).map((_,i) => <Skeleton key={i}/>)
                : users.length === 0
                  ? <tr><td colSpan={11} style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>
                      No users match these filters
                    </td></tr>
                  : users.map(u => (
                    <tr key={u.id} style={{ transition:"background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background="rgba(212,175,55,0.03)"}
                      onMouseLeave={e => e.currentTarget.style.background=""}>
                      <TD>
                        <div style={{ fontWeight:600, color:"#fff" }}>{u.full_name || u.name || "—"}</div>
                      </TD>
                      <TD><RoleBadge role={u.role}/></TD>
                      <TD style={{ fontFamily:"monospace", fontSize:12 }}>{u.phone_number || "—"}</TD>
                      <TD style={{ fontSize:12, color:"rgba(255,255,255,0.65)" }}>{u.email || "—"}</TD>
                      <TD style={{ fontFamily:"monospace", fontSize:11, color:"rgba(255,255,255,0.55)" }}>{u.go_id || "—"}</TD>
                      <TD style={{ fontSize:12 }}>
                        {u.is_test_user
                          ? <span style={{ color:"#fbbf24", fontWeight:600 }}>Yes</span>
                          : <span style={{ color:"rgba(255,255,255,0.35)" }}>No</span>}
                      </TD>
                      <TD style={{ fontSize:12, fontVariantNumeric:"tabular-nums" }}>{fmtRupee(u.balance ?? u.wallet_balance)}</TD>
                      <TD style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{fmtDateTime(u.last_login)}</TD>
                      <TD style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{fmtDate(u.created_at)}</TD>
                      <TD style={{ fontSize:12 }}>
                        {u.signup_city_name
                          ? <span style={{ display:"flex", alignItems:"center", gap:4 }}><MapPin size={11} color="rgba(212,175,55,0.5)"/>{u.signup_city_name}</span>
                          : u.signup_latitude != null
                            ? <a href={`https://www.google.com/maps?q=${u.signup_latitude},${u.signup_longitude}`} target="_blank" rel="noopener noreferrer" style={{ color:"rgba(212,175,55,0.6)", fontSize:11, textDecoration:"none", display:"flex", alignItems:"center", gap:3 }}><MapPin size={10}/>{parseFloat(u.signup_latitude).toFixed(3)}, {parseFloat(u.signup_longitude).toFixed(3)}</a>
                            : <span style={{ color:"rgba(255,255,255,0.25)" }}>—</span>}
                      </TD>
                      <TD>
                        <div style={{ display:"flex", gap:8 }}>
                          <button onClick={() => openModal(u.id)} title="View" style={{ width:32, height:32, borderRadius:8, border:"1px solid rgba(212,175,55,0.2)", background:"transparent", cursor:"pointer", color:"#D4AF37", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Eye size={14}/>
                          </button>
                          <button onClick={() => toggleStatus(u)} disabled={toggling[u.id]} title={u.is_active?"Deactivate":"Activate"} style={{ width:32, height:32, borderRadius:8, border:"none", background:u.is_active?"rgba(239,68,68,0.15)":"rgba(34,197,94,0.15)", cursor:"pointer", color:u.is_active?"#f87171":"#4ade80", display:"flex", alignItems:"center", justifyContent:"center", opacity:toggling[u.id]?0.5:1 }}>
                            {u.is_active ? <UserX size={14}/> : <UserCheck size={14}/>}
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
            <Pagination pagination={pagination} onOffsetChange={setOffset}/>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Small helpers ───────────────────────────────────────────────────────── */
function iconBtn() {
  return {
    width:32, height:32, borderRadius:8,
    background:"rgba(255,255,255,0.05)",
    border:"1px solid rgba(212,175,55,0.15)",
    color:"rgba(255,255,255,0.65)",
    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
  };
}

function VisibilityToggle({ active, onToggle, label }) {
  return (
    <button onClick={onToggle} title={active ? `Hide ${label.toLowerCase()}` : `Include ${label.toLowerCase()}`} style={{
      display:"flex", alignItems:"center", gap:6, height:32, padding:"0 12px",
      background: active ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
      border:`1px solid ${active ? "#D4AF37" : "rgba(255,255,255,0.1)"}`,
      borderRadius:8, cursor:"pointer",
      color: active ? "#D4AF37" : "rgba(255,255,255,0.55)",
      fontSize:11.5, fontFamily:"Outfit,sans-serif", fontWeight:600, whiteSpace:"nowrap",
    }}>
      {active ? <Eye size={12}/> : <EyeOff size={12}/>}
      {label}
    </button>
  );
}
