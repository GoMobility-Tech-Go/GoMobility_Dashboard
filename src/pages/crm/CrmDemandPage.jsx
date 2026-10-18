// Where rides are missed — last 30 days: which area, which hour, which weekday ride requests went unanswered, each
// area's worst 3 hours, and one click to message that area's drivers an hour before their peak (push campaign draft —
// it still needs approval before it goes). Data: CRM /demand (ride DB view crm_offer_area_log, synced every 30 min).
import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TableCard } from "../../components/ui";
import { crmGet, crmPost } from "../../api/crm";
import {
  CrmPage, useCrm, useCrmMe, useAction, can, Loading, ErrorNote, Pill, Hint, Section, Paged, COLORS, num, inr, dt, Tile, Tiles, AreaButtons,
  ChartCard, ChartTooltip, Legend, axisTick, gridStroke, Empty,
} from "./crmShared";
import { dim, soft } from "./crmMessageParts";

// 8 three-hour blocks (IST)
const BLOCKS = [[0, "12–3 am"], [3, "3–6 am"], [6, "6–9 am"], [9, "9 am–12 pm"], [12, "12–3 pm"], [15, "3–6 pm"], [18, "6–9 pm"], [21, "9 pm–12 am"]];
const block = (hours, from) => hours[from] + hours[from + 1] + hours[from + 2];

function Heat({ areas }) {
  const top = areas.slice(0, 15);
  const max = Math.max(1, ...top.flatMap((a) => BLOCKS.map(([f]) => block(a.hoursMissed, f))));
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `180px repeat(${BLOCKS.length}, minmax(64px,1fr))`, gap: 4, minWidth: 720, fontSize: 11.5 }}>
        <div />
        {BLOCKS.map(([, l]) => <div key={l} style={{ color: dim, textAlign: "center", fontSize: 10.5 }}>{l}</div>)}
        {top.map((a) => (
          <Fragment key={a.id}>
            <div style={{ color: soft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 6 }} title={a.area}>{a.area}</div>
            {BLOCKS.map(([f, l]) => {
              const n = block(a.hoursMissed, f);
              return (
                <div key={l} title={`${a.area} · ${l}: ${n} missed`} style={{
                  height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                  background: n ? `rgba(248,113,113,${0.12 + 0.75 * (n / max)})` : "rgba(255,255,255,0.03)", color: n ? "#fff" : dim, fontWeight: n ? 700 : 400,
                }}>{n || ""}</div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export default function CrmDemandPage() {
  const navigate = useNavigate();
  const me = useCrmMe();
  const [area, setArea] = useState("ncr");
  const d = useCrm("/demand", { params: { area }, refreshMs: 600000 });
  const { busy, run } = useAction();
  const r = d.data;

  async function nudge(a) {
    const c = await run(`c-${a.id}`, () => crmGet("/demand/campaign", { id: a.id }));
    if (!c) return;
    const when = new Date(c.spec.scheduledAt).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" });
    if (!window.confirm(`Create a push campaign for ${c.drivers} drivers who get requests in ${a.area}?\n\n"${c.spec.content.title}"\n\nScheduled for ${when} (an hour before ${c.peak.label}). It is saved as a draft — check it, then submit for approval.`)) return;
    const made = await run(`m-${a.id}`, () => crmPost("/campaigns", c.spec), "Campaign draft created");
    if (made?._id) navigate(`/crm/campaigns/${made._id}`);
  }

  return (
    <CrmPage title="Where Rides Are Missed" subtitle="Last 30 days — which area and which hours ride requests go unanswered, and who to nudge before the rush">
      <ErrorNote error={d.error} />
      <div style={{ marginBottom: 14 }}><AreaButtons value={area} onChange={setArea} /></div>
      {d.loading && !r && <Loading />}
      {r && !r.areas.length && <Section><Empty>No ride requests in the last 30 days yet{r.updatedAt ? "" : " — or the ride DB view is not set up (sql/crm_offer_areas.real.sql)"}.</Empty></Section>}
      {r && r.areas.length > 0 && (
        <>
          <Section title="Last 30 days" subtitle={r.updatedAt ? `Updated ${dt(r.updatedAt)} · every 30 min` : ""}>
            <Tiles>
              <Tile label="Requests sent to drivers" value={num(r.totals.offers)} />
              <Tile label="Missed" value={num(r.totals.missed)} sub={`${r.totals.offers ? Math.round((r.totals.missed / r.totals.offers) * 100) : 0}% of requests`} color={COLORS.red} />
              <Tile label="Accepted" value={num(r.totals.accepted)} color={COLORS.green} />
              <Tile label="Fare missed" value={inr(r.totals.missedFare)} color={COLORS.orange} />
              <Tile label="Worst time overall" value={r.peak.label} sub={`${num(r.peak.missed)} missed in these 3 hours`} color={COLORS.gold} />
              <Tile label="Areas" value={num(r.totals.areas)} />
            </Tiles>
          </Section>

          <ChartCard title="Area × time of day" subtitle="Missed requests in each 3-hour block — darker = more missed (top 15 areas)" style={{ marginBottom: 16 }}>
            <Heat areas={r.areas} />
          </ChartCard>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 16, marginBottom: 16 }}>
            <ChartCard title="By hour" subtitle="All areas · IST">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={r.hours}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} interval={2} />
                  <YAxis tick={axisTick} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="offers" name="Requests" fill={COLORS.gray} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="missed" name="Missed" fill={COLORS.red} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <Legend items={[{ name: "Requests", color: COLORS.gray }, { name: "Missed", color: COLORS.red }]} />
            </ChartCard>
            <ChartCard title="By weekday" subtitle="Missed requests">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={r.dow}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="day" tick={axisTick} />
                  <YAxis tick={axisTick} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="missed" name="Missed" fill={COLORS.orange} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <TableCard title={`Areas (${num(r.areas.length)})`} icon="📍">
            <Paged rows={r.areas} resetKey={area}>{(pageRows) => (
              <table className="gm-table">
                <thead><tr><th>Area</th><th>Requests</th><th>Missed</th><th>Fare missed</th><th>Worst 3 hours</th><th>Drivers there</th><th /></tr></thead>
                <tbody>
                  {pageRows.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontSize: 12.5 }}><b>{a.area}</b>{a.city && <div style={{ fontSize: 10.5, color: dim }}>{a.city}</div>}</td>
                      <td>{num(a.offers)}</td>
                      <td><b style={{ color: COLORS.red }}>{num(a.missed)}</b><div style={{ fontSize: 10.5, color: dim }}>{a.missRate}%</div></td>
                      <td>{inr(a.missedFare)}</td>
                      <td>{a.missed ? <Pill tone="red">{a.peak.label} · {num(a.peak.missed)}</Pill> : <span style={{ color: dim }}>—</span>}</td>
                      <td>{num(a.drivers)}</td>
                      <td>{can(me, "marketer") && a.missed > 0 && (
                        <button className="btn-outline btn-sm" disabled={!!busy} onClick={() => nudge(a)} title="Push to these drivers an hour before the peak">
                          <Send size={12} /> Nudge drivers
                        </button>
                      )}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}</Paged>
          </TableCard>
          <div style={{ marginTop: 16 }}>
            <Hint>
              "Area" is the pickup locality from the ride address (e.g. "Okhla Phase III"), never the full address. "Drivers there" = drivers who got a request in that area in the last 30 days.
              <b> Nudge drivers</b> makes a free push campaign for them, scheduled an hour before the area's worst 3 hours; you check and submit it like any campaign.
            </Hint>
          </div>
        </>
      )}
    </CrmPage>
  );
}
