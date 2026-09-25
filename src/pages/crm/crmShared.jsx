// CRM pages ke shared helpers — data hook, role, status pills, formatters, upar ki status bar (dry run / kill switch).
// Design admin dashboard ka hi (components/ui): Card, PageWrapper, GlobalStyles, gold/navy.
import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { Octagon, FlaskConical, Activity, Loader2 } from "lucide-react";
import { Card, GlobalStyles, PageWrapper, ToastProvider, useToast } from "../../components/ui";
import { crmGet, crmPatch, crmErrorText } from "../../api/crm";

// ── data ─────────────────────────────────────────────────────────────────────
// useCrm("/journeys") → { data, error, loading, reload }. refreshMs = har itne ms pe chup-chaap dobara.
export function useCrm(path, { params, refreshMs, skip } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: !skip });
  const key = path + JSON.stringify(params || {});
  const alive = useRef(true);
  const load = useCallback((quiet) => {
    if (skip || !path) return Promise.resolve();
    if (!quiet) setState((s) => ({ ...s, loading: true }));
    return crmGet(path, params)
      .then((data) => alive.current && setState({ data, error: null, loading: false }))
      .catch((e) => alive.current && setState((s) => ({ data: quiet ? s.data : null, error: crmErrorText(e), loading: false })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, skip]);
  useEffect(() => {
    alive.current = true;
    load();
    const t = refreshMs ? setInterval(() => load(true), refreshMs) : null;
    return () => { alive.current = false; if (t) clearInterval(t); };
  }, [load, refreshMs]);
  return { ...state, reload: () => load(true) };
}

// CRM role (backend se): marketer < approver < admin. Buttons isi se chhupte hain; asli rok backend pe hai.
let meCache = null;
export function useCrmMe() {
  const [me, setMe] = useState(meCache);
  useEffect(() => {
    if (meCache) return;
    crmGet("/auth/me").then((m) => { meCache = m; setMe(m); }).catch(() => setMe({ role: null }));
  }, []);
  return me;
}
const RANK = { marketer: 1, approver: 2, admin: 3 };
export const can = (me, min) => (RANK[me?.role] || 0) >= RANK[min];

// ── formatters ───────────────────────────────────────────────────────────────
export const inr = (n) => (n == null ? "—" : "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }));
export const num = (n) => (n == null ? "—" : Number(n).toLocaleString("en-IN"));
export const pct = (r) => (r == null ? "—" : (r * 100).toFixed(r < 0.1 ? 1 : 0) + "%");
export const dt = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
export const ago = (sec) => (sec == null ? "—" : sec < 90 ? `${sec}s pehle` : sec < 5400 ? `${Math.round(sec / 60)} min pehle` : `${Math.round(sec / 3600)} ghante pehle`);

// ── pill (Badge jaisa style, par apna tone) ──────────────────────────────────
const TONES = {
  green: ["rgba(52,211,153,0.1)", "rgba(52,211,153,0.25)", "#34D399"],
  gold: ["rgba(212,175,55,0.1)", "rgba(212,175,55,0.28)", "#D4AF37"],
  red: ["rgba(248,113,113,0.1)", "rgba(248,113,113,0.26)", "#F87171"],
  blue: ["rgba(96,165,250,0.1)", "rgba(96,165,250,0.24)", "#60A5FA"],
  orange: ["rgba(245,158,11,0.1)", "rgba(245,158,11,0.25)", "#F59E0B"],
  purple: ["rgba(167,139,250,0.1)", "rgba(167,139,250,0.28)", "#A78BFA"],
  gray: ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.12)", "rgba(255,255,255,0.5)"],
};
export function Pill({ tone = "gray", children, title }) {
  const [bg, br, tx] = TONES[tone] || TONES.gray;
  return (
    <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 100, fontSize: 10.5, fontWeight: 600, fontFamily: "Outfit,sans-serif", whiteSpace: "nowrap", background: bg, border: `1px solid ${br}`, color: tx }}>
      {children}
    </span>
  );
}

const STATUS = {
  // campaign
  draft: ["gray", "Draft"], pending_approval: ["gold", "Approval baaki"], approved: ["blue", "Approved"],
  sending: ["purple", "Bhej rahe hain"], sent: ["green", "Bhej diya"], paused: ["orange", "Ruka hua"], cancelled: ["red", "Cancelled"],
  // journey run
  active: ["blue", "Chal rahi"], goal_met: ["green", "Goal poora"], completed: ["gray", "Khatam"], exited: ["gray", "Nikla"], expired: ["orange", "Expired"],
  // message
  dry_run: ["purple", "Dry run"], queued: ["gray", "Queue mein"], delivered: ["green", "Delivered"], read: ["green", "Padha"],
  failed: ["red", "Failed"], skipped: ["orange", "Roka gaya"], blocked: ["red", "Blocked"],
};
export const StatusPill = ({ status }) => {
  const [tone, label] = STATUS[status] || ["gray", status || "—"];
  return <Pill tone={tone}>{label}</Pill>;
};

export const CHANNEL = { push: "Push", whatsapp_utility: "WhatsApp (utility)", whatsapp_marketing: "WhatsApp (marketing)", sms: "SMS", email: "Email" };

// ── small UI ─────────────────────────────────────────────────────────────────
export const Loading = ({ text = "Load ho raha hai…" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 24, color: "rgba(255,255,255,0.45)", fontSize: 13, fontFamily: "Outfit,sans-serif" }}>
    <Loader2 size={16} style={{ animation: "crmSpin 1s linear infinite" }} /> {text}
    <style>{`@keyframes crmSpin{to{transform:rotate(360deg)}}`}</style>
  </div>
);
export const ErrorNote = ({ error }) => error ? (
  <div style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.22)", borderRadius: 12, padding: "12px 16px", margin: "0 0 16px", fontSize: 13, color: "#F87171", fontFamily: "Outfit,sans-serif" }}>{error}</div>
) : null;
export const Hint = ({ children }) => (
  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", fontFamily: "Outfit,sans-serif", lineHeight: 1.6 }}>{children}</div>
);
export const Empty = ({ children }) => (
  <div style={{ padding: "28px 20px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 13, fontFamily: "Outfit,sans-serif" }}>{children}</div>
);
export const Section = ({ title, children, style }) => (
  <Card style={{ padding: 20, marginBottom: 16, ...style }}>
    {title && <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", fontFamily: "Outfit,sans-serif", marginBottom: 12 }}>{title}</div>}
    {children}
  </Card>
);

// ── status bar: har CRM page ke upar ─────────────────────────────────────────
function StatusBar() {
  const toast = useToast();
  const me = useCrmMe();
  const settings = useCrm("/settings", { refreshMs: 15000 });
  const health = useCrm("/health", { refreshMs: 30000 });
  const [busy, setBusy] = useState(false);
  const s = settings.data;

  async function toggleKill() {
    const on = s.globalKillSwitch;
    const msg = on ? "Kill switch OFF karein? Saare CRM messages phir se jaane lagenge."
      : "KILL SWITCH ON karein? 10 second ke andar CRM ka har message ruk jayega (journeys + campaigns).";
    if (!window.confirm(msg)) return;
    setBusy(true);
    try { await crmPatch("/settings", { globalKillSwitch: !on }); settings.reload(); toast?.(on ? "Kill switch OFF" : "Kill switch ON — sab ruk gaya", on ? "success" : "warning"); }
    catch (e) { toast?.(crmErrorText(e), "error"); }
    finally { setBusy(false); }
  }

  if (settings.error) return <ErrorNote error={settings.error} />;
  if (!s) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 18 }}>
      {s.dryRun
        ? <Pill tone="purple"><FlaskConical size={11} /> DRY RUN — koi asli message nahi ja raha, sirf log</Pill>
        : <Pill tone="green">LIVE — asli messages ja rahe hain</Pill>}
      {health.data && (
        <Pill tone={health.data.ok ? "green" : "red"}><Activity size={11} /> {health.data.ok ? "CRM system OK" : "CRM system mein problem"}</Pill>
      )}
      {health.error && !health.data && <Pill tone="red">CRM system down?</Pill>}
      {me?.role && <Pill tone="gold" title={`Admin role: ${me.rideRole || "—"}`}>CRM role: {me.role}</Pill>}
      <div style={{ flex: 1 }} />
      {s.globalKillSwitch ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 10, background: "rgba(248,113,113,0.18)", border: "1px solid rgba(248,113,113,0.45)", color: "#FCA5A5", fontSize: 12.5, fontWeight: 700, fontFamily: "Outfit,sans-serif" }}>
          <Octagon size={15} /> KILL SWITCH ON — kuch nahi ja raha
          {can(me, "admin") && <button className="btn-outline btn-xs" disabled={busy} onClick={toggleKill}>Turn off</button>}
        </div>
      ) : (
        <button className="btn-danger" disabled={busy} onClick={toggleKill}><Octagon size={14} /> Kill switch</button>
      )}
    </div>
  );
}

// /crm/* ka route layout: toast provider + admin ki global CSS. Provider UPAR hai taaki pages ke apne hooks
// (useAction) ko bhi toast mile.
export function CrmLayout() {
  return (
    <ToastProvider>
      <GlobalStyles />
      <Outlet />
    </ToastProvider>
  );
}

// Har CRM page isi mein: title + status bar
export function CrmPage({ title, subtitle, actions, children }) {
  return (
    <PageWrapper title={title} subtitle={subtitle} actions={actions}>
      <StatusBar />
      {children}
    </PageWrapper>
  );
}

// Action button ka busy state + toast (sab pages mein yahi pattern)
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const run = async (name, fn, okMsg) => {
    setBusy(name);
    try { const r = await fn(); if (okMsg) toast?.(okMsg, "success"); return r; }
    catch (e) { toast?.(crmErrorText(e), "error"); return undefined; }
    finally { setBusy(null); }
  };
  return { busy, run };
}
