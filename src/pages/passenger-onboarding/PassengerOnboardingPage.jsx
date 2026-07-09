import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, UserCheck, UserX, UserPlus, Search, X,
  ChevronLeft, ChevronRight, Phone, Mail, Clock,
  Shield, RefreshCw, Calendar, Activity, Eye,
} from 'lucide-react';
import { getUsers, getUserById, updateUserStatus } from '../../api/admin';

// ─── Period helpers ───────────────────────────────────────────────────────────
const PERIODS = [
  { key: 'today',  label: 'Today' },
  { key: 'week',   label: 'This Week' },
  { key: 'month',  label: 'This Month' },
  { key: 'year',   label: 'This Year' },
  { key: 'custom', label: 'Custom' },
];

function getPeriodDates(period) {
  const now = new Date();
  const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
  switch (period) {
    case 'today':
      return { from: sod(now), to: now.toISOString() };
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return { from: sod(d), to: now.toISOString() };
    }
    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: now.toISOString() };
    case 'year':
      return { from: new Date(now.getFullYear(), 0, 1).toISOString(), to: now.toISOString() };
    default:
      return { from: null, to: null };
  }
}

// ─── Shared style tokens ─────────────────────────────────────────────────────
const GOLD = '#D4AF37';
const GOLD20 = 'rgba(212,175,55,0.20)';
const GOLD10 = 'rgba(212,175,55,0.10)';
const TEXT_DIM = 'rgba(255,255,255,0.45)';
const TEXT_MED = 'rgba(255,255,255,0.65)';
const TEXT_BRI = 'rgba(255,255,255,0.88)';
const CARD_BG  = 'rgba(255,255,255,0.04)';
const CARD_BOR = '1px solid rgba(212,175,55,0.12)';
const FONT_UI  = 'Outfit, sans-serif';
const FONT_SER = 'Cinzel, serif';

const PAGE_STYLE = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg,#080d1c 0%,#0b1126 60%,#080d1c 100%)',
  padding: '24px 28px',
  fontFamily: FONT_UI,
};

// ─── Stat card component ──────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, loading, sub }) {
  return (
    <div style={{
      background: CARD_BG,
      border: `1px solid ${color}22`,
      borderRadius: 14,
      padding: '18px 22px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flex: 1,
      minWidth: 180,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${color},transparent)` }} />
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${color}18`,
        border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: TEXT_BRI, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
          {loading ? <span style={{ opacity: 0.3 }}>—</span> : value.toLocaleString('en-IN')}
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
      background: active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
      color: active ? '#4ade80' : '#f87171',
      border: `1px solid ${active ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: active ? '#4ade80' : '#f87171' }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────
function PassengerDetailPanel({ passenger, detail, loading, onClose, onToggleStatus }) {
  if (!passenger) return null;
  const user = detail || passenger;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(1,9,23,0.80)', backdropFilter: 'blur(6px)' }}
      />

      {/* Panel */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: 'min(520px, 100%)',
        background: 'linear-gradient(170deg,#020c20,#030f28)',
        borderLeft: `1px solid ${GOLD20}`,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid rgba(212,175,55,0.1)`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {(user.full_name || 'P').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT_BRI, fontFamily: FONT_SER }}>{user.full_name || '—'}</div>
            <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 2 }}>GO ID: {user.go_id || '—'}</div>
          </div>
          <StatusBadge active={user.is_active} />
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: TEXT_MED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: TEXT_DIM, fontSize: 13 }}>Loading passenger details…</div>
          ) : (
            <>
              {/* Contact info */}
              <SectionTitle>Contact Information</SectionTitle>
              <InfoGrid>
                <InfoRow icon={Phone} label="Phone" value={user.phone_number || '—'} />
                <InfoRow icon={Mail}  label="Email" value={user.email || '—'} />
                <InfoRow icon={Shield} label="Test Account" value={user.is_test_user ? 'Yes' : 'No'} />
              </InfoGrid>

              {/* Account info */}
              <SectionTitle style={{ marginTop: 20 }}>Account Details</SectionTitle>
              <InfoGrid>
                <InfoRow icon={Calendar} label="Joined"     value={user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
                <InfoRow icon={Clock}    label="Last Login" value={user.last_login ? new Date(user.last_login).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'} />
                <InfoRow icon={Activity} label="Role"       value={user.role ? user.role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'} />
              </InfoGrid>

              {/* Device info */}
              {user.device_info && Object.keys(user.device_info).length > 0 && (
                <>
                  <SectionTitle style={{ marginTop: 20 }}>Device Info</SectionTitle>
                  <InfoGrid>
                    {user.device_info.platform && <InfoRow icon={Activity} label="Platform" value={user.device_info.platform} />}
                    {user.device_info.app_version && <InfoRow icon={Activity} label="App Version" value={user.device_info.app_version} />}
                  </InfoGrid>
                </>
              )}

              {/* Quick action */}
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid rgba(212,175,55,0.1)` }}>
                <SectionTitle>Quick Actions</SectionTitle>
                <button
                  onClick={() => onToggleStatus(user.id, !user.is_active)}
                  style={{
                    marginTop: 10,
                    padding: '10px 20px',
                    borderRadius: 10,
                    border: `1px solid ${user.is_active ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                    background: user.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                    color: user.is_active ? '#f87171' : '#4ade80',
                    cursor: 'pointer',
                    fontFamily: FONT_UI,
                    fontWeight: 600,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Shield size={14} />
                  {user.is_active ? 'Block Passenger' : 'Unblock Passenger'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children, style }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 10, ...style }}>
      {children}
    </div>
  );
}

function InfoGrid({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
      <Icon size={13} color={TEXT_DIM} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 11.5, color: TEXT_DIM, minWidth: 90 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: TEXT_BRI, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PassengerOnboardingPage() {
  // ── Period state ─────────────────────────────────────────────────────
  const [period, setPeriod] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const periodDates = useMemo(() => {
    if (period === 'custom') {
      return {
        from: customFrom ? new Date(customFrom).toISOString() : null,
        to: customTo ? new Date(customTo + 'T23:59:59').toISOString() : null,
      };
    }
    return getPeriodDates(period);
  }, [period, customFrom, customTo]);

  const periodLabel = useMemo(() => {
    const p = PERIODS.find(x => x.key === period);
    return p?.label || 'Period';
  }, [period]);

  // ── Stats ─────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({ total: 0, newInPeriod: 0, active: 0, inactive: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const dateParams = {};
      if (periodDates.from) dateParams.joined_from = periodDates.from;
      if (periodDates.to)   dateParams.joined_to   = periodDates.to;

      const [totalRes, newRes, activeRes, inactiveRes] = await Promise.all([
        getUsers({ role: 'passenger', limit: 1 }),
        getUsers({ role: 'passenger', limit: 1, ...dateParams }),
        getUsers({ role: 'passenger', status: 'active', limit: 1 }),
        getUsers({ role: 'passenger', status: 'inactive', limit: 1 }),
      ]);

      setStats({
        total:       totalRes.data?.data?.pagination?.total    ?? 0,
        newInPeriod: newRes.data?.data?.pagination?.total      ?? 0,
        active:      activeRes.data?.data?.pagination?.total   ?? 0,
        inactive:    inactiveRes.data?.data?.pagination?.total ?? 0,
      });
    } catch (e) { console.error('[PassengerStats]', e); }
    setStatsLoading(false);
  }, [periodDates]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ── Table state ──────────────────────────────────────────────────────
  const LIMIT = 20;
  const [rows, setRows] = useState([]);
  const [tableTotal, setTableTotal] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  // Table filters (independent of stat cards' period filter)
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tableFrom, setTableFrom] = useState('');
  const [tableTo, setTableTo] = useState('');

  const commitSearch = useCallback(() => {
    setSearch(searchDraft);
    setOffset(0);
  }, [searchDraft]);

  useEffect(() => { setOffset(0); }, [search, statusFilter, tableFrom, tableTo]);

  const loadPassengers = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = { role: 'passenger', limit: LIMIT, offset };
      if (search)      params.search      = search;
      if (statusFilter) params.status     = statusFilter;
      if (tableFrom)   params.joined_from = new Date(tableFrom).toISOString();
      if (tableTo)     params.joined_to   = new Date(tableTo + 'T23:59:59').toISOString();

      const res = await getUsers(params);
      setRows(res.data?.data?.users ?? []);
      setTableTotal(res.data?.data?.pagination?.total ?? 0);
    } catch (e) { console.error('[PassengerTable]', e); }
    setTableLoading(false);
  }, [offset, search, statusFilter, tableFrom, tableTo]);

  useEffect(() => { loadPassengers(); }, [loadPassengers]);

  // ── Detail panel ─────────────────────────────────────────────────────
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (p) => {
    setSelected(p);
    setDetail(null);
    setDetailLoading(true);
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
    } catch (e) { console.error(e); }
  };

  const totalPages = Math.ceil(tableTotal / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div style={PAGE_STYLE}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg,rgba(212,175,55,0.2),rgba(212,175,55,0.06))',
            border: `1px solid ${GOLD20}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={20} color={GOLD} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontFamily: FONT_SER, fontWeight: 700, color: TEXT_BRI, letterSpacing: '0.5px' }}>
              Passenger Onboarding
            </h1>
            <p style={{ margin: 0, fontSize: 12.5, color: TEXT_DIM, marginTop: 2 }}>
              Monitor passenger signups, activity, and engagement
            </p>
          </div>
        </div>
      </div>

      {/* Period filter bar */}
      <div style={{
        background: CARD_BG,
        border: CARD_BOR,
        borderRadius: 14,
        padding: '14px 18px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
          <Calendar size={14} color={GOLD} />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Stats Period
          </span>
        </div>

        {/* Quick period buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: `1px solid ${period === p.key ? GOLD20 : 'rgba(255,255,255,0.08)'}`,
                background: period === p.key ? GOLD10 : 'transparent',
                color: period === p.key ? GOLD : TEXT_MED,
                cursor: 'pointer',
                fontSize: 12.5,
                fontWeight: period === p.key ? 700 : 500,
                fontFamily: FONT_UI,
                transition: 'all .15s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              style={dateInputStyle}
            />
            <span style={{ color: TEXT_DIM, fontSize: 12 }}>to</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              style={dateInputStyle}
            />
          </div>
        )}

        {/* Refresh */}
        <button
          onClick={() => { loadStats(); loadPassengers(); }}
          title="Refresh"
          style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: TEXT_DIM, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard
          icon={Users}
          label="Total Passengers"
          value={stats.total}
          color="#6366f1"
          loading={statsLoading}
          sub="All-time registrations"
        />
        <StatCard
          icon={UserPlus}
          label={`New — ${periodLabel}`}
          value={stats.newInPeriod}
          color={GOLD}
          loading={statsLoading}
          sub="Signed up in selected period"
        />
        <StatCard
          icon={UserCheck}
          label="Active Passengers"
          value={stats.active}
          color="#22c55e"
          loading={statsLoading}
          sub="Currently enabled accounts"
        />
        <StatCard
          icon={UserX}
          label="Inactive Passengers"
          value={stats.inactive}
          color="#ef4444"
          loading={statsLoading}
          sub="Blocked or disabled accounts"
        />
      </div>

      {/* Table section */}
      <div style={{ background: CARD_BG, border: CARD_BOR, borderRadius: 16, overflow: 'hidden' }}>
        {/* Table header + filters */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          <div style={{ fontFamily: FONT_SER, fontSize: 14, fontWeight: 700, color: TEXT_BRI }}>
            All Passengers
            <span style={{ fontFamily: FONT_UI, fontSize: 12, color: TEXT_DIM, fontWeight: 400, marginLeft: 8 }}>
              ({tableTotal.toLocaleString('en-IN')})
            </span>
          </div>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, overflow: 'hidden', marginLeft: 'auto' }}>
            <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center' }}>
              <Search size={13} color={TEXT_DIM} />
            </div>
            <input
              value={searchDraft}
              onChange={e => setSearchDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && commitSearch()}
              onBlur={commitSearch}
              placeholder="Search name, phone, email…"
              style={{ background: 'transparent', border: 'none', outline: 'none', color: TEXT_BRI, fontSize: 12.5, padding: '8px 4px 8px 0', width: 220, fontFamily: FONT_UI }}
            />
            {searchDraft && (
              <button onClick={() => { setSearchDraft(''); setSearch(''); setOffset(0); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', color: TEXT_DIM }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setOffset(0); }}
            style={selectStyle}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Table date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: TEXT_DIM }}>Joined:</span>
            <input
              type="date"
              value={tableFrom}
              onChange={e => setTableFrom(e.target.value)}
              style={{ ...dateInputStyle, fontSize: 11.5 }}
            />
            <span style={{ fontSize: 11, color: TEXT_DIM }}>–</span>
            <input
              type="date"
              value={tableTo}
              onChange={e => setTableTo(e.target.value)}
              style={{ ...dateInputStyle, fontSize: 11.5 }}
            />
            {(tableFrom || tableTo) && (
              <button onClick={() => { setTableFrom(''); setTableTo(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_DIM }}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT_UI }}>
            <thead>
              <tr style={{ background: 'rgba(212,175,55,0.04)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Name', 'Phone', 'Email', 'Status', 'Joined', 'Last Login', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} style={{ padding: '13px 16px' }}>
                        <div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: j === 0 ? 120 : j === 1 ? 90 : j === 2 ? 160 : 70 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center' }}>
                    <Users size={36} color="rgba(255,255,255,0.06)" style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                    <div style={{ color: TEXT_DIM, fontSize: 13 }}>No passengers found</div>
                  </td>
                </tr>
              ) : rows.map((p, i) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    transition: 'background .12s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  {/* Name */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {(p.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_BRI }}>{p.full_name || '—'}</div>
                        {p.go_id && <div style={{ fontSize: 10.5, color: TEXT_DIM }}>{p.go_id}</div>}
                      </div>
                    </div>
                  </td>

                  {/* Phone */}
                  <td style={{ padding: '12px 16px', fontSize: 12.5, color: TEXT_MED, whiteSpace: 'nowrap' }}>
                    {p.phone_number || '—'}
                  </td>

                  {/* Email */}
                  <td style={{ padding: '12px 16px', fontSize: 12, color: TEXT_MED, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.email || '—'}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge active={p.is_active} />
                  </td>

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
                      <button
                        onClick={() => openDetail(p)}
                        title="View Details"
                        style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${GOLD20}`, background: GOLD10, color: GOLD, cursor: 'pointer', fontSize: 11.5, fontFamily: FONT_UI, display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}
                      >
                        <Eye size={11} /> View
                      </button>
                      <button
                        onClick={() => handleToggleStatus(p.id, !p.is_active)}
                        title={p.is_active ? 'Block' : 'Unblock'}
                        style={{
                          padding: '5px 10px', borderRadius: 7, fontSize: 11.5, fontFamily: FONT_UI, cursor: 'pointer', fontWeight: 600,
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {tableTotal > LIMIT && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: TEXT_DIM }}>
              Showing {offset + 1}–{Math.min(offset + LIMIT, tableTotal)} of {tableTotal.toLocaleString('en-IN')}
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => setOffset(o => Math.max(0, o - LIMIT))}
                disabled={offset === 0}
                style={pagerBtn(offset === 0)}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 12, color: TEXT_MED, padding: '0 6px' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setOffset(o => o + LIMIT)}
                disabled={offset + LIMIT >= tableTotal}
                style={pagerBtn(offset + LIMIT >= tableTotal)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
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

// ─── Shared inline style helpers ──────────────────────────────────────────────
const dateInputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: TEXT_BRI,
  fontSize: 12,
  padding: '6px 10px',
  fontFamily: FONT_UI,
  outline: 'none',
  colorScheme: 'dark',
};

const selectStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 9,
  color: TEXT_MED,
  fontSize: 12.5,
  padding: '7px 12px',
  fontFamily: FONT_UI,
  outline: 'none',
  cursor: 'pointer',
};

const pagerBtn = (disabled) => ({
  width: 32, height: 32,
  borderRadius: 8,
  border: `1px solid rgba(255,255,255,${disabled ? '0.05' : '0.1'})`,
  background: disabled ? 'transparent' : 'rgba(255,255,255,0.05)',
  color: disabled ? TEXT_DIM : TEXT_BRI,
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  opacity: disabled ? 0.4 : 1,
});
