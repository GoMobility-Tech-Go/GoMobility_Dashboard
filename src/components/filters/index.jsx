import { useState, useEffect, useRef } from "react";
import { Filter, X, CornerDownLeft, Check } from "lucide-react";

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const GOLD    = "#D4AF37";
const GOLD_D  = "rgba(212,175,55,0.7)";
const BORDER  = "rgba(212,175,55,0.18)";
const BG_DARK = "#020d26";
const TXT_HI  = "rgba(255,255,255,0.9)";
const TXT_MID = "rgba(255,255,255,0.55)";
const TXT_LOW = "rgba(255,255,255,0.35)";

/* ─── Operator vocabulary (mirrors backend spec §2.1) ─────────────────────── */
export const OPS_BY_TYPE = {
  text:   ["contains","not_contains","equals","not_equals","starts_with","ends_with","is_empty","is_not_empty"],
  enum:   ["equals","not_equals","in","not_in"],
  bool:   ["equals"],
  date:   ["eq","before","after","between"],
  number: ["eq","neq","gt","gte","lt","lte","between"],
};

export const OP_LABELS = {
  contains:"Contains", not_contains:"Doesn't contain",
  equals:"Equals", not_equals:"Not equals",
  starts_with:"Starts with", ends_with:"Ends with",
  is_empty:"Is empty", is_not_empty:"Is not empty",
  in:"Is any of", not_in:"Is none of",
  eq:"=", neq:"≠", gt:">", gte:"≥", lt:"<", lte:"≤",
  between:"Between", before:"Before", after:"After",
};

/* Which operators need NO value input */
const OPS_NO_VALUE = new Set(["is_empty","is_not_empty"]);

/* Default operator per type */
const DEFAULT_OP = { text:"contains", enum:"equals", bool:"equals", date:"between", number:"between" };

/* ─── buildFilterParams — spec §6.3 URLSearchParams assembly ──────────────── */
export function buildFilterParams(filters, fieldsMeta) {
  const params = {};
  for (const key of Object.keys(filters)) {
    const f = filters[key];
    if (!f) continue;
    const meta = fieldsMeta.find(m => m.key === key);
    if (!meta) continue;
    const { op, value } = f;

    if (meta.type === "text") {
      params[`${key}_op`] = op;
      if (OPS_NO_VALUE.has(op)) continue;
      if (value === "" || value == null) continue;
      params[key] = value;
    }
    else if (meta.type === "enum") {
      params[`${key}_op`] = op;
      if (op === "in" || op === "not_in") {
        const arr = Array.isArray(value) ? value : String(value || "").split(",").filter(Boolean);
        if (!arr.length) continue;
        params[key] = arr.join(",");
      } else {
        if (value === "" || value == null) continue;
        params[key] = value;
      }
    }
    else if (meta.type === "bool") {
      if (value === "" || value == null) continue;
      params[key] = String(value);
    }
    else if (meta.type === "date") {
      params[`${key}_op`] = op;
      if (op === "between") {
        if (Array.isArray(value)) {
          if (value[0]) params[`${key}_from`] = value[0];
          if (value[1]) params[`${key}_to`]   = value[1];
        }
      } else {
        if (value) params[`${key}_from`] = value;
      }
    }
    else if (meta.type === "number") {
      params[`${key}_op`] = op;
      if (op === "between") {
        if (Array.isArray(value)) {
          if (value[0] !== "" && value[0] != null) params[`${key}_min`] = value[0];
          if (value[1] !== "" && value[1] != null) params[`${key}_max`] = value[1];
        }
      } else if (op === "lt" || op === "lte") {
        if (value !== "" && value != null) params[`${key}_max`] = value;
      } else {
        if (value !== "" && value != null) params[`${key}_min`] = value;
      }
    }
  }
  return params;
}

/* ─── Is this filter row "actively applied" (contributes to query)? ───────── */
export function isFilterActive(filter, metaType) {
  if (!filter) return false;
  const { op, value } = filter;
  if (metaType === "text" && OPS_NO_VALUE.has(op)) return true;
  if (metaType === "date" && op === "between")   return Array.isArray(value) && (value[0] || value[1]);
  if (metaType === "number" && op === "between") return Array.isArray(value) && (value[0] !== "" && value[0] != null || value[1] !== "" && value[1] != null);
  if (metaType === "enum" && (op === "in" || op === "not_in")) {
    const arr = Array.isArray(value) ? value : String(value || "").split(",").filter(Boolean);
    return arr.length > 0;
  }
  return value !== "" && value !== null && value !== undefined;
}

/* ─── Inputs ──────────────────────────────────────────────────────────────── */
const INPUT_STYLE = {
  width:"100%", height:30, background:"rgba(255,255,255,0.06)",
  border:`1px solid ${BORDER}`, borderRadius:6, padding:"0 30px 0 10px",
  color:"#fff", fontSize:12, outline:"none", fontFamily:"Outfit,sans-serif",
  boxSizing:"border-box",
};
const SEL_STYLE = { ...INPUT_STYLE, padding:"0 10px", cursor:"pointer" };
const NUM_STYLE = { ...INPUT_STYLE, padding:"0 10px" };

/* Enter-hint pill floating in the input */
function EnterHint({ visible, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={-1}
      title="Press Enter to apply"
      style={{
        position:"absolute", right:5, top:"50%", transform:"translateY(-50%)",
        width:22, height:22, borderRadius:5,
        background: visible ? "rgba(212,175,55,0.22)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${visible ? "rgba(212,175,55,0.55)" : "rgba(255,255,255,0.08)"}`,
        color: visible ? GOLD : TXT_LOW,
        display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
        transition:"all .15s", padding:0,
      }}
    >
      <CornerDownLeft size={11} />
    </button>
  );
}

/* Text/number input with Enter-to-commit */
function EnterInput({ value, onCommit, placeholder, type = "text", min, max, autoFocus }) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => { setDraft(value ?? ""); }, [value]);
  const dirty = String(draft) !== String(value ?? "");
  const commit = () => onCommit(draft);
  return (
    <div style={{ position:"relative" }}>
      <input
        type={type}
        value={draft}
        min={min}
        max={max}
        autoFocus={autoFocus}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") commit(); }}
        placeholder={placeholder}
        style={type === "number" ? NUM_STYLE : INPUT_STYLE}
      />
      <EnterHint visible={dirty} onClick={commit} />
    </div>
  );
}

/* Multi-select for enum in/not_in */
function EnumMultiSelect({ options, value, onChange }) {
  const arr = Array.isArray(value) ? value : String(value || "").split(",").filter(Boolean);
  const toggle = (v) => {
    const next = arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
    onChange(next);
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5, maxHeight:180, overflowY:"auto",
      background:"rgba(255,255,255,0.03)", border:`1px solid ${BORDER}`, borderRadius:8, padding:8 }}>
      {options.map(opt => {
        const active = arr.includes(opt.value);
        return (
          <label key={opt.value} style={{
            display:"flex", alignItems:"center", gap:8, cursor:"pointer",
            padding:"5px 8px", borderRadius:5,
            background: active ? "rgba(212,175,55,0.12)" : "transparent",
            fontSize:12, color: active ? GOLD : TXT_HI,
          }} onClick={() => toggle(opt.value)}>
            <div style={{
              width:14, height:14, borderRadius:3,
              border:`1px solid ${active ? GOLD : "rgba(255,255,255,0.2)"}`,
              background: active ? GOLD : "transparent",
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            }}>
              {active && <Check size={10} color="#020d26" />}
            </div>
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

/* ─── The value editor(s) inside the popover, keyed by op+type ────────────── */
function ValueEditor({ meta, op, value, onCommit }) {
  if (OPS_NO_VALUE.has(op)) {
    return (
      <div style={{ padding:"10px 12px", fontSize:11.5, color:TXT_MID, background:"rgba(255,255,255,0.03)", border:`1px dashed ${BORDER}`, borderRadius:8 }}>
        No value needed for this operator.
      </div>
    );
  }

  if (meta.type === "text") {
    return <EnterInput value={value} onCommit={onCommit} placeholder={meta.placeholder || `Enter ${meta.label.toLowerCase()}…`} autoFocus />;
  }

  if (meta.type === "enum") {
    if (op === "in" || op === "not_in") {
      return <EnumMultiSelect options={meta.options || []} value={value} onChange={onCommit} />;
    }
    return (
      <select value={value ?? ""} onChange={e => onCommit(e.target.value)} style={SEL_STYLE} autoFocus>
        <option value="">— Select —</option>
        {(meta.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  if (meta.type === "bool") {
    return (
      <div style={{ display:"flex", gap:6 }}>
        {[["", "Any"], ["true", "Yes"], ["false", "No"]].map(([v, l]) => (
          <button key={v || "any"} onClick={() => onCommit(v)} style={{
            flex:1, height:30, borderRadius:6,
            border:`1px solid ${String(value) === v ? GOLD : BORDER}`,
            background: String(value) === v ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
            color: String(value) === v ? GOLD : TXT_HI,
            fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600,
          }}>{l}</button>
        ))}
      </div>
    );
  }

  if (meta.type === "date") {
    if (op === "between") {
      const v = Array.isArray(value) ? value : ["", ""];
      return (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <div style={{ position:"relative" }}>
            <input type="date" value={v[0] || ""} onChange={e => onCommit([e.target.value, v[1] || ""])}
              style={{ ...INPUT_STYLE, colorScheme:"dark", padding:"0 10px" }} />
          </div>
          <div style={{ position:"relative" }}>
            <input type="date" value={v[1] || ""} onChange={e => onCommit([v[0] || "", e.target.value])}
              style={{ ...INPUT_STYLE, colorScheme:"dark", padding:"0 10px" }} />
          </div>
        </div>
      );
    }
    return (
      <input type="date" value={value || ""} onChange={e => onCommit(e.target.value)}
        style={{ ...INPUT_STYLE, colorScheme:"dark", padding:"0 10px" }} autoFocus />
    );
  }

  if (meta.type === "number") {
    if (op === "between") {
      const v = Array.isArray(value) ? value : ["", ""];
      return (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <EnterInput value={v[0]} type="number" min={meta.minValue} max={meta.maxValue}
            placeholder={`Min${meta.minValue != null ? ` (${meta.minValue})` : ""}`}
            onCommit={x => onCommit([x, v[1]])} autoFocus />
          <EnterInput value={v[1]} type="number" min={meta.minValue} max={meta.maxValue}
            placeholder={`Max${meta.maxValue != null ? ` (${meta.maxValue})` : ""}`}
            onCommit={x => onCommit([v[0], x])} />
        </div>
      );
    }
    return (
      <EnterInput value={value} type="number" min={meta.minValue} max={meta.maxValue}
        placeholder={`Enter value…`} onCommit={onCommit} autoFocus />
    );
  }

  return null;
}

/* ─── FilterHead — funnel icon in header, opens popover ───────────────────── */
export function FilterHead({ label, meta, filter, onChange, onClear, align = "left" }) {
  const [open, setOpen] = useState(false);
  const [draftOp, setDraftOp] = useState(filter?.op || DEFAULT_OP[meta.type] || "equals");
  const [draftVal, setDraftVal] = useState(filter?.value ?? "");
  const wrapRef = useRef(null);

  useEffect(() => {
    if (open) {
      setDraftOp(filter?.op || DEFAULT_OP[meta.type] || "equals");
      setDraftVal(filter?.value ?? "");
    }
  }, [open, filter, meta.type]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const active = isFilterActive(filter, meta.type);
  const ops = OPS_BY_TYPE[meta.type] || [];

  const apply = () => {
    if (OPS_NO_VALUE.has(draftOp)) {
      onChange({ op: draftOp, value: null });
    } else {
      onChange({ op: draftOp, value: draftVal });
    }
    setOpen(false);
  };
  const clear = () => { onClear(); setOpen(false); };

  return (
    <div ref={wrapRef} style={{ display:"inline-flex", alignItems:"center", gap:6, position:"relative" }}>
      <span>{label}</span>
      <button onClick={() => setOpen(o => !o)} title={active ? "Filter applied" : "Filter"} style={{
        width:22, height:22, borderRadius:5, padding:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        background: active ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? GOLD : "rgba(255,255,255,0.08)"}`,
        color: active ? GOLD : TXT_LOW,
        cursor:"pointer", transition:"all .15s",
      }}>
        <Filter size={11} />
      </button>

      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 8px)", [align]:0, zIndex:60,
          width:260, background:BG_DARK, border:`1px solid ${BORDER}`, borderRadius:12,
          padding:14, boxShadow:"0 12px 40px rgba(0,0,0,0.55)",
          fontFamily:"Outfit,sans-serif",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontSize:10.5, fontWeight:700, color:GOLD_D, textTransform:"uppercase", letterSpacing:"1px" }}>Filter · {label}</span>
            <button onClick={() => setOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:TXT_LOW, padding:0, display:"flex" }}>
              <X size={12} />
            </button>
          </div>

          <label style={{ fontSize:10, color:TXT_LOW, textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:4, display:"block" }}>Operator</label>
          <select value={draftOp} onChange={e => setDraftOp(e.target.value)} style={{ ...SEL_STYLE, marginBottom:10 }}>
            {ops.map(op => <option key={op} value={op}>{OP_LABELS[op]}</option>)}
          </select>

          {!OPS_NO_VALUE.has(draftOp) && (
            <label style={{ fontSize:10, color:TXT_LOW, textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:4, display:"block" }}>Value</label>
          )}
          <div style={{ marginBottom:12 }}>
            <ValueEditor meta={meta} op={draftOp} value={draftVal} onCommit={setDraftVal} />
          </div>

          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {active && (
              <button onClick={clear} style={{
                height:30, padding:"0 10px", borderRadius:6,
                background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)",
                color:"#f87171", cursor:"pointer", fontSize:11.5, fontFamily:"Outfit,sans-serif", fontWeight:600,
                display:"flex", alignItems:"center", gap:5,
              }}>
                <X size={11}/> Clear
              </button>
            )}
            <button onClick={apply} style={{
              flex:1, height:30, borderRadius:6,
              background:"rgba(212,175,55,0.18)", border:`1px solid ${GOLD}`,
              color:GOLD, cursor:"pointer", fontSize:12, fontFamily:"Outfit,sans-serif", fontWeight:700,
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            }}>
              Apply <CornerDownLeft size={11} />
            </button>
          </div>

          <div style={{ marginTop:8, fontSize:10, color:TXT_LOW, textAlign:"center" }}>
            Press <span style={{
              display:"inline-flex", alignItems:"center", justifyContent:"center",
              minWidth:16, height:16, padding:"0 3px", borderRadius:3,
              background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)",
              color:TXT_MID, fontSize:9, verticalAlign:"middle",
            }}><CornerDownLeft size={9} /></span> in any input to apply
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── FilterChip — for the "active filters" row above the table ───────────── */
export function FilterChip({ label, opLabel, valueLabel, onRemove }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:6,
      padding:"4px 8px 4px 10px", borderRadius:20,
      background:"rgba(212,175,55,0.1)", border:`1px solid ${BORDER}`,
      fontSize:11, color:GOLD, fontWeight:600, fontFamily:"Outfit,sans-serif",
    }}>
      <strong style={{ fontWeight:700 }}>{label}</strong>
      <span style={{ color:TXT_MID, fontWeight:500 }}>{opLabel}</span>
      {valueLabel && <span style={{ color:"#fff", fontWeight:600 }}>{valueLabel}</span>}
      <button onClick={onRemove} style={{
        background:"none", border:"none", cursor:"pointer", color:GOLD, opacity:0.7,
        display:"flex", padding:0, marginLeft:2,
      }}>
        <X size={11}/>
      </button>
    </span>
  );
}

/* ─── formatChipValue — pretty-print a filter for chip display ────────────── */
export function formatChipValue(filter, meta) {
  if (!filter) return "";
  const { op, value } = filter;
  if (OPS_NO_VALUE.has(op)) return "";
  if (meta.type === "date" && op === "between") {
    const v = Array.isArray(value) ? value : ["", ""];
    return `${v[0] || "?"} → ${v[1] || "?"}`;
  }
  if (meta.type === "number" && op === "between") {
    const v = Array.isArray(value) ? value : ["", ""];
    return `${v[0] ?? "?"} → ${v[1] ?? "?"}`;
  }
  if (meta.type === "enum" && (op === "in" || op === "not_in")) {
    const arr = Array.isArray(value) ? value : String(value || "").split(",").filter(Boolean);
    return arr.join(", ");
  }
  if (meta.type === "bool") {
    return value === "true" ? "Yes" : value === "false" ? "No" : "";
  }
  return String(value ?? "");
}
