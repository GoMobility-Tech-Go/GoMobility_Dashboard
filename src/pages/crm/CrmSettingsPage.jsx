// CRM global settings (PRD §2.1) and system health. Only CRM admins can change settings; anyone can turn the kill switch on.
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { FormGroup, Toggle, TableCard } from "../../components/ui";
import { crmPatch } from "../../api/crm";
import { CrmPage, useCrm, useCrmMe, useAction, can, Loading, ErrorNote, Pill, Section, Hint, ago } from "./crmShared";

const NUMS = [
  ["frequencyCap.marketingPerWeek", "Marketing messages per week (per contact)", "PRD recommendation: 2"],
  ["frequencyCap.totalPerDay", "Total messages per day (per contact)", "PRD recommendation: 3"],
  ["quietHours.startHour", "Quiet hours start (IST hour, 0–23)", "No messages from this hour"],
  ["quietHours.endHour", "Quiet hours end (IST hour, 0–23)", "Messages resume at this hour"],
  ["campaignApprovalAboveInr", "Approval required above (₹)", "PRD recommendation: ₹500"],
  ["campaignThrottlePerHour", "Campaign messages per hour (max)", "No campaign sends faster than this"],
];
const LABEL = {
  mongo: "Database (MongoDB)", redis: "Queue (Redis)", replica: "Ride data (read-only replica)",
  api: "API", worker: "Worker", ingest: "Data ingest",
  contacts: "Contact sync", signups: "Sign-up events", rides: "Ride events", kyc: "KYC events", online: "Driver online events",
  commerce: "Dues & subscription events", "journey-runner": "Journey runner", "journey-scheduler": "Journey scheduler", "event-requeue": "Event recovery",
};
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
  const row = (group, name, x, extra) => (
    <tr key={group + name}>
      <td>{LABEL[name] || name}<div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)" }}>{group}</div></td>
      <td><Pill tone={x.ok ? "green" : "red"}>{x.ok ? "Healthy" : "Issue"}</Pill></td>
      <td style={{ fontSize: 12 }}>{extra}{x.err ? ` — ${x.err}` : ""}{x.lastError ? ` — last error: ${x.lastError}` : ""}</td>
    </tr>
  );
  return (
    <TableCard title={h.ok ? "System Health — all systems operational" : "System Health — attention needed"} icon="🩺">
      <table className="gm-table">
        <thead><tr><th>Component</th><th>Status</th><th>Details</th></tr></thead>
        <tbody>
          {Object.entries(h.deps || {}).map(([k, x]) => row("Dependency", k, x, `${x.ms} ms`))}
          {Object.entries(h.processes || {}).map(([k, x]) => row("Process", k, x, x.ok ? `Heartbeat ${ago(x.lastBeatSecAgo)}` : ""))}
          {Object.entries(h.loops || {}).map(([k, x]) => row("Background job", k, x, x.lastOkSecAgo != null ? `Last run ${ago(x.lastOkSecAgo)}` : "Has not run yet"))}
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
    for (const [p, label] of NUMS) {
      const v = Number(form[p]);
      if (form[p] === "" || !Number.isInteger(v) || v < 0) return window.alert(`Please enter a whole number for "${label}".`);
      if (v !== get(s.data, p)) flat[p] = v;
    }
    for (const k of ["dryRun", "transactionalBypassesCaps"]) if (form[k] !== !!s.data[k]) flat[k] = form[k];
    if (!Object.keys(flat).length) return window.alert("No changes to save.");
    if (flat.dryRun === false && !window.confirm("Turn dry run OFF? Real messages will start going out and will incur costs.")) return;
    const r = await run("save", () => crmPatch("/settings", nest(flat)), "Settings saved — applied everywhere within 10 seconds");
    if (r) s.reload();
  }

  return (
    <CrmPage title="CRM Settings" subtitle="Global rules applied to every journey and campaign (PRD §2.1)">
      <ErrorNote error={s.error} />
      {!form ? <Loading /> : (
        <div className="crm-1-1" style={{ alignItems: "start" }}>
          <Section title="Messaging Rules">
            {!admin && <div style={{ marginBottom: 12 }}><Hint>Only CRM admins can change these settings.</Hint></div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              {NUMS.map(([p, label, hint]) => (
                <FormGroup key={p} label={label} hint={hint}>
                  <input className="gm-input" type="number" min="0" disabled={!admin} value={form[p]} onChange={(e) => setForm((f) => ({ ...f, [p]: e.target.value }))} />
                </FormGroup>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "6px 0 16px" }}>
              <Toggle checked={form.dryRun} onChange={(v) => admin && setForm((f) => ({ ...f, dryRun: v }))} label="Dry run — log messages without sending them" />
              <Toggle checked={form.transactionalBypassesCaps} onChange={(v) => admin && setForm((f) => ({ ...f, transactionalBypassesCaps: v }))} label="Transactional messages bypass frequency caps (quiet hours still apply)" />
            </div>
            {admin && <button className="btn-gold" disabled={!!busy} onClick={save}><Save size={14} /> {busy ? "Saving…" : "Save changes"}</button>}
          </Section>
          <div>
            <Health />
            <div style={{ marginTop: 12 }}><Hint>The kill switch is in the status bar at the top of every CRM page — it stops all CRM messaging within 10 seconds.</Hint></div>
          </div>
        </div>
      )}
    </CrmPage>
  );
}
