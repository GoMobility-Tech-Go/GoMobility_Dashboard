// New campaign / edit draft. PRD §3.1: audience → channel → content → schedule. Estimate and approval happen on the detail page.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { FormGroup } from "../../components/ui";
import { crmGet, crmPatch, crmPost } from "../../api/crm";
import { CrmPage, useAction, Section, Hint, ErrorNote, Loading, Pill, num, CHANNEL } from "./crmShared";

const NUM_FILTERS = [
  ["lastRideDaysAgoGte", "Last ride at least (days ago)"], ["lastRideDaysAgoLte", "Last ride at most (days ago)"],
  ["signupDaysAgoGte", "Signed up at least (days ago)"], ["signupDaysAgoLte", "Signed up at most (days ago)"],
  ["rides7dGte", "Rides in 7 days ≥"], ["rides7dLte", "Rides in 7 days ≤"],
  ["rides30dGte", "Rides in 30 days ≥"], ["rides30dLte", "Rides in 30 days ≤"],
  ["ridesTotalGte", "Lifetime rides ≥"], ["ridesTotalLte", "Lifetime rides ≤"],
  ["lifetimeSpendGte", "Lifetime spend ≥ ₹"], ["lifetimeSpendLte", "Lifetime spend ≤ ₹"],
];
const LIST_FILTERS = [["cityIds", "City IDs (comma separated)"], ["kycStatus", "KYC status (e.g. verified, rejected)"], ["subscriptionTier", "Subscription plan (e.g. basic_saver, gold_rider)"]];
const CHANNELS = ["push", "whatsapp_utility", "whatsapp_marketing", "sms"];

const EMPTY = {
  name: "", category: "marketing", role: "passenger", hasPushToken: "", filters: {}, lists: {},
  channel: "push", fallback: "", title: "", body: "", templateName: "", templateParams: "", language: "en",
  smsTemplateId: "", scheduledAt: "", throttlePerHour: "",
};
const csv = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);

function toSpec(f) {
  const segment = { role: f.role };
  for (const [k] of NUM_FILTERS) if (f.filters[k] !== "" && f.filters[k] != null) segment[k] = Number(f.filters[k]);
  for (const [k] of LIST_FILTERS) if (csv(f.lists[k]).length) segment[k] = csv(f.lists[k]);
  if (f.hasPushToken) segment.hasPushToken = f.hasPushToken === "yes";
  const content = f.channel === "push" ? { title: f.title, body: f.body }
    : f.channel === "sms" ? { body: f.body, smsTemplateId: f.smsTemplateId }
    : { templateName: f.templateName, templateParams: csv(f.templateParams), language: f.language || "en" };
  if (f.fallback === "sms") Object.assign(content, { body: content.body || f.body, smsTemplateId: f.smsTemplateId });
  if (f.fallback === "push") Object.assign(content, { title: f.title, body: content.body || f.body });
  if (f.fallback.startsWith("whatsapp_")) Object.assign(content, { templateName: f.templateName, templateParams: csv(f.templateParams), language: f.language || "en" });
  const spec = { name: f.name, category: f.category, segment, channel: f.channel, content };
  spec.fallback = f.fallback || undefined;
  if (f.scheduledAt) spec.scheduledAt = new Date(f.scheduledAt).toISOString();
  if (f.throttlePerHour) spec.throttlePerHour = Number(f.throttlePerHour);
  return spec;
}

function fromCampaign(c) {
  const s = c.segment || {}, ct = c.content || {};
  const local = c.scheduledAt ? new Date(new Date(c.scheduledAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  return {
    ...EMPTY, name: c.name || "", category: c.category || "marketing", role: s.role || "passenger",
    hasPushToken: s.hasPushToken == null ? "" : s.hasPushToken ? "yes" : "no",
    filters: Object.fromEntries(NUM_FILTERS.filter(([k]) => s[k] != null).map(([k]) => [k, String(s[k])])),
    lists: Object.fromEntries(LIST_FILTERS.filter(([k]) => s[k]).map(([k]) => [k, s[k].join(", ")])),
    channel: c.channel, fallback: c.fallback || "", title: ct.title || "", body: ct.body || "",
    templateName: ct.templateName || "", templateParams: (ct.templateParams || []).join(", "), language: ct.language || "en",
    smsTemplateId: ct.smsTemplateId || "", scheduledAt: local, throttlePerHour: c.throttlePerHour ? String(c.throttlePerHour) : "",
  };
}

export default function CrmCampaignFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [f, setF] = useState(id ? null : EMPTY);
  const [loadErr, setLoadErr] = useState(null);
  const [preview, setPreview] = useState(null);
  const [formErr, setFormErr] = useState(null);
  const { busy, run } = useAction();

  useEffect(() => {
    if (!id) return;
    crmGet(`/campaigns/${id}`).then((c) => setF(fromCampaign(c))).catch(() => setLoadErr("Could not load this campaign."));
  }, [id]);

  if (loadErr) return <CrmPage title="Edit Campaign"><ErrorNote error={loadErr} /></CrmPage>;
  if (!f) return <CrmPage title="Edit Campaign"><Loading /></CrmPage>;

  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setPreview(null); };
  const setIn = (group, k, v) => { setF((p) => ({ ...p, [group]: { ...p[group], [k]: v } })); setPreview(null); };
  const needsSms = f.channel === "sms" || f.fallback === "sms";
  const needsPush = f.channel === "push" || f.fallback === "push";
  const needsWa = f.channel.startsWith("whatsapp_") || f.fallback.startsWith("whatsapp_");

  async function doPreview() {
    const spec = toSpec(f);
    const r = await run("preview", () => crmPost("/campaigns/preview-segment", { segment: spec.segment, category: spec.category }));
    if (r) setPreview(r);
  }
  async function save() {
    setFormErr(null);
    const spec = toSpec(f);
    if (!spec.name.trim()) return setFormErr("Please give the campaign a name.");
    const r = await run("save", () => (id ? crmPatch(`/campaigns/${id}`, spec) : crmPost("/campaigns", spec)),
      id ? "Campaign updated — run the estimate again" : "Draft created — next, run the cost estimate");
    if (r?._id) navigate(`/crm/campaigns/${r._id}`);
  }

  const input = (k, props = {}) => <input className="gm-input" value={f[k]} onChange={(e) => set(k, e.target.value)} {...props} />;

  return (
    <CrmPage
      title={id ? "Edit Campaign" : "New Campaign"}
      subtitle="Save as a draft, then review the reach and cost estimate before submitting"
      actions={<Link to={id ? `/crm/campaigns/${id}` : "/crm/campaigns"} className="btn-outline"><ArrowLeft size={14} /> Back</Link>}
    >
      <ErrorNote error={formErr} />
      <div className="crm-1-1" style={{ alignItems: "start" }}>
        <div>
          <Section title="1. Audience" subtitle="Evaluated again at send time, so the audience is always current">
            <FormGroup label="Campaign name">{input("name", { placeholder: "e.g. Gurugram drivers — weekend demand" })}</FormGroup>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormGroup label="Audience">
                <select className="gm-input" value={f.role} onChange={(e) => set("role", e.target.value)}>
                  <option value="passenger">Passengers</option><option value="driver">Drivers</option>
                </select>
              </FormGroup>
              <FormGroup label="Push token">
                <select className="gm-input" value={f.hasPushToken} onChange={(e) => set("hasPushToken", e.target.value)}>
                  <option value="">Any</option><option value="yes">Has token</option><option value="no">No token</option>
                </select>
              </FormGroup>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              {NUM_FILTERS.map(([k, label]) => (
                <FormGroup key={k} label={label}>
                  <input className="gm-input" type="number" min="0" value={f.filters[k] ?? ""} onChange={(e) => setIn("filters", k, e.target.value)} />
                </FormGroup>
              ))}
            </div>
            {LIST_FILTERS.map(([k, label]) => (
              <FormGroup key={k} label={label}>
                <input className="gm-input" value={f.lists[k] ?? ""} onChange={(e) => setIn("lists", k, e.target.value)} />
              </FormGroup>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button className="btn-outline" disabled={!!busy} onClick={doPreview}><Users size={14} /> {busy === "preview" ? "Counting…" : "Preview audience"}</button>
              {preview && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "Outfit,sans-serif" }}>
                <b style={{ color: "#D4AF37" }}>{num(preview.matched)}</b> matched · <b style={{ color: "#34D399" }}>{num(preview.reachable)}</b> reachable after consent and suppression
              </span>}
            </div>
          </Section>
        </div>

        <div>
          <Section title="2. Channel & Message">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormGroup label="Message type" hint={f.category === "transactional" ? "Bypasses marketing opt-out — always needs a second approver" : "Only sent to contacts with marketing consent"}>
                <select className="gm-input" value={f.category} onChange={(e) => set("category", e.target.value)}>
                  <option value="marketing">Marketing</option><option value="transactional">Transactional</option>
                </select>
              </FormGroup>
              <FormGroup label="Channel">
                <select className="gm-input" value={f.channel} onChange={(e) => set("channel", e.target.value)}>
                  {CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL[c]}</option>)}
                </select>
              </FormGroup>
            </div>
            <FormGroup label="Fallback channel" hint="Used when the first channel is not available for a contact">
              <select className="gm-input" value={f.fallback} onChange={(e) => set("fallback", e.target.value)}>
                <option value="">None</option>
                {CHANNELS.filter((c) => c !== f.channel).map((c) => <option key={c} value={c}>{CHANNEL[c]}</option>)}
              </select>
            </FormGroup>
            {needsPush && <FormGroup label="Push title">{input("title", { maxLength: 65 })}</FormGroup>}
            {(needsPush || needsSms) && (
              <FormGroup label={needsSms ? "Message text (must match the DLT template exactly)" : "Push body"}
                hint={needsSms && f.category === "marketing" ? "Marketing SMS must include an opt-out line, e.g. 'Reply STOP to unsubscribe.'" : undefined}>
                <textarea className="gm-input" rows={3} value={f.body} onChange={(e) => set("body", e.target.value)} />
              </FormGroup>
            )}
            {needsSms && <FormGroup label="MSG91 template ID (DLT)">{input("smsTemplateId")}</FormGroup>}
            {needsWa && (
              <>
                <FormGroup label="WhatsApp template name (approved by Meta)">{input("templateName", { placeholder: "e.g. passenger_offer_v1" })}</FormGroup>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                  <FormGroup label="Template parameters (comma separated)" hint="Placeholders such as {{profile.rides30d}} are supported">{input("templateParams")}</FormGroup>
                  <FormGroup label="Language">{input("language")}</FormGroup>
                </div>
              </>
            )}
            {f.channel === "whatsapp_marketing" && <Pill tone="orange">WhatsApp marketing costs about ₹1.02 per message — the most expensive channel</Pill>}
          </Section>

          <Section title="3. Schedule & Pacing">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormGroup label="Send at" hint="Leave empty to send as soon as it is approved">
                <input className="gm-input" type="datetime-local" value={f.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} style={{ colorScheme: "dark" }} />
              </FormGroup>
              <FormGroup label="Max messages per hour" hint="Cannot exceed the global limit in CRM Settings">
                <input className="gm-input" type="number" min="1" value={f.throttlePerHour} onChange={(e) => set("throttlePerHour", e.target.value)} />
              </FormGroup>
            </div>
            <Hint>Quiet hours and frequency caps are applied automatically at send time; contacts who hit a cap are skipped.</Hint>
          </Section>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn-gold" disabled={!!busy} onClick={save}>{busy === "save" ? "Saving…" : id ? "Update draft" : "Save draft"}</button>
          </div>
        </div>
      </div>
    </CrmPage>
  );
}
