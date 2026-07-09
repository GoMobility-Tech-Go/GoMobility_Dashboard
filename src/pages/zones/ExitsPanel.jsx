import { useState, useEffect, useCallback } from "react";
import {
  Card, FormGroup, Toggle, AlertBox, useToast, Modal,
} from "../../components/ui/index.jsx";
import {
  DoorOpen, Plus, Loader, Edit3, Trash2, MapPin, ArrowUpDown,
  Plane, Save, PlaneTakeoff, PlaneLanding,
} from "lucide-react";
import {
  listExits, createExit, updateExit, deleteExit,
} from "../../api/zones";

// ── Empty exit ───────────────────────────────────────────────────────────────
const EMPTY_EXIT = {
  exit_name:    "",
  lat:          "",
  lng:          "",
  is_arrivals:  true,
  sort_order:   10,
  is_active:    true,
};

// ── Exit form modal (add + edit) ─────────────────────────────────────────────
function ExitFormModal({ open, onClose, onSave, initial, saving }) {
  const [form, setForm] = useState(EMPTY_EXIT);

  useEffect(() => {
    if (open) setForm(initial || EMPTY_EXIT);
  }, [open, initial]);

  const isEdit = !!initial?.id;

  const canSave = form.exit_name.trim().length >= 2
    && !Number.isNaN(parseFloat(form.lat))
    && !Number.isNaN(parseFloat(form.lng));

  const submit = () => {
    const la = parseFloat(form.lat), ln = parseFloat(form.lng);
    if (la < -90 || la > 90 || ln < -180 || ln > 180) return;
    onSave({
      exit_name:   form.exit_name.trim(),
      exit_coords_geojson: { type: "Point", coordinates: [ln, la] },
      is_arrivals: !!form.is_arrivals,
      sort_order:  parseInt(form.sort_order, 10) || 10,
      is_active:   !!form.is_active,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Exit Gate" : "Add Exit Gate"}>
      <FormGroup label="Exit Name *" hint="e.g. Gate 4 — Arrivals">
        <input
          className="gm-input"
          value={form.exit_name}
          onChange={e => setForm(f => ({ ...f, exit_name: e.target.value }))}
          placeholder="Gate 4 — Arrivals"
        />
      </FormGroup>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <FormGroup label="Latitude *">
          <input className="gm-input" type="number" step="0.000001"
            value={form.lat}
            onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
            placeholder="28.5568"/>
        </FormGroup>
        <FormGroup label="Longitude *">
          <input className="gm-input" type="number" step="0.000001"
            value={form.lng}
            onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
            placeholder="77.0922"/>
        </FormGroup>
      </div>
      <FormGroup label="Side">
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, is_arrivals: true }))}
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 10,
              border: `1px solid ${form.is_arrivals ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.1)"}`,
              background: form.is_arrivals ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.02)",
              color: form.is_arrivals ? "#34D399" : "rgba(255,255,255,0.5)",
              fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              fontFamily: "Outfit,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <PlaneLanding size={14}/> Arrivals
          </button>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, is_arrivals: false }))}
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 10,
              border: `1px solid ${!form.is_arrivals ? "rgba(96,165,250,0.5)" : "rgba(255,255,255,0.1)"}`,
              background: !form.is_arrivals ? "rgba(96,165,250,0.1)" : "rgba(255,255,255,0.02)",
              color: !form.is_arrivals ? "#60A5FA" : "rgba(255,255,255,0.5)",
              fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              fontFamily: "Outfit,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <PlaneTakeoff size={14}/> Departures
          </button>
        </div>
      </FormGroup>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <FormGroup label="Sort Order" hint="Lower = shown first">
          <input className="gm-input" type="number" min={0}
            value={form.sort_order}
            onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}/>
        </FormGroup>
        <FormGroup label="Active">
          <div style={{ padding: "9px 0" }}>
            <Toggle checked={form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))}/>
          </div>
        </FormGroup>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn-gold" onClick={submit} disabled={saving || !canSave}>
          <Save size={13}/> {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Exit"}
        </button>
      </div>
    </Modal>
  );
}

// ── Delete confirm modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({ open, exit, onClose, onConfirm, saving }) {
  return (
    <Modal open={open} onClose={onClose} title="Delete Exit Gate">
      <AlertBox type="error">
        <span>Delete <strong>{exit?.exit_name}</strong>? This cannot be undone.</span>
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
export default function ExitsPanel({ zoneId, onChange }) {
  const toast = useToast();
  const [exits, setExits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listExits(zoneId);
      setExits(res.data?.data?.exits || []);
    } catch (e) {
      toast?.(e.response?.data?.message || "Failed to load exits", "error");
    } finally { setLoading(false); }
  }, [zoneId, toast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (ex) => {
    const coords = ex.exit_coords_geojson?.coordinates || [null, null];
    setEditing({
      id:          ex.id,
      exit_name:   ex.exit_name || "",
      lat:         coords[1] ?? "",
      lng:         coords[0] ?? "",
      is_arrivals: !!ex.is_arrivals,
      sort_order:  ex.sort_order ?? 10,
      is_active:   ex.is_active !== false,
    });
    setFormOpen(true);
  };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editing?.id) {
        await updateExit(zoneId, editing.id, payload);
        toast?.("Exit updated", "success");
      } else {
        await createExit(zoneId, payload);
        toast?.("Exit added", "success");
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
      await deleteExit(zoneId, deleting.id);
      toast?.("Exit deleted", "success");
      setDeleting(null);
      await load();
      onChange?.();
    } catch (e) {
      toast?.(e.response?.data?.message || "Delete failed", "error");
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <Card>
        <div style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
          <Loader size={20} style={{ animation: "gmSpin 1s linear infinite" }}/>
          <div style={{ marginTop: 10, fontSize: 12 }}>Loading exits…</div>
        </div>
      </Card>
    );
  }

  const arrivals   = exits.filter(e => e.is_arrivals);
  const departures = exits.filter(e => !e.is_arrivals);

  const renderExitCard = (ex) => {
    const coords = ex.exit_coords_geojson?.coordinates;
    const lat = coords?.[1], lng = coords?.[0];
    return (
      <div key={ex.id} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "11px 14px", background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(212,175,55,0.1)", borderRadius: 10,
        gap: 10, marginBottom: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: ex.is_arrivals ? "rgba(52,211,153,0.12)" : "rgba(96,165,250,0.12)",
            border: `1px solid ${ex.is_arrivals ? "rgba(52,211,153,0.3)" : "rgba(96,165,250,0.3)"}`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {ex.is_arrivals
              ? <PlaneLanding size={14} color="#34D399"/>
              : <PlaneTakeoff size={14} color="#60A5FA"/>
            }
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", fontFamily: "Outfit,sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
              {ex.exit_name}
              {!ex.is_active && (
                <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 100, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>OFF</span>
              )}
            </div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", marginTop: 2 }}>
              <MapPin size={9} style={{ verticalAlign: "middle", marginRight: 3 }}/>
              {lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "—"}
              <span style={{ marginLeft: 8, color: "rgba(212,175,55,0.5)" }}>
                <ArrowUpDown size={9} style={{ verticalAlign: "middle", marginRight: 2 }}/>
                {ex.sort_order}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <button className="btn-outline btn-xs" onClick={() => openEdit(ex)}>
            <Edit3 size={11}/>
          </button>
          <button className="btn-danger btn-xs" onClick={() => setDeleting(ex)}>
            <Trash2 size={11}/>
          </button>
        </div>
      </div>
    );
  };

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
          <DoorOpen size={13}/> Exit Gates
          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", fontFamily: "Outfit,sans-serif", fontWeight: 500, marginLeft: 4 }}>
            · {exits.length} total ({arrivals.length} arrivals, {departures.length} departures)
          </span>
        </div>
        <button className="btn-gold btn-sm" onClick={openAdd}>
          <Plus size={13}/> Add Exit
        </button>
      </div>

      <div style={{ padding: 14 }}>
        {exits.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
            <Plane size={30} color="rgba(212,175,55,0.25)" style={{ marginBottom: 10 }}/>
            <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 13, marginBottom: 4 }}>No exit gates yet</div>
            <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 11.5, color: "rgba(255,255,255,0.28)", marginBottom: 14 }}>
              Airport zones typically have 2–4 arrival gates
            </div>
            <button className="btn-outline btn-sm" onClick={openAdd}>
              <Plus size={13}/> Add First Exit
            </button>
          </div>
        ) : (
          <>
            {arrivals.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#34D399", textTransform: "uppercase", letterSpacing: "0.9px", margin: "4px 0 8px 4px", fontFamily: "Cinzel,serif" }}>
                  ↓ Arrivals ({arrivals.length})
                </div>
                {arrivals.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(renderExitCard)}
              </>
            )}
            {departures.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#60A5FA", textTransform: "uppercase", letterSpacing: "0.9px", margin: "14px 0 8px 4px", fontFamily: "Cinzel,serif" }}>
                  ↑ Departures ({departures.length})
                </div>
                {departures.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(renderExitCard)}
              </>
            )}
          </>
        )}
      </div>

      <ExitFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing}
        saving={saving}
      />
      <DeleteConfirmModal
        open={!!deleting}
        exit={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        saving={saving}
      />
    </Card>
  );
}
