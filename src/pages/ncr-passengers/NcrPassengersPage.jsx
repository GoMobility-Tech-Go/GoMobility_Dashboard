import { useState, useEffect } from 'react';
import { MapPin, Users, UserCheck, Car, RefreshCw } from 'lucide-react';
import { getNcrPassengerStats } from '../../api/admin';

const GOLD     = '#D4AF37';
const TEXT_DIM = 'rgba(255,255,255,0.40)';
const TEXT_MED = 'rgba(255,255,255,0.62)';
const TEXT_BRI = 'rgba(255,255,255,0.88)';

function StatPill({ label, value, color, bg, border, loading }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: bg, border: `1px solid ${border}`, borderRadius: 12,
      padding: '12px 20px', minWidth: 100, flex: '1 1 auto', maxWidth: 180,
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {loading ? <span style={{ opacity: 0.25 }}>—</span> : (value ?? 0).toLocaleString('en-IN')}
      </div>
      <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 5, textAlign: 'center' }}>{label}</div>
    </div>
  );
}

export default function NcrPassengersPage() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getNcrPassengerStats()
      .then(res => setStats(res.data?.data || res.data || null))
      .catch(() => setError('Could not load NCR passenger stats'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 900 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(212,175,55,0.14)', border: '1px solid rgba(212,175,55,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={16} color={GOLD} />
          </div>
          <div>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 15, fontWeight: 700, color: GOLD, letterSpacing: '0.5px' }}>Delhi NCR Passengers</div>
            <div style={{ fontSize: 11, color: TEXT_MED, marginTop: 2 }}>Delhi · Noida · Gurgaon · Ghaziabad · Faridabad · Greater Noida</div>
          </div>
        </div>
        <button onClick={load} title="Refresh" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: TEXT_DIM, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Stats panel */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.18)', borderRadius: 16, padding: '20px 20px 18px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${GOLD},transparent)` }} />

        {loading ? (
          <div style={{ height: 90, background: 'rgba(255,255,255,0.04)', borderRadius: 12, animation: 'gmPulse 1.5s ease-in-out infinite' }} />
        ) : error ? (
          <div style={{ fontSize: 12, color: '#f87171' }}>{error}</div>
        ) : stats ? (
          <>
            {/* Summary cards */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
              <StatPill label="Total NCR Passengers" value={stats.total}      color={GOLD}      bg="rgba(212,175,55,0.10)"  border="rgba(212,175,55,0.25)"  loading={loading} />
              <StatPill label="Active"               value={stats.active}     color="#22c55e"   bg="rgba(34,197,94,0.08)"   border="rgba(34,197,94,0.2)"    loading={loading} />
              <StatPill label="Total Rides (NCR)"    value={stats.totalRides} color="#60a5fa"   bg="rgba(96,165,250,0.08)"  border="rgba(96,165,250,0.2)"   loading={loading} />
            </div>

            {/* City breakdown */}
            <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>By City</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(stats.byCity || []).map(row => (
                <div key={row.city} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: TEXT_MED, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ color: TEXT_BRI, fontWeight: 600 }}>{row.city}</span>
                  <span style={{ background: 'rgba(212,175,55,0.15)', color: GOLD, borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{parseInt(row.total).toLocaleString('en-IN')}</span>
                  <span style={{ color: TEXT_DIM, fontSize: 10 }}>{parseInt(row.total_rides).toLocaleString('en-IN')} rides</span>
                </div>
              ))}
              {(!stats.byCity || stats.byCity.length === 0) && (
                <span style={{ fontSize: 12, color: TEXT_DIM }}>No completed rides recorded in NCR cities yet.</span>
              )}
            </div>

            {/* Note */}
            <div style={{ marginTop: 16, fontSize: 11, color: TEXT_DIM, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
              Counts unique passengers who completed at least one ride with pickup in an NCR city. A passenger active in multiple NCR cities is counted once in the total.
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: TEXT_DIM }}>No data available.</div>
        )}
      </div>
    </div>
  );
}
