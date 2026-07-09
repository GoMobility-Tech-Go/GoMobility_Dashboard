import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card, FormGroup, Toggle, AlertBox, useToast, Modal,
} from "../../components/ui/index.jsx";
import {
  Route, Plus, Loader, Edit3, Trash2, Save, TrendingUp, AlertTriangle,
} from "lucide-react";
import {
  listCorridors, createCorridor, updateCorridor, deleteCorridor,
} from "../../api/zones";

const VEHICLE_FARE_FIELDS = [
  { key: "fixed_fare_car",     label: "Car",     color: "#34D399" },
  { key: "fixed_fare_xl",      label: "XL",      color: "#A78BFA" },
  { key: "fixed_fare_premium", label: "Premium", color: "#D4AF37" },
  { key: "fixed_fare_luxury",  label: "Luxury",  color: "#EC4899" },
];

const EMPTY_CORRIDOR = {
  corridor_name:       "",
  min_km:              "",
  max_km:              "",
  fixed_fare_car:      "",
  fixed_fare_xl:       "",
  fixed_fare_premium:  "",
  fixed_fare_luxury:   "",
  is_active:           true,
};

// ── Form modal ───────────────────────────────────────────────────────────────
function CorridorFormModal({ open, onClose, onSave, initial, saving, existingCorridors }) {
  const [form, setForm] = useState(EMPTY_CORRIDOR);

  useEffect(() => {
    if (open) setForm(initial || EMPTY_CORRIDOR);
  }, [open, initial]);

  const isEdit = !!initial?.id;

  // Client validations
  const errors = useMemo(() => {
    const errs = [];
    if (!form.corridor_name || form.corridor_name.trim().length < 2) errs.push("Name required");
    const min = parseFloat(form.min_km), max = parseFloat(form.max_km);
    if (Number.isNaN(min) || min < 0) errs.push("Min km must be ≥ 0");
    if (Number.isNaN(max) || max <= 0) errs.push("Max km must be > 0");
    if (!Number.isNaN(min) && !Number.isNaN(max) && min >= max) errs.push("Min km must be < Max km");
    return errs;
  }, [form]);

  // Overlap check (advisory — backend doesn't enforce)
  const overlap = useMemo(() => {
    const min = parseFloat(form.min_km), max = parseFloat(form.max_km);
    if (Number.isNaN(min) || Number.isNaN(max)) return null;
    const others = (existingCorridors || []).filter(c => c.id !== initial?.id);
    const clash = others.find(c => {
      const cmin = parseFloat(c.min_km), cmax = parseFloat(c.max_km);
      return !(max <= cmin || min >= cmax);
    });
    return clash;
  }, [form.min_km, form.max_km, existingCorridors, initial?.id]);

  const canSave = errors.length === 0;

  const submit = () => {
    if (!canSave) return;
    const payload = {
      corridor_name: form.corridor_name.trim(),
      min_km:        parseFloat(form.min_km),
      max_km:        parseFloat(form.max_km),
      is_active:     !!form.is_active,
    };
    VEHICLE_FARE_FIELDS.forEach(({ key }) => {
      const v = form[key];
      payload[key] = (v === "" || v == null) ? null : parseFloat(v);
    });
    onSave(payload);
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Corridor" : "Add Fixed Corridor"} maxWidth={560}>
      <FormGroup label="Corridor Name *" hint="e.g. Zone B — Mid-City (15–25km)">
        <input
          className="gm-input"
          value={form.corridor_name}
          onChange={e => setForm(f => ({ ...f, corridor_name: e.target.value }))}
          placeholder="Zone A — City Centre (0–15km)"
        />
      </FormGroup>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <FormGroup label="Min km (inclusive) *">
          <input className="gm-input" type="number" step="0.1" min={0}
            value={form.min_km}
            onChange={e => setForm(f => ({ ...f, min_km: e.target.value }))}
            placeholder="0"/>
        </FormGroup>
        <FormGroup label="Max km (exclusive) *">
          <input className="gm-input" type="number" step="0.1" min={0}
            value={form.max_km}
            onChange={e => setForm(f => ({ ...f, max_km: e.target.value }))}
            placeholder="15"/>
        </FormGroup>
      </div>

      <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(212,175,55,0.7)", textTransform: "uppercase", letterSpacing: "0.9px", margin: "8px 0 10px", fontFamily: "Cinzel,serif" }}>
        Fixed Fares (₹) · leave blank to disable that tier
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {VEHICLE_FARE_FIELDS.map(({ key, label, color }) => (
          <FormGroup key={key} label={label}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color, fontSize: 12, fontWeight: 700, pointerEvents: "none" }}>₹</span>
              <input
                className="gm-input"
                style={{ paddingLeft: 24 }}
                type="number" step="0.01" min={0}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder="450"
              />
            </div>
          </FormGroup>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 10, marginBottom: 12 }}>
        <Toggle checked={form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))} label="Active"/>
      </div>

      {overlap && (
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.28)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#F59E0B", display: "flex", alignItems: "flex-start", gap: 8, fontFamily: "Outfit,sans-serif" }}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }}/>
          <span>
            <strong>Range overlaps</strong> with "{overlap.corridor_name}" ({overlap.min_km}–{overlap.max_km}km).
            Backend won't reject, but overlapping ranges will cause ambiguous pricing.
          </span>
        </div>
      )}

      {errors.length > 0 && (
        <AlertBox type="error">
          <span>{errors.join(" · ")}</span>
        </AlertBox>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn-gold" onClick={submit} disabled={saving || !canSave}>
          <Save size={13}/> {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Corridor"}
        </button>
      </div>
    </Modal>
  );
}

// ── Delete confirm ───────────────────────────────────────────────────────────
function DeleteConfirmModal({ open, corridor, onClose, onConfirm, saving }) {
  return (
    <Modal open={open} onClose={onClose} title="Delete Corridor">
      <AlertBox type="error">
        <span>Delete <strong>{corridor?.corridor_name}</strong>? This cannot be undone.</span>
      </AlertBox>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn-danger" onClick={onConfirm} disabled={saving}>
          <Trash2 size={13}/> {saving ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────
export default function CorridorsPanel({ zoneId, onChange }) {
  const toast = useToast();
  const [corridors, setCorridors] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  const [formOpen, setFormOpen]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [deleting, setDeleting]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCorridors(zoneId);
      const list = res.data?.data?.corridors || [];
      list.sort((a, b) => (parseFloat(a.min_km) || 0) - (parseFloat(b.min_km) || 0));
      setCorridors(list);
    } catch (e) {
      toast?.(e.response?.data?.message || "Failed to load corridors", "error");
    } finally { setLoading(false); }
  }, [zoneId, toast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setFormOpen(true); };

  const openEdit = (c) => {
    setEditing({
      id:                 c.id,
      corridor_name:      c.corridor_name || "",
      min_km:             c.min_km ?? "",
      max_km:             c.max_km ?? "",
      fixed_fare_car:     c.fixed_fare_car ?? "",
      fixed_fare_xl:      c.fixed_fare_xl ?? "",
      fixed_fare_premium: c.fixed_fare_premium ?? "",
      fixed_fare_luxury:  c.fixed_fare_luxury ?? "",
      is_active:          c.is_active !== false,
    });
    setFormOpen(true);
  };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editing?.id) {
        await updateCorridor(zoneId, editing.id, payload);
        toast?.("Corridor updated", "success");
      } else {
        await createCorridor(zoneId, payload);
        toast?.("Corridor added", "success");
      }
      setFormOpen(false);
      setEditing(null);
      await load();
      onChange?.();
    } catch (e) {
      toast?.(e.response?.data?.message || "Save failed", "error");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteCorridor(zoneId, deleting.id);
      toast?.("Corridor deleted", "success");
      setDeleting(null);
      await load();
      onChange?.();
    } catch (e) {
      toast?.(e.response?.data?.message || "Delete failed", "error");
    } finally { setSaving(false); }
  };

  // Detect overlaps in current list
  const overlaps = useMemo(() => {
    const clashing = new Set();
    for (let i = 0; i < corridors.length; i++) {
      for (let j = i + 1; j < corridors.length; j++) {
        const a = corridors[i], b = corridors[j];
        const amin = parseFloat(a.min_km), amax = parseFloat(a.max_km);
        const bmin = parseFloat(b.min_km), bmax = parseFloat(b.max_km);
        if (!(amax <= bmin || amin >= bmax)) {
          clashing.add(a.id); clashing.add(b.id);
        }
      }
    }
    return clashing;
  }, [corridors]);

  if (loading) {
    return (
      <Card>
        <div style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
          <Loader size={20} style={{ animation: "gmSpin 1s linear infinite" }}/>
          <div style={{ marginTop: 10, fontSize: 12 }}>Loading corridors…</div>
        </div>
      </Card>
    );
  }

  const fmtFare = (v) => v == null || v === "" ? "—" : `₹${Math.round(parseFloat(v)).toLocaleString("en-IN")}`;

  return (
    <Card>
      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid rgba(212,175,55,0.1)",
        background: "rgba(0,0,0,0.15)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8,
          fontFamily: "Cinzel,serif", fontSize: 12.5, fontWeight: 700, color: "#D4AF37" }}>
          <Route size={13}/> Fixed Corridors
          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", fontFamily: "Outfit,sans-serif", fontWeight: 500, marginLeft: 4 }}>
            · {corridors.length} tier{corridors.length === 1 ? "" : "s"}
          </span>
        </div>
        <button className="btn-gold btn-sm" onClick={openAdd}>
          <Plus size={13}/> Add Corridor
        </button>
      </div>

      <div style={{ padding: 14 }}>
        {corridors.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
            <TrendingUp size={30} color="rgba(212,175,55,0.25)" style={{ marginBottom: 10 }}/>
            <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 13, marginBottom: 4 }}>No corridors defined</div>
            <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 11.5, color: "rgba(255,255,255,0.28)", marginBottom: 14 }}>
              Distance-based flat pricing (e.g. 0–15km ₹450, 15–25km ₹650)
            </div>
            <button className="btn-outline btn-sm" onClick={openAdd}>
              <Plus size={13}/> Add First Corridor
            </button>
          </div>
        ) : (
          <>
            {overlaps.size > 0 && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.28)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#F59E0B", display: "flex", alignItems: "flex-start", gap: 8, fontFamily: "Outfit,sans-serif" }}>
                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }}/>
                <span><strong>{overlaps.size} corridors have overlapping ranges.</strong> Fix these to avoid ambiguous pricing.</span>
              </div>
            )}
            {corridors.map(c => {
              const isOverlap = overlaps.has(c.id);
              return (
                <div key={c.id} style={{
                  padding: "12px 14px",
                  background: isOverlap ? "rgba(245,158,11,0.05)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isOverlap ? "rgba(245,158,11,0.3)" : "rgba(212,175,55,0.1)"}`,
                  borderRadius: 10, marginBottom: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 9px", borderRadius: 100,
                        background: "rgba(212,175,55,0.1)",
                        border: "1px solid rgba(212,175,55,0.3)",
                        fontSize: 10.5, fontWeight: 700, color: "#D4AF37",
                        fontFamily: "monospace", flexShrink: 0,
                      }}>
                        {c.min_km}–{c.max_km} km
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)", fontFamily: "Outfit,sans-serif" }}>
                        {c.corridor_name}
                      </span>
                      {!c.is_active && (
                        <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 100, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>OFF</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button className="btn-outline btn-xs" onClick={() => openEdit(c)}>
                        <Edit3 size={11}/>
                      </button>
                      <button className="btn-danger btn-xs" onClick={() => setDeleting(c)}>
                        <Trash2 size={11}/>
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {VEHICLE_FARE_FIELDS.map(({ key, label, color }) => (
                      <div key={key} style={{
                        padding: "6px 8px",
                        background: "rgba(0,0,0,0.2)",
                        border: `1px solid ${color}22`,
                        borderRadius: 6,
                      }}>
                        <div style={{ fontSize: 9.5, color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", fontFamily: "Cinzel,serif", marginBottom: 2 }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: c[key] == null ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.85)", fontFamily: "Outfit,sans-serif" }}>
                          {fmtFare(c[key])}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <CorridorFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing}
        saving={saving}
        existingCorridors={corridors}
      />
      <DeleteConfirmModal
        open={!!deleting}
        corridor={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        saving={saving}
      />
    </Card>
  );
}
