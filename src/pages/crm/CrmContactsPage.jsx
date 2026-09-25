// Contact search — support call pe: "is user ko kya gaya, kyun gaya, band karo". Phone / user ID / email se.
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { TableCard } from "../../components/ui";
import { crmGet, crmPost } from "../../api/crm";
import { CrmPage, useCrmMe, useAction, can, Loading, ErrorNote, Pill, StatusPill, Section, Hint, Empty, CHANNEL, inr, num, dt } from "./crmShared";

function Detail({ userId, onChanged }) {
  const me = useCrmMe();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const { busy, run } = useAction();
  const load = () => crmGet(`/contacts/by-user/${encodeURIComponent(userId)}`).then(setD).catch(() => setErr("Contact load nahi hua"));
  useEffect(() => { load(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps -- key={userId} se naya mount

  const act = async (name, path, body, ok, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    const r = await run(name, () => crmPost(`/contacts/by-user/${encodeURIComponent(userId)}${path}`, body), ok);
    if (r) { load(); onChanged?.(); }
  };
  const suppress = () => {
    const reason = window.prompt("Suppress kyun? (jaise: user ne support pe mana kiya)");
    if (reason) act("suppress", "/suppress", { reason }, "Suppress — ab koi CRM message nahi");
  };
  const optIn = () => {
    const reason = window.prompt("Opt-in kyun? (min 10 akshar — WhatsApp ko recorded opt-in chahiye, jaise: 'User ne 25 Sep call pe khud kaha')");
    if (reason) act("optin", "/opt-in", { reason }, "Marketing consent ON");
  };

  if (err) return <ErrorNote error={err} />;
  if (!d) return <Loading />;
  const c = d.contact, p = c.profile || {};
  return (
    <>
      <Section title={`${c.role === "driver" ? "Driver" : "Passenger"} · ${c.phone || c.userId}`}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <Pill tone={c.consent?.marketing ? "green" : "gray"}>Marketing consent: {c.consent?.marketing ? "haan" : "nahi"}</Pill>
          <Pill tone={c.consent?.transactional === false ? "red" : "blue"}>Transactional: {c.consent?.transactional === false ? "band" : "chalu"}</Pill>
          {c.suppressed?.is && <Pill tone="red">Suppressed: {c.suppressed.reason}</Pill>}
          {p.hasPendingDues && <Pill tone="orange">Dues baaki: {inr(p.pendingDuesAmount)}</Pill>}
          {p.subscriptionTier && <Pill tone="gold">Plan: {p.subscriptionTier}</Pill>}
          {c.role === "driver" && p.kycStatus && <Pill tone="blue">KYC: {p.kycStatus}</Pill>}
        </div>
        <Hint>
          User ID {c.userId} · city {c.cityId || "—"} · rides: kul {num(p.ridesTotal)}, 7 din {num(p.rides7d)}, 30 din {num(p.rides30d)} · aakhri ride {dt(p.lastRideAt)} · signup {dt(p.signupAt)}
          {c.role === "driver" && p.missingDocs ? ` · baaki docs: ${p.missingDocs}` : ""} · push token {c.fcmToken ? "hai" : "nahi"}
        </Hint>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {c.consent?.marketing && can(me, "marketer") && <button className="btn-outline" disabled={!!busy} onClick={() => act("optout", "/opt-out", undefined, "Marketing band (receipts chalte rahenge)", "Is user ko marketing band karein?")}>Marketing band karein</button>}
          {!c.suppressed?.is && can(me, "marketer") && <button className="btn-danger" disabled={!!busy} onClick={suppress}>Suppress (sab band)</button>}
          {c.suppressed?.is && can(me, "admin") && <button className="btn-outline" disabled={!!busy} onClick={() => act("unsup", "/unsuppress", undefined, "Unsuppress ho gaya", "Suppression hatayein?")}>Unsuppress</button>}
          {!c.consent?.marketing && !c.suppressed?.is && can(me, "admin") && <button className="btn-outline" disabled={!!busy} onClick={optIn}>Marketing opt-in (user ne khud kaha)</button>}
        </div>
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(380px,1fr))", gap: 16 }}>
        <TableCard title="Messages (aakhri 50)" icon="✉️">
          <table className="gm-table">
            <thead><tr><th>Kab</th><th>Channel</th><th>Kahan se</th><th>Status</th></tr></thead>
            <tbody>
              {d.messages.map((m) => (
                <tr key={m._id} title={m.payload?.body || m.payload?.templateName || ""}>
                  <td style={{ whiteSpace: "nowrap" }}>{dt(m.createdAt)}</td>
                  <td>{CHANNEL[m.channel] || m.channel}{m.direction === "in" ? " (aaya)" : ""}</td>
                  <td style={{ fontSize: 12 }}>{m.source?.ref ? `${m.source.kind === "campaign" ? "Campaign" : m.source.ref.split("_")[0]}${m.source.node ? " · " + m.source.node : ""}` : "—"}<div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{m.payload?.title || m.payload?.templateName || ""}</div></td>
                  <td><StatusPill status={m.status} />{m.error && <div style={{ fontSize: 10.5, color: "#F87171" }}>{m.error}</div>}</td>
                </tr>
              ))}
              {!d.messages.length && <tr><td colSpan={4}><Empty>Koi message nahi</Empty></td></tr>}
            </tbody>
          </table>
        </TableCard>
        <TableCard title="Journeys (aakhri 50)" icon="🧭">
          <table className="gm-table">
            <thead><tr><th>Journey</th><th>Shuru</th><th>State</th><th>Step</th></tr></thead>
            <tbody>
              {d.runs.map((r) => (
                <tr key={r._id}>
                  <td>{r.journeyKey.split("_")[0]}<div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{r.journeyKey.split("_").slice(1).join(" ")}</div></td>
                  <td style={{ whiteSpace: "nowrap" }}>{dt(r.enteredAt)}</td>
                  <td><StatusPill status={r.state} /></td>
                  <td>{r.currentNode || "—"}</td>
                </tr>
              ))}
              {!d.runs.length && <tr><td colSpan={4}><Empty>Kisi journey mein nahi</Empty></td></tr>}
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
    if (q.trim().length < 3) return setErr("Kam se kam 3 akshar / number likhein");
    setErr(null); setLoading(true); setSelected(null);
    try {
      const r = await crmGet("/contacts/search", { q: q.trim() });
      setResults(r);
      if (r.length === 1) setSelected(r[0].userId);
    } catch { setErr("Search nahi ho paya"); }
    finally { setLoading(false); }
  }

  return (
    <CrmPage title="Contacts" subtitle="Kisi user ko kya message gaya, kaunsi journey mein hai — aur zaroorat ho toh band karein">
      <form onSubmit={search} style={{ display: "flex", gap: 10, marginBottom: 16, maxWidth: 560 }}>
        <input className="gm-input" placeholder="Phone (10 digit ya aakhri 6+), user ID, ya email" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-gold" type="submit"><Search size={14} /> Dhoondo</button>
      </form>
      <ErrorNote error={err} />
      {loading && <Loading />}
      {results && results.length !== 1 && (
        <div style={{ marginBottom: 16 }}>
          <TableCard title={`${results.length} mile`} icon="🔎">
            <table className="gm-table">
              <thead><tr><th>Phone</th><th>Role</th><th>City</th><th>Rides</th><th>Consent</th></tr></thead>
              <tbody>
                {results.map((c) => (
                  <tr key={c.userId} style={{ cursor: "pointer", background: selected === c.userId ? "rgba(212,175,55,0.06)" : undefined }} onClick={() => setSelected(c.userId)}>
                    <td>{c.phone || c.userId}</td><td>{c.role}</td><td>{c.cityId || "—"}</td><td>{num(c.profile?.ridesTotal)}</td>
                    <td>{c.suppressed?.is ? <Pill tone="red">Suppressed</Pill> : <Pill tone={c.consent?.marketing ? "green" : "gray"}>{c.consent?.marketing ? "Marketing haan" : "Marketing nahi"}</Pill>}</td>
                  </tr>
                ))}
                {!results.length && <tr><td colSpan={5}><Empty>Koi nahi mila (CRM contacts har 10 min ride backend se sync hote hain)</Empty></td></tr>}
              </tbody>
            </table>
          </TableCard>
        </div>
      )}
      {selected && <Detail key={selected} userId={selected} onChanged={() => results?.length > 1 && search()} />}
    </CrmPage>
  );
}
