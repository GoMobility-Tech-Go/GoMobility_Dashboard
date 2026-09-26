// Contact lookup — for support calls: what did this person receive, why, and stop it if needed. Search by phone, user ID or email.
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { TableCard, Card } from "../../components/ui";
import { crmGet, crmPost, crmErrorText } from "../../api/crm";
import { CrmPage, useCrmMe, useAction, can, Loading, ErrorNote, Pill, StatusPill, Section, Empty, CHANNEL, inr, num, dt, shortKey } from "./crmShared";

const Fact = ({ label, value }) => (
  <Card style={{ padding: "12px 14px" }}>
    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 5, fontFamily: "Outfit,sans-serif" }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.9)", fontFamily: "Outfit,sans-serif" }}>{value}</div>
  </Card>
);

function Detail({ userId, onChanged }) {
  const me = useCrmMe();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const { busy, run } = useAction();
  const load = () => crmGet(`/contacts/by-user/${encodeURIComponent(userId)}`).then(setD).catch((e) => setErr(crmErrorText(e)));
  useEffect(() => { load(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps -- remounted per contact via key

  const act = async (name, path, body, ok, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    const r = await run(name, () => crmPost(`/contacts/by-user/${encodeURIComponent(userId)}${path}`, body), ok);
    if (r) { load(); onChanged?.(); }
  };
  const suppress = () => {
    const reason = window.prompt("Reason for suppressing this contact (e.g. requested via support):");
    if (reason) act("suppress", "/suppress", { reason }, "Contact suppressed — no further CRM messages");
  };
  const optIn = () => {
    const reason = window.prompt("Reason for opting in (min. 10 characters). WhatsApp requires a recorded opt-in, e.g. 'Customer asked on support call, 25 Sep':");
    if (reason) act("optin", "/opt-in", { reason }, "Marketing consent enabled");
  };

  if (err) return <ErrorNote error={err} />;
  if (!d) return <Loading />;
  const c = d.contact, p = c.profile || {};
  const isDriver = c.role === "driver";
  return (
    <>
      <Section title={`${isDriver ? "Driver" : "Passenger"} · ${c.phone || c.userId}`} subtitle={`User ID ${c.userId}${c.email ? ` · ${c.email}` : ""}`}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <Pill tone={c.consent?.marketing ? "green" : "gray"}>Marketing consent: {c.consent?.marketing ? "Yes" : "No"}</Pill>
          <Pill tone={c.consent?.transactional === false ? "red" : "blue"}>Transactional: {c.consent?.transactional === false ? "Off" : "On"}</Pill>
          {c.suppressed?.is && <Pill tone="red">Suppressed: {c.suppressed.reason}</Pill>}
          {p.hasPendingDues && <Pill tone="orange">Pending dues: {inr(p.pendingDuesAmount)}</Pill>}
          {p.subscriptionTier && <Pill tone="gold">Plan: {p.subscriptionTier.replace(/_/g, " ")}</Pill>}
          {isDriver && p.kycStatus && <Pill tone="blue">KYC: {p.kycStatus.replace(/_/g, " ")}</Pill>}
          <Pill tone={c.fcmToken ? "green" : "gray"}>Push: {c.fcmToken ? "Enabled" : "No token"}</Pill>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
          <Fact label="Lifetime rides" value={num(p.ridesTotal)} />
          <Fact label="Rides · 7 days" value={num(p.rides7d)} />
          <Fact label="Rides · 30 days" value={num(p.rides30d)} />
          <Fact label="Last ride" value={dt(p.lastRideAt)} />
          <Fact label="Signed up" value={dt(p.signupAt)} />
          <Fact label="City" value={c.cityId || "—"} />
          {!isDriver && <Fact label="Lifetime spend" value={inr(p.lifetimeSpend)} />}
          {isDriver && <Fact label="Missing documents" value={p.missingDocs || "None"} />}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {c.consent?.marketing && can(me, "marketer") && <button className="btn-outline" disabled={!!busy} onClick={() => act("optout", "/opt-out", undefined, "Marketing turned off (receipts continue)", "Stop marketing messages for this contact?")}>Opt out of marketing</button>}
          {!c.suppressed?.is && can(me, "marketer") && <button className="btn-danger" disabled={!!busy} onClick={suppress}>Suppress all messages</button>}
          {c.suppressed?.is && can(me, "admin") && <button className="btn-outline" disabled={!!busy} onClick={() => act("unsup", "/unsuppress", undefined, "Suppression removed", "Remove the suppression for this contact?")}>Remove suppression</button>}
          {!c.consent?.marketing && !c.suppressed?.is && can(me, "admin") && <button className="btn-outline" disabled={!!busy} onClick={optIn}>Record marketing opt-in</button>}
        </div>
      </Section>

      <div className="crm-1-1">
        <TableCard title="Messages (latest 50)" icon="✉️">
          <table className="gm-table">
            <thead><tr><th>Time</th><th>Channel</th><th>Source</th><th>Status</th></tr></thead>
            <tbody>
              {d.messages.map((m) => (
                <tr key={m._id} title={m.payload?.body || m.payload?.templateName || ""}>
                  <td style={{ whiteSpace: "nowrap" }}>{dt(m.createdAt)}</td>
                  <td>{CHANNEL[m.channel] || m.channel}{m.direction === "in" ? " (inbound)" : ""}</td>
                  <td style={{ fontSize: 12 }}>{m.source?.ref ? `${m.source.kind === "campaign" ? "Campaign" : shortKey(m.source.ref)}${m.source.node ? " · " + m.source.node : ""}` : "—"}<div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{m.payload?.title || m.payload?.templateName || ""}</div></td>
                  <td><StatusPill status={m.status} />{m.error && <div style={{ fontSize: 10.5, color: "#F87171" }}>{m.error.replace(/_/g, " ")}</div>}</td>
                </tr>
              ))}
              {!d.messages.length && <tr><td colSpan={4}><Empty>No messages yet</Empty></td></tr>}
            </tbody>
          </table>
        </TableCard>
        <TableCard title="Journeys (latest 50)" icon="🧭">
          <table className="gm-table">
            <thead><tr><th>Journey</th><th>Started</th><th>Status</th><th>Step</th></tr></thead>
            <tbody>
              {d.runs.map((r) => (
                <tr key={r._id}>
                  <td>{shortKey(r.journeyKey)}<div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{r.journeyKey.split("_").slice(1).join(" ")}</div></td>
                  <td style={{ whiteSpace: "nowrap" }}>{dt(r.enteredAt)}</td>
                  <td><StatusPill status={r.state} /></td>
                  <td>{r.currentNode || "—"}</td>
                </tr>
              ))}
              {!d.runs.length && <tr><td colSpan={4}><Empty>Not in any journey</Empty></td></tr>}
            </tbody>
          </table>
        </TableCard>
      </div>
    </>
  );
}

export default function CrmContactsPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  async function search(e) {
    e?.preventDefault();
    if (q.trim().length < 3) return setErr("Enter at least 3 characters or digits.");
    setErr(null); setLoading(true); setSelected(null);
    try {
      const r = await crmGet("/contacts/search", { q: q.trim() });
      setResults(r);
      if (r.length === 1) setSelected(r[0].userId);
    } catch (ex) { setErr(crmErrorText(ex)); }
    finally { setLoading(false); }
  }

  return (
    <CrmPage title="Contacts" subtitle="Look up a rider or driver — see what they received, which journeys they are in, and manage consent">
      <form onSubmit={search} style={{ display: "flex", gap: 10, marginBottom: 16, maxWidth: 620 }}>
        <input className="gm-input" placeholder="Phone number (full or last 6+ digits), user ID or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-gold" type="submit"><Search size={14} /> Search</button>
      </form>
      <ErrorNote error={err} />
      {loading && <Loading />}
      {results && results.length !== 1 && (
        <div style={{ marginBottom: 16 }}>
          <TableCard title={`${results.length} result${results.length === 1 ? "" : "s"}`} icon="🔎">
            <table className="gm-table">
              <thead><tr><th>Phone</th><th>Role</th><th>City</th><th>Rides</th><th>Consent</th></tr></thead>
              <tbody>
                {results.map((c) => (
                  <tr key={c.userId} style={{ cursor: "pointer", background: selected === c.userId ? "rgba(212,175,55,0.06)" : undefined }} onClick={() => setSelected(c.userId)}>
                    <td>{c.phone || c.userId}</td><td style={{ textTransform: "capitalize" }}>{c.role}</td><td>{c.cityId || "—"}</td><td>{num(c.profile?.ridesTotal)}</td>
                    <td>{c.suppressed?.is ? <Pill tone="red">Suppressed</Pill> : <Pill tone={c.consent?.marketing ? "green" : "gray"}>{c.consent?.marketing ? "Marketing: yes" : "Marketing: no"}</Pill>}</td>
                  </tr>
                ))}
                {!results.length && <tr><td colSpan={5}><Empty>No matching contact. Contacts sync from the ride platform every 10 minutes.</Empty></td></tr>}
              </tbody>
            </table>
          </TableCard>
        </div>
      )}
      {selected && <Detail key={selected} userId={selected} onChanged={() => results?.length > 1 && search()} />}
    </CrmPage>
  );
}
