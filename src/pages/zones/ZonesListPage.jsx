import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ToastProvider, useToast, PageWrapper, GlobalStyles, Card,
  TableCard, FilterBar, SearchBox, MiniStatRow, AlertBox,
} from "../../components/ui/index.jsx";
import {
  Hexagon, Plus, RefreshCw, Loader, ChevronRight, PieChart,
  MapPin, CheckCircle2, PauseCircle, FileEdit, Layers, Map as MapIcon,
} from "lucide-react";
import { listZones, ZONE_TYPES, ZONE_CATEGORIES, LIFECYCLE_STATES } from "../../api/zones";
import { getCities } from "../../api/admin";

// ── Lifecycle badge (custom — theek se all 6 states support) ─────────────────
function LifecycleBadge({ state }) {
  const meta = LIFECYCLE_STATES.find(s => s.value === state) || { label: state, color: "#6B7280" };
  const c = meta.color;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 100, fontSize: 10.5, fontWeight: 600,
      fontFamily: "Outfit,sans-serif", whiteSpace: "nowrap",
      background: `${c}18`, border: `1px solid ${c}55`, color: c,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, flexShrink: 0 }}/>
      {meta.label}
    </span>
  );
}

function ActiveDot({ active }) {
  return (
    <span title={active ? "Master switch ON" : "Master switch OFF"}
      style={{
        display: "inline-block", width: 9, height: 9, borderRadius: "50%",
        background: active ? "#34D399" : "rgba(255,255,255,0.2)",
        boxShadow: active ? "0 0 8px rgba(52,211,153,0.55)" : "none",
      }}
    />
  );
}

function ZonesListContent() {
  const nav = useNavigate();
  const toast = useToast();

  const [zones, setZones]         = useState([]);
  const [cities, setCities]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  // Filters
  const [search, setSearch]         = useState("");
  const [zoneType, setZoneType]     = useState("");
  const [category, setCategory]     = useState("");
  const [cityId, setCityId]         = useState("");
  const [state, setState]           = useState("");
  const [activeOnly, setActiveOnly] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (search)                params.search           = search;
      if (zoneType)              params.zone_type        = zoneType;
      if (category)              params.zone_category    = category;
      if (cityId)                params.city_id          = cityId;
      if (state)                 params.lifecycle_state  = state;
      if (activeOnly !== "")     params.is_active        = activeOnly;
      const res = await listZones(params);
      const d = res.data?.data || {};
      setZones(d.zones || []);
    } catch (e) {
      const msg = e.response?.data?.message || e.message || "Failed to load zones";
      setError(msg);
      toast?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [search, zoneType, category, cityId, state, activeOnly, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getCities()
      .then(res => {
        const d = res.data?.data || res.data || {};
        setCities(d.cities || (Array.isArray(d) ? d : []));
      })
      .catch(() => setCities([]));
  }, []);

  // ── KPIs from loaded data ──────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total     = zones.length;
    const active    = zones.filter(z => z.lifecycle_state === "active").length;
    const draft     = zones.filter(z => ["draft", "polygon_drawn", "configured"].includes(z.lifecycle_state)).length;
    const deprecated = zones.filter(z => z.lifecycle_state === "deprecated").length;
    return [
      { label: "Total Zones",  value: total.toString(),      icon: "🗺️", color: "rgba(255,255,255,0.88)" },
      { label: "Live",         value: active.toString(),     icon: "🟢", color: "#34D399" },
      { label: "In Setup",     value: draft.toString(),      icon: "📝", color: "#60A5FA" },
      { label: "Deprecated",   value: deprecated.toString(), icon: "⏸",  color: "#F59E0B" },
    ];
  }, [zones]);

  return (
    <PageWrapper
      title="Special Zones"
      subtitle="Airports · Railway stations · Malls · Hospitals · Custom polygonal zones"
      actions={
        <>
          <button className="btn-outline" onClick={() => nav("/zones/map")}>
            <MapIcon size={14}/> Map View
          </button>
          <button className="btn-outline" onClick={() => nav("/zones/analytics")}>
            <PieChart size={14}/> Analytics
          </button>
          <button className="btn-outline" onClick={load}>
            <RefreshCw size={13}/> Refresh
          </button>
          <button className="btn-gold" onClick={() => nav("/zones/new")}>
            <Plus size={14}/> Add New Zone
          </button>
        </>
      }
    >
      <MiniStatRow items={kpis}/>

      {error && <AlertBox type="error">⚠ {error}</AlertBox>}

      <TableCard
        title="All Zones"
        icon={<Hexagon size={15} color="#D4AF37"/>}
        actions={
          <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", fontFamily: "Outfit,sans-serif" }}>
            {loading ? "Loading…" : `${zones.length} result${zones.length === 1 ? "" : "s"}`}
          </span>
        }
        footer={null}
      >
        <FilterBar>
          <SearchBox
            placeholder="Search zone code or name…"
            value={search}
            onChange={setSearch}
          />
          <select className="gm-input" style={{ maxWidth: 160 }} value={zoneType} onChange={e => setZoneType(e.target.value)}>
            <option value="">All Types</option>
            {ZONE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className="gm-input" style={{ maxWidth: 160 }} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {ZONE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select className="gm-input" style={{ maxWidth: 160 }} value={cityId} onChange={e => setCityId(e.target.value)}>
            <option value="">All Cities</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="gm-input" style={{ maxWidth: 170 }} value={state} onChange={e => setState(e.target.value)}>
            <option value="">All States</option>
            {LIFECYCLE_STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="gm-input" style={{ maxWidth: 130 }} value={activeOnly} onChange={e => setActiveOnly(e.target.value)}>
            <option value="">All</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
        </FilterBar>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
            <Loader size={18} style={{ animation: "gmSpin 1s linear infinite", marginRight: 8, verticalAlign: "middle" }}/>
            Loading zones…
            <style>{`@keyframes gmSpin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : zones.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
            <Hexagon size={40} color="rgba(212,175,55,0.25)" style={{ marginBottom: 12 }}/>
            <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 14, marginBottom: 4 }}>No zones found</div>
            <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>
              Try adjusting filters or create a new zone
            </div>
            <button className="btn-gold" onClick={() => nav("/zones/new")}>
              <Plus size={14}/> Create First Zone
            </button>
          </div>
        ) : (
          <table className="gm-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Category</th>
                <th>City</th>
                <th>State</th>
                <th style={{ textAlign: "center" }}>Active</th>
                <th style={{ textAlign: "center" }}>Polygon</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {zones.map(z => (
                <tr key={z.id} style={{ cursor: "pointer" }} onClick={() => nav(`/zones/${z.id}`)}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#D4AF37" }}>
                    {z.zone_code}
                  </td>
                  <td>{z.name}</td>
                  <td>
                    <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", textTransform: "capitalize" }}>
                      {z.zone_type === "custom" && z.extra_meta?.custom_type_label
                        ? z.extra_meta.custom_type_label
                        : (z.zone_type || "").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", textTransform: "capitalize" }}>
                      {z.zone_category}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <MapPin size={11} color="rgba(212,175,55,0.6)"/> {z.city_name || `#${z.city_id}`}
                    </span>
                  </td>
                  <td><LifecycleBadge state={z.lifecycle_state}/></td>
                  <td style={{ textAlign: "center" }}><ActiveDot active={z.is_active}/></td>
                  <td style={{ textAlign: "center" }}>
                    {z.has_boundary
                      ? <span title="Polygon drawn" style={{ color: "#34D399" }}>◆</span>
                      : <span title="No polygon" style={{ color: "rgba(255,255,255,0.2)" }}>◇</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn-outline btn-xs"
                      onClick={(e) => { e.stopPropagation(); nav(`/zones/${z.id}`); }}
                    >
                      Open <ChevronRight size={11}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>

      <GlobalStyles/>
    </PageWrapper>
  );
}

export default function ZonesListPage() {
  return (
    <ToastProvider>
      <ZonesListContent/>
    </ToastProvider>
  );
}
