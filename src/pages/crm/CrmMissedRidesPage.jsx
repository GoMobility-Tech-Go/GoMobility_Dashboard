// Ride Misses (J-23) — every day: which drivers let ride requests go, how much fare that was, who got the 8 pm message,
// who read it, who did not get it and why, whether the driver came online / did a ride after it, and repeat missers.
// Data: CRM /missed-rides (daily copy of the J-23 numbers + J-23 runs + messages + ride backend events).
import { useState } from "react";
import { Link } from "react-router-dom";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TableCard } from "../../components/ui";
import {
  CrmPage, useCrm, Loading, ErrorNote, Pill, Hint, Section, Paged, COLORS, num, inr, dt, Tile, Tiles, AreaButtons, Chips,
  ChartCard, ChartTooltip, Legend, RangeButtons, axisTick, gridStroke, dayKeyLabel, pctOf, Empty,
} from "./crmShared";
import { ContactCell, DownloadButton, dim, soft } from "./crmMessageParts";

const WA_TONE = { read: "blue", delivered: "green", sent: "gold", queued: "gray", failed: "red", skipped: "gray" };
const CH_LABEL = { read: "Read", delivered: "Delivered", sent: "Sent", queued: "Queued", failed: "Failed", skipped: "Skipped" };
const SHOW = [["all", "All"], ["reached", "Got the message"], ["read", "Read it"], ["not_sent", "Did not get it"], ["tonight", "Still to go"], ["came_back", "Online after message"]];
const show = (k, x) => (k === "all" ? true : k === "reached" ? x.reached : k === "read" ? x.waRead : k === "not_sent" ? !x.reached && !x.pendingTonight
  : k === "tonight" ? x.pendingTonight : !!x.onlineAfter);

function ChannelCell({ x }) {
  if (x.pending && !x.wa && !x.push) return <Pill tone="gold">{x.pending}</Pill>;
  if (!x.entered) return <span style={{ color: dim, fontSize: 12 }}>Not sent</span>;
  return (
    <div style={{ fontSize: 12, display: "grid", gap: 4 }}>
      {x.wa && <div>WhatsApp <Pill tone={WA_TONE[x.wa.status] || "gray"}>{CH_LABEL[x.wa.status] || x.wa.status}</Pill></div>}
      {x.push && <div>Push <Pill tone={x.push.status === "sent" ? "gold" : "gray"}>{x.push.status === "sent" ? "Sent" : "Not delivered"}</Pill></div>}
      {x.sentAt && <div style={{ fontSize: 10.5, color: dim }}>{dt(x.sentAt)}</div>}
    </div>
  );
}

export default function CrmMissedRidesPage() {
  const [area, setArea] = useState("ncr");
  const [days, setDays] = useState(14);
  const [day, setDay] = useState("");
  const [filter, setFilter] = useState("all");
  const d = useCrm("/missed-rides", { params: { area, days, ...(day ? { day } : {}) }, refreshMs: 120000 });
  const r = d.data;
  const selected = day || r?.today;
  const chart = (r?.daily || []).map((x) => ({ ...x, label: dayKeyLabel(x.day) }));
  const sel = r?.daily.find((x) => x.day === selected);
  const rows = (r?.list || []).filter((x) => show(filter, x));

  return (
    <CrmPage
      title="Ride Misses"
      subtitle="Drivers who let ride requests go — the 8 pm message (J-23), who got it, who read it, who did not and why, and what happened after"
      actions={<Link to="/crm/journeys/J-23_missed_ride_requests" className="btn-outline">J-23 journey</Link>}
    >
      <ErrorNote error={d.error} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <AreaButtons value={area} onChange={setArea} />
        <RangeButtons value={days} onChange={setDays} options={[7, 14, 30]} />
      </div>
      {d.loading && !r && <Loading />}
      {r && (
        <>
          <Section title={`Last ${days} days`} subtitle="Requests missed = offers a driver rejected or left unanswered (20 s+, or still pending after 2 min)">
            <Tiles>
              <Tile label="Drivers who missed" value={num(r.totals.drivers)} />
              <Tile label="Requests missed" value={num(r.totals.requests)} color={COLORS.orange} />
              <Tile label="Fare missed" value={inr(r.totals.fare)} color={COLORS.red} />
              <Tile label="Got the message" value={num(r.totals.reached)} sub={`${pctOf(r.totals.reached, r.totals.entered)} of ${num(r.totals.entered)} picked`} color={COLORS.gold} />
              <Tile label="WhatsApp delivered" value={num(r.totals.waDelivered)} color={COLORS.green} />
              <Tile label="WhatsApp read" value={num(r.totals.waRead)} sub={`${pctOf(r.totals.waRead, r.totals.waDelivered)} of delivered`} color={COLORS.blue} />
              <Tile label="Did not get it" value={num(r.totals.notSent)} sub="reasons below" color={COLORS.red} />
            </Tiles>
            {r.notSentReasons.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, fontSize: 12, color: soft, alignItems: "center" }}>
                <span>Did not get it because:</span>
                {r.notSentReasons.map((x) => <Pill key={x.label} tone="red">{x.label} · {num(x.n)}</Pill>)}
              </div>
            )}
          </Section>

          <ChartCard title="Day by day" subtitle="Click a day to see its drivers below" style={{ marginBottom: 16 }}>
            {chart.some((x) => x.drivers || x.entered) ? (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={chart} onClick={(e) => e?.activePayload?.[0] && setDay(e.activePayload[0].payload.day)} style={{ cursor: "pointer" }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" />
                    <YAxis yAxisId="n" tick={axisTick} allowDecimals={false} />
                    <YAxis yAxisId="f" orientation="right" tick={axisTick} tickFormatter={(v) => `₹${num(v)}`} />
                    <Tooltip content={<ChartTooltip valueFormatter={(v, p) => (p.dataKey === "fare" ? inr(v) : num(v))} />} />
                    <Bar yAxisId="n" dataKey="drivers" name="Drivers who missed" fill={COLORS.orange} radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="n" dataKey="reached" name="Got the message" fill={COLORS.gold} radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="n" dataKey="waRead" name="Read it" fill={COLORS.blue} radius={[3, 3, 0, 0]} />
                    <Line yAxisId="f" dataKey="fare" name="Fare missed" stroke={COLORS.red} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
                <Legend items={[{ name: "Drivers who missed", color: COLORS.orange }, { name: "Got the message", color: COLORS.gold }, { name: "Read it", color: COLORS.blue }, { name: "Fare missed", color: COLORS.red }]} />
              </>
            ) : <Empty>No missed requests in this period</Empty>}
            {r.historyFrom && <div style={{ fontSize: 11, color: dim, marginTop: 8 }}>Daily driver numbers are kept from {dayKeyLabel(r.historyFrom)}; before that only drivers who got the message are counted.</div>}
          </ChartCard>

          <TableCard
            title={`${selected === r.today ? "Today" : dayKeyLabel(selected)} — ${num(rows.length)} drivers`}
            icon="🚕"
            actions={<DownloadButton path="/missed-rides/export" params={{ area, day: selected }} />}
          >
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "4px 0 12px", alignItems: "center" }}>
              <select className="gm-input" style={{ width: 150 }} value={selected} onChange={(e) => setDay(e.target.value)}>
                {[...(r.daily || [])].reverse().map((x) => <option key={x.day} value={x.day}>{x.day === r.today ? "Today" : dayKeyLabel(x.day)}</option>)}
              </select>
              <Chips items={SHOW} value={filter} onChange={setFilter} />
            </div>
            {sel && (
              <div style={{ fontSize: 12, color: soft, marginBottom: 10 }}>
                {num(sel.drivers)} drivers missed {num(sel.requests)} requests ({inr(sel.fare)}) · {num(sel.reached)} got the message · {num(sel.waRead)} read it
                {r.effect.messaged > 0 && <> · after the message: <b style={{ color: COLORS.green }}>{num(r.effect.cameOnline)}</b> came online within 24 h, <b style={{ color: COLORS.green }}>{num(r.effect.rode)}</b> did a ride within 48 h</>}
              </div>
            )}
            <Paged rows={rows} resetKey={`${area}|${selected}|${filter}`}>{(pageRows) => (
              <table className="gm-table">
                <thead><tr><th>Driver</th><th>City</th><th>Missed</th><th>Biggest missed ride</th><th>Message</th><th>Why not</th><th>After the message</th></tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={7}><Empty>No drivers here</Empty></td></tr>}
                  {pageRows.map((x) => (
                    <tr key={x.userId}>
                      <td><ContactCell name={x.name} phone={x.phone} userId={x.userId} /></td>
                      <td style={{ fontSize: 12 }}>{x.city || (x.cityId ? `#${x.cityId}` : "—")}</td>
                      <td style={{ fontSize: 12 }}>
                        {x.missed != null ? <b>{num(x.missed)} · {inr(x.missedFare)}</b> : "—"}
                        {x.accepted ? <div style={{ fontSize: 10.5, color: COLORS.green }}>accepted {num(x.accepted)}</div> : null}
                        {x.missed7d > 1 && <div style={{ fontSize: 10.5, color: COLORS.orange }}>{num(x.missed7d)} in 7 days</div>}
                      </td>
                      <td style={{ fontSize: 12 }}>{x.topRoute || "—"}{x.topTime && <div style={{ fontSize: 10.5, color: dim }}>{x.topTime}</div>}</td>
                      <td><ChannelCell x={x} /></td>
                      <td style={{ fontSize: 11.5, color: x.why ? COLORS.red : dim, maxWidth: 220 }}>{x.why?.label || (x.pending ? x.pending : "")}</td>
                      <td style={{ fontSize: 11.5 }}>
                        {x.onlineAfter && <div style={{ color: COLORS.green }}>Online {dt(x.onlineAfter)}</div>}
                        {x.rideAfter && <div style={{ color: COLORS.green }}>Ride {dt(x.rideAfter)}</div>}
                        {x.reached && !x.onlineAfter && !x.rideAfter && <span style={{ color: dim }}>Not yet</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}</Paged>
          </TableCard>

          <div style={{ height: 16 }} />
          <TableCard title={`Repeat missers — missed on 2+ days in the last ${days} days (${num(r.repeat.length)})`} icon="🔁">
            <Paged rows={r.repeat} resetKey={`${area}|${days}`}>{(pageRows) => (
              <table className="gm-table">
                <thead><tr><th>Driver</th><th>City</th><th>Days with misses</th><th>Requests missed</th><th>Fare missed</th><th>Last miss</th><th>Last online</th></tr></thead>
                <tbody>
                  {r.repeat.length === 0 && <tr><td colSpan={7}><Empty>Nobody missed on more than one day</Empty></td></tr>}
                  {pageRows.map((x) => (
                    <tr key={x.userId}>
                      <td><ContactCell name={x.name} phone={x.phone} userId={x.userId} /></td>
                      <td style={{ fontSize: 12 }}>{x.city || "—"}</td>
                      <td><b style={{ color: COLORS.orange }}>{num(x.days)}</b></td>
                      <td>{num(x.missed)}</td>
                      <td>{inr(x.fare)}</td>
                      <td style={{ fontSize: 12 }}>{dayKeyLabel(x.lastDay)}</td>
                      <td style={{ fontSize: 12 }}>{x.lastOnlineAt ? dt(x.lastOnlineAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}</Paged>
          </TableCard>

          <div style={{ marginTop: 16 }}>
            <Hint>
              The message goes at <b>8 pm</b> to every driver who missed at least one request that day (except those who pressed Stop), once a day.
              "After the message" uses the ride backend's online and ride-completed events: came online within 24 hours, completed a ride within 48 hours.
            </Hint>
          </div>
        </>
      )}
    </CrmPage>
  );
}
