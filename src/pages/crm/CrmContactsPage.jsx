// Contact lookup — the full story of one rider or driver: profile, every message, every journey. Search by name, phone, user ID or email.
import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Send, Route, IndianRupee, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { StatCard, TableCard, Card } from "../../components/ui";
import { crmGet, crmPost, crmErrorText } from "../../api/crm";
import {
  CrmPage, useCrm, useCrmMe, useAction, can, Loading, ErrorNote, Pill, StatusPill, CategoryPill, Section, Empty, Grid,
  CHANNEL, CHANNEL_COLOR, COLORS, inr, num, dt, shortKey,
} from "./crmShared";
import { TimeCell, MessageContent, MessageDetails, DownloadButton, runAbout, dim, soft, bright } from "./crmMessageParts";

const Fact = ({ label, value }) => (
  <Card style={{ padding: "12px 14px" }}>
    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 5, fontFamily: "Outfit,sans-serif" }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.9)", fontFamily: "Outfit,sans-serif" }}>{value}</div>
  </Card>
);

function Detail({ userId, journeyNames, onChanged }) {
  const me = useCrmMe();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [open, setOpen] = useState(null);
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
  const c = d.contact, p = c.profile || {}, st = d.stats || { total: d.messages.length, byStatus: {}, costInr: 0 };
  const isDriver = c.role === "driver";
  const went = (st.byStatus.sent || 0) + (st.byStatus.delivered || 0) + (st.byStatus.read || 0);
  const activeRuns = d.runs.filter((r) => r.state === "active").length;
  return (
    <>
      <Section
        title={`${c.name || (isDriver ? "Driver" : "Passenger")} · ${c.phone || c.userId}`}
        subtitle={`${isDriver ? "Driver" : "Passenger"} · User ID ${c.userId}${c.email ? ` · ${c.email}` : ""}`}
      >
        <Grid min={170} style={{ marginBottom: 14 }}>
          <StatCard label="Messages so far" value={num(st.total)} icon={Send} />
          <StatCard label="Really delivered" value={num(went)} icon={Send} iconColor={COLORS.green} iconBg="rgba(52,211,153,0.1)" />
          <StatCard label="Dry run / skipped" value={`${num(st.byStatus.dry_run || 0)} / ${num(st.byStatus.skipped || 0)}`} icon={Clock} iconColor={COLORS.purple} iconBg="rgba(167,139,250,0.1)" />
          <StatCard label="Journeys active now" value={num(activeRuns)} icon={Route} iconColor={COLORS.blue} iconBg="rgba(96,165,250,0.1)" />
          <StatCard label="Spent on this contact" value={inr(st.costInr || 0)} icon={IndianRupee} iconColor={COLORS.green} iconBg="rgba(52,211,153,0.1)" />
        </Grid>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <Pill tone={c.consent?.marketing ? "green" : "gray"}>Marketing consent: {c.consent?.marketing ? "Yes" : "No"}</Pill>
          <Pill tone={c.consent?.transactional === false ? "red" : "blue"}>Transactional: {c.consent?.transactional === false ? "Off" : "On"}</Pill>
          {c.suppressed?.is && <Pill tone="red">Suppressed: {c.suppressed.reason}</Pill>}
          {p.hasPendingDues && <Pill tone="orange">Pending dues: {inr(p.pendingDuesAmount)}</Pill>}
          {p.subscriptionTier && <Pill tone="gold">Plan: {p.subscriptionTier.replace(/_/g, " ")}</Pill>}
          {isDriver && p.kycStatus && <Pill tone="blue">KYC: {p.kycStatus.replace(/_/g, " ")}</Pill>}
          <Pill tone={c.fcmToken ? "green" : "gray"}>Push: {c.fcmToken ? "Enabled" : "No token"}</Pill>
          {c.channelState?.waUndeliverableAt && <Pill tone="orange" title="WhatsApp could not reach this number; skipped for 30 days">WhatsApp unreachable</Pill>}
          {c.channelState?.smsDndAt && <Pill tone="orange" title="Number is on DND; marketing SMS skipped for 30 days">SMS DND</Pill>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
          <Fact label="Lifetime rides" value={num(p.ridesTotal)} />
          <Fact label="Rides · 7 days" value={num(p.rides7d)} />
          <Fact label="Rides · 30 days" value={num(p.rides30d)} />
          <Fact label="Last ride" value={dt(p.lastRideAt)} />
          <Fact label="Signed up" value={dt(p.signupAt)} />
          <Fact label="City / state" value={`${c.cityId || "—"}${p.state ? ` · ${p.state}` : ""}`} />
          {!isDriver && <Fact label="Rides · 90 days" value={num(p.rides90d)} />}
          {!isDriver && <Fact label="Average fare" value={inr(p.avgFare)} />}
          {isDriver && <Fact label="Online hours · 7 days" value={p.onlineHours7d == null ? "—" : `${p.onlineHours7d} h`} />}
          {isDriver && <Fact label="Acceptance · 7 days" value={p.acceptanceRate7d == null ? "—" : `${Math.round(p.acceptanceRate7d * 100)}% of ${num(p.offers7d)}`} />}
          {isDriver && <Fact label="Lifetime earnings" value={inr(p.earningsTotal)} />}
          {p.vehicleTypes?.length > 0 && <Fact label="Vehicle" value={p.vehicleTypes.join(", ")} />}
          <Fact label="Last login" value={dt(p.lastLoginAt)} />
          {!isDriver && <Fact label="Lifetime spend" value={inr(p.lifetimeSpend)} />}
          {isDriver && <Fact label="Missing documents" value={p.missingDocs || "None"} />}
          <Fact label="First CRM message" value={dt(st.firstAt)} />
          <Fact label="Latest CRM message" value={dt(st.lastAt)} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {c.consent?.marketing && can(me, "marketer") && <button className="btn-outline" disabled={!!busy} onClick={() => act("optout", "/opt-out", undefined, "Marketing turned off (receipts continue)", "Stop marketing messages for this contact?")}>Opt out of marketing</button>}
          {!c.suppressed?.is && can(me, "marketer") && <button className="btn-danger" disabled={!!busy} onClick={suppress}>Suppress all messages</button>}
          {c.suppressed?.is && can(me, "admin") && <button className="btn-outline" disabled={!!busy} onClick={() => act("unsup", "/unsuppress", undefined, "Suppression removed", "Remove the suppression for this contact?")}>Remove suppression</button>}
          {!c.consent?.marketing && !c.suppressed?.is && can(me, "admin") && <button className="btn-outline" disabled={!!busy} onClick={optIn}>Record marketing opt-in</button>}
        </div>
      </Section>

      <div style={{ marginBottom: 16 }}>
        <TableCard title={`Journeys (${d.runs.length})`} icon="🧭">
          <table className="gm-table">
            <thead><tr><th>Journey</th><th>Started</th><th>Status</th><th>Current step</th><th>Next action</th><th>About</th><th>Goal met</th></tr></thead>
            <tbody>
              {d.runs.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontSize: 12 }}>
                    <Link to={`/crm/journeys/${r.journeyKey}`} style={{ color: bright, fontWeight: 600, textDecoration: "none" }}>{journeyNames[r.journeyKey] || r.journeyKey.split("_").slice(1).join(" ")}</Link>
                    <div style={{ fontSize: 10.5, color: dim }}>{shortKey(r.journeyKey)} · version {r.journeyVersion ?? "—"}</div>
                  </td>
                  <td><TimeCell at={r.enteredAt} /></td>
                  <td><StatusPill status={r.state} /></td>
                  <td style={{ fontSize: 12 }}>{r.currentNode || "—"}</td>
                  <td>{r.state === "active" ? <TimeCell at={r.nextActionAt} /> : <span style={{ color: dim }}>—</span>}</td>
                  <td style={{ fontSize: 12, color: soft }}>{runAbout(r)}</td>
                  <td style={{ fontSize: 12 }}>{r.goalMetAt ? `${dt(r.goalMetAt)}${r.goalWithinWindow ? "" : " (late)"}` : "—"}</td>
                </tr>
              ))}
              {!d.runs.length && <tr><td colSpan={7}><Empty>Not in any journey</Empty></td></tr>}
            </tbody>
          </table>
        </TableCard>
      </div>

      <TableCard title={`Messages (${st.total > d.messages.length ? `latest ${d.messages.length} of ${num(st.total)}` : d.messages.length})`} icon="✉️"
        footer={<span style={{ fontSize: 11.5, color: dim }}>Click a row for full details</span>}>
        <table className="gm-table">
          <thead><tr><th style={{ width: 24 }} /><th>Time</th><th>Channel</th><th>Source</th><th>Content</th><th>Status</th><th>Cost</th></tr></thead>
          <tbody>
            {d.messages.map((m) => {
              const isOpen = open === m._id;
              const jName = journeyNames[m.source?.ref];
              return (
                <Fragment key={m._id}>
                  <tr onClick={() => setOpen(isOpen ? null : m._id)} style={{ cursor: "pointer", background: isOpen ? "rgba(212,175,55,0.05)" : undefined }}>
                    <td style={{ color: dim, paddingRight: 0 }}>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                    <td><TimeCell at={m.createdAt} /></td>
                    <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 4, background: CHANNEL_COLOR[m.channel] || COLORS.gray, marginRight: 6 }} />
                      {CHANNEL[m.channel] || m.channel}{m.direction === "in" && <> <Pill tone="blue">Inbound</Pill></>}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <div style={{ color: "rgba(255,255,255,0.85)" }}>{m.source?.kind === "campaign" ? "Campaign" : (jName || shortKey(m.source?.ref) || "—")}</div>
                      <div style={{ color: dim, fontSize: 10.5 }}>{m.source?.node ? `step ${m.source.node}` : ""}</div>
                      {m.category === "transactional" && <div style={{ marginTop: 3 }}><CategoryPill category="transactional" /></div>}
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 420 }}><MessageContent m={m} /></td>
                    <td><StatusPill status={m.status} />{m.error && <div style={{ fontSize: 10.5, color: "#F87171", marginTop: 3 }}>{m.error.replace(/_/g, " ")}</div>}</td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{m.costInr ? inr(m.costInr) : "—"}</td>
                  </tr>
                  {isOpen && <tr><td colSpan={7} style={{ background: "rgba(0,0,0,0.18)", padding: "12px 16px" }}><MessageDetails m={m} journeyName={jName} contact={false} /></td></tr>}
                </Fragment>
              );
            })}
            {!d.messages.length && <tr><td colSpan={7}><Empty>No messages yet</Empty></td></tr>}
          </tbody>
        </table>
      </TableCard>
    </>
  );
}

export default function CrmContactsPage() {
  const [sp, setSp] = useSearchParams();
  const linked = sp.get("user");   // ?user=<id> — opened from the message log or a journey's people list
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(linked);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const journeys = useCrm("/journeys");
  const journeyNames = useMemo(() => Object.fromEntries((journeys.data?.journeys || []).map((j) => [j.key, j.name])), [journeys.data]);

  useEffect(() => { if (linked) { setSelected(linked); setResults(null); } }, [linked]);
  const pick = (userId) => { setSelected(userId); if (linked) setSp({}, { replace: true }); };

  async function search(e) {
    e?.preventDefault();
    if (q.trim().length < 3) return setErr("Enter at least 3 characters or digits.");
    setErr(null); setLoading(true); setSelected(null);
    if (linked) setSp({}, { replace: true });
    try {
      const r = await crmGet("/contacts/search", { q: q.trim() });
      setResults(r);
      if (r.length === 1) setSelected(r[0].userId);
    } catch (ex) { setErr(crmErrorText(ex)); }
    finally { setLoading(false); }
  }

  return (
    <CrmPage title="Contacts" subtitle="Look up a rider or driver — see everything they received, which journeys they are in, and manage consent">
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <form onSubmit={search} style={{ display: "flex", gap: 10, flex: "1 1 420px", maxWidth: 620 }}>
          <input className="gm-input" placeholder="Name, phone (full or last 4+ digits), user ID or email" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-gold" type="submit"><Search size={14} /> Search</button>
        </form>
        <div style={{ flex: 1 }} />
        <DownloadButton path="/contacts/export" params={{ role: "driver" }} label="Drivers (Excel)" title="All drivers with profile and consent" />
        <DownloadButton path="/contacts/export" params={{ role: "passenger" }} label="Passengers (Excel)" title="All passengers with profile and consent" />
      </div>
      <ErrorNote error={err} />
      {loading && <Loading />}
      {results && results.length !== 1 && (
        <div style={{ marginBottom: 16 }}>
          <TableCard title={`${results.length} result${results.length === 1 ? "" : "s"}${results.length === 20 ? " (first 20 — refine the search)" : ""}`} icon="🔎">
            <table className="gm-table">
              <thead><tr><th>Name</th><th>Phone</th><th>Type</th><th>City</th><th>Rides</th><th>Consent</th></tr></thead>
              <tbody>
                {results.map((c) => (
                  <tr key={c.userId} style={{ cursor: "pointer", background: selected === c.userId ? "rgba(212,175,55,0.06)" : undefined }} onClick={() => pick(c.userId)}>
                    <td style={{ fontWeight: 600, color: bright }}>{c.name || "—"}</td>
                    <td>{c.phone || c.userId}</td><td style={{ textTransform: "capitalize" }}>{c.role}</td><td>{c.cityId || "—"}</td><td>{num(c.profile?.ridesTotal)}</td>
                    <td>{c.suppressed?.is ? <Pill tone="red">Suppressed</Pill> : <Pill tone={c.consent?.marketing ? "green" : "gray"}>{c.consent?.marketing ? "Marketing: yes" : "Marketing: no"}</Pill>}</td>
                  </tr>
                ))}
                {!results.length && <tr><td colSpan={6}><Empty>No matching contact. Contacts sync from the ride platform every 10 minutes.</Empty></td></tr>}
              </tbody>
            </table>
          </TableCard>
        </div>
      )}
      {selected && <Detail key={selected} userId={selected} journeyNames={journeyNames} onChanged={() => results?.length > 1 && search()} />}
      {!selected && !results && !loading && <Empty>Search for a rider or driver to see their full history.</Empty>}
    </CrmPage>
  );
}
