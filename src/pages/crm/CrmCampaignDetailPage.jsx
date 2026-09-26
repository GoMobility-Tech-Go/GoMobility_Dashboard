// A single campaign: content, cost estimate (PRD §3.2 — mandatory), submit / approve / cancel, and the post-send report (§7).
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from "recharts";
import { ArrowLeft, Calculator, Send, CheckCheck, XCircle, Pencil } from "lucide-react";
import { crmPost } from "../../api/crm";
import {
  CrmPage, useCrm, useCrmMe, useAction, can, Loading, ErrorNote, StatusPill, CategoryPill, Pill, Section, Hint, ChartTooltip, Legend,
  COLORS, STATUS_COLOR, CHANNEL, axisTick, gridStroke, inr, num, dt, statusLabel,
} from "./crmShared";

const Row = ({ k, children }) => (
  <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(212,175,55,0.07)", fontSize: 13, fontFamily: "Outfit,sans-serif" }}>
    <div style={{ width: 170, flexShrink: 0, color: "rgba(255,255,255,0.4)" }}>{k}</div>
    <div style={{ color: "rgba(255,255,255,0.85)", minWidth: 0, wordBreak: "break-word" }}>{children}</div>
  </div>
);

const VERDICT = {
  no_rides_yet: ["orange", "No rides yet"], free_no_rides: ["gray", "Free send, no rides yet"],
  under_revenue_per_ride: ["green", "Profitable — cheaper than a ride's revenue"], costs_more_than_a_ride_earns: ["red", "Unprofitable — costs more than a ride earns"],
};
const FILTER_LABEL = {
  lastRideDaysAgoGte: "Last ride ≥ {} days ago", lastRideDaysAgoLte: "Last ride ≤ {} days ago", signupDaysAgoGte: "Signed up ≥ {} days ago",
  signupDaysAgoLte: "Signed up ≤ {} days ago", rides7dGte: "Rides (7d) ≥ {}", rides7dLte: "Rides (7d) ≤ {}", rides30dGte: "Rides (30d) ≥ {}",
  rides30dLte: "Rides (30d) ≤ {}", ridesTotalGte: "Lifetime rides ≥ {}", ridesTotalLte: "Lifetime rides ≤ {}", lifetimeSpendGte: "Spend ≥ ₹{}",
  lifetimeSpendLte: "Spend ≤ ₹{}", cityIds: "Cities: {}", kycStatus: "KYC: {}", subscriptionTier: "Plan: {}", hasPushToken: "Push token: {}",
};
const segmentText = (s = {}) => Object.entries(s).filter(([k]) => k !== "role")
  .map(([k, v]) => (FILTER_LABEL[k] || `${k}: {}`).replace("{}", Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "yes" : "no") : v)).join(" · ") || "Everyone";

export default function CrmCampaignDetailPage() {
  const { id } = useParams();
  const me = useCrmMe();
  const c = useCrm(`/campaigns/${id}`, { refreshMs: 20000 });
  const d = c.data;
  const report = useCrm(`/campaigns/${id}/report`, { skip: !d?.sentAt, refreshMs: 60000 });
  const { busy, run } = useAction();

  const e = d?.estimate?.at ? d.estimate : null;
  const reach = useMemo(() => e ? [
    { stage: "Matched", value: e.matched || 0, color: COLORS.blue },
    { stage: "No consent", value: e.excluded?.noConsent || 0, color: COLORS.gray },
    { stage: "Suppressed", value: e.excluded?.suppressed || 0, color: COLORS.red },
    { stage: "Capped", value: e.excluded?.capped || 0, color: COLORS.orange },
    { stage: "No channel", value: e.excluded?.noChannel || 0, color: "rgba(255,255,255,0.2)" },
    { stage: "Recipients", value: e.recipients || 0, color: COLORS.gold },
  ] : [], [e]);
  const deliveryPie = useMemo(() => Object.entries(report.data?.messages || {}).filter(([, v]) => v > 0)
    .map(([s, v]) => ({ name: statusLabel(s), value: v, color: STATUS_COLOR[s] || COLORS.gray })), [report.data]);

  const act = async (name, path, ok, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    await run(name, () => crmPost(`/campaigns/${id}${path}`), ok);
    c.reload();
  };

  if (c.error) return <CrmPage title="Campaign"><ErrorNote error={c.error} /></CrmPage>;
  if (!d) return <CrmPage title="Campaign"><Loading /></CrmPage>;

  const editable = ["draft", "pending_approval", "paused"].includes(d.status);
  const mine = me?.email && [d.createdBy, d.submittedBy].includes(me.email);
  const ct = d.content || {};
  const r = report.data;

  return (
    <CrmPage
      title={d.name || "Untitled campaign"}
      subtitle={`Created by ${d.createdBy} · ${dt(d.createdAt)}`}
      actions={
        <>
          <Link to="/crm/campaigns" className="btn-outline"><ArrowLeft size={14} /> Campaigns</Link>
          {editable && can(me, "marketer") && <Link to={`/crm/campaigns/${id}/edit`} className="btn-outline"><Pencil size={14} /> Edit</Link>}
          {!["sent", "cancelled"].includes(d.status) && can(me, "marketer") &&
            <button className="btn-danger" disabled={!!busy} onClick={() => act("cancel", "/cancel", "Campaign cancelled", "Cancel this campaign? Messages not yet sent will not go out.")}><XCircle size={14} /> Cancel</button>}
        </>
      }
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <StatusPill status={d.status} />
        <CategoryPill category={d.category} />
        {d.pausedReason && <Pill tone="orange">Paused: {d.pausedReason.replace(/_/g, " ")}</Pill>}
        {d.approvedBy && <Pill tone="green">Approved by {d.approvedBy.startsWith("auto:") ? "system (under limit)" : d.approvedBy}</Pill>}
      </div>

      <div className="crm-1-1" style={{ alignItems: "start" }}>
        <Section title="Campaign Details">
          <Row k="Audience"><span style={{ textTransform: "capitalize" }}>{d.segment?.role}s</span> — {segmentText(d.segment)}</Row>
          <Row k="Channel">{CHANNEL[d.channel] || d.channel}{d.fallback ? ` → fallback ${CHANNEL[d.fallback] || d.fallback}` : ""}</Row>
          {ct.title && <Row k="Title">{ct.title}</Row>}
          {ct.body && <Row k="Message">{ct.body}</Row>}
          {ct.templateName && <Row k="WhatsApp template">{ct.templateName}{ct.templateParams?.length ? ` (${ct.templateParams.join(", ")})` : ""}</Row>}
          {ct.smsTemplateId && <Row k="SMS template ID">{ct.smsTemplateId}</Row>}
          <Row k="Send at">{d.scheduledAt ? dt(d.scheduledAt) : "As soon as approved"}</Row>
          <Row k="Pacing">{d.throttlePerHour ? `${num(d.throttlePerHour)} per hour` : "Global limit"}</Row>
          {d.stats?.queued > 0 && <Row k="Progress">{num(d.stats.sent)} sent · {num(d.stats.failed)} failed · {num(d.stats.skipped)} skipped · {num(d.stats.queued)} queued</Row>}
        </Section>

        <Section title="Reach & Cost Estimate" subtitle="Required before submitting (PRD §3.2)">
          {e ? (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={reach} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="stage" tick={{ ...axisTick, fill: "rgba(255,255,255,0.6)", fontSize: 11 }} axisLine={false} tickLine={false} width={84} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(212,175,55,0.05)" }} />
                  <Bar dataKey="value" name="Contacts" radius={[0, 5, 5, 0]}>
                    {reach.map((x) => <Cell key={x.stage} fill={x.color} />)}
                    <LabelList dataKey="value" position="right" style={{ fill: "rgba(255,255,255,0.65)", fontSize: 11 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <Row k="Recipients"><b style={{ color: "#D4AF37", fontSize: 16 }}>{num(e.recipients)}</b> of {num(e.matched)} matched</Row>
              <Row k="Channel mix">{Object.entries(e.channelMix || {}).map(([ch, n]) => `${CHANNEL[ch] || ch}: ${num(n)}`).join(" · ") || "—"}</Row>
              <Row k="Estimated cost"><b style={{ color: "#fff", fontSize: 16 }}>{inr(e.costInr)}</b></Row>
              <Row k="Break-even">{num(e.breakEvenRides)} completed rides to recover the cost</Row>
              <Row k="Estimated at">{dt(e.at)} · valid for 24 hours</Row>
            </>
          ) : <Hint>No estimate yet. A campaign cannot be submitted without one.</Hint>}
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {editable && can(me, "marketer") && <button className="btn-outline" disabled={!!busy} onClick={() => act("estimate", "/estimate", "Estimate updated")}><Calculator size={14} /> {busy === "estimate" ? "Calculating…" : e ? "Re-run estimate" : "Run estimate"}</button>}
            {d.status === "draft" && e && can(me, "marketer") && <button className="btn-gold" disabled={!!busy} onClick={() => act("submit", "/submit", "Campaign submitted", `Submit this campaign to ${num(e.recipients)} recipients at an estimated ${inr(e.costInr)}?`)}><Send size={14} /> Submit</button>}
            {d.status === "pending_approval" && can(me, "approver") && !mine &&
              <button className="btn-success" disabled={!!busy} onClick={() => act("approve", "/approve", "Campaign approved and scheduled", `Approve sending to ${num(e?.recipients)} recipients for ${inr(e?.costInr)}?`)}><CheckCheck size={14} /> Approve</button>}
          </div>
          {d.status === "pending_approval" && mine && <div style={{ marginTop: 10 }}><Hint>You created or submitted this campaign, so a <b>different</b> approver must approve it (PRD §3.1).</Hint></div>}
          {d.status === "pending_approval" && !can(me, "approver") && <div style={{ marginTop: 10 }}><Hint>Approval requires the Approver or CRM Admin role.</Hint></div>}
        </Section>
      </div>

      {d.sentAt && (
        <Section title="Performance Report" subtitle="After delivery (PRD §7)">
          <ErrorNote error={report.error} />
          {!r ? <Loading /> : (
            <div className="crm-1-1" style={{ marginBottom: 0, alignItems: "center" }}>
              <div>
                {deliveryPie.length ? (
                  <>
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart>
                        <Pie data={deliveryPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={76} innerRadius={46} paddingAngle={3} stroke="none">
                          {deliveryPie.map((x) => <Cell key={x.name} fill={x.color} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <Legend items={deliveryPie} />
                  </>
                ) : <Hint>No messages recorded yet.</Hint>}
              </div>
              <div>
                <Row k="Contacts reached">{num(r.reachedContacts)}</Row>
                <Row k="Spend">{inr(r.costInr)}</Row>
                <Row k={`Rides within ${r.attribution.windowD} days`}>{num(r.attribution.ridesAfterMessage)}</Row>
                <Row k="Cost per ride">{inr(r.attribution.costPerRide)} <span style={{ color: "rgba(255,255,255,0.4)" }}>(revenue per ride {inr(r.attribution.revenuePerRide)})</span></Row>
                <Row k="Outcome">{(() => { const [t, l] = VERDICT[r.attribution.verdict] || ["gray", r.attribution.verdict]; return <Pill tone={t}>{l}</Pill>; })()}</Row>
                <div style={{ marginTop: 8 }}><Hint>Rides after the message, without a holdout group — this shows correlation, not proof.</Hint></div>
              </div>
            </div>
          )}
        </Section>
      )}
    </CrmPage>
  );
}
