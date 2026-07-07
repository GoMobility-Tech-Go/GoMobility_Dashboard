import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, Phone, Mail, Star, ShieldCheck, ShieldX,
  UserCheck, UserX, CheckCircle, XCircle, Clock, Eye,
  Car, CreditCard, FileCheck, FileX, X, ExternalLink,
  Calendar, Wallet, AlertTriangle
} from "lucide-react";
import {
  getDriverById, getDriverKycStatus,
  verifyDriver, updateDriverStatus,
  approveDocument, rejectDocument,
} from "../../api/admin";

// ── responsive hook ───────────────────────────────────────────────────────────
function useWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) : "—";

const fmtNum = (n) =>
  n != null ? new Intl.NumberFormat("en-IN").format(n) : "—";

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ msg, type, onClose }) => (
  <div style={{
    position: "fixed", bottom: 28, right: 28, zIndex: 9999,
    background: type === "error" ? "#7f1d1d" : "#14532d",
    border: `1px solid ${type === "error" ? "#ef4444" : "#22c55e"}`,
    borderRadius: 12, padding: "12px 20px", color: "#fff",
    fontSize: 13, fontFamily: "Outfit,sans-serif",
    display: "flex", alignItems: "center", gap: 12,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)", maxWidth: 360,
  }}>
    <span style={{ flex: 1 }}>{msg}</span>
    <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: 0 }}>
      <X size={14} />
    </button>
  </div>
);

// ── Reject modal ──────────────────────────────────────────────────────────────
const RejectModal = ({ onConfirm, onCancel }) => {
  const [reason, setReason] = useState("");
  const [allowRetry, setAllowRetry] = useState(true);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#020d26", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 20, padding: 28, width: 420, maxWidth: "90vw" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: "Cinzel,serif", color: "#fff", fontSize: 15, margin: "0 0 20px" }}>Reject Document</h3>
        <label style={{ display: "block", fontSize: 11, color: "rgba(212,175,55,0.7)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6, fontFamily: "Cinzel,serif" }}>Reason *</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          placeholder="e.g. Image blurry, Invalid document…"
          style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", fontFamily: "Outfit,sans-serif", resize: "vertical", boxSizing: "border-box", marginBottom: 14 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
          <input type="checkbox" checked={allowRetry} onChange={(e) => setAllowRetry(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#D4AF37" }} />
          Allow driver to re-upload
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, height: 40, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={() => reason.trim() && onConfirm(reason.trim(), allowRetry)} disabled={!reason.trim()}
            style={{ flex: 1, height: 40, background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 10, color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: reason.trim() ? 1 : 0.5 }}>
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Image preview ─────────────────────────────────────────────────────────────
const ImgPreview = ({ src, onClose }) => (
  <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.94)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
    <img src={src} alt="Document" style={{ maxWidth: "88vw", maxHeight: "88vh", borderRadius: 12, objectFit: "contain", boxShadow: "0 0 60px rgba(0,0,0,0.8)" }} />
    <button onClick={onClose} style={{ position: "absolute", top: 20, right: 24, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, width: 36, height: 36, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <X size={18} />
    </button>
  </div>
);

// ── Status badge ──────────────────────────────────────────────────────────────
const DocStatusBadge = ({ status }) => {
  const s = (status || "").toLowerCase();
  if (s === "approved")      return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}><CheckCircle size={11} />Approved</span>;
  if (s === "auto_verified") return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(34,197,94,0.10)", color: "#34d399", border: "1px solid rgba(34,197,94,0.28)" }}><CheckCircle size={11} />Verified</span>;
  if (s === "rejected")      return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(239,68,68,0.10)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}><XCircle size={11} />Rejected</span>;
  if (s === "manual_review") return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.35)" }}><Eye size={11} />Needs Review</span>;
  return                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(148,163,184,0.10)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.2)" }}><Clock size={11} />Pending</span>;
};

// ── Extracted field ───────────────────────────────────────────────────────────
const ExtractedField = ({ label, value, mono }) => {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 12px" }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.82)", fontWeight: 500, fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all" }}>{String(value)}</div>
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
      { label: "Name",             value: ext.name },
      { label: "Aadhaar (masked)", value: ext.masked,        mono: true },
      { label: "Date of Birth",    value: ext.dob },
      { label: "Gender",           value: ext.gender },
      { label: "Father / Husband", value: ext.father },
      { label: "Address",          value: ext.address },
      { label: "Govt Verified",    value: fmtBool(ext.govt_verified) },
    ];
  } else if (type === "PAN") {
    fields = [
      { label: "Name",           value: ext.name },
      { label: "PAN (masked)",   value: ext.masked,          mono: true },
      { label: "Date of Birth",  value: ext.dob },
      { label: "PAN Status",     value: ext.pan_status },
      { label: "Govt Verified",  value: fmtBool(ext.govt_verified) },
      { label: "Name Match",     value: ext.name_match },
      { label: "Aadhaar Linked", value: fmtBool(ext.aadhaar_linked) },
    ];
  } else if (type === "DRIVING_LICENCE") {
    fields = [
      { label: "Name",              value: ext.full_name },
      { label: "DL No (masked)",    value: ext.masked,        mono: true },
      { label: "Date of Birth",     value: ext.dob },
      { label: "Issue Date",        value: ext.issue_date },
      { label: "Expiry Date",       value: ext.expiry_date },
      { label: "Issuing Authority", value: ext.issuing_authority },
      { label: "DL Status",         value: ext.dl_status },
      { label: "Blood Group",       value: ext.blood_group },
      { label: "Govt Verified",     value: fmtBool(ext.govt_verified) },
    ];
  } else if (type === "VEHICLE_RC") {
    fields = [
      { label: "Registration No",   value: ext.registration_number || ext.masked, mono: true },
      { label: "Owner Name",        value: ext.owner || ext.owner_name },
      { label: "Chassis No",        value: ext.chassis_number, mono: true },
      { label: "Engine No",         value: ext.engine_number,  mono: true },
      { label: "Reg Date",          value: ext.registration_date },
      { label: "Valid Till",        value: ext.registration_validity },
      { label: "Vehicle Model",     value: ext.vehicle_model },
      { label: "Vehicle Type",      value: ext.vehicle_type },
      { label: "VAHAN Verified",    value: fmtBool(ext.vahan_verified) },
    ];
  } else if (type === "SELFIE") {
    fields = [
      { label: "Face Match Score", value: ext.similarity != null ? `${ext.similarity}%` : null },
      { label: "Status",           value: ext.status },
    ];
  } else if (type === "BANK_ACCOUNT") {
    fields = [
      { label: "Account (masked)", value: ext.account_masked,  mono: true },
      { label: "Account Holder",   value: ext.holder_name },
      { label: "Bank Name",        value: ext.bank_name },
      { label: "IFSC",             value: ext.ifsc,            mono: true },
      { label: "Branch",           value: ext.branch },
      { label: "City",             value: ext.city },
      { label: "Account Status",   value: ext.account_status },
      { label: "Name Match",       value: ext.name_match_result },
      { label: "Match Score",      value: ext.name_match_score != null ? `${ext.name_match_score}%` : null },
    ];
  }

  const visible = fields.filter(f => f.value !== null && f.value !== undefined && f.value !== "");
  if (visible.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 10 }}>Extracted Data</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
        {visible.map(f => <ExtractedField key={f.label} label={f.label} value={f.value} mono={f.mono} />)}
      </div>
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color = "#D4AF37" }) => (
  <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ color, opacity: 0.8 }}>{icon}</span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</span>
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "Outfit,sans-serif" }}>{value}</div>
  </div>
);

// ── Info row ──────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.7px" }}>{label}</span>
    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{value || "—"}</span>
  </div>
);

// ── Section heading ───────────────────────────────────────────────────────────
const SectionHead = ({ icon, title, badge }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
    <span style={{ color: "rgba(212,175,55,0.7)" }}>{icon}</span>
    <span style={{ fontFamily: "Cinzel,serif", fontSize: 14, fontWeight: 700, color: "#fff" }}>{title}</span>
    {badge && (
      <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: "rgba(212,175,55,0.1)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.2)" }}>{badge}</span>
    )}
  </div>
);

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function DriverDetailPage() {
  const { driverId } = useParams();
  const { state }    = useLocation();
  const navigate     = useNavigate();
  const width        = useWidth();
  const isMobile     = width < 640;
  const isTablet     = width < 900;

  const [profile,    setProfile]    = useState(null);
  const [docs,       setDocs]       = useState([]);
  const [pLoading,   setPLoad]      = useState(true);
  const [dLoading,   setDLoad]      = useState(true);
  const [acting,     setActing]     = useState({});
  const [rejectDocId, setRejectDocId] = useState(null);
  const [imgPrev,    setImgPrev]    = useState(null);
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load profile
  useEffect(() => {
    setPLoad(true);
    getDriverById(driverId)
      .then((res) => setProfile(res.data?.data || res.data))
      .catch(() => showToast("Failed to load driver profile.", "error"))
      .finally(() => setPLoad(false));
  }, [driverId]);

  // Load KYC docs — userId from state or from loaded profile
  const loadDocs = (uid) => {
    if (!uid) { setDLoad(false); return; }
    setDLoad(true);
    getDriverKycStatus(uid)
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setDocs(d.documents || d.items || (Array.isArray(d) ? d : []));
      })
      .catch(() => setDocs([]))
      .finally(() => setDLoad(false));
  };

  useEffect(() => {
    const uid = state?.userId;
    if (uid) { loadDocs(uid); }
  }, [state]);

  useEffect(() => {
    if (!profile) return;
    const uid = profile.user_id || profile.userId || profile.id;
    if (!state?.userId) { loadDocs(uid); }
  }, [profile]);

  const reload = () => {
    const uid = state?.userId || profile?.user_id || profile?.userId || profile?.id;
    setPLoad(true);
    getDriverById(driverId)
      .then((res) => setProfile(res.data?.data || res.data))
      .catch(() => {})
      .finally(() => setPLoad(false));
    loadDocs(uid);
  };

  const doAct = async (key, fn, msg) => {
    setActing(p => ({ ...p, [key]: true }));
    try { await fn(); showToast(msg); reload(); }
    catch (e) { showToast(e.response?.data?.message || "Action failed.", "error"); }
    finally { setActing(p => ({ ...p, [key]: false })); }
  };

  const p          = profile;
  const isActive   = p?.is_active   ?? p?.isActive;
  const isSuspended= p?.is_suspended|| p?.suspended || p?.isSuspended;
  const isVerified = !!(p?.is_verified || p?.isVerified || p?.verified_at || p?.verifiedAt);

  const vehicleInfo = (() => {
    // Profile (driver_vehicle table) se pehle check karo — most reliable source
    const profileNumber = p?.vehicle_number || p?.vehicleNumber || p?.rc_number || p?.rcNumber;
    const profileType   = p?.vehicle_type   || p?.vehicleType;
    const profileModel  = p?.vehicle_model  || p?.vehicleModel;
    const profileColor  = p?.vehicle_color  || p?.vehicleColor;

    // RC KYC doc extracted_data
    const rcDoc = docs.find(d => d.document_type === "VEHICLE_RC");
    let ext = {};
    if (rcDoc) {
      try { ext = typeof rcDoc.extracted_data === "string" ? JSON.parse(rcDoc.extracted_data) : (rcDoc.extracted_data || {}); }
      catch { ext = {}; }
    }
    const kycNumber = ext.masked || ext.registration_number || ext.rc_number || ext.reg_no || ext.reg_number || (rcDoc?.document_number || null);

    const regValidity = ext.registration_validity || null;
    const isExpired   = regValidity ? new Date(regValidity) < new Date() : null;

    return {
      number:           profileNumber || kycNumber || null,
      type:             profileType   || ext.vehicle_type  || ext.vehicle_class || ext.body_type || null,
      model:            profileModel  || ext.vehicle_model || ext.model || null,
      color:            profileColor  || ext.vehicle_color || ext.color || null,
      plateColor:       ext.plate_color || null,
      isCommercial:     ext.is_commercial_vehicle ?? null,
      ownerName:        ext.owner || ext.owner_name || null,
      regValidity,
      isExpired,
      vahanVerified:    ext.vahan_verified ?? null,
      categories:       rcDoc?.vehicle_categories || null,
      rcStatus:         rcDoc?.status || null,
    };
  })();

  const bankDoc = docs.find(d => d.document_type === "BANK_ACCOUNT");
  const kyc5    = docs.filter(d => d.document_type !== "BANK_ACCOUNT");

  const cardStyle = {
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: isMobile ? 16 : 24,
    marginBottom: 16,
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#020c20", color: "#fff", fontFamily: "Outfit,sans-serif" }}>

      {/* Modals */}
      {rejectDocId && (
        <RejectModal
          onConfirm={(r, a) => { setRejectDocId(null); doAct("doc" + rejectDocId, () => rejectDocument(rejectDocId, r, a), "Document rejected."); }}
          onCancel={() => setRejectDocId(null)}
        />
      )}
      {imgPrev && <ImgPreview src={imgPrev} onClose={() => setImgPrev(null)} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── TOP NAV ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(2,12,32,0.97)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(212,175,55,0.12)",
        padding: isMobile ? "0 14px" : "0 28px",
        minHeight: 56,
        display: "flex", alignItems: "center", gap: isMobile ? 8 : 14,
        flexWrap: "wrap",
      }}>
        <button
          onClick={() => navigate("/driver-onboarding")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "7px 12px", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 12, fontFamily: "Outfit,sans-serif", flexShrink: 0 }}>
          <ArrowLeft size={14} />{!isMobile && "Back"}
        </button>

        {!isMobile && <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />}

        <span style={{ fontFamily: "Cinzel,serif", fontSize: isMobile ? 13 : 15, fontWeight: 700, color: "#D4AF37", flexShrink: 0 }}>
          Driver Profile
        </span>
        {p && !isMobile && (
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            — {p.full_name || p.fullName || p.name}
          </span>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => doAct("verify", () => verifyDriver(driverId, !isVerified), `Driver ${isVerified ? "unverified" : "verified"}.`)}
            disabled={acting["verify"] || pLoading}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "7px 10px" : "8px 16px", background: isVerified ? "rgba(239,68,68,0.1)" : "rgba(212,175,55,0.12)", border: `1px solid ${isVerified ? "rgba(239,68,68,0.3)" : "rgba(212,175,55,0.35)"}`, borderRadius: 10, color: isVerified ? "#f87171" : "#D4AF37", fontSize: 11, cursor: "pointer", fontWeight: 600, opacity: (acting["verify"] || pLoading) ? 0.5 : 1 }}>
            <ShieldCheck size={12} />{!isMobile && (isVerified ? "Unverify" : "Verify KYC")}
          </button>
          <button
            onClick={() => doAct("status", () => updateDriverStatus(driverId, !isActive), isActive ? "Driver blocked." : "Driver unblocked.")}
            disabled={acting["status"] || isSuspended || pLoading}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "7px 10px" : "8px 16px", background: isActive ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${isActive ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`, borderRadius: 10, color: isActive ? "#f87171" : "#4ade80", fontSize: 11, cursor: isSuspended ? "not-allowed" : "pointer", fontWeight: 600, opacity: (acting["status"] || isSuspended || pLoading) ? 0.4 : 1 }}>
            {isActive ? <UserX size={12} /> : <UserCheck size={12} />}
            {!isMobile && (isActive ? "Block" : "Unblock")}
          </button>
        </div>
      </div>

      {/* ── PAGE CONTENT ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "20px 14px 60px" : "28px 24px 60px" }}>

        {pLoading ? (
          /* Loading skeleton */
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[120, 100, 80, 200, 200].map((h, i) => (
              <div key={i} style={{ height: h, background: "rgba(255,255,255,0.04)", borderRadius: 18, animation: "gmPulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : !p ? (
          <div style={{ textAlign: "center", padding: 80, color: "rgba(255,255,255,0.35)" }}>
            Failed to load driver profile.
          </div>
        ) : (
          <>
            {/* ── PROFILE CARD ── */}
            <div style={{ ...cardStyle, background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.15)" }}>
              <div style={{ display: "flex", alignItems: isMobile ? "center" : "flex-start", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 14 : 22 }}>

                {/* Avatar */}
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(212,175,55,0.12)", border: "2px solid rgba(212,175,55,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                  {(p.profile_photo_url || p.profilePicture || p.profile_picture)
                    ? <img src={p.profile_photo_url || p.profilePicture || p.profile_picture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                    : <User size={32} color="rgba(212,175,55,0.5)" />
                  }
                </div>

                {/* Name + contact + badges */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Cinzel,serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                    {p.full_name || p.fullName || p.name || "—"}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
                    {(p.phone_number || p.phone) && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                        <Phone size={12} color="rgba(212,175,55,0.5)" />{p.phone_number || p.phone}
                      </span>
                    )}
                    {p.email && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                        <Mail size={12} color="rgba(212,175,55,0.4)" />{p.email}
                      </span>
                    )}
                    {(p.rating || p.average_rating) && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#f59e0b" }}>
                        <Star size={12} fill="#f59e0b" />{parseFloat(p.rating || p.average_rating).toFixed(1)}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: isActive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)", color: isActive ? "#4ade80" : "#f87171", border: `1px solid ${isActive ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.25)"}` }}>
                      {isActive ? <CheckCircle size={11} /> : <XCircle size={11} />}
                      {isActive ? "Active" : "Blocked"}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: isVerified ? "rgba(212,175,55,0.1)" : "rgba(148,163,184,0.08)", color: isVerified ? "#D4AF37" : "#94a3b8", border: `1px solid ${isVerified ? "rgba(212,175,55,0.3)" : "rgba(148,163,184,0.15)"}` }}>
                      {isVerified ? <ShieldCheck size={11} /> : <ShieldX size={11} />}
                      {isVerified ? "KYC Verified" : "KYC Pending"}
                    </span>
                    {isSuspended && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                        <AlertTriangle size={11} />Suspended
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {(p.suspension_reason || p.suspensionReason) && (
                <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: "#f87171", textTransform: "uppercase", letterSpacing: "1px" }}>Suspension Reason: </span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{p.suspension_reason || p.suspensionReason}</span>
                </div>
              )}
            </div>

            {/* ── STATS ── */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
              <StatCard icon={<Car size={16} />} label="Total Rides" value={fmtNum(p.total_rides || p.totalRides || 0)} />
              <StatCard icon={<Wallet size={16} />} label="Total Earnings" value={`₹${fmtNum(p.total_earnings || p.totalEarnings || 0)}`} color="#4ade80" />
              <StatCard icon={<XCircle size={16} />} label="Cancellation" value={(p.cancellation_rate || p.cancellationRate) ? `${p.cancellation_rate || p.cancellationRate}%` : "—"} color="#f87171" />
              <StatCard icon={<Wallet size={16} />} label="Wallet Balance" value={`₹${fmtNum(p.wallet_balance ?? p.walletBalance ?? 0)}`} color="#a78bfa" />
            </div>

            {/* ── ACCOUNT INFO ── */}
            <div style={cardStyle}>
              <SectionHead icon={<Calendar size={15} />} title="Account Info" />
              <InfoRow label="Joined"      value={fmtDate(p.created_at || p.createdAt)} />
              <InfoRow label="Last Login"  value={fmtDate(p.last_login || p.lastLogin || p.updated_at || p.updatedAt)} />
              <InfoRow label="Verified At" value={(p.verified_at || p.verifiedAt) ? fmtDate(p.verified_at || p.verifiedAt) : "Not verified yet"} />
              <InfoRow label="Driver ID"   value={driverId} />
            </div>

            {/* ── VEHICLE INFO ── */}
            <div style={cardStyle}>
              <SectionHead icon={<Car size={15} />} title="Vehicle Details" />
              {vehicleInfo.number || vehicleInfo.model ? (
                <>
                  {/* Plate + commercial badges */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                    {vehicleInfo.plateColor && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: vehicleInfo.plateColor.toUpperCase() === "YELLOW" ? "rgba(234,179,8,0.15)" : "rgba(148,163,184,0.12)",
                        color:      vehicleInfo.plateColor.toUpperCase() === "YELLOW" ? "#facc15" : "#94a3b8",
                        border:     `1px solid ${vehicleInfo.plateColor.toUpperCase() === "YELLOW" ? "rgba(234,179,8,0.4)" : "rgba(148,163,184,0.25)"}`,
                      }}>
                        {vehicleInfo.plateColor.toUpperCase() === "YELLOW" ? "🟡" : "⬜"} {vehicleInfo.plateColor.toUpperCase()} PLATE
                      </span>
                    )}
                    {vehicleInfo.isCommercial === true && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(251,146,60,0.12)", color: "#fb923c", border: "1px solid rgba(251,146,60,0.3)" }}>
                        Commercial Vehicle
                      </span>
                    )}
                    {vehicleInfo.vahanVerified === false && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                        <AlertTriangle size={11} /> VAHAN Unverified
                      </span>
                    )}
                    {vehicleInfo.vahanVerified === true && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }}>
                        <CheckCircle size={11} /> VAHAN Verified
                      </span>
                    )}
                    {vehicleInfo.rcStatus && (
                      <DocStatusBadge status={vehicleInfo.rcStatus} />
                    )}
                  </div>

                  {/* Expired registration warning */}
                  {vehicleInfo.isExpired && (
                    <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertTriangle size={14} color="#f87171" />
                      <span style={{ fontSize: 13, color: "#f87171", fontWeight: 600 }}>Registration EXPIRED — Valid till {vehicleInfo.regValidity}</span>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                    {[
                      ["Vehicle Type",    Array.isArray(vehicleInfo.type) ? vehicleInfo.type.join(", ") : vehicleInfo.type],
                      ["Reg Number",      vehicleInfo.number],
                      ["Model",           vehicleInfo.model],
                      ["Color",           vehicleInfo.color],
                      ["RC Owner",        vehicleInfo.ownerName],
                      ["Valid Till",      vehicleInfo.regValidity],
                      ["Categories",      vehicleInfo.categories ? vehicleInfo.categories.join(", ") : null],
                    ].map(([label, val]) => val ? (
                      <div key={label} style={{
                        padding: "12px 16px",
                        background: label === "Valid Till" && vehicleInfo.isExpired ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.025)",
                        border: `1px solid ${label === "Valid Till" && vehicleInfo.isExpired ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)"}`,
                        borderRadius: 10,
                      }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 14, color: label === "Valid Till" && vehicleInfo.isExpired ? "#f87171" : "#fff", fontWeight: 600 }}>{val}</div>
                      </div>
                    ) : null)}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", padding: "12px 0" }}>
                  {dLoading ? "Loading vehicle info…" : "Vehicle RC not submitted yet."}
                </div>
              )}
            </div>

            {/* ── KYC DOCUMENTS ── */}
            <div style={{ marginBottom: 20 }}>
              <SectionHead icon={<CreditCard size={15} />} title="KYC Documents" badge={dLoading ? "…" : `${kyc5.length} docs`} />

              {dLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: 120, background: "rgba(255,255,255,0.03)", borderRadius: 16, animation: "gmPulse 1.5s ease-in-out infinite" }} />
                  ))}
                </div>
              ) : kyc5.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
                  <CreditCard size={30} color="rgba(255,255,255,0.1)" style={{ marginBottom: 10 }} />
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>No documents uploaded yet</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {kyc5.map((doc) => {
                    const docId  = doc.id;
                    const status = (doc.status || "pending").toLowerCase();
                    const needsReview = status === "manual_review";
                    const borderColor = (status === "approved" || status === "auto_verified") ? "rgba(34,197,94,0.2)"
                      : status === "rejected"      ? "rgba(239,68,68,0.18)"
                      : status === "manual_review" ? "rgba(245,158,11,0.2)"
                      : "rgba(255,255,255,0.08)";

                    const docLabel = (doc.document_type || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

                    return (
                      <div key={docId} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${borderColor}`, borderRadius: 16, overflow: "hidden" }}>
                        <div style={{ padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start", flexDirection: isMobile ? "column" : "row" }}>
                          {/* Doc thumbnail */}
                          {doc.file_url && (
                            <div
                              onClick={() => setImgPrev(doc.file_url)}
                              style={{ width: 70, height: 70, borderRadius: 10, overflow: "hidden", flexShrink: 0, cursor: "pointer", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)" }}>
                              <img src={doc.file_url} alt="doc" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={e => { e.target.parentNode.style.display = "none"; }} />
                            </div>
                          )}

                          {/* Doc info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                              <span style={{ fontFamily: "Cinzel,serif", fontSize: 14, fontWeight: 700, color: "#fff" }}>{docLabel}</span>
                              <DocStatusBadge status={doc.status} />
                            </div>

                            {doc.document_number && (
                              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 4, fontFamily: "monospace" }}>{doc.document_number}</div>
                            )}
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                              Updated {fmtDate(doc.updated_at)} · Attempts: {doc.attempt_count ?? 0}
                            </div>
                            {doc.rejection_reason && (
                              <div style={{ marginTop: 6, fontSize: 12, color: "#f87171" }}>Reason: {doc.rejection_reason}</div>
                            )}

                            {/* View + Actions */}
                            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
                              {doc.file_url && (
                                <button onClick={() => setImgPrev(doc.file_url)}
                                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 8, color: "#D4AF37", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                                  <ExternalLink size={11} />View Document
                                </button>
                              )}
                              {needsReview && (
                                <>
                                  <button onClick={() => doAct("doc" + docId, () => approveDocument(docId), "Document approved.")}
                                    disabled={acting["doc" + docId]}
                                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, color: "#4ade80", fontSize: 11, cursor: "pointer", fontWeight: 600, opacity: acting["doc" + docId] ? 0.5 : 1 }}>
                                    <FileCheck size={11} />Approve
                                  </button>
                                  <button onClick={() => setRejectDocId(docId)}
                                    disabled={acting["doc" + docId]}
                                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, color: "#f87171", fontSize: 11, cursor: "pointer", fontWeight: 600, opacity: acting["doc" + docId] ? 0.5 : 1 }}>
                                    <FileX size={11} />Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Extracted data */}
                        <div style={{ padding: "0 20px 18px" }}>
                          <ExtractedDataSection doc={doc} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── BANK ACCOUNT ── */}
            <div style={cardStyle}>
              <SectionHead icon={<Wallet size={15} />} title="Bank Account" />
              {dLoading ? (
                <div style={{ height: 80, background: "rgba(255,255,255,0.03)", borderRadius: 12, animation: "gmPulse 1.5s ease-in-out infinite" }} />
              ) : !bankDoc ? (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", padding: "8px 0" }}>
                  Driver has not submitted bank details yet.
                </div>
              ) : (() => {
                let ext = bankDoc.extracted_data || {};
                if (typeof ext === "string") { try { ext = JSON.parse(ext); } catch { ext = {}; } }
                const needsReview = (bankDoc.status || "").toLowerCase() === "manual_review";
                return (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 3 }}>
                          {ext.holder_name || ext.account_holder || "—"}
                        </div>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
                          {ext.account_masked || "Account number not available"}
                        </div>
                      </div>
                      <DocStatusBadge status={bankDoc.status} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                      <ExtractedField label="Bank Name"      value={ext.bank_name} />
                      <ExtractedField label="IFSC"           value={ext.ifsc} mono />
                      <ExtractedField label="Branch"         value={ext.branch} />
                      <ExtractedField label="City"           value={ext.city} />
                      <ExtractedField label="Account Status" value={ext.account_status} />
                      <ExtractedField label="Name Match"     value={ext.name_match_result} />
                      <ExtractedField label="Match Score"    value={ext.name_match_score != null ? `${ext.name_match_score}%` : null} />
                    </div>
                    {needsReview && (
                      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                        <button onClick={() => doAct("doc" + bankDoc.id, () => approveDocument(bankDoc.id), "Bank account approved.")}
                          disabled={acting["doc" + bankDoc.id]}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, color: "#4ade80", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                          <FileCheck size={11} />Approve Bank
                        </button>
                        <button onClick={() => setRejectDocId(bankDoc.id)}
                          disabled={acting["doc" + bankDoc.id]}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, color: "#f87171", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                          <FileX size={11} />Reject Bank
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

          </>
        )}
      </div>
    </div>
  );
}
