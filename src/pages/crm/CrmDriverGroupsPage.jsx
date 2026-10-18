// Driver groups — Active / Slowing down / Gone 7+, 14+, 30+ / Approved but never online / KYC not finished / KYC
// rejected: how big each group is, how it changes day by day and week by week, who is in it, and a ready campaign per
// group (one click → draft → approve). The campaign targets the group itself, counted again when it sends.
// Data: CRM /driver-groups (daily copy in DailyStat, every 10 min).
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Send } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TableCard } from "../../components/ui";
import { crmPost } from "../../api/crm";
import {
  CrmPage, useCrm, useCrmMe, useAction, can, Loading, ErrorNote, Pill, Hint, Section, Paged, COLORS, num, dt, AreaButtons, Chips,
  ChartCard, ChartTooltip, Legend, axisTick, gridStroke, dayKeyLabel, pctOf, Empty,
} from "./crmShared";
import { ContactCell, DownloadButton, dim, soft } from "./crmMessageParts";

const COLOR = { active: COLORS.green, slowing: COLORS.gold, gone_7: COLORS.orange, gone_14: "#FB7185", gone_30: COLORS.red, never_online: COLORS.purple, kyc_pending: COLORS.blue, kyc_blocked: COLORS.gray };
const KYC = { verified: "Approved", approved: "Approved", in_progress: "In progress", not_started: "Not started", pending_review: "In review", rejected: "Rejected", suspended: "Suspended" };
const VIEW = [["daily", "Day by day"], ["weekly", "Week by week"]];

function Change({ now, before }) {
  if (before == null) return null;
  const d = now - before;
  if (!d) return <span style={{ fontSize: 11, color: dim }}>same as 7 days ago</span>;
  return <span style={{ fontSize: 11, color: d > 0 ? COLORS.green : COLORS.red }}>{d > 0 ? "▲" : "▼"} {num(Math.abs(d))} vs 7 days ago</span>;
}

export default function CrmDriverGroupsPage() {
  const navigate = useNavigate();
  const me = useCrmMe();
  const [area, setArea] = useState("ncr");
  const [sp] = useSearchParams();   // Daily Summary links here with ?group=slowing
  const [group, setGroup] = useState(sp.get("group") || "slowing");
  const [view, setView] = useState("daily");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const params = { area, group, ...(search ? { q: search } : {}) };
  const d = useCrm("/driver-groups", { params, refreshMs: 300000 });
  const { busy, run } = useAction();
  const r = d.data;
  const g = r?.groups.find((x) => x.key === group);
  const hist = (view === "daily" ? r?.daily : r?.weekly) || [];
  const chart = hist.map((x) => ({ ...x, label: dayKeyLabel(x.day) }));

  async function campaign(x) {
    if (!x.campaign) return;
    const ch = x.campaign.channel === "push" ? "push" : "WhatsApp (push if no WhatsApp / daily limit reached)";
    if (!window.confirm(`Create a campaign for "${x.label}" (${num(x.count)} drivers now)?\n\n"${x.campaign.content.title}"\nChannel: ${ch}\n\nIt is saved as a draft — the group is counted again when it sends. Check it, then submit for approval.`)) return;
    const made = await run(`c-${x.key}`, () => crmPost("/campaigns", x.campaign), "Campaign draft created");
    if (made?._id) navigate(`/crm/campaigns/${made._id}`);
  }

  return (
    <CrmPage title="Driver Groups" subtitle="Who is active, who is slowing down, who has gone — how each group changes, and one click to message a group">
      <ErrorNote error={d.error} />
      <div style={{ marginBottom: 14 }}><AreaButtons value={area} onChange={setArea} /></div>
      {d.loading && !r && <Loading />}
      {r && (
        <>
          <Section title={`${num(r.total)} drivers`} subtitle={`${num(r.withRide)} have done at least one ride · click a group to see its drivers`}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
              {r.groups.map((x) => (
                <button key={x.key} type="button" onClick={() => setGroup(x.key)} style={{
                  textAlign: "left", cursor: "pointer", padding: "12px 14px", borderRadius: 12, color: "inherit", fontFamily: "Outfit,sans-serif",
                  background: group === x.key ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${group === x.key ? "rgba(212,175,55,0.45)" : "rgba(255,255,255,0.08)"}`, borderLeft: `4px solid ${COLOR[x.key]}`,
                }}>
                  <div style={{ fontSize: 10.5, color: dim, textTransform: "uppercase", letterSpacing: ".6px" }}>{x.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: COLOR[x.key] }}>{num(x.count)} <span style={{ fontSize: 12, color: dim, fontWeight: 400 }}>{pctOf(x.count, r.total)}</span></div>
                  <div style={{ fontSize: 11, color: soft }}>{x.hint}</div>
                  <Change now={x.count} before={x.weekAgo} />
                </button>
              ))}
            </div>
          </Section>

          <ChartCard title="How the groups change" subtitle={r.historyFrom ? `Counted every day from ${dayKeyLabel(r.historyFrom)}` : "Counting starts today — the chart fills day by day"}
            right={<Chips items={VIEW} value={view} onChange={setView} />} style={{ marginBottom: 16 }}>
            {chart.length > 1 ? (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} />
                    <YAxis tick={axisTick} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    {r.groups.map((x) => <Line key={x.key} dataKey={x.key} name={x.label} stroke={COLOR[x.key]} strokeWidth={2} dot={false} />)}
                  </LineChart>
                </ResponsiveContainer>
                <Legend items={r.groups.map((x) => ({ name: x.label, color: COLOR[x.key] }))} />
              </>
            ) : <Empty>Not enough days yet — come back tomorrow</Empty>}
          </ChartCard>

          <TableCard
            title={`${g?.label || ""} (${num(r.list.length)}${r.list.length >= 2000 ? "+" : ""})`}
            icon="👥"
            actions={
              <div style={{ display: "flex", gap: 8 }}>
                {g?.campaign && can(me, "marketer") && <button className="btn-gold btn-sm" disabled={!!busy || !g.count} onClick={() => campaign(g)}><Send size={12} /> Message this group</button>}
                <DownloadButton path="/driver-groups/export" params={params} />
              </div>
            }
          >
            <form onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }} style={{ display: "flex", gap: 6, padding: "4px 0 12px", justifyContent: "space-between", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: soft }}>{g?.hint}{g?.campaign ? ` · suggested message: "${g.campaign.content.title}"` : " · needs ops (documents), not a marketing message"}</span>
              <span style={{ display: "flex", gap: 6 }}>
                <input className="gm-input" style={{ width: 220 }} placeholder="Name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
                <button className="btn-outline btn-sm" type="submit">Search</button>
              </span>
            </form>
            <Paged rows={r.list} resetKey={`${area}|${group}|${search}`}>{(pageRows) => (
              <table className="gm-table">
                <thead><tr><th>Driver</th><th>City</th><th>KYC</th><th>Last online</th><th>Online 7d</th><th>Rides</th><th>App</th><th>Reach</th></tr></thead>
                <tbody>
                  {r.list.length === 0 && <tr><td colSpan={8}><Empty>Nobody in this group</Empty></td></tr>}
                  {pageRows.map((x) => (
                    <tr key={x.userId}>
                      <td><ContactCell name={x.name} phone={x.phone} userId={x.userId} /></td>
                      <td style={{ fontSize: 12 }}>{x.city || (x.cityId ? `#${x.cityId}` : "—")}</td>
                      <td style={{ fontSize: 12 }}>{KYC[x.kycStatus] || x.kycStatus || "—"}</td>
                      <td style={{ fontSize: 12 }}>{x.lastOnlineAt ? dt(x.lastOnlineAt) : "Never"}</td>
                      <td style={{ fontSize: 12 }}>{x.onlineHours7d == null ? "—" : `${x.onlineHours7d} h`}</td>
                      <td style={{ fontSize: 12 }}>{x.hasRide ? <Pill tone="green">Has rides</Pill> : <span style={{ color: dim }}>No ride yet</span>}{x.missed7d > 0 && <div style={{ fontSize: 10.5, color: COLORS.orange }}>missed {num(x.missed7d)} in 7d</div>}</td>
                      <td style={{ fontSize: 12 }}>{x.appVersion ? `v${x.appVersion}` : "—"}{x.appOutdated && <div style={{ fontSize: 10.5, color: COLORS.orange }}>old</div>}</td>
                      <td style={{ fontSize: 11 }}>
                        {x.stopped ? <Pill tone="gray">Stop</Pill> : null}
                        {!x.push && <div style={{ color: dim }}>no push</div>}
                        {x.noWhatsApp && <div style={{ color: dim }}>no WhatsApp</div>}
                        {x.push && !x.noWhatsApp && !x.stopped && <span style={{ color: COLORS.green }}>✓</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}</Paged>
          </TableCard>
          <div style={{ marginTop: 16 }}>
            <Hint>
              Every driver is in exactly one group. "Online" is the driver's last online session in the ride backend. <b>Message this group</b> makes a draft campaign aimed at the group
              itself — whoever is in it when the campaign sends gets it (drivers who pressed Stop are skipped). WhatsApp reaches about 180 new people a day; the rest get a push.
            </Hint>
          </div>
        </>
      )}
    </CrmPage>
  );
}
