// A single journey: flow steps, conversion funnel, messages per step, run states, recent runs, pause / stop.
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from "recharts";
import { ArrowLeft, Send, Clock, GitBranch, LogOut, BellRing, Users, Target, IndianRupee, Percent } from "lucide-react";
import { StatCard, TableCard } from "../../components/ui";
import { crmPost } from "../../api/crm";
import {
  CrmPage, useCrm, useCrmMe, useAction, can, Loading, ErrorNote, Pill, StatusPill, CategoryPill, Hint, ChartCard, ChartTooltip, Legend,
  NoChartData, RangeButtons, COLORS, CHANNEL, axisTick, gridStroke, inr, num, pct, dt, statusLabel,
} from "./crmShared";

const STATE_COLOR = { active: COLORS.blue, goal_met: COLORS.green, completed: COLORS.gray, exited: "rgba(255,255,255,0.2)", expired: COLORS.orange, failed: COLORS.red };
const dur = (n) => [n.days && `${n.days} day${n.days > 1 ? "s" : ""}`, n.hours && `${n.hours} h`, n.minutes && `${n.minutes} min`].filter(Boolean).join(" ");

function condText(c = {}) {
  if (c.event) return `Did "${c.event}" happen${c.match ? " (for this item)" : ""}?`;
  if (c.profile) return `Profile ${c.profile} ${c.op}${c.value !== undefined ? " " + JSON.stringify(c.value) : ""}`;
  if (c.ctx) return `Trigger ${c.ctx} ${c.op} ${JSON.stringify(c.value)}`;
  if (c.ctxDaysUntil) return `More than ${c.value} days until ${c.ctxDaysUntil}?`;
  return "—";
}

// "{{ctx.docType}}" → "‹docType›" — readable placeholders in the flow table
const tidy = (t) => String(t || "").replace(/\{\{\s*(?:ctx|profile|contact|org)\.(\w+)\s*\}\}/g, "‹$1›");

function describe(n) {
  if (n.type === "send") {
    return [`Send · ${CHANNEL[n.channel] || n.channel}${n.fallback ? ` → ${CHANNEL[n.fallback] || n.fallback}` : ""}`,
      n.content?.title ? `${n.content.title} — ${n.content.body || ""}` : n.content?.templateName ? `Template: ${n.content.templateName}` : n.content?.body || ""];
  }
  if (n.type === "wait") {
    return ["Wait", n.untilCtx ? `Until ${Math.abs(n.offsetDays || 0)} days ${n.offsetDays < 0 ? "before" : "after"} ${n.untilCtx}` : n.untilIstHour != null ? `Until ${n.untilIstHour}:00 IST` : dur(n)];
  }
  if (n.type === "check" || n.type === "branch") return ["Condition", `${condText(n.condition)} Yes → ${n.yes}, No → ${n.no}`];
  if (n.type === "notify_ops") return ["Alert ops team", n.text];
  if (n.type === "exit") return ["End", ""];
  return [n.type, ""];
}

const ICON = { send: Send, wait: Clock, check: GitBranch, branch: GitBranch, exit: LogOut, notify_ops: BellRing };

export default function CrmJourneyDetailPage() {
  const { key } = useParams();
  const me = useCrmMe();
  const [days, setDays] = useState(30);
  const path = `/journeys/${encodeURIComponent(key)}`;
  const j = useCrm(path);
  const f = useCrm(`${path}/funnel`, { params: { days }, refreshMs: 60000 });
  const runs = useCrm(`${path}/runs`, { refreshMs: 60000 });
  const { busy, run } = useAction();
  const d = j.data, fn = f.data;

  const sendNodes = useMemo(() => (d?.nodes || []).filter((n) => n.type === "send" || n.type === "notify_ops").map((n) => ({
    step: n.id, label: `${n.id} · ${n.type === "send" ? (CHANNEL[n.channel] || n.channel) : "Ops alert"}`,
    sent: fn?.nodes?.[n.id]?.sent || 0, failed: fn?.nodes?.[n.id]?.failed || 0, skipped: fn?.nodes?.[n.id]?.skipped || 0,
  })), [d, fn]);
  const funnelData = useMemo(() => {
    if (!fn) return [];
    const firstSend = sendNodes[0]?.sent || 0;
    return [
      { stage: "Entered", value: fn.entered, color: COLORS.blue },
      { stage: "Messaged", value: Math.min(firstSend, fn.entered), color: COLORS.gold },
      { stage: "Goal met", value: fn.goalWithin, color: COLORS.green },
    ];
  }, [fn, sendNodes]);
  const statePie = useMemo(() => Object.entries(fn?.states || {}).filter(([, v]) => v > 0)
    .map(([s, v]) => ({ name: statusLabel(s), value: v, color: STATE_COLOR[s] || COLORS.gray })), [fn]);

  async function toggle() {
    if (!window.confirm(d.enabled ? "Pause this journey?" : "Turn this journey on?")) return;
    await run("toggle", () => crmPost(`${path}/toggle`, { enabled: !d.enabled }), d.enabled ? "Journey paused" : "Journey turned on");
    j.reload();
  }
  async function stop() {
    if (!window.confirm("End all ACTIVE runs of this journey? No further messages will be sent to them.")) return;
    const r = await run("stop", () => crmPost(`${path}/stop`), null);
    if (r) { window.alert(`${r.stopped} active runs stopped`); runs.reload(); f.reload(); }
  }

  return (
    <CrmPage
      title={d?.name || key}
      subtitle={d ? `${(d.audience?.roles || []).map((r) => r[0].toUpperCase() + r.slice(1)).join(", ")} · priority ${d.priority} · version ${d.version || 1}` : ""}
      actions={
        <>
          <Link to="/crm/journeys" className="btn-outline"><ArrowLeft size={14} /> Journeys</Link>
          {d && can(me, "admin") && <button className={d.enabled ? "btn-outline" : "btn-gold"} disabled={!!busy} onClick={toggle}>{d.enabled ? "Pause" : "Turn on"}</button>}
          {d && can(me, "admin") && <button className="btn-danger" disabled={!!busy} onClick={stop}>Stop active runs</button>}
        </>
      }
    >
      <ErrorNote error={j.error} />
      {j.loading && !d && <Loading />}
      {d && (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
            <Pill tone={d.enabled ? "green" : "gray"}>{d.enabled ? "On" : "Off"}</Pill>
            <CategoryPill category={d.category} />
            {d.trigger?.event && <Pill tone="blue">Trigger: {d.trigger.event}</Pill>}
            {d.trigger?.type === "schedule" && <Pill tone="blue">Trigger: daily schedule</Pill>}
            {d.goal && <Pill tone="gold">Goal: {d.goal.event} within {d.goal.windowH} h</Pill>}
            <div style={{ flex: 1 }} />
            <RangeButtons value={days} onChange={setDays} />
          </div>

          <ErrorNote error={f.error} />
          {fn && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 16 }}>
              <StatCard label="Entered" value={num(fn.entered)} icon={Users} />
              <StatCard label="Goal met in window" value={num(fn.goalWithin)} icon={Target} iconColor={COLORS.green} iconBg="rgba(52,211,153,0.1)" />
              <StatCard label="Conversion" value={pct(fn.conversion)} icon={Percent} iconColor={COLORS.blue} iconBg="rgba(96,165,250,0.1)" />
              <StatCard label={fn.costPerGoal == null ? "Spend" : "Cost per goal"} value={inr(fn.costPerGoal == null ? fn.costInr : fn.costPerGoal)} icon={IndianRupee} iconColor={COLORS.purple} iconBg="rgba(167,139,250,0.1)" />
            </div>
          )}

          {fn && (
            <div className="crm-1-1">
              <ChartCard title="Conversion Funnel" subtitle={`Last ${days} days`}>
                {!fn.entered ? <NoChartData height={200}>No one entered this journey in this period</NoChartData> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={funnelData} layout="vertical" barSize={26}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                      <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="stage" tick={{ ...axisTick, fill: "rgba(255,255,255,0.65)", fontSize: 11 }} axisLine={false} tickLine={false} width={78} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(212,175,55,0.05)" }} />
                      <Bar dataKey="value" name="Contacts" radius={[0, 6, 6, 0]}>
                        {funnelData.map((x) => <Cell key={x.stage} fill={x.color} />)}
                        <LabelList dataKey="value" position="right" style={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Run Status" subtitle="Where contacts are in this journey">
                {!statePie.length ? <NoChartData height={200} /> : (
                  <>
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={statePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={42} paddingAngle={3} stroke="none">
                          {statePie.map((x) => <Cell key={x.name} fill={x.color} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <Legend items={statePie} />
                  </>
                )}
              </ChartCard>
            </div>
          )}

          {sendNodes.length > 0 && fn && (
            <div style={{ marginBottom: 16 }}>
              <ChartCard title="Messages per Step" subtitle="Delivered, failed and skipped at each send step">
                {sendNodes.every((s) => !s.sent && !s.failed && !s.skipped) ? <NoChartData height={180}>No messages sent in this period</NoChartData> : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={sendNodes} barSize={24}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis dataKey="label" tick={{ ...axisTick, fontSize: 10.5 }} axisLine={false} tickLine={false} />
                        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(212,175,55,0.05)" }} />
                        <Bar dataKey="sent" name="Delivered" stackId="s" fill={COLORS.gold} />
                        <Bar dataKey="skipped" name="Skipped" stackId="s" fill={COLORS.orange} />
                        <Bar dataKey="failed" name="Failed" stackId="s" fill={COLORS.red} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <Legend items={[{ name: "Delivered", color: COLORS.gold }, { name: "Skipped", color: COLORS.orange }, { name: "Failed", color: COLORS.red }]} />
                  </>
                )}
              </ChartCard>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <TableCard title="Journey Flow" icon="🧭">
              <table className="gm-table">
                <thead><tr><th>Step</th><th>Action</th><th>Details</th><th>Messages ({days}D)</th><th>Spend</th></tr></thead>
                <tbody>
                  {(d.nodes || []).map((n) => {
                    const Icon = ICON[n.type] || GitBranch;
                    const [what, raw] = describe(n);
                    const detail = tidy(raw);
                    const st = fn?.nodes?.[n.id];
                    return (
                      <tr key={n.id}>
                        <td style={{ whiteSpace: "nowrap" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Icon size={14} color="#D4AF37" /> {n.id}</span></td>
                        <td style={{ whiteSpace: "nowrap" }}>{what}</td>
                        <td style={{ fontSize: 12, maxWidth: 480 }}>{detail}</td>
                        <td>{st ? <>{num(st.sent)} delivered{st.failed ? ` · ${st.failed} failed` : ""}{st.skipped ? ` · ${st.skipped} skipped` : ""}</> : n.type === "send" ? "0" : ""}</td>
                        <td>{st?.costInr ? inr(st.costInr) : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableCard>
          </div>

          <TableCard title="Recent Runs" icon="🏃">
            <table className="gm-table">
              <thead><tr><th>Started</th><th>Status</th><th>Current step</th><th>Next action</th><th>Instance</th><th>Goal met</th></tr></thead>
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
                {runs.data && !runs.data.length && <tr><td colSpan={6} style={{ textAlign: "center", color: "rgba(255,255,255,0.35)" }}>No runs yet</td></tr>}
              </tbody>
            </table>
          </TableCard>
          <div style={{ marginTop: 12 }}>
            <Hint>Pause keeps runs where they are and resumes them when turned back on (runs paused for more than 24 hours expire instead of sending late messages). Stop ends all active runs immediately.</Hint>
          </div>
        </>
      )}
    </CrmPage>
  );
}
