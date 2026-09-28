// Edit a journey from the dashboard (PRD §2.1 — "the whole journey is editable from the UI, no deploy").
// Saving publishes a NEW version: new entries use it, contacts already in the journey finish on their version.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Send, Clock, GitBranch, LogOut, BellRing, Code2, ListChecks } from "lucide-react";
import { FormGroup, Toggle } from "../../components/ui";
import { crmGet, crmPatch } from "../../api/crm";
import { CrmPage, useCrmMe, useAction, can, Section, Hint, ErrorNote, Loading, Pill, CategoryPill, CHANNEL } from "./crmShared";

const EDITABLE = ["name", "category", "trigger", "audience", "limits", "schedule", "priority", "goal", "nodes"];
const ICON = { send: Send, wait: Clock, check: GitBranch, branch: GitBranch, exit: LogOut, notify_ops: BellRing };
const PLACEHOLDERS = [
  ["{{profile.rides7d}}", "rides in the last 7 days"], ["{{profile.rides30d}}", "rides in the last 30 days"],
  ["{{profile.missingDocs}}", "driver's missing documents"], ["{{profile.pendingDuesAmount}}", "dues owed (₹)"],
  ["{{profile.earnings7d}}", "driver earnings, 7 days (₹)"], ["{{ctx.docType}}", "document from the trigger (DL, RC…)"],
  ["{{ctx.expiresOn}}", "expiry date from the trigger"], ["{{ctx.amount}}", "amount from the trigger"],
  ["{{ctx.planName}}", "subscription plan name"], ["{{org.supportPhone}}", "support phone number"],
];

const pick = (j) => JSON.parse(JSON.stringify(Object.fromEntries(EDITABLE.filter((k) => j[k] !== undefined).map((k) => [k, j[k]]))));
const tabLabel = { display: "inline-flex", alignItems: "center", gap: 7 };
const toNum = (v) => (v === "" || v == null ? undefined : Number(v));

// Backend codes like "invalid_journey:node:n3:push_needs_title_and_body,cycle_at:n2" → readable lines
function readableErrors(msg) {
  if (!msg) return null;
  const body = msg.startsWith("invalid_journey:") ? msg.slice(16) : msg;
  return body.split(",")
    .map((p) => p.replace(/^node:(\w+):/, "Step $1 — ").replace(/:/g, ": ").replace(/_/g, " "))
    .join(" · ");
}

function NodeEditor({ n, onChange }) {
  const set = (patch) => onChange({ ...n, ...patch });
  const setContent = (patch) => onChange({ ...n, content: { ...n.content, ...patch } });
  const Icon = ICON[n.type] || GitBranch;
  const header = (label, extra) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <Icon size={15} color="#D4AF37" />
      <b style={{ color: "#fff", fontFamily: "Outfit,sans-serif", fontSize: 13 }}>{n.id}</b>
      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12.5, fontFamily: "Outfit,sans-serif" }}>{label}</span>
      {extra}
    </div>
  );
  const box = (children) => (
    <div style={{ border: "1px solid rgba(212,175,55,0.14)", borderRadius: 14, padding: 14, marginBottom: 10, background: "rgba(255,255,255,0.02)" }}>{children}</div>
  );

  if (n.type === "send") {
    const ch = n.channel;
    const chain = [ch, n.fallback].filter(Boolean);
    return box(<>
      {header(`Send · ${CHANNEL[ch] || ch}${n.fallback ? ` → ${CHANNEL[n.fallback] || n.fallback}` : ""}`, n.category && <CategoryPill category={n.category} />)}
      {chain.includes("push") && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
          <FormGroup label="Push title"><input className="gm-input" value={n.content?.title || ""} onChange={(e) => setContent({ title: e.target.value })} /></FormGroup>
          <FormGroup label="Push body"><input className="gm-input" value={n.content?.body || ""} onChange={(e) => setContent({ body: e.target.value })} /></FormGroup>
        </div>
      )}
      {chain.some((c) => c.startsWith("whatsapp_")) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormGroup label="WhatsApp template (approved by Meta)"><input className="gm-input" value={n.content?.templateName || ""} onChange={(e) => setContent({ templateName: e.target.value })} /></FormGroup>
          <FormGroup label="Template parameters (comma separated)">
            <input className="gm-input" value={(n.content?.params || []).join(", ")}
              onChange={(e) => setContent({ params: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
          </FormGroup>
        </div>
      )}
      {chain.includes("sms") && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <FormGroup label="SMS text (must match the DLT template)"><textarea className="gm-input" rows={2} value={n.content?.body || ""} onChange={(e) => setContent({ body: e.target.value })} /></FormGroup>
          <FormGroup label="MSG91 template ID"><input className="gm-input" value={n.content?.smsTemplateId || ""} onChange={(e) => setContent({ smsTemplateId: e.target.value })} /></FormGroup>
        </div>
      )}
    </>);
  }
  if (n.type === "wait") {
    if (n.untilCtx) {
      return box(<>
        {header(`Wait until ${Math.abs(n.offsetDays || 0)} days ${n.offsetDays < 0 ? "before" : "after"} ${n.untilCtx}`)}
        <div style={{ maxWidth: 220 }}>
          <FormGroup label="Days relative to the date (negative = before)">
            <input className="gm-input" type="number" value={n.offsetDays ?? 0} onChange={(e) => set({ offsetDays: Number(e.target.value) })} />
          </FormGroup>
        </div>
      </>);
    }
    return box(<>
      {header("Wait")}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[["days", "Days"], ["hours", "Hours"], ["minutes", "Minutes"]].map(([k, l]) => (
          <FormGroup key={k} label={l}>
            <input className="gm-input" type="number" min="0" value={n[k] ?? ""} onChange={(e) => set({ [k]: toNum(e.target.value) })} />
          </FormGroup>
        ))}
        <FormGroup label="…or until IST hour" hint="0–23, optional">
          <input className="gm-input" type="number" min="0" max="23" value={n.untilIstHour ?? ""} onChange={(e) => set({ untilIstHour: toNum(e.target.value) })} />
        </FormGroup>
      </div>
    </>);
  }
  if (n.type === "notify_ops") {
    return box(<>
      {header("Alert the ops team")}
      <FormGroup label="Alert text"><textarea className="gm-input" rows={2} value={n.text || ""} onChange={(e) => set({ text: e.target.value })} /></FormGroup>
    </>);
  }
  if (n.type === "check" || n.type === "branch") {
    const c = n.condition || {};
    const what = c.event ? `Did "${c.event}" happen?` : c.profile ? `Profile ${c.profile} ${c.op} ${JSON.stringify(c.value ?? "")}` : c.ctx ? `Trigger ${c.ctx} ${c.op} ${JSON.stringify(c.value)}` : c.ctxDaysUntil ? `More than ${c.value} days until ${c.ctxDaysUntil}?` : "—";
    return box(<>{header("Condition", <Pill>edit in Advanced</Pill>)}<Hint>{what} Yes → {n.yes} · No → {n.no}</Hint></>);
  }
  return box(header(n.type === "exit" ? "End" : n.type));
}

export default function CrmJourneyEditPage() {
  const { key } = useParams();
  const navigate = useNavigate();
  const me = useCrmMe();
  const path = `/journeys/${encodeURIComponent(key)}`;
  const [orig, setOrig] = useState(null);
  const [def, setDef] = useState(null);
  const [mode, setMode] = useState("form");
  const [json, setJson] = useState("");
  const [jsonErr, setJsonErr] = useState(null);
  const [saveErr, setSaveErr] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const { busy, run } = useAction();

  useEffect(() => {
    crmGet(path).then((j) => { setOrig(j); setDef(pick(j)); }).catch(() => setLoadErr("Could not load this journey."));
  }, [path]);

  const dirty = useMemo(() => orig && def && JSON.stringify(pick(orig)) !== JSON.stringify(def), [orig, def]);

  if (loadErr) return <CrmPage title="Edit Journey"><ErrorNote error={loadErr} /></CrmPage>;
  if (!def) return <CrmPage title="Edit Journey"><Loading /></CrmPage>;
  if (me && !can(me, "admin")) return <CrmPage title="Edit Journey"><ErrorNote error="Only CRM admins can edit journeys." /></CrmPage>;

  const set = (patch) => setDef((d) => ({ ...d, ...patch }));
  const setLimits = (patch) => setDef((d) => ({ ...d, limits: { ...d.limits, ...patch } }));
  const setGoal = (patch) => setDef((d) => ({ ...d, goal: { ...(d.goal || {}), ...patch } }));
  const setNode = (i, n) => setDef((d) => ({ ...d, nodes: d.nodes.map((x, j) => (j === i ? n : x)) }));

  function switchMode(m) {
    if (m === "json") { setJson(JSON.stringify(def, null, 2)); setJsonErr(null); }
    if (m === "form" && mode === "json") {
      try { setDef(pick(JSON.parse(json))); setJsonErr(null); } catch (e) { setJsonErr(`Invalid JSON: ${e.message}`); return; }
    }
    setMode(m);
  }

  async function save() {
    setSaveErr(null);
    let body = def;
    if (mode === "json") {
      try { body = pick(JSON.parse(json)); } catch (e) { setJsonErr(`Invalid JSON: ${e.message}`); return; }
    }
    // Validation errors → one readable banner (no raw-code toast on top)
    const r = await run("save", async () => {
      try { return await crmPatch(path, body); }
      catch (e) {
        if (e?.response?.status === 400) { setSaveErr(readableErrors(e.response.data?.error) || "Could not save."); return null; }
        throw e;
      }
    });
    if (!r) return;
    if (!r.changed) { navigate(`/crm/journeys/${encodeURIComponent(key)}`); return; }
    const warn = r.warnings?.length ? ` · Warnings: ${readableErrors(r.warnings.join(","))}` : "";
    window.alert(`Version ${r.version} published. New entries use it; contacts already in the journey finish on their current version.${warn}`);
    navigate(`/crm/journeys/${encodeURIComponent(key)}`);
  }

  const lim = def.limits || {};
  return (
    <CrmPage
      title={`Edit · ${orig.name}`}
      subtitle={`Currently version ${orig.version || 1}. Saving publishes a new version — nothing changes for contacts already in the journey.`}
      actions={<>
        <Link to={`/crm/journeys/${encodeURIComponent(key)}`} className="btn-outline"><ArrowLeft size={14} /> Cancel</Link>
        <button className="btn-gold" disabled={!!busy || (!dirty && mode === "form")} onClick={save}><Save size={14} /> {busy ? "Publishing…" : "Save & publish"}</button>
      </>}
    >
      <div className="tab-nav">
        <button className={`tab-btn ${mode === "form" ? "active" : ""}`} onClick={() => switchMode("form")}><span style={tabLabel}><ListChecks size={14} /> Content & timing</span></button>
        <button className={`tab-btn ${mode === "json" ? "active" : ""}`} onClick={() => switchMode("json")}><span style={tabLabel}><Code2 size={14} /> Advanced (JSON)</span></button>
      </div>
      <ErrorNote error={saveErr} />
      <ErrorNote error={jsonErr} />

      {mode === "form" ? (
        <div className="crm-2-1" style={{ alignItems: "start" }}>
          <div>
            <Section title="Steps" subtitle="Change message text, templates and waiting times. To add, remove or re-order steps use Advanced (JSON).">
              {def.nodes.map((n, i) => <NodeEditor key={n.id} n={n} onChange={(x) => setNode(i, x)} />)}
            </Section>
          </div>
          <div>
            <Section title="General">
              <FormGroup label="Name"><input className="gm-input" value={def.name || ""} onChange={(e) => set({ name: e.target.value })} /></FormGroup>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormGroup label="Priority" hint="Higher wins the daily slot (§2.3)">
                  <input className="gm-input" type="number" min="0" value={def.priority ?? ""} onChange={(e) => set({ priority: toNum(e.target.value) })} />
                </FormGroup>
                <FormGroup label="Message type">
                  <select className="gm-input" value={def.category || "marketing"} onChange={(e) => set({ category: e.target.value })}>
                    <option value="marketing">Marketing</option><option value="transactional">Transactional</option>
                  </select>
                </FormGroup>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <FormGroup label="Goal event" hint="Leave empty for no goal"><input className="gm-input" value={def.goal?.event || ""} onChange={(e) => setGoal({ event: e.target.value || undefined })} /></FormGroup>
                <FormGroup label="Goal window (hours)"><input className="gm-input" type="number" min="1" value={def.goal?.windowH ?? ""} onChange={(e) => setGoal({ windowH: toNum(e.target.value) })} /></FormGroup>
              </div>
            </Section>
            <Section title="Limits">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormGroup label="Max times per contact"><input className="gm-input" type="number" min="1" value={lim.maxPerContact ?? ""} onChange={(e) => setLimits({ maxPerContact: toNum(e.target.value) })} /></FormGroup>
                <FormGroup label="Re-entry cooldown (days)" hint="0 = use max times"><input className="gm-input" type="number" min="0" value={lim.reentryCooldownD ?? ""} onChange={(e) => setLimits({ reentryCooldownD: toNum(e.target.value) })} /></FormGroup>
                <FormGroup label="Max sends per hour"><input className="gm-input" type="number" min="1" placeholder="500 (default)" value={lim.throttlePerHour ?? ""} onChange={(e) => setLimits({ throttlePerHour: toNum(e.target.value) })} /></FormGroup>
              </div>
              <Toggle checked={lim.respectQuietHours !== false} onChange={(v) => setLimits({ respectQuietHours: v })} label="Respect quiet hours" />
            </Section>
            <Section title="Placeholders" subtitle="Use these inside message text">
              {PLACEHOLDERS.map(([p, d]) => (
                <div key={p} style={{ display: "flex", gap: 10, fontSize: 12, fontFamily: "Outfit,sans-serif", padding: "3px 0" }}>
                  <code style={{ color: "#D4AF37" }}>{p}</code><span style={{ color: "rgba(255,255,255,0.45)" }}>{d}</span>
                </div>
              ))}
            </Section>
          </div>
        </div>
      ) : (
        <Section title="Full definition" subtitle="Trigger, audience, limits, goal and every step. Checked on save — a broken flow is never published.">
          <textarea className="gm-input" spellCheck={false} value={json} onChange={(e) => setJson(e.target.value)}
            style={{ minHeight: 520, fontFamily: "Consolas, 'Geist Mono', monospace", fontSize: 12.5, lineHeight: 1.5 }} />
        </Section>
      )}
    </CrmPage>
  );
}
