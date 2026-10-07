// Message log — every outbound (and inbound) CRM message: who, which journey step, what was said, delivery outcome and cost.
import { Fragment, useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Send, SkipForward, AlertTriangle, IndianRupee, ChevronDown, ChevronRight, X } from "lucide-react";
import { StatCard, TableCard } from "../../components/ui";
import { crmGet, crmErrorText } from "../../api/crm";
import {
  CrmPage, useCrm, Loading, ErrorNote, StatusPill, CategoryPill, Pill, ChartCard, ChartTooltip, Legend, NoChartData, Grid,
  COLORS, CHANNEL, CHANNEL_COLOR, axisTick, gridStroke, inr, day, num, shortKey,
} from "./crmShared";
import { TimeCell, ContactCell, MessageContent, MessageDetails, DownloadButton, istDayStart, istDayEnd, dim, soft } from "./crmMessageParts";

const STATUSES = [["", "All statuses"], ["dry_run", "Dry run"], ["queued", "Queued"], ["sent", "Sent"], ["delivered", "Delivered"], ["read", "Read"], ["failed", "Failed"], ["skipped", "Skipped"], ["blocked", "Blocked"]];
const EMPTY = { channel: "", status: "", kind: "", ref: "", phone: "", fromDay: "", toDay: "" };

export default function CrmMessagesPage() {
  const [filters, setFilters] = useState(EMPTY);
  const [phoneText, setPhoneText] = useState("");
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);
  const trend = useCrm("/metrics/analytics", { params: { days: 14 }, refreshMs: 120000 });
  const journeys = useCrm("/journeys");
  const settings = useCrm("/settings");
  const dry = !!settings.data?.dryRun;

  // what the API understands (the day pickers become an India-time range)
  const apiFilters = useMemo(() => {
    const { fromDay, toDay, ...rest } = filters;
    return Object.fromEntries(Object.entries({ ...rest, from: istDayStart(fromDay), to: istDayEnd(toDay) }).filter(([, v]) => v));
  }, [filters]);
  const params = (before) => ({ ...apiFilters, ...(before ? { before } : {}), limit: 50 });
  const set = (k, v) => setFilters((p) => ({ ...p, [k]: v }));
  const active = Object.values(filters).some(Boolean);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null); setOpen(null);
    crmGet("/messages", params())
      .then((r) => { if (alive) { setItems(r.items); setNext(r.nextBefore); } })
      .catch((e) => alive && setError(crmErrorText(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFilters]);

  async function more() {
    setLoading(true);
    try { const r = await crmGet("/messages", params(next)); setItems((p) => [...p, ...r.items]); setNext(r.nextBefore); }
    catch (e) { setError(crmErrorText(e)); }
    finally { setLoading(false); }
  }

  const sel = (k, opts, width = 160) => (
    <select className="gm-input" style={{ width }} value={filters[k]} onChange={(e) => set(k, e.target.value)}>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
  const dayInput = (k, label) => (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: dim }}>
      {label}
      <input type="date" className="gm-input" style={{ width: 132, colorScheme: "dark" }} value={filters[k]}
        min={k === "toDay" ? filters.fromDay || undefined : undefined} max={k === "fromDay" ? filters.toDay || undefined : undefined}
        onChange={(e) => set(k, e.target.value)} />
    </label>
  );
  const t = trend.data;
  const journeyList = journeys.data?.journeys || [];
  const journeyNames = useMemo(() => Object.fromEntries(journeyList.map((j) => [j.key, j.name])), [journeyList]);
  const sum = (k) => (t?.daily || []).reduce((a, d) => a + (d[k] || 0), 0);
  const byChannel = t ? Object.keys(CHANNEL).map((c) => [c, sum(c)]).filter(([, n]) => n > 0) : [];
  const sentLabel = dry ? "Dry run" : "Sent";

  return (
    <CrmPage title="Messages" subtitle="Every message the CRM has sent or received — including dry runs, failures and skips">
      <Grid min={190}>
        <StatCard label={`${dry ? "Would send (dry run)" : "Sent"} · 14D`} value={t ? num(t.totals.sent) : "—"} icon={Send} />
        <StatCard label="Skipped · 14D" value={t ? num(sum("skipped")) : "—"} icon={SkipForward} iconColor={COLORS.orange} iconBg="rgba(245,158,11,0.1)" />
        <StatCard label="Failed · 14D" value={t ? num(t.totals.failed) : "—"} icon={AlertTriangle} iconColor={COLORS.red} iconBg="rgba(248,113,113,0.1)" />
        <StatCard label={`${dry ? "Cost if sent" : "Spend"} · 14D`} value={t ? inr(t.totals.costInr) : "—"} icon={IndianRupee} iconColor={COLORS.green} iconBg="rgba(52,211,153,0.1)" />
      </Grid>

      <div style={{ marginBottom: 16 }}>
        <ChartCard
          title="Last 14 Days"
          subtitle={t ? `${num(t.totals.sent)} ${dry ? "dry run (nothing was delivered)" : "sent"} · ${num(t.totals.failed)} failed` : ""}
          right={byChannel.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {byChannel.map(([c, n]) => (
                <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: soft, padding: "3px 9px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ width: 7, height: 7, borderRadius: 4, background: CHANNEL_COLOR[c] || COLORS.gold }} />{CHANNEL[c]} <b style={{ color: "#fff" }}>{num(n)}</b>
                </span>
              ))}
            </div>
          )}
        >
          {!t ? <Loading /> : t.totals.sent + t.totals.failed === 0 ? <NoChartData height={150} /> : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={t.daily} barSize={Math.max(6, Math.min(26, 560 / t.daily.length))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={day} tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip labelFormatter={day} />} cursor={{ fill: "rgba(212,175,55,0.05)" }} />
                  <Bar dataKey="sent" name={sentLabel} stackId="m" fill={COLORS.gold} />
                  <Bar dataKey="skipped" name="Skipped" stackId="m" fill={COLORS.orange} />
                  <Bar dataKey="failed" name="Failed" stackId="m" fill={COLORS.red} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <Legend items={[{ name: sentLabel, color: COLORS.gold }, { name: "Skipped", color: COLORS.orange }, { name: "Failed", color: COLORS.red }]} />
            </>
          )}
        </ChartCard>
      </div>

      <ErrorNote error={error} />
      <TableCard
        title="Message Log" icon="✉️"
        actions={<DownloadButton path="/messages/export" params={apiFilters} title="Downloads the messages matching the filters below (up to 10,000)" />}
        footer={<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11.5, color: dim }}>Showing {num(items.length)} message{items.length === 1 ? "" : "s"} · click a row for full details</span>
          {next && <button className="btn-outline btn-sm" disabled={loading} onClick={more}>{loading ? "Loading…" : "Load more"}</button>}
        </div>}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <form onSubmit={(e) => { e.preventDefault(); const d = phoneText.replace(/\D/g, ""); set("phone", d.length >= 4 ? d : ""); }}>
            <input className="gm-input" style={{ width: 160 }} placeholder="Phone (last 4+ digits)" value={phoneText}
              onChange={(e) => { setPhoneText(e.target.value); if (!e.target.value) set("phone", ""); }} />
          </form>
          {sel("ref", [["", "All journeys"], ...journeyList.map((j) => [j.key, j.name])], 195)}
          {sel("channel", [["", "All channels"], ...Object.entries(CHANNEL)], 150)}
          {sel("status", STATUSES, 140)}
          {sel("kind", [["", "Journeys & campaigns"], ["journey", "Journeys only"], ["campaign", "Campaigns only"]], 175)}
          {dayInput("fromDay", "From")}
          {dayInput("toDay", "To")}
          {active && <button type="button" className="btn-outline btn-xs" onClick={() => { setFilters(EMPTY); setPhoneText(""); }}><X size={11} /> Clear</button>}
        </div>
        {loading && !items.length ? <Loading /> : (
          <table className="gm-table">
            <thead><tr><th style={{ width: 24 }} /><th>Time</th><th>Contact</th><th>Channel</th><th>Source</th><th>Content</th><th>Status</th><th>Cost</th></tr></thead>
            <tbody>
              {items.map((m) => {
                const isOpen = open === m._id;
                const jName = journeyNames[m.source?.ref];
                return (
                  <Fragment key={m._id}>
                    <tr onClick={() => setOpen(isOpen ? null : m._id)} style={{ cursor: "pointer", background: isOpen ? "rgba(212,175,55,0.05)" : undefined }}>
                      <td style={{ color: dim, paddingRight: 0 }}>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                      <td><TimeCell at={m.createdAt} /></td>
                      <td><ContactCell name={m.name} phone={m.phone} userId={m.userId} role={m.role} stop /></td>
                      <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 4, background: CHANNEL_COLOR[m.channel] || COLORS.gray, marginRight: 6 }} />
                        {CHANNEL[m.channel] || m.channel}{m.direction === "in" && <> <Pill tone="blue">Inbound</Pill></>}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <div style={{ color: "rgba(255,255,255,0.85)" }}>{m.source?.kind === "campaign" ? "Campaign" : (jName || shortKey(m.source?.ref) || "—")}</div>
                        <div style={{ color: dim, fontSize: 10.5 }}>{[m.source?.kind === "journey" && jName ? shortKey(m.source.ref) : null, m.source?.node && `step ${m.source.node}`].filter(Boolean).join(" · ")}</div>
                        {m.category === "transactional" && <div style={{ marginTop: 3 }}><CategoryPill category="transactional" /></div>}
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 380 }}><MessageContent m={m} /></td>
                      <td><StatusPill status={m.status} />{m.error && <div style={{ fontSize: 10.5, color: "#F87171", marginTop: 3 }}>{m.error.replace(/_/g, " ")}</div>}</td>
                      <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{m.costInr ? inr(m.costInr) : "—"}</td>
                    </tr>
                    {isOpen && <tr><td colSpan={8} style={{ background: "rgba(0,0,0,0.18)", padding: "12px 16px" }}><MessageDetails m={m} journeyName={jName} /></td></tr>}
                  </Fragment>
                );
              })}
              {!loading && !items.length && <tr><td colSpan={8} style={{ textAlign: "center", color: dim }}>No messages match these filters</td></tr>}
            </tbody>
          </table>
        )}
      </TableCard>
    </CrmPage>
  );
}
