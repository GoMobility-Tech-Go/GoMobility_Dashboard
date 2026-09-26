// CRM Analytics — message volume, spend, journey performance and campaign delivery over time.
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ComposedChart, Line,
} from "recharts";
import { Send, IndianRupee, Users, Target, AlertTriangle } from "lucide-react";
import { StatCard, TableCard } from "../../components/ui";
import {
  CrmPage, useCrm, Loading, ErrorNote, ChartCard, ChartTooltip, Legend, NoChartData, RangeButtons, StatusPill, CategoryPill, Pill,
  COLORS, CHANNEL, CHANNEL_COLOR, STATUS_COLOR, axisTick, gridStroke, inr, num, pct, day, statusLabel, shortKey,
} from "./crmShared";

const Progress = ({ value, color = "gold" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 110 }}>
    <div className="prog-bar" style={{ flex: 1 }}>
      <div className={`prog-fill ${color === "green" ? "prog-fill-green" : ""}`} style={{ width: `${Math.min(100, Math.round((value || 0) * 100))}%` }} />
    </div>
    <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", width: 38, textAlign: "right" }}>{pct(value)}</span>
  </div>
);

export default function CrmAnalyticsPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const { data: a, error, loading } = useCrm("/metrics/analytics", { params: { days }, refreshMs: 120000 });

  const channels = useMemo(() => Object.keys(CHANNEL).filter((c) => a?.daily?.some((d) => d[c] > 0)), [a]);
  const statusPie = useMemo(() => Object.entries(a?.status || {}).filter(([, v]) => v > 0)
    .map(([s, v]) => ({ name: statusLabel(s), value: v, color: STATUS_COLOR[s] || COLORS.gray })), [a]);
  const categoryPie = useMemo(() => [
    { name: "Transactional", value: a?.category?.transactional || 0, color: COLORS.blue },
    { name: "Marketing", value: a?.category?.marketing || 0, color: COLORS.gold },
  ].filter((x) => x.value > 0), [a]);
  const topJourneys = useMemo(() => (a?.journeys || []).filter((j) => j.entered > 0).slice(0, 10)
    .map((j) => ({ ...j, label: shortKey(j.key) })), [a]);

  return (
    <CrmPage
      title="CRM Analytics"
      subtitle="Message volume, spend, journey conversion and campaign delivery"
      actions={<RangeButtons value={days} onChange={setDays} />}
    >
      <ErrorNote error={error} />
      {loading && !a && <Loading />}
      {a && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 16 }}>
            <StatCard label={`Messages sent · ${a.windowD}D`} value={num(a.totals.sent)} icon={Send} />
            <StatCard label="Total spend" value={inr(a.totals.costInr)} icon={IndianRupee} iconColor={COLORS.green} iconBg="rgba(52,211,153,0.1)" />
            <StatCard label="Journey entries" value={num(a.totals.entered)} icon={Users} iconColor={COLORS.blue} iconBg="rgba(96,165,250,0.1)" />
            <StatCard label={`Goals achieved · ${pct(a.totals.conversion)}`} value={num(a.totals.goals)} icon={Target} iconColor={COLORS.purple} iconBg="rgba(167,139,250,0.1)" />
            <StatCard label="Failed deliveries" value={num(a.totals.failed)} icon={AlertTriangle} iconColor={COLORS.red} iconBg="rgba(248,113,113,0.1)" />
          </div>

          <div className="crm-2-1">
            <ChartCard title="Message Volume" subtitle={`Daily messages by channel · ${num(a.totals.sent)} total`}>
              {a.totals.sent === 0 ? <NoChartData height={240} /> : (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={a.daily}>
                      <defs>
                        {channels.map((c) => (
                          <linearGradient key={c} id={`g-${c}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHANNEL_COLOR[c]} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={CHANNEL_COLOR[c]} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis dataKey="date" tickFormatter={day} tick={axisTick} axisLine={false} tickLine={false} minTickGap={18} />
                      <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip labelFormatter={day} />} />
                      {channels.map((c) => (
                        <Area key={c} type="monotone" dataKey={c} name={CHANNEL[c]} stackId="1" stroke={CHANNEL_COLOR[c]} strokeWidth={1.8} fill={`url(#g-${c})`} dot={false} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                  <Legend items={channels.map((c) => ({ name: CHANNEL[c], color: CHANNEL_COLOR[c] }))} />
                </>
              )}
            </ChartCard>

            <ChartCard title="Delivery Status" subtitle="Outcome of every outbound message">
              {!statusPie.length ? <NoChartData height={240} /> : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} innerRadius={48} paddingAngle={3} stroke="none">
                        {statusPie.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Legend items={statusPie} />
                </>
              )}
            </ChartCard>
          </div>

          <div className="crm-1-1">
            <ChartCard title="Journey Entries vs Goals" subtitle={`${num(a.totals.entered)} entries · ${num(a.totals.goals)} goals within window`}>
              {a.totals.entered === 0 && a.totals.goals === 0 ? <NoChartData height={220} /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={a.daily}>
                    <defs>
                      <linearGradient id="g-entered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="date" tickFormatter={day} tick={axisTick} axisLine={false} tickLine={false} minTickGap={18} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip labelFormatter={day} />} />
                    <Area type="monotone" dataKey="entered" name="Entered" stroke={COLORS.blue} strokeWidth={2} fill="url(#g-entered)" dot={false} />
                    <Line type="monotone" dataKey="goals" name="Goals achieved" stroke={COLORS.green} strokeWidth={2.2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Daily Spend" subtitle={`${inr(a.totals.costInr)} over ${a.windowD} days (incl. GST)`}>
              {a.totals.costInr === 0 ? <NoChartData height={220}>No paid messages in this period</NoChartData> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={a.daily} barSize={Math.max(4, Math.min(22, 520 / a.daily.length))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={day} tick={axisTick} axisLine={false} tickLine={false} minTickGap={18} />
                    <YAxis tickFormatter={(v) => `₹${v}`} tick={axisTick} axisLine={false} tickLine={false} width={48} />
                    <Tooltip content={<ChartTooltip labelFormatter={day} valueFormatter={inr} />} cursor={{ fill: "rgba(212,175,55,0.05)" }} />
                    <Bar dataKey="costInr" name="Spend" fill={COLORS.gold} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="crm-2-1">
            <ChartCard title="Journey Performance" subtitle="Entries and goals achieved per journey">
              {!topJourneys.length ? <NoChartData height={260}>No journey activity in this period</NoChartData> : (
                <ResponsiveContainer width="100%" height={Math.max(220, topJourneys.length * 34)}>
                  <BarChart data={topJourneys} layout="vertical" barGap={2} barSize={11}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                    <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="label" tick={{ ...axisTick, fill: "rgba(255,255,255,0.6)" }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip content={<ChartTooltip labelFormatter={(l) => topJourneys.find((j) => j.label === l)?.name || l} />} cursor={{ fill: "rgba(212,175,55,0.05)" }} />
                    <Bar dataKey="entered" name="Entered" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="goalWithin" name="Goals achieved" fill={COLORS.green} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Message Mix" subtitle="Transactional vs marketing (delivered)">
              {!categoryPie.length ? <NoChartData height={240} /> : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={categoryPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} innerRadius={48} paddingAngle={3} stroke="none">
                        {categoryPie.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Legend items={categoryPie} />
                </>
              )}
            </ChartCard>
          </div>

          <div style={{ marginBottom: 16 }}>
            <TableCard title="Journey Breakdown" icon="🧭">
              <table className="gm-table">
                <thead><tr><th>Journey</th><th>Audience</th><th>Type</th><th>Status</th><th>Entered</th><th>Active</th><th>Goals</th><th>Conversion</th><th>Messages</th><th>Spend</th><th>Cost / goal</th></tr></thead>
                <tbody>
                  {a.journeys.map((j) => (
                    <tr key={j.key} style={{ cursor: "pointer" }} onClick={() => navigate(`/crm/journeys/${encodeURIComponent(j.key)}`)}>
                      <td>{j.name}</td>
                      <td style={{ textTransform: "capitalize" }}>{j.role || "—"}</td>
                      <td><CategoryPill category={j.category} /></td>
                      <td><Pill tone={j.enabled ? "green" : "gray"}>{j.enabled ? "On" : "Off"}</Pill></td>
                      <td>{num(j.entered)}</td>
                      <td>{num(j.active)}</td>
                      <td>{num(j.goalWithin)}</td>
                      <td>{j.entered ? <Progress value={j.conversion} color="green" /> : "—"}</td>
                      <td>{num(j.messages)}</td>
                      <td>{inr(j.costInr)}</td>
                      <td>{j.costPerGoal == null ? "—" : inr(j.costPerGoal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          </div>

          <TableCard title={`Campaigns · last ${a.windowD} days`} icon="📣" actions={<Link to="/crm/campaigns" className="btn-outline btn-sm">All campaigns</Link>}>
            <table className="gm-table">
              <thead><tr><th>Campaign</th><th>Status</th><th>Channel</th><th>Recipients</th><th>Sent</th><th>Failed</th><th>Delivery</th><th>Est. cost</th></tr></thead>
              <tbody>
                {a.campaigns.map((c) => {
                  const total = c.sent + c.failed + c.skipped;
                  return (
                    <tr key={c._id} style={{ cursor: "pointer" }} onClick={() => navigate(`/crm/campaigns/${c._id}`)}>
                      <td>{c.name || "Untitled"} {c.category === "transactional" && <CategoryPill category="transactional" />}</td>
                      <td><StatusPill status={c.status} /></td>
                      <td>{CHANNEL[c.channel] || c.channel}</td>
                      <td>{num(c.recipients)}</td>
                      <td>{num(c.sent)}</td>
                      <td>{num(c.failed)}</td>
                      <td>{total ? <Progress value={c.sent / total} /> : "—"}</td>
                      <td>{inr(c.estCostInr)}</td>
                    </tr>
                  );
                })}
                {!a.campaigns.length && <tr><td colSpan={8} style={{ textAlign: "center", color: "rgba(255,255,255,0.35)" }}>No campaigns in this period</td></tr>}
              </tbody>
            </table>
          </TableCard>
        </>
      )}
    </CrmPage>
  );
}
