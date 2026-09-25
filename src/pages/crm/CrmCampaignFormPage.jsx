// Naya campaign / draft edit. PRD §3.1: segment → channel → content → schedule. Estimate + approval detail page pe.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { FormGroup } from "../../components/ui";
import { crmGet, crmPatch, crmPost } from "../../api/crm";
import { CrmPage, useAction, Section, Hint, ErrorNote, Loading, Pill, num, CHANNEL } from "./crmShared";

const NUM_FILTERS = [
  ["lastRideDaysAgoGte", "Aakhri ride kam se kam (din pehle)"], ["lastRideDaysAgoLte", "Aakhri ride zyada se zyada (din pehle)"],
  ["signupDaysAgoGte", "Signup kam se kam (din pehle)"], ["signupDaysAgoLte", "Signup zyada se zyada (din pehle)"],
  ["rides7dGte", "Rides (7 din) ≥"], ["rides7dLte", "Rides (7 din) ≤"],
  ["rides30dGte", "Rides (30 din) ≥"], ["rides30dLte", "Rides (30 din) ≤"],
  ["ridesTotalGte", "Kul rides ≥"], ["ridesTotalLte", "Kul rides ≤"],
  ["lifetimeSpendGte", "Kul kharcha ≥ ₹"], ["lifetimeSpendLte", "Kul kharcha ≤ ₹"],
];
const LIST_FILTERS = [["cityIds", "City IDs (comma se)"], ["kycStatus", "KYC status (verified, rejected…)"], ["subscriptionTier", "Subscription plan (basic_saver, gold_rider…)"]];
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
    crmGet(`/campaigns/${id}`).then((c) => setF(fromCampaign(c))).catch(() => setLoadErr("Campaign load nahi hua"));
  }, [id]);

  if (loadErr) return <CrmPage title="Campaign edit"><ErrorNote error={loadErr} /></CrmPage>;
  if (!f) return <CrmPage title="Campaign edit"><Loading /></CrmPage>;

  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setPreview(null); };
  const setIn = (group, k, v) => { setF((p) => ({ ...p, [group]: { ...p[group], [k]: v } })); setPreview(null); };
  const needsSms = f.channel === "sms" || f.fallback === "sms";
  const needsPush = f.channel === "push" || f.fallback === "push";
  const isWa = f.channel.startsWith("whatsapp_");

  async function doPreview() {
    const spec = toSpec(f);
    const r = await run("preview", () => crmPost("/campaigns/preview-segment", { segment: spec.segment, category: spec.category }));
    if (r) setPreview(r);
  }
  async function save() {
    setFormErr(null);
    const spec = toSpec(f);
    if (!spec.name.trim()) return setFormErr("Campaign ka naam likhein");
    const r = await run("save", () => (id ? crmPatch(`/campaigns/${id}`, spec) : crmPost("/campaigns", spec)), id ? "Campaign update — ab dobara estimate karein" : "Draft ban gaya — ab estimate karein");
    if (r?._id) navigate(`/crm/campaigns/${r._id}`);
  }

  const input = (k, props = {}) => <input className="gm-input" value={f[k]} onChange={(e) => set(k, e.target.value)} {...props} />;

  return (
    <CrmPage
      title={id ? "Campaign edit" : "Naya campaign"}
      subtitle="Save karne ke baad estimate (kitne log, kitna ₹) dikhega — uske bina send nahi hota"
      actions={<Link to={id ? `/crm/campaigns/${id}` : "/crm/campaigns"} className="btn-outline"><ArrowLeft size={14} /> Wapas</Link>}
    >
      <ErrorNote error={formErr} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 16 }}>
        <div>
          <Section title="1. Kisko bhejna hai (segment)">
            <FormGroup label="Campaign ka naam">{input("name", { placeholder: "Jaise: Gurgaon drivers — weekend demand" })}</FormGroup>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormGroup label="Role">
                <select className="gm-input" value={f.role} onChange={(e) => set("role", e.target.value)}>
                  <option value="passenger">Passengers</option><option value="driver">Drivers</option>
                </select>
              </FormGroup>
              <FormGroup label="Push token">
                <select className="gm-input" value={f.hasPushToken} onChange={(e) => set("hasPushToken", e.target.value)}>
                  <option value="">Koi bhi</option><option value="yes">Hai</option><option value="no">Nahi hai</option>
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
              <button className="btn-outline" disabled={!!busy} onClick={doPreview}><Users size={14} /> {busy === "preview" ? "Gin rahe…" : "Kitne log? (preview)"}</button>
              {preview && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "Outfit,sans-serif" }}>
                <b style={{ color: "#D4AF37" }}>{num(preview.matched)}</b> match · <b style={{ color: "#34D399" }}>{num(preview.reachable)}</b> tak pahunch sakte (consent / suppression ke baad)
              </span>}
            </div>
          </Section>
        </div>

        <div>
          <Section title="2. Channel aur message">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormGroup label="Type" hint={f.category === "transactional" ? "Opt-out/caps bypass — hamesha approval lagega" : "Sirf marketing consent walon ko"}>
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
            <FormGroup label="Fallback (pehla channel na chale toh)">
              <select className="gm-input" value={f.fallback} onChange={(e) => set("fallback", e.target.value)}>
                <option value="">Koi nahi</option>
                {CHANNELS.filter((c) => c !== f.channel).map((c) => <option key={c} value={c}>{CHANNEL[c]}</option>)}
              </select>
            </FormGroup>
            {needsPush && <FormGroup label="Push title">{input("title", { maxLength: 65 })}</FormGroup>}
            {(needsPush || needsSms) && (
              <FormGroup label={needsSms ? "Text (SMS: DLT template se bilkul same)" : "Push body"} hint={needsSms && f.category === "marketing" ? "Marketing SMS mein opt-out line zaroori: 'Band karne ke liye STOP bhejein.'" : undefined}>
                <textarea className="gm-input" rows={3} value={f.body} onChange={(e) => set("body", e.target.value)} />
              </FormGroup>
            )}
            {needsSms && <FormGroup label="MSG91 template ID (DLT)">{input("smsTemplateId")}</FormGroup>}
            {(isWa || f.fallback.startsWith("whatsapp_")) && (
              <>
                <FormGroup label="WhatsApp template naam (Meta pe approved)">{input("templateName", { placeholder: "passenger_offer_v1" })}</FormGroup>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                  <FormGroup label="Template params (comma se)" hint="{{profile.rides30d}} jaise placeholder chalte hain">{input("templateParams")}</FormGroup>
                  <FormGroup label="Language">{input("language")}</FormGroup>
                </div>
              </>
            )}
            {f.channel === "whatsapp_marketing" && <Pill tone="orange">WhatsApp marketing ≈ ₹1.02 / message — sabse mehenga channel</Pill>}
          </Section>

          <Section title="3. Kab aur kitni tezi se">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormGroup label="Schedule (khaali = approve hote hi)">
                <input className="gm-input" type="datetime-local" value={f.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} style={{ colorScheme: "dark" }} />
              </FormGroup>
              <FormGroup label="Max per ghanta" hint="Settings ki limit se zyada nahi ho sakta">
                <input className="gm-input" type="number" min="1" value={f.throttlePerHour} onChange={(e) => set("throttlePerHour", e.target.value)} />
              </FormGroup>
            </div>
            <Hint>Quiet hours aur frequency cap send ke waqt apne aap lagte hain — jo log us waqt cap pe hain, unhe skip kiya jayega.</Hint>
          </Section>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn-gold" disabled={!!busy} onClick={save}>{busy === "save" ? "Save ho raha…" : id ? "Update draft" : "Draft save karein"}</button>
          </div>
        </div>
      </div>
    </CrmPage>
  );
}
