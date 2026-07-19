import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, UserCheck, UserX, UserPlus, X,
  ChevronLeft, ChevronRight, Phone, Mail, Clock,
  Shield, RefreshCw, Calendar, Activity, Eye, EyeOff,
  Filter as FilterIcon, MapPin,
} from 'lucide-react';
import { getUsers, getUserById, updateUserStatus, getPassengerStats } from '../../api/admin';
import {
  FilterHead, FilterChip, buildFilterParams, isFilterActive, OP_LABELS, formatChipValue,
} from '../../components/filters/index.jsx';

/* Passenger column meta */
const P_FIELDS = [
  { key:'name',         label:'Name',       type:'text' },
  { key:'phone',        label:'Phone',      type:'text' },
  { key:'email',        label:'Email',      type:'text' },
  { key:'go_id',        label:'GO ID',      type:'text' },
  { key:'is_test_user', label:'Test User',  type:'bool' },
  { key:'wallet',       label:'Wallet',     type:'number', minValue:0 },
  { key:'last_login',   label:'Last Login', type:'date' },
];

// ─── Period helpers ───────────────────────────────────────────────────────────
const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year' },
  { key: 'custom',label: 'Custom' },
  { key: 'all',   label: 'All Time' },
];

function getPeriodDates(period) {
  const now = new Date();
  // Start of day in local time → converted to ISO
  const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
  const eod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();

  switch (period) {
    case 'today':
      return { from: sod(now), to: eod(now) };

    case 'week': {
      const start = new Date(now);
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
      return { from: sod(start), to: eod(now) };
    }

    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: sod(start), to: eod(now) };
    }

    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { from: sod(start), to: eod(now) };
    }

    default:
      return { from: null, to: null };
  }
}

// ─── Style tokens ─────────────────────────────────────────────────────────────
const GOLD    = '#D4AF37';
const GOLD20  = 'rgba(212,175,55,0.20)';
const GOLD10  = 'rgba(212,175,55,0.10)';
const TEXT_DIM = 'rgba(255,255,255,0.40)';
const TEXT_MED = 'rgba(255,255,255,0.62)';
const TEXT_BRI = 'rgba(255,255,255,0.88)';
const CARD_BG  = 'rgba(255,255,255,0.04)';
const CARD_BOR = '1px solid rgba(212,175,55,0.12)';
const FONT_UI  = 'Outfit, sans-serif';
const FONT_SER = 'Cinzel, serif';

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, loading, sub }) {
  return (
    <div style={{
      background: CARD_BG,
      border: `1px solid ${color}22`,
      borderRadius: 14,
      padding: '18px 22px',
      display: 'flex', alignItems: 'center', gap: 16,
      flex: 1, minWidth: 170,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${color},transparent)` }} />
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 10.5, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: TEXT_BRI, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
          {loading ? <span style={{ opacity: 0.25 }}>—</span> : value.toLocaleString('en-IN')}
        </div>
        {sub && <div style={{ fontSize: 10.5, color: TEXT_DIM, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ active }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
      color: active ? '#4ade80' : '#f87171',
      border: `1px solid ${active ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: active ? '#4ade80' : '#f87171' }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ─── Passenger detail panel ───────────────────────────────────────────────────
function PassengerDetailPanel({ passenger, detail, loading, onClose, onToggleStatus }) {
  if (!passenger) return null;
  const user = detail || passenger;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(1,9,23,0.80)', backdropFilter: 'blur(6px)' }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 'min(500px,100%)',
        background: 'linear-gradient(170deg,#020c20,#030f28)',
        borderLeft: `1px solid ${GOLD20}`,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {(user.full_name || 'P').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT_BRI, fontFamily: FONT_SER }}>{user.full_name || '—'}</div>
            <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 2 }}>GO ID: {user.go_id || '—'}</div>
          </div>
          <StatusBadge active={user.is_active} />
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: TEXT_MED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: TEXT_DIM, fontSize: 13 }}>Loading passenger details…</div>
          ) : (
            <>
              <DpSection title="Contact Information">
                <DpRow icon={Phone}  label="Phone"        value={user.phone_number || '—'} />
                <DpRow icon={Mail}   label="Email"        value={user.email || '—'} />
                <DpRow icon={Shield} label="Test Account" value={user.is_test_user ? 'Yes' : 'No'} />
              </DpSection>
              <DpSection title="Account Details">
                <DpRow icon={Calendar} label="Joined"     value={user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
                <DpRow icon={Clock}    label="Last Login" value={user.last_login  ? new Date(user.last_login).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'} />
                <DpRow icon={Activity} label="Role"       value="Passenger" />
              </DpSection>
              {user.device_info && Object.keys(user.device_info).length > 0 && (
                <DpSection title="Device Info">
                  {user.device_info.platform    && <DpRow icon={Activity} label="Platform"    value={user.device_info.platform} />}
                  {user.device_info.app_version && <DpRow icon={Activity} label="App Version" value={user.device_info.app_version} />}
                </DpSection>
              )}
              {(user.signup_city_name || user.signup_latitude != null) && (
                <DpSection title="Signup Location">
                  {user.signup_city_name  && <DpRow icon={MapPin}   label="City"        value={user.signup_city_name} />}
                  {user.signup_latitude != null && (
                    <DpRow icon={MapPin} label="Coordinates"
                      value={`${parseFloat(user.signup_latitude).toFixed(5)}, ${parseFloat(user.signup_longitude).toFixed(5)}`} />
                  )}
                </DpSection>
              )}
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(212,175,55,0.1)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 10 }}>Quick Actions</div>
                <button onClick={() => onToggleStatus(user.id, !user.is_active)} style={{
                  padding: '10px 20px', borderRadius: 10,
                  border: `1px solid ${user.is_active ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                  background: user.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                  color: user.is_active ? '#f87171' : '#4ade80',
                  cursor: 'pointer', fontFamily: FONT_UI, fontWeight: 600, fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Shield size={14} />{user.is_active ? 'Block Passenger' : 'Unblock Passenger'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DpSection({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function DpRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 5 }}>
      <Icon size={13} color={TEXT_DIM} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 11.5, color: TEXT_DIM, minWidth: 92 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: TEXT_BRI, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────
function Chip({ label, onRemove }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 10px', borderRadius: 20, background: GOLD10, border: `1px solid ${GOLD20}`, fontSize: 11, color: GOLD, fontWeight: 600 }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: GOLD, display: 'flex', alignItems: 'center', padding: 0, opacity: 0.7 }}>
        <X size={10} />
      </button>
    </span>
  );
}

// ─── Shared style helpers ─────────────────────────────────────────────────────
const DATE_INPUT = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, color: TEXT_BRI, fontSize: 12, padding: '6px 10px',
  fontFamily: FONT_UI, outline: 'none', colorScheme: 'dark',
};
const SEL_STYLE = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 9, color: TEXT_MED, fontSize: 12.5, padding: '7px 12px',
  fontFamily: FONT_UI, outline: 'none', cursor: 'pointer',
};
const pagBtn = (disabled) => ({
  width: 32, height: 32, borderRadius: 8,
  border: `1px solid rgba(255,255,255,${disabled ? '0.05' : '0.1'})`,
  background: disabled ? 'transparent' : 'rgba(255,255,255,0.05)',
  color: disabled ? TEXT_DIM : TEXT_BRI,
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  opacity: disabled ? 0.4 : 1,
});

// ─── Main component ───────────────────────────────────────────────────────────
const LIMIT = 10;

export default function PassengerOnboardingPage() {

  // ── Period state (controls BOTH cards AND table) ──────────────────────
  const [period, setPeriod]       = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

  // Computed date range for the selected period
  const periodDates = useMemo(() => {
    if (period === 'all') return { from: null, to: null };
    if (period === 'custom') {
      return {
        from: customFrom ? new Date(customFrom + 'T00:00:00').toISOString() : null,
        to:   customTo   ? new Date(customTo   + 'T23:59:59').toISOString() : null,
      };
    }
    return getPeriodDates(period);
  }, [period, customFrom, customTo]);

  const periodLabel = PERIODS.find(p => p.key === period)?.label ?? 'Period';

  // ── Stats — ALL 4 cards use the period filter ─────────────────────────
  const [stats, setStats]           = useState({ signups: 0, active: 0, inactive: 0, allTime: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError,   setStatsError]   = useState(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await getPassengerStats(
        periodDates.from || undefined,
        periodDates.to   || undefined,
      );
      const d = res.data?.data ?? {};
      setStats({
        signups:  d.signups_in_period  ?? 0,
        active:   d.active_in_period   ?? 0,
        inactive: d.inactive_in_period ?? 0,
        allTime:  d.total_all_time     ?? 0,
      });
    } catch (e) {
      console.error('[PassengerStats]', e);
      setStatsError(e?.response?.status === 404 ? 'Stats endpoint not found (404) — backend may need restart' : `Failed to load stats: ${e?.response?.status || 'Network error'}`);
    }
    setStatsLoading(false);
  }, [periodDates]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ── Table state ───────────────────────────────────────────────────────
  const [rows,         setRows]         = useState([]);
  const [pagination,   setPagination]   = useState(null);
  const [tableLoading, setTableLoading] = useState(true);
  const [offset,       setOffset]       = useState(0);
  const tableTotal = pagination?.total ?? 0;

  // Column filters + visibility toggles
  const [filters,           setFilters]           = useState({});
  const [includeInactive,   setIncludeInactive]   = useState(false);
  const [includeUnverified, setIncludeUnverified] = useState(false);

  const setFilter    = (key, next) => { setFilters(p => ({ ...p, [key]: next })); setOffset(0); };
  const clearFilter  = (key)       => { setFilters(p => { const n = { ...p }; delete n[key]; return n; }); setOffset(0); };
  const clearAll     = ()          => { setFilters({}); setOffset(0); };

  // Reset to page 1 when any filter changes
  useEffect(() => { setOffset(0); }, [periodDates, filters, includeInactive, includeUnverified]);

  const loadPassengers = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = { role: 'passenger', limit: LIMIT, offset, ...buildFilterParams(filters, P_FIELDS) };
      if (includeInactive)   params.include_inactive   = 'true';
      if (includeUnverified) params.include_unverified = 'true';
      // Period dates applied to table via joined range (only if user hasn't set their own joined filter)
      if (!filters.joined && periodDates.from) params.joined_from = periodDates.from;
      if (!filters.joined && periodDates.to)   params.joined_to   = periodDates.to;

      const res = await getUsers(params);
      setRows(res.data?.data?.users ?? []);
      setPagination(res.data?.data?.pagination ?? null);
    } catch (e) { console.error('[PassengerTable]', e); }
    setTableLoading(false);
  }, [offset, filters, periodDates, includeInactive, includeUnverified]);

  useEffect(() => { loadPassengers(); }, [loadPassengers]);

  const activePassengerFilters = useMemo(() => Object.entries(filters)
    .filter(([k, f]) => {
      const meta = P_FIELDS.find(m => m.key === k);
      return meta && isFilterActive(f, meta.type);
    })
    .map(([k, f]) => ({ key:k, filter:f, meta: P_FIELDS.find(m => m.key === k) })),
    [filters]);

  const fMeta = (k) => P_FIELDS.find(m => m.key === k);

  // ── Detail panel ──────────────────────────────────────────────────────
  const [selected,     setSelected]     = useState(null);
  const [detail,       setDetail]       = useState(null);
  const [detailLoading,setDetailLoading]= useState(false);

  const openDetail = async (p) => {
    setSelected(p); setDetail(null); setDetailLoading(true);
    try {
      const res = await getUserById(p.id);
      setDetail(res.data?.data ?? null);
    } catch {}
    setDetailLoading(false);
  };

  const handleToggleStatus = async (userId, isActive) => {
    try {
      await updateUserStatus(userId, isActive);
      setRows(r => r.map(u => u.id === userId ? { ...u, is_active: isActive } : u));
      if (selected?.id === userId) setSelected(s => s ? { ...s, is_active: isActive } : s);
      if (detail?.id === userId)   setDetail(d => d ? { ...d, is_active: isActive } : d);
      loadStats();
    } catch (e) { console.error(e); }
  };

  const totalPages  = pagination?.totalPages  ?? 1;
  const currentPage = pagination?.currentPage ?? 1;
  const hasMore     = pagination?.hasMore     ?? false;
  const hasPrev     = pagination?.hasPrevious ?? false;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#080d1c 0%,#0b1126 60%,#080d1c 100%)', padding: '24px 28px', fontFamily: FONT_UI }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,rgba(212,175,55,0.2),rgba(212,175,55,0.06))', border: `1px solid ${GOLD20}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={20} color={GOLD} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontFamily: FONT_SER, fontWeight: 700, color: TEXT_BRI, letterSpacing: '0.5px' }}>Passenger Onboarding</h1>
          <p style={{ margin: 0, fontSize: 12.5, color: TEXT_DIM, marginTop: 2 }}>Monitor passenger signups, activity, and engagement</p>
        </div>
      </div>

      {/* ── Period filter bar ───────────────────────────────────────────── */}
      <div style={{ background: CARD_BG, border: CARD_BOR, borderRadius: 14, padding: '13px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
          <Calendar size={13} color={GOLD} />
          <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Period Filter</span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => { setPeriod(p.key); setOffset(0); }}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontFamily: FONT_UI, cursor: 'pointer',
                border: `1px solid ${period === p.key ? GOLD20 : 'rgba(255,255,255,0.08)'}`,
                background: period === p.key ? GOLD10 : 'transparent',
                color: period === p.key ? GOLD : TEXT_MED,
                fontWeight: period === p.key ? 700 : 500,
                transition: 'all .15s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs — only when Custom selected */}
        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="date" value={customFrom}
              onChange={e => { setCustomFrom(e.target.value); setOffset(0); }}
              style={DATE_INPUT}
            />
            <span style={{ color: TEXT_DIM, fontSize: 12 }}>to</span>
            <input
              type="date" value={customTo}
              onChange={e => { setCustomTo(e.target.value); setOffset(0); }}
              style={DATE_INPUT}
            />
          </div>
        )}

        <button
          onClick={() => { loadStats(); loadPassengers(); }}
          title="Refresh"
          style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: TEXT_DIM, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* ── Stats error banner ─────────────────────────────────────────── */}
      {statsError && (
        <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700 }}>Stats Error:</span> {statsError}
          <button onClick={loadStats} style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer', fontSize: 11, fontFamily: FONT_UI }}>Retry</button>
        </div>
      )}

      {/* ── 4 Stat cards — ALL respond to period filter ─────────────────── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard
          icon={UserPlus}
          label={`Signups — ${periodLabel}`}
          value={stats.signups}
          color={GOLD}
          loading={statsLoading}
          sub="Total joined in selected period"
        />
        <StatCard
          icon={UserCheck}
          label={`Active — ${periodLabel}`}
          value={stats.active}
          color="#22c55e"
          loading={statsLoading}
          sub="Joined in period & active"
        />
        <StatCard
          icon={UserX}
          label={`Inactive — ${periodLabel}`}
          value={stats.inactive}
          color="#ef4444"
          loading={statsLoading}
          sub="Joined in period & inactive"
        />
        <StatCard
          icon={Users}
          label="Total All-Time"
          value={stats.allTime}
          color="#6366f1"
          loading={statsLoading}
          sub="All passengers ever"
        />
      </div>

      {/* ── Passenger table ─────────────────────────────────────────────── */}
      <div style={{ background: CARD_BG, border: CARD_BOR, borderRadius: 16, overflow: 'visible' }}>

        {/* Toolbar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontFamily: FONT_SER, fontSize: 14, fontWeight: 700, color: TEXT_BRI }}>
            Passengers
            <span style={{ fontFamily: FONT_UI, fontSize: 12, color: TEXT_DIM, fontWeight: 400, marginLeft: 8 }}>
              ({tableLoading ? '…' : tableTotal.toLocaleString('en-IN')})
            </span>
            {activePassengerFilters.length > 0 && (
              <span style={{ fontFamily: FONT_UI, fontSize: 11, color: GOLD, fontWeight: 600, marginLeft: 8 }}>
                · {activePassengerFilters.length} filter{activePassengerFilters.length>1?'s':''}
              </span>
            )}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <PsgToggle active={includeInactive}   onToggle={() => setIncludeInactive(v => !v)}   label="Blocked" />
            <PsgToggle active={includeUnverified} onToggle={() => setIncludeUnverified(v => !v)} label="Unverified" />
            {(activePassengerFilters.length > 0) && (
              <button onClick={clearAll} style={{
                display:'flex', alignItems:'center', gap:6, height:32, padding:'0 12px',
                background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)',
                borderRadius:8, color:'#f87171', fontSize:11.5, cursor:'pointer', fontFamily: FONT_UI, fontWeight:600,
              }}>
                <X size={12}/> Clear
              </button>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {(period !== 'all' || activePassengerFilters.length > 0) && (
          <div style={{ padding: '10px 20px', background: 'rgba(212,175,55,0.025)', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <FilterIcon size={12} color={GOLD} />
            {period !== 'all' && (
              <Chip
                label={`Period: ${periodLabel}${period === 'custom' ? ` (${customFrom || '?'} → ${customTo || '?'})` : ''}`}
                onRemove={() => { setPeriod('all'); setOffset(0); }}
              />
            )}
            {activePassengerFilters.map(({ key, filter, meta }) => (
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

        {/* Table */}
        <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT_UI }}>
            <thead>
              <tr style={{ background: 'rgba(212,175,55,0.04)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={psgTh}>
                  <FilterHead label="Name"  meta={fMeta('name')}  filter={filters.name}
                    onChange={v => setFilter('name', v)}  onClear={() => clearFilter('name')} />
                </th>
                <th style={psgTh}>
                  <FilterHead label="Phone" meta={fMeta('phone')} filter={filters.phone}
                    onChange={v => setFilter('phone', v)} onClear={() => clearFilter('phone')} />
                </th>
                <th style={psgTh}>
                  <FilterHead label="Email" meta={fMeta('email')} filter={filters.email}
                    onChange={v => setFilter('email', v)} onClear={() => clearFilter('email')} />
                </th>
                <th style={psgTh}>
                  <FilterHead label="GO ID" meta={fMeta('go_id')} filter={filters.go_id}
                    onChange={v => setFilter('go_id', v)} onClear={() => clearFilter('go_id')} />
                </th>
                <th style={psgTh}>
                  <FilterHead label="Test"  meta={fMeta('is_test_user')} filter={filters.is_test_user}
                    onChange={v => setFilter('is_test_user', v)} onClear={() => clearFilter('is_test_user')} />
                </th>
                <th style={psgTh}>Status</th>
                <th style={psgTh}>Joined</th>
                <th style={psgTh}>
                  <FilterHead label="Last Login" meta={fMeta('last_login')} filter={filters.last_login}
                    onChange={v => setFilter('last_login', v)} onClear={() => clearFilter('last_login')} align="right" />
                </th>
                <th style={psgTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableLoading
                ? Array.from({ length: LIMIT }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      {[120, 90, 160, 80, 40, 60, 80, 80, 100].map((w, j) => (
                        <td key={j} style={{ padding: '13px 16px' }}>
                          <div style={{ height: 13, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: w, animation: 'pulse 1.4s ease-in-out infinite' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.length === 0
                  ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 52, textAlign: 'center' }}>
                          <Users size={36} color="rgba(255,255,255,0.06)" style={{ display: 'block', margin: '0 auto 12px' }} />
                          <div style={{ color: TEXT_DIM, fontSize: 13 }}>No passengers found</div>
                          <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 6, opacity: 0.7 }}>
                            Try changing the period or clearing filters
                          </div>
                        </td>
                      </tr>
                    )
                  : rows.map((p, i) => (
                      <tr
                        key={p.id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', transition: 'background .1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                      >
                        {/* Name */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                              {(p.full_name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_BRI }}>{p.full_name || '—'}</div>
                              {p.go_id && <div style={{ fontSize: 10.5, color: TEXT_DIM }}>{p.go_id}</div>}
                            </div>
                          </div>
                        </td>
                        {/* Phone */}
                        <td style={{ padding: '12px 16px', fontSize: 12.5, color: TEXT_MED, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{p.phone_number || '—'}</td>
                        {/* Email */}
                        <td style={{ padding: '12px 16px', fontSize: 12, color: TEXT_MED, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email || '—'}</td>
                        {/* GO ID */}
                        <td style={{ padding: '12px 16px', fontSize: 11.5, color: TEXT_DIM, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{p.go_id || '—'}</td>
                        {/* Test User */}
                        <td style={{ padding: '12px 16px', fontSize: 12 }}>
                          {p.is_test_user
                            ? <span style={{ color:'#fbbf24', fontWeight:600 }}>Yes</span>
                            : <span style={{ color:TEXT_DIM }}>—</span>}
                        </td>
                        {/* Status */}
                        <td style={{ padding: '12px 16px' }}><StatusBadge active={p.is_active} /></td>
                        {/* Joined */}
                        <td style={{ padding: '12px 16px', fontSize: 12, color: TEXT_DIM, whiteSpace: 'nowrap' }}>
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        {/* Last Login */}
                        <td style={{ padding: '12px 16px', fontSize: 12, color: TEXT_DIM, whiteSpace: 'nowrap' }}>
                          {p.last_login ? new Date(p.last_login).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}
                        </td>
                        {/* Actions */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openDetail(p)} style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${GOLD20}`, background: GOLD10, color: GOLD, cursor: 'pointer', fontSize: 11.5, fontFamily: FONT_UI, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Eye size={11} /> View
                            </button>
                            <button
                              onClick={() => handleToggleStatus(p.id, !p.is_active)}
                              style={{
                                padding: '5px 10px', borderRadius: 7, fontSize: 11.5, fontFamily: FONT_UI, fontWeight: 600, cursor: 'pointer',
                                border: `1px solid ${p.is_active ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
                                background: p.is_active ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                                color: p.is_active ? '#f87171' : '#4ade80',
                              }}
                            >
                              {p.is_active ? 'Block' : 'Unblock'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '13px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: TEXT_DIM }}>
            {tableTotal === 0
              ? 'No records'
              : `Showing ${(pagination?.offset ?? 0) + 1}–${Math.min((pagination?.offset ?? 0) + (pagination?.limit ?? LIMIT), tableTotal)} of ${tableTotal.toLocaleString('en-IN')}`
            }
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => pagination?.prevOffset != null && setOffset(pagination.prevOffset)}
              disabled={!hasPrev} style={pagBtn(!hasPrev)}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 12, color: TEXT_MED, padding: '0 8px', fontVariantNumeric: 'tabular-nums' }}>
              {currentPage} / {totalPages}
            </span>
            <button onClick={() => pagination?.nextOffset != null && setOffset(pagination.nextOffset)}
              disabled={!hasMore} style={pagBtn(!hasMore)}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <PassengerDetailPanel
        passenger={selected}
        detail={detail}
        loading={detailLoading}
        onClose={() => setSelected(null)}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
}

/* ─── Header cell style + visibility toggle for passenger table ───────────── */
const psgTh = {
  padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  color: 'rgba(212,175,55,0.75)', textTransform: 'uppercase', letterSpacing: '0.8px',
  whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.12)',
};

function PsgToggle({ active, onToggle, label }) {
  return (
    <button onClick={onToggle} title={active ? `Hide ${label.toLowerCase()}` : `Include ${label.toLowerCase()}`} style={{
      display:'flex', alignItems:'center', gap:6, height:32, padding:'0 12px',
      background: active ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
      border:`1px solid ${active ? GOLD : 'rgba(255,255,255,0.1)'}`,
      borderRadius:8, cursor:'pointer',
      color: active ? GOLD : TEXT_MED,
      fontSize:11.5, fontFamily: FONT_UI, fontWeight:600, whiteSpace:'nowrap',
    }}>
      {active ? <Eye size={12}/> : <EyeOff size={12}/>}
      Include {label}
    </button>
  );
}
