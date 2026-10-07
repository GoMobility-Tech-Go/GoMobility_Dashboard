// Shared pieces for the message log, the contact story and the journey people list:
// compact time cell, message content, the expandable details panel, contact link and the Excel download button.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { crmDownload, crmErrorText } from "../../api/crm";
import { StatusPill, COLORS, inr, dt } from "./crmShared";
import { useToast } from "../../components/ui";

export const dim = "rgba(255,255,255,0.4)";
export const soft = "rgba(255,255,255,0.65)";
export const bright = "rgba(255,255,255,0.88)";

const dateOnly = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
const timeOnly = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

// "07 Oct" over a small "3:07 pm"
export const TimeCell = ({ at }) => (at ? (
  <div style={{ whiteSpace: "nowrap", fontSize: 11.5, lineHeight: 1.35 }}>
    <div style={{ color: "rgba(255,255,255,0.85)" }}>{dateOnly(at)}</div>
    <div style={{ color: dim, fontSize: 10.5 }}>{timeOnly(at)}</div>
  </div>
) : <span style={{ color: dim }}>—</span>);

// Opens the contact story (Contacts page) for this user
export const contactPath = (userId) => `/crm/contacts?user=${encodeURIComponent(userId)}`;
export const ContactCell = ({ name, phone, userId, role, stop }) => (
  <div style={{ fontSize: 12 }}>
    {userId
      ? <Link to={contactPath(userId)} onClick={stop ? (e) => e.stopPropagation() : undefined} style={{ color: bright, fontWeight: 700, textDecoration: "none" }} title="Open this contact">{name || "—"}</Link>
      : <b style={{ color: bright }}>{name || "—"}</b>}
    <div style={{ color: soft }}>{phone || (userId ? `ID ${String(userId).slice(0, 8)}` : "")}</div>
    {role && <div style={{ color: dim, textTransform: "capitalize", fontSize: 10.5 }}>{role}</div>}
  </div>
);

// One-line summary of what the message says
export const MessageContent = ({ m }) => (
  <>
    {m.payload?.title ? <b style={{ color: "rgba(255,255,255,0.85)" }}>{m.payload.title} </b> : null}
    {m.payload?.body || m.payload?.text?.body || (m.payload?.templateName ? `Template: ${m.payload.templateName}` : "")}
    {m.payload?.templateName && m.payload?.params?.length > 0 && <div style={{ color: soft, marginTop: 2 }}>Values: {m.payload.params.join(" · ")}</div>}
  </>
);

// One labelled value in a details block
export const Field = ({ label, children }) => (children == null || children === "" || children === false ? null : (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.7px", textTransform: "uppercase", color: dim, marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 12.5, color: bright, wordBreak: "break-word", lineHeight: 1.45 }}>{children}</div>
  </div>
));
export const Block = ({ title, children }) => (
  <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px" }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gold, marginBottom: 10, fontFamily: "Outfit,sans-serif" }}>{title}</div>
    {children}
  </div>
);

// Everything known about one message. `contact` is omitted on the contact's own page.
export function MessageDetails({ m, journeyName, contact = true }) {
  const p = m.payload || {};
  const vars = p.smsVars && Object.keys(p.smsVars).length ? Object.entries(p.smsVars) : null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12, padding: "4px 4px 10px" }}>
      {contact && (
        <Block title="Contact">
          <Field label="Name">{m.name}</Field>
          <Field label="Phone">{m.phone}</Field>
          <Field label="Type">{m.role && <span style={{ textTransform: "capitalize" }}>{m.role}</span>}</Field>
          <Field label="User ID">{m.userId && <span style={{ fontSize: 11, color: soft }}>{m.userId}</span>}</Field>
          {m.userId && <Link to={contactPath(m.userId)} style={{ color: COLORS.gold, fontSize: 12 }}>Open full contact history →</Link>}
        </Block>
      )}
      <Block title="Why it was sent">
        <Field label={m.source?.kind === "campaign" ? "Campaign" : "Journey"}>
          {m.source?.kind === "journey" && m.source?.ref
            ? <Link to={`/crm/journeys/${m.source.ref}`} style={{ color: COLORS.gold }}>{journeyName || m.source.ref}</Link>
            : (m.source?.ref || "—")}
        </Field>
        <Field label="Step">{m.source?.node}</Field>
        <Field label="Category">{m.category && <span style={{ textTransform: "capitalize" }}>{m.category}</span>}</Field>
        <Field label="Direction">{m.direction === "in" ? "Inbound (from the contact)" : "Outbound"}</Field>
      </Block>
      <Block title="Message">
        <Field label="Title">{p.title}</Field>
        <Field label={m.channel === "sms" ? "SMS text" : "Body"}>{p.body || p.text?.body}</Field>
        <Field label="WhatsApp template">{p.templateName}</Field>
        {p.params?.length > 0 && (
          <Field label="Template values">
            {p.params.map((v, i) => <div key={i}><span style={{ color: dim }}>{`{{${i + 1}}}`}</span> {v}</div>)}
          </Field>
        )}
        <Field label="SMS template ID">{p.smsTemplateId && <span style={{ fontSize: 11, color: soft }}>{p.smsTemplateId}</span>}</Field>
        {vars && <Field label="SMS variables">{vars.map(([k, v]) => <div key={k}><span style={{ color: dim }}>{k}</span> {v}</div>)}</Field>}
      </Block>
      <Block title="Delivery">
        <Field label="Status"><StatusPill status={m.status} /></Field>
        <Field label="Reason">{m.error && <span style={{ color: "#F87171" }}>{m.error.replace(/_/g, " ")}{m.errorCode != null ? ` (${m.errorCode})` : ""}</span>}</Field>
        <Field label="Created">{dt(m.createdAt)}</Field>
        <Field label="Sent">{m.statusAt?.sent && dt(m.statusAt.sent)}</Field>
        <Field label="Delivered">{m.statusAt?.delivered && dt(m.statusAt.delivered)}</Field>
        <Field label="Read">{m.statusAt?.read && dt(m.statusAt.read)}</Field>
        <Field label="Failed">{m.statusAt?.failed && dt(m.statusAt.failed)}</Field>
        <Field label={m.status === "dry_run" ? "Cost if sent" : "Cost"}>{m.costInr ? inr(m.costInr) : "Free"}</Field>
        <Field label="Provider ID">{m.providerMessageId && <span style={{ fontSize: 11, color: soft }}>{m.providerMessageId}</span>}</Field>
      </Block>
    </div>
  );
}

// "Download Excel" — fetches the CSV with the login token and saves it
export function DownloadButton({ path, params, label = "Download Excel", title }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { const name = await crmDownload(path, params); toast?.(`Downloaded ${name}`, "success"); }
    catch (e) { toast?.(crmErrorText(e), "error"); }
    finally { setBusy(false); }
  }
  return <button type="button" className="btn-outline btn-sm" disabled={busy} onClick={go} title={title}><Download size={13} /> {busy ? "Preparing…" : label}</button>;
}

// Ride-platform document codes → readable labels (same mapping the CRM uses in message text)
const DOC_LABELS = {
  DRIVING_LICENCE: "Driving Licence", DRIVING_LICENSE: "Driving Licence", DL: "Driving Licence", VEHICLE_RC: "RC", RC: "RC",
  INSURANCE: "Insurance", PUC: "PUC", PERMIT: "Permit", FITNESS: "Fitness Certificate", AADHAAR: "Aadhaar", PAN: "PAN",
  BANK_ACCOUNT: "Bank Account", SELFIE: "Selfie",
};
export const docLabel = (code) => (code ? DOC_LABELS[String(code).toUpperCase()] || String(code).toLowerCase().split("_").map((w) => w && w[0].toUpperCase() + w.slice(1)).join(" ") : "");

// What a journey run is about: "Driving Licence · expires Sat, 17 Oct", a plan name…
export const runAbout = (r) => [docLabel(r.context?.docType), r.context?.expiresOn && `expires ${r.context.expiresOn}`, r.context?.planName].filter(Boolean).join(" · ") || "—";

// yyyy-mm-dd (as picked in an <input type="date">, India time) → ISO range for the API
export const istDayStart = (d) => (d ? new Date(`${d}T00:00:00+05:30`).toISOString() : undefined);
export const istDayEnd = (d) => (d ? new Date(`${d}T23:59:59.999+05:30`).toISOString() : undefined);
