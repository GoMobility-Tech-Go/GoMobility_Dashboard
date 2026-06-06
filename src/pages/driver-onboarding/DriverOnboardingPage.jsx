import { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, ShieldCheck, ShieldX, UserCheck, UserX, X, FileCheck, FileX, AlertTriangle, Eye } from "lucide-react";
import { getDrivers, verifyDriver, updateDriverStatus, getKycQueue, approveDocument, rejectDocument, getFraudAlerts, suspendDriver, getKycDocument } from "../../api/admin";

const fmtDate = (d) => d ? new Date(d).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";

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
    <div style={{ position:"fixed", inset:0, zIndex:1001, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#020d26", border:"1px solid rgba(239,68,68,0.3)", borderRadius:20, padding:28, width:440, maxWidth:"90vw" }} onClick={(e)=>e.stopPropagation()}>
        <h3 style={{ fontFamily:"Cinzel,serif", color:"#f87171", fontSize:15, margin:"0 0 6px" }}>⚠ Suspend Driver Permanently</h3>
        <p style={{ fontSize:12.5, color:"rgba(255,255,255,0.5)", fontFamily:"Outfit,sans-serif", margin:"0 0 20px", lineHeight:1.6 }}>
          Suspending <strong style={{ color:"#fff" }}>{target.name || "this driver"}</strong>. They will not be able to login or accept any rides.
        </p>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block", fontSize:11, color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:7, fontFamily:"Cinzel,serif" }}>Reason *</label>
          <textarea value={reason} onChange={(e)=>setReason(e.target.value)} rows={3} placeholder="e.g. Fake documents submitted" style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"10px 14px", color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", resize:"vertical", boxSizing:"border-box" }} />
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
    <div style={{ position:"fixed", inset:0, zIndex:1002, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
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

const DocViewerModal = ({ docId, onClose }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    getKycDocument(docId)
      .then((res) => setDetail(res.data?.data || res.data))
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [docId]);

  const meta = [
    ["Driver", detail?.driver_name || detail?.driver?.full_name],
    ["Phone", detail?.driver_phone || detail?.driver?.phone_number],
    ["Doc Type", (detail?.document_type || "").replace(/_/g, " ")],
    ["Status", detail?.status],
    ["Submitted", fmtDate(detail?.submitted_at || detail?.created_at)],
  ];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:1003, background:"rgba(0,0,0,0.88)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"#020d26", border:"1px solid rgba(212,175,55,0.2)", borderRadius:20, padding:28, width:580, maxWidth:"92vw", maxHeight:"88vh", overflow:"auto" }} onClick={(e)=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ fontFamily:"Cinzel,serif", color:"#fff", fontSize:15, margin:0 }}>Document Review</h3>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={14}/></button>
        </div>
        {loading ? (
          <div style={{ textAlign:"center", padding:40, color:"rgba(255,255,255,0.4)", fontFamily:"Outfit,sans-serif" }}>Loading document…</div>
        ) : err ? (
          <div style={{ textAlign:"center", padding:40, color:"#f87171", fontFamily:"Outfit,sans-serif" }}>Failed to load document details.</div>
        ) : (
          <>
            {detail?.document_url && !imgError && (
              <div style={{ marginBottom:18, borderRadius:12, overflow:"hidden", border:"1px solid rgba(212,175,55,0.15)", background:"rgba(255,255,255,0.03)" }}>
                <img
                  src={detail.document_url}
                  alt="KYC Document"
                  onError={() => setImgError(true)}
                  style={{ width:"100%", display:"block", maxHeight:320, objectFit:"contain" }}
                />
              </div>
            )}
            {imgError && (
              <div style={{ marginBottom:18, padding:24, borderRadius:12, border:"1px solid rgba(212,175,55,0.1)", background:"rgba(255,255,255,0.02)", textAlign:"center", color:"rgba(255,255,255,0.35)", fontSize:13, fontFamily:"Outfit,sans-serif" }}>
                📄 Image preview unavailable — <a href={detail?.document_url} target="_blank" rel="noreferrer" style={{ color:"#D4AF37" }}>Open original</a>
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {meta.map(([l, v]) => v && (
                <div key={l} style={{ padding:"10px 14px", background:"rgba(255,255,255,0.04)", borderRadius:8 }}>
                  <div style={{ fontSize:10, color:"rgba(212,175,55,0.6)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:3 }}>{l}</div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,0.85)", textTransform:"capitalize" }}>{String(v)}</div>
                </div>
              ))}
              {detail?.extracted_data && Object.entries(detail.extracted_data).map(([k, v]) => (
                <div key={k} style={{ padding:"10px 14px", background:"rgba(255,255,255,0.04)", borderRadius:8 }}>
                  <div style={{ fontSize:10, color:"rgba(212,175,55,0.6)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:3 }}>{k.replace(/_/g," ")}</div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,0.85)" }}>{String(v ?? "—")}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const TABS = ["Drivers", "KYC Queue", "Fraud Alerts"];
const KYC_TYPES = ["", "AADHAAR", "PAN", "DRIVING_LICENCE", "VEHICLE_RC", "SELFIE", "BANK_ACCOUNT"];

export default function DriverOnboardingPage() {
  const [tab, setTab]           = useState("Drivers");
  const [drivers, setDrivers]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState("");
  const [verified, setVerified] = useState("");
  const [offset, setOffset]     = useState(0);
  const [toast, setToast]       = useState(null);
  const [acting, setActing]     = useState({});

  // Modals
  const [suspendTarget, setSuspendTarget] = useState(null);   // { userId, name }
  const [confirmBlock, setConfirmBlock]   = useState(null);   // driver object
  const [rejectTarget, setRejectTarget]   = useState(null);   // docId
  const [viewDocId, setViewDocId]         = useState(null);   // docId

  // KYC
  const [kycDocs, setKycDocs]         = useState([]);
  const [kycLoading, setKycLoading]   = useState(false);
  const [kycTypeFilter, setKycTypeFilter] = useState("");

  // Fraud
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [fraudLoading, setFraudLoading] = useState(false);
  const [severity, setSeverity]       = useState("HIGH");

  const LIMIT = 20;
  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const loadDrivers = useCallback(() => {
    setLoading(true);
    const params = { limit: LIMIT, offset };
    if (search)   params.search     = search;
    if (status)   params.status     = status;
    if (verified !== "") params.is_verified = verified;
    getDrivers(params)
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setDrivers(d.drivers || d.items || d.data || []);
        setTotal(d.pagination?.total || d.total || 0);
      })
      .catch(() => showToast("Failed to load drivers.", "error"))
      .finally(() => setLoading(false));
  }, [search, status, verified, offset]);

  const loadKyc = useCallback(() => {
    setKycLoading(true);
    const params = { limit: 20, page: 1 };
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
    try { await fn(); showToast(successMsg); loadDrivers(); }
    catch (err) { showToast(err.response?.data?.message || "Action failed.", "error"); }
    finally { setActing((p) => ({ ...p, [key]: false })); }
  };

  const executeSuspend = async (reason) => {
    const { userId, name } = suspendTarget;
    setSuspendTarget(null);
    setActing((p) => ({ ...p, ["sus"+userId]: true }));
    try {
      await suspendDriver(userId, reason);
      showToast(`${name || "Driver"} suspended permanently.`);
      loadDrivers();
      if (tab === "Fraud Alerts") loadFraud();
    } catch (err) {
      showToast(err.response?.data?.message || "Suspend failed.", "error");
    } finally {
      setActing((p) => ({ ...p, ["sus"+userId]: false }));
    }
  };

  const handleApprove = async (docId) => {
    setActing((p) => ({ ...p, [docId]: true }));
    try { await approveDocument(docId); showToast("Document approved."); loadKyc(); }
    catch (err) { showToast(err.response?.data?.message || "Approval failed.", "error"); }
    finally { setActing((p) => ({ ...p, [docId]: false })); }
  };

  const handleReject = async (docId, reason, allowRetry) => {
    setRejectTarget(null);
    setActing((p) => ({ ...p, [docId]: true }));
    try { await rejectDocument(docId, reason, allowRetry); showToast("Document rejected."); loadKyc(); }
    catch (err) { showToast(err.response?.data?.message || "Rejection failed.", "error"); }
    finally { setActing((p) => ({ ...p, [docId]: false })); }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const TH = ({ c }) => <th style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"rgba(212,175,55,0.7)", letterSpacing:"1px", textTransform:"uppercase", borderBottom:"1px solid rgba(212,175,55,0.1)", whiteSpace:"nowrap" }}>{c}</th>;
  const TD = ({ children, style }) => <td style={{ padding:"13px 16px", fontSize:13, color:"rgba(255,255,255,0.8)", borderBottom:"1px solid rgba(255,255,255,0.04)", verticalAlign:"middle", ...style }}>{children}</td>;

  const DriverStatusBadge = ({ d }) => {
    if (d.is_suspended || d.suspended)
      return <Badge label="Suspended" color="#f59e0b" bg="rgba(245,158,11,0.1)" border="rgba(245,158,11,0.3)" />;
    if (d.is_active)
      return <Badge label="Active" color="#4ade80" bg="rgba(34,197,94,0.12)" border="rgba(34,197,94,0.3)" />;
    return <Badge label="Blocked" color="#f87171" bg="rgba(239,68,68,0.12)" border="rgba(239,68,68,0.3)" />;
  };

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {suspendTarget && (
        <SuspendModal
          target={suspendTarget}
          onConfirm={executeSuspend}
          onCancel={() => setSuspendTarget(null)}
        />
      )}

      {confirmBlock && (
        <ConfirmDialog
          msg={`Block driver "${confirmBlock.full_name || confirmBlock.name || "this driver"}"? They won't be able to accept rides.`}
          confirmLabel="Block Driver"
          onConfirm={() => {
            const d = confirmBlock;
            setConfirmBlock(null);
            act(d.id+"s", () => updateDriverStatus(d.id, false), "Driver blocked.");
          }}
          onCancel={() => setConfirmBlock(null)}
        />
      )}

      {rejectTarget && (
        <RejectModal
          onConfirm={(r, a) => handleReject(rejectTarget, r, a)}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      {viewDocId && <DocViewerModal docId={viewDocId} onClose={() => setViewDocId(null)} />}

      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Driver Management</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Total: {total} drivers</p>
      </div>

      {/* Tab Nav */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:"8px 18px", borderRadius:10, border:"1px solid", fontSize:13, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600, transition:"all .2s", borderColor:tab===t?"#D4AF37":"rgba(212,175,55,0.2)", background:tab===t?"rgba(212,175,55,0.12)":"transparent", color:tab===t?"#D4AF37":"rgba(255,255,255,0.5)" }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── DRIVERS TAB ── */}
      {tab === "Drivers" && (
        <>
          <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
            <div style={{ position:"relative", flex:1, minWidth:200 }}>
              <Search size={14} color="rgba(255,255,255,0.3)" style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }} />
              <input value={search} onChange={(e)=>{setSearch(e.target.value);setOffset(0);}} placeholder="Search name or phone…" style={{ width:"100%", height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, paddingLeft:36, paddingRight:12, color:"#fff", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", boxSizing:"border-box" }} />
            </div>
            {[
              { val:status, set:(v)=>{setStatus(v);setOffset(0);}, opts:[["","All Status"],["online","Online"],["offline","Offline"]] },
              { val:verified, set:(v)=>{setVerified(v);setOffset(0);}, opts:[["","All Verified"],["true","Verified"],["false","Unverified"]] },
            ].map(({ val, set, opts }, i) => (
              <select key={i} value={val} onChange={(e)=>set(e.target.value)} style={{ height:40, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"0 14px", color:"rgba(255,255,255,0.8)", fontSize:13, outline:"none", fontFamily:"Outfit,sans-serif", cursor:"pointer" }}>
                {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            ))}
          </div>

          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>
                  {["Name","Phone","Vehicle","Rating","Status","Verified","Joined","Actions"].map((c)=><TH key={c} c={c}/>)}
                </tr></thead>
                <tbody>
                  {loading
                    ? Array(6).fill(0).map((_,i)=>(
                        <tr key={i}><td colSpan={8}><div style={{ height:48, background:"rgba(255,255,255,0.03)", margin:"4px 0", borderRadius:8, animation:"gmPulse 1.5s ease-in-out infinite" }}/></td></tr>
                      ))
                    : drivers.length === 0
                      ? <tr><td colSpan={8} style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>No drivers found</td></tr>
                      : drivers.map((d) => {
                          const isSuspended = d.is_suspended || d.suspended;
                          const userId = d.user_id || d.id;
                          return (
                            <tr key={d.id} onMouseEnter={(e)=>e.currentTarget.style.background="rgba(212,175,55,0.03)"} onMouseLeave={(e)=>e.currentTarget.style.background=""}>
                              <TD><div style={{ fontWeight:600, color:"#fff" }}>{d.full_name || d.name || "—"}</div></TD>
                              <TD>{d.phone_number || "—"}</TD>
                              <TD><span style={{ textTransform:"capitalize", color:"rgba(255,255,255,0.6)" }}>{d.vehicle_type || "—"}{d.vehicle_number ? ` · ${d.vehicle_number}` : ""}</span></TD>
                              <TD><span style={{ color:"#f59e0b", fontWeight:600 }}>{d.rating ? `${d.rating}★` : "—"}</span></TD>
                              <TD><DriverStatusBadge d={d} /></TD>
                              <TD>
                                <Badge label={d.is_verified?"Verified":"Pending"}
                                  color={d.is_verified?"#D4AF37":"#f59e0b"}
                                  bg={d.is_verified?"rgba(212,175,55,0.12)":"rgba(245,158,11,0.1)"}
                                  border={d.is_verified?"rgba(212,175,55,0.3)":"rgba(245,158,11,0.25)"}
                                />
                              </TD>
                              <TD style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{fmtDate(d.created_at)}</TD>
                              <TD>
                                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                                  {/* Block / Unblock */}
                                  <button
                                    onClick={() => {
                                      if (d.is_active) setConfirmBlock(d);
                                      else act(d.id+"s", () => updateDriverStatus(d.id, true), "Driver unblocked.");
                                    }}
                                    disabled={acting[d.id+"s"] || isSuspended}
                                    style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", background:d.is_active?"rgba(239,68,68,0.1)":"rgba(34,197,94,0.1)", border:`1px solid ${d.is_active?"rgba(239,68,68,0.25)":"rgba(34,197,94,0.25)"}`, borderRadius:8, color:d.is_active?"#f87171":"#4ade80", fontSize:11, cursor:isSuspended?"not-allowed":"pointer", fontFamily:"Outfit,sans-serif", opacity:(acting[d.id+"s"]||isSuspended)?0.4:1 }}>
                                    {d.is_active ? <UserX size={12}/> : <UserCheck size={12}/>}
                                    {d.is_active ? "Block" : "Unblock"}
                                  </button>

                                  {/* Suspend */}
                                  {!isSuspended && (
                                    <button
                                      onClick={() => setSuspendTarget({ userId, name: d.full_name || d.name })}
                                      disabled={acting["sus"+userId]}
                                      style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:8, color:"#f59e0b", fontSize:11, cursor:"pointer", fontFamily:"Outfit,sans-serif", opacity:acting["sus"+userId]?0.4:1 }}>
                                      <ShieldX size={12}/> Suspend
                                    </button>
                                  )}

                                  {/* Verify / Unverify */}
                                  <button
                                    onClick={() => act(d.id+"v", () => verifyDriver(d.id, !d.is_verified), `Driver ${d.is_verified?"unverified":"verified"}.`)}
                                    disabled={acting[d.id+"v"]}
                                    title={d.is_verified?"Unverify":"Verify"}
                                    style={{ width:30, height:30, borderRadius:8, border:"none", background:d.is_verified?"rgba(239,68,68,0.12)":"rgba(212,175,55,0.12)", cursor:"pointer", color:d.is_verified?"#f87171":"#D4AF37", display:"flex", alignItems:"center", justifyContent:"center", opacity:acting[d.id+"v"]?0.4:1 }}>
                                    {d.is_verified?<ShieldX size={13}/>:<ShieldCheck size={13}/>}
                                  </button>
                                </div>
                              </TD>
                            </tr>
                          );
                        })
                  }
                </tbody>
              </table>
            </div>
            {total > LIMIT && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderTop:"1px solid rgba(212,175,55,0.08)" }}>
                <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>Page {currentPage} of {totalPages} · {total} total</span>
                <div style={{ display:"flex", gap:8 }}>
                  {[{icon:<ChevronLeft size={14}/>,dis:offset===0,fn:()=>setOffset(Math.max(0,offset-LIMIT))},{icon:<ChevronRight size={14}/>,dis:offset+LIMIT>=total,fn:()=>setOffset(offset+LIMIT)}].map((b,i)=>(
                    <button key={i} onClick={b.fn} disabled={b.dis} style={{ width:32, height:32, borderRadius:8, border:"1px solid rgba(212,175,55,0.2)", background:"transparent", cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center", opacity:b.dis?0.3:1 }}>{b.icon}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── KYC QUEUE TAB ── */}
      {tab === "KYC Queue" && (
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(212,175,55,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
            <span style={{ fontFamily:"Cinzel,serif", fontSize:14, color:"#fff", fontWeight:600 }}>Pending KYC Documents</span>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <select
                value={kycTypeFilter}
                onChange={(e) => setKycTypeFilter(e.target.value)}
                style={{ height:34, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:8, padding:"0 12px", color:"rgba(255,255,255,0.8)", fontSize:12, outline:"none", cursor:"pointer" }}>
                <option value="">All Types</option>
                <option value="AADHAAR">Aadhaar</option>
                <option value="PAN">PAN Card</option>
                <option value="DRIVING_LICENCE">Driving Licence</option>
                <option value="VEHICLE_RC">Vehicle RC</option>
                <option value="SELFIE">Selfie</option>
                <option value="BANK_ACCOUNT">Bank Account</option>
              </select>
              <button onClick={loadKyc} style={{ fontSize:12, color:"rgba(212,175,55,0.7)", background:"none", border:"none", cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>↻ Refresh</button>
            </div>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>
                {["Driver","Doc Type","Status","Submitted","Actions"].map((c)=><TH key={c} c={c}/>)}
              </tr></thead>
              <tbody>
                {kycLoading
                  ? Array(4).fill(0).map((_,i)=>(
                      <tr key={i}><td colSpan={5}><div style={{ height:48, background:"rgba(255,255,255,0.03)", margin:"4px 0", borderRadius:8, animation:"gmPulse 1.5s ease-in-out infinite" }}/></td></tr>
                    ))
                  : kycDocs.length === 0
                    ? <tr><td colSpan={5} style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>No pending KYC documents</td></tr>
                    : kycDocs.map((doc) => (
                      <tr key={doc.id} onMouseEnter={(e)=>e.currentTarget.style.background="rgba(212,175,55,0.03)"} onMouseLeave={(e)=>e.currentTarget.style.background=""}>
                        <TD>
                          <div style={{ fontWeight:600, color:"#fff" }}>{doc.driver?.full_name || doc.driver_name || "—"}</div>
                          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{doc.driver?.phone_number || doc.driver_phone || ""}</div>
                        </TD>
                        <TD><span style={{ textTransform:"capitalize", color:"rgba(255,255,255,0.7)" }}>{(doc.document_type || doc.type || "—").replace(/_/g," ")}</span></TD>
                        <TD><Badge label={doc.status || "Pending"} color="#f59e0b" bg="rgba(245,158,11,0.1)" border="rgba(245,158,11,0.25)" /></TD>
                        <TD style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{fmtDate(doc.created_at || doc.submitted_at)}</TD>
                        <TD>
                          <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                            <button onClick={() => setViewDocId(doc.id)} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.25)", borderRadius:8, color:"#D4AF37", fontSize:12, cursor:"pointer" }}>
                              <Eye size={12}/> View
                            </button>
                            <button onClick={() => handleApprove(doc.id)} disabled={acting[doc.id]} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px", background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:8, color:"#4ade80", fontSize:12, cursor:"pointer", opacity:acting[doc.id]?0.5:1 }}>
                              <FileCheck size={12}/> Approve
                            </button>
                            <button onClick={() => setRejectTarget(doc.id)} disabled={acting[doc.id]} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:8, color:"#f87171", fontSize:12, cursor:"pointer", opacity:acting[doc.id]?0.5:1 }}>
                              <FileX size={12}/> Reject
                            </button>
                          </div>
                        </TD>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── FRAUD ALERTS TAB ── */}
      {tab === "Fraud Alerts" && (
        <>
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            {["HIGH","MEDIUM","LOW"].map((s) => (
              <button key={s} onClick={() => setSeverity(s)} style={{ padding:"7px 16px", borderRadius:10, border:"1px solid", fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif", fontWeight:600, transition:"all .2s", borderColor:severity===s?(s==="HIGH"?"#ef4444":s==="MEDIUM"?"#f59e0b":"#3b82f6"):"rgba(212,175,55,0.2)", background:severity===s?(s==="HIGH"?"rgba(239,68,68,0.12)":s==="MEDIUM"?"rgba(245,158,11,0.1)":"rgba(59,130,246,0.1)"):"transparent", color:severity===s?(s==="HIGH"?"#f87171":s==="MEDIUM"?"#f59e0b":"#60a5fa"):"rgba(255,255,255,0.5)" }}>
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
                      ? <tr><td colSpan={6} style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>No {severity} severity alerts</td></tr>
                      : fraudAlerts.map((a) => {
                          const riskScore = a.risk_score ?? a.riskScore ?? 0;
                          const riskColor = riskScore >= 85 ? "#f87171" : riskScore >= 70 ? "#f59e0b" : "#60a5fa";
                          const driverName = a.driver?.full_name || a.driver_name || "—";
                          const driverUserId = a.driver?.id || a.driver_id || a.user_id;
                          return (
                            <tr key={a.id || a.alert_number} onMouseEnter={(e)=>e.currentTarget.style.background="rgba(212,175,55,0.03)"} onMouseLeave={(e)=>e.currentTarget.style.background=""}>
                              <TD><span style={{ fontFamily:"monospace", color:"rgba(212,175,55,0.7)", fontSize:12 }}>{a.alert_number || a.id}</span></TD>
                              <TD><div style={{ display:"flex", alignItems:"center", gap:6 }}><AlertTriangle size={12} color="#f87171" /><span style={{ fontSize:12 }}>{a.alert_type || a.type || "—"}</span></div></TD>
                              <TD>{driverName}</TD>
                              <TD><span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:`${riskColor}20`, border:`1px solid ${riskColor}40`, color:riskColor }}>{riskScore}</span></TD>
                              <TD><Badge label={a.status || "flagged"} color="#f87171" bg="rgba(239,68,68,0.1)" border="rgba(239,68,68,0.25)" /></TD>
                              <TD>
                                {driverUserId && (
                                  <button
                                    onClick={() => setSuspendTarget({ userId: driverUserId, name: driverName })}
                                    disabled={acting["sus"+driverUserId]}
                                    style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:8, color:"#f59e0b", fontSize:12, cursor:"pointer", opacity:acting["sus"+driverUserId]?0.5:1 }}>
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
