// Message Results (ROI) — for every journey and campaign: sent → reached → read → what people did within N days
// (driver came online / did a ride / sent documents / updated the app · passenger booked / rode) → rides × company
// revenue per ride vs what the messages cost. Data: CRM /roi.
import { useState } from "react";
import { Link } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TableCard } from "../../components/ui";
import {
  CrmPage, useCrm, Loading, ErrorNote, Pill, Hint, Section, Paged, COLORS, num, inr, Tile, Tiles, AreaButtons, Chips,
  ChartCard, ChartTooltip, Legend, RangeButtons, axisTick, gridStroke, pctOf, Empty, shortKey,
} from "./crmShared";
import { DownloadButton, dim, soft } from "./crmMessageParts";

const WINDOWS = [["3", "3 days after"], ["7", "7 days after"], ["14", "14 days after"]];
const VERDICT = {
  earning: ["green", "Earning — rides worth more than the cost"],
  rides_but_costly: ["orange", "Rides, but cost more than they earned"],
  action_no_ride: ["blue", "People acted, no rides yet"],
  no_action: ["red", "Nobody acted — rethink this message"],
  too_early: ["gray", "Too early — window not over"],
  nothing_reached: ["gray", "Did not reach anyone"],
};
const KIND = [["all", "All"], ["journey", "Journeys"], ["campaign", "Campaigns"]];

export default function CrmResultsPage() {
  const [area, setArea] = useState("ncr");
  const [days, setDays] = useState(30);
  const [win, setWin] = useState("7");
  const [kind, setKind] = useState("all");
  const params = { area, days, win };
  const d = useCrm("/roi", { params, refreshMs: 300000 });
  const r = d.data;
  const rows = (r?.rows || []).filter((x) => kind === "all" || x.kind === kind);
  const chart = rows.filter((x) => x.cost > 0 || x.revenue > 0).slice(0, 12).map((x) => ({ name: x.kind === "journey" ? shortKey(x.ref) : x.name.slice(0, 14), cost: x.cost, revenue: x.revenue }));

  return (
    <CrmPage title="Message Results" subtitle="Which messages bring drivers and riders back — and which only cost money">
      <ErrorNote error={d.error} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <AreaButtons value={area} onChange={setArea} />
        <RangeButtons value={days} onChange={setDays} options={[7, 30, 90]} />
        <Chips items={WINDOWS} value={win} onChange={setWin} />
      </div>
      {d.loading && !r && <Loading />}
      {r && (
        <>
          <Section title={`Messages sent in the last ${days} days`} subtitle={`What people did within ${win} days after the message reached them · revenue = rides × ${inr(r.revenuePerRide)} (company revenue per ride)`}>
            <Tiles>
              <Tile label="Reached" value={num(r.totals.reached)} sub={`${num(r.totals.messages)} messages`} />
              <Tile label="Read (WhatsApp)" value={num(r.totals.read)} sub={pctOf(r.totals.read, r.totals.reached)} color={COLORS.blue} />
              <Tile label="Acted" value={num(r.totals.acted)} sub={`${pctOf(r.totals.acted, r.totals.reached)} of reached`} color={COLORS.green} />
              <Tile label="Rides after" value={num(r.totals.rides)} color={COLORS.green} />
              <Tile label="Cost" value={inr(r.totals.cost)} color={COLORS.orange} />
              <Tile label="Revenue (est.)" value={inr(r.totals.revenue)} color={COLORS.gold} />
              <Tile label="Revenue ÷ cost" value={r.totals.roi == null ? "—" : `${r.totals.roi}×`} sub={r.totals.costPerActed != null ? `${inr(r.totals.costPerActed)} per person who acted` : ""} color={r.totals.profit >= 0 ? COLORS.green : COLORS.red} />
            </Tiles>
          </Section>

          {chart.length > 0 && (
            <ChartCard title="Cost vs revenue" subtitle="Per journey / campaign (top 12)" style={{ marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="name" tick={axisTick} interval={0} />
                  <YAxis tick={axisTick} tickFormatter={(v) => `₹${num(v)}`} />
                  <Tooltip content={<ChartTooltip valueFormatter={(v) => inr(v)} />} />
                  <Bar dataKey="cost" name="Cost" fill={COLORS.orange} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="revenue" name="Revenue (est.)" fill={COLORS.green} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <Legend items={[{ name: "Cost", color: COLORS.orange }, { name: "Revenue (est.)", color: COLORS.green }]} />
            </ChartCard>
          )}

          <TableCard title={`Every journey and campaign (${num(rows.length)})`} icon="📈" actions={<DownloadButton path="/roi/export" params={params} />}>
            <div style={{ padding: "4px 0 12px" }}><Chips items={KIND} value={kind} onChange={setKind} /></div>
            <Paged rows={rows} resetKey={`${area}|${days}|${win}|${kind}`}>{(pageRows) => (
              <table className="gm-table">
                <thead><tr><th>Message</th><th>Reached</th><th>Read</th><th>Acted ({win}d)</th><th>What they did</th><th>Cost</th><th>Revenue</th><th>Verdict</th></tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={8}><Empty>No messages in this period</Empty></td></tr>}
                  {pageRows.map((x) => {
                    const [tone, label] = VERDICT[x.verdict] || ["gray", x.verdict];
                    return (
                      <tr key={`${x.kind}:${x.ref}`}>
                        <td style={{ fontSize: 12 }}>
                          {x.kind === "journey"
                            ? <Link to={`/crm/journeys/${x.ref}`} style={{ color: "#fff", fontWeight: 700 }}>{x.name}</Link>
                            : <Link to={`/crm/campaigns/${x.ref}`} style={{ color: "#fff", fontWeight: 700 }}>{x.name}</Link>}
                          <div style={{ fontSize: 10.5, color: dim }}>{x.kind === "journey" ? `${shortKey(x.ref)}${x.enabled ? "" : " · off"}` : `campaign · ${x.status || ""}`} · {x.category}</div>
                        </td>
                        <td>{num(x.reached)}<div style={{ fontSize: 10.5, color: dim }}>of {num(x.people)}</div></td>
                        <td style={{ color: COLORS.blue }}>{num(x.read)}<div style={{ fontSize: 10.5, color: dim }}>{pctOf(x.read, x.reached)}</div></td>
                        <td><b style={{ color: COLORS.green }}>{num(x.acted)}</b><div style={{ fontSize: 10.5, color: dim }}>{pctOf(x.acted, x.reached)}</div></td>
                        <td style={{ fontSize: 11.5, color: soft }}>
                          {[x.online && `${num(x.online)} came online`, x.rideTakers && `${num(x.rideTakers)} did ${num(x.rides)} rides`, x.docs && `${num(x.docs)} sent documents`,
                            x.appUpdated && `${num(x.appUpdated)} updated app`, x.booked && `${num(x.booked)} booked`].filter(Boolean).join(" · ") || "—"}
                          {x.matureShare < 100 && <div style={{ fontSize: 10.5, color: dim }}>{x.matureShare}% past the {win}-day window</div>}
                        </td>
                        <td>{inr(x.cost)}{x.costPerActed != null && <div style={{ fontSize: 10.5, color: dim }}>{inr(x.costPerActed)} / person acted</div>}</td>
                        <td style={{ color: x.revenue ? COLORS.green : dim }}>{inr(x.revenue)}{x.roi != null && <div style={{ fontSize: 10.5, color: dim }}>{x.roi}× cost</div>}</td>
                        <td><Pill tone={tone}>{label}</Pill></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}</Paged>
          </TableCard>
          <div style={{ marginTop: 16 }}>
            <Hint>
              This shows what people did <b>after</b> a message reached them — not proof the message caused it (some would have come online anyway).
              Compare messages with each other: the ones with more "Acted" per rupee are the ones to keep. Revenue uses the company's revenue per ride, not the fare.
            </Hint>
          </div>
        </>
      )}
    </CrmPage>
  );
}
