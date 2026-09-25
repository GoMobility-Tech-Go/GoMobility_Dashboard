// Ek journey: steps ka flow (har step pe kitne message), funnel (aaye → goal), recent runs, pause / stop.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Send, Clock, GitBranch, LogOut, BellRing, Users, Target, IndianRupee, Percent } from "lucide-react";
import { StatCard, TableCard } from "../../components/ui";
import { crmPost } from "../../api/crm";
import { CrmPage, useCrm, useCrmMe, useAction, can, Loading, ErrorNote, Pill, StatusPill, Section, Hint, CHANNEL, inr, num, pct, dt } from "./crmShared";

const dur = (n) => [n.days && `${n.days} din`, n.hours && `${n.hours} ghante`, n.minutes && `${n.minutes} min`].filter(Boolean).join(" ");

function condText(c = {}) {
  if (c.event) return `Event "${c.event}" hua?${c.match ? " (isi doc/plan ka)" : ""}`;
  if (c.profile) return `Profile: ${c.profile} ${c.op}${c.value !== undefined ? " " + JSON.stringify(c.value) : ""}`;
  if (c.ctx) return `Trigger data: ${c.ctx} ${c.op} ${JSON.stringify(c.value)}`;
  if (c.ctxDaysUntil) return `${c.ctxDaysUntil} tak ${c.op === "gt" ? ">" : "≤"} ${c.value} din?`;
  return "—";
}

function NodeRow({ n, stat }) {
  const ICON = { send: Send, wait: Clock, check: GitBranch, branch: GitBranch, exit: LogOut, notify_ops: BellRing };
  const Icon = ICON[n.type] || GitBranch;
  let what = n.type, detail = "";
  if (n.type === "send") {
    what = `${CHANNEL[n.channel] || n.channel}${n.fallback ? ` → ${CHANNEL[n.fallback] || n.fallback}` : ""}`;
    detail = n.content?.title ? `${n.content.title} — ${n.content.body || ""}` : n.content?.templateName ? `Template: ${n.content.templateName}` : n.content?.body || "";
  } else if (n.type === "wait") {
    what = "Wait";
    detail = n.untilCtx ? `${n.untilCtx} se ${Math.abs(n.offsetDays || 0)} din ${n.offsetDays < 0 ? "pehle" : "baad"} tak` : n.untilIstHour != null ? `${n.untilIstHour}:00 IST tak` : dur(n);
  } else if (n.type === "check" || n.type === "branch") {
    what = "Check";
    detail = `${condText(n.condition)} haan → ${n.yes}, nahi → ${n.no}`;
  } else if (n.type === "notify_ops") { what = "Ops alert"; detail = n.text; }
  else if (n.type === "exit") { what = "Khatam"; }
  return (
    <tr>
      <td style={{ whiteSpace: "nowrap" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Icon size={14} color="#D4AF37" /> {n.id}</span></td>
      <td style={{ whiteSpace: "nowrap" }}>{what}</td>
      <td style={{ fontSize: 12, maxWidth: 460 }}>{detail}</td>
      <td>{stat ? <>{num(stat.sent)} gaye{stat.failed ? `, ${stat.failed} failed` : ""}{stat.skipped ? `, ${stat.skipped} roke` : ""}</> : n.type === "send" ? "0" : ""}</td>
      <td>{stat?.costInr ? inr(stat.costInr) : ""}</td>
    </tr>
  );
}

export default function CrmJourneyDetailPage() {
  const { key } = useParams();
  const me = useCrmMe();
  const [days, setDays] = useState(30);
  const path = `/journeys/${encodeURIComponent(key)}`;
  const j = useCrm(path);
  const f = useCrm(`${path}/funnel`, { params: { days }, refreshMs: 60000 });
  const runs = useCrm(`${path}/runs`, { refreshMs: 60000 });
  const { busy, run } = useAction();
  const d = j.data;

  async function toggle() {
    if (!window.confirm(d.enabled ? "Journey PAUSE karein?" : "Journey ON karein?")) return;
    await run("toggle", () => crmPost(`${path}/toggle`, { enabled: !d.enabled }), d.enabled ? "Paused" : "ON");
    j.reload();
  }
  async function stop() {
    if (!window.confirm("Saari CHALTI runs khatam karein? Unhe aage koi message nahi jayega. (Galat journey chal gayi ho tab.)")) return;
    const r = await run("stop", () => crmPost(`${path}/stop`), null);
    if (r) { window.alert(`${r.stopped} runs rok di gayi`); runs.reload(); f.reload(); }
  }

  return (
    <CrmPage
      title={d?.name || key}
      subtitle={d ? `${(d.audience?.roles || []).join(", ")} · ${d.category === "transactional" ? "Transactional" : "Marketing"} · priority ${d.priority} · version ${d.version || 1}` : ""}
      actions={
        <>
          <Link to="/crm/journeys" className="btn-outline"><ArrowLeft size={14} /> Journeys</Link>
          {d && can(me, "admin") && <button className={d.enabled ? "btn-outline" : "btn-gold"} disabled={!!busy} onClick={toggle}>{d.enabled ? "Pause" : "Turn ON"}</button>}
          {d && can(me, "admin") && <button className="btn-danger" disabled={!!busy} onClick={stop}>Stop saari runs</button>}
        </>
      }
    >
      <ErrorNote error={j.error} />
      {j.loading && !d && <Loading />}
      {d && (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
            <Pill tone={d.enabled ? "green" : "gray"}>{d.enabled ? "ON" : "OFF"}</Pill>
            {d.goal && <Pill tone="gold">Goal: {d.goal.event} ({d.goal.windowH}h ke andar)</Pill>}
            {d.trigger?.event && <Pill tone="blue">Trigger: {d.trigger.event}</Pill>}
            <div style={{ flex: 1 }} />
            <select className="gm-input" style={{ width: 140 }} value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[7, 30, 90].map((x) => <option key={x} value={x}>Pichhle {x} din</option>)}
            </select>
          </div>

          <ErrorNote error={f.error} />
          {f.data && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 16 }}>
              <StatCard label="Journey mein aaye" value={num(f.data.entered)} icon={Users} />
              <StatCard label="Goal poora (window)" value={num(f.data.goalWithin)} icon={Target} iconColor="#34D399" iconBg="rgba(52,211,153,0.1)" />
              <StatCard label="Conversion" value={pct(f.data.conversion)} icon={Percent} iconColor="#60A5FA" iconBg="rgba(96,165,250,0.1)" />
              <StatCard label="Kharcha / goal" value={f.data.costPerGoal == null ? inr(f.data.costInr) : inr(f.data.costPerGoal)} icon={IndianRupee} iconColor="#A78BFA" iconBg="rgba(167,139,250,0.1)" />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <TableCard title="Steps — kya hota hai, kis order mein" icon="🧭">
              <table className="gm-table">
                <thead><tr><th>Step</th><th>Kya</th><th>Detail</th><th>Messages ({days} din)</th><th>Kharcha</th></tr></thead>
                <tbody>{(d.nodes || []).map((n) => <NodeRow key={n.id} n={n} stat={f.data?.nodes?.[n.id]} />)}</tbody>
              </table>
            </TableCard>
          </div>

          {f.data && Object.keys(f.data.states || {}).length > 0 && (
            <Section title="Runs ka haal">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(f.data.states).map(([s, n]) => <span key={s} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><StatusPill status={s} /> <b style={{ color: "#fff" }}>{num(n)}</b></span>)}
              </div>
            </Section>
          )}

          <TableCard title="Recent runs (aakhri 100)" icon="🏃">
            <table className="gm-table">
              <thead><tr><th>Shuru</th><th>State</th><th>Abhi step</th><th>Agla action</th><th>Instance</th><th>Goal</th></tr></thead>
              <tbody>
                {(runs.data || []).map((r) => (
                  <tr key={r._id}>
                    <td>{dt(r.enteredAt)}</td>
                    <td><StatusPill status={r.state} /></td>
                    <td>{r.currentNode || "—"}</td>
                    <td>{r.state === "active" ? dt(r.nextActionAt) : "—"}</td>
                    <td style={{ fontSize: 11 }}>{r.instanceKey || "—"}</td>
                    <td>{r.goalMetAt ? `${dt(r.goalMetAt)}${r.goalWithinWindow ? "" : " (late)"}` : "—"}</td>
                  </tr>
                ))}
                {runs.data && !runs.data.length && <tr><td colSpan={6} style={{ textAlign: "center", color: "rgba(255,255,255,0.35)" }}>Abhi koi run nahi</td></tr>}
              </tbody>
            </table>
          </TableCard>
          <div style={{ marginTop: 12 }}><Hint>Pause = runs wahin rukti hain, ON karne pe aage badhti hain (24h se zyada ruki toh expire, purana message nahi jaata). Stop = chalti runs khatam.</Hint></div>
        </>
      )}
    </CrmPage>
  );
}
