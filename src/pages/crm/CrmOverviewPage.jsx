// CRM overview — PRD §7 "How success is measured": wahi table, live data se.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Send, CalendarCheck, IndianRupee, AlertTriangle } from "lucide-react";
import { StatCard, TableCard } from "../../components/ui";
import { CrmPage, useCrm, Loading, ErrorNote, Pill, Section, Hint, inr, num, pct, CHANNEL } from "./crmShared";

const WINDOWS = [7, 30, 90];

export default function CrmOverviewPage() {
  const [days, setDays] = useState(30);
  const { data: o, error, loading } = useCrm("/metrics/overview", { params: { days }, refreshMs: 60000 });

  return (
    <CrmPage
      title="CRM Overview"
      subtitle="Journeys + campaigns — kitne message gaye, kitna kharcha, aur PRD §7 ke targets pe hum kahan hain"
      actions={
        <select className="gm-input" style={{ width: 140 }} value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {WINDOWS.map((d) => <option key={d} value={d}>Pichhle {d} din</option>)}
        </select>
      }
    >
      <ErrorNote error={error} />
      {loading && !o && <Loading />}
      {o && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 14, marginBottom: 18 }}>
            <StatCard label={`Messages (${o.windowD} din)`} value={num(o.messages.sent)} icon={Send} />
            <StatCard label="Aaj" value={num(o.messages.today)} icon={CalendarCheck} iconColor="#60A5FA" iconBg="rgba(96,165,250,0.1)" />
            <StatCard label="Kharcha" value={inr(o.messages.spendInr)} icon={IndianRupee} iconColor="#34D399" iconBg="rgba(52,211,153,0.1)" />
            <StatCard label="Failed" value={num(o.messages.failed)} icon={AlertTriangle} iconColor="#F87171" iconBg="rgba(248,113,113,0.1)" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <TableCard title="PRD §7 — success kaise naapte hain" icon="🎯">
              <table className="gm-table">
                <thead><tr><th>Metric</th><th>Journey</th><th>Aaye</th><th>Goal (window mein)</th><th>Rate</th><th>Target</th><th>Status</th></tr></thead>
                <tbody>
                  {o.success.map((r) => (
                    <tr key={r.journey}>
                      <td>{r.metric}</td>
                      <td><Link to={`/crm/journeys/${encodeURIComponent(r.journey)}`} style={{ color: "#D4AF37", textDecoration: "none" }}>{r.journey.split("_")[0]}</Link></td>
                      <td>{num(r.entered)}</td>
                      <td>{num(r.goalWithin)}{r.goalLate ? <span style={{ color: "rgba(255,255,255,0.35)" }}> (+{r.goalLate} late)</span> : null}</td>
                      <td>{pct(r.rate)}</td>
                      <td>{r.target == null ? "Naap sakein" : pct(r.target)}</td>
                      <td>{r.entered === 0 ? <Pill>Abhi data nahi</Pill> : <Pill tone={r.onTrack ? "green" : "orange"}>{r.onTrack ? "On track" : "Target se neeche"}</Pill>}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>Opt-out rate (marketing)</td><td>—</td>
                    <td>{num(o.optOut.reachedMarketing)}</td><td>{num(o.optOut.optedOut)} opt-out</td>
                    <td>{pct(o.optOut.rate)}</td><td>&lt; {pct(o.optOut.target)}</td>
                    <td><Pill tone={o.optOut.onTrack ? "green" : "red"}>{o.optOut.onTrack ? "On track" : "Zyada hai"}</Pill></td>
                  </tr>
                  <tr>
                    <td>Journey kharcha / aayi hui ride</td><td>—</td>
                    <td>{inr(o.costPerAttributedRide.journeySpendInr)}</td><td>{num(o.costPerAttributedRide.attributedRides)} rides</td>
                    <td>{inr(o.costPerAttributedRide.costPerRide)}</td><td>&lt; {inr(o.costPerAttributedRide.limit)}</td>
                    <td>{o.costPerAttributedRide.onTrack == null ? <Pill>Abhi data nahi</Pill> : <Pill tone={o.costPerAttributedRide.onTrack ? "green" : "red"}>{o.costPerAttributedRide.onTrack ? "Faayde mein" : "Ride se mehenga"}</Pill>}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ padding: "10px 16px" }}><Hint>{o.costPerAttributedRide.note}</Hint></div>
            </TableCard>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
            <TableCard title="Channel ke hisaab se" icon="📡">
              <table className="gm-table">
                <thead><tr><th>Channel</th><th>Gaye</th><th>Failed</th><th>Roke gaye</th><th>Kharcha</th></tr></thead>
                <tbody>
                  {Object.entries(o.messages.channels).map(([ch, x]) => (
                    <tr key={ch}><td>{CHANNEL[ch] || ch}</td><td>{num(x.sent)}</td><td>{num(x.failed)}</td><td>{num(x.skipped)}</td><td>{inr(x.costInr)}</td></tr>
                  ))}
                  {!Object.keys(o.messages.channels).length && <tr><td colSpan={5} style={{ textAlign: "center", color: "rgba(255,255,255,0.35)" }}>Is window mein koi message nahi</td></tr>}
                </tbody>
              </table>
            </TableCard>

            <Section title="CRM kaise kaam karta hai">
              <Hint>
                <b style={{ color: "#D4AF37" }}>1. Data:</b> CRM har 2 min ride backend ke read-only views padhta hai (signup, rides, KYC, dues, subscription) aur events banata hai.<br />
                <b style={{ color: "#D4AF37" }}>2. Journeys:</b> event aate hi sahi journey shuru hoti hai (jaise KYC atka → J-16). Ek baar set, phir apne aap chalti hai.<br />
                <b style={{ color: "#D4AF37" }}>3. Guards:</b> har message se pehle kill switch → consent → quiet hours (Settings mein, default raat 10 se subah 8) → frequency cap → throttle.<br />
                <b style={{ color: "#D4AF37" }}>4. Campaigns:</b> segment → estimate (₹ kharcha dikhega) → submit → ₹500+ ya transactional ho toh doosra insaan approve kare.<br />
                <b style={{ color: "#D4AF37" }}>5. Safety:</b> Dry run ON = sirf log, kuch nahi jaata. Kuch galat lage toh upar <b>Kill switch</b> — 10 sec mein sab band.
              </Hint>
            </Section>
          </div>
        </>
      )}
    </CrmPage>
  );
}
