// New campaign / edit draft. PRD §3.1: audience → channel → content → schedule. Estimate and approval happen on the detail page.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Users, SlidersHorizontal, ListChecks } from "lucide-react";
import { FormGroup } from "../../components/ui";
import { crmGet, crmPatch, crmPost } from "../../api/crm";
import { CrmPage, useAction, Section, Hint, ErrorNote, Loading, Pill, num, CHANNEL } from "./crmShared";

const NUM_FILTERS = [
  ["lastRideDaysAgoGte", "Last ride at least (days ago)"], ["lastRideDaysAgoLte", "Last ride at most (days ago)"],
  ["signupDaysAgoGte", "Signed up at least (days ago)"], ["signupDaysAgoLte", "Signed up at most (days ago)"],
  ["rides7dGte", "Rides in 7 days ≥"], ["rides7dLte", "Rides in 7 days ≤"],
  ["rides30dGte", "Rides in 30 days ≥"], ["rides30dLte", "Rides in 30 days ≤"],
  ["ridesTotalGte", "Lifetime rides ≥"], ["ridesTotalLte", "Lifetime rides ≤"],
  ["lifetimeSpendGte", "Lifetime spend ≥ ₹", 1, "passenger"], ["lifetimeSpendLte", "Lifetime spend ≤ ₹", 1, "passenger"],
  ["rides90dGte", "Rides in 90 days ≥", 1, "passenger"], ["rides90dLte", "Rides in 90 days ≤", 1, "passenger"],
  ["avgFareGte", "Average fare ≥ ₹", 1, "passenger"], ["avgFareLte", "Average fare ≤ ₹", 1, "passenger"],
  ["onlineHours7dGte", "Online hours (7 days) ≥", 1, "driver"], ["onlineHours7dLte", "Online hours (7 days) ≤", 1, "driver"],
  ["acceptanceRate7dGte", "Acceptance rate (7 days) ≥ %", 0.01, "driver"], ["acceptanceRate7dLte", "Acceptance rate (7 days) ≤ %", 0.01, "driver"],
  ["earningsTotalGte", "Lifetime earnings ≥ ₹", 1, "driver"], ["earningsTotalLte", "Lifetime earnings ≤ ₹", 1, "driver"],
];
const scaleOf = (k) => NUM_FILTERS.find(([x]) => x === k)?.[2] || 1;
const LIST_FILTERS = [
  ["cityIds", "City IDs (comma separated)"], ["states", "States (e.g. HR, DL)"], ["vehicleTypes", "Vehicle types (bike, auto, car)"],
  ["kycStatus", "KYC status (e.g. verified, rejected)", "driver"], ["subscriptionTier", "Subscription plan (e.g. basic_saver, gold_rider)", "passenger"],
];
const forRole = (role) => ([, , , r]) => !r || r === role;
const CHANNELS = ["push", "whatsapp_utility", "whatsapp_marketing", "sms"];

const EMPTY = {
  // audience: "filters" (rules — who matches at send time) or "phones" (a pasted list of numbers)
  audience: "filters", phonesText: "", phoneRole: "",
  name: "", category: "marketing", role: "passenger", hasPushToken: "", filters: {}, lists: {},
  channel: "push", fallback: "", title: "", body: "", templateName: "", templateParams: "", language: "en",
  smsTemplateId: "", scheduledAt: "", throttlePerHour: "",
};
const csv = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);

// `phones` = the cleaned list returned by POST /campaigns/check-phones (only used for the phone-list audience)
function toSpec(f, phones) {
  const byPhones = f.audience === "phones";
  const segment = byPhones ? { phones: phones || [], ...(f.phoneRole ? { role: f.phoneRole } : {}) } : { role: f.role };
  // role ke bahar wale filters mat bhejo (driver segment mein "average fare" ka matlab nahi)
  if (!byPhones) {
    for (const [k, , scale = 1, role] of NUM_FILTERS) {
      if ((!role || role === f.role) && f.filters[k] !== "" && f.filters[k] != null) segment[k] = +(Number(f.filters[k]) * scale).toFixed(4);
    }
    for (const [k, , role] of LIST_FILTERS) if ((!role || role === f.role) && csv(f.lists[k]).length) segment[k] = csv(f.lists[k]);
    if (f.hasPushToken) segment.hasPushToken = f.hasPushToken === "yes";
  }
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
    ...EMPTY, name: c.name || "", category: c.category || "marketing", role: s.phones ? "passenger" : s.role || "passenger",
    audience: s.phones ? "phones" : "filters", phonesText: (s.phones || []).join("\n"), phoneRole: s.phones ? s.role || "" : "",
    hasPushToken: s.hasPushToken == null ? "" : s.hasPushToken ? "yes" : "no",
    filters: Object.fromEntries(NUM_FILTERS.filter(([k]) => s[k] != null).map(([k]) => [k, String(+(s[k] / scaleOf(k)).toFixed(2))])),
    lists: Object.fromEntries(LIST_FILTERS.filter(([k]) => s[k]).map(([k]) => [k, s[k].join(", ")])),
    channel: c.channel, fallback: c.fallback || "", title: ct.title || "", body: ct.body || "",
    templateName: ct.templateName || "", templateParams: (ct.templateParams || []).join(", "), language: ct.language || "en",
    smsTemplateId: ct.smsTemplateId || "", scheduledAt: local, throttlePerHour: c.throttlePerHour ? String(c.throttlePerHour) : "",
  };
}

// Result of "Check numbers": totals, then every matched contact, then what could not be used
function PhoneCheckResult({ r, category }) {
  const c = r.counts;
  const cell = { padding: "6px 10px", fontSize: 12 };
  const why = (x) => (x.reachable ? null : x.suppressed ? "Suppressed" : category === "marketing" && !x.marketingConsent ? "No marketing consent" : "Not reachable");
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 12, marginBottom: 12, background: "rgba(255,255,255,0.02)" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <Pill tone="gold">{num(c.valid)} valid number{c.valid === 1 ? "" : "s"}</Pill>
        <Pill tone="blue">{num(c.contacts)} contact{c.contacts === 1 ? "" : "s"} found ({num(c.drivers)} driver{c.drivers === 1 ? "" : "s"}, {num(c.passengers)} passenger{c.passengers === 1 ? "" : "s"})</Pill>
        <Pill tone="green">{num(c.reachable)} can receive this {category} message</Pill>
        {c.notFound > 0 && <Pill tone="orange">{num(c.notFound)} not on the platform</Pill>}
        {c.invalid > 0 && <Pill tone="red">{num(c.invalid)} not a valid number</Pill>}
        {c.duplicates > 0 && <Pill>{num(c.duplicates)} duplicate{c.duplicates === 1 ? "" : "s"} removed</Pill>}
        {c.bothRoles > 0 && <Pill tone="purple">{num(c.bothRoles)} number{c.bothRoles === 1 ? " is" : "s are"} both driver and passenger</Pill>}
      </div>
      {r.found.length > 0 && (
        <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left", color: "rgba(255,255,255,0.4)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.6px" }}>
              <th style={cell}>Name</th><th style={cell}>Phone</th><th style={cell}>Type</th><th style={cell}>Push</th><th style={cell}>Will receive</th>
            </tr></thead>
            <tbody>
              {r.found.map((x) => (
                <tr key={x.userId} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.85)" }}>
                  <td style={cell}>{x.name || "—"}</td><td style={cell}>{x.phone}</td><td style={{ ...cell, textTransform: "capitalize" }}>{x.role}</td>
                  <td style={cell}>{x.hasPushToken ? "Yes" : "No token"}</td>
                  <td style={cell}>{x.reachable ? <span style={{ color: "#34D399" }}>Yes</span> : <span style={{ color: "#F59E0B" }}>No — {why(x)}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {r.notFound.length > 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 10 }}><b style={{ color: "#F59E0B" }}>Not on the platform (will be skipped):</b> {r.notFound.join(", ")}</div>}
      {r.invalid.length > 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 6 }}><b style={{ color: "#F87171" }}>Not a valid mobile number:</b> {r.invalid.join(", ")}</div>}
    </div>
  );
}

export default function CrmCampaignFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [f, setF] = useState(id ? null : EMPTY);
  const [loadErr, setLoadErr] = useState(null);
  const [preview, setPreview] = useState(null);
  const [phoneCheck, setPhoneCheck] = useState(null);
  const [formErr, setFormErr] = useState(null);
  const { busy, run } = useAction();

  useEffect(() => {
    if (!id) return;
    crmGet(`/campaigns/${id}`).then((c) => setF(fromCampaign(c))).catch(() => setLoadErr("Could not load this campaign."));
  }, [id]);

  if (loadErr) return <CrmPage title="Edit Campaign"><ErrorNote error={loadErr} /></CrmPage>;
  if (!f) return <CrmPage title="Edit Campaign"><Loading /></CrmPage>;

  const set = (k, v) => {
    setF((p) => ({ ...p, [k]: v })); setPreview(null);
    if (["audience", "phonesText", "phoneRole", "category"].includes(k)) setPhoneCheck(null);   // the check is for exactly this list
  };
  const byPhones = f.audience === "phones";
  const setIn = (group, k, v) => { setF((p) => ({ ...p, [group]: { ...p[group], [k]: v } })); setPreview(null); };
  const needsSms = f.channel === "sms" || f.fallback === "sms";
  const needsPush = f.channel === "push" || f.fallback === "push";
  const needsWa = f.channel.startsWith("whatsapp_") || f.fallback.startsWith("whatsapp_");

  async function doPreview() {
    const spec = toSpec(f);
    const r = await run("preview", () => crmPost("/campaigns/preview-segment", { segment: spec.segment, category: spec.category }));
    if (r) setPreview(r);
  }
  // Phone-list audience: the server cleans the pasted text and says who was found, who was not, and who can be reached
  async function checkPhones() {
    setFormErr(null);
    if (!f.phonesText.trim()) { setFormErr("Paste at least one phone number."); return null; }
    const r = await run("phones", () => crmPost("/campaigns/check-phones", { text: f.phonesText, role: f.phoneRole || undefined, category: f.category }));
    if (r) setPhoneCheck(r);
    return r;
  }
  async function save() {
    setFormErr(null);
    if (!f.name.trim()) return setFormErr("Please give the campaign a name.");
    let phones;
    if (byPhones) {
      const r = phoneCheck || await checkPhones();
      if (!r) return;
      if (!r.counts.contacts) return setFormErr("None of these numbers belong to a rider or driver in the CRM, so there is no one to send to.");
      phones = r.phones;
    }
    const spec = toSpec(f, phones);
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
            <FormGroup label="Who should receive it">
              <div style={{ display: "flex", gap: 8 }}>
                {[["filters", "Everyone matching filters", SlidersHorizontal], ["phones", "Specific phone numbers", ListChecks]].map(([v, label, Icon]) => (
                  <button key={v} type="button" onClick={() => set("audience", v)} className={f.audience === v ? "btn-gold" : "btn-outline"} style={{ flex: 1, justifyContent: "center" }}>
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            </FormGroup>

            {byPhones && (
              <>
                <FormGroup label="Phone numbers" hint="One per line, or separated by commas — you can paste a column straight from Excel. Up to 1,000. +91 and spaces are fine.">
                  <textarea className="gm-input" rows={8} value={f.phonesText} onChange={(e) => set("phonesText", e.target.value)}
                    placeholder={"9876543210\n9876543211\n+91 98765 43212"} style={{ fontFamily: "monospace", fontSize: 13 }} />
                </FormGroup>
                <FormGroup label="Send to" hint="A person can be both a driver and a passenger with the same number — choose which app's contact to use.">
                  <select className="gm-input" value={f.phoneRole} onChange={(e) => set("phoneRole", e.target.value)}>
                    <option value="">Everyone with these numbers (drivers and passengers)</option>
                    <option value="driver">Drivers only</option>
                    <option value="passenger">Passengers only</option>
                  </select>
                </FormGroup>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <button className="btn-outline" type="button" disabled={!!busy} onClick={checkPhones}><Users size={14} /> {busy === "phones" ? "Checking…" : "Check numbers"}</button>
                  {!phoneCheck && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Shows who was found before you save</span>}
                </div>
                {phoneCheck && <PhoneCheckResult r={phoneCheck} category={f.category} />}
                <Hint>Only numbers that belong to a rider or driver on the platform can be messaged. Consent, suppression and frequency caps still apply.</Hint>
              </>
            )}

            {!byPhones && (
            <>
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
              {NUM_FILTERS.filter(forRole(f.role)).map(([k, label]) => (
                <FormGroup key={k} label={label}>
                  <input className="gm-input" type="number" min="0" value={f.filters[k] ?? ""} onChange={(e) => setIn("filters", k, e.target.value)} />
                </FormGroup>
              ))}
            </div>
            {LIST_FILTERS.filter(([, , role]) => !role || role === f.role).map(([k, label]) => (
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
            </>
            )}
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
