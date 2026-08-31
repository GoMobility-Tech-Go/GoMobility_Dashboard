import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, Phone, Mail, Star, Shield, ShieldCheck,
  UserCheck, UserX, CheckCircle, XCircle, Clock, Eye,
  CreditCard, FileCheck, X, ExternalLink,
  Calendar, Wallet, AlertTriangle, MapPin,
  Activity, Wifi, ChevronRight,
} from "lucide-react";
import { getUserById, updateUserStatus, getPassengerKycDetail } from "../../api/admin";

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

const fmtDateOnly = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

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

// ── Image preview modal ───────────────────────────────────────────────────────
const ImgPreview = ({ src, onClose }) => (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
      <img src={src} alt="preview" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} />
      <button onClick={onClose} style={{ position: "absolute", top: -14, right: -14, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <X size={14} />
      </button>
    </div>
  </div>
);

// ── KYC flow indicator ────────────────────────────────────────────────────────
const KYC_STEPS = ["not_started", "in_progress", "verified"];
const KYC_LABELS = { not_started: "Not Started", in_progress: "In Progress", verified: "Verified", rejected: "Rejected", suspended: "Suspended" };
const KYC_COLORS = { not_started: "#94a3b8", in_progress: "#facc15", verified: "#4ade80", rejected: "#f87171", suspended: "#f97316" };

function KycFlowBar({ status }) {
  const isRejected  = status === "rejected";
  const isSuspended = status === "suspended";
  const color = KYC_COLORS[status] || "#94a3b8";
  const label = KYC_LABELS[status] || status || "Unknown";

  if (isRejected || isSuspended) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 12, marginBottom: 20 }}>
        <AlertTriangle size={16} color={color} />
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{label}</span>
      </div>
    );
  }

  const currentIdx = KYC_STEPS.indexOf(status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 }}>
      {KYC_STEPS.map((step, i) => {
        const done    = i <= currentIdx;
        const active  = i === currentIdx;
        const sc      = done ? KYC_COLORS[status] : "#334155";
        return (
          <div key={step} style={{ display: "flex", alignItems: "center", flex: i < KYC_STEPS.length - 1 ? 1 : "initial" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: done ? `${sc}20` : "rgba(255,255,255,0.04)",
                border: `2px solid ${done ? sc : "rgba(255,255,255,0.08)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: active ? `0 0 12px ${sc}50` : "none",
              }}>
                {done ? <CheckCircle size={14} color={sc} /> : <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />}
              </div>
              <span style={{ fontSize: 9, color: done ? sc : "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: done ? 700 : 400, whiteSpace: "nowrap" }}>
                {KYC_LABELS[step]}
              </span>
            </div>
            {i < KYC_STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < currentIdx ? `${sc}50` : "rgba(255,255,255,0.06)", margin: "0 6px", marginBottom: 22 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── KYC doc status badge ──────────────────────────────────────────────────────
function DocBadge({ status }) {
  const s = (status || "").toLowerCase();
  const cfg =
    s === "verified"    ? { bg: "rgba(34,197,94,0.12)",  color: "#4ade80", border: "rgba(34,197,94,0.3)",  label: "Verified" }  :
    s === "failed"      ? { bg: "rgba(239,68,68,0.12)",  color: "#f87171", border: "rgba(239,68,68,0.3)",  label: "Failed"   }  :
    s === "processing"  ? { bg: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "rgba(245,158,11,0.3)", label: "Processing" } :
    s === "rejected"    ? { bg: "rgba(239,68,68,0.12)",  color: "#f87171", border: "rgba(239,68,68,0.3)",  label: "Rejected" }  :
                          { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "rgba(148,163,184,0.2)", label: status || "Pending" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {s === "verified" ? <CheckCircle size={10} /> : s === "failed" || s === "rejected" ? <XCircle size={10} /> : <Clock size={10} />}
      {cfg.label}
    </span>
  );
}

// ── Flag chip ─────────────────────────────────────────────────────────────────
function FlagChip({ flag }) {
  return (
    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)", fontWeight: 600 }}>
      {flag.replace(/_/g, " ")}
    </span>
  );
}

// ── Aadhaar doc card ──────────────────────────────────────────────────────────
function AadhaarCard({ doc, onImgClick }) {
  if (!doc) return (
    <div style={{ padding: "20px 0", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
      Aadhaar not submitted yet
    </div>
  );
  const ed = (() => {
    try { return typeof doc.extracted_data === "string" ? JSON.parse(doc.extracted_data) : (doc.extracted_data || {}); }
    catch { return {}; }
  })();

  const fields = [
    ["Name",       ed.name],
    ["Aadhaar",    ed.masked],
    ["DOB",        ed.dob],
    ["Gender",     ed.gender],
    ["Father",     ed.father || ed.father_name],
    ["State",      ed.address?.state || ed.state],
    ["District",   ed.address?.district || ed.district],
    ["Address",    ed.address?.full || ed.address_line],
  ].filter(([, v]) => v);

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "Cinzel,serif", fontSize: 13, fontWeight: 700, color: "#fff" }}>Aadhaar Card</span>
        <DocBadge status={doc.status} />
      </div>

      {/* Images: front + back */}
      <div style={{ padding: "14px 18px", display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { url: doc.file_url,      label: "Front" },
          { url: doc.back_file_url, label: "Back"  },
        ].filter(({ url }) => url).map(({ url, label }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div
              onClick={() => onImgClick(url)}
              style={{ width: 110, height: 70, borderRadius: 10, overflow: "hidden", cursor: "pointer", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.4)", position: "relative" }}
            >
              <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.parentNode.style.display = "none"; }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s", background: "rgba(0,0,0,0.5)" }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                <Eye size={18} color="#fff" />
              </div>
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</span>
            <button onClick={() => onImgClick(url)} style={{ fontSize: 10, color: "#D4AF37", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <ExternalLink size={9} /> View Full
            </button>
          </div>
        ))}
      </div>

      {/* Extracted fields grid */}
      {fields.length > 0 && (
        <div style={{ padding: "0 18px 14px" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Extracted Data</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
            {fields.map(([label, val]) => (
              <div key={label} style={{ padding: "10px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9 }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, fontFamily: label === "Aadhaar" ? "monospace" : "inherit", letterSpacing: label === "Aadhaar" ? "1.5px" : "normal" }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flags */}
      {doc.flags?.length > 0 && (
        <div style={{ padding: "0 18px 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {doc.flags.map(f => <FlagChip key={f} flag={f} />)}
        </div>
      )}

      {/* Meta */}
      <div style={{ padding: "10px 18px", background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 16, flexWrap: "wrap" }}>
        {doc.confidence_score != null && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>OCR Confidence: <strong style={{ color: "rgba(255,255,255,0.6)" }}>{doc.confidence_score}%</strong></span>
        )}
        {doc.attempt_count > 0 && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Attempts: <strong style={{ color: "rgba(255,255,255,0.6)" }}>{doc.attempt_count}</strong></span>
        )}
        {doc.verified_at && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Verified: <strong style={{ color: "rgba(255,255,255,0.6)" }}>{fmtDate(doc.verified_at)}</strong></span>
        )}
      </div>

      {/* Rejection reason */}
      {doc.rejection_reason && (
        <div style={{ padding: "10px 18px", background: "rgba(239,68,68,0.06)", borderTop: "1px solid rgba(239,68,68,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
          <XCircle size={13} color="#f87171" />
          <span style={{ fontSize: 12, color: "#f87171" }}>{doc.rejection_reason}</span>
        </div>
      )}
    </div>
  );
}

// ── Selfie card ───────────────────────────────────────────────────────────────
function SelfieCard({ doc, onImgClick }) {
  if (!doc) return (
    <div style={{ padding: "20px 0", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
      Selfie not submitted yet
    </div>
  );
  const ed = (() => {
    try { return typeof doc.extracted_data === "string" ? JSON.parse(doc.extracted_data) : (doc.extracted_data || {}); }
    catch { return {}; }
  })();

  const score     = ed.face_match_score ?? ed.similarity ?? null;
  const threshold = ed.threshold ?? 60;
  const matched   = ed.matched ?? (score != null ? score >= threshold : null);

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "Cinzel,serif", fontSize: 13, fontWeight: 700, color: "#fff" }}>Selfie / Face Match</span>
        <DocBadge status={doc.status} />
      </div>

      <div style={{ padding: "14px 18px", display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Selfie image */}
        {doc.file_url && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div
              onClick={() => onImgClick(doc.file_url)}
              style={{ width: 80, height: 80, borderRadius: 12, overflow: "hidden", cursor: "pointer", border: "2px solid rgba(212,175,55,0.2)", background: "rgba(0,0,0,0.4)" }}
            >
              <img src={doc.file_url} alt="Selfie" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.parentNode.style.display = "none"; }} />
            </div>
            <button onClick={() => onImgClick(doc.file_url)} style={{ fontSize: 10, color: "#D4AF37", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <ExternalLink size={9} /> View
            </button>
          </div>
        )}

        {/* Face match score */}
        <div style={{ flex: 1 }}>
          {score != null && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Face Match Score</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: matched ? "#4ade80" : "#f87171", fontVariantNumeric: "tabular-nums" }}>{score}%</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>threshold {threshold}%</span>
              </div>
              {/* Progress bar */}
              <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, score)}%`, background: matched ? "#4ade80" : "#f87171", borderRadius: 3, transition: "width 0.6s ease" }} />
              </div>
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                {matched
                  ? <><CheckCircle size={12} color="#4ade80" /><span style={{ fontSize: 12, color: "#4ade80", fontWeight: 600 }}>Face matched</span></>
                  : <><XCircle size={12} color="#f87171" /><span style={{ fontSize: 12, color: "#f87171", fontWeight: 600 }}>Face not matched</span></>
                }
              </div>
            </div>
          )}
          {ed.status && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Provider status: <span style={{ color: "rgba(255,255,255,0.7)" }}>{ed.status}</span></div>
          )}
        </div>
      </div>

      {/* Flags */}
      {doc.flags?.length > 0 && (
        <div style={{ padding: "0 18px 12px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {doc.flags.map(f => <FlagChip key={f} flag={f} />)}
        </div>
      )}

      {/* Meta */}
      <div style={{ padding: "10px 18px", background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 16, flexWrap: "wrap" }}>
        {doc.attempt_count > 0 && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Attempts: <strong style={{ color: "rgba(255,255,255,0.6)" }}>{doc.attempt_count}</strong></span>
        )}
        {doc.fraud_score != null && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Fraud Score: <strong style={{ color: doc.fraud_score > 70 ? "#f87171" : "rgba(255,255,255,0.6)" }}>{doc.fraud_score}</strong></span>
        )}
        {doc.verified_at && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Verified: <strong style={{ color: "rgba(255,255,255,0.6)" }}>{fmtDate(doc.verified_at)}</strong></span>
        )}
      </div>

      {doc.rejection_reason && (
        <div style={{ padding: "10px 18px", background: "rgba(239,68,68,0.06)", borderTop: "1px solid rgba(239,68,68,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
          <XCircle size={13} color="#f87171" />
          <span style={{ fontSize: 12, color: "#f87171" }}>{doc.rejection_reason}</span>
        </div>
      )}
    </div>
  );
}

// ── Section head ──────────────────────────────────────────────────────────────
const SectionHead = ({ icon, title }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
    <span style={{ color: "rgba(212,175,55,0.7)" }}>{icon}</span>
    <span style={{ fontFamily: "Cinzel,serif", fontSize: 14, fontWeight: 700, color: "#fff" }}>{title}</span>
  </div>
);

// ── Info row ──────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value, mono }) => value ? (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.7px", flexShrink: 0, paddingRight: 12 }}>{label}</span>
    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500, textAlign: "right", fontFamily: mono ? "monospace" : "inherit" }}>{value}</span>
  </div>
) : null;

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color = "#D4AF37" }) => (
  <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.9px" }}>{label}</span>
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{value}</div>
  </div>
);

// ── KYC overall badge ──────────────────────────────────────────────────────────
function KycStatusBadge({ status }) {
  const color = KYC_COLORS[status] || "#94a3b8";
  const label = KYC_LABELS[status] || status || "Unknown";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}30` }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />{label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function PassengerDetailPage() {
  const { passengerId } = useParams();
  const { state }       = useLocation();
  const navigate        = useNavigate();
  const w               = useWidth();
  const isMobile        = w < 640;
  const isTablet        = w < 900;

  const [profile,   setProfile]   = useState(null);
  const [kycData,   setKycData]   = useState(null);
  const [pLoading,  setPLoading]  = useState(true);
  const [kLoading,  setKLoading]  = useState(true);
  const [acting,    setActing]    = useState({});
  const [imgPrev,   setImgPrev]   = useState(null);
  const [toast,     setToast]     = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load user profile
  useEffect(() => {
    if (!passengerId) return;
    setPLoading(true);
    getUserById(passengerId)
      .then(res => setProfile(res.data?.data || res.data))
      .catch(() => setProfile(null))
      .finally(() => setPLoading(false));
  }, [passengerId]);

  // Load KYC data
  useEffect(() => {
    if (!passengerId) return;
    setKLoading(true);
    getPassengerKycDetail(passengerId)
      .then(res => setKycData(res.data?.data || res.data))
      .catch(() => setKycData(null))
      .finally(() => setKLoading(false));
  }, [passengerId]);

  const doAct = async (key, fn, msg) => {
    setActing(p => ({ ...p, [key]: true }));
    try { await fn(); showToast(msg); }
    catch (e) { showToast(e.response?.data?.message || "Action failed.", "error"); }
    finally { setActing(p => ({ ...p, [key]: false })); }
  };

  const p          = profile;
  const isActive   = p?.is_active ?? true;
  const kycStatus  = kycData?.passenger?.status || null;
  const aadhaarDoc = kycData?.documents?.find(d => d.document_type === "AADHAAR") ?? null;
  const selfieDoc  = kycData?.documents?.find(d => d.document_type === "SELFIE")  ?? null;

  const cardStyle = {
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: isMobile ? 16 : 24,
    marginBottom: 16,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020c20", color: "#fff", fontFamily: "Outfit,sans-serif" }}>
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
          onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "7px 12px", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 12, fontFamily: "Outfit,sans-serif", flexShrink: 0 }}>
          <ArrowLeft size={14} />{!isMobile && "Back"}
        </button>
        {!isMobile && <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />}
        <span style={{ fontFamily: "Cinzel,serif", fontSize: isMobile ? 13 : 15, fontWeight: 700, color: "#D4AF37", flexShrink: 0 }}>
          Passenger Profile
        </span>
        {p && !isMobile && (
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            — {p.full_name || p.name}
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexShrink: 0 }}>
          {p && (
            <button
              onClick={() => doAct("status", () => updateUserStatus(p.id, !isActive).then(() => setProfile(prev => prev ? { ...prev, is_active: !isActive } : prev)), isActive ? "Passenger blocked." : "Passenger unblocked.")}
              disabled={acting["status"] || pLoading}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "7px 10px" : "8px 16px", background: isActive ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${isActive ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`, borderRadius: 10, color: isActive ? "#f87171" : "#4ade80", fontSize: 11, cursor: "pointer", fontWeight: 600, opacity: (acting["status"] || pLoading) ? 0.4 : 1 }}>
              {isActive ? <UserX size={12} /> : <UserCheck size={12} />}
              {!isMobile && (isActive ? "Block" : "Unblock")}
            </button>
          )}
        </div>
      </div>

      {/* ── PAGE CONTENT ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "20px 14px 60px" : "28px 24px 60px" }}>

        {pLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[100, 120, 80, 200, 300].map((h, i) => (
              <div key={i} style={{ height: h, background: "rgba(255,255,255,0.04)", borderRadius: 18, animation: "gmPulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : !p ? (
          <div style={{ textAlign: "center", padding: 80, color: "rgba(255,255,255,0.35)" }}>
            Failed to load passenger profile.
          </div>
        ) : (
          <>
            {/* ── PROFILE CARD ── */}
            <div style={{ ...cardStyle, background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.15)", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: isMobile ? "center" : "flex-start", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 14 : 22 }}>
                {/* Avatar */}
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", border: "2px solid rgba(59,130,246,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 32, fontWeight: 800, color: "#fff" }}>
                  {(p.full_name || "P").charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "Cinzel,serif", fontSize: isMobile ? 18 : 22, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                    {p.full_name || "—"}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
                    GO ID: {p.go_id || "—"} · Passenger
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {/* Active/Blocked */}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: isActive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: isActive ? "#4ade80" : "#f87171", border: `1px solid ${isActive ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}` }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? "#4ade80" : "#f87171" }} />
                      {isActive ? "Active" : "Blocked"}
                    </span>
                    {/* KYC status */}
                    {kycStatus && <KycStatusBadge status={kycStatus} />}
                    {p.is_test_user && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)" }}>
                        Test Account
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── STATS ── */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
              <StatCard icon={<CreditCard size={16} />} label="Wallet Balance"  value={`₹${fmtNum(p.wallet_balance || 0)}`} color="#4ade80" />
              <StatCard icon={<Calendar size={16} />}   label="Joined"          value={fmtDateOnly(p.created_at)} color="#D4AF37" />
              <StatCard icon={<Clock size={16} />}      label="Last Login"       value={p.last_login ? fmtDateOnly(p.last_login) : "Never"} color="#60a5fa" />
            </div>

            {/* ── CONTACT ── */}
            <div style={cardStyle}>
              <SectionHead icon={<User size={15} />} title="Contact Information" />
              <InfoRow label="Phone"  value={p.phone_number || "—"} />
              <InfoRow label="Email"  value={p.email || "—"} />
              <InfoRow label="GO ID"  value={p.go_id} mono />
            </div>

            {/* ── ACCOUNT ── */}
            <div style={cardStyle}>
              <SectionHead icon={<Shield size={15} />} title="Account Details" />
              <InfoRow label="Joined"          value={fmtDate(p.created_at)} />
              <InfoRow label="Last Login"      value={p.last_login ? fmtDate(p.last_login) : "Never"} />
              <InfoRow label="Signup City"     value={p.signup_city_name} />
              <InfoRow label="Last Login City" value={p.last_login_city_name} />
              <InfoRow label="Test Account"    value={p.is_test_user ? "Yes" : "No"} />
            </div>

            {/* ── DEVICE ── */}
            {p.device_info && (
              <div style={cardStyle}>
                <SectionHead icon={<Activity size={15} />} title="Device Info" />
                <InfoRow label="OS"          value={p.device_info?.os || p.device_info?.os_version || p.device_info?.platform} />
                <InfoRow label="Model"       value={p.device_info?.model || p.device_info?.device_model} />
                <InfoRow label="App Version" value={p.device_info?.appVersion || p.device_info?.app_version} />
              </div>
            )}

            {/* ── KYC ── */}
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <SectionHead icon={<ShieldCheck size={15} />} title="KYC Verification" />
                {kycStatus && <KycStatusBadge status={kycStatus} />}
              </div>

              {kLoading ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Loading KYC data…</div>
              ) : !kycData ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>No KYC record found for this passenger.</div>
              ) : (
                <>
                  {/* KYC Flow */}
                  <KycFlowBar status={kycStatus} />

                  {/* All flags summary */}
                  {(() => {
                    const allFlags = [
                      ...(aadhaarDoc?.flags || []),
                      ...(selfieDoc?.flags  || []),
                    ].filter((v, i, a) => a.indexOf(v) === i);
                    return allFlags.length > 0 ? (
                      <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 12 }}>
                        <div style={{ fontSize: 10, color: "rgba(251,191,36,0.7)", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 8 }}>Flags Raised</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {allFlags.map(f => <FlagChip key={f} flag={f} />)}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Aadhaar */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Aadhaar Card</div>
                    <AadhaarCard doc={aadhaarDoc} onImgClick={setImgPrev} />
                  </div>

                  {/* Selfie */}
                  <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Selfie</div>
                    <SelfieCard doc={selfieDoc} onImgClick={setImgPrev} />
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
