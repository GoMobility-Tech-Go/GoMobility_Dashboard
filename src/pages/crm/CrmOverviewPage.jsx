// CRM overview — headline numbers, activity trend and the PRD §7 success targets.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Send, CalendarCheck, IndianRupee, AlertTriangle, ArrowRight } from "lucide-react";
import { StatCard, TableCard } from "../../components/ui";
import {
  CrmPage, useCrm, Loading, ErrorNote, Pill, Hint, ChartCard, ChartTooltip, Legend, NoChartData, RangeButtons,
  COLORS, CHANNEL, CHANNEL_COLOR, axisTick, gridStroke, inr, num, pct, day, shortKey,
} from "./crmShared";

const STEPS = [
  ["Data", "Every 2 minutes the CRM reads read-only views from the ride platform (sign-ups, rides, KYC, dues, subscriptions) and turns changes into events."],
  ["Journeys", "Each event starts the matching journey automatically — for example, a KYC document stuck in review starts J-16."],
  ["Safeguards", "Before any message: kill switch → consent → quiet hours → frequency caps → throttling."],
  ["Campaigns", "Segment → cost estimate → submit. Campaigns above the approval limit, or transactional ones, need a second approver."],
  ["Control", "Dry run logs messages without sending them. The kill switch stops everything within 10 seconds."],
];

export default function CrmOverviewPage() {
  const [days, setDays] = useState(30);
  const o = useCrm("/metrics/overview", { params: { days }, refreshMs: 60000 });
  const a = useCrm("/metrics/analytics", { params: { days }, refreshMs: 120000 });
  const d = o.data;

  const channelPie = useMemo(() => Object.entries(d?.messages?.channels || {}).filter(([, x]) => x.sent > 0)
    .map(([ch, x]) => ({ name: CHANNEL[ch] || ch, value: x.sent, color: CHANNEL_COLOR[ch] || COLORS.gray })), [d]);

  return (
    <CrmPage
      title="CRM Overview"
      subtitle="Automated journeys and campaigns — volume, spend and progress against targets"
      actions={<RangeButtons value={days} onChange={setDays} />}
    >
      <ErrorNote error={o.error} />
      {o.loading && !d && <Loading />}
      {d && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 14, marginBottom: 16 }}>
            <StatCard label={`Messages · ${d.windowD}D`} value={num(d.messages.sent)} icon={Send} />
            <StatCard label="Sent today" value={num(d.messages.today)} icon={CalendarCheck} iconColor={COLORS.blue} iconBg="rgba(96,165,250,0.1)" />
            <StatCard label="Spend" value={inr(d.messages.spendInr)} icon={IndianRupee} iconColor={COLORS.green} iconBg="rgba(52,211,153,0.1)" />
            <StatCard label="Failed" value={num(d.messages.failed)} icon={AlertTriangle} iconColor={COLORS.red} iconBg="rgba(248,113,113,0.1)" />
          </div>

          <div className="crm-2-1">
            <ChartCard
              title="Activity Trend"
              subtitle="Messages delivered and journey entries per day"
              right={<Link to="/crm/analytics" className="btn-outline btn-sm">Full analytics <ArrowRight size={13} /></Link>}
            >
              {!a.data ? <Loading /> : a.data.totals.sent + a.data.totals.entered === 0 ? <NoChartData height={220} /> : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={a.data.daily}>
                      <defs>
                        <linearGradient id="ov-sent" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS.gold} stopOpacity={0} /></linearGradient>
                        <linearGradient id="ov-entered" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.18} /><stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis dataKey="date" tickFormatter={day} tick={axisTick} axisLine={false} tickLine={false} minTickGap={18} />
                      <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip labelFormatter={day} />} />
                      <Area type="monotone" dataKey="sent" name="Messages" stroke={COLORS.gold} strokeWidth={2} fill="url(#ov-sent)" dot={false} />
                      <Area type="monotone" dataKey="entered" name="Journey entries" stroke={COLORS.blue} strokeWidth={1.6} fill="url(#ov-entered)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <Legend items={[{ name: "Messages", color: COLORS.gold }, { name: "Journey entries", color: COLORS.blue }]} />
                </>
              )}
            </ChartCard>

            <ChartCard title="Channel Mix" subtitle={`Delivered messages · ${d.windowD} days`}>
              {!channelPie.length ? <NoChartData height={220} /> : (
                <>
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie data={channelPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={76} innerRadius={46} paddingAngle={3} stroke="none">
                        {channelPie.map((x) => <Cell key={x.name} fill={x.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Legend items={channelPie} />
                </>
              )}
            </ChartCard>
          </div>

          <div style={{ marginBottom: 16 }}>
            <TableCard title="Success Targets (PRD §7)" icon="🎯">
              <table className="gm-table">
                <thead><tr><th>Metric</th><th>Journey</th><th>Entered</th><th>Goal within window</th><th>Rate</th><th>Target</th><th>Status</th></tr></thead>
                <tbody>
                  {d.success.map((r) => (
                    <tr key={r.journey}>
                      <td>{r.metric}</td>
                      <td><Link to={`/crm/journeys/${encodeURIComponent(r.journey)}`} style={{ color: "#D4AF37", textDecoration: "none" }}>{shortKey(r.journey)}</Link></td>
                      <td>{num(r.entered)}</td>
                      <td>{num(r.goalWithin)}{r.goalLate ? <span style={{ color: "rgba(255,255,255,0.35)" }}> (+{r.goalLate} late)</span> : null}</td>
                      <td>{pct(r.rate)}</td>
                      <td>{r.target == null ? "Measurable" : pct(r.target)}</td>
                      <td>{r.entered === 0 ? <Pill>No data yet</Pill> : <Pill tone={r.onTrack ? "green" : "orange"}>{r.onTrack ? "On track" : "Below target"}</Pill>}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>Marketing opt-out rate</td><td>—</td>
                    <td>{num(d.optOut.reachedMarketing)} reached</td><td>{num(d.optOut.optedOut)} opted out</td>
                    <td>{pct(d.optOut.rate)}</td><td>&lt; {pct(d.optOut.target)}</td>
                    <td><Pill tone={d.optOut.onTrack ? "green" : "red"}>{d.optOut.onTrack ? "On track" : "Above limit"}</Pill></td>
                  </tr>
                  <tr>
                    <td>Journey cost per attributed ride</td><td>—</td>
                    <td>{inr(d.costPerAttributedRide.journeySpendInr)} spent</td><td>{num(d.costPerAttributedRide.attributedRides)} rides</td>
                    <td>{inr(d.costPerAttributedRide.costPerRide)}</td><td>&lt; {inr(d.costPerAttributedRide.limit)}</td>
                    <td>{d.costPerAttributedRide.onTrack == null ? <Pill>No data yet</Pill> : <Pill tone={d.costPerAttributedRide.onTrack ? "green" : "red"}>{d.costPerAttributedRide.onTrack ? "Profitable" : "Costs more than a ride earns"}</Pill>}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ padding: "10px 16px" }}>
                <Hint>Journeys only (campaigns have their own reports). A ride within the journey's goal window counts as attributed — without a holdout group this is correlation, not proof.</Hint>
              </div>
            </TableCard>
          </div>

          <div className="crm-1-1">
            <TableCard title="Channels" icon="📡">
              <table className="gm-table">
                <thead><tr><th>Channel</th><th>Delivered</th><th>Failed</th><th>Skipped</th><th>Spend</th></tr></thead>
                <tbody>
                  {Object.entries(d.messages.channels).map(([ch, x]) => (
                    <tr key={ch}><td>{CHANNEL[ch] || ch}</td><td>{num(x.sent)}</td><td>{num(x.failed)}</td><td>{num(x.skipped)}</td><td>{inr(x.costInr)}</td></tr>
                  ))}
                  {!Object.keys(d.messages.channels).length && <tr><td colSpan={5} style={{ textAlign: "center", color: "rgba(255,255,255,0.35)" }}>No messages in this period</td></tr>}
                </tbody>
              </table>
            </TableCard>

            <ChartCard title="How the CRM Works" subtitle="From ride data to the right message">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {STEPS.map(([t, body], i) => (
                  <div key={t} style={{ display: "flex", gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#0a1840", background: "linear-gradient(135deg,#f0d060,#D4AF37)" }}>{i + 1}</div>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.55, fontFamily: "Outfit,sans-serif" }}><b style={{ color: "#D4AF37" }}>{t}.</b> {body}</div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </CrmPage>
  );
}
