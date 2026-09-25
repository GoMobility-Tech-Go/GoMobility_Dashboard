// CRM global settings (PRD §2.1) + system health. Badlaav sirf CRM admin (super admin); kill switch ON koi bhi.
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { FormGroup, Toggle, TableCard } from "../../components/ui";
import { crmPatch } from "../../api/crm";
import { CrmPage, useCrm, useCrmMe, useAction, can, Loading, ErrorNote, Pill, Section, Hint, ago } from "./crmShared";

const NUMS = [
  ["frequencyCap.marketingPerWeek", "Marketing messages / hafta (per user)", "PRD: 2"],
  ["frequencyCap.totalPerDay", "Kul messages / din (per user)", "PRD: 3"],
  ["quietHours.startHour", "Quiet hours shuru (IST ghanta, 0–23)", "Is waqt se koi message nahi"],
  ["quietHours.endHour", "Quiet hours khatam (IST ghanta)", "Is waqt ke baad phir se"],
  ["campaignApprovalAboveInr", "Approval chahiye — kharcha isse zyada (₹)", "PRD: ₹500"],
  ["campaignThrottlePerHour", "Campaign max messages / ghanta", "Koi campaign isse tez nahi"],
];
const get = (o, path) => path.split(".").reduce((x, k) => x?.[k], o);
const nest = (flat) => {
  const out = {};
  for (const [path, v] of Object.entries(flat)) {
    const ks = path.split("."); let o = out;
    ks.slice(0, -1).forEach((k) => { o = o[k] ||= {}; });
    o[ks[ks.length - 1]] = v;
  }
  return out;
};

function Health() {
  const { data: h, error } = useCrm("/health", { refreshMs: 15000 });
  if (error && !h) return <ErrorNote error={error} />;
  if (!h) return <Loading />;
  const row = (name, x, extra) => (
    <tr key={name}><td>{name}</td><td><Pill tone={x.ok ? "green" : "red"}>{x.ok ? "OK" : "Problem"}</Pill></td><td style={{ fontSize: 12 }}>{extra}{x.err ? ` — ${x.err}` : ""}{x.lastError ? ` — aakhri error: ${x.lastError}` : ""}</td></tr>
  );
  return (
    <TableCard title={h.ok ? "System health — sab theek" : "System health — dhyan dein"} icon="🩺">
      <table className="gm-table">
        <thead><tr><th>Hissa</th><th>Status</th><th>Detail</th></tr></thead>
        <tbody>
          {Object.entries(h.deps || {}).map(([k, x]) => row(k === "replica" ? "Ride DB (read-only)" : k, x, `${x.ms} ms`))}
          {Object.entries(h.processes || {}).map(([k, x]) => row(`Process: ${k}`, x, x.ok ? `heartbeat ${ago(x.lastBeatSecAgo)}` : ""))}
          {Object.entries(h.loops || {}).map(([k, x]) => row(`Loop: ${k}`, x, x.lastOkSecAgo != null ? `aakhri baar ${ago(x.lastOkSecAgo)}` : "kabhi nahi chala"))}
        </tbody>
      </table>
    </TableCard>
  );
}

export default function CrmSettingsPage() {
  const me = useCrmMe();
  const s = useCrm("/settings");
  const [form, setForm] = useState(null);
  const { busy, run } = useAction();
  const admin = can(me, "admin");

  useEffect(() => {
    if (s.data) setForm(Object.fromEntries([...NUMS.map(([p]) => [p, String(get(s.data, p) ?? "")]), ["dryRun", !!s.data.dryRun], ["transactionalBypassesCaps", !!s.data.transactionalBypassesCaps]]));
  }, [s.data]);

  async function save() {
    const flat = {};
    for (const [p] of NUMS) {
      const v = Number(form[p]);
      if (form[p] === "" || !Number.isInteger(v) || v < 0) return window.alert(`Sahi number daalein: ${p}`);
      if (v !== get(s.data, p)) flat[p] = v;
    }
    for (const k of ["dryRun", "transactionalBypassesCaps"]) if (form[k] !== !!s.data[k]) flat[k] = form[k];
    if (!Object.keys(flat).length) return window.alert("Kuch badla nahi");
    if (flat.dryRun === false && !window.confirm("DRY RUN OFF karein? Ab ASLI messages jaane lagenge (paisa lagega).")) return;
    const r = await run("save", () => crmPatch("/settings", nest(flat)), "Settings save — 10 sec mein har process pe lag jayengi");
    if (r) s.reload();
  }

  return (
    <CrmPage title="CRM Settings" subtitle="Global rules — har journey aur campaign pe lagte hain (PRD §2.1)">
      <ErrorNote error={s.error} />
      {!form ? <Loading /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 16, alignItems: "start" }}>
          <Section title="Rules">
            {!admin && <div style={{ marginBottom: 12 }}><Hint>Sirf CRM admin (super admin) badal sakta hai. Aap dekh sakte hain.</Hint></div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              {NUMS.map(([p, label, hint]) => (
                <FormGroup key={p} label={label} hint={hint}>
                  <input className="gm-input" type="number" min="0" disabled={!admin} value={form[p]} onChange={(e) => setForm((f) => ({ ...f, [p]: e.target.value }))} />
                </FormGroup>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "6px 0 16px" }}>
              <Toggle checked={form.dryRun} onChange={(v) => admin && setForm((f) => ({ ...f, dryRun: v }))} label="Dry run — koi asli message nahi, sirf log (testing ke liye)" />
              <Toggle checked={form.transactionalBypassesCaps} onChange={(v) => admin && setForm((f) => ({ ...f, transactionalBypassesCaps: v }))} label="Transactional messages frequency cap se bahar (quiet hours phir bhi lagte hain)" />
            </div>
            {admin && <button className="btn-gold" disabled={!!busy} onClick={save}><Save size={14} /> {busy ? "Save ho raha…" : "Save"}</button>}
          </Section>
          <div>
            <Health />
            <div style={{ marginTop: 12 }}><Hint>Kill switch upar status bar mein hai — ON karne pe 10 second mein CRM ka har message ruk jaata hai.</Hint></div>
          </div>
        </div>
      )}
    </CrmPage>
  );
}
