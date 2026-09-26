// Message log — every outbound (and inbound) CRM message: channel, source, delivery outcome and cost.
import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TableCard } from "../../components/ui";
import { crmGet, crmErrorText } from "../../api/crm";
import {
  CrmPage, useCrm, Loading, ErrorNote, StatusPill, CategoryPill, Pill, ChartCard, ChartTooltip, Legend, NoChartData,
  COLORS, CHANNEL, axisTick, gridStroke, inr, dt, day, num, shortKey,
} from "./crmShared";

const STATUSES = [["", "All statuses"], ["dry_run", "Dry run"], ["queued", "Queued"], ["sent", "Sent"], ["delivered", "Delivered"], ["read", "Read"], ["failed", "Failed"], ["skipped", "Skipped"], ["blocked", "Blocked"]];

export default function CrmMessagesPage() {
  const [filters, setFilters] = useState({ channel: "", status: "", kind: "" });
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const trend = useCrm("/metrics/analytics", { params: { days: 14 }, refreshMs: 120000 });

  const params = (before) => Object.fromEntries(Object.entries({ ...filters, before, limit: 50 }).filter(([, v]) => v));

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    crmGet("/messages", params())
      .then((r) => { if (alive) { setItems(r.items); setNext(r.nextBefore); } })
      .catch((e) => alive && setError(crmErrorText(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function more() {
    setLoading(true);
    try { const r = await crmGet("/messages", params(next)); setItems((p) => [...p, ...r.items]); setNext(r.nextBefore); }
    catch (e) { setError(crmErrorText(e)); }
    finally { setLoading(false); }
  }

  const sel = (k, opts) => (
    <select className="gm-input" style={{ width: 170 }} value={filters[k]} onChange={(e) => setFilters((p) => ({ ...p, [k]: e.target.value }))}>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
  const t = trend.data;

  return (
    <CrmPage title="Messages" subtitle="Every message the CRM has sent or received — including dry runs, failures and skips">
      <div style={{ marginBottom: 16 }}>
        <ChartCard title="Last 14 Days" subtitle={t ? `${num(t.totals.sent)} delivered · ${num(t.totals.failed)} failed` : ""}>
          {!t ? <Loading /> : t.totals.sent + t.totals.failed === 0 ? <NoChartData height={150} /> : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={t.daily} barSize={Math.max(6, Math.min(26, 560 / t.daily.length))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={day} tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip labelFormatter={day} />} cursor={{ fill: "rgba(212,175,55,0.05)" }} />
                  <Bar dataKey="sent" name="Delivered" stackId="m" fill={COLORS.gold} />
                  <Bar dataKey="skipped" name="Skipped" stackId="m" fill={COLORS.orange} />
                  <Bar dataKey="failed" name="Failed" stackId="m" fill={COLORS.red} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <Legend items={[{ name: "Delivered", color: COLORS.gold }, { name: "Skipped", color: COLORS.orange }, { name: "Failed", color: COLORS.red }]} />
            </>
          )}
        </ChartCard>
      </div>

      <ErrorNote error={error} />
      <TableCard
        title="Message Log" icon="✉️"
        actions={<>
          {sel("channel", [["", "All channels"], ...Object.entries(CHANNEL)])}
          {sel("status", STATUSES)}
          {sel("kind", [["", "Journeys & campaigns"], ["journey", "Journeys"], ["campaign", "Campaigns"]])}
        </>}
        footer={next && <button className="btn-outline btn-sm" disabled={loading} onClick={more}>{loading ? "Loading…" : "Load more"}</button>}
      >
        {loading && !items.length ? <Loading /> : (
          <table className="gm-table">
            <thead><tr><th>Time</th><th>Contact</th><th>Channel</th><th>Source</th><th>Content</th><th>Status</th><th>Cost</th></tr></thead>
            <tbody>
              {items.map((m) => (
                <tr key={m._id}>
                  <td style={{ whiteSpace: "nowrap" }}>{dt(m.createdAt)}</td>
                  <td style={{ fontSize: 11.5 }}>{m.userId || "—"}<div style={{ color: "rgba(255,255,255,0.35)", textTransform: "capitalize" }}>{m.role}</div></td>
                  <td>{CHANNEL[m.channel] || m.channel}{m.direction === "in" && <> <Pill tone="blue">Inbound</Pill></>}</td>
                  <td style={{ fontSize: 12 }}>
                    {m.source?.kind === "campaign" ? "Campaign" : shortKey(m.source?.ref) || "—"}{m.source?.node ? ` · ${m.source.node}` : ""}
                    {m.category === "transactional" && <div style={{ marginTop: 3 }}><CategoryPill category="transactional" /></div>}
                  </td>
                  <td style={{ fontSize: 12, maxWidth: 360 }}>{m.payload?.title ? <b style={{ color: "rgba(255,255,255,0.85)" }}>{m.payload.title} </b> : null}{m.payload?.body || (m.payload?.templateName ? `Template: ${m.payload.templateName}` : "")}</td>
                  <td><StatusPill status={m.status} />{m.error && <div style={{ fontSize: 10.5, color: "#F87171", marginTop: 3 }}>{m.error.replace(/_/g, " ")}</div>}</td>
                  <td>{m.costInr ? inr(m.costInr) : "—"}</td>
                </tr>
              ))}
              {!loading && !items.length && <tr><td colSpan={7} style={{ textAlign: "center", color: "rgba(255,255,255,0.35)" }}>No messages match these filters</td></tr>}
            </tbody>
          </table>
        )}
      </TableCard>
    </CrmPage>
  );
}
