// Shared building blocks for the CRM pages — data hook, role checks, status pills, formatters, chart helpers
// and the status bar (dry run / health / kill switch). Visual language comes from components/ui (admin design system).
import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Octagon, FlaskConical, Activity, Loader2, Radio, LogIn, ShieldOff } from "lucide-react";
import { Card, GlobalStyles, PageWrapper, ToastProvider, useToast } from "../../components/ui";
import { crmGet, crmPatch, crmErrorText, crmErrorCode } from "../../api/crm";
import { useAuth } from "../../context/AuthContext";

// ── Data ─────────────────────────────────────────────────────────────────────
// useCrm("/journeys") → { data, error, loading, reload }. refreshMs re-fetches quietly in the background.
export function useCrm(path, { params, refreshMs, skip } = {}) {
  const [state, setState] = useState({ data: null, error: null, errorCode: null, loading: !skip });
  const key = path + JSON.stringify(params || {});
  const alive = useRef(true);
  const load = useCallback((quiet) => {
    if (skip || !path) return Promise.resolve();
    if (!quiet) setState((s) => ({ ...s, loading: true }));
    return crmGet(path, params)
      .then((data) => alive.current && setState({ data, error: null, errorCode: null, loading: false }))
      .catch((e) => alive.current && setState((s) => ({ data: quiet ? s.data : null, error: crmErrorText(e), errorCode: crmErrorCode(e), loading: false })));
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

// CRM role from the backend: marketer < approver < admin. Buttons are hidden accordingly; the backend enforces it.
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
export const ROLE_LABEL = { admin: "CRM Admin", approver: "Approver", marketer: "Marketer" };

// ── Formatters ───────────────────────────────────────────────────────────────
export const inr = (n) => (n == null ? "—" : "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }));
export const num = (n) => (n == null ? "—" : Number(n).toLocaleString("en-IN"));
export const pct = (r) => (r == null ? "—" : (r * 100).toFixed(r < 0.1 && r > 0 ? 1 : 0) + "%");
export const dt = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
export const day = (s) => (s ? new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "");
export const ago = (sec) => (sec == null ? "—" : sec < 90 ? `${sec}s ago` : sec < 5400 ? `${Math.round(sec / 60)} min ago` : `${Math.round(sec / 3600)} h ago`);
export const shortKey = (key) => (key || "").split("_")[0];

// ── Pills ────────────────────────────────────────────────────────────────────
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
  draft: ["gray", "Draft"], pending_approval: ["gold", "Pending approval"], approved: ["blue", "Approved"],
  sending: ["purple", "Sending"], sent: ["green", "Sent"], paused: ["orange", "Paused"], cancelled: ["red", "Cancelled"],
  // journey run
  active: ["blue", "Active"], goal_met: ["green", "Goal met"], completed: ["gray", "Completed"], exited: ["gray", "Exited"], expired: ["orange", "Expired"],
  // message
  dry_run: ["purple", "Dry run"], queued: ["gray", "Queued"], delivered: ["green", "Delivered"], read: ["green", "Read"],
  failed: ["red", "Failed"], skipped: ["orange", "Skipped"], blocked: ["red", "Blocked"],
};
export const statusLabel = (s) => STATUS[s]?.[1] || s || "—";
export const StatusPill = ({ status }) => {
  const [tone, label] = STATUS[status] || ["gray", status || "—"];
  return <Pill tone={tone}>{label}</Pill>;
};
export const CategoryPill = ({ category }) => (
  <Pill tone={category === "transactional" ? "blue" : "gold"}>{category === "transactional" ? "Transactional" : "Marketing"}</Pill>
);

export const CHANNEL = { push: "Push", whatsapp_utility: "WhatsApp (utility)", whatsapp_marketing: "WhatsApp (marketing)", sms: "SMS", email: "Email" };

// ── Charts (recharts, admin dashboard styling) ───────────────────────────────
export const COLORS = { gold: "#D4AF37", blue: "#60A5FA", green: "#34D399", purple: "#A78BFA", orange: "#F59E0B", red: "#F87171", cyan: "#22D3EE", gray: "rgba(255,255,255,0.35)" };
export const CHANNEL_COLOR = { push: COLORS.gold, whatsapp_utility: COLORS.green, whatsapp_marketing: COLORS.cyan, sms: COLORS.blue, email: COLORS.purple };
export const STATUS_COLOR = { sent: COLORS.gold, dry_run: COLORS.purple, delivered: COLORS.green, read: COLORS.cyan, queued: COLORS.gray, failed: COLORS.red, skipped: COLORS.orange, blocked: "#EF4444" };
export const axisTick = { fill: "rgba(255,255,255,0.35)", fontSize: 10 };
export const gridStroke = "rgba(255,255,255,0.05)";

export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(4,8,26,0.95)", border: "1px solid rgba(212,175,55,0.22)", borderRadius: 12, padding: "10px 14px", boxShadow: "0 14px 28px rgba(0,0,0,0.4)", fontFamily: "Outfit,sans-serif" }}>
      {label != null && <div style={{ fontSize: 10.5, color: "rgba(212,175,55,0.7)", marginBottom: 6 }}>{labelFormatter ? labelFormatter(label) : label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey || p.name} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color || p.payload?.color }} />
          {p.name}: <b style={{ color: "#fff" }}>{valueFormatter ? valueFormatter(p.value, p) : num(p.value)}</b>
        </div>
      ))}
    </div>
  );
}

export function ChartCard({ title, subtitle, right, children, height, style }) {
  return (
    <Card style={{ padding: 22, ...style }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "Cinzel,serif", fontSize: 14, color: "#fff", fontWeight: 600 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 3, fontFamily: "Outfit,sans-serif" }}>{subtitle}</div>}
        </div>
        {right}
      </div>
      <div style={height ? { height } : undefined}>{children}</div>
    </Card>
  );
}

export function Legend({ items }) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
      {items.map((d) => (
        <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "Outfit,sans-serif" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{d.name}</span>
          {d.value != null && <span style={{ fontSize: 11, fontWeight: 700, color: d.color }}>{num(d.value)}</span>}
        </div>
      ))}
    </div>
  );
}

export function NoChartData({ height = 180, children = "No data for this period" }) {
  return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.28)", fontSize: 13, fontFamily: "Outfit,sans-serif" }}>{children}</div>;
}

export function RangeButtons({ value, onChange, options = [7, 30, 90] }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map((d) => (
        <button key={d} onClick={() => onChange(d)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid", fontSize: 11, cursor: "pointer", fontWeight: 600, fontFamily: "Outfit,sans-serif", transition: "all .2s", borderColor: value === d ? "#D4AF37" : "rgba(212,175,55,0.2)", background: value === d ? "rgba(212,175,55,0.15)" : "transparent", color: value === d ? "#D4AF37" : "rgba(255,255,255,0.45)" }}>{d}D</button>
      ))}
    </div>
  );
}

// ── Small UI ─────────────────────────────────────────────────────────────────
export const Loading = ({ text = "Loading…" }) => (
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
export const Section = ({ title, subtitle, children, style }) => (
  <Card style={{ padding: 20, marginBottom: 16, ...style }}>
    {title && <div style={{ fontFamily: "Cinzel,serif", fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: subtitle ? 3 : 14 }}>{title}</div>}
    {subtitle && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginBottom: 14, fontFamily: "Outfit,sans-serif" }}>{subtitle}</div>}
    {children}
  </Card>
);
export const Grid = ({ min = 320, gap = 16, children, style }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))`, gap, marginBottom: 16, ...style }}>{children}</div>
);

// ── Status bar (top of every CRM page) ───────────────────────────────────────
function StatusBar() {
  const toast = useToast();
  const me = useCrmMe();
  const settings = useCrm("/settings", { refreshMs: 15000 });
  const health = useCrm("/health", { refreshMs: 30000 });
  const [busy, setBusy] = useState(false);
  const s = settings.data;

  async function toggleKill() {
    const on = s.globalKillSwitch;
    const msg = on ? "Turn the kill switch OFF? All CRM messages will resume."
      : "Turn the KILL SWITCH ON? Every outbound CRM message (journeys and campaigns) stops within 10 seconds.";
    if (!window.confirm(msg)) return;
    setBusy(true);
    try { await crmPatch("/settings", { globalKillSwitch: !on }); settings.reload(); toast?.(on ? "Kill switch turned off" : "Kill switch ON — all messaging stopped", on ? "success" : "warning"); }
    catch (e) { toast?.(crmErrorText(e), "error"); }
    finally { setBusy(false); }
  }

  if (settings.error) return <ErrorNote error={settings.error} />;
  if (!s) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 18 }}>
      {s.dryRun
        ? <Pill tone="purple" title="Messages are logged but not delivered"><FlaskConical size={11} /> Dry run — no real messages are sent</Pill>
        : <Pill tone="green"><Radio size={11} /> Live — messages are being delivered</Pill>}
      {health.data && (
        <Pill tone={health.data.ok ? "green" : "red"}><Activity size={11} /> {health.data.ok ? "All systems operational" : "System issue detected"}</Pill>
      )}
      {health.error && !health.data && <Pill tone="red">CRM service unreachable</Pill>}
      {me?.role && <Pill tone="gold" title={`Admin role: ${me.rideRole || "—"}`}>Role: {ROLE_LABEL[me.role] || me.role}</Pill>}
      <div style={{ flex: 1 }} />
      {s.globalKillSwitch ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 10, background: "rgba(248,113,113,0.18)", border: "1px solid rgba(248,113,113,0.45)", color: "#FCA5A5", fontSize: 12.5, fontWeight: 700, fontFamily: "Outfit,sans-serif" }}>
          <Octagon size={15} /> KILL SWITCH ON — all messaging stopped
          {can(me, "admin") && <button className="btn-outline btn-xs" disabled={busy} onClick={toggleKill}>Turn off</button>}
        </div>
      ) : (
        <button className="btn-danger" disabled={busy} onClick={toggleKill} title="Emergency stop for all CRM messaging"><Octagon size={14} /> Kill switch</button>
      )}
    </div>
  );
}

// Route layout for /crm/*: toast provider + admin global CSS. The provider sits above the pages so page-level
// hooks (useAction) can reach it.
export function CrmLayout() {
  return (
    <ToastProvider>
      <GlobalStyles />
      <style>{`
        .crm-2-1{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px;margin-bottom:16px}
        .crm-1-1{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:16px}
        @media (max-width:1100px){.crm-2-1,.crm-1-1{grid-template-columns:minmax(0,1fr)}}
      `}</style>
      <Outlet />
    </ToastProvider>
  );
}

// Shown instead of the page when the admin session has expired or the role has no CRM access
function AccessCard({ code }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const expired = code === "session_expired";
  const Icon = expired ? LogIn : ShieldOff;
  return (
    <Card style={{ padding: "36px 28px", maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
      <div style={{ width: 54, height: 54, borderRadius: 16, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)" }}>
        <Icon size={24} color="#D4AF37" />
      </div>
      <div style={{ fontFamily: "Cinzel,serif", fontSize: 17, fontWeight: 700, color: "#D4AF37", marginBottom: 8 }}>
        {expired ? "Session expired" : "No CRM access"}
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 20, fontFamily: "Outfit,sans-serif" }}>
        {expired
          ? "Your admin session is no longer valid — usually because you signed in on another device or browser. Please sign in again to continue."
          : "Your admin role is not enabled for the CRM. Ask a super admin to grant access."}
      </div>
      {expired && <button className="btn-gold" onClick={() => { logout(); navigate("/login"); }}><LogIn size={14} /> Sign in again</button>}
    </Card>
  );
}

// Every CRM page: access check, title, status bar
export function CrmPage({ title, subtitle, actions, children }) {
  const gate = useCrm("/auth/me");
  const blocked = ["session_expired", "crm_access_denied"].includes(gate.errorCode);
  return (
    <PageWrapper title={title} subtitle={subtitle} actions={blocked ? undefined : actions}>
      {blocked ? <AccessCard code={gate.errorCode} /> : gate.loading && !gate.data ? <Loading /> : (
        <>
          <StatusBar />
          {children}
        </>
      )}
    </PageWrapper>
  );
}

// Busy state + toast for action buttons
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
