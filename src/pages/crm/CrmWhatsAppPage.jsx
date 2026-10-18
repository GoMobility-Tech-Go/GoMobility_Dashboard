// WhatsApp — today's limit (Meta allows the number to start chats with 250 different people per 24 h), the number's
// health on Meta (quality, tier, display name), cost (today / month / per day), why messages failed today, and every
// template: status on Meta, which journey / campaign uses it, and how it did in the last 30 days.
// Data: CRM /whatsapp/status and /whatsapp/templates (Meta data cached 10 min — "Refresh from Meta" bypasses it).
import { useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TableCard } from "../../components/ui";
import { crmGet } from "../../api/crm";
import {
  CrmPage, useCrm, Loading, ErrorNote, Pill, Hint, Section, Grid, Paged, COLORS, num, inr, dt, Tile, Tiles, Chips,
  ChartCard, ChartTooltip, Legend, axisTick, gridStroke, dayKeyLabel, pctOf, Empty, shortKey,
} from "./crmShared";
import { dim, soft } from "./crmMessageParts";

const QUALITY = { GREEN: ["green", "Good"], YELLOW: ["orange", "Medium — slow down marketing"], RED: ["red", "Low — stop marketing, Meta may limit the number"], UNKNOWN: ["gray", "Not rated yet"] };
const TIER = { TIER_50: 50, TIER_250: 250, TIER_1K: 1000, TIER_10K: 10000, TIER_100K: 100000, TIER_UNLIMITED: "Unlimited" };
const T_STATUS = { APPROVED: "green", PENDING: "gold", IN_APPEAL: "gold", REJECTED: "red", PAUSED: "orange", DISABLED: "red" };
const T_FILTER = [["all", "All"], ["in_use", "In use"], ["pending", "In review"], ["rejected", "Rejected / paused"]];

function Meter({ used, limit, reserve, marketing, transactional }) {
  const w = (n) => `${Math.min(100, (n / Math.max(1, limit)) * 100)}%`;
  return (
    <div>
      <div style={{ display: "flex", height: 16, borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
        <div title="Marketing" style={{ width: w(marketing), background: COLORS.gold }} />
        <div title="Important (transactional)" style={{ width: w(transactional), background: COLORS.green }} />
      </div>
      <div style={{ position: "relative", height: 16 }}>
        <div style={{ position: "absolute", left: `${((limit - reserve) / limit) * 100}%`, top: -18, height: 20, borderLeft: "2px dashed rgba(255,255,255,0.45)" }} />
        <span style={{ position: "absolute", left: `calc(${((limit - reserve) / limit) * 100}% + 4px)`, top: 2, fontSize: 10, color: dim }}>marketing stops here ({num(limit - reserve)})</span>
      </div>
      <div style={{ fontSize: 12, color: soft, marginTop: 4 }}>{num(used)} of {num(limit)} people in the last 24 hours</div>
    </div>
  );
}

export default function CrmWhatsAppPage() {
  const [tf, setTf] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const s = useCrm("/whatsapp/status", { refreshMs: 60000 });
  const t = useCrm("/whatsapp/templates", { refreshMs: 600000 });
  // Meta data is cached 10 min on the CRM; this asks Meta once, then the page reloads normally
  const refreshMeta = async () => {
    setRefreshing(true);
    try { await Promise.all([crmGet("/whatsapp/status", { refresh: 1 }), crmGet("/whatsapp/templates", { refresh: 1 })]); } catch { /* the reload shows the error */ }
    await Promise.all([s.reload(), t.reload()]);
    setRefreshing(false);
  };
  const r = s.data, tp = t.data;
  const n = r?.number || {};
  const [qTone, qText] = QUALITY[n.quality_rating] || QUALITY.UNKNOWN;
  const chart = (r?.daily || []).map((x) => ({ ...x, label: dayKeyLabel(x.day) }));
  const templates = (tp?.templates || []).filter((x) => (tf === "all" ? true : tf === "in_use" ? x.usedBy.length : tf === "pending" ? ["PENDING", "IN_APPEAL"].includes(x.status) : ["REJECTED", "PAUSED", "DISABLED"].includes(x.status)));

  return (
    <CrmPage
      title="WhatsApp"
      subtitle="Today's sending limit, the number's health on Meta, cost, failures and every template"
      actions={<button className="btn-outline" disabled={refreshing} onClick={refreshMeta}><RefreshCw size={14} /> {refreshing ? "Asking Meta…" : "Refresh from Meta"}</button>}
    >
      <ErrorNote error={s.error} />
      {s.loading && !r && <Loading />}
      {r && (
        <>
          <Grid min={340}>
            <Section title="Today's limit" subtitle="Meta counts different people the number messages in a rolling 24 hours" style={{ marginBottom: 0 }}>
              <Meter {...r.budget} />
              <Tiles min={130}>
                <Tile label="Marketing left" value={num(r.budget.marketingLeft)} color={r.budget.marketingLeft > 20 ? COLORS.gold : COLORS.red} />
                <Tile label="Total left" value={num(r.budget.left)} color={COLORS.green} />
                <Tile label="Marketing used" value={num(r.budget.marketing)} />
                <Tile label="Important used" value={num(r.budget.transactional)} sub={`${num(r.budget.reserve)} kept for these`} />
              </Tiles>
              {r.budget.nextFreeAt && <div style={{ fontSize: 11.5, color: dim, marginTop: 10 }}>Next place frees up {dt(r.budget.nextFreeAt)}. Change the limit in <Link to="/crm/settings" style={{ color: COLORS.gold }}>CRM Settings</Link>.</div>}
            </Section>

            <Section title="Number on Meta" subtitle={r.checkedAt ? `Checked ${dt(r.checkedAt)}` : ""} style={{ marginBottom: 0 }}>
              {n.error ? <div style={{ color: COLORS.red, fontSize: 12.5 }}>Could not reach Meta: {n.error}</div> : (
                <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
                  <div>{n.display_phone_number} · <b>{n.verified_name}</b></div>
                  <div>Quality: <Pill tone={qTone}>{n.quality_rating || "UNKNOWN"}</Pill> <span style={{ color: soft, fontSize: 12 }}>{qText}</span></div>
                  <div>Daily limit tier: <b>{num(TIER[n.messaging_limit_tier] ?? n.messaging_limit_tier)}</b> people / 24 h
                    {n.messaging_limit_tier === "TIER_250" && <div style={{ fontSize: 11.5, color: dim }}>Goes up to 1,000 after Business Verification and an approved display name.</div>}
                  </div>
                  <div>Display name: <Pill tone={n.name_status === "APPROVED" ? "green" : n.name_status === "DECLINED" ? "red" : "gold"}>{n.name_status || "—"}</Pill></div>
                </div>
              )}
            </Section>
          </Grid>

          <Section title="Cost" subtitle={r.cost.note}>
            <Tiles min={150}>
              <Tile label="Today" value={inr(r.cost.today.total)} color={COLORS.gold} />
              <Tile label="This month" value={inr(r.cost.month.total)} color={COLORS.gold} />
              {Object.entries(r.cost.month.byChannel).filter(([, v]) => v.cost > 0).map(([ch, v]) => (
                <Tile key={ch} label={`Month · ${ch.replace("whatsapp_", "WhatsApp ")}`} value={inr(v.cost)} sub={`${num(v.n)} messages`} />
              ))}
            </Tiles>
          </Section>

          <ChartCard title="Last 14 days" subtitle="People messaged on WhatsApp per day, delivered, read, failed, and cost" style={{ marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={axisTick} />
                <YAxis yAxisId="n" tick={axisTick} allowDecimals={false} />
                <YAxis yAxisId="c" orientation="right" tick={axisTick} tickFormatter={(v) => `₹${num(v)}`} />
                <Tooltip content={<ChartTooltip valueFormatter={(v, p) => (p.dataKey === "cost" ? inr(v) : num(v))} />} />
                <Bar yAxisId="n" dataKey="people" name="People" fill={COLORS.gold} radius={[3, 3, 0, 0]} />
                <Bar yAxisId="n" dataKey="read" name="Read" fill={COLORS.blue} radius={[3, 3, 0, 0]} />
                <Bar yAxisId="n" dataKey="failed" name="Failed" fill={COLORS.red} radius={[3, 3, 0, 0]} />
                <Line yAxisId="c" dataKey="cost" name="Cost" stroke={COLORS.green} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <Legend items={[{ name: "People", color: COLORS.gold }, { name: "Read", color: COLORS.blue }, { name: "Failed", color: COLORS.red }, { name: "Cost", color: COLORS.green }]} />
          </ChartCard>

          <Section title="Today" subtitle="WhatsApp messages by status, and why the failed ones failed">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {Object.entries(r.today.byStatus).map(([st, v]) => <Pill key={st} tone={{ read: "blue", delivered: "green", sent: "gold", failed: "red", skipped: "orange" }[st] || "gray"}>{st} · {num(v)}</Pill>)}
              {!Object.keys(r.today.byStatus).length && <span style={{ color: dim, fontSize: 12 }}>Nothing sent today yet</span>}
            </div>
            {r.today.failReasons.map((x) => (
              <div key={x.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ color: soft }}>{x.label}</span><b style={{ color: COLORS.red }}>{num(x.n)}</b>
              </div>
            ))}
          </Section>
        </>
      )}

      <ErrorNote error={t.error} />
      {tp && (
        <TableCard title={`Templates (${num(tp.templates.length)})`} icon="🧾">
          {!tp.ok && <div style={{ color: COLORS.red, fontSize: 12.5, marginBottom: 10 }}>Could not read templates from Meta: {tp.error}</div>}
          {tp.missing.length > 0 && (
            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 12.5 }}>
              <b style={{ color: COLORS.red }}>Used but not on Meta — these messages will fail:</b>
              {tp.missing.map((m) => <div key={m.name} style={{ marginTop: 4 }}><code>{m.name}</code> · {m.usedBy.map((u) => u.kind === "journey" ? shortKey(u.key) : u.name).join(", ")}</div>)}
            </div>
          )}
          <div style={{ padding: "4px 0 12px" }}><Chips items={T_FILTER} value={tf} onChange={setTf} /></div>
          <Paged rows={templates} resetKey={tf}>{(pageRows) => (
            <table className="gm-table">
              <thead><tr><th>Template</th><th>Status</th><th>Used by</th><th>Last 30 days</th><th>Message</th></tr></thead>
              <tbody>
                {templates.length === 0 && <tr><td colSpan={5}><Empty>No templates here</Empty></td></tr>}
                {pageRows.map((x) => (
                  <tr key={`${x.name}|${x.language}`}>
                    <td style={{ fontSize: 12 }}>
                      <b>{x.name}</b>
                      <div style={{ fontSize: 10.5, color: dim }}>{x.category?.toLowerCase()} · {x.language}{x.header ? ` · ${x.header.toLowerCase()} header` : ""}</div>
                      {x.buttons.length > 0 && <div style={{ fontSize: 10.5, color: dim }}>Buttons: {x.buttons.join(", ")}</div>}
                    </td>
                    <td>
                      <Pill tone={T_STATUS[x.status] || "gray"}>{x.status}</Pill>
                      {x.rejectedReason && <div style={{ fontSize: 10.5, color: COLORS.red, marginTop: 3 }}>{x.rejectedReason}</div>}
                      {x.quality && x.quality !== "UNKNOWN" && <div style={{ fontSize: 10.5, color: dim, marginTop: 3 }}>quality {x.quality}</div>}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {x.usedBy.length === 0 && <span style={{ color: dim }}>Not used</span>}
                      {x.usedBy.map((u) => u.kind === "journey"
                        ? <div key={u.key}><Link to={`/crm/journeys/${u.key}`} style={{ color: u.enabled ? COLORS.gold : dim }}>{shortKey(u.key)}</Link>{!u.enabled && <span style={{ color: dim }}> (off)</span>}</div>
                        : <div key={u.id}><Link to={`/crm/campaigns/${u.id}`} style={{ color: soft }}>{u.name}</Link> <span style={{ color: dim }}>({u.status})</span></div>)}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {x.last30d ? (
                        <>
                          <div>{num(x.last30d.sent)} sent · <span style={{ color: COLORS.green }}>{pctOf(x.last30d.delivered, x.last30d.sent)} delivered</span></div>
                          <div style={{ color: COLORS.blue }}>{num(x.last30d.read)} read ({pctOf(x.last30d.read, x.last30d.delivered)})</div>
                          {x.last30d.failed > 0 && <div style={{ color: COLORS.red }}>{num(x.last30d.failed)} failed</div>}
                          <div style={{ color: dim, fontSize: 10.5 }}>{inr(x.last30d.cost)} · last {dt(x.last30d.last)}</div>
                        </>
                      ) : <span style={{ color: dim }}>—</span>}
                    </td>
                    <td style={{ fontSize: 11.5, color: soft, maxWidth: 360, whiteSpace: "pre-wrap" }}>{x.body.length > 220 ? `${x.body.slice(0, 220)}…` : x.body}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}</Paged>
        </TableCard>
      )}
      {t.loading && !tp && <Loading />}
      <div style={{ marginTop: 16 }}>
        <Hint>Cost here is the CRM's estimate from per-message rates; the Meta invoice is the final number. Meta does not charge for messages it blocks (for example "Meta marketing limit").</Hint>
      </div>
    </CrmPage>
  );
}
