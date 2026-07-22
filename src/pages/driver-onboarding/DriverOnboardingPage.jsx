import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, ShieldX, UserCheck, UserX,
  X, FileCheck, FileX, AlertTriangle, Eye, EyeOff, Car, Star, MapPin, Phone,
  CheckCircle, Clock, XCircle, RefreshCw, ExternalLink, User, Wallet,
  CreditCard, Calendar, Filter as FilterIcon, UserPlus, Users, Download,
} from "lucide-react";
import { Pagination } from "../../components/ui/index.jsx";
import {
  getDrivers, verifyDriver, updateDriverStatus, getKycQueue,
  approveDocument, rejectDocument, getFraudAlerts, suspendDriver,
  getKycDocument, getDriverById, getDriverKycStatus, getDriverStats,
} from "../../api/admin";
import {
  FilterHead, FilterChip, buildFilterParams, isFilterActive, OP_LABELS, formatChipValue,
} from "../../components/filters/index.jsx";
import { exportToExcel, xlsDate } from "../../utils/exportExcel";

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
  const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
  const eod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();
  switch (period) {
    case 'today': return { from: sod(now), to: eod(now) };
    case 'week': { const s = new Date(now); s.setDate(now.getDate() - ((now.getDay() + 6) % 7)); return { from: sod(s), to: eod(now) }; }
    case 'month': return { from: sod(new Date(now.getFullYear(), now.getMonth(), 1)), to: eod(now) };
    case 'year':  return { from: sod(new Date(now.getFullYear(), 0, 1)), to: eod(now) };
    default: return { from: null, to: null };
  }
}

const GOLD    = '#D4AF37';
const GOLD20  = 'rgba(212,175,55,0.20)';
const GOLD10  = 'rgba(212,175,55,0.10)';
const TEXT_DIM = 'rgba(255,255,255,0.40)';
const TEXT_MED = 'rgba(255,255,255,0.62)';
const TEXT_BRI = 'rgba(255,255,255,0.88)';

function DrvStatCard({ icon: Icon, label, value, color, loading }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}22`,
      borderRadius: 14, padding: '18px 22px',
      display: 'flex', alignItems: 'center', gap: 16,
      flex: 1, minWidth: 170, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${color},transparent)` }} />
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 10.5, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: TEXT_BRI, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
          {loading ? <span style={{ opacity: 0.25 }}>—</span> : (value ?? 0).toLocaleString('en-IN')}
        </div>
      </div>
    </div>
  );
}

const DATE_INPUT_STYLE = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, color: TEXT_BRI, fontSize: 12, padding: '6px 10px',
  fontFamily: 'Outfit,sans-serif', outline: 'none', colorScheme: 'dark',
};

function DrvPeriodChip({ label, onRemove }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 10px', borderRadius: 20, background: GOLD10, border: `1px solid ${GOLD20}`, fontSize: 11, color: GOLD, fontWeight: 600 }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: GOLD, display: 'flex', alignItems: 'center', padding: 0, opacity: 0.7 }}>
        <X size={10} />
      </button>
    </span>
  );
}

/* ─── Driver filter meta (spec §5.1) ──────────────────────────────────────── */
const DRIVER_FIELDS = [
  { key:"name",         label:"Name",       type:"text" },
  { key:"phone",        label:"Phone",      type:"text" },
  { key:"email",        label:"Email",      type:"text" },
  { key:"go_id",        label:"GO ID",      type:"text" },
  { key:"is_available", label:"Online",     type:"bool" },
  { key:"is_on_duty",   label:"On Duty",    type:"bool" },
  { key:"is_verified",  label:"KYC",        type:"bool" },
  { key:"is_test_user", label:"Test",       type:"bool" },
  { key:"rating",       label:"Rating",     type:"number", minValue:0, maxValue:5 },
  { key:"rides",        label:"Rides",      type:"number", minValue:0 },
  { key:"earnings",     label:"Earnings",   type:"number", minValue:0 },
  { key:"joined",       label:"Joined",     type:"date" },
  { key:"last_login",   label:"Last Login", type:"date" },
];

const DRIVER_SORT_COLS = {
  name:"full_name", phone:"phone_number", email:"email",
  rating:"rating", rides:"total_rides", earnings:"total_earnings",
  joined:"created_at", last_login:"last_login",
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
  : "—";

const fmtNum = (n) => n != null ? new Intl.NumberFormat("en-IN").format(n) : "—";

// ── Small helpers ─────────────────────────────────────────────────────────────
const Badge = ({ label, color, bg, border }) => (
  <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:bg, color, border:`1px solid ${border}` }}>{label}</span>
);

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:360 }}>
  <span style={{ flex:1 }}>{msg}</span>
  <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer", padding:0 }}><X size={14}/></button>
  </div>
);

const ConfirmDialog = ({ msg, confirmLabel="Confirm", danger=true, onConfirm, onCancel }) => (
  <div style={{ position:"fixed", inset:0, zIndex:1001, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
    <div style={{ background:"#020d26", border:"1px solid rgba(212,175,55,0.2)", borderRadius:20, padding:28, width:380, maxWidth:"90vw" }} onClick={(e)=>e.stopPropagation()}>
      <div style={{ fontSize:14, color:"rgba(255,255,255,0.85)", fontFamily:"Outfit,sans-serif", marginBottom:24, lineHeight:1.7 }}>{msg}</div>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onCancel} style={{ flex:1, height:40, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, color:"rgba(255,255,255,0.6)", cursor:"pointer", fontSize:13, fontFamily:"Outfit,sans-serif" }}>Cancel</button>
        <button onClick={onConfirm} style={{ flex:1, height:40, background:danger?"rgba(239,68,68,0.2)":"rgba(34,197,94,0.15)", border:`1px solid ${danger?"rgba(239,68,68,0.4)":"rgba(34,197,94,0.35)"}`, borderRadius:10, color:danger?"#f87171":"#4ade80", cursor:"pointer", fontSize:13, fontFamily:"Outfit,sans-serif", fontWeight:600 }}>{confirmLabel}</button>
      </div>
    </div>
  </div>
);

const SuspendModal = ({ target, onConfirm, onCancel }) => {
  const [reason, setReason] = useState("Fake documents submitted");
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1002, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#020d26", border:"1px solid rgba(239,68,68,0.3)", borderRadius:20, padding:28, width:440, maxWidth:"90vw" }} onClick={(e)=>e.stopPropagation()}>
        <h3 style={{ fontFamily:"Cinzel,serif", color:"#f87171", fontSize:15, margin:"0 0 6px" }}>⚠ Suspend Driver Permanently</h3>
        <p style={{ fontSize:12.5, color:"rgba(255,255,255,0.5)", fontFamily:"Outfit,sans-serif", margin:"0 0 20px", lineHeight:1.6 }}>
          Suspending <strong style={{ color:"#fff" }}>{target.name || "this driver"}</strong>. They will not be able to login or accept any rides.
        </p>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block", fontSize:11, color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:7, fontFamily:"Cinzel,serif" }}>Reason *</label>
          <textarea value={reason} onChange={(e)=>setReason(e.target.value)} rows={3} style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"10px 14px", color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", resize:"vertical", boxSizing:"border-box" }} />
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, height:40, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, color:"rgba(255,255,255,0.6)", cursor:"pointer", fontSize:13, fontFamily:"Outfit,sans-serif" }}>Cancel</button>
          <button onClick={() => reason.trim() && onConfirm(reason.trim())} disabled={!reason.trim()} style={{ flex:1, height:40, background:"rgba(239,68,68,0.2)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:10, color:"#f87171", cursor:"pointer", fontSize:13, fontFamily:"Outfit,sans-serif", fontWeight:600, opacity:reason.trim()?1:0.5 }}>
            Suspend Permanently
          </button>
        </div>
      </div>
    </div>
  );
};

const RejectModal = ({ onConfirm, onCancel }) => {
  const [reason, setReason] = useState("");
  const [allowRetry, setAllowRetry] = useState(true);
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1003, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#020d26", border:"1px solid rgba(212,175,55,0.2)", borderRadius:20, padding:28, width:420, maxWidth:"90vw" }} onClick={(e)=>e.stopPropagation()}>
        <h3 style={{ fontFamily:"Cinzel,serif", color:"#fff", fontSize:15, margin:"0 0 20px" }}>Reject Document</h3>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block", fontSize:11, color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6, fontFamily:"Cinzel,serif" }}>Reason *</label>
          <textarea value={reason} onChange={(e)=>setReason(e.target.value)} rows={3} placeholder="e.g. Image blurry, Invalid document…" style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"10px 14px", color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", resize:"vertical", boxSizing:"border-box" }} />
        </div>
        <label style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, cursor:"pointer", fontSize:13, color:"rgba(255,255,255,0.7)" }}>
          <input type="checkbox" checked={allowRetry} onChange={(e)=>setAllowRetry(e.target.checked)} style={{ width:16, height:16, accentColor:"#D4AF37" }} />
          Allow driver to re-upload
        </label>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, height:40, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, color:"rgba(255,255,255,0.6)", cursor:"pointer", fontSize:13, fontFamily:"Outfit,sans-serif" }}>Cancel</button>
          <button onClick={() => reason.trim() && onConfirm(reason.trim(), allowRetry)} disabled={!reason.trim()} style={{ flex:1, height:40, background:"rgba(239,68,68,0.2)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:10, color:"#f87171", cursor:"pointer", fontSize:13, fontFamily:"Outfit,sans-serif", opacity:reason.trim()?1:0.5 }}>Reject</button>
        </div>
      </div>
    </div>
  );
};

// ── Doc status badge ──────────────────────────────────────────────────────────
const DocStatusBadge = ({ status }) => {
  const s = (status || "").toLowerCase();
  if (s === "approved")      return <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:"rgba(34,197,94,0.12)",  color:"#4ade80", border:"1px solid rgba(34,197,94,0.3)"  }}><CheckCircle size={10}/>Approved</span>;
  if (s === "auto_verified") return <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:"rgba(34,197,94,0.10)",  color:"#34d399", border:"1px solid rgba(34,197,94,0.28)" }}><CheckCircle size={10}/>Verified</span>;
  if (s === "rejected")      return <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:"rgba(239,68,68,0.10)", color:"#f87171", border:"1px solid rgba(239,68,68,0.25)" }}><XCircle size={10}/>Rejected</span>;
  if (s === "manual_review") return <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:"rgba(245,158,11,0.12)", color:"#f59e0b", border:"1px solid rgba(245,158,11,0.35)" }}><Eye size={10}/>Needs Review</span>;
  return                            <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:"rgba(148,163,184,0.10)", color:"#94a3b8", border:"1px solid rgba(148,163,184,0.2)" }}><Clock size={10}/>Pending</span>;
};

// ── Extracted data section ─────────────────────────────────────────────────────
const ExtractedField = ({ label, value, mono }) => {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8, padding:"6px 10px" }}>
      <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.78)", fontWeight:500, fontFamily: mono ? "monospace" : "inherit", wordBreak:"break-all" }}>{String(value)}</div>
    </div>
  );
};

const ExtractedDataSection = ({ doc }) => {
  const ext = (() => {
    try {
      const raw = doc.extracted_data;
      if (!raw) return {};
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch { return {}; }
  })();

  if (!ext || Object.keys(ext).filter(k => k !== "cashfree_ocr").length === 0) return null;

  const type = (doc.document_type || doc.type || "").toUpperCase();
  const fmtBool = v => v === true ? "✓ Yes" : v === false ? "✗ No" : null;

  let fields = [];
  if (type === "AADHAAR") {
    fields = [
      { label:"Name",             value: ext.name },
      { label:"Aadhaar (masked)", value: ext.masked,        mono: true },
      { label:"Date of Birth",    value: ext.dob },
      { label:"Gender",           value: ext.gender },
      { label:"Father / Husband", value: ext.father },
      { label:"Address",          value: ext.address },
      { label:"Govt Verified",    value: fmtBool(ext.govt_verified) },
    ];
  } else if (type === "PAN") {
    fields = [
      { label:"Name",           value: ext.name },
      { label:"PAN (masked)",   value: ext.masked,          mono: true },
      { label:"Date of Birth",  value: ext.dob },
      { label:"PAN Status",     value: ext.pan_status },
      { label:"Govt Verified",  value: fmtBool(ext.govt_verified) },
      { label:"Name Match",     value: ext.name_match },
      { label:"Aadhaar Linked", value: fmtBool(ext.aadhaar_linked) },
    ];
  } else if (type === "DRIVING_LICENCE") {
    fields = [
      { label:"Name",              value: ext.full_name },
      { label:"DL No (masked)",    value: ext.masked,        mono: true },
      { label:"Date of Birth",     value: ext.dob },
      { label:"Issue Date",        value: ext.issue_date },
      { label:"Expiry Date",       value: ext.expiry_date },
      { label:"Issuing Authority", value: ext.issuing_authority },
      { label:"DL Status",         value: ext.dl_status },
      { label:"Blood Group",       value: ext.blood_group },
      { label:"Govt Verified",     value: fmtBool(ext.govt_verified) },
    ];
  } else if (type === "VEHICLE_RC") {
    fields = [
      { label:"Registration No",   value: ext.registration_number || ext.masked, mono: true },
      { label:"Owner Name",        value: ext.owner || ext.owner_name },
      { label:"Chassis No",        value: ext.chassis_number,  mono: true },
      { label:"Engine No",         value: ext.engine_number,   mono: true },
      { label:"Reg Date",          value: ext.registration_date },
      { label:"Valid Till",        value: ext.registration_validity },
      { label:"Vehicle Model",     value: ext.vehicle_model },
      { label:"Vehicle Type",      value: ext.vehicle_type },
      { label:"VAHAN Verified",    value: fmtBool(ext.vahan_verified) },
    ];
  } else if (type === "SELFIE") {
    fields = [
      { label:"Face Match Score", value: ext.similarity != null ? `${ext.similarity}%` : null },
      { label:"Status",           value: ext.status },
    ];
  } else if (type === "BANK_ACCOUNT") {
    fields = [
      { label:"Account (masked)", value: ext.account_masked,     mono: true },
      { label:"Account Holder",   value: ext.holder_name },
      { label:"Bank Name",        value: ext.bank_name },
      { label:"IFSC",             value: ext.ifsc,               mono: true },
      { label:"Branch",           value: ext.branch },
      { label:"City",             value: ext.city },
      { label:"Account Status",   value: ext.account_status },
      { label:"Name Match",       value: ext.name_match_result },
      { label:"Match Score",      value: ext.name_match_score != null ? `${ext.name_match_score}%` : null },
    ];
  }

  const visible = fields.filter(f => f.value !== null && f.value !== undefined && f.value !== "");
  if (visible.length === 0) return null;

  return (
    <div style={{ padding:"10px 16px 14px", borderTop:"1px solid rgba(255,255,255,0.05)", background:"rgba(0,0,0,0.18)" }}>
      <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>Extracted Data</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(155px, 1fr))", gap:6 }}>
        {visible.map(f => <ExtractedField key={f.label} label={f.label} value={f.value} mono={f.mono} />)}
      </div>
    </div>
  );
};

// ── Full-screen Driver Detail Panel ──────────────────────────────────────────
const DriverDetailPanel = ({ driverId, userId, onClose, onAction, showToast }) => {
  const [profile, setProfile]   = useState(null);
  const [docs, setDocs]         = useState([]);
  const [pLoading, setPLoad]    = useState(true);
  const [dLoading, setDLoad]    = useState(true);
  const [acting, setActing]     = useState({});
  const [rejectDocId, setRejectDocId] = useState(null);
  const [imgPrev, setImgPrev]   = useState(null);

  useEffect(() => {
    setPLoad(true);
    getDriverById(driverId)
      .then((res) => setProfile(res.data?.data || res.data))
      .catch(() => {})
      .finally(() => setPLoad(false));
  }, [driverId]);

  useEffect(() => {
    if (!userId) { setDLoad(false); return; }
    setDLoad(true);
    getDriverKycStatus(userId)
      .then((res) => {
        const d = res.data?.data || res.data || {};
        const list = d.documents || d.items || (Array.isArray(d) ? d : []);
        setDocs(list);
      })
      .catch(() => setDocs([]))
      .finally(() => setDLoad(false));
  }, [userId]);

  const doAct = async (key, fn, msg) => {
    setActing(p => ({...p,[key]:true}));
    try { await fn(); showToast(msg); onAction(); }
    catch (e) { showToast(e.response?.data?.message || "Action failed.", "error"); }
    finally { setActing(p => ({...p,[key]:false})); }
  };

  const handleApproveDoc = (docId) =>
    doAct("doc"+docId, () => approveDocument(docId), "Document approved.");

  const handleRejectDoc = (docId, reason, allowRetry) => {
    setRejectDocId(null);
    doAct("doc"+docId, () => rejectDocument(docId, reason, allowRetry), "Document rejected.");
  };

  const p = profile;
  const isSuspended = p?.is_suspended || p?.suspended || p?.isSuspended;
  const isActive    = p?.is_active    || p?.isActive;
  const isVerified  = !!(p?.is_verified || p?.isVerified || p?.verified_at || p?.verifiedAt);

  const docTypeLabel = (t) => (t||"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());

  // Extract vehicle info from VEHICLE_RC KYC document (since admin API doesn't join driver_vehicle table)
  const vehicleFromKyc = (() => {
    const rcDoc = docs.find(d => d.document_type === "VEHICLE_RC");
    if (!rcDoc) return null;
    let ext = rcDoc.extracted_data || {};
    if (typeof ext === "string") { try { ext = JSON.parse(ext); } catch { ext = {}; } }
    return {
      vehicle_number: rcDoc.document_number || ext.rc_number || ext.reg_number || null,
      vehicle_type:   ext.vehicle_type || ext.vehicle_class || ext.body_type || null,
      vehicle_model:  ext.vehicle_model || ext.model || null,
      vehicle_color:  ext.vehicle_color || ext.color || null,
    };
  })();

  return (
    <>
      {rejectDocId && (
        <RejectModal
          onConfirm={(r,a) => handleRejectDoc(rejectDocId, r, a)}
          onCancel={() => setRejectDocId(null)}
        />
      )}

      {/* Image preview overlay */}
      {imgPrev && (
        <div style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setImgPrev(null)}>
          <img src={imgPrev} alt="Document" style={{ maxWidth:"88vw", maxHeight:"88vh", borderRadius:12, objectFit:"contain", boxShadow:"0 0 60px rgba(0,0,0,0.8)" }} />
          <button onClick={() => setImgPrev(null)} style={{ position:"absolute", top:20, right:24, background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, width:36, height:36, cursor:"pointer", color:"#fff", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={18}/></button>
        </div>
      )}

      {/* Backdrop */}
      <div style={{ position:"fixed", inset:0, zIndex:1010, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)" }} onClick={onClose} />

      {/* Full-screen modal */}
      <div style={{ position:"fixed", inset:"16px", zIndex:1011, background:"linear-gradient(160deg,#020c20,#030f28)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:20, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"16px 24px", borderBottom:"1px solid rgba(212,175,55,0.1)", display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(2,12,32,0.95)", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontFamily:"Cinzel,serif", fontSize:16, fontWeight:700, color:"#D4AF37" }}>Driver Profile</span>
            {p && <span style={{ fontSize:13, color:"rgba(255,255,255,0.4)" }}>— {p.full_name||p.fullName||p.name}</span>}
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, width:32, height:32, cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15}/></button>
        </div>

        {/* 2-column body */}
        <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

          {/* ── LEFT: Profile info ── */}
          <div style={{ width:"38%", minWidth:300, borderRight:"1px solid rgba(255,255,255,0.06)", overflowY:"auto", padding:20, display:"flex", flexDirection:"column", gap:16 }}>
          {pLoading ? (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {Array(6).fill(0).map((_,i) => <div key={i} style={{ height:56, background:"rgba(255,255,255,0.04)", borderRadius:12, animation:"gmPulse 1.5s ease-in-out infinite" }} />)}
            </div>
          ) : !p ? (
            <div style={{ textAlign:"center", padding:60, color:"rgba(255,255,255,0.35)", fontFamily:"Outfit,sans-serif" }}>Failed to load driver profile.</div>
          ) : (
            <>
              {/* ── Profile Header ── */}
              <div style={{ display:"flex", alignItems:"center", gap:18, marginBottom:22, padding:"18px 20px", background:"rgba(212,175,55,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:16 }}>
                <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(212,175,55,0.12)", border:"2px solid rgba(212,175,55,0.35)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
                  {(p.profile_photo_url||p.profilePicture||p.profile_picture)
                    ? <img src={p.profile_photo_url||p.profilePicture||p.profile_picture} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={(e)=>{e.target.style.display="none";}} />
                    : <User size={28} color="rgba(212,175,55,0.5)" />
                  }
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"Cinzel,serif", fontSize:18, fontWeight:700, color:"#fff" }}>{p.full_name || p.fullName || p.name || "—"}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:5, flexWrap:"wrap" }}>
                    <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, color:"rgba(255,255,255,0.5)" }}><Phone size={11}/>{p.phone_number || p.phone || "—"}</span>
                    {p.email && <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>· {p.email}</span>}
                  </div>
                  <div style={{ display:"flex", gap:7, marginTop:8, flexWrap:"wrap" }}>
                    {isSuspended
                      ? <Badge label="Suspended" color="#f59e0b" bg="rgba(245,158,11,0.1)" border="rgba(245,158,11,0.3)" />
                      : isActive
                        ? <Badge label="Active" color="#4ade80" bg="rgba(34,197,94,0.12)" border="rgba(34,197,94,0.3)" />
                        : <Badge label="Blocked" color="#f87171" bg="rgba(239,68,68,0.12)" border="rgba(239,68,68,0.3)" />
                    }
                    {isVerified
                      ? <Badge label="KYC Verified ✓" color="#D4AF37" bg="rgba(212,175,55,0.12)" border="rgba(212,175,55,0.3)" />
                      : <Badge label="KYC Pending" color="#f59e0b" bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.25)" />
                    }
                    {(p.is_available||p.isAvailable) && <Badge label="Online" color="#4ade80" bg="rgba(34,197,94,0.08)" border="rgba(34,197,94,0.2)" />}
                  </div>
                </div>
                <div style={{ textAlign:"center", flexShrink:0 }}>
                  <div style={{ fontSize:26, fontWeight:800, color:"#f59e0b" }}>{p.rating ? parseFloat(p.rating).toFixed(1) : "—"}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:3, justifyContent:"center", marginTop:2 }}><Star size={10} color="#f59e0b"/><span style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>Rating</span></div>
                </div>
              </div>

              {/* ── Stat Cards ── */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:22 }}>
                {[
                  { icon:<Car size={16} color="#60a5fa"/>, label:"Total Rides", value:fmtNum(p.total_rides ?? p.totalRides ?? p.ride_count) },
                  { icon:<Wallet size={16} color="#4ade80"/>, label:"Total Earnings", value:(p.total_earnings||p.totalEarnings) ? `₹${fmtNum(Math.floor(p.total_earnings||p.totalEarnings))}` : "—" },
                  { icon:<MapPin size={16} color="#D4AF37"/>, label:"Cancellation", value:(p.cancellation_rate??p.cancellationRate) != null ? `${p.cancellation_rate??p.cancellationRate}%` : "—" },
                ].map(({ icon, label, value }) => (
                  <div key={label} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:12, padding:"14px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>{icon}<span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{label}</span></div>
                    <div style={{ fontSize:18, fontWeight:700, color:"#fff" }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* ── Vehicle Info ── */}
              <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:14, padding:"16px 18px", marginBottom:22 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                  <Car size={14} color="rgba(212,175,55,0.7)"/>
                  <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#fff" }}>Vehicle Details</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {[
                    ["Type",         (p.vehicle_type||p.vehicleType||vehicleFromKyc?.vehicle_type||"—").replace(/\b\w/g,c=>c.toUpperCase())],
                    ["Number",       p.vehicle_number||p.vehicleNumber||vehicleFromKyc?.vehicle_number||"—"],
                    ["Model (RC)",   p.vehicle_model_from_rc||p.vehicleModelFromRc||p.vehicle_model||p.vehicleModel||vehicleFromKyc?.vehicle_model||"—"],
                    ["Color",        p.vehicle_color||p.vehicleColor||vehicleFromKyc?.vehicle_color||"—"],
                  ].map(([l,v]) => (
                    <div key={l} style={{ padding:"9px 12px", background:"rgba(255,255,255,0.03)", borderRadius:8 }}>
                      <div style={{ fontSize:10, color:"rgba(212,175,55,0.55)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:3 }}>{l}</div>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,0.82)", fontWeight:500 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Other Info ── */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:22 }}>
                {[
                  ["Joined",      fmtDate(p.created_at||p.createdAt)],
                  ["Last Login",  fmtDate(p.last_login||p.lastLogin||p.updated_at||p.updatedAt)],
                  ["Verified At", (p.verified_at||p.verifiedAt) ? fmtDate(p.verified_at||p.verifiedAt) : "Not verified"],
                  ["Wallet",      (p.wallet_balance??p.walletBalance) != null ? `₹${fmtNum(p.wallet_balance??p.walletBalance)}` : "—"],
                  ["Login City",  p.last_login_city_name || null],
                  ["Login At",    p.last_login_at ? fmtDate(p.last_login_at) : null],
                ].filter(([,v]) => v && v !== "—").map(([l,v]) => (
                  <div key={l} style={{ padding:"9px 12px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:8 }}>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:3 }}>{l}</div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)" }}>{v}</div>
                  </div>
                ))}
              </div>

              {(p.suspension_reason||p.suspensionReason) && (
                <div style={{ padding:"12px 16px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, marginBottom:18 }}>
                  <div style={{ fontSize:10, color:"#f87171", textTransform:"uppercase", letterSpacing:"1px", marginBottom:4 }}>Suspension Reason</div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)" }}>{p.suspension_reason||p.suspensionReason}</div>
                </div>
              )}

              {/* ── Quick Actions ── */}
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <button
                  onClick={() => doAct("verify", () => verifyDriver(driverId, !isVerified), `Driver ${isVerified?"unverified":"verified"}.`)}
                  disabled={acting["verify"]}
                  style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 18px", background:isVerified?"rgba(239,68,68,0.1)":"rgba(212,175,55,0.12)", border:`1px solid ${isVerified?"rgba(239,68,68,0.3)":"rgba(212,175,55,0.35)"}`, borderRadius:10, color:isVerified?"#f87171":"#D4AF37", fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600, opacity:acting["verify"]?0.5:1 }}>
                  <ShieldCheck size={13}/>{isVerified ? "Unverify KYC" : "Verify KYC"}
                </button>
                <button
                  onClick={() => doAct("status", () => updateDriverStatus(driverId, !isActive), isActive?"Driver blocked.":"Driver unblocked.")}
                  disabled={acting["status"] || isSuspended}
                  style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 18px", background:isActive?"rgba(239,68,68,0.1)":"rgba(34,197,94,0.1)", border:`1px solid ${isActive?"rgba(239,68,68,0.25)":"rgba(34,197,94,0.25)"}`, borderRadius:10, color:isActive?"#f87171":"#4ade80", fontSize:12, cursor:isSuspended?"not-allowed":"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600, opacity:(acting["status"]||isSuspended)?0.4:1 }}>
                  {isActive ? <UserX size={13}/> : <UserCheck size={13}/>}
                  {isActive ? "Block Driver" : "Unblock Driver"}
                </button>
              </div>

            </>
            )}
          </div>{/* end left column */}

            {/* ── RIGHT: KYC docs + Bank ── */}
            <div style={{ flex:1, overflowY:"auto", padding:20 }}>

              {/* ── KYC Documents ── */}
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <CreditCard size={14} color="rgba(212,175,55,0.7)"/>
                    <span style={{ fontFamily:"Cinzel,serif", fontSize:13, fontWeight:600, color:"#fff" }}>KYC Documents</span>
                    {!dLoading && (
                      <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"rgba(212,175,55,0.1)", color:"#D4AF37", border:"1px solid rgba(212,175,55,0.2)" }}>
                        {docs.length} uploaded
                      </span>
                    )}
                  </div>
                </div>

                {dLoading ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {Array(3).fill(0).map((_,i) => <div key={i} style={{ height:100, background:"rgba(255,255,255,0.03)", borderRadius:12, animation:"gmPulse 1.5s ease-in-out infinite" }} />)}
                  </div>
                ) : docs.length === 0 ? (
                  <div style={{ padding:"32px 20px", textAlign:"center", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.08)", borderRadius:14 }}>
                    <CreditCard size={28} color="rgba(255,255,255,0.1)" style={{ marginBottom:10, display:"block", margin:"0 auto 10px" }} />
                    <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)", fontFamily:"Outfit,sans-serif" }}>No documents uploaded yet</div>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {docs.filter(d => (d.document_type||d.type) !== "BANK_ACCOUNT").map((doc) => {
                      const docId = doc.id;
                      const status = (doc.status || "pending").toLowerCase();
                      const isPending = status === "pending" || status === "under_review" || status === "manual_review";
                      return (
                        <div key={docId} style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${(status==="approved"||status==="auto_verified")?"rgba(34,197,94,0.2)":status==="rejected"?"rgba(239,68,68,0.18)":status==="manual_review"?"rgba(245,158,11,0.2)":"rgba(212,175,55,0.12)"}`, borderRadius:14, overflow:"hidden" }}>
                          <div style={{ display:"flex", gap:16, padding:16 }}>
                            {/* Document Thumbnail */}
                            <div
                              onClick={() => doc.file_url && setImgPrev(doc.file_url)}
                              style={{ width:90, height:70, borderRadius:10, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.12)", overflow:"hidden", flexShrink:0, cursor:doc.file_url?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                              {doc.file_url ? (
                                <>
                                  <img src={doc.file_url} alt="doc" style={{ width:"100%", height:"100%", objectFit:"cover" }}
                                    onError={(e)=>{e.target.style.display="none";e.target.nextSibling.style.display="flex";}} />
                                  <div style={{ display:"none", position:"absolute", inset:0, alignItems:"center", justifyContent:"center", fontSize:10, color:"rgba(255,255,255,0.35)", flexDirection:"column", gap:4 }}>
                                    <ExternalLink size={14} color="rgba(212,175,55,0.5)"/>
                                    <span>Open</span>
                                  </div>
                                  <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0)", transition:".2s", display:"flex", alignItems:"center", justifyContent:"center", opacity:0 }}
                                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,0,0,0.4)";e.currentTarget.style.opacity=1;}}
                                    onMouseLeave={e=>{e.currentTarget.style.background="rgba(0,0,0,0)";e.currentTarget.style.opacity=0;}}>
                                    <Eye size={16} color="#fff"/>
                                  </div>
                                </>
                              ) : (
                                <div style={{ textAlign:"center", color:"rgba(255,255,255,0.25)", fontSize:10 }}>No image</div>
                              )}
                            </div>

                            {/* Doc Info */}
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:6 }}>
                                <div style={{ fontSize:13, fontWeight:600, color:"#fff" }}>{docTypeLabel(doc.document_type || doc.type)}</div>
                                <DocStatusBadge status={doc.status} />
                              </div>
                              {doc.document_number && (
                                <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", marginBottom:4, fontFamily:"monospace" }}>{doc.document_number}</div>
                              )}
                              <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"rgba(255,255,255,0.3)" }}>
                                <Calendar size={10}/>
                                {fmtDate(doc.submitted_at || doc.created_at)}
                              </div>
                              {doc.reject_reason && (
                                <div style={{ marginTop:7, fontSize:11, color:"#f87171", background:"rgba(239,68,68,0.08)", padding:"5px 10px", borderRadius:6 }}>
                                  Rejected: {doc.reject_reason}
                                </div>
                              )}
                              {isPending && (
                                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                                  <button
                                    onClick={() => handleApproveDoc(docId)}
                                    disabled={acting["doc"+docId]}
                                    style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:8, color:"#4ade80", fontSize:11, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600, opacity:acting["doc"+docId]?0.5:1 }}>
                                    <FileCheck size={11}/>{acting["doc"+docId]?"…":"Approve"}
                                  </button>
                                  <button
                                    onClick={() => setRejectDocId(docId)}
                                    disabled={acting["doc"+docId]}
                                    style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:8, color:"#f87171", fontSize:11, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600, opacity:acting["doc"+docId]?0.5:1 }}>
                                    <FileX size={11}/>Reject
                                  </button>
                                  {doc.file_url && (
                                    <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:8, color:"#D4AF37", fontSize:11, textDecoration:"none" }}>
                                      <ExternalLink size={11}/>Open
                                    </a>
                                  )}
                                </div>
                              )}
                              {!isPending && doc.file_url && (
                                <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:8, padding:"4px 10px", background:"rgba(212,175,55,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:7, color:"#D4AF37", fontSize:11, textDecoration:"none" }}>
                                  <ExternalLink size={10}/>View Document
                                </a>
                              )}
                            </div>
                          </div>
                          <ExtractedDataSection doc={doc} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Bank Account Section ───────────────────────────────── */}
              {(() => {
                const bankDoc = docs.find(d => (d.document_type||d.type) === "BANK_ACCOUNT");
                const bext = (() => {
                  if (!bankDoc) return null;
                  try {
                    const raw = bankDoc.extracted_data;
                    return typeof raw === "string" ? JSON.parse(raw) : (raw || null);
                  } catch { return null; }
                })();
                const bStatus = bankDoc ? (bankDoc.status || "pending").toLowerCase() : null;
                const isPending = bStatus && (bStatus === "pending" || bStatus === "manual_review");

                return (
                  <div style={{ marginTop:24 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <CreditCard size={14} color="#D4AF37"/>
                        <span style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.85)", fontFamily:"Outfit,sans-serif" }}>Bank Account</span>
                      </div>
                      {bankDoc && <DocStatusBadge status={bankDoc.status} />}
                    </div>

                    {!bankDoc ? (
                      <div style={{ padding:"24px 20px", textAlign:"center", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.08)", borderRadius:14 }}>
                        <CreditCard size={24} color="rgba(255,255,255,0.1)" style={{ marginBottom:8, display:"block", margin:"0 auto 8px" }}/>
                        <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>Driver has not submitted bank details yet</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.18)", marginTop:4 }}>Driver can add bank account from the app</div>
                      </div>
                    ) : (
                      <div style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${bStatus==="auto_verified"||bStatus==="approved"?"rgba(34,197,94,0.2)":bStatus==="rejected"?"rgba(239,68,68,0.18)":bStatus==="manual_review"?"rgba(245,158,11,0.2)":"rgba(212,175,55,0.12)"}`, borderRadius:14, overflow:"hidden" }}>

                        {/* Bank card header */}
                        <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:14, background:"rgba(34,197,94,0.04)" }}>
                          <div style={{ width:44, height:44, borderRadius:12, background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <CreditCard size={20} color="#4ade80"/>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:2 }}>
                              {bext?.bank_name || "Bank Account"}
                            </div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontFamily:"monospace" }}>
                              {bext?.account_masked || bankDoc.document_number ? `XXXX${bankDoc.document_number}` : "••••••••"}
                            </div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:2 }}>Submitted</div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>{fmtDate(bankDoc.submitted_at || bankDoc.created_at)}</div>
                          </div>
                        </div>

                        {/* Bank details grid */}
                        {bext && (
                          <div style={{ padding:"12px 16px 14px", borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(155px, 1fr))", gap:6 }}>
                              {[
                                { label:"Account Holder",   value: bext.holder_name },
                                { label:"Account (masked)", value: bext.account_masked,   mono: true },
                                { label:"IFSC Code",        value: bext.ifsc,              mono: true },
                                { label:"Bank Name",        value: bext.bank_name },
                                { label:"Branch",           value: bext.branch },
                                { label:"City",             value: bext.city },
                                { label:"Account Status",   value: bext.account_status },
                                { label:"Name Match",       value: bext.name_match_result },
                                { label:"Match Score",      value: bext.name_match_score != null ? `${bext.name_match_score}%` : null },
                                { label:"MICR",             value: bext.micr,              mono: true },
                              ].filter(f => f.value).map(f => (
                                <ExtractedField key={f.label} label={f.label} value={f.value} mono={f.mono} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Approve / Reject if pending */}
                        {isPending && (
                          <div style={{ padding:"0 16px 14px", display:"flex", gap:8 }}>
                            <button onClick={() => handleApproveDoc(bankDoc.id)} disabled={acting["doc"+bankDoc.id]}
                              style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:8, color:"#4ade80", fontSize:11, cursor:"pointer", fontWeight:600, opacity:acting["doc"+bankDoc.id]?0.5:1 }}>
                              <FileCheck size={11}/>{acting["doc"+bankDoc.id]?"…":"Approve"}
                            </button>
                            <button onClick={() => setRejectDocId(bankDoc.id)} disabled={acting["doc"+bankDoc.id]}
                              style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:8, color:"#f87171", fontSize:11, cursor:"pointer", fontWeight:600, opacity:acting["doc"+bankDoc.id]?0.5:1 }}>
                              <FileX size={11}/>Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>{/* end right column */}
          </div>{/* end 2-col body */}
        </div>{/* end modal */}
      </>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = ["Drivers", "KYC Queue", "Fraud Alerts"];

export default function DriverOnboardingPage() {
  const navigate = useNavigate();
  const [tab, setTab]           = useState("Drivers");
  const [drivers, setDrivers]   = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({});
  const [sort, setSort]         = useState({ col:null, dir:"desc" });
  const [includeInactive,          setIncludeInactive]         = useState(false);
  const [includeUnverifiedUsers,   setIncludeUnverifiedUsers]  = useState(false);
  const [includeUnverifiedDrivers, setIncludeUnverifiedDrivers]= useState(false);
  const [offset, setOffset]     = useState(0);
  const [toast, setToast]       = useState(null);
  const [acting, setActing]     = useState({});
  const [exporting, setExporting] = useState(false);

  // ── Period filter state ───────────────────────────────────────────────
  const [period, setPeriod]         = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

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

  // ── Driver stats ──────────────────────────────────────────────────────
  const [stats, setStats]               = useState({ signups: 0, active: 0, inactive: 0, allTime: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await getDriverStats(periodDates.from || undefined, periodDates.to || undefined);
      const d = res.data?.data ?? {};
      setStats({
        signups:  d.signups_in_period  ?? 0,
        active:   d.active_in_period   ?? 0,
        inactive: d.inactive_in_period ?? 0,
        allTime:  d.total_all_time     ?? 0,
      });
    } catch (e) { console.error('[DriverStats]', e); }
    setStatsLoading(false);
  }, [periodDates]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const setFilter    = (key, next) => { setFilters(p => ({ ...p, [key]: next })); setOffset(0); };
  const clearFilter  = (key)       => { setFilters(p => { const n = { ...p }; delete n[key]; return n; }); setOffset(0); };
  const clearAllFilters = ()       => { setFilters({}); setOffset(0); setSort({ col:null, dir:"desc" }); };

  // Modals
  const [suspendTarget, setSuspendTarget]   = useState(null);
  const [confirmBlock, setConfirmBlock]     = useState(null);
  const [rejectTarget, setRejectTarget]     = useState(null);
  const [viewDriver, setViewDriver]         = useState(null); // { driverId, userId }

  // KYC
  const [kycDocs, setKycDocs]           = useState([]);
  const [kycLoading, setKycLoading]     = useState(false);
  const [kycTypeFilter, setKycTypeFilter] = useState("");

  // Fraud
  const [fraudAlerts, setFraudAlerts]   = useState([]);
  const [fraudLoading, setFraudLoading] = useState(false);
  const [severity, setSeverity]         = useState("HIGH");

  const LIMIT = 10;
  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const loadDrivers = useCallback(() => {
    setLoading(true);
    const params = { limit:LIMIT, offset, ...buildFilterParams(filters, DRIVER_FIELDS) };
    if (includeInactive)          params.include_inactive           = "true";
    if (includeUnverifiedUsers)   params.include_unverified_users   = "true";
    if (includeUnverifiedDrivers) params.include_unverified_drivers = "true";
    if (sort.col && DRIVER_SORT_COLS[sort.col]) {
      params.sort_by  = DRIVER_SORT_COLS[sort.col];
      params.sort_dir = sort.dir;
    }
    if (!filters.joined && periodDates.from) params.joined_from = periodDates.from;
    if (!filters.joined && periodDates.to)   params.joined_to   = periodDates.to;
    getDrivers(params)
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setDrivers(d.drivers || d.items || d.data || []);
        setPagination(d.pagination || null);
      })
      .catch(() => showToast("Failed to load drivers.", "error"))
      .finally(() => setLoading(false));
  }, [filters, offset, sort, includeInactive, includeUnverifiedUsers, includeUnverifiedDrivers, periodDates]);

  const handleExportDrivers = async () => {
    setExporting(true);
    try {
      const params = { limit: 5000, offset: 0, ...buildFilterParams(filters, DRIVER_FIELDS) };
      if (includeInactive)          params.include_inactive           = "true";
      if (includeUnverifiedUsers)   params.include_unverified_users   = "true";
      if (includeUnverifiedDrivers) params.include_unverified_drivers = "true";
      if (sort.col && DRIVER_SORT_COLS[sort.col]) {
        params.sort_by  = DRIVER_SORT_COLS[sort.col];
        params.sort_dir = sort.dir;
      }
      if (!filters.joined && periodDates.from) params.joined_from = periodDates.from;
      if (!filters.joined && periodDates.to)   params.joined_to   = periodDates.to;

      const res  = await getDrivers(params);
      const d    = res.data?.data || res.data || {};
      const all  = d.drivers || d.items || d.data || [];
      if (!all.length) { showToast("No data to export.", "error"); return; }

      const today = new Date().toISOString().slice(0, 10);
      const rows  = all.map((dr) => ({
        "GO ID":              dr.go_id || "",
        "Full Name":          dr.full_name || "",
        "Phone":              dr.phone_number || "",
        "Email":              dr.email || "",
        "Vehicle Type":       dr.vehicle_type ? dr.vehicle_type.charAt(0).toUpperCase() + dr.vehicle_type.slice(1) : "",
        "Vehicle Number":     dr.vehicle_number || "",
        "Vehicle Model":      dr.vehicle_model_from_rc || "",
        "Vehicle Color":      dr.vehicle_color || "",
        "Last Login City":    dr.last_login_city_name || "",
        "KYC Status":         dr.kyc_status || "",
        "Driver Verified":    dr.is_verified ? "Yes" : "No",
        "Account Active":     dr.is_active ? "Yes" : "No",
        "Currently Online":   dr.is_online ? "Yes" : "No",
        "Avg Rating":         dr.avg_rating != null ? Number(Number(dr.avg_rating).toFixed(2)) : "",
        "Total Rides":        dr.total_rides != null ? Number(dr.total_rides) : "",
        "Total Earnings":     dr.total_earnings != null ? Number(dr.total_earnings) : "",
        "Last Login":         xlsDate(dr.last_login),
        "Joined On":          xlsDate(dr.created_at),
      }));

      exportToExcel(rows, `go-mobility-drivers-${today}`, "Drivers");
      showToast(`Exported ${rows.length} drivers successfully.`);
    } catch {
      showToast("Export failed. Please try again.", "error");
    } finally {
      setExporting(false);
    }
  };

  const activeDriverFilters = useMemo(() => Object.entries(filters)
    .filter(([k, f]) => {
      const meta = DRIVER_FIELDS.find(m => m.key === k);
      return meta && isFilterActive(f, meta.type);
    })
    .map(([k, f]) => ({ key:k, filter:f, meta: DRIVER_FIELDS.find(m => m.key === k) })),
    [filters]);

  const toggleDriverSort = (col) => {
    if (!DRIVER_SORT_COLS[col]) return;
    setSort(s => s.col === col ? (s.dir === "asc" ? { col, dir:"desc" } : { col:null, dir:"desc" }) : { col, dir:"asc" });
  };
  const fMeta = (k) => DRIVER_FIELDS.find(m => m.key === k);

  const loadKyc = useCallback(() => {
    setKycLoading(true);
    const params = { limit:50, page:1, status:"all" };
    if (kycTypeFilter) params.type = kycTypeFilter;
    getKycQueue(params)
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setKycDocs(d.documents || d.items || d.queue || (Array.isArray(d) ? d : []));
      })
      .catch(() => showToast("Failed to load KYC queue.", "error"))
      .finally(() => setKycLoading(false));
  }, [kycTypeFilter]);

  const loadFraud = useCallback(() => {
    setFraudLoading(true);
    getFraudAlerts({ severity })
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setFraudAlerts(d.alerts || d.items || (Array.isArray(d) ? d : []));
      })
      .catch(() => showToast("Failed to load fraud alerts.", "error"))
      .finally(() => setFraudLoading(false));
  }, [severity]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);
  useEffect(() => { if (tab === "KYC Queue") loadKyc(); }, [tab, loadKyc]);
  useEffect(() => { if (tab === "Fraud Alerts") loadFraud(); }, [tab, loadFraud]);

  const act = async (key, fn, successMsg) => {
    setActing((p) => ({ ...p, [key]: true }));
    try { await fn(); showToast(successMsg); loadDrivers(); loadStats(); }
    catch (err) { showToast(err.response?.data?.message || "Action failed.", "error"); }
    finally { setActing((p) => ({ ...p, [key]: false })); }
  };

  const executeSuspend = async (reason) => {
    const { userId, name } = suspendTarget;
    setSuspendTarget(null);
    setActing((p) => ({ ...p, ["sus"+userId]: true }));
    try {
      await suspendDriver(userId, reason);
      showToast(`${name || "Driver"} suspended.`);
      loadDrivers();
      if (tab === "Fraud Alerts") loadFraud();
    } catch (err) { showToast(err.response?.data?.message || "Suspend failed.", "error"); }
    finally { setActing((p) => ({ ...p, ["sus"+userId]: false })); }
  };

  const handleApproveKyc = async (docId) => {
    setActing(p => ({...p,[docId]:true}));
    try { await approveDocument(docId); showToast("Document approved."); loadKyc(); }
    catch (err) { showToast(err.response?.data?.message || "Approval failed.", "error"); }
    finally { setActing(p => ({...p,[docId]:false})); }
  };

  const handleRejectKyc = async (docId, reason, allowRetry) => {
    setRejectTarget(null);
    setActing(p => ({...p,[docId]:true}));
    try { await rejectDocument(docId, reason, allowRetry); showToast("Document rejected."); loadKyc(); }
    catch (err) { showToast(err.response?.data?.message || "Rejection failed.", "error"); }
    finally { setActing(p => ({...p,[docId]:false})); }
  };

  const total      = pagination?.total      ?? 0;
  const totalPages = pagination?.totalPages ?? 1;

  const TH = ({ c }) => <th style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", borderBottom:"1px solid rgba(212,175,55,0.1)", whiteSpace:"nowrap" }}>{c}</th>;
  const TD = ({ children, style }) => <td style={{ padding:"13px 16px", fontSize:13, color:"rgba(255,255,255,0.8)", borderBottom:"1px solid rgba(255,255,255,0.04)", verticalAlign:"middle", ...style }}>{children}</td>;

  const pendingKycCount = kycDocs.filter(d => (d.status||"").toLowerCase() === "pending").length;

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {suspendTarget && <SuspendModal target={suspendTarget} onConfirm={executeSuspend} onCancel={() => setSuspendTarget(null)} />}

      {confirmBlock && (
        <ConfirmDialog
          msg={`Block driver "${confirmBlock.full_name || confirmBlock.name || "this driver"}"? They won't be able to accept rides.`}
          confirmLabel="Block Driver"
          onConfirm={() => { const d = confirmBlock; setConfirmBlock(null); act(d.id+"s", () => updateDriverStatus(d.id, false), "Driver blocked."); }}
          onCancel={() => setConfirmBlock(null)}
        />
      )}

      {rejectTarget && (
        <RejectModal
          onConfirm={(r, a) => handleRejectKyc(rejectTarget, r, a)}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      {/* Page Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Driver Management</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Total: {total} drivers · Manage onboarding, KYC verification and fraud alerts</p>
      </div>

      {/* Tab Nav */}
      <div style={{ display:"flex", gap:8, marginBottom:22, flexWrap:"wrap" }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 18px", borderRadius:10, border:"1px solid", fontSize:13, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600, transition:"all .2s", borderColor:tab===t?"#D4AF37":"rgba(212,175,55,0.2)", background:tab===t?"rgba(212,175,55,0.12)":"transparent", color:tab===t?"#D4AF37":"rgba(255,255,255,0.5)", position:"relative" }}>
            {t}
            {t === "KYC Queue" && pendingKycCount > 0 && (
              <span style={{ background:"#ef4444", color:"#fff", borderRadius:10, fontSize:10, fontWeight:700, padding:"1px 6px", minWidth:18 }}>{pendingKycCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── DRIVERS TAB ── */}
      {tab === "Drivers" && (
        <>
          {/* Period filter bar */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 14, padding: '13px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
              <Calendar size={13} color={GOLD} />
              <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Period Filter</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => { setPeriod(p.key); setOffset(0); }} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontFamily: 'Outfit,sans-serif', cursor: 'pointer',
                  border: `1px solid ${period === p.key ? GOLD20 : 'rgba(255,255,255,0.08)'}`,
                  background: period === p.key ? GOLD10 : 'transparent',
                  color: period === p.key ? GOLD : TEXT_MED,
                  fontWeight: period === p.key ? 700 : 500, transition: 'all .15s',
                }}>{p.label}</button>
              ))}
            </div>
            {period === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setOffset(0); }} style={DATE_INPUT_STYLE} />
                <span style={{ color: TEXT_DIM, fontSize: 12 }}>to</span>
                <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setOffset(0); }} style={DATE_INPUT_STYLE} />
              </div>
            )}
            <button onClick={() => { loadStats(); loadDrivers(); }} title="Refresh" style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: TEXT_DIM, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={13} />
            </button>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <DrvStatCard icon={UserPlus}  label={`Signups — ${periodLabel}`} value={stats.signups}  color={GOLD}      loading={statsLoading} />
            <DrvStatCard icon={UserCheck} label={`Active — ${periodLabel}`}  value={stats.active}   color="#22c55e"   loading={statsLoading} />
            <DrvStatCard icon={UserX}     label={`Inactive — ${periodLabel}`}value={stats.inactive} color="#ef4444"   loading={statsLoading} />
            <DrvStatCard icon={Users}     label="Total All-Time"             value={stats.allTime}  color="#6366f1"   loading={statsLoading} />
          </div>

          {/* Visibility toggles + reset */}
          <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
            <DrvVisibilityToggle active={includeInactive}          onToggle={() => { setIncludeInactive(v=>!v); setOffset(0); }}          label="Blocked" />
            <DrvVisibilityToggle active={includeUnverifiedUsers}   onToggle={() => { setIncludeUnverifiedUsers(v=>!v); setOffset(0); }}   label="OTP-Unverified" />
            <DrvVisibilityToggle active={includeUnverifiedDrivers} onToggle={() => { setIncludeUnverifiedDrivers(v=>!v); setOffset(0); }} label="KYC-Incomplete" />
            <button
              onClick={handleExportDrivers}
              disabled={exporting}
              title="Export to Excel"
              style={{
                display:"flex", alignItems:"center", gap:6,
                height:32, padding:"0 14px",
                background: exporting ? "rgba(34,197,94,0.06)" : "rgba(34,197,94,0.1)",
                border:"1px solid rgba(34,197,94,0.25)",
                borderRadius:8, color: exporting ? "rgba(74,222,128,0.5)" : "#4ade80",
                fontSize:12, cursor: exporting ? "not-allowed" : "pointer",
                fontFamily:"Outfit,sans-serif", fontWeight:600, transition:"all .2s",
              }}
            >
              <Download size={13}/>
              {exporting ? "Exporting…" : "Export Excel"}
            </button>
            <button onClick={loadDrivers} title="Refresh" style={{
              width:32, height:32, borderRadius:8,
              background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)",
              color:"rgba(255,255,255,0.65)", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <RefreshCw size={13} />
            </button>
            {(activeDriverFilters.length > 0 || sort.col) && (
              <button onClick={clearAllFilters} style={{
                display:"flex", alignItems:"center", gap:6, height:32, padding:"0 14px",
                background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)",
                borderRadius:8, color:"#f87171", fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif",
                marginLeft:"auto",
              }}>
                <X size={12}/> Clear all
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {(period !== 'all' || activeDriverFilters.length > 0) && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14, alignItems:"center" }}>
              <FilterIcon size={13} color="#D4AF37" style={{ marginRight:2 }} />
              {period !== 'all' && (
                <DrvPeriodChip
                  label={`Period: ${periodLabel}${period === 'custom' ? ` (${customFrom || '?'} → ${customTo || '?'})` : ''}`}
                  onRemove={() => { setPeriod('all'); setOffset(0); }}
                />
              )}
              {activeDriverFilters.map(({ key, filter, meta }) => (
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

          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"visible" }}>
            <div style={{ overflowX:"auto", overflowY:"visible" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    <th style={drvTh(sort.col==="name")}  onClick={()=>toggleDriverSort("name")}>
                      <FilterHead label="Driver" meta={fMeta("name")} filter={filters.name}
                        onChange={v => setFilter("name", v)} onClear={() => clearFilter("name")} />
                    </th>
                    <th style={drvTh(sort.col==="phone")} onClick={()=>toggleDriverSort("phone")}>
                      <FilterHead label="Phone" meta={fMeta("phone")} filter={filters.phone}
                        onChange={v => setFilter("phone", v)} onClear={() => clearFilter("phone")} />
                    </th>
                    <th style={drvTh(false)}>Vehicle</th>
                    <th style={drvTh(sort.col==="rating")} onClick={()=>toggleDriverSort("rating")}>
                      <FilterHead label="Rating" meta={fMeta("rating")} filter={filters.rating}
                        onChange={v => setFilter("rating", v)} onClear={() => clearFilter("rating")} />
                    </th>
                    <th style={drvTh(false)}>
                      <FilterHead label="Status" meta={fMeta("is_available")} filter={filters.is_available}
                        onChange={v => setFilter("is_available", v)} onClear={() => clearFilter("is_available")} />
                    </th>
                    <th style={drvTh(false)}>
                      <FilterHead label="KYC" meta={fMeta("is_verified")} filter={filters.is_verified}
                        onChange={v => setFilter("is_verified", v)} onClear={() => clearFilter("is_verified")} />
                    </th>
                    <th style={drvTh(sort.col==="rides")} onClick={()=>toggleDriverSort("rides")}>
                      <FilterHead label="Rides" meta={fMeta("rides")} filter={filters.rides}
                        onChange={v => setFilter("rides", v)} onClear={() => clearFilter("rides")} />
                    </th>
                    <th style={drvTh(sort.col==="earnings")} onClick={()=>toggleDriverSort("earnings")}>
                      <FilterHead label="Earnings" meta={fMeta("earnings")} filter={filters.earnings}
                        onChange={v => setFilter("earnings", v)} onClear={() => clearFilter("earnings")} align="right" />
                    </th>
                    <th style={drvTh(sort.col==="joined")} onClick={()=>toggleDriverSort("joined")}>
                      <FilterHead label="Joined" meta={fMeta("joined")} filter={filters.joined}
                        onChange={v => setFilter("joined", v)} onClear={() => clearFilter("joined")} align="right" />
                    </th>
                    <th style={{ ...drvTh(false), cursor:"default" }}>Last City</th>
                    <th style={{ ...drvTh(false), cursor:"default" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array(6).fill(0).map((_,i)=>(
                        <tr key={i}><td colSpan={11}><div style={{ height:52, background:"rgba(255,255,255,0.03)", margin:"3px 8px", borderRadius:8, animation:"gmPulse 1.5s ease-in-out infinite" }}/></td></tr>
                      ))
                    : drivers.length === 0
                      ? <tr><td colSpan={11} style={{ padding:52, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>No drivers match these filters</td></tr>
                      : drivers.map((d) => {
                          const isSuspended = d.is_suspended || d.suspended;
                          const userId = d.user_id || d.userId;
                          const isVerified = !!(d.is_verified || d.verified_at);
                          const vt = Array.isArray(d.vehicle_type) ? d.vehicle_type.join(", ") : (d.vehicle_type || d.vehicleType);
                          return (
                            <tr key={d.id} onMouseEnter={(e)=>e.currentTarget.style.background="rgba(212,175,55,0.03)"} onMouseLeave={(e)=>e.currentTarget.style.background=""}>
                              <TD>
                                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                  <div style={{ width:34, height:34, borderRadius:"50%", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
                                    {d.profile_photo_url
                                      ? <img src={d.profile_photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={(e)=>{e.target.style.display="none";}}/>
                                      : <User size={14} color="rgba(212,175,55,0.5)"/>
                                    }
                                  </div>
                                  <div>
                                    <div style={{ fontWeight:600, color:"#fff" }}>{d.full_name || d.name || "—"}</div>
                                    {d.go_id && <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.35)", fontFamily:"monospace", marginTop:2 }}>{d.go_id}</div>}
                                  </div>
                                </div>
                              </TD>
                              <TD style={{ fontFamily:"monospace", fontSize:12 }}>{d.phone_number || "—"}</TD>
                              <TD>
                                <div style={{ fontSize:12 }}><span style={{ color:"rgba(255,255,255,0.6)", textTransform:"capitalize" }}>{vt || "—"}</span></div>
                                {(d.vehicle_number||d.vehicleNumber) && <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{d.vehicle_number||d.vehicleNumber}</div>}
                              </TD>
                              <TD><span style={{ color:"#f59e0b", fontWeight:600 }}>{d.rating ? `${parseFloat(d.rating).toFixed(1)}★` : "—"}</span></TD>
                              <TD>
                                {isSuspended
                                  ? <Badge label="Suspended" color="#f59e0b" bg="rgba(245,158,11,0.1)" border="rgba(245,158,11,0.3)" />
                                  : !d.is_active
                                    ? <Badge label="Blocked" color="#f87171" bg="rgba(239,68,68,0.12)" border="rgba(239,68,68,0.3)" />
                                    : d.is_on_duty
                                      ? <Badge label="On Ride"  color="#60a5fa" bg="rgba(59,130,246,0.12)" border="rgba(59,130,246,0.3)" />
                                      : d.is_available
                                        ? <Badge label="Online" color="#4ade80" bg="rgba(34,197,94,0.12)" border="rgba(34,197,94,0.3)" />
                                        : <Badge label="Offline" color="rgba(255,255,255,0.6)" bg="rgba(255,255,255,0.04)" border="rgba(255,255,255,0.1)" />
                                }
                              </TD>
                              <TD>
                                {isVerified
                                  ? <Badge label="Verified" color="#D4AF37" bg="rgba(212,175,55,0.12)" border="rgba(212,175,55,0.3)" />
                                  : <Badge label="Pending" color="#f59e0b" bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.2)" />
                                }
                              </TD>
                              <TD style={{ fontSize:12, fontVariantNumeric:"tabular-nums" }}>{fmtNum(d.total_rides)}</TD>
                              <TD style={{ fontSize:12, fontVariantNumeric:"tabular-nums", color:"#4ade80" }}>
                                {d.total_earnings != null ? "₹" + new Intl.NumberFormat("en-IN").format(d.total_earnings) : "—"}
                              </TD>
                              <TD style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{fmtDate(d.created_at)}</TD>
                              <TD style={{ fontSize:12 }}>
                                {d.last_login_city_name
                                  ? <span style={{ display:"flex", alignItems:"center", gap:4 }}><MapPin size={11} color="rgba(212,175,55,0.5)"/>{d.last_login_city_name}</span>
                                  : <span style={{ color:"rgba(255,255,255,0.25)" }}>—</span>
                                }
                              </TD>
                              <TD>
                                <div style={{ display:"flex", gap:6 }}>
                                  <button
                                    onClick={() => navigate(`/driver-onboarding/${d.id}`, { state: { userId } })}
                                    style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.25)", borderRadius:8, color:"#D4AF37", fontSize:11, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600 }}>
                                    <Eye size={12}/> Details
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (d.is_active) setConfirmBlock(d);
                                      else act(d.id+"s", () => updateDriverStatus(d.id, true), "Driver unblocked.");
                                    }}
                                    disabled={acting[d.id+"s"] || isSuspended}
                                    style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", background:d.is_active?"rgba(239,68,68,0.1)":"rgba(34,197,94,0.1)", border:`1px solid ${d.is_active?"rgba(239,68,68,0.25)":"rgba(34,197,94,0.25)"}`, borderRadius:8, color:d.is_active?"#f87171":"#4ade80", fontSize:11, cursor:isSuspended?"not-allowed":"pointer", opacity:(acting[d.id+"s"]||isSuspended)?0.4:1 }}>
                                    {d.is_active ? <UserX size={11}/> : <UserCheck size={11}/>}
                                    {d.is_active ? "Block" : "Unblock"}
                                  </button>
                                  {!isSuspended && (
                                    <button
                                      onClick={() => setSuspendTarget({ userId, name: d.full_name || d.name })}
                                      disabled={acting["sus"+userId]}
                                      style={{ padding:"5px 10px", background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:8, color:"#f59e0b", fontSize:11, cursor:"pointer", opacity:acting["sus"+userId]?0.4:1 }}>
                                      <ShieldX size={11}/>
                                    </button>
                                  )}
                                </div>
                              </TD>
                            </tr>
                          );
                        })
                  }
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ padding:"14px 20px", borderTop:"1px solid rgba(212,175,55,0.08)" }}>
                <Pagination pagination={pagination} onOffsetChange={setOffset} />
              </div>
            )}
          </div>
        </>
      )}

      {/* ── KYC QUEUE TAB ── */}
      {tab === "KYC Queue" && (
        <>
          {/* Summary */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
            {[
              { label:"Pending Review", count:kycDocs.filter(d=>["pending","manual_review"].includes((d.status||"").toLowerCase())).length, color:"#f59e0b", bg:"rgba(245,158,11,0.08)" },
              { label:"Verified",       count:kycDocs.filter(d=>["approved","auto_verified"].includes((d.status||"").toLowerCase())).length, color:"#4ade80", bg:"rgba(34,197,94,0.06)" },
              { label:"Rejected",       count:kycDocs.filter(d=>(d.status||"").toLowerCase()==="rejected").length, color:"#f87171", bg:"rgba(239,68,68,0.06)" },
            ].map(({ label, count, color, bg }) => (
              <div key={label} style={{ background:bg, border:`1px solid ${color}30`, borderRadius:14, padding:"16px 20px", textAlign:"center" }}>
                <div style={{ fontSize:26, fontWeight:800, color }}>{kycLoading ? "—" : count}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:4 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
              <span style={{ fontFamily:"Cinzel,serif", fontSize:14, color:"#fff", fontWeight:600 }}>Document Queue</span>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <select value={kycTypeFilter} onChange={(e) => setKycTypeFilter(e.target.value)} style={{ height:34, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:8, padding:"0 12px", color:"rgba(255,255,255,0.8)", fontSize:12, outline:"none", cursor:"pointer" }}>
                  <option value="">All Types</option>
                  <option value="AADHAAR">Aadhaar</option>
                  <option value="PAN">PAN Card</option>
                  <option value="DRIVING_LICENCE">Driving Licence</option>
                  <option value="VEHICLE_RC">Vehicle RC</option>
                  <option value="SELFIE">Selfie</option>
                  <option value="BANK_ACCOUNT">Bank Account</option>
                </select>
                <button onClick={loadKyc} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"rgba(212,175,55,0.7)", background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:8, padding:"6px 12px", cursor:"pointer" }}>
                  <RefreshCw size={11}/> Refresh
                </button>
              </div>
            </div>

            {kycLoading ? (
              <div style={{ padding:20, display:"flex", flexDirection:"column", gap:12 }}>
                {Array(4).fill(0).map((_,i) => <div key={i} style={{ height:90, background:"rgba(255,255,255,0.03)", borderRadius:12, animation:"gmPulse 1.5s ease-in-out infinite" }} />)}
              </div>
            ) : kycDocs.length === 0 ? (
              <div style={{ padding:52, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13, fontFamily:"Outfit,sans-serif" }}>
                <CheckCircle size={32} color="rgba(34,197,94,0.2)" style={{ marginBottom:12, display:"block", margin:"0 auto 12px" }} />
                No documents in queue
              </div>
            ) : (
              <div style={{ padding:16, display:"flex", flexDirection:"column", gap:12 }}>
                {kycDocs.map((doc) => {
                  const s2 = (doc.status||"").toLowerCase();
                  const isPending = s2 === "pending" || s2 === "manual_review" || s2 === "under_review";
                  const driverName = doc.driver?.full_name || doc.driver_name || "—";
                  const driverPhone = doc.driver?.phone_number || doc.driver_phone || "";
                  return (
                    <div key={doc.id} style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${isPending?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.06)"}`, borderRadius:14, padding:16, display:"flex", gap:16, alignItems:"flex-start" }}>
                      {/* Thumbnail */}
                      <div style={{ width:80, height:64, borderRadius:10, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.1)", overflow:"hidden", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", cursor:doc.file_url?"pointer":"default" }}
                        onClick={() => doc.file_url && window.open(doc.file_url,"_blank")}>
                        {doc.file_url
                          ? <img src={doc.file_url} alt="doc" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={(e)=>{e.target.style.display="none";}} />
                          : <CreditCard size={20} color="rgba(212,175,55,0.3)"/>
                        }
                      </div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5, flexWrap:"wrap" }}>
                          <span style={{ fontWeight:600, color:"#fff", fontSize:13 }}>{driverName}</span>
                          {driverPhone && <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontFamily:"monospace" }}>{driverPhone}</span>}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, flexWrap:"wrap" }}>
                          <span style={{ fontSize:12, color:"rgba(255,255,255,0.65)", textTransform:"capitalize" }}>{(doc.document_type||doc.type||"—").replace(/_/g," ")}</span>
                          <DocStatusBadge status={doc.status} />
                          <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>{fmtDate(doc.created_at || doc.submitted_at)}</span>
                        </div>
                        {doc.reject_reason && (
                          <div style={{ fontSize:11, color:"#f87171", marginBottom:8 }}>Rejected: {doc.reject_reason}</div>
                        )}
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          {isPending && (
                            <>
                              <button onClick={() => handleApproveKyc(doc.id)} disabled={acting[doc.id]} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 14px", background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:8, color:"#4ade80", fontSize:12, cursor:"pointer", fontWeight:600, opacity:acting[doc.id]?0.5:1 }}>
                                <FileCheck size={12}/>{acting[doc.id]?"Approving…":"Approve"}
                              </button>
                              <button onClick={() => setRejectTarget(doc.id)} disabled={acting[doc.id]} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 14px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:8, color:"#f87171", fontSize:12, cursor:"pointer", fontWeight:600, opacity:acting[doc.id]?0.5:1 }}>
                                <FileX size={12}/>Reject
                              </button>
                            </>
                          )}
                          {doc.file_url && (
                            <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:8, color:"#D4AF37", fontSize:12, textDecoration:"none" }}>
                              <ExternalLink size={11}/>View Full
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── FRAUD ALERTS TAB ── */}
      {tab === "Fraud Alerts" && (
        <>
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            {["HIGH","MEDIUM","LOW"].map((s) => (
              <button key={s} onClick={() => setSeverity(s)} style={{ padding:"7px 16px", borderRadius:10, border:"1px solid", fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600, borderColor:severity===s?(s==="HIGH"?"#ef4444":s==="MEDIUM"?"#f59e0b":"#3b82f6"):"rgba(212,175,55,0.2)", background:severity===s?(s==="HIGH"?"rgba(239,68,68,0.12)":s==="MEDIUM"?"rgba(245,158,11,0.1)":"rgba(59,130,246,0.1)"):"transparent", color:severity===s?(s==="HIGH"?"#f87171":s==="MEDIUM"?"#f59e0b":"#60a5fa"):"rgba(255,255,255,0.5)" }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>
                  {["Alert ID","Type","Driver","Risk Score","Status","Actions"].map((c)=><TH key={c} c={c}/>)}
                </tr></thead>
                <tbody>
                  {fraudLoading
                    ? Array(4).fill(0).map((_,i)=>(
                        <tr key={i}><td colSpan={6}><div style={{ height:48, background:"rgba(255,255,255,0.03)", margin:"4px 0", borderRadius:8, animation:"gmPulse 1.5s ease-in-out infinite" }}/></td></tr>
                      ))
                    : fraudAlerts.length === 0
                      ? <tr><td colSpan={6} style={{ padding:52, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>No {severity} severity alerts</td></tr>
                      : fraudAlerts.map((a) => {
                          const riskScore   = a.risk_score ?? a.riskScore ?? 0;
                          const riskColor   = riskScore >= 85 ? "#f87171" : riskScore >= 70 ? "#f59e0b" : "#60a5fa";
                          const driverName  = a.driver?.full_name || a.driver_name || "—";
                          const driverUserId = a.driver?.id || a.driver_id || a.user_id;
                          return (
                            <tr key={a.id || a.alert_number} onMouseEnter={(e)=>e.currentTarget.style.background="rgba(212,175,55,0.03)"} onMouseLeave={(e)=>e.currentTarget.style.background=""}>
                              <TD><span style={{ fontFamily:"monospace", color:"rgba(212,175,55,0.7)", fontSize:12 }}>{a.alert_number || a.id}</span></TD>
                              <TD><div style={{ display:"flex", alignItems:"center", gap:6 }}><AlertTriangle size={12} color="#f87171"/><span style={{ fontSize:12 }}>{a.alert_type || a.type || "—"}</span></div></TD>
                              <TD>{driverName}</TD>
                              <TD><span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:`${riskColor}20`, border:`1px solid ${riskColor}40`, color:riskColor }}>{riskScore}</span></TD>
                              <TD><Badge label={a.status || "flagged"} color="#f87171" bg="rgba(239,68,68,0.1)" border="rgba(239,68,68,0.25)"/></TD>
                              <TD>
                                {driverUserId && (
                                  <button onClick={() => setSuspendTarget({ userId:driverUserId, name:driverName })} disabled={acting["sus"+driverUserId]} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:8, color:"#f59e0b", fontSize:12, cursor:"pointer", opacity:acting["sus"+driverUserId]?0.5:1 }}>
                                    <ShieldX size={13}/> Suspend
                                  </button>
                                )}
                              </TD>
                            </tr>
                          );
                        })
                  }
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Helpers for Drivers-tab UI ──────────────────────────────────────────── */
function drvTh(isSorted) {
  return {
    padding:"11px 14px", textAlign:"left", fontSize:11, fontWeight:700,
    color: isSorted ? "#D4AF37" : "rgba(212,175,55,0.75)",
    letterSpacing:"1px", textTransform:"uppercase",
    borderBottom:"1px solid rgba(212,175,55,0.1)",
    whiteSpace:"nowrap", userSelect:"none", cursor:"pointer",
    background:"rgba(0,0,0,0.15)",
  };
}

function DrvVisibilityToggle({ active, onToggle, label }) {
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
      Include {label}
    </button>
  );
}
