// App Update — which drivers are on the latest Go Captain version, which are not, and a one-click WhatsApp reminder
// (with each driver's own "your v1.2.4 → new v1.3.6" picture). Data: CRM /app-updates (ride DB users.device_info).
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Smartphone, CheckCircle2, Clock, HelpCircle, Send } from "lucide-react";
import { StatCard, TableCard } from "../../components/ui";
import { crmPost } from "../../api/crm";
import { CrmPage, useCrm, useCrmMe, useAction, can, Loading, ErrorNote, Pill, Hint, Section, Grid, Paged, COLORS, num, dt } from "./crmShared";
import { ContactCell, DownloadButton, dim, soft } from "./crmMessageParts";

const TABS = [["pending", "Pending"], ["updated", "Updated"], ["all", "All drivers"]];
const AREAS = [["ncr", "Delhi NCR"], ["all", "All India"]];
// reminder result filter (API `rem`)
const REMS = [["", "Any"], ["not_sent", "Not reminded yet"], ["reached", "WhatsApp delivered"], ["read", "WhatsApp read"], ["failed", "WhatsApp failed"], ["updated_after", "Updated after reminder"]];
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const WA_TONE = { read: "blue", delivered: "green", sent: "gold", queued: "gray", failed: "red" };
const WA_LABEL = { read: "Read", delivered: "Delivered", sent: "Sent", queued: "Queued", failed: "Failed" };

// Clickable number tile — sets the reminder filter on the table below
function Tile({ label, value, sub, color = "#fff", active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      textAlign: "left", cursor: onClick ? "pointer" : "default", padding: "12px 14px", borderRadius: 12,
      background: active ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${active ? "rgba(212,175,55,0.45)" : "rgba(255,255,255,0.08)"}`, color: "inherit", fontFamily: "Outfit,sans-serif",
    }}>
      <div style={{ fontSize: 10, color: dim, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: soft, marginTop: 3 }}>{sub}</div>}
    </button>
  );
}

// One-off reminder campaign to every pending driver: WhatsApp (image header) with push as fallback
const reminderSpec = () => ({
  name: `App update reminder — ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`,
  category: "marketing", consentMode: "opt_out", liveInDryRun: true,
  segment: { role: "driver", appOutdated: true },
  channel: "whatsapp_utility", fallback: "push",
  content: {
    templateName: "driver_app_update_v1", language: "en",
    templateParams: ["{{name}}", "{{profile.appVersionText}}", "{{profile.appLatest}}"],
    title: "Go Captain update karein — tabhi rides milengi",
    body: "Aapka app {{profile.appVersionText}} hai, naya {{profile.appLatest}} hai. Play Store kholkar Go Captain update karein.",
    card: "app_update",
  },
});

export default function CrmAppUpdatePage() {
  const navigate = useNavigate();
  const me = useCrmMe();
  const [status, setStatus] = useState("pending");
  const [area, setArea] = useState("ncr");
  const [rem, setRem] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const params = { status, area, ...(rem ? { rem } : {}), ...(search ? { q: search } : {}) };
  const d = useCrm("/app-updates", { params, refreshMs: 60000 });
  // funnel tile → show that group across all statuses
  const pick = (k) => { setRem(rem === k ? "" : k); setStatus("all"); };
  const { busy, run } = useAction();
  const r = d.data;

  async function createReminder() {
    if (!window.confirm(`Create a WhatsApp reminder campaign for all ${num(r?.totals?.pending)} pending drivers?\n\nIt sends for real (even though dry run is ON), skips anyone who pressed Stop, and drivers without WhatsApp get a push instead. You will see the cost estimate before it goes out.`)) return;
    const c = await run("reminder", () => crmPost("/campaigns", reminderSpec()), "Campaign draft created — check the estimate, then submit");
    if (c?._id) navigate(`/crm/campaigns/${c._id}`);
  }

  const maxBar = Math.max(1, ...(r?.byVersion || []).map((v) => v.drivers));
  return (
    <CrmPage
      title="App Update"
      subtitle="Go Captain version per driver — who has updated, who still has to, and reminders on WhatsApp"
      actions={
        <>
          <Link to="/crm/journeys/J-24_app_update_reminder" className="btn-outline">Automatic reminders (J-24)</Link>
          {can(me, "admin") && <button className="btn-gold" disabled={!!busy || !r?.totals?.pending} onClick={createReminder}><Send size={14} /> Send reminder to pending drivers</button>}
        </>
      }
    >
      <ErrorNote error={d.error} />
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {AREAS.map(([k, label]) => (
          <button key={k} className={area === k ? "btn-gold btn-sm" : "btn-outline btn-sm"} onClick={() => setArea(k)}>{label}</button>
        ))}
      </div>
      {d.loading && !r && <Loading />}
      {r && (
        <>
          <Grid min={190} style={{ marginBottom: 16 }}>
            <StatCard label={`Latest version${r.latestSource === "auto" ? " (auto)" : ""}`} value={r.latest ? `v${r.latest}` : "—"} icon={Smartphone} />
            <StatCard label="Drivers" value={num(r.totals.drivers)} icon={Smartphone} iconColor={COLORS.blue} iconBg="rgba(96,165,250,0.1)" />
            <StatCard label={`Updated · ${pct(r.totals.updated, r.totals.drivers)}`} value={num(r.totals.updated)} icon={CheckCircle2} iconColor={COLORS.green} iconBg="rgba(52,211,153,0.1)" />
            <StatCard label={`Pending · ${pct(r.totals.pending, r.totals.drivers)}`} value={num(r.totals.pending)} icon={Clock} iconColor={COLORS.orange} iconBg="rgba(251,146,60,0.1)" />
            <StatCard label="Version unknown" value={num(r.totals.unknown)} icon={HelpCircle} iconColor={COLORS.gray} iconBg="rgba(255,255,255,0.05)" />
          </Grid>

          <div style={{ marginBottom: 16 }}>
            <Hint>
              The version is what the app reported at the driver's <b>last login</b>. A driver who updated without logging in again still shows the old
              version until the ride backend saves the version on every app open. "Latest" is set in <Link to="/crm/settings" style={{ color: COLORS.gold }}>CRM Settings</Link> (empty = newest version seen).
            </Hint>
          </div>

          {r.reminder && (() => {
            const f = r.reminder;
            return (
              <Section title="Update reminder results" subtitle={`${AREAS.find(([k]) => k === area)[1]} · last reminder per driver (J-24 and app-update campaigns) · click a number to list those drivers`} style={{ marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
                  <Tile label="Reminded" value={num(f.reminded)} sub={`${num(f.notSent)} pending drivers not reminded yet`} active={rem === "not_sent"} onClick={() => pick("not_sent")} />
                  <Tile label="WhatsApp delivered" value={num(f.waReached)} sub={`${pct(f.waReached, f.waSent)} of ${num(f.waSent)} sent`} color={COLORS.green} active={rem === "reached"} onClick={() => pick("reached")} />
                  <Tile label="WhatsApp read" value={num(f.waRead)} sub={`${pct(f.waRead, f.waReached)} of delivered`} color={COLORS.blue} active={rem === "read"} onClick={() => pick("read")} />
                  <Tile label="WhatsApp failed" value={num(f.waFailed)} sub="see reasons below" color={COLORS.red} active={rem === "failed"} onClick={() => pick("failed")} />
                  <Tile label="Push" value={num(f.pushSent)} sub={`${num(f.pushFailed)} not delivered (app removed / no token)`} color={COLORS.gold} />
                  <Tile label="Updated after reminder" value={num(f.updatedAfter)} sub={`${pct(f.updatedAfter, f.reminded)} of reminded`} color={COLORS.green} active={rem === "updated_after"} onClick={() => pick("updated_after")} />
                </div>
                {f.failReasons.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, fontSize: 12, color: soft }}>
                    <span>WhatsApp failed because:</span>
                    {f.failReasons.map((x) => <Pill key={x.reason} tone="red">{x.reason} · {num(x.n)}</Pill>)}
                  </div>
                )}
              </Section>
            );
          })()}

          <Section title="Drivers by version">
            <div style={{ display: "grid", gap: 6 }}>
              {r.byVersion.map((v) => (
                <div key={v.version || "unknown"} style={{ display: "grid", gridTemplateColumns: "110px 1fr 70px", alignItems: "center", gap: 10, fontSize: 12.5 }}>
                  <span style={{ color: v.outdated ? soft : COLORS.green, fontWeight: 600 }}>{v.version ? `v${v.version}` : "unknown"}</span>
                  <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 14 }}>
                    <div style={{ width: `${(v.drivers / maxBar) * 100}%`, height: "100%", borderRadius: 6, background: v.outdated ? COLORS.gold : COLORS.green }} />
                  </div>
                  <span style={{ textAlign: "right", color: soft }}>{num(v.drivers)}</span>
                </div>
              ))}
            </div>
          </Section>

          <div style={{ height: 16 }} />
          <TableCard
            title={`${TABS.find(([k]) => k === status)[1]} drivers${rem ? ` · ${REMS.find(([k]) => k === rem)[1]}` : ""} (${num(r.list.length)}${r.list.length >= 500 ? "+" : ""})`}
            icon="📱"
            actions={<DownloadButton path="/app-updates/export" params={params} />}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "4px 0 12px", alignItems: "center" }}>
              {TABS.map(([k, label]) => (
                <button key={k} className={status === k ? "btn-gold btn-sm" : "btn-outline btn-sm"} onClick={() => setStatus(k)}>{label}</button>
              ))}
              <select className="gm-input" style={{ width: 200 }} value={rem} onChange={(e) => setRem(e.target.value)} title="Reminder result">
                {REMS.map(([k, label]) => <option key={k} value={k}>{k ? label : "Reminder: any"}</option>)}
              </select>
              <form onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }} style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                <input className="gm-input" style={{ width: 220 }} placeholder="Name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
                <button className="btn-outline btn-sm" type="submit">Search</button>
              </form>
            </div>
            <Paged rows={r.list} resetKey={`${status}|${area}|${rem}|${search}`}>{(pageRows) => (
            <table className="gm-table">
              <thead><tr><th>Driver</th><th>City</th><th>App version</th><th>Status</th><th>Last online</th><th>Rides (30d / total)</th><th>Reminders sent</th><th>Last reminder — WhatsApp / Push</th></tr></thead>
              <tbody>
                {r.list.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", color: dim, padding: 24 }}>No drivers here</td></tr>}
                {pageRows.map((x) => (
                  <tr key={x.userId}>
                    <td><ContactCell name={x.name} phone={x.phone} userId={x.userId} /></td>
                    <td style={{ fontSize: 12 }}>{x.city || (x.cityId ? `#${x.cityId}` : "—")}</td>
                    <td>
                      <b>{x.appVersion ? `v${x.appVersion}` : "unknown"}</b>
                      <div style={{ fontSize: 10.5, color: dim }}>as of {x.versionAt ? dt(x.versionAt) : "—"}</div>
                    </td>
                    <td>
                      {x.outdated ? <Pill tone="orange">Pending</Pill> : <Pill tone="green">Updated</Pill>}
                      {x.updatedAfterReminder && <div style={{ marginTop: 4 }}><Pill tone="green">after reminder</Pill></div>}
                      {x.stopped && <div style={{ marginTop: 4 }}><Pill tone="gray">Pressed Stop</Pill></div>}
                    </td>
                    <td style={{ fontSize: 12 }}>{x.lastOnlineAt ? dt(x.lastOnlineAt) : "—"}</td>
                    <td style={{ fontSize: 12 }}>{num(x.rides30d)} / {num(x.ridesTotal)}</td>
                    <td style={{ fontSize: 12 }}>
                      {x.realReminders ? <b>{num(x.realReminders)}</b> : "0"}
                      {x.reminders > x.realReminders && <span style={{ color: dim }}> (+{num(x.reminders - x.realReminders)} dry run)</span>}
                      {x.lastReminderAt && <div style={{ fontSize: 10.5, color: dim }}>last {dt(x.lastReminderAt)}</div>}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {!x.wa && !x.push && <span style={{ color: dim }}>Not reminded yet</span>}
                      {x.wa && (
                        <div>
                          WhatsApp <Pill tone={WA_TONE[x.wa.status] || "gray"}>{WA_LABEL[x.wa.status] || x.wa.status}</Pill>
                          {x.wa.reason && <div style={{ fontSize: 10.5, color: COLORS.red, marginTop: 2 }}>{x.wa.reason}</div>}
                        </div>
                      )}
                      {x.push && (
                        <div style={{ marginTop: 4 }}>
                          Push <Pill tone={x.push.status === "sent" ? "gold" : "gray"}>{x.push.status === "sent" ? "Sent" : "Not delivered"}</Pill>
                          {x.push.reason && <span style={{ fontSize: 10.5, color: dim }}> {x.push.reason === "fcm_token_dead" ? "app removed / old token" : x.push.reason === "no_fcm_token" ? "no token" : x.push.reason}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}</Paged>
          </TableCard>
        </>
      )}
    </CrmPage>
  );
}
