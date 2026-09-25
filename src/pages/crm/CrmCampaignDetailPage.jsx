// Ek campaign: content, estimate (PRD §3.2 — skip nahi), submit / approve / cancel, aur send ke baad report (§7).
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calculator, Send, CheckCheck, XCircle, Pencil } from "lucide-react";
import { crmPost } from "../../api/crm";
import { CrmPage, useCrm, useCrmMe, useAction, can, Loading, ErrorNote, StatusPill, Pill, Section, Hint, CHANNEL, inr, num, dt } from "./crmShared";

const Row = ({ k, children }) => (
  <div style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: "1px solid rgba(212,175,55,0.07)", fontSize: 13, fontFamily: "Outfit,sans-serif" }}>
    <div style={{ width: 170, flexShrink: 0, color: "rgba(255,255,255,0.4)" }}>{k}</div>
    <div style={{ color: "rgba(255,255,255,0.85)", minWidth: 0, wordBreak: "break-word" }}>{children}</div>
  </div>
);

const VERDICT = {
  no_rides_yet: ["orange", "Abhi tak koi ride nahi"], free_no_rides: ["gray", "Free tha, ride nahi"],
  under_revenue_per_ride: ["green", "Faayde mein — ride kamai se sasta"], costs_more_than_a_ride_earns: ["red", "Nuksaan — ride kamai se mehenga"],
};

function segmentText(s = {}) {
  return Object.entries(s).filter(([k]) => k !== "role").map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" · ") || "Saare";
}

export default function CrmCampaignDetailPage() {
  const { id } = useParams();
  const me = useCrmMe();
  const c = useCrm(`/campaigns/${id}`, { refreshMs: 20000 });
  const d = c.data;
  const report = useCrm(`/campaigns/${id}/report`, { skip: !d?.sentAt, refreshMs: 60000 });
  const { busy, run } = useAction();

  const act = async (name, path, ok, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    await run(name, () => crmPost(`/campaigns/${id}${path}`), ok);
    c.reload();
  };

  if (c.error) return <CrmPage title="Campaign"><ErrorNote error={c.error} /></CrmPage>;
  if (!d) return <CrmPage title="Campaign"><Loading /></CrmPage>;

  const e = d.estimate?.at ? d.estimate : null;
  const editable = ["draft", "pending_approval", "paused"].includes(d.status);
  const mine = me?.email && [d.createdBy, d.submittedBy].includes(me.email);
  const ct = d.content || {};

  return (
    <CrmPage
      title={d.name || "(bina naam)"}
      subtitle={`${d.segment?.role || ""} · ${d.category === "transactional" ? "Transactional" : "Marketing"} · banaya ${d.createdBy} ne, ${dt(d.createdAt)}`}
      actions={
        <>
          <Link to="/crm/campaigns" className="btn-outline"><ArrowLeft size={14} /> Campaigns</Link>
          {editable && can(me, "marketer") && <Link to={`/crm/campaigns/${id}/edit`} className="btn-outline"><Pencil size={14} /> Edit</Link>}
          {!["sent", "cancelled"].includes(d.status) && can(me, "marketer") &&
            <button className="btn-danger" disabled={!!busy} onClick={() => act("cancel", "/cancel", "Campaign cancel", "Campaign cancel karein? Jo abhi nahi gaye, wo nahi jayenge.")}><XCircle size={14} /> Cancel</button>}
        </>
      }
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <StatusPill status={d.status} />
        {d.pausedReason && <Pill tone="orange">Ruka: {d.pausedReason}</Pill>}
        {d.approvedBy && <Pill tone="green">Approve: {d.approvedBy}</Pill>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 16 }}>
        <Section title="Kya aur kisko">
          <Row k="Segment">{d.segment?.role} — {segmentText(d.segment)}</Row>
          <Row k="Channel">{CHANNEL[d.channel] || d.channel}{d.fallback ? ` → fallback ${CHANNEL[d.fallback] || d.fallback}` : ""}</Row>
          {ct.title && <Row k="Title">{ct.title}</Row>}
          {ct.body && <Row k="Text">{ct.body}</Row>}
          {ct.templateName && <Row k="WhatsApp template">{ct.templateName}{ct.templateParams?.length ? ` (${ct.templateParams.join(", ")})` : ""}</Row>}
          {ct.smsTemplateId && <Row k="SMS template ID">{ct.smsTemplateId}</Row>}
          <Row k="Kab">{d.scheduledAt ? dt(d.scheduledAt) : "Approve hote hi"}</Row>
          <Row k="Max per ghanta">{d.throttlePerHour || "Settings wali limit"}</Row>
          {d.stats?.queued > 0 && <Row k="Progress">{num(d.stats.sent)} gaye · {num(d.stats.failed)} failed · {num(d.stats.skipped)} roke · {num(d.stats.queued)} queue mein the</Row>}
        </Section>

        <Section title="Estimate — bhejne se pehle (PRD §3.2)">
          {e ? (
            <>
              <Row k="Recipients"><b style={{ color: "#D4AF37", fontSize: 16 }}>{num(e.recipients)}</b> (kul {num(e.matched)} match mein se)</Row>
              <Row k="Bahar kiye">{num(e.excluded?.suppressed)} suppressed · {num(e.excluded?.noConsent)} consent nahi · {num(e.excluded?.capped)} cap pe · {num(e.excluded?.noChannel)} koi channel nahi</Row>
              <Row k="Channel mix">{Object.entries(e.channelMix || {}).map(([ch, n]) => `${CHANNEL[ch] || ch}: ${n}`).join(" · ") || "—"}</Row>
              <Row k="Kharcha"><b style={{ color: "#fff", fontSize: 16 }}>{inr(e.costInr)}</b></Row>
              <Row k="Break-even">{num(e.breakEvenRides)} completed rides chahiye kharcha nikalne ko</Row>
              <Row k="Estimate kab">{dt(e.at)} (24 ghante tak valid)</Row>
            </>
          ) : <Hint>Abhi estimate nahi hua. Bina estimate ke submit nahi hota.</Hint>}
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {editable && can(me, "marketer") && <button className="btn-outline" disabled={!!busy} onClick={() => act("estimate", "/estimate", "Estimate ho gaya")}><Calculator size={14} /> {busy === "estimate" ? "Gin rahe…" : e ? "Dobara estimate" : "Estimate karein"}</button>}
            {d.status === "draft" && e && can(me, "marketer") && <button className="btn-gold" disabled={!!busy} onClick={() => act("submit", "/submit", "Submit ho gaya", `${num(e.recipients)} logon ko ${inr(e.costInr)} mein bhejne ke liye submit karein?`)}><Send size={14} /> Submit</button>}
            {d.status === "pending_approval" && can(me, "approver") && !mine &&
              <button className="btn-success" disabled={!!busy} onClick={() => act("approve", "/approve", "Approve — ab schedule pe jayega", `APPROVE: ${num(e?.recipients)} log, ${inr(e?.costInr)}. Pakka?`)}><CheckCheck size={14} /> Approve</button>}
          </div>
          {d.status === "pending_approval" && mine && <div style={{ marginTop: 10 }}><Hint>Aapne banaya / submit kiya hai — approve <b>koi doosra</b> approver karega (PRD §3.1).</Hint></div>}
          {d.status === "pending_approval" && !can(me, "approver") && <div style={{ marginTop: 10 }}><Hint>Approve karne ke liye admin / super admin chahiye.</Hint></div>}
        </Section>
      </div>

      {d.sentAt && (
        <Section title="Report — bhejne ke baad (PRD §7)">
          <ErrorNote error={report.error} />
          {report.data ? (
            <>
              <Row k="Pahunche">{num(report.data.reachedContacts)} log</Row>
              <Row k="Messages">{Object.entries(report.data.messages || {}).map(([s, n]) => `${s}: ${n}`).join(" · ") || "—"}</Row>
              <Row k="Kharcha">{inr(report.data.costInr)}</Row>
              <Row k={`Rides (${report.data.attribution.windowD} din mein)`}>{num(report.data.attribution.ridesAfterMessage)}</Row>
              <Row k="Kharcha / ride">{inr(report.data.attribution.costPerRide)} (ek ride ki kamai {inr(report.data.attribution.revenuePerRide)})</Row>
              <Row k="Nateeja">{(() => { const [t, l] = VERDICT[report.data.attribution.verdict] || ["gray", report.data.attribution.verdict]; return <Pill tone={t}>{l}</Pill>; })()}</Row>
              <div style={{ marginTop: 8 }}><Hint>{report.data.attribution.note}</Hint></div>
            </>
          ) : <Loading />}
        </Section>
      )}
    </CrmPage>
  );
}
